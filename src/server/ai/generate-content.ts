import type { ContentBrief, ContentPlan } from "@/types/content";
import { validateContentBrief, validateContentPlan } from "@/features/content/validation/content-schema";
import { executeStructuredContentGeneration } from "./provider";

/**
 * Server-side domain service to generate a validated ContentPlan from a ContentBrief.
 * Decoupled from persistence, editor UI, and billing logic.
 */
export async function generateContentPlan(inputBrief: unknown): Promise<ContentPlan> {
  // 1. Validate input brief
  const validBrief: ContentBrief = validateContentBrief(inputBrief);

  // 2. Call AI provider for structured generation
  const startTime = Date.now();
  const { rawJson, provider, model } = await executeStructuredContentGeneration(validBrief);
  const elapsedMs = Date.now() - startTime;

  // 3. Authoritatively validate model output against ContentPlan schema
  const parsedPlan = validateContentPlan(rawJson);

  // 4. Attach original brief context
  const completePlan: ContentPlan = {
    ...parsedPlan,
    brief: validBrief,
  };

  console.log(`[AI Generation] Successfully generated ${completePlan.slides.length} slides using ${provider}/${model} in ${elapsedMs}ms.`);

  return completePlan;
}
