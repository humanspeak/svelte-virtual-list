/**
 * Throttling utilities for performance optimization.
 *
 * @fileoverview Provides throttling functions to limit execution frequency of callbacks,
 * particularly useful for preventing excessive reactive effect triggers and debounced function calls.
 */

/**
 * Time provider abstraction that can be mocked in tests.
 * Uses performance.now() in production for high precision timing,
 * but can fallback to Date.now() for testing environments.
 */
export const timeProvider = {
    now: (): number => {
        // Use performance.now() for high precision in production
        if (typeof performance !== 'undefined' && performance.now) {
            return performance.now()
        }
        // Fallback to Date.now() (mainly for testing or older environments)
        return Date.now()
    }
}

/**
 * Creates a throttled version of a callback function that limits execution frequency.
 *
 * The throttled function will execute immediately on first call, then ignore subsequent
 * calls until the specified delay has elapsed. This is different from debouncing, which
 * delays execution until after calls stop coming.
 *
 * @template T - The type of the callback function
 * @param callback - The function to throttle
 * @param delay - Minimum time between executions in milliseconds (default: 16ms ≈ 60fps)
 * @returns A throttled version of the callback function
 *
 * @example
 * ```typescript
 * // Basic usage
 * const throttledLog = createThrottledCallback(
 *   (message: string) => console.log(message),
 *   100
 * );
 *
 * // Called immediately
 * throttledLog("First call");
 *
 * // Ignored (within 100ms)
 * throttledLog("Second call");
 *
 * // After 100ms, this would execute
 * setTimeout(() => throttledLog("Third call"), 150);
 * ```
 *
 * @example
 * ```typescript
 * // Throttling reactive effects in Svelte
 * const throttledUpdate = createThrottledCallback(() => {
 *   if (BROWSER && dirtyItemsCount > 0) {
 *     updateHeight();
 *   }
 * }, 16); // ~60fps
 *
 * $effect(() => {
 *   throttledUpdate();
 * });
 * ```
 */
export const createThrottledCallback = <T extends (..._args: unknown[]) => void>(
    callback: T,
    delay = 16 // ~60fps default for smooth UI updates
): T => {
    let lastExecutionTime = 0
    let isFirstCall = true

    return ((...args: Parameters<T>) => {
        const now = timeProvider.now()
        if (isFirstCall || now - lastExecutionTime >= delay) {
            isFirstCall = false
            lastExecutionTime = now
            callback(...args)
        }
    }) as T
}

/**
 * Creates a throttled callback with leading and trailing execution options.
 *
 * Unlike the basic throttle, this version allows control over whether the function
 * executes on the leading edge (immediately) and/or trailing edge (after delay).
 *
 * @template T - The type of the callback function
 * @param callback - The function to throttle
 * @param delay - Minimum time between executions in milliseconds
 * @param options - Configuration options
 * @param options.leading - Execute on the leading edge (default: true)
 * @param options.trailing - Execute on the trailing edge (default: false)
 * @returns A throttled version of the callback function
 *
 * @example
 * ```typescript
 * // Execute immediately and after delay
 * const throttledWithTrailing = createAdvancedThrottledCallback(
 *   () => console.log("Throttled call"),
 *   100,
 *   { leading: true, trailing: true }
 * );
 * ```
 */
export const createAdvancedThrottledCallback = <T extends (..._args: unknown[]) => void>(
    callback: T,
    delay: number,
    options: { leading?: boolean; trailing?: boolean } = {}
): T => {
    const { leading = true, trailing = false } = options
    let lastExecutionTime = 0
    let trailingTimeoutId: ReturnType<typeof setTimeout> | null = null
    let lastArgs: Parameters<T> | null = null
    let isFirstCall = true

    const execute = (args: Parameters<T>) => {
        lastExecutionTime = timeProvider.now()
        callback(...args)
    }

    return ((...args: Parameters<T>) => {
        const now = timeProvider.now()
        const timeSinceLastExecution = isFirstCall ? delay : now - lastExecutionTime

        lastArgs = args

        // Clear any pending trailing execution
        if (trailingTimeoutId) {
            clearTimeout(trailingTimeoutId)
            trailingTimeoutId = null
        }

        if (timeSinceLastExecution >= delay) {
            // Can execute immediately
            if (leading) {
                isFirstCall = false
                execute(args)
            }

            // Schedule trailing if needed
            if (trailing && !leading) {
                trailingTimeoutId = setTimeout(() => {
                    if (lastArgs) {
                        execute(lastArgs)
                    }
                    trailingTimeoutId = null
                }, delay)
            }
        } else {
            // Still within throttle window, but handle first call
            if (isFirstCall && leading) {
                isFirstCall = false
                execute(args)
            } else if (trailing) {
                const remainingTime = delay - timeSinceLastExecution
                trailingTimeoutId = setTimeout(() => {
                    if (lastArgs) {
                        execute(lastArgs)
                    }
                    trailingTimeoutId = null
                }, remainingTime)
            }
        }
    }) as T
}

/**
 * Type definitions for throttle utilities
 */
export type ThrottledCallback<T extends (..._args: unknown[]) => void> = T
export type ThrottleOptions = {
    leading?: boolean
    trailing?: boolean
}
