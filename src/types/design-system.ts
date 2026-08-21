/**
 * Hana Studio — Design System Tokens & Typography Contracts
 * Provider-agnostic visual rules governing typography, colors, spacing, and shapes.
 */

export interface DesignSystemColorTokens {
  backgroundColor: string;
  cardBackgroundColor: string;
  foregroundColor: string;
  mutedForegroundColor: string;
  primaryColor: string;
  accentColor: string;
  borderColor?: string;
}

export interface DesignSystemTypographyTokens {
  fontFamily: string;
  hookHeadlineSize: number;
  pointHeadlineSize: number;
  bodySize: number;
  subtextSize: number;
  badgeSize: number;
  lineHeightHeading: number;
  lineHeightBody: number;
}

export interface DesignSystemSpacingTokens {
  pagePadding: number;
  cardPadding: number;
  elementGap: number;
}

export interface DesignSystemShapeTokens {
  cardCornerRadius: number;
  badgeCornerRadius: number;
  buttonCornerRadius: number;
  borderWidth?: number;
}

export interface DesignSystemTokens {
  id: string;
  name: string;
  colors: DesignSystemColorTokens;
  typography: DesignSystemTypographyTokens;
  spacing: DesignSystemSpacingTokens;
  shapes: DesignSystemShapeTokens;
}

export type SlideLayoutType =
  | "hook-impact"
  | "numbered-point"
  | "bold-statement"
  | "card-list"
  | "split-summary"
  | "cta-action";

export interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
  description?: string;
  canvas: {
    width: number;
    height: number;
    aspectRatio: string;
  };
  tokens: DesignSystemTokens;
  defaultLayouts?: {
    hook?: SlideLayoutType;
    point?: SlideLayoutType;
    summary?: SlideLayoutType;
    cta?: SlideLayoutType;
  };
}
