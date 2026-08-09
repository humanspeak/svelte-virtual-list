import type { VirtualListOrientation } from '$lib/types.js'

export type AxisRect = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'height' | 'width'>

export interface AxisAdapter {
    readonly orientation: VirtualListOrientation
    getScrollOffset: (_element: HTMLElement) => number
    setScrollOffset: (_element: HTMLElement, _offset: number) => void
    getViewportSize: (_element: HTMLElement) => number
    getScrollSize: (_element: HTMLElement) => number
    getStart: (_rect: AxisRect) => number
    getEnd: (_rect: AxisRect) => number
    getSize: (_rect: AxisRect) => number
    contentSizeStyle: (_size: number) => string
    transform: (_offset: number) => string
    isScrollKey: (_key: string) => boolean
    scrollTo: (_element: HTMLElement, _offset: number, _behavior: ScrollBehavior) => void
}

const verticalKeys = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'])
const horizontalKeys = new Set([
    'ArrowRight',
    'ArrowLeft',
    'PageDown',
    'PageUp',
    ' ',
    'Home',
    'End'
])

const verticalAxis: AxisAdapter = {
    orientation: 'vertical',
    getScrollOffset: (element) => element.scrollTop,
    setScrollOffset: (element, offset) => {
        element.scrollTop = offset
    },
    getViewportSize: (element) => element.clientHeight,
    getScrollSize: (element) => element.scrollHeight,
    getStart: (rect) => rect.top,
    getEnd: (rect) => rect.bottom,
    getSize: (rect) => rect.height,
    contentSizeStyle: (size) => `height: ${size}px`,
    transform: (offset) => `translateY(${offset}px)`,
    isScrollKey: (key) => verticalKeys.has(key),
    scrollTo: (element, offset, behavior) => element.scrollTo({ top: offset, behavior })
}

const horizontalAxis: AxisAdapter = {
    orientation: 'horizontal',
    getScrollOffset: (element) => element.scrollLeft,
    setScrollOffset: (element, offset) => {
        element.scrollLeft = offset
    },
    getViewportSize: (element) => element.clientWidth,
    getScrollSize: (element) => element.scrollWidth,
    getStart: (rect) => rect.left,
    getEnd: (rect) => rect.right,
    getSize: (rect) => rect.width,
    contentSizeStyle: (size) => `width: ${size}px`,
    transform: (offset) => `translateX(${offset}px)`,
    isScrollKey: (key) => horizontalKeys.has(key),
    scrollTo: (element, offset, behavior) => element.scrollTo({ left: offset, behavior })
}

export const getAxisAdapter = (orientation: VirtualListOrientation): AxisAdapter =>
    orientation === 'horizontal' ? horizontalAxis : verticalAxis
