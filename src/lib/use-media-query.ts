import { useEffect, useState } from 'react'

/**
 * Whether a media query matches right now. It answers false until the
 * component has mounted, so the server and the first client render agree;
 * anything gated on this should therefore be a progressive change to the
 * wide layout rather than the other way round.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const sync = () => setMatches(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [query])

  return matches
}

/** Below Tailwind's `sm`, where the site drops to its one-column layout. */
export const useIsNarrow = () => useMediaQuery('(max-width: 639.98px)')
