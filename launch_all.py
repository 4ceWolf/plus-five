#!/usr/bin/env python3
import argparse
from pathlib import Path
import shutil
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener
import webbrowser


ROOT = Path(__file__).resolve().parent
PROJECTS = ROOT.parent
APPS = ('quest', 'focus', 'recall', 'patch', 'bench')
ADDRESS = 'http://127.0.0.1:5178'
CATALOG = (
    ('quest', 'Questline', 'Turn your tasks into a little progress, every day.'),
    ('focus', 'Still', 'Make room for focus. Take a proper break.'),
    ('recall', 'Recall', 'Keep what you learn with spaced flashcards.'),
    ('patch', 'Patch', 'Find a rhythm with your own beat sequencer.'),
    ('bench', 'Workbench', 'A handy home for JSON, regex, and snippets.'),
    ('echo', 'Echo Next', 'Your music player, with layered album artwork.'),
    ('fetch', 'Music Fetch', 'Open a terminal to download permitted audio.'),
)


def normalize_selection(selected):
    known = {entry[0] for entry in CATALOG}
    if not selected or set(selected) - known:
        raise RuntimeError('Choose at least one app from the list.')
    return [entry[0] for entry in CATALOG if entry[0] in selected]


def launch_selected(selected, progress=print, dry_run=False):
    selected = normalize_selection(selected)
    if dry_run:
        for app in selected:
            progress(f'Open {ADDRESS}/{app}' if app in APPS else f'Open {app} in a terminal.')
        return
    required = []
    if any(app in APPS for app in selected):
        required.extend([ROOT / 'dist/index.html', ROOT / 'serve.py'])
    if 'echo' in selected:
        required.append(PROJECTS / 'echo-next/start.sh')
    if 'fetch' in selected:
        required.append(PROJECTS / 'music-fetch/music_fetch.py')
    for path in required:
        if not path.is_file():
            raise RuntimeError(f'Missing required file: {path}')
    if any(app in APPS for app in selected) and not server_ready():
        progress('Starting the local app server…')
        subprocess.Popen(terminal_command([sys.executable, str(ROOT / 'serve.py')]), start_new_session=True)
        deadline = time.monotonic() + 15
        while not server_ready():
            if time.monotonic() >= deadline:
                raise RuntimeError('Plus Five did not start. Check its terminal window, then try again.')
            time.sleep(0.2)
    failed = []
    for app, name, _ in CATALOG:
        if app not in selected:
            continue
        progress(f'Opening {name}…')
        if app in APPS:
            url = f'{ADDRESS}/{app}'
            if not webbrowser.open_new_tab(url):
                failed.append(url)
        else:
            command = (['sh', str(PROJECTS / 'echo-next/start.sh')] if app == 'echo'
                       else [sys.executable, str(Path(__file__).resolve()), '--downloader'])
            subprocess.Popen(terminal_command(command), start_new_session=True)
    if failed:
        raise RuntimeError('Browser did not open. Open manually: ' + ', '.join(failed))


def terminal_command(command):
    for name, options in (
        ('alacritty', ['--hold', '-e']),
        ('kitty', ['--hold']),
        ('konsole', ['--hold', '-e']),
        ('gnome-terminal', ['--']),
        ('xterm', ['-hold', '-e']),
    ):
        executable = shutil.which(name)
        if executable:
            return [executable, *options, *command]
    raise RuntimeError('No supported terminal found. Install Alacritty, Kitty, Konsole, GNOME Terminal, or xterm.')


def server_ready():
    try:
        with build_opener(ProxyHandler({})).open(ADDRESS, timeout=1) as response:
            body = response.read(65536)
            if b'<title>Plus Five' not in body or b'/assets/main.js' not in body:
                raise RuntimeError('Port 5178 belongs to another application. Close it before launching Plus Five.')
            return True
    except URLError:
        return False


def downloader_prompt():
    script = PROJECTS / 'music-fetch' / 'music_fetch.py'
    print('Music Fetch\nPaste a permitted audio URL to download an MP3. Leave blank to close.\n')
    print(f'Files are saved in {script.parent / "downloads"}\n')
    while True:
        try:
            url = input('Audio URL: ').strip()
        except (EOFError, KeyboardInterrupt):
            return 0
        if not url:
            return 0
        subprocess.run([sys.executable, str(script), '--', url], check=False)
        print()


def main(argv=None):
    arguments_parser = argparse.ArgumentParser(description='Choose your apps in the graphical Plus Five launcher.')
    selection = arguments_parser.add_mutually_exclusive_group()
    selection.add_argument('--all', action='store_true', help='Launch everything without the picker')
    selection.add_argument('--apps', nargs='+', choices=[entry[0] for entry in CATALOG], help='Launch only these apps without the picker')
    arguments_parser.add_argument('--dry-run', action='store_true', help='Show the launch plan without opening anything')
    arguments_parser.add_argument('--downloader', action='store_true', help=argparse.SUPPRESS)
    arguments = arguments_parser.parse_args(argv)
    if Path('/.flatpak-info').exists():
        return subprocess.call(['flatpak-spawn', '--host', 'python3', str(Path(__file__).resolve()), *(sys.argv[1:] if argv is None else argv)])
    if arguments.downloader:
        return downloader_prompt()
    try:
        if not (arguments.all or arguments.apps or arguments.dry_run):
            from launcher_gui import run
            return run()
        launch_selected(arguments.apps or [entry[0] for entry in CATALOG], dry_run=arguments.dry_run)
        return 0
    except (OSError, RuntimeError, ImportError) as error:
        print(f'Launcher: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
