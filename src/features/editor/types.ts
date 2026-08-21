export type ElementType = "IMAGE" | "TEXT" | "SHAPE";

export interface BaseElement {
  id: string;
  type: ElementType;
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
}

export interface TextElement extends BaseElement {
  type: "TEXT";
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  stroke?: string;
  strokeWidth?: number;
  align: "left" | "center" | "right";
  lineHeight: number;
}

export interface ImageElement extends BaseElement {
  type: "IMAGE";
  src: string;
  originalWidth?: number;
  originalHeight?: number;
}

export interface ShapeElement extends BaseElement {
  type: "SHAPE";
  shapeType: "rectangle" | "circle";
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius: number;
}

export type EditorElement = TextElement | ImageElement | ShapeElement;

export interface EditorSlide {
  id: string;
  position: number;
  backgroundColor: string;
  backgroundImageUrl: string | null;
  elements: EditorElement[];
}

export interface EditorProject {
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
  slides: EditorSlide[];
}

export interface CanvasViewport {
  scale: number;
  x: number;
  y: number;
}

export type EditorTool = "select" | "text" | "rectangle" | "circle" | "image";
