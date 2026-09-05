import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowUpRightIcon } from '@/components/icons'
import teams from '@/data/teams.json'
import { seo } from '@/lib/seo'

/**
 * The teams page is the home page's team section at full length: the same
 * name and one-liner over each team, then every face at photo size with the
 * name and place under it, instead of only under the one being pointed at.
 */
export const Route = createFileRoute('/teams')({
  head: () =>
    seo({
      title: 'Teams - Omarchy',
      description:
        'The people guiding Omarchy: Core sets the direction, Security keeps the system safe, and the Rangers help everyone else find their way.',
      path: '/teams',
    }),
  component: TeamsPage,
})

/** The line under a team, with its one link live: the security page for
 *  the Security team, the address to apply at for the Rangers. */
function TeamNote({
  note,
}: {
  note: { text: string; href: string | null; linkText: string | null }
}) {
  if (!note.href || !note.linkText) return note.text
  const at = note.text.indexOf(note.linkText)
  if (at < 0) return note.text
  const link = note.href.startsWith('/') ? (
    <Link
      to="/$/"
      params={{ _splat: note.href.replace(/^\/|\/$/g, '') }}
      className={noteLink}
    >
      {note.linkText}
    </Link>
  ) : (
    <a href={note.href} className={noteLink}>
      {note.linkText}
    </a>
  )
  return (
    <>
      {note.text.slice(0, at)}
      {link}
      {note.text.slice(at + note.linkText.length)}
    </>
  )
}

/* A link inside a sentence is underlined from the start, the way the
   home page's prose links are; the hover-only underline is for names
   under faces, where the face already says there is something to click. */
const noteLink =
  'text-text underline decoration-border-strong underline-offset-4 transition-colors duration-150 ease-out hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

function TeamsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Teams
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
          The people guiding Omarchy: Core sets the direction, Security keeps
          the system safe, and the Rangers help everyone else find their way.
        </p>
      </header>

      {teams.map((team) => (
        <section
          key={team.id}
          aria-labelledby={`team-${team.id}`}
          className="mt-12 border-t border-border-subtle pt-8 first-of-type:mt-10"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2
              id={`team-${team.id}`}
              className="font-sans text-lg font-medium text-text"
            >
              {team.name.replace(/^Omarchy /, '')}
            </h2>
            <p className="font-mono text-xs text-text-muted">
              {team.description}
            </p>
          </div>
          {/* As many across as fit at a hand's width each, the way the page
              always read. */}
          <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]">
            {team.members.map((member) => {
              const face = (
                <>
                  {/* The photo fills its column, as it did before and as the
                      home page's own grid once did: the page is where the
                      faces get room. Square here, round in the clusters,
                      which stack; one class to swap if the team settles on
                      one shape. */}
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt=""
                      width={240}
                      height={240}
                      loading="lazy"
                      decoding="async"
                      className="img-outlined aspect-square w-full object-cover"
                    />
                  ) : null}
                  {/* Underlined from the start in nothing, so the hover is a
                      colour arriving rather than a line, and the whole
                      record carries it - the same as the name under a
                      cluster on the home page. */}
                  <span className="mt-3 flex items-center gap-1 font-sans text-sm font-medium text-text underline decoration-transparent underline-offset-[3px] transition-colors duration-150 ease-out group-hover:decoration-brand">
                    {member.name}
                    {member.href ? (
                      <ArrowUpRightIcon className="size-3.5 shrink-0 text-text-muted opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100" />
                    ) : null}
                  </span>
                  <span className="block font-mono text-xs text-text-muted">
                    {member.meta}
                  </span>
                </>
              )
              return (
                <li key={member.name}>
                  {member.href ? (
                    <a
                      href={member.href}
                      className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {face}
                    </a>
                  ) : (
                    <div className="group">{face}</div>
                  )}
                </li>
              )
            })}
          </ul>
          {team.note ? (
            <p className="mt-8 font-mono text-xs text-text-muted">
              <TeamNote note={team.note} />
            </p>
          ) : null}
        </section>
      ))}
    </main>
  )
}
