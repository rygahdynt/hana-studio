import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth";
import {
  getSocialAccountById,
  updateSocialAccount,
  deleteSocialAccount,
} from "@/server/social-accounts";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireCurrentUser();
    const account = await getSocialAccountById(id, user.id);

    if (!account) {
      return NextResponse.json(
        { error: "Social account not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("[API] Failed to get social account:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : "Failed to get social account" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    }

    const updated = await updateSocialAccount(id, user.id, body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] Failed to update social account:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      {
        error: isAuthError
          ? "Unauthorized"
          : error instanceof Error
          ? error.message
          : "Failed to update social account",
      },
      { status: isAuthError ? 401 : 400 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return PATCH(request, context);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireCurrentUser();
    await deleteSocialAccount(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Failed to delete social account:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      {
        error: isAuthError
          ? "Unauthorized"
          : error instanceof Error
          ? error.message
          : "Failed to delete social account",
      },
      { status: isAuthError ? 401 : 400 },
    );
  }
}
