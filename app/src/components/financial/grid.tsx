/**
 * Inline-editable grid primitives for the Input views (pattern: footprint/BusinessUnits.tsx → BusinessUnitGrid).
 * Every change writes straight to the collection through the handler passed in.
 *
 * Money cells show and edit the amount in the currency selected in the top bar and store ₹ Cr
 * (`useMoney().toBase`). While a cell is focused it keeps the raw text the user typed so that
 * rounding to display units never clobbers "0." or "1.2" mid-entry.
 */
import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Trash2, Plus } from 'lucide-react'
import { useMoney } from '../../data/money'

export const gcell = 'w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-[12px] outline-none hover:border-slate-300 focus:border-brand-400 focus:bg-white'
export const gth = 'text-left text-[11.5px] font-semibold text-slate-600 px-1.5 py-1.5 bg-slate-100 border-b border-slate-300 whitespace-nowrap'
export const gtd = 'border-b border-slate-200 px-0.5 py-0.5 align-middle'
export const gtotal = 'text-[12.5px] font-semibold px-2 py-2 text-right tabular-nums'

/** Table shell: horizontal scroll + minimum width so wide grids never squash their inputs. */
export function Grid({ children, minWidth = 900, className }: { children: ReactNode; minWidth?: number; className?: string }) {
  return (
    <div className={clsx('overflow-x-auto scroll-thin', className)}>
      <table className="w-full border-separate border-spacing-0" style={{ minWidth }}>{children}</table>
    </div>
  )
}

/** Header row. `right` marks the columns (by index) that are right-aligned (numeric). */
export function GridHead({ cols, right = [] }: { cols: ReactNode[]; right?: number[] }) {
  return <thead><tr>{cols.map((h, i) => <th key={i} className={clsx(gth, right.includes(i) && 'text-right')}>{h}</th>)}</tr></thead>
}

export function GridEmpty({ colSpan, children = 'Nothing here yet. Use "Add" to create the first row.' }: { colSpan: number; children?: ReactNode }) {
  return <tr><td colSpan={colSpan} className="text-center text-[12.5px] text-ink-500 py-6">{children}</td></tr>
}

export function GridText({ value, onChange, className, placeholder, bold }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string; bold?: boolean }) {
  return <input className={clsx(gcell, bold && 'font-medium', className)} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

export function GridSelect<T extends string>({ value, options, onChange, className }: { value: T; options: readonly T[]; onChange: (v: T) => void; className?: string }) {
  return (
    <select className={clsx(gcell, 'cursor-pointer', className)} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {!options.includes(value) && <option value={value}>{value}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export function GridDate({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return <input type="date" className={clsx(gcell, 'w-[128px]', className)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
}

/**
 * Numeric cell with draft-while-typing. `value` is the number to show; `onChange` receives the parsed number.
 * `nullable` lets the user clear the cell (empty string → null) – used for optional budgets / future months.
 */
export function GridNum({ value, onChange, width = 72, step = 'any', min, className, nullable, placeholder }: {
  value: number | null | undefined; onChange: (v: number | null) => void; width?: number; step?: number | 'any'; min?: number; className?: string; nullable?: boolean; placeholder?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value == null ? '' : String(value))
  return (
    <input
      type="number" step={step} min={min} placeholder={placeholder}
      className={clsx(gcell, 'text-right tabular-nums', className)} style={{ width }}
      value={shown}
      onFocus={() => setDraft(value == null ? '' : String(value))}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        if (raw.trim() === '') { onChange(nullable ? null : 0); return }
        const n = parseFloat(raw)
        if (!isNaN(n)) onChange(min != null ? Math.max(min, n) : n)
      }}
    />
  )
}

/** Money cell: stored ₹ Cr in, ₹ Cr out; shown and edited in the display currency. */
export function GridMoney({ cr, onChange, width = 76, className, nullable }: { cr: number | null | undefined; onChange: (cr: number | null) => void; width?: number; className?: string; nullable?: boolean }) {
  const m = useMoney()
  // Re-mount the numeric cell when the currency / rate changes so any open draft is discarded.
  return <GridNum key={`${m.currency}-${m.rate}`} nullable={nullable} value={cr == null ? null : m.inputValue(cr)} onChange={(v) => onChange(v == null ? null : m.toBase(v))} width={width} className={className} />
}

export function GridRemove({ onClick, label }: { onClick: () => void; label?: string }) {
  return <button title="Remove" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => { if (window.confirm(`Remove ${label ?? 'this row'}?`)) onClick() }}><Trash2 size={14} /></button>
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button className="btn-primary" onClick={onClick}><Plus size={14} /> {children}</button>
}

/** Totals cell in the display unit. */
export function GridTotal({ cr, className }: { cr: number; className?: string }) {
  const m = useMoney()
  return <td className={clsx(gtotal, className)}>{m.num(cr, m.digits)}</td>
}

/** Small "Saved" / Save / Discard bar for form-style tabs (settings). */
export function SaveBar({ dirty, saved, onSave, onDiscard }: { dirty: boolean; saved: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      {saved && !dirty && <span className="text-[12px] text-green-600">Saved</span>}
      <button className="btn-secondary" disabled={!dirty} onClick={onDiscard}>Discard</button>
      <button className="btn-primary" disabled={!dirty} onClick={onSave}>Save</button>
    </div>
  )
}
