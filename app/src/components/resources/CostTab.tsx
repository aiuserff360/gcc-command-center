import { useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Card, Table } from '../ui'
import { tooltipStyle } from '../charts'
import { CHART_COLORS } from '../../data/common'
import { useMoney } from '../../data/money'
import { GRADES, buAxis, type PeopleCostRow } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { WrapTick, CardLegend, MiniStat, lakhNum } from './widgets'
import { PeopleCostForm } from './forms'

export default function CostTab({ d }: { d: ResourceData }) {
  const { peopleCost, peopleCostRows, headcountPlan, buHeadcountRows, employees, kpi, settings } = d
  const [row, setRow] = useState<PeopleCostRow | null>(null)
  const m = useMoney()
  /** Display-unit number for series already converted with m.toDisplay (tooltips / labels). */
  const fmtDisp = (v: number, d = m.digits) => `${m.symbol} ${v.toFixed(d)} ${m.unit}`

  const rows = peopleCostRows.map((r) => {
    const fte = buHeadcountRows.find((w) => w.businessUnit === r.businessUnit)?.onboarded ?? 0
    return { ...r, name: buAxis(r.businessUnit), fte, budgetD: +m.num(r.budgetCr, 2), actualD: +m.num(r.actualCr, 2), variance: +(r.budgetCr - r.actualCr).toFixed(2), utilPct: r.budgetCr ? Math.round((r.actualCr / r.budgetCr) * 100) : 0, perFteL: fte ? +((r.actualCr * 100) / fte).toFixed(1) : 0 }
  })
  const perFteL = +(kpi.costPerFteCr * 100).toFixed(1)
  const runRate = useMemo(() => headcountPlan.items.map((h) => ({ month: h.month, 'Planned run-rate': +m.toDisplay((h.planned * kpi.costPerFteCr) / 12).toFixed(3), 'Actual run-rate': +m.toDisplay((h.actual * kpi.costPerFteCr) / 12).toFixed(3), 'Budget line': +m.toDisplay(kpi.costBudget / 12).toFixed(3) })), [headcountPlan.items, kpi.costPerFteCr, kpi.costBudget, m.currency, m.rate]) // eslint-disable-line react-hooks/exhaustive-deps
  const fullYearAtTarget = +(settings.fteTarget * kpi.costPerFteCr).toFixed(1)
  const byGrade = GRADES.map((g) => {
    const list = employees.items.filter((e) => e.grade === g)
    const avg = list.length ? +(list.reduce((s, e) => s + e.annualCostL, 0) / list.length).toFixed(1) : 0
    return { id: g, grade: g, people: list.length, share: employees.items.length ? Math.round((list.length / employees.items.length) * 100) : 0, avgL: avg, totalL: +(list.reduce((s, e) => s + e.annualCostL, 0)).toFixed(1) }
  })

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <MiniStat label="Annual People Cost" value={m.fmt(kpi.costActual)} sub={`of ${m.fmt(kpi.costBudget)} budget`} />
        <MiniStat label="Budget utilised" value={`${kpi.costBudget ? Math.round((kpi.costActual / kpi.costBudget) * 100) : 0}%`} sub="Run-rate vs annual budget" tone="text-brand-600" />
        <MiniStat label="Cost per FTE" value={m.fmtLakh(perFteL)} sub="Annual, blended" />
        <MiniStat label="Full-year cost at target" value={m.fmt(fullYearAtTarget)} sub={`${settings.fteTarget} FTEs at blended rate`} tone={fullYearAtTarget > kpi.costBudget ? 'text-red-600' : 'text-green-600'} />
        <MiniStat label="Budget headroom" value={m.fmt(+(kpi.costBudget - kpi.costActual).toFixed(2))} sub="Available for Wave 2 hiring" tone="text-green-600" />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Card title={`People Cost by Business Unit (${m.unitLabel})`} subtitle="Click a row to edit budget / actual" >
          <Table compact rows={rows} onRowClick={(r) => setRow(r)} columns={[
            { key: 'businessUnit', header: 'Business unit', render: (r) => <span className="font-medium">{r.businessUnit}</span> },
            { key: 'fte', header: 'FTEs', className: 'text-right' },
            { key: 'budgetCr', header: `Budget (${m.unitLabel})`, className: 'text-right', render: (r) => m.num(r.budgetCr, 2) },
            { key: 'actualCr', header: `Actual (${m.unitLabel})`, className: 'text-right', render: (r) => m.num(r.actualCr, 2) },
            { key: 'variance', header: 'Variance', className: 'text-right', render: (r) => <span className={r.variance < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{m.signed(r.variance, 2)}</span> },
            { key: 'utilPct', header: 'Utilised', className: 'text-right', render: (r) => `${r.utilPct}%` },
            { key: 'perFteL', header: `Cost / FTE (${m.lakhUnitLabel})`, className: 'text-right', render: (r) => lakhNum(r.perFteL, m) },
          ]} />
          <div className="flex justify-between text-[12.5px] font-semibold px-3 pt-2 border-t border-line mt-1"><span>Total</span><span>Budget {m.fmt(kpi.costBudget, 2)} · Actual {m.fmt(kpi.costActual, 2)}</span></div>
        </Card>
        <Card title={`Planned vs Actual (${m.unitLabel})`} headerRight={<CardLegend items={[{ label: 'Budget', color: '#9CC3F7' }, { label: 'Actual', color: CHART_COLORS.blue }]} />}>
          <div className="h-[270px]">
            <ResponsiveContainer>
              <BarChart data={rows} margin={{ top: 14, right: 4, left: m.digits > 1 ? -10 : -24, bottom: 14 }} barGap={2} barCategoryGap="28%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={<WrapTick />} height={30} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [fmtDisp(v as number, 2)]} />
                <Bar dataKey="budgetD" name="Budget" fill="#9CC3F7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actualD" name="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]}><LabelList dataKey="actualD" position="top" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Card title={`Salary Run-rate Forecast (${m.unitLabel} / month)`} subtitle="Monthly run-rate = headcount × blended cost per FTE ÷ 12" headerRight={<CardLegend items={[{ label: 'Planned run-rate', color: '#5B9BF0', dashed: true }, { label: 'Actual run-rate', color: CHART_COLORS.blue, dashed: true }, { label: 'Budget line', color: CHART_COLORS.red, dashed: true }]} />}>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <LineChart data={runRate} margin={{ top: 8, right: 10, left: -14, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip {...tooltipStyle} formatter={(v) => [fmtDisp(v as number, 3)]} />
                <Line dataKey="Budget line" stroke={CHART_COLORS.red} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                <Line dataKey="Planned run-rate" stroke="#5B9BF0" strokeWidth={2} dot={{ r: 3, fill: '#5B9BF0', strokeWidth: 0 }} />
                <Line dataKey="Actual run-rate" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.blue, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Cost by Grade" subtitle={`From the team allocation sample (annual, ${m.lakhUnitLabel})`}>
          <Table compact rows={byGrade} columns={[
            { key: 'grade', header: 'Grade', render: (r) => <span className="font-medium">{r.grade}</span> },
            { key: 'people', header: 'People', className: 'text-right' },
            { key: 'share', header: 'Mix', className: 'text-right', render: (r) => `${r.share}%` },
            { key: 'avgL', header: `Avg Cost (${m.lakhUnitLabel})`, className: 'text-right', render: (r) => lakhNum(r.avgL, m) },
            { key: 'totalL', header: `Total (${m.lakhUnitLabel})`, className: 'text-right', render: (r) => lakhNum(r.totalL, m) },
          ]} />
        </Card>
      </div>

      <PeopleCostForm open={!!row} onClose={() => setRow(null)} value={row} onSave={(r) => { peopleCost.update({ id: r.id, businessUnit: r.businessUnit, budgetCr: r.budgetCr, actualCr: r.actualCr }); setRow(null) }} />
    </>
  )
}
