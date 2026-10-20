/**
 * Resource Management – Input view. Registers and inline grids for every record that drives the dashboards:
 * headcount plan by business unit (+ monthly plan vs actual), requisitions, candidates, people cost, skills, settings.
 */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Plus, Trash2, Save, Check } from 'lucide-react'
import { Card, Badge, Table, Field, Input, Select, FormGrid } from '../ui'
import { InputLayout } from '../layout/InputLayout'
import { MONTHS, OWNERS, fmtDate } from '../../data/common'
import { useMoney } from '../../data/money'
import { uid } from '../../store/useStore'
import { type BuHeadcount, type HeadcountMonth, type ResourceSettings, type SkillRow, type TrainingPlan } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { GRID_CELL, GRID_TH, GRID_TD } from './widgets'
import { RequisitionRegister } from './RequisitionRegister'
import { CandidateRegister } from './CandidateRegister'
import { RequisitionDrillDown } from './RequisitionDrillDown'
import { TrainingForm } from './forms'
import { coverageColor } from './OverviewTab'

function NumCell({ value, onChange, className, step = 1 }: { value: number; onChange: (v: number) => void; className?: string; step?: number }) {
  return <input type="number" min={0} step={step} className={clsx(GRID_CELL, 'text-right', className)} value={value} onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))} />
}

/* ---------- 1. Headcount plan by business unit ---------- */
function HeadcountPlanTab({ d }: { d: ResourceData }) {
  const { buHeadcount, buHeadcountRows, businessUnits, positions, headcountPlan, settings } = d
  const set = <K extends keyof BuHeadcount>(r: BuHeadcount, k: K, v: BuHeadcount[K]) => buHeadcount.update({ ...r, [k]: v })
  const tot = (k: 'onboarded' | 'inHiring' | 'open') => buHeadcountRows.reduce((s, r) => s + r[k], 0)
  const openReqs = (bu: string) => positions.items.filter((p) => p.businessUnit === bu && (p.status === 'Open' || p.status === 'In Interview' || p.status === 'Offer')).length
  const y1 = (bu: string) => businessUnits.items.find((b) => b.name === bu)?.y1 ?? 0
  const setMonth = (r: HeadcountMonth, k: keyof HeadcountMonth, v: number) => headcountPlan.update({ ...r, [k]: v })
  const grand = tot('onboarded') + tot('inHiring') + tot('open')
  return (
    <div className="space-y-4">
      <Card title="Headcount by business unit" subtitle={`Onboarded, in hiring and open FTEs per business unit. Business units come from GCC Setup / Target Footprint. Target: ${settings.fteTarget} FTEs.`}>
        <table className="w-full border-separate border-spacing-0">
          <thead><tr>{['Business unit', 'Type', 'Year-1 plan', 'Onboarded', 'In hiring', 'Open', 'Total', 'Open requisitions'].map((h, i) => <th key={h} className={clsx(GRID_TH, i >= 2 && 'text-right')}>{h}</th>)}</tr></thead>
          <tbody>
            {buHeadcountRows.map((r) => (
              <tr key={r.id} className="hover:bg-brand-50/40">
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] font-medium whitespace-nowrap')}>{r.businessUnit}</td>
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-ink-500 whitespace-nowrap')}>{businessUnits.items.find((b) => b.name === r.businessUnit)?.kind ?? '—'}</td>
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-ink-500 text-right')}>{y1(r.businessUnit)}</td>
                <td className={clsx(GRID_TD, 'w-[110px]')}><NumCell value={r.onboarded} onChange={(v) => set(r, 'onboarded', v)} /></td>
                <td className={clsx(GRID_TD, 'w-[110px]')}><NumCell value={r.inHiring} onChange={(v) => set(r, 'inHiring', v)} /></td>
                <td className={clsx(GRID_TD, 'w-[110px]')}><NumCell value={r.open} onChange={(v) => set(r, 'open', v)} /></td>
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] font-semibold text-right')}>{r.onboarded + r.inHiring + r.open}</td>
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-right')}><span className={openReqs(r.businessUnit) !== r.open ? 'text-amber-600' : 'text-ink-500'} title="Open requisitions in the register">{openReqs(r.businessUnit)}</span></td>
              </tr>
            ))}
            <tr className="bg-surface/60">
              <td className="px-2 py-2 text-[12.5px] font-semibold" colSpan={2}>Total</td>
              <td className="px-2 py-2 text-[12.5px] text-right text-ink-500">{buHeadcountRows.reduce((s, r) => s + y1(r.businessUnit), 0)}</td>
              <td className="px-2 py-2 text-[12.5px] font-semibold text-right">{tot('onboarded')}</td>
              <td className="px-2 py-2 text-[12.5px] font-semibold text-right">{tot('inHiring')}</td>
              <td className="px-2 py-2 text-[12.5px] font-semibold text-right">{tot('open')}</td>
              <td className={clsx('px-2 py-2 text-[12.5px] font-bold text-right', grand !== settings.fteTarget && 'text-amber-600')} title={grand !== settings.fteTarget ? `Differs from the ${settings.fteTarget} FTE target in Settings` : undefined}>{grand}</td>
              <td className="px-2 py-2 text-[12.5px] font-semibold text-right">{positions.items.filter((p) => p.status === 'Open' || p.status === 'In Interview' || p.status === 'Offer').length}</td>
            </tr>
          </tbody>
        </table>
      </Card>
      <Card title="Monthly headcount plan vs actual (2026)" subtitle="Planned / actual / target FTEs at month end and ramp-up utilisation. The FTEs Onboarded KPI reads the current reporting month's actual.">
        <table className="w-full border-separate border-spacing-0">
          <thead><tr>{['Month', 'Planned FTEs', 'Actual FTEs', 'Target FTEs', 'Planned utilisation %', 'Actual utilisation %', 'Actual vs plan'].map((h, i) => <th key={h} className={clsx(GRID_TH, i >= 1 && 'text-right')}>{h}</th>)}</tr></thead>
          <tbody>
            {headcountPlan.items.map((r, i) => (
              <tr key={r.id} className={clsx('hover:bg-brand-50/40', r.month === settings.currentMonth && 'bg-brand-50/30')}>
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] font-medium')}>{MONTHS[i] ?? r.month}{r.month === settings.currentMonth && <span className="ml-2 text-[10.5px] uppercase tracking-wide text-brand-600">current</span>}</td>
                <td className={clsx(GRID_TD, 'w-[130px]')}><NumCell value={r.planned} onChange={(v) => setMonth(r, 'planned', v)} /></td>
                <td className={clsx(GRID_TD, 'w-[130px]')}><NumCell value={r.actual} onChange={(v) => setMonth(r, 'actual', v)} /></td>
                <td className={clsx(GRID_TD, 'w-[130px]')}><NumCell value={r.target} onChange={(v) => setMonth(r, 'target', v)} /></td>
                <td className={clsx(GRID_TD, 'w-[150px]')}><NumCell value={r.plannedUtil} onChange={(v) => setMonth(r, 'plannedUtil', Math.min(100, v))} /></td>
                <td className={clsx(GRID_TD, 'w-[150px]')}><NumCell value={r.actualUtil} onChange={(v) => setMonth(r, 'actualUtil', Math.min(100, v))} /></td>
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-right font-medium', r.actual >= r.planned ? 'text-green-600' : 'text-red-600')}>{r.actual - r.planned >= 0 ? '+' : ''}{r.actual - r.planned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ---------- 4. People cost ---------- */
function PeopleCostTab({ d }: { d: ResourceData }) {
  const { peopleCost, peopleCostRows, buHeadcountRows, kpi } = d
  const m = useMoney()
  const set = (r: { id: string; businessUnit: string; budgetCr: number; actualCr: number }, k: 'budgetCr' | 'actualCr', display: number) => peopleCost.update({ ...r, [k]: m.toBase(display) })
  return (
    <Card title={`People cost by business unit (${m.unitLabel})`} subtitle="Annual people-cost budget and run-rate per business unit. Totals feed the Annual People Cost KPI and the Cost Analysis tab.">
      <table className="w-full border-separate border-spacing-0">
        <thead><tr>{['Business unit', 'Onboarded FTEs', `Budget (${m.unitLabel})`, `Actual / run-rate (${m.unitLabel})`, 'Variance', 'Utilised', `Cost per FTE (${m.lakhUnitLabel})`].map((h, i) => <th key={h} className={clsx(GRID_TH, i >= 1 && 'text-right')}>{h}</th>)}</tr></thead>
        <tbody>
          {peopleCostRows.map((r) => {
            const fte = buHeadcountRows.find((w) => w.businessUnit === r.businessUnit)?.onboarded ?? 0
            const variance = +(r.budgetCr - r.actualCr).toFixed(2)
            return (
              <tr key={r.id} className="hover:bg-brand-50/40">
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] font-medium whitespace-nowrap')}>{r.businessUnit}</td>
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-ink-500 text-right')}>{fte}</td>
                <td className={clsx(GRID_TD, 'w-[150px]')}><NumCell step={0.01} value={m.inputValue(r.budgetCr)} onChange={(v) => set(r, 'budgetCr', v)} /></td>
                <td className={clsx(GRID_TD, 'w-[170px]')}><NumCell step={0.01} value={m.inputValue(r.actualCr)} onChange={(v) => set(r, 'actualCr', v)} /></td>
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-right font-medium', variance < 0 ? 'text-red-600' : 'text-green-600')}>{m.signed(variance, 2)}</td>
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-right')}>{r.budgetCr ? Math.round((r.actualCr / r.budgetCr) * 100) : 0}%</td>
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-right text-ink-500')}>{fte ? m.fmtLakh(+((r.actualCr * 100) / fte).toFixed(1)) : '—'}</td>
              </tr>
            )
          })}
          <tr className="bg-surface/60">
            <td className="px-2 py-2 text-[12.5px] font-semibold">Total</td>
            <td className="px-2 py-2 text-[12.5px] text-right font-semibold">{buHeadcountRows.reduce((s, r) => s + r.onboarded, 0)}</td>
            <td className="px-2 py-2 text-[12.5px] text-right font-semibold">{m.num(kpi.costBudget, 2)}</td>
            <td className="px-2 py-2 text-[12.5px] text-right font-semibold">{m.num(kpi.costActual, 2)}</td>
            <td className={clsx('px-2 py-2 text-[12.5px] text-right font-semibold', kpi.costBudget - kpi.costActual < 0 ? 'text-red-600' : 'text-green-600')}>{m.signed(+(kpi.costBudget - kpi.costActual).toFixed(2), 2)}</td>
            <td className="px-2 py-2 text-[12.5px] text-right font-semibold">{kpi.costBudget ? Math.round((kpi.costActual / kpi.costBudget) * 100) : 0}%</td>
            <td className="px-2 py-2 text-[12.5px] text-right text-ink-500">{m.fmtLakh(+(kpi.costPerFteCr * 100).toFixed(1))}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  )
}

/* ---------- 5. Skills ---------- */
function SkillsInputTab({ d }: { d: ResourceData }) {
  const { skills, trainingPlans } = d
  const [tp, setTp] = useState<TrainingPlan | null>(null)
  const [addTp, setAddTp] = useState(false)
  const set = <K extends keyof SkillRow>(r: SkillRow, k: K, v: SkillRow[K]) => skills.update({ ...r, [k]: v })
  const add = () => skills.add({ id: uid('sk'), category: 'New skill category', required: 0, available: 0, owner: OWNERS[0] })
  return (
    <div className="space-y-4">
      <Card title="Skills availability" subtitle="Required vs available capacity per skill category. Gap and coverage are derived and feed the Skills Availability card." action={<button className="btn-primary" onClick={add}><Plus size={14} /> Add skill category</button>}>
        <table className="w-full border-separate border-spacing-0">
          <thead><tr>{['Skill category', 'Capability owner', 'Required', 'Available', 'Gap', 'Coverage', ''].map((h, i) => <th key={i} className={clsx(GRID_TH, i >= 2 && i <= 5 && 'text-right')}>{h}</th>)}</tr></thead>
          <tbody>
            {skills.items.map((r) => {
              const gap = Math.max(0, r.required - r.available), cov = r.required ? Math.round((r.available / r.required) * 100) : 0
              return (
                <tr key={r.id} className="hover:bg-brand-50/40">
                  <td className={clsx(GRID_TD, 'min-w-[240px]')}><input className={clsx(GRID_CELL, 'font-medium')} value={r.category} onChange={(e) => set(r, 'category', e.target.value)} /></td>
                  <td className={GRID_TD}><select className={clsx(GRID_CELL, 'cursor-pointer')} value={r.owner} onChange={(e) => set(r, 'owner', e.target.value)}>{OWNERS.map((o) => <option key={o}>{o}</option>)}</select></td>
                  <td className={clsx(GRID_TD, 'w-[110px]')}><NumCell value={r.required} onChange={(v) => set(r, 'required', v)} /></td>
                  <td className={clsx(GRID_TD, 'w-[110px]')}><NumCell value={r.available} onChange={(v) => set(r, 'available', v)} /></td>
                  <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] text-right font-medium text-red-600')}>{gap}</td>
                  <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] text-right font-medium')} style={{ color: coverageColor(cov) }}>{cov}%</td>
                  <td className={clsx(GRID_TD, 'w-8')}><button title="Remove" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => { if (window.confirm(`Remove ${r.category}?`)) skills.remove(r.id) }}><Trash2 size={14} /></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      <Card title="Training & upskilling programmes" subtitle="Programmes closing the capability gap · click a row to edit" action={<button className="btn-primary" onClick={() => setAddTp(true)}><Plus size={14} /> Add programme</button>}>
        <Table<TrainingPlan> compact rows={trainingPlans.items} onRowClick={(r) => setTp(r)} columns={[
          { key: 'program', header: 'Programme', render: (r) => <span className="font-medium">{r.program}</span> },
          { key: 'skill', header: 'Skill category' },
          { key: 'participants', header: 'Participants', className: 'text-right' },
          { key: 'startDate', header: 'Start', render: (r) => fmtDate(r.startDate) },
          { key: 'endDate', header: 'End', render: (r) => fmtDate(r.endDate) },
          { key: 'owner', header: 'Owner' },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
          { key: 'actions', header: '', className: 'text-right', render: (r) => <button className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" title="Remove" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Remove ${r.program}?`)) trainingPlans.remove(r.id) }}><Trash2 size={14} /></button> },
        ]} />
      </Card>
      <TrainingForm open={addTp || !!tp} onClose={() => { setAddTp(false); setTp(null) }} value={tp} skills={skills.items.map((s) => s.category)} onSave={(t) => { if (tp) trainingPlans.update(t); else trainingPlans.add(t); setAddTp(false); setTp(null) }} onDelete={(id) => trainingPlans.remove(id)} />
    </div>
  )
}

/* ---------- 6. Settings ---------- */
function SettingsTab({ d }: { d: ResourceData }) {
  const { settings, settingsC, locationMix } = d
  const [f, setF] = useState<ResourceSettings>(settings)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(settings)
  const num = (k: keyof ResourceSettings) => ({ type: 'number', step: 'any', value: f[k] as number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: parseFloat(e.target.value) || 0 }) }) as const
  const seats = locationMix.items.reduce((s, l) => s + l.seats, 0)
  return (
    <div className="grid grid-cols-[1.2fr_1fr] gap-4">
      <Card title="Resource plan settings" subtitle="Targets and ratios used by the KPI tiles and the Location Mix tab">
        <FormGrid cols={2}>
          <Field label="FTE target (plan)"><Input {...num('fteTarget')} /></Field>
          <Field label="Current reporting month"><Select options={MONTHS} value={f.currentMonth} onChange={(e) => setF({ ...f, currentMonth: e.target.value })} /></Field>
          <Field label="Avg. time to hire (months)"><Input {...num('avgTimeToHireMonths')} /></Field>
          <Field label="Time to hire target (months)"><Input {...num('timeToHireTargetMonths')} /></Field>
          <Field label="Seats per FTE (seat ratio)"><Input {...num('seatRatio')} /></Field>
        </FormGrid>
        <div className="flex items-center justify-end gap-2 mt-4">
          {saved && !dirty && <span className="text-[12px] text-green-600 inline-flex items-center gap-1"><Check size={13} /> Saved</span>}
          <button className="btn-secondary" disabled={!dirty} onClick={() => setF(settings)}>Discard</button>
          <button className="btn-primary" disabled={!dirty} onClick={() => { settingsC.update(f); setSaved(true); setTimeout(() => setSaved(false), 2500) }}><Save size={14} /> Save</button>
        </div>
      </Card>
      <Card title="What these drive" subtitle="Derived numbers shown in the Output view">
        <div className="space-y-2 text-[12.5px]">
          {[
            ['Hiring progress', `${settings.fteTarget ? Math.round((d.kpi.onboarded / settings.fteTarget) * 100) : 0}% (${d.kpi.onboarded} of ${settings.fteTarget} FTEs)`],
            ['Time to hire vs target', `${settings.avgTimeToHireMonths} months · ${d.kpi.tthDelta > 0 ? '+' : ''}${d.kpi.tthDelta} vs ${settings.timeToHireTargetMonths} target`],
            ['Seats needed at target', `${Math.round(settings.fteTarget * settings.seatRatio)} seats (${seats} available today)`],
            ['Current reporting month', `${settings.currentMonth} 2026 – the FTEs Onboarded tile reads this month's actual`],
          ].map(([k, v]) => <div key={k} className="flex items-center justify-between rounded-lg border border-line px-3 py-2"><span className="text-ink-500">{k}</span><span className="font-medium text-ink-900">{v}</span></div>)}
        </div>
      </Card>
    </div>
  )
}

/* ---------- Input view shell ---------- */
export function ResourcesInputView({ d }: { d: ResourceData }) {
  const [openReq, setOpenReq] = useState<string | null>(null)
  const tabs = useMemo(() => [
    { name: 'Headcount plan by business unit', content: <HeadcountPlanTab d={d} />, hint: 'Inline grids – every change is saved immediately and reflected in the Output view.' },
    { name: 'Requisitions', content: <RequisitionRegister d={d} onOpen={setOpenReq} title="Requisitions" />, hint: 'Add, edit and remove requisitions. Click a role to open its candidate pipeline.' },
    { name: 'Candidates', content: <CandidateRegister d={d} onOpen={setOpenReq} />, hint: 'Every applicant across all requisitions. Change the stage or status inline, or use Next / Reject.' },
    { name: 'People cost', content: <PeopleCostTab d={d} /> },
    { name: 'Skills', content: <SkillsInputTab d={d} /> },
    { name: 'Settings', content: <SettingsTab d={d} /> },
  ], [d])
  return (
    <>
      <InputLayout title="Resource Management" subtitle="Enter the headcount plan, requisitions, candidates, people cost and skills that drive the Resource Management dashboards." tabs={tabs} />
      <RequisitionDrillDown d={d} positionId={openReq} onClose={() => setOpenReq(null)} />
    </>
  )
}
