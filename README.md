# Omarchy

Beautiful, Modern & Opinionated Linux by DHH.

See https://github.com/basecamp/omarchy for more.

## The Manual

The pages under `manual/` are generated from the authoritative markdown chapters
in the [omarchy repo](https://github.com/basecamp/omarchy/tree/HEAD/manual).
Regenerate them (then commit the result) with:

    bin/build-manual

It needs `gem install kramdown kramdown-parser-gfm` and imagemagick on first run. Pass a local
checkout to build without hitting GitHub: `bin/build-manual ../omarchy/manual`.
