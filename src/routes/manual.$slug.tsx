import { createFileRoute, notFound } from '@tanstack/react-router'
import { ManualChapterView } from '@/components/ManualChapterView'
import { getManualChapter } from '@/lib/content'
import { SITE_DESCRIPTION, excerptFromHtml, seo } from '@/lib/seo'

/**
 * A chapter's first paragraph describes it well enough almost everywhere.
 * The FAQ is the exception: its first paragraph is the answer to its first
 * question, so the card would promise a page about keyboard layouts.
 */
const WRITTEN: Partial<Record<string, string>> = {
  faq: 'Answers to what comes up most: keyboard layouts, the clock format, timezones, DNS and Wi-Fi, printers, and where screenshots end up.',
}

export const Route = createFileRoute('/manual/$slug')({
  loader: async ({ params }) => {
    const data = await getManualChapter({ data: params.slug })
    if (!data.chapter) throw notFound()
    return data
  },
  head: ({ loaderData, params }) =>
    seo({
      title: `${loaderData?.chapter?.title ?? 'Manual'} - Omarchy Manual`,
      description:
        WRITTEN[params.slug] ??
        ((loaderData?.chapter && excerptFromHtml(loaderData.chapter.html)) ||
          SITE_DESCRIPTION),
      path: `/manual/${params.slug}`,
    }),
  component: () => <ManualChapterView data={Route.useLoaderData()} />,
})
