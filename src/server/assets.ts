import { db } from "@/server/db";
import { getStorageService } from "@/lib/storage";
import { getImageMetadata } from "@/lib/media/image-processor";
import { AssetStatus, type Asset as PrismaAsset } from "@prisma/client";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export interface AssetDto {
  id: string;
  userId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  storageKey: string;
  url: string;
  category: string | null;
  status: AssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Maps a Prisma Asset model with native BigInt to a JSON-serializable AssetDto.
 */
export function serializeAsset(asset: PrismaAsset): AssetDto {
  return {
    id: asset.id,
    userId: asset.userId,
    filename: asset.filename,
    originalFilename: asset.originalFilename,
    mimeType: asset.mimeType,
    sizeBytes: Number(asset.sizeBytes),
    width: asset.width,
    height: asset.height,
    storageKey: asset.storageKey,
    url: asset.url || `/api/assets/${asset.id}/view`,
    category: asset.category,
    status: asset.status,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

export async function listAssets(userId: string): Promise<AssetDto[]> {
  const assets = await db.asset.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return assets.map(serializeAsset);
}

export async function getAssetById(id: string, userId: string): Promise<AssetDto | null> {
  const asset = await db.asset.findUnique({
    where: { id },
  });

  if (!asset || asset.userId !== userId) {
    return null;
  }

  return serializeAsset(asset);
}

export async function createAssetFromUpload(
  userId: string,
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string,
  category?: string,
): Promise<AssetDto> {
  // 1. Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size (${(fileBuffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed size of 10MB`);
  }

  // 2. Validate MIME type
  const normalizedMime = mimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed types: PNG, JPEG, WebP`);
  }

  // 3. Extract dimensions and metadata with Sharp
  let width: number | null = null;
  let height: number | null = null;
  try {
    const meta = await getImageMetadata(fileBuffer);
    width = meta.width || null;
    height = meta.height || null;
  } catch (err) {
    console.warn("Could not extract image dimensions with Sharp:", err);
  }

  // 4. Generate unique ID and clean storage key
  const assetId = crypto.randomUUID();
  const sanitizedFilename = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_{2,}/g, "_");
  const storageKey = `assets/${userId}/${assetId}/${sanitizedFilename}`;

  // 5. Upload buffer to Cloudflare R2 / S3
  const storageService = getStorageService();
  try {
    await storageService.upload({
      key: storageKey,
      body: fileBuffer,
      contentType: normalizedMime,
      metadata: {
        userId,
        assetId,
        originalFilename: encodeURIComponent(originalFilename),
      },
    });
  } catch (uploadError) {
    console.error("[Storage] R2 upload failed:", uploadError);
    throw new Error("Failed to upload image to object storage");
  }

  // 6. Create Asset record in Neon PostgreSQL
  try {
    const asset = await db.asset.create({
      data: {
        id: assetId,
        userId,
        filename: sanitizedFilename,
        originalFilename,
        mimeType: normalizedMime,
        sizeBytes: BigInt(fileBuffer.length),
        width,
        height,
        storageKey,
        url: `/api/assets/${assetId}/view`,
        category: category || null,
        status: AssetStatus.READY,
      },
    });

    return serializeAsset(asset);
  } catch (dbError) {
    console.error("[DB] Failed to create Asset record:", dbError);
    // Cleanup R2 object on DB error
    try {
      await storageService.deleteObject(storageKey);
    } catch (cleanupErr) {
      console.warn("[Storage] Failed to cleanup orphaned object:", cleanupErr);
    }
    throw new Error("Failed to record asset metadata in database");
  }
}

export async function getAssetDownloadBuffer(
  id: string,
  userId: string,
): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  const asset = await getAssetById(id, userId);
  if (!asset) {
    throw new Error("Asset not found or access denied");
  }

  const storageService = getStorageService();
  const buffer = await storageService.downloadBuffer(asset.storageKey);

  return {
    buffer,
    mimeType: asset.mimeType,
    filename: asset.filename,
  };
}

export async function updateAssetCategory(
  userId: string,
  assetId: string,
  category: string | null,
): Promise<AssetDto> {
  const existing = await db.asset.findUnique({
    where: { id: assetId },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Asset not found or access denied");
  }

  const normalizedCategory = category ? category.trim() || null : null;

  const updated = await db.asset.update({
    where: { id: assetId },
    data: {
      category: normalizedCategory,
    },
  });

  return serializeAsset(updated);
}

export async function deleteAsset(
  userId: string,
  assetId: string,
): Promise<{ success: boolean }> {
  const existing = await db.asset.findUnique({
    where: { id: assetId },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Asset not found or access denied");
  }

  // Delete from object storage
  const storageService = getStorageService();
  try {
    await storageService.deleteObject(existing.storageKey);
  } catch (err) {
    console.warn(`[Storage] Failed to delete storage object: ${existing.storageKey}`, err);
  }

  // Delete record from DB
  await db.asset.delete({
    where: { id: assetId },
  });

  return { success: true };
}

/**
 * Resolves a random asset from an in-memory candidate pool of assets (usable on both client & server).
 *
 * Fallback order:
 * 1. Exact category match (case-insensitive) where status === "READY"
 * 2. Uncategorized assets (category is null or empty) where status === "READY"
 * 3. Any READY asset
 * 4. No assets -> null
 */
export function resolveRandomAssetFromPool<T extends { status?: string; category?: string | null }>(
  assets: T[],
  category?: string,
): T | null {
  if (!assets || assets.length === 0) return null;

  const readyAssets = assets.filter((a) => (a.status ? a.status === "READY" : true));
  if (readyAssets.length === 0) return null;

  // POOL 1 — Exact category match (case-insensitive)
  if (category && category.trim()) {
    const normalizedTarget = category.trim().toLowerCase();
    const categoryMatches = readyAssets.filter(
      (a) => a.category && a.category.trim().toLowerCase() === normalizedTarget,
    );
    if (categoryMatches.length > 0) {
      return categoryMatches[Math.floor(Math.random() * categoryMatches.length)] ?? null;
    }
  }

  // POOL 2 — Uncategorized assets
  const uncategorized = readyAssets.filter((a) => !a.category || a.category.trim() === "");
  if (uncategorized.length > 0) {
    return uncategorized[Math.floor(Math.random() * uncategorized.length)] ?? null;
  }

  // POOL 3 — Any READY asset
  return readyAssets[Math.floor(Math.random() * readyAssets.length)] ?? null;
}

/**
 * Server-side domain function to resolve a random asset for a user matching a given category.
 * Strictly scoped by userId (multi-tenant safe).
 */
export async function resolveRandomAssetByCategory(
  userId: string,
  category?: string,
): Promise<AssetDto | null> {
  // POOL 1 — Exact category match (case-insensitive)
  if (category && category.trim()) {
    const categoryMatches = await db.asset.findMany({
      where: {
        userId,
        status: AssetStatus.READY,
        category: {
          equals: category.trim(),
          mode: "insensitive",
        },
      },
    });

    if (categoryMatches.length > 0) {
      const chosen = categoryMatches[Math.floor(Math.random() * categoryMatches.length)];
      if (chosen) return serializeAsset(chosen);
    }
  }

  // POOL 2 — Uncategorized assets
  const uncategorized = await db.asset.findMany({
    where: {
      userId,
      status: AssetStatus.READY,
      OR: [{ category: null }, { category: "" }],
    },
  });

  if (uncategorized.length > 0) {
    const chosen = uncategorized[Math.floor(Math.random() * uncategorized.length)];
    if (chosen) return serializeAsset(chosen);
  }

  // POOL 3 — Any READY asset
  const allReady = await db.asset.findMany({
    where: {
      userId,
      status: AssetStatus.READY,
    },
  });

  if (allReady.length > 0) {
    const chosen = allReady[Math.floor(Math.random() * allReady.length)];
    if (chosen) return serializeAsset(chosen);
  }

  // POOL 4 — No assets
  return null;
}
