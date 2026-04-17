export {};
// Mock HTMLCanvasElement.getContext so happy-dom's canvas returns a usable stub
const ctx2dStub = {
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
  lineCap: "round",
  lineJoin: "round",
  lineWidth: 1,
  strokeStyle: "#000",
  fillStyle: "#000",
  globalCompositeOperation: "source-over",
  font: "",
  textBaseline: "alphabetic",
};

// @ts-ignore
HTMLCanvasElement.prototype.getContext = () => ctx2dStub;
