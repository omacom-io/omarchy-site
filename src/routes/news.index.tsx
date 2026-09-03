import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRightIcon } from '@/components/icons'
import { getNewsIndex } from '@/lib/content'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/news/')({
  // Live from omarchy.org's feed, so a post published this morning is on
  // this page this morning, no import and no deploy in between.
  loader: () => getNewsIndex(),
  head: () =>
    seo({
      title: 'News - Omarchy',
      description:
        'The latest from the Omarchy project and the Omacom Foundation.',
      path: '/news',
    }),
  component: NewsPage,
})

function NewsPage() {
  const news = Route.useLoaderData()

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          News
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
          Dispatches from the project, written by DHH.
        </p>
      </header>

      <ul className="mt-10 divide-y divide-border-subtle">
        {news.map((post) => {
          return (
            <li key={post.slug}>
              <Link
                to="/news/$year/$month/$slug/"
                params={{ year: post.year, month: post.month, slug: post.slug }}
                className="group flex flex-col gap-1.5 py-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <time
                  dateTime={post.date}
                  className="font-mono text-xs text-text-muted"
                >
                  {post.dateStr}
                </time>
                <span className="flex items-baseline gap-1.5 text-lg font-medium text-text transition-colors duration-150 ease-out group-hover:text-brand">
                  {post.title}
                  <ArrowRightIcon className="size-5 shrink-0 self-center text-text-muted transition-[color,translate] duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-brand" />
                </span>
                {post.excerpt ? (
                  <span className="text-sm leading-relaxed text-text-secondary [text-wrap:pretty]">
                    {post.excerpt}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
