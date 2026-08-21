export type ExportFormat = "png" | "jpg";

export interface ExportOptions {
  format: ExportFormat;
  quality?: number; // Quality for JPG (default: 0.92)
}

export interface ExportProgress {
  current: number;
  total: number;
  message: string;
}
