import type { ContentSlide } from "@/types/content";
import type { DesignSystemTokens, SlideLayoutType } from "@/types/design-system";
import type { EditorElement, EditorSlide } from "@/features/editor/types";
import {
  createTextElement,
  createShapeElement,
  normalizeSlideElements,
} from "@/features/editor/engine/editor-operations";

export interface ResolveSlideLayoutInput {
  slide: ContentSlide;
  slideIndex: number;
  totalSlides: number;
  tokens: DesignSystemTokens;
  layoutType?: SlideLayoutType;
  canvasWidth: number;
  canvasHeight: number;
  globalCta?: string;
}

/**
 * Resolves a semantic ContentSlide and DesignSystemTokens into fully-formed visual EditorElements.
 * Mathematically derives layout coordinates, bounding boxes, typography, and card containers
 * directly from design tokens without hardcoding user data.
 */
export function resolveSlideElements(input: ResolveSlideLayoutInput): {
  backgroundColor: string;
  elements: EditorElement[];
} {
  const {
    slide,
    slideIndex,
    totalSlides,
    tokens,
    canvasWidth,
    canvasHeight,
    globalCta,
  } = input;

  const isFirstSlide = slideIndex === 0;
  const isLastSlide = slideIndex === totalSlides - 1;
  const isHook = slide.purpose === "hook" || (isFirstSlide && totalSlides > 1);
  const isCta = slide.purpose === "cta" || (isLastSlide && Boolean(slide.cta || globalCta));

  const dummySlide: EditorSlide = {
    id: "layout-temp",
    position: slideIndex,
    backgroundColor: tokens.colors.backgroundColor,
    backgroundImageUrl: null,
    elements: [],
  };

  const elements: EditorElement[] = [];
  const padding = tokens.spacing.pagePadding;
  const contentWidth = canvasWidth - padding * 2;

  if (isHook) {
    // -----------------------------------------------------------------------
    // Hook / Cover Slide Layout
    // -----------------------------------------------------------------------
    let startY = 460;

    // Optional Badge Chip
    if (slide.badge) {
      const badgeWidth = Math.min(contentWidth * 0.45, 300);
      const badgeHeight = 60;
      const badgeX = Math.round((canvasWidth - badgeWidth) / 2);

      const badgeBg = createShapeElement(dummySlide, "rectangle", {
        x: badgeX,
        y: startY,
        width: badgeWidth,
        height: badgeHeight,
        cornerRadius: tokens.shapes.badgeCornerRadius,
        fillColor: tokens.colors.primaryColor,
      });

      const badgeText = createTextElement(dummySlide, {
        text: slide.badge.toUpperCase(),
        x: badgeX,
        y: startY + 16,
        width: badgeWidth,
        height: 36,
        fontSize: tokens.typography.badgeSize,
        fontFamily: tokens.typography.fontFamily,
        color: "#FFFFFF",
        align: "center",
        zIndex: badgeBg.zIndex + 1,
      });

      elements.push(badgeBg, badgeText);
      startY += badgeHeight + tokens.spacing.elementGap;
    }

    // Large Impact Headline
    const headlineHeight = 360;
    const headline = createTextElement(dummySlide, {
      text: slide.headline,
      x: padding,
      y: startY,
      width: contentWidth,
      height: headlineHeight,
      fontSize: tokens.typography.hookHeadlineSize,
      fontFamily: tokens.typography.fontFamily,
      color: tokens.colors.foregroundColor,
      align: "center",
      lineHeight: tokens.typography.lineHeightHeading,
    });
    elements.push(headline);
    startY += headlineHeight + tokens.spacing.elementGap;

    // Subtitle / Body
    if (slide.body) {
      const body = createTextElement(dummySlide, {
        text: slide.body,
        x: padding + 20,
        y: startY,
        width: contentWidth - 40,
        height: 240,
        fontSize: tokens.typography.bodySize,
        fontFamily: tokens.typography.fontFamily,
        color: tokens.colors.mutedForegroundColor,
        align: "center",
        lineHeight: tokens.typography.lineHeightBody,
      });
      elements.push(body);
    }

    // Swipe Indicator Cue
    const swipeText = createTextElement(dummySlide, {
      text: "SWIPE ➔",
      x: padding,
      y: canvasHeight - 180,
      width: contentWidth,
      height: 50,
      fontSize: tokens.typography.badgeSize,
      fontFamily: tokens.typography.fontFamily,
      color: tokens.colors.mutedForegroundColor,
      align: "center",
    });
    elements.push(swipeText);

    return {
      backgroundColor: tokens.colors.backgroundColor,
      elements,
    };
  }

  if (isCta) {
    // -----------------------------------------------------------------------
    // Outro / CTA Slide Layout
    // -----------------------------------------------------------------------
    const headline = createTextElement(dummySlide, {
      text: slide.headline,
      x: padding,
      y: 480,
      width: contentWidth,
      height: 260,
      fontSize: tokens.typography.hookHeadlineSize - 8,
      fontFamily: tokens.typography.fontFamily,
      color: tokens.colors.foregroundColor,
      align: "center",
      lineHeight: tokens.typography.lineHeightHeading,
    });
    elements.push(headline);

    if (slide.body) {
      const body = createTextElement(dummySlide, {
        text: slide.body,
        x: padding + 20,
        y: 780,
        width: contentWidth - 40,
        height: 260,
        fontSize: tokens.typography.bodySize,
        fontFamily: tokens.typography.fontFamily,
        color: tokens.colors.mutedForegroundColor,
        align: "center",
        lineHeight: tokens.typography.lineHeightBody,
      });
      elements.push(body);
    }

    // Action Button
    const ctaLabel = slide.cta || globalCta || "Follow for More";
    const buttonWidth = Math.min(contentWidth - 80, 680);
    const buttonHeight = 110;
    const buttonX = Math.round((canvasWidth - buttonWidth) / 2);
    const buttonY = 1200;

    const buttonBg = createShapeElement(dummySlide, "rectangle", {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      cornerRadius: tokens.shapes.buttonCornerRadius,
      fillColor: tokens.colors.primaryColor,
    });

    const buttonText = createTextElement(dummySlide, {
      text: ctaLabel,
      x: buttonX,
      y: buttonY + 34,
      width: buttonWidth,
      height: 50,
      fontSize: tokens.typography.bodySize + 2,
      fontFamily: tokens.typography.fontFamily,
      color: "#FFFFFF",
      align: "center",
      zIndex: buttonBg.zIndex + 1,
    });

    elements.push(buttonBg, buttonText);

    return {
      backgroundColor: tokens.colors.backgroundColor,
      elements,
    };
  }

  // -------------------------------------------------------------------------
  // Content / Key Point Slide Layout
  // -------------------------------------------------------------------------

  // Slide Number Pill
  const pillWidth = 140;
  const pillHeight = 52;
  const pillY = 220;

  const numberPill = createShapeElement(dummySlide, "rectangle", {
    x: padding,
    y: pillY,
    width: pillWidth,
    height: pillHeight,
    cornerRadius: tokens.shapes.badgeCornerRadius * 2,
    fillColor: tokens.colors.cardBackgroundColor,
  });

  const numberText = createTextElement(dummySlide, {
    text: `#${slideIndex + 1}`,
    x: padding,
    y: pillY + 12,
    width: pillWidth,
    height: 36,
    fontSize: tokens.typography.badgeSize,
    fontFamily: tokens.typography.fontFamily,
    color: tokens.colors.primaryColor,
    align: "center",
    zIndex: numberPill.zIndex + 1,
  });
  elements.push(numberPill, numberText);

  // Point Headline
  let currentY = 300;
  const headline = createTextElement(dummySlide, {
    text: slide.headline,
    x: padding,
    y: currentY,
    width: contentWidth,
    height: 220,
    fontSize: tokens.typography.pointHeadlineSize,
    fontFamily: tokens.typography.fontFamily,
    color: tokens.colors.foregroundColor,
    align: "left",
    lineHeight: tokens.typography.lineHeightHeading,
  });
  elements.push(headline);
  currentY += 240;

  // Body Paragraph
  if (slide.body) {
    const body = createTextElement(dummySlide, {
      text: slide.body,
      x: padding,
      y: currentY,
      width: contentWidth,
      height: 340,
      fontSize: tokens.typography.bodySize,
      fontFamily: tokens.typography.fontFamily,
      color: tokens.colors.mutedForegroundColor,
      align: "left",
      lineHeight: tokens.typography.lineHeightBody,
    });
    elements.push(body);
    currentY += 360;
  }

  // Supporting Points (Card list presentation)
  if (slide.supportingPoints && slide.supportingPoints.length > 0) {
    slide.supportingPoints.forEach((point, pIdx) => {
      const cardHeight = 100;
      const cardY = currentY + pIdx * (cardHeight + tokens.spacing.elementGap / 2);

      const pointCard = createShapeElement(dummySlide, "rectangle", {
        x: padding,
        y: cardY,
        width: contentWidth,
        height: cardHeight,
        cornerRadius: tokens.shapes.cardCornerRadius,
        fillColor: tokens.colors.cardBackgroundColor,
      });

      const pointText = createTextElement(dummySlide, {
        text: `• ${point}`,
        x: padding + tokens.spacing.cardPadding,
        y: cardY + 30,
        width: contentWidth - tokens.spacing.cardPadding * 2,
        height: 50,
        fontSize: tokens.typography.subtextSize,
        fontFamily: tokens.typography.fontFamily,
        color: tokens.colors.foregroundColor,
        align: "left",
        zIndex: pointCard.zIndex + 1,
      });

      elements.push(pointCard, pointText);
    });
  }

  return {
    backgroundColor: tokens.colors.backgroundColor,
    elements: normalizeSlideElements(elements),
  };
}
