/** Types for the shared passthrough list; the module itself is plain ESM so
 *  the build script can import it without a compile step. */
export const WHOLE: ReadonlyArray<string>
export const ASSETS_ONLY: ReadonlyArray<string>
export const REDIRECTS: Readonly<Record<string, string>>
export function isPassthrough(pathname: string): boolean
