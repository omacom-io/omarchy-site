import { createFileRoute, notFound } from '@tanstack/react-router'
import { PluginDocPage, getPluginPage } from '@/components/PluginDocPage'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/plugins/publish')({
  loader: async () => {
    const page = await getPluginPage({ data: 'publish' })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- eslint mis-narrows the server-fn return; tsc sees the nullable type
    if (!page) throw notFound()
    return page
  },
  head: () =>
    seo({
      title: 'Publish a Plugin - Omarchy',
      description:
        'List your plugin on the Omarchy marketplace in three steps: prepare the repository, add a valid manifest, and submit it for review.',
      path: '/plugins/publish',
    }),
  component: () => <PluginDocPage page={Route.useLoaderData()} />,
})
