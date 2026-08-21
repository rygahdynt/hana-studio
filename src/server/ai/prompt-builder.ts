import type { ContentBrief } from "@/types/content";

export const CONTENT_PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Concise, compelling carousel project title",
    },
    hook: {
      type: "string",
      description: "High-impact hook headline for the first slide",
    },
    caption: {
      type: "string",
      description: "Social media post caption with relevant hashtags",
    },
    cta: {
      type: "string",
      description: "Call-to-action text for the final slide",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "Relevant niche and discovery tags",
    },
    slides: {
      type: "array",
      description: "Ordered list of narrative carousel slides",
      items: {
        type: "object",
        properties: {
          slideNumber: {
            type: "integer",
            description: "1-based sequential slide number",
          },
          purpose: {
            type: "string",
            enum: [
              "hook",
              "problem",
              "solution",
              "point",
              "example",
              "mistake",
              "tip",
              "summary",
              "cta",
            ],
            description: "The narrative function of this slide",
          },
          badge: {
            type: "string",
            description: "Optional short category tag or topic badge (e.g. 'MISTAKE #1', 'PRO TIP')",
          },
          headline: {
            type: "string",
            description: "Main focal headline for the slide (max 10-14 words)",
          },
          body: {
            type: "string",
            description: "Clear, concise explanation or paragraph (max 2-3 sentences)",
          },
          supportingPoints: {
            type: "array",
            items: { type: "string" },
            description: "Optional bullet takeaways or practical sub-points",
          },
          visualDirection: {
            type: "string",
            description: "Semantic visual styling or mood hint (e.g. 'Clean dark aesthetic with bold typography')",
          },
          assetHints: {
            type: "array",
            items: { type: "string" },
            description: "Semantic keywords for potential background images or icons",
          },
          cta: {
            type: "string",
            description: "Specific call to action if this is a closing slide",
          },
        },
        required: ["slideNumber", "purpose", "headline"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "hook", "slides"],
  additionalProperties: false,
};

export const SYSTEM_INSTRUCTION = `You are Hana Studio's expert social carousel strategist specializing in high-retention, high-value TikTok multi-slide carousels (9:16 vertical format).

Your mission is to generate structured, engaging, slide-by-slide narrative content based on the user's Content Brief.

GUIDELINES FOR HIGH-PERFORMANCE CAROUSELS:
1. Slide 1 (Hook): Must immediately capture attention, highlight a compelling problem or counter-intuitive insight, and trigger curiosity to swipe.
2. Body Slides (Slides 2 to N-1): Each slide must deliver exactly ONE distinct, high-value idea, tip, or step. Use concise, punchy headlines and readable body copy.
3. Supporting Points: Provide actionable, crisp sub-points where appropriate.
4. Slide N (CTA / Summary): Deliver a strong concluding takeaway and a clear call to action.
5. Tone & Language: Strictly adhere to the requested language and tone in the brief. If Indonesian ('id') is requested, write natural, engaging Indonesian.
6. Brevity: Social carousel text must be scannable. Avoid dense paragraphs or filler text.
7. Output Format: You must output strictly valid JSON conforming exactly to the structured schema. Never output markdown code blocks or explanations outside the JSON.`;

export function buildUserPrompt(brief: ContentBrief): string {
  const slideCount = brief.slideCount || 7;
  const language = brief.language || "Indonesian";
  const tone = brief.tone || "casual";

  let prompt = `Create a high-impact ${slideCount}-slide TikTok carousel on the following topic:\n\n`;
  prompt += `TOPIC: ${brief.topic}\n`;

  if (brief.audience) {
    prompt += `TARGET AUDIENCE: ${brief.audience}\n`;
  }
  if (brief.objective) {
    prompt += `OBJECTIVE: ${brief.objective}\n`;
  }
  prompt += `TONE: ${tone}\n`;
  prompt += `LANGUAGE: ${language}\n`;
  prompt += `EXACT SLIDE COUNT: ${slideCount}\n`;

  if (brief.contentDirection) {
    prompt += `CONTENT DIRECTION: ${brief.contentDirection}\n`;
  }
  if (brief.cta) {
    prompt += `CALL TO ACTION: ${brief.cta}\n`;
  }
  if (brief.keyPoints && brief.keyPoints.length > 0) {
    prompt += `MUST INCLUDE KEY POINTS:\n${brief.keyPoints.map((p) => `- ${p}`).join("\n")}\n`;
  }

  prompt += `\nStructure the slides sequentially from slideNumber 1 to ${slideCount}. Ensure Slide 1 is a powerful hook and Slide ${slideCount} is an engaging CTA.`;

  return prompt;
}
