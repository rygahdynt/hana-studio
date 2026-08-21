"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Sliders,
  Layers,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ContentBrief, ContentPlan } from "@/types/content";
import { BUILT_IN_TEMPLATES } from "@/features/templates";
import { convertContentPlanToProject } from "@/features/content/bridge/content-to-editor";
import { useAssets } from "@/features/assets";

interface GenerateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateContentDialog({
  open,
  onOpenChange,
}: GenerateContentDialogProps) {
  const router = useRouter();
  const { data: userAssets } = useAssets();

  // Form State
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [objective, setObjective] = useState("");
  const [tone, setTone] = useState("casual");
  const [language, setLanguage] = useState("Indonesian");
  const [slideCount, setSlideCount] = useState<number>(7);
  const [cta, setCta] = useState("");
  const [contentDirection, setContentDirection] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("template-tiktok-dark-modern");

  // Flow State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<ContentPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTopic("");
    setAudience("");
    setObjective("");
    setTone("casual");
    setLanguage("Indonesian");
    setSlideCount(7);
    setCta("");
    setContentDirection("");
    setGeneratedPlan(null);
    setError(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setError(null);

    const brief: ContentBrief = {
      topic: topic.trim(),
      audience: audience.trim() || undefined,
      objective: objective.trim() || undefined,
      tone,
      language,
      slideCount: Number(slideCount) || 7,
      cta: cta.trim() || undefined,
      contentDirection: contentDirection.trim() || undefined,
    };

    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate carousel content");
      }

      setGeneratedPlan(data.contentPlan);
    } catch (err) {
      console.error("[Generate UI] Generation error:", err);
      setError(err instanceof Error ? err.message : "Content generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateProject = async () => {
    if (!generatedPlan) return;

    setIsCreatingProject(true);
    setError(null);

    try {
      const selectedTemplate =
        BUILT_IN_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
        BUILT_IN_TEMPLATES[0]!;

      // 1. Bridge ContentPlan + Template into full EditorProject
      const editorProject = await convertContentPlanToProject(generatedPlan, {
        template: selectedTemplate,
        assets: userAssets || [],
      });

      // 2. Persist to Neon PostgreSQL via API
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editorProject.title,
          description: generatedPlan.caption || `AI generated: ${topic}`,
          slideWidth: editorProject.slideWidth,
          slideHeight: editorProject.slideHeight,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create project record");
      }

      const createdProject = await res.json();

      // 3. Save slides & elements into newly created project
      const saveRes = await fetch(`/api/projects/${createdProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editorProject.title,
          description: generatedPlan.caption,
          slideWidth: editorProject.slideWidth,
          slideHeight: editorProject.slideHeight,
          slides: editorProject.slides,
        }),
      });

      if (!saveRes.ok) {
        console.warn("[Generate UI] Initial slide population fallback warning");
      }

      onOpenChange(false);
      resetForm();
      router.push(`/projects/${createdProject.id}`);
    } catch (err) {
      console.error("[Generate UI] Create project error:", err);
      setError(err instanceof Error ? err.message : "Failed to create and open project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isGenerating && !isCreatingProject) {
          onOpenChange(isOpen);
          if (!isOpen) setError(null);
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto bg-neutral-950 border border-neutral-800 text-neutral-100 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                Generate Carousel with AI
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Provide your topic and creative brief. AI will generate a structured TikTok carousel plan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!generatedPlan ? (
          /* Brief Input Form */
          <form onSubmit={handleGenerate} className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Topic <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g. 5 kesalahan marketing yang sering dilakukan UMKM"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                disabled={isGenerating}
                className="bg-neutral-900 border-neutral-800 text-neutral-100 focus-visible:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1">
                  Target Audience
                </label>
                <Input
                  placeholder="e.g. Pemilik UMKM, Content Creators"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  disabled={isGenerating}
                  className="bg-neutral-900 border-neutral-800 text-neutral-200"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1">
                  Objective
                </label>
                <Input
                  placeholder="e.g. Edukasi praktis, Brand awareness"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  disabled={isGenerating}
                  className="bg-neutral-900 border-neutral-800 text-neutral-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1">
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  disabled={isGenerating}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="casual">Casual & Friendly</option>
                  <option value="educational">Educational & Actionable</option>
                  <option value="provocative">Bold & Provocative</option>
                  <option value="professional">Professional & Crisp</option>
                  <option value="storytelling">Narrative Storytelling</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isGenerating}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Indonesian">Indonesian (Bahasa)</option>
                  <option value="English">English</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1">
                  Slide Count
                </label>
                <select
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  disabled={isGenerating}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={5}>5 Slides</option>
                  <option value={7}>7 Slides (Standard)</option>
                  <option value={8}>8 Slides</option>
                  <option value={10}>10 Slides</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1">
                Call to Action (CTA)
              </label>
              <Input
                placeholder="e.g. Follow untuk tips marketing lainnya"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                disabled={isGenerating}
                className="bg-neutral-900 border-neutral-800 text-neutral-200"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isGenerating}
                className="border-neutral-800 text-neutral-300 hover:bg-neutral-900 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isGenerating || !topic.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Content Plan
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Generated Plan Preview & Template Selection */
          <div className="flex flex-col gap-5 py-2">
            {/* Header Summary */}
            <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  Generated Content Plan ({generatedPlan.slides.length} Slides)
                </span>
                <span className="text-[10px] text-neutral-500">TikTok 9:16 Carousel</span>
              </div>
              <h3 className="text-base font-bold text-white">{generatedPlan.title}</h3>
              <p className="text-xs text-neutral-300 italic">&ldquo;{generatedPlan.hook}&rdquo;</p>
            </div>

            {/* Template Preset Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Select Design Theme
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BUILT_IN_TEMPLATES.map((tmpl) => {
                  const isSelected = tmpl.id === selectedTemplateId;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between text-xs ${
                        isSelected
                          ? "border-blue-500 bg-blue-950/30 text-white ring-1 ring-blue-500"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <span className="font-semibold text-[11px] truncate">{tmpl.name}</span>
                      <div className="flex items-center gap-1 mt-2">
                        <div
                          className="w-3 h-3 rounded-full border border-black/40"
                          style={{ backgroundColor: tmpl.tokens.colors.primaryColor }}
                        />
                        <div
                          className="w-3 h-3 rounded-full border border-black/40"
                          style={{ backgroundColor: tmpl.tokens.colors.backgroundColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slide Cards Preview */}
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {generatedPlan.slides.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/80 flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span className="font-bold text-neutral-200">
                      Slide {s.slideNumber}: {(s.purpose || "SLIDE").toUpperCase()}
                    </span>
                    {s.badge && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800/50">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-neutral-100 mt-0.5">{s.headline}</h4>
                  {s.body && <p className="text-neutral-400 text-[11px]">{s.body}</p>}
                  {s.supportingPoints && s.supportingPoints.length > 0 && (
                    <ul className="list-disc list-inside text-neutral-400 text-[11px] mt-1 space-y-0.5">
                      {s.supportingPoints.map((pt, pIdx) => (
                        <li key={pIdx}>{pt}</li>
                      ))}
                    </ul>
                  )}
                  {s.cta && (
                    <div className="text-[10px] text-amber-400 font-medium mt-1">
                      CTA: {s.cta}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <DialogFooter className="pt-3 border-t border-neutral-800 flex justify-between sm:justify-between items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGeneratedPlan(null)}
                disabled={isCreatingProject}
                className="border-neutral-800 text-neutral-300 hover:bg-neutral-900 text-xs"
              >
                Back to Edit Brief
              </Button>

              <Button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreatingProject}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg"
              >
                {isCreatingProject ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Opening Editor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Apply & Open in Editor
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
