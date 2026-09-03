import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { SearchField } from '@/components/SearchField'
import type { ExplorerData } from '@/components/ExploreMap'
import { ExploreMap } from '@/components/ExploreMap'
import { PluginsNav } from '@/components/PluginsNav'
import { cn } from '@/lib/utils'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/plugins/explore')({
  head: () =>
    seo({
      title: 'Explore Plugins - Omarchy',
      description:
        'A map of the entire Omarchy plugin ecosystem: every listed plugin positioned by similarity, clustered by what it does, with the growth of the marketplace over time.',
      path: '/plugins/explore',
    }),
  component: ExplorePage,
})

function GrowthChart({ data }: { data: ExplorerData }) {
  const points = data.growth
  if (points.length < 2) return null
  const w = 640
  const h = 120
  const max = points[points.length - 1].total
  const x = (i: number) => (i / (points.length - 1)) * w
  const y = (total: number) => h - (total / max) * (h - 8)
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`,
    )
    .join(' ')
  const releaseIndex = data.release
    ? points.findIndex((p) => p.date >= data.release!.date)
    : -1

  return (
    <figure>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Marketplace growth: from ${points[0].total} plugins on ${points[0].date} to ${max} on ${points[points.length - 1].date}`}
        className="h-28 w-full"
        preserveAspectRatio="none"
      >
        <path
          d={`${path} L${w},${h} L0,${h} Z`}
          fill="var(--color-brand)"
          opacity={0.12}
        />
        <path
          d={path}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {releaseIndex >= 0 ? (
          <line
            x1={x(releaseIndex)}
            x2={x(releaseIndex)}
            y1={0}
            y2={h}
            stroke="var(--color-tn-purple)"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-between gap-2 font-mono text-xs text-text-muted tabular-nums">
        <span>
          {points[0].date}: {points[0].total} plugins
        </span>
        {data.release ? (
          <span className="text-tn-purple">┆ {data.release.label}</span>
        ) : null}
        <span>
          {points[points.length - 1].date}: {max.toLocaleString('en-US')}{' '}
          plugins
        </span>
      </figcaption>
    </figure>
  )
}

function ExplorePage() {
  const [data, setData] = useState<ExplorerData | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [focusCluster, setFocusCluster] = useState<string | null>(null)

  // The map data (~1.5MB) loads only on this page, after mount.
  useEffect(() => {
    let cancelled = false
    fetch('/data/explorer.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((json: ExplorerData) => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const highlightIds = useMemo(() => {
    if (!data || !query.trim()) return null
    const q = query.trim().toLowerCase()
    return new Set(
      data.nodes
        .filter((n) =>
          `${n.name} ${n.author ?? ''} ${n.category}`.toLowerCase().includes(q),
        )
        .map((n) => n.id),
    )
  }, [data, query])

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            The plugin galaxy
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
            Every listed plugin, positioned by similarity and colored by
            cluster. Neighbors do related things: drag around, zoom in, and
            click anything that looks interesting.
          </p>
        </div>
        <PluginsNav />
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-2.5">
        <SearchField
          className="flex-1 basis-64 sm:max-w-xs"
          value={query}
          onChange={setQuery}
          placeholder="Highlight plugins…"
          label="Highlight plugins on the map"
        />
        {highlightIds ? (
          <p
            className="font-mono text-[13px] text-text-muted tabular-nums"
            aria-live="polite"
          >
            {highlightIds.size} highlighted
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        {failed ? (
          <div className="ring-elevation flex min-h-96 flex-col items-center justify-center bg-surface p-8 text-center">
            <p className="text-[15px] font-medium text-text">
              The map data didn't load
            </p>
            <p className="mt-1.5 max-w-sm text-sm text-text-secondary [text-wrap:pretty]">
              Refresh the page to try again, or browse the catalog instead.
            </p>
          </div>
        ) : data ? (
          <ExploreMap
            data={data}
            highlightIds={highlightIds}
            focusCluster={focusCluster}
          />
        ) : (
          <div
            className="dark-scope flex h-[60vh] min-h-96 items-center justify-center border border-border-subtle"
            style={{ background: '#101117' }}
          >
            <span className="hero-caret font-mono text-2xl text-brand-fill">
              ▮
            </span>
          </div>
        )}
      </div>

      {data ? (
        <>
          <ul
            aria-label="Clusters"
            className="mt-5 flex flex-wrap gap-x-4 gap-y-2"
          >
            {data.clusters.map((cluster) => (
              <li key={cluster.id}>
                <button
                  type="button"
                  aria-pressed={focusCluster === cluster.id}
                  onClick={() =>
                    setFocusCluster((current) =>
                      current === cluster.id ? null : cluster.id,
                    )
                  }
                  className={cn(
                    'flex items-center gap-1.5 font-mono text-xs transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    focusCluster && focusCluster !== cluster.id
                      ? 'text-text-muted/60'
                      : 'text-text-secondary hover:text-text',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5"
                    style={{ background: cluster.color }}
                  />
                  {cluster.label}
                  <span className="text-text-muted tabular-nums">
                    {cluster.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <section className="mt-12 max-w-2xl" aria-labelledby="growth-title">
            <h2
              id="growth-title"
              className="text-xl font-semibold tracking-tight text-text"
            >
              Marketplace growth
            </h2>
            <div className="mt-5">
              <GrowthChart data={data} />
            </div>
          </section>
        </>
      ) : null}
    </main>
  )
}
