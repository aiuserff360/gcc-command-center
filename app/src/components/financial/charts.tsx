import { ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, PieChart, Pie, Cell, ReferenceLine } from 'recharts'
import { tooltipStyle } from '../charts'
import { CHART_COLORS } from '../../data/common'
import { FIN_WS_COLORS } from '../../data/financial'

const fmt1 = (v: unknown) => (typeof v === 'number' ? v.toFixed(1) : String(v ?? ''))
const crFmt = (v: unknown) => [`₹ ${fmt1(v)} Cr`]
const tick = { fontSize: 11, fill: '#6B7280' }
const barLabel = { fontSize: 10, fill: '#111827', fontWeight: 600 }

/* ---------- end-of-line pill label ---------- */
type LabelProps = { x?: number | string; y?: number | string; index?: number; value?: unknown }
function endPill(last: number, text: string, color: string, dy = 0) {
  return function EndPill(p: LabelProps) {
    if (p.index !== last || typeof p.x !== 'number' || typeof p.y !== 'number') return null
    const x = p.x + 10, y = p.y - 15 + dy
    return (
      <g>
        <rect x={x} y={y} width={48} height={30} rx={5} fill={color} />
        <text x={x + 24} y={y + 12} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">{fmt1(p.value)}</text>
        <text x={x + 24} y={y + 24} textAnchor="middle" fontSize={9.5} fill="#fff">{text}</text>
      </g>
    )
  }
}

export type CumRow = { month: string; monthlyActual: number; cumActual: number; cumForecast: number; cumBudget: number }

/** Budget vs Actual vs Forecast (Cumulative) – monthly bars + three cumulative lines with end labels. */
export function CumulativeChart({ rows, height = 210 }: { rows: CumRow[]; height?: number }) {
  const last = rows.length - 1
  const maxBar = Math.max(...rows.map((r) => r.monthlyActual), 0.1)
  const maxLine = Math.max(...rows.map((r) => Math.max(r.cumBudget, r.cumForecast, r.cumActual)), 1)
  const domainMax = Math.ceil(maxLine + 0.5)
  // Resolve end-pill collisions: estimate pixel y of each end value and push pills >= 32px apart.
  const end = rows[last] ?? { cumBudget: 0, cumForecast: 0, cumActual: 0 }
  const pxPerUnit = (height - 8 - 30) / domainMax
  const est = (v: number) => (domainMax - v) * pxPerUnit
  const order = ([['cumBudget', end.cumBudget], ['cumForecast', end.cumForecast], ['cumActual', end.cumActual]] as [string, number][]).sort((a, b) => b[1] - a[1])
  const dy: Record<string, number> = {}
  let prevBottom = -Infinity
  order.forEach(([k, v]) => {
    const ideal = est(v) - 15
    const y = Math.max(ideal, prevBottom + 2)
    dy[k] = y - ideal
    prevBottom = y + 30
  })
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 8, right: 64, left: -24, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={tick} interval={0} />
          <YAxis yAxisId="cum" tickLine={false} axisLine={false} tick={tick} domain={[0, domainMax]} allowDecimals={false} />
          <YAxis yAxisId="m" hide domain={[0, maxBar * 1.9]} />
          <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={crFmt} />
          <Bar isAnimationActive={false} yAxisId="m" dataKey="monthlyActual" name="Monthly Actual" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]} />
          <Line isAnimationActive={false} yAxisId="cum" type="monotone" dataKey="cumBudget" name="Approved Budget" stroke="#9CA3AF" strokeDasharray="5 4" strokeWidth={2} dot={{ r: 3, fill: '#9CA3AF', strokeWidth: 0 }} activeDot={{ r: 4 }}>
            <LabelList dataKey="cumBudget" content={endPill(last, 'Budget', '#4B5563', dy.cumBudget)} />
          </Line>
          <Line isAnimationActive={false} yAxisId="cum" type="monotone" dataKey="cumForecast" name="Cumulative Forecast" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.green, strokeWidth: 0 }} activeDot={{ r: 4 }}>
            <LabelList dataKey="cumForecast" content={endPill(last, 'Forecast', CHART_COLORS.green, dy.cumForecast)} />
          </Line>
          <Line isAnimationActive={false} yAxisId="cum" type="monotone" dataKey="cumActual" name="Cumulative Actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.blue, strokeWidth: 0 }} activeDot={{ r: 4 }}>
            <LabelList dataKey="cumActual" content={endPill(last, 'Actual', CHART_COLORS.blueLight, dy.cumActual)} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Spend by Phase – grouped bars Actual / Forecast / Budget. */
export function PhaseChart({ rows, highlight, height = 210 }: { rows: { phase: string; Actual: number; Forecast: number; Budget: number | null }[]; highlight?: string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 16, right: 4, left: -24, bottom: 0 }} barGap={4} barCategoryGap="12%">
          <CartesianGrid vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="phase" tickLine={false} axisLine={false} interval={0} tick={<WrapTick highlight={highlight} />} height={34} />
          <YAxis tickLine={false} axisLine={false} tick={tick} allowDecimals={false} />
          <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={crFmt} />
          <Bar isAnimationActive={false} dataKey="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]}><LabelList dataKey="Actual" position="top" formatter={fmt1} style={barLabel} /></Bar>
          <Bar isAnimationActive={false} dataKey="Forecast" fill={CHART_COLORS.blueLight} radius={[3, 3, 0, 0]}><LabelList dataKey="Forecast" position="top" formatter={fmt1} style={barLabel} /></Bar>
          <Bar isAnimationActive={false} dataKey="Budget" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]}><LabelList dataKey="Budget" position="top" formatter={(v: unknown) => (v == null ? '' : fmt1(v))} style={barLabel} /></Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function WrapTick({ x, y, payload, highlight }: { x?: number; y?: number; payload?: { value: string }; highlight?: string }) {
  const v = String(payload?.value ?? '')
  const idx = v.indexOf(' (')
  const lines = idx > 0 ? [v.slice(0, idx), v.slice(idx + 1)] : v.length > 16 ? splitWords(v) : [v]
  const hl = highlight && v.startsWith(highlight)
  return (
    <text x={x} y={y} textAnchor="middle" fill={hl ? '#1E5BBE' : '#6B7280'} fontSize={11} fontWeight={hl ? 600 : 400}>
      {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 12 : 13}>{l}</tspan>)}
    </text>
  )
}
function splitWords(v: string) {
  const w = v.split(' ')
  const mid = Math.ceil(w.length / 2)
  return [w.slice(0, mid).join(' '), w.slice(mid).join(' ')]
}

/** Cost Allocation donut with in-slice percentage labels. */
export function AllocationDonut({ data, center, size = 190 }: { data: { name: string; value: number; pct: number }[]; center: string; size?: number }) {
  const RAD = Math.PI / 180
  const label = (p: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; index?: number }) => {
    const d = data[p.index ?? 0]
    if (!d || d.pct < 6 || p.cx == null || p.cy == null) return null
    const r = ((p.innerRadius ?? 0) + (p.outerRadius ?? 0)) / 2
    const x = p.cx + r * Math.cos(-(p.midAngle ?? 0) * RAD), y = p.cy + r * Math.sin(-(p.midAngle ?? 0) * RAD)
    return <text x={x} y={y} fill="#fff" fontSize={11} fontWeight={600} textAnchor="middle" dominantBaseline="central">{d.pct}%</text>
  }
  return (
    <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="100%" paddingAngle={1} startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={2} labelLine={false} label={label} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.name} fill={FIN_WS_COLORS[d.name] ?? '#94A3B8'} />)}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={crFmt} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-[17px] font-bold text-ink-900">{center}</span></div>
    </div>
  )
}

/** Monthly Cash Flow – stacked Outflow/Inflow bars + Net Cash Flow line. */
export function CashFlowChart({ rows, height = 200 }: { rows: { month: string; Inflow: number; Outflow: number; Net: number }[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 8, right: 2, left: -8, bottom: 0 }} barCategoryGap="35%">
          <CartesianGrid vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 9.5, fill: '#6B7280' }} interval={0} />
          <YAxis width={40} tickLine={false} axisLine={false} tick={tick} domain={[-0.5, 1.5]} ticks={[-0.5, 0, 0.5, 1.0, 1.5]} tickFormatter={(v: number) => v.toFixed(1)} />
          <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={crFmt} />
          <ReferenceLine y={0} stroke="#CBD5E1" />
          <Bar isAnimationActive={false} dataKey="Outflow" name="Outflow (Spend)" stackId="cf" fill={CHART_COLORS.blue} />
          <Bar isAnimationActive={false} dataKey="Inflow" name="Inflow (Client)" stackId="cf" fill={CHART_COLORS.teal} radius={[3, 3, 0, 0]} />
          <Line isAnimationActive={false} type="monotone" dataKey="Net" name="Net Cash Flow" stroke="#0B2240" strokeWidth={2} dot={{ r: 3.5, fill: '#0B2240', stroke: '#fff', strokeWidth: 1.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Annual Run-rate Projection – stacked bars + Net Run-rate line with value labels. */
export function RunRateChart({ rows, height = 190 }: { rows: { year: string; 'Operating Cost': number; 'Productivity Savings': number; 'Net Run-rate': number }[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 18, right: 12, left: -22, bottom: 0 }} barCategoryGap="38%">
          <CartesianGrid vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} tick={tick} />
          <YAxis tickLine={false} axisLine={false} tick={tick} domain={[0, 15]} ticks={[0, 5, 10, 15]} />
          <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={crFmt} />
          <Bar isAnimationActive={false} dataKey="Operating Cost" stackId="rr" fill="#3B82F6" />
          <Bar isAnimationActive={false} dataKey="Productivity Savings" stackId="rr" fill={CHART_COLORS.green} radius={[3, 3, 0, 0]} />
          <Line isAnimationActive={false} type="monotone" dataKey="Net Run-rate" stroke="#0B2240" strokeWidth={2} dot={{ r: 3.5, fill: '#0B2240', stroke: '#fff', strokeWidth: 1.5 }}>
            <LabelList dataKey="Net Run-rate" position="top" offset={10} formatter={fmt1} style={barLabel} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
