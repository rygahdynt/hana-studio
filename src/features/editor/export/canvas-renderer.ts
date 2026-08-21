import Konva from "konva";
import type { EditorSlide, ImageElement } from "../types";
import type { ExportOptions } from "./types";

/**
 * Loads an HTMLImageElement asynchronously with crossOrigin anonymous handling.
 */
function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`[Export Renderer] Failed to load image from source: ${src}`);
      reject(new Error(`Failed to load image asset: ${src}`));
    };
    img.src = src;
  });
}

/**
 * Renders an EditorSlide directly to a standalone, full-resolution Blob.
 * Non-destructive, off-screen, completely independent of current UI zoom scale or selection.
 */
export async function renderSlideToBlob(
  slide: EditorSlide,
  width: number,
  height: number,
  options: ExportOptions,
): Promise<Blob> {
  // 1. Ensure fonts are ready
  if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Font readiness fallback
    }
  }

  // 2. Preload all slide images (background and image elements)
  const imageElements = slide.elements.filter(
    (el): el is ImageElement => el.type === "IMAGE" && el.visible,
  );

  const imageMap = new Map<string, HTMLImageElement>();

  const loadPromises: Promise<void>[] = [];

  if (slide.backgroundImageUrl) {
    loadPromises.push(
      loadImageAsync(slide.backgroundImageUrl)
        .then((img) => {
          imageMap.set(slide.backgroundImageUrl!, img);
        })
        .catch((err) => {
          console.warn("[Export Renderer] Background image load warning:", err);
        }),
    );
  }

  for (const el of imageElements) {
    if (el.src && !imageMap.has(el.src)) {
      loadPromises.push(
        loadImageAsync(el.src)
          .then((img) => {
            imageMap.set(el.src, img);
          })
          .catch((err) => {
            console.warn(`[Export Renderer] Asset image load warning for element ${el.id}:`, err);
          }),
      );
    }
  }

  await Promise.all(loadPromises);

  // 3. Create off-screen rendering container
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-99999px";
  container.style.left = "-99999px";
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);

  // 4. Initialize Konva Stage with exact project dimensions
  const stage = new Konva.Stage({
    container,
    width,
    height,
    scaleX: 1,
    scaleY: 1,
  });

  const layer = new Konva.Layer();
  stage.add(layer);

  // 5. Render Background (Color and optional Image)
  const bgRect = new Konva.Rect({
    x: 0,
    y: 0,
    width,
    height,
    fill: slide.backgroundColor || "#FFFFFF",
  });
  layer.add(bgRect);

  if (slide.backgroundImageUrl && imageMap.has(slide.backgroundImageUrl)) {
    const bgImg = imageMap.get(slide.backgroundImageUrl)!;
    const bgScale = Math.max(width / bgImg.width, height / bgImg.height);
    const imgW = bgImg.width * bgScale;
    const imgH = bgImg.height * bgScale;
    const imgX = (width - imgW) / 2;
    const imgY = (height - imgH) / 2;

    const bgKonvaImg = new Konva.Image({
      image: bgImg,
      x: imgX,
      y: imgY,
      width: imgW,
      height: imgH,
    });
    layer.add(bgKonvaImg);
  }

  // 6. Render Elements in exact zIndex order
  const visibleElements = slide.elements.filter((el) => el.visible);
  const sortedElements = [...visibleElements].sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sortedElements) {
    if (el.type === "TEXT") {
      const textNode = new Konva.Text({
        x: el.x,
        y: el.y,
        width: el.width,
        text: el.text,
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        fill: el.color,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth ?? 0,
        fillAfterStrokeEnabled: !!el.stroke,
        align: el.align,
        opacity: el.opacity,
        rotation: el.rotation,
        lineHeight: el.lineHeight || 1.2,
      });
      layer.add(textNode);
    } else if (el.type === "SHAPE") {
      if (el.shapeType === "circle") {
        const circleNode = new Konva.Circle({
          x: el.x + el.width / 2,
          y: el.y + el.height / 2,
          radius: el.width / 2,
          fill: el.fillColor,
          stroke: el.strokeColor,
          strokeWidth: el.strokeWidth ?? 0,
          opacity: el.opacity,
          rotation: el.rotation,
        });
        layer.add(circleNode);
      } else {
        const rectNode = new Konva.Rect({
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          fill: el.fillColor,
          stroke: el.strokeColor,
          strokeWidth: el.strokeWidth ?? 0,
          cornerRadius: el.cornerRadius,
          opacity: el.opacity,
          rotation: el.rotation,
        });
        layer.add(rectNode);
      }
    } else if (el.type === "IMAGE") {
      const imgObj = imageMap.get(el.src);
      if (imgObj) {
        const imageNode = new Konva.Image({
          image: imgObj,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          opacity: el.opacity,
          rotation: el.rotation,
        });
        layer.add(imageNode);
      }
    }
  }

  layer.batchDraw();

  // 7. Extract full-resolution Blob
  const mimeType = options.format === "jpg" ? "image/jpeg" : "image/png";
  const quality = options.quality ?? 0.92;

  const blob: Blob = await new Promise((resolve, reject) => {
    stage.toBlob({
      mimeType,
      quality,
      pixelRatio: 1,
      callback: (resBlob) => {
        if (resBlob) {
          resolve(resBlob);
        } else {
          reject(new Error("Konva stage failed to produce output image Blob."));
        }
      },
    });
  });

  // 8. Cleanup off-screen resources
  stage.destroy();
  if (container.parentNode) {
    container.parentNode.removeChild(container);
  }

  return blob;
}
