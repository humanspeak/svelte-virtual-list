/**
 * Viewport-coverage math shared by the issue fixtures (413, 416, …).
 *
 * The fixtures assert "rendered items fully cover the viewport" by measuring
 * the unfilled vertical px — this is the number their Playwright specs
 * enforce, so the interval-union core lives here once instead of drifting
 * across per-fixture copies. Fixtures keep their own DOM snapshotting and
 * pass plain rects in.
 */

export interface VerticalRect {
    top: number
    bottom: number
}

/**
 * Unfilled vertical px of a viewport: its height minus the union of the
 * given rects clipped to it. 0 means fully covered.
 */
export const uncoveredPx = (viewport: VerticalRect, rects: Iterable<VerticalRect>): number => {
    const intervals: Array<[number, number]> = []
    for (const rect of rects) {
        const top = Math.max(rect.top, viewport.top)
        const bottom = Math.min(rect.bottom, viewport.bottom)
        if (bottom > top) intervals.push([top, bottom])
    }
    intervals.sort((a, b) => a[0] - b[0])

    let covered = 0
    let cursor = viewport.top
    for (const [top, bottom] of intervals) {
        const start = Math.max(top, cursor)
        if (bottom > start) {
            covered += bottom - start
            cursor = bottom
        }
    }
    return Math.max(0, Math.round(viewport.bottom - viewport.top - covered))
}
