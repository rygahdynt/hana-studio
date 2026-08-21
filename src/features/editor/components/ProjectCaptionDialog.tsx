"use client";

import React from "react";
import { FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ProjectCaptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caption: string;
  onChangeCaption: (caption: string) => void;
  projectTitle: string;
}

export const ProjectCaptionDialog: React.FC<ProjectCaptionDialogProps> = ({
  open,
  onOpenChange,
  caption,
  onChangeCaption,
  projectTitle,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-neutral-950 border border-neutral-800 text-neutral-100 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Project Post Caption
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                {projectTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="caption-textarea"
              className="text-xs font-semibold text-neutral-300"
            >
              Caption Text
            </label>
            <span className="text-[11px] text-neutral-500 font-mono">
              {caption ? `${caption.length} characters` : "Optional"}
            </span>
          </div>

          <textarea
            id="caption-textarea"
            rows={8}
            value={caption}
            onChange={(e) => onChangeCaption(e.target.value)}
            placeholder="Write your post caption, emojis, hashtags, or call to action here...&#10;&#10;e.g. 3 kesalahan marketing yang sering dilakukan UMKM 👇&#10;&#10;#marketing #umkm #bisnis"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 resize-none focus:outline-none focus:border-blue-500/60 leading-relaxed font-sans placeholder:text-neutral-600"
            autoFocus
          />

          <p className="text-[11px] text-neutral-500 leading-tight">
            This caption is saved with your project and can be copied or shared when publishing your carousel.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
