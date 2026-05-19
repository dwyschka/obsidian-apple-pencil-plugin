import { App, PluginSettingTab, Setting, SecretComponent } from "obsidian";
import { PencilPluginSettings, OCRProvider } from "./types";
import type PencilPlugin from "./main";

export class PencilSettingTab extends PluginSettingTab {
  plugin: PencilPlugin;

  constructor(app: App, plugin: PencilPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName("Apple Pencil").setHeading();

    // OCR Provider
    new Setting(containerEl)
      .setName("Handwriting recognition")
      .setDesc("OpenAI GPT-4o Vision gives the best handwriting accuracy. Tesseract is free but designed for printed text — results may be poor.")
      .addDropdown((drop) =>
        drop
          .addOption("tesseract", "On-device (Tesseract) — free, poor handwriting accuracy")
          .addOption("claude", "Claude (Anthropic) — excellent handwriting accuracy")
          .addOption("openai", "OpenAI GPT-4o Vision — excellent handwriting accuracy")
          .addOption("google", "Google Cloud Vision — fast, accurate")
          .addOption("gemini", "Google Gemini — excellent handwriting accuracy")
          .addOption("openai-compatible", "OpenAI-compatible API — Ollama, LM Studio, mlx-omni-server, …")
          .setValue(this.plugin.settings.ocrProvider)
          .onChange(async (val) => {
            this.plugin.settings.ocrProvider = val as OCRProvider;
            await this.plugin.saveSettings();
            this.display(); // re-render to show/hide API key fields
          })
      );

    const keyConfigs: Partial<Record<string, { name: string; desc: string; settingKey: "openaiSecretId" | "googleSecretId" | "claudeSecretId" | "geminiSecretId" }>> = {
      openai: { name: "OpenAI API key", desc: "Required for GPT-4o Vision recognition.", settingKey: "openaiSecretId" },
      claude: { name: "Anthropic API key", desc: "Required for Claude handwriting recognition.", settingKey: "claudeSecretId" },
      gemini: { name: "Gemini API key", desc: "Required for Google Gemini handwriting recognition.", settingKey: "geminiSecretId" },
      google: { name: "Google Cloud Vision API key", desc: "Required for Google Vision recognition.", settingKey: "googleSecretId" },
    };

    const keyConfig = keyConfigs[this.plugin.settings.ocrProvider];
    if (keyConfig) {
      new Setting(containerEl)
        .setName(keyConfig.name)
        .setDesc(keyConfig.desc)
        .addComponent((el) =>
          new SecretComponent(this.app, el)
            .setValue(this.plugin.settings[keyConfig!.settingKey])
            .onChange(async (val) => {
              this.plugin.settings[keyConfig!.settingKey] = val;
              await this.plugin.saveSettings();
            })
        );
    }

    if (this.plugin.settings.ocrProvider === "openai-compatible") {
      new Setting(containerEl)
        .setName("Base URL")
        .setDesc("Base URL of the OpenAI-compatible server (e.g. http://localhost:11434 for Ollama, http://localhost:1234 for LM Studio).")
        .addText((text) =>
          text
            .setPlaceholder("http://localhost:11434")
            .setValue(this.plugin.settings.openaiCompatibleBaseUrl)
            .onChange(async (val) => {
              this.plugin.settings.openaiCompatibleBaseUrl = val;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Model")
        .setDesc("Vision-capable model to use, e.g. llava, llama3.2-vision, mlx-community/llama-3.2-11b-vision-instruct-4bit.")
        .addText((text) =>
          text
            .setPlaceholder("llava")
            .setValue(this.plugin.settings.openaiCompatibleModel)
            .onChange(async (val) => {
              this.plugin.settings.openaiCompatibleModel = val;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("API key (optional)")
        .setDesc("Leave empty if the server requires no authentication.")
        .addComponent((el) =>
          new SecretComponent(this.app, el)
            .setValue(this.plugin.settings.openaiCompatibleApiKey)
            .onChange(async (val) => {
              this.plugin.settings.openaiCompatibleApiKey = val;
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl).setName("Canvas defaults").setHeading();

    new Setting(containerEl)
      .setName("Default pen color")
      .addColorPicker((picker) =>
        picker
          .setValue(this.plugin.settings.defaultPenColor)
          .onChange(async (val) => {
            this.plugin.settings.defaultPenColor = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default pen width")
      .addSlider((slider) =>
        slider
          .setLimits(1, 10, 1)
          .setValue(this.plugin.settings.defaultPenWidth)
          .setDynamicTooltip()
          .onChange(async (val) => {
            this.plugin.settings.defaultPenWidth = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Palm rejection threshold")
      .setDesc("Maximum contact size (in CSS pixels) that counts as a finger. Increase if your finger is incorrectly rejected; decrease if palm touches slip through. Default: 120.")
      .addSlider((slider) =>
        slider
          .setLimits(40, 300, 10)
          .setValue(this.plugin.settings.palmRejectionThreshold)
          .setDynamicTooltip()
          .onChange(async (val) => {
            this.plugin.settings.palmRejectionThreshold = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Text insertion").setHeading();

    new Setting(containerEl)
      .setName("Insert converted text")
      .setDesc("Where to insert recognized text in the note.")
      .addDropdown((drop) =>
        drop
          .addOption("newline", "Append with blank line")
          .addOption("append", "Append immediately")
          .setValue(this.plugin.settings.insertionMode)
          .onChange(async (val) => {
            this.plugin.settings.insertionMode = val as "append" | "newline";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto-save draft on exit")
      .setDesc("Preserve unconverted strokes when closing the canvas.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autosaveOnExit)
          .onChange(async (val) => {
            this.plugin.settings.autosaveOnExit = val;
            await this.plugin.saveSettings();
          })
      );
  }
}
