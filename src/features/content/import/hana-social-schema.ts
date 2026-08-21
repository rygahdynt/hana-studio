import { z } from "zod";

/**
 * Zod schema for a single slide in the hana-social JSON contract.
 */
export const hanaSocialSlideSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  category: z.string().optional(),
}).refine(
  (slide) => Boolean(slide.title?.trim() || slide.subtitle?.trim()),
  { message: "Each slide must have at least a title or subtitle." }
);

export type HanaSocialSlide = z.infer<typeof hanaSocialSlideSchema>;

/**
 * Zod schema for a standard single carousel in hana-social JSON.
 */
export const hanaSocialCarouselSchema = z.object({
  caption: z.string().optional(),
  slides: z.array(hanaSocialSlideSchema).min(1, "Carousel must contain at least one slide."),
});

export type HanaSocialCarousel = z.infer<typeof hanaSocialCarouselSchema>;

/**
 * Zod schema supporting single carousel, bulk array of carousels, or bare array of slides.
 */
export const hanaSocialImportSchema = z.union([
  // 1. Standard single carousel object: { caption?, slides: [...] }
  hanaSocialCarouselSchema,
  // 2. Bulk array of carousels: [{ caption?, slides: [...] }, ...]
  z.array(hanaSocialCarouselSchema).min(1, "Array must contain at least one carousel."),
  // 3. Bare array of slides: [{ title?, subtitle?, category? }, ...]
  z.array(hanaSocialSlideSchema).min(1, "Array must contain at least one slide."),
]);

export type HanaSocialImportInput = z.infer<typeof hanaSocialImportSchema>;

export interface HanaSocialValidationResult {
  valid: boolean;
  slideCount: number;
  carouselCount: number;
  caption?: string;
  error?: string;
  data?: HanaSocialCarousel;
}

/**
 * Validates raw JSON string or object against the hana-social contract.
 * Returns human-readable error messages and detected counts.
 */
export function validateHanaSocialJson(rawInput: unknown): HanaSocialValidationResult {
  if (typeof rawInput === "string") {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return {
        valid: false,
        slideCount: 0,
        carouselCount: 0,
        error: "JSON input is empty.",
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return {
        valid: false,
        slideCount: 0,
        carouselCount: 0,
        error: "Invalid JSON syntax. Please check for formatting or syntax errors.",
      };
    }
    return validateHanaSocialParsed(parsed);
  }

  return validateHanaSocialParsed(rawInput);
}

function validateHanaSocialParsed(parsed: unknown): HanaSocialValidationResult {
  // Case 1: Array of items
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return {
        valid: false,
        slideCount: 0,
        carouselCount: 0,
        error: "Input array is empty. Please provide at least one slide or carousel.",
      };
    }

    // Check if array of carousels: [{ slides: [...] }, ...]
    if (parsed[0] && typeof parsed[0] === "object" && "slides" in parsed[0]) {
      const result = z.array(hanaSocialCarouselSchema).safeParse(parsed);
      if (!result.success) {
        return formatZodError(result.error);
      }
      const totalSlides = result.data.reduce((acc, c) => acc + c.slides.length, 0);
      return {
        valid: true,
        slideCount: totalSlides,
        carouselCount: result.data.length,
        caption: result.data[0]?.caption,
        data: result.data[0],
      };
    }

    // Check if bare array of slides: [{ title, subtitle }, ...]
    const result = z.array(hanaSocialSlideSchema).min(1).safeParse(parsed);
    if (!result.success) {
      return formatZodError(result.error);
    }

    const singleCarousel: HanaSocialCarousel = {
      slides: result.data,
    };

    return {
      valid: true,
      slideCount: result.data.length,
      carouselCount: 1,
      data: singleCarousel,
    };
  }

  // Case 2: Object { caption?, slides: [...] }
  if (parsed && typeof parsed === "object") {
    const result = hanaSocialCarouselSchema.safeParse(parsed);
    if (!result.success) {
      return formatZodError(result.error);
    }

    return {
      valid: true,
      slideCount: result.data.slides.length,
      carouselCount: 1,
      caption: result.data.caption,
      data: result.data,
    };
  }

  return {
    valid: false,
    slideCount: 0,
    carouselCount: 0,
    error: "Invalid format. Expected a carousel object or array of slides.",
  };
}

function formatZodError(error: z.ZodError): HanaSocialValidationResult {
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return {
      valid: false,
      slideCount: 0,
      carouselCount: 0,
      error: "Validation failed.",
    };
  }

  const path = firstIssue.path;
  let customMsg = firstIssue.message;

  // Enhance message with slide index if applicable
  const slideIndex = path.find((p) => typeof p === "number");
  if (typeof slideIndex === "number") {
    customMsg = `Slide ${slideIndex + 1}: ${firstIssue.message}`;
  }

  return {
    valid: false,
    slideCount: 0,
    carouselCount: 0,
    error: customMsg,
  };
}
