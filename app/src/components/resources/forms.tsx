import { useEffect, useState } from 'react'
import { Modal, Field, Input, Select, FormGrid, TextArea, ConfirmDelete } from '../ui'
import { OWNERS, MONTHS } from '../../data/common'
import { uid } from '../../store/useStore'
import {
  FUNCTIONS, RES_LOCATIONS, PRIORITIES, POSITION_STATUSES, GRADES, COST_BANDS, EXIT_REASONS, addDays,
  type Position, type Employee, type SkillRow, type HeadcountMonth, type ResourceSettings, type TrainingPlan, type ExitRecord, type RetentionAction, type LocationRow, type PeopleCostRow,
} from '../../data/resources'
import { TODAY } from '../../data/common'

type Num<T> = (key: keyof T) => React.InputHTMLAttributes<HTMLInputElement>
function useForm<T>(initial: T, open: boolean) {
  const [f, setF] = useState<T>(initial)
  useEffect(() => { if (open) setF(initial) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const num: Num<T> = (key) => ({ type: 'number', step: 'any', value: f[key] as unknown as number, onChange: (e) => setF({ ...f, [key]: parseFloat(e.target.value) || 0 }) })
  const txt = (key: keyof T) => ({ value: f[key] as unknown as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [key]: e.target.value }) })
  return { f, setF, num, txt }
}
const Footer = ({ onClose, onSave, onDelete, saveLabel = 'Save' }: { onClose: () => void; onSave: () => void; onDelete?: () => void; saveLabel?: string }) => (
  <>
    {onDelete && <span className="mr-auto"><ConfirmDelete onConfirm={onDelete} /></span>}
    <button className="btn-secondary" onClick={onClose}>Cancel</button>
    <button className="btn-primary" onClick={onSave}>{saveLabel}</button>
  </>
)

/* ---------- Position (requisition) ---------- */
export const blankPosition = (): Position => ({ id: uid('pos'), role: '', workstream: FUNCTIONS[0], location: RES_LOCATIONS[0], priority: 'Medium', status: 'Open', openedOn: TODAY, targetDate: addDays(TODAY, 75), hiringManager: OWNERS[0], grade: 'L3', notes: '' })
export function PositionForm({ open, onClose, value, onSave, onDelete }: { open: boolean; onClose: () => void; value: Position | null; onSave: (p: Position) => void; onDelete?: (id: string) => void }) {
  const editing = !!value
  const { f, num, txt } = useForm<Position>(value ?? blankPosition(), open)
  void num
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Position' : 'Add Position'} footer={<Footer onClose={onClose} onSave={() => f.role.trim() && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} saveLabel={editing ? 'Save changes' : 'Add position'} />}>
      <FormGrid cols={3}>
        <Field label="Role" className="col-span-2"><Input {...txt('role')} placeholder="e.g. Senior Data Engineer" /></Field>
        <Field label="Grade"><Select options={GRADES} {...txt('grade')} /></Field>
        <Field label="Workstream"><Select options={FUNCTIONS} {...txt('workstream')} /></Field>
        <Field label="Location"><Select options={RES_LOCATIONS} {...txt('location')} /></Field>
        <Field label="Priority"><Select options={PRIORITIES} {...txt('priority')} /></Field>
        <Field label="Stage / Status"><Select options={POSITION_STATUSES} {...txt('status')} /></Field>
        <Field label="Hiring manager"><Select options={OWNERS} {...txt('hiringManager')} /></Field>
        <Field label="Opened on"><Input type="date" {...txt('openedOn')} /></Field>
        <Field label="Target fill date"><Input type="date" {...txt('targetDate')} /></Field>
        <Field label="Notes" className="col-span-2"><TextArea {...txt('notes')} placeholder="Sourcing notes, approvals, interview panel…" /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Employee ---------- */
export const blankEmployee = (): Employee => ({ id: uid('emp'), name: '', role: '', workstream: FUNCTIONS[0], location: RES_LOCATIONS[0], grade: 'L3', allocationPct: 100, costBand: 'Band B', annualCostL: 14, startDate: TODAY })
export function EmployeeForm({ open, onClose, value, onSave, onDelete }: { open: boolean; onClose: () => void; value: Employee | null; onSave: (e: Employee) => void; onDelete?: (id: string) => void }) {
  const editing = !!value
  const { f, num, txt } = useForm<Employee>(value ?? blankEmployee(), open)
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Employee' : 'Add Employee'} footer={<Footer onClose={onClose} onSave={() => f.name.trim() && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} saveLabel={editing ? 'Save changes' : 'Add employee'} />}>
      <FormGrid cols={3}>
        <Field label="Name"><Input {...txt('name')} placeholder="Full name" /></Field>
        <Field label="Role"><Input {...txt('role')} placeholder="e.g. Data Engineer" /></Field>
        <Field label="Grade"><Select options={GRADES} {...txt('grade')} /></Field>
        <Field label="Workstream"><Select options={FUNCTIONS} {...txt('workstream')} /></Field>
        <Field label="Location"><Select options={RES_LOCATIONS} {...txt('location')} /></Field>
        <Field label="Allocation %"><Input {...num('allocationPct')} min={0} max={100} /></Field>
        <Field label="Cost band"><Select options={COST_BANDS} {...txt('costBand')} /></Field>
        <Field label="Annual cost (₹ Lakh)"><Input {...num('annualCostL')} /></Field>
        <Field label="Start date"><Input type="date" {...txt('startDate')} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Skill row ---------- */
export const blankSkill = (): SkillRow => ({ id: uid('sk'), category: '', required: 0, available: 0, owner: OWNERS[0] })
export function SkillForm({ open, onClose, value, onSave, onDelete }: { open: boolean; onClose: () => void; value: SkillRow | null; onSave: (s: SkillRow) => void; onDelete?: (id: string) => void }) {
  const editing = !!value
  const { f, num, txt } = useForm<SkillRow>(value ?? blankSkill(), open)
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Skill Category' : 'Add Skill Category'} width="max-w-lg" footer={<Footer onClose={onClose} onSave={() => f.category.trim() && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} />}>
      <FormGrid cols={2}>
        <Field label="Skill category" className="col-span-2"><Input {...txt('category')} placeholder="e.g. Cloud (AWS/Azure)" /></Field>
        <Field label="Required"><Input {...num('required')} /></Field>
        <Field label="Available"><Input {...num('available')} /></Field>
        <Field label="Capability owner"><Select options={OWNERS} {...txt('owner')} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Training plan ---------- */
export const blankTraining = (skills: string[]): TrainingPlan => ({ id: uid('tp'), program: '', skill: skills[0] ?? '', participants: 10, startDate: TODAY, endDate: addDays(TODAY, 45), status: 'Planned', owner: OWNERS[0] })
export function TrainingForm({ open, onClose, value, onSave, onDelete, skills }: { open: boolean; onClose: () => void; value: TrainingPlan | null; onSave: (t: TrainingPlan) => void; onDelete?: (id: string) => void; skills: string[] }) {
  const editing = !!value
  const { f, num, txt } = useForm<TrainingPlan>(value ?? blankTraining(skills), open)
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Training Programme' : 'Add Training Programme'} footer={<Footer onClose={onClose} onSave={() => f.program.trim() && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} />}>
      <FormGrid cols={3}>
        <Field label="Programme" className="col-span-2"><Input {...txt('program')} /></Field>
        <Field label="Skill category"><Select options={skills} {...txt('skill')} /></Field>
        <Field label="Participants"><Input {...num('participants')} /></Field>
        <Field label="Start"><Input type="date" {...txt('startDate')} /></Field>
        <Field label="End"><Input type="date" {...txt('endDate')} /></Field>
        <Field label="Status"><Select options={['Planned', 'In Progress', 'Completed']} {...txt('status')} /></Field>
        <Field label="Owner"><Select options={OWNERS} {...txt('owner')} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Exit record ---------- */
export const blankExit = (): ExitRecord => ({ id: uid('ex'), name: '', role: '', workstream: FUNCTIONS[0], location: RES_LOCATIONS[0], exitDate: TODAY, reason: EXIT_REASONS[0], regretted: false, tenureMonths: 6 })
export function ExitForm({ open, onClose, value, onSave, onDelete }: { open: boolean; onClose: () => void; value: ExitRecord | null; onSave: (e: ExitRecord) => void; onDelete?: (id: string) => void }) {
  const editing = !!value
  const { f, setF, num, txt } = useForm<ExitRecord>(value ?? blankExit(), open)
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Exit' : 'Record Exit'} footer={<Footer onClose={onClose} onSave={() => f.name.trim() && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} />}>
      <FormGrid cols={3}>
        <Field label="Name"><Input {...txt('name')} /></Field>
        <Field label="Role"><Input {...txt('role')} /></Field>
        <Field label="Workstream"><Select options={FUNCTIONS} {...txt('workstream')} /></Field>
        <Field label="Location"><Select options={RES_LOCATIONS} {...txt('location')} /></Field>
        <Field label="Exit date"><Input type="date" {...txt('exitDate')} /></Field>
        <Field label="Tenure (months)"><Input {...num('tenureMonths')} /></Field>
        <Field label="Reason"><Select options={EXIT_REASONS} {...txt('reason')} /></Field>
        <Field label="Regretted attrition"><Select options={['No', 'Yes']} value={f.regretted ? 'Yes' : 'No'} onChange={(e) => setF({ ...f, regretted: e.target.value === 'Yes' })} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Retention action ---------- */
export const blankAction = (): RetentionAction => ({ id: uid('ra'), action: '', segment: 'All employees', owner: OWNERS[0], dueDate: addDays(TODAY, 30), status: 'Planned', impact: 'Medium' })
export function RetentionActionForm({ open, onClose, value, onSave, onDelete }: { open: boolean; onClose: () => void; value: RetentionAction | null; onSave: (a: RetentionAction) => void; onDelete?: (id: string) => void }) {
  const editing = !!value
  const { f, txt } = useForm<RetentionAction>(value ?? blankAction(), open)
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Retention Action' : 'Add Retention Action'} footer={<Footer onClose={onClose} onSave={() => f.action.trim() && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} />}>
      <FormGrid cols={3}>
        <Field label="Action" className="col-span-3"><Input {...txt('action')} /></Field>
        <Field label="Target segment"><Input {...txt('segment')} /></Field>
        <Field label="Owner"><Select options={OWNERS} {...txt('owner')} /></Field>
        <Field label="Due date"><Input type="date" {...txt('dueDate')} /></Field>
        <Field label="Status"><Select options={['Planned', 'In Progress', 'Completed']} {...txt('status')} /></Field>
        <Field label="Expected impact"><Select options={['High', 'Medium', 'Low']} {...txt('impact')} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Location ---------- */
export const blankLocation = (): LocationRow => ({ id: uid('loc'), name: '', ftes: 0, seats: 0, costIndex: 1, color: '#8B5CF6', office: '' })
export function LocationForm({ open, onClose, value, onSave, onDelete }: { open: boolean; onClose: () => void; value: LocationRow | null; onSave: (l: LocationRow) => void; onDelete?: (id: string) => void }) {
  const editing = !!value
  const { f, num, txt } = useForm<LocationRow>(value ?? blankLocation(), open)
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Location' : 'Add Location'} footer={<Footer onClose={onClose} onSave={() => f.name.trim() && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} />}>
      <FormGrid cols={3}>
        <Field label="Location"><Input {...txt('name')} /></Field>
        <Field label="Office / campus" className="col-span-2"><Input {...txt('office')} /></Field>
        <Field label="FTEs"><Input {...num('ftes')} /></Field>
        <Field label="Seats"><Input {...num('seats')} /></Field>
        <Field label="Cost index (Bengaluru = 1.00)"><Input {...num('costIndex')} step="0.01" /></Field>
        <Field label="Chart colour"><Input type="color" {...txt('color')} className="h-9 p-1" /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- People cost row ---------- */
export function PeopleCostForm({ open, onClose, value, onSave }: { open: boolean; onClose: () => void; value: PeopleCostRow | null; onSave: (r: PeopleCostRow) => void }) {
  const { f, num } = useForm<PeopleCostRow>(value ?? { id: '', workstream: '', budgetCr: 0, actualCr: 0 }, open)
  return (
    <Modal open={open} onClose={onClose} title={`Edit People Cost – ${f.workstream}`} width="max-w-md" footer={<Footer onClose={onClose} onSave={() => onSave(f)} />}>
      <FormGrid cols={2}>
        <Field label="Annual budget (₹ Cr)"><Input {...num('budgetCr')} /></Field>
        <Field label="Annual run-rate / actual (₹ Cr)"><Input {...num('actualCr')} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Monthly headcount actuals ---------- */
export function HeadcountActualsForm({ open, onClose, rows, onSave }: { open: boolean; onClose: () => void; rows: HeadcountMonth[]; onSave: (rows: HeadcountMonth[]) => void }) {
  const [list, setList] = useState<HeadcountMonth[]>(rows)
  useEffect(() => { if (open) setList(rows) }, [open, rows])
  const set = (i: number, key: keyof HeadcountMonth, v: string) => setList(list.map((r, j) => (j === i ? { ...r, [key]: parseFloat(v) || 0 } : r)))
  const cols: { key: keyof HeadcountMonth; label: string }[] = [{ key: 'planned', label: 'Planned' }, { key: 'actual', label: 'Actual' }, { key: 'target', label: 'Target' }, { key: 'plannedUtil', label: 'Plan util. %' }, { key: 'actualUtil', label: 'Actual util. %' }]
  return (
    <Modal open={open} onClose={onClose} title="Update monthly headcount actuals" width="max-w-3xl" footer={<Footer onClose={onClose} onSave={() => { onSave(list); onClose() }} />}>
      <p className="text-[12px] text-ink-500 mb-3">Planned / Actual / Target FTE headcount at month end (2026) and ramp-up utilisation. The FTEs Onboarded KPI reads the current month's actual.</p>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full tbl border-separate border-spacing-0">
          <thead><tr><th className="th">Month</th>{cols.map((c) => <th key={c.key} className="th text-right">{c.label}</th>)}</tr></thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={r.id}>
                <td className="td font-medium">{MONTHS[i] ?? r.month}</td>
                {cols.map((c) => <td key={c.key} className="td text-right py-1"><input type="number" className="input w-24 py-1 text-right ml-auto" value={r[c.key] as number} onChange={(e) => set(i, c.key, e.target.value)} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

/* ---------- Generic numeric grid editor (workstream headcount, funnel, time to hire, forecast…) ---------- */
export function NumberGridForm<T extends { id: string }>({ open, onClose, title, rows, labelKey, fields, onSave, hint }: {
  open: boolean; onClose: () => void; title: string; rows: T[]; labelKey: keyof T; fields: { key: keyof T; label: string; step?: number }[]; onSave: (rows: T[]) => void; hint?: string
}) {
  const [list, setList] = useState<T[]>(rows)
  useEffect(() => { if (open) setList(rows) }, [open, rows])
  const set = (i: number, key: keyof T, v: string) => setList(list.map((r, j) => (j === i ? { ...r, [key]: parseFloat(v) || 0 } : r)))
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-2xl" footer={<Footer onClose={onClose} onSave={() => { onSave(list); onClose() }} />}>
      {hint && <p className="text-[12px] text-ink-500 mb-3">{hint}</p>}
      <table className="w-full tbl border-separate border-spacing-0">
        <thead><tr><th className="th">&nbsp;</th>{fields.map((c) => <th key={String(c.key)} className="th text-right">{c.label}</th>)}</tr></thead>
        <tbody>
          {list.map((r, i) => (
            <tr key={r.id}>
              <td className="td font-medium">{String(r[labelKey])}</td>
              {fields.map((c) => <td key={String(c.key)} className="td text-right py-1"><input type="number" step={c.step ?? 1} className="input w-24 py-1 text-right ml-auto" value={r[c.key] as unknown as number} onChange={(e) => set(i, c.key, e.target.value)} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  )
}

/* ---------- Settings (non-derivable KPI numbers) ---------- */
export function SettingsForm({ open, onClose, value, onSave }: { open: boolean; onClose: () => void; value: ResourceSettings; onSave: (s: ResourceSettings) => void }) {
  const { f, num, txt } = useForm<ResourceSettings>(value, open)
  return (
    <Modal open={open} onClose={onClose} title="Resource plan settings" width="max-w-lg" footer={<Footer onClose={onClose} onSave={() => { onSave(f); onClose() }} />}>
      <FormGrid cols={2}>
        <Field label="FTE target (plan)"><Input {...num('fteTarget')} /></Field>
        <Field label="Current reporting month"><Select options={MONTHS} {...txt('currentMonth')} /></Field>
        <Field label="Avg. time to hire (months)"><Input {...num('avgTimeToHireMonths')} /></Field>
        <Field label="Time to hire target (months)"><Input {...num('timeToHireTargetMonths')} /></Field>
        <Field label="Seats per FTE (seat ratio)"><Input {...num('seatRatio')} /></Field>
      </FormGrid>
    </Modal>
  )
}
