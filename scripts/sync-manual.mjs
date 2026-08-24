#!/usr/bin/env node

// Imports the manual from the authoritative chapters in basecamp/omarchy.
//
//   node scripts/sync-manual.mjs                 # the default branch
//   node scripts/sync-manual.mjs <ref>           # a tag, branch or commit
//   node scripts/sync-manual.mjs ../omarchy/manual   # a local checkout
//
// This is a maintenance command, not part of a build: it is the only thing here
// that touches the network, and running it is an intentional content update.
// `pnpm build` and `pnpm dev` render what is committed under content/manual/, so
// a fresh clone builds the whole site offline.
//
// Chapters land in content/manual/ and images in public/manual/images/, both
// committed, and content/manual/SOURCE records the commit they came from so the
// next import can be reviewed as a diff.
//
// Markdown links are rewritten on the way in rather than at render time because
// Astro's Markdown image pipeline claims relative image links and republishes
// them under hashed /_astro/ URLs, which would move every existing image URL.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CHAPTERS = join(ROOT, "content", "manual");
const IMAGES = join(ROOT, "public", "manual", "images");
const SOURCE = join(CHAPTERS, "SOURCE");
const REPOSITORY = "https://github.com/basecamp/omarchy";

const CHAPTER_LINK = /\]\((\d\d)-([\w-]+)\.md(#[^)]*)?\)/g;
const THEME_PREVIEW = /\]\(\.\.\/themes\/([\w-]+)\/(preview(?:-unlock)?)\.png\)/g;

/** The links a chapter carries are repo-relative; the published pages are not. */
function rewriteLinks(markdown) {
  return markdown
    .replace(CHAPTER_LINK, (_, number, slug, anchor = "") =>
      number === "01" ? `](../${anchor})` : `](../${slug}/${anchor})`,
    )
    .replaceAll("](images/", "](/manual/images/")
    .replace(THEME_PREVIEW, "](/manual/images/$1-$2.webp)");
}

function themePreviews(markdown) {
  return [
    ...new Set(
      markdown.flatMap((text) => [...text.matchAll(THEME_PREVIEW)].map(([, slug, kind]) => `${slug}-${kind}`)),
    ),
  ];
}

function haveImagemagick() {
  try {
    execFileSync("magick", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * The themes chapter shows previews that live outside manual/, as PNGs. Without
 * imagemagick the previews already converted are kept as they are, so a chapter
 * import still works; only a preview that has never been converted is fatal.
 */
function convertThemePreviews(source, previews) {
  if (!previews.length) return 0;

  if (!haveImagemagick()) {
    console.warn(`imagemagick not found: keeping the ${previews.length} theme previews already in public/manual/images/`);
    return 0;
  }

  for (const preview of previews) {
    const [, slug, kind] = preview.match(/^(.+)-(preview(?:-unlock)?)$/);
    execFileSync("magick", [
      join(source, "..", "themes", slug, `${kind}.png`),
      "-strip", "-resize", "1600>", "-quality", "82",
      join(IMAGES, `${preview}.webp`),
    ]);
  }
  return previews.length;
}

function sync(source, provenance) {
  const files = readdirSync(source).filter((name) => /^\d\d-[\w-]+\.md$/.test(name)).sort();
  if (!files.length) {
    console.error(`No chapters found in ${source}`);
    process.exit(1);
  }

  const markdown = files.map((name) => readFileSync(join(source, name), "utf8"));
  const previews = themePreviews(markdown);

  // Nothing is removed until every preview can be accounted for, so a machine
  // without imagemagick cannot leave the images half-built.
  mkdirSync(IMAGES, { recursive: true });
  if (!haveImagemagick()) {
    const missing = previews.filter((preview) => !existsSync(join(IMAGES, `${preview}.webp`)));
    if (missing.length) {
      console.error(`imagemagick is required to convert these theme previews: ${missing.join(", ")}`);
      process.exit(1);
    }
  }

  rmSync(CHAPTERS, { recursive: true, force: true });
  mkdirSync(CHAPTERS, { recursive: true });
  files.forEach((name, index) => {
    writeFileSync(join(CHAPTERS, name), rewriteLinks(markdown[index]));
  });
  writeFileSync(SOURCE, `${provenance}\n`);

  const own = join(source, "images");
  if (existsSync(own)) cpSync(own, IMAGES, { recursive: true });

  const converted = convertThemePreviews(source, previews);
  console.log(`Synced ${files.length} chapters and ${readdirSync(IMAGES).length} images (${converted} theme previews converted) from ${provenance}`);
}

/** Unpacks the repo at `ref`; the archive's own directory names the commit. */
function fetchSource(ref, run) {
  const tmp = mkdtempSync(join(tmpdir(), "omarchy-"));
  try {
    execFileSync("sh", ["-c",
      `curl -fsSL ${REPOSITORY}/archive/${ref}.tar.gz | tar xz -C ${tmp} --wildcards '*/manual' '*/themes/*/preview*.png'`,
    ], { stdio: "inherit" });

    const [unpacked] = readdirSync(tmp);
    run(join(tmp, unpacked, "manual"), `${REPOSITORY}/tree/${unpacked.replace(/^omarchy-/, "")}/manual`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const argument = process.argv[2];
if (argument && statSync(argument, { throwIfNoEntry: false })?.isDirectory()) {
  sync(argument, argument);
} else {
  fetchSource(argument ?? "HEAD", sync);
}
