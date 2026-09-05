import type { ReactNode } from 'react'

/**
 * Section header: one title, with an optional action slot on the right.
 * A pixel-font eyebrow label used to sit above the heading, but it mostly
 * restated the heading and read as a second, competing title.
 *
 * `level` drops the element to an h3 for a movement inside a section that
 * already has its own title, keeping the document outline honest. It does not
 * change the type: these head whole movements of the page, and at a smaller
 * size they read as sub-labels next to the sections around them.
 */
export function SectionHeading({
  title,
  description,
  action,
  level = 2,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  level?: 2 | 3
}) {
  const Heading = level === 3 ? 'h3' : 'h2'
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-xl">
        <Heading className="text-2xl font-semibold tracking-tight text-text sm:text-[1.75rem]">
          {title}
        </Heading>
        {description ? (
          <p className="mt-2 text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
            {description}
          </p>
        ) : null}
      </div>
      {/* On a phone the action moves to the end of the section, where it
          reads as what to do next rather than as a second thing to weigh
          before the section has said anything. Call sites pass the same node
          to SectionActions there. */}
      {action ? <div className="hidden shrink-0 sm:block">{action}</div> : null}
    </div>
  )
}

/**
 * The heading's action, repeated at the end of the section for the narrow
 * layout. Only one of the two is ever shown.
 */
export function SectionActions({ children }: { children: ReactNode }) {
  return <div className="mt-10 flex flex-wrap gap-2 sm:hidden">{children}</div>
}
