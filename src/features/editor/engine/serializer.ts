import type {
  EditorProject,
  EditorSlide,
  EditorElement,
  TextElement,
  ImageElement,
  ShapeElement,
} from "../types";
import { normalizeSlideElements } from "./editor-operations";
import type { RenderProject, RenderSlide, RenderElement } from "@/types/rendering";

export interface DbElementInput {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  assetId?: string | null;
  properties: unknown;
  asset?: { url: string } | null;
}

export interface DbSlideInput {
  id: string;
  position: number;
  backgroundColor: string;
  backgroundImageUrl: string | null;
  elements: DbElementInput[];
}

export interface DbProjectInput {
  id: string;
  title: string;
  description?: string | null;
  caption?: string | null;
  socialAccountId?: string | null;
  socialAccount?: {
    id: string;
    platform: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  } | null;
  slideWidth: number;
  slideHeight: number;
  slides: DbSlideInput[];
}

export function dbElementToEditorElement(dbEl: DbElementInput): EditorElement {
  const base = {
    id: dbEl.id,
    x: dbEl.x,
    y: dbEl.y,
    width: dbEl.width,
    height: dbEl.height,
    rotation: dbEl.rotation ?? 0,
    opacity: dbEl.opacity ?? 1,
    locked: dbEl.locked ?? false,
    visible: dbEl.visible ?? true,
    zIndex: dbEl.zIndex ?? 0,
    assetId: dbEl.assetId ?? null,
  };

  const rawProps = (typeof dbEl.properties === "object" && dbEl.properties !== null
    ? dbEl.properties
    : {}) as Record<string, unknown>;

  if (dbEl.type === "TEXT") {
    return {
      ...base,
      type: "TEXT",
      text: (rawProps.text as string) || (rawProps.content as string) || "Sample Text",
      fontSize: (rawProps.fontSize as number) || 48,
      fontFamily: (rawProps.fontFamily as string) || "Inter, sans-serif",
      color: (rawProps.color as string) || "#FFFFFF",
      stroke: (rawProps.stroke as string) || undefined,
      strokeWidth: (rawProps.strokeWidth as number) || undefined,
      align:
        (rawProps.align as "left" | "center" | "right") ||
        (rawProps.textAlign as "left" | "center" | "right") ||
        "left",
      lineHeight: (rawProps.lineHeight as number) || 1.25,
    } as TextElement;
  }

  if (dbEl.type === "IMAGE") {
    return {
      ...base,
      type: "IMAGE",
      src:
        (rawProps.src as string) ||
        (rawProps.url as string) ||
        dbEl.asset?.url ||
        (dbEl.assetId ? `/api/assets/${dbEl.assetId}/view` : "") ||
        "",
      originalWidth: rawProps.originalWidth as number | undefined,
      originalHeight: rawProps.originalHeight as number | undefined,
    } as ImageElement;
  }

  return {
    ...base,
    type: "SHAPE",
    shapeType: (rawProps.shapeType as "rectangle" | "circle") || "rectangle",
    fillColor: (rawProps.fillColor as string) || (rawProps.fill as string) || "#3B82F6",
    strokeColor: (rawProps.strokeColor as string) || (rawProps.stroke as string) || undefined,
    strokeWidth: (rawProps.strokeWidth as number) || undefined,
    cornerRadius: (rawProps.cornerRadius as number) || (rawProps.borderRadius as number) || 0,
  } as ShapeElement;
}

export function dbProjectToEditorProject(dbProj: DbProjectInput): EditorProject {
  return {
    id: dbProj.id,
    title: dbProj.title,
    description: dbProj.description || null,
    caption: dbProj.caption || null,
    socialAccountId: dbProj.socialAccountId || null,
    socialAccount: dbProj.socialAccount || null,
    slideWidth: dbProj.slideWidth || 1080,
    slideHeight: dbProj.slideHeight || 1080,
    slides: dbProj.slides
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        id: s.id,
        position: s.position,
        backgroundColor: s.backgroundColor || "#FFFFFF",
        backgroundImageUrl: s.backgroundImageUrl || null,
        elements: normalizeSlideElements(s.elements.map(dbElementToEditorElement)),
      })),
  };
}

export function editorElementToDbElement(el: EditorElement): DbElementInput {
  const base = {
    id: el.id,
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation ?? 0,
    opacity: el.opacity ?? 1,
    locked: el.locked ?? false,
    visible: el.visible ?? true,
    zIndex: el.zIndex ?? 0,
    assetId: el.assetId ?? null,
  };

  if (el.type === "TEXT") {
    return {
      ...base,
      properties: {
        text: el.text,
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        color: el.color,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        align: el.align,
        lineHeight: el.lineHeight,
      },
    };
  }

  if (el.type === "IMAGE") {
    return {
      ...base,
      properties: {
        src: el.src,
        originalWidth: el.originalWidth,
        originalHeight: el.originalHeight,
      },
    };
  }

  return {
    ...base,
    properties: {
      shapeType: el.shapeType,
      fillColor: el.fillColor,
      strokeColor: el.strokeColor,
      strokeWidth: el.strokeWidth,
      cornerRadius: el.cornerRadius,
    },
  };
}

export function editorProjectToDbProject(editorProj: EditorProject): DbProjectInput {
  return {
    id: editorProj.id,
    title: editorProj.title,
    description: editorProj.description || null,
    caption: editorProj.caption || null,
    socialAccountId: editorProj.socialAccountId || null,
    slideWidth: editorProj.slideWidth,
    slideHeight: editorProj.slideHeight,
    slides: editorProj.slides.map((s, sIdx) => {
      const normalized = normalizeSlideElements(s.elements);
      return {
        id: s.id,
        position: s.position ?? sIdx,
        backgroundColor: s.backgroundColor,
        backgroundImageUrl: s.backgroundImageUrl ?? null,
        elements: normalized.map((el, elIdx) => ({
          ...editorElementToDbElement(el),
          zIndex: el.zIndex ?? elIdx + 1,
        })),
      };
    }),
  };
}

export function editorProjectToRenderProject(editorProj: EditorProject): RenderProject {
  return {
    id: editorProj.id,
    title: editorProj.title,
    slideWidth: editorProj.slideWidth,
    slideHeight: editorProj.slideHeight,
    slides: editorProj.slides.map(
      (slide): RenderSlide => ({
        id: slide.id,
        position: slide.position,
        backgroundColor: slide.backgroundColor,
        backgroundImageUrl: slide.backgroundImageUrl,
        elements: slide.elements.map((el): RenderElement => {
          if (el.type === "TEXT") {
            return {
              id: el.id,
              type: "TEXT",
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              rotation: el.rotation,
              opacity: el.opacity,
              zIndex: el.zIndex,
              properties: {
                text: el.text,
                fontSize: el.fontSize,
                fontFamily: el.fontFamily,
                color: el.color,
                stroke: el.stroke,
                strokeWidth: el.strokeWidth,
                align: el.align,
                lineHeight: el.lineHeight,
              },
            };
          }
          if (el.type === "IMAGE") {
            return {
              id: el.id,
              type: "IMAGE",
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              rotation: el.rotation,
              opacity: el.opacity,
              zIndex: el.zIndex,
              properties: {
                src: el.src,
                assetId: el.assetId ?? undefined,
              },
            };
          }
          return {
            id: el.id,
            type: "SHAPE",
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            opacity: el.opacity,
            zIndex: el.zIndex,
            properties: {
              shapeType: el.shapeType,
              fillColor: el.fillColor,
              strokeColor: el.strokeColor,
              strokeWidth: el.strokeWidth,
              cornerRadius: el.cornerRadius,
            },
          };
        }),
      }),
    ),
  };
}
