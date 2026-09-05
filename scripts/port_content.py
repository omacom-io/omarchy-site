"""Ports the site's own files into the JSON snapshots the app is built from.

Reads an omarchy-site checkout (an argument, else OMARCHY_SITE_DIR, else the
repository this script lives in) and writes:
  src/data/manual.json      ordered manual chapters {slug, title, html}, from
                            the pages bin/build-manual renders
  src/data/news-posts.json  news posts {slug, year, month, path, title, date,
                            dateStr, excerpt, html}, from the pages
                            bin/build-news renders
  src/data/pages.json       standalone pages keyed by path {title, html}
  src/data/banner.json      the homepage callout {href, html}, or null
  src/data/teams.json       the teams page, parsed into teams and members
  src/data/themes.json      the theme gallery {repo, image, name}, from
                            themes/index.html - the file a theme pull
                            request edits, read on every build so a merged
                            theme is on the next deploy

Nothing is downloaded: the checkout is the source. Links are kept in the
site's own form (a trailing slash on every page, news at its dated address)
and assets stay root-relative, since the build serves the checkout's files
at those addresses. With --marketplace, also ports the plugin marketplace's
develop/publish docs from that repository, over the network.
"""

import html as html_mod
import io
import os
import json
import re
import sys
import tarfile
import tempfile
import urllib.request
from html import unescape
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'src' / 'data'

PAGES = [
    'air', 'foundation', 'meetups', 'patrons', 'security', 'security/credits',
    'sponsorships', 'teams', 'workstations', 'potato', 'server', 'omakub', 'brand',
]


def get_repo(argv):
    """The omarchy-site checkout to read: an argument, else OMARCHY_SITE_DIR,
    else the repository this script lives in - which is the layout once the
    site is that repository. Nothing is downloaded any more: the site's own
    files are the source, and the generated news, manual and feed in it are
    what its Ruby scripts and its bot keep current."""
    if len(argv) > 1:
        return Path(argv[1]).resolve()
    env = os.environ.get('OMARCHY_SITE_DIR')
    if env:
        return Path(env).resolve()
    return Path(__file__).resolve().parent.parent


def clean(html: str, *, manual_slug: str | None = None) -> str:
    """Rewrite links/assets for the new site and drop em dashes."""
    # The imported chapters end with their own prev/contents/next nav. The
    # site renders a pagination row of its own below the article, so the
    # imported one would show the same links twice.
    html = re.sub(r'\s*<nav class="manual__pagination">.*?</nav>', "", html, flags=re.S)
    # Manual-relative links like ../dual-boot-install/ or ./images/x
    if manual_slug is not None:
        html = re.sub(r'(href|src)="\.\./([^"]+)"', r'\1="/manual/\2"', html)
        html = re.sub(r'(href|src)="\./', '\\1="/manual/%s/' % manual_slug, html)

    # Absolute omarchy.org links become root-relative (they are all ported)
    html = re.sub(r'href="https://omarchy\.org/?"', 'href="/"', html)
    html = html.replace('href="https://omarchy.org/', 'href="/')
    # The plugins marketplace now lives at /plugins
    html = re.sub(r'href="https://(?:omarchyplugins\.com|plugins\.omarchy\.org)/?[^"]*"',
                  'href="/plugins"', html)

    # Assets are root-relative: the files are in this repository, and the
    # build lays them over the output at these very addresses.

    # Internal page links keep omarchy.org's form: dated news addresses,
    # and a trailing slash on every page path. Files (anything with an
    # extension) and fragments are left as they are.
    html = re.sub(r'href="/news/(\d{4}/\d{2}/[^"/#]+)/?(#[^"]*)?"', r'href="/news/\1/\2"', html)
    html = re.sub(r'href="(/[a-z0-9\-/]*[a-z0-9\-])(#[^"]*)?"',
                  lambda m: m.group(0) if re.search(r'\.[a-z0-9]+$', m.group(1)) else 'href="%s/%s"' % (m.group(1), m.group(2) or ''),
                  html)

    # House style: no em dashes, anywhere
    html = html.replace('&mdash;', '&#EMDASH#;').replace('\u2014', '&#EMDASH#;')
    html = re.sub(r'\s*&#EMDASH#;\s*', ' - ', html)

    return html.strip()


def extract_main(src: str) -> str:
    m = re.search(r'<main[^>]*>(.*)</main>', src, re.S)
    return m.group(1) if m else ''


def extract_title(src: str) -> str:
    m = re.search(r'<header class="header[^"]*">\s*<h1>(.*?)</h1>', src, re.S)
    if m:
        return unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip()
    m = re.search(r'<title>([^<]*)</title>', src)
    title = unescape(m.group(1)) if m else ''
    return re.split(r'\s+[-\u2014]\s+', title)[0].strip()




def parse_teams(html: str) -> list[dict]:
    """Turns the ported teams page into structured teams and members.

    The page itself is rendered from its HTML, but the home page wants to
    show a few of the faces in its own layout, and picking them back out of
    a blob of markup at render time is not something a page should do.
    """
    teams = []
    for block in re.findall(
        r'<section class="team" id="([^"]+)">(.*?)</section>', html, re.S
    ):
        team_id, body = block
        name = re.search(r'class="team__name">([^<]+)<', body)
        desc = re.search(r'class="team__description">([^<]*)<', body)
        members = []
        for member in re.findall(r'<article class="member">(.*?)</article>',
                                 body, re.S):
            avatar = re.search(r'class="member__avatar" src="([^"]+)"', member)
            person = re.search(
                r'class="member__name">(?:<a href="([^"]+)">)?([^<]+)', member)
            meta = re.search(r'class="member__meta">([^<]*)<', member)
            if not person:
                continue
            members.append({
                'name': html_mod.unescape(person.group(2).strip()),
                'meta': html_mod.unescape((meta.group(1) if meta else '').strip()),
                'href': person.group(1),
                'avatar': avatar.group(1) if avatar else None,
            })
        # The line under a team's members, when it has one: a sentence with
        # at most one link in it (the security page, the rangers' address).
        note = None
        note_m = re.search(r'<p class="team__note">(.*?)</p>', body, re.S)
        if note_m:
            raw = note_m.group(1)
            link = re.search(r'<a href="([^"]+)">([^<]*)</a>', raw)
            note = {
                'text': html_mod.unescape(re.sub(r'<[^>]+>', '', raw).strip()),
                'href': link.group(1) if link else None,
                'linkText': html_mod.unescape(link.group(2).strip()) if link else None,
            }
        teams.append({
            'id': team_id,
            'name': html_mod.unescape(name.group(1).strip()) if name else team_id,
            'description': html_mod.unescape(desc.group(1).strip()) if desc else '',
            'members': members,
            'note': note,
        })
    return teams


def port_marketplace(repo: Path) -> None:
    """Ports the marketplace's develop/publish docs into plugin-pages.json."""
    pages = {}
    for slug in ['develop', 'publish']:
        src = (repo / 'site' / f'{slug}.html').read_text()
        m = re.search(r'<main[^>]*>(.*)</main>', src, re.S)
        html = m.group(1) if m else ''
        # drop the sidebar TOC nav if present; keep the article content
        html = re.sub(r'<nav class="page-toc".*?</nav>', '', html, flags=re.S)
        # extract title from the page header, then remove the header block
        t = re.search(r'<h1>(.*?)</h1>', html, re.S)
        title = unescape(re.sub(r'<[^>]+>', '', t.group(1))).strip() if t else slug
        meta = re.search(r'<div class="page-meta">(.*?)</div>', html, re.S)
        meta_text = unescape(re.sub(r'<[^>]+>', ' ', meta.group(1))).split() if meta else []
        html = re.sub(r'<header class="page-header".*?</header>', '', html, count=1, flags=re.S)
        # internal links
        html = html.replace('href="develop.html', 'href="/plugins/develop')
        html = html.replace('href="publish.html', 'href="/plugins/publish')
        html = html.replace('href="explore.html', 'href="/plugins/explore')
        html = html.replace('href="index.html', 'href="/plugins')
        html = re.sub(r'href="plugin\.html\?id=([^"]+)"', r'href="/plugins/\1"', html)
        html = html.replace('src="assets/', 'src="https://plugins.omarchy.org/assets/')
        html = html.replace('href="https://omarchy.org/manual', 'href="/manual')
        # no em dashes
        html = html.replace('&mdash;', '&#EM#;').replace('\u2014', '&#EM#;')
        html = re.sub(r'\s*&#EM#;\s*', ' - ', html)
        pages[slug] = {'title': title, 'meta': ' '.join(meta_text), 'html': html.strip()}
    (OUT / 'plugin-pages.json').write_text(json.dumps(pages))
    print(f'plugin-pages.json: {len(pages)} pages')


def main() -> None:
    argv = [a for a in sys.argv if not a.startswith('--')]
    repo = get_repo(argv)
    argv = sys.argv

    # ---------------------------------------------------------------- manual
    toc_src = (repo / 'manual/getting-started/index.html').read_text()
    toc = re.findall(r'<li><a href="/manual/([^"]*)"[^>]*>(.*?)</a></li>', toc_src)
    chapters = []
    for href, label in toc:
        slug = href.strip('/') or 'index'
        path = repo / 'manual' / (href.strip('/') or '.') / 'index.html'
        src = path.read_text()
        m = re.search(r'<article class="manual__content">(.*?)</article>', src, re.S)
        body = m.group(1) if m else extract_main(src)
        body = re.sub(r'^\s*<h1>.*?</h1>', '', body, count=1, flags=re.S)
        chapters.append({
            'slug': slug,
            'title': unescape(re.sub(r'<[^>]+>', '', label)).strip(),
            'html': clean(body, manual_slug=slug),
        })
    (OUT / 'manual.json').write_text(json.dumps(chapters))
    print(f'manual.json: {len(chapters)} chapters')

    # ------------------------------------------------------------------ news
    posts = []
    for path in sorted(repo.glob('news/*/*/*/index.html')):
        src = path.read_text()
        slug = path.parent.name
        # news/YYYY/MM/slug/index.html - the dated path is the address the
        # feed and every shared link use.
        year, month = path.parent.parent.parent.name, path.parent.parent.name
        title_m = re.search(r'<h1 class="news-post__title">(.*?)</h1>', src, re.S)
        time_m = re.search(r'datetime="([^"]+)">([^<]+)</time>', src)
        prose_m = re.search(r'<div class="news-prose">(.*?)</div>\s*(?:<footer|</article)', src, re.S)
        html = clean(prose_m.group(1) if prose_m else extract_main(src))
        first_p = re.search(r'<p>(.*?)</p>', html, re.S)
        excerpt = unescape(re.sub(r'<[^>]+>', '', first_p.group(1))).strip() if first_p else ''
        if len(excerpt) > 220:
            excerpt = excerpt[:220].rsplit(' ', 1)[0] + '\u2026'
        posts.append({
            'slug': slug,
            'year': year,
            'month': month,
            'path': f'/news/{year}/{month}/{slug}/',
            'title': unescape(re.sub(r'<[^>]+>', '', title_m.group(1))).strip() if title_m else slug,
            'date': time_m.group(1) if time_m else '',
            'dateStr': time_m.group(2).strip() if time_m else '',
            'excerpt': excerpt,
            'html': html,
        })
    posts.sort(key=lambda p: p['date'], reverse=True)
    (OUT / 'news-posts.json').write_text(json.dumps(posts))
    print(f'news-posts.json: {len(posts)} posts')

    # ----------------------------------------------------------------- pages
    pages = {}
    for slug in PAGES:
        src = (repo / slug / 'index.html').read_text()
        pages[slug] = {
            'title': extract_title(src),
            'html': clean(extract_main(src)),
        }
    (OUT / 'pages.json').write_text(json.dumps(pages))
    print(f'pages.json: {len(pages)} pages')

    # ---------------------------------------------------------------- banner
    # The homepage's callout: one line in index.html, edited by hand whenever
    # there is news worth a banner, and absent when there is not. Read from
    # there so the same edit keeps working; the hero shows it as a pill.
    home = (repo / 'index.html').read_text()
    found = re.search(
        r'<div class="notification">\s*<a href="([^"]+)">(.*?)</a>\s*</div>',
        home,
        re.S,
    )
    banner = None
    if found:
        # The same link rules as the pages, so a news address gets its
        # trailing slash and an omarchy.org link becomes a local one.
        link = clean(f'<a href="{found.group(1)}">x</a>')
        banner = {
            'href': re.search(r'href="([^"]+)"', link).group(1),
            'html': clean(found.group(2).strip()),
        }
    (OUT / 'banner.json').write_text(json.dumps(banner))
    print(f"banner.json: {banner['html'] if banner else 'none'}")

    # ----------------------------------------------------------------- teams
    # ---------------------------------------------------------------- themes
    # The gallery is the figure blocks contributors add to themes/index.html
    # by hand, in the shape the README documents. Read here, at build time,
    # rather than on the refresh schedule: a merged theme has to be on the
    # site the next time it deploys, the way it always has been.
    themes_html = (repo / 'themes' / 'index.html').read_text()
    themes = [
        {'repo': href, 'image': image, 'name': unescape(name.strip())}
        for href, image, name in re.findall(
            r'<figure class="themes__theme">.*?<a href="([^"]+)"><img src="([^"]+)".*?'
            r'<figcaption><a[^>]*>([^<]+)</a></figcaption>',
            themes_html, re.S)
    ]
    (OUT / 'themes.json').write_text(json.dumps(themes, indent=1))
    print(f'themes.json: {len(themes)} themes')

    teams = parse_teams(pages['teams']['html'])
    (OUT / 'teams.json').write_text(json.dumps(teams, indent=1))
    print(f'teams.json: {len(teams)} teams, '
          f'{sum(len(t["members"]) for t in teams)} people')

    # ------------------------------------------------------- marketplace docs
    # Another repository, over the network. A build of the site reads only
    # the site's own files, so this part runs only when asked for.
    if '--marketplace' not in argv:
        return
    data = urllib.request.urlopen(
        'https://github.com/omacom/omarchy-plugin-marketplace/archive/refs/heads/main.tar.gz').read()
    tmp = Path(tempfile.mkdtemp())
    with tarfile.open(fileobj=io.BytesIO(data)) as tf:
        tf.extractall(tmp, filter='data')
    port_marketplace(tmp / 'omarchy-plugin-marketplace-main')


if __name__ == '__main__':
    main()
