"use client";

import React from "react";
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { EditorSlide } from "../types";

interface SlideNavigatorProps {
  slides: EditorSlide[];
  activeSlideId: string;
  onSelectSlide: (slideId: string) => void;
  onAddSlide: () => void;
  onDuplicateSlide: (slideId: string) => void;
  onDeleteSlide: (slideId: string) => void;
  onMoveSlideLeft?: (slideId: string) => void;
  onMoveSlideRight?: (slideId: string) => void;
}

export const SlideNavigator: React.FC<SlideNavigatorProps> = ({
  slides,
  activeSlideId,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlideLeft,
  onMoveSlideRight,
}) => {
  return (
    <footer className="h-28 border-t border-neutral-800 bg-neutral-950 px-4 py-2 flex items-center gap-3 overflow-x-auto shrink-0 select-none">
      {slides.map((slide, index) => {
        const isActive = slide.id === activeSlideId;
        const textCount = slide.elements.filter((e) => e.type === "TEXT").length;
        const imageCount = slide.elements.filter((e) => e.type === "IMAGE").length;
        const shapeCount = slide.elements.filter((e) => e.type === "SHAPE").length;
        const canMoveLeft = index > 0;
        const canMoveRight = index < slides.length - 1;

        return (
          <div
            key={slide.id}
            onClick={() => onSelectSlide(slide.id)}
            className={`group relative flex-shrink-0 w-24 h-24 rounded-lg border-2 overflow-hidden cursor-pointer transition-all flex flex-col justify-between p-1.5 ${
              isActive
                ? "border-blue-500 bg-neutral-900 shadow-md ring-1 ring-blue-500/50"
                : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
            }`}
            style={{
              backgroundColor: slide.backgroundColor || "#121212",
            }}
          >
            {/* Slide Index Badge & Quick Actions */}
            <div className="flex justify-between items-center z-10">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white leading-none">
                {index + 1}
              </span>

              {/* Hover Actions Bar */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity bg-black/80 rounded p-0.5 shadow">
                {canMoveLeft && onMoveSlideLeft && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSlideLeft(slide.id);
                    }}
                    className="p-1 text-neutral-400 hover:text-white"
                    title="Move Slide Left"
                  >
                    <ChevronLeft className="w-2.5 h-2.5" />
                  </button>
                )}

                {canMoveRight && onMoveSlideRight && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSlideRight(slide.id);
                    }}
                    className="p-1 text-neutral-400 hover:text-white"
                    title="Move Slide Right"
                  >
                    <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateSlide(slide.id);
                  }}
                  className="p-1 text-neutral-400 hover:text-white"
                  title="Duplicate Slide"
                >
                  <Copy className="w-2.5 h-2.5" />
                </button>

                {slides.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSlide(slide.id);
                    }}
                    className="p-1 text-red-400 hover:text-red-300"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Element Layer Summary Indicator */}
            <div className="text-[9px] text-neutral-400 flex items-center justify-between font-mono bg-black/40 px-1 py-0.5 rounded mt-auto">
              <span>{textCount + imageCount + shapeCount} layers</span>
              <div className="flex gap-1 text-[8px]">
                {textCount > 0 && <span className="text-blue-400">T:{textCount}</span>}
                {imageCount > 0 && <span className="text-amber-400">I:{imageCount}</span>}
                {shapeCount > 0 && <span className="text-purple-400">S:{shapeCount}</span>}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add Slide Button */}
      <button
        type="button"
        onClick={onAddSlide}
        className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-neutral-800 hover:border-neutral-600 bg-neutral-900/50 hover:bg-neutral-900 flex flex-col items-center justify-center gap-1.5 text-neutral-400 hover:text-neutral-200 transition-colors"
        title="Add new slide"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[10px] font-medium">Add Slide</span>
      </button>
    </footer>
  );
};
