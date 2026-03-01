<script lang="ts">
    import type { Component } from 'svelte'
    import Rocket from '@lucide/svelte/icons/rocket'
    import Book from '@lucide/svelte/icons/book'
    import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal'
    import Code from '@lucide/svelte/icons/code'
    import Zap from '@lucide/svelte/icons/zap'
    import Type from '@lucide/svelte/icons/type'
    import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down'
    import MessageCircle from '@lucide/svelte/icons/message-circle'
    import InfinityIcon from '@lucide/svelte/icons/infinity'
    import Crosshair from '@lucide/svelte/icons/crosshair'
    import Server from '@lucide/svelte/icons/server'
    import Bug from '@lucide/svelte/icons/bug'
    import Database from '@lucide/svelte/icons/database'
    import Play from '@lucide/svelte/icons/play'
    import List from '@lucide/svelte/icons/list'
    import Heart from '@lucide/svelte/icons/heart'
    import ArrowRight from '@lucide/svelte/icons/arrow-right'
    import Box from '@lucide/svelte/icons/box'

    type IconProps = {
        name: string
        size?: number
        class?: string
    }

    const { name, size = 16, class: className = '' }: IconProps = $props()

    const iconMap: Record<string, Component<{ size?: number; class?: string }>> = {
        rocket: Rocket,
        book: Book,
        'sliders-horizontal': SlidersHorizontal,
        code: Code,
        zap: Zap,
        type: Type,
        'arrow-up-down': ArrowUpDown,
        'message-circle': MessageCircle,
        infinity: InfinityIcon,
        crosshair: Crosshair,
        server: Server,
        bug: Bug,
        database: Database,
        play: Play,
        list: List,
        heart: Heart,
        'arrow-right': ArrowRight,
        box: Box
    }
</script>

{#if iconMap[name]}
    {@const IconComponent = iconMap[name]}
    <IconComponent {size} class={className} />
{:else if import.meta.env.DEV}
    {console.warn(`[Icon] Unknown icon name: "${name}"`)}
{/if}
