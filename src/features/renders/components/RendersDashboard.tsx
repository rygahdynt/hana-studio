"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Film,
  Search,
  Plus,
  FolderOpen,
  Users,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserButton } from "@clerk/nextjs";
import { AssetLibraryDialog } from "@/features/assets";
import { useRenders, useDeleteRender, type RenderDto } from "../hooks/use-renders";
import { RenderCard } from "./RenderCard";
import { RenderPreviewDialog } from "./RenderPreviewDialog";

export function RendersDashboard() {
  const [assetLibraryOpen, setAssetLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [previewRender, setPreviewRender] = useState<RenderDto | null>(null);
  const [deletingRender, setDeletingRender] = useState<RenderDto | null>(null);

  // Sharing state
  const [sharingRender, setSharingRender] = useState<RenderDto | null>(null);
  const [isPreparingShare, setIsPreparingShare] = useState(false);

  // Fetch paginated renders
  const { data: rendersData, isLoading, error } = useRenders({
    page: currentPage,
    limit: 12,
    search: searchQuery || undefined,
  });

  const deleteRenderMutation = useDeleteRender();

  const renders = rendersData?.data || [];
  const pagination = rendersData?.pagination;
  const totalPages = pagination?.totalPages || 1;

  // Execute Native Web Share
  const handleShare = useCallback(async (render: RenderDto) => {
    setSharingRender(render);
    setIsPreparingShare(true);

    try {
      if (!render.slides || render.slides.length === 0) {
        alert("No slide images found in this render artifact.");
        return;
      }

      // 1. Fetch all signed image URLs as Blobs concurrently
      const filePromises = render.slides.map(async (slide, idx) => {
        const res = await fetch(slide.url);
        if (!res.ok) throw new Error(`Failed to fetch slide ${idx + 1}`);
        const blob = await res.blob();
        const fileName = slide.fileName || `slide-${idx + 1}.png`;
        return new File([blob], fileName, { type: "image/png" });
      });

      const files = await Promise.all(filePromises);

      // 2. Invoke Web Share if available
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files,
          title: render.projectName,
          text: render.captionSnapshot || render.projectName,
        });
      } else {
        // Fallback for Desktop / non-share browsers: copy caption and download ZIP/first slide
        if (render.captionSnapshot) {
          await navigator.clipboard.writeText(render.captionSnapshot);
        }
        if (render.zipUrl) {
          window.open(render.zipUrl, "_blank");
        } else if (render.slides[0]?.url) {
          window.open(render.slides[0].url, "_blank");
        }
        alert("Caption copied to clipboard! Slide assets opened for download.");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Share error:", err);
        alert("Failed to prepare files for sharing.");
      }
    } finally {
      setIsPreparingShare(false);
      setSharingRender(null);
    }
  }, []);

  // Confirm delete handler
  const handleDeleteConfirm = async () => {
    if (!deletingRender) return;
    try {
      await deleteRenderMutation.mutateAsync(deletingRender.id);
      setDeletingRender(null);
      if (previewRender?.id === deletingRender.id) {
        setPreviewRender(null);
      }
    } catch (err) {
      console.error("Failed to delete render:", err);
      alert("Failed to delete render. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans">
      {/* Top Application Shell Header */}
      <header className="sticky top-0 z-30 h-14 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Logo / Branding */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-500/30">
              H
            </div>
            <span className="font-semibold text-base tracking-tight text-white group-hover:text-blue-400 transition-colors">
              Hana Studio
            </span>
          </Link>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              Projects
            </Link>
            <Link
              href="/dashboard/accounts"
              className="px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
              title="Social Account Library"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Accounts</span>
            </Link>
            <button
              type="button"
              onClick={() => setAssetLibraryOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Asset Library"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Assets</span>
            </button>
            <Link
              href="/dashboard/renders"
              className="px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-800 text-white flex items-center gap-1.5"
              title="Rendered Carousel Outputs"
            >
              <Film className="w-3.5 h-3.5 text-emerald-400" />
              <span>Renders</span>
            </Link>
          </nav>
        </div>

        {/* Authenticated User Account Menu */}
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8 rounded-full border border-neutral-800",
              },
            }}
          />
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-6xl flex flex-col gap-6">
        {/* Header & Primary Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Film className="w-6 h-6 text-emerald-400" />
              Renders
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Manage and share your rendered carousel outputs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/">
              <Button
                variant="outline"
                className="border-neutral-800 hover:bg-neutral-900 text-neutral-300 text-xs h-9 gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                Go to Projects
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Filter Bar */}
        <div className="flex items-center gap-3 bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-800/80">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search renders by project title..."
              className="pl-9 bg-neutral-950 border-neutral-800 text-xs h-9 text-white placeholder:text-neutral-500"
            />
          </div>
        </div>

        {/* Content Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-400">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
            <span className="text-xs">Loading render artifacts...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-900/40 bg-red-950/20 text-red-400 p-6 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-400" />
            <p className="text-sm font-semibold">Failed to load renders</p>
            <p className="text-xs text-red-300/80 mt-1">
              {(error as Error).message || "An unexpected error occurred while querying render artifacts."}
            </p>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && renders.length === 0 && (
          <Card className="border-neutral-800/80 bg-neutral-900/40 backdrop-blur-sm text-neutral-200">
            <CardContent className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-4 shadow-sm shadow-emerald-950">
                <Film className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5">
                {searchQuery ? "No matching renders" : "No renders yet"}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mb-6 leading-relaxed">
                {searchQuery
                  ? `No render records match "${searchQuery}". Try a different search term.`
                  : "Open any project in the editor and click Render to generate high-resolution PNG slides, download archives, or share to TikTok."}
              </p>
              <Link href="/">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-9 px-4 gap-1.5 shadow-md shadow-emerald-950">
                  <span>Open Projects</span>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Renders Grid */}
        {!isLoading && !error && renders.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {renders.map((render) => (
                <RenderCard
                  key={render.id}
                  render={render}
                  onPreview={(r) => setPreviewRender(r)}
                  onShare={handleShare}
                  onDelete={(r) => setDeletingRender(r)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="border-neutral-800 h-8 text-xs gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Button>
                <span className="text-xs text-neutral-400 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="border-neutral-800 h-8 text-xs gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Render Full Preview Modal */}
      <RenderPreviewDialog
        render={previewRender}
        open={Boolean(previewRender)}
        onOpenChange={(open) => {
          if (!open) setPreviewRender(null);
        }}
        onShare={handleShare}
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={Boolean(deletingRender)}
        onOpenChange={(open) => {
          if (!open) setDeletingRender(null);
        }}
      >
        <DialogContent className="max-w-md bg-neutral-950 border-neutral-800 text-neutral-100 p-6">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-white">
              Delete Render Artifact?
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400 pt-1 leading-relaxed">
              Are you sure you want to delete this render for{" "}
              <span className="text-white font-medium">
                &ldquo;{deletingRender?.projectName}&rdquo;
              </span>
              ? All {deletingRender?.slideCount} slide PNG files will be permanently purged from storage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingRender(null)}
              className="border-neutral-800 text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteRenderMutation.isPending}
              className="bg-red-600 hover:bg-red-500 text-white text-xs h-9 gap-1.5"
            >
              {deleteRenderMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>Delete Permanently</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preparing Share Loading Overlay */}
      {isPreparingShare && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-xs font-medium">Preparing slide files for sharing...</span>
        </div>
      )}

      {/* Asset Library Modal */}
      <AssetLibraryDialog
        open={assetLibraryOpen}
        onOpenChange={setAssetLibraryOpen}
      />
    </div>
  );
}
