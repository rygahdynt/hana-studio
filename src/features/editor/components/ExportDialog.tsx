"use client";

import React, { useState } from "react";
import {
  Download,
  Loader2,
  FileImage,
  Archive,
  Layers,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { EditorProject } from "../types";
import type { ExportFormat, ExportProgress } from "../export/types";
import {
  exportSingleSlide,
  exportAllSlidesAsZip,
  exportAllSlidesIndividually,
} from "../export/export-service";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: EditorProject;
  activeSlideId: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  project,
  activeSlideId,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sortedSlides = [...project.slides].sort((a, b) => a.position - b.position);
  const currentSlideIndex = sortedSlides.findIndex((s) => s.id === activeSlideId);
  const currentSlideNumber = currentSlideIndex !== -1 ? currentSlideIndex + 1 : 1;

  const handleExportSingle = async (format: ExportFormat) => {
    try {
      setIsExporting(true);
      setError(null);
      setSuccessMessage(null);
      setProgress({
        current: currentSlideNumber,
        total: project.slides.length,
        message: `Rendering Slide ${currentSlideNumber} (${format.toUpperCase()})...`,
      });

      await exportSingleSlide(project, activeSlideId, format);
      setSuccessMessage(`Slide ${currentSlideNumber} exported successfully!`);
      setTimeout(() => {
        onOpenChange(false);
        setSuccessMessage(null);
      }, 1500);
    } catch (err) {
      console.error("[Export Dialog] Export error:", err);
      setError(err instanceof Error ? err.message : "Failed to export slide.");
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleExportZip = async (format: ExportFormat) => {
    try {
      setIsExporting(true);
      setError(null);
      setSuccessMessage(null);

      await exportAllSlidesAsZip(project, format, (p) => {
        setProgress(p);
      });

      setSuccessMessage(`All ${project.slides.length} slides exported to ZIP!`);
      setTimeout(() => {
        onOpenChange(false);
        setSuccessMessage(null);
      }, 1500);
    } catch (err) {
      console.error("[Export Dialog] ZIP export error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate ZIP archive.");
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleExportAllIndividual = async (format: ExportFormat) => {
    try {
      setIsExporting(true);
      setError(null);
      setSuccessMessage(null);

      await exportAllSlidesIndividually(project, format, (p) => {
        setProgress(p);
      });

      setSuccessMessage(`All ${project.slides.length} slides downloaded!`);
      setTimeout(() => {
        onOpenChange(false);
        setSuccessMessage(null);
      }, 1500);
    } catch (err) {
      console.error("[Export Dialog] Multi-slide export error:", err);
      setError(err instanceof Error ? err.message : "Failed to export slides.");
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isExporting) {
          onOpenChange(isOpen);
          if (!isOpen) {
            setError(null);
            setSuccessMessage(null);
          }
        }
      }}
    >
      <DialogContent className="max-w-md bg-neutral-950 border border-neutral-800 text-neutral-100 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Export Carousel
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Full-resolution {project.slideWidth} × {project.slideHeight} px (9:16) export.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Progress Display */}
        {isExporting && progress && (
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-center gap-2 text-center my-1">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs font-semibold text-white">{progress.message}</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {progress.current} / {progress.total}
            </span>
          </div>
        )}

        {!isExporting && (
          <div className="flex flex-col gap-4 py-2">
            {/* Section 1: Active Slide */}
            <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <FileImage className="w-3.5 h-3.5 text-blue-400" />
                  Current Slide (Slide {currentSlideNumber})
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">1 slide</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportSingle("png")}
                  disabled={isExporting}
                  className="border-neutral-800 text-neutral-200 hover:bg-neutral-800 text-xs font-medium h-9"
                >
                  PNG (Lossless)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportSingle("jpg")}
                  disabled={isExporting}
                  className="border-neutral-800 text-neutral-200 hover:bg-neutral-800 text-xs font-medium h-9"
                >
                  JPG (Compact)
                </Button>
              </div>
            </div>

            {/* Section 2: All Slides (ZIP Archive) */}
            <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-emerald-400" />
                  All Slides as ZIP Archive
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Recommended</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Downloads all {project.slides.length} slides packaged into a single ZIP file.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleExportZip("png")}
                  disabled={isExporting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-9 shadow-md shadow-emerald-950"
                >
                  Download ZIP (PNG)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportZip("jpg")}
                  disabled={isExporting}
                  className="border-neutral-800 text-neutral-200 hover:bg-neutral-800 text-xs font-medium h-9"
                >
                  Download ZIP (JPG)
                </Button>
              </div>
            </div>

            {/* Section 3: All Slides (Individual Downloads) */}
            <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-neutral-400" />
                  All Slides (Individual Files)
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {project.slides.length} files
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportAllIndividual("png")}
                  disabled={isExporting}
                  className="text-neutral-400 hover:text-white hover:bg-neutral-800 text-[11px] h-7 px-2"
                >
                  Download Files (PNG)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportAllIndividual("jpg")}
                  disabled={isExporting}
                  className="text-neutral-400 hover:text-white hover:bg-neutral-800 text-[11px] h-7 px-2"
                >
                  Download Files (JPG)
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
