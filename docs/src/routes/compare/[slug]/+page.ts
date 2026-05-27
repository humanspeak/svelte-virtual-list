import { competitors } from '$lib/compare-data'
import { createCompareSlugLoad } from '@humanspeak/docs-kit'
import type { EntryGenerator } from './$types'

export const { entries, load } = createCompareSlugLoad(competitors) as {
    entries: EntryGenerator
    load: ReturnType<typeof createCompareSlugLoad>['load']
}
