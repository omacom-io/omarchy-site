import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons'
import { chapterLink } from '@/components/ManualLayout'
import type { getManualChapter } from '@/lib/content'

type ChapterData = Awaited<ReturnType<typeof getManualChapter>>

/** One chapter: its title, its prose and the pager. The chapter list and the
 * column around it belong to the manual's layout route. Ported chapter HTML
 * is trusted first-party content. */
export function ManualChapterView({ data }: { data: ChapterData }) {
  const { chapter, prev, next } = data
  if (!chapter) return null

  return (
    <div className="manual-chapter">
      <article>
        <h1 className="mx-auto w-full max-w-(--measure) text-3xl font-semibold tracking-tight text-text">
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
  )
}
