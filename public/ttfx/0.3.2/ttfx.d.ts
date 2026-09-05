/* tslint:disable */
/* eslint-disable */

export class Session {
    free(): void;
    [Symbol.dispose](): void;
    done(): boolean;
    /**
     * Copy the current frame into caller-owned typed arrays.
     *
     * Each array must be at least `width * height` long. Extra length is left
     * untouched. Symbols are Unicode scalar values, one per cell.
     */
    fill(symbols: Uint32Array, fg: Uint32Array, bg: Uint32Array, flags: Uint8Array): void;
    height(): number;
    constructor(input: string, effect: string, columns: number, rows: number, seed: number | null | undefined, frame_rate: number, palette?: string | null, background?: string | null);
    /**
     * Advance one animation frame. Returns false when the effect is finished.
     */
    step(): boolean;
    width(): number;
}

/**
 * JSON array of `{name, about}` for every registered effect.
 */
export function effect_catalog(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_session_free: (a: number, b: number) => void;
    readonly effect_catalog: () => [number, number];
    readonly session_done: (a: number) => number;
    readonly session_fill: (a: number, b: any, c: any, d: any, e: any) => [number, number];
    readonly session_height: (a: number) => number;
    readonly session_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => [number, number, number];
    readonly session_step: (a: number) => number;
    readonly session_width: (a: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
