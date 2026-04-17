import { Plugin, TFile, Notice, MarkdownView, WorkspaceLeaf, setIcon } from "obsidian";
import { PencilCanvasView, PENCIL_VIEW_TYPE } from "./canvas-view";
import { OCREngine } from "./ocr-engine";
import { DraftStore } from "./draft-store";
import { PencilSettingTab } from "./settings";
import { PencilPluginSettings, DEFAULT_SETTINGS } from "./types";

export default class PencilPlugin extends Plugin {
  settings: PencilPluginSettings;
  private draftStore: DraftStore;
  private pendingFile: TFile | null = null;

  async onload() {
    await this.loadSettings();
    this.draftStore = new DraftStore(this.app);

    // Register the canvas view type
    this.registerView(PENCIL_VIEW_TYPE, (leaf) => {
      const file = this.pendingFile ?? this.getActiveNoteFile();
      const ocrEngine = new OCREngine(this.settings.ocrProvider);
      const view = new PencilCanvasView(leaf, file, this.settings, ocrEngine, this.draftStore);
      if (!file) {
        // Stale view being restored by Obsidian on startup — detach silently
        setTimeout(() => leaf.detach(), 0);
      }
      return view;
    });

    // Settings tab
    this.addSettingTab(new PencilSettingTab(this.app, this));

    // Ribbon button — tap to open canvas for current note
    this.addRibbonIcon("pencil", "Open Apple Pencil canvas", () => {
      this.openCanvas();
    });

    // Command palette
    this.addCommand({
      id: "open-pencil-canvas",
      name: "Open pencil canvas for current note",
      checkCallback: (checking) => {
        const file = this.getActiveNoteFile();
        if (file) {
          if (!checking) this.openCanvas();
          return true;
        }
        return false;
      },
    });

    this.addCommand({
      id: "open-pencil-canvas-new-note",
      name: "New note and open pencil canvas",
      callback: async () => {
        const file = await this.app.vault.create(
          `Pencil Note ${new Date().toISOString().slice(0, 10)}.md`,
          ""
        );
        await this.openCanvasForFile(file);
      },
    });

    // Floating button + draft check on every leaf change
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        this.updateFloatingButton(leaf);
        this.checkForDraft(leaf);
      })
    );

    // Also update on layout change (e.g. panels resizing)
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        const leaf = this.app.workspace.getMostRecentLeaf();
        this.updateFloatingButton(leaf);
      })
    );
  }

  private floatingBtn: HTMLElement | null = null;
  private draftNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  private lastDraftNoticePath: string | null = null;

  private updateFloatingButton(leaf: WorkspaceLeaf | null) {
    const view = leaf?.view;
    const isMarkdown = view instanceof MarkdownView && !!view.file;

    if (!isMarkdown) {
      this.floatingBtn?.remove();
      this.floatingBtn = null;
      return;
    }

    // Already attached to this leaf
    if (this.floatingBtn && leaf!.view.containerEl.contains(this.floatingBtn)) return;

    // Remove from previous location
    this.floatingBtn?.remove();

    const file = (view as MarkdownView).file!;
    const btn = document.createElement("button");
    btn.className = "pencil-float-btn";
    btn.title = "Open Apple Pencil canvas";
    setIcon(btn, "pencil");
    btn.addEventListener("click", () => this.openCanvasForFile(file));

    leaf!.view.containerEl.appendChild(btn);
    this.floatingBtn = btn;
  }

  private getActiveNoteFile(): TFile | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view?.file ?? null;
  }

  async openCanvas() {
    const file = this.getActiveNoteFile();
    if (!file) {
      new Notice("Open a note first to use Apple Pencil canvas.");
      return;
    }
    await this.openCanvasForFile(file);
  }

  async openCanvasForFile(file: TFile) {
    // Check if canvas for this file already open
    const existing = this.app.workspace.getLeavesOfType(PENCIL_VIEW_TYPE).find((leaf) => {
      const view = leaf.view as PencilCanvasView;
      return view.getDisplayText().includes(file.basename);
    });

    if (existing) {
      this.app.workspace.setActiveLeaf(existing, { focus: true });
      return;
    }

    // Set pendingFile so the factory can pick it up reliably
    this.pendingFile = file;
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.setViewState({ type: PENCIL_VIEW_TYPE, active: true });
    this.pendingFile = null;
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
  }

  private async checkForDraft(leaf: WorkspaceLeaf | null) {
    if (!leaf) return;
    const view = leaf.view;
    if (!(view instanceof MarkdownView) || !view.file) return;

    const path = view.file.path;
    // Debounce — only show once per file per activation
    if (this.lastDraftNoticePath === path) return;
    if (this.draftNoticeTimer) clearTimeout(this.draftNoticeTimer);
    this.draftNoticeTimer = setTimeout(async () => {
      this.lastDraftNoticePath = path;
      const hasDraft = await this.draftStore.hasDraft(view.file!);
      if (hasDraft) {
        new Notice(
          `✏️ Unsaved pencil draft for "${view.file!.basename}". Open canvas to continue.`,
          5000
        );
      }
      // Reset so switching away and back shows it again
      setTimeout(() => { this.lastDraftNoticePath = null; }, 10000);
    }, 100);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    this.floatingBtn?.remove();
    this.app.workspace.detachLeavesOfType(PENCIL_VIEW_TYPE);
  }
}
