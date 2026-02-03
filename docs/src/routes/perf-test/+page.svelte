<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import SvelteVirtualList, {
        perfMetrics,
        startFpsTracking,
        stopFpsTracking,
        getCurrentFps,
        getMemoryUsage,
        formatBytes,
        isPerfEnabled
    } from '@humanspeak/svelte-virtual-list'
    import { onMount } from 'svelte'

    const breadcrumbs = $derived(getBreadcrumbContext())
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Performance Test' }
            ]
        }
    })

    // Test configuration
    type ItemCount = 10000 | 50000 | 100000
    const itemCounts: ItemCount[] = [10000, 50000, 100000]
    let selectedCount = $state<ItemCount>(10000)
    let items = $state<Array<{ id: number; text: string; height: number }>>([])
    let listRef: ReturnType<typeof SvelteVirtualList> | null = $state(null)

    // Metrics state
    let isRunning = $state(false)
    let currentFps = $state(0)
    let avgFps = $state(0)
    let memoryUsage = $state<{ used: string; total: string } | null>(null)
    /* trunk-ignore(eslint/@typescript-eslint/no-unused-vars,eslint/no-unused-vars) */
    let renderTime = $state(0)
    let testResults = $state<Array<{ name: string; value: string }>>([])

    // Generate items with variable heights
    const generateItems = (count: number) => {
        const heights = [40, 60, 80, 100, 120]
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            text: `Item ${i} - ${Math.random().toString(36).substring(7)}`,
            height: heights[i % heights.length]
        }))
    }

    // Initialize items
    $effect(() => {
        const startTime = performance.now()
        items = generateItems(selectedCount)
        renderTime = performance.now() - startTime
    })

    // FPS tracking interval
    let fpsInterval: ReturnType<typeof setInterval> | null = null

    const startTest = async () => {
        isRunning = true
        testResults = []
        perfMetrics.reset()
        startFpsTracking()

        // Track FPS updates
        fpsInterval = setInterval(() => {
            currentFps = Math.round(getCurrentFps())
        }, 100)

        // Record initial memory
        const initialMemory = getMemoryUsage()

        // Measure initial render
        const renderStart = performance.now()
        items = generateItems(selectedCount)
        await new Promise((resolve) => requestAnimationFrame(resolve))
        await new Promise((resolve) => requestAnimationFrame(resolve))
        const initialRenderTime = performance.now() - renderStart

        testResults.push({
            name: 'Initial Render',
            value: `${initialRenderTime.toFixed(2)}ms`
        })

        // Run scroll test - programmatic scrolling
        if (listRef) {
            const scrollTestStart = performance.now()
            const scrollSteps = 20
            const itemsPerStep = Math.floor(selectedCount / scrollSteps)

            for (let i = 0; i < scrollSteps; i++) {
                const targetIndex = Math.min(i * itemsPerStep, selectedCount - 1)
                await listRef.scroll({ index: targetIndex, smoothScroll: false })
                await new Promise((resolve) => setTimeout(resolve, 50))
            }

            // Scroll back to top
            await listRef.scroll({ index: 0, smoothScroll: false })

            const scrollTestTime = performance.now() - scrollTestStart
            testResults.push({
                name: 'Scroll Test (20 jumps)',
                value: `${scrollTestTime.toFixed(2)}ms`
            })
        }

        // Run rapid scroll simulation
        await runRapidScrollTest()

        // Stop FPS tracking and get average
        avgFps = Math.round(stopFpsTracking())
        if (fpsInterval) {
            clearInterval(fpsInterval)
            fpsInterval = null
        }

        testResults.push({
            name: 'Average FPS',
            value: `${avgFps} fps`
        })

        // Record final memory
        const finalMemory = getMemoryUsage()
        if (initialMemory && finalMemory) {
            const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
            testResults.push({
                name: 'Memory Growth',
                value: formatBytes(memoryGrowth)
            })
            memoryUsage = {
                used: formatBytes(finalMemory.usedJSHeapSize),
                total: formatBytes(finalMemory.totalJSHeapSize)
            }
        }

        // Get performance stats
        const stats = perfMetrics.getStats()
        if (stats.scrollHandler.count > 0) {
            testResults.push({
                name: 'Scroll Handler (avg)',
                value: `${stats.scrollHandler.avg.toFixed(3)}ms`
            })
        }
        if (stats.visibleRange.count > 0) {
            testResults.push({
                name: 'Visible Range Calc (avg)',
                value: `${stats.visibleRange.avg.toFixed(3)}ms`
            })
        }

        isRunning = false
    }

    const runRapidScrollTest = async () => {
        if (!listRef) return

        const rapidScrollStart = performance.now()
        const viewport = document.querySelector('#virtual-list-viewport') as HTMLElement
        if (!viewport) return

        // Simulate rapid scroll events
        const scrollEvents = 100
        const maxScroll = viewport.scrollHeight - viewport.clientHeight

        for (let i = 0; i < scrollEvents; i++) {
            const progress = i / scrollEvents
            const targetScroll =
                Math.sin(progress * Math.PI * 4) * maxScroll * 0.5 + maxScroll * 0.5
            viewport.scrollTop = targetScroll
            await new Promise((resolve) => requestAnimationFrame(resolve))
        }

        const rapidScrollTime = performance.now() - rapidScrollStart
        testResults.push({
            name: 'Rapid Scroll (100 events)',
            value: `${rapidScrollTime.toFixed(2)}ms`
        })
    }

    const stopTest = () => {
        isRunning = false
        stopFpsTracking()
        if (fpsInterval) {
            clearInterval(fpsInterval)
            fpsInterval = null
        }
    }

    onMount(() => {
        // Update memory usage periodically
        const memoryInterval = setInterval(() => {
            const memory = getMemoryUsage()
            if (memory) {
                memoryUsage = {
                    used: formatBytes(memory.usedJSHeapSize),
                    total: formatBytes(memory.totalJSHeapSize)
                }
            }
        }, 1000)

        return () => {
            clearInterval(memoryInterval)
            stopTest()
        }
    })
</script>

<svelte:head>
    <title>Performance Test | Svelte Virtual List</title>
</svelte:head>

<div class="flex h-full w-full flex-col gap-4 p-4">
    <!-- Controls -->
    <div class="bg-card border-border flex flex-wrap items-center gap-4 rounded-lg border p-4">
        <div class="flex items-center gap-2">
            <label for="item-count" class="text-sm font-medium">Items:</label>
            <select
                id="item-count"
                bind:value={selectedCount}
                disabled={isRunning}
                class="bg-background border-border rounded border px-3 py-1.5 text-sm"
            >
                {#each itemCounts as count (count)}
                    <option value={count}>{count.toLocaleString()}</option>
                {/each}
            </select>
        </div>

        <button
            onclick={isRunning ? stopTest : startTest}
            class="rounded px-4 py-2 text-sm font-medium text-white transition-colors {isRunning
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-brand-500 hover:bg-brand-600'}"
        >
            {isRunning ? 'Stop Test' : 'Run Performance Test'}
        </button>

        {#if isRunning}
            <div class="flex items-center gap-2">
                <div
                    class="border-brand-500 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                ></div>
                <span class="text-sm">Running... FPS: {currentFps}</span>
            </div>
        {/if}

        {#if !isPerfEnabled()}
            <div class="text-muted-foreground text-xs">
                Enable detailed metrics with: PUBLIC_SVELTE_VIRTUAL_LIST_PERF=true
            </div>
        {/if}
    </div>

    <!-- Results -->
    {#if testResults.length > 0}
        <div class="bg-card border-border rounded-lg border p-4">
            <h3 class="mb-3 text-lg font-semibold">
                Test Results ({selectedCount.toLocaleString()} items)
            </h3>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {#each testResults as result (result.name)}
                    <div class="bg-background rounded p-2">
                        <div class="text-muted-foreground text-xs">{result.name}</div>
                        <div class="font-mono text-sm font-medium">{result.value}</div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Memory Usage -->
    {#if memoryUsage}
        <div class="text-muted-foreground text-xs">
            Memory: {memoryUsage.used} / {memoryUsage.total}
        </div>
    {/if}

    <!-- Virtual List -->
    <div class="border-border flex-1 overflow-hidden rounded-lg border" style="min-height: 400px;">
        <SvelteVirtualList {items} bind:this={listRef} testId="perf-test">
            {#snippet renderItem(item, index)}
                <div
                    class="border-border flex items-center border-b px-4"
                    style="height: {item.height}px;"
                >
                    <span class="text-muted-foreground mr-4 w-16 font-mono text-xs">
                        #{index}
                    </span>
                    <span class="flex-1">{item.text}</span>
                    <span class="text-muted-foreground text-xs">{item.height}px</span>
                </div>
            {/snippet}
        </SvelteVirtualList>
    </div>

    <!-- Metrics Legend -->
    <div class="text-muted-foreground text-xs">
        <strong>Targets:</strong>
        Scroll FPS: 60fps | Initial render (10k): &lt;50ms | Memory growth (1min): &lt;10MB
    </div>
</div>
