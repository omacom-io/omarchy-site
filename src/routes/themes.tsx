import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { SearchField } from '@/components/SearchField'
import themes from '@/data/themes.json'
import { Button } from '@/components/ui/button'
import { OPEN_PICKER_EVENT } from '@/lib/theme'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/themes')({
  head: () =>
    seo({
      title: 'Themes - Omarchy',
      description:
        'Community themes for Omarchy. One keystroke restyles the entire system: terminal, bar, notifications, wallpaper.',
      path: '/themes',
    }),
  component: ThemesPage,
})

function ThemesPage() {
  const [query, setQuery] = useState('')
  const filtered = query.trim()
    ? themes.filter((t) =>
        t.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : themes

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Community themes
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
          A theme restyles the whole system at once. Press{' '}
          <kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-text">
            Super&nbsp;+&nbsp;Ctrl&nbsp;+&nbsp;Shift&nbsp;+&nbsp;Space
          </kbd>{' '}
          inside Omarchy to cycle through the ones you've installed. Want yours
          listed? Open a pull request on the site repository.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
          This website wears them too:{' '}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent(OPEN_PICKER_EVENT))
            }
            className="text-text underline decoration-border-strong underline-offset-4 transition-colors duration-150 ease-out hover:decoration-brand"
          >
            press T to try six of them
          </button>
          .
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <SearchField
          className="flex-1 basis-64 sm:max-w-xs"
          value={query}
          onChange={setQuery}
          placeholder="Filter themes…"
          label="Filter themes"
        />
        <p
          className="font-mono text-[13px] text-text-muted tabular-nums"
          aria-live="polite"
        >
          {filtered.length} / {themes.length} themes
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="ring-elevation mt-6 flex min-h-72 flex-col items-center justify-center rounded-xl bg-surface p-8 text-center">
          <p className="text-[15px] font-medium text-text">
            No theme is called “{query.trim()}”
          </p>
          <p className="mt-1.5 max-w-sm text-sm text-text-secondary [text-wrap:pretty]">
            Try a shorter name, or make the theme yourself and send it in.
          </p>
          <Button
            variant="secondary"
            className="mt-5"
            onClick={() => setQuery('')}
          >
            Show all themes
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((theme) => (
            <li key={theme.name}>
              <a
                href={theme.repo}
                className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <img
                  src={theme.image}
                  alt={`${theme.name} theme screenshot`}
                  width={1200}
                  height={675}
                  loading="lazy"
                  decoding="async"
                  className="img-outlined aspect-video w-full rounded-lg bg-bg-deep object-cover"
                />
                <span className="mt-2.5 block font-mono text-[13px] text-text-secondary transition-colors duration-150 ease-out group-hover:text-text">
                  {theme.name}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
