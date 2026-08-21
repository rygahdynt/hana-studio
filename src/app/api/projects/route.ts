import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth";
import { listProjects, createProject } from "@/server/projects";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const projects = await listProjects(user.id);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("[API] Failed to fetch projects:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : "Failed to fetch projects" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));

    const project = await createProject(user.id, {
      title: typeof body.title === "string" ? body.title : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      caption: typeof body.caption === "string" ? body.caption : undefined,
      socialAccountId: typeof body.socialAccountId === "string" ? body.socialAccountId : undefined,
      slideWidth: typeof body.slideWidth === "number" ? body.slideWidth : undefined,
      slideHeight: typeof body.slideHeight === "number" ? body.slideHeight : undefined,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to create project:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : "Failed to create project" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
