import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth";
import { getProjectById, updateProject, deleteProject } from "@/server/projects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireCurrentUser();
    const project = await getProjectById(id, user.id);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("[API] Failed to get project:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : "Failed to get project" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}

export async function PUT(
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

    const updated = await updateProject(id, user.id, body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] Failed to update project:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : error instanceof Error ? error.message : "Failed to update project" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireCurrentUser();
    await deleteProject(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Failed to delete project:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : "Failed to delete project" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
