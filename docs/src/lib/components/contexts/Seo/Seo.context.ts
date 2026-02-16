import { getContext, setContext } from 'svelte'
import type { SeoContext } from './type'

export const SeoContextSymbol = Symbol('seo')

export const getSeoContext = (): SeoContext | undefined => {
    return getContext(SeoContextSymbol)
}

export const setSeoContext = (context: SeoContext): void => {
    setContext(SeoContextSymbol, context)
}
