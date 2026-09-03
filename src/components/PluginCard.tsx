import { Link } from '@tanstack/react-router'
import { HeartIcon, StarIcon, VerifiedIcon } from '@/components/icons'
import type { CatalogueEntry } from '@/lib/plugins'
import { cn } from '@/lib/utils'

const accentText: Record<string, string> = {
  violet: 'text-tn-purple',
  blue: 'text-tn-blue',
  cyan: 'text-tn-cyan',
  orange: 'text-tn-orange',
  red: 'text-tn-red',
  yellow: 'text-tn-yellow',
  green: 'text-brand',
}

export function PluginCard({ plugin }: { plugin: CatalogueEntry }) {
  return (
    <article className="ring-elevation ring-elevation-hover group relative flex flex-col overflow-hidden rounded-xl bg-surface">
      <div className="relative aspect-video w-full overflow-hidden bg-bg-deep">
        {plugin.thumb ? (
          <img
            src={plugin.thumb}
            alt=""
            loading="lazy"
            decoding="async"
            width={plugin.thumbW ?? 720}
            height={plugin.thumbH ?? 405}
            className="img-outlined size-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              'flex size-full items-center justify-center font-mono text-3xl font-semibold',
              accentText[plugin.accent ?? ''] ?? 'text-text-muted',
            )}
          >
            {plugin.initials ?? plugin.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-1.5">
          <h3 className="min-w-0 truncate text-sm font-medium text-text">
            <Link
              to="/plugins/$pluginId/"
              params={{ pluginId: plugin.id }}
              className="focus-visible:outline-none"
            >
              {/* Stretched link: the whole card is the hit area */}
              <span className="absolute inset-0" aria-hidden="true" />
              {plugin.name}
            </Link>
          </h3>
          {plugin.verified ? (
            <VerifiedIcon
              className="size-4 shrink-0 text-brand"
              aria-hidden={false}
              aria-label="Verified plugin"
              role="img"
            />
          ) : null}
          <span className="ml-auto flex shrink-0 items-center gap-2.5 font-mono text-xs text-text-muted tabular-nums">
            {plugin.stats.hearts > 0 ? (
              <span className="flex items-center gap-1">
                <HeartIcon className="size-3" />
                {plugin.stats.hearts.toLocaleString('en-US')}
                <span className="sr-only">hearts</span>
              </span>
            ) : null}
            {plugin.stars > 0 ? (
              <span className="flex items-center gap-1">
                <StarIcon className="size-3" />
                {plugin.stars.toLocaleString('en-US')}
                <span className="sr-only">stars</span>
              </span>
            ) : null}
          </span>
        </div>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-text-secondary [text-wrap:pretty]">
          {plugin.description}
        </p>
        <p className="mt-auto pt-1.5 font-mono text-xs text-text-muted">
          {plugin.builtIn ? 'Omarchy' : (plugin.author ?? 'unknown')} -{' '}
          {plugin.category}
        </p>
      </div>

      {/* Focus ring for the stretched link. It is drawn inward: the card
          clips its own overflow, so a ring outside this overlay's box fell
          entirely outside the card and focus looked like it never landed. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl group-has-[a:focus-visible]:-outline-offset-2 group-has-[a:focus-visible]:outline-2 group-has-[a:focus-visible]:outline-ring"
      />
    </article>
  )
}
