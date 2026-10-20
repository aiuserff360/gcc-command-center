import { useMemo, useState } from 'react'
import { Coins, Wallet, BarChart3, Target, BarChart2, HandCoins, Plus, Settings2 } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Card, Tabs, Badge, Legend, Table, ViewAll, Modal } from '../components/ui'
import { useStore, uid } from '../store/useStore'
import { fmtDate } from '../data/common'
import { FIN_TABS, VIEW_OPTIONS, FIN_WS_COLORS, FIN_WORKSTREAMS, COST_CATEGORIES, pct, r2, type FinTab, type ViewBy, type BudgetLine, type FinancialMilestone, type FinanceSettings } from '../data/financial'
import { useFinance, type Fin } from '../components/financial/useFinance'
import { CumulativeChart, PhaseChart, AllocationDonut, CashFlowChart, RunRateChart } from '../components/financial/charts'
import { WsIcon, VariancePill, SpentBar, Tbl, mnum, TOTAL_ROW, FinKpi } from '../components/financial/shared'
import { RecordModal, useEditor, type FieldSpec } from '../components/financial/RecordModal'
import { BUDGET_LINE_FIELDS, MILESTONE_FIELDS } from '../components/financial/fields'
import { BudgetBreakdownTab, ActualsForecastTab, CostByWorkstreamTab, CostByCategoryTab, BenefitsTab, ScenarioTab, ApprovalsTab } from '../components/financial/tabs'

const SETTINGS_FIELDS: FieldSpec<FinanceSettings>[] = [
  { key: 'runRateYear', label: 'Run-rate / benefits year', type: 'select', options: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'] },
  { key: 'headroomPctOfBudget', label: 'Forecast headroom (% of budget shown on tile)', type: 'number' },
  { key: 'discountRatePct', label: 'Discount rate (%) for scenario NPV', type: 'number' },
  { key: 'contingencyPct', label: 'Contingency (%)', type: 'number' },
  { key: 'varianceCommentary', label: 'Variance commentary', type: 'textarea' },
]

export default function Financial() {
  const [view, setView] = useState<ViewBy>('Total Program')
  const [tab, setTab] = useState<FinTab>('Financial Overview')
  const fin = useFinance(view)
  const m = fin.m
  const [settingsOpen, setSettingsOpen] = useState(false)
  const s = fin.settings
  const viewSub = view === 'Total Program' ? '(Setup + Ramp-up)' : view === 'Setup (Capex)' ? '(Setup only)' : '(Ramp-up only)'

  return (
    <div className="space-y-4">
      <PageHeader title="Financial Management" subtitle="Plan, track and control budgets, costs and financial benefits across the GCC lifecycle." viewValue={view} viewOptions={VIEW_OPTIONS} onView={(v) => setView(v as ViewBy)} dateRange="01 Jan 2026 – 31 Dec 2027" onEdit={() => setSettingsOpen(true)} editLabel="Edit settings" />

      <div className="grid grid-cols-6 gap-3">
        <FinKpi tone="blue" icon={<Coins size={18} />} value={m.fmt(fin.approved)} label="Approved Budget" sub={viewSub} />
        <FinKpi tone="red" icon={<Wallet size={18} />} value={m.fmt(fin.actual)} label="Actual Spend" sub={`(${pct(fin.actual, fin.approved)}% of budget)`} />
        <FinKpi tone="navy" iconTone="green" icon={<BarChart3 size={18} />} value={m.fmt(fin.forecast)} label="Forecast at Completion" sub={`(${pct(fin.forecast, fin.approved)}% of budget)`} />
        <FinKpi tone="green" iconTone="teal" icon={<Target size={18} />} value={m.fmt(fin.headroom)} label="Forecast Headroom" sub={`(${s.headroomPctOfBudget}% of budget)`} />
        <FinKpi tone="navy" iconTone="blue" icon={<BarChart2 size={18} />} value={m.fmt(fin.projectedRunRate)} label="Projected Annual Run-rate" sub={`(${s.runRateYear})`} />
        <FinKpi tone="green" iconTone="teal" icon={<HandCoins size={18} />} value={m.fmt(fin.benefitForecast)} label="Projected Annual Benefits" sub={`(${s.runRateYear}, ${fin.benefitPct}% of target)`} />
      </div>

      <Tabs tabs={[...FIN_TABS]} active={tab} onChange={(t) => setTab(t as FinTab)} />

      {tab === 'Financial Overview' && <Overview fin={fin} goTo={setTab} onSettings={() => setSettingsOpen(true)} />}
      {tab === 'Budget Breakdown' && <BudgetBreakdownTab fin={fin} view={view} />}
      {tab === 'Actuals & Forecast' && <ActualsForecastTab fin={fin} onSettings={() => setSettingsOpen(true)} />}
      {tab === 'Cost by Workstream' && <CostByWorkstreamTab fin={fin} />}
      {tab === 'Cost by Category' && <CostByCategoryTab fin={fin} />}
      {tab === 'Benefits Tracking' && <BenefitsTab fin={fin} />}
      {tab === 'Scenario Analysis' && <ScenarioTab fin={fin} onSettings={() => setSettingsOpen(true)} />}
      {tab === 'Approvals & Commitments' && <ApprovalsTab fin={fin} />}

      <RecordModal<FinanceSettings> title="Financial settings" value={settingsOpen ? s : null} fields={SETTINGS_FIELDS} onClose={() => setSettingsOpen(false)} onSave={(v) => fin.settingsC.update(v)} />
    </div>
  )
}

/* ================= Financial Overview ================= */
function Overview({ fin, goTo, onSettings }: { fin: Fin; goTo: (t: FinTab) => void; onSettings: () => void }) {
  const phase = useStore((st) => st.phase)
  const m = fin.m
  const lineEd = useEditor<BudgetLine>()
  const msEd = useEditor<FinancialMilestone>()
  const [allMs, setAllMs] = useState(false)
  const milestones = useMemo(() => [...fin.milestones.items].sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [fin.milestones.items])
  const topMs = milestones.slice(0, 5)
  const catMax = Math.max(...fin.categoryRows.map((c) => c.forecastCr), 0.1)
  const benefitRows = fin.benefits.items

  return (
    <>
      {/* Row 1 */}
      <div className="grid grid-cols-[1.33fr_0.97fr_1.25fr] gap-4">
        <Card title={`Budget vs Actual vs Forecast (Cumulative) (${m.unitLabel})`}>
          <Legend items={[{ label: 'Monthly Actual', color: '#BFD7F7' }, { label: 'Cumulative Actual', color: '#1E5BBE' }, { label: 'Cumulative Forecast', color: '#16A34A' }, { label: 'Approved Budget', color: '#9CA3AF', dashed: true }]} />
          <div className="mt-2"><CumulativeChart rows={fin.cumulative} m={m} /></div>
        </Card>
        <Card title={`Spend by Phase (${m.unitLabel})`}>
          <Legend items={[{ label: 'Actual', color: '#1E5BBE' }, { label: 'Forecast', color: '#5B9BF0' }, { label: 'Budget', color: '#BFD7F7' }]} />
          <div className="mt-2"><PhaseChart rows={fin.phaseRows} m={m} highlight={phase} /></div>
        </Card>
        <Card title="Cost Allocation (Forecast at Completion)">
          <div className="flex items-center gap-4">
            <AllocationDonut data={fin.donut} m={m} center={m.fmt(fin.forecast)} size={156} />
            <div className="flex-1 space-y-[7px] min-w-0">
              {fin.donut.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: FIN_WS_COLORS[d.name] ?? '#94A3B8' }} />
                  <span className="flex-1 text-ink-700 truncate">{d.name}</span>
                  <span className="font-semibold text-ink-900">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-[1.95fr_0.95fr_0.8fr] gap-4">
        <Card title={`Workstream Budget and Spend (${m.unitLabel})`} action={<button className="link inline-flex items-center gap-1" onClick={() => lineEd.open({ id: uid('bl'), workstream: '', approvedCr: 0, actualCr: 0, forecastCr: 0, setupShare: 0.5, allocation: {}, owner: '' }, true)}><Plus size={12} /> Add</button>}>
          <Tbl>
            <thead><tr>
              <th className="th px-1.5! text-[11.5px]!">Workstream</th><th className="th px-1.5! text-[11.5px]! text-right">Approved<br />Budget</th><th className="th px-1.5! text-[11.5px]! text-right">Actual<br />Spend</th><th className="th px-1.5! text-[11.5px]! text-right">Forecast at<br />Completion</th><th className="th px-1.5! text-[11.5px]! text-center">Variance</th><th className="th px-1.5! text-[11.5px]!">% Spent</th>
            </tr></thead>
            <tbody>
              {fin.lines.map((l) => (
                <tr key={l.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => lineEd.open(fin.budgetLines.items.find((b) => b.id === l.id)!)}>
                  <td className="td py-1! px-1.5! text-[12px]! whitespace-nowrap"><span className="flex items-center gap-1.5"><WsIcon name={l.workstream} />{l.workstream}</span></td>
                  <td className="td py-1! px-1.5! text-[12.5px]! text-right">{mnum(m, l.approvedCr)}</td>
                  <td className="td py-1! px-1.5! text-[12.5px]! text-right">{mnum(m, l.actualCr)}</td>
                  <td className="td py-1! px-1.5! text-[12.5px]! text-right">{mnum(m, l.forecastCr)}</td>
                  <td className="td py-1! px-1.5! text-center"><VariancePill value={r2(l.forecastCr - l.approvedCr)} /></td>
                  <td className="td py-1! px-1.5!"><SpentBar pct={pct(l.actualCr, l.approvedCr)} width={46} /></td>
                </tr>
              ))}
              <tr className={TOTAL_ROW}>
                <td className="td py-1! px-1.5! text-[12.5px]! rounded-l-md">Total</td><td className="td py-1! px-1.5! text-[12.5px]! text-right">{mnum(m, fin.approved)}</td><td className="td py-1! px-1.5! text-[12.5px]! text-right">{mnum(m, fin.actual)}</td><td className="td py-1! px-1.5! text-[12.5px]! text-right">{mnum(m, fin.forecast)}</td>
                <td className="td py-1! px-1.5! text-center"><VariancePill value={r2(fin.forecast - fin.approved)} /></td><td className="td py-1! px-1.5! text-[12.5px]! rounded-r-md">{pct(fin.actual, fin.approved)}%</td>
              </tr>
            </tbody>
          </Tbl>
        </Card>
        <Card title={`Monthly Cash Flow (${m.unitLabel})`}>
          <Legend items={[{ label: 'Inflow (Client)', color: '#14B8A6' }, { label: 'Outflow (Spend)', color: '#1E5BBE' }, { label: 'Net Cash Flow', color: '#0B2240' }]} />
          <div className="mt-2"><CashFlowChart rows={fin.cashFlow} m={m} height={236} /></div>
        </Card>
        <Card title={`Cost by Category (Forecast) (${m.unitLabel})`} action={<ViewAll label="Details" onClick={() => goTo('Cost by Category')} />}>
          <div className="pt-1 space-y-2.5">
            {fin.categoryRows.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-[11.5px]">
                <span className="text-ink-700 truncate shrink-0" style={{ width: 126 }} title={c.name}>{c.name}</span>
                <span className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${(c.forecastCr / catMax) * 100}%`, background: '#3B82F6' }} /></span>
                <span className="w-8 text-right font-medium text-ink-900 tabular-nums">{mnum(m, c.forecastCr)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-[1.2fr_0.78fr_1.22fr] gap-4">
        <Card title="Key Financial Milestones" action={<ViewAll onClick={() => setAllMs(true)} />}>
          <div className="[&_td]:text-[12px]! [&_td]:px-1.5! [&_th]:px-1.5!">
            <Table<FinancialMilestone> compact rows={topMs} onRowClick={(r) => msEd.open(r)} columns={[
              { key: 'name', header: 'Milestone', className: 'whitespace-nowrap' },
              { key: 'amountCr', header: <>Amount<br />({m.unitLabel})</>, className: 'whitespace-nowrap', render: (r) => mnum(m, r.amountCr) },
              { key: 'dueDate', header: 'Due Date', className: 'whitespace-nowrap', render: (r) => fmtDate(r.dueDate) },
              { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
            ]} />
          </div>
        </Card>
        <Card title={`Annual Run-rate Projection (${m.unitLabel})`} action={<button className="text-ink-400 hover:text-brand-600 cursor-pointer" title="Financial settings" onClick={onSettings}><Settings2 size={15} /></button>}>
          <Legend items={[{ label: 'Operating Cost', color: '#3B82F6' }, { label: 'Productivity Savings', color: '#16A34A' }, { label: 'Net Run-rate', color: '#0B2240' }]} />
          <div className="mt-1"><RunRateChart rows={fin.runRows} m={m} /></div>
        </Card>
        <Card title="Benefit Realization Tracking" action={<ViewAll label="View Details" onClick={() => goTo('Benefits Tracking')} />}>
          <Tbl>
            <thead><tr><th className="th px-1.5!">Benefit Area</th><th className="th px-1.5! text-right">Target<br />({m.unitLabel})</th><th className="th px-1.5! text-right">Forecast<br />({m.unitLabel})</th><th className="th px-1.5! text-right">% of<br />Target</th><th className="th px-1.5!">Status</th></tr></thead>
            <tbody>
              {benefitRows.map((b) => (
                <tr key={b.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => goTo('Benefits Tracking')}>
                  <td className="td py-1.5! px-1.5! text-[12px]! whitespace-nowrap">{b.area}</td><td className="td py-1.5! px-1.5! text-[12px]! text-right">{mnum(m, b.targetCr)}</td><td className="td py-1.5! px-1.5! text-[12px]! text-right">{mnum(m, b.forecastCr)}</td><td className="td py-1.5! px-1.5! text-[12px]! text-right">{pct(b.forecastCr, b.targetCr)}%</td><td className="td py-1.5! px-1.5!"><Badge value={b.status} /></td>
                </tr>
              ))}
              <tr className={TOTAL_ROW}><td className="td py-1.5! px-1.5! text-[12px]! rounded-l-md">Total</td><td className="td py-1.5! px-1.5! text-[12px]! text-right">{mnum(m, fin.benefitTarget)}</td><td className="td py-1.5! px-1.5! text-[12px]! text-right">{mnum(m, fin.benefitForecast)}</td><td className="td py-1.5! px-1.5! text-[12px]! text-right">{fin.benefitPct}%</td><td className="td py-1.5! px-1.5! rounded-r-md" /></tr>
            </tbody>
          </Tbl>
        </Card>
      </div>

      <RecordModal<BudgetLine> title={lineEd.editing?.isNew ? 'Add budget line' : 'Edit budget line'} value={lineEd.editing?.value ?? null} isNew={lineEd.editing?.isNew} fields={BUDGET_LINE_FIELDS} onClose={lineEd.close}
        onSave={(v) => (lineEd.editing?.isNew ? fin.budgetLines.add(v) : fin.budgetLines.update(v))} onDelete={fin.budgetLines.remove} />
      <Modal open={allMs} onClose={() => setAllMs(false)} title="Key Financial Milestones" width="max-w-4xl" footer={<button className="btn-primary" onClick={() => msEd.open({ id: uid('fm'), name: '', amountCr: 0, dueDate: '2027-01-31', status: 'Not Started', workstream: FIN_WORKSTREAMS[0], owner: '' }, true)}><Plus size={14} /> Add milestone</button>}>
        <Table<FinancialMilestone> compact rows={milestones} onRowClick={(r) => msEd.open(r)} columns={[
          { key: 'name', header: 'Milestone' },
          { key: 'workstream', header: 'Workstream' },
          { key: 'owner', header: 'Owner' },
          { key: 'amountCr', header: `Amount (${m.unitLabel})`, render: (r) => mnum(m, r.amountCr) },
          { key: 'dueDate', header: 'Due Date', render: (r) => fmtDate(r.dueDate) },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
        ]} />
        <p className="text-[12px] text-ink-500 mt-3">Total committed through milestones: <b>{m.fmt(fin.milestones.items.reduce((a, ms) => a + ms.amountCr, 0))}</b> · {COST_CATEGORIES.length} cost categories tracked</p>
      </Modal>
      <RecordModal<FinancialMilestone> title={msEd.editing?.isNew ? 'Add financial milestone' : 'Edit financial milestone'} value={msEd.editing?.value ?? null} isNew={msEd.editing?.isNew} fields={MILESTONE_FIELDS} onClose={msEd.close}
        onSave={(v) => (msEd.editing?.isNew ? fin.milestones.add(v) : fin.milestones.update(v))} onDelete={fin.milestones.remove} />
    </>
  )
}
