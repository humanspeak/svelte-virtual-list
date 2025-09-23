// Shared ResizeObserver mock for tests
export class ResizeObserverMock implements ResizeObserver {
    private callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
        this.callback = callback
        ;(globalThis as unknown as { __lastRO?: ResizeObserver }).__lastRO = this
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    emit(entries: ResizeObserverEntry[] = []): void {
        this.callback(entries, this)
    }
}

export default ResizeObserverMock
