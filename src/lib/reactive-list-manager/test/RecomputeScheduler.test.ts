import { describe, expect, it, vi } from 'vitest'
import { RecomputeScheduler } from '../RecomputeScheduler.js'

describe('RecomputeScheduler', () => {
    it('coalesces multiple schedule calls into one recompute', async () => {
        const cb = vi.fn()
        const s = new RecomputeScheduler(cb)
        s.schedule()
        s.schedule()
        s.schedule()
        vi.runAllTimers()
        expect(cb).toHaveBeenCalledTimes(1)
    })

    it('defers recompute while blocked and runs once on unblock', async () => {
        const cb = vi.fn()
        const s = new RecomputeScheduler(cb)
        s.block()
        s.schedule()
        s.schedule()
        vi.runAllTimers()
        expect(cb).not.toHaveBeenCalled()
        s.unblock()
        expect(cb).toHaveBeenCalledTimes(1)
    })

    it('nested blocks require equal unblocks before recompute', async () => {
        const cb = vi.fn()
        const s = new RecomputeScheduler(cb)
        s.block()
        s.block()
        s.schedule()
        vi.runAllTimers()
        expect(cb).not.toHaveBeenCalled()
        s.unblock()
        expect(cb).not.toHaveBeenCalled()
        s.unblock()
        expect(cb).toHaveBeenCalledTimes(1)
    })

    it('cancel clears scheduled and pending recomputes', async () => {
        const cb = vi.fn()
        const s = new RecomputeScheduler(cb)
        s.schedule()
        s.cancel()
        vi.runAllTimers()
        expect(cb).not.toHaveBeenCalled()
        s.block()
        s.schedule()
        s.cancel()
        s.unblock()
        expect(cb).not.toHaveBeenCalled()
    })
})
