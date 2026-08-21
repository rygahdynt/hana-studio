import { db } from "@/server/db";
import {
  createAssetFromUpload,
  getAssetDownloadBuffer,
} from "@/server/assets";
import { buildImageGenerationPrompt } from "./prompt-builder";
import { executeImageGeneration } from "./provider";
import type {
  ImageGenerationRequest,
  ImageGenerationResult,
  ReferenceImagePayload,
} from "./types";

/**
 * Generates an image visual asset, optionally incorporating project creative direction
 * and reference assets, then persists the image into Cloudflare R2 and Neon PostgreSQL.
 */
export async function generateImageAsset(
  userId: string,
  request: ImageGenerationRequest,
): Promise<ImageGenerationResult> {
  const prompt = request.prompt?.trim();
  if (!prompt) {
    throw new Error("Prompt is required for image generation.");
  }

  // 1. Resolve Project Creative Direction (if projectId is provided)
  let projectDescription: string | null = null;
  if (request.projectId) {
    const project = await db.project.findUnique({
      where: { id: request.projectId },
      select: { userId: true, description: true },
    });

    if (!project || project.userId !== userId) {
      throw new Error("Project not found or access denied.");
    }

    projectDescription = project.description;
  }

  // 2. Resolve and download Reference Assets (if referenceAssetIds are provided)
  const references: ReferenceImagePayload[] = [];
  if (request.referenceAssetIds && request.referenceAssetIds.length > 0) {
    if (request.referenceAssetIds.length > 2) {
      throw new Error("A maximum of 2 reference assets are supported per generation request.");
    }

    for (const assetId of request.referenceAssetIds) {
      try {
        const { buffer, mimeType } = await getAssetDownloadBuffer(assetId, userId);
        references.push({
          assetId,
          buffer,
          mimeType,
        });
      } catch (err) {
        console.warn(`[Image Generation] Failed to fetch reference asset ${assetId}:`, err);
        throw new Error(`Reference asset with ID ${assetId} not found or access denied.`);
      }
    }
  }

  // 3. Build structured, project-aware prompt
  const finalPrompt = buildImageGenerationPrompt(
    prompt,
    projectDescription,
    references.length > 0,
  );

  console.log(
    `[Image Generation] Initiating generation for user ${userId}. References: ${references.length}. Has Project Direction: ${Boolean(projectDescription)}`,
  );

  // 4. Call provider
  const { imageBuffer, mimeType } = await executeImageGeneration(
    finalPrompt,
    references,
  );

  // 5. Persist generated image to Cloudflare R2 + Prisma Asset
  const sanitizedPrompt = prompt
    .slice(0, 24)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_{2,}/g, "_");
  const filename = `gen_${sanitizedPrompt || "asset"}_${Date.now()}.png`;

  const asset = await createAssetFromUpload(
    userId,
    imageBuffer,
    filename,
    mimeType || "image/png",
    "ai-generated",
  );

  console.log(
    `[Image Generation] Successfully generated and stored asset ${asset.id} (${asset.width}x${asset.height}px, ${asset.sizeBytes} bytes).`,
  );

  return {
    assetId: asset.id,
    width: asset.width || 1024,
    height: asset.height || 1024,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    url: asset.url,
    filename: asset.filename,
  };
}
