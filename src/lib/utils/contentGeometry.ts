import { clampValue } from './virtualList.js'

/** Physical geometry, independent of orientation. Row estimates remain row-only. */
export const contentGeometry = (header: number, rows: number, footer: number, viewport: number) => {
    const total = header + rows + footer
    return {
        total,
        laidOut: Math.max(viewport, total),
        maxOffset: Math.max(0, total - viewport),
        footerOffset: header + rows
    }
}

/** Intersect the physical viewport with the row interval, in row coordinates. */
export const projectRowViewport = (
    offset: number,
    viewport: number,
    header: number,
    rows: number
) => {
    const start = clampValue(offset - header, 0, rows)
    const end = clampValue(offset + viewport - header, start, rows)
    return { start, size: end - start }
}

/** Carry fractional header drift instead of discarding each subpixel resize. */
export const accumulateResizeOffset = (
    offset: number,
    delta: number,
    remainder: number,
    maxOffset: number
) => {
    const ideal = clampValue(offset + delta + remainder, 0, maxOffset)
    const target = Math.round(ideal)
    return { target, remainder: ideal - target }
}
