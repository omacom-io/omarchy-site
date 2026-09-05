import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRightIcon } from '@/components/icons'
import teams from '@/data/teams.json'

/**
 * The three teams on one line, each a cluster of overlapping faces. Hovering
 * a face lifts it and parts its neighbours to make room, the rest of the
 * stack stays as it is; clicking the team's name fans the whole cluster out.
 * Every face is the person's own link and names them under the cluster. The
 * motion lives in styles.css under "team clusters".
 */
/** Faces shown per cluster before the rest fold into a "+N" that leads to
 *  the teams page, so a cluster stays one hand wide however the team grows. */
const MAX_FACES = 8

export function TeamClusters() {
  /** The cluster fanned out by its name. */
  const [open, setOpen] = useState<string | null>(null)
  /** On touch, the face last tapped, as "team/name" so a person on two
   *  teams is lifted in one cluster only. */
  const [picked, setPicked] = useState<string | null>(null)
  /** With a mouse, the face last pointed at. */
  const [hovered, setHovered] = useState<string | null>(null)
  const root = useRef<HTMLUListElement>(null)

  // A tap anywhere else puts the clusters back together.
  useEffect(() => {
    if (!open && !picked) return
    const away = (event: PointerEvent) => {
      if (root.current?.contains(event.target as Node)) return
      setOpen(null)
      setPicked(null)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open, picked])
  return (
    <ul
      ref={root}
      className="mt-10 flex flex-wrap items-start gap-x-12 gap-y-8"
    >
      {teams.map((team) => {
        const isOpen = open === team.id
        const shown = team.members.slice(0, MAX_FACES)
        const named = shown.find((m) =>
          [picked, hovered].includes(`${team.id}/${m.name}`),
        )
        const rest = team.members.length - shown.length
        return (
          <li
            key={team.id}
            data-open={isOpen || undefined}
            // The name stays until the pointer leaves the whole cluster, so
            // it can be reached and clicked without vanishing on the way.
            onPointerLeave={() => setHovered(null)}
            className="team-cluster flex flex-col gap-3"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => {
                setOpen(isOpen ? null : team.id)
                setPicked(null)
              }}
              className="flex items-baseline gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="font-sans text-sm font-medium text-text">
                {team.name.replace(/^Omarchy /, '')}
              </span>
              <span className="font-mono text-xs text-text-muted">
                {team.description}
              </span>
            </button>
            {/* Laid out at their open spacing and pulled together with a
                transform; a negative margin trims the row to what is seen,
                so the three clusters sit close, and grows with the fan. */}
            <ul
              className="team-faces flex gap-2"
              style={
                {
                  '--n': shown.length + (rest > 0 ? 1 : 0),
                } as React.CSSProperties
              }
            >
              {shown.map((member, i) => {
                const key = `${team.id}/${member.name}`
                const isPicked = picked === key
                return (
                  <li
                    key={member.name}
                    data-picked={isPicked || undefined}
                    onPointerEnter={(event) => {
                      if (event.pointerType === 'mouse') setHovered(key)
                    }}
                    className="team-face relative"
                    style={
                      {
                        '--z': shown.length + 1 - i,
                        '--i': i,
                      } as React.CSSProperties
                    }
                  >
                    <a
                      href={member.href || undefined}
                      // On touch a tap picks the person instead of following
                      // the link; the name below carries it.
                      onClick={(event) => {
                        if (matchMedia('(hover: hover)').matches) return
                        event.preventDefault()
                        setPicked(isPicked ? null : key)
                      }}
                      className={
                        // The brand ring is an outline drawn inward, over
                        // the photo's edge: a ring outside it left a dark
                        // hairline between the two.
                        'block size-11 overflow-hidden rounded-full ring-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ' +
                        (isPicked
                          ? 'ring-bg-deep outline-2 -outline-offset-2 outline-brand'
                          : 'ring-bg-deep hover:outline-2 hover:-outline-offset-2 hover:outline-brand')
                      }
                    >
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          width={88}
                          height={88}
                          loading="lazy"
                          decoding="async"
                          // Rounded itself, or it escapes the clip mid-scale.
                          className="size-full rounded-full object-cover"
                        />
                      ) : null}
                    </a>
                  </li>
                )
              })}
              {rest > 0 ? (
                <li
                  className="team-face relative"
                  style={
                    { '--z': 0, '--i': shown.length } as React.CSSProperties
                  }
                >
                  <Link
                    to="/teams/"
                    aria-label={`${rest} more on the teams page`}
                    className="flex size-11 items-center justify-center rounded-full bg-surface-2 font-mono text-xs text-text-secondary ring-2 ring-bg-deep transition-colors duration-150 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    +{rest}
                  </Link>
                </li>
              ) : null}
            </ul>
            {/* The hovered or picked person, with their place; the name
                carries the link the face cannot on touch. The line keeps
                its height while empty, so nothing below it moves. */}
            <p className="min-h-4 font-mono text-xs text-text-muted">
              {named ? (
                <span key={named.name} className="team-named inline-block">
                  {named.href ? (
                    <a
                      href={named.href}
                      className="inline-flex items-center gap-1 text-text underline decoration-transparent underline-offset-[3px] transition-colors duration-150 ease-out hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {named.name}
                      <ArrowUpRightIcon className="size-3.5" />
                    </a>
                  ) : (
                    <span className="text-text">{named.name}</span>
                  )}
                  {named.meta ? ` - ${named.meta}` : ''}
                </span>
              ) : null}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
