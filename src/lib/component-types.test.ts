import type { ComponentProps } from 'svelte'
import { describe, expectTypeOf, it } from 'vitest'
import type VirtualList from './SvelteVirtualList.svelte'

interface Message {
    id: number
    text: string
}

describe('SvelteVirtualList component generic inference', () => {
    it('items prop is Message[] when using VirtualList<Message>', () => {
        type Props = ComponentProps<VirtualList<Message>>
        expectTypeOf<Props['items']>().toEqualTypeOf<Message[]>()
    })

    it('renderItem snippet parameters are [Message, number] when using VirtualList<Message>', () => {
        type Props = ComponentProps<VirtualList<Message>>
        // Svelte compiles snippets to callable functions
        type Args = Props['renderItem'] extends (...args: infer A) => any ? A : never
        expectTypeOf<Args>().toEqualTypeOf<[Message, number]>()
    })

    it('defaults to any when type parameter is omitted', () => {
        // No generic specified → defaults to any per current public API
        type DefaultProps = ComponentProps<VirtualList>
        type DefaultArgs = DefaultProps['renderItem'] extends (...args: infer A) => any ? A : never
        // Validate individual parameters for clarity
        expectTypeOf<ComponentProps<VirtualList>['items']>().toEqualTypeOf<any[]>()
        expectTypeOf<DefaultArgs[0]>().toEqualTypeOf<any>()
        expectTypeOf<DefaultArgs[1]>().toEqualTypeOf<number>()
    })
})
