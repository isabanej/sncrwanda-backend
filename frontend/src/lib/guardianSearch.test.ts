import { describe, it, expect } from 'vitest'
import { resolveGuardianSearch, GuardianLite } from './guardianSearch'

function makeCache(list: GuardianLite[]): Record<string, GuardianLite> {
  const c: Record<string, GuardianLite> = {}
  for (const g of list) c[g.id] = g
  return c
}

describe('resolveGuardianSearch', () => {
  const base = [
    { id: '1', fullName: 'Janvier Doe' },
    { id: '2', fullName: 'Jane Smith' },
    { id: '3', fullName: 'John Public' }
  ]

  it('preloads when empty query and cache empty', async () => {
    const cache: Record<string, GuardianLite> = {}
    const result = await resolveGuardianSearch({
      prevQuery: '',
      nextQuery: '',
      cache,
      preload: true,
      fetcher: async () => base
    })
    expect(result.reason).toBe('preload')
    expect(result.list.length).toBe(3)
  })

  it('filters locally on shrink (backspace)', async () => {
    const cache = makeCache(base)
    const growth = await resolveGuardianSearch({
      prevQuery: 'Jan',
      nextQuery: 'Janv',
      cache,
      fetcher: async () => base.filter(g => g.fullName.toLowerCase().includes('janv'))
    })
    expect(growth.reason).toBe('fetch')
    const shrink = await resolveGuardianSearch({
      prevQuery: 'Janv',
      nextQuery: 'Jan',
      cache,
      fetcher: async () => [] // simulate server returning empty
    })
    expect(shrink.reason).toBe('shrink')
    expect(shrink.list.some(g => g.fullName.startsWith('Janv') || g.fullName.startsWith('Jan'))).toBe(true)
  })

  it('falls back to cache when fetch empty but cache has matches', async () => {
    const cache = makeCache(base)
    const res = await resolveGuardianSearch({
      prevQuery: 'Ja',
      nextQuery: 'Janv',
      cache,
      fetcher: async () => []
    })
    expect(res.reason).toBe('fallback')
    expect(res.list.length).toBeGreaterThan(0)
  })
})
