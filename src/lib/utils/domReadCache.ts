/**
 * Per-frame DOM read cache for batching layout measurements.
 *
 * Caches `getBoundingClientRect()` results within a single animation frame
 * to avoid repeated synchronous layout reads (layout thrashing).
 *
 * The cache automatically invalidates at the start of the next frame,
 * ensuring fresh measurements while preventing redundant reads within
 * the same frame.
 */

// WeakMap keyed by element; values are cached DOMRect + frame timestamp
const rectCache = new WeakMap<Element, { rect: DOMRect; frame: number }>()

// Current frame counter (increments each RAF)
let currentFrame = 0
let frameScheduled = false

/**
 * Advances the frame counter on the next animation frame.
 * Called automatically when any cached read is requested.
 * No-op in SSR environments where requestAnimationFrame is unavailable.
 */
const scheduleFrameAdvance = (): void => {
    if (frameScheduled) return
    if (typeof requestAnimationFrame === 'undefined') return
    frameScheduled = true
    requestAnimationFrame(() => {
        currentFrame += 1
        frameScheduled = false
    })
}

/**
 * Gets the bounding client rect for an element, using cached value if available
 * within the current animation frame.
 *
 * @param element - The element to measure
 * @returns The element's DOMRect (cached within frame)
 *
 * @example
 * ```typescript
 * // Multiple calls in the same frame return cached value
 * const rect1 = getCachedRect(element) // reads from DOM
 * const rect2 = getCachedRect(element) // returns cached
 * ```
 */
export const getCachedRect = (element: Element): DOMRect => {
    scheduleFrameAdvance()

    const cached = rectCache.get(element)
    if (cached && cached.frame === currentFrame) {
        return cached.rect
    }

    // Cache miss or stale; read from DOM
    const rect = element.getBoundingClientRect()
    rectCache.set(element, { rect, frame: currentFrame })
    return rect
}

/**
 * Gets just the height from the cached bounding rect.
 *
 * @param element - The element to measure
 * @returns The element's height in pixels
 *
 * @example
 * ```typescript
 * const height = getCachedHeight(element) // reads height from cached rect
 * ```
 */
export const getCachedHeight = (element: Element): number => {
    return getCachedRect(element).height
}

/**
 * Gets just the width from the cached bounding rect.
 *
 * @param element - The element to measure
 * @returns The element's width in pixels
 *
 * @example
 * ```typescript
 * const width = getCachedWidth(element) // reads width from cached rect
 * ```
 */
export const getCachedWidth = (element: Element): number => {
    return getCachedRect(element).width
}

/**
 * Invalidates the cache for a specific element.
 * Use when you know the element has changed and need fresh measurements.
 *
 * @param element - The element to invalidate
 * @returns void
 *
 * @example
 * ```typescript
 * invalidateRect(element) // next getCachedRect call will re-measure
 * ```
 */
export const invalidateRect = (element: Element): void => {
    rectCache.delete(element)
}

/**
 * Forces a frame advance, invalidating all cached rects.
 * Useful for testing or when forcing a measurement refresh.
 *
 * @returns {void}
 */
export const advanceFrame = (): void => {
    currentFrame += 1
}

/**
 * Gets the current frame number (for testing/debugging).
 *
 * @returns {number} The current frame counter value
 */
export const getCurrentFrame = (): number => currentFrame
