import { Modal, Field, Input, TextArea, Select, FormGrid } from '../ui'
import { useFields, SelectKV, FormFooter, Checkbox, type WsRow } from './common'
import type { Milestone, RaidItem, Dependency } from '../../data/shared'
import { RISK_CATEGORIES, LIKELIHOOD, IMPACT_SCALE } from '../../data/shared'
import type { Initiative, TeamMember, WsBudgetLine, WsDocument, WsSettings } from '../../data/workstreams'
import { INITIATIVE_STATUSES, MEMBER_TYPES, DOC_TYPES, DOC_STATUSES, ROLE_PROFILE, FUNCTION_AREAS } from '../../data/workstreams'
import { OWNERS, LOCATIONS, MONTHS, type Workstream, type Status, type Impact } from '../../data/common'
import { useMoney } from '../../data/money'

export type FormProps<T> = { initial: T; isNew: boolean; onSave: (v: T) => void; onDelete?: () => void; onClose: () => void; wsOptions: string[] }

const WS_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Not Started', 'Completed'] as const
const MS_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Pending', 'Not Started', 'Completed'] as const
const DEP_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Completed'] as const
const RAID_STATUSES = ['Open', 'In Progress', 'At Risk', 'On Track', 'Overdue', 'Not Started', 'Resolved', 'Closed'] as const
const IMPACTS = ['Critical', 'High', 'Medium', 'Low'] as const
const MS_PHASES = ['Design', 'Build', 'Transition', 'Operate'] as const
const uniq = (a: string[]) => a.filter((v, i) => v && a.indexOf(v) === i)

/* ---------- Workstream ---------- */
export function WorkstreamForm({ initial, isNew, onSave, onDelete, onClose, milestones }: Omit<FormProps<WsRow>, 'wsOptions'> & { milestones: Milestone[] }) {
  const { f, set, txt, num, cnv } = useFields(initial)
  const m = useMoney()
  const own = milestones.filter((x) => x.workstream === f.name)
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add workstream' : `Edit workstream – ${initial.name}`} width="max-w-3xl"
      footer={<FormFooter onClose={onClose} onDelete={onDelete} onSave={() => onSave({ ...f, name: f.name.trim() as Workstream })} />}>
      <FormGrid cols={3}>
        <Field label="Workstream name" className="col-span-2"><Input {...txt('name')} placeholder="e.g. Data & Analytics" /></Field>
        <Field label="Status"><Select options={WS_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as Status)} /></Field>
        <Field label="Description" className="col-span-3"><TextArea {...txt('description')} /></Field>
        <Field label="Overall progress %"><Input {...num('progress')} min={0} max={100} /></Field>
        <Field label="Schedule health"><Select options={WS_STATUSES} value={f.scheduleHealth} onChange={(e) => set('scheduleHealth', e.target.value as Status)} /></Field>
        <Field label="Budget health"><Select options={WS_STATUSES} value={f.budgetHealth} onChange={(e) => set('budgetHealth', e.target.value as Status)} /></Field>
        <Field label="Owner"><Select options={uniq([f.owner, ...OWNERS])} {...txt('owner')} /></Field>
        <Field label="Lead"><Input {...txt('lead')} /></Field>
        <Field label="Executive sponsor"><Input {...txt('executiveSponsor')} /></Field>
        <Field label="Team size (planned)"><Input {...num('teamSize')} min={0} /></Field>
        <Field label="Active initiatives (planned)"><Input {...num('activeInitiatives')} min={0} /></Field>
        <Field label="Key milestone">
          <SelectKV allowEmpty="Auto (earliest open milestone)" options={own.map((m) => ({ value: m.id, label: m.name }))} value={f.keyMilestoneId ?? ''} onChange={(e) => set('keyMilestoneId', e.target.value || undefined)} />
        </Field>
        <Field label={`Approved budget (${m.unitLabel})`}><Input {...cnv('approvedBudgetCr', m.inputValue, m.toBase)} /></Field>
        <Field label={`Actual spend (${m.unitLabel})`}><Input {...cnv('actualSpendCr', m.inputValue, m.toBase)} /></Field>
        <Field label={`Forecast at completion (${m.unitLabel})`}><Input {...cnv('forecastAtCompletionCr', m.inputValue, m.toBase)} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Page settings (overall progress + trend) ---------- */
export function SettingsForm({ initial, onSave, onClose }: { initial: WsSettings; onSave: (v: WsSettings) => void; onClose: () => void }) {
  const { f, set, num } = useFields(initial)
  const arr = (k: 'trendPlan' | 'trendActual', i: number, v: string) => set(k, f[k].map((x, j) => (j === i ? parseFloat(v) || 0 : x)))
  return (
    <Modal open onClose={onClose} title="Edit workstream KPIs" width="max-w-3xl" footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} />}>
      <FormGrid cols={2}>
        <Field label="Overall workstream progress %"><Input {...num('overallProgress')} min={0} max={100} /></Field>
        <Field label="Change vs last month (pp)"><Input {...num('overallProgressDelta')} /></Field>
      </FormGrid>
      <div className="mt-4 text-[12px] font-medium text-ink-700 mb-1">Progress Trend (Overall) – Plan vs Actual by month (%)</div>
      <div className="grid grid-cols-12 gap-1">
        {MONTHS.map((m, i) => (
          <div key={m} className="text-center">
            <div className="text-[11px] text-ink-500 mb-1">{m}</div>
            <input className="input px-1 py-1 text-center text-[12px]" type="number" value={f.trendPlan[i]} onChange={(e) => arr('trendPlan', i, e.target.value)} />
            <input className="input px-1 py-1 text-center text-[12px] mt-1" type="number" value={f.trendActual[i]} onChange={(e) => arr('trendActual', i, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="text-[11px] text-ink-500 mt-1">First row = Plan, second row = Actual.</div>
    </Modal>
  )
}

/* ---------- Initiative ---------- */
export function InitiativeForm({ initial, isNew, onSave, onDelete, onClose, wsOptions, milestones }: FormProps<Initiative> & { milestones: Milestone[] }) {
  const { f, set, txt, num } = useFields(initial)
  const own = milestones.filter((m) => m.workstream === f.workstream)
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add initiative' : 'Edit initiative'} footer={<FormFooter onClose={onClose} onDelete={onDelete} onSave={() => onSave(f)} />}>
      <FormGrid cols={2}>
        <Field label="Initiative name" className="col-span-2"><Input {...txt('name')} /></Field>
        <Field label="Workstream"><Select options={wsOptions} value={f.workstream} onChange={(e) => set('workstream', e.target.value as Workstream)} /></Field>
        <Field label="Owner"><Select options={uniq([f.owner, ...OWNERS])} {...txt('owner')} /></Field>
        <Field label="Status"><Select options={INITIATIVE_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as Initiative['status'])} /></Field>
        <Field label="Progress %"><Input {...num('progress')} min={0} max={100} /></Field>
        <Field label="Start"><Input type="date" {...txt('start')} /></Field>
        <Field label="End"><Input type="date" {...txt('end')} /></Field>
        <Field label="Linked milestone" className="col-span-2">
          <SelectKV allowEmpty="— none —" options={own.map((m) => ({ value: m.id, label: m.name }))} value={f.milestoneId ?? ''} onChange={(e) => set('milestoneId', e.target.value || undefined)} />
        </Field>
        <Field label="Description" className="col-span-2"><TextArea {...txt('description')} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Milestone (shared collection) ---------- */
export function MilestoneForm({ initial, isNew, onSave, onDelete, onClose, wsOptions }: FormProps<Milestone>) {
  const { f, set, txt, num, chk } = useFields(initial)
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add milestone' : 'Edit milestone'} footer={<FormFooter onClose={onClose} onDelete={onDelete} onSave={() => onSave(f)} />}>
      <FormGrid cols={2}>
        <Field label="Milestone" className="col-span-2"><Input {...txt('name')} /></Field>
        <Field label="Workstream"><Select options={wsOptions} value={f.workstream} onChange={(e) => set('workstream', e.target.value as Workstream)} /></Field>
        <Field label="Owner"><Select options={uniq([f.owner, ...OWNERS])} {...txt('owner')} /></Field>
        <Field label="Status"><Select options={MS_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as Status)} /></Field>
        <Field label="Phase"><Select options={MS_PHASES} value={f.phase} onChange={(e) => set('phase', e.target.value as Milestone['phase'])} /></Field>
        <Field label="Start date"><Input type="date" {...txt('startDate')} /></Field>
        <Field label="Due date"><Input type="date" {...txt('dueDate')} /></Field>
        <Field label="Progress %"><Input {...num('progress')} min={0} max={100} /></Field>
        <Checkbox label="Key milestone (shown on Dashboard)" {...chk('critical')} />
      </FormGrid>
    </Modal>
  )
}

/* ---------- Team member ---------- */
export function TeamMemberForm({ initial, isNew, onSave, onDelete, onClose, wsOptions, people = [] }: FormProps<TeamMember> & { people?: string[] }) {
  const { f, set, txt, num } = useFields(initial)
  const applyRole = (role: string) => { set('role', role); const prof = ROLE_PROFILE[role]; if (prof) { if (!f.functionArea || f.functionArea === 'General') set('functionArea', prof.fn); if (!f.responsibilities) set('responsibilities', prof.duties) } }
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add team member' : `Edit team member – ${initial.name}`} width="max-w-3xl" footer={<FormFooter onClose={onClose} onDelete={onDelete} onSave={() => onSave(f)} />}>
      <FormGrid cols={3}>
        <Field label="Name"><Input {...txt('name')} /></Field>
        <Field label="Role"><Input list="tm-roles" value={f.role} onChange={(e) => applyRole(e.target.value)} /><datalist id="tm-roles">{Object.keys(ROLE_PROFILE).map((r) => <option key={r} value={r} />)}</datalist></Field>
        <Field label="Function"><Input list="tm-functions" {...txt('functionArea')} /><datalist id="tm-functions">{FUNCTION_AREAS.map((r) => <option key={r} value={r} />)}</datalist></Field>
        <Field label="Workstream"><Select options={wsOptions} value={f.workstream} onChange={(e) => set('workstream', e.target.value as Workstream)} /></Field>
        <Field label="Reports to"><Select options={['—', ...uniq(people.filter((p) => p !== f.name))]} value={f.reportsTo ?? '—'} onChange={(e) => set('reportsTo', e.target.value === '—' ? undefined : e.target.value)} /></Field>
        <Field label="Type"><Select options={MEMBER_TYPES} value={f.type} onChange={(e) => set('type', e.target.value as TeamMember['type'])} /></Field>
        <Field label="Location"><Select options={uniq([f.location, ...LOCATIONS])} {...txt('location')} /></Field>
        <Field label="Allocation %"><Input {...num('allocation')} min={0} max={100} /></Field>
        <Field label="Start date"><Input type="date" {...txt('startDate')} /></Field>
        <Field label="What they are doing (responsibilities)" className="col-span-3"><TextArea value={f.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} placeholder="Key responsibilities and current work on this workstream" /></Field>
        <div className="col-span-3"><Checkbox label="Workstream lead" checked={!!f.isLead} onChange={(e) => set('isLead', e.target.checked)} /></div>
      </FormGrid>
    </Modal>
  )
}

/* ---------- RAID (shared collection) ---------- */
export function RaidForm({ initial, isNew, onSave, onDelete, onClose, wsOptions }: FormProps<RaidItem>) {
  const { f, set, txt, num } = useFields(initial)
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add risk / issue' : `Edit ${f.code}`} width="max-w-3xl" footer={<FormFooter onClose={onClose} onDelete={onDelete} onSave={() => onSave(f)} />}>
      <FormGrid cols={3}>
        <Field label="Type"><Select options={['Risk', 'Issue']} value={f.type} onChange={(e) => set('type', e.target.value as RaidItem['type'])} /></Field>
        <Field label="Code"><Input {...txt('code')} /></Field>
        <Field label="Workstream"><Select options={uniq([f.workstream, ...wsOptions])} {...txt('workstream')} /></Field>
        <Field label="Title" className="col-span-2"><Input {...txt('title')} /></Field>
        <Field label="Short title"><Input {...txt('shortTitle')} /></Field>
        <Field label="Category"><Select options={RISK_CATEGORIES} value={f.category} onChange={(e) => set('category', e.target.value as RaidItem['category'])} /></Field>
        <Field label="Impact level"><Select options={IMPACTS} value={f.level} onChange={(e) => set('level', e.target.value as Impact)} /></Field>
        <Field label="Status"><Select options={RAID_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as Status)} /></Field>
        <Field label="Owner"><Select options={uniq([f.owner, ...OWNERS])} {...txt('owner')} /></Field>
        <Field label="Opened on"><Input type="date" {...txt('openedOn')} /></Field>
        <Field label="Due date"><Input type="date" {...txt('dueDate')} /></Field>
        <Field label="Likelihood"><Select options={LIKELIHOOD} value={f.likelihood} onChange={(e) => set('likelihood', e.target.value as RaidItem['likelihood'])} /></Field>
        <Field label="Impact"><Select options={IMPACT_SCALE} value={f.impact} onChange={(e) => set('impact', e.target.value as RaidItem['impact'])} /></Field>
        <Field label="Impact score (0–10)"><Input {...num('impactScore')} min={0} max={10} /></Field>
        <Field label="Description" className="col-span-3"><TextArea {...txt('description')} /></Field>
        <Field label="Mitigation / resolution" className="col-span-3"><TextArea {...txt('mitigation')} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Budget line ---------- */
export function BudgetLineForm({ initial, isNew, onSave, onDelete, onClose, wsOptions }: FormProps<WsBudgetLine>) {
  const { f, set, txt, cnv } = useFields(initial)
  const m = useMoney()
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add budget line' : 'Edit budget line'} width="max-w-xl" footer={<FormFooter onClose={onClose} onDelete={onDelete} onSave={() => onSave(f)} />}>
      <FormGrid cols={2}>
        <Field label="Workstream" className="col-span-2"><Select options={wsOptions} value={f.workstream} onChange={(e) => set('workstream', e.target.value as Workstream)} /></Field>
        <Field label="Category" className="col-span-2"><Input {...txt('category')} /></Field>
        <Field label={`Planned (${m.unitLabel})`}><Input {...cnv('plannedCr', m.inputValue, m.toBase)} /></Field>
        <Field label={`Actual (${m.unitLabel})`}><Input {...cnv('actualCr', m.inputValue, m.toBase)} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Dependency (shared collection) ---------- */
export function DependencyForm({ initial, isNew, onSave, onDelete, onClose, wsOptions }: FormProps<Dependency>) {
  const { f, set, txt } = useFields(initial)
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add dependency' : 'Edit dependency'} footer={<FormFooter onClose={onClose} onDelete={onDelete} onSave={() => onSave(f)} />}>
      <FormGrid cols={2}>
        <Field label="Workstream (depends)"><Select options={wsOptions} value={f.from} onChange={(e) => set('from', e.target.value as Workstream)} /></Field>
        <Field label="Depends on"><Select options={wsOptions} value={f.on} onChange={(e) => set('on', e.target.value as Workstream)} /></Field>
        <Field label="Dependency type" className="col-span-2"><Input {...txt('type')} placeholder="e.g. Physical Infrastructure" /></Field>
        <Field label="Description" className="col-span-2"><TextArea {...txt('description')} /></Field>
        <Field label="Impact"><Select options={IMPACTS} value={f.impact} onChange={(e) => set('impact', e.target.value as Impact)} /></Field>
        <Field label="Status"><Select options={DEP_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as Status)} /></Field>
        <Field label="Due date"><Input type="date" {...txt('dueDate')} /></Field>
        <Field label="Owner"><Select options={uniq([f.owner, ...OWNERS])} {...txt('owner')} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Document ---------- */
export function DocumentForm({ initial, isNew, onSave, onDelete, onClose, wsOptions }: FormProps<WsDocument>) {
  const { f, set, txt } = useFields(initial)
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add document' : 'Edit document'} footer={<FormFooter onClose={onClose} onDelete={onDelete} onSave={() => onSave(f)} />}>
      <FormGrid cols={2}>
        <Field label="Title" className="col-span-2"><Input {...txt('title')} /></Field>
        <Field label="Type"><Select options={DOC_TYPES} value={f.type} onChange={(e) => set('type', e.target.value as WsDocument['type'])} /></Field>
        <Field label="Workstream"><Select options={wsOptions} value={f.workstream} onChange={(e) => set('workstream', e.target.value as Workstream)} /></Field>
        <Field label="Owner"><Select options={uniq([f.owner, ...OWNERS])} {...txt('owner')} /></Field>
        <Field label="Version"><Input {...txt('version')} /></Field>
        <Field label="Last updated"><Input type="date" {...txt('updated')} /></Field>
        <Field label="Status"><Select options={DOC_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as WsDocument['status'])} /></Field>
      </FormGrid>
    </Modal>
  )
}
