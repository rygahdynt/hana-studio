import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth";
import { getRenderById, deleteRender } from "@/server/renders";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    const render = await getRenderById(id, user.id);
    if (!render) {
      return NextResponse.json({ error: "Render not found" }, { status: 404 });
    }

    return NextResponse.json(render);
  } catch (error) {
    console.error("[API] GET /api/renders/[id] failed:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : "Failed to fetch render" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    const result = await deleteRender(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] DELETE /api/renders/[id] failed:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : error instanceof Error ? error.message : "Failed to delete render" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
