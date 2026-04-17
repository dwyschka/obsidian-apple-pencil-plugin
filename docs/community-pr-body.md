## Checklist

- [x] My plugin has a `README.md` file in the root of the repository.
- [x] My plugin has a `LICENSE` file in the root of the repository.
- [x] My plugin has a `manifest.json` file in the root of the repository.
- [x] The `id` in `manifest.json` is unique and does not contain `obsidian`.
- [x] The GitHub release tag matches the version in `manifest.json`.
- [x] The GitHub release includes `main.js`, `manifest.json`, and `styles.css`.
- [x] `main.js` is not committed to the repository.
- [x] I have tested the plugin locally before submission.

## Plugin Summary

Apple Pencil adds a full-page drawing canvas for notes in Obsidian and converts handwriting into Markdown text. It supports edit mode for existing note content, draft autosave, finger erasing, and multiple OCR backends including Tesseract, OpenAI, Claude, Gemini, and Google Cloud Vision.

## Notes for Review

- The plugin is intended for Obsidian mobile and iPad workflows, but remains `isDesktopOnly: false`.
- Cloud OCR providers send the rendered handwriting image to the selected provider. This is disclosed in the README.
- Secrets are stored via Obsidian secret storage rather than plugin data files.
