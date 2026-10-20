import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Users, Cpu, Scale, Building2, ArrowLeftRight, Settings2, Wallet, Layers, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { Ring, ConfirmDelete, Progress } from '../ui'
import type { WorkstreamSummary } from '../../data/shared'

/** WorkstreamSummary row as used on this page – may carry a designated key milestone id. */
export type WsRow = WorkstreamSummary & { keyMilestoneId?: string }

/* ---------- Workstream icon ---------- */
export function wsIcon(name: string, size = 15): ReactNode {
  if (name.startsWith('Talent')) return <Users size={size} />
  if (name.startsWith('Technology')) return <Cpu size={size} />
  if (name.startsWith('Legal')) return <Scale size={size} />
  if (name.startsWith('Facilities')) return <Building2 size={size} />
  if (name.startsWith('Transition')) return <ArrowLeftRight size={size} />
  if (name.startsWith('Operations')) return <Settings2 size={size} />
  if (name.startsWith('Finance')) return <Wallet size={size} />
  return <Layers size={size} />
}
export function WsIcon({ name, size = 15, box = 28, className }: { name: string; size?: number; box?: number; className?: string }) {
  return <span className={clsx('rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0', className)} style={{ width: box, height: box }}>{wsIcon(name, size)}</span>
}
export const WS_SHORT: Record<string, string> = {
  'Talent & Hiring': 'Talent', 'Technology & Infrastructure': 'Technology', 'Legal & Compliance': 'Legal', 'Facilities & Workplace': 'Facilities',
  'Transition Readiness': 'Transition', 'Operations Setup': 'Operations', 'Finance & Procurement': 'Finance',
}
export const shortWs = (n: string) => WS_SHORT[n] ?? n
export const progressColor = (v: number) => (v >= 80 ? '#16A34A' : v >= 65 ? '#5B9BF0' : '#F59E0B')
export const STATUS_COLOR: Record<string, string> = {
  'On Track': '#16A34A', Completed: '#16A34A', 'At Risk': '#F59E0B', Delayed: '#DC2626', Overdue: '#DC2626', 'Not Started': '#CBD5E1', Pending: '#94A3B8', 'In Progress': '#1E5BBE', Open: '#DC2626', Resolved: '#16A34A', Closed: '#94A3B8',
}
export const fmtCr2 = (v: number) => `₹ ${(+v).toFixed(2).replace(/\.?0+$/, '')} Cr`

/* ---------- KPI tile (local variant: tighter so 5 long labels fit on one row) ---------- */
type Tone = 'green' | 'blue' | 'violet' | 'red' | 'amber' | 'teal' | 'orange' | 'navy'
const toneBg: Record<Tone, string> = {
  green: 'bg-green-50 text-green-600', blue: 'bg-blue-50 text-brand-600', violet: 'bg-violet-50 text-violet-600', red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600', teal: 'bg-teal-50 text-teal-600', orange: 'bg-orange-50 text-orange-600', navy: 'bg-slate-100 text-navy-800',
}
const toneText: Record<Tone, string> = {
  green: 'text-green-600', blue: 'text-brand-600', violet: 'text-violet-600', red: 'text-red-600', amber: 'text-amber-600', teal: 'text-teal-600', orange: 'text-orange-600', navy: 'text-navy-900',
}
export function Kpi({ icon, value, label, sub, tone = 'blue', trend, ring, onClick }: {
  icon?: ReactNode; value: ReactNode; label: string; sub?: ReactNode; tone?: Tone; trend?: 'up' | 'down'; ring?: number; onClick?: () => void
}) {
  return (
    <div className={clsx('card px-2.5 py-3 flex items-center gap-2 min-w-0', onClick && 'cursor-pointer hover:border-brand-300')} onClick={onClick}>
      {ring !== undefined ? (
        <Ring value={ring} size={46} stroke={6} color="#16A34A" label={<span className="text-[11px] font-semibold text-green-600">{ring}%</span>} />
      ) : (
        <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center shrink-0', toneBg[tone])}>{icon}</div>
      )}
      <div className="min-w-0">
        <div className={clsx('text-[22px] font-bold leading-tight tracking-tight whitespace-nowrap', toneText[tone])}>{value}</div>
        <div className="text-[11px] text-ink-700 font-medium leading-snug whitespace-nowrap">{label}</div>
        {sub && (
          <div className="text-[10.5px] mt-0.5 flex items-center gap-1 text-ink-500 whitespace-nowrap">
            {trend === 'up' && <TrendingUp size={12} className="text-green-600" />}
            {trend === 'down' && <TrendingDown size={12} className="text-red-600" />}
            <span>{sub}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- Form helpers ---------- */
export function useFields<T extends object>(initial: T) {
  const [f, setF] = useState<T>(initial)
  const set = <K extends keyof T>(k: K, v: T[K]) => setF((p) => ({ ...p, [k]: v }))
  const txt = (k: keyof T) => ({
    value: String(f[k] ?? ''),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value as T[keyof T]),
  })
  const num = (k: keyof T) => ({
    type: 'number' as const, step: 'any', value: Number(f[k] ?? 0),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, (parseFloat(e.target.value) || 0) as T[keyof T]),
  })
  const chk = (k: keyof T) => ({
    type: 'checkbox' as const, checked: Boolean(f[k]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.checked as T[keyof T]),
  })
  return { f, set, setF, txt, num, chk }
}

/** Select with separate option values and labels (the shared Select uses the label as value). */
export function SelectKV({ options, allowEmpty, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; allowEmpty?: string }) {
  return (
    <select {...props} className={clsx('input', props.className)}>
      {allowEmpty !== undefined && <option value="">{allowEmpty}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function FormFooter({ onClose, onSave, onDelete, saveLabel = 'Save' }: { onClose: () => void; onSave: () => void; onDelete?: () => void; saveLabel?: string }) {
  return (
    <>
      {onDelete && <span className="mr-auto"><ConfirmDelete onConfirm={onDelete} /></span>}
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={onSave}>{saveLabel}</button>
    </>
  )
}

export function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-ink-900 mt-6 cursor-pointer">
      <input {...props} className="w-4 h-4 accent-brand-600" />{label}
    </label>
  )
}

/* ---------- Toolbar bits ---------- */
export function Toolbar({ children, right }: { children?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  )
}
export function MiniSelect({ label, value, options, onChange, width }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; width?: number }) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] cursor-pointer">
      <span className="text-ink-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent outline-none font-medium text-ink-900 cursor-pointer" style={{ maxWidth: width ?? 200 }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}
export function SearchBox({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px]">
      <Search size={13} className="text-ink-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="outline-none bg-transparent w-[160px]" />
    </label>
  )
}

/** Row of small stat chips used at the top of each tab. */
export function Strip({ items }: { items: { label: string; value: ReactNode; color?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-lg border border-line bg-surface/60 px-3 py-1.5 min-w-[110px]">
          <div className="text-[18px] font-bold leading-tight" style={{ color: i.color ?? '#111827' }}>{i.value}</div>
          <div className="text-[11px] text-ink-500 whitespace-nowrap">{i.label}</div>
        </div>
      ))}
    </div>
  )
}

/** Progress bar with a fixed pixel width (does not shrink inside flex table cells) + % label. */
export function PctBar({ value, width = 90, color, height }: { value: number; width?: number; color?: string; height?: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="shrink-0" style={{ width }}><Progress value={value} color={color ?? progressColor(value)} height={height} /></span>
      <span className="text-[12px] w-8">{value}%</span>
    </span>
  )
}

export const byDate = <T extends { dueDate: string }>(a: T, b: T) => a.dueDate.localeCompare(b.dueDate)
export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)
