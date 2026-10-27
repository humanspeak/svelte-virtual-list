import { dev } from '$app/env'
import { createPackageStatsLoad } from '@humanspeak/docs-kit/server'
import rootPkg from '../../../package.json'

export const prerender = false

export const load = createPackageStatsLoad({
    pkg: rootPkg,
    dev,
    devFallback: { tarballBytes: 42_000, unpackedBytes: 155_000 }
})
