"use client";

import React from "react";
import {
  Trash2,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  FileText,
  Users,
} from "lucide-react";
import type { EditorElement, TextElement, ShapeElement, EditorProject, EditorSlide } from "../types";
import { useSocialAccounts } from "@/features/social-accounts";

const AVAILABLE_FONTS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Montserrat ExtraBold", value: "'Montserrat ExtraBold', sans-serif" },
  { label: "Playfair Display Bold Italic", value: "'Playfair Display Bold Italic', serif" },
  { label: "Noto Color Emoji", value: "'Noto Color Emoji', sans-serif" },
  { label: "System Sans", value: "system-ui, sans-serif" },
  { label: "Monospace", value: "monospace" },
];

interface PropertiesPanelProps {
  element: EditorElement | null;
  project?: EditorProject;
  activeSlide?: EditorSlide | null;
  onUpdate: (id: string, updates: Partial<EditorElement>) => void;
  onDelete: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront?: (id: string) => void;
  onSendToBack?: (id: string) => void;
  onUpdateCaption?: (caption: string) => void;
  onUpdateSocialAccount?: (accountId: string | null) => void;
  onUpdateSlideBackground?: (color: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  element,
  project,
  activeSlide,
  onUpdate,
  onDelete,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onUpdateCaption,
  onUpdateSocialAccount,
  onUpdateSlideBackground,
}) => {
  const { data: socialAccounts } = useSocialAccounts();

  if (!element) {
    return (
      <aside className="w-72 bg-neutral-950 border-l border-neutral-800 p-4 overflow-y-auto flex flex-col gap-5 text-neutral-300 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <span className="font-semibold text-neutral-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Project Settings
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">
            {project?.slideWidth || 1080} × {project?.slideHeight || 1920}
          </span>
        </div>

        {/* Target Social Account */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-400" />
              Target Account
            </span>
          </div>
          <select
            value={project?.socialAccountId || ""}
            onChange={(e) => onUpdateSocialAccount?.(e.target.value || null)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="">No account selected</option>
            {(socialAccounts || []).map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.platform.toUpperCase()} · @{acc.username} ({acc.displayName})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-neutral-500 leading-tight">
            Select the destination social profile for this carousel project.
          </p>
        </div>

        {/* Project Post Caption Section */}
        <div className="flex flex-col gap-2 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Post Caption
            </span>
            <span className="text-[10px] text-neutral-500">
              {project?.caption ? `${project.caption.length} chars` : "Optional"}
            </span>
          </div>
          <textarea
            rows={8}
            value={project?.caption || ""}
            onChange={(e) => onUpdateCaption?.(e.target.value)}
            placeholder="Write your post caption here...&#10;&#10;e.g. 3 tips penting untuk bisnis kamu 👇&#10;&#10;#marketing #umkm"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 resize-none focus:outline-none focus:border-blue-500/50 leading-relaxed font-sans placeholder:text-neutral-600"
          />
          <p className="text-[10px] text-neutral-500 leading-tight">
            Saved with project. Used for future post captions, hashtags, and social publishing.
          </p>
        </div>

        {/* Slide Background Color */}
        {activeSlide && onUpdateSlideBackground && (
          <div className="flex flex-col gap-2 pt-3 border-t border-neutral-800">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Slide Background
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={activeSlide.backgroundColor || "#FFFFFF"}
                onChange={(e) => onUpdateSlideBackground(e.target.value)}
                className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
              />
              <span className="text-[11px] font-mono uppercase text-neutral-400">
                {activeSlide.backgroundColor || "#FFFFFF"}
              </span>
            </div>
          </div>
        )}

        <div className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/80 text-[11px] text-neutral-400 flex flex-col gap-1 mt-auto">
          <span className="font-medium text-neutral-300">Tip:</span>
          <span>Click any text or shape on the canvas to inspect its styling properties.</span>
        </div>
      </aside>
    );
  }

  const isText = element.type === "TEXT";
  const isShape = element.type === "SHAPE";

  return (
    <aside className="w-72 bg-neutral-950 border-l border-neutral-800 p-4 overflow-y-auto flex flex-col gap-5 text-neutral-300 text-xs">
      {/* Header with Type & Quick Actions */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <span className="font-semibold text-neutral-100 uppercase tracking-wider text-[11px]">
          {element.type} Properties
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onUpdate(element.id, { locked: !element.locked })}
            className={`p-1.5 rounded hover:bg-neutral-800 ${
              element.locked ? "text-amber-400" : "text-neutral-400"
            }`}
            title={element.locked ? "Unlock element" : "Lock element"}
          >
            {element.locked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(element.id)}
            className="p-1.5 rounded text-red-400 hover:bg-red-950 hover:text-red-300"
            title="Delete element"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Geometry / Transform */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
          Geometry
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">X</label>
            <input
              type="number"
              value={Math.round(element.x)}
              onChange={(e) =>
                onUpdate(element.id, { x: Number(e.target.value) || 0 })
              }
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
            />
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Y</label>
            <input
              type="number"
              value={Math.round(element.y)}
              onChange={(e) =>
                onUpdate(element.id, { y: Number(e.target.value) || 0 })
              }
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
            />
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Width</label>
            <input
              type="number"
              value={Math.round(element.width)}
              onChange={(e) =>
                onUpdate(element.id, { width: Math.max(10, Number(e.target.value) || 10) })
              }
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
            />
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Height</label>
            <input
              type="number"
              value={Math.round(element.height)}
              onChange={(e) =>
                onUpdate(element.id, { height: Math.max(10, Number(e.target.value) || 10) })
              }
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
            />
          </div>
        </div>
      </div>

      {/* Opacity & Rotation */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
          Appearance
        </span>
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <label className="text-neutral-500">Opacity</label>
            <span className="text-neutral-400 font-mono">
              {Math.round(element.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={element.opacity}
            onChange={(e) =>
              onUpdate(element.id, { opacity: parseFloat(e.target.value) })
            }
            className="w-full accent-blue-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-neutral-500 block mb-1">Rotation (°)</label>
          <input
            type="number"
            value={Math.round(element.rotation)}
            onChange={(e) =>
              onUpdate(element.id, { rotation: Number(e.target.value) || 0 })
            }
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
          />
        </div>
      </div>

      {/* Text Specific Settings */}
      {isText && (
        <div className="flex flex-col gap-2.5 pt-2 border-t border-neutral-800">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Typography
          </span>
          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Content</label>
            <textarea
              rows={3}
              value={(element as TextElement).text}
              onChange={(e) =>
                onUpdate(element.id, { text: e.target.value } as Partial<TextElement>)
              }
              className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-neutral-200 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Font Family</label>
            <select
              value={(element as TextElement).fontFamily}
              onChange={(e) =>
                onUpdate(element.id, { fontFamily: e.target.value } as Partial<TextElement>)
              }
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
            >
              {AVAILABLE_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Font Size</label>
              <input
                type="number"
                min="8"
                max="300"
                value={(element as TextElement).fontSize}
                onChange={(e) =>
                  onUpdate(element.id, {
                    fontSize: Number(e.target.value) || 24,
                  } as Partial<TextElement>)
                }
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(element as TextElement).color}
                  onChange={(e) =>
                    onUpdate(element.id, { color: e.target.value } as Partial<TextElement>)
                  }
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                />
                <span className="text-[11px] font-mono uppercase text-neutral-400">
                  {(element as TextElement).color}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Alignment</label>
            <div className="grid grid-cols-3 gap-1 bg-neutral-900 p-1 rounded border border-neutral-800">
              <button
                type="button"
                onClick={() =>
                  onUpdate(element.id, { align: "left" } as Partial<TextElement>)
                }
                className={`py-1 flex justify-center rounded ${
                  (element as TextElement).align === "left"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-500"
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdate(element.id, { align: "center" } as Partial<TextElement>)
                }
                className={`py-1 flex justify-center rounded ${
                  (element as TextElement).align === "center"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-500"
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdate(element.id, { align: "right" } as Partial<TextElement>)
                }
                className={`py-1 flex justify-center rounded ${
                  (element as TextElement).align === "right"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-500"
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shape Specific Settings */}
      {isShape && (
        <div className="flex flex-col gap-2.5 pt-2 border-t border-neutral-800">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Shape Fill & Border
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Fill Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(element as ShapeElement).fillColor}
                  onChange={(e) =>
                    onUpdate(element.id, { fillColor: e.target.value } as Partial<ShapeElement>)
                  }
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-1">Corner Radius</label>
              <input
                type="number"
                min="0"
                max="200"
                value={(element as ShapeElement).cornerRadius}
                onChange={(e) =>
                  onUpdate(element.id, {
                    cornerRadius: Number(e.target.value) || 0,
                  } as Partial<ShapeElement>)
                }
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Layer Z-Index Reordering */}
      <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Layer Order
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">
            Layer {element.zIndex} of {activeSlide?.elements.length || 1}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onBringForward(element.id)}
            className="flex items-center justify-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded py-1.5 text-xs text-neutral-300 transition-colors"
            title="Bring Forward (Up one layer)"
          >
            <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
            <span>Forward</span>
          </button>
          <button
            type="button"
            onClick={() => onSendBackward(element.id)}
            className="flex items-center justify-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded py-1.5 text-xs text-neutral-300 transition-colors"
            title="Send Backward (Down one layer)"
          >
            <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
            <span>Backward</span>
          </button>
          {onBringToFront && (
            <button
              type="button"
              onClick={() => onBringToFront(element.id)}
              className="flex items-center justify-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded py-1.5 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Bring to Front (Topmost layer)"
            >
              <ChevronsUp className="w-3.5 h-3.5 text-blue-400" />
              <span>To Front</span>
            </button>
          )}
          {onSendToBack && (
            <button
              type="button"
              onClick={() => onSendToBack(element.id)}
              className="flex items-center justify-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded py-1.5 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Send to Back (Bottommost layer)"
            >
              <ChevronsDown className="w-3.5 h-3.5 text-amber-400" />
              <span>To Back</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
