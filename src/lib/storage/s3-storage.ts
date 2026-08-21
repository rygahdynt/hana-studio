import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  StorageService,
  UploadOptions,
  UploadResult,
  PresignedUploadOptions,
  PresignedUploadResult,
} from "./types";

export interface S3StorageConfig {
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  publicUrlPrefix?: string;
}

export class S3StorageService implements StorageService {
  private client: S3Client;
  private bucket: string;
  private publicUrlPrefix?: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.publicUrlPrefix = config.publicUrlPrefix?.replace(/\/+$/, "");

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region ?? "auto",
      forcePathStyle: config.forcePathStyle ?? true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const body = Buffer.isBuffer(options.body)
      ? options.body
      : Buffer.from(options.body);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      Body: body,
      ContentType: options.contentType,
      Metadata: options.metadata,
    });

    await this.client.send(command);

    return {
      key: options.key,
      url: this.getPublicUrl(options.key),
      sizeBytes: body.length,
      contentType: options.contentType,
    };
  }

  async downloadBuffer(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Empty response body for object: ${key}`);
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async getPresignedUploadUrl(
    options: PresignedUploadOptions,
  ): Promise<PresignedUploadResult> {
    const expiresIn = options.expiresInSeconds ?? 3600;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      ContentType: options.contentType,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn,
    });

    return {
      url,
      key: options.key,
      expiresInSeconds: expiresIn,
    };
  }

  getPublicUrl(key: string): string {
    if (this.publicUrlPrefix) {
      return `${this.publicUrlPrefix}/${key.replace(/^\/+/, "")}`;
    }
    return `/api/assets/raw/${encodeURIComponent(key)}`;
  }
}
