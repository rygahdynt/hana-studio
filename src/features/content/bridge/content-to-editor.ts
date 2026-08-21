import type { ContentPlan, ContentBridgeOptions } from "@/types/content";
import type { EditorProject, EditorSlide } from "@/features/editor/types";
import type { DesignSystemTokens } from "@/types/design-system";
import {
  createSlide,
  createImageElement,
  normalizeSlideElements,
} from "@/features/editor/engine/editor-operations";
import { DARK_MODERN_TOKENS } from "@/features/templates/presets/design-presets";
import { resolveSlideElements } from "@/features/templates/engine/layout-resolver";

const DEFAULT_SLIDE_WIDTH = 1080;
const DEFAULT_SLIDE_HEIGHT = 1920;

/**
 * Resolves a random asset from an in-memory candidate pool of assets (usable on both client & server).
 *
 * Fallback order:
 * 1. Exact category match (case-insensitive) where status === "READY"
 * 2. Uncategorized assets (category is null or empty) where status === "READY"
 * 3. Any READY asset
 * 4. No assets -> null
 */
export function resolveRandomAssetFromPool<
  T extends {
    id?: string | null;
    url: string;
    width?: number | null;
    height?: number | null;
    status?: string;
    category?: string | null;
  },
>(assets: T[], category?: string): T | null {
  if (!assets || assets.length === 0) return null;

  const readyAssets = assets.filter((a) => (a.status ? a.status === "READY" : true));
  if (readyAssets.length === 0) return null;

  // POOL 1 — Exact category match (case-insensitive)
  if (category && category.trim()) {
    const normalizedTarget = category.trim().toLowerCase();
    const categoryMatches = readyAssets.filter(
      (a) => a.category && a.category.trim().toLowerCase() === normalizedTarget,
    );
    if (categoryMatches.length > 0) {
      return categoryMatches[Math.floor(Math.random() * categoryMatches.length)] ?? null;
    }
  }

  // POOL 2 — Uncategorized assets
  const uncategorized = readyAssets.filter((a) => !a.category || a.category.trim() === "");
  if (uncategorized.length > 0) {
    return uncategorized[Math.floor(Math.random() * uncategorized.length)] ?? null;
  }

  // POOL 3 — Any READY asset
  return readyAssets[Math.floor(Math.random() * readyAssets.length)] ?? null;
}

/**
 * Transforms a structured ContentPlan into a complete, editable EditorProject with optional category-based asset resolution.
 * Bridges: ContentPlan + Design System Tokens → Layout Resolver → Asset Resolution → editor-operations.ts → EditorProject.
 */
export async function convertContentPlanToProject(
  plan: ContentPlan,
  options?: ContentBridgeOptions,
): Promise<EditorProject> {
  const slideWidth = options?.slideWidth ?? DEFAULT_SLIDE_WIDTH;
  const slideHeight = options?.slideHeight ?? DEFAULT_SLIDE_HEIGHT;
  const projectId = options?.projectId ?? `proj-${Date.now()}`;

  // Resolve Design System Tokens (Passed tokens > Template tokens > Dark Modern Default)
  let activeTokens: DesignSystemTokens =
    options?.tokens ||
    options?.template?.tokens ||
    DARK_MODERN_TOKENS;

  // Apply optional ad-hoc token overrides if provided
  if (options?.primaryColor || options?.accentColor || options?.fontFamily) {
    activeTokens = {
      ...activeTokens,
      colors: {
        ...activeTokens.colors,
        ...(options.primaryColor ? { primaryColor: options.primaryColor } : {}),
        ...(options.accentColor ? { accentColor: options.accentColor } : {}),
      },
      typography: {
        ...activeTokens.typography,
        ...(options.fontFamily ? { fontFamily: options.fontFamily } : {}),
      },
    };
  }

  let currentProject: EditorProject = {
    id: projectId,
    title: plan.title,
    caption: plan.caption || null,
    slideWidth,
    slideHeight,
    slides: [],
  };

  for (let index = 0; index < plan.slides.length; index++) {
    const contentSlide = plan.slides[index];
    if (!contentSlide) continue;

    // 1. Resolve visual elements and background via Layout Resolver
    const { backgroundColor, elements: layoutElements } = resolveSlideElements({
      slide: contentSlide,
      slideIndex: index,
      totalSlides: plan.slides.length,
      tokens: activeTokens,
      canvasWidth: slideWidth,
      canvasHeight: slideHeight,
      globalCta: plan.cta,
    });

    // 2. Create slide using editor-operations
    const { project: withSlide, newSlide } = createSlide(currentProject, {
      backgroundColor,
    });

    // 3. Extract category
    const category =
      contentSlide.category ||
      (contentSlide.assetHints && contentSlide.assetHints[0]) ||
      (contentSlide.visualDirection?.startsWith("Category: ")
        ? contentSlide.visualDirection.replace("Category: ", "").trim()
        : undefined);

    // 4. Resolve random asset
    let resolvedAsset: {
      id?: string | null;
      url: string;
      width?: number | null;
      height?: number | null;
    } | null = null;

    if (options?.resolveAsset) {
      resolvedAsset = await options.resolveAsset(category, index);
    } else if (options?.assets && options.assets.length > 0) {
      resolvedAsset = resolveRandomAssetFromPool(options.assets, category);
    }

    // 5. If asset resolved, create full-canvas cover image element & insert behind text/shapes with normalized zIndex
    let allElements = [...layoutElements];
    if (resolvedAsset && resolvedAsset.url) {
      const imageEl = createImageElement(
        newSlide,
        resolvedAsset,
        { slideWidth, slideHeight },
        { zIndex: 1, fit: "cover" },
      );
      allElements = normalizeSlideElements([imageEl, ...layoutElements]);
    } else {
      allElements = normalizeSlideElements(layoutElements);
    }

    // 6. Attach layout-resolved elements
    const populatedSlide: EditorSlide = {
      ...newSlide,
      elements: allElements,
    };

    currentProject = {
      ...withSlide,
      slides: withSlide.slides.map((s) => (s.id === newSlide.id ? populatedSlide : s)),
    };
  }

  return currentProject;
}
