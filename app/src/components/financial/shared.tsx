import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Users, Cpu, Building2, Scale, ArrowLeftRight, ClipboardList, Plane, Layers } from 'lucide-react'
import { FIN_WS_COLORS, fmtVar } from '../../data/financial'

export const WS_ICON: Record<string, ReactNode> = {
  'Talent & Hiring': <Users size={14} />, 'Technology & Infrastructure': <Cpu size={14} />, 'Facilities & Workplace': <Building2 size={14} />, 'Legal & Compliance': <Scale size={14} />,
  'Transition & Knowledge Transfer': <ArrowLeftRight size={14} />, 'Program Management': <ClipboardList size={14} />, 'Other (Travel, Misc)': <Plane size={14} />,
}
export function WsIcon({ name }: { name: string }) {
  return <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: `${FIN_WS_COLORS[name] ?? '#94A3B8'}22`, color: FIN_WS_COLORS[name] ?? '#64748B' }}>{WS_ICON[name] ?? <Layers size={14} />}</span>
}

/** Variance pill: negative / zero = favourable (green), positive = unfavourable (red). */
export function VariancePill({ value, digits = 1 }: { value: number; digits?: number }) {
  const bad = Math.round(value * 10 ** digits) > 0
  return <span className={clsx('inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11.5px] font-medium min-w-[36px]', bad ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700')}>{fmtVar(value, digits)}</span>
}

export function SpentBar({ pct, width = 76 }: { pct: number; width?: number }) {
  const color = pct >= 100 ? '#16A34A' : pct >= 65 ? '#1E5BBE' : '#5B9BF0'
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-8 text-right text-[12px]">{pct}%</span>
      <span className="h-2.5 rounded-full bg-slate-200 overflow-hidden" style={{ width }}><span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} /></span>
    </span>
  )
}

/** Plain table shell for custom tables that need a total row. */
export function Tbl({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('overflow-x-auto scroll-thin', className)}><table className="w-full border-separate border-spacing-0 tbl">{children}</table></div>
}
export const num = (v: number, d = 1) => v.toFixed(d)
export const TOTAL_ROW = 'bg-surface/70 font-semibold'

export function StatBox({ label, value, sub, tone = 'text-ink-900' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="card px-4 py-3 min-w-0">
      <div className="text-[12px] text-ink-500">{label}</div>
      <div className={clsx('text-[20px] font-bold leading-tight mt-0.5', tone)}>{value}</div>
      {sub && <div className="text-[11.5px] text-ink-500 mt-0.5">{sub}</div>}
    </div>
  )
}

const KPI_TONE: Record<string, string> = { blue: 'bg-blue-50 text-brand-600', red: 'bg-red-50 text-red-600', green: 'bg-green-50 text-green-600', teal: 'bg-teal-50 text-teal-600', navy: 'bg-slate-100 text-navy-800' }
const KPI_TEXT: Record<string, string> = { blue: 'text-brand-600', red: 'text-red-600', green: 'text-green-600', teal: 'text-teal-600', navy: 'text-navy-900' }
/** KPI tile sized for the six long finance labels (icon 36px, label may wrap to two lines). */
export function FinKpi({ icon, value, label, sub, tone = 'blue', iconTone }: { icon: ReactNode; value: string; label: string; sub: string; tone?: string; iconTone?: string }) {
  return (
    <div className="card px-2 py-2.5 flex items-center gap-2 min-w-0">
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', KPI_TONE[iconTone ?? tone])}>{icon}</div>
      <div className="min-w-0">
        <div className={clsx('text-[21px] font-bold leading-tight tracking-tight whitespace-nowrap', KPI_TEXT[tone])}>{value}</div>
        <div className="text-[11px] text-ink-700 font-medium leading-tight tracking-[-0.01em]">{label}</div>
        <div className="text-[11px] text-ink-500 leading-tight mt-0.5 whitespace-nowrap">{sub}</div>
      </div>
    </div>
  )
}
