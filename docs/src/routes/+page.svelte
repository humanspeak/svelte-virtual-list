<script lang="ts">
    import SvelteVirtualList, {
        type SvelteVirtualListDebugInfo
    } from '@humanspeak/svelte-virtual-list'
    import * as Card from '$lib/shadcn/components/ui/card/index.js'
    import MainContainer from '$lib/components/MainContainer.svelte'

    type Item = {
        id: number
        text: string
    }

    const items: Item[] = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Item ${i}` }))

    function topToBottomDebug(info: SvelteVirtualListDebugInfo) {
        console.log('topToBottomDebug', info)
    }

    function bottomToTopDebug(info: SvelteVirtualListDebugInfo) {
        console.log('bottomToTopDebug', info)
    }
</script>

<MainContainer>
    <div class="flex h-full min-h-0 w-full">
        <div class="flex h-full min-h-0 w-full justify-center p-4">
            <div class="grid h-full min-h-0 w-full grid-cols-[50%_auto] gap-8">
                <div class="h-full min-h-0">
                    <Card.Root class="flex h-full flex-col">
                        <Card.Header>
                            <Card.Title>Top to bottom</Card.Title>
                            <Card.Description>
                                Check the console for debug information (topToBottomDebug)
                            </Card.Description>
                        </Card.Header>
                        <Card.Content class="flex min-h-0 flex-1 flex-col">
                            <!-- <SvelteVirtualList
                                defaultEstimatedItemHeight={22}
                                {items}
                                debug
                                debugFunction={topToBottomDebug}
                                testId="top-to-bottom"
                            >
                                {#snippet renderItem(item: Item, _index: number)}
                                    <div>
                                        {item.text}
                                    </div>
                                {/snippet}
                            </SvelteVirtualList> -->
                        </Card.Content>
                    </Card.Root>
                </div>
                <div class="h-auto min-h-max">
                    <Card.Root class="flex h-full w-full flex-col">
                        <Card.Header>
                            <Card.Title>Bottom to top</Card.Title>
                            <Card.Description>
                                Check the console for debug information (bottomToTopDebug)
                            </Card.Description>
                        </Card.Header>
                        <Card.Content class="flex min-h-0 flex-1 flex-col">
                            <SvelteVirtualList
                                defaultEstimatedItemHeight={22}
                                {items}
                                mode="bottomToTop"
                                debug
                                debugFunction={bottomToTopDebug}
                                testId="bottom-to-top"
                            >
                                {#snippet renderItem(item: Item, _index: number)}
                                    <div>
                                        {item.text}
                                    </div>
                                {/snippet}
                            </SvelteVirtualList>
                        </Card.Content>
                    </Card.Root>
                </div>
            </div>
        </div>
    </div>
</MainContainer>
