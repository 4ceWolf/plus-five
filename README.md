# Plus Five

Five small, local-first programs for music, making things, and getting through the day.

| Program | What it does | Route |
| --- | --- | --- |
| Questline | A three-column quest board, categories, due dates, and earned XP | `/quest` |
| Still | Focus and break timers, intentions, history, optional brown noise | `/focus` |
| Recall | Flashcards with spaced review, decks, JSON/CSV import and export | `/recall` |
| Patch | Five-voice beat sequencer, presets, project files, real WAV export | `/patch` |
| Workbench | JSON formatter, isolated regex playground, saved snippets | `/bench` |

## Run the included build

Needs Python 3.9+ and a modern browser. No account, network connection, or Node installation is needed to run the built apps.

```sh
python3 serve.py --open
```

Launch a specific program with `python3 serve.py --app patch --open`. Keep the terminal open while using it. The server listens only on `127.0.0.1:5178`; stop it with Ctrl+C. Use `--port 5179` if needed, but note that browser data belongs to a particular address and port.

## Your data

Everything stays in your browser's local storage. Use **Back up all data** regularly and before changing browsers, computers, ports, or clearing browser data. The backup dialog also restores backups after validation and explicit confirmation. A restore replaces only the apps included in the file.

If storage is full or disabled, a warning appears and the backup includes the active app's in-memory changes. Export before navigating away: switching programs reloads the page. There is no multi-tab conflict resolution; use one tab per program while editing.

Still remembers wall-clock deadlines across refreshes and records completion when you return; it is not a background alarm service. Audio requires a user click. Patch pauses when its tab is hidden. WAV output is synthesized locally; included patterns are editable starting points, not streamed songs.

## Development

The interface uses React and TypeScript, bundled by esbuild. Fonts are bundled locally.

```sh
pnpm install --frozen-lockfile
pnpm build
python3 serve.py
```

`pnpm check` runs TypeScript validation. Browser checks are in `.qa/check.mjs` and `.qa/backup.mjs`; their Playwright import currently points to the bundled development runtime and must be adjusted for another machine. Run them against the server at port 5178. They use isolated browser profiles, not your saved app data.

Tested in headless Chromium: primary flows in all five apps, reload persistence, audio generation, JSON/regex error handling, and layouts at 1440, 980, 760, 390, and 320 CSS pixels. No screen-reader or native desktop packaging certification is claimed.
