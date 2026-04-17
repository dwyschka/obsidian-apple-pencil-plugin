import { describe, it, expect } from "vitest";
import { applyStrikethroughs } from "../text-utils";
import { StrikethroughRegion } from "../types";

// marginY=40, lineHeight=28
function lineIndexAtY(y: number): number | null {
  const idx = Math.round((y - 40) / 28);
  if (idx >= 0 && idx < 5) return idx;
  return null;
}

describe("applyStrikethroughs", () => {
  it("returns text unchanged when no regions", () => {
    expect(applyStrikethroughs("Hello\nWorld", [], lineIndexAtY)).toBe("Hello\nWorld");
  });

  it("wraps the matched line in strikethrough markdown", () => {
    const regions: StrikethroughRegion[] = [{ x1: 20, y1: 38, x2: 200, y2: 42 }]; // midY=40 → line 0
    expect(applyStrikethroughs("Hello\nWorld", regions, lineIndexAtY)).toBe("~~Hello~~\nWorld");
  });

  it("does not wrap blank lines even when matched", () => {
    const regions: StrikethroughRegion[] = [{ x1: 20, y1: 38, x2: 200, y2: 42 }]; // midY=40 → line 0
    expect(applyStrikethroughs("\nWorld", regions, lineIndexAtY)).toBe("\nWorld");
  });

  it("wraps multiple lines when multiple regions match", () => {
    const regions: StrikethroughRegion[] = [
      { x1: 20, y1: 38, x2: 200, y2: 42 }, // line 0
      { x1: 20, y1: 66, x2: 200, y2: 70 }, // line 1
    ];
    expect(applyStrikethroughs("Hello\nWorld", regions, lineIndexAtY)).toBe("~~Hello~~\n~~World~~");
  });

  it("skips region when getLineIndexAtY returns null", () => {
    const regions: StrikethroughRegion[] = [{ x1: 20, y1: 9000, x2: 200, y2: 9010 }];
    expect(applyStrikethroughs("Hello\nWorld", regions, lineIndexAtY)).toBe("Hello\nWorld");
  });

  it("trims whitespace from struck lines", () => {
    const regions: StrikethroughRegion[] = [{ x1: 20, y1: 38, x2: 200, y2: 42 }];
    expect(applyStrikethroughs("  Hello  \nWorld", regions, lineIndexAtY)).toBe("~~Hello~~\nWorld");
  });
});
