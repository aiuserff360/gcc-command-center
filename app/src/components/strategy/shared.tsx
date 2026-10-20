import type { ReactNode } from 'react'
import { ConfirmDelete, Field, Input } from '../ui'
import { YEARS, YEAR_KEYS, type YearValues } from '../../data/strategy'

/** Standard modal footer: optional Delete (left), Cancel + Save (right). */
export function EditorFooter({ onCancel, onSave, onDelete, saveLabel = 'Save' }: { onCancel: () => void; onSave: () => void; onDelete?: () => void; saveLabel?: string }) {
  return (
    <>
      {onDelete && <span className="mr-auto"><ConfirmDelete onConfirm={onDelete} /></span>}
      <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      <button className="btn-primary" onClick={onSave}>{saveLabel}</button>
    </>
  )
}

/** Five numeric inputs for Year 1–5 values. */
export function YearFields<T extends YearValues>({ value, onChange, unit }: { value: T; onChange: (v: T) => void; unit?: string }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {YEARS.map((y, i) => {
        const k = YEAR_KEYS[i]
        return (
          <Field key={k} label={unit ? `${y} (${unit})` : y}>
            <Input type="number" step="any" value={value[k]} onChange={(e) => onChange({ ...value, [k]: parseFloat(e.target.value) || 0 })} />
          </Field>
        )
      })}
    </div>
  )
}

/** Props for a numeric <Input> bound to a key of a form object. */
export function numProps<T extends object>(f: T, setF: (v: T) => void, key: keyof T) {
  return {
    type: 'number' as const, step: 'any', value: f[key] as unknown as number,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [key]: parseFloat(e.target.value) || 0 }),
  }
}
/** Props for a text <Input>/<Select>/<TextArea> bound to a key of a form object. */
export function textProps<T extends object>(f: T, setF: (v: T) => void, key: keyof T) {
  return {
    value: f[key] as unknown as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [key]: e.target.value }),
  }
}

/** Small toolbar row above a table: left text + right actions. */
export function Toolbar({ left, children }: { left?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="text-[12.5px] text-ink-500">{left}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

/** Coloured score pill (green ≥ good, amber otherwise). */
export function ScorePill({ value, good = 8, digits = 1 }: { value: number; good?: number; digits?: number }) {
  return <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-[12px] font-semibold ${value >= good ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{value.toFixed(digits)}</span>
}

/** Status pill used by the operating-model cards (full width). */
export function OmPill({ status }: { status: string }) {
  const cls = status === 'Recommended' ? 'bg-green-50 text-green-700' : status === 'Not Preferred' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-brand-600'
  return <div className={`rounded-md py-1.5 text-center text-[12.5px] font-medium ${cls}`}>{status}</div>
}
