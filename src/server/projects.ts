import { db } from "@/server/db";
import { Prisma, ProjectStatus, ElementType } from "@prisma/client";
import { getStorageService } from "@/lib/storage";

export const DEFAULT_CANVAS_WIDTH = 1080;
export const DEFAULT_CANVAS_HEIGHT = 1920;

export interface CreateProjectInput {
  title?: string;
  description?: string;
  caption?: string | null;
  socialAccountId?: string | null;
  slideWidth?: number;
  slideHeight?: number;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string | null;
  caption?: string | null;
  socialAccountId?: string | null;
  slideWidth?: number;
  slideHeight?: number;
  slides?: Array<{
    id?: string;
    position?: number;
    backgroundColor?: string;
    backgroundImageUrl?: string | null;
    elements?: Array<{
      id?: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number;
      opacity?: number;
      locked?: boolean;
      visible?: boolean;
      zIndex?: number;
      assetId?: string | null;
      properties?: unknown;
    }>;
  }>;
}

function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function listProjects(userId: string) {
  return db.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      socialAccount: {
        select: {
          id: true,
          platform: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: { slides: true },
      },
    },
  });
}

export async function getProjectById(id: string, userId: string) {
  const project = await db.project.findUnique({
    where: { id },
    include: {
      socialAccount: {
        select: {
          id: true,
          platform: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      slides: {
        orderBy: { position: "asc" },
        include: {
          elements: {
            orderBy: { zIndex: "asc" },
            include: {
              asset: {
                select: { url: true },
              },
            },
          },
        },
      },
    },
  });

  if (!project || project.userId !== userId) {
    return null;
  }

  return project;
}

export async function createProject(userId: string, input: CreateProjectInput = {}) {
  const title = input.title?.trim() || "Untitled Carousel";
  const description = input.description?.trim() || null;
  const caption = input.caption !== undefined ? (input.caption ? input.caption.trim() : null) : null;
  const slideWidth = input.slideWidth || DEFAULT_CANVAS_WIDTH;
  const slideHeight = input.slideHeight || DEFAULT_CANVAS_HEIGHT;

  let validatedSocialAccountId: string | null = null;
  if (input.socialAccountId) {
    const acc = await db.socialAccount.findFirst({
      where: { id: input.socialAccountId, userId },
    });
    if (!acc) {
      throw new Error("Social account not found or access denied");
    }
    validatedSocialAccountId = acc.id;
  }

  return db.$transaction(
    async (tx) => {
      // 1. Create project
      const project = await tx.project.create({
        data: {
          userId,
          title,
          description,
          caption,
          socialAccountId: validatedSocialAccountId,
          slideWidth,
          slideHeight,
          status: ProjectStatus.DRAFT,
        },
      });

      // 2. Create initial slide at position 0
      await tx.slide.create({
        data: {
          projectId: project.id,
          position: 0,
          backgroundColor: "#121212",
        },
      });

      // 3. Return project with initial slide and social account
      return tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: {
          socialAccount: {
            select: {
              id: true,
              platform: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          slides: {
            orderBy: { position: "asc" },
            include: {
              elements: true,
            },
          },
        },
      });
    },
    {
      maxWait: 5000,
      timeout: 15000,
    },
  );
}

export async function updateProject(id: string, userId: string, input: UpdateProjectInput) {
  // 1. Verify project ownership outside transaction
  const existing = await db.project.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Project not found or access denied");
  }

  // 2. Pre-validate and collect all referenced assets in a SINGLE query outside transaction
  const allAssetIds = new Set<string>();
  if (Array.isArray(input.slides)) {
    for (const s of input.slides) {
      if (Array.isArray(s.elements)) {
        for (const el of s.elements) {
          if (isValidUuid(el.assetId)) {
            allAssetIds.add(el.assetId!);
          }
        }
      }
    }
  }

  const validAssetIdSet = new Set<string>();
  if (allAssetIds.size > 0) {
    const foundAssets = await db.asset.findMany({
      where: {
        id: { in: Array.from(allAssetIds) },
        userId,
      },
      select: { id: true },
    });
    for (const a of foundAssets) {
      validAssetIdSet.add(a.id);
    }
  }

  // 3. Pre-validate social account outside transaction if provided
  let verifiedSocialAccountId: string | null | undefined = undefined;
  if (input.socialAccountId !== undefined) {
    if (input.socialAccountId) {
      const acc = await db.socialAccount.findFirst({
        where: { id: input.socialAccountId, userId },
        select: { id: true },
      });
      if (!acc) {
        throw new Error("Social account not found or access denied");
      }
      verifiedSocialAccountId = acc.id;
    } else {
      verifiedSocialAccountId = null;
    }
  }

  // 4. Pre-sanitize project metadata updates
  const projectUpdates: Record<string, unknown> = {};
  if (typeof input.title === "string" && input.title.trim()) {
    projectUpdates.title = input.title.trim();
  }
  if (input.description !== undefined) {
    projectUpdates.description = input.description ? input.description.trim() : null;
  }
  if (input.caption !== undefined) {
    projectUpdates.caption = input.caption ? input.caption.trim() : null;
  }
  if (verifiedSocialAccountId !== undefined) {
    projectUpdates.socialAccountId = verifiedSocialAccountId;
  }
  if (typeof input.slideWidth === "number" && input.slideWidth > 0) {
    projectUpdates.slideWidth = input.slideWidth;
  }
  if (typeof input.slideHeight === "number" && input.slideHeight > 0) {
    projectUpdates.slideHeight = input.slideHeight;
  }

  // 5. Short, focused transaction for pure persistence
  return db.$transaction(
    async (tx) => {
      // Update project metadata
      if (Object.keys(projectUpdates).length > 0) {
        await tx.project.update({
          where: { id },
          data: projectUpdates,
        });
      }

      // Reconcile slides if provided
      if (Array.isArray(input.slides)) {
        const dbSlides = await tx.slide.findMany({
          where: { projectId: id },
          include: { elements: true },
        });

        const dbSlideMap = new Map(dbSlides.map((s) => [s.id, s]));
        const incomingSlideIds = new Set<string>();

        for (const s of input.slides) {
          if (isValidUuid(s.id) && dbSlideMap.has(s.id!)) {
            incomingSlideIds.add(s.id!);
          }
        }

        // Delete slides not present in incoming list first
        const deletedSlideIds = dbSlides
          .filter((s) => !incomingSlideIds.has(s.id))
          .map((s) => s.id);

        if (deletedSlideIds.length > 0) {
          await tx.slide.deleteMany({
            where: { id: { in: deletedSlideIds } },
          });
        }

        // Temporarily assign negative positions to surviving slides to avoid collision with @@unique([projectId, position])
        const survivingSlides = dbSlides.filter((s) => incomingSlideIds.has(s.id));
        for (let i = 0; i < survivingSlides.length; i++) {
          const survivingSlide = survivingSlides[i];
          if (survivingSlide) {
            await tx.slide.update({
              where: { id: survivingSlide.id },
              data: { position: -(i + 1000) },
            });
          }
        }

        // Batch collector for elements to create
        const newElementsToCreate: Array<{
          slideId: string;
          type: ElementType;
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          opacity: number;
          locked: boolean;
          visible: boolean;
          zIndex: number;
          assetId: string | null;
          properties: Prisma.InputJsonValue;
        }> = [];

        // Process each incoming slide
        for (let sIdx = 0; sIdx < input.slides.length; sIdx++) {
          const slideInput = input.slides[sIdx];
          if (!slideInput) continue;

          const isExistingSlide = isValidUuid(slideInput.id) && dbSlideMap.has(slideInput.id!);

          let currentSlideId: string;

          if (isExistingSlide) {
            currentSlideId = slideInput.id!;
            await tx.slide.update({
              where: { id: currentSlideId },
              data: {
                position: sIdx,
                backgroundColor: slideInput.backgroundColor || "#121212",
                backgroundImageUrl: slideInput.backgroundImageUrl || null,
              },
            });
          } else {
            const createdSlide = await tx.slide.create({
              data: {
                projectId: id,
                position: sIdx,
                backgroundColor: slideInput.backgroundColor || "#121212",
                backgroundImageUrl: slideInput.backgroundImageUrl || null,
              },
            });
            currentSlideId = createdSlide.id;
          }

          // Reconcile elements for this slide
          if (Array.isArray(slideInput.elements)) {
            const existingSlideElements = isExistingSlide
              ? dbSlideMap.get(currentSlideId)?.elements || []
              : [];
            const dbElementMap = new Map(existingSlideElements.map((e) => [e.id, e]));
            const incomingElementIds = new Set<string>();

            for (const el of slideInput.elements) {
              if (isValidUuid(el.id) && dbElementMap.has(el.id!)) {
                incomingElementIds.add(el.id!);
              }
            }

            // Delete elements not in incoming list
            const deletedElementIds = existingSlideElements
              .filter((e) => !incomingElementIds.has(e.id))
              .map((e) => e.id);

            if (deletedElementIds.length > 0) {
              await tx.element.deleteMany({
                where: { id: { in: deletedElementIds } },
              });
            }

            // Process elements
            for (let elIdx = 0; elIdx < slideInput.elements.length; elIdx++) {
              const elInput = slideInput.elements[elIdx];
              if (!elInput) continue;

              const isExistingElement = isValidUuid(elInput.id) && dbElementMap.has(elInput.id!);

              const elementType: ElementType =
                elInput.type === "IMAGE" || elInput.type === "TEXT" || elInput.type === "SHAPE"
                  ? (elInput.type as ElementType)
                  : ElementType.TEXT;

              // Use pre-validated asset ID set (O(1) memory lookup, zero database queries)
              const validAssetId =
                isValidUuid(elInput.assetId) && validAssetIdSet.has(elInput.assetId!)
                  ? elInput.assetId!
                  : null;

              const numX = Number(elInput.x);
              const x = Number.isFinite(numX) ? Math.round(numX) : 0;

              const numY = Number(elInput.y);
              const y = Number.isFinite(numY) ? Math.round(numY) : 0;

              const numW = Number(elInput.width);
              const width = Number.isFinite(numW) ? Math.max(1, Math.round(numW)) : 100;

              const numH = Number(elInput.height);
              const height = Number.isFinite(numH) ? Math.max(1, Math.round(numH)) : 100;

              const numRot = Number(elInput.rotation);
              const rotation = Number.isFinite(numRot) ? numRot : 0;

              const numOp = Number(elInput.opacity);
              const opacity = Number.isFinite(numOp) ? Math.min(1, Math.max(0, numOp)) : 1;

              const numZ = Number(elInput.zIndex);
              const zIndex = Number.isFinite(numZ) ? Math.round(numZ) : elIdx + 1;

              const safeProperties =
                typeof elInput.properties === "object" && elInput.properties !== null
                  ? JSON.parse(JSON.stringify(elInput.properties))
                  : {};

              const elementData = {
                type: elementType,
                x,
                y,
                width,
                height,
                rotation,
                opacity,
                locked: Boolean(elInput.locked),
                visible: elInput.visible !== false,
                zIndex,
                assetId: validAssetId,
                properties: safeProperties as Prisma.InputJsonValue,
              };

              if (isExistingElement) {
                await tx.element.update({
                  where: { id: elInput.id! },
                  data: elementData,
                });
              } else {
                newElementsToCreate.push({
                  slideId: currentSlideId,
                  ...elementData,
                });
              }
            }
          }
        }

        // Batch insert all new elements in a SINGLE query!
        if (newElementsToCreate.length > 0) {
          await tx.element.createMany({
            data: newElementsToCreate,
          });
        }
      }

      // Return the updated project with ordered slides, elements, and social account
      return tx.project.findUniqueOrThrow({
        where: { id },
        include: {
          socialAccount: {
            select: {
              id: true,
              platform: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          slides: {
            orderBy: { position: "asc" },
            include: {
              elements: {
                orderBy: { zIndex: "asc" },
                include: {
                  asset: {
                    select: { url: true },
                  },
                },
              },
            },
          },
        },
      });
    },
    {
      maxWait: 5000,
      timeout: 15000,
    },
  );
}

export async function deleteProject(id: string, userId: string) {
  const project = await db.project.findUnique({
    where: { id },
    include: { renders: true },
  });
  if (!project || project.userId !== userId) {
    throw new Error("Project not found or access denied");
  }

  // Clean up R2 objects for associated renders
  const storageService = getStorageService();
  if (project.renders && project.renders.length > 0) {
    for (const r of project.renders) {
      const keys: string[] = [];
      if (Array.isArray(r.outputUrls)) {
        for (const s of r.outputUrls as unknown as Array<{ storageKey?: string }>) {
          if (s.storageKey) keys.push(s.storageKey);
        }
      }
      if (r.thumbnailKey) keys.push(r.thumbnailKey);
      if (r.zipUrl) keys.push(r.zipUrl);
      for (const k of keys) {
        try {
          await storageService.deleteObject(k);
        } catch (err) {
          console.warn(`[Storage] Failed to delete render object ${k} during project cleanup:`, err);
        }
      }
    }
  }

  return db.project.delete({
    where: { id },
  });
}
