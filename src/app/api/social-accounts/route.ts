import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth";
import { listSocialAccounts, createSocialAccount } from "@/server/social-accounts";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const accounts = await listSocialAccounts(user.id);
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("[API] Failed to fetch social accounts:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : "Failed to fetch social accounts" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { platform, accountIdentifier, username, displayName, avatarUrl, isActive } = body;

    if (!username || typeof username !== "string" || !username.trim()) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    const account = await createSocialAccount(user.id, {
      platform: typeof platform === "string" ? platform : "tiktok",
      accountIdentifier: typeof accountIdentifier === "string" ? accountIdentifier : "",
      username: username.trim(),
      displayName: typeof displayName === "string" ? displayName : username.trim(),
      avatarUrl: typeof avatarUrl === "string" ? avatarUrl : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to create social account:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      {
        error: isAuthError
          ? "Unauthorized"
          : error instanceof Error
          ? error.message
          : "Failed to create social account",
      },
      { status: isAuthError ? 401 : 400 },
    );
  }
}
