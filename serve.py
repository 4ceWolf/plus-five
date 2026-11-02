#!/usr/bin/env python3
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import webbrowser


class AppHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path in ('/', '/quest', '/focus', '/recall', '/patch', '/bench') or path.rstrip('/') in ('/quest', '/focus', '/recall', '/patch', '/bench'):
            self.path = '/index.html'
        super().do_GET()

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description='Run Plus Five locally. No internet or account required.')
    parser.add_argument('--port', type=int, default=5178)
    parser.add_argument('--app', choices=['quest', 'focus', 'recall', 'patch', 'bench'], default='quest')
    parser.add_argument('--open', action='store_true')
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent / 'dist'
    if not (directory / 'index.html').is_file():
        parser.error('Missing build. Run pnpm install && pnpm build first.')
    handler = functools.partial(AppHandler, directory=str(directory))
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    except OSError as error:
        parser.error(f'Cannot start on port {args.port}: {error}. Try --port 5179.')
    url = f'http://127.0.0.1:{args.port}/{args.app}'
    print(f'Plus Five is ready: {url}', flush=True)
    print('Keep this window open. Press Ctrl+C to stop.', flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
