import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine } from 'recharts'
import { Legend, type Column } from '../ui'
import { tooltipStyle } from '../charts'
import { CHART_COLORS } from '../../data/common'
import { FUNNEL_COLORS, HC_VIEWS, type FunnelStage, type BuHeadcount, type CapHeadcount, type HcView } from '../../data/resources'
import type { HcPoint } from './useResourceData'
import type { Money } from '../../data/money'

/* ---------- ₹ Lakh helpers (money.ts only exposes a string formatter for Lakh fields) ---------- */
const LAKH = 1e5
/** Lakh → display number (₹ L stays as is, € K otherwise). */
export const lakhToDisplay = (lakh: number, m: Money) => (m.currency === 'INR' ? lakh : (lakh * LAKH) / m.rate / 1e3)
/** Display number (₹ L | € K) → ₹ Lakh for storage. */
export const lakhToBase = (d: number, m: Money) => (m.currency === 'INR' ? d : (d * 1e3 * m.rate) / LAKH)
/** Number-only Lakh cell: "14.0" | "15.2". */
export const lakhNum = (lakh: number, m: Money) => lakhToDisplay(lakh, m).toFixed(1)
/** Rounded display number for <Input value=...>. */
export const lakhInput = (lakh: number, m: Money) => +lakhToDisplay(lakh, m).toFixed(m.currency === 'INR' ? 2 : 3)

/* ---------- Inline-grid cell classes (same look as GCC Setup / Target Footprint grids) ---------- */
export const GRID_CELL = 'w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-[12px] outline-none hover:border-slate-300 focus:border-brand-400 focus:bg-white'
export const GRID_TH = 'text-left text-[11.5px] font-semibold text-slate-600 px-1.5 py-1.5 bg-slate-100 border-b border-slate-300 whitespace-nowrap'
export const GRID_TD = 'border-b border-slate-200 px-0.5 py-0.5 align-middle'

/** Blue clickable role name that opens the requisition drill-down (stops the row's own click). */
export function RoleLink({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return <button type="button" className={clsx('text-brand-600 font-medium hover:underline cursor-pointer text-left', className)} onClick={(e) => { e.stopPropagation(); onClick() }}>{label}</button>
}

/** Badge colours for candidate statuses that the shared Badge map does not know. */
export const candidateBadge: Record<string, string> = {
  'In process': 'bg-blue-50 text-brand-600', Offer: 'bg-violet-50 text-violet-700', Rejected: 'bg-red-50 text-red-700', Withdrawn: 'bg-slate-100 text-slate-600', Joined: 'bg-green-50 text-green-700',
  'In Interview': 'bg-blue-50 text-brand-600', 'On Hold': 'bg-slate-100 text-slate-600',
}

/** "Nov 26" → month on the first line, year on the second (12 ramp months in a narrow chart). */
function MonthTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const [mo, yr] = String(payload?.value ?? '').split(' ')
  return <text x={x} y={y} textAnchor="middle" fill="#6B7280" fontSize={10}><tspan x={x} dy={10}>{mo}</tspan><tspan x={x} dy={11} fill="#9CA3AF">{yr ? `'${yr}` : ''}</tspan></text>
}

/** Two-line X-axis tick for long category names. */
export function WrapTick({ x, y, payload, size = 11 }: { x?: number; y?: number; payload?: { value: string }; size?: number }) {
  const raw = String(payload?.value ?? '')
  const words = raw.split(' ')
  const lines = raw.includes('\n') ? raw.split('\n') : words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : words.length === 2 && raw.length > 11 ? [words[0], words[1]] : [raw]
  return (
    <text x={x} y={y} textAnchor="middle" fill="#6B7280" fontSize={size}>
      {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 12 : 13}>{l}</tspan>)}
    </text>
  )
}

/** Linear funnel (as in the mock-up) – widths shrink evenly, colours per stage. */
export function Funnel({ stages, width = 130, height = 160 }: { stages: FunnelStage[]; width?: number; height?: number }) {
  const n = Math.max(stages.length, 1)
  const gap = 3
  const h = (height - gap * (n - 1)) / n
  const minW = 0.3
  return (
    <svg width={width} height={height} className="shrink-0">
      {stages.map((s, i) => {
        const top = 1 - (i / n) * (1 - minW)
        const bot = 1 - ((i + 1) / n) * (1 - minW)
        const y = i * (h + gap)
        const x1 = ((1 - top) / 2) * width, x2 = width - x1
        const x3 = ((1 - bot) / 2) * width, x4 = width - x3
        return <polygon key={s.id} points={`${x1},${y} ${x2},${y} ${x4},${y + h} ${x3},${y + h}`} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]}><title>{s.stage}: {s.candidates.toLocaleString('en-IN')}</title></polygon>
      })}
    </svg>
  )
}

export const HC_LEGEND = [{ label: 'Onboarded', color: CHART_COLORS.blue }, { label: 'In Hiring', color: CHART_COLORS.blueLight }, { label: 'Open', color: CHART_COLORS.blueFaint }]

/**
 * Horizontal stacked bars: Onboarded | In Hiring | Open with the total at right. Business-unit rows expand to their
 * capabilities (same scale) so the domain → capability level is visible wherever headcount is shown.
 */
export function StackedHeadcountBars({ rows, labelWidth = 150, onRowClick, expandable = true, initiallyOpen = [], dense }: {
  rows: BuHeadcount[]; labelWidth?: number; onRowClick?: (r: BuHeadcount) => void; expandable?: boolean; initiallyOpen?: string[]; dense?: boolean
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(initiallyOpen))
  const max = Math.max(...rows.map((r) => r.onboarded + r.inHiring + r.open), 1)
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const seg = (v: number, color: string, text: string, key: string) => {
    const pct = (v / max) * 100
    return <div key={key} className="h-full flex items-center justify-center text-[11px] font-medium overflow-hidden" style={{ width: `${pct}%`, background: color, color: text }}>{pct >= 7 ? v : ''}</div>
  }
  const bar = (r: { onboarded: number; inHiring: number; open: number }, h: string) => (
    <div className={clsx('flex-1 flex rounded-sm overflow-hidden', h)}>
      {seg(r.onboarded, CHART_COLORS.blue, '#fff', 'a')}
      {seg(r.inHiring, CHART_COLORS.blueLight, '#fff', 'b')}
      {seg(r.open, '#D6E4F7', '#1F2937', 'c')}
    </div>
  )
  return (
    <div className={dense ? 'space-y-[6px]' : 'space-y-[8px]'}>
      {rows.map((r) => {
        const isOpen = open.has(r.id)
        const canExpand = expandable && r.capabilities.length > 0
        return (
          <div key={r.id}>
            <div className={clsx('flex items-center gap-2 text-[12px] rounded-md', (canExpand || onRowClick) && 'cursor-pointer hover:bg-surface')} onClick={() => { if (canExpand) toggle(r.id); onRowClick?.(r) }} title={canExpand ? `${isOpen ? 'Hide' : 'Show'} capabilities` : r.businessUnit}>
              <span className="flex items-center gap-1 text-ink-700 shrink-0 text-[11.5px]" style={{ width: labelWidth }}>
                {canExpand ? <ChevronRight size={12} className={clsx('text-ink-400 shrink-0 transition-transform', isOpen && 'rotate-90')} /> : <span className="w-3 shrink-0" />}
                <span className="truncate" title={r.businessUnit}>{r.businessUnit}</span>
              </span>
              {bar(r, 'h-[17px]')}
              <span className="w-9 text-right font-semibold text-ink-900 text-[12.5px]">{r.onboarded + r.inHiring + r.open}</span>
            </div>
            {isOpen && r.capabilities.map((c: CapHeadcount) => (
              <div key={c.id} className="flex items-center gap-2 text-[11.5px] mt-[4px]" title={`${c.capability}: ${c.onboarded} onboarded · ${c.inHiring} in hiring · ${c.open} open · plan ${c.plan} · year-1 target ${c.target}`}>
                <span className="text-ink-500 truncate shrink-0 pl-5" style={{ width: labelWidth }}>{c.capability}</span>
                {bar(c, 'h-[12px]')}
                <span className="w-9 text-right text-ink-700">{c.onboarded + c.inHiring + c.open}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/** Segmented "Year 1 month-wise | Years 2–5 annual" selector used by every headcount view. */
export function HcViewToggle({ value, onChange, size = 'sm' }: { value: HcView; onChange: (v: HcView) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-md border border-line bg-white p-0.5 shrink-0" role="tablist" aria-label="Year">
      {HC_VIEWS.map((v) => (
        <button key={v} role="tab" aria-selected={v === value} onClick={() => onChange(v)}
          className={clsx('rounded px-2 font-medium whitespace-nowrap cursor-pointer transition-colors', size === 'sm' ? 'py-0.5 text-[11px]' : 'py-1 text-[12px]', v === value ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-surface')}>{v}</button>
      ))}
    </div>
  )
}

/**
 * Headcount plan vs actual: year 1 month-wise (plan from the ramp, actual up to the reporting month, plan only after it)
 * or years 2–5 as annual bars (plan only). The target line is the year-1 Pune target.
 */
export function HeadcountChart({ data, view, target, height = 190, reportingMonth }: { data: HcPoint[]; view: HcView; target?: number; height?: number; reportingMonth?: string }) {
  const top = Math.max(target ?? 0, ...data.flatMap((d) => [d.Planned, d.Actual ?? 0]))
  const step = top > 600 ? 200 : 100
  const max = Math.max(step, Math.ceil((top * 1.05) / step) * step)
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step)
  const annual = view !== 'Year 1 month-wise'
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 14, right: 8, left: -18, bottom: 0 }} barGap={2} barCategoryGap={annual ? '42%' : '26%'}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} height={annual ? 22 : 30} tick={annual ? { fontSize: 11.5 } : <MonthTick />} />
          <YAxis tickLine={false} axisLine={false} domain={[0, max]} ticks={ticks} />
          <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v, n) => [v === null || v === undefined ? '—' : v, String(n)]} labelFormatter={(l) => (annual ? `${l} (annual exit headcount)` : `${l}${l === reportingMonth ? ' · reporting month' : ''}`)} />
          {reportingMonth && !annual && <ReferenceLine x={reportingMonth} stroke="#CBD5E1" strokeDasharray="4 3" />}
          {target !== undefined && <ReferenceLine y={target} stroke={CHART_COLORS.green} strokeDasharray="5 4" />}
          <Bar dataKey="Planned" fill="#9CC3F7" radius={[3, 3, 0, 0]} isAnimationActive={false}>{annual && <LabelList dataKey="Planned" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} />}</Bar>
          <Bar dataKey="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Dense table with its own cell classes (the shared `.td`/`.th` classes are unlayered CSS and override utility padding). */
export function CompactTable<T extends { id: string }>({ columns, rows, onRowClick, empty = 'No records yet.' }: { columns: Column<T>[]; rows: T[]; onRowClick?: (r: T) => void; empty?: string }) {
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={clsx('text-left text-[11.5px] font-medium text-ink-500 px-1 first:pl-2 last:pr-2 py-1.5 bg-surface/70 first:rounded-l-md last:rounded-r-md whitespace-nowrap', c.className)} style={{ width: c.width }}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td className="px-1.5 py-5 text-[12px] text-ink-500 text-center" colSpan={columns.length}>{empty}</td></tr>}
          {rows.map((r, i) => (
            <tr key={r.id} onClick={() => onRowClick?.(r)} className={clsx(onRowClick && 'cursor-pointer hover:bg-brand-50/60')}>
              {columns.map((c) => (
                <td key={c.key} className={clsx('px-1 first:pl-2 last:pr-2 py-[7px] text-[12px] text-ink-900 align-middle', i < rows.length - 1 && 'border-b border-line/70', c.className)}>
                  {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardLegend({ items }: { items: { label: string; color: string; dashed?: boolean; hollow?: boolean }[] }) {
  return (
    <div className="flex items-center gap-x-3 text-[11.5px] text-ink-700">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.hollow ? <span className="w-2.5 h-2.5 rounded-[3px] border-2" style={{ borderColor: i.color }} /> : i.dashed ? <span className="w-4 border-t-2" style={{ borderColor: i.color }} /> : <span className="w-2.5 h-2.5 rounded-full" style={{ background: i.color }} />}
          {i.label}
        </span>
      ))}
    </div>
  )
}

export function MiniStat({ label, value, sub, tone = 'text-ink-900' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="card px-4 py-3 min-w-0">
      <div className="text-[12px] text-ink-500">{label}</div>
      <div className={`text-[20px] font-bold leading-tight mt-0.5 ${tone}`}>{value}</div>
      {sub && <div className="text-[11.5px] text-ink-500 mt-0.5">{sub}</div>}
    </div>
  )
}

export { Legend }
