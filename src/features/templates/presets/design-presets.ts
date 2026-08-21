import type { DesignSystemTokens, TemplateDefinition } from "@/types/design-system";

export const DARK_MODERN_TOKENS: DesignSystemTokens = {
  id: "theme-dark-modern",
  name: "Dark Modern",
  colors: {
    backgroundColor: "#0D0D11",
    cardBackgroundColor: "#18181E",
    foregroundColor: "#FFFFFF",
    mutedForegroundColor: "#A1A1AA",
    primaryColor: "#3B82F6",
    accentColor: "#60A5FA",
    borderColor: "#27272A",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    hookHeadlineSize: 72,
    pointHeadlineSize: 56,
    bodySize: 36,
    subtextSize: 28,
    badgeSize: 22,
    lineHeightHeading: 1.15,
    lineHeightBody: 1.35,
  },
  spacing: {
    pagePadding: 100,
    cardPadding: 40,
    elementGap: 32,
  },
  shapes: {
    cardCornerRadius: 20,
    badgeCornerRadius: 12,
    buttonCornerRadius: 24,
    borderWidth: 1,
  },
};

export const MIDNIGHT_PURPLE_TOKENS: DesignSystemTokens = {
  id: "theme-midnight-purple",
  name: "Midnight Purple",
  colors: {
    backgroundColor: "#090714",
    cardBackgroundColor: "#140E26",
    foregroundColor: "#FFFFFF",
    mutedForegroundColor: "#C4B5FD",
    primaryColor: "#8B5CF6",
    accentColor: "#A78BFA",
    borderColor: "#3B1E6D",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    hookHeadlineSize: 74,
    pointHeadlineSize: 58,
    bodySize: 36,
    subtextSize: 28,
    badgeSize: 22,
    lineHeightHeading: 1.15,
    lineHeightBody: 1.35,
  },
  spacing: {
    pagePadding: 100,
    cardPadding: 40,
    elementGap: 32,
  },
  shapes: {
    cardCornerRadius: 24,
    badgeCornerRadius: 14,
    buttonCornerRadius: 28,
    borderWidth: 1,
  },
};

export const EDITORIAL_MINIMAL_TOKENS: DesignSystemTokens = {
  id: "theme-editorial-minimal",
  name: "Editorial Minimal",
  colors: {
    backgroundColor: "#18181B",
    cardBackgroundColor: "#27272A",
    foregroundColor: "#FAFAFA",
    mutedForegroundColor: "#A1A1AA",
    primaryColor: "#10B981",
    accentColor: "#34D399",
    borderColor: "#3F3F46",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    hookHeadlineSize: 70,
    pointHeadlineSize: 54,
    bodySize: 34,
    subtextSize: 26,
    badgeSize: 20,
    lineHeightHeading: 1.2,
    lineHeightBody: 1.4,
  },
  spacing: {
    pagePadding: 110,
    cardPadding: 36,
    elementGap: 28,
  },
  shapes: {
    cardCornerRadius: 16,
    badgeCornerRadius: 8,
    buttonCornerRadius: 16,
    borderWidth: 1,
  },
};

export const NEON_CYAN_TOKENS: DesignSystemTokens = {
  id: "theme-neon-cyan",
  name: "Neon Cyan",
  colors: {
    backgroundColor: "#030A14",
    cardBackgroundColor: "#0A1728",
    foregroundColor: "#FFFFFF",
    mutedForegroundColor: "#93C5FD",
    primaryColor: "#06B6D4",
    accentColor: "#22D3EE",
    borderColor: "#0E3A5A",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    hookHeadlineSize: 74,
    pointHeadlineSize: 58,
    bodySize: 36,
    subtextSize: 28,
    badgeSize: 22,
    lineHeightHeading: 1.15,
    lineHeightBody: 1.35,
  },
  spacing: {
    pagePadding: 100,
    cardPadding: 40,
    elementGap: 32,
  },
  shapes: {
    cardCornerRadius: 20,
    badgeCornerRadius: 12,
    buttonCornerRadius: 24,
    borderWidth: 1,
  },
};

export const BUILT_IN_TEMPLATES: TemplateDefinition[] = [
  {
    id: "template-tiktok-dark-modern",
    name: "Dark Modern Carousel",
    category: "social-carousel",
    description: "High-contrast dark theme with electric blue accents optimized for TikTok (9:16).",
    canvas: {
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
    },
    tokens: DARK_MODERN_TOKENS,
    defaultLayouts: {
      hook: "hook-impact",
      point: "numbered-point",
      summary: "card-list",
      cta: "cta-action",
    },
  },
  {
    id: "template-tiktok-midnight-purple",
    name: "Midnight Creator Carousel",
    category: "social-carousel",
    description: "Vibrant violet and obsidian theme designed for engaging narrative carousels.",
    canvas: {
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
    },
    tokens: MIDNIGHT_PURPLE_TOKENS,
    defaultLayouts: {
      hook: "hook-impact",
      point: "numbered-point",
      summary: "split-summary",
      cta: "cta-action",
    },
  },
  {
    id: "template-tiktok-editorial-minimal",
    name: "Editorial Minimal",
    category: "social-carousel",
    description: "Crisp editorial structure with emerald accents for tips and educational series.",
    canvas: {
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
    },
    tokens: EDITORIAL_MINIMAL_TOKENS,
    defaultLayouts: {
      hook: "bold-statement",
      point: "card-list",
      summary: "split-summary",
      cta: "cta-action",
    },
  },
  {
    id: "template-tiktok-neon-cyan",
    name: "Neon Tech Carousel",
    category: "social-carousel",
    description: "High-energy cyan styling tailored for tech, AI, and startup breakdown posts.",
    canvas: {
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
    },
    tokens: NEON_CYAN_TOKENS,
    defaultLayouts: {
      hook: "hook-impact",
      point: "numbered-point",
      summary: "card-list",
      cta: "cta-action",
    },
  },
];
