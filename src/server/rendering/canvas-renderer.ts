import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { registerFonts } from "./fonts";
import { drawTextElement } from "./text-layout";
import { processImage } from "@/lib/media/image-processor";
import { getStorageService } from "@/lib/storage";
import { db } from "@/server/db";
import type {
  RenderSlide,
  RenderElement,
  RenderOptions,
  RenderTextProperties,
  RenderImageProperties,
  RenderShapeProperties,
} from "@/types/rendering";

export class CanvasRenderer {
  private width: number;
  private height: number;

  constructor(width = 1080, height = 1080) {
    this.width = width;
    this.height = height;
    registerFonts();
  }

  async renderSlide(
    slide: RenderSlide,
    options: RenderOptions = {},
  ): Promise<Buffer> {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext("2d");

    // 1. Fill background color
    ctx.fillStyle = slide.backgroundColor || "#FFFFFF";
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw background image if available
    if (slide.backgroundImageBuffer) {
      try {
        const bgImg = await loadImage(slide.backgroundImageBuffer);
        const scale = Math.max(
          this.width / bgImg.width,
          this.height / bgImg.height,
        );
        const bgW = bgImg.width * scale;
        const bgH = bgImg.height * scale;
        const bgX = (this.width - bgW) / 2;
        const bgY = (this.height - bgH) / 2;
        ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
      } catch {
        // Skip corrupted background image
      }
    }

    // 3. Sort elements by zIndex
    const sortedElements = [...slide.elements].sort(
      (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
    );

    // 4. Render elements
    for (const el of sortedElements) {
      await this.renderElement(ctx, el);
    }

    // 5. Output image buffer
    const rawPngBuffer = canvas.toBuffer("image/png");
    return processImage(rawPngBuffer, {
      format: options.format ?? "png",
      quality: options.quality ?? 90,
    });
  }

  private async renderElement(
    ctx: SKRSContext2D,
    el: RenderElement,
  ): Promise<void> {
    ctx.save();

    // Apply opacity
    if (typeof el.opacity === "number" && el.opacity < 1) {
      ctx.globalAlpha = Math.max(0, el.opacity);
    }

    // Apply rotation around element center
    if (el.rotation && el.rotation !== 0) {
      const centerX = el.x + el.width / 2;
      const centerY = el.y + el.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    switch (el.type) {
      case "SHAPE":
        this.renderShape(ctx, el);
        break;
      case "TEXT":
        this.renderText(ctx, el);
        break;
      case "IMAGE":
        await this.renderImage(ctx, el);
        break;
    }

    ctx.restore();
  }

  private renderShape(ctx: SKRSContext2D, el: RenderElement): void {
    const props = el.properties as RenderShapeProperties;
    const cornerRadius = props.cornerRadius ?? 0;
    const fillColor = props.fillColor ?? "#3B82F6";
    const strokeColor = props.strokeColor;
    const strokeWidth = props.strokeWidth ?? 0;

    ctx.beginPath();
    if (props.shapeType === "circle") {
      const rx = el.width / 2;
      const ry = el.height / 2;
      ctx.ellipse(el.x + rx, el.y + ry, rx, ry, 0, 0, Math.PI * 2);
    } else if (cornerRadius > 0 && typeof ctx.roundRect === "function") {
      ctx.roundRect(el.x, el.y, el.width, el.height, cornerRadius);
    } else {
      ctx.rect(el.x, el.y, el.width, el.height);
    }

    ctx.fillStyle = fillColor;
    ctx.fill();

    if (strokeColor && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  private renderText(ctx: SKRSContext2D, el: RenderElement): void {
    const props = el.properties as RenderTextProperties;
    drawTextElement(ctx, props, el.x, el.y, el.width);
  }

  private async renderImage(
    ctx: SKRSContext2D,
    el: RenderElement,
  ): Promise<void> {
    const props = el.properties as RenderImageProperties;
    if (!props.src) return;

    try {
      let imageBuffer: Buffer | null = null;
      if (props.src.startsWith("data:")) {
        const parts = props.src.split(",");
        const base64Data = parts[1];
        if (base64Data) {
          imageBuffer = Buffer.from(base64Data, "base64");
        }
      } else if (props.src.startsWith("http://") || props.src.startsWith("https://")) {
        const res = await fetch(props.src);
        if (res.ok) {
          imageBuffer = Buffer.from(await res.arrayBuffer());
        }
      } else if (props.src.startsWith("/api/assets/") || props.assetId) {
        const assetId =
          props.assetId ||
          props.src.replace(/^\/api\/assets\//, "").replace(/\/view.*$/, "");
        if (assetId) {
          const asset = await db.asset.findUnique({ where: { id: assetId } });
          if (asset?.storageKey) {
            const storageService = getStorageService();
            imageBuffer = await storageService.downloadBuffer(asset.storageKey);
          }
        }
      }

      if (imageBuffer) {
        const img = await loadImage(imageBuffer);
        ctx.drawImage(img, el.x, el.y, el.width, el.height);
      }
    } catch {
      // Draw placeholder bounding box if image fails to load
      ctx.strokeStyle = "rgba(150,150,150,0.5)";
      ctx.strokeRect(el.x, el.y, el.width, el.height);
    }
  }
}
