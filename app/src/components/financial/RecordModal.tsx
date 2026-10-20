import { useEffect, useState } from 'react'
import { Modal, Field, Input, Select, TextArea, FormGrid, ConfirmDelete } from '../ui'

export type FieldSpec<T> = {
  key: keyof T & string
  label: string
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea'
  options?: readonly string[]
  span?: boolean
  step?: number
}

/**
 * Generic add / edit modal driven by a field spec. Numbers are parsed, selects use the option list.
 * `value` null = closed. Pass `onDelete` to show a Delete button when editing an existing record.
 */
export function RecordModal<T extends { id: string }>({ title, value, fields, cols = 2, isNew, onClose, onSave, onDelete, width }: {
  title: string; value: T | null; fields: FieldSpec<T>[]; cols?: number; isNew?: boolean
  onClose: () => void; onSave: (v: T) => void; onDelete?: (id: string) => void; width?: string
}) {
  const [f, setF] = useState<T | null>(value)
  useEffect(() => { setF(value) }, [value])
  if (!value || !f) return null
  const set = (k: keyof T, v: unknown) => setF({ ...f, [k]: v })
  return (
    <Modal open={!!value} onClose={onClose} title={title} width={width} footer={<>
      {!isNew && onDelete && <ConfirmDelete onConfirm={() => { onDelete(f.id); onClose() }} />}
      <span className="flex-1" />
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={() => { onSave(f); onClose() }}>{isNew ? 'Add' : 'Save'}</button>
    </>}>
      <FormGrid cols={cols}>
        {fields.map((fs) => {
          const v = f[fs.key] as unknown
          const span = fs.span || fs.type === 'textarea' ? (cols === 3 ? 'col-span-3' : 'col-span-2') : undefined
          if (fs.type === 'select' && fs.options) return <Field key={fs.key} label={fs.label} className={span}><Select options={fs.options} value={String(v ?? '')} onChange={(e) => set(fs.key, e.target.value)} /></Field>
          if (fs.type === 'textarea') return <Field key={fs.key} label={fs.label} className={span}><TextArea value={String(v ?? '')} onChange={(e) => set(fs.key, e.target.value)} /></Field>
          if (fs.type === 'number') return <Field key={fs.key} label={fs.label} className={span}><Input type="number" step={fs.step ?? 'any'} value={typeof v === 'number' ? v : ''} onChange={(e) => set(fs.key, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} /></Field>
          if (fs.type === 'date') return <Field key={fs.key} label={fs.label} className={span}><Input type="date" value={String(v ?? '')} onChange={(e) => set(fs.key, e.target.value)} /></Field>
          return <Field key={fs.key} label={fs.label} className={span}><Input value={String(v ?? '')} onChange={(e) => set(fs.key, e.target.value)} /></Field>
        })}
      </FormGrid>
    </Modal>
  )
}

/** Small helper for the "Add" button + edit state used on each tab. */
export function useEditor<T extends { id: string }>() {
  const [editing, setEditing] = useState<{ value: T; isNew: boolean } | null>(null)
  return {
    editing,
    open: (value: T, isNew = false) => setEditing({ value, isNew }),
    close: () => setEditing(null),
  }
}
