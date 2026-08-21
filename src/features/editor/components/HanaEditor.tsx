"use client";

import React, { useState, useCallback, useEffect } from "react";
import type {
  EditorProject,
  EditorSlide,
  EditorElement,
} from "../types";
import { EditorToolbar } from "./EditorToolbar";
import { EditorCanvas } from "./EditorCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { SlideNavigator } from "./SlideNavigator";
import { LayerPanel } from "./LayerPanel";
import { clamp } from "../engine/canvas-math";
import {
  createSlide,
  duplicateSlide,
  deleteSlide,
  moveSlide,
  createTextElement,
  createShapeElement,
  createImageElement,
  updateElementInProject,
  deleteElementFromProject,
  reorderElementInSlide,
  normalizeSlideElements,
} from "../engine/editor-operations";
import { AssetLibraryDialog, useAssets, type Asset } from "@/features/assets";
import { ExportDialog } from "./ExportDialog";
import { ProjectCaptionDialog } from "./ProjectCaptionDialog";
import { ShareDialog } from "./ShareDialog";
import { RenderOutputDialog } from "./RenderOutputDialog";
import { ImportContentDialog, convertContentPlanToProject } from "@/features/content";
import type { ContentPlan } from "@/types/content";

interface HanaEditorProps {
  initialProject?: EditorProject;
  onSave?: (project: EditorProject) => Promise<EditorProject | void> | EditorProject | void;
  onBack?: () => void;
}

const DEFAULT_PROJECT: EditorProject = {
  id: "temp-project",
  title: "Untitled Carousel",
  slideWidth: 1080,
  slideHeight: 1920,
  slides: [
    {
      id: "slide-1",
      position: 0,
      backgroundColor: "#121212",
      backgroundImageUrl: null,
      elements: [
        {
          id: "el-title-1",
          type: "TEXT",
          text: "Double Click to Edit",
          x: 140,
          y: 720,
          width: 800,
          height: 140,
          fontSize: 64,
          fontFamily: "Inter, sans-serif",
          color: "#FFFFFF",
          align: "center",
          lineHeight: 1.2,
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          zIndex: 1,
        },
        {
          id: "el-subtitle-1",
          type: "TEXT",
          text: "Create engaging social carousels with Hana Studio",
          x: 140,
          y: 900,
          width: 800,
          height: 100,
          fontSize: 32,
          fontFamily: "Inter, sans-serif",
          color: "#A1A1AA",
          align: "center",
          lineHeight: 1.3,
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          zIndex: 2,
        },
      ],
    },
  ],
};

export const HanaEditor: React.FC<HanaEditorProps> = ({
  initialProject = DEFAULT_PROJECT,
  onSave,
  onBack,
}) => {
  const [project, setProject] = useState<EditorProject>(initialProject);
  const [activeSlideId, setActiveSlideId] = useState<string>(
    initialProject.slides[0]?.id || "",
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [scale, setScale] = useState<number>(0.45);

  const { data: userAssets } = useAssets();

  // Persistence and dirty state tracking
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving" | "error">("saved");

  // Modal states
  const [assetLibraryOpen, setAssetLibraryOpen] = useState<boolean>(false);
  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const [captionDialogOpen, setCaptionDialogOpen] = useState<boolean>(false);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [renderDialogOpen, setRenderDialogOpen] = useState<boolean>(false);
  const [importContentDialogOpen, setImportContentDialogOpen] = useState<boolean>(false);

  // Sync initialProject when switching projects without useEffect
  const [prevInitialProject, setPrevInitialProject] = useState<EditorProject>(initialProject);
  if (initialProject !== prevInitialProject) {
    setPrevInitialProject(initialProject);
    setProject(initialProject);
    if (initialProject.slides[0]?.id) {
      setActiveSlideId(initialProject.slides[0].id);
    }
    setIsDirty(false);
    setSaveStatus("saved");
  }

  const activeSlide =
    project.slides.find((s) => s.id === activeSlideId) || project.slides[0];

  const selectedElement =
    activeSlide?.elements.find((el) => el.id === selectedElementId) || null;

  // Zoom handlers
  const handleZoomIn = () => setScale((s) => clamp(s + 0.05, 0.15, 1.5));
  const handleZoomOut = () => setScale((s) => clamp(s - 0.05, 0.15, 1.5));
  const handleZoomFit = () => setScale(0.45);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!onSave || isSaving) return;
    try {
      setIsSaving(true);
      setSaveStatus("saving");
      const savedProject = await onSave(project);
      if (savedProject && typeof savedProject === "object" && Array.isArray(savedProject.slides)) {
        setProject(savedProject);
        // Ensure active slide ID remains valid in updated project
        if (!savedProject.slides.some((s) => s.id === activeSlideId) && savedProject.slides[0]) {
          setActiveSlideId(savedProject.slides[0].id);
        }
      }
      setIsDirty(false);
      setSaveStatus("saved");
    } catch (err) {
      console.error("[HanaEditor] Failed to save project:", err);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [onSave, isSaving, project, activeSlideId]);

  // Keyboard shortcut: Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  // Warn on page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // -------------------------------------------------------------------------
  // Element Operations (Domain-driven)
  // -------------------------------------------------------------------------

  const handleUpdateElement = useCallback(
    (elementId: string, updates: Partial<EditorElement>) => {
      setProject((prev) => updateElementInProject(prev, activeSlideId, elementId, updates));
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [activeSlideId],
  );

  const handleDeleteElement = useCallback(
    (elementId: string) => {
      setProject((prev) => deleteElementFromProject(prev, activeSlideId, elementId));
      if (selectedElementId === elementId) {
        setSelectedElementId(null);
      }
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [activeSlideId, selectedElementId],
  );

  const handleBringForward = useCallback(
    (elementId: string) => {
      setProject((prev) => ({
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === activeSlideId ? reorderElementInSlide(s, elementId, "bringForward") : s,
        ),
      }));
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [activeSlideId],
  );

  const handleSendBackward = useCallback(
    (elementId: string) => {
      setProject((prev) => ({
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === activeSlideId ? reorderElementInSlide(s, elementId, "sendBackward") : s,
        ),
      }));
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [activeSlideId],
  );

  const handleBringToFront = useCallback(
    (elementId: string) => {
      setProject((prev) => ({
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === activeSlideId ? reorderElementInSlide(s, elementId, "bringToFront") : s,
        ),
      }));
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [activeSlideId],
  );

  const handleSendToBack = useCallback(
    (elementId: string) => {
      setProject((prev) => ({
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === activeSlideId ? reorderElementInSlide(s, elementId, "sendToBack") : s,
        ),
      }));
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [activeSlideId],
  );

  const handleUpdateCaption = useCallback((newCaption: string) => {
    setProject((prev) => ({
      ...prev,
      caption: newCaption,
    }));
    setIsDirty(true);
    setSaveStatus("unsaved");
  }, []);

  const handleUpdateSocialAccount = useCallback((newAccountId: string | null) => {
    setProject((prev) => ({
      ...prev,
      socialAccountId: newAccountId,
    }));
    setIsDirty(true);
    setSaveStatus("unsaved");
  }, []);

  const handleUpdateSlideBackground = useCallback(
    (color: string) => {
      setProject((prev) => ({
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === activeSlideId ? { ...s, backgroundColor: color } : s,
        ),
      }));
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [activeSlideId],
  );

  // Element Creation
  const handleAddText = useCallback(() => {
    if (!activeSlide) return;
    const newText = createTextElement(activeSlide);

    setProject((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === activeSlideId
          ? { ...s, elements: normalizeSlideElements([...s.elements, newText]) }
          : s,
      ),
    }));
    setSelectedElementId(newText.id);
    setIsDirty(true);
    setSaveStatus("unsaved");
  }, [activeSlide, activeSlideId]);

  const handleAddRectangle = useCallback(() => {
    if (!activeSlide) return;
    const newRect = createShapeElement(activeSlide, "rectangle");

    setProject((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === activeSlideId
          ? { ...s, elements: normalizeSlideElements([...s.elements, newRect]) }
          : s,
      ),
    }));
    setSelectedElementId(newRect.id);
    setIsDirty(true);
    setSaveStatus("unsaved");
  }, [activeSlide, activeSlideId]);

  const handleAddCircle = useCallback(() => {
    if (!activeSlide) return;
    const newCircle = createShapeElement(activeSlide, "circle");

    setProject((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === activeSlideId
          ? { ...s, elements: normalizeSlideElements([...s.elements, newCircle]) }
          : s,
      ),
    }));
    setSelectedElementId(newCircle.id);
    setIsDirty(true);
    setSaveStatus("unsaved");
  }, [activeSlide, activeSlideId]);

  const handleAddImage = useCallback(
    (src: string) => {
      if (!activeSlide) return;
      const newImage = createImageElement(
        activeSlide,
        { url: src },
        { slideWidth: project.slideWidth, slideHeight: project.slideHeight },
      );

      setProject((prev) => ({
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === activeSlideId
            ? { ...s, elements: normalizeSlideElements([...s.elements, newImage]) }
            : s,
        ),
      }));
      setSelectedElementId(newImage.id);
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [activeSlide, activeSlideId, project.slideWidth, project.slideHeight],
  );

  const handleAddAssetImage = useCallback(
    (asset: Asset) => {
      if (!activeSlide) return;
      const newImage = createImageElement(
        activeSlide,
        asset,
        { slideWidth: project.slideWidth, slideHeight: project.slideHeight },
      );

      setProject((prev) => ({
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === activeSlideId
            ? { ...s, elements: normalizeSlideElements([...s.elements, newImage]) }
            : s,
        ),
      }));
      setSelectedElementId(newImage.id);
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [activeSlide, activeSlideId, project.slideWidth, project.slideHeight],
  );

  // -------------------------------------------------------------------------
  // Slide Operations (Domain-driven)
  // -------------------------------------------------------------------------

  const handleAddSlide = useCallback(() => {
    const { project: updatedProject, newSlide } = createSlide(project);
    setProject(updatedProject);
    setActiveSlideId(newSlide.id);
    setSelectedElementId(null);
    setIsDirty(true);
    setSaveStatus("unsaved");
  }, [project]);

  const handleDuplicateSlide = useCallback(
    (slideId: string) => {
      const { project: updatedProject, duplicatedSlide } = duplicateSlide(project, slideId);
      if (duplicatedSlide) {
        setProject(updatedProject);
        setActiveSlideId(duplicatedSlide.id);
        setSelectedElementId(null);
        setIsDirty(true);
        setSaveStatus("unsaved");
      }
    },
    [project],
  );

  const handleDeleteSlide = useCallback(
    (slideId: string) => {
      const { project: updatedProject, nextActiveSlideId, success } = deleteSlide(
        project,
        slideId,
        activeSlideId,
      );

      if (success) {
        setProject(updatedProject);
        if (nextActiveSlideId) {
          setActiveSlideId(nextActiveSlideId);
        }
        setSelectedElementId(null);
        setIsDirty(true);
        setSaveStatus("unsaved");
      }
    },
    [project, activeSlideId],
  );

  const handleMoveSlide = useCallback(
    (slideId: string, direction: "left" | "right") => {
      const updatedProject = moveSlide(project, slideId, direction);
      setProject(updatedProject);
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [project],
  );

  const handleApplyContentPlan = useCallback(
    async (contentPlan: ContentPlan) => {
      const bridgedProject = await convertContentPlanToProject(contentPlan, {
        projectId: project.id,
        slideWidth: project.slideWidth,
        slideHeight: project.slideHeight,
        assets: userAssets || [],
      });

      setProject((prev) => ({
        ...prev,
        title: contentPlan.title || prev.title,
        caption: contentPlan.caption !== undefined ? contentPlan.caption : prev.caption,
        slides: bridgedProject.slides,
      }));

      if (bridgedProject.slides[0]?.id) {
        setActiveSlideId(bridgedProject.slides[0].id);
      }
      setSelectedElementId(null);
      setIsDirty(true);
      setSaveStatus("unsaved");
    },
    [project.id, project.slideWidth, project.slideHeight, userAssets],
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* Top Toolbar */}
      <EditorToolbar
        projectTitle={project.title}
        slideWidth={project.slideWidth}
        slideHeight={project.slideHeight}
        onAddText={handleAddText}
        onAddRectangle={handleAddRectangle}
        onAddCircle={handleAddCircle}
        onAddImage={handleAddImage}
        onOpenAssetLibrary={() => setAssetLibraryOpen(true)}
        scale={scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleZoomFit}
        onBack={onBack}
        isDirty={isDirty}
        isSaving={isSaving}
        saveStatus={saveStatus}
        onSave={handleSave}
        onOpenImportContent={() => setImportContentDialogOpen(true)}
        onOpenCaption={() => setCaptionDialogOpen(true)}
        onOpenRender={() => setRenderDialogOpen(true)}
        onOpenExport={() => setExportDialogOpen(true)}
        onOpenShare={() => setShareDialogOpen(true)}
      />

      {/* Main Workspace: Left Layer Panel + Center Canvas + Right Properties Panel */}
      <div className="flex flex-1 min-h-0 relative">
        <LayerPanel
          elements={activeSlide?.elements || []}
          selectedElementId={selectedElementId}
          onSelectElement={(id) => setSelectedElementId(id)}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-neutral-900">
          {activeSlide ? (
            <EditorCanvas
              slide={activeSlide}
              width={project.slideWidth}
              height={project.slideHeight}
              scale={scale}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onUpdateElement={handleUpdateElement}
            />
          ) : null}
        </main>

        <PropertiesPanel
          element={selectedElement}
          project={project}
          activeSlide={activeSlide}
          onUpdate={handleUpdateElement}
          onDelete={handleDeleteElement}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onUpdateCaption={handleUpdateCaption}
          onUpdateSocialAccount={handleUpdateSocialAccount}
          onUpdateSlideBackground={handleUpdateSlideBackground}
        />
      </div>

      {/* Bottom Multi-Slide Strip */}
      <SlideNavigator
        slides={project.slides}
        activeSlideId={activeSlideId}
        onSelectSlide={(id) => {
          setActiveSlideId(id);
          setSelectedElementId(null);
        }}
        onAddSlide={handleAddSlide}
        onDuplicateSlide={handleDuplicateSlide}
        onDeleteSlide={handleDeleteSlide}
        onMoveSlideLeft={(id) => handleMoveSlide(id, "left")}
        onMoveSlideRight={(id) => handleMoveSlide(id, "right")}
      />

      {/* Project Caption Dialog Modal */}
      <ProjectCaptionDialog
        open={captionDialogOpen}
        onOpenChange={setCaptionDialogOpen}
        caption={project.caption || ""}
        onChangeCaption={handleUpdateCaption}
        projectTitle={project.title}
      />

      {/* Render Output Dialog Modal */}
      <RenderOutputDialog
        open={renderDialogOpen}
        onOpenChange={setRenderDialogOpen}
        project={project}
        onOpenExport={() => setExportDialogOpen(true)}
      />

      {/* Export Dialog Modal */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        project={project}
        activeSlideId={activeSlideId}
      />

      {/* Share Dialog Modal */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        project={project}
        onOpenExport={() => setExportDialogOpen(true)}
        onOpenRender={() => setRenderDialogOpen(true)}
      />

      {/* Import Content Dialog Modal */}
      <ImportContentDialog
        open={importContentDialogOpen}
        onOpenChange={setImportContentDialogOpen}
        onApply={handleApplyContentPlan}
      />

      {/* Asset Library Dialog Modal */}
      <AssetLibraryDialog
        open={assetLibraryOpen}
        onOpenChange={setAssetLibraryOpen}
        onSelectAsset={handleAddAssetImage}
        title="Insert Image from Asset Library"
        description="Select an existing uploaded image or upload a new image to insert into your slide."
      />
    </div>
  );
};
