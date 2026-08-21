"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Asset {
  id: string;
  userId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  storageKey: string;
  url: string;
  category: string | null;
  status: "PROCESSING" | "READY" | "FAILED";
  createdAt: string;
  updatedAt: string;
}

async function fetchAssets(): Promise<Asset[]> {
  const res = await fetch("/api/assets");
  if (!res.ok) {
    throw new Error("Failed to fetch assets");
  }
  return res.json();
}

export async function uploadAssetApi(file: File, category?: string): Promise<Asset> {
  const formData = new FormData();
  formData.append("file", file);
  if (category) {
    formData.append("category", category);
  }

  const res = await fetch("/api/assets", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upload asset");
  }

  return res.json();
}

export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: fetchAssets,
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, category }: { file: File; category?: string }) =>
      uploadAssetApi(file, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

async function updateAssetCategoryApi(id: string, category: string | null): Promise<Asset> {
  const res = await fetch(`/api/assets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update asset category");
  }

  return res.json();
}

export function useUpdateAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: string | null }) =>
      updateAssetCategoryApi(id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

async function deleteAssetApi(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/assets/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete asset");
  }

  return res.json();
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAssetApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export async function generateAssetApi(params: {
  prompt: string;
  category?: string;
  projectId?: string;
  referenceAssetIds?: string[];
}): Promise<{ asset: Asset }> {
  const res = await fetch("/api/assets/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate image asset");
  }

  return res.json();
}

export function useGenerateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      prompt: string;
      category?: string;
      projectId?: string;
      referenceAssetIds?: string[];
    }) => generateAssetApi(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}
