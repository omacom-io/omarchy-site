export type SiteThemeEntry = {
  name: string
  image: string
  repo: string
}

/** The GitHub owner, which is the closest thing a theme has to an author. */
function author(repo: string) {
  try {
    return new URL(repo).pathname.split('/').filter(Boolean)[0] ?? 'community'
  } catch {
    return 'community'
  }
}

/**
 * A theme, in the same card the marketplace uses for a plugin: screenshot
 * above, name and author below. The themes used to run past in a wide strip
 * of bare screenshots, which read as a different kind of thing from the
 * plugins directly above them when they are the same kind of thing.
 */
export function ThemeCard({ theme }: { theme: SiteThemeEntry }) {
  return (
    <article className="ring-elevation ring-elevation-hover group relative flex flex-col overflow-hidden rounded-xl bg-surface">
      <div className="relative aspect-video w-full overflow-hidden bg-bg-deep">
        <img
          src={theme.image}
          alt=""
          width={1200}
          height={675}
          loading="lazy"
          decoding="async"
          className="img-outlined size-full object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="min-w-0 truncate text-sm font-medium text-text">
          <a href={theme.repo} className="focus-visible:outline-none">
            {/* Stretched link: the whole card is the hit area */}
            <span className="absolute inset-0" aria-hidden="true" />
            {theme.name}
          </a>
        </h3>
        <p className="font-mono text-xs text-text-muted">
          {author(theme.repo)}
        </p>
      </div>

      {/* Focus ring for the stretched link, drawn inward so the card's own
          clipping cannot swallow it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl group-has-[a:focus-visible]:-outline-offset-2 group-has-[a:focus-visible]:outline-2 group-has-[a:focus-visible]:outline-ring"
      />
    </article>
  )
}
