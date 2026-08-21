"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Share2,
  FileArchive,
  Layers,
  Sparkles,
} from "lucide-react";
import type { RenderDto } from "../hooks/use-renders";

interface RenderPreviewDialogProps {
  render: RenderDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare?: (render: RenderDto) => void;
}

export const RenderPreviewDialog: React.FC<RenderPreviewDialogProps> = ({
  render,
  open,
  onOpenChange,
  onShare,
}) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  if (!render) return null;

  const slides = render.slides || [];
  const currentSlide = slides[activeSlideIndex] || slides[0];
  const totalSlides = slides.length;

  const handleCopyCaption = async () => {
    if (!render.captionSnapshot) return;
    try {
      await navigator.clipboard.writeText(render.captionSnapshot);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch (err) {
      console.error("Failed to copy caption:", err);
    }
  };

  const handleDownloadCurrentSlide = () => {
    if (!currentSlide?.url) return;
    const a = document.createElement("a");
    a.href = currentSlide.url;
    a.download = currentSlide.fileName || `slide-${activeSlideIndex + 1}.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadZip = () => {
    if (!render.zipUrl) return;
    const a = document.createElement("a");
    a.href = render.zipUrl;
    a.download = `${render.projectName.toLowerCase().replace(/\s+/g, "-")}-carousel.zip`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-neutral-950 border-neutral-800 text-neutral-100 p-0 overflow-hidden flex flex-col md:flex-row h-[85vh]">
        {/* Left Side: Visual Slide Canvas Preview */}
        <div className="flex-1 bg-neutral-900/60 relative flex items-center justify-center p-4 overflow-hidden border-b md:border-b-0 md:border-r border-neutral-800">
          {currentSlide?.url ? (
            <div className="relative h-full max-h-[70vh] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-neutral-800/80 bg-neutral-950 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentSlide.url}
                alt={`Slide ${activeSlideIndex + 1}`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="text-center text-neutral-500 text-xs">
              No preview available for this slide
            </div>
          )}

          {/* Slide Navigation Overlay Arrows */}
          {totalSlides > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeSlideIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-800 text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1))}
                disabled={activeSlideIndex === totalSlides - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-800 text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Slide Pill Counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-neutral-950/90 border border-neutral-800 text-neutral-300 text-[11px] font-medium backdrop-blur-md shadow-md">
            Slide {activeSlideIndex + 1} of {totalSlides}
          </div>
        </div>

        {/* Right Side: Metadata & Actions Sidebar */}
        <div className="w-full md:w-80 p-5 flex flex-col justify-between overflow-y-auto gap-4 bg-neutral-950">
          <div className="flex flex-col gap-4">
            <DialogHeader className="p-0 text-left">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] border-emerald-800/60 bg-emerald-950/40 text-emerald-400">
                  Ready
                </Badge>
                <span className="text-[10px] text-neutral-500">
                  {new Date(render.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <DialogTitle className="text-base font-bold text-white leading-snug">
                {render.projectName}
              </DialogTitle>
            </DialogHeader>

            {/* Thumbnail Strip */}
            {totalSlides > 1 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-neutral-400">Slides</span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {slides.map((s, idx) => (
                    <button
                      key={s.storageKey || idx}
                      type="button"
                      onClick={() => setActiveSlideIndex(idx)}
                      className={`relative w-11 aspect-[9/16] rounded-md overflow-hidden border shrink-0 transition-all ${
                        idx === activeSlideIndex
                          ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-105"
                          : "border-neutral-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.url}
                        alt={`Slide ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Frozen Caption Snapshot */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-400">Caption Snapshot</span>
                {render.captionSnapshot && (
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCaption ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="p-3 rounded-lg border border-neutral-800/80 bg-neutral-900/50 text-xs text-neutral-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap select-text">
                {render.captionSnapshot || (
                  <span className="text-neutral-500 italic">No caption saved with this render.</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-3 border-t border-neutral-800/80">
            {onShare && (
              <Button
                type="button"
                onClick={() => onShare(render)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 gap-2 shadow-md shadow-emerald-950"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share to TikTok / Mobile</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadCurrentSlide}
              className="w-full border-neutral-800 hover:bg-neutral-900 text-neutral-200 text-xs h-8 gap-2"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Download Current Slide ({activeSlideIndex + 1})</span>
            </Button>

            {render.zipUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadZip}
                className="w-full border-neutral-800 hover:bg-neutral-900 text-neutral-200 text-xs h-8 gap-2"
              >
                <FileArchive className="w-3.5 h-3.5 text-purple-400" />
                <span>Download All (ZIP)</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
