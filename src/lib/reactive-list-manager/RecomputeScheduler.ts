export class RecomputeScheduler {
    private onRecompute: () => void
    private isScheduled: boolean = false
    private isPending: boolean = false
    private blockDepth: number = 0
    private timeoutId: ReturnType<typeof setTimeout> | null = null

    constructor(onRecompute: () => void) {
        this.onRecompute = onRecompute
    }

    schedule = (): void => {
        if (this.blockDepth > 0) {
            this.isPending = true
            return
        }
        if (this.isScheduled) return
        this.isScheduled = true
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
        }
        this.timeoutId = setTimeout(() => {
            this.timeoutId = null
            this.isScheduled = false
            this.onRecompute()
        }, 0)
    }

    block = (): void => {
        this.blockDepth += 1
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
            this.isScheduled = false
            this.isPending = true
        }
    }

    unblock = (): void => {
        if (this.blockDepth === 0) return
        this.blockDepth -= 1
        if (this.blockDepth === 0 && this.isPending) {
            this.isPending = false
            this.onRecompute()
        }
    }

    cancel = (): void => {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
        }
        this.isScheduled = false
        this.isPending = false
    }
}
