import { z } from "zod";
import type { ContentBrief, ContentSlide, ContentPlan } from "@/types/content";

export const contentBriefSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  audience: z.string().optional(),
  objective: z.string().optional(),
  tone: z.string().optional().default("casual"),
  language: z.string().optional().default("id"),
  slideCount: z.number().int().min(1).max(20).optional().default(7),
  contentDirection: z.string().optional(),
  cta: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
});

export const contentSlideSchema = z.object({
  slideNumber: z.number().int().min(1),
  purpose: z.string().optional().default("point"),
  badge: z.string().optional(),
  headline: z.string().min(1, "Headline is required"),
  body: z.string().optional(),
  supportingPoints: z.array(z.string()).optional(),
  visualDirection: z.string().optional(),
  assetHints: z.array(z.string()).optional(),
  cta: z.string().optional(),
});

export const contentPlanSchema = z.object({
  title: z.string().min(1, "Title is required"),
  hook: z.string().min(1, "Hook is required"),
  slides: z.array(contentSlideSchema).min(1, "At least one slide is required"),
  caption: z.string().optional(),
  cta: z.string().optional(),
  tags: z.array(z.string()).optional(),
  brief: contentBriefSchema.optional(),
});

/**
 * Validates a ContentBrief and returns typed result or throws ZodError.
 */
export function validateContentBrief(input: unknown): ContentBrief {
  return contentBriefSchema.parse(input);
}

/**
 * Safely parses a ContentPlan without throwing.
 */
export function safeParseContentPlan(input: unknown) {
  return contentPlanSchema.safeParse(input);
}

/**
 * Validates a ContentPlan and returns typed result or throws ZodError.
 */
export function validateContentPlan(input: unknown): ContentPlan {
  return contentPlanSchema.parse(input);
}
