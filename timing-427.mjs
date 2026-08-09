import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage()
const cdp = await page.context().newCDPSession(page)
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 500 })
await cdp.send('Profiler.start')
const start = Date.now()
await page.goto('http://localhost:8025/tests/issues/issue-427')
await page.waitForFunction(
    () => {
        const t = document.querySelector('[data-testid="overall-state"]')?.textContent
        return t?.startsWith('GREEN') || t?.startsWith('RED')
    },
    { timeout: 60000 }
)
console.log('green at', Date.now() - start, 'ms')
const { profile } = await cdp.send('Profiler.stop')
// aggregate self time per function
const hitsById = new Map()
for (const node of profile.nodes) hitsById.set(node.id, { node, self: 0 })
for (const id of profile.samples) hitsById.get(id).self++
const total = profile.samples.length
const top = [...hitsById.values()].sort((a, b) => b.self - a.self).slice(0, 15)
for (const { node, self } of top) {
    const f = node.callFrame
    const loc = (f.url || '').split('/').slice(-2).join('/')
    console.log(
        `${String(Math.round((self / total) * 100)).padStart(3)}%  ${f.functionName || '(anon)'}  ${loc}:${f.lineNumber}`
    )
}
await browser.close()
