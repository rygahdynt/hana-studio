import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth";
import { generateContentPlan } from "@/server/ai/generate-content";

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce authentication via Clerk
    await requireCurrentUser();

    // 2. Parse request payload
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON request payload" },
        { status: 400 },
      );
    }

    const brief = (body as { brief?: unknown }).brief ?? body;

    // 3. Execute generation and validation
    const contentPlan = await generateContentPlan(brief);

    return NextResponse.json({ contentPlan }, { status: 200 });
  } catch (error) {
    console.error("[API] Content generation error:", error);

    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (error.message.includes("is not configured")) {
        return NextResponse.json(
          { error: error.message },
          { status: 503 },
        );
      }

      if (error.message.includes("Invalid AI provider API key")) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 },
        );
      }

      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: error.message },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error during content generation" },
      { status: 500 },
    );
  }
}
