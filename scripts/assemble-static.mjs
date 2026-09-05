#!/usr/bin/env node
/**
 * Finishes the static build by laying omarchy.org's own files over it.
 *
 * The app renders every page it owns into dist/client. Everything else the
 * site serves is a file that already lives in the omarchy-site checkout and
 * has to keep being served exactly as it is: the installer scripts people
 * curl, the assets third parties hot-link, the feed the Ruby build writes,
 * the images that sit beside news posts and manual chapters, the security
 * contact, the redirects and the pages the redesign has not absorbed yet.
 * Those are copied in here, after the render, so the output folder is the
 * whole site and GitHub Pages can upload it the way it uploads the repo now.
 *
 *   OMARCHY_SITE_DIR   the checkout to copy from; defaults to this repository
 */
import { cp, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { ASSETS_ONLY, REDIRECTS, WHOLE } from './site-passthrough.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE = path.resolve(process.env.OMARCHY_SITE_DIR ?? ROOT)
const OUT = path.join(ROOT, 'dist/client')

const copied = []
const missing = []

for (const rel of WHOLE) {
  const from = path.join(SITE, rel)
  if (!existsSync(from)) {
    missing.push(rel)
    continue
  }
  await cp(from, path.join(OUT, rel), { recursive: true, force: true })
  copied.push(rel)
}

/** Everything under a tree except index.html files. */
async function copyAssets(rel) {
  const from = path.join(SITE, rel)
  if (!existsSync(from)) {
    missing.push(rel)
    return
  }
  let n = 0
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.name !== 'index.html') {
        const to = path.join(OUT, path.relative(SITE, full))
        await mkdir(path.dirname(to), { recursive: true })
        await cp(full, to, { force: true })
        n++
      }
    }
  }
  await walk(from)
  copied.push(`${rel} (${n} files, pages left to the app)`)
}

for (const rel of ASSETS_ONLY) await copyAssets(rel)

// Redirect pages for the addresses the redesign folded into other pages.
for (const [from, to] of Object.entries(REDIRECTS)) {
  const file = path.join(OUT, from, 'index.html')
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(
    file,
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting to ${to}</title>
<meta http-equiv="refresh" content="0;url=${to}">
<link rel="canonical" href="https://omarchy.org${to}">
<meta name="robots" content="noindex">
<script>window.location.replace(${JSON.stringify(to)})</script>
</head>
<body><p>This page moved to <a href="${to}">${to}</a>.</p></body>
</html>
`,
  )
  copied.push(`${from} -> ${to} (redirect page)`)
}

// The build must end with the site's entry points in place, or the output is
// not the site. The rest may legitimately be absent from a partial checkout.
for (const must of ['index.html', 'install', 'news/rss.xml', 'CNAME']) {
  if (!existsSync(path.join(OUT, must))) {
    console.error(`assemble: ${must} is missing from ${OUT}`)
    process.exit(1)
  }
}

console.log(`assemble: from ${SITE}`)
for (const c of copied) console.log(`  + ${c}`)
for (const m of missing) console.log(`  ! not in checkout: ${m}`)
const total = (await stat(OUT)).isDirectory() ? 'ok' : 'missing'
console.log(`assemble: dist/client ${total}`)
