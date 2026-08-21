"use client";

import React, { useState, useMemo } from "react";
import {
  FileJson,
  CheckCircle2,
  AlertCircle,
  Copy,
  Wand2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { validateHanaSocialJson } from "../import/hana-social-schema";
import { normalizeHanaSocialCarousel } from "../import/hana-social-normalizer";
import type { ContentPlan } from "@/types/content";

interface ImportContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (contentPlan: ContentPlan) => void;
}

const SAMPLE_JSON = `{
  "caption": "5 Strategi Bisnis yang Wajib Diterapkan di 2026 🚀",
  "slides": [
    {
      "title": "5 Rahasia Scale Up Bisnis",
      "subtitle": "Banyak founder gagal di tahun ke-2 karena skip langkah nomor 3.",
      "category": "Hook"
    },
    {
      "title": "1. Fokus Pada Retensi Pelanggan",
      "subtitle": "Mendapatkan pelanggan baru 5x lebih mahal dibanding mempertahankan yang lama.",
      "category": "Tips"
    },
    {
      "title": "2. Konsistensi Konten Edukasi",
      "subtitle": "Bangun kepercayaan audiens sebelum menjual produk.",
      "category": "Tips"
    },
    {
      "title": "Simpan & Bagikan Post Ini",
      "subtitle": "Komen 'MAU' untuk dapatkan panduan PDF gratis!",
      "category": "CTA"
    }
  ]
}`;

export const ImportContentDialog: React.FC<ImportContentDialogProps> = ({
  open,
  onOpenChange,
  onApply,
}) => {
  const [jsonText, setJsonText] = useState<string>("");
  const [copiedSample, setCopiedSample] = useState<boolean>(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setJsonText("");
      setCopiedSample(false);
    }
    onOpenChange(nextOpen);
  };

  // Live validation
  const validation = useMemo(() => {
    if (!jsonText.trim()) return null;
    return validateHanaSocialJson(jsonText);
  }, [jsonText]);

  const handleCopySample = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_JSON);
      setCopiedSample(true);
      setTimeout(() => setCopiedSample(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleFormatJson = () => {
    if (!jsonText.trim()) return;
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
    } catch {
      // ignore
    }
  };

  const handleApply = () => {
    if (!validation?.valid) return;
    try {
      const contentPlan = normalizeHanaSocialCarousel(jsonText);
      onApply(contentPlan);
      setJsonText("");
      setCopiedSample(false);
      onOpenChange(false);
    } catch (err) {
      console.error("[ImportContentDialog] Apply failed:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[580px] bg-neutral-950 border border-neutral-800 text-neutral-100 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Import Carousel Content
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Paste carousel JSON from hana-social or Claude to generate slides.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {/* Header controls: Copy Sample & Format */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">JSON Payload</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySample}
                className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
                title="Copy sample JSON to clipboard"
              >
                {copiedSample ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Sample JSON</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleFormatJson}
                disabled={!jsonText.trim()}
                className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Prettify JSON formatting"
              >
                <Wand2 className="w-3 h-3" />
                <span>Format</span>
              </button>
            </div>
          </div>

          {/* Textarea */}
          <Textarea
            rows={10}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            onBlur={handleFormatJson}
            placeholder={`Paste hana-social JSON here...\n\n{\n  "caption": "My caption...",\n  "slides": [\n    {\n      "title": "Headline",\n      "subtitle": "Body text",\n      "category": "Hook"\n    }\n  ]\n}`}
            className="w-full bg-neutral-900 border-neutral-800 rounded-lg p-3 text-xs font-mono text-neutral-200 resize-none focus:outline-none focus:border-amber-500/50 leading-relaxed placeholder:text-neutral-600"
          />

          {/* Live Validation Banner */}
          {validation && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                validation.valid
                  ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                  : "bg-red-950/40 border-red-800/60 text-red-300"
              }`}
            >
              {validation.valid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-emerald-200">
                      Valid carousel JSON
                    </span>
                    <span className="text-[11px] text-emerald-400/90">
                      {validation.slideCount} {validation.slideCount === 1 ? "slide" : "slides"} detected
                      {validation.caption ? " • Caption included" : " • No caption"}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-red-200">
                      Invalid JSON payload
                    </span>
                    <span className="text-[11px] text-red-300/90">
                      {validation.error}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-neutral-800 text-neutral-300 hover:bg-neutral-800 text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!validation?.valid}
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-md shadow-amber-950 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Apply Content</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
