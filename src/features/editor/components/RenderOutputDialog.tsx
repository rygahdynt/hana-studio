"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  Share2,
  Download,
  Copy,
  Check,
  Loader2,
  Smartphone,
  AlertCircle,
  FileArchive,
  Layers,
  RefreshCw,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { EditorProject } from "../types";
import { renderSlideToBlob } from "../export/canvas-renderer";
import { getSlideFilename, getZipFilename } from "../export/filename";
import { downloadBlob } from "../export/export-service";
import { useSocialAccounts } from "@/features/social-accounts";
import { useCreateRender } from "@/features/renders";
import Link from "next/link";

interface RenderOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: EditorProject;
  onOpenExport?: () => void;
}

interface RenderedItem {
  file: File;
  previewUrl: string;
  slideNumber: number;
}

export const RenderOutputDialog: React.FC<RenderOutputDialogProps> = ({
  open,
  onOpenChange,
  project,
  onOpenExport,
}) => {
  const { data: socialAccounts } = useSocialAccounts();
  const targetAccount =
    project.socialAccount ||
    (project.socialAccountId
      ? socialAccounts?.find((a) => a.id === project.socialAccountId)
      : null);

  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);
  const [renderedItems, setRenderedItems] = useState<RenderedItem[]>([]);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState<boolean>(false);

  const createRenderMutation = useCreateRender();
  const [savedRenderId, setSavedRenderId] = useState<string | null>(null);

  const previewUrlsRef = useRef<string[]>([]);

  // Cleanup object URLs on unmount or re-render
  const cleanupPreviews = useCallback(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => cleanupPreviews();
  }, [cleanupPreviews]);

  // Execute rendering of all project slides
  const executeRender = useCallback(async () => {
    cleanupPreviews();
    setRenderedItems([]);
    setShareError(null);
    setSavedRenderId(null);
    setIsRendering(true);

    const sortedSlides = [...project.slides].sort((a, b) => a.position - b.position);
    const total = sortedSlides.length;

    if (total === 0) {
      setIsRendering(false);
      setShareError("Project contains no slides to render.");
      return;
    }

    try {
      const newItems: RenderedItem[] = [];
      const newFiles: File[] = [];

      for (let i = 0; i < total; i++) {
        const slide = sortedSlides[i];
        if (!slide) continue;
        const slideNumber = i + 1;

        setRenderProgress({
          current: slideNumber,
          total,
          message: `Rendering slide ${slideNumber} of ${total}...`,
        });

        const blob = await renderSlideToBlob(
          slide,
          project.slideWidth,
          project.slideHeight,
          { format: "png" },
        );

        const filename = getSlideFilename(project.title, slideNumber, "png");
        const file = new File([blob], filename, { type: "image/png" });
        const previewUrl = URL.createObjectURL(blob);
        previewUrlsRef.current.push(previewUrl);

        newItems.push({
          file,
          previewUrl,
          slideNumber,
        });
        newFiles.push(file);
      }

      setRenderedItems(newItems);

      // Feature detection for multi-file Web Share API
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function"
      ) {
        try {
          const canShareFiles = navigator.canShare({ files: newFiles });
          setCanNativeShare(canShareFiles);
        } catch {
          setCanNativeShare(false);
        }
      } else {
        setCanNativeShare(false);
      }
    } catch (err) {
      console.error("[Render Output] Rendering failed:", err);
      setShareError(err instanceof Error ? err.message : "Failed to render carousel.");
    } finally {
      setIsRendering(false);
      setRenderProgress(null);
    }
  }, [project, cleanupPreviews]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      cleanupPreviews();
      setRenderedItems([]);
      setShareError(null);
      setSavedRenderId(null);
      setIsRendering(false);
    }
    onOpenChange(nextOpen);
  };

  // Auto-start rendering when dialog is opened
  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    const startRender = async () => {
      await Promise.resolve();
      if (isMounted) {
        await executeRender();
      }
    };

    startRender();

    return () => {
      isMounted = false;
      cleanupPreviews();
    };
  }, [open, executeRender, cleanupPreviews]);

  // Native Mobile Web Share
  const handleNativeShare = async () => {
    if (renderedItems.length === 0) return;

    setIsSharing(true);
    setShareError(null);

    const files = renderedItems.map((item) => item.file);

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files })
      ) {
        await navigator.share({
          files,
          title: project.title,
          text: project.caption || undefined,
        });
      } else {
        setShareError("Multi-file sharing is not supported on this browser.");
      }
    } catch (err) {
      // Ignore user aborting the share sheet
      if ((err as Error).name !== "AbortError") {
        console.error("[Render Output] Native share failed:", err);
        setShareError("Failed to share files. You can download the ZIP instead.");
      }
    } finally {
      setIsSharing(false);
    }
  };

  // ZIP download fallback
  const handleDownloadZip = async () => {
    if (renderedItems.length === 0) return;
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      renderedItems.forEach((item) => {
        zip.file(item.file.name, item.file);
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFilename = getZipFilename(project.title);
      downloadBlob(zipBlob, zipFilename);
    } catch (err) {
      console.error("[Render Output] ZIP generation failed:", err);
      setShareError("Failed to download ZIP archive.");
    }
  };

  // Save persistent render artifact to R2 & DB
  const handleSaveRender = async () => {
    if (renderedItems.length === 0 || createRenderMutation.isPending) return;
    try {
      let zipBlob: Blob | null = null;
      try {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        renderedItems.forEach((item) => {
          zip.file(item.file.name, item.file);
        });
        zipBlob = await zip.generateAsync({ type: "blob" });
      } catch (zipErr) {
        console.warn("[Render Output] Skipping ZIP bundle creation during save:", zipErr);
      }

      const files = renderedItems.map((item) => item.file);
      const result = await createRenderMutation.mutateAsync({
        projectId: project.id,
        captionSnapshot: project.caption || null,
        format: "png",
        files,
        zipBlob,
        zipFileName: getZipFilename(project.title),
      });
      setSavedRenderId(result.id);
    } catch (err) {
      console.error("[Render Output] Failed to persist render:", err);
      setShareError(err instanceof Error ? err.message : "Failed to save render artifact.");
    }
  };

  // Copy caption
  const handleCopyCaption = async () => {
    if (!project.caption) return;
    try {
      await navigator.clipboard.writeText(project.caption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch (err) {
      console.error("[Render Output] Failed to copy caption:", err);
    }
  };

  const hasCaption = Boolean(project.caption?.trim());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[620px] bg-neutral-950 border border-neutral-800 text-neutral-100 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  Render Output
                  {!isRendering && renderedItems.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-950 text-emerald-300 border-emerald-800">
                      Ready
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-400 flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span>{project.title || "Untitled Carousel"}</span>
                  <span>•</span>
                  <span>{project.slideWidth} × {project.slideHeight} px</span>
                  {targetAccount && (
                    <>
                      <span>•</span>
                      <span className="text-purple-400 font-medium">
                        Target: {targetAccount.platform.toUpperCase()} · @{targetAccount.username}
                      </span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>

            {!isRendering && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={executeRender}
                className="text-xs text-neutral-400 hover:text-white gap-1.5 h-8 px-2.5"
                title="Re-render carousel"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Re-render</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {shareError && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{shareError}</span>
          </div>
        )}

        {/* Rendering Progress View */}
        {isRendering && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-white">
                {renderProgress?.message || "Rendering carousel output..."}
              </span>
              <span className="text-xs text-neutral-500">
                Generating full-resolution 1080 × 1920 px slide images in memory
              </span>
            </div>
          </div>
        )}

        {/* Rendered Slides View */}
        {!isRendering && renderedItems.length > 0 && (
          <div className="flex flex-col gap-5 py-2">
            {/* Slide Previews Grid */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Rendered Slides ({renderedItems.length})
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  1080 × 1920 PNG
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 max-h-[220px] overflow-y-auto">
                {renderedItems.map((item) => (
                  <div
                    key={item.slideNumber}
                    className="relative group rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 flex flex-col aspect-[9/16]"
                  >
                    <img
                      src={item.previewUrl}
                      alt={`Slide ${item.slideNumber}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-white">
                      #{item.slideNumber}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Share Action */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-800/50 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      Share Carousel to Phone / TikTok
                    </h4>
                    <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                      Sends all {renderedItems.length} slide images as an ordered package directly to your phone&apos;s native share sheet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                {canNativeShare ? (
                  <Button
                    type="button"
                    onClick={handleNativeShare}
                    disabled={isSharing}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-9 gap-1.5 shadow-md shadow-blue-950"
                  >
                    {isSharing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                    <span>Share All {renderedItems.length} Slides</span>
                  </Button>
                ) : (
                  <div className="w-full p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[11px] text-neutral-400 flex items-start gap-2">
                    <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-neutral-200">Mobile Tip:</strong> Open Hana Studio on your phone to share directly to TikTok composer. On desktop, download the ZIP archive below.
                    </span>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadZip}
                  className="w-full sm:w-auto text-xs font-medium h-9 gap-1.5 border-neutral-800 text-neutral-200 hover:bg-neutral-800"
                >
                  <FileArchive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download ZIP</span>
                </Button>
              </div>
            </div>

            {/* Post Caption Section */}
            <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300">
                  Post Caption
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!hasCaption}
                  onClick={handleCopyCaption}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 h-7 px-2 gap-1"
                >
                  {copiedCaption ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Caption</span>
                    </>
                  )}
                </Button>
              </div>

              {hasCaption ? (
                <p className="text-[11px] text-neutral-300 bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/60 font-sans whitespace-pre-wrap leading-relaxed">
                  {project.caption}
                </p>
              ) : (
                <p className="text-[11px] text-neutral-500 italic">
                  No caption written for this project. You can write one in the editor.
                </p>
              )}
            </div>

            {/* Persistent Render Library Integration */}
            <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Film className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-white">Save Render Artifact</h5>
                  <p className="text-[10px] text-neutral-400">
                    Store this render in your Renders dashboard for future sharing and publishing.
                  </p>
                </div>
              </div>

              {savedRenderId ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-emerald-800/60 bg-emerald-950/40 text-emerald-400 gap-1">
                    <Check className="w-3 h-3" />
                    <span>Saved</span>
                  </Badge>
                  <Link
                    href="/dashboard/renders"
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
                  >
                    View in Renders →
                  </Link>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleSaveRender}
                  disabled={createRenderMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 gap-1.5 shadow-sm shadow-emerald-950 shrink-0"
                >
                  {createRenderMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-3 h-3" />
                      <span>Save to Renders</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
