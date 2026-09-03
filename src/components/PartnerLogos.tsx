import type { SVGProps } from 'react'

/**
 * Third-party marks, kept out of components/icons because they break the one
 * rule that set follows: they carry their own viewBoxes rather than the 24
 * grid. Both draw in currentColor, so they sit in a line of text as the text
 * and follow the theme with it.
 */

type LogoProps = SVGProps<SVGSVGElement>

/** 37signals, drawn in currentColor: the supplied mark is solid black, which
 *  would disappear on five of the six themes. */
export function ThirtySevenSignalsMark(props: LogoProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <g fill="currentColor">
        <path d="m6.41808 12.1861c-.84794.8738-.86508 2.2961 0 3.1591.87184.8718 2.29508.8718 3.16545.0003.87577-.872.87537-2.2876 0-3.1591-.71848-.72-.71812-1.8845 0-2.60278.84957-.87477.86657-2.30424 0-3.16749-.87077-.87207-2.29374-.87184-3.16545 0-.72287.69857-1.88822.71259-2.60261 0-.71846-.71953-.71846-1.88425-.00027-2.6034.84845-.87433.86577-2.29447.0004-3.158389-.8708-.873707-2.28856-.873707-3.160232-.0003-.873859.872969-.873789 2.285789 0 3.158689.697952.72098.712062 1.89122 0 2.6034-.847885.87421-.865189 2.30337-.000046 3.16749.871828.87078 2.289308.87078 3.159918 0 .72337-.69907 1.88871-.71329 2.60284 0 .7193.71848.71922 1.88278 0 2.60248z" />
        <path d="m9.58326 3.82319c.87564-.87519.87564-2.29194-.00009-3.167216-.87349-.875988-2.29236-.875988-3.16501.000324-.87704.874862-.87755 2.292392 0 3.167172.87225.87415 2.29141.87415 3.1651-.00028z" />
        <path d="m15.3433 9.5835c.8756-.87518.8756-2.29221-.0001-3.16749-.8735-.87599-2.2924-.87599-3.165.00032-.877.87486-.8776 2.29239 0 3.16717.8722.8742 2.2914.8744 3.1651 0z" />
      </g>
    </svg>
  )
}

/** Cloudflare, monochrome. Its two oranges next to a line of muted 13px text
 *  read as an advertisement rather than as a credit, and they were the one
 *  thing in the footer that ignored the theme. The two shapes do not overlap,
 *  so a single colour still draws the cloud and its arc. The supplied mark
 *  also carries a white shape behind the cloud, meant for a white page and
 *  reading as a bite out of the logo on a dark one; it is dropped rather than
 *  filled, since nothing shows through it. */
export function CloudflareMark(props: LogoProps) {
  return (
    <svg
      viewBox="0 0 256 116"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid"
      {...props}
    >
      <path
        fill="currentColor"
        d="M176.332 108.348c1.593-5.31 1.062-10.622-1.593-13.809-2.656-3.187-6.374-5.31-11.154-5.842L71.17 87.634c-.531 0-1.062-.53-1.593-.53-.531-.532-.531-1.063 0-1.594.531-1.062 1.062-1.594 2.124-1.594l92.946-1.062c11.154-.53 22.839-9.56 27.087-20.182l5.312-13.809c0-.532.531-1.063 0-1.594C191.203 20.182 166.772 0 138.091 0 111.535 0 88.697 16.995 80.73 40.896c-5.311-3.718-11.684-5.843-19.12-5.31-12.747 1.061-22.838 11.683-24.432 24.43-.531 3.187 0 6.374.532 9.56C16.996 70.107 0 87.103 0 108.348c0 2.124 0 3.718.531 5.842 0 1.063 1.062 1.594 1.594 1.594h170.489c1.062 0 2.125-.53 2.125-1.594l1.593-5.842Z"
      />
      <path
        fill="currentColor"
        d="M205.544 48.863h-2.656c-.531 0-1.062.53-1.593 1.062l-3.718 12.747c-1.593 5.31-1.062 10.623 1.594 13.809 2.655 3.187 6.373 5.31 11.153 5.843l19.652 1.062c.53 0 1.062.53 1.593.53.53.532.53 1.063 0 1.594-.531 1.063-1.062 1.594-2.125 1.594l-20.182 1.062c-11.154.53-22.838 9.56-27.087 20.182l-1.063 4.78c-.531.532 0 1.594 1.063 1.594h70.108c1.062 0 1.593-.531 1.593-1.593 1.062-4.25 2.124-9.03 2.124-13.81 0-27.618-22.838-50.456-50.456-50.456"
      />
    </svg>
  )
}
