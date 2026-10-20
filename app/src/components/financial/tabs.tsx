import { useMemo, useState } from 'react'
import { BarChart, ComposedChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine } from 'recharts'
import { Plus, Check, X, Pencil, RotateCcw } from 'lucide-react'
import { Card, Badge, Legend, Ring, Progress, FilterSelect, Modal, Field, Input, Select, FormGrid, EmptyNote } from '../ui'
import { tooltipStyle } from '../charts'
import { uid } from '../../store/useStore'
import { fmtCr, fmtDate, SERIES } from '../../data/common'
import {
  COST_CATEGORIES, FIN_WORKSTREAMS, BENEFIT_QUARTERS, BENEFIT_RAMP, pct, r2, sum, fmtVar, irr, npv, scenarioFlows, paybackMonths,
  type BudgetLine, type MonthlyFinancial, type CostCategoryRow, type CostCategory, type Benefit, type FinanceScenario, type Commitment, type FinancialApproval, type ViewBy,
} from '../../data/financial'
import type { Fin } from './useFinance'
import { WrapTick, CumulativeChart } from './charts'
import { WsIcon, VariancePill, SpentBar, Tbl, num, TOTAL_ROW, StatBox } from './shared'
import { RecordModal, useEditor, type FieldSpec } from './RecordModal'
import { BUDGET_LINE_FIELDS, BENEFIT_FIELDS } from './fields'

const tick = { fontSize: 11, fill: '#6B7280' }
const barLabel = { fontSize: 11, fill: '#111827', fontWeight: 600 }
const crFmt = (v: unknown) => [`₹ ${typeof v === 'number' ? v.toFixed(2) : v} Cr`]

/* ================= Budget Breakdown ================= */
export function BudgetBreakdownTab({ fin, view }: { fin: Fin; view: ViewBy }) {
  const lineEd = useEditor<BudgetLine>()
  const [cell, setCell] = useState<{ line: BudgetLine; category: CostCategory; amount: number } | null>(null)
  const colTotals = fin.categoryBudget
  const unallocTotal = r2(sum(fin.allocation.map((a) => a.unallocated)))
  const scaled = view !== 'Total Program'
  const saveCell = () => {
    if (!cell) return
    const allocation = { ...cell.line.allocation, [cell.category]: r2(cell.amount) }
    fin.budgetLines.update({ ...cell.line, allocation, approvedCr: r2(sum(Object.values(allocation))) })
    setCell(null)
  }
  const split = fin.budgetLines.items.map((l) => ({ name: l.workstream, Setup: r2(l.approvedCr * l.setupShare), 'Ramp-up': r2(l.approvedCr * (1 - l.setupShare)) }))
  const setupTotal = r2(sum(split.map((s) => s.Setup))), rampTotal = r2(sum(split.map((s) => s['Ramp-up'])))

  return (
    <>
      <Card title="Budget by Workstream and Cost Category (₹ Cr)" subtitle={scaled ? `Showing the ${view} share of each allocation. Switch View by to Total Program to edit cells.` : 'Click a cell to edit the allocation. Approved budget = sum of allocated categories.'}
        action={<button className="btn-primary" onClick={() => lineEd.open({ id: uid('bl'), workstream: '', approvedCr: 0, actualCr: 0, forecastCr: 0, setupShare: 0.5, allocation: {}, owner: '' }, true)}><Plus size={14} /> Add budget line</button>}>
        <Tbl>
          <thead><tr>
            <th className="th px-2! text-[11.5px]!">Workstream</th>
            {COST_CATEGORIES.map((c) => <th key={c} className="th px-2! text-[11.5px]! text-right">{c}</th>)}
            <th className="th px-2! text-[11.5px]! text-right">Unallocated</th><th className="th px-2! text-[11.5px]! text-right">Approved Budget</th>
          </tr></thead>
          <tbody>
            {fin.allocation.map((a) => {
              const raw = fin.budgetLines.items.find((b) => b.id === a.id)!
              return (
                <tr key={a.id}>
                  <td className="td py-1.5! px-2! text-[12.5px]! whitespace-nowrap"><button className="flex items-center gap-2 hover:text-brand-600 cursor-pointer" onClick={() => lineEd.open(raw)}><WsIcon name={a.workstream} />{a.workstream} <Pencil size={11} className="text-ink-400" /></button></td>
                  {COST_CATEGORIES.map((c) => (
                    <td key={c} className="td py-1.5! text-right">
                      <button disabled={scaled} className={`rounded px-1.5 py-0.5 tabular-nums ${scaled ? '' : 'hover:bg-brand-50 cursor-pointer'} ${a.cells[c] ? 'text-ink-900' : 'text-ink-400'}`} onClick={() => setCell({ line: raw, category: c, amount: raw.allocation[c] ?? 0 })}>{a.cells[c] ? num(a.cells[c], 2) : '–'}</button>
                    </td>
                  ))}
                  <td className={`td py-1.5! text-right ${Math.abs(a.unallocated) > 0.004 ? 'text-amber-600 font-medium' : 'text-ink-400'}`}>{num(a.unallocated, 2)}</td>
                  <td className="td py-1.5! text-right font-semibold">{num(a.approvedCr, 2)}</td>
                                  </tr>
              )
            })}
            <tr className={TOTAL_ROW}>
              <td className="td py-1.5! rounded-l-md">Total</td>
              {COST_CATEGORIES.map((c) => <td key={c} className="td py-1.5! text-right">{num(colTotals[c] ?? 0, 2)}</td>)}
              <td className="td py-1.5! text-right">{num(unallocTotal, 2)}</td><td className="td py-1.5! text-right rounded-r-md">{num(fin.approved, 2)}</td>
            </tr>
          </tbody>
        </Tbl>
      </Card>

      <div className="grid grid-cols-[1.3fr_1fr] gap-4">
        <Card title="Approved Budget by Workstream and Category (₹ Cr)">
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={fin.allocation.map((a) => ({ name: a.workstream, ...a.cells }))} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={<WrapTick />} height={34} />
                <YAxis tickLine={false} axisLine={false} tick={tick} domain={[0, (max: number) => Math.ceil(max * 2) / 2]} tickFormatter={(v: number) => v.toFixed(1)} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={crFmt} />
                {COST_CATEGORIES.map((c, i) => <Bar isAnimationActive={false} key={c} dataKey={c} stackId="a" fill={SERIES[i]} radius={i === COST_CATEGORIES.length - 1 ? [3, 3, 0, 0] : undefined} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2"><Legend items={COST_CATEGORIES.map((c, i) => ({ label: c, color: SERIES[i] }))} /></div>
        </Card>
        <Card title="Setup (Capex) vs Ramp-up (Opex) (₹ Cr)" subtitle={`Setup ₹ ${num(setupTotal)} Cr · Ramp-up ₹ ${num(rampTotal)} Cr`}>
          <Legend items={[{ label: 'Setup (Capex)', color: '#1E5BBE' }, { label: 'Ramp-up (Opex)', color: '#5B9BF0' }]} />
          <div className="space-y-2.5 mt-3">
            {split.map((s) => {
              const tot = s.Setup + s['Ramp-up'] || 1
              return (
                <div key={s.name} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-[200px] truncate text-ink-700">{s.name}</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden flex">
                    <span style={{ width: `${(s.Setup / tot) * 100}%`, background: '#1E5BBE' }} /><span style={{ width: `${(s['Ramp-up'] / tot) * 100}%`, background: '#5B9BF0' }} />
                  </div>
                  <span className="w-20 text-right text-ink-900 tabular-nums">{num(s.Setup, 2)} / {num(s['Ramp-up'], 2)}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Modal open={!!cell} onClose={() => setCell(null)} title="Edit budget allocation" width="max-w-md" footer={<><button className="btn-secondary" onClick={() => setCell(null)}>Cancel</button><button className="btn-primary" onClick={saveCell}>Save</button></>}>
        {cell && (
          <FormGrid cols={1}>
            <Field label="Workstream"><Input value={cell.line.workstream} readOnly /></Field>
            <Field label="Cost category"><Select options={COST_CATEGORIES} value={cell.category} onChange={(e) => setCell({ ...cell, category: e.target.value as CostCategory, amount: cell.line.allocation[e.target.value as CostCategory] ?? 0 })} /></Field>
            <Field label="Approved amount (₹ Cr)"><Input type="number" step="0.05" value={cell.amount} onChange={(e) => setCell({ ...cell, amount: parseFloat(e.target.value) || 0 })} /></Field>
          </FormGrid>
        )}
      </Modal>
      <RecordModal<BudgetLine> title={lineEd.editing?.isNew ? 'Add budget line' : 'Edit budget line'} value={lineEd.editing?.value ?? null} isNew={lineEd.editing?.isNew} fields={BUDGET_LINE_FIELDS} onClose={lineEd.close}
        onSave={(v) => (lineEd.editing?.isNew ? fin.budgetLines.add(v) : fin.budgetLines.update(v))} onDelete={fin.budgetLines.remove} />
    </>
  )
}

/* ================= Actuals & Forecast ================= */
const MONTH_FIELDS: FieldSpec<MonthlyFinancial>[] = [
  { key: 'month', label: 'Month' },
  { key: 'budgetCr', label: 'Budget (₹ Cr)', type: 'number', step: 0.05 },
  { key: 'actualCr', label: 'Actual (₹ Cr)', type: 'number', step: 0.05 },
  { key: 'forecastCr', label: 'Forecast (₹ Cr)', type: 'number', step: 0.05 },
  { key: 'inflowCr', label: 'Inflow – Client (₹ Cr)', type: 'number', step: 0.05 },
  { key: 'outflowCr', label: 'Outflow – Spend (₹ Cr)', type: 'number', step: 0.05 },
]
export function ActualsForecastTab({ fin, onSettings }: { fin: Fin; onSettings: () => void }) {
  const ed = useEditor<MonthlyFinancial>()
  const tb = sum(fin.months.map((m) => m.budgetCr)), ta = sum(fin.months.map((m) => m.actualCr)), tf = sum(fin.months.map((m) => m.forecastCr))
  const bullets = useMemo(() => {
    const out: { text: string; tone: string }[] = []
    fin.lines.forEach((l) => {
      const v = r2(l.forecastCr - l.approvedCr)
      if (Math.abs(v) >= 0.05) out.push({ text: `${l.workstream}: forecast ${v > 0 ? 'over' : 'under'} approved budget by ₹ ${Math.abs(v).toFixed(1)} Cr (${pct(l.forecastCr, l.approvedCr)}% of budget).`, tone: v > 0 ? 'bg-red-500' : 'bg-green-500' })
    })
    const over = fin.cumulative.filter((m) => m.cumActual > m.cumBudget)
    if (over.length) out.push({ text: `Cumulative actual exceeded phased budget in ${over.map((m) => m.month).join(', ')}.`, tone: 'bg-amber-500' })
    else out.push({ text: 'Cumulative actual spend remains within the phased budget for every month.', tone: 'bg-green-500' })
    return out
  }, [fin.lines, fin.cumulative])

  return (
    <>
      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <Card title="Budget vs Actual vs Forecast (Cumulative) (₹ Cr)">
          <Legend items={[{ label: 'Monthly Actual', color: '#BFD7F7' }, { label: 'Cumulative Actual', color: '#1E5BBE' }, { label: 'Cumulative Forecast', color: '#16A34A' }, { label: 'Approved Budget', color: '#9CA3AF', dashed: true }]} />
          <div className="mt-2"><CumulativeChart rows={fin.cumulative} height={250} /></div>
        </Card>
        <Card title="Variance Commentary" action={<button className="link inline-flex items-center gap-1" onClick={onSettings}><Pencil size={12} /> Edit</button>}>
          <p className="text-[12.5px] text-ink-900 leading-relaxed">{fin.settings.varianceCommentary}</p>
          <div className="mt-3 space-y-2">
            {bullets.map((b) => <div key={b.text} className="flex gap-2 text-[12px] text-ink-700"><span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${b.tone}`} />{b.text}</div>)}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {[['Budget (phased)', tb, 'text-ink-900'], ['Actual', ta, 'text-red-600'], ['Forecast', tf, 'text-green-600']].map(([l, v, c]) => (
              <div key={l as string} className="rounded-lg bg-surface px-2 py-2"><div className="text-[11px] text-ink-500">{l as string}</div><div className={`text-[16px] font-bold ${c}`}>{fmtCr(v as number)}</div></div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Monthly Actuals and Forecast (₹ Cr)" subtitle="Click a month to edit its budget, actual, forecast and cash-flow values." action={<button className="btn-primary" onClick={() => ed.open({ id: uid('mf'), month: '', budgetCr: 0, actualCr: 0, forecastCr: 0, inflowCr: 0, outflowCr: 0 }, true)}><Plus size={14} /> Add month</button>}>
        <Tbl>
          <thead><tr><th className="th">Month</th><th className="th text-right">Budget</th><th className="th text-right">Actual</th><th className="th text-right">Forecast</th><th className="th text-center">Variance (Actual − Budget)</th><th className="th text-right">Cumulative Budget</th><th className="th text-right">Cumulative Actual</th><th className="th text-right">Cumulative Forecast</th><th className="th text-right">% of Budget (Cum.)</th></tr></thead>
          <tbody>
            {fin.cumulative.map((m) => (
              <tr key={m.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => ed.open(fin.monthly.items.find((x) => x.id === m.id)!)}>
                <td className="td py-1.5! font-medium">{m.month}</td><td className="td py-1.5! text-right">{num(m.budgetCr, 2)}</td><td className="td py-1.5! text-right">{num(m.actualCr, 2)}</td><td className="td py-1.5! text-right">{num(m.forecastCr, 2)}</td>
                <td className="td py-1.5! text-center"><VariancePill value={r2(m.actualCr - m.budgetCr)} digits={2} /></td>
                <td className="td py-1.5! text-right">{num(m.cumBudget, 2)}</td><td className="td py-1.5! text-right">{num(m.cumActual, 2)}</td><td className="td py-1.5! text-right">{num(m.cumForecast, 2)}</td>
                <td className="td py-1.5! text-right"><SpentBar pct={pct(m.cumActual, m.cumBudget)} width={60} /></td>
              </tr>
            ))}
            <tr className={TOTAL_ROW}><td className="td py-1.5! rounded-l-md">Total</td><td className="td py-1.5! text-right">{num(tb, 2)}</td><td className="td py-1.5! text-right">{num(ta, 2)}</td><td className="td py-1.5! text-right">{num(tf, 2)}</td><td className="td py-1.5! text-center"><VariancePill value={r2(ta - tb)} digits={2} /></td><td className="td py-1.5!" colSpan={3} /><td className="td py-1.5! text-right rounded-r-md">{pct(ta, tb)}%</td></tr>
          </tbody>
        </Tbl>
      </Card>
      <RecordModal<MonthlyFinancial> title={ed.editing?.isNew ? 'Add month' : `Edit ${ed.editing?.value.month}`} value={ed.editing?.value ?? null} isNew={ed.editing?.isNew} fields={MONTH_FIELDS} onClose={ed.close}
        onSave={(v) => (ed.editing?.isNew ? fin.monthly.add(v) : fin.monthly.update(v))} onDelete={fin.monthly.remove} />
    </>
  )
}

/* ================= Cost by Workstream ================= */
const COMMITMENT_FIELDS: FieldSpec<Commitment>[] = [
  { key: 'poNumber', label: 'PO number' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'description', label: 'Description', span: true },
  { key: 'workstream', label: 'Workstream', type: 'select', options: FIN_WORKSTREAMS },
  { key: 'category', label: 'Cost category', type: 'select', options: COST_CATEGORIES },
  { key: 'committedCr', label: 'Committed (₹ Cr)', type: 'number', step: 0.01 },
  { key: 'invoicedCr', label: 'Invoiced (₹ Cr)', type: 'number', step: 0.01 },
  { key: 'paidCr', label: 'Paid (₹ Cr)', type: 'number', step: 0.01 },
  { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Approved', 'In Progress', 'Closed'] },
  { key: 'date', label: 'PO date', type: 'date' },
]
const newCommitment = (): Commitment => ({ id: uid('cm'), poNumber: `PO-26-00${Math.floor(50 + Math.random() * 49)}`, vendor: '', description: '', workstream: FIN_WORKSTREAMS[0], category: COST_CATEGORIES[0], committedCr: 0, invoicedCr: 0, paidCr: 0, status: 'Open', date: '2026-10-20' })

export function CommitmentsTable({ rows, onRow, compact }: { rows: Commitment[]; onRow: (c: Commitment) => void; compact?: boolean }) {
  const tc = sum(rows.map((c) => c.committedCr)), ti = sum(rows.map((c) => c.invoicedCr)), tp = sum(rows.map((c) => c.paidCr))
  const th = 'th px-2! text-[11.5px]!', td = 'td py-1.5! px-2! text-[12px]!'
  const cols = compact ? 7 : 10
  return (
    <Tbl>
      <thead><tr><th className={th}>PO</th><th className={th}>Vendor</th><th className={th}>Description</th>{!compact && <th className={th}>Workstream</th>}{!compact && <th className={th}>Category</th>}<th className={`${th} text-right`}>Committed</th><th className={`${th} text-right`}>Invoiced</th><th className={`${th} text-right`}>Paid</th><th className={th}>Status</th>{!compact && <th className={th}>Date</th>}</tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td className="td text-center text-ink-500 py-5!" colSpan={cols}>No commitments for this selection.</td></tr>}
        {rows.map((c) => (
          <tr key={c.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => onRow(c)}>
            <td className={`${td} font-medium whitespace-nowrap`}>{c.poNumber}</td><td className={`${td} whitespace-nowrap`}>{c.vendor}</td><td className={`${td} truncate ${compact ? 'max-w-[170px]' : 'max-w-[240px]'}`} title={c.description}>{c.description}</td>
            {!compact && <td className={`${td} whitespace-nowrap`}>{c.workstream}</td>}{!compact && <td className={`${td} whitespace-nowrap`}>{c.category}</td>}
            <td className={`${td} text-right`}>{num(c.committedCr, 2)}</td><td className={`${td} text-right`}>{num(c.invoicedCr, 2)}</td><td className={`${td} text-right`}>{num(c.paidCr, 2)}</td><td className={td}><Badge value={c.status} /></td>{!compact && <td className={`${td} whitespace-nowrap`}>{fmtDate(c.date)}</td>}
          </tr>
        ))}
        {rows.length > 0 && <tr className={TOTAL_ROW}><td className={`${td} rounded-l-md`} colSpan={compact ? 3 : 5}>Total ({rows.length} POs)</td><td className={`${td} text-right`}>{num(tc, 2)}</td><td className={`${td} text-right`}>{num(ti, 2)}</td><td className={`${td} text-right`}>{num(tp, 2)}</td><td className={`${td} rounded-r-md`} colSpan={compact ? 1 : 2} /></tr>}
      </tbody>
    </Tbl>
  )
}

export function CostByWorkstreamTab({ fin }: { fin: Fin }) {
  const [sel, setSel] = useState<string>('All')
  const lineEd = useEditor<BudgetLine>()
  const cmEd = useEditor<Commitment>()
  const rows = fin.commitments.items.filter((c) => sel === 'All' || c.workstream === sel)
  const chart = fin.lines.map((l) => ({ name: l.workstream, 'Approved Budget': l.approvedCr, 'Actual Spend': l.actualCr, 'Forecast at Completion': l.forecastCr }))
  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        {fin.lines.map((l) => {
          const v = r2(l.forecastCr - l.approvedCr), active = sel === l.workstream
          return (
            <button key={l.id} onClick={() => setSel(active ? 'All' : l.workstream)} className={`card p-3.5 text-left cursor-pointer transition-colors ${active ? 'ring-2 ring-brand-500' : 'hover:border-brand-300'}`}>
              <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-[13px] font-semibold text-ink-900 truncate"><WsIcon name={l.workstream} />{l.workstream}</span><VariancePill value={v} /></div>
              <div className="grid grid-cols-3 gap-1 mt-2.5 text-center">
                {[['Budget', l.approvedCr], ['Actual', l.actualCr], ['Forecast', l.forecastCr]].map(([k, val]) => <div key={k as string}><div className="text-[10.5px] text-ink-500">{k as string}</div><div className="text-[14px] font-bold text-ink-900">{num(val as number)}</div></div>)}
              </div>
              <div className="flex items-center gap-2 mt-2.5"><Progress value={pct(l.actualCr, l.approvedCr)} className="flex-1" /><span className="text-[11px] text-ink-500 w-16 text-right">{pct(l.actualCr, l.approvedCr)}% spent</span></div>
            </button>
          )
        })}
        <button className="card p-3.5 border-dashed text-ink-500 hover:text-brand-600 hover:border-brand-300 cursor-pointer flex items-center justify-center gap-1.5 text-[13px]" onClick={() => lineEd.open({ id: uid('bl'), workstream: '', approvedCr: 0, actualCr: 0, forecastCr: 0, setupShare: 0.5, allocation: {}, owner: '' }, true)}><Plus size={15} /> Add workstream budget</button>
      </div>
      <div className="grid grid-cols-[0.9fr_1.5fr] gap-4">
        <Card title="Budget, Actual and Forecast by Workstream (₹ Cr)">
          <Legend items={[{ label: 'Approved Budget', color: '#BFD7F7' }, { label: 'Actual Spend', color: '#1E5BBE' }, { label: 'Forecast at Completion', color: '#5B9BF0' }]} />
          <div className="h-[300px] mt-2">
            <ResponsiveContainer>
              <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }} barCategoryGap="25%" barGap={1}>
                <CartesianGrid horizontal={false} stroke="#EEF2F7" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={tick} />
                <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#374151' }} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={crFmt} />
                <Bar isAnimationActive={false} dataKey="Approved Budget" fill="#BFD7F7" radius={[0, 3, 3, 0]}><LabelList dataKey="Approved Budget" position="right" formatter={(v: unknown) => num(Number(v))} style={{ fontSize: 10, fill: '#6B7280' }} /></Bar>
                <Bar isAnimationActive={false} dataKey="Actual Spend" fill="#1E5BBE" radius={[0, 3, 3, 0]} />
                <Bar isAnimationActive={false} dataKey="Forecast at Completion" fill="#5B9BF0" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title={`Commitments – ${sel === 'All' ? 'All workstreams' : sel}`} subtitle="Click a workstream card to drill into its purchase orders." action={<div className="flex items-center gap-2"><FilterSelect label="Workstream" value={sel} options={['All', ...FIN_WORKSTREAMS]} onChange={setSel} /><button className="btn-primary" onClick={() => cmEd.open({ ...newCommitment(), workstream: sel === 'All' ? FIN_WORKSTREAMS[0] : sel }, true)}><Plus size={14} /> Add</button></div>}>
          <CommitmentsTable rows={rows} compact onRow={(c) => cmEd.open(c)} />
        </Card>
      </div>
      <RecordModal<BudgetLine> title={lineEd.editing?.isNew ? 'Add budget line' : 'Edit budget line'} value={lineEd.editing?.value ?? null} isNew={lineEd.editing?.isNew} fields={BUDGET_LINE_FIELDS} onClose={lineEd.close}
        onSave={(v) => (lineEd.editing?.isNew ? fin.budgetLines.add(v) : fin.budgetLines.update(v))} onDelete={fin.budgetLines.remove} />
      <RecordModal<Commitment> title={cmEd.editing?.isNew ? 'Add commitment / PO' : 'Edit commitment / PO'} value={cmEd.editing?.value ?? null} isNew={cmEd.editing?.isNew} fields={COMMITMENT_FIELDS} onClose={cmEd.close}
        onSave={(v) => (cmEd.editing?.isNew ? fin.commitments.add(v) : fin.commitments.update(v))} onDelete={fin.commitments.remove} />
    </>
  )
}

/* ================= Cost by Category ================= */
const CATEGORY_FIELDS: FieldSpec<CostCategoryRow>[] = [
  { key: 'name', label: 'Cost category', span: true },
  { key: 'actualCr', label: 'Actual (₹ Cr)', type: 'number', step: 0.05 },
  { key: 'forecastCr', label: 'Forecast (₹ Cr)', type: 'number', step: 0.05 },
  { key: 'description', label: 'Description', type: 'textarea' },
]
export function CostByCategoryTab({ fin }: { fin: Fin }) {
  const ed = useEditor<CostCategoryRow>()
  const rows = fin.categoryRows
  const tb = sum(rows.map((c) => c.budgetCr)), ta = sum(rows.map((c) => c.actualCr)), tf = sum(rows.map((c) => c.forecastCr))
  return (
    <>
      <div className="grid grid-cols-[1.35fr_1fr] gap-4">
        <Card title="Cost by Category (₹ Cr)" subtitle="Budget is derived from the workstream × category allocation on the Budget Breakdown tab." action={<button className="btn-primary" onClick={() => ed.open({ id: uid('cc'), name: '', actualCr: 0, forecastCr: 0, description: '' }, true)}><Plus size={14} /> Add category</button>}>
          <Tbl>
            <thead><tr><th className="th">Category</th><th className="th text-right">Budget</th><th className="th text-right">Actual</th><th className="th text-right">Forecast</th><th className="th text-center">Variance</th><th className="th">% Spent</th><th className="th text-right">% of Forecast</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => ed.open(fin.categories.items.find((x) => x.id === c.id)!)}>
                  <td className="td py-1.5!"><div className="font-medium">{c.name}</div>{c.description && <div className="text-[11px] text-ink-500">{c.description}</div>}</td>
                  <td className="td py-1.5! text-right">{num(c.budgetCr, 2)}</td><td className="td py-1.5! text-right">{num(c.actualCr)}</td><td className="td py-1.5! text-right">{num(c.forecastCr)}</td>
                  <td className="td py-1.5! text-center"><VariancePill value={r2(c.forecastCr - c.budgetCr)} /></td>
                  <td className="td py-1.5!"><SpentBar pct={pct(c.actualCr, c.budgetCr)} width={60} /></td>
                  <td className="td py-1.5! text-right">{pct(c.forecastCr, tf)}%</td>
                </tr>
              ))}
              <tr className={TOTAL_ROW}><td className="td py-1.5! rounded-l-md">Total</td><td className="td py-1.5! text-right">{num(tb, 2)}</td><td className="td py-1.5! text-right">{num(ta)}</td><td className="td py-1.5! text-right">{num(tf)}</td><td className="td py-1.5! text-center"><VariancePill value={r2(tf - tb)} /></td><td className="td py-1.5!">{pct(ta, tb)}%</td><td className="td py-1.5! text-right rounded-r-md">100%</td></tr>
            </tbody>
          </Tbl>
        </Card>
        <Card title="Budget vs Actual vs Forecast by Category (₹ Cr)">
          <Legend items={[{ label: 'Budget', color: '#BFD7F7' }, { label: 'Actual', color: '#1E5BBE' }, { label: 'Forecast', color: '#5B9BF0' }]} />
          <div className="h-[330px] mt-2">
            <ResponsiveContainer>
              <BarChart data={rows.map((c) => ({ name: c.name, Budget: c.budgetCr, Actual: c.actualCr, Forecast: c.forecastCr }))} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 0 }} barCategoryGap="22%" barGap={1}>
                <CartesianGrid horizontal={false} stroke="#EEF2F7" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={tick} domain={[0, (max: number) => Math.ceil(max * 2) / 2]} tickFormatter={(v: number) => v.toFixed(1)} />
                <YAxis type="category" dataKey="name" width={140} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#374151' }} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={crFmt} />
                <Bar isAnimationActive={false} dataKey="Budget" fill="#BFD7F7" radius={[0, 3, 3, 0]} />
                <Bar isAnimationActive={false} dataKey="Actual" fill="#1E5BBE" radius={[0, 3, 3, 0]} />
                <Bar isAnimationActive={false} dataKey="Forecast" fill="#5B9BF0" radius={[0, 3, 3, 0]}><LabelList dataKey="Forecast" position="right" formatter={(v: unknown) => num(Number(v))} style={{ fontSize: 10.5, fill: '#374151', fontWeight: 600 }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <RecordModal<CostCategoryRow> title={ed.editing?.isNew ? 'Add cost category' : 'Edit cost category'} value={ed.editing?.value ?? null} isNew={ed.editing?.isNew} fields={CATEGORY_FIELDS} onClose={ed.close}
        onSave={(v) => (ed.editing?.isNew ? fin.categories.add(v) : fin.categories.update(v))} onDelete={fin.categories.remove} />
    </>
  )
}

/* ================= Benefits Tracking ================= */
export function BenefitsTab({ fin }: { fin: Fin }) {
  const ed = useEditor<Benefit>()
  const rows = fin.benefits.items
  const byQuarter = useMemo(() => BENEFIT_QUARTERS.map((q, qi) => {
    const rec: Record<string, number | string> = { quarter: q }
    let target = 0
    rows.forEach((b) => {
      const start = Math.max(0, BENEFIT_QUARTERS.indexOf(b.startQuarter))
      const k = qi - start
      const ramp = k < 0 ? 0 : BENEFIT_RAMP[Math.min(k, BENEFIT_RAMP.length - 1)]
      rec[b.area] = r2(b.forecastCr * ramp)
      target += b.targetCr * ramp
    })
    rec.Target = r2(target)
    return rec
  }), [rows])
  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <StatBox label="Target Benefits (Annual)" value={fmtCr(fin.benefitTarget)} sub={`${rows.length} benefit areas`} />
        <StatBox label="Projected Benefits (Annual)" value={fmtCr(fin.benefitForecast)} tone="text-green-600" sub={`${fin.settings.runRateYear} run-rate`} />
        <StatBox label="Benefit Gap" value={fmtCr(r2(fin.benefitTarget - fin.benefitForecast))} tone="text-red-600" sub="to reach business-case target" />
        <div className="card px-4 py-3 flex items-center gap-3"><Ring value={fin.benefitPct} size={52} stroke={6} color="#16A34A" /><div><div className="text-[12px] text-ink-500">% of Target</div><div className="text-[20px] font-bold text-ink-900">{fin.benefitPct}%</div></div></div>
      </div>
      <div className="grid grid-cols-[1.3fr_1fr] gap-4">
        <Card title="Benefit Register" action={<button className="btn-primary" onClick={() => ed.open({ id: uid('bn'), area: '', targetCr: 0, forecastCr: 0, status: 'On Track', owner: '', startQuarter: 'Q1 FY27', description: '' }, true)}><Plus size={14} /> Add benefit</button>}>
          <Tbl>
            <thead><tr><th className="th px-2!">Benefit Area</th><th className="th px-2!">Owner</th><th className="th px-2!">Starts</th><th className="th px-2! text-right">Target<br />(₹ Cr)</th><th className="th px-2! text-right">Forecast<br />(₹ Cr)</th><th className="th px-2!">% of Target</th><th className="th px-2!">Status</th></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => ed.open(b)}>
                  <td className="td py-1.5! px-2! text-[12px]!"><div className="font-medium">{b.area}</div>{b.description && <div className="text-[11px] text-ink-500">{b.description}</div>}</td><td className="td py-1.5! px-2! text-[12px]! whitespace-nowrap">{b.owner}</td><td className="td py-1.5! px-2! text-[12px]! whitespace-nowrap">{b.startQuarter}</td>
                  <td className="td py-1.5! px-2! text-[12px]! text-right">{num(b.targetCr)}</td><td className="td py-1.5! px-2! text-[12px]! text-right">{num(b.forecastCr)}</td><td className="td py-1.5! px-2! text-[12px]!"><SpentBar pct={pct(b.forecastCr, b.targetCr)} width={60} /></td><td className="td py-1.5! px-2! text-[12px]!"><Badge value={b.status} /></td>
                </tr>
              ))}
              <tr className={TOTAL_ROW}><td className="td py-1.5! px-2! text-[12px]! rounded-l-md" colSpan={3}>Total</td><td className="td py-1.5! px-2! text-[12px]! text-right">{num(fin.benefitTarget)}</td><td className="td py-1.5! px-2! text-[12px]! text-right">{num(fin.benefitForecast)}</td><td className="td py-1.5! px-2! text-[12px]!">{fin.benefitPct}%</td><td className="td py-1.5! px-2! text-[12px]! rounded-r-md" /></tr>
            </tbody>
          </Tbl>
        </Card>
        <Card title="Benefit Realization by Quarter (₹ Cr, annualised run-rate)">
          <Legend items={[...rows.map((b, i) => ({ label: b.area, color: SERIES[i % SERIES.length] })), { label: 'Target', color: '#0B2240' }]} />
          <div className="h-[300px] mt-2">
            <ResponsiveContainer>
              <ComposedChart data={byQuarter} margin={{ top: 12, right: 8, left: -24, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="quarter" tickLine={false} axisLine={false} tick={tick} />
                <YAxis tickLine={false} axisLine={false} tick={tick} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={crFmt} />
                {rows.map((b, i) => <Bar isAnimationActive={false} key={b.id} dataKey={b.area} stackId="b" fill={SERIES[i % SERIES.length]} radius={i === rows.length - 1 ? [3, 3, 0, 0] : undefined} />)}
                <Line isAnimationActive={false} type="monotone" dataKey="Target" stroke="#0B2240" strokeWidth={2} dot={{ r: 3, fill: '#0B2240' }}><LabelList dataKey="Target" position="top" formatter={(v: unknown) => num(Number(v))} style={barLabel} /></Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <RecordModal<Benefit> title={ed.editing?.isNew ? 'Add benefit' : 'Edit benefit'} value={ed.editing?.value ?? null} isNew={ed.editing?.isNew} fields={BENEFIT_FIELDS} onClose={ed.close}
        onSave={(v) => (ed.editing?.isNew ? fin.benefits.add(v) : fin.benefits.update(v))} onDelete={fin.benefits.remove} />
    </>
  )
}

/* ================= Scenario Analysis ================= */
const SCENARIO_FIELDS: FieldSpec<FinanceScenario>[] = [
  { key: 'name', label: 'Scenario' },
  { key: 'status', label: 'Status', type: 'select', options: ['Recommended', 'Option', 'Not Preferred'] },
  { key: 'investmentCr', label: 'Investment (₹ Cr)', type: 'number', step: 0.1 },
  { key: 'annualBenefitsCr', label: 'Annual benefits at run-rate (₹ Cr)', type: 'number', step: 0.1 },
  { key: 'year1RealizationPct', label: 'Year 1 realization (%)', type: 'number', step: 5 },
  { key: 'year2RealizationPct', label: 'Year 2 realization (%)', type: 'number', step: 5 },
  { key: 'costInflationPct', label: 'Run-cost inflation (% p.a.)', type: 'number', step: 0.5 },
  { key: 'description', label: 'Assumptions', type: 'textarea' },
]
const SC_COLORS = ['#1E5BBE', '#16A34A', '#F59E0B', '#8B5CF6', '#14B8A6']
export function ScenarioTab({ fin, onSettings }: { fin: Fin; onSettings: () => void }) {
  const ed = useEditor<FinanceScenario>()
  const rate = fin.settings.discountRatePct
  const calc = fin.scenarios.items.map((s) => {
    const flows = scenarioFlows(s)
    const i = irr(flows)
    return { ...s, flows, irrPct: isNaN(i) ? null : Math.round(i * 100), npvCr: r2(npv(flows, rate)), payback: paybackMonths(flows), roi5: Math.round((sum(flows.slice(1)) / s.investmentCr) * 100) }
  })
  const chart = Array.from({ length: 6 }, (_, y) => {
    const rec: Record<string, number | string> = { year: y === 0 ? 'Year 0' : `Year ${y}` }
    calc.forEach((s) => { rec[s.name] = r2(sum(s.flows.slice(0, y + 1))) })
    return rec
  })
  return (
    <>
      <Card title="Scenario Comparison" subtitle={`Payback, IRR and NPV are computed from each scenario's assumptions over a 5-year horizon · NPV discounted at ${rate}%.`}
        action={<div className="flex items-center gap-2"><button className="btn-secondary" onClick={onSettings}>Discount rate: {rate}%</button><button className="btn-primary" onClick={() => ed.open({ id: uid('sc'), name: '', investmentCr: 4.0, annualBenefitsCr: 9.0, year1RealizationPct: 40, year2RealizationPct: 80, costInflationPct: 6, status: 'Option', description: '' }, true)}><Plus size={14} /> Add scenario</button></div>}>
        <Tbl>
          <thead><tr><th className="th">Scenario</th><th className="th">Assumptions</th><th className="th text-right">Investment (₹ Cr)</th><th className="th text-right">Annual Benefits (₹ Cr)</th><th className="th text-right">Year 1 / Year 2 realization</th><th className="th text-right">Payback (months)</th><th className="th text-right">IRR (%)</th><th className="th text-right">NPV (₹ Cr)</th><th className="th text-right">5-yr ROI</th><th className="th">Status</th></tr></thead>
          <tbody>
            {calc.map((s, i) => (
              <tr key={s.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => ed.open(fin.scenarios.items[i])}>
                <td className="td py-1.5!"><span className="flex items-center gap-2 font-medium"><span className="w-2.5 h-2.5 rounded-full" style={{ background: SC_COLORS[i % SC_COLORS.length] }} />{s.name}</span></td>
                <td className="td py-1.5! text-[12px]! text-ink-500 max-w-[280px]">{s.description}</td>
                <td className="td py-1.5! text-right">{num(s.investmentCr)}</td><td className="td py-1.5! text-right">{num(s.annualBenefitsCr)}</td><td className="td py-1.5! text-right">{s.year1RealizationPct}% / {s.year2RealizationPct}%</td>
                <td className="td py-1.5! text-right font-medium">{isNaN(s.payback) ? '> 60' : s.payback}</td><td className="td py-1.5! text-right font-medium">{s.irrPct == null ? '–' : `${s.irrPct}%`}</td><td className="td py-1.5! text-right font-medium">{num(s.npvCr)}</td><td className="td py-1.5! text-right">{s.roi5}%</td>
                <td className="td py-1.5!"><Badge value={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </Tbl>
      </Card>
      <div className="grid grid-cols-[1.3fr_1fr] gap-4">
        <Card title="Cumulative Net Cash Flow by Scenario (₹ Cr)" subtitle="Break-even is where a line crosses zero.">
          <Legend items={calc.map((s, i) => ({ label: s.name, color: SC_COLORS[i % SC_COLORS.length] }))} />
          <div className="h-[280px] mt-2">
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ top: 12, right: 36, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={tick} />
                <YAxis tickLine={false} axisLine={false} tick={tick} />
                <Tooltip {...tooltipStyle} formatter={crFmt} />
                <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="4 3" />
                {calc.map((s, i) => <Line isAnimationActive={false} key={s.id} type="monotone" dataKey={s.name} stroke={SC_COLORS[i % SC_COLORS.length]} strokeWidth={2} dot={{ r: 3, fill: SC_COLORS[i % SC_COLORS.length], strokeWidth: 0 }}><LabelList dataKey={s.name} content={(p: { x?: number | string; y?: number | string; index?: number; value?: unknown }) => (p.index === 5 && typeof p.x === 'number' && typeof p.y === 'number' ? <text x={p.x + 8} y={p.y + 4} fontSize={11} fontWeight={600} fill="#111827">{num(Number(p.value))}</text> : null)} /></Line>)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Yearly Net Cash Flow (₹ Cr)">
          <Tbl>
            <thead><tr><th className="th">Year</th>{calc.map((s) => <th key={s.id} className="th text-right">{s.name}</th>)}</tr></thead>
            <tbody>
              {Array.from({ length: 6 }, (_, y) => (
                <tr key={y}><td className="td py-1.5! font-medium">{y === 0 ? 'Year 0 (investment)' : `Year ${y}`}</td>{calc.map((s) => <td key={s.id} className={`td py-1.5! text-right ${s.flows[y] < 0 ? 'text-red-600' : ''}`}>{fmtVar(s.flows[y])}</td>)}</tr>
              ))}
              <tr className={TOTAL_ROW}><td className="td py-1.5! rounded-l-md">5-year net</td>{calc.map((s) => <td key={s.id} className="td py-1.5! text-right">{num(sum(s.flows))}</td>)}</tr>
            </tbody>
          </Tbl>
          <p className="text-[11.5px] text-ink-500 mt-3">Run costs are modelled at 35% of investment per year, inflated at each scenario's rate; benefits ramp per the Year 1 / Year 2 realization assumptions and reach full run-rate from Year 3.</p>
        </Card>
      </div>
      <RecordModal<FinanceScenario> title={ed.editing?.isNew ? 'Add scenario' : `Edit scenario – ${ed.editing?.value.name}`} value={ed.editing?.value ?? null} isNew={ed.editing?.isNew} fields={SCENARIO_FIELDS} onClose={ed.close}
        onSave={(v) => (ed.editing?.isNew ? fin.scenarios.add(v) : fin.scenarios.update(v))} onDelete={fin.scenarios.remove} />
    </>
  )
}

/* ================= Approvals & Commitments ================= */
const APPROVAL_FIELDS: FieldSpec<FinancialApproval>[] = [
  { key: 'item', label: 'Item', span: true },
  { key: 'amountCr', label: 'Amount (₹ Cr)', type: 'number', step: 0.01 },
  { key: 'workstream', label: 'Workstream', type: 'select', options: FIN_WORKSTREAMS },
  { key: 'requester', label: 'Requester' },
  { key: 'approver', label: 'Approver' },
  { key: 'date', label: 'Requested on', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
  { key: 'notes', label: 'Notes / justification', type: 'textarea' },
]
export function ApprovalsTab({ fin }: { fin: Fin }) {
  const apEd = useEditor<FinancialApproval>()
  const cmEd = useEditor<Commitment>()
  const [filter, setFilter] = useState('All')
  const [cmFilter, setCmFilter] = useState('All')
  const approvals = [...fin.approvals.items].sort((a, b) => (a.status === 'Pending' ? -1 : 1) - (b.status === 'Pending' ? -1 : 1) || b.date.localeCompare(a.date)).filter((a) => filter === 'All' || a.status === filter)
  const pending = fin.approvals.items.filter((a) => a.status === 'Pending')
  const approved = fin.approvals.items.filter((a) => a.status === 'Approved')
  const setStatus = (a: FinancialApproval, status: FinancialApproval['status']) => fin.approvals.update({ ...a, status })
  const cms = fin.commitments.items.filter((c) => cmFilter === 'All' || c.status === cmFilter)
  const byWs = FIN_WORKSTREAMS.map((w) => { const r = fin.commitments.items.filter((c) => c.workstream === w); return { name: w, Committed: r2(sum(r.map((c) => c.committedCr))), Invoiced: r2(sum(r.map((c) => c.invoicedCr))), Paid: r2(sum(r.map((c) => c.paidCr))) } }).filter((r) => r.Committed > 0)

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <StatBox label="Pending Approvals" value={pending.length} tone="text-amber-600" sub={`${fmtCr(sum(pending.map((a) => a.amountCr)), 2)} awaiting decision`} />
        <StatBox label="Approved (to date)" value={fmtCr(sum(approved.map((a) => a.amountCr)), 2)} tone="text-green-600" sub={`${approved.length} requests approved`} />
        <StatBox label="Total Committed" value={fmtCr(fin.committed, 2)} sub={`${fin.commitments.items.length} purchase orders`} />
        <StatBox label="Invoiced" value={fmtCr(fin.invoiced, 2)} tone="text-brand-600" sub={<span className="flex items-center gap-2"><Progress value={pct(fin.invoiced, fin.committed)} className="flex-1" color="#5B9BF0" />{pct(fin.invoiced, fin.committed)}% of committed</span>} />
        <StatBox label="Paid" value={fmtCr(fin.paid, 2)} tone="text-green-600" sub={<span className="flex items-center gap-2"><Progress value={pct(fin.paid, fin.committed)} className="flex-1" color="#16A34A" />{pct(fin.paid, fin.committed)}% of committed</span>} />
      </div>

              <Card title="Approval Queue" subtitle="Approve or reject budget requests; decisions update the status immediately." action={<div className="flex items-center gap-2"><FilterSelect label="Status" value={filter} options={['All', 'Pending', 'Approved', 'Rejected']} onChange={setFilter} /><button className="btn-primary" onClick={() => apEd.open({ id: uid('ap'), item: '', amountCr: 0, requester: '', approver: 'Global CFO', workstream: FIN_WORKSTREAMS[0], status: 'Pending', date: '2026-10-20', notes: '' }, true)}><Plus size={14} /> New request</button></div>}>
          {approvals.length === 0 && <EmptyNote>No approval requests match this filter.</EmptyNote>}
          {approvals.length > 0 && (
            <Tbl>
              <thead><tr><th className="th px-2!">Item</th><th className="th px-2!">Workstream</th><th className="th px-2! text-right">Amount (₹ Cr)</th><th className="th px-2!">Requester</th><th className="th px-2!">Approver</th><th className="th px-2!">Date</th><th className="th px-2!">Status</th><th className="th px-2!">Actions</th></tr></thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => apEd.open(a)}>
                    <td className="td py-1.5! px-2! text-[12.5px]!"><div className="font-medium">{a.item}</div>{a.notes && <div className="text-[11px] text-ink-500">{a.notes}</div>}</td><td className="td py-1.5! px-2! text-[12.5px]! whitespace-nowrap">{a.workstream}</td><td className="td py-1.5! px-2! text-[12.5px]! text-right">{num(a.amountCr, 2)}</td><td className="td py-1.5! px-2! text-[12.5px]! whitespace-nowrap">{a.requester}</td><td className="td py-1.5! px-2! text-[12.5px]! whitespace-nowrap">{a.approver}</td><td className="td py-1.5! px-2! text-[12.5px]! whitespace-nowrap">{fmtDate(a.date)}</td>
                    <td className="td py-1.5! px-2! text-[12.5px]!"><Badge value={a.status} /></td>
                    <td className="td py-1.5! px-2! text-[12.5px]!" onClick={(e) => e.stopPropagation()}>
                      {a.status === 'Pending' ? (
                        <span className="flex items-center gap-1">
                          <button className="inline-flex items-center gap-1 rounded-md bg-green-50 text-green-700 px-2 py-1 text-[11.5px] font-medium hover:bg-green-100 cursor-pointer" onClick={() => setStatus(a, 'Approved')}><Check size={12} /> Approve</button>
                          <button className="inline-flex items-center gap-1 rounded-md bg-red-50 text-red-600 px-2 py-1 text-[11.5px] font-medium hover:bg-red-100 cursor-pointer" onClick={() => setStatus(a, 'Rejected')}><X size={12} /> Reject</button>
                        </span>
                      ) : (
                        <button className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-600 px-2 py-1 text-[11.5px] font-medium hover:bg-slate-200 cursor-pointer" onClick={() => setStatus(a, 'Pending')}><RotateCcw size={12} /> Reopen</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tbl>
          )}
        </Card>
      <Card title="Committed vs Invoiced vs Paid by Workstream (₹ Cr)">
        <Legend items={[{ label: 'Committed', color: '#BFD7F7' }, { label: 'Invoiced', color: '#5B9BF0' }, { label: 'Paid', color: '#1E5BBE' }]} />
        <div className="h-[220px] mt-2">
          <ResponsiveContainer>
            <BarChart data={byWs} margin={{ top: 16, right: 8, left: -24, bottom: 0 }} barCategoryGap="30%" barGap={2}>
              <CartesianGrid vertical={false} stroke="#EEF2F7" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={<WrapTick />} height={34} />
              <YAxis tickLine={false} axisLine={false} tick={tick} tickFormatter={(v: number) => v.toFixed(2)} />
              <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={crFmt} />
              <Bar isAnimationActive={false} dataKey="Committed" fill="#BFD7F7" radius={[3, 3, 0, 0]}><LabelList dataKey="Committed" position="top" formatter={(v: unknown) => num(Number(v), 2)} style={{ fontSize: 10, fill: '#6B7280' }} /></Bar>
              <Bar isAnimationActive={false} dataKey="Invoiced" fill="#5B9BF0" radius={[3, 3, 0, 0]} />
              <Bar isAnimationActive={false} dataKey="Paid" fill="#1E5BBE" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Commitments and Purchase Orders (₹ Cr)" subtitle="Register of vendor commitments with invoiced and paid amounts. Click a row to edit." action={<div className="flex items-center gap-2"><FilterSelect label="Status" value={cmFilter} options={['All', 'Open', 'Approved', 'In Progress', 'Closed']} onChange={setCmFilter} /><button className="btn-primary" onClick={() => cmEd.open(newCommitment(), true)}><Plus size={14} /> Add commitment</button></div>}>
        <CommitmentsTable rows={cms} onRow={(c) => cmEd.open(c)} />
      </Card>

      <RecordModal<FinancialApproval> title={apEd.editing?.isNew ? 'New approval request' : 'Edit approval request'} value={apEd.editing?.value ?? null} isNew={apEd.editing?.isNew} fields={APPROVAL_FIELDS} onClose={apEd.close}
        onSave={(v) => (apEd.editing?.isNew ? fin.approvals.add(v) : fin.approvals.update(v))} onDelete={fin.approvals.remove} />
      <RecordModal<Commitment> title={cmEd.editing?.isNew ? 'Add commitment / PO' : 'Edit commitment / PO'} value={cmEd.editing?.value ?? null} isNew={cmEd.editing?.isNew} fields={COMMITMENT_FIELDS} onClose={cmEd.close}
        onSave={(v) => (cmEd.editing?.isNew ? fin.commitments.add(v) : fin.commitments.update(v))} onDelete={fin.commitments.remove} />
    </>
  )
}
