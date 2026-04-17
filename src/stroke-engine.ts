import { Stroke, StrokePoint, DrawingTool, StrikethroughRegion, RenderedTextMeta } from "./types";

export class StrokeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private strokes: Stroke[] = [];
  private currentStroke: Stroke | null = null;
  private isDrawing = false;
  private tool: DrawingTool = "pen";
  private previousTool: DrawingTool = "pen";
  private isFingerErasing = false;
  private color = "#000000";
  private width = 2;
  private onChangeCallback: (() => void) | null = null;
  private textMeta: RenderedTextMeta | null = null;
  private isDarkTheme = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.dpr = window.devicePixelRatio || 1;
    this.ctx = canvas.getContext("2d")!;
    this.setupContext();
    this.bindEvents();
  }

  private setupContext() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  private bindEvents() {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
  }

  private onPointerDown = (e: PointerEvent) => {
    // Finger = temporary eraser, ignore palms
    if (e.pointerType === "touch") {
      if (e.width > 120 || e.height > 120) return;
      e.preventDefault();
      this.canvas.setPointerCapture(e.pointerId);
      this.isFingerErasing = true;
      this.previousTool = this.tool;
      this.tool = "eraser";
      this.startStroke(e);
      return;
    }

    if (e.pointerType !== "pen" && e.pointerType !== "mouse") return;
    if (this.isFingerErasing) {
      this.isFingerErasing = false;
      this.tool = this.previousTool;
    }
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.isDrawing = true;
    this.startStroke(e);
  };

  private startStroke(e: PointerEvent) {
    this.currentStroke = {
      id: crypto.randomUUID(),
      points: [this.getPoint(e)],
      color: this.tool === "eraser" ? "__erase__" : this.color,
      width: this.tool === "eraser" ? this.width * 6 : this.width,
      tool: this.tool,
    };
  }

  private eraseTextStrokesAt(x: number, y: number, radius: number) {
    this.strokes = this.strokes.filter(s => {
      if (s.tool !== "text" || !s.textContent) return true;
      const sx = s.points[0].x;
      const sy = s.points[0].y;
      const w = s.textWidth ?? 0;
      const h = s.fontSize ?? 18;
      // Hit test: circle vs word bounding box
      const nearestX = Math.max(sx, Math.min(x, sx + w));
      const nearestY = Math.max(sy - h, Math.min(y, sy));
      const dx = x - nearestX;
      const dy = y - nearestY;
      return dx * dx + dy * dy > radius * radius;
    });
  }

  private onPointerMove = (e: PointerEvent) => {
    if (this.isFingerErasing && e.pointerType === "touch") {
      if (e.width > 120 || e.height > 120) return;
      e.preventDefault();
      if (this.currentStroke) {
        const pt = this.getPoint(e);
        this.currentStroke.points.push(pt);
        this.eraseTextStrokesAt(pt.x, pt.y, this.currentStroke.width / 2);
        this.redraw();
      }
      return;
    }
    if (!this.isDrawing || !this.currentStroke) return;
    e.preventDefault();

    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events) {
      const pt = this.getPoint(ev);
      this.currentStroke.points.push(pt);
      if (this.tool === "eraser") {
        this.eraseTextStrokesAt(pt.x, pt.y, this.currentStroke.width / 2);
      }
    }
    this.redraw();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.isFingerErasing) {
      this.isFingerErasing = false;
      this.tool = this.previousTool;
      if (this.currentStroke && this.currentStroke.points.length > 0) {
        this.strokes.push(this.currentStroke);
        this.currentStroke = null;
        this.onChangeCallback?.();
      }
      return;
    }
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentStroke && this.currentStroke.points.length > 0) {
      this.strokes.push(this.currentStroke);
      this.currentStroke = null;
      this.onChangeCallback?.();
    }
  };

  private getPoint(e: PointerEvent): StrokePoint {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
      tiltX: e.tiltX || 0,
      tiltY: e.tiltY || 0,
      timestamp: e.timeStamp,
    };
  }

  // Separator stroke ID prefix — used to identify text strokes vs ink strokes
  private static TEXT_STROKE_PREFIX = "text-";

  renderExistingText(content: string, isDark: boolean) {
    this.isDarkTheme = isDark;
    const fontSize = 18;
    const lineHeight = 28;
    const marginX = 20;
    const marginY = 40;
    const maxWidth = (this.canvas.width / this.dpr) - marginX * 2;

    // Remove any previously loaded text strokes
    this.strokes = this.strokes.filter(
      (s) => !s.id.startsWith(StrokeEngine.TEXT_STROKE_PREFIX)
    );

    const m = document.createElement("canvas").getContext("2d")!;
    m.font = `${fontSize}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    const spaceW = m.measureText(" ").width;
    const textColor = isDark ? "#cccccc" : "#333333";

    const rawLines = content.split("\n");
    const lines = this.wrapLines(rawLines, fontSize, maxWidth, m);
    this.textMeta = { lines, fontSize, lineHeight, marginX, marginY };

    // Create one text stroke per word
    let lineIndex = 0;
    for (const line of lines) {
      if (!line.trim()) { lineIndex++; continue; }
      let cursorX = marginX;
      const baselineY = marginY + lineIndex * lineHeight;
      const words = line.split(" ");
      let wordIndex = 0;
      for (const word of words) {
        if (!word) { cursorX += spaceW; continue; }
        const w = m.measureText(word).width;
        this.strokes.unshift({
          id: `${StrokeEngine.TEXT_STROKE_PREFIX}${lineIndex}-${wordIndex}`,
          tool: "text",
          color: textColor,
          width: 1,
          fontSize,
          textContent: word,
          textWidth: w,
          points: [{ x: cursorX, y: baselineY, pressure: 1, tiltX: 0, tiltY: 0, timestamp: 0 }],
        });
        cursorX += w + spaceW;
        wordIndex++;
      }
      lineIndex++;
    }

    this.redraw();
  }

  private wrapLines(
    rawLines: string[],
    fontSize: number,
    maxWidth: number,
    m?: CanvasRenderingContext2D
  ): string[] {
    const ctx = m ?? (() => {
      const c = document.createElement("canvas").getContext("2d")!;
      c.font = `${fontSize}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
      return c;
    })();
    const result: string[] = [];
    for (const line of rawLines) {
      if (!line.trim()) { result.push(""); continue; }
      const words = line.split(" ");
      let current = "";
      for (const word of words) {
        const test = current ? current + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && current) {
          result.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) result.push(current);
    }
    return result;
  }

  private drawRuledLines(ctx: CanvasRenderingContext2D) {
    const logicalHeight = this.canvas.height / this.dpr;
    const logicalWidth = this.canvas.width / this.dpr;
    const lineSpacing = this.textMeta?.lineHeight ?? 36;
    const startY = this.textMeta?.marginY ?? lineSpacing;
    ctx.save();
    ctx.strokeStyle = this.isDarkTheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    for (let y = startY; y < logicalHeight; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(logicalWidth, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const bgColor = this.isDarkTheme ? "#1e1e1e" : "#ffffff";
    for (const stroke of this.strokes) {
      this.drawStroke(this.ctx, stroke, bgColor);
    }
    if (this.currentStroke) {
      this.drawStroke(this.ctx, this.currentStroke, bgColor);
    }
    // Ruled lines drawn last so they always appear over erasures
    this.drawRuledLines(this.ctx);
  }

  private drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, bgColor: string) {
    if (stroke.tool === "text" && stroke.textContent) {
      ctx.font = `${stroke.fontSize ?? 18}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillStyle = stroke.color;
      ctx.textBaseline = "alphabetic";
      ctx.globalCompositeOperation = "source-over";
      ctx.fillText(stroke.textContent, stroke.points[0].x, stroke.points[0].y);
      return;
    }
    if (stroke.points.length < 2) return;

    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = bgColor;
      ctx.lineWidth = stroke.width;
    } else if (stroke.tool === "highlighter") {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = stroke.color + "80";
      ctx.lineWidth = stroke.width * 6;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
    }

    const [first, ...rest] = stroke.points;
    ctx.moveTo(first.x, first.y);
    for (let i = 0; i < rest.length - 1; i++) {
      const curr = rest[i];
      const next = rest[i + 1];
      ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
    }
    ctx.lineTo(rest[rest.length - 1].x, rest[rest.length - 1].y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  getStrikethroughRegions(): StrikethroughRegion[] {
    const regions: StrikethroughRegion[] = [];
    for (const stroke of this.strokes) {
      if (stroke.tool === "eraser") continue;
      if (stroke.points.length < 3) continue;
      const xs = stroke.points.map((p) => p.x);
      const ys = stroke.points.map((p) => p.y);
      const dx = Math.max(...xs) - Math.min(...xs);
      const dy = Math.max(...ys) - Math.min(...ys);
      if (dx >= 60 && dx / (dy + 1) > 4) {
        regions.push({ x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) });
      }
    }
    return regions;
  }

  getTextLineIndexAtY(y: number): number | null {
    if (!this.textMeta) return null;
    const { lineHeight, marginY, lines } = this.textMeta;
    const idx = Math.round((y - marginY) / lineHeight);
    if (idx >= 0 && idx < lines.length) return idx;
    return null;
  }

  // Reconstruct the surviving text from remaining text strokes (respects erasures).
  getReconstructedText(): string {
    if (!this.textMeta) return "";
    const { lineHeight, marginY } = this.textMeta;
    const textStrokes = this.strokes.filter(s => s.tool === "text" && s.textContent);
    if (textStrokes.length === 0) return "";

    const lineMap = new Map<number, Stroke[]>();
    for (const s of textStrokes) {
      const idx = Math.round((s.points[0].y - marginY) / lineHeight);
      if (!lineMap.has(idx)) lineMap.set(idx, []);
      lineMap.get(idx)!.push(s);
    }

    const maxLine = Math.max(...lineMap.keys());
    const lines: string[] = [];
    for (let i = 0; i <= maxLine; i++) {
      const row = lineMap.get(i);
      if (!row || row.length === 0) { lines.push(""); continue; }
      lines.push(row.sort((a, b) => a.points[0].x - b.points[0].x).map(s => s.textContent!).join(" "));
    }
    return lines.join("\n");
  }

  // Render only ink strokes (pen/highlighter) for OCR — no text, no eraser.
  getInkOnlyImageDataUrl(): string | null {
    const inkStrokes = this.strokes.filter(s => s.tool === "pen" || s.tool === "highlighter");
    if (inkStrokes.length === 0) return null;

    const offscreen = document.createElement("canvas");
    offscreen.width = this.canvas.width;
    offscreen.height = this.canvas.height;
    const ctx = offscreen.getContext("2d")!;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, offscreen.width / this.dpr, offscreen.height / this.dpr);
    for (const stroke of inkStrokes) {
      this.drawStroke(ctx, { ...stroke, color: "#000000" }, "#ffffff");
    }
    return offscreen.toDataURL("image/png");
  }

  getCanvasImageDataUrl(): string {
    const offscreen = document.createElement("canvas");
    offscreen.width = this.canvas.width;
    offscreen.height = this.canvas.height;
    const ctx = offscreen.getContext("2d")!;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, offscreen.width / this.dpr, offscreen.height / this.dpr);
    for (const stroke of this.strokes) {
      const s = stroke.tool === "text" ? { ...stroke, color: "#000000" } : stroke;
      this.drawStroke(ctx, s, "#ffffff");
    }
    return offscreen.toDataURL("image/png");
  }

  setTool(tool: DrawingTool) { this.tool = tool; }
  setColor(color: string) { this.color = color; }
  setWidth(width: number) { this.width = width; }
  getStrokes(): Stroke[] { return this.strokes; }

  loadStrokes(strokes: Stroke[]) {
    this.strokes = strokes;
    this.redraw();
  }

  appendStrokes(strokes: Stroke[]) {
    this.strokes.push(...strokes);
    this.redraw();
  }

  clearStrokes() {
    this.strokes = [];
    this.redraw();
    this.onChangeCallback?.();
  }

  // Clears only ink/eraser strokes, preserving text strokes (background note content).
  clearInkStrokes() {
    this.strokes = this.strokes.filter(s => s.tool === "text");
    this.redraw();
    this.onChangeCallback?.();
  }

  undo() {
    if (this.strokes.length > 0) {
      this.strokes.pop();
      this.redraw();
      this.onChangeCallback?.();
    }
  }

  hasStrokes(): boolean {
    return this.strokes.length > 0;
  }

  resize(cssWidth: number, cssHeight: number) {
    this.canvas.width = cssWidth * this.dpr;
    this.canvas.height = cssHeight * this.dpr;
    this.canvas.style.width = cssWidth + "px";
    this.canvas.style.height = cssHeight + "px";
    this.setupContext();
    this.redraw();
  }

  onChange(cb: () => void) { this.onChangeCallback = cb; }

  destroy() {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }
}
