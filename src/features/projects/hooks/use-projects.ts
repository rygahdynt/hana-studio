"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ProjectListItem {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  caption?: string | null;
  socialAccountId?: string | null;
  socialAccount?: {
    id: string;
    platform: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  thumbnailUrl: string | null;
  slideWidth: number;
  slideHeight: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    slides: number;
  };
}

export interface ProjectDetail extends ProjectListItem {
  slides: Array<{
    id: string;
    position: number;
    backgroundColor: string;
    backgroundImageUrl: string | null;
    elements: Array<{
      id: string;
      type: "IMAGE" | "TEXT" | "SHAPE";
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      opacity: number;
      locked: boolean;
      visible: boolean;
      zIndex: number;
      assetId: string | null;
      properties: unknown;
      asset?: {
        url: string;
      } | null;
    }>;
  }>;
}

export interface CreateProjectInput {
  title?: string;
  description?: string;
  caption?: string | null;
  socialAccountId?: string | null;
  slideWidth?: number;
  slideHeight?: number;
}

async function fetchProjects(): Promise<ProjectListItem[]> {
  const res = await fetch("/api/projects");
  if (!res.ok) {
    throw new Error("Failed to fetch projects");
  }
  return res.json();
}

async function fetchProject(id: string): Promise<ProjectDetail> {
  const res = await fetch(`/api/projects/${id}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Project not found");
    }
    throw new Error("Failed to fetch project");
  }
  return res.json();
}

async function createProjectApi(data: CreateProjectInput): Promise<ProjectDetail> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Failed to create project");
  }
  return res.json();
}

async function deleteProjectApi(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete project");
  }
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

async function updateProjectApi({
  id,
  data,
}: {
  id: string;
  data: unknown;
}): Promise<ProjectDetail> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update project");
  }
  return res.json();
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProjectApi,
    onSuccess: (data) => {
      queryClient.setQueryData(["project", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
