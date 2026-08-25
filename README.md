# Omarchy

Beautiful, Modern & Opinionated Linux by DHH.

See https://github.com/basecamp/omarchy for more.

## Development

Astro owns every HTML page in the site and runs in static mode: the output in
`dist/` is plain HTML, CSS and JS with no runtime. `dist/` is the deployable
artifact; it is not served from the repository root.

    pnpm install
    pnpm dev      # dev server with live reload
    pnpm build    # type-check and write dist/
    pnpm verify-build # check the deployable dist/ artifact

`pnpm dev` and `pnpm build` first synchronize the generated News asset directory,
then Astro checks and renders the site. The normal build is offline with respect
to site content: it uses only the committed sources and assets after
dependencies have been installed.

`bin/serve` serves `dist/` with clean URLs the way omarchy.org does and requires
Ruby.

## News

Posts are Markdown under `content/news/YYYY/MM/post-slug.md`, read by the `news`
content collection in `src/content.config.ts` and rendered by `src/pages/news/`.
`pnpm build` publishes `/news/` and one `/news/YYYY/MM/post-slug/` page per post;
there is no separate generation step.

Front matter is optional throughout. `title` falls back to the post's first `#`
heading, which is then left out of the body; `date` falls back to the first of
the `YYYY/MM` the post is filed under; `author` defaults to "Omarchy"; and
`description`, used by the index and the social tags, falls back to an excerpt
of the opening of the post. A post with neither a `title` nor a `#` heading
fails the build.

Images and other colocated post assets sit beside the post under
`content/news/YYYY/MM/`, and are linked by their final published path:

    ![Alt](/news/2026/09/a-post/photo.webp)

`pnpm dev` and `pnpm build` first run `scripts/sync-news-assets.mjs`, which
validates every linked file and transactionally copies it to generated
`public/news/YYYY/MM/post-slug/`; Astro publishes that directory verbatim, so
the file is served from the exact URL. It fails without changing the existing
generated directory if a linked file is missing. `public/news/` is generated
output and must not contain tracked files.

The full path is required rather than a bare `photo.webp`, because Astro's
Markdown image pipeline claims relative image links and republishes them under
hashed `/_astro/` URLs, which would move every existing asset URL. The sync
script rejects relative links with that explanation.

## The Manual

The chapters under `content/manual/` are the committed manual snapshot and are
rendered by `src/pages/manual/`. Their committed images live in
`public/manual/images/`. `pnpm build` and `pnpm dev` use only what is committed,
so a fresh clone builds the whole site with no network beyond `pnpm install`.

They originate in the [omarchy repo](https://github.com/basecamp/omarchy/tree/HEAD/manual).
`content/manual/SOURCE` records the commit the current chapters came from.
Importing a newer manual is an explicit maintenance operation, run on its own
and reviewed as a diff — never part of a build:

    pnpm sync-manual                       # the default branch
    pnpm sync-manual 7488eaded43d          # a tag, branch or commit
    pnpm sync-manual ../omarchy/manual     # a local checkout, if you have one

No Omarchy checkout is needed: with no argument, or a remote ref, the command
resolves an immutable commit and fetches it from GitHub. A local source must be
inside a Git checkout so its commit can be recorded in `SOURCE`. The command
stages chapters, images, `SOURCE`, and the themes chapter's
`themes/*/preview*.png` conversions before replacing the committed snapshot;
stale images are removed by the replacement. ImageMagick (`magick`) is required
when the source contains theme previews. The remote import also requires the
standard `git`, `curl`, and `tar` command-line tools. These requirements apply
only to this explicit maintenance command.

The chapters are rewritten on the way in: inter-chapter links like
`07-hotkeys.md#tmux` become `../hotkeys/#tmux`, and image references become
`/manual/images/...`. That has to happen before Astro renders, because its
Markdown image pipeline claims relative image links and republishes them under
hashed `/_astro/` URLs. Don't hand-edit `content/manual/` — the next import
overwrites it.

Chapter order is the `NN-` prefix on the filename, the title is each chapter's
first `#` heading, and chapter `01` is served from `/manual/` itself.

## Other Content

Theme data is maintained in `src/pages/themes/index.astro`, and workstation data
is maintained in `src/pages/workstations/index.astro`. Raw files that are not
HTML pages, including install, upgrade, patch, CSS, and static images, remain
under `public/` and are copied to `dist/` by Astro.

## Deployment

`.github/workflows/deploy-pages.yml` builds and publishes the complete `dist/`
directory with GitHub Pages Actions on pushes to `master` and on manual
dispatch. The repository's GitHub Pages publishing source must be configured to
**GitHub Actions** in repository settings for this workflow to become the
production publisher; it does not deploy the repository root.

## Search

`src/pages/manual/search-index.json.ts` writes `/manual/search-index.json` — one
entry per heading, so results link straight to the section that matched.
`Search.astro` fetches it the first time someone reaches for the box in the
header and matches in the browser; there is no search service and nothing to
run. Press `/` anywhere in the manual to search.
