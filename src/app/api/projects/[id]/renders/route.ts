import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth";
import {
  createRender,
  listRenders,
  type CreateRenderSlideInput,
} from "@/server/renders";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id: projectId } = await params;

    const result = await listRenders(user.id, {
      projectId,
      limit: 50,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] GET /api/projects/[id]/renders failed:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : "Failed to list project renders" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id: projectId } = await params;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const metaRaw = formData.get("meta") as string | null;
      const meta = metaRaw ? JSON.parse(metaRaw) : {};

      const captionSnapshot =
        typeof meta.captionSnapshot === "string"
          ? meta.captionSnapshot
          : (formData.get("captionSnapshot") as string | null);

      const processingMs =
        typeof meta.processingMs === "number"
          ? meta.processingMs
          : parseInt(formData.get("processingMs") as string, 10) || undefined;

      const format =
        typeof meta.format === "string"
          ? meta.format
          : (formData.get("format") as string | null) || "png";

      const slides: CreateRenderSlideInput[] = [];

      // Extract slide files from FormData
      const totalSlides =
        typeof meta.slideCount === "number"
          ? meta.slideCount
          : parseInt(formData.get("slideCount") as string, 10) || 0;

      for (let i = 0; i < Math.max(totalSlides, 30); i++) {
        const file = formData.get(`slide_${i}`) as File | null;
        if (file) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const slideMeta = meta.slides?.[i] || {};
          slides.push({
            slideIndex: i,
            fileName: file.name || `slide-${i + 1}.png`,
            width: slideMeta.width || 1080,
            height: slideMeta.height || 1920,
            buffer,
            contentType: file.type || "image/png",
          });
        }
      }

      // Check if files were passed as generic "slides" array
      if (slides.length === 0) {
        const allFiles = formData.getAll("slides") as File[];
        for (let i = 0; i < allFiles.length; i++) {
          const file = allFiles[i];
          if (file && typeof file.arrayBuffer === "function") {
            const buffer = Buffer.from(await file.arrayBuffer());
            const slideMeta = meta.slides?.[i] || {};
            slides.push({
              slideIndex: i,
              fileName: file.name || `slide-${i + 1}.png`,
              width: slideMeta.width || 1080,
              height: slideMeta.height || 1920,
              buffer,
              contentType: file.type || "image/png",
            });
          }
        }
      }

      // Extract optional ZIP file
      let zipBuffer: Buffer | undefined;
      let zipFileName: string | undefined;
      const zipFile = formData.get("zip") as File | null;
      if (zipFile && typeof zipFile.arrayBuffer === "function") {
        zipBuffer = Buffer.from(await zipFile.arrayBuffer());
        zipFileName = zipFile.name || "carousel.zip";
      }

      if (slides.length === 0) {
        return NextResponse.json(
          { error: "No slide images provided for render persistence" },
          { status: 400 },
        );
      }

      const created = await createRender(user.id, projectId, {
        captionSnapshot,
        format,
        processingMs,
        slides,
        zipBuffer,
        zipFileName,
      });

      return NextResponse.json(created, { status: 201 });
    }

    // Support JSON payload with Base64 slide buffers
    const jsonBody = await request.json().catch(() => ({}));
    if (!jsonBody || !Array.isArray(jsonBody.slides) || jsonBody.slides.length === 0) {
      return NextResponse.json(
        { error: "Invalid render payload: slides array required" },
        { status: 400 },
      );
    }

    const slides: CreateRenderSlideInput[] = jsonBody.slides.map(
      (s: {
        slideIndex?: number;
        fileName?: string;
        width?: number;
        height?: number;
        base64?: string;
        contentType?: string;
      }, idx: number) => {
        if (!s.base64) {
          throw new Error(`Slide ${idx} is missing base64 image data`);
        }
        const cleanBase64 = s.base64.replace(/^data:image\/\w+;base64,/, "");
        return {
          slideIndex: typeof s.slideIndex === "number" ? s.slideIndex : idx,
          fileName: s.fileName || `slide-${idx + 1}.png`,
          width: s.width || 1080,
          height: s.height || 1920,
          buffer: Buffer.from(cleanBase64, "base64"),
          contentType: s.contentType || "image/png",
        };
      },
    );

    let zipBuffer: Buffer | undefined;
    if (jsonBody.zipBase64) {
      const cleanZip = jsonBody.zipBase64.replace(/^data:application\/\w+;base64,/, "");
      zipBuffer = Buffer.from(cleanZip, "base64");
    }

    const created = await createRender(user.id, projectId, {
      captionSnapshot: jsonBody.captionSnapshot,
      format: jsonBody.format,
      processingMs: jsonBody.processingMs,
      slides,
      zipBuffer,
      zipFileName: jsonBody.zipFileName,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/projects/[id]/renders failed:", error);
    const isAuthError = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "Unauthorized" : error instanceof Error ? error.message : "Failed to persist render" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
