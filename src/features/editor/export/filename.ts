import type { ExportFormat } from "./types";

/**
 * Sanitizes a project title into a clean, URL/filesystem-safe slug.
 * Example: "My Marketing Carousel! #1" -> "my-marketing-carousel-1"
 */
export function sanitizeProjectTitle(title?: string | null): string {
  if (!title || !title.trim()) {
    return "hana-studio-carousel";
  }

  const sanitized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "hana-studio-carousel";
}

/**
 * Formats a slide filename with 2-digit padding.
 * Example: "my-carousel-slide-01.png"
 */
export function getSlideFilename(
  projectTitle: string | null | undefined,
  slideNumber: number,
  format: ExportFormat,
): string {
  const base = sanitizeProjectTitle(projectTitle);
  const padIndex = String(slideNumber).padStart(2, "0");
  const ext = format === "jpg" ? "jpg" : "png";
  return `${base}-slide-${padIndex}.${ext}`;
}

/**
 * Formats a ZIP archive filename.
 * Example: "my-carousel.zip"
 */
export function getZipFilename(projectTitle: string | null | undefined): string {
  const base = sanitizeProjectTitle(projectTitle);
  return `${base}.zip`;
}
