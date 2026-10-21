/**
 * Output view → Cost Model tab: sub-tab strip, business-unit filter and the sub-tab bodies. Also the
 * "Modelled run-rate vs tracked budget" card used on the Financial Overview.
 */
import { useState } from 'react'
import { Building2, Calculator } from 'lucide-react'
import { Card, Tabs, FilterSelect, ViewAll } from '../../ui'
import { useCostModel } from './useCostModel'
import { SummaryView, ChecksView } from './OutputSummary'
import { UnitsView } from './OutputUnits'
import { BreakdownView, AnnualView, PerFteView, CashFlowView } from './OutputViews'
import { ScenariosView, SensitivityView } from './OutputScenarios'
import { checkSummary, lakhFmt, hc } from './shared'

export const COST_MODEL_SUBTABS = ['Summary', 'By business unit', 'Cost breakdown', 'Annual view', 'Per-FTE view', 'Cash flow', 'Scenarios', 'Sensitivity', 'Model checks'] as const
export type CostModelSubTab = (typeof COST_MODEL_SUBTABS)[number]

export function CostModelTab({ initialSub }: { initialSub?: CostModelSubTab }) {
  const cm = useCostModel()
  const { m, result, units } = cm
  const [sub, setSub] = useState<CostModelSubTab>(initialSub ?? 'Summary')
  const [scope, setScope] = useState<string>('all')
  const [unit, setUnit] = useState<string>(units[0]?.id ?? '')
  const scopeId = scope === 'all' || !units.some((u) => u.id === scope) ? 'all' : scope
  const e = scopeId === 'all' ? result.program : result.byUnit[scopeId]
  const names = ['All business units', ...units.map((u) => u.name)]
  const scopeName = scopeId === 'all' ? 'All business units' : units.find((u) => u.id === scopeId)?.name ?? 'All business units'
  const last = result.program.years[result.horizon - 1]
  return (
    <>
      <Tabs size="sm" tabs={[...COST_MODEL_SUBTABS]} active={sub} onChange={(t) => setSub(t as CostModelSubTab)} />
      <div className="flex items-center justify-between gap-4 -mt-2">
        <p className="text-[12.5px] text-ink-500">GCC run-rate cost model · {result.horizon}-year horizon from {cm.inputs.settings.firstYear} · {hc(last.exit)} FTE by {last.label} · {cm.inputs.realEstate.model}{cm.inputs.realEstate.city ? ` in ${cm.inputs.realEstate.city}` : ''} · {scopeId === 'all' ? `${units.length} business units` : scopeName} · {m.unitLabel}, per-FTE in {m.lakhUnitLabel}. Inputs live in the Input view → GCC run-rate cost model.</p>
        {sub !== 'By business unit' && sub !== 'Model checks' && <FilterSelect label="Business unit" icon={<Building2 size={15} className="text-brand-600" />} value={scopeName} options={names} onChange={(v) => setScope(v === 'All business units' ? 'all' : units.find((u) => u.name === v)?.id ?? 'all')} />}
      </div>
      {sub === 'Summary' && <SummaryView cm={cm} e={e} goChecks={() => setSub('Model checks')} />}
      {sub === 'By business unit' && <UnitsView cm={cm} unit={unit} onUnit={setUnit} />}
      {sub === 'Cost breakdown' && <BreakdownView cm={cm} e={e} />}
      {sub === 'Annual view' && <AnnualView cm={cm} e={e} />}
      {sub === 'Per-FTE view' && <PerFteView cm={cm} e={e} />}
      {sub === 'Cash flow' && <CashFlowView cm={cm} e={e} />}
      {sub === 'Scenarios' && <ScenariosView cm={cm} scope={scopeId} />}
      {sub === 'Sensitivity' && <SensitivityView cm={cm} scope={scopeId} />}
      {sub === 'Model checks' && <ChecksView result={result} m={m} />}
    </>
  )
}

/** Financial Overview card: modelled run-rate (cost model) next to the tracked setup budget. */
export function ModelVsBudgetCard({ approvedCr, forecastCr, onOpen }: { approvedCr: number; forecastCr: number; onOpen: () => void }) {
  const { m, result } = useCostModel()
  const p = result.program
  const last = p.years[result.horizon - 1], first = p.years[0]
  const ratio = approvedCr > 0 ? p.runRate / approvedCr : 0
  return (
    <Card title="Modelled run-rate vs tracked budget" subtitle="GCC run-rate cost model (drivers × unit costs by business unit) next to the setup program budget tracked above." action={<ViewAll label="Open Cost Model" onClick={onOpen} />}>
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1.4fr] gap-3 items-stretch">
        <div className="rounded-lg border border-line px-3 py-2.5"><div className="text-[10.5px] uppercase tracking-wide text-ink-500 font-semibold">Setup program budget (tracking)</div><div className="text-[20px] font-bold text-navy-900 leading-tight mt-1">{m.fmt(approvedCr)}</div><div className="text-[11px] text-ink-500">approved · forecast {m.fmt(forecastCr)}</div></div>
        <div className="rounded-lg border border-brand-200 bg-brand-50/40 px-3 py-2.5"><div className="text-[10.5px] uppercase tracking-wide text-brand-600 font-semibold">GCC run-rate cost model</div><div className="text-[20px] font-bold text-brand-600 leading-tight mt-1">{m.fmt(p.runRate)}</div><div className="text-[11px] text-ink-500">{last.label} run-rate · {hc(last.exit)} FTE{ratio ? ` · ${ratio.toFixed(0)}× the one-off setup budget` : ''}</div></div>
        <div className="rounded-lg border border-line px-3 py-2.5"><div className="text-[10.5px] uppercase tracking-wide text-ink-500 font-semibold">{result.horizon}-year modelled total</div><div className="text-[20px] font-bold text-navy-900 leading-tight mt-1">{m.fmt(p.total)}</div><div className="text-[11px] text-ink-500">{first.label} {m.fmt(first.total)} → {last.label} {m.fmt(last.total)}</div></div>
        <div className="rounded-lg border border-line px-3 py-2.5"><div className="text-[10.5px] uppercase tracking-wide text-ink-500 font-semibold">{last.label} fully loaded cost per FTE</div><div className="text-[20px] font-bold text-navy-900 leading-tight mt-1">{lakhFmt(m, p.runRateCostPerFte)}</div><div className="text-[11px] text-ink-500">{p.peopleShare.toFixed(0)}% people costs</div></div>
        <div className="rounded-lg border border-line px-3 py-2.5 flex flex-col justify-between"><div><div className="text-[10.5px] uppercase tracking-wide text-ink-500 font-semibold inline-flex items-center gap-1"><Calculator size={11} /> Model checks</div><div className="text-[12.5px] font-semibold text-ink-900 mt-1">{checkSummary(result.checks)}</div></div><div className="text-[11px] text-ink-500">Every rupee derived from drivers × unit costs; assumptions next to an industry reference.</div></div>
      </div>
    </Card>
  )
}
