import { describe, expect, it } from 'vitest'
import { calculateScrollTarget } from './scrollCalculation.js'
import { buildBlockSums, calculateTransformY, calculateVisibleRange } from './virtualList.js'

const TOTAL = 100_000
const HEIGHT = 40

const makeCountingCache = () => {
    const cache: Record<number, number> = {}
    for (let i = 0; i < TOTAL; i++) cache[i] = HEIGHT
    let reads = 0
    const proxy = new Proxy(cache, {
        get(target, prop, receiver) {
            reads += 1
            return Reflect.get(target, prop, receiver)
        }
    })
    return { proxy, readCount: () => reads }
}

describe('offset/range math read budgets (PERF-01/PERF-02)', () => {
    it('calculateVisibleRange near the end of 100k items stays within budget', () => {
        const { proxy, readCount } = makeCountingCache()
        const blockSums = buildBlockSums(proxy, HEIGHT, TOTAL)
        const after = readCount() // buildBlockSums legitimately reads everything once
        calculateVisibleRange({
            scrollTop: TOTAL * HEIGHT - 10_000,
            viewportHeight: 400,
            itemHeight: HEIGHT,
            totalItems: TOTAL,
            bufferSize: 20,
            totalContentHeight: TOTAL * HEIGHT,
            heightCache: proxy,
            blockSums
        })
        expect(readCount() - after).toBeLessThan(5_000)
    })

    it('calculateTransformY near the end of 100k items stays within budget', () => {
        const { proxy, readCount } = makeCountingCache()
        const blockSums = buildBlockSums(proxy, HEIGHT, TOTAL)
        const after = readCount()
        calculateTransformY(TOTAL, 90_000, HEIGHT, proxy, blockSums)
        expect(readCount() - after).toBeLessThan(5_000)
    })

    it('calculateScrollTarget near the end of 100k items stays within budget', () => {
        const { proxy, readCount } = makeCountingCache()
        const blockSums = buildBlockSums(proxy, HEIGHT, TOTAL)
        const after = readCount()
        calculateScrollTarget({
            align: 'top',
            targetIndex: 90_000,
            itemsLength: TOTAL,
            calculatedItemHeight: HEIGHT,
            height: 400,
            scrollTop: 0,
            firstVisibleIndex: 0,
            lastVisibleIndex: 10,
            heightCache: proxy,
            blockSums
        })
        expect(readCount() - after).toBeLessThan(5_000)
    })
})
