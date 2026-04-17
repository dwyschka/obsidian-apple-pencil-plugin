import { App, TFile, normalizePath } from "obsidian";
import { PencilDraft, Stroke } from "./types";

export class DraftStore {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  private pluginDir(): string {
    return normalizePath(`${this.app.vault.configDir}/plugins/apple-pencil`);
  }

  private draftDir(): string {
    return normalizePath(`${this.pluginDir()}/drafts`);
  }

  private draftPath(noteFile: TFile): string {
    return normalizePath(`${this.draftDir()}/${encodeURIComponent(noteFile.path)}.json`);
  }

  private async ensureDraftDir() {
    const adapter = this.app.vault.adapter;
    const dirs = [
      normalizePath(`${this.app.vault.configDir}/plugins`),
      this.pluginDir(),
      this.draftDir(),
    ];

    for (const dir of dirs) {
      const exists = await adapter.exists(dir);
      if (!exists) {
        await adapter.mkdir(dir);
      }
    }
  }

  async save(noteFile: TFile, strokes: Stroke[], canvasWidth: number, canvasHeight: number) {
    const draft: PencilDraft = {
      noteFile: noteFile.path,
      strokes,
      canvasWidth,
      canvasHeight,
      savedAt: Date.now(),
    };

    const adapter = this.app.vault.adapter;
    await this.ensureDraftDir();
    await adapter.write(this.draftPath(noteFile), JSON.stringify(draft));
  }

  async load(noteFile: TFile): Promise<PencilDraft | null> {
    const adapter = this.app.vault.adapter;
    const path = this.draftPath(noteFile);
    const exists = await adapter.exists(path);
    if (!exists) return null;

    try {
      const raw = await adapter.read(path);
      return JSON.parse(raw) as PencilDraft;
    } catch {
      return null;
    }
  }

  async delete(noteFile: TFile) {
    const adapter = this.app.vault.adapter;
    const path = this.draftPath(noteFile);
    const exists = await adapter.exists(path);
    if (exists) {
      await adapter.remove(path);
    }
  }

  async hasDraft(noteFile: TFile): Promise<boolean> {
    return this.app.vault.adapter.exists(this.draftPath(noteFile));
  }
}
