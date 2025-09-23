export declare class ResizeObserverMock implements ResizeObserver {
    private callback
    /* trunk-ignore(eslint/no-unused-vars) */
    constructor(callback: ResizeObserverCallback)
    observe(): void
    unobserve(): void
    disconnect(): void
    /* trunk-ignore(eslint/no-unused-vars) */
    emit(entries?: ResizeObserverEntry[]): void
}
export default ResizeObserverMock
