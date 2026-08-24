# Omarchy

Beautiful, Modern & Opinionated Linux by DHH.

See https://github.com/basecamp/omarchy for more.

## Development

The site is built with [Astro](https://astro.build) in static mode: the output in
`dist/` is plain HTML, CSS and JS with no runtime.

    pnpm install
    pnpm dev      # dev server with live reload
    pnpm build    # type-check and write dist/

Pages migrated to Astro live in `src/pages/`, with the shared document shell in
`src/layouts/Layout.astro` and shared markup in `src/components/`. Everything not
migrated yet — the manual, themes, the other sections and all of `assets/` — sits
in `public/` and is copied to `dist/` untouched, so its URLs are unchanged.
`bin/serve` serves `dist/` with clean URLs the way omarchy.org does.

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

Images and other per-post files sit beside the post, in `content/news/YYYY/MM/`,
and are linked by the path they are published at:

    ![Alt](/news/2026/09/a-post/photo.webp)

`pnpm dev` and `pnpm build` first run `scripts/sync-news-assets.mjs`, which
copies each linked file to `public/news/YYYY/MM/post-slug/`; Astro publishes
`public/` verbatim, so the file is served from that exact URL. It fails the
build if a linked file is missing.

The full path is required rather than a bare `photo.webp`, because Astro's
Markdown image pipeline claims relative image links and republishes them under
hashed `/_astro/` URLs, which would move every existing asset URL. The sync
script rejects relative links with that explanation.

## The Manual

The chapters under `content/manual/` are the manual's source here, committed
alongside their images in `public/manual/images/`, and rendered by
`src/pages/manual/`. `pnpm build` and `pnpm dev` use only what is committed, so
a fresh clone builds the whole site with no network beyond `pnpm install`.

They originate in the [omarchy repo](https://github.com/basecamp/omarchy/tree/HEAD/manual).
`content/manual/SOURCE` records the commit the current chapters came from.
Importing a newer manual is a deliberate content update, run on its own and
reviewed as a diff — never part of a build:

    pnpm sync-manual                       # the default branch
    pnpm sync-manual 7488eaded43d          # a tag, branch or commit
    pnpm sync-manual ../omarchy/manual     # a local checkout, if you have one

No checkout is needed: with no argument, or a ref, it fetches from GitHub. It
rewrites `content/manual/`, refreshes `public/manual/images/`, converts the
themes chapter's `themes/*/preview*.png` to WebP — which needs imagemagick —
and updates `SOURCE`. Without imagemagick the previews already converted are
kept and only a brand-new one is an error, so chapters can be imported without
it. Nothing is deleted until the previews are accounted for.

The chapters are rewritten on the way in: inter-chapter links like
`07-hotkeys.md#tmux` become `../hotkeys/#tmux`, and image references become
`/manual/images/...`. That has to happen before Astro renders, because its
Markdown image pipeline claims relative image links and republishes them under
hashed `/_astro/` URLs. Don't hand-edit `content/manual/` — the next import
overwrites it.

Chapter order is the `NN-` prefix on the filename, the title is each chapter's
first `#` heading, and chapter `01` is served from `/manual/` itself.

## Search

`src/pages/manual/search-index.json.ts` writes `/manual/search-index.json` — one
entry per heading, so results link straight to the section that matched.
`assets/js/modules/search.js` fetches it the first time someone reaches for the
box in the header and matches in the browser; there is no search service and
nothing to run. Press `/` anywhere in the manual to search.
