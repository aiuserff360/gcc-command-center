/**
 * Resource Management – Input view. Registers and inline grids for every record that drives the dashboards:
 * headcount actuals by capability and month (year 1) with the annual plan for years 2–5, requisitions, candidates,
 * people cost, skills, settings (incl. the reporting month).
 */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Plus, Trash2, Save, Check, ChevronRight, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, Badge, Table, Field, Input, Select, FormGrid } from '../ui'
import { InputLayout } from '../layout/InputLayout'
import { OWNERS, fmtDate } from '../../data/common'
import { RAMP_MONTHS, subY1 } from '../../data/businessUnits'
import { useMoney } from '../../data/money'
import { uid } from '../../store/useStore'
import { OUT_YEARS, type ResourceSettings, type SkillRow, type TrainingPlan, type HcView } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { GRID_CELL, GRID_TH, GRID_TD, HcViewToggle } from './widgets'
import { RequisitionRegister } from './RequisitionRegister'
import { CandidateRegister } from './CandidateRegister'
import { RequisitionDrillDown } from './RequisitionDrillDown'
import { TrainingForm } from './forms'
import { coverageColor } from './OverviewTab'

function NumCell({ value, onChange, className, step = 1 }: { value: number; onChange: (v: number) => void; className?: string; step?: number }) {
  return <input type="number" min={0} step={step} className={clsx(GRID_CELL, 'text-right', className)} value={value} onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))} />
}
/** Actual cell: blank until reported; typing a value reports the month. */
function ActualCell({ value, onChange, plan }: { value: number | null; onChange: (v: number | null) => void; plan: number }) {
  return <input type="number" min={0} step={1} placeholder={String(plan)} title={`Plan ${plan}`} className={clsx(GRID_CELL, 'text-center w-[46px] px-1 placeholder:text-slate-300', value !== null && (value >= plan ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'))} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0))} />
}

/* ---------- 1. Headcount actuals by capability and month ---------- */
function HeadcountActualsTab({ d }: { d: ResourceData }) {
  const { buNames, subsOf, capActualRows, setActual, reportingIdx, reportingMonth, buHeadcountRows, settings, planMonths, actualMonths, planYears, kpi, unitOf } = d
  const [view, setView] = useState<HcView>('Year 1 month-wise')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (bu: string) => setCollapsed((o) => { const n = new Set(o); if (n.has(bu)) n.delete(bu); else n.add(bu); return n })
  const annual = view !== 'Year 1 month-wise'
  const months = RAMP_MONTHS
  const unitActual = (bu: string, i: number) => { const vals = capActualRows.filter((r) => r.businessUnit === bu).map((r) => r.actuals[i]).filter((v): v is number => v !== null && v !== undefined); return vals.length ? vals.reduce((t, v) => t + v, 0) : null }
  const unitPlan = (bu: string, i: number) => subsOf(bu).reduce((t, s) => t + (s.ramp[i] ?? 0), 0)
  const hdr = (h: string, extra?: string) => <th key={h} className={clsx(GRID_TH, extra)}>{h}</th>

  return (
    <div className="space-y-4">
      <Card title={annual ? 'Headcount plan – years 2 to 5 (annual)' : 'Headcount actuals by capability and month – year 1'}
        subtitle={annual ? 'Annual exit headcount per capability for years 2–5. Actuals are month-wise for year 1 only; the annual targets are maintained in GCC Setup → Organisation structure.' : `Cumulative Pune headcount actually onboarded per capability at month end. Plan (grey placeholder) comes from the capability ramp in GCC Setup → Organisation structure. Months after the reporting month (${reportingMonth}) stay plan-only. The FTEs Onboarded KPI reads ${reportingMonth}.`}
        headerRight={<div className="flex items-center gap-3"><HcViewToggle value={view} onChange={setView} size="md" /><Link to="/" className="link inline-flex items-center gap-1 text-[12px] whitespace-nowrap">Organisation structure <ExternalLink size={12} /></Link></div>}>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full border-separate border-spacing-0" style={{ minWidth: annual ? 860 : 1040 }}>
            <thead>
              <tr>
                {hdr('Business unit / capability · role / skill')}
                {annual ? [hdr('Year 1', 'text-center'), ...OUT_YEARS.map((y) => hdr(y, 'text-center'))] : months.map((mo, i) => hdr(mo, clsx('text-center', i === reportingIdx && 'text-brand-600', i > reportingIdx && 'text-slate-400')))}
                {annual ? hdr('Year 5 vs Year 1', 'text-right') : [hdr('Y1 target', 'text-right'), hdr(`Plan ${reportingMonth}`, 'text-right'), hdr(`Actual ${reportingMonth}`, 'text-right'), hdr('Var.', 'text-right')]}
              </tr>
            </thead>
            <tbody>
              {buNames.map((bu) => {
                const hc = buHeadcountRows.find((r) => r.businessUnit === bu)
                const unit = unitOf(bu)
                const isCollapsed = collapsed.has(bu)
                const subs = subsOf(bu)
                return [
                  <tr key={bu} className="bg-surface/70 cursor-pointer hover:bg-brand-50/40" onClick={() => toggle(bu)}>
                    <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] font-semibold whitespace-nowrap')}><span className="inline-flex items-center gap-1"><ChevronRight size={12} className={clsx('text-ink-400 transition-transform', !isCollapsed && 'rotate-90')} />{bu}<span className="text-[11px] font-normal text-ink-500 ml-1">{subs.length} capabilities</span></span></td>
                    {annual
                      ? [<td key="y1" className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] font-semibold text-center')}>{unit?.y1 ?? 0}</td>, ...OUT_YEARS.map((y, i) => <td key={y} className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] font-semibold text-center')}>{unit?.[(['y2', 'y3', 'y4', 'y5'] as const)[i]] ?? 0}</td>)]
                      : months.map((mo, i) => { const a = unitActual(bu, i), p = unitPlan(bu, i); return <td key={mo} className={clsx(GRID_TD, 'px-1 py-1.5 text-[12px] text-center font-semibold', i > reportingIdx ? 'text-slate-400' : a === null ? 'text-ink-400' : a >= p ? 'text-green-700' : 'text-red-600')} title={`Plan ${p}`}>{i > reportingIdx ? p : a ?? '—'}</td> })}
                    {annual
                      ? <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-right text-ink-700')}>{(unit?.y5 ?? 0) - (unit?.y1 ?? 0) >= 0 ? '+' : ''}{(unit?.y5 ?? 0) - (unit?.y1 ?? 0)}</td>
                      : [<td key="t" className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] text-right font-semibold')}>{hc?.target ?? 0}</td>, <td key="p" className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-right text-ink-500')}>{hc?.plan ?? 0}</td>, <td key="a" className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] text-right font-semibold')}>{hc?.onboarded ?? 0}</td>, <td key="v" className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-right font-medium', (hc?.onboarded ?? 0) >= (hc?.plan ?? 0) ? 'text-green-600' : 'text-red-600')}>{(hc?.onboarded ?? 0) - (hc?.plan ?? 0) >= 0 ? '+' : ''}{(hc?.onboarded ?? 0) - (hc?.plan ?? 0)}</td>]}
                  </tr>,
                  ...(isCollapsed ? [] : subs.map((s) => {
                    const row = capActualRows.find((r) => r.id === `ca-${s.id}`)
                    if (!row) return null
                    const act = row.actuals[reportingIdx] ?? null, plan = s.ramp[reportingIdx] ?? 0
                    return (
                      <tr key={s.id} className="hover:bg-brand-50/30">
                        <td className={clsx(GRID_TD, 'px-2 py-1 text-[12px] whitespace-nowrap pl-7')} title={`${s.roleSkill} · ${s.wave} · ${s.transitionType} from ${s.deliveryLocation}`}>{s.name}<span className="text-[11px] text-ink-400"> · {s.roleSkill}</span></td>
                        {annual
                          ? [<td key="y1" className={clsx(GRID_TD, 'px-2 py-1 text-[12px] text-center')}>{subY1(s)}</td>, ...([s.y2, s.y3, s.y4, s.y5]).map((v, i) => <td key={i} className={clsx(GRID_TD, 'px-2 py-1 text-[12px] text-center')}>{v}</td>)]
                          : months.map((mo, i) => (
                            <td key={mo} className={clsx(GRID_TD, 'text-center px-0.5')}>
                              {i <= reportingIdx ? <ActualCell value={row.actuals[i] ?? null} plan={s.ramp[i] ?? 0} onChange={(v) => setActual(row, i, v)} /> : <span className="text-[12px] text-slate-400 px-1.5" title="Plan (after the reporting month)">{s.ramp[i] ?? 0}</span>}
                            </td>
                          ))}
                        {annual
                          ? <td className={clsx(GRID_TD, 'px-2 py-1 text-[12px] text-right text-ink-500')}>{s.y5 - subY1(s) >= 0 ? '+' : ''}{s.y5 - subY1(s)}</td>
                          : [<td key="t" className={clsx(GRID_TD, 'px-2 py-1 text-[12px] text-right')}>{subY1(s)}</td>, <td key="p" className={clsx(GRID_TD, 'px-2 py-1 text-[12px] text-right text-ink-500')}>{plan}</td>, <td key="a" className={clsx(GRID_TD, 'px-2 py-1 text-[12px] text-right font-medium')}>{act ?? '—'}</td>, <td key="v" className={clsx(GRID_TD, 'px-2 py-1 text-[12px] text-right', act === null ? 'text-ink-400' : act >= plan ? 'text-green-600' : 'text-red-600')}>{act === null ? '—' : `${act - plan >= 0 ? '+' : ''}${act - plan}`}</td>]}
                      </tr>
                    )
                  })),
                ]
              })}
              <tr className="bg-surface">
                <td className="px-2 py-2 text-[12.5px] font-bold">Total – ENGIE IT GCC Pune</td>
                {annual
                  ? [<td key="y1" className="px-2 py-2 text-[12.5px] font-bold text-center">{kpi.y1Target}</td>, ...planYears.map((v, i) => <td key={i} className="px-2 py-2 text-[12.5px] font-bold text-center">{v}</td>)]
                  : months.map((mo, i) => <td key={mo} className={clsx('px-1 py-2 text-[12.5px] text-center font-bold', i > reportingIdx ? 'text-slate-400' : (actualMonths[i] ?? 0) >= (planMonths[i] ?? 0) ? 'text-green-700' : 'text-red-600')} title={`Plan ${planMonths[i]}`}>{i > reportingIdx ? planMonths[i] : actualMonths[i] ?? '—'}</td>)}
                {annual
                  ? <td className="px-2 py-2 text-[12.5px] font-bold text-right">+{(planYears[planYears.length - 1] ?? 0) - kpi.y1Target}</td>
                  : [<td key="t" className={clsx('px-2 py-2 text-[12.5px] font-bold text-right', kpi.y1Target !== settings.fteTarget && 'text-amber-600')} title={kpi.y1Target !== settings.fteTarget ? `Differs from the ${settings.fteTarget} FTE target in Settings` : undefined}>{kpi.y1Target}</td>, <td key="p" className="px-2 py-2 text-[12.5px] font-semibold text-right text-ink-500">{kpi.planned}</td>, <td key="a" className="px-2 py-2 text-[12.5px] font-bold text-right">{kpi.onboarded}</td>, <td key="v" className={clsx('px-2 py-2 text-[12.5px] font-bold text-right', kpi.onboarded >= kpi.planned ? 'text-green-600' : 'text-red-600')}>{kpi.onboarded - kpi.planned >= 0 ? '+' : ''}{kpi.onboarded - kpi.planned}</td>]}
              </tr>
            </tbody>
          </table>
        </div>
        {!annual && <p className="text-[11.5px] text-ink-500 mt-2">Onboarded, in hiring and open per capability are derived: onboarded = actual at the reporting month, in hiring = requisitions in interview / offer, open = open requisitions (Requisitions tab).</p>}
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
    <Card title={`People cost by business unit (${m.unitLabel})`} subtitle="Annual people-cost budget (year-1 target × blended cost) and run-rate (onboarded × blended cost) per business unit. Totals feed the Annual People Cost KPI and the Cost Analysis tab.">
      <table className="w-full border-separate border-spacing-0">
        <thead><tr>{['Business unit', 'Year-1 target', 'Onboarded FTEs', `Budget (${m.unitLabel})`, `Actual / run-rate (${m.unitLabel})`, 'Variance', 'Utilised', `Cost per FTE (${m.lakhUnitLabel})`].map((h, i) => <th key={h} className={clsx(GRID_TH, i >= 1 && 'text-right')}>{h}</th>)}</tr></thead>
        <tbody>
          {peopleCostRows.map((r) => {
            const hc = buHeadcountRows.find((w) => w.businessUnit === r.businessUnit)
            const fte = hc?.onboarded ?? 0
            const variance = +(r.budgetCr - r.actualCr).toFixed(2)
            return (
              <tr key={r.id} className="hover:bg-brand-50/40">
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12.5px] font-medium whitespace-nowrap')}>{r.businessUnit}</td>
                <td className={clsx(GRID_TD, 'px-2 py-1.5 text-[12px] text-ink-500 text-right')}>{hc?.target ?? 0}</td>
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
            <td className="px-2 py-2 text-[12.5px] text-right font-semibold">{buHeadcountRows.reduce((s, r) => s + r.target, 0)}</td>
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
      <Card title="Skills availability" subtitle="Required (year-1 target of the capabilities needing the skill) vs available (onboarded) capacity per skill category. Gap and coverage are derived and feed the Skills Availability card." action={<button className="btn-primary" onClick={add}><Plus size={14} /> Add skill category</button>}>
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
      <Card title="Training & upskilling programmes" subtitle="Programmes closing the capability gap, incl. knowledge transfer from the source locations · click a row to edit" action={<button className="btn-primary" onClick={() => setAddTp(true)}><Plus size={14} /> Add programme</button>}>
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
  const { settings, settingsC, locationMix, kpi, planMonths } = d
  const [f, setF] = useState<ResourceSettings>(settings)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(settings)
  const num = (k: keyof ResourceSettings) => ({ type: 'number', step: 'any', value: f[k] as number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: parseFloat(e.target.value) || 0 }) }) as const
  const seats = locationMix.items.reduce((s, l) => s + l.seats, 0)
  const y1 = planMonths[planMonths.length - 1] ?? 0
  return (
    <div className="grid grid-cols-[1.2fr_1fr] gap-4">
      <Card title="Resource plan settings" subtitle="Reporting month, targets and ratios used by the KPI tiles, the forecast scenarios and the Location Mix tab">
        <FormGrid cols={2}>
          <Field label="Reporting month (year 1)"><Select options={RAMP_MONTHS} value={f.currentMonth} onChange={(e) => setF({ ...f, currentMonth: e.target.value })} /></Field>
          <Field label="Pune FTE target (year 1)"><Input {...num('fteTarget')} />{f.fteTarget !== y1 && <span className="text-[11px] text-amber-600">Organisation structure sums to {y1} by the end of year 1</span>}</Field>
          <Field label="Avg. time to hire (months)"><Input {...num('avgTimeToHireMonths')} /></Field>
          <Field label="Time to hire target (months)"><Input {...num('timeToHireTargetMonths')} /></Field>
          <Field label="Seats per FTE (seat ratio)"><Input {...num('seatRatio')} /></Field>
          <Field label="Forecast scenarios: accelerated +% / conservative −%"><div className="flex gap-2"><Input {...num('acceleratedPct')} /><Input {...num('conservativePct')} /></div></Field>
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
            ['Reporting month', `${settings.currentMonth} – the FTEs Onboarded tile reads this month's actuals (${kpi.onboarded} vs plan ${kpi.planned})`],
            ['Hiring progress', `${settings.fteTarget ? Math.round((kpi.onboarded / settings.fteTarget) * 100) : 0}% (${kpi.onboarded} of ${settings.fteTarget} FTEs)`],
            ['Time to hire vs target', `${settings.avgTimeToHireMonths} months · ${kpi.tthDelta > 0 ? '+' : ''}${kpi.tthDelta} vs ${settings.timeToHireTargetMonths} target`],
            ['Seats needed at target', `${Math.round(settings.fteTarget * settings.seatRatio)} seats (${seats} available today)`],
            ['Forecast scenarios', `Year 5: base ${d.planYears[3] ?? 0} · accelerated ${Math.round((d.planYears[3] ?? 0) * (1 + settings.acceleratedPct / 100))} · conservative ${Math.round((d.planYears[3] ?? 0) * (1 - settings.conservativePct / 100))}`],
          ].map(([k, v]) => <div key={k} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"><span className="text-ink-500 shrink-0">{k}</span><span className="font-medium text-ink-900 text-right">{v}</span></div>)}
        </div>
      </Card>
    </div>
  )
}

/* ---------- Input view shell ---------- */
export function ResourcesInputView({ d }: { d: ResourceData }) {
  const [openReq, setOpenReq] = useState<string | null>(null)
  const tabs = useMemo(() => [
    { name: 'Headcount actuals', content: <HeadcountActualsTab d={d} />, hint: 'Inline grid by business unit → capability – every change is saved immediately and reflected in the Output view. Switch between year 1 (month-wise) and years 2–5 (annual).' },
    { name: 'Requisitions', content: <RequisitionRegister d={d} onOpen={setOpenReq} title="Requisitions" />, hint: 'Add, edit and remove requisitions by business unit and capability. Click a role to open its candidate pipeline.' },
    { name: 'Candidates', content: <CandidateRegister d={d} onOpen={setOpenReq} />, hint: 'Every applicant across all requisitions. Change the stage or status inline, or use Next / Reject.' },
    { name: 'People cost', content: <PeopleCostTab d={d} /> },
    { name: 'Skills', content: <SkillsInputTab d={d} /> },
    { name: 'Settings', content: <SettingsTab d={d} /> },
  ], [d])
  return (
    <>
      <InputLayout title="Resource Management" subtitle="Enter the headcount actuals by capability, requisitions, candidates, people cost and skills that drive the Resource Management dashboards of the ENGIE IT GCC, Pune." tabs={tabs} />
      <RequisitionDrillDown d={d} positionId={openReq} onClose={() => setOpenReq(null)} />
    </>
  )
}
