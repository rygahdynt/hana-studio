import AdmZip from "adm-zip";
import { CanvasRenderer } from "./canvas-renderer";
import type {
  RenderProject,
  RenderOptions,
  RenderProjectResult,
  RenderSlideResult,
} from "@/types/rendering";

export async function renderProjectToBuffers(
  project: RenderProject,
  options: RenderOptions = {},
): Promise<RenderProjectResult> {
  const format = options.format ?? "png";
  const extension = format === "jpeg" ? "jpg" : format;
  const contentType = `image/${format}`;

  const renderer = new CanvasRenderer(
    project.slideWidth || 1080,
    project.slideHeight || 1080,
  );

  const slideResults: RenderSlideResult[] = [];
  const sortedSlides = [...project.slides].sort(
    (a, b) => a.position - b.position,
  );

  for (let i = 0; i < sortedSlides.length; i++) {
    const slide = sortedSlides[i];
    if (!slide) continue;
    const slideNumber = i + 1;
    const fileName = `slide-${slideNumber}.${extension}`;

    const buffer = await renderer.renderSlide(slide, options);

    slideResults.push({
      slideId: slide.id,
      position: slide.position,
      buffer,
      fileName,
      contentType,
    });
  }

  // Create ZIP archive containing all rendered slides
  const zip = new AdmZip();
  for (const slideRes of slideResults) {
    zip.addFile(slideRes.fileName, Buffer.from(slideRes.buffer));
  }

  const zipBuffer = zip.toBuffer();
  const zipFileName = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-export.zip`;

  return {
    projectId: project.id,
    slides: slideResults,
    zipBuffer,
    zipFileName,
  };
}
