// RecomputeScheduler
// -------------------
// Coalesces recompute requests to the next animation frame in the browser.
// Falls back to setTimeout(0) in non-browser/jsdom to preserve deterministic tests.
// Supports temporary blocking to delay recomputation during critical sections.
export class RecomputeScheduler {
    private onRecompute: () => void
    private isScheduled: boolean = false
    private isPending: boolean = false
    private blockDepth: number = 0
    private timeoutId: ReturnType<typeof setTimeout> | null = null
    private rafId: number | null = null

    constructor(onRecompute: () => void) {
        this.onRecompute = onRecompute
    }

    // Request a recompute. If blocked, mark as pending; otherwise schedule for next frame.
    schedule = (): void => {
        if (this.blockDepth > 0) {
            this.isPending = true
            return
        }
        if (this.isScheduled) return
        this.isScheduled = true
        // In jsdom or non-browser, fall back to immediate execution for determinism
        const isBrowser =
            typeof window !== 'undefined' && typeof requestAnimationFrame === 'function'
        if (!isBrowser) {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId)
                this.timeoutId = null
            }
            this.timeoutId = setTimeout(() => {
                this.timeoutId = null
                this.isScheduled = false
                this.onRecompute()
            }, 0)
            return
        }
        // Browser path: coalesce with RAF for visual stability across instances
        if (this.rafId !== null) cancelAnimationFrame(this.rafId)
        this.rafId = requestAnimationFrame(() => {
            this.rafId = null
            this.isScheduled = false
            this.onRecompute()
        })
    }

    // Temporarily block recomputes; any in-flight timers are canceled and a recompute is marked pending.
    block = (): void => {
        this.blockDepth += 1
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
            this.isScheduled = false
            this.isPending = true
        }
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
            this.isScheduled = false
            this.isPending = true
        }
    }

    // Unblock and run recompute immediately if one was pending.
    unblock = (): void => {
        if (this.blockDepth === 0) return
        this.blockDepth -= 1
        if (this.blockDepth === 0 && this.isPending) {
            this.isPending = false
            this.onRecompute()
        }
    }

    // Cancel any scheduled recompute and clear pending state.
    cancel = (): void => {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
        }
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
        }
        this.isScheduled = false
        this.isPending = false
    }
}
