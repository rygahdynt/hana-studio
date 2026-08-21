export type ElementType = "IMAGE" | "TEXT" | "SHAPE";

export interface RenderTextProperties {
  text: string;
  fontSize: number;
  fontFamily?: string;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  align?: "left" | "center" | "right";
  lineHeight?: number;
}

export interface RenderImageProperties {
  src: string; // URL, data URI, or storage key
  assetId?: string;
}

export interface RenderShapeProperties {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  shapeType?: "rectangle" | "circle";
}

export interface RenderElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  properties:
    | RenderTextProperties
    | RenderImageProperties
    | RenderShapeProperties
    | Record<string, unknown>;
}

export interface RenderSlide {
  id: string;
  position: number;
  backgroundColor?: string;
  backgroundImageUrl?: string | null;
  backgroundImageBuffer?: Uint8Array;
  elements: RenderElement[];
}

export interface RenderProject {
  id: string;
  title: string;
  slideWidth: number;
  slideHeight: number;
  slides: RenderSlide[];
}

export interface RenderOptions {
  format?: "png" | "jpeg" | "webp";
  quality?: number;
}

export interface RenderSlideResult {
  slideId: string;
  position: number;
  buffer: Uint8Array;
  fileName: string;
  contentType: string;
}

export interface RenderProjectResult {
  projectId: string;
  slides: RenderSlideResult[];
  zipBuffer?: Uint8Array;
  zipFileName?: string;
}
