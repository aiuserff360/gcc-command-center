import { useState } from 'react'
import { Modal, Field, Input, TextArea, Select, FormGrid, ConfirmDelete } from '../ui'
import { OWNERS, WORKSTREAMS, TODAY } from '../../data/common'
import type { Milestone, RaidItem, Dependency } from '../../data/shared'
import { RISK_CATEGORIES, LIKELIHOOD, IMPACT_SCALE } from '../../data/shared'
import { uid } from '../../store/useStore'
import { GBUS, GEOGRAPHIES, DELIVERY_LOCATIONS, TRANSITION_TYPES, type SubUnit, type BusinessUnit } from '../../data/businessUnits'
import {
  WAVE_STATUSES, WAVE_COLORS, KT_STATUSES, KT_SIGNOFF, DIMENSIONS, DIM_KEY, READINESS_STATUSES, GAP_STATUSES, PROJECT_STATUSES, ACCOUNT_TYPES, ACCOUNT_STATUSES, assessmentScore, blankAssessment, ktStatusFor, isOnboarded,
  type Wave, type KtItem, type ReadinessAssessment, type ReadinessGap, type ChecklistItem, type TransitionSettings, type Dimension, type GapStatus, type KtStatus, type KtSignOff, type WaveStatus, type TransitionProject, type ProjectStatus, type RaidLink, type DepLink, type TransitionAccount, type AccountType, type AccountStatus,
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
const waveOptions = (waves: Wave[]) => [...waves].sort((a, b) => a.number - b.number).map((w) => String(w.number))
const projectLabel = (p: TransitionProject) => `${p.name} (${p.businessUnit}${p.capability ? ` · ${p.capability}` : ''})`

/** Project picker: shows "name (business unit)" and returns the project id. */
function ProjectSelect({ projects, value, onChange, allowNone, className }: { projects: TransitionProject[]; value: string; onChange: (id: string) => void; allowNone?: boolean; className?: string }) {
  const sorted = [...projects].sort((a, b) => a.businessUnit.localeCompare(b.businessUnit) || a.wave - b.wave || a.name.localeCompare(b.name))
  return (
    <select className={`input ${className ?? ''}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowNone && <option value="">– none –</option>}
      {sorted.map((p) => <option key={p.id} value={p.id}>{projectLabel(p)}</option>)}
    </select>
  )
}

/* ---------- Transition project ---------- */
export function ProjectForm({ initial, unitList, subs, waves, businessUnit, wave, onClose, onSave, onDelete }: {
  initial: TransitionProject | null; unitList: BusinessUnit[]; subs: SubUnit[]; waves: Wave[]; businessUnit?: string; wave?: number; onClose: () => void; onSave: (p: TransitionProject) => void; onDelete?: () => void
}) {
  const units = unitList.filter((u) => u.status !== 'Out of Scope').map((u) => u.name)
  const capsOf = (unitName: string) => subs.filter((s) => s.status !== 'Out of Scope' && unitList.find((u) => u.id === s.businessUnitId)?.name === unitName)
  const first = businessUnit ?? units[0] ?? ''
  const cap0 = initial ? undefined : capsOf(first)[0]
  const { f, set, setF } = useForm<TransitionProject>(initial ?? {
    id: uid('proj'), name: '', businessUnit: first, subUnitId: cap0?.id ?? '', capability: cap0?.name ?? '', gbu: cap0?.gbuServed ?? GBUS[0], deliveryLocation: cap0?.deliveryLocation ?? DELIVERY_LOCATIONS[0], transitionType: cap0?.transitionType ?? TRANSITION_TYPES[0],
    wave: wave ?? (cap0 ? Number(cap0.wave.replace('Wave ', '')) : waves[0]?.number ?? 1), status: 'Not Started', progress: 0,
    startDate: TODAY, endDate: TODAY, goLiveDate: TODAY, globalOwner: '', indiaLead: OWNERS[0], region: cap0?.geography ?? GEOGRAPHIES[0], scopeSummary: '', ftes: cap0?.targetHc ?? 0, description: '', notes: '',
  })
  const caps = capsOf(f.businessUnit)
  const setUnit = (u: string) => { const c = capsOf(u)[0]; setF({ ...f, businessUnit: u, ...(c ? fromCap(c) : { subUnitId: '', capability: '' }) }) }
  const fromCap = (c: SubUnit) => ({ subUnitId: c.id, capability: c.name, gbu: c.gbuServed, deliveryLocation: c.deliveryLocation, transitionType: c.transitionType, region: c.geography, wave: Number(c.wave.replace('Wave ', '')) || f.wave })
  const setCap = (id: string) => { const c = subs.find((s) => s.id === id); if (c) setF({ ...f, ...fromCap(c) }) }
  return (
    <Modal open onClose={onClose} title={initial ? `Edit project – ${initial.name}` : 'Add transition project'} width="max-w-3xl" footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Project name" className="col-span-3"><Input value={f.name} placeholder="e.g. SAP / ERP AMS – Networks Europe" onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Business unit"><Select options={units.includes(f.businessUnit) ? units : [f.businessUnit, ...units]} value={f.businessUnit} onChange={(e) => setUnit(e.target.value)} /></Field>
        <Field label="Capability / service" className="col-span-2">
          <select className="input" value={caps.some((c) => c.id === f.subUnitId) ? f.subUnitId : ''} onChange={(e) => setCap(e.target.value)}>
            {!caps.some((c) => c.id === f.subUnitId) && <option value="">{f.capability ? `${f.capability} (not in this business unit)` : '– pick a capability –'}</option>}
            {caps.map((c) => <option key={c.id} value={c.id}>{c.name} · from {c.deliveryLocation} · {c.wave} · {c.gbuServed}</option>)}
          </select>
        </Field>
        <Field label="GBU served"><Select options={GBUS.includes(f.gbu as never) ? GBUS : [f.gbu, ...GBUS]} value={f.gbu} onChange={(e) => set('gbu', e.target.value)} /></Field>
        <Field label="Geography"><Select options={GEOGRAPHIES.includes(f.region as never) ? GEOGRAPHIES : [f.region, ...GEOGRAPHIES]} value={f.region} onChange={(e) => set('region', e.target.value)} /></Field>
        <Field label="Current delivery location"><Select options={DELIVERY_LOCATIONS.includes(f.deliveryLocation as never) ? DELIVERY_LOCATIONS : [f.deliveryLocation, ...DELIVERY_LOCATIONS]} value={f.deliveryLocation} onChange={(e) => set('deliveryLocation', e.target.value)} /></Field>
        <Field label="Transition type"><Select options={TRANSITION_TYPES.includes(f.transitionType as never) ? TRANSITION_TYPES : [f.transitionType, ...TRANSITION_TYPES]} value={f.transitionType} onChange={(e) => set('transitionType', e.target.value)} /></Field>
        <Field label="Wave"><Select options={waveOptions(waves)} value={String(f.wave)} onChange={(e) => set('wave', Number(e.target.value))} /></Field>
        <Field label="Status"><Select options={PROJECT_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as ProjectStatus)} /></Field>
        <Field label="Progress %"><Input type="number" min={0} max={100} value={f.progress} onChange={(e) => set('progress', Math.max(0, Math.min(100, num(e.target.value))))} /></Field>
        <Field label="Start date"><Input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
        <Field label="End date"><Input type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} /></Field>
        <Field label="Go-live date"><Input type="date" value={f.goLiveDate} onChange={(e) => set('goLiveDate', e.target.value)} /></Field>
        <Field label="Global owner"><Input value={f.globalOwner} placeholder="Global process / delivery owner" onChange={(e) => set('globalOwner', e.target.value)} /></Field>
        <Field label="India lead"><Select options={OWNERS} value={f.indiaLead} onChange={(e) => set('indiaLead', e.target.value)} /></Field>
        <Field label="Target Pune FTEs"><Input type="number" min={0} value={f.ftes} onChange={(e) => set('ftes', num(e.target.value))} /></Field>
        <Field label="Scope summary" className="col-span-3"><Input value={f.scopeSummary} placeholder="What moves to the GCC" onChange={(e) => set('scopeSummary', e.target.value)} /></Field>
        <Field label="Description" className="col-span-3"><TextArea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Notes" className="col-span-3"><TextArea value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Account onboarded through a project ---------- */
export function AccountForm({ initial, projects, projectId, onClose, onSave, onDelete }: { initial: TransitionAccount | null; projects: TransitionProject[]; projectId?: string; onClose: () => void; onSave: (a: TransitionAccount) => void; onDelete?: () => void }) {
  const p0 = projects.find((p) => p.id === projectId) ?? projects[0]
  const { f, set, setF } = useForm<TransitionAccount>(initial ?? { id: uid('acc'), projectId: p0?.id ?? '', businessUnit: p0?.businessUnit ?? '', name: '', gbu: p0?.gbu ?? GBUS[0], geography: p0?.region ?? GEOGRAPHIES[0], type: 'Application', status: 'Planned', plannedDate: TODAY, onboardedDate: undefined, owner: p0?.globalOwner ?? '', notes: '' })
  const setProject = (id: string) => { const p = projects.find((x) => x.id === id); if (p) setF({ ...f, projectId: p.id, businessUnit: p.businessUnit, gbu: f.gbu || p.gbu, geography: f.geography || p.region, owner: f.owner || p.globalOwner }) }
  const setStatus = (s: AccountStatus) => setF({ ...f, status: s, onboardedDate: isOnboarded({ status: s } as TransitionAccount) ? f.onboardedDate || TODAY : f.onboardedDate })
  return (
    <Modal open onClose={onClose} title={initial ? `Edit account – ${initial.name}` : 'Add account'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <p className="text-[12px] text-ink-500 mb-3">An account is a business, application, entity or platform onboarded to the GCC through a transition project. Onboarded and Live count as onboarded.</p>
      <FormGrid cols={3}>
        <Field label="Account name" className="col-span-3"><Input value={f.name} placeholder="e.g. ENGIE Networks – SAP FI/CO Europe" onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Project" className="col-span-2"><ProjectSelect projects={projects} value={f.projectId} onChange={setProject} /></Field>
        <Field label="Business unit (from project)"><Input value={f.businessUnit} readOnly className="bg-surface text-ink-500" /></Field>
        <Field label="Type"><Select options={ACCOUNT_TYPES} value={f.type} onChange={(e) => set('type', e.target.value as AccountType)} /></Field>
        <Field label="GBU served"><Select options={GBUS.includes(f.gbu as never) ? GBUS : [f.gbu, ...GBUS]} value={f.gbu} onChange={(e) => set('gbu', e.target.value)} /></Field>
        <Field label="Geography"><Select options={GEOGRAPHIES.includes(f.geography as never) ? GEOGRAPHIES : [f.geography, ...GEOGRAPHIES]} value={f.geography} onChange={(e) => set('geography', e.target.value)} /></Field>
        <Field label="Status"><Select options={ACCOUNT_STATUSES} value={f.status} onChange={(e) => setStatus(e.target.value as AccountStatus)} /></Field>
        <Field label="Planned date"><Input type="date" value={f.plannedDate} onChange={(e) => set('plannedDate', e.target.value)} /></Field>
        <Field label="Onboarded date"><Input type="date" value={f.onboardedDate ?? ''} onChange={(e) => set('onboardedDate', e.target.value || undefined)} /></Field>
        <Field label="Owner" className="col-span-3"><Input value={f.owner} placeholder="Global / business owner" onChange={(e) => set('owner', e.target.value)} /></Field>
        <Field label="Notes" className="col-span-3"><TextArea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Wave ---------- */
export function WaveForm({ initial, waves, onClose, onSave, onDelete }: { initial: Wave | null; waves: Wave[]; onClose: () => void; onSave: (w: Wave) => void; onDelete?: () => void }) {
  const nextNo = (Math.max(0, ...waves.map((w) => w.number)) + 1)
  const { f, set } = useForm<Wave>(initial ?? { id: uid('wave'), number: nextNo, name: '', startDate: '2027-03-01', endDate: '2027-03-31', status: 'Not Started', color: WAVE_COLORS[(nextNo - 1) % WAVE_COLORS.length], lead: OWNERS[0] })
  return (
    <Modal open onClose={onClose} title={initial ? `Edit Wave ${initial.number}` : 'Add Transition Wave'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <p className="text-[12px] text-ink-500 mb-3">Scope (business units) and progress of a wave are derived from the projects assigned to it.</p>
      <FormGrid cols={3}>
        <Field label="Wave number"><Input type="number" min={1} value={f.number} onChange={(e) => set('number', num(e.target.value))} /></Field>
        <Field label="Wave name" className="col-span-2"><Input value={f.name} placeholder="e.g. Practice scale-up" onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Start date"><Input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
        <Field label="End date"><Input type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} /></Field>
        <Field label="Status"><Select options={WAVE_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as WaveStatus)} /></Field>
        <Field label="Wave lead"><Select options={OWNERS} value={f.lead} onChange={(e) => set('lead', e.target.value)} /></Field>
        <Field label="Colour" className="col-span-2"><div className="flex items-center gap-1.5 pt-1">{WAVE_COLORS.map((c) => <button key={c} className="w-6 h-6 rounded-full border-2 cursor-pointer" style={{ background: c, borderColor: f.color === c ? '#0B2240' : 'transparent' }} onClick={() => set('color', c)} />)}</div></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Milestone (shared collection) + wave + project link ---------- */
export function MilestoneForm({ initial, initialWave, initialProject, waves, projects, onClose, onSave, onDelete }: {
  initial: Milestone | null; initialWave?: number; initialProject?: string; waves: Wave[]; projects: TransitionProject[]; onClose: () => void; onSave: (m: Milestone, wave: number, projectId: string) => void; onDelete?: () => void
}) {
  const { f, set } = useForm<Milestone>(initial ?? { id: uid('ms'), name: '', workstream: 'Transition Readiness', dueDate: TODAY, status: 'On Track', owner: OWNERS[0], phase: 'Transition', critical: false })
  const [projectId, setProjectId] = useState(initialProject ?? '')
  const [wave, setWave] = useState(String(initialWave ?? projects.find((p) => p.id === initialProject)?.wave ?? waves[0]?.number ?? 1))
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit Milestone' : 'Add Milestone'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f, Number(wave), projectId)} onDelete={onDelete} />}>
      <FormGrid cols={2}>
        <Field label="Milestone" className="col-span-2"><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Project (optional)" className="col-span-2"><ProjectSelect projects={projects} value={projectId} allowNone onChange={(id) => { setProjectId(id); const p = projects.find((x) => x.id === id); if (p) setWave(String(p.wave)) }} /></Field>
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

/* ---------- Risk / Issue (shared 'raid') + business unit / project link ---------- */
export function RaidForm({ initial, existing, link, units, projects, businessUnit, projectId, onClose, onSave, onDelete }: {
  initial: RaidItem | null; existing: RaidItem[]; link?: RaidLink; units: string[]; projects: TransitionProject[]; businessUnit?: string; projectId?: string
  onClose: () => void; onSave: (r: RaidItem, link: RaidLink | null) => void; onDelete?: () => void
}) {
  const nextCode = (type: 'Risk' | 'Issue') => `${type === 'Risk' ? 'R' : 'I'}-${String(existing.length + 1).padStart(3, '0')}`
  const { f, set, setF } = useForm<RaidItem>(initial ?? {
    id: uid('raid'), code: nextCode('Risk'), type: 'Risk', title: '', workstream: 'Transition', category: 'Process & Operations', level: 'Medium', status: 'Open', owner: OWNERS[0],
    dueDate: TODAY, openedOn: TODAY, likelihood: 'Medium', impact: 'Medium', impactScore: 5, description: '', mitigation: '',
  })
  const [bu, setBu] = useState(link?.businessUnit ?? businessUnit ?? projects.find((p) => p.id === projectId)?.businessUnit ?? '')
  const [pid, setPid] = useState(link?.projectId ?? projectId ?? '')
  const unitProjects = projects.filter((p) => !bu || p.businessUnit === bu)
  return (
    <Modal open onClose={onClose} title={initial ? `Edit ${initial.code}` : 'Log Issue / Risk'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f, bu ? { id: f.id, businessUnit: bu, projectId: pid || undefined } : null)} onDelete={onDelete} saveLabel={initial ? 'Save' : 'Log'} />}>
      <FormGrid cols={3}>
        <Field label="Type"><Select options={['Risk', 'Issue']} value={f.type} onChange={(e) => { const t = e.target.value as 'Risk' | 'Issue'; setF({ ...f, type: t, code: initial ? f.code : nextCode(t) }) }} /></Field>
        <Field label="Title" className="col-span-2"><Input value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Business unit"><select className="input" value={bu} onChange={(e) => { setBu(e.target.value); setPid('') }}><option value="">– program-wide –</option>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
        <Field label="Project (optional)" className="col-span-2"><ProjectSelect projects={unitProjects} value={pid} allowNone onChange={(id) => { setPid(id); const p = projects.find((x) => x.id === id); if (p) setBu(p.businessUnit) }} /></Field>
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
export function KtForm({ initial, projects, projectId, onClose, onSave, onDelete }: { initial: KtItem | null; projects: TransitionProject[]; projectId?: string; onClose: () => void; onSave: (k: KtItem) => void; onDelete?: () => void }) {
  const p0 = projects.find((p) => p.id === projectId) ?? projects[0]
  const { f, set, setF } = useForm<KtItem>(initial ?? { id: uid('kt'), projectId: p0?.id ?? '', businessUnit: p0?.businessUnit ?? '', process: '', wave: p0?.wave ?? 1, globalOwner: p0?.globalOwner ?? '', indiaOwner: p0?.indiaLead ?? OWNERS[0], sessionsPlanned: 6, sessionsDone: 0, status: 'Not Started', signOff: 'Not Started', targetDate: TODAY, signedOffOn: undefined })
  const setSessions = (planned: number, done: number) => {
    const status = ktStatusFor(planned, done)
    setF({ ...f, sessionsPlanned: planned, sessionsDone: done, status, signOff: status === 'Completed' ? (f.signOff === 'Not Started' ? 'Pending' : f.signOff) : f.signOff })
  }
  const setProject = (id: string) => { const p = projects.find((x) => x.id === id); if (p) setF({ ...f, projectId: p.id, businessUnit: p.businessUnit, wave: p.wave, globalOwner: f.globalOwner || p.globalOwner, indiaOwner: f.indiaOwner || p.indiaLead }) }
  const save = () => onSave({ ...f, signedOffOn: f.signOff === 'Signed' ? f.signedOffOn || TODAY : undefined })
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit Knowledge Transfer Item' : 'Add Knowledge Transfer Item'} footer={<FormFooter onClose={onClose} onSave={save} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Project" className="col-span-3"><ProjectSelect projects={projects} value={f.projectId} onChange={setProject} /></Field>
        <Field label="Process / activity" className="col-span-3"><Input value={f.process} onChange={(e) => set('process', e.target.value)} /></Field>
        <Field label="Global owner"><Input value={f.globalOwner} onChange={(e) => set('globalOwner', e.target.value)} /></Field>
        <Field label="India owner"><Select options={OWNERS} value={f.indiaOwner} onChange={(e) => set('indiaOwner', e.target.value)} /></Field>
        <Field label="Target date"><Input type="date" value={f.targetDate} onChange={(e) => set('targetDate', e.target.value)} /></Field>
        <Field label="Sessions planned"><Input type="number" min={0} value={f.sessionsPlanned} onChange={(e) => setSessions(num(e.target.value), f.sessionsDone)} /></Field>
        <Field label="Sessions done"><Input type="number" min={0} value={f.sessionsDone} onChange={(e) => setSessions(f.sessionsPlanned, num(e.target.value))} /></Field>
        <Field label="Wave (from project)"><Input value={`Wave ${f.wave} · ${f.businessUnit}`} readOnly className="bg-surface text-ink-500" /></Field>
        <Field label="Status"><Select options={KT_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as KtStatus)} /></Field>
        <Field label="Sign-off"><Select options={KT_SIGNOFF} value={f.signOff} onChange={(e) => set('signOff', e.target.value as KtSignOff)} /></Field>
        {f.signOff === 'Signed' && <Field label="Signed off on" className="col-span-3"><Input type="date" value={f.signedOffOn ?? TODAY} onChange={(e) => set('signedOffOn', e.target.value)} /></Field>}
      </FormGrid>
    </Modal>
  )
}

/* ---------- Readiness assessment ---------- */
export function AssessmentForm({ initial, projects, projectId, onClose, onSave, onDelete }: { initial: ReadinessAssessment | null; projects: TransitionProject[]; projectId?: string; onClose: () => void; onSave: (a: ReadinessAssessment) => void; onDelete?: () => void }) {
  const p0 = projects.find((p) => p.id === projectId) ?? projects[0]
  const { f, set, setF } = useForm<ReadinessAssessment>(initial ?? (p0 ? blankAssessment(uid('ra'), p0) : { id: uid('ra'), projectId: '', businessUnit: '', wave: 1, people: 50, process: 50, technology: 50, facilities: 50, controls: 50, status: 'Not Started', nextAction: '', assessedOn: TODAY }))
  const score = assessmentScore(f)
  const setProject = (id: string) => { const p = projects.find((x) => x.id === id); if (p) setF({ ...f, projectId: p.id, businessUnit: p.businessUnit, wave: p.wave }) }
  return (
    <Modal open onClose={onClose} title="Update Readiness Assessment" footer={<FormFooter onClose={onClose} onSave={() => onSave({ ...f, assessedOn: TODAY })} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Project" className="col-span-2"><ProjectSelect projects={projects} value={f.projectId} onChange={setProject} /></Field>
        <Field label="Business unit · wave"><Input value={`${f.businessUnit} · Wave ${f.wave}`} readOnly className="bg-surface text-ink-500" /></Field>
      </FormGrid>
      <div className="mt-3 space-y-2">
        {DIMENSIONS.map((d) => {
          const k = DIM_KEY[d]
          return (
            <div key={d} className="flex items-center gap-3 text-[12.5px]">
              <span className="w-[190px] text-ink-700">{d}</span>
              <input type="range" min={0} max={100} value={f[k]} onChange={(e) => set(k, num(e.target.value))} className="flex-1 accent-brand-600" />
              <Input type="number" min={0} max={100} value={f[k]} onChange={(e) => set(k, Math.max(0, Math.min(100, num(e.target.value))))} className="!w-20" />
            </div>
          )
        })}
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
export function GapForm({ initial, projects, projectId, existing, onClose, onSave, onDelete }: { initial: ReadinessGap | null; projects: TransitionProject[]; projectId?: string; existing: ReadinessGap[]; onClose: () => void; onSave: (g: ReadinessGap) => void; onDelete?: () => void }) {
  const p0 = projects.find((p) => p.id === projectId) ?? projects[0]
  const nextCode = existing.reduce((m, g) => Math.max(m, parseInt(g.code.split('-')[1] ?? '0', 10) || 0), 0) + 1
  const { f, set, setF } = useForm<ReadinessGap>(initial ?? {
    id: uid('gap'), code: `G-${String(nextCode).padStart(3, '0')}`, projectId: p0?.id ?? '', businessUnit: p0?.businessUnit ?? '', wave: p0?.wave ?? 1, dimension: DIMENSIONS[0], description: '', severity: 'Medium', owner: OWNERS[0], status: 'New', raised: TODAY, due: TODAY,
  })
  const setProject = (id: string) => { const p = projects.find((x) => x.id === id); if (p) setF({ ...f, projectId: p.id, businessUnit: p.businessUnit, wave: p.wave }) }
  return (
    <Modal open onClose={onClose} title={initial ? `Edit Gap ${initial.code}` : 'Add Readiness Gap'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Description" className="col-span-3"><Input value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Project" className="col-span-2"><ProjectSelect projects={projects} value={f.projectId} onChange={setProject} /></Field>
        <Field label="Business unit · wave"><Input value={`${f.businessUnit} · Wave ${f.wave}`} readOnly className="bg-surface text-ink-500" /></Field>
        <Field label="Dimension"><Select options={DIMENSIONS} value={f.dimension} onChange={(e) => set('dimension', e.target.value as Dimension)} /></Field>
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

/* ---------- Dependency (shared) + business unit / project link ---------- */
export function DependencyForm({ initial, link, units, projects, businessUnit, projectId, onClose, onSave, onDelete }: {
  initial: Dependency | null; link?: DepLink; units: string[]; projects: TransitionProject[]; businessUnit?: string; projectId?: string; onClose: () => void; onSave: (d: Dependency, link: DepLink | null) => void; onDelete?: () => void
}) {
  const { f, set } = useForm<Dependency>(initial ?? { id: uid('dep'), from: 'Transition Readiness', on: 'Technology & Infrastructure', type: 'System Access', description: '', impact: 'Medium', status: 'On Track', dueDate: TODAY, owner: OWNERS[0] })
  const [bu, setBu] = useState(link?.businessUnit ?? businessUnit ?? projects.find((p) => p.id === projectId)?.businessUnit ?? '')
  const [pid, setPid] = useState(link?.projectId ?? projectId ?? '')
  const unitProjects = projects.filter((p) => !bu || p.businessUnit === bu)
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit Dependency' : 'Add Dependency'} footer={<FormFooter onClose={onClose} onSave={() => onSave(f, bu ? { id: f.id, businessUnit: bu, projectId: pid || undefined } : null)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Depends on (workstream)"><Select options={WORKSTREAMS} value={f.on} onChange={(e) => set('on', e.target.value as Dependency['on'])} /></Field>
        <Field label="Type" className="col-span-2"><Input value={f.type} placeholder="System Access / Hiring Wave Joiners / …" onChange={(e) => set('type', e.target.value)} /></Field>
        <Field label="Description" className="col-span-3"><Input value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Business unit"><select className="input" value={bu} onChange={(e) => { setBu(e.target.value); setPid('') }}><option value="">– program-wide –</option>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
        <Field label="Project (optional)" className="col-span-2"><ProjectSelect projects={unitProjects} value={pid} allowNone onChange={(id) => { setPid(id); const p = projects.find((x) => x.id === id); if (p) setBu(p.businessUnit) }} /></Field>
        <Field label="Impact"><Select options={['Critical', 'High', 'Medium', 'Low']} value={f.impact} onChange={(e) => set('impact', e.target.value as Dependency['impact'])} /></Field>
        <Field label="Status"><Select options={['On Track', 'At Risk', 'Delayed', 'Completed']} value={f.status} onChange={(e) => set('status', e.target.value as Dependency['status'])} /></Field>
        <Field label="Due date"><Input type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label="Owner"><Select options={OWNERS} value={f.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
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
      <p className="text-[12px] text-ink-500 mb-3">Knowledge transfer, readiness gaps, stabilization readiness, readiness by dimension and the go-live date are derived from the projects, KT items, assessments, gaps and checklist. Only the numbers below are entered.</p>
      <FormGrid cols={3}>
        <Field label="Go-live wave"><Select options={waveOptions(waves)} value={String(f.goLiveWave)} onChange={(e) => set('goLiveWave', Number(e.target.value))} /></Field>
        <Field label="Go-live status"><Select options={['On track', 'At risk', 'Delayed']} value={f.goLiveStatus} onChange={(e) => set('goLiveStatus', e.target.value as TransitionSettings['goLiveStatus'])} /></Field>
        <Field label="Readiness 'complete' threshold (%)"><Input type="number" min={0} max={100} value={f.readinessThreshold} onChange={(e) => set('readinessThreshold', num(e.target.value))} /></Field>
        <Field label="KT change vs last month (%)"><Input type="number" value={f.ktDeltaPct} onChange={(e) => set('ktDeltaPct', num(e.target.value))} /></Field>
        <Field label="Stabilization change vs last month (%)"><Input type="number" value={f.stabilizationDeltaPct} onChange={(e) => set('stabilizationDeltaPct', num(e.target.value))} /></Field>
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
