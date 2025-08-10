<script lang="ts">
    import { untrack } from 'svelte'
    import { ReactiveListManager } from '$lib/index.js'
    import type { HeightChange, ListManagerConfig } from '../types.js'

    interface Props {
        config: ListManagerConfig
        onReactiveUpdate?: (data: {
            totalHeight: number
            measuredCount: number
            effectRuns: number
        }) => void
    }

    let { config, onReactiveUpdate }: Props = $props()

    // Create the manager
    const manager = new ReactiveListManager(config)

    // Derived reactive values (clean, no side effects)
    let currentTotalHeight = $derived(manager.totalHeight)
    let currentMeasuredCount = $derived(manager.measuredCount)

    // Effect run counter (non-reactive - just for tracking)
    let effectRunCount = 0

    // Reactive counter for DOM display (separate from effect logic)
    let displayEffectRuns = $state(0)

    // Simple effect that just notifies - no state modification
    $effect(() => {
        // Read the current values (triggers when manager changes)
        const totalHeight = manager.totalHeight
        const measuredCount = manager.measuredCount

        // Increment counters
        effectRunCount++
        displayEffectRuns = effectRunCount // Update reactive display

        // Notify parent with fresh values each time
        onReactiveUpdate?.({
            totalHeight,
            measuredCount,
            effectRuns: effectRunCount
        })
    })

    // Export methods for testing
    export function processDirtyHeights(changes: HeightChange[]) {
        manager.processDirtyHeights(changes)
    }

    export function updateItemLength(newLength: number) {
        manager.updateItemLength(newLength)
    }

    export function setItemHeight(height: number) {
        manager.itemHeight = height
    }

    export function getReactiveData() {
        return {
            totalHeight: currentTotalHeight,
            measuredCount: currentMeasuredCount,
            effectRuns: displayEffectRuns
        }
    }

    export function getManager() {
        return manager
    }
</script>

<div data-testid="reactive-test-component">
    <div data-testid="total-height">{currentTotalHeight}</div>
    <div data-testid="measured-count">{currentMeasuredCount}</div>
    <div data-testid="effect-runs">{displayEffectRuns}</div>
</div>
