"use client";

import React, { useRef, useEffect } from "react";
import {
  Text as KonvaText,
  Image as KonvaImage,
  Rect as KonvaRect,
  Circle as KonvaCircle,
  Transformer,
} from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import type {
  EditorElement,
  TextElement,
  ImageElement,
  ShapeElement,
} from "../types";

interface ElementRendererProps {
  element: EditorElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, updates: Partial<EditorElement>) => void;
}

export const ElementRenderer: React.FC<ElementRendererProps> = ({
  element,
  isSelected,
  onSelect,
  onChange,
}) => {
  if (!element.visible) return null;

  switch (element.type) {
    case "TEXT":
      return (
        <TextElementComponent
          element={element}
          isSelected={isSelected}
          onSelect={onSelect}
          onChange={onChange}
        />
      );
    case "IMAGE":
      return (
        <ImageElementComponent
          element={element}
          isSelected={isSelected}
          onSelect={onSelect}
          onChange={onChange}
        />
      );
    case "SHAPE":
      return (
        <ShapeElementComponent
          element={element}
          isSelected={isSelected}
          onSelect={onSelect}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
};

const TextElementComponent: React.FC<{
  element: TextElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, updates: Partial<TextElement>) => void;
}> = ({ element, isSelected, onSelect, onChange }) => {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaText
        ref={shapeRef}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        text={element.text}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily}
        fill={element.color}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth ?? 0}
        fillAfterStrokeEnabled={!!element.stroke}
        align={element.align}
        opacity={element.opacity}
        rotation={element.rotation}
        draggable={!element.locked}
        onClick={() => onSelect(element.id)}
        onTap={() => onSelect(element.id)}
        onDragEnd={(e) => {
          onChange(element.id, {
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          node.scaleX(1);
          node.scaleY(1);

          onChange(element.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(50, node.width() * scaleX),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && !element.locked && (
        <Transformer
          ref={trRef}
          enabledAnchors={["middle-left", "middle-right"]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 50) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
};

const ImageElementComponent: React.FC<{
  element: ImageElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, updates: Partial<ImageElement>) => void;
}> = ({ element, isSelected, onSelect, onChange }) => {
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [image] = useImage(element.src, "anonymous");

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, image]);

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        id={element.id}
        image={image}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        opacity={element.opacity}
        rotation={element.rotation}
        draggable={!element.locked}
        onClick={() => onSelect(element.id)}
        onTap={() => onSelect(element.id)}
        onDragEnd={(e) => {
          onChange(element.id, {
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);

          onChange(element.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(20, element.width * scaleX),
            height: Math.max(20, element.height * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && !element.locked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
};

const ShapeElementComponent: React.FC<{
  element: ShapeElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, updates: Partial<ShapeElement>) => void;
}> = ({ element, isSelected, onSelect, onChange }) => {
  const circleRef = useRef<Konva.Circle>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const isCircle = element.shapeType === "circle";

  useEffect(() => {
    const node = isCircle ? circleRef.current : rectRef.current;
    if (isSelected && trRef.current && node) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isCircle]);

  return (
    <>
      {isCircle ? (
        <KonvaCircle
          ref={circleRef}
          id={element.id}
          x={element.x + element.width / 2}
          y={element.y + element.height / 2}
          radius={element.width / 2}
          fill={element.fillColor}
          stroke={element.strokeColor}
          strokeWidth={element.strokeWidth ?? 0}
          opacity={element.opacity}
          rotation={element.rotation}
          draggable={!element.locked}
          onClick={() => onSelect(element.id)}
          onTap={() => onSelect(element.id)}
          onDragEnd={(e) => {
            onChange(element.id, {
              x: e.target.x() - element.width / 2,
              y: e.target.y() - element.height / 2,
            });
          }}
          onTransformEnd={() => {
            const node = circleRef.current;
            if (!node) return;
            const scaleX = node.scaleX();
            node.scaleX(1);
            node.scaleY(1);
            const newRadius = Math.max(10, (element.width / 2) * scaleX);

            onChange(element.id, {
              x: node.x() - newRadius,
              y: node.y() - newRadius,
              width: newRadius * 2,
              height: newRadius * 2,
              rotation: node.rotation(),
            });
          }}
        />
      ) : (
        <KonvaRect
          ref={rectRef}
          id={element.id}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          fill={element.fillColor}
          stroke={element.strokeColor}
          strokeWidth={element.strokeWidth ?? 0}
          cornerRadius={element.cornerRadius}
          opacity={element.opacity}
          rotation={element.rotation}
          draggable={!element.locked}
          onClick={() => onSelect(element.id)}
          onTap={() => onSelect(element.id)}
          onDragEnd={(e) => {
            onChange(element.id, {
              x: e.target.x(),
              y: e.target.y(),
            });
          }}
          onTransformEnd={() => {
            const node = rectRef.current;
            if (!node) return;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            node.scaleX(1);
            node.scaleY(1);

            onChange(element.id, {
              x: node.x(),
              y: node.y(),
              width: Math.max(20, element.width * scaleX),
              height: Math.max(20, element.height * scaleY),
              rotation: node.rotation(),
            });
          }}
        />
      )}
      {isSelected && !element.locked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
};
