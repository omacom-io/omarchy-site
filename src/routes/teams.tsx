import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowUpRightIcon, DiscordIcon, GithubIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import teams from '@/data/teams.json'
import { claimNextHashScroll, scrollToAnchor } from '@/lib/anchor-scroll'
import { seo } from '@/lib/seo'

/**
 * The teams page is the home page's team section at full length: the same
 * name and one-liner over each team, then every face at photo size with the
 * name and place under it, instead of only under the one being pointed at.
 * The header carries a small cluster per team as a way down the page, and
 * the foot says where the rest of the project happens, so the page ends on
 * a door rather than a last name.
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

/** The jump links scroll the page themselves, smoothly and clear of the
 *  bar, the way the home page's anchors do; the site leaves the browser's
 *  own anchor jump alone so a /teams#team-core URL opens in place. */
function useJumpLink(id: string) {
  const navigate = useNavigate()
  return (event: React.MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    const target = document.getElementById(id)
    if (!target) return
    event.preventDefault()
    claimNextHashScroll()
    scrollToAnchor(target, true)
    void navigate({
      to: '/teams/',
      hash: id,
      replace: true,
      resetScroll: false,
    })
  }
}

function TeamJump({ team }: { team: (typeof teams)[number] }) {
  const jump = useJumpLink(`team-${team.id}`)
  return (
    <a
      href={`#team-${team.id}`}
      onClick={jump}
      className="group flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex -space-x-2.5">
        {team.members.slice(0, 4).map((member) => (
          <span
            key={member.name}
            className="block size-7 overflow-hidden rounded-full ring-2 ring-bg"
          >
            {member.avatar ? (
              <img
                src={member.avatar}
                alt=""
                width={240}
                height={240}
                loading="lazy"
                decoding="async"
                className="size-full rounded-full object-cover"
              />
            ) : null}
          </span>
        ))}
      </span>
      <span className="font-sans text-sm font-medium text-text underline decoration-transparent underline-offset-[3px] transition-colors duration-150 ease-out group-hover:decoration-brand">
        {team.name.replace(/^Omarchy /, '')}
      </span>
      <span className="font-mono text-xs text-text-muted">
        {team.members.length}
      </span>
    </a>
  )
}

function TeamsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Teams
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
            The people guiding Omarchy: Core sets the direction, Security keeps
            the system safe, and the Rangers help everyone else find their way.
          </p>
        </div>
        {/* One small cluster per team, each a jump to its block: the home
            page's clusters at a glance, and a table of contents that shows
            who is in it. */}
        <nav aria-label="Teams on this page" className="mt-8">
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {teams.map((team) => (
              <li key={team.id}>
                <TeamJump team={team} />
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {teams.map((team) => (
        <section
          key={team.id}
          id={`team-${team.id}`}
          aria-labelledby={`team-${team.id}-name`}
          className="mt-12 scroll-mt-[calc(var(--nav-h)+2rem)] border-t border-border-subtle pt-8 first-of-type:mt-10"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2
              id={`team-${team.id}-name`}
              className="font-sans text-lg font-medium text-text"
            >
              {team.name.replace(/^Omarchy /, '')}
            </h2>
            <p className="font-mono text-xs text-text-muted">
              {team.description}
            </p>
          </div>
          {/* As many across as fit at a hand's width each, the way the page
              always read; each person a card like the plugins and themes,
              so the page has the same surface as the rest of the site. */}
          <ul className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
            {team.members.map((member) => {
              const face = (
                <>
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
              const card =
                'ring-elevation group flex h-full flex-col bg-surface p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
              return (
                <li key={member.name}>
                  {member.href ? (
                    <a
                      href={member.href}
                      className={`${card} ring-elevation-hover`}
                    >
                      {face}
                    </a>
                  ) : (
                    <div className={card}>{face}</div>
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

      {/* Where everyone else is: the teams are a few names, the project is
          the room around them. The same two doors the home page opens. */}
      <section className="mt-14 border-t border-border-subtle pt-10">
        <div className="ring-elevation flex flex-col gap-6 bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-lg font-medium tracking-tight text-text">
              Not on a team? Neither is almost everyone.
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
              Most of Omarchy happens in the Discord and on GitHub: questions,
              themes, plugins, pull requests.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={<a href="https://discord.gg/tXFUdasqhY" />}
            >
              <DiscordIcon data-icon="inline-start" />
              Discord
            </Button>
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={<a href="https://github.com/omacom/omarchy" />}
            >
              <GithubIcon data-icon="inline-start" />
              GitHub
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
