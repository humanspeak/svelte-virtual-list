<script lang="ts">
    import { Button } from '$lib/shadcn/components/ui/button'
    import { mode } from 'mode-watcher'
    import ModeChanger from './ModeChanger.svelte'
    import * as Sidebar from '$lib/shadcn/components/ui/sidebar/index.js'
    import Github from '@lucide/svelte/icons/github'
    import Package from '@lucide/svelte/icons/package'
</script>

<div class="grid grid-cols-3 items-center">
    <div class="flex justify-start">
        <Sidebar.Trigger />
    </div>
    <h1 class="text-center text-4xl font-extrabold">
        <div class="flex w-full items-center justify-center gap-2">
            {#if mode.current === 'dark'}
                <img src="./humanspeak-dark.svg" alt="humanspeak logo" class="h-10" />
            {:else}
                <img src="./humanspeak.svg" alt="humanspeak logo" class="h-10" />
            {/if}
            <span>/virtual-list</span>
        </div>
    </h1>
    <div class="flex justify-end">
        <ModeChanger />
        <Button
            variant="ghost"
            size="icon"
            href="https://github.com/humanspeak/svelte-virtual-list"
            target="_blank"
        >
            <Github size={20} />
        </Button>
        <Button
            variant="ghost"
            size="icon"
            href="https://www.npmjs.com/package/@humanspeak/svelte-virtual-list"
            target="_blank"
        >
            <Package size={20} />
        </Button>
    </div>
</div>
