export interface CanvasFitParams {
  containerWidth: number;
  containerHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  padding?: number;
}

export function calculateFitScale(params: CanvasFitParams): number {
  const padding = params.padding ?? 40;
  const availableWidth = Math.max(100, params.containerWidth - padding * 2);
  const availableHeight = Math.max(100, params.containerHeight - padding * 2);

  const scaleX = availableWidth / params.canvasWidth;
  const scaleY = availableHeight / params.canvasHeight;

  return Math.min(scaleX, scaleY, 1.5);
}

export function snapToGrid(value: number, gridSize = 10): number {
  return Math.round(value / gridSize) * gridSize;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
