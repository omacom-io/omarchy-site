import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useLayoutEffect, useState } from 'react'
import {
  ArrowRightIcon,
  BrushIcon,
  CalendarIcon,
  ConsoleIcon,
  DiscordIcon,
  DownloadIcon,
  UsbIcon,
  PlayIcon,
  StoreIcon,
} from '@/components/icons'
import { OmarchyWordmark } from '@/components/Brand'
import { HeroNavGhost } from '@/components/SiteHeader'
import { HeroShader } from '@/components/HeroShader'
import { EtchPicker } from '@/components/EtchPicker'
import { InstallCommand } from '@/components/InstallCommand'
import { CardRail } from '@/components/CardRail'
import { Figures } from '@/components/Figures'
import { TypewriterTail } from '@/components/TypewriterTail'
import { PluginCard } from '@/components/PluginCard'
import { SectionActions, SectionHeading } from '@/components/SectionHeading'
import { TeamClusters } from '@/components/TeamClusters'
import { ThemeCard } from '@/components/ThemeCard'
import { VideoCarousel } from '@/components/VideoCarousel'
import { Button } from '@/components/ui/button'
import { useHashLink } from '@/lib/hash-scroll'
import { cn } from '@/lib/utils'
import { getNewsIndex } from '@/lib/content'
import { getPluginHighlights } from '@/lib/plugins'
import themes from '@/data/themes.json'
import release from '@/data/version.json'
import { SITE_DESCRIPTION, seo } from '@/lib/seo'

export const Route = createFileRoute('/')({
  // The plugin highlights and the news teasers are independent reads, and
  // the news is live from omarchy.org's feed - so a post published this
  // morning is on the home page this morning. Both are cached server-side,
  // so a cold isolate is the only one that waits on either.
  loader: async () => {
    const [highlights, news] = await Promise.all([
      getPluginHighlights(),
      getNewsIndex(),
    ])
    return { ...highlights, news }
  },
  head: () =>
    seo({
      title: 'Omarchy - Beautiful, fun & opinionated Linux by DHH',
      description: SITE_DESCRIPTION,
      path: '/',
    }),
  component: Home,
})

const INSTALL_COMMAND = 'curl -fsSL https://omarchy.org/install | bash'

/* What the section's title finishes with, in turn. The first is the claim the
   campaign makes - everything is every + thing, so its line still types out
   whole - and the rest are what it means on a desktop. The shared "every"
   stays put: retyping it four times would spend the animation on the one part
   that never changes, and holding on "We can fix every" reads as a sentence
   about to be finished rather than one merely cut off. */
const FIXES = [
  'thing.',
  ' missing app.',
  ' incompatibility.',
  ' paper cut.',
] as const
const ISO_URL = release.isoUrl

const videos = [
  {
    id: 'F7fe9pa8OeE',
    title: 'Omarchy Quattro by David Heinemeier Hansson',
    channel: 'DHH',
    thumb: 'https://omarchy.org/assets/images/video/omarchy-quattro.webp',
  },
  {
    id: '9SDkU5VDQEQ',
    title: 'You need to switch to Linux RIGHT NOW!!',
    channel: 'NetworkChuck',
    thumb: 'https://omarchy.org/assets/images/video/networkchuck.webp',
  },
  {
    id: '5JPYJfN7HY0',
    title: 'They finally fixed linux',
    channel: 'typecraft',
    thumb: 'https://omarchy.org/assets/images/video/typecraft.webp',
  },
  {
    id: 'qBKMe8AatY0',
    title: "I Didn't Expect Omarchy 4 to Be This Good",
    channel: 'LinuxBTW',
    thumb: 'https://omarchy.org/assets/images/video/linuxbtw.webp',
  },
  {
    id: 'KO2T0oET9go',
    title: 'If you use AI, switch to Omarchy immediately',
    channel: 'Alex Finn',
    thumb: 'https://omarchy.org/assets/images/video/alex-finn.webp',
  },
]

const communityCards = [
  {
    icon: DiscordIcon,
    title: 'Discord',
    body: 'Daily chatter, support, and show-and-tell with thousands of Omarchs.',
    href: 'https://discord.gg/tXFUdasqhY',
    cta: 'Join the server',
  },
  {
    icon: CalendarIcon,
    title: 'Meetups',
    body: 'Omarchy meetups are popping up around the world. Find one near you, or start one.',
    splat: 'meetups',
    cta: 'Find a meetup',
  },
  {
    icon: BrushIcon,
    title: 'Artists in Residence',
    body: 'A six-month, funded residency for the artists who make Omarchy beautiful.',
    splat: 'air',
    cta: 'Meet the artists',
  },
  {
    icon: StoreIcon,
    title: 'Merch',
    body: 'Wear the wordmark. Official Omarchy gear from the 37signals supply store.',
    href: 'https://supply.37signals.com/collections/omarchy',
    cta: 'Browse the store',
  },
]

function Home() {
  const { top, total, news } = Route.useLoaderData()
  const [intro, setIntro] = useState(false)
  const installLink = useHashLink('install')
  const watchLink = useHashLink('watch')
  const [painted, setPainted] = useState(false)
  const [etchAsked, setEtchAsked] = useState(false)
  useEffect(() => {
    setEtchAsked(new URLSearchParams(window.location.search).has('etch'))
  }, [])
  // The canvas cuts the word in as an entrance, so when it is going to, the
  // server-rendered word steps aside at once rather than showing whole and
  // then vanishing to be redrawn. Reduced motion keeps the plain handover.
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      setPainted(true)
  }, [])
  // The class from the head kept the word hidden until now. It can only go
  // once the word's own hidden class is in the DOM, before the next paint,
  // or the word shows for a frame in between.
  useLayoutEffect(() => {
    if (painted) document.documentElement.classList.remove('etch-pending')
  }, [painted])

  // Intro stagger plays once per session; returning within the session
  // renders the resting state immediately.
  useEffect(() => {
    if (!sessionStorage.getItem('omarchy-intro-seen')) {
      sessionStorage.setItem('omarchy-intro-seen', 'true')
      setIntro(true)
    }
  }, [])

  // Each of these renders twice: in the heading row on a wide screen, at the
  // end of its section on a narrow one.
  const allPlugins = (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link to="/plugins/" />}
    >
      All plugins
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  )
  const allThemes = (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link to="/themes/" />}
    >
      All themes
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  )
  const allNews = (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link to="/news/" />}
    >
      All news
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  )
  const installGuide = (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link to="/manual/$slug/" params={{ slug: 'getting-started' }} />}
    >
      Read the install guide
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  )
  const allTeams = (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link to="/teams/" />}
    >
      All teams
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  )

  return (
    <main>
      {/* hero: one screen, three elements. The field and the wordmark are
          drawn on one shared pixel grid; nothing here repeats the nav. */}
      <section
        data-hero-sentinel
        className={
          // The hero is a surface you touch, not a passage you read: a long
          // press on it was raising a selection and the callout menu over the
          // field instead of doing nothing.
          'pixel-container relative -mt-(--nav-h) flex min-h-svh flex-col overflow-hidden border-b border-border-subtle pt-(--nav-h) select-none [-webkit-touch-callout:none]' +
          (intro ? ' hero-intro' : '')
        }
        style={{ background: 'var(--t-field-bg)' }}
      >
        <HeroShader onPainted={() => setPainted(true)} />
        {/* The effect panel, only for an address that asks (?etch=...), so
            the dev server shows the same page as the live one. */}
        {etchAsked ? <EtchPicker /> : null}

        {/* The bar's labels, blended against the canvas. They have to live in
            here to reach it: the real header is sticky, and a sticky element
            isolates everything inside it from the page behind. */}
        <HeroNavGhost />

        {/* The wordmark, the tagline and the buttons are one block, with
            the same space above it, under the bar, as below it, at the foot
            of the screen. Before, the word sat a third of the way down and
            the copy at the very bottom, and the eye had to read the foot of
            the screen. */}
        <div className="pointer-events-none relative flex flex-1 flex-col items-center px-6">
          <div className="flex-1" />
          {/* The slot the field measures its cell size from. Server-rendered
              as the SVG so the wordmark is there before any script runs, then
              handed over to the canvas once it has painted the same pixels. */}
          {/* In the same bands the field paints the word at rest: five rows
              of crest, two of hover, four of lit, three of mid, five of dim,
              over the nineteen rows of the mask. So the handover to the
              canvas changes no pixel. */}
          <OmarchyWordmark
            data-hero-wordmark
            className={
              'w-[88%] max-w-4xl text-[color:var(--t-field-lit)]' +
              (painted ? ' invisible' : '')
            }
            background="linear-gradient(to bottom, var(--t-field-crest) 0 26.316%, var(--t-field-hover) 26.316% 36.842%, var(--t-field-lit) 36.842% 57.895%, var(--t-field-mid) 57.895% 73.684%, var(--t-field-dim) 73.684% 100%)"
          />
          {/* Straight under the word, five cells of the lattice down, on
              every screen. */}
          <div
            data-hero-quiet
            className="pointer-events-auto mt-12 flex w-full max-w-2xl flex-col items-center text-center lg:mt-[calc(var(--pxr)*5)]"
          >
            <h1
              data-hero-stagger
              style={{ '--stagger': 0 } as React.CSSProperties}
              className="text-2xl font-medium tracking-tight text-text [text-wrap:balance] sm:text-3xl"
            >
              <span className="sr-only">Omarchy: </span>
              Beautiful, fun &amp; opinionated Linux by{' '}
              <a
                href="https://dhh.dk"
                className="underline decoration-border-strong underline-offset-[6px] transition-colors duration-150 ease-out hover:decoration-brand"
              >
                DHH
              </a>
              .
            </h1>
            <p
              data-hero-stagger
              style={{ '--stagger': 1 } as React.CSSProperties}
              className="mt-4 text-[15px] leading-relaxed text-text-secondary"
            >
              {/* Each sentence keeps its own line, so balancing can never
                  strand the opening word of the second one up on the first. */}
              <span className="block [text-wrap:balance]">
                The malleable OS for the age of agents.
              </span>
              <span className="block [text-wrap:balance]">
                Vibe your way through every alteration, tweak, and desire.
              </span>
            </p>

            <div
              data-hero-stagger
              data-hero-cta
              style={{ '--stagger': 2 } as React.CSSProperties}
              className="mt-9 flex w-full max-w-xs flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row lg:gap-[calc(var(--pxc)*2)]"
            >
              {/* Both stay fully opaque, hover included: the default hover
                  drops the fill to 80% and the outline variant is a tinted
                  translucent panel, which lets the field show through the
                  one place on the site with a moving background. Height
                  still tracks the lattice; width follows the label so the
                  padding is not eaten by a cell count. */}
              <Button
                size="lg"
                className="lg:h-[calc(var(--pxr)*4)]"
                nativeButton={false}
                onClick={installLink}
                render={<Link to="/" hash="install" />}
              >
                <DownloadIcon data-icon="inline-start" />
                Get Omarchy
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="lg:h-[calc(var(--pxr)*4)]"
                nativeButton={false}
                onClick={watchLink}
                render={<Link to="/" hash="watch" />}
              >
                <PlayIcon data-icon="inline-start" />
                See it in action
              </Button>
            </div>
          </div>
          <div className="flex-1" />
        </div>
      </section>

      {/* The case for Omarchy, in one section: what it is, what that buys
          you, what it looks like in use, and how to get it. These were four
          separate sections that mostly restated each other. A column of five
          pillars used to run beside this one, restating in a list what these
          few sentences and the quote already say; the page introduces the
          idea here and lets the manual do the explaining. The install is
          deliberately thin here too: this is a landing page. */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-28 sm:px-6">
          {/* The words on the left, the quote across from them: with the
              column of pillars gone, a single column left the right half of
              the page empty. */}
          <div className="grid gap-14 lg:grid-cols-[1.35fr_1fr] lg:gap-20">
            <div>
              {/* Unattributed on purpose: this is the site's own voice, not
                  a quotation set apart from it. */}
              {/* The line is a quotation of the campaign it names, so it
                  points at it, wearing the hero byline's underline. The
                  sentence it reads out is the campaign's, whatever the tail
                  happens to be showing. */}
              <h2
                data-typed-block
                className="text-2xl font-semibold tracking-tight text-text [contain:layout] [text-wrap:balance] sm:text-[1.75rem]"
              >
                <a
                  href="https://wecanfixeverything.com/"
                  className="underline decoration-border-strong underline-offset-[6px] transition-colors duration-150 ease-out hover:decoration-brand"
                >
                  <span className="sr-only">We can fix everything.</span>
                  <span aria-hidden="true">
                    We can fix every
                    <TypewriterTail phrases={FIXES} />
                  </span>
                </a>
              </h2>
              <p className="mt-6 max-w-[35.5rem] text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
                Linux on the desktop has always asked for a weekend before it
                gave anything back: a window manager to pick, a terminal to
                theme, a hundred small decisions between you and a machine you
                like using. Omarchy answers those decisions with taste, and then
                leaves every one of them open.
              </p>
              <p className="mt-5 max-w-[35.5rem] text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
                The name says as much. Oma is for omakase, chef's choice: the
                chef picks the courses, and you are still free to send anything
                back.
              </p>

              {/* A quote marked as one by being one: bigger type, real
                  quotation marks, a name under it. The accent bar down the
                  left was generic blockquote furniture, and it read as a
                  rule the rest of the page does not use. */}
            </div>

            {/* Sat under the words before, so it keeps a top margin for
                that; beside them it has none, and it holds the page's right
                edge rather than floating in the middle of the column. */}
            <div className="lg:justify-self-end lg:self-center lg:[&>figure]:-mt-[3px]">
              <DhhQuote />
            </div>
          </div>
        </div>

        {/* seeing it, as a band across the page: the rail wants the whole
            window, and the change of ground marks the turn from the case to
            the evidence without starting a new section */}
        <div
          id="watch"
          data-ground
          className="border-y border-border-subtle bg-bg-deep py-24"
        >
          <VideoCarousel
            level={3}
            title="See it in action"
            description="The introduction from DHH, and what the Linux YouTube circuit made of it."
            videos={videos}
          />
        </div>

        <div id="install" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            level={3}
            title="Install Omarchy"
            description="Omarchy installs as a complete operating system. Both routes below land in the same place: a full, encrypted desktop in under a minute."
            action={installGuide}
          />

          {/* A fork in the road reads as two things you pick between, so they
              are cards, the same ones the plugins, themes and community use.
              Both blurbs run to two lines and both notes to one, so the thing
              you press sits on the same line in each. It was the copy that
              knocked them apart: four lines of blurb on one side against two
              on the other left a hole under the short one, and a note that
              wrapped where the other did not put the button 19px below the
              command box it is meant to match. */}
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="ring-elevation flex min-w-0 flex-col bg-surface p-6">
              <div className="flex items-center gap-2.5">
                <UsbIcon className="size-5 text-brand" />
                <h4 className="text-lg font-medium tracking-tight text-text">
                  Start from scratch
                </h4>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
                Write the ISO to a USB stick and answer five questions. It hands
                back a finished desktop.
              </p>
              <div className="mt-auto pt-6">
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<a href={ISO_URL} />}
                >
                  <DownloadIcon data-icon="inline-start" />
                  Download Omarchy {release.version}
                </Button>
                <p className="mt-2.5 text-[13px] text-text-muted">
                  5.8 GB, for 64-bit PCs.
                </p>
              </div>
            </div>

            <div className="ring-elevation flex min-w-0 flex-col bg-surface p-6">
              <div className="flex items-center gap-2.5">
                <ConsoleIcon className="size-5 text-brand" />
                <h4 className="text-lg font-medium tracking-tight text-text">
                  Already running Arch?
                </h4>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
                Keep the system you have and let the installer lay Omarchy over
                it. One command, then a reboot.
              </p>
              <div className="mt-auto pt-6">
                <InstallCommand command={INSTALL_COMMAND} />
                <p className="mt-2.5 text-[13px] text-text-muted">
                  The same script the ISO uses. Read it before running.
                </p>
              </div>
            </div>
          </div>

          {/* The two variants worth knowing about. Getting Started is the
              button above, so it is not repeated here. */}
          <p className="mt-6 text-[13px] leading-relaxed text-text-muted [text-wrap:pretty]">
            The manual also covers{' '}
            <Link
              to="/manual/$slug/"
              params={{ slug: 'dual-boot-install' }}
              className="text-text-secondary underline decoration-border-strong underline-offset-4 transition-colors duration-150 ease-out hover:text-text hover:decoration-brand"
            >
              dual booting beside Windows
            </Link>{' '}
            and{' '}
            <Link
              to="/manual/$slug/"
              params={{ slug: 'unattended-installs' }}
              className="text-text-secondary underline decoration-border-strong underline-offset-4 transition-colors duration-150 ease-out hover:text-text hover:decoration-brand"
            >
              unattended installs
            </Link>
            .
          </p>
          <SectionActions>{installGuide}</SectionActions>
        </div>
      </section>

      {/* plugins */}
      <section className="border-t border-border-subtle bg-bg-deep">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            title="A marketplace built into the OS"
            description={`${total.toLocaleString('en-US')} community plugins for the Quattro shell: bars, widgets, overlays, and services, each one a single command away.`}
            action={allPlugins}
          />
          <CardRail className="mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((plugin) => (
              <PluginCard key={plugin.id} plugin={plugin} />
            ))}
          </CardRail>
          <SectionActions>{allPlugins}</SectionActions>
        </div>
      </section>

      {/* themes: the same grid as the plugins above, since a theme and a
          plugin are the same kind of thing to go browsing through */}
      <section className="border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            title="Change everything with one keystroke"
            description={
              <>
                A theme restyles the whole system at once: terminal, bar,
                notifications, wallpaper.
                {/* The site answers the same key Omarchy does, so the section
                    about changing everything with one keystroke can be tried
                    with one. Only where there is a keyboard to try it on -
                    and what that key offers is the themes Omarchy ships
                    with, all of which are here. Named rather than called the
                    built-in ones, which contrasted with nothing once the
                    sentence about community themes came out - and with no
                    count in it, since that is the sort of number that goes
                    quietly stale. */}
                <span className="hidden sm:inline">
                  {' '}
                  Press{' '}
                  <kbd className="border border-border-strong px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">
                    T
                  </kbd>{' '}
                  to try the ones Omarchy ships with.
                </span>
              </>
            }
            action={allThemes}
          />
          <CardRail className="mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {themes.slice(0, 6).map((theme) => (
              <ThemeCard key={theme.name} theme={theme} />
            ))}
          </CardRail>
          <SectionActions>{allThemes}</SectionActions>
        </div>
      </section>

      {/* news: what the project said lately, full width. The figures used to
          sit beside it and made one screen answer four questions at once;
          they have the section after this one now, so each can be read on
          its own. */}
      <section className="border-t border-border-subtle bg-bg-deep">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading title="Latest from the project" action={allNews} />
          {/* Two columns of three: six posts down one wide column read as a
              thin list. Each item draws its own line, so the rules meet
              across the gap where a divide-y would stagger. */}
          <ul className="mt-8 grid border-t border-border-subtle sm:grid-cols-2 sm:gap-x-10">
            {/* Six on a wide screen, three on a phone: one column of six
                posts is a page of scrolling before the numbers, and the
                button under the list leads to the rest. */}
            {news.slice(0, 6).map((post, i) => (
              <li
                key={post.slug}
                className={cn(
                  'border-b border-border-subtle',
                  i >= 3 && 'hidden sm:block',
                )}
              >
                <Link
                  to="/news/$year/$month/$slug/"
                  params={{
                    year: post.year,
                    month: post.month,
                    slug: post.slug,
                  }}
                  className="group flex h-full flex-col gap-1.5 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <time
                    dateTime={post.date}
                    className="font-mono text-xs text-text-muted"
                  >
                    {post.dateStr}
                  </time>
                  <span className="font-sans text-base font-medium text-text transition-colors duration-150 ease-out group-hover:text-brand">
                    {post.title}
                  </span>
                  {/* Two lines of the post, enough to tell what it is about;
                      the whole first paragraph made six posts read as one
                      wall of text, and the title carried less weight than
                      the excerpt under it. */}
                  <span className="line-clamp-2 text-[13px] leading-relaxed text-text-secondary [text-wrap:pretty]">
                    {post.excerpt}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <SectionActions>{allNews}</SectionActions>
        </div>
      </section>

      {/* the figures, on their own: the foundation's funding, the ISO
          downloads and the repository, one card each, counting up as they
          arrive. Same ground as the news they are drawn from; the rule
          between the two is enough of a break. */}
      <section
        id="figures"
        className="border-t border-border-subtle bg-bg-deep"
      >
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            title="The project in numbers"
            description="What the foundation has announced, what the download post counted, and what the repository shows. Each card links to where its number comes from."
          />
          <Figures />
        </div>
      </section>

      {/* the teams, between the project and the people around it: this is
          who steers it. All three on one line as clusters of faces, rather
          than Core alone as a grid of cards. */}
      <section className="border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            title="The people steering it"
            description="Omarchy Core sets the direction, the Security team keeps your system safe, and the Rangers help others find their way."
            action={allTeams}
          />
          <TeamClusters />
          <SectionActions>{allTeams}</SectionActions>
        </div>
      </section>

      {/* community */}
      <section className="border-t border-border-subtle bg-bg-deep">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            title="Be the Omarch"
            description="Command your agent, and hang out with the people doing the same."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {communityCards.map((card) => {
              const inner = (
                <>
                  <card.icon className="size-5 text-brand" />
                  <h3 className="mt-3.5 text-[15px] font-medium text-text">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary [text-wrap:pretty]">
                    {card.body}
                  </p>
                  <span className="mt-auto flex items-center gap-1 pt-4 text-[13px] font-medium text-brand">
                    {card.cta}
                    <ArrowRightIcon className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                  </span>
                </>
              )
              const className =
                'ring-elevation ring-elevation-hover group flex flex-col bg-surface p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
              return 'href' in card ? (
                <a key={card.title} href={card.href} className={className}>
                  {inner}
                </a>
              ) : (
                <Link
                  key={card.title}
                  to="/$/"
                  params={{ _splat: card.splat }}
                  className={className}
                >
                  {inner}
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}

/**
 * The quote, in the dressing that won: the glyph inside the card. The panel
 * gives it a place, the oversized green mark anchors it - at this size it
 * reads as two lit pixels, which is the identity - and the inline quotes
 * stay dropped so the mark is the only punctuation dressing the words.
 */
function DhhQuote() {
  return (
    <figure className="mt-12 max-w-md border border-border-subtle bg-surface p-7">
      <div
        aria-hidden="true"
        className="h-10 font-sans text-6xl leading-none font-bold text-brand"
      >
        &ldquo;
      </div>
      {/* Balanced, so the break lands at the comma between the two clauses
          instead of stranding "you should" on a line. */}
      <blockquote className="font-sans text-xl leading-snug font-medium text-text [text-wrap:balance]">
        When you can vibe code whatever app comes to your mind, you should be
        able to vibe code your operating system.
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3.5">
        {/* Sized to weigh the same as the two lines beside it, and framed:
            the photo's bright ground floated loose on the panel without the
            hairline seating it. */}
        <img
          src="/assets/images/team/dhh.webp"
          alt=""
          width={48}
          height={48}
          loading="lazy"
          decoding="async"
          className="size-12 shrink-0 border border-border-subtle object-cover"
        />
        <span className="flex flex-col font-mono leading-snug">
          <span className="text-[15px] font-medium text-text">
            David Heinemeier Hansson
          </span>
          <span className="text-[13px] text-text-muted">
            Creator of Omarchy
          </span>
        </span>
      </figcaption>
    </figure>
  )
}
