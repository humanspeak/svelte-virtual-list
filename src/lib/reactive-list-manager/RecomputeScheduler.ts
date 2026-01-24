/**
 * Scheduler that coalesces recompute requests to the next animation frame.
 *
 * This class provides efficient batching of recompute operations by scheduling
 * them to run on the next animation frame in browser environments. In non-browser
 * or jsdom environments, it falls back to setTimeout(0) for deterministic testing.
 *
 * Key features:
 * - Coalesces multiple schedule() calls into a single recompute
 * - Supports temporary blocking during critical sections
 * - Handles nested block/unblock calls with depth tracking
 * - Environment-aware: uses RAF in browsers, setTimeout in tests
 *
 * @example
 * ```typescript
 * const scheduler = new RecomputeScheduler(() => {
 *     console.log('Recomputing derived state');
 * });
 *
 * // Multiple calls within the same frame are coalesced
 * scheduler.schedule();
 * scheduler.schedule();
 * scheduler.schedule(); // Only one recompute will run
 *
 * // Block during critical sections
 * scheduler.block();
 * scheduler.schedule(); // Marked as pending, won't run yet
 * scheduler.unblock();  // Runs immediately if pending
 * ```
 *
 * @class
 */
export class RecomputeScheduler {
    /** Callback function to execute on recompute. */
    private onRecompute: () => void
    /** Whether a recompute is currently scheduled. */
    private isScheduled: boolean = false
    /** Whether a recompute is pending due to blocking. */
    private isPending: boolean = false
    /** Current nesting depth of block() calls. */
    private blockDepth: number = 0
    /** ID of the pending setTimeout (non-browser fallback). */
    private timeoutId: ReturnType<typeof setTimeout> | null = null
    /** ID of the pending requestAnimationFrame. */
    private rafId: number | null = null

    /**
     * Creates a new RecomputeScheduler instance.
     *
     * @param {() => void} onRecompute - Callback function to execute when recompute runs.
     */
    constructor(onRecompute: () => void) {
        this.onRecompute = onRecompute
    }

    /**
     * Schedules a recompute for the next animation frame.
     *
     * If the scheduler is blocked, the request is marked as pending and will
     * execute when unblocked. Multiple calls while a recompute is already
     * scheduled are coalesced into a single execution.
     *
     * @returns {void}
     */
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

    /**
     * Temporarily blocks recompute execution.
     *
     * Cancels any in-flight timers and marks any pending recompute request.
     * Block calls can be nested; the scheduler remains blocked until all
     * corresponding unblock() calls are made.
     *
     * @returns {void}
     */
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

    /**
     * Unblocks the scheduler and runs pending recompute if any.
     *
     * Decrements the block depth counter. When the depth reaches zero and
     * a recompute was pending, it executes immediately (synchronously).
     * Guards against underflow if unblock is called without matching block.
     *
     * @returns {void}
     */
    unblock = (): void => {
        if (this.blockDepth === 0) return
        this.blockDepth -= 1
        if (this.blockDepth === 0 && this.isPending) {
            this.isPending = false
            this.onRecompute()
        }
    }

    /**
     * Cancels any scheduled or pending recompute.
     *
     * Clears all timers (setTimeout and RAF) and resets the scheduled
     * and pending flags. Does not affect the block depth.
     *
     * @returns {void}
     */
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
