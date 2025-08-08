import { describe, expectTypeOf, it } from 'vitest'
import type { SvelteVirtualListProps } from '../../src/lib/types.js'

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
        expectTypeOf<Args>().toMatchTypeOf<[Message, number]>()
    })

    it('defaults to any when no generic is provided', () => {
        type DefaultProps = SvelteVirtualListProps
        type DefaultArgs = ExtractSnippetArgs<DefaultProps['renderItem']>
        // Default TItem is any
        expectTypeOf<DefaultArgs[0]>().toEqualTypeOf<any>()
        expectTypeOf<DefaultArgs[1]>().toEqualTypeOf<number>()
    })
})
