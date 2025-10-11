/**
 * Creates a requestAnimationFrame (RAF) scheduler for debouncing animation frame callbacks.
 *
 * This factory returns a function that schedules a callback to run on the next animation frame.
 * If multiple calls are made before the frame executes, only the last callback is executed.
 *
 * This is ideal for scenarios where you want to batch or debounce UI updates, such as scroll or resize handlers,
 * without risking global state leaks or cross-component interference.
 *
 * ### Why use this?
 * - Prevents redundant RAF calls and excessive re-renders.
 * - Ensures only the latest callback is executed per frame.
 * - Each scheduler instance is independent—no global state is shared.
 *
 * @example
 * // Svelte usage example:
 * <script lang="ts">
 *   import { createRafScheduler } from '$lib/utils/raf.js';
 *   const rafSchedule = createRafScheduler();
 *   function onScroll() {
 *     rafSchedule(() => {
 *       // Perform expensive DOM measurement or update
 *     });
 *   }
 * </script>
 * <div on:scroll={onScroll}> ... </div>
 *
 * @returns {(fn: () => void) => void} A scheduler function. Call with a callback to schedule it for the next animation frame.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
 */
export const createRafScheduler = (): ((fn: () => void) => void) => {
    let scheduled = false
    let callback: (() => void) | null = null

    return (_fn: () => void): void => {
        callback = _fn
        if (!scheduled) {
            scheduled = true
            requestAnimationFrame(() => {
                scheduled = false
                if (callback) {
                    callback()
                    callback = null
                }
            })
        }
    }
}
