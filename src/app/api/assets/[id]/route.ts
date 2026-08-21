import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth";
import { updateAssetCategory, deleteAsset } from "@/server/assets";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const body = await request.json();

    const category = body.category !== undefined ? body.category : null;

    const updated = await updateAssetCategory(user.id, id, category);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] Failed to update asset category:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : error instanceof Error ? error.message : "Failed to update asset" },
      { status: isAuthError ? 401 : 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    const result = await deleteAsset(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Failed to delete asset:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : error instanceof Error ? error.message : "Failed to delete asset" },
      { status: isAuthError ? 401 : 400 },
    );
  }
}
