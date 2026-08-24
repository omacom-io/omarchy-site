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
migrated yet — the manual, news, themes, the other sections and all of `assets/` —
sits in `public/` and is copied to `dist/` untouched, so its URLs are unchanged.
`bin/serve` serves `dist/` with clean URLs the way omarchy.org does.

## News

Add posts as Markdown under `content/news/YYYY/MM/post-slug.md`. A post may
start with YAML front matter containing `title`, `date`, `author`, `author_url`,
and `description`; only the title is required, either there or as the first `#`
heading. Images stored beside the post are published with it. Regenerate the
pages under `news/` with:

    bin/build-news

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
