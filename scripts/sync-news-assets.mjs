#!/usr/bin/env node

// News posts keep their images and other files beside them, in
// content/news/YYYY/MM/. This copies each one a post links to into
// public/news/YYYY/MM/slug/, which Astro publishes verbatim — so the file is
// served from the post's own URL, in `astro dev` and in the build alike, with
// no plugin and no dependency.
//
// Posts link to those files by that published path, e.g.
// ![Alt](/news/2026/09/a-post/photo.webp). A bare relative filename cannot
// work: Astro's Markdown image pipeline claims it and republishes it under a
// hashed /_astro/ URL, so this fails the build rather than move the URL.

import { readdirSync, readFileSync, statSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONTENT = join(ROOT, "content", "news");
// Nothing else lives under public/news/ — Astro builds the pages themselves
// into dist/ — so this directory is ours to rebuild from scratch every run.
const PUBLIC = join(ROOT, "public", "news");

const LINK = /\]\(([^)\s]+)/g;

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

rmSync(PUBLIC, { recursive: true, force: true });

let copied = 0;

for (const file of markdownFiles(CONTENT)) {
  const post = relative(CONTENT, file).replace(/\.md$/, "").split(/[\\/]/).join("/");
  const targets = new Set([...readFileSync(file, "utf8").matchAll(LINK)].map(([, url]) => url));

  for (const target of targets) {
    if (!/^\w+:|^[/#]/.test(target)) {
      fail(
        `content/news/${post}.md links to ${target}. Link files kept beside the ` +
          `post by the path they are published at: /news/${post}/${target}`,
      );
    }

    const asset = target.startsWith(`/news/${post}/`) && target.slice(`/news/${post}/`.length);
    if (!asset) continue;

    const source = join(dirname(file), asset);
    if (!statSync(source, { throwIfNoEntry: false })?.isFile()) {
      fail(`content/news/${post}.md links to ${asset}, but no such file sits next to it`);
    }

    const destination = join(PUBLIC, post, asset);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination);
    copied++;
  }
}

console.log(`Synced ${copied} news asset${copied === 1 ? "" : "s"} into public/news/`);
