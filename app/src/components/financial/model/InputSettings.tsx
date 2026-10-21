/**
 * Model settings – horizon, first year, opening headcount, attrition backfill, escalation modes and the
 * reference actions (fill empty inputs / reset the whole model to the industry reference).
 */
import clsx from 'clsx'
import { Download, RotateCcw, Users } from 'lucide-react'
import { Card, Field, Input, Select, FormGrid } from '../../ui'
import { REFERENCE, fillFromReference, referenceInputs, seedCostModel, unitExit, type EscalationMode, type SimpleMode } from '../../../data/costModel'
import type { CostModel } from './useCostModel'
import { PctInput, ModeToggle, gth, gtd, checkSummary, CheckBadge, fmtDetail } from './shared'

const MODES: { key: EscalationMode; label: string }[] = [{ key: 'same', label: 'Same across all years' }, { key: 'escalate', label: 'Apply annual escalation' }, { key: 'byYear', label: 'Customise by year' }]
const SIMPLE: { key: SimpleMode; label: string }[] = [{ key: 'same', label: 'Same across all years' }, { key: 'escalate', label: 'Apply annual escalation' }]

export function ModelSettingsInput({ cm }: { cm: CostModel }) {
  const { m, inputs, result, units, allUnits, patch, save } = cm
  const s = inputs.settings
  const rows: { label: string; mode: SimpleMode; rate: number; ref: number; setMode: (v: SimpleMode) => void; setRate: (v: number) => void }[] = [
    { label: 'Other people costs', mode: inputs.otherPeople.mode, rate: inputs.otherPeople.escalationRate, ref: REFERENCE.otherPeople.escalationRate, setMode: (v) => patch((d) => { d.otherPeople.mode = v }), setRate: (v) => patch((d) => { d.otherPeople.escalationRate = v }) },
    { label: 'Real estate', mode: inputs.realEstate.mode, rate: inputs.realEstate.escalationRate, ref: REFERENCE.realEstate.escalationRate, setMode: (v) => patch((d) => { d.realEstate.mode = v }), setRate: (v) => patch((d) => { d.realEstate.escalationRate = v }) },
    { label: 'Technology', mode: inputs.technology.mode, rate: inputs.technology.escalationRate, ref: REFERENCE.technology.escalationRate, setMode: (v) => patch((d) => { d.technology.mode = v }), setRate: (v) => patch((d) => { d.technology.escalationRate = v }) },
    { label: 'Centre / corporate', mode: inputs.corporate.mode, rate: inputs.corporate.escalationRate, ref: REFERENCE.corporate.escalationRate, setMode: (v) => patch((d) => { d.corporate.mode = v }), setRate: (v) => patch((d) => { d.corporate.escalationRate = v }) },
  ]
  const offPlan = units.filter((u) => { const e = unitExit(inputs, u); return [u.y1, u.y2, u.y3, u.y4, u.y5].some((v, i) => v !== (e[i] ?? 0)) })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_1.3fr] gap-4">
        <Card title="Horizon and headcount mechanics" subtitle="The model runs for the horizon from the first year; opening headcount is spread across business units in proportion to their Year-1 exit headcount.">
          <FormGrid cols={2}>
            <Field label="Horizon (years)"><Select options={['3', '4', '5']} value={String(s.horizonYears)} onChange={(e) => patch((d) => { d.settings.horizonYears = parseInt(e.target.value) })} /></Field>
            <Field label="First year"><Input type="number" value={s.firstYear} onChange={(e) => patch((d) => { d.settings.firstYear = parseInt(e.target.value) || REFERENCE.settings.firstYear })} /></Field>
            <Field label="Opening headcount at the start of Year 1"><Input type="number" min={0} value={s.openingHeadcount} onChange={(e) => patch((d) => { d.settings.openingHeadcount = Math.max(0, parseInt(e.target.value) || 0) })} /></Field>
            <Field label="Attrition backfill (% of average headcount hired again each year)"><Input type="number" min={0} step="any" value={s.attritionRate} onChange={(e) => patch((d) => { d.settings.attritionRate = Math.max(0, parseFloat(e.target.value) || 0) })} /></Field>
          </FormGrid>
          <p className="text-[11.5px] text-ink-500 mt-3">New hires = max(0, exit − opening) + attrition backfill. Average headcount for costing = (opening + exit) ÷ 2.</p>
        </Card>
        <Card title="Escalation modes" subtitle="How each cost module moves across the years. Compensation can also be customised year by year on the people-costs tab.">
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={gth}>Module</th><th className={gth}>Mode</th><th className={clsx(gth, 'text-right')}>Annual rate</th><th className={clsx(gth, 'text-right')}>Reference</th></tr></thead>
            <tbody>
              <tr><td className={clsx(gtd, 'py-1.5 font-medium')}>Compensation</td><td className={gtd}><ModeToggle<EscalationMode> value={s.compMode} options={MODES} onChange={(v) => patch((d) => { d.settings.compMode = v })} /></td><td className={clsx(gtd, 'text-right')}><PctInput value={s.compEscalationRate} onChange={(v) => patch((d) => { d.settings.compEscalationRate = v })} disabled={s.compMode !== 'escalate'} /></td><td className={clsx(gtd, 'text-right px-2 text-ink-500')}>{REFERENCE.settings.compEscalationRate} %</td></tr>
              {rows.map((r) => <tr key={r.label}><td className={clsx(gtd, 'py-1.5 font-medium')}>{r.label}</td><td className={gtd}><ModeToggle<SimpleMode> value={r.mode} options={SIMPLE} onChange={r.setMode} /></td><td className={clsx(gtd, 'text-right')}><PctInput value={r.rate} onChange={r.setRate} disabled={r.mode !== 'escalate'} /></td><td className={clsx(gtd, 'text-right px-2 text-ink-500')}>{r.ref} %</td></tr>)}
            </tbody>
          </table>
        </Card>
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-4">
        <Card title="Industry reference" subtitle="India GCC reference set (the Future Factor 360 benchmark converted at 96 INR per USD). Use it to complete a partial model or to start over.">
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => save(fillFromReference(inputs))}><Download size={14} /> Fill empty inputs from industry reference</button>
            <button className="btn-secondary" onClick={() => { if (window.confirm('Reset headcount of every business unit to the FTE plan from GCC Setup?')) patch((d) => { for (const u of allUnits) d.units[u.id] = { ...d.units[u.id], exit: [u.y1, u.y2, u.y3, u.y4, u.y5] } }) }}><Users size={14} /> Reset headcount to FTE plan {offPlan.length ? `(${offPlan.length} differ)` : ''}</button>
            <button className="btn-secondary text-red-600 hover:bg-red-50" onClick={() => { if (window.confirm('Reset the whole cost model to the industry reference? Unit-level compensation overrides are removed; headcount comes from the FTE plan.')) save(referenceInputs(allUnits)) }}><RotateCcw size={14} /> Reset model to reference</button>
            <button className="btn-secondary" onClick={() => { if (window.confirm('Restore the demo seed (reference + practice premiums, managed office in Pune)?')) save(seedCostModel(allUnits)) }}><RotateCcw size={14} /> Restore demo seed</button>
          </div>
          <p className="text-[11.5px] text-ink-500 mt-3">Inputs are stored as one record in the <code>costModel</code> collection in Indian rupees (lakh for per-FTE and unit costs, rupees per sq ft for lease rates); saved scenarios live in <code>costModelScenarios</code>. Totals are computed in crore and shown in the currency selected in the top bar.</p>
        </Card>
        <Card title="Model checks" subtitle={checkSummary(result.checks)}>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto scroll-thin pr-1">
            {result.checks.map((c) => <div key={c.id} className="flex items-start gap-2 text-[12px]"><CheckBadge status={c.status} /><span><span className="font-medium text-ink-900">{fmtDetail(m, c.name)}</span> <span className="text-ink-500">– {fmtDetail(m, c.detail)}</span></span></div>)}
          </div>
          <p className="mt-3 text-[11.5px] text-ink-500">Horizon in use: {result.horizon} years · {units.length} business units in scope · first year {s.firstYear}.</p>
        </Card>
      </div>
    </div>
  )
}
