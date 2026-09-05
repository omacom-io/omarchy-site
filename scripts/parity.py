#!/usr/bin/env python3
"""Does the built folder answer for every address omarchy.org has?

Walks the omarchy-site checkout for everything GitHub Pages serves - each
index.html as its directory's address, every other file as its own path -
then requests each one from dist/client, served the way Pages serves it.
Every address must answer 200; every file that passes through unchanged
must be byte-identical to the checkout's. The one difference expected is
404.html, which the redesign replaces on purpose.

    npm run parity            (after npm run build)
    PARITY_BASE=https://example.org npm run parity
                              (check a deployed site instead of dist/client)

Reads OMARCHY_SITE_DIR like the importers; defaults to this repository.
"""
import hashlib
import http.server
import os
import socketserver
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = Path(os.environ.get('OMARCHY_SITE_DIR', ROOT)).resolve()
OUT = ROOT / 'dist' / 'client'
SKIP_DIRS = {'.git', 'bin', 'templates', 'content', '.github', '.claude', '.idea', 'node_modules', 'src', 'scripts', 'dist', 'public'}
SKIP_FILES = {'README.md', '.gitignore', '.DS_Store', 'package.json', 'package-lock.json', 'wrangler.jsonc', 'vite.config.ts', 'tsconfig.json', 'tsr.config.json', 'components.json', 'eslint.config.js', 'prettier.config.js', '.prettierignore', '.cta.json'}
EXPECTED_TO_DIFFER = {'/404.html'}


def addresses():
    out = []
    for root, dirs, files in os.walk(SITE):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            if f in SKIP_FILES:
                continue
            rel = Path(root, f).relative_to(SITE).as_posix()
            if f == 'index.html':
                parent = rel[: -len('index.html')]
                out.append(('/' + parent, rel, 'page'))
            else:
                out.append(('/' + rel, rel, 'file'))
    return sorted(out)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def serve():
    handler = Quiet
    httpd = socketserver.TCPServer(('127.0.0.1', 0), lambda *a, **k: handler(*a, directory=str(OUT), **k))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def main():
    live = os.environ.get('PARITY_BASE', '').rstrip('/')
    if live:
        httpd, base = None, live
    else:
        if not OUT.is_dir():
            sys.exit('parity: dist/client is missing; run npm run build first')
        httpd, port = serve()
        base = f'http://127.0.0.1:{port}'
    urls = addresses()
    ok, missing, differ, identical = 0, [], [], 0
    for url, rel, kind in urls:
        try:
            with urllib.request.urlopen(base + urllib.parse.quote(url), timeout=30) as r:
                status, body = r.status, r.read()
        except urllib.error.HTTPError as e:
            status, body = e.code, b''
        if status != 200:
            missing.append((status, url))
            continue
        ok += 1
        if kind == 'file':
            if hashlib.sha256(body).digest() == hashlib.sha256((SITE / rel).read_bytes()).digest():
                identical += 1
            elif url not in EXPECTED_TO_DIFFER:
                differ.append(url)
    if httpd:
        httpd.shutdown()
    pages = sum(1 for _, _, k in urls if k == 'page')
    files = len(urls) - pages
    print(f'omarchy.org addresses: {len(urls)} ({pages} pages, {files} files), from {SITE}')
    print(f'checked against: {base}')
    print(f'answering 200: {ok}')
    print(f'files byte-identical: {identical}/{files}' + (f' (plus {len(EXPECTED_TO_DIFFER)} replaced on purpose)' if EXPECTED_TO_DIFFER else ''))
    for u in differ:
        print(f'  DIFFERS: {u}')
    for s, u in missing:
        print(f'  {s}: {u}')
    if missing or differ:
        sys.exit(1)
    print('parity: every address answers, every passthrough file is identical')


if __name__ == '__main__':
    main()
