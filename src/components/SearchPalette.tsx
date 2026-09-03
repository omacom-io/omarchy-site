import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CrossIcon, SearchIcon } from '@/components/icons'
import type { SearchEntry } from '@/lib/content'
import { getSearchIndex } from '@/lib/content'
import type { SearchHit } from '@/lib/search'
import { KIND_LABEL, OPEN_SEARCH_EVENT, searchAll } from '@/lib/search'

/**
 * Search the manual from anywhere, as a palette rather than a field in the
 * bar. The bar has no surface of its own over the hero and its labels are
 * painted by a blended ghost; text can be duplicated into a difference layer,
 * an input with a border and a caret cannot. A button can, so the bar carries
 * the button and the search itself opens over the page - the same shape the
 * theme picker uses, and the same shape on a phone as on a desktop.
 *
 * The index is 280kB of prose and loads on opening, not with the page. After
 * that a query is a pass over an array: results come back on the keystroke,
 * with no debounce and no request to fall out of order.
 */

const typing = (el: HTMLElement | null) =>
  !!el &&
  (el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable)

export function SearchPalette() {
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const restore = useRef<HTMLElement | null>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState<SearchEntry[] | null>(null)
  const [hits, setHits] = useState<SearchHit[]>([])
  const [active, setActive] = useState(0)

  const show = useCallback(() => {
    restore.current = document.activeElement as HTMLElement | null
    setOpen(true)
    setQuery('')
    setHits([])
    setActive(0)
    setIndex((held) => held)
    void getSearchIndex().then(setIndex)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    // Back to whatever opened it, without a ring the mouse user never asked
    // for - the same rule the theme picker follows.
    restore.current?.focus({ focusVisible: false })
  }, [])

  useEffect(() => {
    if (!index || !query.trim()) {
      setHits([])
      return
    }
    setHits(searchAll(index, query))
    setActive(0)
  }, [index, query])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (open) return
      if (typing(event.target as HTMLElement)) return
      const command = (event.metaKey || event.ctrlKey) && event.key === 'k'
      // Cmd-K belongs to the palette everywhere. A bare slash belongs to the
      // page when the page has a field of its own - on the plugin directory
      // it means "filter this list", and taking it to search the manual
      // instead would be answering a different question.
      const slash =
        event.key === '/' &&
        !document.querySelector('main input[type="search"]')
      if (command || slash) {
        event.preventDefault()
        show()
      }
    }
    const onRequest = () => show()
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_SEARCH_EVENT, onRequest)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_SEARCH_EVENT, onRequest)
    }
  }, [open, show])

  // Focus lands in the field, which is also the palette's only tab stop, so
  // there is nowhere for focus to wander off to while it is up.
  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  // The arrows move a selection, not focus, so nothing scrolls the list on
  // their own. scrollIntoView would, but it scrolls every scrollable ancestor
  // to satisfy the request and rounds the row to its own idea of "nearest",
  // which is why the list appeared to jump several rows at a time. This moves
  // the list by exactly the amount the row is outside it, and touches nothing
  // else on the page.
  useEffect(() => {
    const box = scroller.current
    const row = list.current?.children[active] as HTMLElement | undefined
    if (!box || !row) return
    const view = box.getBoundingClientRect()
    const rect = row.getBoundingClientRect()
    if (rect.top < view.top) box.scrollTop -= view.top - rect.top
    else if (rect.bottom > view.bottom)
      box.scrollTop += rect.bottom - view.bottom
  }, [active, hits])

  if (!open) return null

  const go = (hit: SearchHit) => {
    close()
    if (hit.kind === 'manual') {
      void navigate(
        hit.slug === 'index'
          ? { to: '/manual/', hash: hit.hash ?? undefined }
          : {
              to: '/manual/$slug/',
              params: { slug: hit.slug },
              hash: hit.hash ?? undefined,
            },
      )
      return
    }
    if (hit.kind === 'news') {
      void navigate({
        to: '/news/$year/$month/$slug/',
        params: { year: hit.year, month: hit.month, slug: hit.slug },
      })
      return
    }
    if (hit.kind === 'plugin') {
      void navigate({
        to: '/plugins/$pluginId/',
        params: { pluginId: hit.slug },
      })
      return
    }
    void navigate({ to: '/themes/' })
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (hits.length === 0) return
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((at) => Math.min(hits.length - 1, Math.max(0, at + step)))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      // active can outrun the list between a keystroke and a re-render;
      // without noUncheckedIndexedAccess the compiler cannot see that.
      const hit = hits[active] as SearchHit | undefined
      if (hit) go(hit)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search Omarchy"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-(--z-modal) flex justify-center px-4 pt-[12vh]"
    >
      <div
        aria-hidden="true"
        onClick={close}
        className="absolute inset-0 bg-black/55"
      />

      <div className="ring-elevation relative flex max-h-[70vh] w-full max-w-2xl flex-col bg-surface">
        <div className="flex items-center gap-3 border-b border-border-subtle px-4">
          <SearchIcon className="size-5 shrink-0 text-text-muted" />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Omarchy"
            aria-label="Search Omarchy"
            autoComplete="off"
            spellCheck={false}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="relative -mr-1 flex size-8 shrink-0 items-center justify-center text-text-muted transition-colors duration-150 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <CrossIcon className="size-4" />
          </button>
        </div>

        <div
          ref={scroller}
          className="scroll-accent min-h-0 flex-1 overflow-y-auto"
        >
          {query.trim().length === 0 ? (
            <p className="px-4 py-8 text-sm text-text-muted">
              The manual, the news, every plugin and every theme.
            </p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-8 text-sm text-text-muted">
              {index ? (
                <>
                  Nothing matches{' '}
                  <span className="text-text-secondary">{query.trim()}</span>.
                </>
              ) : (
                'Reading…'
              )}
            </p>
          ) : (
            <ul ref={list} role="listbox" aria-label="Search results">
              {hits.map((hit, at) => (
                <li key={`${hit.kind}-${hit.slug}-${at}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={at === active}
                    // Not a tab stop: the arrows walk this list, and Tab
                    // stepping through ten results would be a worse way in.
                    tabIndex={-1}
                    onPointerDown={(event) => {
                      event.preventDefault()
                      go(hit)
                    }}
                    onMouseEnter={() => setActive(at)}
                    className={
                      'block w-full border-b border-border-subtle px-4 py-3 text-left last:border-b-0 ' +
                      (at === active ? 'bg-surface-2' : '')
                    }
                  >
                    {/* One shape for four kinds: a manual result leads with
                        its heading and names its chapter, everything else
                        leads with its title and names its author or date. */}
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-medium text-text">
                        {hit.kind === 'manual'
                          ? (hit.heading ?? hit.title)
                          : hit.title}
                      </span>
                      <span className="truncate font-mono text-[11px] text-text-muted">
                        {hit.kind === 'manual'
                          ? hit.heading
                            ? hit.title
                            : ''
                          : hit.meta}
                      </span>
                      <span className="ml-auto shrink-0 border border-border-subtle px-1.5 font-mono text-[10px] tracking-wide text-text-muted uppercase">
                        {KIND_LABEL[hit.kind]}
                      </span>
                    </span>
                    {hit.snippet ? (
                      <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-text-secondary">
                        {hit.snippet.before}
                        <mark className="bg-transparent font-medium text-brand">
                          {hit.snippet.match}
                        </mark>
                        {hit.snippet.after}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-4 border-t border-border-subtle px-4 py-2.5 font-mono text-[11px] text-text-muted">
          <span>
            <Key>↑</Key>
            <Key>↓</Key> move
          </span>
          <span>
            <Key>↵</Key> open
          </span>
          <span>
            <Key>esc</Key> close
          </span>
        </div>
      </div>
    </div>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mr-1 border border-border-strong px-1.5 py-0.5 text-text-secondary">
      {children}
    </kbd>
  )
}
