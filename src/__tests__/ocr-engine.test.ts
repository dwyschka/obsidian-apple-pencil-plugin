import { describe, it, expect } from "vitest";
import { OCREngine } from "../ocr-engine";

describe("OCREngine", () => {
  describe("API key validation", () => {
    it("throws when OpenAI key is missing", async () => {
      const engine = new OCREngine("openai");
      await expect(engine.recognize("data:image/png;base64,abc", {})).rejects.toThrow("OpenAI API key not configured");
    });

    it("throws when Google key is missing", async () => {
      const engine = new OCREngine("google");
      await expect(engine.recognize("data:image/png;base64,abc", {})).rejects.toThrow("Google API key not configured");
    });

    it("throws when Claude key is missing", async () => {
      const engine = new OCREngine("claude");
      await expect(engine.recognize("data:image/png;base64,abc", {})).rejects.toThrow("Anthropic API key not configured");
    });

    it("throws when Gemini key is missing", async () => {
      const engine = new OCREngine("gemini");
      await expect(engine.recognize("data:image/png;base64,abc", {})).rejects.toThrow("Gemini API key not configured");
    });
  });

  describe("setProvider", () => {
    it("switches provider so next recognize uses the new one", async () => {
      const engine = new OCREngine("openai");
      engine.setProvider("google");
      await expect(engine.recognize("data:image/png;base64,abc", {})).rejects.toThrow("Google API key not configured");
    });
  });
});
