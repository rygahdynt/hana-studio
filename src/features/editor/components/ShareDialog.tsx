"use client";

import React, { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  Download,
  Link as LinkIcon,
  FileText,
  Smartphone,
  Sparkles,
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

import { useSocialAccounts } from "@/features/social-accounts";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: EditorProject;
  onOpenExport: () => void;
  onOpenRender?: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onOpenChange,
  project,
  onOpenExport,
  onOpenRender,
}) => {
  const { data: socialAccounts } = useSocialAccounts();
  const targetAccount =
    project.socialAccount ||
    (project.socialAccountId
      ? socialAccounts?.find((a) => a.id === project.socialAccountId)
      : null);

  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const captionText = project.caption?.trim() || "";
  const hasCaption = Boolean(captionText);

  // Generate project URL safely on client
  const projectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/projects/${project.id}`
      : `/projects/${project.id}`;

  const handleCopyCaption = async () => {
    if (!hasCaption) return;
    try {
      await navigator.clipboard.writeText(project.caption || "");
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch (err) {
      console.error("[Share Dialog] Failed to copy caption:", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(projectUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("[Share Dialog] Failed to copy project link:", err);
    }
  };

  const handleTriggerExport = () => {
    onOpenChange(false);
    onOpenExport();
  };

  const handleTriggerRender = () => {
    onOpenChange(false);
    if (onOpenRender) {
      onOpenRender();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-neutral-950 border border-neutral-800 text-neutral-100 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Share & Export
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400 flex flex-wrap items-center gap-1.5 pt-0.5">
                <span>{project.title || "Untitled Carousel"}</span>
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
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* 1. Copy Caption */}
          <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                Post Caption
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                {hasCaption ? `${captionText.length} chars` : "Empty"}
              </span>
            </div>

            {hasCaption ? (
              <p className="text-[11px] text-neutral-400 line-clamp-2 bg-neutral-950/60 p-2 rounded-md border border-neutral-800/60 font-sans italic">
                &ldquo;{captionText}&rdquo;
              </p>
            ) : (
              <p className="text-[11px] text-neutral-500 italic">
                No caption written for this project yet.
              </p>
            )}

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                size="sm"
                variant={hasCaption ? "default" : "outline"}
                disabled={!hasCaption}
                onClick={handleCopyCaption}
                className={`text-xs font-medium h-8 gap-1.5 ${
                  copiedCaption
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : hasCaption
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "border-neutral-800 text-neutral-500 cursor-not-allowed"
                }`}
              >
                {copiedCaption ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Caption Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{hasCaption ? "Copy Caption" : "No Caption Yet"}</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 2. Render & Mobile Share */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-800/50 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Render Output & Mobile Share
              </span>
              <span className="text-[11px] text-neutral-400">
                Produce final {project.slides.length}-slide carousel and share directly to TikTok.
              </span>
            </div>
            {onOpenRender && (
              <Button
                type="button"
                size="sm"
                onClick={handleTriggerRender}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-8 shrink-0 gap-1.5 shadow-md shadow-blue-950"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Render</span>
              </Button>
            )}
          </div>

          {/* 3. Export Carousel Files */}
          <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Export Files
              </span>
              <span className="text-[11px] text-neutral-400">
                Download single slides as PNG, JPG, or all as ZIP.
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleTriggerExport}
              className="border-neutral-800 text-neutral-200 hover:bg-neutral-800 text-xs font-medium h-8 shrink-0 gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export</span>
            </Button>
          </div>

          {/* 3. Copy Project Link */}
          <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 flex flex-col gap-2">
            <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
              Project URL
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={projectUrl}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-[11px] text-neutral-400 font-mono select-all focus:outline-none"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className={`text-xs font-medium h-8 shrink-0 gap-1.5 border-neutral-800 ${
                  copiedLink ? "text-emerald-400 border-emerald-800/80" : "text-neutral-200 hover:bg-neutral-800"
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 4. Future Social Publishing Placeholder */}
          <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/50 flex items-center justify-between opacity-70">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700/50 flex items-center justify-center text-neutral-400">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-neutral-300">
                  Share to TikTok
                </span>
                <span className="text-[10px] text-neutral-500">
                  Direct social publishing & scheduling
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="text-[9px] font-medium bg-neutral-800 text-neutral-400">
              Coming Soon
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
