<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    type Item = {
        id: number
        text: string
        expanded: boolean
    }

    // 1000 items with expand/collapse capability.
    // Simulates accordion-style variable heights that triggered #327.
    const items: Item[] = $state(
        Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            text: `Item ${i}`,
            expanded: false
        }))
    )

    const toggleItem = (item: Item) => {
        item.expanded = !item.expanded
    }
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList defaultEstimatedItemHeight={40} {items} testId="issue-327-list">
        {#snippet renderItem(item)}
            <div class="test-item" class:expanded={item.expanded} data-testid="list-item-{item.id}">
                <button
                    class="toggle-btn"
                    data-testid="toggle-{item.id}"
                    onclick={() => toggleItem(item)}
                >
                    {item.text}
                    {item.expanded ? '▼' : '▶'}
                </button>
                {#if item.expanded}
                    <div class="expanded-content" data-testid="content-{item.id}">
                        <p>Expanded content for {item.text}</p>
                        <p>This adds significant height to the item.</p>
                        <p>It should not cause the list to flash or jump.</p>
                    </div>
                {/if}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>

<style>
    .test-container {
        width: 100%;
        border: 1px solid #eee;
    }

    .test-item {
        border-bottom: 1px solid #eee;
        padding: 8px;
    }

    .toggle-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        padding: 4px 0;
        width: 100%;
        text-align: left;
    }

    .expanded-content {
        padding: 12px 8px;
        background: #f5f5f5;
        border-radius: 4px;
        margin-top: 4px;
    }

    .expanded-content p {
        margin: 4px 0;
        font-size: 13px;
        color: #555;
    }
</style>
