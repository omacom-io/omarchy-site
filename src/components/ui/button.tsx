import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // transition-all animated width, height and every colour at once, which is
  // both a layout-recalculation trap and the reason hover felt mushy; the
  // properties are listed instead. Press is a scale rather than the old 1px
  // nudge, which shifted the label against its own icon.
  'group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding font-medium whitespace-nowrap outline-none transition-[background-color,border-color,color,transform] duration-150 ease-out select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Every fill is opaque. The translucent hovers these had (primary at
        // 80%, input at 30%) let the hero's moving field show through the one
        // surface on the site that is never still, and every prominent button
        // was overriding them locally to get a solid one back.
        default:
          'bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--color-primary),white_14%)]',
        outline:
          'border-border-strong bg-surface text-text hover:bg-surface-2 aria-expanded:bg-surface-2',
        secondary:
          'bg-surface-2 text-text hover:bg-[color-mix(in_oklch,var(--color-surface-2),var(--color-text)_8%)] aria-expanded:bg-surface-2',
        ghost: 'text-text hover:bg-surface-2 aria-expanded:bg-surface-2',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // Heights line up with the 40px search fields and clear the 40px
        // desktop hit-area floor. The old scale topped out at 36px with the
        // same 10px padding at every size, so a large button was as cramped
        // as a small one and every real one overrode its own height. Padding
        // on an icon's side is trimmed 2px, which optically centres the pair.
        xs: "h-8 gap-1.5 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        sm: "h-9 gap-1.5 px-3 text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-4",
        default:
          "h-10 gap-2 px-4 text-sm has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5 [&_svg:not([class*='size-'])]:size-5",
        lg: "h-11 gap-2 px-5 text-[15px] has-data-[icon=inline-end]:pr-4.5 has-data-[icon=inline-start]:pl-4.5 [&_svg:not([class*='size-'])]:size-5",
        'icon-xs': "size-8 [&_svg:not([class*='size-'])]:size-4",
        'icon-sm': "size-9 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-10 [&_svg:not([class*='size-'])]:size-5",
        'icon-lg': "size-11 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
