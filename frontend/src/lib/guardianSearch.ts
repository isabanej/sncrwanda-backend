// Reusable guardian search resolver to keep Students.tsx simpler and test the behavior.
// Direction-aware: if the user backspaces (query shrinks with previous as prefix), we filter locally.
// Otherwise we perform a fetch. If fetch returns empty for non-empty query but cache has matches, we fallback to cache.

export interface GuardianLite {
  id: string
  fullName: string
}

export interface GuardianSearchInput {
  prevQuery: string
  nextQuery: string
  cache: Record<string, GuardianLite>
  fetcher: (q: string) => Promise<GuardianLite[]>
  preload?: boolean // if true and nextQuery empty and cache empty: fetch all
}

export interface GuardianSearchResult {
  list: GuardianLite[]
  cache: Record<string, GuardianLite>
  usedCache: boolean
  reason: 'shrink' | 'fetch' | 'fallback' | 'preload'
}

export async function resolveGuardianSearch(input: GuardianSearchInput): Promise<GuardianSearchResult> {
  const { prevQuery, nextQuery, cache, fetcher, preload } = input
  const trimmed = nextQuery.trim()
  const prev = prevQuery.trim()
  const isShrink = !!prev && prev.length > trimmed.length && prev.startsWith(trimmed)

  // Shrink path – purely client side
  if (isShrink) {
    const all = Object.values(cache)
    const filtered = trimmed ? all.filter(g => g.fullName.toLowerCase().includes(trimmed.toLowerCase())) : all
    return { list: sort(filtered), cache, usedCache: true, reason: 'shrink' }
  }

  // Preload path (empty query, cache empty, preload requested)
  if (preload && !trimmed && Object.keys(cache).length === 0) {
    const fetched = await safeFetch(fetcher, '')
    merge(cache, fetched)
    return { list: sort(fetched), cache, usedCache: false, reason: 'preload' }
  }

  // Normal fetch path
  const fetched = await safeFetch(fetcher, trimmed)
  if (fetched.length) {
    merge(cache, fetched)
    const list = trimmed ? filter(cache, trimmed) : Object.values(cache)
    return { list: sort(list), cache, usedCache: false, reason: 'fetch' }
  }

  // Fallback to cache if we have cached matches
  if (trimmed) {
    const cachedMatches = filter(cache, trimmed)
    if (cachedMatches.length) {
      return { list: sort(cachedMatches), cache, usedCache: true, reason: 'fallback' }
    }
  }
  return { list: [], cache, usedCache: true, reason: 'fallback' }
}

function filter(cache: Record<string, GuardianLite>, q: string) {
  const low = q.toLowerCase()
  return Object.values(cache).filter(g => g.fullName.toLowerCase().includes(low))
}

function merge(cache: Record<string, GuardianLite>, items: GuardianLite[]) {
  for (const g of items) cache[g.id] = g
}

function sort(list: GuardianLite[]) {
  if (list.length <= 1) return list
  return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName))
}

async function safeFetch(fetcher: (q: string) => Promise<GuardianLite[]>, q: string): Promise<GuardianLite[]> {
  try { return await fetcher(q) } catch { return [] }
}
