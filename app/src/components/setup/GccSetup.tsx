/**
 * GCC Setup – the first thing a program manager sees in Input view: what the ENGIE IT GCC is for, how it is
 * organised (business units = IT domains, each with its capabilities), how the Pune headcount ramps up
 * (month by month in year 1, annually from year 2), which workstreams deliver it and who leads them.
 */
import { useState } from 'react'
import clsx from 'clsx'
import { Plus, Trash2, Save, Check } from 'lucide-react'
import { Card, Field, Input, Select, TextArea, FormGrid } from '../ui'
import { InputLayout } from '../layout/InputLayout'
import { ProgramKpiEditor } from '../ProgramKpiEditor'
import { useCollection, useStore, uid } from '../../store/useStore'
import { seedProgramKpis, seedWorkstreamSummaries, type ProgramKpis, type WorkstreamSummary } from '../../data/shared'
import { OWNERS, PROGRAMS, programDef, type Workstream } from '../../data/common'
import { useMoney } from '../../data/money'
import { OrgStructureEditor } from '../footprint/OrgStructure'
import { HeadcountRampEditor } from '../footprint/HeadcountRamp'

export interface GccProfile {
  id: 'profile'
  purpose: string
  operatingModel: 'Captive GCC' | 'Hybrid' | 'Build-Operate-Transfer' | 'Outsourced'
  entityType: string
  officeStrategy: string
  city: string
  sponsor: string
  notes: string
}
export const seedProfile: GccProfile[] = [{
  id: 'profile',
  purpose: 'Establish the ENGIE IT GCC in Pune: a capability-led, business-aligned, global-in-scope IT centre covering seven IT domains (Infrastructure & Cloud, Digital Workplace, Cybersecurity & IAM, Enterprise Applications, Data, Analytics & AI, Integration & Engineering, IT Service Management), supporting all ENGIE businesses across Global, Europe, Americas and AMEA, with a phased transition to Pune in four waves from Nov 2026 to Apr 2027 reaching 400 IT headcount.',
  operatingModel: 'Captive GCC', entityType: 'Private limited company (wholly owned ENGIE subsidiary)', officeStrategy: 'Leased Grade-A office in Pune, fit-out in two phases aligned to transition waves', city: 'Pune', sponsor: 'Group CIO', notes: '',
}]
const OPERATING_MODELS: GccProfile['operatingModel'][] = ['Captive GCC', 'Hybrid', 'Build-Operate-Transfer', 'Outsourced']
const WS_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Not Started', 'Completed'] as const
const cell = 'w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-[12px] outline-none hover:border-slate-300 focus:border-brand-400 focus:bg-white'
const th = 'text-left text-[11.5px] font-semibold text-slate-600 px-1.5 py-1.5 bg-slate-100 border-b border-slate-300 whitespace-nowrap'
const td = 'border-b border-slate-200 px-0.5 py-0.5'

function SaveBar({ dirty, saved, onSave, onDiscard }: { dirty: boolean; saved: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      {saved && !dirty && <span className="text-[12px] text-green-600 inline-flex items-center gap-1"><Check size={13} /> Saved</span>}
      <button className="btn-secondary" disabled={!dirty} onClick={onDiscard}>Discard</button>
      <button className="btn-primary" disabled={!dirty} onClick={onSave}><Save size={14} /> Save</button>
    </div>
  )
}

function ProgramProfileTab() {
  const kpisC = useCollection<ProgramKpis>('programKpis', seedProgramKpis)
  const k = kpisC.items[0] ?? seedProgramKpis[0]
  const profC = useCollection<GccProfile>('gccProfile', seedProfile)
  const prof = profC.items[0] ?? seedProfile[0]
  const program = useStore((s) => s.program)
  const m = useMoney()
  const [f, setF] = useState<ProgramKpis>(k)
  const [p, setP] = useState<GccProfile>(prof)
  const [saved, setSaved] = useState(false)
  const [kpiOpen, setKpiOpen] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(k) || JSON.stringify(p) !== JSON.stringify(prof)
  const save = () => { kpisC.update(f); profC.update(p); setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const money = (key: keyof ProgramKpis) => ({ type: 'number', step: 'any', value: m.inputValue(f[key] as number), onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [key]: m.toBase(parseFloat(e.target.value) || 0) }) }) as const
  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-4">
      <Card title="About the ENGIE IT GCC" subtitle="What the centre is for and how it will be set up">
        <FormGrid cols={2}>
          <Field label="Program name" className="col-span-2"><Input value={f.programName} onChange={(e) => setF({ ...f, programName: e.target.value })} /></Field>
          <Field label="Purpose – what you are planning to do" className="col-span-2"><TextArea value={p.purpose} onChange={(e) => setP({ ...p, purpose: e.target.value })} /></Field>
          <Field label="Operating model"><Select options={OPERATING_MODELS} value={p.operatingModel} onChange={(e) => setP({ ...p, operatingModel: e.target.value as GccProfile['operatingModel'] })} /></Field>
          <Field label="Legal entity type"><Input value={p.entityType} onChange={(e) => setP({ ...p, entityType: e.target.value })} /></Field>
          <Field label="Location (city)"><Input value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} /></Field>
          <Field label="Executive sponsor"><Input value={p.sponsor} onChange={(e) => setP({ ...p, sponsor: e.target.value })} /></Field>
          <Field label="Office strategy" className="col-span-2"><Input value={p.officeStrategy} onChange={(e) => setP({ ...p, officeStrategy: e.target.value })} /></Field>
          <Field label="Notes" className="col-span-2"><TextArea value={p.notes} onChange={(e) => setP({ ...p, notes: e.target.value })} placeholder="Anything else the team should know" /></Field>
        </FormGrid>
        <SaveBar dirty={dirty} saved={saved} onSave={save} onDiscard={() => { setF(k); setP(prof) }} />
      </Card>
      <div className="space-y-4">
        <Card title="Timeline, headcount and budget" subtitle={`${programDef(program).country} program · ${PROGRAMS.find((x) => x.name === program)?.phase ?? ''} phase`}>
          <FormGrid cols={2}>
            <Field label="Program start"><Input type="date" value={f.timelineStart} onChange={(e) => setF({ ...f, timelineStart: e.target.value })} /></Field>
            <Field label="Program end"><Input type="date" value={f.timelineEnd} onChange={(e) => setF({ ...f, timelineEnd: e.target.value })} /></Field>
            <Field label="Go-live target"><Input type="date" value={f.goLiveTarget} onChange={(e) => setF({ ...f, goLiveTarget: e.target.value })} /></Field>
            <Field label="Target headcount (people to hire)"><Input type="number" value={f.talentTarget} onChange={(e) => setF({ ...f, talentTarget: parseInt(e.target.value) || 0 })} /></Field>
            <Field label={`Approved setup budget (${m.unitLabel})`}><Input {...money('approvedBudgetCr')} /></Field>
            <Field label={`Target annual benefits (${m.unitLabel})`}><Input {...money('targetBenefitsCr')} /></Field>
          </FormGrid>
          <SaveBar dirty={dirty} saved={saved} onSave={save} onDiscard={() => { setF(k); setP(prof) }} />
        </Card>
        <Card title="Program KPIs" subtitle="Completion, adherence, spend and benefits used on the Dashboard">
          <button className="btn-secondary" onClick={() => setKpiOpen(true)}>Edit program KPIs</button>
          <ProgramKpiEditor open={kpiOpen} onClose={() => setKpiOpen(false)} value={k} onSave={(v) => { kpisC.update(v); setKpiOpen(false) }} />
        </Card>
      </div>
    </div>
  )
}

function WorkstreamsTab() {
  const wss = useCollection<WorkstreamSummary>('workstreamSummaries', seedWorkstreamSummaries)
  const set = <K extends keyof WorkstreamSummary>(w: WorkstreamSummary, k: K, v: WorkstreamSummary[K]) => wss.update({ ...w, [k]: v })
  const add = () => wss.add({ id: uid('ws'), name: 'New workstream' as Workstream, description: '', progress: 0, status: 'Not Started', owner: OWNERS[0], lead: OWNERS[0], executiveSponsor: '', teamSize: 0, activeInitiatives: 0, scheduleHealth: 'Not Started', budgetHealth: 'On Track', approvedBudgetCr: 0, actualSpendCr: 0, forecastAtCompletionCr: 0 })
  return (
    <Card title="Workstreams and who leads them" subtitle="The delivery workstreams of the setup program. Detailed plans, milestones and activities are entered under Workstreams." action={<button className="btn-primary" onClick={add}><Plus size={14} /> Add workstream</button>}>
      <table className="w-full border-separate border-spacing-0">
        <thead><tr>{['Workstream', 'Description', 'Lead', 'Accountable owner', 'Executive sponsor', 'Status', 'Team size', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {wss.items.map((w) => (
            <tr key={w.id} className="hover:bg-brand-50/40">
              <td className={clsx(td, 'min-w-[200px]')}><input className={clsx(cell, 'font-medium')} value={w.name} onChange={(e) => set(w, 'name', e.target.value as Workstream)} /></td>
              <td className={clsx(td, 'min-w-[280px]')}><input className={cell} value={w.description} onChange={(e) => set(w, 'description', e.target.value)} /></td>
              <td className={td}><select className={clsx(cell, 'cursor-pointer')} value={w.lead} onChange={(e) => set(w, 'lead', e.target.value)}>{OWNERS.map((o) => <option key={o}>{o}</option>)}</select></td>
              <td className={td}><select className={clsx(cell, 'cursor-pointer')} value={w.owner} onChange={(e) => set(w, 'owner', e.target.value)}>{OWNERS.map((o) => <option key={o}>{o}</option>)}</select></td>
              <td className={td}><input className={cell} value={w.executiveSponsor} onChange={(e) => set(w, 'executiveSponsor', e.target.value)} /></td>
              <td className={td}><select className={clsx(cell, 'cursor-pointer')} value={w.status} onChange={(e) => set(w, 'status', e.target.value as WorkstreamSummary['status'])}>{WS_STATUSES.map((o) => <option key={o}>{o}</option>)}</select></td>
              <td className={td}><input type="number" min={0} className={clsx(cell, 'w-[64px] text-right')} value={w.teamSize} onChange={(e) => set(w, 'teamSize', parseInt(e.target.value) || 0)} /></td>
              <td className={td}><button title="Remove" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => { if (window.confirm(`Remove ${w.name}?`)) wss.remove(w.id) }}><Trash2 size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

export function GccSetup() {
  return (
    <InputLayout title="GCC Setup" subtitle="Tell the Command Center about the ENGIE IT GCC: what it is for, how it is organised into business units and capabilities, how the Pune headcount ramps up, and who delivers it. Every other module builds on this."
      tabs={[
        { name: '1 · Program profile', content: <ProgramProfileTab /> },
        { name: '2 · Organisation structure', content: <OrgStructureEditor />, hint: 'Business units are the IT domains of the GCC; under each, add the capabilities / services with the GBU served, geography, country / entity, current delivery location, current and target Pune headcount, role / skill, transition type and wave. Headcount by year is derived from the capabilities.' },
        { name: '3 · Headcount ramp-up', content: <HeadcountRampEditor />, hint: 'Year 1 is tracked month by month (cumulative Pune headcount from Nov 2026); from year 2 the plan carries annual exit targets per capability. Business-unit and program totals are derived from the capabilities.' },
        { name: '4 · Workstreams & leads', content: <WorkstreamsTab /> },
      ]} />
  )
}
