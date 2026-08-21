import type { EditorProject, EditorSlide } from "../types";
import type { ExportFormat, ExportProgress } from "./types";
import { renderSlideToBlob } from "./canvas-renderer";
import { getSlideFilename, getZipFilename } from "./filename";

/**
 * Triggers a browser file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup Object URL after download starts
  setTimeout(() => {
    if (anchor.parentNode) {
      anchor.parentNode.removeChild(anchor);
    }
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Exports a single slide as full-resolution PNG or JPG.
 */
export async function exportSingleSlide(
  project: EditorProject,
  slideId: string,
  format: ExportFormat,
): Promise<void> {
  const sortedSlides = [...project.slides].sort((a, b) => a.position - b.position);
  const slideIndex = sortedSlides.findIndex((s) => s.id === slideId);

  if (slideIndex === -1) {
    throw new Error("Slide not found in project.");
  }

  const slide = sortedSlides[slideIndex];
  if (!slide) {
    throw new Error("Slide not found in project.");
  }
  const slideNumber = slideIndex + 1;

  const blob = await renderSlideToBlob(
    slide,
    project.slideWidth,
    project.slideHeight,
    { format },
  );

  const filename = getSlideFilename(project.title, slideNumber, format);
  downloadBlob(blob, filename);
}

/**
 * Exports all project slides into a single compressed ZIP archive.
 */
export async function exportAllSlidesAsZip(
  project: EditorProject,
  format: ExportFormat,
  onProgress?: (progress: ExportProgress) => void,
): Promise<void> {
  const sortedSlides = [...project.slides].sort((a, b) => a.position - b.position);
  const total = sortedSlides.length;

  if (total === 0) {
    throw new Error("Project contains no slides to export.");
  }

  // Dynamic import of JSZip
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (let i = 0; i < total; i++) {
    const slide = sortedSlides[i];
    if (!slide) continue;
    const slideNumber = i + 1;

    if (onProgress) {
      onProgress({
        current: slideNumber,
        total,
        message: `Rendering slide ${slideNumber} of ${total}...`,
      });
    }

    const blob = await renderSlideToBlob(
      slide,
      project.slideWidth,
      project.slideHeight,
      { format },
    );

    const filename = getSlideFilename(project.title, slideNumber, format);
    zip.file(filename, blob);
  }

  if (onProgress) {
    onProgress({
      current: total,
      total,
      message: "Compressing ZIP archive...",
    });
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipFilename = getZipFilename(project.title);
  downloadBlob(zipBlob, zipFilename);
}

/**
 * Exports all slides as individual files with sequential browser downloads.
 */
export async function exportAllSlidesIndividually(
  project: EditorProject,
  format: ExportFormat,
  onProgress?: (progress: ExportProgress) => void,
): Promise<void> {
  const sortedSlides = [...project.slides].sort((a, b) => a.position - b.position);
  const total = sortedSlides.length;

  if (total === 0) {
    throw new Error("Project contains no slides to export.");
  }

  for (let i = 0; i < total; i++) {
    const slide = sortedSlides[i];
    if (!slide) continue;
    const slideNumber = i + 1;

    if (onProgress) {
      onProgress({
        current: slideNumber,
        total,
        message: `Exporting slide ${slideNumber} of ${total}...`,
      });
    }

    const blob = await renderSlideToBlob(
      slide,
      project.slideWidth,
      project.slideHeight,
      { format },
    );

    const filename = getSlideFilename(project.title, slideNumber, format);
    downloadBlob(blob, filename);

    // Brief delay to ensure browser handles sequential downloads smoothly
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
