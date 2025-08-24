export declare class ResizeObserverMock implements ResizeObserver {
    private callback
    constructor(callback: ResizeObserverCallback)
    observe(): void
    unobserve(): void
    disconnect(): void
    emit(entries?: ResizeObserverEntry[]): void
}
export default ResizeObserverMock
