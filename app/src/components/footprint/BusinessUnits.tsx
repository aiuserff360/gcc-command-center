/**
 * Business units (IT domains) and their capabilities (sub-units) – the organisation model of the ENGIE IT GCC.
 *
 *   useBusinessUnits()  →  { items (rolled-up domains), add, update, remove, setAll, subUnits: { items, add, update, remove, setAll } }
 *
 * Domain-level y1..y5 are always derived from the capabilities (`rollUpUnits`), so every page that reads the
 * units through this hook sees the same headcount as the Target Footprint and GCC Setup.
 * The editors live in ./OrgStructure.tsx (structure) and ./HeadcountRamp.tsx (ramp); the Output view in ./FootprintOutput.tsx.
 */
import { useEffect, useMemo } from 'react'
import { Cloud, Laptop, ShieldCheck, AppWindow, Database, Workflow, Settings2, Boxes, type LucideIcon } from 'lucide-react'
import { useCollection, useStore } from '../../store/useStore'
import { variantSeed } from '../../data/variants'
import { seedBusinessUnits, seedSubUnits, rollUpUnits, type BusinessUnit, type SubUnit } from '../../data/businessUnits'

export function useBusinessUnits() {
  const units = useCollection<BusinessUnit>('businessUnits', seedBusinessUnits)
  const subs = useCollection<SubUnit>('subUnits', seedSubUnits)
  const program = useStore((s) => s.program)
  // One-time migration: units persisted in the old practice / shared-services shape (no IT domains at all) are
  // replaced by the ENGIE organisation model so the capabilities below them resolve.
  const legacy = units.items.length > 0 && !units.items.some((u) => u.kind === 'IT Domain') && !subs.items.some((s) => units.items.some((u) => u.id === s.businessUnitId))
  useEffect(() => {
    if (!legacy) return
    units.setAll(variantSeed('businessUnits', seedBusinessUnits, program))
    subs.setAll(variantSeed('subUnits', seedSubUnits, program))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacy, program])
  const items = useMemo(() => rollUpUnits(units.items, subs.items), [units.items, subs.items])
  return { items, add: units.add, update: units.update, remove: units.remove, setAll: units.setAll, subUnits: subs }
}

/* ------------------------------------------------------------------ */
/* Shared presentation helpers                                         */
/* ------------------------------------------------------------------ */
/** Categorical palette for the IT domains (fixed order, CVD-validated against the light surface). */
export const DOMAIN_COLORS = ['#1E5BBE', '#F97316', '#0D9488', '#8B5CF6', '#0EA5E9', '#CA8A04', '#DB2777', '#64748B']
export const domainColor = (i: number) => DOMAIN_COLORS[i % DOMAIN_COLORS.length]
/** Geography palette (same order as GEOGRAPHIES). */
export const GEO_COLORS = ['#1E5BBE', '#0EA5E9', '#0D9488', '#CA8A04']

const ICONS: Record<string, LucideIcon> = { Cloud, Laptop, ShieldCheck, AppWindow, Database, Workflow, Settings2, Boxes }
export function DomainIcon({ name, size = 15, className }: { name?: string; size?: number; className?: string }) {
  const I = (name && ICONS[name]) || Boxes
  return <I size={size} className={className} />
}
export const ICON_NAMES = Object.keys(ICONS)

/** Short labels for the geography on tiles and dense tables. */
export const geoShort = (g: string) => (g.startsWith('Global') ? 'Global' : g.startsWith('AMEA') ? 'AMEA' : g)
/** "Wave 1" → "W1" */
export const waveShort = (w: string) => w.replace(/^Wave\s*/i, 'W')
export const WAVE_BADGE: Record<string, string> = {
  'Wave 1': 'bg-violet-50 text-violet-700', 'Wave 2': 'bg-orange-50 text-orange-700', 'Wave 3': 'bg-pink-50 text-pink-700', 'Wave 4': 'bg-amber-50 text-amber-700', 'Wave 5': 'bg-teal-50 text-teal-700',
}
/** "Nov 26" → "Nov 2026" */
export const monthLong = (m: string) => m.replace(/ (\d\d)$/, ' 20$1')
/** "Nov 26" → "Nov-26" (chart axis style of the client's slide) */
export const monthAxis = (m: string) => m.replace(' ', '-')
/** Index of the month in which a cumulative ramp first reaches its final value. */
export const monthReached = (ramp: number[]) => { const last = ramp[ramp.length - 1] ?? 0; const i = ramp.findIndex((v) => v === last); return i < 0 ? ramp.length - 1 : i }
/** Index of the first month with headcount. */
export const monthStarted = (ramp: number[]) => { const i = ramp.findIndex((v) => v > 0); return i < 0 ? 0 : i }
