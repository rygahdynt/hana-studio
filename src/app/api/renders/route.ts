import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth";
import { listRenders } from "@/server/renders";

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = request.nextUrl;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const search = searchParams.get("search") || undefined;
    const projectId = searchParams.get("projectId") || undefined;

    const result = await listRenders(user.id, {
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 12 : limit,
      search,
      projectId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] GET /api/renders failed:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : "Failed to fetch renders" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
