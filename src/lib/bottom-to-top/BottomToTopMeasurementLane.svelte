<script lang="ts" generics="TItem = unknown">
    import type { Snippet } from 'svelte'
    import { onMount, tick } from 'svelte'
    import type { BottomToTopMeasurementTask } from './BottomToTopController.js'

    let {
        tasks,
        renderItem,
        onMeasure
    }: {
        tasks: Array<BottomToTopMeasurementTask<TItem>>
        renderItem: Snippet<[item: TItem, index: number]>
        onMeasure: (physicalIndex: number, height: number) => void
    } = $props()

    let resizeObserver: ResizeObserver | null = null

    const stripConflictingAttributes = (node: HTMLElement) => {
        node.removeAttribute('data-testid')
        node.removeAttribute('id')
        const descendants = node.querySelectorAll('[data-testid], [id]')
        for (const descendant of descendants) {
            descendant.removeAttribute('data-testid')
            descendant.removeAttribute('id')
        }
    }

    const observeMeasurementItem = (node: HTMLElement) => {
        void tick().then(() => {
            stripConflictingAttributes(node)
            resizeObserver?.observe(node)
            const height = node.getBoundingClientRect().height
            const physicalIndex = Number.parseInt(node.dataset.measurePhysicalIndex || '-1', 10)
            if (Number.isFinite(height) && height > 0 && physicalIndex >= 0) {
                onMeasure(physicalIndex, height)
            }
        })

        return {
            destroy() {
                resizeObserver?.unobserve(node)
            }
        }
    }

    onMount(() => {
        resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const node = entry.target as HTMLElement
                stripConflictingAttributes(node)
                const physicalIndex = Number.parseInt(node.dataset.measurePhysicalIndex || '-1', 10)
                const height = node.getBoundingClientRect().height
                if (physicalIndex >= 0 && Number.isFinite(height) && height > 0) {
                    onMeasure(physicalIndex, height)
                }
            }
        })

        return () => {
            resizeObserver?.disconnect()
        }
    })
</script>

<div class="bottom-to-top-measurement-lane" aria-hidden="true">
    {#each tasks as task (task.key)}
        <div
            class="bottom-to-top-measurement-item"
            use:observeMeasurementItem
            data-measure-physical-index={task.physicalIndex}
        >
            {@render renderItem(task.item, task.logicalIndex)}
        </div>
    {/each}
</div>

<style>
    .bottom-to-top-measurement-lane {
        position: absolute;
        left: 0;
        top: -100000px;
        width: 100%;
        visibility: hidden;
        pointer-events: none;
        contain: layout style paint;
        overflow: hidden;
    }

    .bottom-to-top-measurement-item {
        width: 100%;
        display: block;
    }
</style>
