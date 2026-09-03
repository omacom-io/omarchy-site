import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CopyIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const swapTransition = { type: 'spring', duration: 0.3, bounce: 0 } as const

/**
 * A terminal-style one-liner with a copy button. The confirmation swaps the
 * icon (blur + scale cross-fade, checkmark draws itself in) for ~1.5s so the
 * user knows the copy landed.
 */
export function InstallCommand({
  command,
  className,
}: {
  command: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reducedMotion = useReducedMotion()

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable (permissions, http): leave the text selectable.
    }
  }

  return (
    <div
      className={cn(
        'ring-elevation flex min-w-0 items-center gap-1 rounded-lg bg-bg-deep py-1.5 pr-1.5 pl-4',
        className,
      )}
    >
      {/* One line on a wide screen, where it fits. On a phone it wraps at its
          spaces instead: a command held to one line is both cut off mid-URL
          and, because a grid column will not size below its content's minimum,
          wide enough to drag the whole page sideways. */}
      <code className="min-w-0 flex-1 overflow-x-auto py-1.5 font-mono text-sm break-words whitespace-normal text-text sm:whitespace-nowrap">
        <span aria-hidden="true" className="mr-2 text-brand select-none">
          $
        </span>
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy install command'}
        className="relative flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-[background-color,color,scale] duration-150 ease-out before:absolute before:-inset-2 hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.96]"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={copied ? 'check' : 'copy'}
            className="flex items-center justify-center"
            initial={
              reducedMotion
                ? false
                : { opacity: 0, scale: 0.25, filter: 'blur(4px)' }
            }
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.25, filter: 'blur(4px)' }
            }
            transition={reducedMotion ? { duration: 0 } : swapTransition}
          >
            {copied ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="square"
                strokeLinejoin="miter"
                className="size-5 text-brand"
                aria-hidden="true"
              >
                <motion.path
                  d="M4 12l5 5L20 6"
                  initial={reducedMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : {
                          type: 'spring',
                          stiffness: 300,
                          damping: 25,
                          delay: 0.05,
                        }
                  }
                />
              </svg>
            ) : (
              <CopyIcon className="size-5" />
            )}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  )
}
