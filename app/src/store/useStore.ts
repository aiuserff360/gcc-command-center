import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useMemo } from 'react'
import { variantSeed } from '../data/variants'
import { programDef } from '../data/common'

/**
 * Generic, collection-based store so every page can own its entities without
 * touching a shared schema. Each record needs a string `id`.
 *
 *   const { items, add, update, remove } = useCollection<Risk>('risks', seedRisks)
 *
 * `collections` always holds the data of the CURRENTLY selected GCC program; the
 * other programs' data sets are parked in `archive` and swapped in by setProgram().
 * A few collections are global (portfolio-level or configuration) and travel with
 * every program.
 */
export type WithId = { id: string }
export type Phase = 'Design' | 'Build' | 'Transition' | 'Operate' | 'Transform' | 'Transfer'
type Collections = Record<string, WithId[]>

export const GLOBAL_COLLECTIONS = new Set(['users', 'lookups', 'notificationSettings', 'recipients', 'reportSchedules'])

export interface User { name: string; role: string; initials: string }
export type Currency = 'INR' | 'EUR'
export type ViewMode = 'input' | 'output'

interface StoreState {
  collections: Collections
  archive: Record<string, Collections>
  phase: Phase
  program: string
  user: User | null
  currency: Currency
  eurRate: number
  /** Input view = data entry forms for every module; Output view = the dashboards */
  mode: ViewMode
  setMode: (m: ViewMode) => void
  setCurrency: (c: Currency) => void
  setEurRate: (r: number) => void
  login: (name: string, role: string) => void
  logout: () => void
  setPhase: (p: Phase) => void
  setProgram: (p: string) => void
  seed: (name: string, items: WithId[]) => void
  setAll: (name: string, items: WithId[]) => void
  upsert: (name: string, item: WithId) => void
  remove: (name: string, id: string) => void
  resetAll: () => void
}

const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').join('').slice(0, 2) || 'U'

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      collections: {},
      archive: {},
      phase: 'Build',
      program: 'ENGIE IT GCC - Pune',
      user: null,
      currency: 'INR',
      eurRate: 92,
      mode: 'output',
      setMode: (mode) => set({ mode }),
      setCurrency: (currency) => set({ currency }),
      setEurRate: (eurRate) => set({ eurRate: eurRate > 0 ? eurRate : 92 }),
      login: (name, role) => set({ user: { name: name.trim(), role: role.trim() || 'Program Manager', initials: initials(name) }, mode: 'input' }),
      logout: () => set({ user: null }),
      setPhase: (phase) => set({ phase }),
      setProgram: (program) => {
        const s = get()
        if (program === s.program) return
        const globals: Collections = {}
        const local: Collections = {}
        for (const [k, v] of Object.entries(s.collections)) (GLOBAL_COLLECTIONS.has(k) ? globals : local)[k] = v
        const next = { ...(s.archive[program] ?? {}), ...globals }
        set({ program, phase: programDef(program).phase, collections: next, archive: { ...s.archive, [s.program]: local } })
      },
      seed: (name, items) => {
        if (get().collections[name]) return
        set((s) => ({ collections: { ...s.collections, [name]: items } }))
      },
      setAll: (name, items) => set((s) => ({ collections: { ...s.collections, [name]: items } })),
      upsert: (name, item) =>
        set((s) => {
          const list = s.collections[name] ?? []
          const idx = list.findIndex((x) => x.id === item.id)
          const next = idx >= 0 ? list.map((x) => (x.id === item.id ? { ...x, ...item } : x)) : [...list, item]
          return { collections: { ...s.collections, [name]: next } }
        }),
      remove: (name, id) =>
        set((s) => ({ collections: { ...s.collections, [name]: (s.collections[name] ?? []).filter((x) => x.id !== id) } })),
      resetAll: () => set({ collections: {}, archive: {} }),
    }),
    { name: 'gcc-command-center-v3' },
  ),
)

export function useCollection<T extends WithId>(name: string, seedItems: T[]) {
  const items = useStore((s) => s.collections[name]) as T[] | undefined
  const program = useStore((s) => s.program)
  const seed = useStore((s) => s.seed)
  const upsert = useStore((s) => s.upsert)
  const remove = useStore((s) => s.remove)
  const setAll = useStore((s) => s.setAll)
  const variant = useMemo(() => (GLOBAL_COLLECTIONS.has(name) ? seedItems : variantSeed(name, seedItems, program)), [name, seedItems, program])
  useEffect(() => {
    if (!items) seed(name, variant)
  }, [items, name, seed, variant])
  return {
    items: (items ?? variant) as T[],
    add: (item: T) => upsert(name, item),
    update: (item: T) => upsert(name, item),
    remove: (id: string) => remove(name, id),
    setAll: (list: T[]) => setAll(name, list),
  }
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}
