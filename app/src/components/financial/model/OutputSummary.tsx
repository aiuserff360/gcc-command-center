/**
 * Cost Model → Summary and Model checks sub-tabs (program or one business unit).
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import clsx from 'clsx'
import { TrendingDown, TrendingUp, Layers, Package, CalendarRange, ShieldCheck } from 'lucide-react'
import { Card, Legend, ViewAll } from '../../ui'
import { Donut, tooltipStyle } from '../../charts'
import { CATEGORIES, CATEGORY_COLORS, type EntityResult, type ModelResult } from '../../../data/costModel'
import type { Money } from '../../../data/money'
import type { CostModel } from './useCostModel'
import { Stat, CheckBadge, checkSummary, fmtDetail, gth, gtd, hc, lakhFmt, lakhNum, tick } from './shared'

export const money = (m: Money, cr: number) => m.num(cr, m.digits)
export const fmtAxis = (m: Money) => (v: unknown) => (typeof v === 'number' ? v.toFixed(m.currency === 'INR' ? 0 : 1) : String(v ?? ''))
export const fmtTip = (m: Money) => (v: unknown) => [typeof v === 'number' ? `${m.symbol} ${v.toFixed(m.digits)} ${m.unit}` : String(v ?? '')]

/** Stacked annual cost by category, in display units. */
export function CategoryStack({ e, m, height = 250 }: { e: EntityResult; m: Money; height?: number }) {
  const data = e.years.map((y) => { const row: Record<string, number | string> = { year: `${y.label} · ${y.calendar}`, total: +m.toDisplay(y.total).toFixed(m.digits) }; CATEGORIES.forEach((c) => { row[c] = +m.toDisplay(e.byCategory[c][y.y]).toFixed(m.digits + 1) }); return row })
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 18, right: 8, left: -10, bottom: 0 }} barCategoryGap="35%">
          <CartesianGrid vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} tick={tick} />
          <YAxis tickLine={false} axisLine={false} tick={tick} tickFormatter={fmtAxis(m)} />
          <Tooltip {...tooltipStyle} formatter={fmtTip(m)} cursor={{ fill: '#F3F6FB' }} />
          {CATEGORIES.map((c, i) => <Bar key={c} dataKey={c} stackId="a" fill={CATEGORY_COLORS[c]} isAnimationActive={false} radius={i === CATEGORIES.length - 1 ? [3, 3, 0, 0] : undefined}>{i === CATEGORIES.length - 1 && <LabelList dataKey="total" position="top" formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(m.digits) : '')} style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} />}</Bar>)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CompositionDonut({ e, m, size = 150 }: { e: EntityResult; m: Money; size?: number }) {
  const data = CATEGORIES.map((c) => ({ name: c, value: +m.toDisplay(e.categoryTotals[c]).toFixed(m.digits + 1), color: CATEGORY_COLORS[c] })).filter((d) => d.value > 0)
  return (
    <div className="flex items-center gap-4">
      <Donut size={size} data={data} center={<><div className="text-[16px] font-bold leading-none">{m.fmt(e.total)}</div><div className="text-[10px] text-ink-500 mt-0.5">{e.years.length}-year total</div></>} />
      <div className="flex-1 space-y-1.5 min-w-0">
        {CATEGORIES.map((c) => <div key={c} className="flex items-center gap-2 text-[11.5px]"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[c] }} /><span className="flex-1 text-ink-700 truncate">{c}</span><span className="font-medium text-ink-900 tabular-nums">{money(m, e.categoryTotals[c])}</span><span className="w-12 text-right text-ink-500 tabular-nums">{e.total ? ((e.categoryTotals[c] / e.total) * 100).toFixed(1) : '0.0'}%</span></div>)}
      </div>
    </div>
  )
}

export function CategoryTable({ e, m }: { e: EntityResult; m: Money }) {
  return (
    <table className="w-full border-separate border-spacing-0">
      <thead><tr><th className={gth}>Cost category</th>{e.years.map((y) => <th key={y.y} className={clsx(gth, 'text-right')}>{y.label}<span className="block text-[10px] font-normal text-ink-400">{y.calendar}</span></th>)}<th className={clsx(gth, 'text-right')}>Total</th><th className={clsx(gth, 'text-right')}>% of total</th></tr></thead>
      <tbody>
        {CATEGORIES.map((c) => <tr key={c} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'py-1.5')}><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c] }} />{c}</span></td>{e.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2 tabular-nums')}>{money(m, e.byCategory[c][y.y])}</td>)}<td className={clsx(gtd, 'text-right px-2 font-semibold tabular-nums')}>{money(m, e.categoryTotals[c])}</td><td className={clsx(gtd, 'text-right px-2 text-ink-500 tabular-nums')}>{e.total ? ((e.categoryTotals[c] / e.total) * 100).toFixed(1) : '0.0'}%</td></tr>)}
        <tr className="bg-brand-50/50 font-semibold"><td className={clsx(gtd, 'py-1.5')}>Total modelled cost ({m.unitLabel})</td>{e.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2 tabular-nums')}>{money(m, y.total)}</td>)}<td className={clsx(gtd, 'text-right px-2 tabular-nums')}>{money(m, e.total)}</td><td className={clsx(gtd, 'text-right px-2 tabular-nums')}>100%</td></tr>
        <tr><td className={clsx(gtd, 'py-1.5 text-ink-500')}>Average headcount</td>{e.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2 text-ink-500 tabular-nums')}>{hc(y.avg)}</td>)}<td className={clsx(gtd, 'text-right px-2 text-ink-500 tabular-nums')}>{hc(e.years.reduce((s, y) => s + y.avg, 0) / Math.max(1, e.years.length))} avg</td><td className={gtd} /></tr>
        <tr><td className={clsx(gtd, 'py-1.5 text-ink-500')}>Cost per FTE ({m.lakhUnitLabel})</td>{e.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2 text-ink-500 tabular-nums')}>{lakhNum(m, y.costPerFte)}</td>)}<td className={clsx(gtd, 'text-right px-2 text-ink-500 tabular-nums')}>{lakhNum(m, e.avgCostPerFte)} avg</td><td className={gtd} /></tr>
      </tbody>
    </table>
  )
}

export function insights(e: EntityResult, m: Money) {
  const first = e.years[0], last = e.years[e.years.length - 1]
  const pf = first.costPerFte ? ((last.costPerFte - first.costPerFte) / first.costPerFte) * 100 : 0
  const largest = [...CATEGORIES].sort((a, b) => e.categoryTotals[b] - e.categoryTotals[a])[0]
  const oneTime = e.years.reduce((s, y) => s + y.oneTimeCash, 0)
  const peak = [...e.years].sort((a, b) => b.total - a.total)[0]
  return [
    { icon: pf <= 0 ? <TrendingDown size={15} /> : <TrendingUp size={15} />, text: <><b>Cost per FTE {pf <= 0 ? 'falls' : 'rises'} {Math.abs(pf).toFixed(0)}%</b> from {first.label} to {last.label} ({lakhFmt(m, first.costPerFte)} → {lakhFmt(m, last.costPerFte)}){pf <= 0 ? ' as fixed costs spread over a larger centre.' : ' as escalation outpaces scale.'}</> },
    { icon: <Layers size={15} />, text: <><b>{largest}</b> is the largest component at {e.total ? ((e.categoryTotals[largest] / e.total) * 100).toFixed(0) : 0}% of the {e.years.length}-year total.</> },
    { icon: <Package size={15} />, text: <><b>One-time costs are {e.total ? ((oneTime / e.total) * 100).toFixed(1) : 0}%</b> of the total ({m.fmt(oneTime)}): establishment, seat setup / fit-out and devices.</> },
    { icon: <CalendarRange size={15} />, text: <><b>Peak annual cost is {peak.label} ({peak.calendar})</b> at {m.fmt(peak.total)}; the {last.label} run-rate is {m.fmt(last.total)} for {hc(last.exit)} FTE.</> },
  ]
}

export function SummaryView({ cm, e, goChecks }: { cm: CostModel; e: EntityResult; goChecks: () => void }) {
  const { m, result } = cm
  const last = e.years[e.years.length - 1]
  const avgHc = e.years.reduce((s, y) => s + y.avg, 0) / Math.max(1, e.years.length)
  return (
    <>
      <div className="grid grid-cols-5 gap-3">
        <Stat label={`${e.years.length}-year total cost`} value={m.fmt(e.total)} sub="operating + one-time" tone="text-brand-600" />
        <Stat label="Average annual cost" value={m.fmt(e.avgAnnual)} sub="across the horizon" />
        <Stat label={`${last.label} run-rate`} value={m.fmt(e.runRate)} sub="annual cost at scale" tone="text-brand-600" />
        <Stat label={`${last.label} fully loaded cost per FTE`} value={lakhFmt(m, e.runRateCostPerFte)} sub={`avg ${lakhFmt(m, e.avgCostPerFte)} over the horizon`} />
        <Stat label={`${last.label} headcount`} value={hc(last.exit)} sub={`avg ${hc(avgHc)} FTE · ${e.peopleShare.toFixed(0)}% people costs`} />
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Card title={`Annual cost by category (${m.unitLabel})`} subtitle="Total modelled cost per year, stacked by cost category.">
          <Legend items={CATEGORIES.map((c) => ({ label: c, color: CATEGORY_COLORS[c] }))} />
          <div className="mt-1"><CategoryStack e={e} m={m} /></div>
        </Card>
        <Card title={`${e.years.length}-year cost composition`} subtitle="Share of each category in the total modelled cost.">
          <CompositionDonut e={e} m={m} size={160} />
          <h4 className="text-[12.5px] font-semibold text-ink-900 mt-4 mb-1.5">Key insights</h4>
          <div className="space-y-1.5">{insights(e, m).map((i, k) => <div key={k} className="flex items-start gap-2 text-[11.5px] text-ink-700 leading-snug"><span className="text-brand-600 mt-0.5 shrink-0">{i.icon}</span><span>{i.text}</span></div>)}</div>
        </Card>
      </div>
      <Card title={`Cost by category (${m.unitLabel})`} subtitle={`${e.name} · every rupee is derived from drivers × unit costs; centre / corporate and one-time establishment are allocated by average-headcount share.`} action={<ViewAll label={`Model checks: ${checkSummary(result.checks)}`} onClick={goChecks} />}>
        <CategoryTable e={e} m={m} />
      </Card>
    </>
  )
}

export function ChecksView({ result, m }: { result: ModelResult; m: Money }) {
  const fails = result.checks.filter((c) => c.status === 'fail').length
  return (
    <Card title="Model checks" subtitle={`${checkSummary(result.checks)}. Arithmetic reconciliations plus plausibility against India GCC market ranges.`} headerRight={<span className={clsx('inline-flex items-center gap-1.5 text-[12px] font-semibold', fails ? 'text-red-600' : 'text-green-700')}><ShieldCheck size={15} /> {fails ? 'Model does not reconcile' : 'Model reconciles'}</span>}>
      <table className="w-full border-separate border-spacing-0">
        <thead><tr><th className={gth}>Status</th><th className={gth}>Check</th><th className={gth}>Detail</th></tr></thead>
        <tbody>{result.checks.map((c) => <tr key={c.id} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'py-2')}><CheckBadge status={c.status} /></td><td className={clsx(gtd, 'py-2 font-medium')}>{fmtDetail(m, c.name)}</td><td className={clsx(gtd, 'py-2 text-ink-500')}>{fmtDetail(m, c.detail)}</td></tr>)}</tbody>
      </table>
      <p className="text-[11.5px] text-ink-500 mt-3">Checks run on the whole program. Reconciliations compare independently summed views of the same model (categories, operating vs one-time, cash, per-FTE × headcount, business units vs program); plausibility checks only warn.</p>
    </Card>
  )
}
