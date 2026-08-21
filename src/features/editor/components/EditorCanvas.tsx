"use client";

import React, { useRef } from "react";
import { Stage, Layer, Rect, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import type { EditorSlide, EditorElement } from "../types";
import { ElementRenderer } from "./ElementRenderer";

interface EditorCanvasProps {
  slide: EditorSlide;
  width: number;
  height: number;
  scale: number;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  slide,
  width,
  height,
  scale,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
}) => {
  const stageRef = useRef<Konva.Stage>(null);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If clicked on the stage background itself, clear selection
    if (e.target === e.target.getStage() || e.target.name() === "slide-background") {
      onSelectElement(null);
    }
  };

  const sortedElements = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      className="relative flex items-center justify-center p-8 overflow-auto bg-neutral-900 shadow-inner select-none h-full w-full"
      style={{ minHeight: "400px" }}
    >
      <div
        className="shadow-2xl rounded-sm overflow-hidden bg-white border border-neutral-800"
        style={{
          width: width * scale,
          height: height * scale,
        }}
      >
        <Stage
          ref={stageRef}
          width={width * scale}
          height={height * scale}
          scaleX={scale}
          scaleY={scale}
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          <Layer>
            {/* Background Color */}
            <Rect
              name="slide-background"
              x={0}
              y={0}
              width={width}
              height={height}
              fill={slide.backgroundColor || "#FFFFFF"}
            />

            {/* Background Image */}
            {slide.backgroundImageUrl && (
              <SlideBackgroundImage
                src={slide.backgroundImageUrl}
                width={width}
                height={height}
              />
            )}

            {/* Slide Elements */}
            {sortedElements.map((element) => (
              <ElementRenderer
                key={element.id}
                element={element}
                isSelected={element.id === selectedElementId}
                onSelect={(id) => onSelectElement(id)}
                onChange={onUpdateElement}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

const SlideBackgroundImage: React.FC<{
  src: string;
  width: number;
  height: number;
}> = ({ src, width, height }) => {
  const [image] = useImage(src, "anonymous");
  if (!image) return null;

  const scale = Math.max(width / image.width, height / image.height);
  const imgW = image.width * scale;
  const imgH = image.height * scale;
  const imgX = (width - imgW) / 2;
  const imgY = (height - imgH) / 2;

  return (
    <KonvaImage
      name="slide-bg-image"
      image={image}
      x={imgX}
      y={imgY}
      width={imgW}
      height={imgH}
      listening={false}
    />
  );
};
