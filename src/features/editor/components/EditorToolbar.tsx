"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  Download,
  FileText,
  FileJson,
  Share2,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EditorToolbarProps {
  projectTitle?: string;
  slideWidth?: number;
  slideHeight?: number;
  onAddText: () => void;
  onAddRectangle: () => void;
  onAddCircle: () => void;
  onAddImage: (src: string) => void;
  onOpenAssetLibrary?: () => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onBack?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  saveStatus?: "saved" | "unsaved" | "saving" | "error";
  onSave?: () => void;
  onOpenImportContent?: () => void;
  onOpenRender?: () => void;
  onOpenExport?: () => void;
  onOpenCaption?: () => void;
  onOpenShare?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  projectTitle = "Untitled Carousel",
  slideWidth = 1080,
  slideHeight = 1920,
  onAddText,
  onAddRectangle,
  onAddCircle,
  onAddImage,
  onOpenAssetLibrary,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onBack,
  isDirty = false,
  isSaving = false,
  saveStatus = "saved",
  onSave,
  onOpenImportContent,
  onOpenRender,
  onOpenExport,
  onOpenCaption,
  onOpenShare,
}) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onAddImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <header className="h-14 border-b border-neutral-800 bg-neutral-950 px-4 flex items-center justify-between text-neutral-200 shrink-0 gap-4">
      {/* Left: Navigation & Project Info */}
      <div className="flex items-center gap-3 min-w-0">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            title="Back to Projects"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Projects</span>
          </button>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            title="Back to Projects"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Projects</span>
          </Link>
        )}

        <div className="h-4 w-px bg-neutral-800" />

        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-white truncate max-w-[160px] sm:max-w-[220px]">
            {projectTitle}
          </span>
          <Badge variant="secondary" className="hidden sm:inline-flex text-[9px] font-mono">
            {slideWidth} × {slideHeight}
          </Badge>
        </div>
      </div>

      {/* Center: Creation Tools */}
      <div className="flex items-center gap-1 bg-neutral-900/80 p-1 rounded-lg border border-neutral-800/80">
        <button
          type="button"
          onClick={onAddText}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
          title="Add Text"
        >
          <Type className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Text</span>
        </button>

        <button
          type="button"
          onClick={onAddRectangle}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
          title="Add Rectangle"
        >
          <Square className="w-3.5 h-3.5 text-green-400" />
          <span className="hidden sm:inline">Rectangle</span>
        </button>

        <button
          type="button"
          onClick={onAddCircle}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
          title="Add Circle"
        >
          <Circle className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Circle</span>
        </button>

        {onOpenAssetLibrary ? (
          <button
            type="button"
            onClick={onOpenAssetLibrary}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white cursor-pointer transition-colors"
            title="Insert Image / Open Asset Library"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Image</span>
          </button>
        ) : (
          <label className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white cursor-pointer transition-colors">
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
        )}
      </div>

      {/* Right: Zoom & Save Action */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Viewport Zoom Controls */}
        <div className="hidden md:flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-md p-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono w-10 text-center text-neutral-300">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="h-4 w-px bg-neutral-800 mx-0.5" />
          <button
            type="button"
            onClick={onZoomFit}
            className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Save Status & Action */}
        <div className="flex items-center gap-2">
          {saveStatus === "saving" ? (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden lg:inline">Saving...</span>
            </span>
          ) : saveStatus === "error" ? (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Save failed</span>
            </span>
          ) : isDirty || saveStatus === "unsaved" ? (
            <span className="flex items-center gap-1 text-[11px] text-amber-400/90 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="hidden lg:inline">Unsaved</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-neutral-500 font-medium">
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="hidden lg:inline">Saved</span>
            </span>
          )}

          {onOpenImportContent && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenImportContent}
              className="gap-1.5 text-xs font-medium border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white"
              title="Import Carousel from hana-social JSON"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Import JSON</span>
            </Button>
          )}

          {onOpenCaption && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenCaption}
              className="gap-1.5 text-xs font-medium border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white"
              title="View and Edit Post Caption"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Caption</span>
            </Button>
          )}

          {onOpenRender && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenRender}
              className="gap-1.5 text-xs font-medium border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white shadow-sm"
              title="Render Carousel Output & Mobile Share"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Render</span>
            </Button>
          )}

          {onOpenExport && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenExport}
              className="gap-1.5 text-xs font-medium border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white"
              title="Export Carousel (PNG / JPG / ZIP)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export</span>
            </Button>
          )}

          {onOpenShare && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenShare}
              className="gap-1.5 text-xs font-medium border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white"
              title="Share, Copy Caption & Project Link"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Share</span>
            </Button>
          )}

          {onSave && (
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving || !isDirty}
              className={`gap-1.5 text-xs font-semibold ${
                isDirty
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                  : "bg-neutral-800 text-neutral-400 border border-neutral-700/60"
              }`}
              title="Save project (Ctrl+S)"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
