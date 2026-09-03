import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { HeroShader } from '@/components/HeroShader'
import { HeroNavGhost } from '@/components/SiteHeader'
import { NotFoundWordmark } from '@/components/Brand'
import { ArrowLeftIcon } from '@/components/icons'
import {
  NOT_FOUND_HEIGHT,
  NOT_FOUND_ROWS,
  NOT_FOUND_WIDTH,
} from '@/data/not-found-bitmap'
import { WORDMARK_HEIGHT } from '@/data/wordmark-bitmap'
import { Button } from '@/components/ui/button'
import { useTopLink } from '@/lib/hash-scroll'

/**
 * The 404, built as the hero is built: one field of pixels that resolves
 * into a word, except the word is NOT FOUND. The letters are cut in the
 * wordmark's own hand - see scripts/build-not-found-glyph.mjs - so a dead
 * link lands somewhere that is recognisably the same place, rather than on
 * an apology in a different typeface.
 *
 * It answers the cursor and takes a click the way the wordmark does. The
 * click goes home instead of opening the theme picker, which is the one
 * thing a person on this page is actually trying to do.
 */
const GLYPH = {
  rows: NOT_FOUND_ROWS,
  width: NOT_FOUND_WIDTH,
  height: NOT_FOUND_HEIGHT,
}

export function NotFoundHero() {
  const navigate = useNavigate()
  const [painted, setPainted] = useState(false)
  // The same handler the navbar's logo uses, so arriving home from here
  // lands at the top like every other route to it.
  const home = useTopLink()

  return (
    // Same shape as the home page's hero: a section inside a main, carrying
    // the sentinel the bar watches and the ghost that paints its labels.
    // The bar's rule is written against that structure, so matching it is
    // what makes this page's bar behave like the hero's rather than like an
    // ordinary section's.
    <main>
      <section
        data-hero-sentinel
        className="pixel-container relative -mt-(--nav-h) flex min-h-svh flex-col overflow-hidden border-b border-border-subtle pt-(--nav-h) select-none [-webkit-touch-callout:none]"
        style={{ background: 'var(--t-field-bg)' }}
      >
        <HeroShader
          glyph={GLYPH}
          onPainted={() => setPainted(true)}
          onGlyphPress={() => void navigate({ to: '/' })}
        />

        <HeroNavGhost />

        <div className="pointer-events-none relative flex flex-1 flex-col items-center px-6">
          {/* The same 2.1 : 1 split the hero uses, so the word sits on the
            optical centre rather than the geometric one. */}
          <div className="flex-[2.1]" />
          {/* Two things have to hold at once, and they pull against each
            other. The word has to sit on the same axis OMARCHY sits on, and
            its cells have to be the same size as OMARCHY's cells - otherwise
            the same letterforms read as a smaller typeface on this page.

            NOT FOUND is 102 cells against the wordmark's 81, so it cannot
            have both inside one box: at the wordmark's width its cells come
            out a fifth smaller. So the two are separated. The box fixes only
            the height, which is what the axis is measured from - 19 cell-rows,
            exactly the wordmark's - and the word inside it is sized off the
            same --pxc the hero's lattice is built from, so one cell here is
            one cell there. It asks for the width that gives it, and takes
            what there is when the viewport cannot supply it. */}
          <div
            className="flex w-full items-center justify-center"
            style={{ height: `calc(var(--pxr) * ${WORDMARK_HEIGHT})` }}
          >
            <div
              style={{
                width: `min(calc(var(--pxc) * ${NOT_FOUND_WIDTH}), 100%)`,
              }}
            >
              <NotFoundWordmark
                data-hero-wordmark
                label="Not found"
                className={
                  'w-full text-[color:var(--t-field-lit)]' +
                  (painted ? ' invisible' : '')
                }
              />
            </div>
          </div>
          <div className="flex-1" />

          <div
            data-hero-quiet
            className="pointer-events-auto flex w-full max-w-2xl flex-col items-center pb-24 text-center"
          >
            <h1 className="text-2xl font-medium tracking-tight text-text [text-wrap:balance] sm:text-3xl">
              <span className="sr-only">404: </span>
              There is nothing at this address.
            </h1>
            {/* Two lines, one button, the same margins: this block has to
              stand exactly as tall as the hero's, because the word above it
              is placed by a flex ratio against everything below. A sentence
              short here and NOT FOUND lands lower on the page than OMARCHY
              does, which is visible the moment you flick between them. The
              break is where the sentence already pauses. */}
            <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
              <span className="block [text-wrap:balance]">
                The link may be old,
              </span>
              <span className="block [text-wrap:balance]">
                or the page may have moved.
              </span>
            </p>
            {/* A real control, because the word above is a canvas: keyboards
              and anything without JavaScript need a way out of here too. */}
            <div className="mt-9 flex w-full max-w-xs flex-col items-stretch sm:w-auto sm:max-w-none">
              <Button
                size="lg"
                variant="outline"
                // Seventeen cells, not the hero's fifteen: the same width
                // around a longer label was crushing the icon against the
                // left edge - the fixed width is narrower than the content
                // and the overflow comes out of the padding. Odd, so the
                // button's edges land on the lattice while it is centred.
                className="lg:h-[calc(var(--pxr)*4)] lg:w-[calc(var(--pxc)*17)]"
                nativeButton={false}
                onClick={home}
                render={<Link to="/" />}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Back to Omarchy
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
