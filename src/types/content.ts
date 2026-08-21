import type { DesignSystemTokens, TemplateDefinition } from "./design-system";

/**
 * Hana Studio — Content Domain Types
 * Defines the structured content layer (the "WHAT") separate from the visual editor layer (the "HOW").
 */

export type ContentTone =
  | "casual"
  | "professional"
  | "provocative"
  | "educational"
  | "inspirational"
  | "humorous"
  | "storytelling";

export type SlidePurpose =
  | "hook"
  | "problem"
  | "solution"
  | "point"
  | "example"
  | "mistake"
  | "tip"
  | "summary"
  | "cta";

/**
 * User/agent intent input describing what carousel to create.
 */
export interface ContentBrief {
  topic: string;
  audience?: string;
  objective?: string;
  tone?: ContentTone | string;
  language?: string;
  slideCount?: number;
  contentDirection?: string;
  cta?: string;
  keyPoints?: string[];
}

/**
 * A single narrative slide in the structured content plan.
 */
export interface ContentSlide {
  slideNumber: number;
  purpose?: SlidePurpose | string;
  category?: string;
  badge?: string;
  headline: string;
  body?: string;
  supportingPoints?: string[];
  visualDirection?: string;
  assetHints?: string[];
  cta?: string;
}

/**
 * Complete structured content blueprint produced for a carousel.
 */
export interface ContentPlan {
  title: string;
  hook: string;
  slides: ContentSlide[];
  caption?: string;
  cta?: string;
  tags?: string[];
  brief?: ContentBrief;
}

/**
 * Style/layout preset options for converting content to an EditorProject.
 */
export interface ContentBridgeOptions {
  projectId?: string;
  slideWidth?: number;
  slideHeight?: number;
  template?: TemplateDefinition;
  tokens?: DesignSystemTokens;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  userId?: string;
  assets?: Array<{
    id?: string | null;
    url: string;
    width?: number | null;
    height?: number | null;
    category?: string | null;
    status?: string;
  }>;
  resolveAsset?: (
    category?: string,
    slideIndex?: number,
  ) =>
    | Promise<{
        id?: string | null;
        url: string;
        width?: number | null;
        height?: number | null;
        category?: string | null;
        status?: string;
      } | null>
    | {
        id?: string | null;
        url: string;
        width?: number | null;
        height?: number | null;
        category?: string | null;
        status?: string;
      }
    | null;
}
