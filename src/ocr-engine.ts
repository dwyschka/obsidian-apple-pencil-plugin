import { requestUrl } from "obsidian";
import { OCRProvider } from "./types";

export interface OCRKeys {
  openai?: string;
  google?: string;
  claude?: string;
  gemini?: string;
}

export class OCREngine {
  private provider: OCRProvider;
  private tesseractWorker: any = null;

  constructor(provider: OCRProvider) {
    this.provider = provider;
  }

  async recognize(imageDataUrl: string, keys: OCRKeys = {}): Promise<string> {
    switch (this.provider) {
      case "tesseract":
        return this.recognizeWithTesseract(imageDataUrl);
      case "openai":
        return this.recognizeWithOpenAI(imageDataUrl, keys.openai ?? "");
      case "google":
        return this.recognizeWithGoogle(imageDataUrl, keys.google ?? "");
      case "claude":
        return this.recognizeWithClaude(imageDataUrl, keys.claude ?? "");
      case "gemini":
        return this.recognizeWithGemini(imageDataUrl, keys.gemini ?? "");
    }
  }

  private async postJson(
    url: string,
    body: unknown,
    headers: Record<string, string>,
    errorLabel: string
  ): Promise<any> {
    const response = await requestUrl({
      url,
      method: "POST",
      contentType: "application/json",
      headers,
      body: JSON.stringify(body),
      throw: false,
    });

    if (response.status >= 400) {
      throw new Error(`${errorLabel}: ${this.getErrorMessage(response)}`);
    }

    return response.json;
  }

  private getErrorMessage(response: { status: number; json: any; text: string }): string {
    const candidates = [
      response.json?.error?.message,
      response.json?.error?.status,
      response.json?.message,
      response.text?.trim(),
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.length > 0) {
        return candidate;
      }
    }

    return `HTTP ${response.status}`;
  }

  private async recognizeWithTesseract(imageDataUrl: string): Promise<string> {
    // Lazy-load Tesseract to avoid paying the cost unless used
    if (!this.tesseractWorker) {
      const { createWorker } = await import("tesseract.js");
      this.tesseractWorker = await createWorker("eng");
    }
    const { data } = await this.tesseractWorker.recognize(imageDataUrl);
    return data.text.trim();
  }

  private async recognizeWithOpenAI(imageDataUrl: string, key: string): Promise<string> {
    if (!key) throw new Error("OpenAI API key not configured.");

    const json = await this.postJson(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcribe the handwritten text in this image exactly as written. Return only the transcribed text, no commentary. Preserve paragraph breaks.",
              },
              {
                type: "image_url",
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
        max_tokens: 2000,
      },
      {
        Authorization: `Bearer ${key}`,
      },
      "OpenAI error"
    );
    return json.choices[0].message.content.trim();
  }

  private async recognizeWithGoogle(imageDataUrl: string, key: string): Promise<string> {
    if (!key) throw new Error("Google API key not configured.");

    // Strip the data URL prefix
    const base64 = imageDataUrl.split(",")[1];

    const json = await this.postJson(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      {
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      },
      {},
      "Google Vision error"
    );
    const annotation = json.responses[0]?.fullTextAnnotation;
    if (!annotation) return "";

    // Reconstruct using symbol-level break markers so spacing is accurate.
    // SPACE/SURE_SPACE → space, EOL_SURE_SPACE/LINE_BREAK → newline, PARAGRAPH break → blank line
    let result = "";
    for (const page of annotation.pages ?? []) {
      for (const block of page.blocks ?? []) {
        for (const para of block.paragraphs ?? []) {
          for (const word of para.words ?? []) {
            for (const symbol of word.symbols ?? []) {
              result += symbol.text ?? "";
              const breakType = symbol.property?.detectedBreak?.type;
              if (breakType === "SPACE" || breakType === "SURE_SPACE") {
                result += " ";
              } else if (breakType === "EOL_SURE_SPACE" || breakType === "LINE_BREAK") {
                result += "\n";
              } else if (breakType === "HYPHEN") {
                result += "-\n";
              }
            }
          }
          // Paragraph break = blank line
          result += "\n";
        }
      }
    }
    // Collapse 3+ newlines to double, trim trailing whitespace per line
    return result
      .split("\n")
      .map((l) => l.trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private async recognizeWithClaude(imageDataUrl: string, key: string): Promise<string> {
    if (!key) throw new Error("Anthropic API key not configured.");

    const base64 = imageDataUrl.split(",")[1];
    const mediaType = imageDataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    const json = await this.postJson(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: "Transcribe all handwritten text in this image exactly as written. Preserve paragraph breaks. Return only the transcribed text with no commentary.",
              },
            ],
          },
        ],
      },
      {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      "Claude API error"
    );
    return json.content[0]?.text?.trim() ?? "";
  }

  private async recognizeWithGemini(imageDataUrl: string, key: string): Promise<string> {
    if (!key) throw new Error("Gemini API key not configured.");

    const base64 = imageDataUrl.split(",")[1];
    const mimeType = imageDataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    const json = await this.postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: "Transcribe all handwritten text in this image exactly as written. Preserve paragraph breaks. Return only the transcribed text with no commentary." },
          ],
        }],
      },
      {},
      "Gemini API error"
    );
    return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  }

  setProvider(provider: OCRProvider) {
    this.provider = provider;
  }

  async destroy() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }
}
