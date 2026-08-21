import type { ReferenceImagePayload } from "./types";

const IMAGE_GENERATION_API_KEY = process.env.IMAGE_GENERATION_API_KEY;
const IMAGE_GENERATION_MODEL = process.env.IMAGE_GENERATION_MODEL || "flux-2-pro";
const IMAGE_GENERATION_BASE_URL =
  process.env.IMAGE_GENERATION_BASE_URL || "https://api.bfl.ai";

const POLLING_INTERVAL_MS = 1500;
const MAX_POLLING_ATTEMPTS = 60; // 90 seconds max timeout

export interface ProviderGenerationOutput {
  imageBuffer: Buffer;
  mimeType: string;
}

interface BflSubmitResponse {
  id?: string;
  polling_url?: string;
  error?: string | { message?: string };
}

interface BflPollResponse {
  id?: string;
  status?: "Pending" | "Processing" | "Ready" | "Error" | "Failed" | "Request Moderated" | "Content Moderated" | string;
  result?: {
    sample?: string;
    prompt?: string;
  };
  error?: string | { message?: string };
  details?: string;
}

/**
 * Polls the BFL result URL until status is Ready or a terminal failure occurs.
 */
async function pollBflResult(
  pollingUrl: string,
  apiKey: string,
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_POLLING_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));

    const res = await fetch(pollingUrl, {
      method: "GET",
      headers: {
        "x-key": apiKey,
      },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("Image generation provider authentication failed.");
      }
      if (res.status === 429) {
        throw new Error("Image generation provider rate limit exceeded.");
      }
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`Image generation polling error (${res.status}): ${errText}`);
    }

    const data: BflPollResponse = await res.json();
    const status = data.status;

    if (status === "Ready") {
      const sampleUrl = data.result?.sample;
      if (!sampleUrl || typeof sampleUrl !== "string") {
        throw new Error("Image generation completed but sample URL was missing.");
      }
      return sampleUrl;
    }

    if (status === "Pending" || status === "Processing") {
      // Continue polling
      continue;
    }

    if (status === "Request Moderated" || status === "Content Moderated") {
      throw new Error("Image generation request was moderated by the provider.");
    }

    if (status === "Error" || status === "Failed") {
      const detailMsg =
        typeof data.error === "string"
          ? data.error
          : data.error?.message || data.details || "Image generation failed.";
      throw new Error(`Image generation failed: ${detailMsg}`);
    }

    // Unrecognized terminal status
    throw new Error(`Image generation ended with unexpected status: ${status || "Unknown"}`);
  }

  throw new Error("Image generation timed out.");
}

/**
 * Executes server-side image generation using Black Forest Labs (BFL) FLUX.2 [pro].
 * Handles asynchronous task submission, polling, sample download, and buffer extraction.
 */
export async function executeImageGeneration(
  prompt: string,
  references?: ReferenceImagePayload[],
): Promise<ProviderGenerationOutput> {
  if (!IMAGE_GENERATION_API_KEY) {
    throw new Error(
      "Image generation provider is not configured. Please set IMAGE_GENERATION_API_KEY.",
    );
  }

  const endpointModel = IMAGE_GENERATION_MODEL.replace(/^v1\//, "").replace(/^\/+/, "");
  const submitUrl = `${IMAGE_GENERATION_BASE_URL.replace(/\/+$/, "")}/v1/${endpointModel}`;

  // 1088 × 1920 matches standard 9:16 portrait ratio and 2MP requirement
  const payload: Record<string, unknown> = {
    prompt,
    width: 1088,
    height: 1920,
    prompt_upsampling: false,
    output_format: "png",
    safety_tolerance: 2,
  };

  // Attach reference image as visual identity anchor if provided
  if (references && references.length > 0) {
    const primaryRef = references[0];
    if (primaryRef) {
      const base64Data = primaryRef.buffer.toString("base64");
      payload.image_prompt = base64Data;
      payload.input_image = base64Data;
    }
  }

  // 1. Submit Generation Request to BFL
  const submitRes = await fetch(submitUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-key": IMAGE_GENERATION_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!submitRes.ok) {
    if (submitRes.status === 401 || submitRes.status === 403) {
      throw new Error("Image generation provider authentication failed.");
    }
    if (submitRes.status === 429) {
      throw new Error("Image generation provider rate limit exceeded.");
    }

    const errText = await submitRes.text().catch(() => "Unknown error");
    let parsedMessage = errText;
    try {
      const errJson = JSON.parse(errText);
      parsedMessage =
        typeof errJson.error === "string"
          ? errJson.error
          : errJson.error?.message || errJson.message || errText;
    } catch {
      // Use raw text
    }

    throw new Error(`Image generation request failed (${submitRes.status}): ${parsedMessage}`);
  }

  const submitData: BflSubmitResponse = await submitRes.json();
  const pollingUrl =
    submitData.polling_url ||
    (submitData.id
      ? `${IMAGE_GENERATION_BASE_URL.replace(/\/+$/, "")}/v1/get_result?id=${submitData.id}`
      : null);

  if (!pollingUrl) {
    throw new Error("Image generation provider did not return a valid task polling URL.");
  }

  // 2. Poll BFL until Ready
  const sampleUrl = await pollBflResult(pollingUrl, IMAGE_GENERATION_API_KEY);

  // 3. Download the generated sample image directly to Buffer
  const imageRes = await fetch(sampleUrl);
  if (!imageRes.ok) {
    throw new Error(`Failed to download generated sample image (${imageRes.status}).`);
  }

  const arrayBuffer = await imageRes.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);
  const mimeType = imageRes.headers.get("content-type") || "image/png";

  return {
    imageBuffer,
    mimeType,
  };
}
