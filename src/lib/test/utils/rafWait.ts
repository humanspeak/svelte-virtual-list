import type { Page } from '@playwright/test'

export const rafWait = async (page: Page) =>
    page.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            )
    )

export const injectRafWait = async (page: Page) =>
    page.addInitScript(() => {
        ;(window as unknown as { __rafWait?: () => Promise<void> }).__rafWait = () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            )
    })
