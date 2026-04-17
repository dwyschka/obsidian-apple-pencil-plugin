// Minimal canvas 2D context mock sufficient to instantiate StrokeEngine
export function makeCanvasMock(): HTMLCanvasElement {
  const ctx: Partial<CanvasRenderingContext2D> = {
    setTransform: () => {},
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    stroke: () => {},
    fill: () => {},
    fillText: () => {},
    save: () => {},
    restore: () => {},
    measureText: (text: string) => ({ width: text.length * 8 } as TextMetrics),
    lineCap: "round" as CanvasLineCap,
    lineJoin: "round" as CanvasLineJoin,
    lineWidth: 1,
    strokeStyle: "#000",
    fillStyle: "#000",
    globalCompositeOperation: "source-over" as GlobalCompositeOperation,
    font: "",
    textBaseline: "alphabetic" as CanvasTextBaseline,
  };

  const canvas = {
    width: 800,
    height: 600,
    style: { width: "", height: "" },
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} }),
    addEventListener: () => {},
    removeEventListener: () => {},
    setPointerCapture: () => {},
  } as unknown as HTMLCanvasElement;

  return canvas;
}
