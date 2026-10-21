/**
 * Shared bits for the cost-model Input tabs and Output sub-tabs: money helpers for ₹ Lakh-stored
 * inputs, the business-unit card selector, reference / "vs ref" cells and inline grid cells.
 */
import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Building2 } from 'lucide-react'
import { Card, Badge } from '../../ui'
import type { Money } from '../../../data/money'
import { SERIES } from '../../../data/common'
import type { BusinessUnit } from '../../../data/businessUnits'
import { vsRef, type Check } from '../../../data/costModel'

/* ---------- money for ₹ Lakh-stored inputs ---------- */
export type LakhScale = 'L' | 'k'
const LAKH = 1e5
/** Lakh → display number. 'L': ₹ L | € K; 'k': ₹ thousand | € (for small monthly / per-employee items). */
export function lakhDisplay(m: Money, lakh: number, scale: LakhScale = 'L') {
  if (m.currency === 'INR') return scale === 'L' ? lakh : lakh * 100
  const eur = (lakh * LAKH) / m.rate
  return scale === 'L' ? eur / 1e3 : eur
}
export function lakhBase(m: Money, display: number, scale: LakhScale = 'L') {
  if (m.currency === 'INR') return scale === 'L' ? display : display / 100
  const eur = scale === 'L' ? display * 1e3 : display
  return (eur * m.rate) / LAKH
}
export const lakhDigits = (m: Money, scale: LakhScale) => (scale === 'L' ? (m.currency === 'INR' ? 1 : 1) : m.currency === 'INR' ? 1 : 0)
export const lakhNum = (m: Money, lakh: number, scale: LakhScale = 'L', digits?: number) => lakhDisplay(m, lakh, scale).toFixed(digits ?? lakhDigits(m, scale))
export const lakhUnit = (m: Money, scale: LakhScale = 'L') => (scale === 'L' ? m.lakhUnitLabel : m.currency === 'INR' ? '₹ k' : '€')
/** "₹ 36.8 L" | "€ 40.0 K" (scale 'L'); "₹ 14k" | "€ 152" (scale 'k'). */
export const lakhFmt = (m: Money, lakh: number, scale: LakhScale = 'L', digits?: number) => {
  const n = lakhNum(m, lakh, scale, digits)
  if (scale === 'L') return m.currency === 'INR' ? `₹ ${n} L` : `€ ${n} K`
  return m.currency === 'INR' ? `₹ ${n}k` : `€ ${n}`
}
/** Rupee-stored unit rates (per sq ft): "₹ 95" | "€ 1.03". */
export const rupeeNum = (m: Money, v: number) => (m.currency === 'INR' ? v.toFixed(0) : (v / m.rate).toFixed(2))
export const rupeeUnit = (m: Money) => (m.currency === 'INR' ? '₹' : '€')
/** Headcount-type numbers: whole for ≥ 10, one decimal below. */
export const hc = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(Number.isInteger(v) ? 0 : 1))
export const pct1 = (v: number) => `${v.toFixed(1)}%`

/* ---------- inline grid cells (same look as the other Input views) ---------- */
export const gcell = 'bg-transparent border border-transparent rounded px-1.5 py-1 text-[12px] outline-none hover:border-slate-300 focus:border-brand-400 focus:bg-white tabular-nums'
export const gth = 'text-left text-[11.5px] font-semibold text-slate-600 px-2 py-1.5 bg-slate-100 border-b border-slate-300 whitespace-nowrap'
export const gtd = 'border-b border-slate-200 px-1 py-0.5 align-middle text-[12px]'
export const gref = 'text-right text-[12px] text-ink-500 px-2 tabular-nums'

export function NumInput({ value, onChange, width = 76, step = 'any', min, className, suffix, disabled }: { value: number; onChange: (v: number) => void; width?: number; step?: number | 'any'; min?: number; className?: string; suffix?: string; disabled?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <span className={clsx('inline-flex items-center gap-1', className)}>
      <input type="number" step={step} min={min} disabled={disabled} className={clsx(gcell, 'text-right', disabled && 'text-ink-400')} style={{ width }} value={draft ?? String(+value.toFixed(4))}
        onFocus={() => setDraft(String(+value.toFixed(4)))} onBlur={() => setDraft(null)}
        onChange={(e) => { const raw = e.target.value; setDraft(raw); const n = parseFloat(raw); if (!isNaN(n)) onChange(min != null ? Math.max(min, n) : n); else if (raw.trim() === '') onChange(0) }} />
      {suffix && <span className="text-[11px] text-ink-400">{suffix}</span>}
    </span>
  )
}
/** Lakh-stored money cell shown / edited in the display currency. */
export function MoneyInput({ m, lakh, onChange, scale = 'L', width = 84, disabled }: { m: Money; lakh: number; onChange: (lakh: number) => void; scale?: LakhScale; width?: number; disabled?: boolean }) {
  // display precision: ₹ L 3 decimals (small items), € K 2, ₹ k 2, € 0
  const dp = scale === 'L' ? (m.currency === 'INR' ? 3 : 2) : m.currency === 'INR' ? 2 : 0
  return <NumInput key={`${m.currency}-${m.rate}-${scale}`} value={+lakhDisplay(m, lakh, scale).toFixed(dp)} onChange={(v) => onChange(+lakhBase(m, v, scale).toFixed(5))} width={width} min={0} disabled={disabled} />
}
export function RupeeInput({ m, value, onChange, width = 76 }: { m: Money; value: number; onChange: (v: number) => void; width?: number }) {
  return <NumInput key={`${m.currency}-${m.rate}`} value={+(m.currency === 'INR' ? value : value / m.rate).toFixed(2)} onChange={(v) => onChange(+(m.currency === 'INR' ? v : v * m.rate).toFixed(2))} width={width} min={0} />
}
export function PctInput({ value, onChange, width = 60, disabled }: { value: number; onChange: (v: number) => void; width?: number; disabled?: boolean }) {
  return <NumInput value={value} onChange={onChange} width={width} min={0} suffix="%" disabled={disabled} />
}

/** "vs reference" pill. */
export function VsRef({ value, ref }: { value: number; ref: number }) {
  const d = vsRef(value, ref)
  if (!ref && !value) return <span className="text-[11px] text-ink-400">—</span>
  const at = Math.abs(d) < 0.5
  return <span className={clsx('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap', at ? 'bg-slate-100 text-slate-600' : d > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700')}>{at ? 'at ref' : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(0)} %`}</span>
}
export function RefCell({ children }: { children: ReactNode }) { return <td className={clsx(gtd, gref)}>{children}</td> }

/** Three-way mode switch (Same across all years / Apply annual escalation / Customise by year). */
export function ModeToggle<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <span className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => <button key={o.key} onClick={() => onChange(o.key)} className={clsx('px-3 py-1 rounded-md text-[12px] font-medium cursor-pointer', value === o.key ? 'bg-white shadow-sm text-brand-600' : 'text-ink-700 hover:text-ink-900')}>{o.label}</button>)}
    </span>
  )
}

/** Small white button used for "Fill from industry reference" style actions. */
export function MiniBtn({ onClick, children, danger }: { onClick: () => void; children: ReactNode; danger?: boolean }) {
  return <button className={clsx('btn-secondary text-[12px] py-1', danger && 'text-red-600 hover:bg-red-50')} onClick={onClick}>{children}</button>
}

/* ---------- business-unit card selector (same pattern as Resource Allocation / Transition) ---------- */
export interface UnitCard { id: string; name: string; kind: string; big: ReactNode; sub: string; foot?: ReactNode; color?: string }
export function UnitSelector({ title, subtitle, cards, selected, onSelect, action }: { title: string; subtitle?: string; cards: UnitCard[]; selected: string; onSelect: (id: string) => void; action?: ReactNode }) {
  return (
    <Card title={title} subtitle={subtitle} headerRight={
      <div className="flex items-center gap-2">
        {action}
        <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 min-w-[280px] cursor-pointer">
          <Building2 size={16} className="text-brand-600" />
          <select value={selected} onChange={(e) => onSelect(e.target.value)} className="flex-1 bg-transparent outline-none text-[13.5px] font-semibold text-ink-900 cursor-pointer">
            {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>}>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(cards.length, 8)}, minmax(0, 1fr))` }}>
        {cards.map((c, i) => (
          <button key={c.id} onClick={() => onSelect(c.id)} className={clsx('text-left rounded-lg border px-3 py-2.5 cursor-pointer transition-colors min-w-0', c.id === selected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line bg-white hover:bg-surface')}>
            <div className="flex items-center gap-1.5 mb-1"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color ?? SERIES[i % SERIES.length] }} /><span className="text-[12.5px] font-semibold text-ink-900 truncate" title={c.name}>{c.name}</span></div>
            <div className="text-[10.5px] text-ink-500 truncate">{c.kind}</div>
            <div className="mt-1.5 text-[19px] font-bold text-navy-900 leading-none truncate">{c.big}</div>
            <div className="text-[10.5px] text-ink-500 truncate">{c.sub}</div>
            {c.foot && <div className="mt-1.5 text-[10.5px] truncate">{c.foot}</div>}
          </button>
        ))}
      </div>
    </Card>
  )
}
export const unitColor = (units: BusinessUnit[], id: string) => SERIES[Math.max(0, units.findIndex((u) => u.id === id)) % SERIES.length]

/* ---------- model check badge ---------- */
const CHECK_TONE: Record<Check['status'], string> = { pass: 'bg-green-50 text-green-700', warn: 'bg-amber-50 text-amber-700', fail: 'bg-red-50 text-red-700', info: 'bg-slate-100 text-slate-600' }
export function CheckBadge({ status }: { status: Check['status'] }) { return <Badge value={status} className={CHECK_TONE[status]} /> }
/** Replace the engine's amount tokens ({cr:n}, {l:n}, {k:n}) with the selected currency. */
export const fmtDetail = (m: Money, text: string) => text.replace(/\{cr:([\d.]+)\}/g, (_, n) => m.fmt(parseFloat(n))).replace(/\{l:([\d.]+)\}/g, (_, n) => lakhFmt(m, parseFloat(n))).replace(/\{k:([\d.]+)\}/g, (_, n) => lakhFmt(m, parseFloat(n), 'k'))
export const checkSummary = (checks: Check[]) => `${checks.filter((c) => c.status === 'pass').length} passed · ${checks.filter((c) => c.status === 'warn').length} warnings · ${checks.filter((c) => c.status === 'fail').length} failures`

/** Stat tile used on the Output sub-tabs (same look as resources MiniStat). */
export function Stat({ label, value, sub, tone = 'text-navy-900' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="card px-4 py-3 min-w-0">
      <div className="text-[11.5px] text-ink-500">{label}</div>
      <div className={clsx('text-[20px] font-bold leading-tight mt-0.5 truncate', tone)}>{value}</div>
      {sub && <div className="text-[11px] text-ink-500 mt-0.5 truncate">{sub}</div>}
    </div>
  )
}

export const tick = { fontSize: 11, fill: '#6B7280' }
export const YEAR_LABEL = (i: number, firstYear: number) => `Y${i + 1} · ${firstYear + i}`
