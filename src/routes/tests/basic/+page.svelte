<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`
    }))
</script>

<div class="test-container" style="height: 500px;">
    <SvelteVirtualList {items} testId="basic-list">
        {#snippet renderItem(item)}
            <div class="test-item" data-testid="list-item-{item.id}">
                {item.text}
            </div>
        {/snippet}
    </SvelteVirtualList>
</div>
