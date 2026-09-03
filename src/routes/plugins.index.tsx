import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  VerifiedIcon,
} from '@/components/icons'
import type { CatalogueEntry, PluginSort, PluginSource } from '@/lib/plugins'
import { PAGE_SIZE, getCatalogue, getPluginsOverview } from '@/lib/plugins'
import { DEFAULT_QUERY, listPlugins } from '@/lib/plugin-filter'
import type { PluginQuery } from '@/lib/plugin-filter'
import { PluginCard } from '@/components/PluginCard'
import { SearchField } from '@/components/SearchField'
import { PluginsNav } from '@/components/PluginsNav'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { seo } from '@/lib/seo'

const sortOptions: Array<{ value: PluginSort; label: string }> = [
  { value: 'stars', label: 'Most starred' },
  { value: 'recent', label: 'Recently added' },
  { value: 'updated', label: 'Recent activity' },
  { value: 'views', label: 'Most viewed' },
  { value: 'copies', label: 'Most copied' },
  { value: 'hearts', label: 'Most hearts' },
  { value: 'name', label: 'A–Z' },
]

// Every param is optional with a default, so links can target /plugins bare
// and URLs only carry params the user actually changed.
type PluginSearch = {
  q?: string
  category?: string
  sort?: PluginSort
  verified?: boolean
  source?: PluginSource
  page?: number
}

export const Route = createFileRoute('/plugins/')({
  validateSearch: (search: Record<string, unknown>): PluginSearch => ({
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
    category:
      typeof search.category === 'string' && search.category !== 'all'
        ? search.category
        : undefined,
    sort:
      sortOptions.some((o) => o.value === search.sort) &&
      search.sort !== 'stars'
        ? (search.sort as PluginSort)
        : undefined,
    verified: search.verified === true ? true : undefined,
    source: search.source === 'builtin' ? 'builtin' : undefined,
    page:
      typeof search.page === 'number' && search.page > 1
        ? Math.floor(search.page)
        : undefined,
  }),
  // No loader deps on purpose. The page the build renders is the default
  // listing; every change to the search params after that is answered in
  // the browser from the catalogue, so the loader must not re-run for them -
  // on a static host there is nothing for it to run against.
  loader: async () => {
    // The catalogue is invoked here as well as in the browser, and its result
    // deliberately not returned: a static function is only written to the
    // build's cache when something runs it during the prerender, and the
    // browser can only fetch a file that exists. Running it here writes the
    // file; leaving it out of the loader data keeps 0.9MB out of the page.
    const [overview] = await Promise.all([getPluginsOverview(), getCatalogue()])
    return overview
  },
  head: () =>
    seo({
      title: 'Plugins - Omarchy',
      description:
        'The community marketplace for Omarchy Quattro plugins. Inspect the source, copy the command, and shape your shell around the way you work.',
      path: '/plugins/',
    }),
  component: PluginsPage,
})

/** The search params as a full query, defaults filled in. */
function toQuery(search: PluginSearch): PluginQuery {
  return {
    q: search.q ?? '',
    category: search.category ?? 'all',
    sort: search.sort ?? 'stars',
    verified: search.verified ?? false,
    source: search.source ?? 'community',
    page: search.page ?? 1,
  }
}

const isDefault = (query: PluginQuery) =>
  (Object.keys(DEFAULT_QUERY) as Array<keyof PluginQuery>).every(
    (k) => query[k] === DEFAULT_QUERY[k],
  )

function PluginsPage() {
  const search = Route.useSearch()
  const overview = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const active = toQuery(search)

  // The catalogue arrives once, the first time this page mounts, and every
  // filter after that is computed here. Until it has, the build's default
  // listing stands in - which is exactly right when the params are the
  // defaults, and a moment's wait when a link arrived with them set.
  const [catalogue, setCatalogue] = useState<Array<CatalogueEntry> | null>(null)
  useEffect(() => {
    let cancelled = false
    void getCatalogue().then((all) => {
      if (!cancelled) setCatalogue(all)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // The first client render has to be the server's render, or React reports
  // a mismatch and throws the prerendered markup away. A link that arrives
  // with params set would otherwise show "Loading" where the server showed
  // the default listing - so until this page has mounted, it shows exactly
  // what the build rendered, and only then may it say it is settling.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const listing = catalogue
    ? listPlugins(catalogue, active)
    : mounted && !isDefault(active)
      ? null
      : overview
  const settling = listing === null
  const { items, total, page, pageCount, categories, counts } =
    listing ?? overview
  // The controls too: a sort or category from the address would label its
  // control differently from the build's default until mounted, and that is
  // a text mismatch. They show the defaults until this page has mounted.
  const shown = mounted ? active : DEFAULT_QUERY

  const source = shown.source
  // Local input state so typing is instant; the URL follows after a 300ms
  // debounce. It starts empty to match the build, and takes the address's
  // term on mount.
  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQuery(search.q ?? '')
  }, [search.q])

  // "/" (or Cmd/Ctrl+K) focuses search, like the live marketplace.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const typing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      if (typing) return
      // Cmd-K opens the site-wide palette; this field answers to the slash.
      if (e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function onQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({
        search: (prev) => ({ ...prev, q: value, page: 1 }),
        replace: true,
      })
    }, 300)
  }

  function patchSearch(patch: Partial<PluginSearch>) {
    navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    })
  }

  const rangeStart = (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Plugin marketplace
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
            Community-built plugins for the Quattro shell. Inspect the source,
            copy the command, and shape your shell around the way you work.
          </p>
        </div>
        <PluginsNav />
      </header>

      <div
        role="tablist"
        aria-label="Plugin source"
        className="mt-8 flex border-b border-border-subtle"
      >
        {(
          [
            {
              value: 'community',
              label: `Community (${counts.community.toLocaleString('en-US')})`,
            },
            { value: 'builtin', label: `Built-in (${counts.builtin})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={source === tab.value}
            onClick={() =>
              patchSearch({
                source: tab.value === 'builtin' ? 'builtin' : undefined,
                category: undefined,
                page: 1,
              })
            }
            className={cn(
              '-mb-px border-b-2 px-3.5 py-2.5 text-sm transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              source === tab.value
                ? 'border-brand font-medium text-text'
                : 'border-transparent text-text-secondary hover:text-text',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form
        role="search"
        aria-label="Filter plugins"
        onSubmit={(e) => e.preventDefault()}
        className="mt-6 flex flex-wrap items-center gap-2.5"
      >
        <SearchField
          className="flex-1 basis-64"
          inputRef={inputRef}
          value={query}
          onChange={onQueryChange}
          placeholder="Search plugins, tags, authors…"
          label="Search plugins"
          trailing={
            <kbd
              aria-hidden="true"
              className="hidden border border-border-subtle px-1.5 font-mono text-xs text-text-muted select-none sm:block"
            >
              /
            </kbd>
          }
        />

        <Select
          items={[
            { value: 'all', label: 'All categories' },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
          value={shown.category}
          onValueChange={(value) => patchSearch({ category: value as string })}
        >
          <SelectTrigger aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={sortOptions}
          value={shown.sort}
          onValueChange={(value) => patchSearch({ sort: value as PluginSort })}
        >
          <SelectTrigger aria-label="Sort by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          aria-pressed={shown.verified}
          onClick={() => patchSearch({ verified: !search.verified })}
          className={cn(
            'flex h-10 items-center gap-1.5 border px-3 text-sm transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            shown.verified
              ? 'border-brand/40 bg-brand-soft text-brand'
              : 'border-input text-text-secondary hover:text-text',
          )}
        >
          <VerifiedIcon className="size-5" />
          Verified
        </button>
      </form>

      <p
        className="mt-6 font-mono text-[13px] text-text-muted tabular-nums"
        aria-live="polite"
      >
        {settling
          ? 'Loading the catalogue…'
          : total === 0
            ? 'No plugins match'
            : `Showing ${rangeStart.toLocaleString('en-US')}–${rangeEnd.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} ${source === 'builtin' ? 'built-in plugins' : 'plugins'}`}
      </p>

      {settling ? (
        <div
          className="mt-6 grid gap-4 opacity-40 sm:grid-cols-2 lg:grid-cols-3"
          aria-hidden="true"
        >
          {items.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="ring-elevation mt-6 flex min-h-72 flex-col items-center justify-center bg-surface p-8 text-center">
          <p className="font-sans text-[15px] font-medium text-text">
            Nothing matches that filter
          </p>
          <p className="mt-1.5 max-w-sm text-sm text-text-secondary [text-wrap:pretty]">
            Try a shorter search term, or clear the category and verified
            filters to browse the whole catalog.
          </p>
          <Button
            variant="secondary"
            className="mt-5"
            onClick={() =>
              patchSearch({ q: '', category: 'all', verified: false, page: 1 })
            }
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-10 flex items-center justify-center gap-3"
        >
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => patchSearch({ page: page - 1 })}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            Previous
          </Button>
          <span className="font-mono text-[13px] text-text-muted tabular-nums">
            {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => patchSearch({ page: page + 1 })}
          >
            Next
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </nav>
      ) : null}
    </main>
  )
}
