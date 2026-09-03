#!/usr/bin/env node
/**
 * Refreshes the data snapshots that come from outside this repository:
 *   src/data/plugins.json      the marketplace's built catalogue (full field set)
 *   public/data/explorer.json  the plugin similarity map for /plugins/explore
 *   src/data/version.json      the current release, from the OS repo's releases
 * Everything the site shows from its own files - the manual, the news, the
 * pages, the teams, the theme gallery - is read at build time by
 * scripts/port_content.py instead, so it is never behind a deploy.
 *
 * Run: node scripts/refresh-data.mjs   (npm run refresh-data)
 * CI runs it on a schedule and commits what changed.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'src/data')
const PUBLIC_DATA = path.join(ROOT, 'public/data')

const MP_RAW =
  'https://raw.githubusercontent.com/omacom/omarchy-plugin-marketplace/main/site'

const noEmDash = (s) => String(s ?? '').replace(/\s*—\s*/g, ' - ')

const decode = (s) =>
  s
    .replaceAll('&amp;', '&')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.text()
}

const asset = (p) => (p ? `https://plugins.omarchy.org/${p}` : null)

// ---------------------------------------------------------------- plugins
const catalog = JSON.parse(await fetchText(`${MP_RAW}/catalog.json`))
const plugins = catalog.plugins
  .filter((p) => p.id && p.name)
  .map((p) => ({
    id: p.id,
    name: noEmDash(p.name),
    description: noEmDash((p.description ?? '').slice(0, 300)),
    author: p.author ?? null,
    category: p.category ?? 'Other',
    kind: p.kind ?? null,
    tags: p.tags ?? [],
    stars: Number(p.stars ?? 0),
    version: p.version ?? null,
    verified: p.verificationStatus === 'verified',
    verificationStatus: p.verificationStatus ?? null,
    verificationCoverage: p.verificationCoverage ?? null,
    verificationSnapshotStatus: p.verificationSnapshotStatus ?? null,
    sourceType: p.sourceType === 'builtin' ? 'builtin' : 'community',
    builtIn: Boolean(p.builtIn || p.sourceType === 'builtin'),
    placeholder: Boolean(p.placeholder),
    repo: p.repo ?? null,
    sourceUrl: p.sourceUrl ?? null,
    repositoryLayout: p.repositoryLayout ?? null,
    installAvailable: Boolean(p.installAvailable),
    installCommand: p.installCommand ?? '',
    installNote: noEmDash(p.installNote ?? ''),
    status: p.status ?? null,
    license: p.license ?? null,
    addedAt: p.addedAt ?? null,
    listedAt: p.listedAt ?? null,
    updatedAt: p.repositoryUpdatedAt ?? null,
    repositoryRelease: p.repositoryRelease ?? null,
    listingValidatedCommit: p.listingValidatedCommit ?? null,
    listingValidatedAt: p.listingValidatedAt ?? null,
    listingValidatedBranch: p.listingValidatedBranch ?? null,
    upstreamCheckStatus: p.upstreamCheckStatus ?? null,
    upstreamCheckedAt: p.upstreamCheckedAt ?? null,
    upstreamObservedCommit: p.upstreamObservedCommit ?? null,
    upstreamObservedBranch: p.upstreamObservedBranch ?? null,
    upstreamValidatedCommit: p.upstreamValidatedCommit ?? null,
    thumb: asset(p.previewThumbnail),
    thumbW: Number(p.previewThumbnailWidth ?? 0) || null,
    thumbH: Number(p.previewThumbnailHeight ?? 0) || null,
    image: asset(p.previewImage),
    accent: p.accent ?? null,
    initials: p.initials ?? null,
  }))
await writeFile(
  path.join(OUT, 'plugins.json'),
  JSON.stringify({ generatedAt: catalog.generatedAt, plugins }),
)
console.log(
  `plugins.json: ${plugins.length} plugins (${plugins.filter((p) => p.sourceType === 'builtin').length} built-in)`,
)

// ---------------------------------------------------------------- explorer
await mkdir(PUBLIC_DATA, { recursive: true })
const explorer = JSON.parse(await fetchText(`${MP_RAW}/explorer-data.json`))
for (const node of explorer.nodes ?? []) {
  node.description = noEmDash(node.description ?? '')
  node.previewThumbnail = node.previewThumbnail
    ? `https://plugins.omarchy.org/${node.previewThumbnail}`
    : null
}
await writeFile(
  path.join(PUBLIC_DATA, 'explorer.json'),
  JSON.stringify(explorer),
)
console.log(
  `explorer.json: ${explorer.nodes?.length ?? 0} nodes, ${explorer.edges?.length ?? 0} edges, ${explorer.clusters?.length ?? 0} clusters`,
)

// ---------------------------------------------------------------- version
// The current release, from the OS repository's latest GitHub release -
// the tag is the version, and the ISO is published under that version at
// iso.omarchy.org - so the download button and the ISO links follow what
// is actually shipping, on the same schedule as the rest of this file.
const release = JSON.parse(
  await fetchText(
    'https://api.github.com/repos/omacom/omarchy/releases/latest',
  ),
)
const version = String(release.tag_name ?? '').replace(/^v/, '')
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`unexpected release tag: ${release.tag_name}`)
}
await writeFile(
  path.join(OUT, 'version.json'),
  JSON.stringify(
    { version, isoUrl: `https://iso.omarchy.org/omarchy-${version}.iso` },
    null,
    1,
  ),
)
console.log(`version.json: ${version}`)
