<script lang="ts">
    import SvelteVirtualList, { type SvelteVirtualListDebugInfo } from '$lib/index.js'

    const items = $state(
        Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            text: `Item ${i}`,
            height: 50
        }))
    )

    const randomizeHeight = (item: (typeof items)[0]) => {
        const currentHeight = item.height
        let newHeight: number
        let attempts = 0
        const maxAttempts = 10

        // Keep trying until we get a different number
        do {
            const adjustment = Math.floor(Math.random() * 11) - 5 // -5 to +5
            newHeight = Math.max(30, currentHeight + adjustment) // Minimum 30px
            attempts++
        } while (newHeight === currentHeight && attempts < maxAttempts)

        item.height = newHeight
    }

    const updateHeight = (item: (typeof items)[0], newHeight: number) => {
        item.height = Math.max(20, Math.min(200, newHeight)) // Clamp between 20-200px
    }

    // Test function to directly modify DOM element height
    const testDirectHeightChange = (item: (typeof items)[0]) => {
        // Find the actual DOM element and modify it directly
        const itemElement = document.querySelector(
            `[data-testid="list-item-${item.id}"]`
        ) as HTMLElement
        if (itemElement) {
            itemElement.style.height = '100px'
            itemElement.style.minHeight = '100px'
        }
    }

    const debugFunction = (debugInfo: SvelteVirtualListDebugInfo) => {
        console.log('debugFunction', debugInfo)
    }
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList
        defaultEstimatedItemHeight={22}
        {items}
        testId="item-resize-list"
        debug={false}
        {debugFunction}
    >
        {#snippet renderItem(item)}
            <div
                class="test-item"
                data-testid="list-item-{item.id}"
                style="height: {item.height}px; min-height: {item.height}px;"
            >
                <div class="item-content">
                    <div class="item-text">{item.text}</div>
                    <div class="controls">
                        <input
                            type="number"
                            min="20"
                            max="200"
                            value={item.height}
                            onchange={(e) => updateHeight(item, parseInt(e.currentTarget.value))}
                            class="height-input"
                        />
                        <button onclick={() => randomizeHeight(item)} class="randomize-btn">
                            Randomize (±5px)
                        </button>
                        <button onclick={() => testDirectHeightChange(item)} class="test-btn">
                            DOM Test
                        </button>
                    </div>
                </div>
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>

<style>
    .test-container {
        border: 2px solid #ddd;
        border-radius: 8px;
        padding: 10px;
        background: #f9f9f9;
    }

    .test-item {
        border: 1px solid #ccc;
        border-radius: 4px;
        margin: 2px 0;
        background: white;
        display: flex;
        align-items: center;
        box-sizing: border-box;
        /* transition: height 0.2s ease; -- Commented out to test ResizeObserver */
    }

    .item-content {
        width: 100%;
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .item-text {
        font-weight: 500;
        color: #333;
    }

    .controls {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .height-input {
        width: 60px;
        padding: 4px 6px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 12px;
    }

    .randomize-btn {
        padding: 4px 8px;
        font-size: 11px;
        background: #007acc;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        white-space: nowrap;
    }

    .randomize-btn:hover {
        background: #005a9e;
    }

    .randomize-btn:active {
        transform: scale(0.98);
    }

    .test-btn {
        padding: 4px 8px;
        font-size: 11px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        white-space: nowrap;
    }

    .test-btn:hover {
        background: #c0392b;
    }

    .test-btn:active {
        transform: scale(0.98);
    }
</style>
