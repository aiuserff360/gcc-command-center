import { useMemo, useState } from 'react'
import { ComposedChart, BarChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine } from 'recharts'
import { Pencil } from 'lucide-react'
import { Card, Badge, Progress, ViewAll } from '../ui'
import { Donut, tooltipStyle } from '../charts'
import { CHART_COLORS } from '../../data/common'
import { fnShort, isOpenPosition, positionDaysOpen, type Position, type SkillRow, type ViewBy, type WorkstreamHeadcount, type HeadcountMonth, type ForecastQuarter } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { Funnel, WrapTick, StackedHeadcountBars, CardLegend, CompactTable, HC_LEGEND } from './widgets'
import { HeadcountActualsForm, NumberGridForm, PositionForm } from './forms'

export function coverageColor(pct: number) { return pct >= 64 ? '#16A34A' : pct >= 50 ? '#F59E0B' : '#DC2626' }

export default function OverviewTab({ d, viewBy, goTab }: { d: ResourceData; viewBy: ViewBy; goTab: (t: string) => void }) {
  const { headcountPlan, workstreamHeadcount, locationMix, hiringFunnel, timeToHire, positions, skills, headcountForecast, kpi, settings } = d
  const [editHc, setEditHc] = useState(false)
  const [editWs, setEditWs] = useState(false)
  const [editFunnel, setEditFunnel] = useState(false)
  const [editTth, setEditTth] = useState(false)
  const [editFc, setEditFc] = useState(false)
  const [pos, setPos] = useState<Position | null>(null)

  // "View by" conversion: FTE → ₹ Cr (cost per FTE) → seats (seat ratio)
  const unit = viewBy === 'Cost' ? '₹ Cr' : viewBy === 'Seats' ? 'Seats' : 'FTEs'
  const conv = (n: number) => (viewBy === 'Cost' ? +(n * kpi.costPerFteCr).toFixed(1) : viewBy === 'Seats' ? Math.round(n * settings.seatRatio) : n)
  const fmtUnit = (n: number) => (viewBy === 'Cost' ? `₹ ${n} Cr` : String(n))

  const hcData = useMemo(() => headcountPlan.items.map((m) => ({ month: m.month, Planned: conv(m.planned), Actual: conv(m.actual), Target: conv(m.target) })), [headcountPlan.items, viewBy, kpi.costPerFteCr, settings.seatRatio]) // eslint-disable-line react-hooks/exhaustive-deps
  const hcMax = Math.max(500, Math.ceil(Math.max(0, ...hcData.flatMap((d) => [d.Planned, d.Actual, d.Target])) / 100) * 100)
  const hcTicks = Array.from({ length: hcMax / 100 + 1 }, (_, i) => i * 100)
  const utilData = headcountPlan.items.map((m) => ({ month: m.month, Planned: m.plannedUtil, Actual: m.actualUtil }))
  const tthData = timeToHire.items.map((r) => ({ name: fnShort(r.workstream), Actual: r.actual, Target: r.target }))
  const fcData = headcountForecast.items.map((q) => ({ quarter: q.quarter, 'Base Plan': q.base, Accelerated: q.accelerated, Conservative: q.conservative }))
  const funnelRows = hiringFunnel.items.map((s, i, a) => ({ ...s, conv: i === 0 ? null : a[i - 1].candidates ? Math.round((s.candidates / a[i - 1].candidates) * 100) : 0 }))
  const openPositions = useMemo(() => positions.items.filter(isOpenPosition).sort((a, b) => positionDaysOpen(b) - positionDaysOpen(a)).slice(0, 5), [positions.items])
  const skillRows = skills.items.map((s) => ({ ...s, gap: Math.max(0, s.required - s.available), coverage: s.required ? Math.round((s.available / s.required) * 100) : 0 }))
  const locTotal = kpi.locationTotal
  const curIdx = headcountPlan.items.findIndex((m) => m.month === kpi.currentMonth)
  const lastFc = fcData.length - 1

  const endLabel = (color: string) => (p: { x?: number | string; y?: number | string; value?: unknown; index?: number }) =>
    p.index === lastFc ? <text x={Number(p.x ?? 0) + 8} y={Number(p.y ?? 0) + 4} fontSize={11.5} fontWeight={700} fill={color}>{String(p.value ?? '')}</text> : <g />

  return (
    <>
      {/* Row 1 */}
      <div className="grid grid-cols-[1.5fr_1.4fr_1.05fr] gap-4">
        <Card title={<span className="whitespace-nowrap">Headcount Plan vs Actual</span>} subtitle={viewBy !== 'FTE Headcount' ? `Shown in ${unit}` : undefined}
          headerRight={<CardLegend items={[{ label: 'Planned', color: '#9CC3F7' }, { label: 'Actual', color: CHART_COLORS.blue }, { label: 'Target', color: CHART_COLORS.green, dashed: true }]} />}
          action={<button className="text-ink-400 hover:text-brand-600 cursor-pointer -ml-1" title="Update monthly headcount actuals" onClick={() => setEditHc(true)}><Pencil size={13} /></button>}>
          <div className="h-[190px]">
            <ResponsiveContainer>
              <ComposedChart data={hcData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={2} barCategoryGap="28%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={viewBy === 'Cost' ? [0, 'auto'] : [0, hcMax]} ticks={viewBy === 'Cost' ? undefined : hcTicks} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [fmtUnit(v as number)]} />
                <Bar dataKey="Planned" fill="#9CC3F7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} />
                <Line dataKey="Target" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ r: 3.5, fill: CHART_COLORS.green, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title={<span className="whitespace-nowrap">Headcount by Workstream</span>} headerRight={<CardLegend items={HC_LEGEND} />}>
          <StackedHeadcountBars rows={workstreamHeadcount.items} labelWidth={162} onRowClick={() => setEditWs(true)} />
        </Card>
        <Card title="Location Mix">
          <div className="flex items-center gap-4">
            <Donut size={150} inner={0.62} data={locationMix.items.map((l) => ({ name: l.name, value: l.ftes, color: l.color }))}
              center={<><div className="text-[24px] font-bold text-ink-900 leading-none">{conv(locTotal)}</div><div className="text-[11px] text-ink-500 mt-1">{unit}</div></>} />
            <div className="flex-1 space-y-2.5">
              {locationMix.items.map((l) => (
                <button key={l.id} onClick={() => goTab('Location Mix')} className="w-full flex items-center gap-2 text-[12.5px] cursor-pointer hover:bg-surface rounded px-1">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
                  <span className="text-ink-700 flex-1 text-left">{l.name}</span>
                  <span className="text-ink-500 w-9 text-right">{locTotal ? Math.round((l.ftes / locTotal) * 100) : 0}%</span>
                  <span className="font-semibold text-ink-900 w-8 text-right">{l.ftes}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-[1.42fr_1.28fr_1.3fr] gap-4">
        <Card title="Hiring Pipeline" action={<button className="text-ink-400 hover:text-brand-600 cursor-pointer" title="Update stage counts" onClick={() => setEditFunnel(true)}><Pencil size={13} /></button>}>
          <div className="flex items-start gap-2">
            <Funnel stages={hiringFunnel.items} width={110} height={165} />
            <div className="flex-1 min-w-0">
              <CompactTable rows={funnelRows} columns={[
                { key: 'stage', header: 'Stage', className: 'whitespace-nowrap' },
                { key: 'candidates', header: 'Candidates', render: (r) => r.candidates.toLocaleString('en-IN') },
                { key: 'conv', header: 'Conversion %', render: (r) => (r.conv === null ? '-' : `${r.conv}%`) },
              ]} />
            </div>
          </div>
        </Card>
        <Card title="Time to Hire (Days)" headerRight={<CardLegend items={[{ label: 'Actual', color: CHART_COLORS.blue }, { label: 'Target', color: '#9CC3F7', hollow: true }]} />}
          action={<button className="text-ink-400 hover:text-brand-600 cursor-pointer" title="Edit time to hire" onClick={() => setEditTth(true)}><Pencil size={13} /></button>}>
          <div className="h-[185px]">
            <ResponsiveContainer>
              <BarChart data={tthData} margin={{ top: 14, right: 4, left: -24, bottom: 14 }} barGap={3} barCategoryGap="30%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={<WrapTick size={10} />} height={30} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 80]} ticks={[0, 20, 40, 60, 80]} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]}><LabelList dataKey="Actual" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
                <Bar dataKey="Target" fill="#EAF2FC" stroke="#9CC3F7" strokeWidth={1.5} radius={[3, 3, 0, 0]}><LabelList dataKey="Target" position="top" style={{ fontSize: 11, fill: '#374151' }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title={<span className="whitespace-nowrap">Resource Utilization (Ramp-up)</span>} headerRight={<CardLegend items={[{ label: 'Planned', color: '#5B9BF0', dashed: true }, { label: 'Actual', color: CHART_COLORS.blue, dashed: true }]} />}>
          <div className="h-[185px]">
            <ResponsiveContainer>
              <LineChart data={utilData} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v}%`, n === 'Planned' ? 'Plan' : String(n)]} labelFormatter={(l) => `${l} 2026`} defaultIndex={curIdx >= 0 ? curIdx : undefined} />
                {curIdx >= 0 && <ReferenceLine x={headcountPlan.items[curIdx].month} stroke="#CBD5E1" strokeDasharray="4 3" />}
                <Line dataKey="Planned" stroke="#5B9BF0" strokeWidth={2} dot={{ r: 3.5, fill: '#5B9BF0', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line dataKey="Actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3.5, fill: CHART_COLORS.blue, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-[1.5fr_1.28fr_1.02fr] gap-4">
        <Card title="Open Positions (Priority)" action={<ViewAll onClick={() => goTab('Hiring Plan & Pipeline')} />}>
          <CompactTable<Position> rows={openPositions} onRowClick={(r) => setPos(r)} columns={[
            { key: 'role', header: 'Role', className: 'whitespace-nowrap', render: (r) => <span className="font-medium">{r.role}</span> },
            { key: 'workstream', header: 'Workstream', className: 'whitespace-nowrap', render: (r) => fnShort(r.workstream) },
            { key: 'location', header: 'Location' },
            { key: 'priority', header: 'Priority', render: (r) => <Badge value={r.priority} /> },
            { key: 'days', header: 'Days Open', className: 'text-right', render: (r) => positionDaysOpen(r) },
          ]} />
        </Card>
        <Card title="Skills Availability" action={<ViewAll label="View Details" onClick={() => goTab('Skills & Capability')} />}>
          <CompactTable<SkillRow & { gap: number; coverage: number }> rows={skillRows} onRowClick={() => goTab('Skills & Capability')} columns={[
            { key: 'category', header: 'Skill Category', className: 'whitespace-nowrap' },
            { key: 'required', header: 'Required' },
            { key: 'available', header: 'Available' },
            { key: 'gap', header: 'Gap', render: (r) => <span className="text-red-600 font-medium">{r.gap}</span> },
            { key: 'coverage', header: 'Coverage', render: (r) => <span className="flex items-center gap-1.5"><Progress value={r.coverage} color={coverageColor(r.coverage)} className="w-[34px]" /><span className="w-8 text-right">{r.coverage}%</span></span> },
          ]} />
        </Card>
        <Card title="Forecasted Headcount" action={<ViewAll label="View Details" onClick={() => setEditFc(true)} />}>
          <CardLegend items={[{ label: 'Base Plan', color: CHART_COLORS.blue }, { label: 'Accelerated', color: CHART_COLORS.green }, { label: 'Conservative', color: CHART_COLORS.orange }]} />
          <div className="h-[170px] mt-2">
            <ResponsiveContainer>
              <LineChart data={fcData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="quarter" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 9.5 }} />
                <YAxis tickLine={false} axisLine={false} width={32} domain={[0, 600]} ticks={[0, 100, 200, 300, 400, 500, 600]} />
                <Tooltip {...tooltipStyle} />
                <Line dataKey="Accelerated" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.green, strokeWidth: 0 }} label={endLabel(CHART_COLORS.green)} />
                <Line dataKey="Base Plan" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.blue, strokeWidth: 0 }} label={endLabel(CHART_COLORS.blue)} />
                <Line dataKey="Conservative" stroke={CHART_COLORS.orange} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.orange, strokeWidth: 0 }} label={endLabel(CHART_COLORS.orange)} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <HeadcountActualsForm open={editHc} onClose={() => setEditHc(false)} rows={headcountPlan.items} onSave={(rows: HeadcountMonth[]) => headcountPlan.setAll(rows)} />
      <NumberGridForm<WorkstreamHeadcount> open={editWs} onClose={() => setEditWs(false)} title="Headcount by Workstream" rows={workstreamHeadcount.items} labelKey="workstream" fields={[{ key: 'onboarded', label: 'Onboarded' }, { key: 'inHiring', label: 'In Hiring' }, { key: 'open', label: 'Open' }]} onSave={(rows) => workstreamHeadcount.setAll(rows)} />
      <NumberGridForm open={editFunnel} onClose={() => setEditFunnel(false)} title="Hiring Pipeline – stage counts" rows={hiringFunnel.items} labelKey="stage" fields={[{ key: 'candidates', label: 'Candidates' }]} onSave={(rows) => hiringFunnel.setAll(rows)} hint="Conversion % is derived from the previous stage." />
      <NumberGridForm open={editTth} onClose={() => setEditTth(false)} title="Time to Hire (Days)" rows={timeToHire.items} labelKey="workstream" fields={[{ key: 'actual', label: 'Actual' }, { key: 'target', label: 'Target' }]} onSave={(rows) => timeToHire.setAll(rows)} />
      <NumberGridForm<ForecastQuarter> open={editFc} onClose={() => setEditFc(false)} title="Forecasted Headcount scenarios" rows={headcountForecast.items} labelKey="quarter" fields={[{ key: 'base', label: 'Base Plan' }, { key: 'accelerated', label: 'Accelerated' }, { key: 'conservative', label: 'Conservative' }]} onSave={(rows) => headcountForecast.setAll(rows)} />
      <PositionForm open={!!pos} onClose={() => setPos(null)} value={pos} onSave={(p) => { positions.update(p); setPos(null) }} onDelete={(id) => positions.remove(id)} />
    </>
  )
}
