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
// committed, and content/manual/SOURCE records the immutable commit they came
// from so the next import can be reviewed as a diff.

import { execFileSync } from "node:child_process";
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
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CHAPTERS = join(ROOT, "content", "manual");
const IMAGES = join(ROOT, "public", "manual", "images");
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

function command(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", ...options }).trim();
}

function gitCommit(directory) {
  try {
    return command("git", ["-C", directory, "rev-parse", "HEAD"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(
      `Local manual source ${directory} must be inside a Git checkout so SOURCE can record an immutable commit`,
    );
  }
}

function remoteCommit(ref) {
  if (/^[0-9a-f]{40}$/i.test(ref)) return ref.toLowerCase();

  let output;
  try {
    output = command("git", ["ls-remote", REPOSITORY, ref, `${ref}^{}`]);
  } catch {
    throw new Error(`Could not resolve remote Omarchy ref: ${ref}`);
  }

  const rows = output
    .split("\n")
    .filter(Boolean)
    .map((row) => {
      const [commit, name] = row.split(/\s+/);
      return { commit, name };
    });
  const resolved =
    rows.find(({ name }) => name.endsWith("^{}"))?.commit ??
    rows.find(({ name }) => name === ref)?.commit ??
    rows[0]?.commit;
  if (resolved) return resolved;

  try {
    const response = command("curl", [
      "--fail",
      "--silent",
      "--show-error",
      "--location",
      "--header",
      "Accept: application/vnd.github+json",
      `${REPOSITORY.replace("github.com", "api.github.com/repos")}/commits/${encodeURIComponent(ref)}`,
    ]);
    const commit = JSON.parse(response).sha;
    if (commit) return commit;
  } catch {
    // Report the same clear error for invalid refs and unavailable resolution tools.
  }
  throw new Error(`Could not resolve remote Omarchy ref: ${ref}`);
}

function haveImagemagick() {
  try {
    command("magick", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function validateChapters(source) {
  const files = readdirSync(source)
    .filter((name) => /^\d\d-[\w-]+\.md$/.test(name))
    .sort();
  if (!files.length) throw new Error(`No chapters found in ${source}`);

  const markdown = files.map((name) => {
    const path = join(source, name);
    const text = readFileSync(path, "utf8");
    if (!text.trim()) throw new Error(`Empty chapter: ${path}`);
    return text;
  });
  const previews = themePreviews(markdown);
  const missingPreviews = previews.filter((preview) => {
    const [, slug, kind] = preview.match(/^(.+)-(preview(?:-unlock)?)$/);
    return !existsSync(join(source, "..", "themes", slug, `${kind}.png`));
  });
  if (missingPreviews.length) {
    throw new Error(`Missing theme preview source files: ${missingPreviews.join(", ")}`);
  }
  if (previews.length && !haveImagemagick()) {
    throw new Error(
      `imagemagick is required to convert these theme previews: ${previews.join(", ")}`,
    );
  }

  return { files, markdown, previews };
}

function convertThemePreviews(source, previews, images) {
  for (const preview of previews) {
    const [, slug, kind] = preview.match(/^(.+)-(preview(?:-unlock)?)$/);
    try {
      execFileSync("magick", [
        join(source, "..", "themes", slug, `${kind}.png`),
        "-strip",
        "-resize",
        "1600>",
        "-quality",
        "82",
        join(images, `${preview}.webp`),
      ], { stdio: "inherit" });
    } catch {
      throw new Error(`imagemagick failed while converting ${preview}.png`);
    }
  }
}

function stageSync(source, provenance) {
  const { files, markdown, previews } = validateChapters(source);
  const stage = mkdtempSync(join(ROOT, ".manual-sync-"));
  const stagedChapters = join(stage, "content", "manual");
  const stagedImages = join(stage, "public", "manual", "images");

  try {
    mkdirSync(stagedChapters, { recursive: true });
    mkdirSync(stagedImages, { recursive: true });
    files.forEach((name, index) => {
      writeFileSync(join(stagedChapters, name), rewriteLinks(markdown[index]));
    });
    writeFileSync(join(stagedChapters, "SOURCE"), `${provenance}\n`);

    const own = join(source, "images");
    if (existsSync(own)) cpSync(own, stagedImages, { recursive: true });
    convertThemePreviews(source, previews, stagedImages);

    replaceSnapshot([
      [CHAPTERS, stagedChapters],
      [IMAGES, stagedImages],
    ]);
    console.log(
      `Synced ${files.length} chapters and ${readdirSync(IMAGES).length} images from ${provenance}`,
    );
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

/** Replace both committed directories, rolling back if either replacement fails. */
function replaceSnapshot(replacements) {
  const moved = [];
  let committed = false;

  try {
    for (const [current, staged] of replacements) {
      const backup = mkdtempSync(join(ROOT, ".manual-backup-"));
      rmSync(backup, { recursive: true, force: true });
      const hadCurrent = existsSync(current);
      if (hadCurrent) renameSync(current, backup);
      moved.push({ backup, current, hadCurrent });
      renameSync(staged, current);
    }
    committed = true;
  } finally {
    if (!committed) {
      for (const { backup, current, hadCurrent } of moved.reverse()) {
        rmSync(current, { recursive: true, force: true });
        if (hadCurrent && existsSync(backup)) renameSync(backup, current);
      }
    }
    for (const { backup } of moved) rmSync(backup, { recursive: true, force: true });
  }
}

/** Unpacks an immutable commit archive without requiring an Omarchy checkout. */
function fetchSource(ref) {
  const commit = remoteCommit(ref);
  const temporary = mkdtempSync(join(tmpdir(), "omarchy-"));
  const archive = join(temporary, "source.tar.gz");
  try {
    const archiveUrl = `${REPOSITORY}/archive/${commit}.tar.gz`;
    execFileSync("curl", ["--fail", "--silent", "--show-error", "--location", archiveUrl, "--output", archive], {
      stdio: "inherit",
    });
    execFileSync(
      "tar",
      ["-xzf", archive, "-C", temporary, "--wildcards", "*/manual", "*/themes/*/preview*.png"],
      { stdio: "inherit" },
    );

    const [unpacked] = readdirSync(temporary, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    if (!unpacked) throw new Error("The downloaded Omarchy archive had no source directory");
    stageSync(join(temporary, unpacked.name, "manual"), `${REPOSITORY}/commit/${commit}/manual`);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function localSource(argument) {
  const source = resolve(argument);
  if (!statSync(source, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Manual source directory does not exist: ${argument}`);
  }
  const commit = gitCommit(source);
  stageSync(source, `${REPOSITORY}/commit/${commit}/manual`);
}

try {
  const argument = process.argv[2];
  if (argument && statSync(argument, { throwIfNoEntry: false })?.isDirectory()) {
    localSource(argument);
  } else {
    fetchSource(argument ?? "HEAD");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
