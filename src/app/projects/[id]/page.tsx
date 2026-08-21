"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject, useUpdateProject } from "@/features/projects";
import { HanaEditor, type EditorProject } from "@/features/editor";
import {
  dbProjectToEditorProject,
  editorProjectToDbProject,
} from "@/features/editor/engine/serializer";

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const { data: project, isLoading, error } = useProject(id);
  const updateProjectMutation = useUpdateProject();

  const editorProject = useMemo(() => {
    if (!project) return null;
    return dbProjectToEditorProject({
      id: project.id,
      title: project.title,
      description: project.description,
      caption: project.caption,
      socialAccountId: project.socialAccountId,
      socialAccount: project.socialAccount,
      slideWidth: project.slideWidth,
      slideHeight: project.slideHeight,
      slides: project.slides.map((s) => ({
        id: s.id,
        position: s.position,
        backgroundColor: s.backgroundColor,
        backgroundImageUrl: s.backgroundImageUrl,
        elements: s.elements.map((el) => ({
          id: el.id,
          type: el.type,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation,
          opacity: el.opacity,
          locked: el.locked,
          visible: el.visible,
          zIndex: el.zIndex,
          assetId: el.assetId,
          properties: el.properties,
          asset: el.asset,
        })),
      })),
    });
  }, [project]);

  const handleSave = async (updatedProject: EditorProject): Promise<EditorProject> => {
    const dbPayload = editorProjectToDbProject(updatedProject);
    const updated = await updateProjectMutation.mutateAsync({
      id,
      data: dbPayload,
    });
    return dbProjectToEditorProject({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      caption: updated.caption,
      socialAccountId: updated.socialAccountId,
      socialAccount: updated.socialAccount,
      slideWidth: updated.slideWidth,
      slideHeight: updated.slideHeight,
      slides: updated.slides.map((s) => ({
        id: s.id,
        position: s.position,
        backgroundColor: s.backgroundColor,
        backgroundImageUrl: s.backgroundImageUrl,
        elements: s.elements.map((el) => ({
          id: el.id,
          type: el.type,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation,
          opacity: el.opacity,
          locked: el.locked,
          visible: el.visible,
          zIndex: el.zIndex,
          assetId: el.assetId,
          properties: el.properties,
          asset: el.asset,
        })),
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col bg-neutral-950 text-neutral-100">
        {/* Top bar skeleton */}
        <header className="h-14 border-b border-neutral-800 bg-neutral-950 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-24" />
          </div>
        </header>

        {/* Workspace skeleton */}
        <div className="flex flex-1 min-h-0">
          <div className="w-60 border-r border-neutral-800 p-3 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1 bg-neutral-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-neutral-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs">Loading carousel canvas...</span>
            </div>
          </div>
          <div className="w-72 border-l border-neutral-800 p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>

        {/* Bottom strip skeleton */}
        <footer className="h-28 border-t border-neutral-800 bg-neutral-950 p-4 flex gap-3">
          <Skeleton className="h-20 w-20" />
          <Skeleton className="h-20 w-20" />
          <Skeleton className="h-20 w-20" />
        </footer>
      </div>
    );
  }

  if (error || !editorProject) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-950 text-neutral-100 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Project Not Found</h1>
        <p className="text-xs text-neutral-400 max-w-sm mb-6">
          The requested project does not exist or you do not have permission to access it.
        </p>
        <Button onClick={() => router.push("/")} className="gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" />
          Return to Projects
        </Button>
      </div>
    );
  }

  return (
    <HanaEditor
      initialProject={editorProject}
      onSave={handleSave}
      onBack={() => router.push("/")}
    />
  );
}
