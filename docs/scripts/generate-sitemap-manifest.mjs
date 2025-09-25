import { readdir, stat, writeFile } from 'node:fs/promises'
import { join, resolve as resolvePath } from 'node:path'

const ROOT = resolvePath(process.cwd(), 'src', 'routes')

/** Convert a +page file path to a route path */
function toRoutePath(file) {
    let p = file.replace(ROOT, '')
    p = p.replace(/\/\+page\.(svelte|svx|md)$/i, '')
    return p === '' ? '/' : p
}

/** Recursively find +page files */
async function findPageFiles(dir, out = []) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const e of entries) {
        const full = join(dir, e.name)
        if (e.isDirectory()) {
            await findPageFiles(full, out)
        } else if (/\+page\.(svelte|svx|md)$/i.test(e.name)) {
            out.push(full)
        }
    }
    return out
}

async function main() {
    const files = await findPageFiles(ROOT)
    const manifest = {}
    for (const file of files) {
        const s = await stat(file)
        const route = toRoutePath(file)
        // Non-recursive lastmod: use the +page file's mtime only
        manifest[route] = new Date(s.mtimeMs).toISOString().slice(0, 10)
    }

    const dest = resolvePath(process.cwd(), 'src', 'lib', 'sitemap-manifest.json')
    await writeFile(dest, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
    console.log(`Sitemap manifest written to ${dest}`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
