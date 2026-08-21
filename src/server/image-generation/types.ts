export interface ImageGenerationRequest {
  prompt: string;
  projectId?: string;
  category?: string;
  referenceAssetIds?: string[];
}

export interface ImageGenerationResult {
  assetId: string;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  url: string;
  filename: string;
}

export interface ReferenceImagePayload {
  buffer: Buffer;
  mimeType: string;
  assetId: string;
}
