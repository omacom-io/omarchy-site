import { createFileRoute, notFound } from '@tanstack/react-router'
import { PluginDocPage, getPluginPage } from '@/components/PluginDocPage'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/plugins/develop')({
  loader: async () => {
    const page = await getPluginPage({ data: 'develop' })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- eslint mis-narrows the server-fn return; tsc sees the nullable type
    if (!page) throw notFound()
    return page
  },
  head: () =>
    seo({
      title: 'Develop a Plugin - Omarchy',
      description:
        'Build a custom Omarchy Quattro plugin: clone a built-in, edit a working example, and validate the finished folder against the manifest rules.',
      path: '/plugins/develop',
    }),
  component: () => <PluginDocPage page={Route.useLoaderData()} />,
})
