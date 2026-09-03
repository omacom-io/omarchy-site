import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons'
import type { getManualChapter } from '@/lib/content'

type ChapterData = Awaited<ReturnType<typeof getManualChapter>>

function chapterLink(slug: string) {
  return slug === 'index'
    ? ({ to: '/manual/' } as const)
    : ({ to: '/manual/$slug/', params: { slug } } as const)
}

/** Sidebar TOC + chapter body + prev/next pager, shared by /manual and
 * /manual/$slug. Ported chapter HTML is trusted first-party content. */
export function ManualChapterView({ data }: { data: ChapterData }) {
  const { chapter, toc, prev, next } = data
  if (!chapter) return null

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[16rem_1fr]">
        <nav
          aria-label="Manual chapters"
          className="scroll-accent hidden max-h-[calc(100dvh-var(--nav-h))] self-start overflow-y-auto border-r border-border-subtle pr-6 lg:sticky lg:top-(--nav-h) lg:block"
        >
          <ol className="flex flex-col gap-0.5">
            {toc.map((entry) => (
              <li key={entry.slug}>
                <Link
                  {...chapterLink(entry.slug)}
                  className="block px-2 py-1.5 text-[13px] leading-snug text-text-secondary transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-text"
                  activeProps={{
                    className: 'bg-surface-2 text-text font-medium',
                  }}
                  activeOptions={{ exact: true }}
                >
                  {entry.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0">
          {/* Mobile chapter picker */}
          <details className="mb-8 border border-border-subtle lg:hidden">
            <summary className="cursor-pointer px-4 py-2.5 font-mono text-[13px] text-text-secondary select-none">
              Chapters
            </summary>
            <ol className="scroll-accent max-h-80 overflow-y-auto border-t border-border-subtle p-2">
              {toc.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    {...chapterLink(entry.slug)}
                    className="block px-2 py-1.5 text-[13px] text-text-secondary"
                    activeProps={{ className: 'text-text font-medium' }}
                    activeOptions={{ exact: true }}
                  >
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ol>
          </details>

          <article>
            <h1 className="text-3xl font-semibold tracking-tight text-text">
              {chapter.title}
            </h1>
            <div
              className="prose mt-6"
              dangerouslySetInnerHTML={{ __html: chapter.html }}
            />
          </article>

          <nav
            aria-label="Chapter pagination"
            className="mt-14 flex flex-wrap justify-between gap-3 border-t border-border-subtle pt-6"
          >
            {prev ? (
              <Link
                {...chapterLink(prev.slug)}
                className="group flex items-center gap-2 text-sm text-text-secondary transition-colors duration-150 ease-out hover:text-text"
              >
                <ArrowLeftIcon className="size-5" />
                {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                {...chapterLink(next.slug)}
                className="group ml-auto flex items-center gap-2 text-sm text-text-secondary transition-colors duration-150 ease-out hover:text-text"
              >
                {next.title}
                <ArrowRightIcon className="size-5" />
              </Link>
            ) : null}
          </nav>
        </div>
      </div>
    </main>
  )
}
