import { useEffect, useState } from 'react'
import { Modal, Field, Input, Select, FormGrid, TextArea, ConfirmDelete } from '../ui'
import { OWNERS, MONTHS } from '../../data/common'
import { uid } from '../../store/useStore'
import {
  RES_LOCATIONS, PRIORITIES, POSITION_STATUSES, GRADES, COST_BANDS, EXIT_REASONS, CANDIDATE_STAGES, CANDIDATE_STATUSES, CANDIDATE_SOURCES, NEXT_STEP, addDays, statusForStage, roundsForStage, reqId,
  type Position, type Employee, type SkillRow, type HeadcountMonth, type ResourceSettings, type TrainingPlan, type ExitRecord, type RetentionAction, type LocationRow, type PeopleCostRow, type Candidate, type CandidateStage,
} from '../../data/resources'
import { TODAY } from '../../data/common'
import { useMoney, type Money } from '../../data/money'
import { lakhInput, lakhToBase } from './widgets'

type Num<T> = (key: keyof T) => React.InputHTMLAttributes<HTMLInputElement>
function useForm<T>(initial: T, open: boolean) {
  const [f, setF] = useState<T>(initial)
  useEffect(() => { if (open) setF(initial) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const num: Num<T> = (key) => ({ type: 'number', step: 'any', value: f[key] as unknown as number, onChange: (e) => setF({ ...f, [key]: parseFloat(e.target.value) || 0 }) })
  const txt = (key: keyof T) => ({ value: f[key] as unknown as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [key]: e.target.value }) })
  /** Numeric field stored in one unit but edited in another (₹ Cr ⇄ display currency, ₹ Lakh ⇄ ₹ L / € K). */
  const cnv = (key: keyof T, toDisplay: (base: number) => number, toBase: (display: number) => number): React.InputHTMLAttributes<HTMLInputElement> => ({ type: 'number', step: 'any', value: toDisplay(Number(f[key] ?? 0)), onChange: (e) => setF({ ...f, [key]: toBase(parseFloat(e.target.value) || 0) }) })
  return { f, setF, num, txt, cnv }
}
const Footer = ({ onClose, onSave, onDelete, saveLabel = 'Save' }: { onClose: () => void; onSave: () => void; onDelete?: () => void; saveLabel?: string }) => (
  <>
    {onDelete && <span className="mr-auto"><ConfirmDelete onConfirm={onDelete} /></span>}
    <button className="btn-secondary" onClick={onClose}>Cancel</button>
    <button className="btn-primary" onClick={onSave}>{saveLabel}</button>
  </>
)
const first = (list: readonly string[], fallback: string) => list[0] ?? fallback

/* ---------- Position (requisition) ---------- */
export const blankPosition = (businessUnits: readonly string[], locations: readonly string[]): Position => ({ id: uid('pos'), role: '', businessUnit: first(businessUnits, ''), location: first(locations, RES_LOCATIONS[0]), priority: 'Medium', status: 'Open', openedOn: TODAY, targetDate: addDays(TODAY, 75), hiringManager: OWNERS[0], grade: 'L3', notes: '' })
export function PositionForm({ open, onClose, value, onSave, onDelete, businessUnits, locations }: { open: boolean; onClose: () => void; value: Position | null; onSave: (p: Position) => void; onDelete?: (id: string) => void; businessUnits: readonly string[]; locations: readonly string[] }) {
  const editing = !!value
  const { f, txt } = useForm<Position>(value ?? blankPosition(businessUnits, locations), open)
  const buOptions = f.businessUnit && !businessUnits.includes(f.businessUnit) ? [f.businessUnit, ...businessUnits] : businessUnits
  const locOptions = f.location && !locations.includes(f.location) ? [f.location, ...locations] : locations
  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit Requisition ${reqId(f)}` : 'Add Requisition'} footer={<Footer onClose={onClose} onSave={() => f.role.trim() && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} saveLabel={editing ? 'Save changes' : 'Add requisition'} />}>
      <FormGrid cols={3}>
        <Field label="Role" className="col-span-2"><Input {...txt('role')} placeholder="e.g. Senior Data Engineer" /></Field>
        <Field label="Grade"><Select options={GRADES} {...txt('grade')} /></Field>
        <Field label="Business unit"><Select options={buOptions} {...txt('businessUnit')} /></Field>
        <Field label="Location"><Select options={locOptions} {...txt('location')} /></Field>
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

/* ---------- Candidate ---------- */
export const blankCandidate = (positionId: string): Candidate => ({ id: uid('cand'), positionId, name: '', source: CANDIDATE_SOURCES[0], stage: 'Applied', status: 'In process', roundsCompleted: 0, lastActivity: TODAY, nextStep: NEXT_STEP.Applied, notes: '' })
export function CandidateForm({ open, onClose, value, onSave, onDelete, positions, positionId }: {
  open: boolean; onClose: () => void; value: Candidate | null; onSave: (c: Candidate) => void; onDelete?: (id: string) => void
  /** requisitions to pick from when adding across the register */
  positions: Position[]
  /** when opened from a requisition drill-down the requisition is fixed */
  positionId?: string
}) {
  const editing = !!value
  const { f, setF, num, txt } = useForm<Candidate>(value ?? blankCandidate(positionId ?? positions[0]?.id ?? ''), open)
  const pos = positions.find((p) => p.id === f.positionId)
  const setStage = (stage: CandidateStage) => setF({ ...f, stage, status: f.status === 'Rejected' || f.status === 'Withdrawn' ? f.status : statusForStage(stage), roundsCompleted: roundsForStage(stage), nextStep: NEXT_STEP[stage], lastActivity: TODAY })
  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit Candidate – ${f.name || 'unnamed'}` : 'Add Candidate'} footer={<Footer onClose={onClose} onSave={() => f.name.trim() && f.positionId && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} saveLabel={editing ? 'Save changes' : 'Add candidate'} />}>
      <FormGrid cols={3}>
        <Field label="Requisition" className="col-span-2">
          {positionId ? <Input value={pos ? `${reqId(pos)} · ${pos.role}` : positionId} readOnly className="bg-surface" /> : (
            <select className="input" value={f.positionId} onChange={(e) => setF({ ...f, positionId: e.target.value })}>
              {positions.map((p) => <option key={p.id} value={p.id}>{reqId(p)} · {p.role} ({p.businessUnit})</option>)}
            </select>
          )}
        </Field>
        <Field label="Source"><Select options={CANDIDATE_SOURCES} {...txt('source')} /></Field>
        <Field label="Candidate name" className="col-span-2"><Input {...txt('name')} placeholder="Full name" /></Field>
        <Field label="Rounds completed"><Input {...num('roundsCompleted')} min={0} max={3} step={1} /></Field>
        <Field label="Current stage"><Select options={CANDIDATE_STAGES} value={f.stage} onChange={(e) => setStage(e.target.value as CandidateStage)} /></Field>
        <Field label="Status"><Select options={CANDIDATE_STATUSES} {...txt('status')} /></Field>
        <Field label="Last activity"><Input type="date" {...txt('lastActivity')} /></Field>
        <Field label="Next step / interview date" className="col-span-3"><Input {...txt('nextStep')} placeholder="e.g. Round 2 technical / case study · 2026-10-27" /></Field>
        <Field label="Notes" className="col-span-3"><TextArea {...txt('notes')} placeholder="Interview feedback, compensation expectations, notice period…" /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Employee ---------- */
export const blankEmployee = (businessUnits: readonly string[], locations: readonly string[]): Employee => ({ id: uid('emp'), name: '', role: '', businessUnit: first(businessUnits, ''), location: first(locations, RES_LOCATIONS[0]), grade: 'L3', allocationPct: 100, costBand: 'Band B', annualCostL: 14, startDate: TODAY })
export function EmployeeForm({ open, onClose, value, onSave, onDelete, businessUnits, locations }: { open: boolean; onClose: () => void; value: Employee | null; onSave: (e: Employee) => void; onDelete?: (id: string) => void; businessUnits: readonly string[]; locations: readonly string[] }) {
  const editing = !!value
  const m = useMoney()
  const { f, num, txt, cnv } = useForm<Employee>(value ?? blankEmployee(businessUnits, locations), open)
  const buOptions = f.businessUnit && !businessUnits.includes(f.businessUnit) ? [f.businessUnit, ...businessUnits] : businessUnits
  const locOptions = f.location && !locations.includes(f.location) ? [f.location, ...locations] : locations
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Employee' : 'Add Employee'} footer={<Footer onClose={onClose} onSave={() => f.name.trim() && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} saveLabel={editing ? 'Save changes' : 'Add employee'} />}>
      <FormGrid cols={3}>
        <Field label="Name"><Input {...txt('name')} placeholder="Full name" /></Field>
        <Field label="Role"><Input {...txt('role')} placeholder="e.g. Data Engineer" /></Field>
        <Field label="Grade"><Select options={GRADES} {...txt('grade')} /></Field>
        <Field label="Business unit"><Select options={buOptions} {...txt('businessUnit')} /></Field>
        <Field label="Location"><Select options={locOptions} {...txt('location')} /></Field>
        <Field label="Allocation %"><Input {...num('allocationPct')} min={0} max={100} /></Field>
        <Field label="Cost band"><Select options={COST_BANDS} {...txt('costBand')} /></Field>
        <Field label={`Annual cost (${m.lakhUnitLabel})`}><Input {...cnv('annualCostL', (l) => lakhInput(l, m), (d) => lakhToBase(d, m))} /></Field>
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
        <Field label="Skill category" className="col-span-2"><Input {...txt('category')} placeholder="e.g. SAP S/4HANA" /></Field>
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
export const blankExit = (businessUnits: readonly string[], locations: readonly string[]): ExitRecord => ({ id: uid('ex'), name: '', role: '', businessUnit: first(businessUnits, ''), location: first(locations, RES_LOCATIONS[0]), exitDate: TODAY, reason: EXIT_REASONS[0], regretted: false, tenureMonths: 6 })
export function ExitForm({ open, onClose, value, onSave, onDelete, businessUnits, locations }: { open: boolean; onClose: () => void; value: ExitRecord | null; onSave: (e: ExitRecord) => void; onDelete?: (id: string) => void; businessUnits: readonly string[]; locations: readonly string[] }) {
  const editing = !!value
  const { f, setF, num, txt } = useForm<ExitRecord>(value ?? blankExit(businessUnits, locations), open)
  const buOptions = f.businessUnit && !businessUnits.includes(f.businessUnit) ? [f.businessUnit, ...businessUnits] : businessUnits
  const locOptions = f.location && !locations.includes(f.location) ? [f.location, ...locations] : locations
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Exit' : 'Record Exit'} footer={<Footer onClose={onClose} onSave={() => f.name.trim() && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} />}>
      <FormGrid cols={3}>
        <Field label="Name"><Input {...txt('name')} /></Field>
        <Field label="Role"><Input {...txt('role')} /></Field>
        <Field label="Business unit"><Select options={buOptions} {...txt('businessUnit')} /></Field>
        <Field label="Location"><Select options={locOptions} {...txt('location')} /></Field>
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
export const blankLocation = (color = '#5B9BF0'): LocationRow => ({ id: uid('loc'), name: '', ftes: 0, seats: 0, costIndex: 1, color, office: '' })
export function LocationForm({ open, onClose, value, onSave, onDelete, baseName = 'Pune' }: { open: boolean; onClose: () => void; value: LocationRow | null; onSave: (l: LocationRow) => void; onDelete?: (id: string) => void; baseName?: string }) {
  const editing = !!value
  const { f, num, txt } = useForm<LocationRow>(value ?? blankLocation(), open)
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Location' : 'Add Location'} footer={<Footer onClose={onClose} onSave={() => f.name.trim() && onSave(f)} onDelete={editing && onDelete ? () => { onDelete(f.id); onClose() } : undefined} />}>
      <FormGrid cols={3}>
        <Field label="Location (city)"><Input list="res-location-suggestions" {...txt('name')} placeholder="e.g. Bengaluru" /><datalist id="res-location-suggestions">{RES_LOCATIONS.map((l) => <option key={l} value={l} />)}</datalist></Field>
        <Field label="Office / campus" className="col-span-2"><Input {...txt('office')} /></Field>
        <Field label="FTEs"><Input {...num('ftes')} /></Field>
        <Field label="Seats"><Input {...num('seats')} /></Field>
        <Field label={`Cost index (${baseName} = 1.00)`}><Input {...num('costIndex')} step="0.01" /></Field>
        <Field label="Chart colour"><Input type="color" {...txt('color')} className="h-9 p-1" /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- People cost row ---------- */
export function PeopleCostForm({ open, onClose, value, onSave }: { open: boolean; onClose: () => void; value: PeopleCostRow | null; onSave: (r: PeopleCostRow) => void }) {
  const m: Money = useMoney()
  const { f, cnv } = useForm<PeopleCostRow>(value ?? { id: '', businessUnit: '', budgetCr: 0, actualCr: 0 }, open)
  return (
    <Modal open={open} onClose={onClose} title={`Edit People Cost – ${f.businessUnit}`} width="max-w-md" footer={<Footer onClose={onClose} onSave={() => onSave(f)} />}>
      <FormGrid cols={2}>
        <Field label={`Annual budget (${m.unitLabel})`}><Input {...cnv('budgetCr', m.inputValue, m.toBase)} /></Field>
        <Field label={`Annual run-rate / actual (${m.unitLabel})`}><Input {...cnv('actualCr', m.inputValue, m.toBase)} /></Field>
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

/* ---------- Generic numeric grid editor (headcount by business unit, time to hire, forecast…) ---------- */
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
