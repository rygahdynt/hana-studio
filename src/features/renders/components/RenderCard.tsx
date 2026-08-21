"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Film,
  Layers,
  Copy,
  Check,
  Share2,
  Download,
  Trash2,
  Eye,
  FileArchive,
} from "lucide-react";
import type { RenderDto } from "../hooks/use-renders";

interface RenderCardProps {
  render: RenderDto;
  onPreview: (render: RenderDto) => void;
  onShare: (render: RenderDto) => void;
  onDelete: (render: RenderDto) => void;
}

export const RenderCard: React.FC<RenderCardProps> = ({
  render,
  onPreview,
  onShare,
  onDelete,
}) => {
  const [copiedCaption, setCopiedCaption] = useState(false);

  const handleCopyCaption = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!render.captionSnapshot) return;
    try {
      await navigator.clipboard.writeText(render.captionSnapshot);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch (err) {
      console.error("Failed to copy caption:", err);
    }
  };

  const handleDownloadZip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!render.zipUrl) {
      // Fallback: download first slide
      const firstSlide = render.slides?.[0]?.url;
      if (firstSlide) {
        const a = document.createElement("a");
        a.href = firstSlide;
        a.download = `slide-1.png`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return;
    }
    const a = document.createElement("a");
    a.href = render.zipUrl;
    a.download = `${render.projectName.toLowerCase().replace(/\s+/g, "-")}-carousel.zip`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formattedDate = new Date(render.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const previewImage = render.thumbnailUrl || render.slides?.[0]?.url;

  return (
    <Card className="border-neutral-800/80 bg-neutral-900/40 hover:border-neutral-700/80 transition-all duration-200 overflow-hidden flex flex-col group text-neutral-100 shadow-md">
      {/* Top Media / Thumbnail Preview */}
      <div
        onClick={() => onPreview(render)}
        className="relative w-full aspect-[16/10] bg-neutral-950/80 overflow-hidden cursor-pointer flex items-center justify-center border-b border-neutral-800/60"
      >
        {previewImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt={render.projectName}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/20 opacity-80" />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-neutral-600 gap-2">
            <Film className="w-8 h-8 opacity-40" />
            <span className="text-[11px]">No preview available</span>
          </div>
        )}

        {/* Hover Quick Preview Trigger Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
          <Badge className="bg-neutral-900/90 text-white border-neutral-700 text-xs px-3 py-1 gap-1.5 shadow-lg">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Click to Preview</span>
          </Badge>
        </div>

        {/* Slide Count Badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="border-neutral-700/80 bg-neutral-950/80 text-white text-[10px] px-2 py-0.5 backdrop-blur-md gap-1"
          >
            <Layers className="w-3 h-3 text-blue-400" />
            <span>{render.slideCount} {render.slideCount === 1 ? "Slide" : "Slides"}</span>
          </Badge>
        </div>

        {/* Ready Status Badge */}
        <div className="absolute top-2.5 left-2.5">
          <Badge
            variant="outline"
            className="border-emerald-800/60 bg-emerald-950/80 text-emerald-400 text-[10px] px-2 py-0.5 backdrop-blur-md"
          >
            Ready
          </Badge>
        </div>
      </div>

      {/* Card Info Content */}
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            onClick={() => onPreview(render)}
            className="text-sm font-semibold text-white truncate hover:text-emerald-400 cursor-pointer transition-colors"
            title={render.projectName}
          >
            {render.projectName}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
          <span>{formattedDate}</span>
          <span>•</span>
          <span className="text-neutral-500 font-mono text-[10px]">1080×1920 PNG</span>
        </div>
      </CardHeader>

      {/* Caption Snippet */}
      <CardContent className="px-4 py-2 flex-1">
        {render.captionSnapshot ? (
          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed italic">
            &ldquo;{render.captionSnapshot}&rdquo;
          </p>
        ) : (
          <p className="text-xs text-neutral-500 italic">No caption snapshot attached.</p>
        )}
      </CardContent>

      {/* Card Action Buttons Footer */}
      <CardFooter className="p-4 pt-2 border-t border-neutral-800/60 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onShare(render)}
            className="h-8 px-2.5 text-xs border-neutral-800 hover:bg-neutral-800 text-emerald-400 hover:text-emerald-300 gap-1.5"
            title="Share to TikTok or Mobile Device"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          {render.captionSnapshot && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyCaption}
              className="h-8 px-2.5 text-xs border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white gap-1.5"
              title="Copy Render Caption Snapshot"
            >
              {copiedCaption ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Caption</span>
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadZip}
            className="h-8 px-2.5 text-xs border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white gap-1.5"
            title={render.zipUrl ? "Download ZIP Archive" : "Download PNG"}
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(render);
          }}
          className="h-8 w-8 p-0 text-neutral-500 hover:text-red-400 hover:bg-red-950/30"
          title="Delete Render"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
};
