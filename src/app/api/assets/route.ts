import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth";
import { listAssets, createAssetFromUpload } from "@/server/assets";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const assets = await listAssets(user.id);
    return NextResponse.json(assets);
  } catch (error) {
    console.error("[API] Failed to list assets:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : "Failed to list assets" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No file provided in form data" },
        { status: 400 },
      );
    }

    const filename = (file as File).name || "uploaded-image.png";
    const mimeType = file.type || "image/png";
    const category = typeof formData.get("category") === "string" ? (formData.get("category") as string) : undefined;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const asset = await createAssetFromUpload(
      user.id,
      buffer,
      filename,
      mimeType,
      category,
    );

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to upload asset:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : error instanceof Error ? error.message : "Failed to upload asset" },
      { status: isAuthError ? 401 : 400 },
    );
  }
}
