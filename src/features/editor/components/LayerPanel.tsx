"use client";

import React from "react";
import {
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { EditorElement } from "../types";

interface LayerPanelProps {
  elements: EditorElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onDeleteElement: (id: string) => void;
  onBringForward?: (id: string) => void;
  onSendBackward?: (id: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onBringForward,
  onSendBackward,
}) => {
  // Show highest z-index at top of layer panel
  const reverseSorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  const getElementIcon = (el: EditorElement) => {
    switch (el.type) {
      case "TEXT":
        return <Type className="w-3.5 h-3.5 text-blue-400" />;
      case "IMAGE":
        return <ImageIcon className="w-3.5 h-3.5 text-amber-400" />;
      case "SHAPE":
        return el.shapeType === "circle" ? (
          <Circle className="w-3.5 h-3.5 text-purple-400" />
        ) : (
          <Square className="w-3.5 h-3.5 text-green-400" />
        );
    }
  };

  const getElementLabel = (el: EditorElement) => {
    if (el.type === "TEXT") {
      return el.text.slice(0, 18) || "Empty Text";
    }
    if (el.type === "IMAGE") {
      return "Image Layer";
    }
    return el.shapeType === "circle" ? "Circle" : "Rectangle";
  };

  return (
    <aside className="w-60 bg-neutral-950 border-r border-neutral-800 flex flex-col shrink-0 text-xs select-none">
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <span className="font-semibold text-neutral-200 text-[11px] uppercase tracking-wider">
          Layers ({elements.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {reverseSorted.length === 0 ? (
          <div className="p-4 text-center text-neutral-600 text-[11px]">
            No layers on this slide
          </div>
        ) : (
          reverseSorted.map((el) => {
            const isSelected = el.id === selectedElementId;

            return (
              <div
                key={el.id}
                onClick={() => onSelectElement(el.id)}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-950/60 border border-blue-600/50 text-white"
                    : "hover:bg-neutral-900 border border-transparent text-neutral-300"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                  {getElementIcon(el)}
                  <span className="truncate text-xs">{getElementLabel(el)}</span>
                </div>

                <div className="flex items-center gap-0.5 opacity-70 hover:opacity-100 shrink-0">
                  {onBringForward && isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBringForward(el.id);
                      }}
                      className="p-1 hover:text-blue-400"
                      title="Bring forward (Move up in layers)"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                  )}
                  {onSendBackward && isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendBackward(el.id);
                      }}
                      className="p-1 hover:text-amber-400"
                      title="Send backward (Move down in layers)"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateElement(el.id, { visible: !el.visible });
                    }}
                    className="p-1 hover:text-white"
                    title={el.visible ? "Hide layer" : "Show layer"}
                  >
                    {el.visible ? (
                      <Eye className="w-3 h-3 text-neutral-400" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-neutral-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateElement(el.id, { locked: !el.locked });
                    }}
                    className="p-1 hover:text-white"
                    title={el.locked ? "Unlock layer" : "Lock layer"}
                  >
                    {el.locked ? (
                      <Lock className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Unlock className="w-3 h-3 text-neutral-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteElement(el.id);
                    }}
                    className="p-1 hover:text-red-400"
                    title="Delete layer"
                  >
                    <Trash2 className="w-3 h-3 text-neutral-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
