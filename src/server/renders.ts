import { db } from "@/server/db";
import { getStorageService } from "@/lib/storage";
import { RenderStatus, type Render as PrismaRender } from "@prisma/client";
import crypto from "crypto";

export interface RenderOutputSlideMeta {
  slideIndex: number;
  storageKey: string;
  width: number;
  height: number;
  fileName?: string;
  sizeBytes?: number;
}

export interface RenderSlideDto {
  slideIndex: number;
  storageKey: string;
  url: string;
  width: number;
  height: number;
  fileName?: string;
  sizeBytes?: number;
}

export interface RenderDto {
  id: string;
  userId: string;
  projectId: string;
  projectName: string;
  status: RenderStatus;
  slideCount: number;
  captionSnapshot: string | null;
  thumbnailUrl: string | null;
  thumbnailKey: string | null;
  slides: RenderSlideDto[];
  zipUrl: string | null;
  zipStorageKey: string | null;
  format: string;
  errorMessage: string | null;
  processingMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRenderSlideInput {
  slideIndex: number;
  fileName: string;
  width: number;
  height: number;
  buffer: Buffer;
  contentType?: string;
}

export interface CreateRenderInput {
  captionSnapshot?: string | null;
  format?: string;
  processingMs?: number;
  slides: CreateRenderSlideInput[];
  zipBuffer?: Buffer;
  zipFileName?: string;
}

export interface ListRendersOptions {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
}

export interface ListRendersResult {
  data: RenderDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Transforms a Prisma Render entity into a client-safe DTO with dynamically resolved presigned URLs.
 */
export async function serializeRender(
  render: PrismaRender & { project?: { id: string; title: string } | null },
): Promise<RenderDto> {
  const storageService = getStorageService();

  // 1. Parse raw output metadata
  const rawSlides: RenderOutputSlideMeta[] = Array.isArray(render.outputUrls)
    ? (render.outputUrls as unknown as RenderOutputSlideMeta[])
    : [];

  // 2. Generate signed download URLs for each slide
  const slides: RenderSlideDto[] = await Promise.all(
    rawSlides.map(async (s) => {
      let url = "";
      try {
        url = await storageService.getPresignedDownloadUrl(s.storageKey, 86400); // 24h validity
      } catch (err) {
        console.warn(`[Render] Failed to generate signed URL for slide key: ${s.storageKey}`, err);
        url = storageService.getPublicUrl(s.storageKey);
      }
      return {
        slideIndex: s.slideIndex,
        storageKey: s.storageKey,
        url,
        width: s.width,
        height: s.height,
        fileName: s.fileName,
        sizeBytes: s.sizeBytes,
      };
    }),
  );

  // 3. Resolve thumbnail URL (use thumbnailKey if present, or first slide)
  let thumbnailUrl: string | null = null;
  const thumbKey = render.thumbnailKey || rawSlides[0]?.storageKey;
  if (thumbKey) {
    try {
      thumbnailUrl = await storageService.getPresignedDownloadUrl(thumbKey, 86400);
    } catch {
      thumbnailUrl = storageService.getPublicUrl(thumbKey);
    }
  }

  // 4. Resolve ZIP download URL if present
  let zipUrl: string | null = null;
  if (render.zipUrl) {
    try {
      zipUrl = await storageService.getPresignedDownloadUrl(render.zipUrl, 86400);
    } catch {
      zipUrl = storageService.getPublicUrl(render.zipUrl);
    }
  }

  return {
    id: render.id,
    userId: render.userId,
    projectId: render.projectId,
    projectName: render.project?.title || "Untitled Project",
    status: render.status,
    slideCount: render.slideCount,
    captionSnapshot: render.captionSnapshot,
    thumbnailUrl,
    thumbnailKey: render.thumbnailKey,
    slides,
    zipUrl,
    zipStorageKey: render.zipUrl,
    format: render.format,
    errorMessage: render.errorMessage,
    processingMs: render.processingMs,
    createdAt: render.createdAt,
    updatedAt: render.updatedAt,
  };
}

/**
 * Creates a persisted Render artifact from client-generated slide images and uploads them to R2.
 */
export async function createRender(
  userId: string,
  projectId: string,
  input: CreateRenderInput,
): Promise<RenderDto> {
  // 1. Verify project ownership
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.userId !== userId) {
    throw new Error("Project not found or access denied");
  }

  if (!input.slides || input.slides.length === 0) {
    throw new Error("Cannot create a render with zero slides");
  }

  const renderId = crypto.randomUUID();
  const storageService = getStorageService();
  const outputMetas: RenderOutputSlideMeta[] = [];

  // 2. Upload each slide PNG to Cloudflare R2 / S3 storage
  for (const s of input.slides) {
    const slideNum = String(s.slideIndex + 1).padStart(2, "0");
    const sanitizedName = s.fileName
      ? s.fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
      : `slide-${slideNum}.png`;

    const storageKey = `renders/${userId}/${projectId}/${renderId}/slide-${slideNum}-${sanitizedName}`;
    const contentType = s.contentType || "image/png";

    await storageService.upload({
      key: storageKey,
      body: s.buffer,
      contentType,
      metadata: {
        userId,
        projectId,
        renderId,
        slideIndex: String(s.slideIndex),
      },
    });

    outputMetas.push({
      slideIndex: s.slideIndex,
      storageKey,
      width: s.width,
      height: s.height,
      fileName: sanitizedName,
      sizeBytes: s.buffer.length,
    });
  }

  // 3. Optional ZIP bundle upload
  let zipStorageKey: string | null = null;
  if (input.zipBuffer && input.zipBuffer.length > 0) {
    const zipName = input.zipFileName
      ? input.zipFileName.replace(/[^a-zA-Z0-9.-]/g, "_")
      : "carousel.zip";
    zipStorageKey = `renders/${userId}/${projectId}/${renderId}/${zipName}`;

    await storageService.upload({
      key: zipStorageKey,
      body: input.zipBuffer,
      contentType: "application/zip",
      metadata: {
        userId,
        projectId,
        renderId,
      },
    });
  }

  // 4. Capture immutable caption snapshot (Passed > Project's current caption > null)
  const captionSnapshot =
    input.captionSnapshot !== undefined
      ? input.captionSnapshot
      : project.caption || null;

  const thumbnailKey = outputMetas[0]?.storageKey || null;

  // 5. Persist Render record in PostgreSQL
  const render = await db.render.create({
    data: {
      id: renderId,
      userId,
      projectId,
      status: RenderStatus.COMPLETED,
      slideCount: input.slides.length,
      captionSnapshot,
      thumbnailKey,
      outputUrls: outputMetas as unknown as object,
      zipUrl: zipStorageKey,
      format: input.format || "png",
      processingMs: input.processingMs || null,
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return serializeRender(render);
}

/**
 * Returns a paginated list of renders for the authenticated user.
 */
export async function listRenders(
  userId: string,
  options: ListRendersOptions = {},
): Promise<ListRendersResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 12));
  const skip = (page - 1) * limit;

  const where: {
    userId: string;
    projectId?: string;
    project?: {
      title?: {
        contains: string;
        mode: "insensitive";
      };
    };
  } = {
    userId,
  };

  if (options.projectId) {
    where.projectId = options.projectId;
  }

  if (options.search && options.search.trim()) {
    where.project = {
      title: {
        contains: options.search.trim(),
        mode: "insensitive",
      },
    };
  }

  const [renders, total] = await Promise.all([
    db.render.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.render.count({ where }),
  ]);

  const data = await Promise.all(renders.map(serializeRender));

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieves a single render by ID with verified user ownership.
 */
export async function getRenderById(
  renderId: string,
  userId: string,
): Promise<RenderDto | null> {
  const render = await db.render.findUnique({
    where: { id: renderId },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!render || render.userId !== userId) {
    return null;
  }

  return serializeRender(render);
}

/**
 * Deletes a render record and purges all its associated slide PNGs and ZIPs from R2 storage.
 */
export async function deleteRender(
  renderId: string,
  userId: string,
): Promise<{ success: boolean }> {
  const render = await db.render.findUnique({
    where: { id: renderId },
  });

  if (!render || render.userId !== userId) {
    throw new Error("Render not found or access denied");
  }

  const storageService = getStorageService();

  // 1. Collect all storage keys to delete
  const keysToDelete: string[] = [];

  if (Array.isArray(render.outputUrls)) {
    for (const s of render.outputUrls as unknown as RenderOutputSlideMeta[]) {
      if (s.storageKey) keysToDelete.push(s.storageKey);
    }
  }

  if (render.thumbnailKey && !keysToDelete.includes(render.thumbnailKey)) {
    keysToDelete.push(render.thumbnailKey);
  }

  if (render.zipUrl && !keysToDelete.includes(render.zipUrl)) {
    keysToDelete.push(render.zipUrl);
  }

  // 2. Delete each object from R2 storage safely
  for (const key of keysToDelete) {
    try {
      await storageService.deleteObject(key);
    } catch (err) {
      console.warn(`[Storage] Failed to delete render object ${key}:`, err);
    }
  }

  // 3. Delete database record
  await db.render.delete({
    where: { id: renderId },
  });

  return { success: true };
}
