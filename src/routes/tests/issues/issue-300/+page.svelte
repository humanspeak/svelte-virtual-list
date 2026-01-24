<script lang="ts">
    import SvelteVirtualList from '$lib/index.js'

    let listRef: SvelteVirtualList<{
        id: number
        text: string
        height: number
    }>

    const items = Array.from({ length: 30000 }, (_, i) => ({
        id: i,
        text: `Item ${i}`,
        height: Math.floor(Math.random() * 80) + 20
    }))

    // function goToItem15000() {
    //     listRef.scroll({
    //         index: 15000,
    //         smoothScroll: true,
    //         align: 'auto'
    //     })
    // }
</script>

<main class="container">
    <!-- <button on:click={goToItem15000}> Scroll to item 15000 </button> -->

    <SvelteVirtualList {items} bind:this={listRef}>
        {#snippet renderItem(item)}
            <div
                style="
                padding: 8px;
                border-bottom: 1px solid #ccc;
                height: {item.height}px;
            "
            >
                {item.text} – height: {item.height}px
            </div>
        {/snippet}
    </SvelteVirtualList>
</main>

<style>
    .container {
        height: 100vh;
        width: 99vw;
        color: rgb(17, 16, 16);
    }
</style>
