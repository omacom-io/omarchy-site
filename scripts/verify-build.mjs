#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");

const requiredFiles = [
  "index.html",
  "404.html",
  "CNAME",
  "discord/index.html",
  "news/index.html",
  "news/2026/09/the-omarchy-core-team/index.html",
  "news/2026/08/omacom-foundation-launches-with-8-million/index.html",
  "manual/index.html",
  "manual/search-index.json",
  "manual/getting-started/index.html",
  "manual/themes/index.html",
  "themes/index.html",
  "workstations/index.html",
  "meetups/index.html",
  "patrons/index.html",
  "potato/index.html",
  "security/index.html",
  "server/index.html",
  "teams/index.html",
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
  [
    "content/news/2026/09/core-team.webp",
    "news/2026/09/the-omarchy-core-team/core-team.webp",
  ],
  ["public/manual/images/install-config.webp", "manual/images/install-config.webp"],
  ["public/manual/images/tokyo-night-preview.webp", "manual/images/tokyo-night-preview.webp"],
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

for (const path of requiredFiles) file(path);

const indexPages = allFiles(DIST).filter((path) => path.endsWith("/index.html") || path === join(DIST, "index.html"));
if (indexPages.length !== 70) {
  throw new Error(`Expected 70 directory pages, found ${indexPages.length}`);
}

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
console.log(`Verified ${relativeRoutes.length + 1} routes, raw endpoints, and representative assets.`);
