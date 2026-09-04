import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { getManualToc } from '@/lib/content'

type Toc = Awaited<ReturnType<typeof getManualToc>>

export function chapterLink(slug: string) {
  return slug === 'index'
    ? ({ to: '/manual/' } as const)
    : ({ to: '/manual/$slug/', params: { slug } } as const)
}

/**
 * The manual's shell: the chapter list, and the column the chapter itself is
 * rendered into. It belongs to the layout route rather than to either page,
 * so moving between the manual's opening page and a chapter leaves it
 * mounted: it was being rebuilt on every such move, which restarted the
 * scrollbar's fade under a pointer that had never left it.
 *
 * The list sticks at the offset it already sits at, the page's own 3rem
 * below the bar, rather than at the bar itself: catching 3rem higher than it
 * started moved the list the moment the page scrolled, and back on the way
 * home.
 */
export function ManualLayout({
  toc,
  children,
}: {
  toc: Toc
  children: ReactNode
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* No gap between the two columns; the chapter is held to the reading
          measure and pushed to the page's right edge, so all the room left
          over sits in one place, between the sidebar's rule and the words. */}
      <div className="grid gap-12 lg:grid-cols-[16rem_1fr] lg:gap-x-0">
        {/* The page's own 3rem sits above the list; the same 3rem is kept
            below it, so the list is inset equally at both ends of the
            screen. The gutter is the list's padding, not the panel's, so the
            scroll area reaches the panel's edge and its scrollbar sits out by
            the rule rather than against the chapter names. */}
        <nav
          aria-label="Manual chapters"
          className="hidden self-start border-r border-border-subtle lg:sticky lg:top-[calc(var(--nav-h)+3rem)] lg:block"
        >
          {/* The height is set here rather than left to a flex column: the
              scroll area's viewport fills its root, and a root sized by flex
              growth gave it nothing definite to fill, so the list ran past
              the screen instead of scrolling inside it. */}
          <ScrollArea className="h-[calc(100dvh-var(--nav-h)-6rem)]" scrollFade>
            <ol className="flex flex-col pr-6">
              {toc.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    {...chapterLink(entry.slug)}
                    className="block truncate px-2 py-1.5 text-[13px] leading-snug text-text-secondary transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-text"
                    activeProps={{
                      className: 'bg-surface-2 text-text font-medium',
                    }}
                    activeOptions={{ exact: true }}
                    // One line each; a long name is cut with an ellipsis and
                    // shown whole on hover.
                    title={entry.title}
                  >
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ol>
          </ScrollArea>
        </nav>

        <div className="min-w-0 lg:ml-auto lg:w-full lg:max-w-(--measure)">
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

          {children}
        </div>
      </div>
    </main>
  )
}
