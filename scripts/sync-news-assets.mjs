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

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
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

function collectAssets() {
  const assets = [];

  for (const file of markdownFiles(CONTENT)) {
    const post = relative(CONTENT, file).replace(/\.md$/, "").split(/[\\/]/).join("/");
    const targets = new Set([...readFileSync(file, "utf8").matchAll(LINK)].map(([, url]) => url));

    for (const target of targets) {
      if (!/^\w+:|^[/#]/.test(target)) {
        throw new Error(
          `content/news/${post}.md links to ${target}. Link files kept beside the ` +
            `post by the path they are published at: /news/${post}/${target}`,
        );
      }

      const prefix = `/news/${post}/`;
      const asset = target.startsWith(prefix) && target.slice(prefix.length);
      if (!asset || isAbsolute(asset)) continue;

      const source = resolve(dirname(file), asset);
      const postDirectory = resolve(dirname(file));
      const sourceRelative = relative(postDirectory, source);
      if (sourceRelative.startsWith(`..${sep}`) || isAbsolute(sourceRelative)) {
        throw new Error(`content/news/${post}.md links outside its directory: ${asset}`);
      }
      if (!statSync(source, { throwIfNoEntry: false })?.isFile()) {
        throw new Error(`content/news/${post}.md links to ${asset}, but no such file sits next to it`);
      }

      assets.push({ source, destination: join(post, asset) });
    }
  }

  return assets;
}

function replaceGeneratedDirectory(stage) {
  const parent = dirname(PUBLIC);
  const backup = mkdtempSync(join(parent, ".news-assets-backup-"));
  rmSync(backup, { recursive: true, force: true });
  let movedExisting = false;

  try {
    if (existsSync(PUBLIC)) {
      renameSync(PUBLIC, backup);
      movedExisting = true;
    }
    renameSync(stage, PUBLIC);
  } catch (error) {
    if (!existsSync(PUBLIC) && movedExisting) renameSync(backup, PUBLIC);
    throw error;
  } finally {
    rmSync(backup, { recursive: true, force: true });
  }
}

try {
  // Validation happens before the existing generated directory is touched.
  const assets = collectAssets();
  const stage = mkdtempSync(join(dirname(PUBLIC), ".news-assets-"));

  try {
    for (const { source, destination } of assets) {
      const output = join(stage, destination);
      mkdirSync(dirname(output), { recursive: true });
      cpSync(source, output);
    }

    replaceGeneratedDirectory(stage);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }

  console.log(`Synced ${assets.length} news asset${assets.length === 1 ? "" : "s"} into public/news/`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
