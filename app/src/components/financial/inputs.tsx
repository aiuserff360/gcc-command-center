/**
 * Financial Management – Input view. Every record behind the finance dashboards is entered here:
 * inline grids for the numeric tables, the existing record modals for the registers (commitments,
 * approvals) and a form for the settings. Nothing here renders KPI tiles or charts.
 */
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import { Check, X, RotateCcw, Pencil, Trash2 } from 'lucide-react'
import { InputLayout } from '../layout/InputLayout'
import { Card, Badge, FilterSelect, Field, Input, Select, TextArea, FormGrid, Table, Tabs } from '../ui'
import { CostModelInput } from './model/CostModelInput'
import { uid } from '../../store/useStore'
import { fmtDate, fmtDateShort, TODAY } from '../../data/common'
import { COST_CATEGORIES, FIN_WORKSTREAMS, BENEFIT_QUARTERS, r2, sum, pct, type BudgetLine, type MonthlyFinancial, type PhaseSpend, type CostCategoryRow, type CostCategory, type FinancialMilestone, type Benefit, type RunRateYear, type Commitment, type FinancialApproval, type FinanceScenario, type FinanceSettings } from '../../data/financial'
import { useFinance, type Fin } from './useFinance'
import { WsIcon, mnum, mfmt } from './shared'
import { RecordModal, useEditor } from './RecordModal'
import { COMMITMENT_FIELDS, APPROVAL_FIELDS, newCommitment } from './tabs'
import { Grid, GridHead, GridEmpty, GridText, GridSelect, GridDate, GridNum, GridMoney, GridRemove, GridTotal, AddButton, SaveBar, gtd, gtotal } from './grid'

const MS_STATUSES = ['Completed', 'On Track', 'At Risk', 'Pending', 'Not Started', 'Delayed'] as const
const BN_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Completed'] as const
const SC_STATUSES = ['Recommended', 'Option', 'Not Preferred'] as const
const RUN_YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'] as const

export function FinancialInput() {
  const fin = useFinance('Total Program')
  const m = fin.m
  const u = m.unitLabel
  const [group, setGroup] = useState<string>(TRACKING_TABS[0])
  const tracking: { name: string; hint: string; content: ReactNode }[] = [
    { name: 'Budget by workstream', hint: `Approved, actual and forecast per workstream, and how each approved budget splits across cost categories (${u}).`, content: <><BudgetLinesGrid fin={fin} /><AllocationGrid fin={fin} /></> },
    { name: 'Monthly actuals & forecast', hint: `Phased budget, actual and forecast spend plus client inflow and outflow per month (${u}). Cumulative lines and the cash-flow chart are derived from this grid.`, content: <MonthlyGrid fin={fin} /> },
    { name: 'Phases & categories', hint: `Spend by lifecycle phase and by cost category (${u}). Leave a phase's Budget empty when it has none; category budget comes from the workstream × category allocation.`, content: <><PhaseGrid fin={fin} /><CategoryGrid fin={fin} /></> },
    { name: 'Commitments & POs', hint: 'Register of vendor commitments and purchase orders with invoiced and paid amounts. Click a row to edit it.', content: <CommitmentsInput fin={fin} /> },
    { name: 'Approvals', hint: 'Budget requests awaiting decision. Approve, reject or reopen a request; click a row to edit the details.', content: <ApprovalsInput fin={fin} /> },
    { name: 'Milestones', hint: `Key funding and spend milestones with amount (${u}), due date and status.`, content: <MilestoneGrid fin={fin} /> },
    { name: 'Benefits', hint: `Annual benefit target and forecast per benefit area (${u}) with the quarter realization starts.`, content: <BenefitGrid fin={fin} /> },
    { name: 'Scenarios', hint: `Investment and benefit assumptions per scenario (${u}). Payback, IRR and NPV are computed on the Output view.`, content: <ScenarioGrid fin={fin} /> },
    { name: 'Settings', hint: 'Run-rate year, forecast headroom, discount rate, contingency and the variance commentary shown on the dashboards.', content: <><SettingsForm fin={fin} /><RunRateGrid fin={fin} /></> },
  ]
  const cur = tracking.find((t) => t.name === group) ?? tracking[0]
  return (
    <InputLayout
      title="Financial Management"
      subtitle={`Two sets of inputs: the GCC run-rate cost model (drivers × unit costs by business unit) and the setup program budget tracking (budgets, actuals, commitments, benefits). Amounts are entered in ${u} / ${m.lakhUnitLabel} and feed every finance dashboard.`}
      tabs={[
        { name: 'GCC run-rate cost model', hint: 'Driver-based 5-year cost model of the centre by business unit – headcount, people costs, real estate, technology, centre operations. Every input sits next to an industry reference; results are on the Output view → Cost Model.', content: <CostModelInput /> },
        { name: 'Setup program budget (tracking)', content: (
          <div className="space-y-4">
            <Tabs size="sm" tabs={tracking.map((t) => t.name)} active={cur.name} onChange={setGroup} />
            <p className="text-[12.5px] text-ink-500 -mt-2">{cur.hint}</p>
            {cur.content}
          </div>
        ) },
      ]}
    />
  )
}
const TRACKING_TABS = ['Budget by workstream', 'Monthly actuals & forecast', 'Phases & categories', 'Commitments & POs', 'Approvals', 'Milestones', 'Benefits', 'Scenarios', 'Settings']

/* ================= Budget lines ================= */
const blankLine = (): BudgetLine => ({ id: uid('bl'), workstream: 'New workstream', approvedCr: 0, actualCr: 0, forecastCr: 0, setupShare: 0.5, allocation: {}, owner: '' })

function BudgetLinesGrid({ fin }: { fin: Fin }) {
  const m = fin.m
  const { items, add, update, remove } = fin.budgetLines
  const set = <K extends keyof BudgetLine>(l: BudgetLine, k: K, v: BudgetLine[K]) => update({ ...l, [k]: v })
  const tA = sum(items.map((l) => l.approvedCr)), tAc = sum(items.map((l) => l.actualCr)), tF = sum(items.map((l) => l.forecastCr))
  return (
    <Card title={`Budget lines (${m.unitLabel})`} subtitle="One line per workstream: approved budget, actual spend to date, forecast at completion and the share that is Setup (Capex) vs Ramp-up (Opex)." action={<AddButton onClick={() => add(blankLine())}>Add budget line</AddButton>}>
      <Grid minWidth={960}>
        <GridHead cols={['Workstream', 'Budget owner', 'Approved budget', 'Actual spend', 'Forecast at completion', 'Variance', 'Setup (Capex) %', '% spent', '']} right={[2, 3, 4, 5, 6, 7]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={9} />}
          {items.map((l) => {
            const v = r2(l.forecastCr - l.approvedCr)
            return (
              <tr key={l.id} className="hover:bg-brand-50/40">
                <td className={clsx(gtd, 'min-w-[240px]')}><span className="flex items-center gap-1.5 pl-1"><WsIcon name={l.workstream} /><GridText bold value={l.workstream} onChange={(x) => set(l, 'workstream', x)} /></span></td>
                <td className={clsx(gtd, 'min-w-[130px]')}><GridText value={l.owner ?? ''} placeholder="Owner" onChange={(x) => set(l, 'owner', x)} /></td>
                <td className={gtd}><GridMoney cr={l.approvedCr} onChange={(x) => set(l, 'approvedCr', x ?? 0)} className="ml-auto" /></td>
                <td className={gtd}><GridMoney cr={l.actualCr} onChange={(x) => set(l, 'actualCr', x ?? 0)} className="ml-auto" /></td>
                <td className={gtd}><GridMoney cr={l.forecastCr} onChange={(x) => set(l, 'forecastCr', x ?? 0)} className="ml-auto" /></td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 tabular-nums', v > 0 ? 'text-red-600' : 'text-green-700')}>{m.signed(v, m.digits)}</td>
                <td className={gtd}><GridNum value={Math.round(l.setupShare * 100)} min={0} step={5} width={64} onChange={(x) => set(l, 'setupShare', Math.min(100, Math.max(0, x ?? 0)) / 100)} className="ml-auto" /></td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 text-ink-500 tabular-nums')}>{pct(l.actualCr, l.approvedCr)}%</td>
                <td className={gtd}><GridRemove label={l.workstream} onClick={() => remove(l.id)} /></td>
              </tr>
            )
          })}
          {items.length > 0 && (
            <tr>
              <td colSpan={2} className="text-right text-[12px] text-ink-500 px-2 py-2">Total</td>
              <GridTotal cr={tA} /><GridTotal cr={tAc} /><GridTotal cr={tF} />
              <td className={clsx(gtotal, r2(tF - tA) > 0 ? 'text-red-600' : 'text-green-700')}>{m.signed(r2(tF - tA), m.digits)}</td>
              <td /><td className={clsx(gtotal, 'text-ink-500 font-normal text-[12px]')}>{pct(tAc, tA)}%</td><td />
            </tr>
          )}
        </tbody>
      </Grid>
    </Card>
  )
}

function AllocationGrid({ fin }: { fin: Fin }) {
  const m = fin.m
  const { items, update } = fin.budgetLines
  const setCell = (l: BudgetLine, c: CostCategory, v: number) => {
    const allocation = { ...l.allocation, [c]: r2(v) }
    update({ ...l, allocation, approvedCr: r2(sum(Object.values(allocation).map((x) => x ?? 0))) })
  }
  const colTotals = COST_CATEGORIES.map((c) => sum(items.map((l) => l.allocation[c] ?? 0)))
  const allocated = (l: BudgetLine) => sum(Object.values(l.allocation).map((x) => x ?? 0))
  return (
    <Card title={`Allocation by cost category (${m.unitLabel})`} subtitle="Split each workstream's approved budget across cost categories. Editing a cell sets the line's approved budget to the sum of its categories.">
      <Grid minWidth={1000}>
        <GridHead cols={['Workstream', ...COST_CATEGORIES, 'Unallocated', 'Approved budget']} right={[1, 2, 3, 4, 5, 6, 7, 8]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={COST_CATEGORIES.length + 3}>Add a budget line above to allocate it.</GridEmpty>}
          {items.map((l) => {
            const un = r2(l.approvedCr - allocated(l))
            return (
              <tr key={l.id} className="hover:bg-brand-50/40">
                <td className={clsx(gtd, 'min-w-[220px] whitespace-nowrap text-[12px] px-2')}><span className="flex items-center gap-1.5"><WsIcon name={l.workstream} />{l.workstream}</span></td>
                {COST_CATEGORIES.map((c) => <td key={c} className={gtd}><GridMoney cr={l.allocation[c] ?? 0} onChange={(x) => setCell(l, c, x ?? 0)} className={clsx('ml-auto', !(l.allocation[c] ?? 0) && 'text-ink-400')} /></td>)}
                <td className={clsx(gtd, 'text-right text-[12px] px-2 tabular-nums', Math.abs(un) > 0.004 ? 'text-amber-600 font-medium' : 'text-ink-400')}>{mnum(m, un, 2)}</td>
                <td className={clsx(gtd, 'text-right text-[12.5px] px-2 font-semibold tabular-nums')}>{mnum(m, l.approvedCr, 2)}</td>
              </tr>
            )
          })}
          {items.length > 0 && (
            <tr>
              <td className="text-right text-[12px] text-ink-500 px-2 py-2">Total</td>
              {colTotals.map((t, i) => <td key={i} className={gtotal}>{mnum(m, t, 2)}</td>)}
              <td className={clsx(gtotal, 'text-ink-500')}>{mnum(m, r2(sum(items.map((l) => l.approvedCr - allocated(l)))), 2)}</td>
              <td className={gtotal}>{mnum(m, sum(items.map((l) => l.approvedCr)), 2)}</td>
            </tr>
          )}
        </tbody>
      </Grid>
    </Card>
  )
}

/* ================= Monthly ================= */
function MonthlyGrid({ fin }: { fin: Fin }) {
  const m = fin.m
  const { items, add, update, remove } = fin.monthly
  const set = <K extends keyof MonthlyFinancial>(r: MonthlyFinancial, k: K, v: MonthlyFinancial[K]) => update({ ...r, [k]: v })
  const tot = (k: keyof MonthlyFinancial) => sum(items.map((r) => r[k] as number))
  /** Running totals per row (budget, actual) in collection order. */
  const cum = items.reduce<{ b: number; a: number }[]>((acc, r) => { const prev = acc[acc.length - 1] ?? { b: 0, a: 0 }; acc.push({ b: r2(prev.b + r.budgetCr), a: r2(prev.a + r.actualCr) }); return acc }, [])
  return (
    <Card title={`Monthly actuals and forecast (${m.unitLabel})`} subtitle="Budget (phased), actual and forecast spend per month, plus client inflow and spend outflow for the cash-flow view." action={<AddButton onClick={() => add({ id: uid('mf'), month: '', budgetCr: 0, actualCr: 0, forecastCr: 0, inflowCr: 0, outflowCr: 0 })}>Add month</AddButton>}>
      <Grid minWidth={900}>
        <GridHead cols={['Month', 'Budget', 'Actual', 'Forecast', 'Variance (Actual − Budget)', 'Cumulative budget', 'Cumulative actual', 'Inflow (client)', 'Outflow (spend)', 'Net cash flow', '']} right={[1, 2, 3, 4, 5, 6, 7, 8, 9]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={11} />}
          {items.map((r, i) => {
            const cumB = cum[i].b, cumA = cum[i].a
            const v = r2(r.actualCr - r.budgetCr), net = r2(r.inflowCr - r.outflowCr)
            return (
              <tr key={r.id} className="hover:bg-brand-50/40">
                <td className={clsx(gtd, 'min-w-[110px]')}><GridText bold value={r.month} placeholder="e.g. Jan" onChange={(x) => set(r, 'month', x)} /></td>
                <td className={gtd}><GridMoney cr={r.budgetCr} onChange={(x) => set(r, 'budgetCr', x ?? 0)} className="ml-auto" /></td>
                <td className={gtd}><GridMoney cr={r.actualCr} onChange={(x) => set(r, 'actualCr', x ?? 0)} className="ml-auto" /></td>
                <td className={gtd}><GridMoney cr={r.forecastCr} onChange={(x) => set(r, 'forecastCr', x ?? 0)} className="ml-auto" /></td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 tabular-nums', v > 0 ? 'text-red-600' : 'text-green-700')}>{m.signed(v, m.digits + 1)}</td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 text-ink-500 tabular-nums')}>{mnum(m, cumB, 2)}</td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 text-ink-500 tabular-nums')}>{mnum(m, cumA, 2)}</td>
                <td className={gtd}><GridMoney cr={r.inflowCr} onChange={(x) => set(r, 'inflowCr', x ?? 0)} className="ml-auto" /></td>
                <td className={gtd}><GridMoney cr={r.outflowCr} onChange={(x) => set(r, 'outflowCr', x ?? 0)} className="ml-auto" /></td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 tabular-nums', net < 0 ? 'text-red-600' : 'text-ink-900')}>{m.signed(net, m.digits + 1)}</td>
                <td className={gtd}><GridRemove label={r.month || 'this month'} onClick={() => remove(r.id)} /></td>
              </tr>
            )
          })}
          {items.length > 0 && (
            <tr>
              <td className="text-right text-[12px] text-ink-500 px-2 py-2">Total</td>
              <td className={gtotal}>{mnum(m, tot('budgetCr'), 2)}</td><td className={gtotal}>{mnum(m, tot('actualCr'), 2)}</td><td className={gtotal}>{mnum(m, tot('forecastCr'), 2)}</td>
              <td className={clsx(gtotal, r2(tot('actualCr') - tot('budgetCr')) > 0 ? 'text-red-600' : 'text-green-700')}>{m.signed(r2(tot('actualCr') - tot('budgetCr')), m.digits + 1)}</td>
              <td /><td />
              <td className={gtotal}>{mnum(m, tot('inflowCr'), 2)}</td><td className={gtotal}>{mnum(m, tot('outflowCr'), 2)}</td>
              <td className={gtotal}>{m.signed(r2(tot('inflowCr') - tot('outflowCr')), m.digits + 1)}</td><td />
            </tr>
          )}
        </tbody>
      </Grid>
    </Card>
  )
}

/* ================= Phase & category ================= */
function PhaseGrid({ fin }: { fin: Fin }) {
  const m = fin.m
  const { items, add, update, remove } = fin.phases
  const set = <K extends keyof PhaseSpend>(r: PhaseSpend, k: K, v: PhaseSpend[K]) => update({ ...r, [k]: v })
  return (
    <Card title={`Spend by phase (${m.unitLabel})`} subtitle="Actual and forecast spend per lifecycle phase. Budget is optional (Design often has none)." action={<AddButton onClick={() => add({ id: uid('ps'), phase: 'New phase', actualCr: 0, forecastCr: 0, budgetCr: null })}>Add phase</AddButton>}>
      <Grid minWidth={560}>
        <GridHead cols={['Phase', 'Actual', 'Forecast', 'Budget', 'Forecast vs budget', '']} right={[1, 2, 3, 4]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={6} />}
          {items.map((r) => {
            const v = r.budgetCr == null ? null : r2(r.forecastCr - r.budgetCr)
            return (
              <tr key={r.id} className="hover:bg-brand-50/40">
                <td className={clsx(gtd, 'min-w-[200px]')}><GridText bold value={r.phase} onChange={(x) => set(r, 'phase', x)} /></td>
                <td className={gtd}><GridMoney cr={r.actualCr} onChange={(x) => set(r, 'actualCr', x ?? 0)} className="ml-auto" /></td>
                <td className={gtd}><GridMoney cr={r.forecastCr} onChange={(x) => set(r, 'forecastCr', x ?? 0)} className="ml-auto" /></td>
                <td className={gtd}><GridMoney nullable cr={r.budgetCr} onChange={(x) => set(r, 'budgetCr', x)} className="ml-auto" /></td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 tabular-nums', v == null ? 'text-ink-400' : v > 0 ? 'text-red-600' : 'text-green-700')}>{v == null ? '–' : m.signed(v, m.digits)}</td>
                <td className={gtd}><GridRemove label={r.phase} onClick={() => remove(r.id)} /></td>
              </tr>
            )
          })}
          {items.length > 0 && (
            <tr>
              <td className="text-right text-[12px] text-ink-500 px-2 py-2">Total</td>
              <GridTotal cr={sum(items.map((r) => r.actualCr))} /><GridTotal cr={sum(items.map((r) => r.forecastCr))} /><GridTotal cr={sum(items.map((r) => r.budgetCr ?? 0))} /><td /><td />
            </tr>
          )}
        </tbody>
      </Grid>
    </Card>
  )
}

function CategoryGrid({ fin }: { fin: Fin }) {
  const m = fin.m
  const { items, add, update, remove } = fin.categories
  const set = <K extends keyof CostCategoryRow>(r: CostCategoryRow, k: K, v: CostCategoryRow[K]) => update({ ...r, [k]: v })
  const budget = fin.categoryBudget
  return (
    <Card title={`Cost categories (${m.unitLabel})`} subtitle="Actual and forecast spend per category. The budget column is derived from the workstream × category allocation." action={<AddButton onClick={() => add({ id: uid('cc'), name: 'New category', actualCr: 0, forecastCr: 0, description: '' })}>Add category</AddButton>}>
      <Grid minWidth={820}>
        <GridHead cols={['Category', 'Description', 'Budget (allocated)', 'Actual', 'Forecast', 'Variance', '% spent', '']} right={[2, 3, 4, 5, 6]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={8} />}
          {items.map((r) => {
            const b = budget[r.name] ?? 0, v = r2(r.forecastCr - b)
            return (
              <tr key={r.id} className="hover:bg-brand-50/40">
                <td className={clsx(gtd, 'min-w-[190px]')}><GridText bold value={r.name} onChange={(x) => set(r, 'name', x)} /></td>
                <td className={clsx(gtd, 'min-w-[260px]')}><GridText value={r.description ?? ''} placeholder="What this category covers" onChange={(x) => set(r, 'description', x)} /></td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 tabular-nums', b ? 'text-ink-900' : 'text-ink-400')}>{mnum(m, b, 2)}</td>
                <td className={gtd}><GridMoney cr={r.actualCr} onChange={(x) => set(r, 'actualCr', x ?? 0)} className="ml-auto" /></td>
                <td className={gtd}><GridMoney cr={r.forecastCr} onChange={(x) => set(r, 'forecastCr', x ?? 0)} className="ml-auto" /></td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 tabular-nums', v > 0 ? 'text-red-600' : 'text-green-700')}>{m.signed(v, m.digits)}</td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 text-ink-500 tabular-nums')}>{pct(r.actualCr, b)}%</td>
                <td className={gtd}><GridRemove label={r.name} onClick={() => remove(r.id)} /></td>
              </tr>
            )
          })}
          {items.length > 0 && (
            <tr>
              <td colSpan={2} className="text-right text-[12px] text-ink-500 px-2 py-2">Total</td>
              <td className={gtotal}>{mnum(m, sum(items.map((r) => budget[r.name] ?? 0)), 2)}</td>
              <GridTotal cr={sum(items.map((r) => r.actualCr))} /><GridTotal cr={sum(items.map((r) => r.forecastCr))} /><td /><td /><td />
            </tr>
          )}
        </tbody>
      </Grid>
    </Card>
  )
}

/* ================= Commitments & POs ================= */
function CommitmentsInput({ fin }: { fin: Fin }) {
  const m = fin.m
  const ed = useEditor<Commitment>()
  const [status, setStatus] = useState('All')
  const [ws, setWs] = useState('All')
  const rows = fin.commitments.items.filter((c) => (status === 'All' || c.status === status) && (ws === 'All' || c.workstream === ws))
  const tc = sum(rows.map((c) => c.committedCr)), ti = sum(rows.map((c) => c.invoicedCr)), tp = sum(rows.map((c) => c.paidCr))
  return (
    <>
      <Card title={`Commitments and purchase orders (${m.unitLabel})`} subtitle={`${fin.commitments.items.length} POs · committed ${mfmt(m, fin.committed, 2)} · invoiced ${mfmt(m, fin.invoiced, 2)} · paid ${mfmt(m, fin.paid, 2)}`}
        action={<div className="flex items-center gap-2"><FilterSelect label="Workstream" value={ws} options={['All', ...FIN_WORKSTREAMS]} onChange={setWs} /><FilterSelect label="Status" value={status} options={['All', 'Open', 'Approved', 'In Progress', 'Closed']} onChange={setStatus} /><AddButton onClick={() => ed.open({ ...newCommitment(), workstream: ws === 'All' ? FIN_WORKSTREAMS[0] : ws }, true)}>Add commitment</AddButton></div>}>
        <div className="[&_td]:px-2! [&_th]:px-2! [&_td]:text-[12.5px]!"><Table<Commitment> compact rows={rows} onRowClick={(c) => ed.open(c)} empty="No commitments match this filter." columns={[
          { key: 'poNumber', header: 'PO', className: 'whitespace-nowrap font-medium' },
          { key: 'vendor', header: 'Vendor', className: 'whitespace-nowrap' },
          { key: 'description', header: 'Description', render: (c) => <span className="block max-w-[200px] truncate" title={c.description}>{c.description}</span> },
          { key: 'workstream', header: 'Workstream', className: 'whitespace-nowrap', render: (c) => <span className="block max-w-[150px] truncate" title={c.workstream}>{c.workstream}</span> },
          { key: 'category', header: 'Category', className: 'whitespace-nowrap', render: (c) => <span className="block max-w-[140px] truncate" title={c.category}>{c.category}</span> },
          { key: 'committedCr', header: 'Committed', className: 'text-right', render: (c) => mnum(m, c.committedCr, 2) },
          { key: 'invoicedCr', header: 'Invoiced', className: 'text-right', render: (c) => mnum(m, c.invoicedCr, 2) },
          { key: 'paidCr', header: 'Paid', className: 'text-right', render: (c) => mnum(m, c.paidCr, 2) },
          { key: 'status', header: 'Status', render: (c) => <Badge value={c.status} /> },
          { key: 'date', header: 'PO date', className: 'whitespace-nowrap', render: (c) => fmtDateShort(c.date) },
          { key: 'actions', header: '', render: (c) => <RowActions onEdit={() => ed.open(c)} onRemove={() => fin.commitments.remove(c.id)} label={c.poNumber} /> },
        ]} /></div>
        {rows.length > 0 && <div className="flex justify-end gap-6 text-[12.5px] mt-2 pr-3"><span className="text-ink-500">Total ({rows.length} POs)</span><span className="font-semibold">Committed {mnum(m, tc, 2)}</span><span className="font-semibold">Invoiced {mnum(m, ti, 2)}</span><span className="font-semibold">Paid {mnum(m, tp, 2)}</span></div>}
      </Card>
      <RecordModal<Commitment> title={ed.editing?.isNew ? 'Add commitment / PO' : 'Edit commitment / PO'} value={ed.editing?.value ?? null} isNew={ed.editing?.isNew} fields={COMMITMENT_FIELDS} onClose={ed.close}
        onSave={(v) => (ed.editing?.isNew ? fin.commitments.add(v) : fin.commitments.update(v))} onDelete={fin.commitments.remove} />
    </>
  )
}

function RowActions({ onEdit, onRemove, label }: { onEdit: () => void; onRemove: () => void; label: string }) {
  return (
    <span className="flex items-center gap-0.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
      <button title="Edit" className="text-slate-400 hover:text-brand-600 p-1 cursor-pointer" onClick={onEdit}><Pencil size={13} /></button>
      <button title="Remove" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => { if (window.confirm(`Remove ${label}?`)) onRemove() }}><Trash2 size={13} /></button>
    </span>
  )
}

/* ================= Approvals ================= */
function ApprovalsInput({ fin }: { fin: Fin }) {
  const m = fin.m
  const ed = useEditor<FinancialApproval>()
  const [filter, setFilter] = useState('All')
  const rows = [...fin.approvals.items].sort((a, b) => (a.status === 'Pending' ? -1 : 1) - (b.status === 'Pending' ? -1 : 1) || b.date.localeCompare(a.date)).filter((a) => filter === 'All' || a.status === filter)
  const pending = fin.approvals.items.filter((a) => a.status === 'Pending')
  const setStatus = (a: FinancialApproval, status: FinancialApproval['status']) => fin.approvals.update({ ...a, status })
  return (
    <>
      <Card title="Approval queue" subtitle={`${pending.length} pending · ${mfmt(m, sum(pending.map((a) => a.amountCr)), 2)} awaiting decision`}
        action={<div className="flex items-center gap-2"><FilterSelect label="Status" value={filter} options={['All', 'Pending', 'Approved', 'Rejected']} onChange={setFilter} /><AddButton onClick={() => ed.open({ id: uid('ap'), item: '', amountCr: 0, requester: '', approver: 'Global CFO', workstream: FIN_WORKSTREAMS[0], status: 'Pending', date: TODAY, notes: '' }, true)}>New request</AddButton></div>}>
        <div className="[&_td]:px-2! [&_th]:px-2! [&_td]:text-[12.5px]!"><Table<FinancialApproval> compact rows={rows} onRowClick={(a) => ed.open(a)} empty="No approval requests match this filter." columns={[
          { key: 'item', header: 'Item', render: (a) => <div><div className="font-medium">{a.item || <span className="text-ink-400">Untitled request</span>}</div>{a.notes && <div className="text-[11px] text-ink-500">{a.notes}</div>}</div> },
          { key: 'workstream', header: 'Workstream', className: 'whitespace-nowrap' },
          { key: 'amountCr', header: `Amount (${m.unitLabel})`, className: 'text-right', render: (a) => mnum(m, a.amountCr, 2) },
          { key: 'requester', header: 'Requester', className: 'whitespace-nowrap' },
          { key: 'approver', header: 'Approver', className: 'whitespace-nowrap' },
          { key: 'date', header: 'Requested', className: 'whitespace-nowrap', render: (a) => fmtDate(a.date) },
          { key: 'status', header: 'Status', render: (a) => <Badge value={a.status} /> },
          { key: 'decision', header: 'Decision', render: (a) => (
            <span className="flex items-center gap-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
              {a.status === 'Pending' ? (
                <>
                  <button className="inline-flex items-center gap-1 rounded-md bg-green-50 text-green-700 px-2 py-1 text-[11.5px] font-medium hover:bg-green-100 cursor-pointer" onClick={() => setStatus(a, 'Approved')}><Check size={12} /> Approve</button>
                  <button className="inline-flex items-center gap-1 rounded-md bg-red-50 text-red-600 px-2 py-1 text-[11.5px] font-medium hover:bg-red-100 cursor-pointer" onClick={() => setStatus(a, 'Rejected')}><X size={12} /> Reject</button>
                </>
              ) : (
                <button className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-600 px-2 py-1 text-[11.5px] font-medium hover:bg-slate-200 cursor-pointer" onClick={() => setStatus(a, 'Pending')}><RotateCcw size={12} /> Reopen</button>
              )}
            </span>
          ) },
          { key: 'actions', header: '', render: (a) => <RowActions onEdit={() => ed.open(a)} onRemove={() => fin.approvals.remove(a.id)} label={a.item || 'this request'} /> },
        ]} /></div>
      </Card>
      <RecordModal<FinancialApproval> title={ed.editing?.isNew ? 'New approval request' : 'Edit approval request'} value={ed.editing?.value ?? null} isNew={ed.editing?.isNew} fields={APPROVAL_FIELDS} onClose={ed.close}
        onSave={(v) => (ed.editing?.isNew ? fin.approvals.add(v) : fin.approvals.update(v))} onDelete={fin.approvals.remove} />
    </>
  )
}

/* ================= Milestones ================= */
function MilestoneGrid({ fin }: { fin: Fin }) {
  const m = fin.m
  const { items, add, update, remove } = fin.milestones
  const set = <K extends keyof FinancialMilestone>(r: FinancialMilestone, k: K, v: FinancialMilestone[K]) => update({ ...r, [k]: v })
  return (
    <Card title={`Financial milestones (${m.unitLabel})`} subtitle="Funding releases, contract payments and spend checkpoints the steering committee tracks." action={<AddButton onClick={() => add({ id: uid('fm'), name: 'New milestone', amountCr: 0, dueDate: '2027-01-31', status: 'Not Started', workstream: FIN_WORKSTREAMS[0], owner: '' })}>Add milestone</AddButton>}>
      <Grid minWidth={900}>
        <GridHead cols={['Milestone', 'Workstream', 'Owner', 'Amount', 'Due date', 'Status', '']} right={[3]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={7} />}
          {items.map((r) => (
            <tr key={r.id} className="hover:bg-brand-50/40">
              <td className={clsx(gtd, 'min-w-[260px]')}><GridText bold value={r.name} onChange={(x) => set(r, 'name', x)} /></td>
              <td className={clsx(gtd, 'min-w-[220px]')}><GridSelect value={r.workstream} options={FIN_WORKSTREAMS} onChange={(x) => set(r, 'workstream', x)} /></td>
              <td className={clsx(gtd, 'min-w-[120px]')}><GridText value={r.owner} placeholder="Owner" onChange={(x) => set(r, 'owner', x)} /></td>
              <td className={gtd}><GridMoney cr={r.amountCr} onChange={(x) => set(r, 'amountCr', x ?? 0)} className="ml-auto" /></td>
              <td className={gtd}><GridDate value={r.dueDate} onChange={(x) => set(r, 'dueDate', x)} /></td>
              <td className={clsx(gtd, 'min-w-[130px]')}><GridSelect value={r.status} options={MS_STATUSES} onChange={(x) => set(r, 'status', x)} /></td>
              <td className={gtd}><GridRemove label={r.name} onClick={() => remove(r.id)} /></td>
            </tr>
          ))}
          {items.length > 0 && <tr><td colSpan={3} className="text-right text-[12px] text-ink-500 px-2 py-2">Total committed through milestones</td><GridTotal cr={sum(items.map((r) => r.amountCr))} /><td colSpan={3} /></tr>}
        </tbody>
      </Grid>
    </Card>
  )
}

/* ================= Benefits ================= */
function BenefitGrid({ fin }: { fin: Fin }) {
  const m = fin.m
  const { items, add, update, remove } = fin.benefits
  const set = <K extends keyof Benefit>(r: Benefit, k: K, v: Benefit[K]) => update({ ...r, [k]: v })
  const tT = sum(items.map((b) => b.targetCr)), tF = sum(items.map((b) => b.forecastCr))
  return (
    <Card title={`Benefits (${m.unitLabel}, annual)`} subtitle="Business-case benefit areas with annual target, current forecast and the quarter in which realization starts." action={<AddButton onClick={() => add({ id: uid('bn'), area: 'New benefit area', targetCr: 0, forecastCr: 0, status: 'On Track', owner: '', startQuarter: BENEFIT_QUARTERS[0], description: '' })}>Add benefit</AddButton>}>
      <Grid minWidth={960}>
        <GridHead cols={['Benefit area', 'Description', 'Owner', 'Realization starts', 'Target', 'Forecast', '% of target', 'Status', '']} right={[4, 5, 6]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={9} />}
          {items.map((b) => (
            <tr key={b.id} className="hover:bg-brand-50/40">
              <td className={clsx(gtd, 'min-w-[180px]')}><GridText bold value={b.area} onChange={(x) => set(b, 'area', x)} /></td>
              <td className={clsx(gtd, 'min-w-[260px]')}><GridText value={b.description ?? ''} placeholder="How the benefit is generated" onChange={(x) => set(b, 'description', x)} /></td>
              <td className={clsx(gtd, 'min-w-[120px]')}><GridText value={b.owner} placeholder="Owner" onChange={(x) => set(b, 'owner', x)} /></td>
              <td className={gtd}><GridSelect value={b.startQuarter} options={BENEFIT_QUARTERS} onChange={(x) => set(b, 'startQuarter', x)} /></td>
              <td className={gtd}><GridMoney cr={b.targetCr} onChange={(x) => set(b, 'targetCr', x ?? 0)} className="ml-auto" /></td>
              <td className={gtd}><GridMoney cr={b.forecastCr} onChange={(x) => set(b, 'forecastCr', x ?? 0)} className="ml-auto" /></td>
              <td className={clsx(gtd, 'text-right text-[12px] px-2 text-ink-500 tabular-nums')}>{pct(b.forecastCr, b.targetCr)}%</td>
              <td className={clsx(gtd, 'min-w-[120px]')}><GridSelect value={b.status} options={BN_STATUSES} onChange={(x) => set(b, 'status', x)} /></td>
              <td className={gtd}><GridRemove label={b.area} onClick={() => remove(b.id)} /></td>
            </tr>
          ))}
          {items.length > 0 && <tr><td colSpan={4} className="text-right text-[12px] text-ink-500 px-2 py-2">Total</td><GridTotal cr={tT} /><GridTotal cr={tF} /><td className={clsx(gtotal, 'text-ink-500 font-normal text-[12px]')}>{pct(tF, tT)}%</td><td colSpan={2} /></tr>}
        </tbody>
      </Grid>
    </Card>
  )
}

/* ================= Scenarios ================= */
function ScenarioGrid({ fin }: { fin: Fin }) {
  const m = fin.m
  const { items, add, update, remove } = fin.scenarios
  const set = <K extends keyof FinanceScenario>(r: FinanceScenario, k: K, v: FinanceScenario[K]) => update({ ...r, [k]: v })
  return (
    <Card title={`Scenarios (${m.unitLabel})`} subtitle="Investment, annual benefits at run-rate, realization ramp and run-cost inflation per scenario. Payback, IRR and NPV are computed on the Output view." action={<AddButton onClick={() => add({ id: uid('sc'), name: 'New scenario', investmentCr: 4.0, annualBenefitsCr: 9.0, year1RealizationPct: 40, year2RealizationPct: 80, costInflationPct: 6, status: 'Option', description: '' })}>Add scenario</AddButton>}>
      <Grid minWidth={1000}>
        <GridHead cols={['Scenario', 'Status', 'Investment', 'Annual benefits', 'Year 1 realization %', 'Year 2 realization %', 'Run-cost inflation % p.a.', 'Assumptions', '']} right={[2, 3, 4, 5, 6]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={9} />}
          {items.map((s) => (
            <tr key={s.id} className="hover:bg-brand-50/40">
              <td className={clsx(gtd, 'min-w-[140px]')}><GridText bold value={s.name} onChange={(x) => set(s, 'name', x)} /></td>
              <td className={clsx(gtd, 'min-w-[130px]')}><GridSelect value={s.status} options={SC_STATUSES} onChange={(x) => set(s, 'status', x)} /></td>
              <td className={gtd}><GridMoney cr={s.investmentCr} onChange={(x) => set(s, 'investmentCr', x ?? 0)} className="ml-auto" /></td>
              <td className={gtd}><GridMoney cr={s.annualBenefitsCr} onChange={(x) => set(s, 'annualBenefitsCr', x ?? 0)} className="ml-auto" /></td>
              <td className={gtd}><GridNum value={s.year1RealizationPct} min={0} step={5} width={64} onChange={(x) => set(s, 'year1RealizationPct', x ?? 0)} className="ml-auto" /></td>
              <td className={gtd}><GridNum value={s.year2RealizationPct} min={0} step={5} width={64} onChange={(x) => set(s, 'year2RealizationPct', x ?? 0)} className="ml-auto" /></td>
              <td className={gtd}><GridNum value={s.costInflationPct} min={0} step={0.5} width={64} onChange={(x) => set(s, 'costInflationPct', x ?? 0)} className="ml-auto" /></td>
              <td className={clsx(gtd, 'min-w-[300px]')}><GridText value={s.description} placeholder="Key assumptions" onChange={(x) => set(s, 'description', x)} /></td>
              <td className={gtd}><GridRemove label={s.name} onClick={() => remove(s.id)} /></td>
            </tr>
          ))}
        </tbody>
      </Grid>
    </Card>
  )
}

/* ================= Settings & run-rate ================= */
function SettingsForm({ fin }: { fin: Fin }) {
  const s = fin.settings
  const [f, setF] = useState<FinanceSettings>(s)
  const [saved, setSaved] = useState(false)
  useEffect(() => { setF(s) }, [s])
  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(s), [f, s])
  const num = (k: 'headroomPctOfBudget' | 'discountRatePct' | 'contingencyPct') => ({ type: 'number' as const, step: 'any', value: f[k], onChange: (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: parseFloat(e.target.value) || 0 }) })
  return (
    <Card title="Financial settings" subtitle="Assumptions behind the KPI tiles and scenario valuation.">
      <FormGrid cols={4}>
        <Field label="Run-rate / benefits year"><Select options={RUN_YEARS} value={f.runRateYear} onChange={(e) => setF({ ...f, runRateYear: e.target.value })} /></Field>
        <Field label="Forecast headroom (% of budget)"><Input {...num('headroomPctOfBudget')} /></Field>
        <Field label="Discount rate (%) for scenario NPV"><Input {...num('discountRatePct')} /></Field>
        <Field label="Contingency (%)"><Input {...num('contingencyPct')} /></Field>
        <Field label="Variance commentary" className="col-span-4"><TextArea value={f.varianceCommentary} onChange={(e) => setF({ ...f, varianceCommentary: e.target.value })} /></Field>
      </FormGrid>
      <SaveBar dirty={dirty} saved={saved} onSave={() => { fin.settingsC.update(f); setSaved(true) }} onDiscard={() => setF(s)} />
    </Card>
  )
}

function RunRateGrid({ fin }: { fin: Fin }) {
  const m = fin.m
  const { items, add, update, remove } = fin.runRate
  const set = <K extends keyof RunRateYear>(r: RunRateYear, k: K, v: RunRateYear[K]) => update({ ...r, [k]: v })
  return (
    <Card title={`Annual run-rate projection (${m.unitLabel})`} subtitle="Operating cost and productivity savings per year; the net run-rate for the selected run-rate year drives the Projected Annual Run-rate tile." action={<AddButton onClick={() => add({ id: uid('rr'), year: `Year ${items.length + 1}`, operatingCostCr: 0, productivitySavingsCr: 0 })}>Add year</AddButton>}>
      <Grid minWidth={520}>
        <GridHead cols={['Year', 'Operating cost', 'Productivity savings', 'Net run-rate', '']} right={[1, 2, 3]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={5} />}
          {items.map((r) => (
            <tr key={r.id} className="hover:bg-brand-50/40">
              <td className={clsx(gtd, 'min-w-[140px]')}><GridText bold value={r.year} onChange={(x) => set(r, 'year', x)} /></td>
              <td className={gtd}><GridMoney cr={r.operatingCostCr} onChange={(x) => set(r, 'operatingCostCr', x ?? 0)} className="ml-auto" /></td>
              <td className={gtd}><GridMoney cr={r.productivitySavingsCr} onChange={(x) => set(r, 'productivitySavingsCr', x ?? 0)} className="ml-auto" /></td>
              <td className={clsx(gtd, 'text-right text-[12.5px] px-2 font-semibold tabular-nums')}>{mnum(m, r2(r.operatingCostCr + r.productivitySavingsCr))}</td>
              <td className={gtd}><GridRemove label={r.year} onClick={() => remove(r.id)} /></td>
            </tr>
          ))}
        </tbody>
      </Grid>
    </Card>
  )
}
