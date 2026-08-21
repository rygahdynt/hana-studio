"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Plus,
  Search,
  Tag,
  Check,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  useAssets,
  useUpdateAssetCategory,
  useDeleteAsset,
  uploadAssetApi,
  type Asset,
} from "../hooks/use-assets";

interface AssetLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAsset?: (asset: Asset) => void;
  title?: string;
  description?: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  status: "queued" | "uploading" | "success" | "error";
  error?: string;
  category?: string;
}

export function AssetLibraryDialog({
  open,
  onOpenChange,
  onSelectAsset,
  title = "Asset Library",
  description = "Upload, categorize, and manage images stored in your private media library.",
}: AssetLibraryDialogProps) {
  const queryClient = useQueryClient();
  const { data: assets, isLoading, error } = useAssets();
  const updateCategoryMutation = useUpdateAssetCategory();
  const deleteMutation = useDeleteAsset();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Batch Upload Queue State
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const isCancelledRef = useRef(false);

  // Search & Category Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // Inline Category Editing State: assetId -> draft category string
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<string>("");

  // Derived existing categories from user's loaded assets
  const existingCategories = useMemo(() => {
    if (!assets) return [];
    const set = new Set<string>();
    for (const a of assets) {
      if (a.category && a.category.trim()) {
        set.add(a.category.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [assets]);

  // Filtered Assets list
  const filteredAssets = useMemo(() => {
    if (!assets) return [];

    return assets.filter((asset) => {
      // 1. Search Query Filter (filename or category)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesFilename =
          asset.originalFilename.toLowerCase().includes(q) ||
          asset.filename.toLowerCase().includes(q);
        const matchesCategory =
          asset.category && asset.category.toLowerCase().includes(q);
        if (!matchesFilename && !matchesCategory) return false;
      }

      // 2. Category Filter
      if (selectedCategoryFilter === "ALL") return true;
      if (selectedCategoryFilter === "UNCATEGORIZED") {
        return !asset.category || asset.category.trim() === "";
      }
      return (
        asset.category?.trim().toLowerCase() ===
        selectedCategoryFilter.trim().toLowerCase()
      );
    });
  }, [assets, searchQuery, selectedCategoryFilter]);

  // -------------------------------------------------------------------------
  // Batch Queue Processing (Controlled Concurrency = 3)
  // -------------------------------------------------------------------------

  const processQueue = useCallback(
    async (itemsToProcess: UploadQueueItem[]) => {
      if (itemsToProcess.length === 0) return;

      setIsUploadingBatch(true);
      isCancelledRef.current = false;

      const CONCURRENCY = 3;
      let nextIndex = 0;
      let singleUploadedAsset: Asset | null = null;

      const runWorker = async (): Promise<void> => {
        while (nextIndex < itemsToProcess.length) {
          if (isCancelledRef.current) break;

          const currentIndex = nextIndex++;
          const item = itemsToProcess[currentIndex];
          if (!item) continue;

          // Set uploading
          setUploadQueue((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i)),
          );

          try {
            // Client-side file validation
            if (item.file.size > 10 * 1024 * 1024) {
              throw new Error("File size exceeds maximum limit of 10 MB");
            }

            const validMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
            if (!validMimes.includes(item.file.type.toLowerCase())) {
              throw new Error("Unsupported image format. PNG, JPEG, and WebP only.");
            }

            const createdAsset = await uploadAssetApi(item.file, item.category);
            singleUploadedAsset = createdAsset;

            // Set success
            setUploadQueue((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, status: "success" } : i)),
            );
          } catch (err) {
            // Set error
            setUploadQueue((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      status: "error",
                      error: err instanceof Error ? err.message : "Upload failed",
                    }
                  : i,
              ),
            );
          } finally {
            queryClient.invalidateQueries({ queryKey: ["assets"] });
          }
        }
      };

      const workers: Promise<void>[] = [];
      for (let w = 0; w < Math.min(CONCURRENCY, itemsToProcess.length); w++) {
        workers.push(runWorker());
      }

      await Promise.all(workers);
      setIsUploadingBatch(false);

      // If exactly 1 file was uploaded in selection mode and succeeded, auto-select it
      if (itemsToProcess.length === 1 && singleUploadedAsset && onSelectAsset && !isCancelledRef.current) {
        onSelectAsset(singleUploadedAsset);
        onOpenChange(false);
      }
    },
    [onSelectAsset, onOpenChange, queryClient],
  );

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      if (!files || files.length === 0) return;

      const autoCategory =
        selectedCategoryFilter !== "ALL" && selectedCategoryFilter !== "UNCATEGORIZED"
          ? selectedCategoryFilter
          : undefined;

      const newItems: UploadQueueItem[] = files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: "queued",
        category: autoCategory,
      }));

      setUploadQueue((prev) => [...newItems, ...prev]);
      processQueue(newItems);
    },
    [selectedCategoryFilter, processQueue],
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRetryFailed = () => {
    const failedItems = uploadQueue.filter((item) => item.status === "error");
    if (failedItems.length === 0) return;

    const resetFailed: UploadQueueItem[] = failedItems.map((item) => ({
      ...item,
      status: "queued",
      error: undefined,
    }));

    setUploadQueue((prev) =>
      prev.map((item) =>
        item.status === "error" ? { ...item, status: "queued", error: undefined } : item,
      ),
    );

    processQueue(resetFailed);
  };

  const handleCancelUpload = () => {
    isCancelledRef.current = true;
    setIsUploadingBatch(false);
    setUploadQueue((prev) =>
      prev.map((item) =>
        item.status === "queued" || item.status === "uploading"
          ? { ...item, status: "error", error: "Upload cancelled" }
          : item,
      ),
    );
  };

  const handleDismissQueue = () => {
    setUploadQueue([]);
  };

  // -------------------------------------------------------------------------
  // Drag & Drop Handlers
  // -------------------------------------------------------------------------

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  // -------------------------------------------------------------------------
  // Category Editing & Asset Deletion
  // -------------------------------------------------------------------------

  const handleStartEditCategory = (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAssetId(asset.id);
    setCategoryDraft(asset.category || "");
  };

  const handleSaveCategory = async (assetId: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateCategoryMutation.mutateAsync({
        id: assetId,
        category: categoryDraft.trim() || null,
      });
      setEditingAssetId(null);
    } catch (err) {
      console.error("Failed to update category:", err);
    }
  };

  const handleClearCategory = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateCategoryMutation.mutateAsync({
        id: assetId,
        category: null,
      });
      setEditingAssetId(null);
    } catch (err) {
      console.error("Failed to clear category:", err);
    }
  };

  const handleDeleteAsset = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this asset?")) {
      try {
        await deleteMutation.mutateAsync(assetId);
      } catch (err) {
        console.error("Failed to delete asset:", err);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Queue counts
  const totalInQueue = uploadQueue.length;
  const successInQueue = uploadQueue.filter((i) => i.status === "success").length;
  const errorInQueue = uploadQueue.filter((i) => i.status === "error").length;
  const inProgressInQueue = uploadQueue.filter((i) => i.status === "uploading" || i.status === "queued").length;
  const progressPercent = totalInQueue > 0 ? Math.round(((successInQueue + errorInQueue) / totalInQueue) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="mb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-400" />
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-neutral-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone & Multi-Upload Action Area */}
        <div className="flex flex-col gap-2 pb-3 border-b border-neutral-800">
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`relative flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer select-none outline-none ${
              isDragging
                ? "border-blue-500 bg-blue-950/40 shadow-lg scale-[1.005]"
                : "border-neutral-800 hover:border-neutral-700 bg-neutral-900/60 hover:bg-neutral-900/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                  isDragging
                    ? "bg-blue-600 text-white border-blue-400 animate-bounce"
                    : "bg-blue-950/60 border-blue-800/40 text-blue-400"
                }`}
              >
                <UploadCloud className="w-5 h-5" />
              </div>

              <div>
                <p className="text-xs font-semibold text-neutral-200">
                  {isDragging ? "Drop images to start uploading" : "Drag & drop images here, or browse files"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-neutral-400">PNG, JPEG, WebP (up to 10 MB each)</span>
                  {selectedCategoryFilter !== "ALL" && selectedCategoryFilter !== "UNCATEGORIZED" && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50">
                      Auto-tag: {selectedCategoryFilter}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isUploadingBatch}
              className="text-xs gap-1.5 shrink-0"
            >
              {isUploadingBatch ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Select Files
                </>
              )}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Batch Progress & Queue Status Banner */}
          {totalInQueue > 0 && (
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isUploadingBatch ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  ) : errorInQueue > 0 ? (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  )}
                  <span className="font-medium text-neutral-200">
                    {isUploadingBatch
                      ? `Uploading ${successInQueue + 1} of ${totalInQueue} images (${progressPercent}%)...`
                      : errorInQueue > 0
                        ? `${successInQueue} succeeded, ${errorInQueue} failed`
                        : `${totalInQueue} images uploaded successfully`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isUploadingBatch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelUpload}
                      className="h-6 px-2 text-[11px] text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                  )}
                  {!isUploadingBatch && errorInQueue > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryFailed}
                      className="h-6 px-2 text-[11px] gap-1 text-amber-300 border-amber-800 hover:bg-amber-950"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry Failed ({errorInQueue})
                    </Button>
                  )}
                  {!isUploadingBatch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismissQueue}
                      className="h-6 px-2 text-[11px] text-neutral-400 hover:text-white"
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    errorInQueue > 0 && !isUploadingBatch ? "bg-amber-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Queue Items Mini-List (up to 4 items visible) */}
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[11px]">
                {uploadQueue.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-1 rounded bg-neutral-950/60 text-neutral-300"
                  >
                    <div className="flex items-center gap-1.5 truncate mr-2">
                      {item.status === "uploading" && <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />}
                      {item.status === "success" && <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />}
                      {item.status === "error" && <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />}
                      {item.status === "queued" && <Clock className="w-3 h-3 text-neutral-500 shrink-0" />}
                      <span className="truncate">{item.file.name}</span>
                    </div>

                    <span className="text-[10px] shrink-0 font-mono">
                      {item.status === "error" ? (
                        <span className="text-red-400">{item.error || "Failed"}</span>
                      ) : (
                        <span className="text-neutral-500">{formatBytes(item.file.size)}</span>
                      )}
                    </span>
                  </div>
                ))}
                {uploadQueue.length > 10 && (
                  <p className="text-[10px] text-neutral-500 text-center">
                    + {uploadQueue.length - 10} more files
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-2 py-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <Input
                type="text"
                placeholder="Search assets by filename or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-neutral-900 border-neutral-800 text-neutral-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Category:
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("ALL")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
                selectedCategoryFilter === "ALL"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-neutral-800"
              }`}
            >
              All ({assets?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("UNCATEGORIZED")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
                selectedCategoryFilter === "UNCATEGORIZED"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-neutral-800"
              }`}
            >
              Uncategorized ({assets?.filter((a) => !a.category || !a.category.trim()).length || 0})
            </button>

            {existingCategories.map((cat) => {
              const count = assets?.filter((a) => a.category?.trim().toLowerCase() === cat.toLowerCase()).length || 0;
              const isSelected = selectedCategoryFilter.toLowerCase() === cat.toLowerCase();

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Assets Grid / Content Area */}
        <div className="flex-1 overflow-y-auto py-3 min-h-[280px] pr-1">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-800 p-2 space-y-2"
                >
                  <Skeleton className="h-28 w-full rounded" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-12 text-center text-red-400 text-xs">
              Failed to load assets. Ensure storage configuration is active.
            </div>
          ) : !assets || assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                <ImageIcon className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-neutral-300">
                No image assets found
              </p>
              <p className="text-[11px] text-neutral-500 max-w-xs mt-1">
                Upload images to store in Cloudflare R2 and categorize them for automated carousel generation.
              </p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
              <p className="text-xs font-semibold text-neutral-400">
                No assets match your search/filter criteria
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategoryFilter("ALL");
                }}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredAssets.map((asset) => {
                const isEditingCategory = editingAssetId === asset.id;

                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      if (onSelectAsset && asset.status === "READY" && !isEditingCategory) {
                        onSelectAsset(asset);
                        onOpenChange(false);
                      }
                    }}
                    className={`group relative rounded-xl border border-neutral-800 bg-neutral-900/60 p-2.5 flex flex-col justify-between overflow-hidden transition-all ${
                      onSelectAsset && !isEditingCategory
                        ? "cursor-pointer hover:border-blue-500 hover:bg-neutral-900 hover:shadow-md"
                        : "hover:border-neutral-700"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square w-full rounded-lg bg-neutral-950/80 overflow-hidden flex items-center justify-center border border-neutral-800/60 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.url}
                        alt={asset.originalFilename}
                        className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />

                      {/* Hover action overlay */}
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteAsset(asset.id, e)}
                          className="p-1 rounded bg-neutral-900/90 text-neutral-400 hover:text-red-400 hover:bg-neutral-950 border border-neutral-700 shadow"
                          title="Delete asset"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {asset.status === "READY" && onSelectAsset && !isEditingCategory && (
                        <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="px-2 py-1 rounded bg-blue-600 text-white text-[10px] font-semibold shadow">
                            Insert
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Category Section */}
                    <div className="space-y-1.5">
                      <p
                        className="text-xs font-medium text-neutral-200 truncate"
                        title={asset.originalFilename}
                      >
                        {asset.originalFilename}
                      </p>

                      {/* Category Badge / Editor */}
                      {isEditingCategory ? (
                        <div
                          className="space-y-1.5 p-2 rounded-lg bg-neutral-950 border border-blue-600/60"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              value={categoryDraft}
                              placeholder="e.g. Hook, Tips"
                              autoFocus
                              onChange={(e) => setCategoryDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveCategory(asset.id, e);
                                if (e.key === "Escape") setEditingAssetId(null);
                              }}
                              className="h-6 text-[11px] px-1.5 bg-neutral-900 border-neutral-700 text-white"
                            />
                            <button
                              type="button"
                              onClick={(e) => handleSaveCategory(asset.id, e)}
                              className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white"
                              title="Save category"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAssetId(null);
                              }}
                              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Category suggestions */}
                          {existingCategories.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                              {existingCategories.map((sug) => (
                                <button
                                  key={sug}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCategoryDraft(sug);
                                  }}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
                                >
                                  {sug}
                                </button>
                              ))}
                            </div>
                          )}

                          {asset.category && (
                            <button
                              type="button"
                              onClick={(e) => handleClearCategory(asset.id, e)}
                              className="text-[9px] text-red-400 hover:text-red-300 underline block"
                            >
                              Clear category
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleStartEditCategory(asset, e)}
                            className={`group/tag inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                              asset.category
                                ? "bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 border border-blue-800/50"
                                : "bg-neutral-950 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-800"
                            }`}
                            title="Click to edit category"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[90px]">
                              {asset.category ? asset.category : "Uncategorized"}
                            </span>
                            <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/tag:opacity-100 transition-opacity ml-0.5" />
                          </button>

                          <span className="text-[10px] text-neutral-400 font-mono">
                            {formatBytes(asset.sizeBytes)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status & Dimensions Footer */}
                    <div className="mt-2 pt-1.5 border-t border-neutral-800/60 flex items-center justify-between text-[9px] text-neutral-400 font-mono">
                      <span>
                        {asset.width && asset.height
                          ? `${asset.width}×${asset.height}`
                          : asset.mimeType.split("/")[1]?.toUpperCase()}
                      </span>
                      <span>
                        {new Date(asset.createdAt).toLocaleDateString(undefined, {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
