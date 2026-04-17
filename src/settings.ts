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
