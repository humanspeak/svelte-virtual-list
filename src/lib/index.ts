import SvelteVirtualList from '$lib/SvelteVirtualList.svelte'
import type {
    SvelteVirtualListDebugInfo,
    SvelteVirtualListMode,
    SvelteVirtualListProps,
    SvelteVirtualListScrollAlign,
    SvelteVirtualListScrollOptions
} from '$lib/types.js'
// cleaned: no extra exports for debugging UI
export type {
    SvelteVirtualListDebugInfo,
    SvelteVirtualListMode,
    SvelteVirtualListProps,
    SvelteVirtualListScrollAlign,
    SvelteVirtualListScrollOptions
}

// Re-export renamed manager from existing package location to avoid churn
export { ReactiveListManager } from '$lib/reactive-list-manager/index.js'
export type { ListManagerConfig } from '$lib/reactive-list-manager/index.js'

export default SvelteVirtualList
