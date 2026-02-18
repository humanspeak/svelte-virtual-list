<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    // Variable-height items: every 3rd item is taller.
    // This causes averageHeight to oscillate as items are measured,
    // which was the root cause of the scrollHeight jitter in #341.
    const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        tall: i % 3 === 0
    }))
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList
        defaultEstimatedItemHeight={40}
        {items}
        testId="issue-341-list"
        mode="bottomToTop"
    >
        {#snippet renderItem(item)}
            <div class="test-item" class:tall={item.tall}>
                {item.text}
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
        padding: 8px;
        border-bottom: 1px solid #eee;
    }

    .test-item.tall {
        padding: 24px 8px;
        font-size: 1.2em;
    }
</style>
