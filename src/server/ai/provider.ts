import {
  SYSTEM_INSTRUCTION,
  CONTENT_PLAN_JSON_SCHEMA,
  buildUserPrompt,
} from "./prompt-builder";
import type { ContentBrief } from "@/types/content";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_ENDPOINT = process.env.OPENAI_BASE_URL
  ? `${process.env.OPENAI_BASE_URL.replace(/\/+$/, "")}/chat/completions`
  : "https://api.openai.com/v1/chat/completions";

export interface AIProviderResponse {
  rawJson: unknown;
  provider: string;
  model: string;
}

/**
 * Server-side AI provider client executing structured generation via OpenAI / OpenAI-compatible endpoint.
 */
export async function executeStructuredContentGeneration(
  brief: ContentBrief,
): Promise<AIProviderResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "AI generation provider is not configured. Please set OPENAI_API_KEY in your environment variables.",
    );
  }

  const userPrompt = buildUserPrompt(brief);

  const payload = {
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: SYSTEM_INSTRUCTION,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "content_plan_output",
        schema: CONTENT_PLAN_JSON_SCHEMA,
        strict: true,
      },
    },
    temperature: 0.7,
  };

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    let parsedError = errorText;
    try {
      const errJson = JSON.parse(errorText);
      parsedError = errJson.error?.message || errorText;
    } catch {
      // keep raw string
    }

    if (response.status === 401) {
      throw new Error("Invalid AI provider API key. Please check your OPENAI_API_KEY configuration.");
    }
    if (response.status === 429) {
      throw new Error("AI provider rate limit exceeded. Please try again in a few moments.");
    }

    throw new Error(`AI generation failed (${response.status}): ${parsedError}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;

  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("AI provider returned an empty or malformed completion message.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (parseErr) {
    throw new Error(`Failed to parse AI provider JSON response: ${parseErr instanceof Error ? parseErr.message : "Invalid JSON"}`);
  }

  return {
    rawJson: parsed,
    provider: "openai",
    model: OPENAI_MODEL,
  };
}
