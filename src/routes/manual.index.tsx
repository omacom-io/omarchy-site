import { createFileRoute, notFound } from '@tanstack/react-router'
import { ManualChapterView } from '@/components/ManualChapterView'
import { getManualChapter } from '@/lib/content'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/manual/')({
  loader: async () => {
    const data = await getManualChapter({ data: 'index' })
    if (!data.chapter) throw notFound()
    return data
  },
  head: () =>
    seo({
      title: 'The Manual - Omarchy',
      description:
        'The Omarchy manual: installation, navigation, hotkeys, themes, plugins, and everything else about running the OS.',
      path: '/manual',
    }),
  component: () => <ManualChapterView data={Route.useLoaderData()} />,
})
