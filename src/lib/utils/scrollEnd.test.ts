import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { waitForScrollEnd } from './scrollEnd.js'

type FakeViewport = HTMLElement & {
    dispatch: (type: string) => void
    listenerCount: (type: string) => number
}

describe('waitForScrollEnd', () => {
    let rafQueue: FrameRequestCallback[]
    let onscrollendDescriptor: PropertyDescriptor | undefined

    const flushFrames = (count = 1) => {
        for (let i = 0; i < count; i++) {
            const queued = rafQueue
            rafQueue = []
            queued.forEach((cb) => cb(0))
        }
    }

    const createViewport = (scrollTop = 0): FakeViewport => {
        const listeners: Record<string, Set<EventListener>> = {}
        return {
            scrollTop,
            addEventListener: vi.fn((type: string, cb: EventListener) => {
                ;(listeners[type] ??= new Set()).add(cb)
            }),
            removeEventListener: vi.fn((type: string, cb: EventListener) => {
                listeners[type]?.delete(cb)
            }),
            dispatch: (type: string) => {
                listeners[type]?.forEach((cb) => cb(new Event(type)))
            },
            listenerCount: (type: string) => listeners[type]?.size ?? 0
        } as unknown as FakeViewport
    }

    const setScrollendSupport = (supported: boolean) => {
        if (supported) {
            Object.defineProperty(window, 'onscrollend', {
                value: null,
                configurable: true,
                writable: true
            })
        } else {
            delete (window as unknown as Record<string, unknown>).onscrollend
        }
    }

    beforeEach(() => {
        vi.useFakeTimers()
        rafQueue = []
        onscrollendDescriptor = Object.getOwnPropertyDescriptor(window, 'onscrollend')
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            rafQueue.push(cb)
            return rafQueue.length
        })
        vi.stubGlobal('cancelAnimationFrame', vi.fn())
    })

    afterEach(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        // Restore the original onscrollend descriptor between tests.
        delete (window as unknown as Record<string, unknown>).onscrollend
        if (onscrollendDescriptor) {
            Object.defineProperty(window, 'onscrollend', onscrollendDescriptor)
        }
    })

    it('resolves on the next frame for an instant scroll', async () => {
        const viewport = createViewport(0)
        let resolved = false
        const promise = waitForScrollEnd(viewport, 100, false).then(() => {
            resolved = true
        })

        expect(resolved).toBe(false)
        flushFrames(1)
        await promise
        expect(resolved).toBe(true)
        // No scrollend listener should be attached for an instant scroll.
        expect(viewport.addEventListener).not.toHaveBeenCalled()
    })

    it('treats a smooth no-op (already at target) as instant', async () => {
        setScrollendSupport(true)
        const viewport = createViewport(100)
        let resolved = false
        const promise = waitForScrollEnd(viewport, 100, true).then(() => {
            resolved = true
        })

        flushFrames(1)
        await promise
        expect(resolved).toBe(true)
        expect(viewport.addEventListener).not.toHaveBeenCalledWith(
            'scrollend',
            expect.any(Function),
            expect.anything()
        )
    })

    it('resolves on the scrollend event when supported', async () => {
        setScrollendSupport(true)
        const viewport = createViewport(0)
        let resolved = false
        const promise = waitForScrollEnd(viewport, 100, true).then(() => {
            resolved = true
        })

        expect(viewport.addEventListener).toHaveBeenCalledWith('scrollend', expect.any(Function), {
            once: true
        })
        expect(resolved).toBe(false)

        viewport.dispatch('scrollend')
        await promise
        expect(resolved).toBe(true)
        expect(viewport.removeEventListener).toHaveBeenCalledWith('scrollend', expect.any(Function))
    })

    it('polls until scrollTop reaches the target when scrollend is unsupported', async () => {
        setScrollendSupport(false)
        const viewport = createViewport(0)
        let resolved = false
        const promise = waitForScrollEnd(viewport, 100, true).then(() => {
            resolved = true
        })

        viewport.scrollTop = 50
        flushFrames(1)
        expect(resolved).toBe(false)

        viewport.scrollTop = 100
        flushFrames(1)
        await promise
        expect(resolved).toBe(true)
    })

    it('polls until scrollTop stabilizes when the target is unreachable', async () => {
        setScrollendSupport(false)
        const viewport = createViewport(0)
        let resolved = false
        const promise = waitForScrollEnd(viewport, 1000, true).then(() => {
            resolved = true
        })

        // Moves, then stalls below the target (e.g. clamped to DOM max).
        viewport.scrollTop = 300
        flushFrames(1)
        viewport.scrollTop = 500
        flushFrames(1)
        // Now stable for several frames at 500 (never reaches 1000).
        flushFrames(1)
        expect(resolved).toBe(false)
        flushFrames(1)
        flushFrames(1)
        await promise
        expect(resolved).toBe(true)
    })

    it('resolves via the safety timeout if no settle signal arrives', async () => {
        setScrollendSupport(true)
        const viewport = createViewport(0)
        let resolved = false
        const promise = waitForScrollEnd(viewport, 100, true).then(() => {
            resolved = true
        })

        expect(resolved).toBe(false)
        await vi.advanceTimersByTimeAsync(1200)
        await promise
        expect(resolved).toBe(true)
    })

    it('resolves immediately when the signal is already aborted', async () => {
        const viewport = createViewport(0)
        const controller = new AbortController()
        controller.abort()

        await expect(
            waitForScrollEnd(viewport, 100, true, controller.signal)
        ).resolves.toBeUndefined()
        expect(viewport.addEventListener).not.toHaveBeenCalled()
    })

    it('resolves and cleans up when the signal is aborted mid-flight', async () => {
        setScrollendSupport(true)
        const viewport = createViewport(0)
        const controller = new AbortController()
        let resolved = false
        const promise = waitForScrollEnd(viewport, 100, true, controller.signal).then(() => {
            resolved = true
        })

        expect(resolved).toBe(false)
        controller.abort()
        await promise
        expect(resolved).toBe(true)
        expect(viewport.removeEventListener).toHaveBeenCalledWith('scrollend', expect.any(Function))
    })
})
