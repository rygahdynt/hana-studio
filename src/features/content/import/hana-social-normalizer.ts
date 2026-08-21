import type { ContentPlan, ContentSlide } from "@/types/content";
import {
  validateHanaSocialJson,
  type HanaSocialCarousel,
  type HanaSocialSlide,
} from "./hana-social-schema";

function deriveSlidePurpose(index: number, total: number): string {
  if (index === 0) return "hook";
  if (index === total - 1) return "cta";
  return "point";
}

function deriveProjectTitle(slides: HanaSocialSlide[], caption?: string): string {
  const firstSlideTitle = slides[0]?.title?.trim();
  if (firstSlideTitle) {
    // Strip emojis or extra symbols for title, limit to 60 chars
    return firstSlideTitle.slice(0, 60);
  }

  if (caption?.trim()) {
    const lines = caption.trim().split("\n");
    const firstLine = lines[0]?.trim();
    if (firstLine) {
      return firstLine.slice(0, 50);
    }
  }

  return "Imported Carousel";
}

function deriveHook(slides: HanaSocialSlide[]): string {
  const firstSlide = slides[0];
  if (firstSlide?.title?.trim()) {
    return firstSlide.title.trim();
  }
  if (firstSlide?.subtitle?.trim()) {
    return firstSlide.subtitle.trim();
  }
  return "Carousel Hook";
}

/**
 * Normalizes a raw hana-social JSON input (string, object, or array) into a valid Hana Studio ContentPlan.
 * Throws an Error with a user-friendly message if validation fails.
 */
export function normalizeHanaSocialCarousel(rawInput: unknown): ContentPlan {
  const validation = validateHanaSocialJson(rawInput);
  if (!validation.valid || !validation.data) {
    throw new Error(validation.error || "Failed to validate carousel JSON");
  }

  const carousel = validation.data;
  const slides = carousel.slides;
  const totalSlides = slides.length;

  const contentSlides: ContentSlide[] = slides.map((s, index) => {
    const slideNumber = index + 1;
    const purpose = deriveSlidePurpose(index, totalSlides);

    // Headline: prefer title, fallback to subtitle
    const headline = s.title?.trim() || s.subtitle?.trim() || `Slide ${slideNumber}`;

    // Body: if both title & subtitle exist, subtitle is body. If only subtitle exists, headline took it.
    const body = s.title?.trim() && s.subtitle?.trim() ? s.subtitle.trim() : undefined;

    // Visual category / hints
    const category = s.category?.trim();
    const visualDirection = category ? `Category: ${category}` : undefined;
    const assetHints = category ? [category] : undefined;

    return {
      slideNumber,
      purpose,
      category: category || undefined,
      badge: `SLIDE ${String(slideNumber).padStart(2, "0")}`,
      headline,
      body,
      visualDirection,
      assetHints,
      cta: purpose === "cta" ? (body || headline) : undefined,
    };
  });

  const title = deriveProjectTitle(slides, carousel.caption);
  const hook = deriveHook(slides);

  return {
    title,
    hook,
    slides: contentSlides,
    caption: carousel.caption?.trim() || undefined,
    cta: contentSlides[contentSlides.length - 1]?.cta,
  };
}
