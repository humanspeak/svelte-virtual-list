import { calculateVisibleRange, getScrollOffsetForIndex } from '$lib/utils/virtualList.js'

export interface BottomToTopWindow {
    startPhysical: number
    endPhysical: number
}

export interface BottomToTopAnchor {
    physicalIndex: number
    offset: number
}

export interface BottomToTopMeasurementTask<TItem = unknown> {
    key: string
    physicalIndex: number
    logicalIndex: number
    item: TItem
}

export const buildBottomToTopEstimatedTailWindow = ({
    totalItems,
    estimatedItemHeight,
    viewportHeight,
    overscan
}: {
    totalItems: number
    estimatedItemHeight: number
    viewportHeight: number
    overscan: number
}): BottomToTopWindow => {
    if (totalItems <= 0) return { startPhysical: 0, endPhysical: 0 }

    const effectiveViewportHeight = viewportHeight > 0 ? viewportHeight : 400
    const estimatedVisibleCount = Math.ceil(effectiveViewportHeight / estimatedItemHeight) + 1
    const tailCount = Math.min(totalItems, estimatedVisibleCount + overscan * 2)

    return {
        startPhysical: Math.max(0, totalItems - tailCount),
        endPhysical: totalItems
    }
}

export const calculateBottomToTopPhysicalWindow = ({
    scrollTop,
    viewportHeight,
    itemHeight,
    totalItems,
    bufferSize,
    totalContentHeight,
    heightCache,
    blockSums
}: {
    scrollTop: number
    viewportHeight: number
    itemHeight: number
    totalItems: number
    bufferSize: number
    totalContentHeight: number
    heightCache: Record<number, number>
    blockSums: number[]
}): BottomToTopWindow => {
    const range = calculateVisibleRange({
        scrollTop,
        viewportHeight,
        itemHeight,
        totalItems,
        bufferSize,
        mode: 'topToBottom',
        totalContentHeight,
        heightCache,
        blockSums
    })

    return {
        startPhysical: range.start,
        endPhysical: range.end
    }
}

export const calculateBottomToTopSpacers = ({
    window,
    heightCache,
    itemHeight,
    totalItems,
    totalHeight,
    blockSums
}: {
    window: BottomToTopWindow
    heightCache: Record<number, number>
    itemHeight: number
    totalItems: number
    totalHeight: number
    blockSums: number[]
}) => {
    const topSpacer = getScrollOffsetForIndex(
        heightCache,
        itemHeight,
        window.startPhysical,
        blockSums
    )
    const bottomOffset = getScrollOffsetForIndex(
        heightCache,
        itemHeight,
        window.endPhysical,
        blockSums
    )

    return {
        topSpacer: Math.max(0, Math.round(topSpacer)),
        bottomSpacer: Math.max(0, Math.round(totalHeight - bottomOffset))
    }
}

export const buildBottomToTopMeasurementTasks = <TItem>({
    indices,
    items,
    getLogicalIndexFromPhysical
}: {
    indices: number[]
    items: TItem[]
    getLogicalIndexFromPhysical: (physicalIndex: number) => number
}): Array<BottomToTopMeasurementTask<TItem>> => {
    const tasks: Array<BottomToTopMeasurementTask<TItem>> = []
    const seen = new Set<number>()

    for (const physicalIndex of indices) {
        if (physicalIndex < 0 || physicalIndex >= items.length || seen.has(physicalIndex)) continue
        seen.add(physicalIndex)
        const logicalIndex = getLogicalIndexFromPhysical(physicalIndex)
        tasks.push({
            key: `measure-${physicalIndex}`,
            physicalIndex,
            logicalIndex,
            item: items[logicalIndex]
        })
    }

    return tasks
}

export const buildBottomToTopBackfillIndices = ({
    window,
    totalItems,
    measuredIndices,
    limit
}: {
    window: BottomToTopWindow
    totalItems: number
    measuredIndices: Set<number>
    limit: number
}): number[] => {
    const indices: number[] = []

    for (
        let physicalIndex = window.startPhysical - 1;
        physicalIndex >= 0 && indices.length < limit;
        physicalIndex -= 1
    ) {
        if (measuredIndices.has(physicalIndex)) continue
        indices.push(physicalIndex)
    }

    for (
        let physicalIndex = window.endPhysical;
        physicalIndex < totalItems && indices.length < limit;
        physicalIndex += 1
    ) {
        if (measuredIndices.has(physicalIndex)) continue
        indices.push(physicalIndex)
    }

    return indices
}
