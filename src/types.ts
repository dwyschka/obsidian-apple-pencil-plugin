export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
  tool: DrawingTool;
  // Text stroke fields
  textContent?: string;
  textWidth?: number;
  fontSize?: number;
}

export type DrawingTool = "pen" | "highlighter" | "eraser" | "text";

export type OCRProvider = "tesseract" | "openai" | "google" | "claude" | "gemini" | "openai-compatible";

export interface StrikethroughRegion {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RenderedTextMeta {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  marginX: number;
  marginY: number;
}

export interface PencilDraft {
  noteFile: string;
  strokes: Stroke[];
  canvasWidth: number;
  canvasHeight: number;
  savedAt: number;
}

export interface PencilPluginSettings {
  ocrProvider: OCRProvider;
  // Secret IDs — actual values stored in app.secretStorage, not here
  openaiSecretId: string;
  googleSecretId: string;
  claudeSecretId: string;
  geminiSecretId: string;
  // OpenAI-compatible local/custom provider
  openaiCompatibleBaseUrl: string;
  openaiCompatibleModel: string;
  openaiCompatibleApiKey: string;
  defaultPenColor: string;
  defaultPenWidth: number;
  insertionMode: "append" | "cursor" | "newline";
  autosaveOnExit: boolean;
}

export const DEFAULT_SETTINGS: PencilPluginSettings = {
  ocrProvider: "tesseract",
  openaiSecretId: "",
  googleSecretId: "",
  claudeSecretId: "",
  geminiSecretId: "",
  openaiCompatibleBaseUrl: "http://localhost:11434",
  openaiCompatibleModel: "llava",
  openaiCompatibleApiKey: "",
  defaultPenColor: "#000000",
  defaultPenWidth: 2,
  insertionMode: "newline",
  autosaveOnExit: true,
};
