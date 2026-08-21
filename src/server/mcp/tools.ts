import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { User } from "@prisma/client";
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "@/server/projects";
import {
  createRender,
  getRenderById,
  listRenders,
  type CreateRenderSlideInput,
} from "@/server/renders";
import type { RenderProject } from "@/types/rendering";
import { listAssets, resolveRandomAssetByCategory } from "@/server/assets";
import { generateImageAsset } from "@/server/image-generation";
import { listTemplates, getTemplateById } from "@/server/templates";
import { generateContentPlan } from "@/server/ai/generate-content";
import { contentBriefSchema, contentPlanSchema } from "@/features/content/validation/content-schema";
import { convertContentPlanToProject } from "@/features/content/bridge/content-to-editor";
import {
  createSlide,
  duplicateSlide,
  deleteSlide,
  reorderSlide,
  createTextElement,
  createShapeElement,
  createImageElement,
  deleteElementFromProject,
} from "@/features/editor/engine/editor-operations";
import type { EditorProject, EditorSlide } from "@/features/editor/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Registers all domain-backed Hana Studio MCP tools bound to the authenticated user.
 */
export function registerHanaStudioTools(server: McpServer, user: User) {
  // -------------------------------------------------------------------------
  // 1. User Identity
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_current_user",
    {
      description: "Get the authenticated Hana Studio user profile details.",
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: user.id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // 2. Project Management Tools
  // -------------------------------------------------------------------------
  server.registerTool(
    "list_projects",
    {
      description: "List all carousel projects owned by the authenticated user.",
    },
    async () => {
      const projects = await listProjects(user.id);
      const summary = projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        slideCount: p._count?.slides ?? 0,
        slideWidth: p.slideWidth,
        slideHeight: p.slideHeight,
        updatedAt: p.updatedAt,
        url: `${APP_URL}/projects/${p.id}`,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_project",
    {
      description: "Retrieve a specific project with its full slides and elements structure.",
      inputSchema: z.object({
        projectId: z.string().describe("The UUID of the project to retrieve"),
      }),
    },
    async ({ projectId }) => {
      const project = await getProjectById(projectId, user.id);
      if (!project) {
        return {
          isError: true,
          content: [{ type: "text", text: `Project with ID ${projectId} not found or access denied.` }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
      };
    },
  );

  server.registerTool(
    "create_project",
    {
      description: "Create a new blank carousel project with 1080x1920 (9:16) dimensions.",
      inputSchema: z.object({
        title: z.string().optional().describe("Project title"),
        description: z.string().optional().describe("Project description or notes"),
        caption: z.string().optional().describe("Project post caption"),
      }),
    },
    async ({ title, description, caption }) => {
      const project = await createProject(user.id, {
        title: title || "Untitled Carousel",
        description,
        caption,
        slideWidth: 1080,
        slideHeight: 1920,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: project.id,
                title: project.title,
                slideWidth: project.slideWidth,
                slideHeight: project.slideHeight,
                slideCount: project.slides.length,
                url: `${APP_URL}/projects/${project.id}`,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "delete_project",
    {
      description: "Delete a carousel project and purge its associated renders from storage.",
      inputSchema: z.object({
        projectId: z.string().describe("The UUID of the project to delete"),
      }),
    },
    async ({ projectId }) => {
      try {
        await deleteProject(projectId, user.id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  projectId,
                  message: "Project and associated render artifacts deleted successfully.",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to delete project: ${err instanceof Error ? err.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // 3. Content Generation & Bridge Tools
  // -------------------------------------------------------------------------
  server.registerTool(
    "generate_carousel_content",
    {
      description:
        "Generate a structured multi-slide ContentPlan from a creative ContentBrief using the server generation pipeline.",
      inputSchema: contentBriefSchema,
    },
    async (briefArgs) => {
      try {
        const contentPlan = await generateContentPlan(briefArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(contentPlan, null, 2) }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Content generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "create_project_from_content",
    {
      description:
        "Transform a structured ContentPlan into a fully populated visual EditorProject and save it to the database.",
      inputSchema: z.object({
        contentPlan: contentPlanSchema.describe("The structured content plan to convert"),
        templateId: z
          .string()
          .optional()
          .describe("Optional template ID to use (e.g. 'template-tiktok-dark-modern', 'template-tiktok-midnight-purple')"),
      }),
    },
    async ({ contentPlan, templateId }) => {
      try {
        let template = undefined;
        if (templateId) {
          const t = await getTemplateById(templateId);
          if (t) template = t.definition;
        }

        // 1. Convert ContentPlan to visual EditorProject with user's assets resolved
        const editorProject = await convertContentPlanToProject(contentPlan, {
          template,
          resolveAsset: (category) => resolveRandomAssetByCategory(user.id, category),
        });

        // 2. Create project record
        const project = await createProject(user.id, {
          title: editorProject.title,
          caption: contentPlan.caption || null,
          description: `Generated from ContentPlan: ${contentPlan.title}`,
          slideWidth: editorProject.slideWidth,
          slideHeight: editorProject.slideHeight,
        });

        // 3. Save slides & elements
        const updated = await updateProject(project.id, user.id, {
          title: editorProject.title,
          caption: contentPlan.caption || null,
          description: `Generated from ContentPlan: ${contentPlan.title}`,
          slideWidth: editorProject.slideWidth,
          slideHeight: editorProject.slideHeight,
          slides: editorProject.slides,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  projectId: updated.id,
                  title: updated.title,
                  slideCount: updated.slides.length,
                  url: `${APP_URL}/projects/${updated.id}`,
                  status: "SUCCESS",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to create project from content: ${err instanceof Error ? err.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // 4. Template Tools
  // -------------------------------------------------------------------------
  server.registerTool(
    "list_templates",
    {
      description: "List all available design templates with their color palettes, typography, and layout settings.",
    },
    async () => {
      const templates = await listTemplates();
      const summary = templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        primaryColor: t.definition.tokens.colors.primaryColor,
        backgroundColor: t.definition.tokens.colors.backgroundColor,
        fontFamily: t.definition.tokens.typography.fontFamily,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  // -------------------------------------------------------------------------
  // 5. Asset Management Tools
  // -------------------------------------------------------------------------
  server.registerTool(
    "list_assets",
    {
      description: "List uploaded image assets in the user's private media library.",
    },
    async () => {
      const assets = await listAssets(user.id);
      const summary = assets.map((a) => ({
        id: a.id,
        filename: a.filename,
        mimeType: a.mimeType,
        width: a.width,
        height: a.height,
        category: a.category,
        url: a.url,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  server.registerTool(
    "insert_asset_into_project",
    {
      description: "Insert an image asset from the media library into a specific slide of a project.",
      inputSchema: z.object({
        projectId: z.string().describe("The ID of the target project"),
        slideIndex: z.number().int().min(0).describe("0-based index of the target slide"),
        assetId: z.string().describe("The ID of the asset from the media library"),
      }),
    },
    async ({ projectId, slideIndex, assetId }) => {
      const project = await getProjectById(projectId, user.id);
      if (!project) {
        return { isError: true, content: [{ type: "text", text: `Project ${projectId} not found.` }] };
      }

      const assets = await listAssets(user.id);
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) {
        return { isError: true, content: [{ type: "text", text: `Asset ${assetId} not found in user library.` }] };
      }

      const targetSlide = project.slides[slideIndex];
      if (!targetSlide) {
        return { isError: true, content: [{ type: "text", text: `Slide index ${slideIndex} does not exist.` }] };
      }

      const newImage = createImageElement(
        targetSlide as unknown as EditorSlide,
        asset,
        { slideWidth: project.slideWidth, slideHeight: project.slideHeight },
      );

      const updatedSlides = project.slides.map((s, idx) => {
        if (idx !== slideIndex) return s;
        return {
          ...s,
          elements: [...s.elements, newImage],
        };
      });

      await updateProject(projectId, user.id, {
        slides: updatedSlides as unknown as EditorSlide[],
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, elementId: newImage.id, assetId: asset.id }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "generate_asset",
    {
      description:
        "Generate a new visual image asset using AI (optionally incorporating project creative direction / character guidelines and reference images) and save it directly to the user's Asset Library.",
      inputSchema: z.object({
        prompt: z.string().min(1).describe("The visual scene description or situation to generate"),
        projectId: z
          .string()
          .optional()
          .describe("Optional project UUID to apply the project's creative direction & character guidelines from its description"),
        referenceAssetIds: z
          .array(z.string())
          .optional()
          .describe("Optional asset UUIDs from the user's media library to use as character/identity visual references"),
      }),
    },
    async ({ prompt, projectId, referenceAssetIds }) => {
      try {
        const result = await generateImageAsset(user.id, {
          prompt,
          projectId,
          referenceAssetIds,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "SUCCESS",
                  assetId: result.assetId,
                  filename: result.filename,
                  width: result.width,
                  height: result.height,
                  mimeType: result.mimeType,
                  sizeBytes: result.sizeBytes,
                  url: result.url,
                  message: "Generated asset successfully and saved to Asset Library.",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Asset generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // -------------------------------------------------------------------------
  // 6. Slide Manipulation Tools
  // -------------------------------------------------------------------------
  server.registerTool(
    "add_slide",
    {
      description: "Append a new slide to a project.",
      inputSchema: z.object({
        projectId: z.string().describe("Project ID"),
        backgroundColor: z.string().optional().describe("Optional hex background color (e.g. '#121212')"),
      }),
    },
    async ({ projectId, backgroundColor }) => {
      const project = await getProjectById(projectId, user.id);
      if (!project) return { isError: true, content: [{ type: "text", text: `Project ${projectId} not found.` }] };

      const { project: updatedProject, newSlide } = createSlide(project as unknown as EditorProject, {
        backgroundColor,
      });

      await updateProject(projectId, user.id, {
        slides: updatedProject.slides,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, slideId: newSlide.id, totalSlides: updatedProject.slides.length }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "duplicate_slide",
    {
      description: "Duplicate an existing slide and all its elements within a project.",
      inputSchema: z.object({
        projectId: z.string().describe("Project ID"),
        slideId: z.string().describe("The ID of the slide to duplicate"),
      }),
    },
    async ({ projectId, slideId }) => {
      const project = await getProjectById(projectId, user.id);
      if (!project) return { isError: true, content: [{ type: "text", text: `Project ${projectId} not found.` }] };

      const { project: updatedProject, duplicatedSlide } = duplicateSlide(project as unknown as EditorProject, slideId);
      if (!duplicatedSlide) {
        return { isError: true, content: [{ type: "text", text: `Slide ${slideId} not found in project.` }] };
      }

      await updateProject(projectId, user.id, {
        slides: updatedProject.slides,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, duplicatedSlideId: duplicatedSlide.id, totalSlides: updatedProject.slides.length }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "delete_slide",
    {
      description: "Delete a slide from a project (guarded to maintain at least 1 slide).",
      inputSchema: z.object({
        projectId: z.string().describe("Project ID"),
        slideId: z.string().describe("The ID of the slide to delete"),
      }),
    },
    async ({ projectId, slideId }) => {
      const project = await getProjectById(projectId, user.id);
      if (!project) return { isError: true, content: [{ type: "text", text: `Project ${projectId} not found.` }] };

      const { project: updatedProject, success } = deleteSlide(project as unknown as EditorProject, slideId);
      if (!success) {
        return { isError: true, content: [{ type: "text", text: "Cannot delete slide: Projects must have at least 1 slide." }] };
      }

      await updateProject(projectId, user.id, {
        slides: updatedProject.slides,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, totalSlides: updatedProject.slides.length }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "reorder_slide",
    {
      description: "Move a slide from one position to another.",
      inputSchema: z.object({
        projectId: z.string().describe("Project ID"),
        fromIndex: z.number().int().min(0).describe("Current 0-based slide index"),
        toIndex: z.number().int().min(0).describe("Target 0-based slide index"),
      }),
    },
    async ({ projectId, fromIndex, toIndex }) => {
      const project = await getProjectById(projectId, user.id);
      if (!project) return { isError: true, content: [{ type: "text", text: `Project ${projectId} not found.` }] };

      const updatedProject = reorderSlide(project as unknown as EditorProject, fromIndex, toIndex);

      await updateProject(projectId, user.id, {
        slides: updatedProject.slides,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, slideOrder: updatedProject.slides.map((s) => s.id) }, null, 2),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // 7. Element Manipulation Tools
  // -------------------------------------------------------------------------
  server.registerTool(
    "add_text",
    {
      description: "Add a text element to a slide.",
      inputSchema: z.object({
        projectId: z.string().describe("Project ID"),
        slideIndex: z.number().int().min(0).describe("0-based index of the target slide"),
        text: z.string().describe("Text content"),
        fontSize: z.number().optional().default(54),
        color: z.string().optional().default("#FFFFFF"),
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        align: z.enum(["left", "center", "right"]).optional().default("center"),
      }),
    },
    async ({ projectId, slideIndex, text, fontSize, color, x, y, width, height, align }) => {
      const project = await getProjectById(projectId, user.id);
      if (!project) return { isError: true, content: [{ type: "text", text: `Project ${projectId} not found.` }] };

      const targetSlide = project.slides[slideIndex];
      if (!targetSlide) return { isError: true, content: [{ type: "text", text: `Slide index ${slideIndex} does not exist.` }] };

      const newText = createTextElement(targetSlide as unknown as EditorSlide, {
        text,
        fontSize,
        color,
        x,
        y,
        width,
        height,
        align,
      });

      const updatedSlides = project.slides.map((s, idx) => {
        if (idx !== slideIndex) return s;
        return { ...s, elements: [...s.elements, newText] };
      });

      await updateProject(projectId, user.id, {
        slides: updatedSlides as unknown as EditorSlide[],
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, elementId: newText.id }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "add_shape",
    {
      description: "Add a geometric shape (rectangle or circle) to a slide.",
      inputSchema: z.object({
        projectId: z.string().describe("Project ID"),
        slideIndex: z.number().int().min(0).describe("0-based index of the target slide"),
        shapeType: z.enum(["rectangle", "circle"]).describe("Type of shape"),
        fillColor: z.string().optional().default("#3B82F6"),
        cornerRadius: z.number().optional().default(16),
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().optional().default(300),
        height: z.number().optional().default(300),
      }),
    },
    async ({ projectId, slideIndex, shapeType, fillColor, cornerRadius, x, y, width, height }) => {
      const project = await getProjectById(projectId, user.id);
      if (!project) return { isError: true, content: [{ type: "text", text: `Project ${projectId} not found.` }] };

      const targetSlide = project.slides[slideIndex];
      if (!targetSlide) return { isError: true, content: [{ type: "text", text: `Slide index ${slideIndex} does not exist.` }] };

      const newShape = createShapeElement(targetSlide as unknown as EditorSlide, shapeType, {
        fillColor,
        cornerRadius,
        x,
        y,
        width,
        height,
      });

      const updatedSlides = project.slides.map((s, idx) => {
        if (idx !== slideIndex) return s;
        return { ...s, elements: [...s.elements, newShape] };
      });

      await updateProject(projectId, user.id, {
        slides: updatedSlides as unknown as EditorSlide[],
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, elementId: newShape.id }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "delete_element",
    {
      description: "Delete an element from a slide.",
      inputSchema: z.object({
        projectId: z.string().describe("Project ID"),
        slideId: z.string().describe("Slide ID"),
        elementId: z.string().describe("Element ID to delete"),
      }),
    },
    async ({ projectId, slideId, elementId }) => {
      try {
        const project = await getProjectById(projectId, user.id);
        if (!project) return { isError: true, content: [{ type: "text", text: `Project ${projectId} not found.` }] };

        const updatedProject = deleteElementFromProject(project as unknown as EditorProject, slideId, elementId);
        await updateProject(projectId, user.id, {
          slides: updatedProject.slides,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, deletedElementId: elementId }, null, 2),
            },
          ],
        };
      } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to delete element: ${err instanceof Error ? err.message : "Unknown error"}`,
          },
        ],
      };
    }
  },
);

  // -------------------------------------------------------------------------
  // 8. Render & Artifact Management Tools
  // -------------------------------------------------------------------------
  server.registerTool(
    "render_project",
    {
      description:
        "Render a carousel project into immutable visual artifacts (PNG slide images + optional ZIP archive), upload them to R2 object storage, and save a persistent Render record.",
      inputSchema: z.object({
        projectId: z.string().describe("The UUID of the project to render"),
        format: z
          .enum(["png", "jpeg", "webp"])
          .optional()
          .default("png")
          .describe("Image output format (default: 'png')"),
        quality: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .default(90)
          .describe("Image output quality for jpeg/webp (1-100, default: 90)"),
        captionSnapshot: z
          .string()
          .optional()
          .describe("Optional custom caption to freeze with this render (defaults to project's current caption)"),
      }),
    },
    async ({ projectId, format, quality, captionSnapshot }) => {
      try {
        const project = await getProjectById(projectId, user.id);
        if (!project) {
          return {
            isError: true,
            content: [{ type: "text", text: `Project with ID ${projectId} not found or access denied.` }],
          };
        }

        if (!project.slides || project.slides.length === 0) {
          return {
            isError: true,
            content: [{ type: "text", text: `Project ${projectId} has no slides to render.` }],
          };
        }

        // 1. Build RenderProject input structure for headless canvas renderer
        const renderProjectInput: RenderProject = {
          id: project.id,
          title: project.title,
          slideWidth: project.slideWidth || 1080,
          slideHeight: project.slideHeight || 1920,
          slides: project.slides.map((s) => ({
            id: s.id,
            position: s.position,
            backgroundColor: s.backgroundColor || undefined,
            backgroundImageUrl: s.backgroundImageUrl || undefined,
            elements: s.elements.map((el) => ({
              id: el.id,
              type: el.type as "IMAGE" | "TEXT" | "SHAPE",
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              rotation: el.rotation || 0,
              opacity: el.opacity ?? 1,
              zIndex: el.zIndex,
              properties: {
                ...(typeof el.properties === "object" && el.properties !== null
                  ? (el.properties as Record<string, unknown>)
                  : {}),
                ...(el.asset?.url
                  ? { src: ((el.properties as Record<string, unknown>)?.src as string) || el.asset.url }
                  : {}),
                ...(el.assetId ? { assetId: el.assetId } : {}),
              },
            })),
          })),
        };

        // 2. Execute headless server-side rendering (dynamically loaded server-only module)
        const { renderProjectToBuffers } = await import("@/server/rendering/exporter");
        const startTime = Date.now();
        const renderResult = await renderProjectToBuffers(renderProjectInput, {
          format: format || "png",
          quality: quality || 90,
        });
        const processingMs = Date.now() - startTime;

        // 3. Prepare slide inputs for R2 upload & persistence
        const slides: CreateRenderSlideInput[] = renderResult.slides.map((s, idx) => ({
          slideIndex: idx,
          fileName: s.fileName,
          width: project.slideWidth || 1080,
          height: project.slideHeight || 1920,
          buffer: Buffer.from(s.buffer),
          contentType: s.contentType,
        }));

        // 4. Create persistent Render record in database + R2
        const createdRender = await createRender(user.id, projectId, {
          captionSnapshot: captionSnapshot !== undefined ? captionSnapshot : project.caption,
          format: format || "png",
          processingMs,
          slides,
          zipBuffer: renderResult.zipBuffer ? Buffer.from(renderResult.zipBuffer) : undefined,
          zipFileName: renderResult.zipFileName,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "SUCCESS",
                  renderId: createdRender.id,
                  projectId: createdRender.projectId,
                  projectName: createdRender.projectName,
                  slideCount: createdRender.slideCount,
                  captionSnapshot: createdRender.captionSnapshot,
                  thumbnailUrl: createdRender.thumbnailUrl,
                  slides: createdRender.slides.map((s) => ({
                    slideIndex: s.slideIndex,
                    fileName: s.fileName,
                    width: s.width,
                    height: s.height,
                    url: s.url,
                  })),
                  zipUrl: createdRender.zipUrl,
                  format: createdRender.format,
                  processingMs: createdRender.processingMs,
                  createdAt: createdRender.createdAt,
                  message: "Project successfully rendered and persisted to R2 storage.",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Render execution failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "get_render",
    {
      description:
        "Retrieve a persistent Render record by its ID, including freshly generated presigned download URLs for all slide PNGs and ZIP archive.",
      inputSchema: z.object({
        renderId: z.string().describe("The UUID of the render to retrieve"),
      }),
    },
    async ({ renderId }) => {
      const render = await getRenderById(renderId, user.id);
      if (!render) {
        return {
          isError: true,
          content: [{ type: "text", text: `Render with ID ${renderId} not found or access denied.` }],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: render.id,
                projectId: render.projectId,
                projectName: render.projectName,
                status: render.status,
                slideCount: render.slideCount,
                captionSnapshot: render.captionSnapshot,
                thumbnailUrl: render.thumbnailUrl,
                slides: render.slides.map((s) => ({
                  slideIndex: s.slideIndex,
                  fileName: s.fileName,
                  width: s.width,
                  height: s.height,
                  url: s.url,
                })),
                zipUrl: render.zipUrl,
                format: render.format,
                processingMs: render.processingMs,
                createdAt: render.createdAt,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "list_renders",
    {
      description:
        "List recent persistent renders owned by the authenticated user with pagination, optional project filter, and presigned download URLs.",
      inputSchema: z.object({
        projectId: z
          .string()
          .optional()
          .describe("Optional project UUID to filter renders for a specific project"),
        page: z.number().int().min(1).optional().default(1).describe("Page number (default: 1)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(12)
          .describe("Number of renders per page (default: 12)"),
        search: z.string().optional().describe("Optional search term matching project name"),
      }),
    },
    async ({ projectId, page, limit, search }) => {
      const result = await listRenders(user.id, {
        projectId,
        page,
        limit,
        search,
      });

      const summary = result.data.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        projectName: r.projectName,
        status: r.status,
        slideCount: r.slideCount,
        captionSnapshot: r.captionSnapshot,
        thumbnailUrl: r.thumbnailUrl,
        slideUrls: r.slides.map((s) => s.url),
        zipUrl: r.zipUrl,
        format: r.format,
        createdAt: r.createdAt,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                renders: summary,
                pagination: result.pagination,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
