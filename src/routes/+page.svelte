<script lang="ts">
    import { resolve } from '$app/paths'

    type Link = { href: string; label: string }
    type Section = { title: string; links: Link[] }

    const sections: Section[] = [
        {
            title: 'Message',
            links: [{ href: resolve('/message'), label: 'Message' }]
        },
        {
            title: 'Tests — Top to bottom',
            links: [
                { href: resolve('/tests/list/topToBottom/basic'), label: 'Basic' },
                { href: resolve('/tests/list/topToBottom/performance'), label: 'Performance' },
                { href: resolve('/tests/list/topToBottom/scroll'), label: 'Scroll' },
                { href: resolve('/tests/list/topToBottom/itemResize'), label: 'Item resize' },
                { href: resolve('/tests/list/topToBottom/wrongItemSize'), label: 'Wrong item size' }
            ]
        },
        {
            title: 'Tests — Bottom to top',
            links: [
                { href: resolve('/tests/list/bottomToTop/basic'), label: 'Basic' },
                { href: resolve('/tests/list/bottomToTop/performance'), label: 'Performance' },
                { href: resolve('/tests/list/bottomToTop/scroll'), label: 'Scroll' },
                { href: resolve('/tests/list/bottomToTop/smallItems'), label: 'Small items' },
                { href: resolve('/tests/list/bottomToTop/loadItems'), label: 'Load items' },
                {
                    href: resolve('/tests/list/bottomToTop/firstItemHeightChange'),
                    label: 'First item height change'
                },
                { href: resolve('/tests/list/bottomToTop/wrongItemSize'), label: 'Wrong item size' }
            ]
        },
        {
            title: 'Tests — Other',
            links: [
                { href: resolve('/tests/other/bidirectional'), label: 'Bidirectional' },
                { href: resolve('/tests/other/both'), label: 'Both (two lists)' }
            ]
        },
        {
            title: 'Tests — Issues',
            links: [
                { href: resolve('/tests/issues/generics'), label: 'Generics' },
                { href: resolve('/tests/issues/issue-215'), label: 'Issue 215' },
                { href: resolve('/tests/issues/issue-263'), label: 'Issue 263' },
                { href: resolve('/tests/issues/issue-195'), label: 'Issue 195' },
                { href: resolve('/tests/issues/layout'), label: 'Layout' },
                // Example dynamic route under layout
                { href: resolve('/tests/issues/layout/123'), label: 'Layout (id = 123)' }
            ]
        }
    ]
</script>

<div class="mx-auto max-w-5xl px-4 py-8">
    <h1 class="mb-6 text-2xl font-semibold">@humanspeak/svelte-virtual-list — Demos</h1>
    <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
        {#each sections as section}
            <div>
                <h2 class="mb-3 text-xl font-medium">{section.title}</h2>
                <ul class="list-disc space-y-2 pl-5">
                    {#each section.links as { href, label }}
                        <li>
                            <a class="text-blue-300 hover:underline" {href}>{label}</a>
                        </li>
                    {/each}
                </ul>
            </div>
        {/each}
    </div>
</div>
