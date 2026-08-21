"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Layers,
  ArrowRight,
  Sparkles,
  Trash2,
  Image as ImageIcon,
  Film,
  User as UserIcon,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserButton } from "@clerk/nextjs";
import { useProjects, useDeleteProject, type ProjectListItem } from "../hooks/use-projects";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { AssetLibraryDialog } from "@/features/assets";
import { GenerateContentDialog } from "@/features/content";

export function ProjectsDashboard() {
  const router = useRouter();
  const { data: projects, isLoading, error } = useProjects();
  const deleteProjectMutation = useDeleteProject();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [assetLibraryOpen, setAssetLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = (projects || []).filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteProjectMutation.mutateAsync(id);
      } catch (err) {
        console.error("Failed to delete project:", err);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans">
      {/* Top Application Shell Header */}
      <header className="sticky top-0 z-30 h-14 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo / Branding */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-500/30">
              H
            </div>
            <span className="font-semibold text-base tracking-tight text-white">
              Hana Studio
            </span>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-800 text-white"
            >
              Projects
            </button>
            <Link
              href="/dashboard/accounts"
              className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
              title="Open Social Account Library"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Accounts
            </Link>
            <button
              type="button"
              onClick={() => setAssetLibraryOpen(true)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Open Asset Library"
            >
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                Assets
              </span>
            </button>
            <Link
              href="/dashboard/renders"
              className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
              title="Rendered Carousel Outputs"
            >
              <Film className="w-3.5 h-3.5 text-emerald-400" />
              Renders
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
      <main className="flex-1 container mx-auto px-6 py-8 max-w-6xl flex flex-col gap-8">
        {/* Header & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Projects
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Create and manage multi-slide social carousels.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-48 sm:w-64 h-9 text-xs bg-neutral-900 border-neutral-800"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setGenerateDialogOpen(true)}
              className="gap-1.5 text-xs border-indigo-800/80 bg-indigo-950/40 text-indigo-200 hover:bg-indigo-900/60 hover:text-white"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Generate with AI
            </Button>

            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-1.5 text-xs shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* Project Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 flex flex-col gap-4 border-neutral-800 bg-neutral-900/40">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full mt-2" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 rounded-xl border border-red-900/40 bg-red-950/20 text-center">
            <p className="text-sm text-red-400">Failed to load projects from database.</p>
            <p className="text-xs text-neutral-500 mt-1">Ensure PostgreSQL is running and migrations are applied.</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
            <div className="w-12 h-12 rounded-full bg-blue-950/60 border border-blue-800/40 flex items-center justify-center mb-4 text-blue-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              {searchQuery ? "No matching projects found" : "No projects yet"}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mb-5">
              {searchQuery
                ? "Try adjusting your search query."
                : "Create your first multi-slide carousel or generate a structured draft with AI."}
            </p>
            {!searchQuery && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setGenerateDialogOpen(true)}
                  className="text-xs gap-1.5 border-indigo-800/80 bg-indigo-950/40 text-indigo-200 hover:bg-indigo-900/60 hover:text-white"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Generate with AI
                </Button>
                <Button onClick={() => setCreateDialogOpen(true)} className="text-xs gap-1.5">
                  <Plus className="w-4 h-4" />
                  Create Blank Project
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => router.push(`/projects/${project.id}`)}
                onDelete={(e) => handleDelete(e, project.id, project.title)}
              />
            ))}
          </div>
        )}
      </main>

      {/* AI Carousel Generation Modal */}
      <GenerateContentDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
      />

      {/* Create Project Modal */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Asset Library Modal */}
      <AssetLibraryDialog
        open={assetLibraryOpen}
        onOpenChange={setAssetLibraryOpen}
      />
    </div>
  );
}

function ProjectCard({
  project,
  onClick,
  onDelete,
}: {
  project: ProjectListItem;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const slideCount = project._count?.slides ?? 0;
  const formattedDate = new Date(project.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card
      onClick={onClick}
      className="group relative cursor-pointer hover:border-neutral-700 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold truncate group-hover:text-blue-400 transition-colors">
              {project.title}
            </CardTitle>
            {project.description ? (
              <CardDescription className="line-clamp-2 mt-1 text-[11px]">
                {project.description}
              </CardDescription>
            ) : (
              <CardDescription className="mt-1 text-[11px] text-neutral-500 italic">
                No description
              </CardDescription>
            )}
          </div>
          <Badge
            variant={project.status === "PUBLISHED" ? "success" : "secondary"}
            className="shrink-0 text-[9px]"
          >
            {project.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3 text-[11px] text-neutral-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>{slideCount} {slideCount === 1 ? "slide" : "slides"}</span>
        </div>
        <span className="font-mono text-neutral-500">
          {project.slideWidth} × {project.slideHeight}
        </span>
      </CardContent>

      <CardFooter className="py-2.5 px-5 flex items-center justify-between text-xs text-neutral-400 bg-neutral-900/40">
        <span className="text-[10px] text-neutral-500">Updated {formattedDate}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors"
            title="Delete project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <span className="flex items-center gap-1 text-xs font-medium text-neutral-300 group-hover:text-blue-400 transition-colors">
            Open
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
