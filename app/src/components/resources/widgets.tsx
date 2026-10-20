import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Legend, type Column } from '../ui'
import { CHART_COLORS } from '../../data/common'
import { FUNNEL_COLORS, type FunnelStage, type WorkstreamHeadcount } from '../../data/resources'
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

/** Two-line X-axis tick for long category names. */
export function WrapTick({ x, y, payload, size = 11 }: { x?: number; y?: number; payload?: { value: string }; size?: number }) {
  const raw = String(payload?.value ?? '')
  const words = raw.split(' ')
  const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : words.length === 2 && raw.length > 11 ? [words[0], words[1]] : [raw]
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

/** Horizontal stacked bars: Onboarded | In Hiring | Open with total at right. */
export function StackedHeadcountBars({ rows, labelWidth = 150, onRowClick, format = (n: number) => String(n) }: { rows: WorkstreamHeadcount[]; labelWidth?: number; onRowClick?: (r: WorkstreamHeadcount) => void; format?: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.onboarded + r.inHiring + r.open), 1)
  const seg = (v: number, color: string, text: string, key: string) => {
    const pct = (v / max) * 100
    return <div key={key} className="h-full flex items-center justify-center text-[11px] font-medium overflow-hidden" style={{ width: `${pct}%`, background: color, color: text }}>{pct >= 7 ? v : ''}</div>
  }
  return (
    <div className="space-y-[9px]">
      {rows.map((r) => (
        <div key={r.id} className={`flex items-center gap-2 text-[12px] ${onRowClick ? 'cursor-pointer hover:bg-surface rounded-md' : ''}`} onClick={() => onRowClick?.(r)}>
          <span className="text-ink-700 truncate shrink-0 text-[11.5px]" style={{ width: labelWidth }}>{r.workstream}</span>
          <div className="flex-1 h-[17px] flex rounded-sm overflow-hidden">
            {seg(r.onboarded, CHART_COLORS.blue, '#fff', 'a')}
            {seg(r.inHiring, CHART_COLORS.blueLight, '#fff', 'b')}
            {seg(r.open, '#D6E4F7', '#1F2937', 'c')}
          </div>
          <span className="w-9 text-right font-semibold text-ink-900 text-[12.5px]">{format(r.onboarded + r.inHiring + r.open)}</span>
        </div>
      ))}
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
