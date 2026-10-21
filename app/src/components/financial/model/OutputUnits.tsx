/**
 * Cost Model → By business unit: unit cards + dropdown → deep dive (headcount ramp & pyramid, fully
 * loaded cost per FTE by band, cost by category × year, composition, per-FTE trend, sensitivity, link
 * to Resource Management).
 */
import { useMemo } from 'react'
import clsx from 'clsx'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { ExternalLink } from 'lucide-react'
import { Card, Badge, Legend } from '../../ui'
import { tooltipStyle } from '../../charts'
import { CHART_COLORS } from '../../../data/common'
import { BANDS, BAND_COLORS, sensitivity, unitHasOwnComp } from '../../../data/costModel'
import type { CostModel } from './useCostModel'
import { UnitSelector, Stat, gth, gtd, hc, lakhFmt, lakhNum, tick, unitColor } from './shared'
import { CategoryTable, CompositionDonut, money } from './OutputSummary'

export function UnitsView({ cm, unit, onUnit }: { cm: CostModel; unit: string; onUnit: (id: string) => void }) {
  const { m, inputs, result, units, allUnits } = cm
  const bu = units.find((u) => u.id === unit) ?? units[0]
  const H = result.horizon
  const cards = units.map((u) => { const e = result.byUnit[u.id]; const last = e.years[H - 1]; return { id: u.id, name: u.name, kind: u.kind, big: m.fmt(e.runRate), sub: `${last.label} run-rate · ${hc(last.exit)} FTE`, foot: <span><span className="text-brand-600">{lakhFmt(m, e.runRateCostPerFte)} / FTE</span><span className="text-ink-400"> · </span><span className="text-ink-700">{(e.share * 100).toFixed(0)}% of program</span></span> } })
  const sens = useMemo(() => (bu ? sensitivity(inputs, allUnits, {}, bu.id).rows.slice(0, 4) : []), [inputs, allUnits, bu])
  if (!bu) return <Card title="By business unit"><p className="text-[12.5px] text-ink-500 italic py-6 text-center">No business units in scope.</p></Card>
  const e = result.byUnit[bu.id]
  const last = e.years[H - 1], first = e.years[0]
  const color = unitColor(units, bu.id)
  const ramp = e.years.map((y) => ({ year: y.label, 'Exit headcount': Math.round(y.exit), 'Average headcount': Math.round(y.avg) }))
  const pyrMax = Math.max(...last.exitByBand, 1)
  const perFte = e.years.map((y) => ({ year: y.label, 'Cost per FTE': +lakhNum(m, y.costPerFte), 'Compensation per FTE': +lakhNum(m, y.avg ? (y.comp.total * 100) / y.avg : 0) }))
  const maxSens = Math.max(...sens.map((s) => Math.abs(s.deltaPlus)), 1e-9)
  const resourcesLink = `#/resources?tab=${encodeURIComponent('Resource Allocation')}&bu=${encodeURIComponent(bu.name)}`

  return (
    <>
      <UnitSelector title="Cost model by business unit" subtitle={`Pick a business unit to see its run-rate build-up. Each unit carries its own compensation, other people costs, seats and devices; centre / corporate and one-time establishment are allocated by average-headcount share.`} cards={cards} selected={bu.id} onSelect={onUnit} />

      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} /><h3 className="text-[18px] font-bold text-navy-900">{bu.name}</h3><Badge value={bu.status} /><span className="text-[11.5px] text-ink-500">{bu.kind} · {bu.wave} · owner {bu.owner} · {unitHasOwnComp(inputs, bu) ? 'own compensation' : 'program-default compensation'}</span></div>
            {bu.description && <p className="text-[12.5px] text-ink-700 mt-0.5 max-w-3xl">{bu.description}</p>}
          </div>
          <a href={resourcesLink} className="btn-secondary text-[12px] inline-flex items-center gap-1.5"><ExternalLink size={13} /> Resource Management · allocation for this unit</a>
        </div>
        <div className="grid grid-cols-6 gap-3 mt-3">
          <Stat label={`${last.label} exit headcount`} value={hc(last.exit)} sub={`${hc(first.exit)} in ${first.label} · avg ${hc(last.avg)} in ${last.label}`} />
          <Stat label={`${H}-year total cost`} value={m.fmt(e.total)} sub={`${(e.share * 100).toFixed(1)}% of program`} tone="text-brand-600" />
          <Stat label={`${last.label} run-rate`} value={m.fmt(e.runRate)} sub="annual cost at scale" tone="text-brand-600" />
          <Stat label={`${last.label} cost per FTE`} value={lakhFmt(m, e.runRateCostPerFte)} sub={`${first.label} ${lakhFmt(m, first.costPerFte)}`} />
          <Stat label="People-cost share" value={`${e.peopleShare.toFixed(0)}%`} sub="compensation + other people costs" />
          <Stat label="Most sensitive driver" value={sens[0]?.label ?? '—'} sub={sens[0] ? `${sens[0].impactPct >= 0 ? '+' : ''}${sens[0].impactPct.toFixed(1)}% at +${sens[0].flex}%` : ''} />
        </div>
      </Card>

      <div className="grid grid-cols-[1.2fr_0.8fr_1.2fr] gap-4">
        <Card title="Headcount ramp" subtitle="Exit headcount and the average used for costing.">
          <Legend items={[{ label: 'Exit headcount', color: CHART_COLORS.blue }, { label: 'Average headcount', color: CHART_COLORS.blueFaint }]} />
          <div className="h-[220px] mt-1">
            <ResponsiveContainer>
              <BarChart data={ramp} margin={{ top: 16, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={tick} />
                <YAxis tickLine={false} axisLine={false} tick={tick} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="Exit headcount" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} isAnimationActive={false}><LabelList dataKey="Exit headcount" position="top" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
                <Bar dataKey="Average headcount" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title={`${last.label} experience pyramid`} subtitle={`Exit headcount by band · ${hc(last.exit)} FTE`}>
          <div className="space-y-2.5 pt-2">
            {BANDS.map((_, i) => i).reverse().map((i) => (
              <div key={i} className="flex items-center gap-2 text-[11.5px]">
                <span className="w-[70px] text-ink-700 shrink-0">{BANDS[i].label}</span>
                <span className="flex-1 flex justify-center"><span className="h-4 rounded" style={{ width: `${(last.exitByBand[i] / pyrMax) * 100}%`, background: BAND_COLORS[i], minWidth: 4 }} /></span>
                <span className="w-9 text-right font-medium tabular-nums">{hc(last.exitByBand[i])}</span>
                <span className="w-9 text-right text-ink-500 tabular-nums">{(last.exit ? (last.exitByBand[i] / last.exit) * 100 : 0).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title={`Fully loaded cost per FTE by band (${m.lakhUnitLabel})`} subtitle={`${first.label} build-up and ${last.label} value under the ${inputs.settings.compMode === 'same' ? 'constant' : inputs.settings.compMode === 'escalate' ? `${inputs.settings.compEscalationRate}% escalated` : 'year-by-year'} compensation mode.`}>
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={gth}>Component</th>{BANDS.map((b, i) => <th key={b.key} className={clsx(gth, 'text-right')}><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: BAND_COLORS[i] }} />{b.short}</span></th>)}</tr></thead>
            <tbody>
              {([['Base salary', 'base'], ['Variable + allowances', 'va'], ['Statutory + benefits', 'sb']] as const).map(([label, k]) => <tr key={k}><td className={clsx(gtd, 'py-1')}>{label}</td>{first.loadedBreakdown.map((l, i) => <td key={i} className={clsx(gtd, 'text-right px-2 tabular-nums')}>{lakhNum(m, k === 'base' ? l.base : k === 'va' ? l.variable + l.allowances : l.statutory + l.benefits)}</td>)}</tr>)}
              <tr className="bg-brand-50/50 font-semibold"><td className={clsx(gtd, 'py-1')}>{first.label} cost per FTE</td>{first.loadedPerFte.map((v, i) => <td key={i} className={clsx(gtd, 'text-right px-2 tabular-nums')}>{lakhNum(m, v)}</td>)}</tr>
              <tr><td className={clsx(gtd, 'py-1 text-ink-500')}>{last.label} cost per FTE</td>{last.loadedPerFte.map((v, i) => <td key={i} className={clsx(gtd, 'text-right px-2 tabular-nums text-ink-500')}>{lakhNum(m, v)}</td>)}</tr>
              <tr><td className={clsx(gtd, 'py-1 text-ink-500')}>{last.label} average FTE</td>{last.byBand.map((v, i) => <td key={i} className={clsx(gtd, 'text-right px-2 tabular-nums text-ink-500')}>{hc(v)}</td>)}</tr>
            </tbody>
          </table>
        </Card>
      </div>

      <Card title={`Cost by category × year (${m.unitLabel}) – ${bu.name}`} subtitle="Driver-based build-up of the unit's run-rate.">
        <CategoryTable e={e} m={m} />
      </Card>

      <div className="grid grid-cols-[1fr_1fr_1.1fr] gap-4">
        <Card title={`${H}-year cost composition`} subtitle="Share of each category in the unit's total.">
          <CompositionDonut e={e} m={m} size={140} />
        </Card>
        <Card title={`Per-FTE trend (${m.lakhUnitLabel})`} subtitle="Fully loaded cost per FTE and the compensation part of it.">
          <Legend items={[{ label: 'Cost per FTE', color: CHART_COLORS.blue }, { label: 'Compensation per FTE', color: CHART_COLORS.teal }]} />
          <div className="h-[190px] mt-1">
            <ResponsiveContainer>
              <LineChart data={perFte} margin={{ top: 14, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={tick} />
                <YAxis tickLine={false} axisLine={false} tick={tick} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${m.lakhUnitLabel} ${v}`]} />
                <Line dataKey="Cost per FTE" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.blue, strokeWidth: 0 }} isAnimationActive={false}><LabelList dataKey="Cost per FTE" position="top" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Line>
                <Line dataKey="Compensation per FTE" stroke={CHART_COLORS.teal} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.teal, strokeWidth: 0 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title={`Sensitivity of the unit's ${H}-year total`} subtitle="Top drivers flexed ± their default range, everything else constant.">
          <div className="space-y-2.5 pt-1">
            {sens.map((s) => <div key={s.driver} className="text-[11.5px]"><div className="flex items-center justify-between"><span className="font-medium text-ink-900">{s.label} <span className="text-ink-400 font-normal">±{s.flex}%</span></span><span className="tabular-nums text-ink-700">{s.deltaPlus >= 0 ? '+' : '−'}{money(m, Math.abs(s.deltaPlus))} {m.unit} · {s.impactPct >= 0 ? '+' : ''}{s.impactPct.toFixed(1)}%</span></div><div className="h-2 rounded-full bg-slate-200 overflow-hidden mt-1"><div className="h-full rounded-full" style={{ width: `${(Math.abs(s.deltaPlus) / maxSens) * 100}%`, background: CHART_COLORS.blue }} /></div></div>)}
          </div>
          <p className="text-[11px] text-ink-500 mt-3">Full tornado and impact table on the Sensitivity sub-tab with this unit selected in the filter.</p>
        </Card>
      </div>
    </>
  )
}
