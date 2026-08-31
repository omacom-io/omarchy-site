# Translating omarchy.org into Chinese

Status: plan only, nothing built. (August 30, 2026)

## The constraint that shapes everything: hosting

It is not just Cloudflare. GitHub Pages is also unreliable-to-blocked in
mainland China, so omarchy.org is effectively unreachable there today
regardless of language. The fix has a legal shape, not a technical one:

- A mainland CDN requires an ICP filing (备案), which requires a Chinese
  legal entity — and the domain suffix must be on MIIT's approved list.
  `.org` is not on it. A mainland-hosted mirror cannot live on omarchy.org
  or any subdomain of it; it needs something like `omarchy.cn` or
  `omarchy.com.cn`, plus an entity to file under, plus the content
  compliance obligations that follow.
- The pragmatic middle ground is Hong Kong or Singapore edge hosting on a
  separate domain, pointed away from Cloudflare. No ICP needed, generally
  reachable from the mainland, slower than a true mainland CDN but
  categorically better than blocked. This is what most open-source
  projects do.
- The biggest China win may not be the website: the ISO and package
  mirror. Chinese university mirrors (TUNA, USTC, SJTU) already mirror
  Arch and routinely pick up distros. Getting omarchy's repo and ISO onto
  one solves the heavy-bandwidth problem with zero legal setup, and it is
  how Chinese users expect to get a distro anyway.

Recommendation: separate mirror domain (HK-hosted to start, mainland later
if an entity ever exists), same built output deployed to both, and pursue
a university mirror for the artifacts in parallel.

## Structure: a path prefix — but /zh/, not /cn/

`cn` is a country; `zh` is the language, and `zh` is what hreflang and
browsers speak. Full duplication under the prefix is right for this site:
it is static, and per-page parallel trees are what static hosting is good
at. Each English page carries `<link rel="alternate" hreflang="zh" ...>`
pointing at its twin and vice versa.

Translate the sources, not the outputs. News and the entire 52-chapter
manual are generated from markdown; translating built HTML would be washed
away on every rebuild. The generators (bin/build-news, bin/build-manual)
learn a second pass: same templates, translated markdown in,
/zh/manual/... out.

The translation itself is an agent job wired into the build:

- A small glossary: theme names, "Omarchy Core", "the malleable computer",
  what stays English.
- A translation memory keyed by paragraph hash, so a rebuild only
  re-translates paragraphs that changed. The site churns too fast for
  anything non-incremental — the manual regenerates from upstream and news
  lands weekly; a manual process is stale within a month.
- Fall back per-page to English rather than blocking a deploy on
  translation.

## Toggle: a link, not a redirect

Auto-redirecting on Accept-Language breaks shared links, fights users who
prefer English, and confuses crawlers. Instead: a small 中文 / English
link in the header (or beside the footer trademark line), each page
linking to its own twin. Optionally remember the choice in localStorage
with a one-time hint, never a forced redirect. On the China mirror domain,
Chinese is the default and the toggle points the other way.

## The font problem

JetBrains Mono has no CJK glyphs; Chinese text would fall back to
whatever the OS has and lose the terminal aesthetic. Use Sarasa Mono SC
(Iosevka fused with Source Han Sans — genuinely monospaced CJK, fits
Omarchy perfectly) or Noto Sans Mono CJK as the /zh/ fallback stack.
Expect small CSS deltas: CJK wants looser line-height and no
letter-spacing tricks. The ASCII masthead stays as-is.

## Order of work

1. Getting-started chapters of the manual plus the homepage — highest
   value per word.
2. The full manual via the build pass.
3. News going forward only; leave the archive English.
4. Themes and workstations are mostly images and nearly free.

In parallel: the HK mirror domain, and the university-mirror conversation
for ISO + packages.
