import sharp from "sharp";

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageMetadataInfo extends ImageDimensions {
  format?: string;
  hasAlpha?: boolean;
  orientation?: number;
  sizeBytes: number;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: keyof sharp.FitEnum;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

export async function getImageMetadata(input: Buffer | Uint8Array): Promise<ImageMetadataInfo> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation,
    sizeBytes: buffer.length,
  };
}

export async function processImage(
  input: Buffer | Uint8Array,
  options: ResizeOptions = {},
): Promise<Buffer> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  let pipeline = sharp(buffer).rotate(); // auto-rotate based on EXIF

  if (options.width || options.height) {
    pipeline = pipeline.resize({
      width: options.width,
      height: options.height,
      fit: options.fit ?? "inside",
      withoutEnlargement: true,
    });
  }

  const quality = options.quality ?? 85;
  const format = options.format ?? "webp";

  switch (format) {
    case "jpeg":
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case "png":
      pipeline = pipeline.png({ quality: Math.min(quality, 100) });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
  }

  return pipeline.toBuffer();
}

export async function generateThumbnail(
  input: Buffer | Uint8Array,
  maxDimension = 320,
): Promise<Buffer> {
  return processImage(input, {
    width: maxDimension,
    height: maxDimension,
    fit: "inside",
    quality: 80,
    format: "webp",
  });
}

export async function compositeOverlays(
  baseInput: Buffer | Uint8Array,
  overlays: Array<{
    input: Buffer | Uint8Array;
    top?: number;
    left?: number;
    blend?: sharp.Blend;
  }>,
): Promise<Buffer> {
  const baseBuffer = Buffer.isBuffer(baseInput) ? baseInput : Buffer.from(baseInput);

  const formattedOverlays = overlays.map((o) => ({
    input: Buffer.isBuffer(o.input) ? o.input : Buffer.from(o.input),
    top: o.top,
    left: o.left,
    blend: o.blend ?? "over",
  }));

  return sharp(baseBuffer).composite(formattedOverlays).toBuffer();
}
