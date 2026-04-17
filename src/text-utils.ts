import { StrikethroughRegion } from "./types";

export function applyStrikethroughs(
  text: string,
  regions: StrikethroughRegion[],
  getLineIndexAtY: (y: number) => number | null
): string {
  if (regions.length === 0) return text;

  const struckLineIndices = new Set<number>();
  for (const region of regions) {
    const midY = (region.y1 + region.y2) / 2;
    const idx = getLineIndexAtY(midY);
    if (idx !== null) struckLineIndices.add(idx);
  }

  return text
    .split("\n")
    .map((line, i) =>
      struckLineIndices.has(i) && line.trim() ? `~~${line.trim()}~~` : line
    )
    .join("\n");
}
