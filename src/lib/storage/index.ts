import { S3StorageService } from "./s3-storage";
import type { StorageService } from "./types";

export * from "./types";
export * from "./s3-storage";

let storageInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (storageInstance) return storageInstance;

  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "auto";
  const bucket = process.env.S3_BUCKET || "hana-studio";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
  const publicUrlPrefix = process.env.S3_PUBLIC_URL;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";

  storageInstance = new S3StorageService({
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicUrlPrefix,
    forcePathStyle,
  });

  return storageInstance;
}
