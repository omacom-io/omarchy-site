import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BankIcon, DownloadIcon, GithubIcon } from '@/components/icons'
import momentum from '@/data/momentum.json'

/**
 * The project in numbers, beside the news it comes from: the foundation's
 * funding as one bar per announcement, the ISO downloads, and the
 * repository's stars and a year of weekly commits. The github block is
 * refreshed on the catalogue's schedule; the rest quotes the posts it
 * links to. The numbers count up once, when the card comes into view.
 */

const STEP_WIDTH = 22
const CHART_ROWS = 8
const EIGHTHS = ' ▁▂▃▄▅▆▇'

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

/** Weekly commits as rows of eighth-blocks, oldest week on the left. */
function commitRows(weeks: Array<number>) {
  const top = Math.max(1, ...weeks)
  return Array.from({ length: CHART_ROWS }, (_, row) =>
    weeks
      .map((v) => {
        const e =
          Math.round((v / top) * CHART_ROWS * 8) - (CHART_ROWS - 1 - row) * 8
        return e >= 8 ? '█' : EIGHTHS[Math.max(0, e)]
      })
      .join(''),
  ).join('\n')
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        setInView(true)
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, inView }
}

/** Renders the final value until told to run, then counts up to it once. */
function Count({
  value,
  live,
  prefix = '',
  suffix = '',
}: {
  value: number
  live: boolean
  prefix?: string
  suffix?: string
}) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (!live) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t0 = performance.now()
    let frame = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100)
      setShown(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [live, value])
  const digits = Number.isInteger(value) ? 0 : 1
  return (
    <>
      {prefix}
      {shown.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}
      {suffix}
    </>
  )
}

function Card({
  icon,
  children,
  live,
  innerRef,
}: {
  icon: ReactNode
  children: ReactNode
  live: boolean
  innerRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={innerRef}
      className={
        '@container ring-elevation bg-surface p-6' +
        (live ? ' figure-live' : '')
      }
    >
      {icon}
      {children}
    </div>
  )
}

const number =
  'mt-4 block font-sans text-3xl font-semibold tracking-tight text-text tabular-nums'
const label = 'mt-1 block text-sm text-text-secondary'
const meta = 'mt-3 font-mono text-xs text-text-muted'
// Underlined in nothing until hovered, the way the news titles and the
// team names are: the hover is a colour arriving, not a line.
const more =
  'mt-4 inline-block text-[13px] font-medium text-brand underline decoration-transparent underline-offset-[3px] transition-colors duration-150 ease-out hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function Figures() {
  const { foundation, downloads, github } = momentum
  const first = foundation.steps[0]
  const last = foundation.steps[foundation.steps.length - 1]
  const funding = useInView()
  const isos = useInView()
  const repo = useInView()

  return (
    <div className="flex flex-col gap-4">
      <Card
        icon={<BankIcon className="size-5 text-brand" />}
        live={funding.inView}
        innerRef={funding.ref}
      >
        <span className={number}>
          <Count
            value={foundation.total}
            live={funding.inView}
            prefix="$"
            suffix="M"
          />
        </span>
        <span className={label}>
          raised for the Omacom Foundation in{' '}
          {daysBetween(first.date, last.date)} days
        </span>
        {/* One bar per announcement, each a link to the post it quotes. */}
        <div className="figure-chart mt-4 font-mono text-xs leading-relaxed whitespace-pre">
          {foundation.steps.map((step) => (
            <Link
              key={step.post}
              to={step.post}
              className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="text-text-muted">
                {shortDate(step.date).padEnd(7)}
              </span>
              <span className="text-brand">
                {'█'.repeat(
                  Math.round((STEP_WIDTH * step.amount) / foundation.total),
                )}
              </span>
              <span className="text-text-muted transition-colors duration-150 ease-out group-hover:text-text">
                {'  $' + step.amount + 'M'}
              </span>
            </Link>
          ))}
        </div>
        <Link to="/$/" params={{ _splat: 'foundation' }} className={more}>
          About the foundation
        </Link>
      </Card>

      <Card
        icon={<DownloadIcon className="size-5 text-brand" />}
        live={isos.inView}
        innerRef={isos.ref}
      >
        <span className={number}>
          <Count value={downloads.total} live={isos.inView} />
        </span>
        <span className={label}>ISO downloads in {downloads.days} days</span>
        <p className={meta}>
          from {downloads.countries} countries and territories
        </p>
        <Link to={downloads.post} className={more}>
          The numbers
        </Link>
      </Card>

      <Card
        icon={<GithubIcon className="size-5 text-brand" />}
        live={repo.inView}
        innerRef={repo.ref}
      >
        <span className={number}>
          <Count value={github.stars} live={repo.inView} />
        </span>
        <span className={label}>stars on GitHub</span>
        <p className={meta}>
          {github.forks.toLocaleString('en-US')} forks · {github.contributors}{' '}
          contributors
        </p>
        {/* One column per week, the last 52, scaled to the busiest week. */}
        <pre
          aria-hidden="true"
          className="figure-chart mt-4 overflow-hidden font-mono text-[min(0.875rem,3.15cqw)] leading-[0.92] text-brand"
        >
          {commitRows(github.weeks)}
        </pre>
        <p className={meta}>
          {github.commitsYear.toLocaleString('en-US')} commits in the last 52
          weeks · checked {shortDate(momentum.checked)}
        </p>
        <a href="https://github.com/omacom/omarchy" className={more}>
          The repo
        </a>
      </Card>
    </div>
  )
}
