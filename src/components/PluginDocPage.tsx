import { useEffect, useRef } from 'react'
import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'
import { PluginsNav } from '@/components/PluginsNav'

export type PluginDoc = { title: string; meta: string; html: string }

export const getPluginPage = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const mod = await import('../data/plugin-pages.json')
    const pages = mod.default as Record<string, PluginDoc>
    return pages[slug] ?? null
  })

/** Shared layout for the ported Develop / Publish marketplace docs. */
export function PluginDocPage({ page }: { page: PluginDoc }) {
  const contentRef = useRef<HTMLDivElement>(null)

  // The ported HTML ships the marketplace's copy buttons; wire them up so
  // every snippet actually copies (confirmation swaps the label for ~1.5s).
  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    function onClick(e: MouseEvent) {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
        '.copy-button',
      )
      if (!button) return
      const block = button.closest('.code-block') ?? button.parentElement
      const code = block?.querySelector('pre')?.textContent
      if (!code) return
      navigator.clipboard.writeText(code.trim()).then(() => {
        const original = button.textContent
        button.textContent = 'Copied'
        setTimeout(() => {
          button.textContent = original
        }, 1500)
      })
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [page])

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            {page.title}
          </h1>
          {page.meta ? (
            <p className="mt-2 font-mono text-xs text-text-muted">
              {page.meta}
            </p>
          ) : null}
        </div>
        <PluginsNav />
      </header>

      <div
        ref={contentRef}
        className="prose docs mt-10"
        dangerouslySetInnerHTML={{ __html: page.html }}
      />
    </main>
  )
}
