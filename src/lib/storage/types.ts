export interface UploadOptions {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url: string;
  sizeBytes: number;
  contentType: string;
}

export interface PresignedUploadOptions {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}

export interface PresignedUploadResult {
  url: string;
  key: string;
  expiresInSeconds: number;
}

export interface StorageService {
  upload(options: UploadOptions): Promise<UploadResult>;
  downloadBuffer(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  getPresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  getPresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUploadResult>;
  getPublicUrl(key: string): string;
}
