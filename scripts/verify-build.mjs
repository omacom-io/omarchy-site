#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");

const requiredFiles = [
  "index.html",
  "404.html",
  "CNAME",
  "discord/index.html",
  "news/index.html",
  "manual/index.html",
  "manual/search-index.json",
  "themes/index.html",
  "workstations/index.html",
  "meetups/index.html",
  "patrons/index.html",
  "potato/index.html",
  "security/index.html",
  "security/credits/index.html",
  "server/index.html",
  "teams/index.html",
  "sponsorships/index.html",
  "air/index.html",
  "assets/css/air.css",
  "install",
  "install-dev",
  "install-rc",
  "upgrade-to-quattro",
  "upgrade-to-quattro-dev",
  "patch/pin-abseil-cpp",
];

const byteIdentical = [
  ["public/CNAME", "CNAME"],
  ["public/install", "install"],
  ["public/install-dev", "install-dev"],
  ["public/install-rc", "install-rc"],
  ["public/upgrade-to-quattro", "upgrade-to-quattro"],
  ["public/upgrade-to-quattro-dev", "upgrade-to-quattro-dev"],
  ["public/patch/pin-abseil-cpp", "patch/pin-abseil-cpp"],
  ["public/assets/css/air.css", "assets/css/air.css"],
  ["public/manual/images/install-config.webp", "manual/images/install-config.webp"],
  ["public/manual/images/tokyo-night-preview.webp", "manual/images/tokyo-night-preview.webp"],
  [
    "public/assets/images/credits/teles.webp",
    "assets/images/credits/teles.webp",
  ],
  [
    "public/assets/images/social/security-credits.png",
    "assets/images/social/security-credits.png",
  ],
  [
    "public/assets/images/social/sponsorships.png",
    "assets/images/social/sponsorships.png",
  ],
  [
    "public/assets/images/social/meetups.png",
    "assets/images/social/meetups.png",
  ],
  [
    "public/assets/images/social/patrons.png",
    "assets/images/social/patrons.png",
  ],
  [
    "public/assets/images/social/potato.png",
    "assets/images/social/potato.png",
  ],
  [
    "public/assets/images/social/server.jpg",
    "assets/images/social/server.jpg",
  ],
  [
    "public/assets/images/social/teams.png",
    "assets/images/social/teams.png",
  ],
  [
    "public/assets/images/logos/hyprland.svg",
    "assets/images/logos/hyprland.svg",
  ],
  [
    "public/assets/images/logos/quickshell.svg",
    "assets/images/logos/quickshell.svg",
  ],
  [
    "public/assets/images/logos/mise.svg",
    "assets/images/logos/mise.svg",
  ],
];

function file(path) {
  const absolute = join(DIST, path);
  try {
    if (!statSync(absolute).isFile()) throw new Error("not a file");
  } catch {
    throw new Error(`Missing build artifact: dist/${path}`);
  }
  return absolute;
}

function allFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? allFiles(path) : [path];
  });
}

// Every /assets/… path an Astro page references, so a page's own images are
// checked without listing them here.
function assetsReferencedBy(sourcePath) {
  const source = readFileSync(join(ROOT, sourcePath), "utf8");
  return [...new Set(source.match(/\/assets\/[\w./-]+\.\w+/g) ?? [])];
}

function verifyPageAssets(sourcePath) {
  for (const asset of assetsReferencedBy(sourcePath)) {
    const publicPath = join("public", asset);
    if (!statSync(join(ROOT, publicPath), { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`${sourcePath} references ${asset}, but no such file sits in public/`);
    }
    byteIdentical.push([publicPath, asset.slice(1)]);
  }
}

function verifyNewsRoutes() {
  const contentRoot = join(ROOT, "content/news");

  // The glob loader uses the YYYY/MM/slug path relative to content/news as post.id,
  // and postPath() publishes that same path below /news/.
  for (const sourcePath of allFiles(contentRoot)) {
    const postId = relative(contentRoot, sourcePath).split(sep).join("/");
    if (!/^\d{4}\/\d{2}\/[^/]+\.md$/.test(postId)) continue;

    const post = postId.slice(0, -3);
    file(`news/${post}/index.html`);

    // Images a post links to are published beside it by
    // scripts/sync-news-assets.mjs, from the file kept next to the Markdown.
    const prefix = `/news/${post}/`;
    for (const [, url] of readFileSync(sourcePath, "utf8").matchAll(/\]\(([^)\s]+)/g)) {
      if (!url.startsWith(prefix)) continue;
      const asset = url.slice(prefix.length);
      byteIdentical.push([
        relative(ROOT, join(contentRoot, postId, "..", asset)),
        `news/${post}/${asset}`,
      ]);
    }
  }

  file("news/index.html");
}

function verifyManualRoutes() {
  const chapterIds = readdirSync(join(ROOT, "content/manual"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d{2}-.+\.md$/.test(entry.name))
    .map((entry) => entry.name.slice(0, -3))
    .sort((a, b) => a.localeCompare(b));

  chapterIds.forEach((chapterId, index) => {
    if (index === 0) {
      file("manual/index.html");
      return;
    }

    // Keep this in step with src/lib/manual.ts: "07-hotkeys" -> "hotkeys".
    const slug = chapterId.slice(chapterId.indexOf("-") + 1);
    file(`manual/${slug}/index.html`);
  });

  file("manual/toc/index.html");
  file("manual/search-index.json");
}

for (const path of requiredFiles) file(path);

verifyNewsRoutes();
verifyManualRoutes();

// Pages that render an image per data entry: every preview and avatar they name
// has to have shipped, however many there are.
verifyPageAssets("src/lib/themes.ts");
verifyPageAssets("src/pages/teams/index.astro");
verifyPageAssets("src/pages/air/index.astro");
verifyPageAssets("src/pages/patrons/index.astro");

const indexPages = allFiles(DIST).filter((path) => path.endsWith("/index.html"));

const forbidden = join(DIST, "404", "index.html");
try {
  statSync(forbidden);
  throw new Error("Unexpected build artifact: dist/404/index.html");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

for (const [sourcePath, distPath] of byteIdentical) {
  const source = readFileSync(join(ROOT, sourcePath));
  const output = readFileSync(file(distPath));
  if (!source.equals(output)) {
    throw new Error(`Build artifact differs from ${sourcePath}: dist/${distPath}`);
  }
}

const relativeRoutes = indexPages.map((path) => relative(DIST, path)).sort();
console.log(`Verified ${relativeRoutes.length} directory pages, raw endpoints, and representative assets.`);
