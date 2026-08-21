"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Users } from "lucide-react";
import { useCreateProject } from "../hooks/use-projects";
import { useSocialAccounts } from "@/features/social-accounts";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const router = useRouter();
  const createProjectMutation = useCreateProject();
  const { data: socialAccounts } = useSocialAccounts();

  const [title, setTitle] = useState("Untitled Carousel");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [socialAccountId, setSocialAccountId] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const project = await createProjectMutation.mutateAsync({
        title: title.trim(),
        caption: caption.trim() || undefined,
        description: description.trim() || undefined,
        socialAccountId: socialAccountId || undefined,
        slideWidth: 1080,
        slideHeight: 1920,
      });

      onOpenChange(false);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a standard 9:16 vertical TikTok carousel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-title">Project Title</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 5 Growth Hacks for Creators"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-desc">Description (optional)</Label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief notes, creative direction, or guidelines..."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-caption">Post Caption (optional)</Label>
            <Textarea
              id="project-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. 3 tips penting untuk bisnis kamu 👇&#10;&#10;#marketing #umkm"
              rows={3}
            />
          </div>

          {/* Target Social Account */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="project-account" className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Target Social Account (optional)
              </Label>
            </div>
            <select
              id="project-account"
              value={socialAccountId}
              onChange={(e) => setSocialAccountId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-200 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
            >
              <option value="">No account selected</option>
              {(socialAccounts || []).map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.platform.toUpperCase()} · @{acc.username} ({acc.displayName})
                </option>
              ))}
            </select>
          </div>

          {/* Standard Canvas Format Badge */}
          <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400 shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-200">
                  TikTok Carousel
                </p>
                <p className="text-[11px] text-neutral-400 font-mono">
                  1080 × 1920 px • 9:16
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[9px]">
              Standard
            </Badge>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProjectMutation.isPending || !title.trim()}
            >
              {createProjectMutation.isPending ? "Creating..." : "Create & Open"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
