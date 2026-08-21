import type {
  EditorProject,
  EditorSlide,
  EditorElement,
  TextElement,
  ShapeElement,
  ImageElement,
} from "../types";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Normalizes element list so that:
 * 1. Elements are ordered strictly bottom-to-top (index 0 = bottom, index N-1 = top)
 * 2. zIndex is strictly unique and monotonic: 1, 2, 3, ..., N
 */
export function normalizeSlideElements(elements: EditorElement[]): EditorElement[] {
  const sorted = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  return sorted.map((el, index) => ({
    ...el,
    zIndex: index + 1,
  }));
}

function nextZIndex(elements: EditorElement[]): number {
  return elements.length + 1;
}

// ---------------------------------------------------------------------------
// Slide Operations
// ---------------------------------------------------------------------------

export interface CreateSlideResult {
  project: EditorProject;
  newSlide: EditorSlide;
}

export function createSlide(
  project: EditorProject,
  options?: Partial<EditorSlide>,
): CreateSlideResult {
  const newSlide: EditorSlide = {
    id: options?.id || generateId("slide"),
    position: project.slides.length,
    backgroundColor: options?.backgroundColor || "#121212",
    backgroundImageUrl: options?.backgroundImageUrl || null,
    elements: normalizeSlideElements(options?.elements || []),
  };

  return {
    project: {
      ...project,
      slides: [...project.slides, newSlide],
    },
    newSlide,
  };
}

export interface DuplicateSlideResult {
  project: EditorProject;
  duplicatedSlide: EditorSlide | null;
}

export function duplicateSlide(
  project: EditorProject,
  slideId: string,
): DuplicateSlideResult {
  const sourceIndex = project.slides.findIndex((s) => s.id === slideId);
  if (sourceIndex === -1) {
    return { project, duplicatedSlide: null };
  }

  const source = project.slides[sourceIndex];
  if (!source) {
    return { project, duplicatedSlide: null };
  }
  const duplicatedId = generateId("slide");

  // Clone elements with brand new unique IDs while preserving properties, geometry, and asset links
  const clonedElements: EditorElement[] = source.elements.map((el) => {
    const newElId = generateId(`el-${el.type.toLowerCase()}`);
    return {
      ...el,
      id: newElId,
    } as EditorElement;
  });

  const duplicatedSlide: EditorSlide = {
    id: duplicatedId,
    position: sourceIndex + 1,
    backgroundColor: source.backgroundColor,
    backgroundImageUrl: source.backgroundImageUrl,
    elements: clonedElements,
  };

  // Insert duplicated slide immediately after source slide
  const newSlides = [...project.slides];
  newSlides.splice(sourceIndex + 1, 0, duplicatedSlide);

  // Re-index all slide positions deterministically
  const reindexedSlides = newSlides.map((s, idx) => ({
    ...s,
    position: idx,
  }));

  return {
    project: {
      ...project,
      slides: reindexedSlides,
    },
    duplicatedSlide,
  };
}

export interface DeleteSlideResult {
  project: EditorProject;
  nextActiveSlideId: string | null;
  success: boolean;
}

export function deleteSlide(
  project: EditorProject,
  slideId: string,
  currentActiveSlideId?: string,
): DeleteSlideResult {
  // Guard: Protect against creating an empty project with 0 slides
  if (project.slides.length <= 1) {
    return {
      project,
      nextActiveSlideId: project.slides[0]?.id || null,
      success: false,
    };
  }

  const deleteIndex = project.slides.findIndex((s) => s.id === slideId);
  if (deleteIndex === -1) {
    return {
      project,
      nextActiveSlideId: currentActiveSlideId || project.slides[0]?.id || null,
      success: false,
    };
  }

  const remaining = project.slides.filter((s) => s.id !== slideId);
  const reindexed = remaining.map((s, idx) => ({
    ...s,
    position: idx,
  }));

  let nextActiveSlideId = currentActiveSlideId || reindexed[0]?.id || null;
  if (currentActiveSlideId === slideId) {
    const targetIdx = Math.min(deleteIndex, reindexed.length - 1);
    nextActiveSlideId = reindexed[targetIdx]?.id || reindexed[0]?.id || null;
  }

  return {
    project: {
      ...project,
      slides: reindexed,
    },
    nextActiveSlideId,
    success: true,
  };
}

export function reorderSlide(
  project: EditorProject,
  fromIndex: number,
  toIndex: number,
): EditorProject {
  if (
    fromIndex < 0 ||
    fromIndex >= project.slides.length ||
    toIndex < 0 ||
    toIndex >= project.slides.length ||
    fromIndex === toIndex
  ) {
    return project;
  }

  const newSlides = [...project.slides];
  const [movedSlide] = newSlides.splice(fromIndex, 1);
  if (movedSlide) {
    newSlides.splice(toIndex, 0, movedSlide);
  }

  return {
    ...project,
    slides: newSlides.map((s, idx) => ({
      ...s,
      position: idx,
    })),
  };
}

export function moveSlide(
  project: EditorProject,
  slideId: string,
  direction: "left" | "right",
): EditorProject {
  const currentIndex = project.slides.findIndex((s) => s.id === slideId);
  if (currentIndex === -1) return project;

  const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
  return reorderSlide(project, currentIndex, targetIndex);
}

// ---------------------------------------------------------------------------
// Element Operations
// ---------------------------------------------------------------------------

export function createTextElement(
  slide: EditorSlide,
  options?: Partial<TextElement>,
): TextElement {
  const id = options?.id || generateId("el-text");
  return {
    id,
    type: "TEXT",
    text: options?.text || "Heading Text",
    x: options?.x ?? 140,
    y: options?.y ?? 720,
    width: options?.width ?? 800,
    height: options?.height ?? 140,
    fontSize: options?.fontSize ?? 54,
    fontFamily: options?.fontFamily || "Inter, sans-serif",
    color: options?.color || "#FFFFFF",
    stroke: options?.stroke,
    strokeWidth: options?.strokeWidth,
    align: options?.align || "center",
    lineHeight: options?.lineHeight ?? 1.25,
    rotation: options?.rotation ?? 0,
    opacity: options?.opacity ?? 1,
    locked: options?.locked ?? false,
    visible: options?.visible ?? true,
    zIndex: options?.zIndex ?? nextZIndex(slide.elements),
  };
}

export function createShapeElement(
  slide: EditorSlide,
  shapeType: "rectangle" | "circle",
  options?: Partial<ShapeElement>,
): ShapeElement {
  const id = options?.id || generateId("el-shape");
  const isCircle = shapeType === "circle";

  return {
    id,
    type: "SHAPE",
    shapeType,
    fillColor: options?.fillColor || (isCircle ? "#8B5CF6" : "#3B82F6"),
    strokeColor: options?.strokeColor,
    strokeWidth: options?.strokeWidth,
    cornerRadius: options?.cornerRadius ?? (isCircle ? 0 : 16),
    x: options?.x ?? 390,
    y: options?.y ?? 810,
    width: options?.width ?? 300,
    height: options?.height ?? 300,
    rotation: options?.rotation ?? 0,
    opacity: options?.opacity ?? 1,
    locked: options?.locked ?? false,
    visible: options?.visible ?? true,
    zIndex: options?.zIndex ?? nextZIndex(slide.elements),
  };
}

/**
 * Calculates cover dimensions and centered offsets for an image to completely fill a canvas
 * preserving its native aspect ratio (mimicking CSS object-fit: cover / background-size: cover).
 */
export function calculateImageCoverDimensions(
  originalWidth: number,
  originalHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number; width: number; height: number } {
  const safeOrigWidth = originalWidth > 0 ? originalWidth : canvasWidth;
  const safeOrigHeight = originalHeight > 0 ? originalHeight : canvasHeight;

  const scale = Math.max(canvasWidth / safeOrigWidth, canvasHeight / safeOrigHeight);
  const width = Math.round(safeOrigWidth * scale);
  const height = Math.round(safeOrigHeight * scale);
  const x = Math.round((canvasWidth - width) / 2);
  const y = Math.round((canvasHeight - height) / 2);

  return { x, y, width, height };
}

export function createImageElement(
  slide: EditorSlide,
  asset: {
    id?: string | null;
    url: string;
    width?: number | null;
    height?: number | null;
  },
  canvasDimensions: { slideWidth: number; slideHeight: number },
  options?: Partial<ImageElement> & { fit?: "contain" | "cover" },
): ImageElement {
  const id = options?.id || generateId("el-img");
  const originalWidth = asset.width || 800;
  const originalHeight = asset.height || 600;

  let x: number;
  let y: number;
  let width: number;
  let height: number;

  if (options?.fit === "cover") {
    const cover = calculateImageCoverDimensions(
      originalWidth,
      originalHeight,
      canvasDimensions.slideWidth,
      canvasDimensions.slideHeight,
    );
    x = options?.x ?? cover.x;
    y = options?.y ?? cover.y;
    width = options?.width ?? cover.width;
    height = options?.height ?? cover.height;
  } else {
    const aspectRatio = originalWidth / originalHeight;

    // Proportional fit: max 60% of slide dimensions (for manual stickers/elements)
    let targetWidth = Math.min(canvasDimensions.slideWidth * 0.6, 600);
    let targetHeight = targetWidth / aspectRatio;

    if (targetHeight > canvasDimensions.slideHeight * 0.6) {
      targetHeight = canvasDimensions.slideHeight * 0.6;
      targetWidth = targetHeight * aspectRatio;
    }

    x = options?.x ?? Math.round((canvasDimensions.slideWidth - targetWidth) / 2);
    y = options?.y ?? Math.round((canvasDimensions.slideHeight - targetHeight) / 2);
    width = options?.width ?? Math.round(targetWidth);
    height = options?.height ?? Math.round(targetHeight);
  }

  return {
    id,
    type: "IMAGE",
    assetId: asset.id || null,
    src: asset.url,
    originalWidth,
    originalHeight,
    x,
    y,
    width,
    height,
    rotation: options?.rotation ?? 0,
    opacity: options?.opacity ?? 1,
    locked: options?.locked ?? false,
    visible: options?.visible ?? true,
    zIndex: options?.zIndex ?? nextZIndex(slide.elements),
  };
}

export function updateElementInProject(
  project: EditorProject,
  slideId: string,
  elementId: string,
  updates: Partial<EditorElement>,
): EditorProject {
  return {
    ...project,
    slides: project.slides.map((slide) => {
      if (slide.id !== slideId) return slide;
      return {
        ...slide,
        elements: slide.elements.map((el) =>
          el.id === elementId ? ({ ...el, ...updates } as EditorElement) : el,
        ),
      };
    }),
  };
}

export function deleteElementFromProject(
  project: EditorProject,
  slideId: string,
  elementId: string,
): EditorProject {
  return {
    ...project,
    slides: project.slides.map((slide) => {
      if (slide.id !== slideId) return slide;
      const remaining = slide.elements.filter((el) => el.id !== elementId);
      return {
        ...slide,
        elements: normalizeSlideElements(remaining),
      };
    }),
  };
}

export function reorderElementInSlide(
  slide: EditorSlide,
  elementId: string,
  action: "bringForward" | "sendBackward" | "bringToFront" | "sendToBack",
): EditorSlide {
  // 1. Establish canonical normalized element list (ordered bottom-to-top)
  const currentElements = normalizeSlideElements(slide.elements);
  const currentIndex = currentElements.findIndex((e) => e.id === elementId);
  if (currentIndex === -1) return slide;

  const targetEl = currentElements[currentIndex];
  if (!targetEl) return slide;
  const newElements = [...currentElements];

  switch (action) {
    case "bringForward": {
      if (currentIndex < newElements.length - 1) {
        // Swap with the element immediately in front/above it
        const nextEl = newElements[currentIndex + 1];
        if (nextEl) {
          newElements[currentIndex] = nextEl;
          newElements[currentIndex + 1] = targetEl;
        }
      }
      break;
    }
    case "sendBackward": {
      if (currentIndex > 0) {
        // Swap with the element immediately behind/below it
        const prevEl = newElements[currentIndex - 1];
        if (prevEl) {
          newElements[currentIndex] = prevEl;
          newElements[currentIndex - 1] = targetEl;
        }
      }
      break;
    }
    case "bringToFront": {
      if (currentIndex < newElements.length - 1) {
        // Move to the very top (end of array)
        newElements.splice(currentIndex, 1);
        newElements.push(targetEl);
      }
      break;
    }
    case "sendToBack": {
      if (currentIndex > 0) {
        // Move to the very bottom (start of array)
        newElements.splice(currentIndex, 1);
        newElements.unshift(targetEl);
      }
      break;
    }
  }

  // 2. Re-index zIndex strictly from 1 to N matching the new array order
  const normalizedElements = newElements.map((el, idx) => ({
    ...el,
    zIndex: idx + 1,
  }));

  return {
    ...slide,
    elements: normalizedElements,
  };
}
