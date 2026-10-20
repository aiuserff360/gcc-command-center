/**
 * Business-unit widgets shared by every Governance tab: the toolbar filter, the register column chip,
 * the modal select / multi-select and the inline-grid tag cell.
 */
import { useState } from 'react'
import clsx from 'clsx'
import { Building2, X } from 'lucide-react'
import { Select } from '../ui'
import { selectCls } from '../ui/InlineGrid'
import { PROGRAM_WIDE } from '../../data/governance'
import { UNIT_ALL, unitOptions, shortUnit } from './units'

/** Toolbar filter: All / Program-wide / each business unit. */
export function UnitFilter({ value, units, onChange, className }: { value: string; units: string[]; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={clsx('inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 cursor-pointer', className)} title="Business unit">
      <Building2 size={14} className="text-brand-600 shrink-0" />
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent outline-none text-[12.5px] font-medium text-ink-900 cursor-pointer max-w-[210px]">
        {unitOptions(units).map((o) => <option key={o} value={o}>{o === UNIT_ALL ? 'All business units' : o}</option>)}
      </select>
    </label>
  )
}

/** Register column chip; a click can select that unit in the shared filter. */
export function UnitChip({ unit, onSelect, className, short }: { unit: string; onSelect?: (u: string) => void; className?: string; short?: boolean }) {
  const pw = !unit || unit === PROGRAM_WIDE
  const label = pw ? (short ? 'Program' : PROGRAM_WIDE) : short ? shortUnit(unit) : unit
  const cls = clsx('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap max-w-[150px] truncate', pw ? 'bg-slate-100 text-slate-600' : 'bg-brand-50 text-brand-700', className)
  if (pw || !onSelect) return <span className={cls} title={unit || PROGRAM_WIDE}>{label}</span>
  return <button type="button" className={clsx(cls, 'hover:underline cursor-pointer')} title={`Filter to ${unit}`} onClick={(e) => { e.stopPropagation(); onSelect(unit) }}>{label}</button>
}

/** Several chips (stakeholders, controls); empty = Program-wide. */
export function UnitChips({ units, onSelect, max, short }: { units: string[]; onSelect?: (u: string) => void; max?: number; short?: boolean }) {
  if (!units.length) return <UnitChip unit={PROGRAM_WIDE} />
  const shown = max ? units.slice(0, max) : units
  const rest = units.slice(shown.length)
  return <span className="inline-flex flex-wrap gap-1">{shown.map((u) => <UnitChip key={u} unit={u} onSelect={onSelect} short={short} />)}{rest.length > 0 && <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-brand-50 text-brand-700" title={rest.join(', ')}>+{rest.length}</span>}</span>
}

/** Modal select: Program-wide + each unit. */
export function UnitSelect({ value, units, onChange, className }: { value: string; units: string[]; onChange: (v: string) => void; className?: string }) {
  const opts = [PROGRAM_WIDE, ...units]
  return <Select className={className} options={opts.includes(value) ? opts : [value, ...opts]} value={value} onChange={(e) => onChange(e.target.value)} />
}

/** Modal multi-select as a row of toggles; nothing selected = Program-wide. */
export function UnitToggles({ value, units, onChange }: { value: string[]; units: string[]; onChange: (v: string[]) => void }) {
  const toggle = (u: string) => onChange(value.includes(u) ? value.filter((x) => x !== u) : [...value, u])
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      <button type="button" onClick={() => onChange([])} className={clsx('rounded-md px-2 py-1 text-[11.5px] font-medium border cursor-pointer', value.length === 0 ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-ink-700 border-line hover:bg-surface')}>{PROGRAM_WIDE}</button>
      {units.map((u) => <button key={u} type="button" onClick={() => toggle(u)} className={clsx('rounded-md px-2 py-1 text-[11.5px] font-medium border cursor-pointer', value.includes(u) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-700 border-line hover:bg-surface')}>{u}</button>)}
    </div>
  )
}

/** Inline-grid cell for multi-unit tags: chips with remove + an "add" select. */
export function UnitTagsCell({ value, units, onChange }: { value: string[]; units: string[]; onChange: (v: string[]) => void }) {
  const [adding, setAdding] = useState('')
  const free = units.filter((u) => !value.includes(u))
  return (
    <span className="inline-flex items-center flex-wrap gap-1 px-1 py-0.5">
      {value.length === 0 && <span className="text-[11px] text-slate-500 italic">{PROGRAM_WIDE}</span>}
      {value.map((u) => (
        <span key={u} className="inline-flex items-center gap-0.5 rounded-md bg-brand-50 text-brand-700 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap">
          {u}<button type="button" title={`Remove ${u}`} className="text-brand-400 hover:text-red-600 cursor-pointer" onClick={() => onChange(value.filter((x) => x !== u))}><X size={11} /></button>
        </span>
      ))}
      {free.length > 0 && (
        <select className={clsx(selectCls, 'cursor-pointer text-[11px] text-ink-500 w-[64px]')} value={adding} onChange={(e) => { if (e.target.value) onChange([...value, e.target.value]); setAdding('') }}>
          <option value="">+ unit</option>
          {free.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      )}
    </span>
  )
}

/** Modal select for the transition project a record relates to (projects of the chosen unit; none = blank). */
export function ProjectSelect({ value, unit, projects, onChange }: { value?: string; unit: string; projects: { id: string; name: string; businessUnit: string }[]; onChange: (id?: string) => void }) {
  const list = projects.filter((p) => p.businessUnit === unit)
  const disabled = !unit || unit === PROGRAM_WIDE
  return (
    <select className={clsx('input', disabled && 'bg-surface text-ink-500')} disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">{disabled ? 'Pick a business unit first' : '— no project —'}</option>
      {list.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      {value && !list.some((p) => p.id === value) && <option value={value}>{projects.find((p) => p.id === value)?.name ?? value}</option>}
    </select>
  )
}
