import { describe, it, expect, beforeEach } from "vitest";
import { StrokeEngine } from "../stroke-engine";
import { Stroke } from "../types";
import { makeCanvasMock } from "./canvas-mock";

function makeTextStroke(id: string, word: string, x: number, y: number): Stroke {
  return {
    id: `text-${id}`,
    tool: "text",
    color: "#333333",
    width: 1,
    fontSize: 18,
    textContent: word,
    textWidth: word.length * 8,
    points: [{ x, y, pressure: 1, tiltX: 0, tiltY: 0, timestamp: 0 }],
  };
}

function makeInkStroke(id: string, points: { x: number; y: number }[]): Stroke {
  return {
    id,
    tool: "pen",
    color: "#000000",
    width: 2,
    points: points.map(p => ({ ...p, pressure: 0.5, tiltX: 0, tiltY: 0, timestamp: 0 })),
  };
}

function makeEraserStroke(id: string, points: { x: number; y: number }[]): Stroke {
  return {
    id,
    tool: "eraser",
    color: "__erase__",
    width: 12,
    points: points.map(p => ({ ...p, pressure: 0.5, tiltX: 0, tiltY: 0, timestamp: 0 })),
  };
}

describe("StrokeEngine", () => {
  let engine: StrokeEngine;

  beforeEach(() => {
    engine = new StrokeEngine(makeCanvasMock());
  });

  // ── getReconstructedText ────────────────────────────────────────────────────

  describe("getReconstructedText", () => {
    it("returns empty string when no text strokes loaded", () => {
      expect(engine.getReconstructedText()).toBe("");
    });

    it("reconstructs a single line of text in word order", () => {
      engine.loadStrokes([
        makeTextStroke("0-0", "Hello", 20, 40),
        makeTextStroke("0-1", "world", 80, 40),
      ]);
      (engine as any).textMeta = { lines: ["Hello world"], fontSize: 18, lineHeight: 28, marginX: 20, marginY: 40 };

      expect(engine.getReconstructedText()).toBe("Hello world");
    });

    it("reconstructs multiple lines in vertical order", () => {
      engine.loadStrokes([
        makeTextStroke("0-0", "Line", 20, 40),
        makeTextStroke("0-1", "one", 60, 40),
        makeTextStroke("1-0", "Line", 20, 68),
        makeTextStroke("1-1", "two", 60, 68),
      ]);
      (engine as any).textMeta = { lines: ["Line one", "Line two"], fontSize: 18, lineHeight: 28, marginX: 20, marginY: 40 };

      expect(engine.getReconstructedText()).toBe("Line one\nLine two");
    });

    it("preserves blank lines between content", () => {
      engine.loadStrokes([
        makeTextStroke("0-0", "First", 20, 40),
        makeTextStroke("2-0", "Third", 20, 96),
      ]);
      (engine as any).textMeta = { lines: ["First", "", "Third"], fontSize: 18, lineHeight: 28, marginX: 20, marginY: 40 };

      expect(engine.getReconstructedText()).toBe("First\n\nThird");
    });

    it("sorts words by x position even if loaded in reverse order", () => {
      engine.loadStrokes([
        makeTextStroke("0-1", "world", 80, 40),
        makeTextStroke("0-0", "Hello", 20, 40),
      ]);
      (engine as any).textMeta = { lines: ["Hello world"], fontSize: 18, lineHeight: 28, marginX: 20, marginY: 40 };

      expect(engine.getReconstructedText()).toBe("Hello world");
    });
  });

  // ── eraseTextStrokesAt ──────────────────────────────────────────────────────

  describe("eraseTextStrokesAt", () => {
    it("removes a text stroke when eraser overlaps it", () => {
      engine.loadStrokes([
        makeTextStroke("0-0", "Hello", 20, 40),
        makeTextStroke("0-1", "world", 80, 40),
      ]);
      (engine as any).textMeta = { lines: ["Hello world"], fontSize: 18, lineHeight: 28, marginX: 20, marginY: 40 };

      (engine as any).eraseTextStrokesAt(40, 35, 20);

      const remaining = engine.getStrokes().filter(s => s.tool === "text");
      expect(remaining).toHaveLength(1);
      expect(remaining[0].textContent).toBe("world");
    });

    it("does not remove a text stroke when eraser is far away", () => {
      engine.loadStrokes([makeTextStroke("0-0", "Hello", 20, 40)]);
      (engine as any).textMeta = { lines: ["Hello"], fontSize: 18, lineHeight: 28, marginX: 20, marginY: 40 };

      (engine as any).eraseTextStrokesAt(400, 400, 20);

      expect(engine.getStrokes()).toHaveLength(1);
    });

    it("removes only words within radius — nearby word survives", () => {
      // "One" at x:20-44, "Two" at x:60-84, "Three" at x:100-140 (all y:22-40)
      // radius=30 centered at (60,35): dist to "One"=16, "Two"=0, "Three"=40
      engine.loadStrokes([
        makeTextStroke("0-0", "One",   20, 40),
        makeTextStroke("0-1", "Two",   60, 40),
        makeTextStroke("0-2", "Three", 100, 40),
      ]);
      (engine as any).textMeta = { lines: ["One Two Three"], fontSize: 18, lineHeight: 28, marginX: 20, marginY: 40 };

      (engine as any).eraseTextStrokesAt(60, 35, 30);

      const remaining = engine.getStrokes().filter(s => s.tool === "text").map(s => s.textContent);
      expect(remaining).toEqual(["Three"]);
    });
  });

  // ── clearInkStrokes ─────────────────────────────────────────────────────────

  describe("clearInkStrokes", () => {
    it("removes pen and eraser strokes but keeps text strokes", () => {
      engine.loadStrokes([
        makeTextStroke("0-0", "Hello", 20, 40),
        makeInkStroke("ink-1", [{ x: 100, y: 100 }, { x: 200, y: 100 }]),
        makeEraserStroke("erase-1", [{ x: 50, y: 50 }, { x: 60, y: 50 }]),
      ]);

      engine.clearInkStrokes();

      const remaining = engine.getStrokes();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].tool).toBe("text");
    });
  });

  // ── clearStrokes ────────────────────────────────────────────────────────────

  describe("clearStrokes", () => {
    it("removes all strokes including text strokes", () => {
      engine.loadStrokes([
        makeTextStroke("0-0", "Hello", 20, 40),
        makeInkStroke("ink-1", [{ x: 100, y: 100 }, { x: 200, y: 100 }]),
      ]);

      engine.clearStrokes();

      expect(engine.hasStrokes()).toBe(false);
    });
  });

  // ── undo ────────────────────────────────────────────────────────────────────

  describe("undo", () => {
    it("removes the last stroke without affecting earlier ones", () => {
      engine.loadStrokes([
        makeTextStroke("0-0", "Hello", 20, 40),
        makeInkStroke("ink-1", [{ x: 100, y: 100 }, { x: 200, y: 100 }]),
      ]);

      engine.undo();

      expect(engine.getStrokes()).toHaveLength(1);
      expect(engine.getStrokes()[0].tool).toBe("text");
    });

    it("does not throw when strokes is empty", () => {
      expect(() => engine.undo()).not.toThrow();
    });
  });

  // ── getStrikethroughRegions ─────────────────────────────────────────────────

  describe("getStrikethroughRegions", () => {
    it("detects a wide horizontal stroke as strikethrough", () => {
      engine.loadStrokes([
        makeInkStroke("strike", [
          { x: 20, y: 50 }, { x: 50, y: 51 }, { x: 100, y: 50 },
          { x: 150, y: 51 }, { x: 200, y: 50 },
        ]),
      ]);

      const regions = engine.getStrikethroughRegions();
      expect(regions).toHaveLength(1);
      expect(regions[0].x1).toBe(20);
      expect(regions[0].x2).toBe(200);
    });

    it("does not flag a short stroke as strikethrough", () => {
      engine.loadStrokes([
        makeInkStroke("short", [{ x: 20, y: 50 }, { x: 40, y: 50 }, { x: 50, y: 50 }]),
      ]);
      expect(engine.getStrikethroughRegions()).toHaveLength(0);
    });

    it("does not flag a vertical stroke as strikethrough", () => {
      engine.loadStrokes([
        makeInkStroke("vertical", [
          { x: 50, y: 20 }, { x: 51, y: 60 }, { x: 50, y: 100 },
          { x: 51, y: 140 }, { x: 50, y: 180 },
        ]),
      ]);
      expect(engine.getStrikethroughRegions()).toHaveLength(0);
    });

    it("does not flag text strokes as strikethroughs", () => {
      engine.loadStrokes([makeTextStroke("0-0", "A long line of text words here", 20, 40)]);
      expect(engine.getStrikethroughRegions()).toHaveLength(0);
    });

    it("does not flag eraser strokes as strikethroughs", () => {
      engine.loadStrokes([
        makeEraserStroke("erase", [
          { x: 20, y: 50 }, { x: 100, y: 50 }, { x: 200, y: 51 }, { x: 300, y: 50 },
        ]),
      ]);
      expect(engine.getStrikethroughRegions()).toHaveLength(0);
    });

    it("does not flag a 2-point stroke (minimum for detection is 3 points)", () => {
      engine.loadStrokes([
        makeInkStroke("two-pts", [{ x: 20, y: 50 }, { x: 200, y: 50 }]),
      ]);
      expect(engine.getStrikethroughRegions()).toHaveLength(0);
    });

    it("detects multiple independent strikethroughs", () => {
      engine.loadStrokes([
        makeInkStroke("s1", [{ x: 20, y: 40 }, { x: 80, y: 40 }, { x: 140, y: 40 }, { x: 200, y: 40 }]),
        makeInkStroke("s2", [{ x: 20, y: 80 }, { x: 80, y: 80 }, { x: 140, y: 80 }, { x: 200, y: 80 }]),
      ]);
      expect(engine.getStrikethroughRegions()).toHaveLength(2);
    });
  });

  // ── erase → reconstruct (critical path) ────────────────────────────────────

  describe("erase then reconstruct", () => {
    it("erased word is excluded from reconstructed text", () => {
      engine.loadStrokes([
        makeTextStroke("0-0", "Hello", 20, 40),
        makeTextStroke("0-1", "world", 80, 40),
      ]);
      (engine as any).textMeta = { lines: ["Hello world"], fontSize: 18, lineHeight: 28, marginX: 20, marginY: 40 };

      (engine as any).eraseTextStrokesAt(40, 35, 20);

      expect(engine.getReconstructedText()).toBe("world");
    });

    it("unerased words remain after partial erase", () => {
      engine.loadStrokes([
        makeTextStroke("0-0", "One", 20, 40),
        makeTextStroke("0-1", "Two", 60, 40),
        makeTextStroke("0-2", "Three", 100, 40),
      ]);
      (engine as any).textMeta = { lines: ["One Two Three"], fontSize: 18, lineHeight: 28, marginX: 20, marginY: 40 };

      (engine as any).eraseTextStrokesAt(70, 35, 15);

      expect(engine.getReconstructedText()).toBe("One Three");
    });
  });

  // ── getTextLineIndexAtY ─────────────────────────────────────────────────────

  describe("getTextLineIndexAtY", () => {
    beforeEach(() => {
      (engine as any).textMeta = { lines: ["Line one", "Line two", "Line three"], fontSize: 18, lineHeight: 28, marginX: 20, marginY: 40 };
    });

    it("returns correct index for a y within the text area", () => {
      expect(engine.getTextLineIndexAtY(40)).toBe(0);  // first baseline
    });

    it("returns null for y above the first line", () => {
      expect(engine.getTextLineIndexAtY(-100)).toBeNull();
    });

    it("returns null for y below the last line", () => {
      expect(engine.getTextLineIndexAtY(9999)).toBeNull();
    });

    it("returns null when textMeta is not set", () => {
      (engine as any).textMeta = null;
      expect(engine.getTextLineIndexAtY(40)).toBeNull();
    });
  });

  // ── appendStrokes / draft restore ──────────────────────────────────────────

  describe("appendStrokes (draft restore)", () => {
    it("adds ink to existing text strokes without replacing them", () => {
      engine.loadStrokes([makeTextStroke("0-0", "Hello", 20, 40)]);
      engine.appendStrokes([makeInkStroke("ink-1", [{ x: 100, y: 100 }, { x: 200, y: 100 }])]);

      const strokes = engine.getStrokes();
      expect(strokes.some(s => s.tool === "text")).toBe(true);
      expect(strokes.some(s => s.tool === "pen")).toBe(true);
      expect(strokes).toHaveLength(2);
    });
  });

  // ── renderExistingText ──────────────────────────────────────────────────────

  describe("renderExistingText", () => {
    it("creates one text stroke per word", () => {
      engine.renderExistingText("Hello world", false);

      const textStrokes = engine.getStrokes().filter(s => s.tool === "text");
      expect(textStrokes).toHaveLength(2);
      const words = textStrokes.map(s => s.textContent).sort();
      expect(words).toEqual(["Hello", "world"]);
    });

    it("creates text strokes for multiple lines", () => {
      engine.renderExistingText("Hello world\nFoo bar", false);

      const textStrokes = engine.getStrokes().filter(s => s.tool === "text");
      expect(textStrokes).toHaveLength(4);
    });

    it("replaces previously loaded text strokes on re-render", () => {
      engine.renderExistingText("First load", false);
      engine.renderExistingText("Second load only", false);

      const words = engine.getStrokes().filter(s => s.tool === "text").map(s => s.textContent);
      expect(words).not.toContain("First");
      expect(words).toContain("Second");
    });

    it("uses dark theme color (#cccccc) in dark mode", () => {
      engine.renderExistingText("Hello", true);
      const textStroke = engine.getStrokes().find(s => s.tool === "text");
      expect(textStroke?.color).toBe("#cccccc");
    });
  });

  // ── full round-trip ─────────────────────────────────────────────────────────

  describe("round-trip: renderExistingText → getReconstructedText", () => {
    it("reconstructs the exact original text", () => {
      engine.renderExistingText("Hello world", false);
      expect(engine.getReconstructedText()).toBe("Hello world");
    });

    it("reconstructs multi-line text", () => {
      engine.renderExistingText("Line one\nLine two", false);
      expect(engine.getReconstructedText()).toBe("Line one\nLine two");
    });

    it("excludes erased word from reconstruction", () => {
      engine.renderExistingText("Hello world", false);
      const helloStroke = engine.getStrokes().find(s => s.textContent === "Hello")!;
      const { x, y } = helloStroke.points[0];
      (engine as any).eraseTextStrokesAt(x + 10, y - 5, 30);
      expect(engine.getReconstructedText()).toBe("world");
    });

    it("returns empty string after all words erased", () => {
      engine.renderExistingText("Hi", false);
      (engine as any).eraseTextStrokesAt(400, 400, 1000);
      expect(engine.getReconstructedText()).toBe("");
    });
  });

  // ── getInkOnlyImageDataUrl ──────────────────────────────────────────────────

  describe("getInkOnlyImageDataUrl", () => {
    it("returns null when there are no ink strokes", () => {
      engine.loadStrokes([makeTextStroke("0-0", "Hello", 20, 40)]);
      expect(engine.getInkOnlyImageDataUrl()).toBeNull();
    });

    it("returns a string when ink strokes exist", () => {
      engine.loadStrokes([
        makeInkStroke("ink-1", [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 }]),
      ]);
      expect(typeof engine.getInkOnlyImageDataUrl()).toBe("string");
    });
  });

  // ── hasStrokes ──────────────────────────────────────────────────────────────

  describe("hasStrokes", () => {
    it("returns true with only text strokes — conversion is still valid", () => {
      engine.loadStrokes([makeTextStroke("0-0", "Hello", 20, 40)]);
      expect(engine.hasStrokes()).toBe(true);
    });
  });
});
