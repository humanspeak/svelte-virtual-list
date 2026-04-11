<script lang="ts" generics="TItem = unknown">
    import { tick, type Snippet } from 'svelte'
    import type { BottomToTopMeasurementTask } from './BottomToTopController.js'

    let {
        tasks,
        renderItem,
        onMeasure
    }: {
        tasks: Array<BottomToTopMeasurementTask<TItem>>
        renderItem: Snippet<[item: TItem, index: number]>
        onMeasure: (_physicalIndex: number, _height: number) => void
    } = $props()

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
        let cancelled = false

        const measure = (attempt = 0) => {
            if (cancelled) return
            stripConflictingAttributes(node)
            const height = node.getBoundingClientRect().height
            const physicalIndex = Number.parseInt(node.dataset.measurePhysicalIndex || '-1', 10)
            if (Number.isFinite(height) && height > 0 && physicalIndex >= 0) {
                onMeasure(physicalIndex, height)
                return
            }

            if (attempt < 2) {
                requestAnimationFrame(() => measure(attempt + 1))
            }
        }

        void tick().then(() => {
            requestAnimationFrame(() => measure())
        })

        return {
            destroy() {
                cancelled = true
            }
        }
    }
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
