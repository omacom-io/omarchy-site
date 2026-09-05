import { Outlet, createFileRoute } from '@tanstack/react-router'
import { ManualLayout } from '@/components/ManualLayout'
import { getManualToc } from '@/lib/content'

/** The manual's shell. Every chapter renders inside it, so the chapter list
 * is loaded once and stays mounted from one chapter to the next. */
export const Route = createFileRoute('/manual')({
  loader: () => getManualToc(),
  component: () => (
    <ManualLayout toc={Route.useLoaderData()}>
      <Outlet />
    </ManualLayout>
  ),
})
