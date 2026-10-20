/**
 * Derives a program-specific seed from the India baseline so that switching the
 * "GCC Program" selector shows a genuinely different data set (Poland = early
 * Design-phase program, Philippines = Transition-phase program).
 *
 * Rules (deterministic, so the demo is stable):
 *  - %-type numeric fields (progress, completion, readiness, adherence, …) are
 *    multiplied by `pctScale` and capped at 100.
 *  - ratio/score/index/rate fields are left alone.
 *  - every other number (money, headcount, counts, days) is multiplied by `scale`,
 *    keeping the original number of decimals.
 *  - city names are swapped to the program's locations, "India" → country.
 *  - date strings, ids, codes and statuses are left untouched.
 */
import { PROGRAMS, programDef } from './common'

const PCT_KEYS = /(pct|percent|progress|completion|readiness|adherence|utiliz|coverage|health|onTrack|realized|stabiliz|kt|transfer)/i
const KEEP_KEYS = /(^id$|code|year|month|quarter|day|version|level|likelihood|impact$|weight|score|index|rate|irr|ratio|share|conversion|factor|threshold|order|number|wave|seq|size$|color|colour)/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}/

function scaleNumber(key: string, n: number, scale: number, pctScale: number): number {
  if (!Number.isFinite(n) || n === 0) return n
  if (KEEP_KEYS.test(key)) return n
  const decimals = (String(n).split('.')[1] ?? '').length
  if (PCT_KEYS.test(key) || (n <= 100 && n >= 0 && /percent|%/.test(key))) {
    const v = Math.min(100, n * pctScale)
    return decimals ? +v.toFixed(decimals) : Math.round(v)
  }
  const v = n * scale
  const money = /(cr$|crore|lakh|amount|budget|spend|cost|forecast|commit|actual|invoic|paid|benefit|saving|invest|value)/i.test(key)
  if (decimals || money) return +v.toFixed(Math.max(decimals, money ? 1 : 0))
  return Math.max(n > 0 ? 1 : -1, Math.round(v))
}

function swapText(s: string, program: string): string {
  const p = programDef(program)
  const india = PROGRAMS[0]
  let out = s
  india.locations.forEach((city, i) => { out = out.split(city).join(p.locations[i]) })
  out = out.split('India').join(p.country).split('Indian').join(p.country === 'Poland' ? 'Polish' : 'Filipino')
  return out
}

function transform(value: unknown, key: string, program: string, scale: number, pctScale: number): unknown {
  if (typeof value === 'number') return scaleNumber(key, value, scale, pctScale)
  if (typeof value === 'string') return DATE_RE.test(value) ? value : swapText(value, program)
  if (Array.isArray(value)) return value.map((v) => transform(v, key, program, scale, pctScale))
  if (value && typeof value === 'object') {
    const o: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) o[k] = k === 'id' ? v : transform(v, k, program, scale, pctScale)
    return o
  }
  return value
}

/** Collections whose records must NOT be scaled per program (names, structure). */
const STRUCTURAL = new Set(['users', 'lookups', 'notificationSettings', 'raci', 'controls', 'ragCriteria', 'recipients', 'reportSchedules', 'fieldMappings', 'webhooks', 'integrationSettings'])

export function variantSeed<T extends { id: string }>(name: string, seed: T[], program: string): T[] {
  const p = programDef(program)
  if (p === PROGRAMS[0]) return seed
  if (STRUCTURAL.has(name)) return seed
  const out = transform(seed, name, program, p.scale, p.pctScale) as T[]
  // Program-level KPI record carries the program identity explicitly
  if (name === 'programKpis') {
    return out.map((r) => ({ ...r, programName: p.name, lifecyclePhase: p.phase }))
  }
  return out
}
