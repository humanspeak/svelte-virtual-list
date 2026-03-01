<script lang="ts">
    import { resetMode, setMode, userPrefersMode } from 'mode-watcher'
    import { buttonVariants } from '$lib/shadcn/components/ui/button/'
    import * as DropdownMenu from '$lib/shadcn/components/ui/dropdown-menu/index.js'
    import * as Tooltip from '$lib/shadcn/components/ui/tooltip/index.js'
    import Sun from '@lucide/svelte/icons/sun'
    import Moon from '@lucide/svelte/icons/moon'
</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger>
        <Tooltip.Root>
            <Tooltip.Trigger class={buttonVariants({ variant: 'ghost', size: 'icon' })}>
                <span class="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90">
                    <Sun size={16} />
                </span>
                <span
                    class="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
                >
                    <Moon size={16} />
                </span>
                <span class="sr-only">Toggle theme</span>
            </Tooltip.Trigger>
            <Tooltip.Content side="top" class="flex items-center gap-4">Themes</Tooltip.Content>
        </Tooltip.Root>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
        <DropdownMenu.RadioGroup value={userPrefersMode.current ?? 'system'}>
            <DropdownMenu.RadioItem value="light" onclick={() => setMode('light')}>
                Light
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="dark" onclick={() => setMode('dark')}>
                Dark
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="system" onclick={() => resetMode()}>
                System
            </DropdownMenu.RadioItem>
        </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
</DropdownMenu.Root>
