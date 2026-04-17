# Apple Pencil for Obsidian

[![CI](https://github.com/jonthornton07/obsidian-apple-pencil-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/jonthornton07/obsidian-apple-pencil-plugin/actions/workflows/ci.yml)

Handwrite directly inside Obsidian on iPad, then convert your handwriting to Markdown without leaving the note you are working on.

> Built for people who want Apple Pencil capture inside their Obsidian workflow, not in a separate notes app.

## Why This Plugin Exists

Most handwriting workflows on iPad force you to leave Obsidian, write somewhere else, then paste, export, or summarize later.

Apple Pencil keeps the whole loop in one place:

- Open a canvas for the current note
- Write naturally with Apple Pencil
- Convert handwriting to Markdown when you are ready
- Return to the same note with your text already inserted

## What It Does

- **Full-page canvas for any note** — open a writing surface alongside the current note without leaving Obsidian
- **Handwriting to Markdown** — convert ink with OpenAI GPT-4o Vision, Claude, Google Gemini, Google Cloud Vision, or on-device Tesseract
- **Edit existing notes by writing on them** — load note text as a background layer, erase words with your finger, add handwritten changes, then update the note in place
- **Draft autosave** — preserve unfinished strokes when you close the canvas and restore them later
- **Finger eraser with palm rejection** — write with Pencil, erase with touch, ignore large palm contacts
- **Theme-aware defaults** — pen color adapts to light and dark themes

## Best For

- Obsidian users who write primarily on iPad
- People who think faster with Apple Pencil than with the keyboard
- Anyone who wants rough handwritten capture but clean Markdown output

## Requirements

- Obsidian 1.11.4 or later
- iPad with Apple Pencil

## Installation

### From the Community Plugin Browser

1. Open **Settings → Community plugins → Browse**
2. Search for **Apple Pencil**
3. Install and enable the plugin

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/jonthornton07/obsidian-apple-pencil-plugin/releases)
2. Copy them into `<vault>/.obsidian/plugins/apple-pencil/`
3. Enable the plugin in **Settings → Community plugins**

## Quick Start

1. Open any note
2. Tap the pencil ribbon icon, or run **Open pencil canvas for current note**
3. Write with Apple Pencil
4. Tap **Convert to Text**
5. Return to the note with **← Note**

## Usage Notes

- **Erase a word** — drag over it with your finger
- **Undo a stroke** — tap **Undo**
- **Clear handwritten ink** — tap **Clear**
- **Create a new note and start writing immediately** — run **New note and open pencil canvas**

## Settings

| Setting | Description |
|---|---|
| Handwriting recognition | OCR provider used to convert handwriting |
| API key | Key for the selected cloud provider |
| Default pen color | Starting color for new strokes |
| Default pen width | Starting width from 1 to 10 |
| Insert converted text | Append immediately or append with a blank line |
| Auto-save draft on exit | Preserve unfinished strokes when closing the canvas |

### OCR Providers and API Keys

Cloud OCR providers require an API key entered in **Settings → Apple Pencil**. Keys are stored in Obsidian secret storage and are never written to `data.json`.

| Provider | Notes |
|---|---|
| OpenAI GPT-4o Vision | Excellent handwriting accuracy |
| Claude (Anthropic) | Excellent handwriting accuracy |
| Google Gemini | Excellent handwriting accuracy |
| Google Cloud Vision | Fast and accurate |
| Tesseract | Runs fully on-device, no key required, weaker on handwriting |

Key sources:

- OpenAI: `platform.openai.com`
- Anthropic: `console.anthropic.com`
- Gemini: `aistudio.google.com`
- Google Cloud Vision: `console.cloud.google.com`

## Privacy and Disclosures

- **Network use** — Tesseract runs locally. OpenAI, Claude, Gemini, and Google Cloud Vision send the rendered handwriting image to their APIs for transcription.
- **Accounts required** — cloud OCR providers require an account and API key with the selected service.
- **Local storage** — unfinished drafts are stored locally under `plugins/apple-pencil/drafts` in your vault config directory.
- **Note access** — the plugin reads and updates the note you open in the canvas.
- **Telemetry and ads** — no ads and no client-side telemetry.

## Local Development

`main.js` is gitignored on purpose. Build it locally, then either copy the release files into a test vault or symlink the repo into the vault plugin directory.

### Option 1: Copy Build Output Into a Test Vault

Set your test vault path once:

```bash
export OBSIDIAN_VAULT_PATH="/path/to/YourVault"
```

Then build and install the plugin into that vault:

```bash
npm install
npm run install:local
```

This copies `main.js`, `manifest.json`, and `styles.css` into:

```text
$OBSIDIAN_VAULT_PATH/.obsidian/plugins/apple-pencil/
```

After code changes, run:

```bash
npm run install:local
```

### Option 2: Symlink the Repo for a Faster Loop

Set your test vault path:

```bash
export OBSIDIAN_VAULT_PATH="/path/to/YourVault"
```

Create the symlink:

```bash
npm run link:local
```

Then rebuild in watch mode:

```bash
npm run dev
```

With the symlink setup, Obsidian reads the plugin directly from this repo. Reload Obsidian or disable and re-enable the plugin after changes.

### Development Notes

- Use a throwaway vault, not your main vault
- `link:local` replaces an existing `apple-pencil` symlink in the target vault, but refuses to delete a real directory
- `OBSIDIAN_VAULT_PATH` must point to the vault root, not the `.obsidian` folder

## Releasing

Build and stage release assets locally:

```bash
npm run check:release
npm run package:release
```

This creates:

```text
release/1.0.0/
```

with the three files Obsidian expects in a GitHub release:

- `main.js`
- `manifest.json`
- `styles.css`

Submission helpers in this repo:

- [docs/community-release.md](docs/community-release.md) — release and submission checklist
- [docs/community-plugin-entry.json](docs/community-plugin-entry.json) — exact `community-plugins.json` entry
- [docs/community-pr-body.md](docs/community-pr-body.md) — PR body for `obsidianmd/obsidian-releases`

## License

MIT
