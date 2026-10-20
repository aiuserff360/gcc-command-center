/**
 * Inline-editable grid primitives for the Input views (pattern: footprint/BusinessUnits.tsx → BusinessUnitGrid).
 * Every cell writes straight to its collection through the `onChange` the caller wires to `update`.
 */
import { type ReactNode } from 'react'
import clsx from 'clsx'
import { Plus, Trash2, Pencil } from 'lucide-react'

export const cellCls = 'w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-[12px] outline-none hover:border-slate-300 focus:border-brand-400 focus:bg-white'
export const thCls = 'text-left text-[11.5px] font-semibold text-slate-600 px-1.5 py-1.5 bg-slate-100 border-b border-slate-300 whitespace-nowrap'
export const tdCls = 'border-b border-slate-200 px-0.5 py-0.5 align-middle'
/** selects size to their longest option instead of being squeezed by the table layout */
export const selectCls = cellCls.replace('w-full', 'w-auto max-w-full')
const selCls = selectCls
/** a fixed width in `className` (w-[64px]) must not fight the default w-full */
const widthAware = (className?: string) => (className && /\bw-\[/.test(className) ? cellCls.replace('w-full ', '') : cellCls)
const stickyCls = 'sticky right-0 bg-white group-hover:bg-[#EEF4FC] shadow-[-6px_0_8px_-6px_rgba(16,24,40,0.12)]'

export function Grid({ headers, children, minWidth = 900, empty = 'No records yet. Use "Add" to create one.', count, stickyActions = true }: {
  headers: (string | { label: string; right?: boolean; width?: string })[]; children: ReactNode; minWidth?: number; empty?: string; count: number
  /** keep the last (actions) column visible while the grid scrolls horizontally; pair with `<Td sticky>` */
  stickyActions?: boolean
}) {
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full border-separate border-spacing-0" style={{ minWidth }}>
        <thead>
          <tr>{headers.map((h, i) => { const o = typeof h === 'string' ? { label: h } : h; const last = i === headers.length - 1; return <th key={i} className={clsx(thCls, o.right && 'text-right', stickyActions && last && o.label === '' && 'sticky right-0 bg-slate-100')} style={{ width: o.width }}>{o.label}</th> })}</tr>
        </thead>
        <tbody>
          {count === 0 && <tr><td colSpan={headers.length} className="text-[12.5px] text-ink-500 italic text-center py-6">{empty}</td></tr>}
          {children}
        </tbody>
      </table>
    </div>
  )
}

export function Row({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <tr className={clsx('group hover:bg-brand-50/40', muted && 'opacity-60')}>{children}</tr>
}

export function Td({ children, className, min, sticky }: { children: ReactNode; className?: string; min?: number; sticky?: boolean }) {
  return <td className={clsx(tdCls, sticky && stickyCls, sticky && 'whitespace-nowrap', className)} style={min ? { minWidth: min } : undefined}>{children}</td>
}

export function TextCell({ value, onChange, className, placeholder, title }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string; title?: string }) {
  return <input className={clsx(widthAware(className), className)} value={value} placeholder={placeholder} title={title ?? value} onChange={(e) => onChange(e.target.value)} />
}

export function NumCell({ value, onChange, min, max, step, className, decimals }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number | string; className?: string; decimals?: boolean }) {
  return (
    <input type="number" min={min} max={max} step={step ?? (decimals ? 'any' : 1)} className={clsx(cellCls.replace('w-full ', ''), 'text-right', className ?? 'w-[72px]')} value={value}
      onChange={(e) => { let v = decimals ? parseFloat(e.target.value) : parseInt(e.target.value); if (isNaN(v)) v = 0; if (min !== undefined) v = Math.max(min, v); if (max !== undefined) v = Math.min(max, v); onChange(v) }} />
  )
}

export function DateCell({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return <input type="date" className={clsx(cellCls.replace('w-full ', ''), 'w-[138px]', className)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
}

export function SelectCell<T extends string>({ value, options, onChange, className }: { value: T; options: readonly T[] | readonly string[]; onChange: (v: T) => void; className?: string }) {
  const opts = (options as readonly string[]).includes(value) ? (options as readonly string[]) : [value, ...(options as readonly string[])]
  return <select className={clsx(selCls, 'cursor-pointer', className)} value={value} onChange={(e) => onChange(e.target.value as T)}>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select>
}

export function CheckCell({ value, onChange, title }: { value: boolean; onChange: (v: boolean) => void; title?: string }) {
  return <label className="flex items-center justify-center py-1 cursor-pointer" title={title}><input type="checkbox" className="accent-brand-600" checked={value} onChange={(e) => onChange(e.target.checked)} /></label>
}

export function RemoveBtn({ onClick, name }: { onClick: () => void; name?: string }) {
  return <button title="Remove" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => { if (window.confirm(`Remove ${name ?? 'this record'}?`)) onClick() }}><Trash2 size={14} /></button>
}

export function EditBtn({ onClick, title = 'Open full form' }: { onClick: () => void; title?: string }) {
  return <button title={title} className="text-slate-400 hover:text-brand-600 p-1 cursor-pointer" onClick={onClick}><Pencil size={14} /></button>
}

export function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return <button className="btn-primary whitespace-nowrap" onClick={onClick}><Plus size={14} /> {label}</button>
}

/** Small toolbar with a search box and optional extra controls, used above the grids. */
export function GridToolbar({ q, onQ, placeholder = 'Search…', children, count }: { q: string; onQ: (v: string) => void; placeholder?: string; children?: ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-3 text-[12.5px]">
      <input value={q} onChange={(e) => onQ(e.target.value)} placeholder={placeholder} className="input py-1.5 w-[220px] bg-surface/60" />
      {children}
      {count !== undefined && <span className="text-ink-500 ml-auto">{count} record{count === 1 ? '' : 's'}</span>}
    </div>
  )
}
