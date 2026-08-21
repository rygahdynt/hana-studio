import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth";
import { generateImageAsset } from "@/server/image-generation";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireCurrentUser();

    // 2. Parse payload
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON request payload" },
        { status: 400 },
      );
    }

    const { prompt, projectId, referenceAssetIds } = body as {
      prompt?: string;
      projectId?: string;
      referenceAssetIds?: string[];
    };

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Field 'prompt' is required and cannot be empty." },
        { status: 400 },
      );
    }

    // 3. Generate and persist asset
    const asset = await generateImageAsset(user.id, {
      prompt,
      projectId,
      referenceAssetIds,
    });

    return NextResponse.json({ asset }, { status: 200 });
  } catch (error) {
    console.error("[API] Image generation error:", error);

    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (error.message.includes("is not configured")) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }

      if (error.message.includes("Invalid image provider API key")) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      if (error.message.includes("rate limit")) {
        return NextResponse.json({ error: error.message }, { status: 429 });
      }

      if (error.message.includes("not found or access denied")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error during image generation" },
      { status: 500 },
    );
  }
}
