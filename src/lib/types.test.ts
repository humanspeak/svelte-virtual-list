import { describe, expectTypeOf, it } from 'vitest'
import type {
    SvelteVirtualListProps,
    SvelteVirtualListScrollOptions,
    VirtualListOrientation
} from './types.js'

interface Message {
    id: number
    text: string
}

type ExtractSnippetArgs<T> = T extends (...args: infer A) => any ? A : never

describe('SvelteVirtualList generics', () => {
    it('propagates item type to items prop', () => {
        type Props = SvelteVirtualListProps<Message>
        expectTypeOf<Props['items']>().toEqualTypeOf<Message[]>()
    })

    it('propagates item type to renderItem snippet parameters', () => {
        type Props = SvelteVirtualListProps<Message>
        type Args = ExtractSnippetArgs<Props['renderItem']>
        // renderItem is Snippet<[Message, number]> which is callable with args [Message, number]
        expectTypeOf<Args>().toEqualTypeOf<[Message, number]>()
    })

    it('defaults to any when no generic is provided', () => {
        type DefaultProps = SvelteVirtualListProps
        type DefaultArgs = ExtractSnippetArgs<DefaultProps['renderItem']>
        // Default TItem is any
        expectTypeOf<DefaultProps['items']>().toEqualTypeOf<any[]>()
        expectTypeOf<DefaultArgs[0]>().toEqualTypeOf<any>()
        expectTypeOf<DefaultArgs[1]>().toEqualTypeOf<number>()
    })

    it('keeps legacy estimates and alignments compatible with the axis-neutral API', () => {
        const vertical: SvelteVirtualListProps<Message> = {
            items: [],
            orientation: 'vertical' satisfies VirtualListOrientation,
            defaultEstimatedItemHeight: 40,
            renderItem: (() => {}) as unknown as SvelteVirtualListProps<Message>['renderItem']
        }
        const horizontal: Partial<SvelteVirtualListProps<Message>> = {
            orientation: 'horizontal',
            defaultEstimatedItemSize: 80
        }
        const oldScroll: SvelteVirtualListScrollOptions = { index: 1, align: 'top' }
        const semanticScroll: SvelteVirtualListScrollOptions = { index: 1, align: 'end' }
        expectTypeOf(vertical).toMatchTypeOf<SvelteVirtualListProps<Message>>()
        expectTypeOf(horizontal).toMatchTypeOf<Partial<SvelteVirtualListProps<Message>>>()
        expectTypeOf(oldScroll).toMatchTypeOf<SvelteVirtualListScrollOptions>()
        expectTypeOf(semanticScroll).toMatchTypeOf<SvelteVirtualListScrollOptions>()
    })
})
