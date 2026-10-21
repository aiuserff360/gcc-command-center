/**
 * Cost Model → Cost breakdown, Annual view, Per-FTE view and Cash flow sub-tabs. Each works on an
 * EntityResult (the program or one business unit) so the business-unit filter applies everywhere.
 */
import clsx from 'clsx'
import { BarChart, Bar, ComposedChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Card, Legend } from '../../ui'
import { tooltipStyle } from '../../charts'
import { CHART_COLORS } from '../../../data/common'
import { BANDS, BAND_COLORS, CATEGORIES, CATEGORY_COLORS, type EntityResult, type YearResult } from '../../../data/costModel'
import type { Money } from '../../../data/money'
import type { CostModel } from './useCostModel'
import { Stat, gth, gtd, hc, lakhFmt, lakhNum, tick } from './shared'
import { money, fmtAxis, fmtTip } from './OutputSummary'

type Line = { label: string; get: (y: YearResult) => number; bold?: boolean; muted?: boolean; indent?: boolean }
function LinesTable({ e, m, lines, title }: { e: EntityResult; m: Money; lines: Line[]; title: string }) {
  return (
    <table className="w-full border-separate border-spacing-0">
      <thead><tr><th className={gth}>{title}</th>{e.years.map((y) => <th key={y.y} className={clsx(gth, 'text-right')}>{y.label}<span className="block text-[10px] font-normal text-ink-400">{y.calendar}</span></th>)}<th className={clsx(gth, 'text-right')}>Total</th></tr></thead>
      <tbody>{lines.map((l) => <tr key={l.label} className={clsx(l.bold && 'bg-surface/70 font-semibold', !l.bold && 'hover:bg-brand-50/40')}><td className={clsx(gtd, 'py-1.5', l.indent && 'pl-5', l.muted && 'text-ink-500')}>{l.label}</td>{e.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2 tabular-nums', l.muted && 'text-ink-500')}>{money(m, l.get(y))}</td>)}<td className={clsx(gtd, 'text-right px-2 tabular-nums font-semibold', l.muted && 'text-ink-500 font-normal')}>{money(m, e.years.reduce((s, y) => s + l.get(y), 0))}</td></tr>)}</tbody>
    </table>
  )
}

/* ================= Cost breakdown ================= */
export function BreakdownView({ cm, e }: { cm: CostModel; e: EntityResult }) {
  const { m, inputs } = cm
  const comp = e.years.map((y) => { const row: Record<string, number | string> = { year: y.label }; CATEGORIES.forEach((c) => { row[c] = y.total ? +((e.byCategory[c][y.y] / y.total) * 100).toFixed(1) : 0 }); return row })
  const lease = inputs.realEstate.model === 'Conventional lease'
  return (
    <>
      <div className="grid grid-cols-[1fr_1.3fr] gap-4">
        <Card title="Composition by year (%)" subtitle="Share of each category in the annual total.">
          <Legend items={CATEGORIES.map((c) => ({ label: c, color: CATEGORY_COLORS[c] }))} />
          <div className="h-[240px] mt-1">
            <ResponsiveContainer>
              <BarChart data={comp} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={tick} />
                <YAxis tickLine={false} axisLine={false} tick={tick} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} cursor={{ fill: '#F3F6FB' }} />
                {CATEGORIES.map((c) => <Bar key={c} dataKey={c} stackId="a" fill={CATEGORY_COLORS[c]} isAnimationActive={false} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title={`Compensation (${m.unitLabel})`} subtitle="Average FTE by band × fully loaded cost per FTE, split by component.">
          <LinesTable e={e} m={m} title="Component" lines={[
            { label: 'Base salary', get: (y) => y.comp.base }, { label: 'Variable pay', get: (y) => y.comp.variable }, { label: 'Other allowances', get: (y) => y.comp.allowances },
            { label: 'Statutory (PF, gratuity)', get: (y) => y.comp.statutory }, { label: 'Benefits (medical, life, L&D, engagement, other)', get: (y) => y.comp.benefits }, { label: 'Compensation', get: (y) => y.comp.total, bold: true },
          ]} />
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title={`Other people costs (${m.unitLabel})`} subtitle="Per new hire, per average FTE and fixed programmes (allocated).">
          <LinesTable e={e} m={m} title="Driver" lines={[{ label: 'New hires × per-hire costs', get: (y) => y.otherPeople.newHire }, { label: 'Average FTE × per-FTE costs', get: (y) => y.otherPeople.perFte }, { label: 'Fixed programmes (branding, career, other)', get: (y) => y.otherPeople.fixed }, { label: 'Other people costs', get: (y) => y.otherPeople.total, bold: true }]} />
        </Card>
        <Card title={`Real estate (${m.unitLabel})`} subtitle={`${inputs.realEstate.model}${inputs.realEstate.city ? ` · ${inputs.realEstate.city}` : ''} · seats follow exit headcount.`}>
          <LinesTable e={e} m={m} title="Line" lines={[{ label: lease ? 'Rent + CAM' : 'Seat / desk fees', get: (y) => y.realEstate.recurring }, { label: 'Parking', get: (y) => y.realEstate.parking }, { label: lease ? 'Fit-out (one-time)' : 'Seat setup (one-time)', get: (y) => y.realEstate.setup }, { label: 'Real estate', get: (y) => y.realEstate.total, bold: true }, { label: 'Refundable deposits (cash only, not cost)', get: (y) => y.realEstate.deposit, muted: true }]} />
        </Card>
        <Card title={`Technology (${m.unitLabel})`} subtitle={`Devices for new hires and the ${inputs.technology.refreshYears}-year refresh; per-user rates × average headcount.`}>
          <LinesTable e={e} m={m} title="Line" lines={[{ label: 'Device purchases (one-time)', get: (y) => y.technology.devices }, { label: 'Licences, apps, cloud, security, support, network, hosting', get: (y) => y.technology.recurring }, { label: 'Technology', get: (y) => y.technology.total, bold: true }]} />
        </Card>
        <Card title={`Centre / corporate and one-time (${m.unitLabel})`} subtitle="Program-level lines allocated by average-headcount share.">
          <LinesTable e={e} m={m} title="Line" lines={[{ label: 'Centre / corporate (compliance, finance, legal, insurance, governance, other)', get: (y) => y.corporate }, { label: 'One-time establishment (Year 1)', get: (y) => y.oneTime }, { label: 'Centre / corporate + establishment', get: (y) => y.corporate + y.oneTime, bold: true }]} />
        </Card>
      </div>
    </>
  )
}

/* ================= Annual view ================= */
export function AnnualView({ cm, e }: { cm: CostModel; e: EntityResult }) {
  const { m } = cm
  const data = e.years.map((y) => ({ year: `${y.label} · ${y.calendar}`, Total: +m.toDisplay(y.total).toFixed(m.digits), 'Cost per FTE': +lakhNum(m, y.costPerFte) }))
  return (
    <>
      <Card title={`Annual cost and cost per FTE`} subtitle={`Total modelled cost (${m.unitLabel}, bars) and fully loaded cost per FTE (${m.lakhUnitLabel}, line).`}>
        <Legend items={[{ label: `Total cost (${m.unitLabel})`, color: CHART_COLORS.blue }, { label: `Cost per FTE (${m.lakhUnitLabel})`, color: CHART_COLORS.amber }]} />
        <div className="h-[240px] mt-1">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 18, right: 8, left: -10, bottom: 0 }} barCategoryGap="40%">
              <CartesianGrid vertical={false} stroke="#EEF2F7" />
              <XAxis dataKey="year" tickLine={false} axisLine={false} tick={tick} />
              <YAxis yAxisId="l" tickLine={false} axisLine={false} tick={tick} tickFormatter={fmtAxis(m)} />
              <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} tick={tick} />
              <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
              <Bar yAxisId="l" dataKey="Total" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} isAnimationActive={false}><LabelList dataKey="Total" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
              <Line yAxisId="r" dataKey="Cost per FTE" stroke={CHART_COLORS.amber} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.amber, strokeWidth: 0 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title={`Annual view (${m.unitLabel})`} subtitle="Every line of the model by year, with the headcount that drives it.">
        <LinesTable e={e} m={m} title="Line" lines={[
          { label: 'Compensation', get: (y) => y.comp.total }, { label: 'Other people costs', get: (y) => y.otherPeople.total }, { label: 'People costs', get: (y) => y.comp.total + y.otherPeople.total, bold: true },
          { label: 'Real estate', get: (y) => y.realEstate.total }, { label: 'Technology', get: (y) => y.technology.total }, { label: 'Centre / corporate', get: (y) => y.corporate }, { label: 'One-time establishment', get: (y) => y.oneTime },
          { label: 'Total modelled cost', get: (y) => y.total, bold: true }, { label: 'of which operating', get: (y) => y.operating, indent: true, muted: true }, { label: 'of which one-time (establishment, setup / fit-out, devices)', get: (y) => y.oneTimeCash, indent: true, muted: true },
        ]} />
        <table className="w-full border-separate border-spacing-0 mt-3">
          <thead><tr><th className={gth}>Headcount</th>{e.years.map((y) => <th key={y.y} className={clsx(gth, 'text-right')}>{y.label}</th>)}<th className={clsx(gth, 'text-right')}>Horizon</th></tr></thead>
          <tbody>
            <tr><td className={clsx(gtd, 'py-1.5')}>Exit headcount</td>{e.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{hc(y.exit)}</td>)}<td className={clsx(gtd, 'text-right px-2 text-ink-500')}>{hc(e.years[e.years.length - 1].exit)} final</td></tr>
            <tr><td className={clsx(gtd, 'py-1.5')}>Average headcount (for costing)</td>{e.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{hc(y.avg)}</td>)}<td className={clsx(gtd, 'text-right px-2 text-ink-500')}>{hc(e.years.reduce((s, y) => s + y.avg, 0) / e.years.length)} avg</td></tr>
            <tr><td className={clsx(gtd, 'py-1.5')}>New hires (incl. attrition backfill)</td>{e.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{hc(y.newHires)}</td>)}<td className={clsx(gtd, 'text-right px-2 text-ink-500')}>{hc(e.years.reduce((s, y) => s + y.newHires, 0))} total</td></tr>
            <tr className="bg-surface/70 font-semibold"><td className={clsx(gtd, 'py-1.5')}>Cost per FTE ({m.lakhUnitLabel})</td>{e.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{lakhNum(m, y.costPerFte)}</td>)}<td className={clsx(gtd, 'text-right px-2')}>{lakhNum(m, e.avgCostPerFte)} avg</td></tr>
          </tbody>
        </table>
      </Card>
    </>
  )
}

/* ================= Per-FTE view ================= */
export function PerFteView({ cm, e }: { cm: CostModel; e: EntityResult }) {
  const { m } = cm
  const per = (y: YearResult, v: number) => (y.avg > 0 ? (v * 100) / y.avg : 0)
  const data = e.years.map((y) => { const row: Record<string, number | string> = { year: `${y.label} · ${y.calendar}`, total: +lakhNum(m, y.costPerFte) }; CATEGORIES.forEach((c) => { row[c] = +lakhNum(m, per(y, e.byCategory[c][y.y])) }); return row })
  const bands = e.years.map((y) => { const row: Record<string, number | string> = { year: y.label }; BANDS.forEach((b, i) => { row[b.label] = +lakhNum(m, y.loadedPerFte[i]) }); return row })
  const first = e.years[0], last = e.years[e.years.length - 1]
  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <Stat label={`${first.label} cost per FTE`} value={lakhFmt(m, first.costPerFte)} sub={`${hc(first.avg)} average FTE`} />
        <Stat label={`${last.label} cost per FTE`} value={lakhFmt(m, last.costPerFte)} sub={`${hc(last.avg)} average FTE`} tone="text-brand-600" />
        <Stat label="Average over the horizon" value={lakhFmt(m, e.avgCostPerFte)} sub="total cost ÷ total average FTE-years" />
        <Stat label={`${last.label} compensation per FTE`} value={lakhFmt(m, per(last, last.comp.total))} sub={`${last.total ? ((last.comp.total / last.total) * 100).toFixed(0) : 0}% of cost per FTE`} />
      </div>
      <div className="grid grid-cols-[1.3fr_1fr] gap-4">
        <Card title={`Cost per FTE by category (${m.lakhUnitLabel})`} subtitle="Annual cost ÷ average headcount, stacked by category.">
          <Legend items={CATEGORIES.map((c) => ({ label: c, color: CATEGORY_COLORS[c] }))} />
          <div className="h-[250px] mt-1">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 18, right: 8, left: -14, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={tick} />
                <YAxis tickLine={false} axisLine={false} tick={tick} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${m.lakhUnitLabel} ${v}`]} cursor={{ fill: '#F3F6FB' }} />
                {CATEGORIES.map((c, i) => <Bar key={c} dataKey={c} stackId="a" fill={CATEGORY_COLORS[c]} isAnimationActive={false} radius={i === CATEGORIES.length - 1 ? [3, 3, 0, 0] : undefined}>{i === CATEGORIES.length - 1 && <LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} />}</Bar>)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title={`Fully loaded cost per FTE by band (${m.lakhUnitLabel})`} subtitle="Compensation per FTE for each experience band across the years (FTE-weighted where units differ).">
          <Legend items={BANDS.map((b, i) => ({ label: b.label, color: BAND_COLORS[i] }))} />
          <div className="h-[250px] mt-1">
            <ResponsiveContainer>
              <LineChart data={bands} margin={{ top: 12, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={tick} />
                <YAxis tickLine={false} axisLine={false} tick={tick} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${m.lakhUnitLabel} ${v}`]} />
                {BANDS.map((b, i) => <Line key={b.key} dataKey={b.label} stroke={BAND_COLORS[i]} strokeWidth={2} dot={{ r: 2.5, fill: BAND_COLORS[i], strokeWidth: 0 }} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card title={`Per-FTE view (${m.lakhUnitLabel} per average FTE per year)`} subtitle="Unit economics of the centre: each category divided by the average headcount of the year.">
        <table className="w-full border-separate border-spacing-0">
          <thead><tr><th className={gth}>Cost category</th>{e.years.map((y) => <th key={y.y} className={clsx(gth, 'text-right')}>{y.label}<span className="block text-[10px] font-normal text-ink-400">avg {hc(y.avg)} FTE</span></th>)}<th className={clsx(gth, 'text-right')}>{first.label} → {last.label}</th></tr></thead>
          <tbody>
            {CATEGORIES.map((c) => { const a = per(first, e.byCategory[c][0]), b = per(last, e.byCategory[c][last.y]); const d = a ? ((b - a) / a) * 100 : 0; return <tr key={c} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'py-1.5')}><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c] }} />{c}</span></td>{e.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2 tabular-nums')}>{lakhNum(m, per(y, e.byCategory[c][y.y]))}</td>)}<td className={clsx(gtd, 'text-right px-2 tabular-nums', d > 0 ? 'text-amber-700' : 'text-green-700')}>{a ? `${d > 0 ? '+' : ''}${d.toFixed(0)}%` : '—'}</td></tr> })}
            <tr className="bg-brand-50/50 font-semibold"><td className={clsx(gtd, 'py-1.5')}>Cost per FTE</td>{e.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2 tabular-nums')}>{lakhNum(m, y.costPerFte)}</td>)}<td className={clsx(gtd, 'text-right px-2 tabular-nums')}>{first.costPerFte ? `${last.costPerFte >= first.costPerFte ? '+' : ''}${(((last.costPerFte - first.costPerFte) / first.costPerFte) * 100).toFixed(0)}%` : '—'}</td></tr>
          </tbody>
        </table>
      </Card>
    </>
  )
}

/* ================= Cash flow ================= */
export function CashFlowView({ cm, e }: { cm: CostModel; e: EntityResult }) {
  const { m } = cm
  let cum = 0
  const rows = e.years.map((y) => { cum += y.cashOut; return { ...y, fitout: y.realEstate.setup, devices: y.technology.devices, cumulative: cum } })
  const oneTime = rows.reduce((s, r) => s + r.oneTimeCash, 0)
  const peak = [...rows].sort((a, b) => b.cashOut - a.cashOut)[0]
  const data = rows.map((r) => ({ year: `${r.label} · ${r.calendar}`, Operating: +m.toDisplay(r.operating).toFixed(m.digits + 1), 'One-time': +m.toDisplay(r.oneTimeCash).toFixed(m.digits + 1), Deposits: +m.toDisplay(r.deposits).toFixed(m.digits + 1), total: +m.toDisplay(r.cashOut).toFixed(m.digits), Cumulative: +m.toDisplay(r.cumulative).toFixed(m.digits) }))
  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <Stat label={`Total cash out (${e.years.length} years)`} value={m.fmt(e.cashTotal)} sub="costs + refundable deposits" tone="text-brand-600" />
        <Stat label="One-time cash items" value={m.fmt(oneTime)} sub="establishment, setup / fit-out, devices" />
        <Stat label="Security deposits" value={m.fmt(e.depositsTotal)} sub="refundable at exit" />
        <Stat label={`Peak year cash out (${peak.label})`} value={m.fmt(peak.cashOut)} sub={String(peak.calendar)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title={`Annual cash out (${m.unitLabel})`} subtitle="Operating costs, one-time items and security deposits.">
          <Legend items={[{ label: 'Operating', color: CHART_COLORS.blue }, { label: 'One-time', color: CHART_COLORS.orange }, { label: 'Deposits', color: CHART_COLORS.teal }]} />
          <div className="h-[230px] mt-1">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 18, right: 8, left: -10, bottom: 0 }} barCategoryGap="40%">
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={tick} />
                <YAxis tickLine={false} axisLine={false} tick={tick} tickFormatter={fmtAxis(m)} />
                <Tooltip {...tooltipStyle} formatter={fmtTip(m)} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="Operating" stackId="a" fill={CHART_COLORS.blue} isAnimationActive={false} />
                <Bar dataKey="One-time" stackId="a" fill={CHART_COLORS.orange} isAnimationActive={false} />
                <Bar dataKey="Deposits" stackId="a" fill={CHART_COLORS.teal} isAnimationActive={false} radius={[3, 3, 0, 0]}><LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title={`Cumulative cash out (${m.unitLabel})`} subtitle="Running total across the horizon.">
          <div className="h-[252px]">
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 18, right: 40, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={tick} />
                <YAxis tickLine={false} axisLine={false} tick={tick} tickFormatter={fmtAxis(m)} />
                <Tooltip {...tooltipStyle} formatter={fmtTip(m)} />
                <Line dataKey="Cumulative" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.blue, strokeWidth: 0 }} isAnimationActive={false}><LabelList dataKey="Cumulative" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card title={`Cash flow statement (${m.unitLabel})`} subtitle="Operating + one-time = total modelled cost; deposits are cash only. Reconciled by the model checks.">
        <table className="w-full border-separate border-spacing-0">
          <thead><tr><th className={gth}>Line</th>{rows.map((r) => <th key={r.y} className={clsx(gth, 'text-right')}>{r.label}<span className="block text-[10px] font-normal text-ink-400">{r.calendar}</span></th>)}<th className={clsx(gth, 'text-right')}>Total</th></tr></thead>
          <tbody>
            {([
              ['Operating costs', (r: typeof rows[number]) => r.operating, false, false], ['One-time establishment', (r: typeof rows[number]) => r.oneTime, true, false], ['Fit-out / seat setup', (r: typeof rows[number]) => r.fitout, true, false], ['Device purchases', (r: typeof rows[number]) => r.devices, true, false],
              ['One-time costs', (r: typeof rows[number]) => r.oneTimeCash, false, true], ['Security deposits (refundable)', (r: typeof rows[number]) => r.deposits, false, false], ['Total cash out', (r: typeof rows[number]) => r.cashOut, false, true],
            ] as const).map(([label, get, indent, bold]) => <tr key={label} className={clsx(bold && 'bg-surface/70 font-semibold')}><td className={clsx(gtd, 'py-1.5', indent && 'pl-5 text-ink-500')}>{label}</td>{rows.map((r) => <td key={r.y} className={clsx(gtd, 'text-right px-2 tabular-nums', indent && 'text-ink-500')}>{money(m, get(r))}</td>)}<td className={clsx(gtd, 'text-right px-2 tabular-nums font-semibold')}>{money(m, rows.reduce((s, r) => s + get(r), 0))}</td></tr>)}
            <tr><td className={clsx(gtd, 'py-1.5 font-semibold')}>Cumulative cash out</td>{rows.map((r) => <td key={r.y} className={clsx(gtd, 'text-right px-2 tabular-nums font-semibold')}>{money(m, r.cumulative)}</td>)}<td className={clsx(gtd, 'text-right px-2 text-ink-400')}>—</td></tr>
          </tbody>
        </table>
      </Card>
    </>
  )
}
