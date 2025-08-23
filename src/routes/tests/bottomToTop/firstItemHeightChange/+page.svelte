<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'
    import { page } from '$app/state'

    // Parse URL parameters for height changes (supports sequences)
    let heightChanges: Record<number, number[]> = { 1: [100] }
    try {
        const params = page.url.searchParams
        let hasParams = false

        // Support legacy format: ?changeHeight=100
        const changeHeightParam = params.get('changeHeight')
        if (changeHeightParam) {
            heightChanges = { 1: [parseInt(changeHeightParam)] }
            hasParams = true
        }

        // Support sequences: ?height0=80,90&height1=100,150,50&height2=120
        for (const [key, value] of params.entries()) {
            if (key.startsWith('height')) {
                if (!hasParams) {
                    heightChanges = {} // Clear defaults only when we have height params
                    hasParams = true
                }
                const index = parseInt(key.replace('height', ''))
                const heights = value
                    .split(',')
                    .map((h) => parseInt(h))
                    .filter((h) => !isNaN(h))
                if (!isNaN(index) && heights.length > 0) {
                    heightChanges[index] = heights
                }
            }
        }
    } catch {
        heightChanges = { 1: [100] } // Default fallback
    }

    const items: { id: number; text: string; height: number }[] = $state([
        ...Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            text: `Item ${i}`,
            height: 20
        }))
    ])
    let virtualList: SvelteVirtualList<{ id: number; text: string; height: number }> | null =
        $state(null)

    let timeoutIndex = 0
    const interval = setInterval(() => {
        let shouldContinue = false

        // Apply height changes for current timeoutIndex
        for (const [index, heightArray] of Object.entries(heightChanges)) {
            const idx = parseInt(index)
            if (idx >= 0 && idx < items.length && timeoutIndex < heightArray.length) {
                items[idx].height = heightArray[timeoutIndex]

                // If there are more heights to apply for ANY item, continue
                if (timeoutIndex < heightArray.length - 1) {
                    shouldContinue = true
                }
            }
        }

        if (!shouldContinue) {
            clearInterval(interval)
        }
        timeoutIndex++
    }, 1000 * 1)
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList
        defaultEstimatedItemHeight={22}
        bind:this={virtualList}
        {items}
        testId="basic-list"
        mode="bottomToTop"
        debug={true}
    >
        {#snippet renderItem(item)}
            <div
                class="test-item"
                style="height: {item.height}px;"
                data-testid="list-item-{item.id}"
            >
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>
