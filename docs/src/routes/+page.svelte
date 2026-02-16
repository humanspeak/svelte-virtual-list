<script lang="ts">
    import { motion, animate, type MotionTransition } from '@humanspeak/svelte-motion'
    import type { DOMKeyframesDefinition } from 'motion'
    import Header from '$lib/components/general/Header.svelte'
    import Footer from '$lib/components/general/Footer.svelte'
    import Example from '$lib/components/general/Example.svelte'
    import BasicList from '$lib/examples/BasicList.svelte'
    import { type BreadcrumbContext } from '$lib/components/contexts/Breadcrumb/type'
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { goto } from '$app/navigation'

    // mounted no longer needed for CSS enter
    let headingContainer: HTMLDivElement | null = $state(null)
    const breadcrumbContext = $state<BreadcrumbContext | undefined>(getBreadcrumbContext())
    const seo = getSeoContext()

    $effect(() => {
        if (breadcrumbContext) {
            breadcrumbContext.breadcrumbs = []
        }
    })

    $effect(() => {
        if (seo) {
            seo.title = 'Svelte Virtual List - High-performance virtual scrolling for Svelte 5'
            seo.description =
                'High-performance virtual list component for Svelte 5 that efficiently renders 10k+ items with minimal memory usage.'
        }
    })

    function splitHeadingWords(root: HTMLElement) {
        const lines = root.querySelectorAll('h1 span')
        const words: HTMLElement[] = []
        lines.forEach((line) => {
            const text = line.textContent ?? ''
            line.textContent = ''
            const tokens = text.split(/(\s+)/)
            for (const t of tokens) {
                if (t.trim().length === 0) {
                    line.appendChild(document.createTextNode(t))
                } else {
                    const w = document.createElement('span')
                    w.className = 'split-word'
                    w.textContent = t
                    line.appendChild(w)
                    words.push(w)
                }
            }
        })
        return words
    }

    $effect(() => {
        if (typeof document === 'undefined') return
        if (!headingContainer) return
        // hide until fonts are loaded and spans are built
        headingContainer.style.visibility = 'hidden'
        document.fonts?.ready
            .then(() => {
                if (!headingContainer) return
                const words = splitHeadingWords(headingContainer)
                headingContainer.style.visibility = 'visible'
                words.forEach((el, i) => {
                    const keyframes: DOMKeyframesDefinition = {
                        opacity: [0, 1],
                        y: [10, 0]
                    }
                    const options = {
                        duration: 0.8,
                        easing: 'ease-out',
                        delay: i * 0.05
                    } as MotionTransition
                    animate(el, keyframes, options)
                })
            })
            .catch(() => {
                // Fallback: ensure visible
                headingContainer!.style.visibility = 'visible'
            })
    })
</script>

<div class="flex min-h-svh flex-col">
    <!-- Header with links -->
    <Header />
    <div class="flex flex-1 flex-col">
        <section class="relative flex flex-1 overflow-hidden">
            <!-- Layer: subtle grid -->
            <div class="bg-grid pointer-events-none absolute inset-0 -z-20"></div>
            <!-- Layer: soft radial glow -->
            <div class="bg-glow pointer-events-none absolute inset-0 -z-10"></div>
            <!-- Layer: animated orbs via motion -->
            <motion.div
                class="orb-a-bg absolute bottom-[-80px] left-[-80px] h-[320px] w-[320px] rounded-full opacity-50 blur-[30px]"
                style="will-change: transform;"
                animate={{
                    x: ['0vw', '8vw', '-4vw', '2vw', '0vw'],
                    y: ['0vh', '-10vh', '6vh', '-4vh', '0vh']
                }}
                transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                class="orb-b-bg absolute top-[20%] right-[-60px] h-[260px] w-[260px] rounded-full opacity-50 blur-[30px]"
                style="will-change: transform;"
                animate={{
                    x: ['0vw', '-6vw', '3vw', '-2vw', '0vw'],
                    y: ['0vh', '-8vh', '4vh', '-6vh', '0vh']
                }}
                transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
            />

            <div
                class="relative mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-8 md:py-12"
            >
                <motion.div class="mx-auto max-w-4xl text-center">
                    <div bind:this={headingContainer} class="mx-auto max-w-4xl text-center">
                        <h1
                            class="text-foreground text-5xl leading-tight font-semibold text-balance md:text-7xl"
                        >
                            <span class="block">Svelte</span>
                            <span
                                class="sheen-gradient from-foreground via-brand-500 to-foreground block bg-gradient-to-r bg-clip-text text-transparent"
                            >
                                Virtual List
                            </span>
                        </h1>
                        <p
                            class="text-muted-foreground mt-6 text-base leading-7 text-pretty md:text-lg"
                        >
                            High-performance virtual scrolling for Svelte 5. Render massive lists
                            with minimal memory. Automatic height detection. SSR-ready.
                        </p>
                        <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
                            <motion.button
                                onclick={() => {
                                    goto('/docs')
                                }}
                                whileTap={{ scale: 0.96 }}
                                whileHover={{ scale: 1.03, filter: 'brightness(0.95)' }}
                                class="border-border-mid bg-brand-200 text-background inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold"
                            >
                                Get Started
                            </motion.button>
                            <motion.button
                                onclick={() => {
                                    goto('/examples')
                                }}
                                whileTap={{ scale: 0.96 }}
                                whileHover={{ scale: 1.03 }}
                                class="border-border-mid text-foreground hover:bg-muted inline-flex items-center justify-center rounded-full border bg-transparent px-4 py-2 text-sm font-semibold"
                            >
                                View Examples
                            </motion.button>
                        </div>
                        <ul
                            class="text-muted-foreground mt-10 flex flex-wrap justify-center gap-2 text-xs"
                        >
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                10k+ items
                            </li>
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                Variable heights
                            </li>
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                TypeScript
                            </li>
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                SSR Ready
                            </li>
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                Infinite Scroll
                            </li>
                        </ul>

                        <!-- Interactive Demo -->
                        <motion.div
                            class="mt-12 w-full"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                        >
                            <div
                                class="border-border bg-card/50 rounded-xl border p-1 shadow-lg backdrop-blur"
                            >
                                <div class="border-border bg-background rounded-lg border">
                                    <div
                                        class="border-border text-muted-foreground flex items-center gap-2 border-b px-4 py-3 text-sm"
                                    >
                                        <i class="fa-solid fa-play text-brand-500 text-xs"></i>
                                        <span>Interactive Demo - 10,000 items</span>
                                    </div>
                                    <div class="h-[400px] overflow-hidden">
                                        <Example isSmall>
                                            <BasicList />
                                        </Example>
                                    </div>
                                </div>
                            </div>
                            <p class="text-muted-foreground mt-4 text-center text-sm">
                                Scroll through 10,000 items with smooth performance
                            </p>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    </div>
    <Footer />
</div>

<style>
    /* Decorative layers */
    .bg-grid {
        background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
        background-size: 24px 24px;
        background-position: 50% 0;
        mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 1) 20%, rgba(0, 0, 0, 0) 70%);
    }
    .bg-glow {
        background:
            radial-gradient(60% 50% at 50% 0%, rgba(141, 240, 204, 0.18), transparent 60%),
            radial-gradient(40% 40% at 90% 20%, rgba(141, 240, 204, 0.12), transparent 60%),
            radial-gradient(40% 40% at 10% 15%, rgba(141, 240, 204, 0.12), transparent 60%);
        filter: blur(0.2px);
    }
</style>
