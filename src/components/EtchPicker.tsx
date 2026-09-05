import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { DEFAULT_EFFECT, EFFECTS, ETCH_EVENT } from '@/lib/etch'

/**
 * A development-only panel for trying every ttfx effect on the wordmark:
 * click a name and it plays. The address keeps the choice (?etch=...), so a
 * reload plays the same one. Rendered only on the dev server.
 */
export function EtchPicker() {
  const [open, setOpen] = useState(true)
  const [current, setCurrent] = useState<string>(DEFAULT_EFFECT)

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('etch')
    if (
      fromUrl &&
      (fromUrl === 'random' || (EFFECTS as readonly string[]).includes(fromUrl))
    )
      setCurrent(fromUrl)
  }, [])

  const play = (name: string) => {
    setCurrent(name)
    const url = new URL(window.location.href)
    url.searchParams.set('etch', name)
    window.history.replaceState(null, '', url)
    window.dispatchEvent(new CustomEvent(ETCH_EVENT, { detail: name }))
  }

  return (
    <div
      data-no-stamp
      className="pointer-events-auto fixed bottom-24 left-4 z-(--z-dropdown) font-mono text-[12px]"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ring-elevation bg-surface px-3 py-1.5 text-text-secondary hover:text-text"
      >
        etch: {current} {open ? '▾' : '▸'}
      </button>
      {open ? (
        <div className="ring-elevation mt-1 grid max-h-[60vh] w-[22rem] grid-cols-3 gap-px overflow-y-auto bg-surface p-1">
          {['random' as const, ...EFFECTS].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => play(name)}
              className={cn(
                'px-2 py-1 text-left hover:bg-surface-2 hover:text-text',
                name === current
                  ? 'bg-surface-2 text-brand'
                  : 'text-text-secondary',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
