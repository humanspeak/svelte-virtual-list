export type BottomToTopMutationKind =
    | 'none'
    | 'prependLogicalStart'
    | 'appendLogicalEnd'
    | 'removeLogicalStart'
    | 'removeLogicalEnd'
    | 'replace'

export interface BottomToTopMutation {
    kind: BottomToTopMutationKind
    delta: number
}

export const getPhysicalIndexFromLogical = (logicalIndex: number, totalItems: number): number =>
    Math.max(0, totalItems - 1 - logicalIndex)

export const getLogicalIndexFromPhysical = (physicalIndex: number, totalItems: number): number =>
    Math.max(0, totalItems - 1 - physicalIndex)

export const mapPhysicalWindowToLogicalRange = (
    startPhysical: number,
    endPhysical: number,
    totalItems: number
) => ({
    start: Math.max(0, totalItems - endPhysical),
    end: Math.max(0, totalItems - startPhysical)
})

const matchesLogicalPrepend = <TItem>(previous: TItem[], next: TItem[], delta: number): boolean => {
    if (delta <= 0 || previous.length + delta !== next.length) return false
    for (let index = 0; index < previous.length; index += 1) {
        if (previous[index] !== next[index + delta]) return false
    }
    return true
}

const matchesLogicalAppend = <TItem>(previous: TItem[], next: TItem[], delta: number): boolean => {
    if (delta <= 0 || previous.length + delta !== next.length) return false
    for (let index = 0; index < previous.length; index += 1) {
        if (previous[index] !== next[index]) return false
    }
    return true
}

export const detectBottomToTopMutation = <TItem>(
    previous: TItem[],
    next: TItem[]
): BottomToTopMutation => {
    if (previous.length === next.length) {
        return { kind: 'none', delta: 0 }
    }

    const delta = next.length - previous.length

    if (delta > 0) {
        if (matchesLogicalPrepend(previous, next, delta)) {
            return { kind: 'prependLogicalStart', delta }
        }
        if (matchesLogicalAppend(previous, next, delta)) {
            return { kind: 'appendLogicalEnd', delta }
        }
        return { kind: 'replace', delta }
    }

    const removedCount = Math.abs(delta)
    if (matchesLogicalPrepend(next, previous, removedCount)) {
        return { kind: 'removeLogicalStart', delta: removedCount }
    }
    if (matchesLogicalAppend(next, previous, removedCount)) {
        return { kind: 'removeLogicalEnd', delta: removedCount }
    }

    return { kind: 'replace', delta: removedCount }
}

export const remapPhysicalMeasurementsForMutation = (
    heightCache: Readonly<Record<number, number>>,
    nextLength: number,
    mutation: BottomToTopMutation
): Record<number, number> => {
    if (mutation.kind === 'none') {
        return { ...heightCache }
    }

    if (mutation.kind === 'replace') {
        return {}
    }

    const remapped: Record<number, number> = {}
    const delta = mutation.delta

    for (const [key, value] of Object.entries(heightCache)) {
        const oldPhysicalIndex = Number.parseInt(key, 10)
        if (!Number.isFinite(oldPhysicalIndex)) continue

        let nextPhysicalIndex = oldPhysicalIndex

        if (mutation.kind === 'appendLogicalEnd') {
            nextPhysicalIndex = oldPhysicalIndex + delta
        } else if (mutation.kind === 'removeLogicalEnd') {
            if (oldPhysicalIndex < delta) continue
            nextPhysicalIndex = oldPhysicalIndex - delta
        } else if (mutation.kind === 'removeLogicalStart') {
            if (oldPhysicalIndex >= nextLength) continue
        }

        if (nextPhysicalIndex < 0 || nextPhysicalIndex >= nextLength) continue
        remapped[nextPhysicalIndex] = value
    }

    return remapped
}
