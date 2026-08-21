import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RenderDto, ListRendersResult, ListRendersOptions } from "@/server/renders";

export type { RenderDto, ListRendersResult, ListRendersOptions };

async function fetchRenders(options: ListRendersOptions = {}): Promise<ListRendersResult> {
  const params = new URLSearchParams();
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  if (options.search) params.set("search", options.search);
  if (options.projectId) params.set("projectId", options.projectId);

  const qs = params.toString();
  const url = qs ? `/api/renders?${qs}` : "/api/renders";

  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch renders");
  }
  return res.json();
}

async function fetchRender(id: string): Promise<RenderDto> {
  const res = await fetch(`/api/renders/${id}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch render");
  }
  return res.json();
}

export interface PersistRenderParams {
  projectId: string;
  captionSnapshot?: string | null;
  format?: string;
  processingMs?: number;
  files: File[];
  zipBlob?: Blob | null;
  zipFileName?: string;
}

export async function persistRenderApi(params: PersistRenderParams): Promise<RenderDto> {
  const formData = new FormData();

  const meta = {
    captionSnapshot: params.captionSnapshot,
    format: params.format || "png",
    processingMs: params.processingMs,
    slideCount: params.files.length,
    slides: params.files.map((f, idx) => ({
      slideIndex: idx,
      fileName: f.name,
      width: 1080,
      height: 1920,
    })),
  };

  formData.append("meta", JSON.stringify(meta));

  params.files.forEach((file, index) => {
    formData.append(`slide_${index}`, file, file.name);
  });

  if (params.zipBlob) {
    const zipName = params.zipFileName || "carousel.zip";
    formData.append("zip", params.zipBlob, zipName);
  }

  const res = await fetch(`/api/projects/${params.projectId}/renders`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to save render artifact");
  }

  return res.json();
}

async function deleteRenderApi(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/renders/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete render");
  }
  return res.json();
}

export function useRenders(options: ListRendersOptions = {}) {
  return useQuery({
    queryKey: ["renders", options],
    queryFn: () => fetchRenders(options),
  });
}

export function useRender(id: string) {
  return useQuery({
    queryKey: ["render", id],
    queryFn: () => fetchRender(id),
    enabled: Boolean(id),
  });
}

export function useCreateRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: persistRenderApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["renders"] });
      queryClient.setQueryData(["render", data.id], data);
    },
  });
}

export function useDeleteRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRenderApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renders"] });
    },
  });
}
