import {
  SYSTEM_INSTRUCTION,
  CONTENT_PLAN_JSON_SCHEMA,
  buildUserPrompt,
} from "./prompt-builder";
import type { ContentBrief } from "@/types/content";

export interface AIProviderResponse {
  rawJson: unknown;
  provider: string;
  model: string;
}

/**
 * Extracts and parses JSON from raw LLM output, safely stripping markdown code fences if returned.
 */
function extractJsonFromCompletion(content: string): unknown {
  let cleaned = content.trim();

  // Strip leading/trailing markdown code fences (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  return JSON.parse(cleaned.trim());
}

/**
 * Executes structured generation using OpenAI.
 */
async function executeOpenAIGeneration(brief: ContentBrief): Promise<AIProviderResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI is not configured. Please set OPENAI_API_KEY in your environment variables.",
    );
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const endpoint = process.env.OPENAI_BASE_URL
    ? `${process.env.OPENAI_BASE_URL.replace(/\/+$/, "")}/chat/completions`
    : "https://api.openai.com/v1/chat/completions";

  const userPrompt = buildUserPrompt(brief);
  const normalizedModel = model.toLowerCase().trim();
  const isGpt5OrReasoningFamily =
    normalizedModel.startsWith("gpt-5") ||
    normalizedModel.startsWith("o1") ||
    normalizedModel.startsWith("o3") ||
    normalizedModel.startsWith("o4");

  const payload: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "content_plan_output",
        schema: CONTENT_PLAN_JSON_SCHEMA,
        strict: true,
      },
    },
    ...(isGpt5OrReasoningFamily ? {} : { temperature: 0.7 }),
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
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
      throw new Error("AI provider rate limit exceeded (429). Please try again in a few moments.");
    }

    throw new Error(`OpenAI generation failed (${response.status}): ${parsedError}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("OpenAI returned an empty or malformed completion message.");
  }

  const rawJson = extractJsonFromCompletion(rawContent);
  return {
    rawJson,
    provider: "openai",
    model,
  };
}

/**
 * Executes structured generation using OpenRouter.
 */
async function executeOpenRouterGeneration(brief: ContentBrief): Promise<AIProviderResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenRouter is not configured. Please set OPENROUTER_API_KEY in your environment variables.",
    );
  }

  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
  const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hanastudio.app";
  const userPrompt = buildUserPrompt(brief);

  const payload = {
    model,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: userPrompt },
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

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": appUrl,
      "X-Title": "Hana Studio",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
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
      throw new Error("Invalid AI provider API key. Please check your OPENROUTER_API_KEY configuration.");
    }
    if (response.status === 403) {
      throw new Error(`OpenRouter model access denied (${response.status}): ${parsedError}`);
    }
    if (response.status === 429) {
      throw new Error("AI provider rate limit exceeded (429). Please try again in a few moments.");
    }

    throw new Error(`OpenRouter generation failed (${response.status}): ${parsedError}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("OpenRouter returned an empty or malformed completion message.");
  }

  const rawJson = extractJsonFromCompletion(rawContent);
  return {
    rawJson,
    provider: "openrouter",
    model,
  };
}

/**
 * Server-side AI provider dispatcher supporting OpenAI and OpenRouter with optional automatic fallback.
 */
export async function executeStructuredContentGeneration(
  brief: ContentBrief,
): Promise<AIProviderResponse> {
  const selectedProvider = (process.env.AI_CONTENT_PROVIDER || "openai").toLowerCase().trim();

  const isTransientError = (err: unknown): boolean => {
    if (err instanceof Error) {
      return (
        err.message.includes("429") ||
        err.message.includes("rate limit") ||
        err.message.includes("503") ||
        err.message.includes("502") ||
        err.message.includes("504") ||
        err.name === "TimeoutError" ||
        err.message.toLowerCase().includes("timeout")
      );
    }
    return false;
  };

  if (selectedProvider === "openrouter") {
    try {
      return await executeOpenRouterGeneration(brief);
    } catch (primaryErr) {
      // If OpenRouter experiences a transient error and OpenAI is configured, attempt fallback
      if (isTransientError(primaryErr) && process.env.OPENAI_API_KEY) {
        console.warn("[AI Provider] OpenRouter transient error encountered, attempting fallback to OpenAI...");
        try {
          return await executeOpenAIGeneration(brief);
        } catch (fallbackErr) {
          console.warn("[AI Provider] OpenAI fallback also failed:", fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
        }
      }
      throw primaryErr;
    }
  }

  // Default: "openai"
  try {
    return await executeOpenAIGeneration(brief);
  } catch (primaryErr) {
    // If OpenAI experiences a transient error and OpenRouter is configured, attempt fallback
    if (isTransientError(primaryErr) && process.env.OPENROUTER_API_KEY) {
      console.warn("[AI Provider] OpenAI transient error encountered, attempting fallback to OpenRouter...");
      try {
        return await executeOpenRouterGeneration(brief);
      } catch (fallbackErr) {
        console.warn("[AI Provider] OpenRouter fallback also failed:", fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
      }
    }
    throw primaryErr;
  }
}
