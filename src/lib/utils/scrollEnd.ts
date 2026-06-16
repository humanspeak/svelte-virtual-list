/**
 * Utilities to detect when a programmatic scroll has visually finished.
 *
 * The browser's `scrollTo` returns immediately — it does not wait for a smooth
 * animation to complete. These helpers bridge that gap so callers can await the
 * real end of a scroll before reading layout or resolving a promise.
 */

/** Hard safety timeout (ms): always resolve so a promise can never hang. */
const SCROLL_END_TIMEOUT_MS = 1200
/** Number of consecutive stable frames required to consider a poll settled. */
const STABLE_FRAMES = 3
/** Pixel tolerance when comparing scroll positions. */
const POSITION_TOLERANCE = 1

/**
 * Resolves once a programmatic scroll on `viewport` has visually finished.
 *
 * Resolution strategy:
 * - Instant scroll (or already at target): resolves on the next animation frame,
 *   once the browser has applied the new `scrollTop`.
 * - Smooth scroll with native `scrollend` support: resolves on the `scrollend` event.
 * - Smooth scroll without support (e.g. Safari): polls `scrollTop` until it
 *   stabilizes for several consecutive frames or reaches the target.
 *
 * A safety timeout always resolves the promise to avoid hanging if neither the
 * event nor the poll ever settles (e.g. an unreachable target or an interrupted
 * animation). Passing an already-aborted (or later aborted) `signal` resolves
 * immediately and tears down all listeners/timers.
 *
 * @example
 * // Scroll smoothly and await the visual end, cancelling on a newer scroll:
 * import { waitForScrollEnd } from '$lib/utils/scrollEnd.js';
 *
 * const controller = new AbortController();
 * const target = 1200;
 * viewport.scrollTo({ top: target, behavior: 'smooth' });
 * await waitForScrollEnd(viewport, target, true, controller.signal);
 * // ...later, to abandon the wait (e.g. a newer scroll started):
 * controller.abort();
 *
 * @param viewport The scrollable element being animated.
 * @param target The desired final `scrollTop` value.
 * @param smooth Whether the scroll was initiated with `behavior: 'smooth'`.
 * @param signal Optional AbortSignal to cancel waiting (e.g. a newer scroll).
 * @returns A promise that resolves when the scroll has finished (or is cancelled).
 */
export const waitForScrollEnd = (
    viewport: HTMLElement,
    target: number,
    smooth: boolean,
    signal?: AbortSignal
): Promise<void> => {
    return new Promise<void>((resolve) => {
        if (signal?.aborted) {
            resolve()
            return
        }

        const alreadyThere = Math.abs(viewport.scrollTop - target) <= POSITION_TOLERANCE
        const shouldWaitForSmoothScroll = smooth && !alreadyThere

        let rafId = 0
        let onScrollEnd: (() => void) | undefined

        function cleanup() {
            if (rafId) cancelAnimationFrame(rafId)
            if (timeoutId !== undefined) clearTimeout(timeoutId)
            if (onScrollEnd) viewport.removeEventListener('scrollend', onScrollEnd)
            signal?.removeEventListener('abort', onAbort)
        }

        function finish() {
            cleanup()
            resolve()
        }

        const onAbort = finish
        const timeoutId = shouldWaitForSmoothScroll
            ? setTimeout(finish, SCROLL_END_TIMEOUT_MS)
            : undefined

        // Instant scroll or no-op (already at target): a smooth `scrollTo` to the
        // current position never fires `scrollend`, so handle it as instant.
        if (!shouldWaitForSmoothScroll) {
            rafId = requestAnimationFrame(() => {
                rafId = 0
                finish()
            })
            return
        }

        signal?.addEventListener('abort', onAbort, { once: true })

        // Smooth scroll with native `scrollend` support (Chrome, Firefox).
        if (typeof window !== 'undefined' && 'onscrollend' in window) {
            onScrollEnd = finish
            viewport.addEventListener('scrollend', onScrollEnd, { once: true })
            return
        }

        // Fallback (e.g. Safari): poll until `scrollTop` stabilizes or reaches target.
        let lastTop = viewport.scrollTop
        let stableFrames = 0
        let hasMoved = false
        const poll = () => {
            const top = viewport.scrollTop
            const delta = Math.abs(top - lastTop)
            if (delta > POSITION_TOLERANCE) {
                hasMoved = true
                stableFrames = 0
            } else {
                stableFrames += 1
            }
            lastTop = top

            const nearTarget = Math.abs(top - target) <= POSITION_TOLERANCE
            if (nearTarget || (hasMoved && stableFrames >= STABLE_FRAMES)) {
                rafId = 0
                finish()
                return
            }
            rafId = requestAnimationFrame(poll)
        }
        rafId = requestAnimationFrame(poll)
    })
}
