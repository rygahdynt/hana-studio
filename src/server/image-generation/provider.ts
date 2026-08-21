import crypto from "crypto";
import type { ReferenceImagePayload } from "./types";

export interface ProviderGenerationOutput {
  imageBuffer: Buffer;
  mimeType: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedAuthToken: CachedToken | null = null;

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
];

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Generates an OAuth2 access token for Google Cloud Service Account using pure Node.js crypto.
 * Caches the token until 60 seconds before expiration to prevent duplicate auth roundtrips.
 */
async function getGoogleAccessToken(
  clientEmail: string,
  privateKeyRaw: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAuthToken && cachedAuthToken.expiresAt > now + 60) {
    return cachedAuthToken.token;
  }

  const formattedPrivateKey = privateKeyRaw.includes(String.raw`\n`)
    ? privateKeyRaw.split(String.raw`\n`).join("\n")
    : privateKeyRaw;

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  const signature = signer.sign(formattedPrivateKey, "base64url");

  const jwt = `${unsignedToken}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text().catch(() => "Unknown error");
    throw new Error(`Google Service Account authentication failed (${tokenRes.status}): ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!tokenData.access_token) {
    throw new Error("Google OAuth2 endpoint returned no access token.");
  }

  const expiresIn = typeof tokenData.expires_in === "number" ? tokenData.expires_in : 3600;

  cachedAuthToken = {
    token: tokenData.access_token,
    expiresAt: now + expiresIn,
  };

  return tokenData.access_token;
}

/**
 * Executes image generation using Google Cloud Vertex AI (gemini-3.1-flash-image).
 * Supports prompt text and optional single reference image via multimodal inline_data.
 */
export async function executeImageGeneration(
  prompt: string,
  references?: ReferenceImagePayload[],
): Promise<ProviderGenerationOutput> {
  const projectId = process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const model = process.env.VERTEX_AI_IMAGE_MODEL || "gemini-3.1-flash-image";
  const location = process.env.VERTEX_AI_LOCATION || "global";

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Google Vertex AI is not configured. Please set GOOGLE_SERVICE_ACCOUNT_PROJECT_ID, GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  const token = await getGoogleAccessToken(clientEmail, privateKey);

  const parts: Array<{
    inline_data?: { mime_type: string; data: string };
    text?: string;
  }> = [];

  // 1. Attach optional primary reference image if available
  if (references && references.length > 0) {
    const primaryRef = references[0];
    if (primaryRef && primaryRef.buffer && primaryRef.buffer.length > 0) {
      parts.push({
        inline_data: {
          mime_type: primaryRef.mimeType || "image/jpeg",
          data: primaryRef.buffer.toString("base64"),
        },
      });
    }
  }

  // 2. Attach text prompt
  parts.push({ text: prompt });

  const endpointUrl = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const res = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generation_config: {
        response_modalities: ["TEXT", "IMAGE"],
      },
      safety_settings: SAFETY_SETTINGS,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    if (res.status === 401 || res.status === 403) {
      throw new Error("Vertex AI authentication failed. Check Google Service Account permissions.");
    }
    if (res.status === 429) {
      throw new Error("Vertex AI rate limit or quota exceeded.");
    }
    throw new Error(`Vertex AI image generation failed (${res.status}): ${errText}`);
  }

  interface VertexPart {
    inlineData?: {
      mimeType?: string;
      data?: string;
    };
    text?: string;
  }

  interface VertexCandidate {
    content?: {
      parts?: VertexPart[];
    };
    finishReason?: string;
  }

  interface VertexResponse {
    candidates?: VertexCandidate[];
  }

  const json = (await res.json()) as VertexResponse;

  for (const candidate of json.candidates ?? []) {
    for (const part of candidate?.content?.parts ?? []) {
      if (part?.inlineData?.data) {
        const base64 = part.inlineData.data;
        const imageBuffer = Buffer.from(base64, "base64");
        const mimeType = part.inlineData.mimeType || "image/png";

        return {
          imageBuffer,
          mimeType,
        };
      }
    }
  }

  throw new Error("Vertex AI returned a response with no generated image data.");
}
