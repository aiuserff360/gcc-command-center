import { useEffect, type ReactNode } from 'react'
import clsx from 'clsx'
import { X, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'

/* ---------- Card ---------- */
export function Card({ title, action, children, className, subtitle, headerRight }: {
  title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; subtitle?: ReactNode; headerRight?: ReactNode
}) {
  return (
    <section className={clsx('card p-4 flex flex-col min-w-0', className)}>
      {(title || action || headerRight) && (
        <header className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="text-[12px] text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">{headerRight}{action}</div>
        </header>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  )
}

export function ViewAll({ onClick, label = 'View All' }: { onClick?: () => void; label?: string }) {
  return <button className="link" onClick={onClick}>{label}</button>
}

/* ---------- KPI tile ---------- */
export type Tone = 'green' | 'blue' | 'violet' | 'red' | 'amber' | 'teal' | 'orange' | 'navy'
const toneBg: Record<Tone, string> = {
  green: 'bg-green-50 text-green-600', blue: 'bg-blue-50 text-brand-600', violet: 'bg-violet-50 text-violet-600',
  red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600', teal: 'bg-teal-50 text-teal-600',
  orange: 'bg-orange-50 text-orange-600', navy: 'bg-slate-100 text-navy-800',
}
const toneText: Record<Tone, string> = {
  green: 'text-green-600', blue: 'text-brand-600', violet: 'text-violet-600', red: 'text-red-600',
  amber: 'text-amber-600', teal: 'text-teal-600', orange: 'text-orange-600', navy: 'text-navy-900',
}
export function KpiTile({ icon, value, label, sub, tone = 'blue', trend, ring }: {
  icon?: ReactNode; value: ReactNode; label: string; sub?: ReactNode; tone?: Tone; trend?: 'up' | 'down' | 'none'; ring?: number
}) {
  return (
    <div className="card px-3.5 py-3 flex items-center gap-2.5 min-w-0 overflow-hidden">
      {ring !== undefined ? (
        <Ring value={ring} size={48} stroke={6} color={ringColor(tone)} label={<span className={clsx('text-[11px] font-semibold', toneText[tone])}>{ring}%</span>} />
      ) : (
        <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center shrink-0', toneBg[tone])}>{icon}</div>
      )}
      <div className="min-w-0">
        <div className={clsx('text-[22px] font-bold leading-tight tracking-tight', toneText[tone])}>{value}</div>
        <div className="text-[12px] text-ink-700 font-medium leading-tight">{label}</div>
        {sub && (
          <div className="text-[11px] mt-0.5 flex items-center gap-1 text-ink-500 leading-tight">
            {trend === 'up' && <TrendingUp size={12} className="text-green-600" />}
            {trend === 'down' && <TrendingDown size={12} className="text-red-600" />}
            <span>{sub}</span>
          </div>
        )}
      </div>
    </div>
  )
}
function ringColor(t: Tone) {
  return { green: '#16A34A', blue: '#1E5BBE', violet: '#8B5CF6', red: '#DC2626', amber: '#F59E0B', teal: '#14B8A6', orange: '#F97316', navy: '#0B2240' }[t]
}

/* ---------- Delta text helpers ---------- */
export function Delta({ value, suffix = '', good = true }: { value: string; suffix?: string; good?: boolean }) {
  return <span className={clsx('font-medium', good ? 'text-green-600' : 'text-red-600')}>{value}{suffix}</span>
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, active, onChange, className, size = 'md' }: {
  tabs: string[]; active: string; onChange: (t: string) => void; className?: string; size?: 'md' | 'sm'
}) {
  return (
    <div className={clsx('card px-2 flex items-center gap-1 overflow-x-auto scroll-thin', className)}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={clsx(
            'whitespace-nowrap px-3.5 border-b-2 -mb-px transition-colors cursor-pointer',
            size === 'md' ? 'py-3 text-[13px]' : 'py-2.5 text-[12.5px]',
            active === t ? 'border-brand-600 text-brand-600 font-semibold' : 'border-transparent text-ink-700 hover:text-ink-900',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

/* ---------- Badge ---------- */
const badgeStyles: Record<string, string> = {
  'On Track': 'bg-green-50 text-green-700', Completed: 'bg-green-50 text-green-700', Resolved: 'bg-green-50 text-green-700', Closed: 'bg-slate-100 text-slate-600', Active: 'bg-green-50 text-green-700', Approved: 'bg-green-50 text-green-700', Recommended: 'bg-green-50 text-green-700', Connected: 'bg-green-50 text-green-700',
  'At Risk': 'bg-amber-50 text-amber-700', Pending: 'bg-slate-100 text-slate-600', 'In Progress': 'bg-blue-50 text-brand-600', 'In Review': 'bg-blue-50 text-brand-600', Option: 'bg-blue-50 text-brand-600', Planned: 'bg-blue-50 text-brand-600',
  Delayed: 'bg-red-50 text-red-700', Open: 'bg-red-50 text-red-700', Overdue: 'bg-red-50 text-red-700', 'Not Preferred': 'bg-red-50 text-red-700', 'Awaiting Decision': 'bg-amber-50 text-amber-700', Rejected: 'bg-red-50 text-red-700',
  'Not Started': 'bg-slate-100 text-slate-600', Draft: 'bg-slate-100 text-slate-600',
  Critical: 'bg-red-50 text-red-700', High: 'bg-red-50 text-red-600', Medium: 'bg-amber-50 text-amber-700', Low: 'bg-green-50 text-green-700',
  Risk: 'bg-red-50 text-red-600', Issue: 'bg-blue-50 text-brand-600', Decision: 'bg-violet-50 text-violet-700', Action: 'bg-teal-50 text-teal-700', Escalation: 'bg-orange-50 text-orange-700',
  Red: 'bg-red-50 text-red-700', Amber: 'bg-amber-50 text-amber-700', Green: 'bg-green-50 text-green-700',
}
export function Badge({ value, className }: { value: string; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap', badgeStyles[value] ?? 'bg-slate-100 text-slate-700', className)}>
      {value}
    </span>
  )
}

/* ---------- Progress bar ---------- */
export function Progress({ value, color, className, height = 'h-2', track = 'bg-slate-200' }: { value: number; color?: string; className?: string; height?: string; track?: string }) {
  const c = color ?? (value >= 80 ? '#16A34A' : value >= 65 ? '#2B6FD6' : '#F59E0B')
  return (
    <div className={clsx('w-full rounded-full overflow-hidden', track, height, className)}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: c }} />
    </div>
  )
}

/* ---------- Ring (single-value donut) ---------- */
export function Ring({ value, size = 64, stroke = 7, color = '#16A34A', label, track = '#E5E7EB' }: {
  value: number; size?: number; stroke?: number; color?: string; label?: ReactNode; track?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{label ?? <span className="text-[13px] font-bold" style={{ color }}>{value}%</span>}</div>
    </div>
  )
}

/* ---------- Table ---------- */
export type Column<T> = { key: string; header: ReactNode; render?: (row: T) => ReactNode; className?: string; width?: string }
export function Table<T extends { id: string }>({ columns, rows, onRowClick, compact, empty = 'No records yet. Use "Add" to create one.' }: {
  columns: Column<T>[]; rows: T[]; onRowClick?: (r: T) => void; compact?: boolean; empty?: string
}) {
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full border-separate border-spacing-0 tbl">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={clsx('th', c.className)} style={{ width: c.width }}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td className="td text-ink-500 text-center py-6" colSpan={columns.length}>{empty}</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onRowClick?.(r)} className={clsx(onRowClick && 'cursor-pointer hover:bg-brand-50/60')}>
              {columns.map((c) => (
                <td key={c.key} className={clsx('td', compact && 'py-1.5', c.className)}>
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

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, width = 'max-w-2xl' }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4" onMouseDown={onClose}>
      <div className={clsx('bg-white rounded-xl shadow-2xl w-full max-h-[90vh] flex flex-col', width)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto scroll-thin">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Form fields ---------- */
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={className}><label className="label">{label}</label>{children}</div>
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={clsx('input', props.className)} /> }
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={clsx('input min-h-[72px]', props.className)} /> }
export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: readonly string[] }) {
  return (
    <select {...props} className={clsx('input', props.className)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: number }) {
  return <div className={clsx('grid gap-3', cols === 3 ? 'grid-cols-3' : cols === 1 ? 'grid-cols-1' : 'grid-cols-2')}>{children}</div>
}

/* ---------- Misc ---------- */
export function Chevron() { return <ChevronRight size={16} className="text-ink-400" /> }

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-700">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? <span className="w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} /> : <span className="w-2.5 h-2.5 rounded-full" style={{ background: i.color }} />}
          {i.label}
        </span>
      ))}
    </div>
  )
}

export function FilterSelect({ label, value, options, onChange, icon }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; icon?: ReactNode }) {
  return (
    <label className="card px-3 py-1.5 flex items-center gap-2 cursor-pointer">
      {icon}
      <span className="flex flex-col">
        <span className="text-[10.5px] text-ink-500 leading-none">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="text-[13px] font-semibold text-ink-900 bg-transparent outline-none -ml-0.5 cursor-pointer">
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </span>
    </label>
  )
}

export function Stat({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-center justify-between text-[12.5px] py-1', className)}>
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-[12.5px] text-ink-500 italic py-4 text-center">{children}</p>
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div className="flex items-center justify-between mb-2"><h4 className="text-[13px] font-semibold text-ink-900">{children}</h4>{right}</div>
}

export function ConfirmDelete({ onConfirm, label = 'Delete' }: { onConfirm: () => void; label?: string }) {
  return (
    <button className="btn-danger" onClick={() => { if (window.confirm('Delete this record? This cannot be undone.')) onConfirm() }}>{label}</button>
  )
}
