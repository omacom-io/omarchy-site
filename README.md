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

Front matter needs a `title` and a `date`; `author` (default "Omarchy"),
`author_url`, and `description` are optional. Without a `description` the index
and the social tags fall back to an excerpt of the opening of the post.

Images and other per-post assets live in `public/news/YYYY/MM/post-slug/` and are
linked from the post by their full path, e.g.
`![Alt](/news/2026/09/a-post/photo.webp)`. `public/` is copied to `dist/`
verbatim, so an asset's URL is exactly where you put it — no build step, no
hashing, and it survives beside the page Astro generates for the same directory.

## The Manual

The pages under `manual/` are generated from the authoritative markdown chapters
in the [omarchy repo](https://github.com/basecamp/omarchy/tree/HEAD/manual).
Regenerate them (then commit the result) with:

    bin/build-manual

It needs `gem install kramdown kramdown-parser-gfm` and imagemagick on first run. Pass a local
checkout to build without hitting GitHub: `bin/build-manual ../omarchy/manual`.

## Search

The same build writes `manual/search-index.json` — one entry per heading, so results link
straight to the section that matched. `assets/js/modules/search.js` fetches it the first
time someone reaches for the box in the header and matches in the browser; there is no
search service and nothing to run. Press `/` anywhere in the manual to search.
