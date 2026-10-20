import { useState } from 'react'
import { Modal, Field, Input, TextArea, Select, FormGrid, ConfirmDelete } from '../ui'
import { OWNERS, WORKSTREAMS, TODAY } from '../../data/common'
import type { Milestone, RaidItem, Dependency } from '../../data/shared'
import { RISK_CATEGORIES, LIKELIHOOD, IMPACT_SCALE } from '../../data/shared'
import type { Activity } from '../../data/wbs'
import { uid } from '../../store/useStore'
import {
  WAVE_STATUSES, WAVE_COLORS, KT_STATUSES, KT_SIGNOFF, KT_FUNCTIONS, READINESS_WORKSTREAMS, DIMENSIONS, READINESS_STATUSES, GAP_STATUSES, assessmentScore,
  type Wave, type KtItem, type ReadinessAssessment, type ReadinessGap, type ChecklistItem, type TransitionSettings, type Dimension, type GapStatus, type KtStatus, type KtSignOff, type WaveStatus,
} from '../../data/transition'

/* ---------- small helpers ---------- */
function useForm<T extends object>(initial: T) {
  const [f, setF] = useState<T>(initial)
  const set = <K extends keyof T>(k: K, v: T[K]) => setF((p) => ({ ...p, [k]: v }))
  return { f, set, setF }
}
const num = (v: string) => (v === '' ? 0 : Number(v))
type Footer = { onClose: () => void; onSave: () => void; onDelete?: () => void; saveLabel?: string }
function FormFooter({ onClose, onSave, onDelete, saveLabel = 'Save' }: Footer) {
  return (
    <>
      {onDelete && <span className="mr-auto"><ConfirmDelete onConfirm={onDelete} /></span>}
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={onSave}>{saveLabel}</button>
    </>
  )
}
const waveOptions = (waves: Wave[]) => waves.map((w) => String(w.number))

/* ---------- Wave ---------- */
export function WaveForm({ initial, waves, onClose, onSave, onDelete }: { initial: Wave | null; waves: Wave[]; onClose: () => void; onSave: (w: Wave) => void; onDelete?: () => void }) {
  const nextNo = (Math.max(0, ...waves.map((w) => w.number)) + 1)
  const { f, set } = useForm<Wave>(initial ?? { id: uid('wave'), number: nextNo, scope: '', startDate: '2027-02-01', endDate: '2027-02-28', status: 'Not Started', progress: 0, color: WAVE_COLORS[(nextNo - 1) % WAVE_COLORS.length], lead: OWNERS[0] })
  return (
    <Modal open onClose={onClose} title={initial ? `Edit Wave ${initial.number}` : 'Add Transition Wave'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Wave number"><Input type="number" min={1} value={f.number} onChange={(e) => set('number', num(e.target.value))} /></Field>
        <Field label="Scope (comma-separated functions)" className="col-span-2"><Input value={f.scope} placeholder="Finance, HR, Procurement" onChange={(e) => set('scope', e.target.value)} /></Field>
        <Field label="Start date"><Input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
        <Field label="End date"><Input type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} /></Field>
        <Field label="Status"><Select options={WAVE_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as WaveStatus)} /></Field>
        <Field label="Progress %"><Input type="number" min={0} max={100} value={f.progress} onChange={(e) => set('progress', Math.max(0, Math.min(100, num(e.target.value))))} /></Field>
        <Field label="Wave lead"><Select options={OWNERS} value={f.lead} onChange={(e) => set('lead', e.target.value)} /></Field>
        <Field label="Colour"><div className="flex items-center gap-1.5 pt-1">{WAVE_COLORS.map((c) => <button key={c} className="w-6 h-6 rounded-full border-2 cursor-pointer" style={{ background: c, borderColor: f.color === c ? '#0B2240' : 'transparent' }} onClick={() => set('color', c)} />)}</div></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Milestone (shared collection) + wave ---------- */
export function MilestoneForm({ initial, initialWave, waves, onClose, onSave, onDelete }: {
  initial: Milestone | null; initialWave?: number; waves: Wave[]; onClose: () => void; onSave: (m: Milestone, wave: number) => void; onDelete?: () => void
}) {
  const { f, set } = useForm<Milestone>(initial ?? { id: uid('ms'), name: '', workstream: 'Transition Readiness', dueDate: TODAY, status: 'On Track', owner: OWNERS[0], phase: 'Transition', critical: false })
  const [wave, setWave] = useState(String(initialWave ?? waves[0]?.number ?? 1))
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit Milestone' : 'Add Milestone'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f, Number(wave))} onDelete={onDelete} />}>
      <FormGrid cols={2}>
        <Field label="Milestone" className="col-span-2"><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Wave"><Select options={waveOptions(waves)} value={wave} onChange={(e) => setWave(e.target.value)} /></Field>
        <Field label="Workstream"><Select options={WORKSTREAMS} value={f.workstream} onChange={(e) => set('workstream', e.target.value as Milestone['workstream'])} /></Field>
        <Field label="Target date"><Input type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label="Status"><Select options={['On Track', 'At Risk', 'Delayed', 'Pending', 'Not Started', 'Completed']} value={f.status} onChange={(e) => set('status', e.target.value as Milestone['status'])} /></Field>
        <Field label="Owner"><Select options={OWNERS} value={f.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
        <Field label="Key milestone"><Select options={['No', 'Yes']} value={f.critical ? 'Yes' : 'No'} onChange={(e) => set('critical', e.target.value === 'Yes')} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Risk / Issue (shared 'raid') ---------- */
export function RaidForm({ initial, existing, onClose, onSave, onDelete }: { initial: RaidItem | null; existing: RaidItem[]; onClose: () => void; onSave: (r: RaidItem) => void; onDelete?: () => void }) {
  const nextCode = (type: 'Risk' | 'Issue') => `${type === 'Risk' ? 'R' : 'I'}-${String(existing.length + 1).padStart(3, '0')}`
  const { f, set, setF } = useForm<RaidItem>(initial ?? {
    id: uid('raid'), code: nextCode('Risk'), type: 'Risk', title: '', workstream: 'Transition', category: 'Process & Operations', level: 'Medium', status: 'Open', owner: OWNERS[0],
    dueDate: TODAY, openedOn: TODAY, likelihood: 'Medium', impact: 'Medium', impactScore: 5, description: '', mitigation: '',
  })
  return (
    <Modal open onClose={onClose} title={initial ? `Edit ${initial.code}` : 'Log Issue / Risk'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} saveLabel={initial ? 'Save' : 'Log'} />}>
      <FormGrid cols={3}>
        <Field label="Type"><Select options={['Risk', 'Issue']} value={f.type} onChange={(e) => { const t = e.target.value as 'Risk' | 'Issue'; setF({ ...f, type: t, code: initial ? f.code : nextCode(t) }) }} /></Field>
        <Field label="Title" className="col-span-2"><Input value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Workstream"><Input value={f.workstream} onChange={(e) => set('workstream', e.target.value)} /></Field>
        <Field label="Category"><Select options={RISK_CATEGORIES} value={f.category} onChange={(e) => set('category', e.target.value as RaidItem['category'])} /></Field>
        <Field label="Level"><Select options={['Critical', 'High', 'Medium', 'Low']} value={f.level} onChange={(e) => set('level', e.target.value as RaidItem['level'])} /></Field>
        <Field label="Status"><Select options={['Open', 'In Progress', 'At Risk', 'On Track', 'Not Started', 'Overdue', 'Resolved', 'Closed']} value={f.status} onChange={(e) => set('status', e.target.value as RaidItem['status'])} /></Field>
        <Field label="Owner"><Select options={OWNERS} value={f.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
        <Field label="Due date"><Input type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label="Likelihood"><Select options={LIKELIHOOD} value={f.likelihood} onChange={(e) => set('likelihood', e.target.value as RaidItem['likelihood'])} /></Field>
        <Field label="Impact"><Select options={IMPACT_SCALE} value={f.impact} onChange={(e) => set('impact', e.target.value as RaidItem['impact'])} /></Field>
        <Field label="Impact score (0-10)"><Input type="number" step="0.1" min={0} max={10} value={f.impactScore} onChange={(e) => set('impactScore', num(e.target.value))} /></Field>
        <Field label="Description" className="col-span-3"><TextArea value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Mitigation / resolution" className="col-span-3"><TextArea value={f.mitigation ?? ''} onChange={(e) => set('mitigation', e.target.value)} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- KT item ---------- */
export function KtForm({ initial, waves, onClose, onSave, onDelete }: { initial: KtItem | null; waves: Wave[]; onClose: () => void; onSave: (k: KtItem) => void; onDelete?: () => void }) {
  const { f, set, setF } = useForm<KtItem>(initial ?? { id: uid('kt'), process: '', function: KT_FUNCTIONS[0], wave: waves[0]?.number ?? 1, globalOwner: '', indiaOwner: OWNERS[0], sessionsPlanned: 6, sessionsDone: 0, status: 'Not Started', signOff: 'Not Started', targetDate: TODAY })
  const setSessions = (planned: number, done: number) => {
    const status: KtStatus = done >= planned && planned > 0 ? 'Completed' : done > 0 ? 'In Progress' : 'Not Started'
    setF({ ...f, sessionsPlanned: planned, sessionsDone: done, status, signOff: status === 'Completed' ? (f.signOff === 'Not Started' ? 'Pending' : f.signOff) : f.signOff })
  }
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit Knowledge Transfer Item' : 'Add Knowledge Transfer Item'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Process / activity" className="col-span-2"><Input value={f.process} onChange={(e) => set('process', e.target.value)} /></Field>
        <Field label="Function"><Select options={KT_FUNCTIONS} value={f.function} onChange={(e) => set('function', e.target.value)} /></Field>
        <Field label="Wave"><Select options={waveOptions(waves)} value={String(f.wave)} onChange={(e) => set('wave', Number(e.target.value))} /></Field>
        <Field label="Global owner"><Input value={f.globalOwner} onChange={(e) => set('globalOwner', e.target.value)} /></Field>
        <Field label="India owner"><Select options={OWNERS} value={f.indiaOwner} onChange={(e) => set('indiaOwner', e.target.value)} /></Field>
        <Field label="Sessions planned"><Input type="number" min={0} value={f.sessionsPlanned} onChange={(e) => setSessions(num(e.target.value), f.sessionsDone)} /></Field>
        <Field label="Sessions done"><Input type="number" min={0} value={f.sessionsDone} onChange={(e) => setSessions(f.sessionsPlanned, num(e.target.value))} /></Field>
        <Field label="Target date"><Input type="date" value={f.targetDate} onChange={(e) => set('targetDate', e.target.value)} /></Field>
        <Field label="Status"><Select options={KT_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as KtStatus)} /></Field>
        <Field label="Sign-off"><Select options={KT_SIGNOFF} value={f.signOff} onChange={(e) => set('signOff', e.target.value as KtSignOff)} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Readiness assessment ---------- */
export function AssessmentForm({ initial, waves, onClose, onSave, onDelete }: { initial: ReadinessAssessment | null; waves: Wave[]; onClose: () => void; onSave: (a: ReadinessAssessment) => void; onDelete?: () => void }) {
  const { f, set, setF } = useForm<ReadinessAssessment>(initial ?? {
    id: uid('ra'), wave: waves[0]?.number ?? 1, workstream: READINESS_WORKSTREAMS[0], dims: Object.fromEntries(DIMENSIONS.map((d) => [d, 50])) as Record<Dimension, number>, status: 'On Track', nextAction: '', assessedOn: TODAY,
  })
  const score = assessmentScore(f)
  return (
    <Modal open onClose={onClose} title="Update Readiness Assessment" footer={<FormFooter onClose={onClose} onSave={() => onSave({ ...f, assessedOn: TODAY })} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Wave"><Select options={waveOptions(waves)} value={String(f.wave)} onChange={(e) => set('wave', Number(e.target.value))} /></Field>
        <Field label="Workstream" className="col-span-2"><Select options={READINESS_WORKSTREAMS} value={f.workstream} onChange={(e) => set('workstream', e.target.value)} /></Field>
      </FormGrid>
      <div className="mt-3 space-y-2">
        {DIMENSIONS.map((d) => (
          <div key={d} className="flex items-center gap-3 text-[12.5px]">
            <span className="w-[190px] text-ink-700">{d}</span>
            <input type="range" min={0} max={100} value={f.dims[d]} onChange={(e) => setF({ ...f, dims: { ...f.dims, [d]: num(e.target.value) } })} className="flex-1 accent-brand-600" />
            <Input type="number" min={0} max={100} value={f.dims[d]} onChange={(e) => setF({ ...f, dims: { ...f.dims, [d]: Math.max(0, Math.min(100, num(e.target.value))) } })} className="!w-20" />
          </div>
        ))}
        <div className="flex items-center justify-between text-[12.5px] pt-1"><span className="text-ink-500">Overall readiness score (average of dimensions)</span><span className="text-[16px] font-bold text-ink-900">{score}%</span></div>
      </div>
      <FormGrid cols={3}>
        <Field label="Status"><Select options={READINESS_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as ReadinessAssessment['status'])} /></Field>
        <Field label="Next action" className="col-span-2"><Input value={f.nextAction} onChange={(e) => set('nextAction', e.target.value)} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Readiness gap ---------- */
export function GapForm({ initial, waves, existing, onClose, onSave, onDelete }: { initial: ReadinessGap | null; waves: Wave[]; existing: ReadinessGap[]; onClose: () => void; onSave: (g: ReadinessGap) => void; onDelete?: () => void }) {
  const { f, set } = useForm<ReadinessGap>(initial ?? {
    id: uid('gap'), code: `G-${String(existing.length + 1).padStart(3, '0')}`, wave: waves[0]?.number ?? 1, dimension: DIMENSIONS[0], workstream: READINESS_WORKSTREAMS[0], description: '', severity: 'Medium', owner: OWNERS[0], status: 'New', raised: TODAY, due: TODAY,
  })
  return (
    <Modal open onClose={onClose} title={initial ? `Edit Gap ${initial.code}` : 'Add Readiness Gap'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Description" className="col-span-3"><Input value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Wave"><Select options={waveOptions(waves)} value={String(f.wave)} onChange={(e) => set('wave', Number(e.target.value))} /></Field>
        <Field label="Dimension"><Select options={DIMENSIONS} value={f.dimension} onChange={(e) => set('dimension', e.target.value as Dimension)} /></Field>
        <Field label="Workstream"><Select options={READINESS_WORKSTREAMS} value={f.workstream} onChange={(e) => set('workstream', e.target.value)} /></Field>
        <Field label="Severity"><Select options={['Critical', 'High', 'Medium', 'Low']} value={f.severity} onChange={(e) => set('severity', e.target.value as ReadinessGap['severity'])} /></Field>
        <Field label="Owner"><Select options={OWNERS} value={f.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
        <Field label="Status"><Select options={GAP_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as GapStatus)} /></Field>
        <Field label="Raised on"><Input type="date" value={f.raised} onChange={(e) => set('raised', e.target.value)} /></Field>
        <Field label="Due"><Input type="date" value={f.due} onChange={(e) => set('due', e.target.value)} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Stabilization checklist item ---------- */
export function ChecklistForm({ initial, onClose, onSave, onDelete }: { initial: ChecklistItem | null; onClose: () => void; onSave: (c: ChecklistItem) => void; onDelete?: () => void }) {
  const { f, set } = useForm<ChecklistItem>(initial ?? { id: uid('chk'), item: '', owner: OWNERS[0], done: false, area: 'Governance' })
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit Checklist Item' : 'Add Checklist Item'} width="max-w-xl" footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={2}>
        <Field label="Item" className="col-span-2"><Input value={f.item} onChange={(e) => set('item', e.target.value)} /></Field>
        <Field label="Area"><Select options={['Governance', 'Support', 'Performance', 'Process', 'People', 'Technology', 'Facilities']} value={f.area} onChange={(e) => set('area', e.target.value)} /></Field>
        <Field label="Owner"><Select options={OWNERS} value={f.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
        <Field label="Done"><Select options={['No', 'Yes']} value={f.done ? 'Yes' : 'No'} onChange={(e) => set('done', e.target.value === 'Yes')} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Dependency (shared) ---------- */
export function DependencyForm({ initial, onClose, onSave, onDelete }: { initial: Dependency | null; onClose: () => void; onSave: (d: Dependency) => void; onDelete?: () => void }) {
  const { f, set } = useForm<Dependency>(initial ?? { id: uid('dep'), from: 'Transition Readiness', on: 'Technology & Infrastructure', type: 'System Access', description: '', impact: 'Medium', status: 'On Track', dueDate: TODAY, owner: OWNERS[0] })
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit Dependency' : 'Add Dependency'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Depends on (workstream)"><Select options={WORKSTREAMS} value={f.on} onChange={(e) => set('on', e.target.value as Dependency['on'])} /></Field>
        <Field label="Type" className="col-span-2"><Input value={f.type} placeholder="System Access / Hiring Wave Joiners / …" onChange={(e) => set('type', e.target.value)} /></Field>
        <Field label="Description" className="col-span-3"><Input value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Impact"><Select options={['Critical', 'High', 'Medium', 'Low']} value={f.impact} onChange={(e) => set('impact', e.target.value as Dependency['impact'])} /></Field>
        <Field label="Status"><Select options={['On Track', 'At Risk', 'Delayed', 'Completed']} value={f.status} onChange={(e) => set('status', e.target.value as Dependency['status'])} /></Field>
        <Field label="Due date"><Input type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label="Owner"><Select options={OWNERS} value={f.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- WBS activity (shared 'activities') ---------- */
export function ActivityForm({ initial, onClose, onSave }: { initial: Activity; onClose: () => void; onSave: (a: Activity) => void }) {
  const { f, set } = useForm<Activity>(initial)
  return (
    <Modal open onClose={onClose} title={`${f.code} ${f.name}`} footer={<FormFooter onClose={onClose} onSave={() => onSave({ ...f, lastUpdated: TODAY })} />}>
      <FormGrid cols={3}>
        <Field label="Status"><Select options={['Not Started', 'In Progress', 'On Track', 'At Risk', 'Delayed', 'Completed']} value={f.status} onChange={(e) => set('status', e.target.value as Activity['status'])} /></Field>
        <Field label="% complete"><Input type="number" min={0} max={100} value={f.percentComplete} onChange={(e) => set('percentComplete', Math.max(0, Math.min(100, num(e.target.value))))} /></Field>
        <Field label="RAG"><Select options={['Green', 'Amber', 'Red']} value={f.rag} onChange={(e) => set('rag', e.target.value as Activity['rag'])} /></Field>
        <Field label="Forecast start"><Input type="date" value={f.forecastStart} onChange={(e) => set('forecastStart', e.target.value)} /></Field>
        <Field label="Forecast end"><Input type="date" value={f.forecastEnd} onChange={(e) => set('forecastEnd', e.target.value)} /></Field>
        <Field label="Responsible"><Select options={OWNERS} value={f.responsible} onChange={(e) => set('responsible', e.target.value)} /></Field>
        <Field label="Deliverable" className="col-span-3"><Input value={f.deliverable} onChange={(e) => set('deliverable', e.target.value)} /></Field>
        <Field label="Sign-off"><Select options={['Pending', 'Signed']} value={f.signOff} onChange={(e) => set('signOff', e.target.value as Activity['signOff'])} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Settings (non-derivable KPI numbers) ---------- */
export function SettingsForm({ initial, waves, onClose, onSave }: { initial: TransitionSettings; waves: Wave[]; onClose: () => void; onSave: (s: TransitionSettings) => void }) {
  const { f, set, setF } = useForm<TransitionSettings>(initial)
  const arr = (key: 'trendPlanned' | 'trendActual', i: number, v: number) => setF({ ...f, [key]: f[key].map((x, j) => (j === i ? v : x)) })
  return (
    <Modal open onClose={onClose} title="Update Transition KPIs" footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} />}>
      <FormGrid cols={3}>
        <Field label="Go-live wave"><Select options={waveOptions(waves)} value={String(f.goLiveWave)} onChange={(e) => set('goLiveWave', Number(e.target.value))} /></Field>
        <Field label="Target go-live date"><Input type="date" value={f.goLiveDate} onChange={(e) => set('goLiveDate', e.target.value)} /></Field>
        <Field label="Go-live status"><Select options={['On track', 'At risk', 'Delayed']} value={f.goLiveStatus} onChange={(e) => set('goLiveStatus', e.target.value as TransitionSettings['goLiveStatus'])} /></Field>
        <Field label="KT change vs last month (%)"><Input type="number" value={f.ktDeltaPct} onChange={(e) => set('ktDeltaPct', num(e.target.value))} /></Field>
        <Field label="Stabilization change vs last month (%)"><Input type="number" value={f.stabilizationDeltaPct} onChange={(e) => set('stabilizationDeltaPct', num(e.target.value))} /></Field>
        <Field label="Readiness 'complete' threshold (%)"><Input type="number" min={0} max={100} value={f.readinessThreshold} onChange={(e) => set('readinessThreshold', num(e.target.value))} /></Field>
      </FormGrid>
      <h4 className="text-[13px] font-semibold mt-4 mb-2">Transition Readiness by Dimension (%)</h4>
      <FormGrid cols={3}>
        {DIMENSIONS.map((d) => <Field key={d} label={d}><Input type="number" min={0} max={100} value={f.dims[d]} onChange={(e) => setF({ ...f, dims: { ...f.dims, [d]: Math.max(0, Math.min(100, num(e.target.value))) } })} /></Field>)}
      </FormGrid>
      <h4 className="text-[13px] font-semibold mt-4 mb-2">Transition Milestone Trend (% complete)</h4>
      <table className="w-full tbl text-[12.5px]">
        <thead><tr><th className="th">Month</th>{f.trendMonths.map((m) => <th key={m} className="th">{m}</th>)}</tr></thead>
        <tbody>
          <tr><td className="td">Planned</td>{f.trendPlanned.map((v, i) => <td key={i} className="td"><Input type="number" min={0} max={100} value={v} onChange={(e) => arr('trendPlanned', i, num(e.target.value))} /></td>)}</tr>
          <tr><td className="td">Actual</td>{f.trendActual.map((v, i) => <td key={i} className="td"><Input type="number" min={0} max={100} value={v} onChange={(e) => arr('trendActual', i, num(e.target.value))} /></td>)}</tr>
        </tbody>
      </table>
    </Modal>
  )
}
