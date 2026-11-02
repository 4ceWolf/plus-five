# Ready to try

Completed and verified on 26 September 2026. All three projects now live in your real `~/Projects`, not the earlier temporary home folder. The original Echo source and all freeze notices were left unchanged. The earlier recovery copies remain in the Flatpak app's persistent storage; the copies in `~/Projects` are now authoritative.

## Five-program collection

Run `~/Projects/launch-all.sh` to open the **graphical app picker**. Check any combination of the seven apps, or choose Select all, then Launch selected. Nothing opens automatically. The picker uses PySide6, already available on this laptop; launch errors appear inside the window, and keyboard selection works with Tab and Space.

Selected browser apps reuse the existing Plus Five server, or start it in a terminal. Closing that server terminal stops the browser apps. Echo Next starts in its own window; Music Fetch opens an interactive terminal and downloads nothing until you enter a URL. Closing the picker does not close launched apps. Use `~/Projects/launch-all.sh --all` to bypass the picker, `--apps quest echo` to open specific apps, or `--dry-run` to inspect a launch plan without opening windows.

```sh
~/Projects/plus-five/start.sh
```

Questline (quests and XP), Still (focus timer), Recall (flashcards), Patch (beat-making and WAV export), and Workbench (JSON, regex, snippets). Switch using the sidebar or start a specific program with `--app patch`, `--app focus`, `--app recall`, `--app quest`, or `--app bench`.

Keep the server terminal open. If the assistant's preview is already running, visit `http://127.0.0.1:5178/quest` instead of launching a second server. Back up your browser data before moving to a different address or clearing browser storage.

## Echo Next

```sh
~/Projects/echo-next/start.sh
```

Choose a music folder in Setup. Depth settings include automatic/manual foreground cutoff, a flat-artwork option, progress/error feedback and retry. Data and models are stored separately from the original Echo. The first model download requires internet access. Estimated depth is not perfect object segmentation: some covers need manual cutoff adjustment or flat mode.

## Music Fetch

```sh
python3 ~/Projects/music-fetch/music_fetch.py --help
python3 ~/Projects/music-fetch/music_fetch.py --check
```

Pass a permitted audio URL to download it. The default destination is `~/Projects/music-fetch/downloads`. Playlists require `--playlist`; format selection, batch input, artwork, resume and per-format download archives are supported. Point Echo Next at your download folder to use them together.

## Verification completed

- Plus Five: TypeScript/build; primary flows across all five apps; persistence; focus completion across days; phase-preserving duration edits; WAV playback/export; invalid JSON/regex; backup validation and restore; recovery when browser storage is full; dialog Escape/focus restoration; mobile navigation; 25 route/width combinations down to 320 CSS pixels.
- Echo Next: native build; 51 default Rust tests; six depth image-loader tests; real ONNX cover-to-cutout integration; GStreamer/model self-test; native window/WebKit startup smoke test; Chromium UI tests with simulated IPC and actual generated artwork, including failed-image recovery and controls above foreground layers.
- Music Fetch: six unit tests; local HTTP download of generated audio; real MP3 conversion and metadata processing; archive-based duplicate skip; ffprobe confirms a three-second MP3.

Not claimed: full screen-reader coverage, every browser/site/cover, or a manual listening review of every native audio transition. Echo's inherited formatting differences are documented in its README. The release build is optional; the verified runnable Echo binary is the development build.

Each project's README contains usage, limitations, and test details.
