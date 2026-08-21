import type { SKRSContext2D } from "@napi-rs/canvas";
import type { RenderTextProperties } from "@/types/rendering";

export function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split("\n");
  const resultLines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      resultLines.push("");
      continue;
    }

    const words = paragraph.split(" ");
    let currentLine = words[0] ?? "";

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      const testLine = `${currentLine} ${word}`;
      const metrics = ctx.measureText(testLine);

      if (metrics.width <= maxWidth) {
        currentLine = testLine;
      } else {
        resultLines.push(currentLine);
        currentLine = word;
      }
    }
    resultLines.push(currentLine);
  }

  return resultLines;
}

export function drawTextElement(
  ctx: SKRSContext2D,
  props: RenderTextProperties,
  x: number,
  y: number,
  width: number,
): number {
  const fontSize = props.fontSize || 48;
  const fontFamily = props.fontFamily || "Inter, sans-serif";
  const align = props.align || "left";
  const color = props.color || "#FFFFFF";
  const stroke = props.stroke;
  const strokeWidth = props.strokeWidth ?? (stroke ? 8 : 0);
  const lineSpacingRatio = props.lineHeight ?? 1.25;

  ctx.save();
  ctx.font = `normal ${fontSize}px ${fontFamily}, "Noto Color Emoji", sans-serif`;
  ctx.textBaseline = "top";

  const lines = wrapText(ctx, props.text, width);
  const lineHeight = fontSize * lineSpacingRatio;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const metrics = ctx.measureText(line);
    let lineX = x;

    if (align === "center") {
      lineX = x + (width - metrics.width) / 2;
    } else if (align === "right") {
      lineX = x + width - metrics.width;
    }

    const lineY = y + i * lineHeight;

    if (stroke && strokeWidth > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = "round";
      ctx.strokeText(line, lineX, lineY);
    }

    ctx.fillStyle = color;
    ctx.fillText(line, lineX, lineY);
  }

  ctx.restore();
  return lines.length * lineHeight;
}
