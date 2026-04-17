# Community Release Checklist

This repo is prepared for Obsidian community submission, but the GitHub-side steps still need to be performed from a public GitHub repository.

## 1. Final local checks

Run:

```bash
npm run check:release
npm run package:release
```

This verifies the tests and build, then stages release files in `release/1.0.0/`.

## 2. Push to a public GitHub repo

Expected repository:

```text
jonthornton07/obsidian-apple-pencil-plugin
```

Required root files already present in this repo:

- `README.md`
- `LICENSE`
- `manifest.json`
- `versions.json`

Do not commit `main.js`.

## 3. Create the GitHub release

Create a new GitHub release with:

- Tag: `1.0.0`
- Title: `1.0.0`

Upload these release assets from `release/1.0.0/`:

- `main.js`
- `manifest.json`
- `styles.css`

The tag must exactly match `manifest.json.version`.

## 4. Submit to Obsidian community plugins

Open a PR against:

```text
obsidianmd/obsidian-releases
```

Append the JSON object from `docs/community-plugin-entry.json` to:

```text
community-plugins.json
```

Use PR title:

```text
Add plugin: Apple Pencil
```

Paste the contents of `docs/community-pr-body.md` into the PR description, then switch the PR template to `Community Plugin` in GitHub preview mode if needed.

## 5. After submission

- Watch for bot validation results.
- Respond to reviewer comments in the same PR.
- If you change code, update the release assets to match the submitted version.
- After approval, future updates are distributed through new GitHub releases.
