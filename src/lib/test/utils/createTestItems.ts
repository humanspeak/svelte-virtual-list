import type { Item } from '../types/item.js'

export type { Item } from '../types/item.js'
export type ItemWithHeight = Item & { height: number }

export const createTestItems = (count: number): Item[] =>
    Array.from({ length: count }, (_, i) => ({ id: i, text: `Item ${i}` }))

export const createTestItemsWithHeight = (
    count: number,
    heights: number[] | ((_i: number) => number)
): ItemWithHeight[] =>
    Array.from({ length: count }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        height: Array.isArray(heights) ? heights[i % heights.length] : heights(i)
    }))
