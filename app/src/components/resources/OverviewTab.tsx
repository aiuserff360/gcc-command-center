import { useMemo, useState } from 'react'
import { BarChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'
import { PencilLine, Pencil } from 'lucide-react'
import { Card, Badge, Progress, ViewAll } from '../ui'
import { Donut, tooltipStyle } from '../charts'
import { CHART_COLORS } from '../../data/common'
import { useStore } from '../../store/useStore'
import { buShort, buAxis, isOpenPosition, positionDaysOpen, type Position, type SkillRow, type TimeToHireRow, type HcView } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { Funnel, WrapTick, StackedHeadcountBars, CardLegend, CompactTable, HC_LEGEND, RoleLink, HcViewToggle, HeadcountChart } from './widgets'
import { NumberGridForm } from './forms'

export function coverageColor(pct: number) { return pct >= 64 ? '#16A34A' : pct >= 50 ? '#F59E0B' : '#DC2626' }

export default function OverviewTab({ d, goTab, onOpen }: { d: ResourceData; goTab: (t: string) => void; onOpen: (positionId: string) => void }) {
  const { buHeadcountRows, locationMix, funnel, timeToHire, timeToHireRows, positions, skills, kpi, candidatesFor, settings, hcSeries, employees, buNames, planYears, reportingMonth } = d
  const setMode = useStore((s) => s.setMode)
  const [view, setView] = useState<HcView>('Year 1 month-wise')
  const [editTth, setEditTth] = useState(false)

  const hcData = hcSeries(view)
  const tthData = timeToHireRows.map((r) => ({ name: buAxis(r.businessUnit), Actual: r.actual, Target: r.target }))
  const utilData = useMemo(() => buNames.map((name) => {
    const staff = employees.items.filter((e) => e.businessUnit === name)
    const avg = staff.length ? Math.round(staff.reduce((s, e) => s + e.allocationPct, 0) / staff.length) : 0
    return { name: buAxis(name), full: name, Allocation: avg, people: staff.length, bench: staff.filter((e) => e.allocationPct < 50).length }
  }), [buNames, employees.items])
  const fcData = useMemo(() => {
    const base = [kpi.y1Target, ...planYears]
    return ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].map((year, i) => ({ year, 'Base Plan': base[i] ?? 0, Accelerated: Math.round((base[i] ?? 0) * (1 + settings.acceleratedPct / 100)), Conservative: Math.round((base[i] ?? 0) * (1 - settings.conservativePct / 100)) }))
  }, [kpi.y1Target, planYears, settings.acceleratedPct, settings.conservativePct])
  const funnelRows = funnel.map((s, i, a) => ({ ...s, conv: i === 0 ? null : a[i - 1].candidates ? Math.round((s.candidates / a[i - 1].candidates) * 100) : 0 }))
  const openPositions = useMemo(() => positions.items.filter(isOpenPosition).sort((a, b) => positionDaysOpen(b) - positionDaysOpen(a)).slice(0, 5), [positions.items])
  const skillRows = skills.items.map((s) => ({ ...s, gap: Math.max(0, s.required - s.available), coverage: s.required ? Math.round((s.available / s.required) * 100) : 0 }))
  const locTotal = kpi.locationTotal
  const lastFc = fcData.length - 1
  const singleLocation = locationMix.items.length === 1
  const fcMax = Math.ceil((Math.max(...fcData.map((f) => f.Accelerated), 100) * 1.08) / 100) * 100

  const endLabel = (color: string) => (p: { x?: number | string; y?: number | string; value?: unknown; index?: number }) =>
    p.index === lastFc ? <text x={Number(p.x ?? 0) + 8} y={Number(p.y ?? 0) + 4} fontSize={11.5} fontWeight={700} fill={color}>{String(p.value ?? '')}</text> : <g />

  return (
    <>
      {/* Row 1 */}
      <div className="grid grid-cols-[1.5fr_1.4fr_1.05fr] gap-4">
        <Card title={<span className="whitespace-nowrap">Headcount Plan vs Actual</span>}
          headerRight={<HcViewToggle value={view} onChange={setView} />}
          action={<button className="text-ink-400 hover:text-brand-600 cursor-pointer -ml-1" title="Update headcount actuals by capability (Input view)" onClick={() => setMode('input')}><PencilLine size={13} /></button>}>
          <div className="flex items-center justify-between gap-2 -mt-1 mb-1">
            <CardLegend items={[{ label: 'Planned', color: '#9CC3F7' }, { label: 'Actual', color: CHART_COLORS.blue }, { label: `Target ${settings.fteTarget}`, color: CHART_COLORS.green, dashed: true }]} />
            <span className="text-[11px] text-ink-500 whitespace-nowrap">{view === 'Year 1 month-wise' ? `Actual to ${reportingMonth} · ${kpi.onboarded} vs plan ${kpi.planned}` : 'Annual exit headcount · plan only'}</span>
          </div>
          <HeadcountChart data={hcData} view={view} target={settings.fteTarget} height={182} reportingMonth={reportingMonth} />
        </Card>
        <Card title={<span className="whitespace-nowrap">Headcount by Business Unit</span>} subtitle="Click a business unit to expand its capabilities"
          action={<button className="text-ink-400 hover:text-brand-600 cursor-pointer -ml-1" title="Edit actuals and requisitions in the Input view" onClick={() => setMode('input')}><PencilLine size={13} /></button>}>
          <div className="flex justify-end -mt-1 mb-2"><CardLegend items={HC_LEGEND} /></div>
          <StackedHeadcountBars rows={buHeadcountRows} labelWidth={168} />
        </Card>
        <Card title="Location Mix" subtitle={singleLocation ? 'Single location – Pune hosts the whole GCC' : undefined}>
          <div className="flex items-center gap-4">
            <Donut size={150} inner={0.62} data={locationMix.items.map((l) => ({ name: l.name, value: l.ftes, color: l.color }))}
              center={<><div className="text-[24px] font-bold text-ink-900 leading-none">{locTotal}</div><div className="text-[11px] text-ink-500 mt-1">FTEs</div></>} />
            <div className="flex-1 space-y-2.5">
              {locationMix.items.map((l) => (
                <button key={l.id} onClick={() => goTab('Location Mix')} className="w-full flex items-center gap-2 text-[12.5px] cursor-pointer hover:bg-surface rounded px-1">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
                  <span className="text-ink-700 flex-1 text-left">{l.name}</span>
                  <span className="text-ink-500 w-10 text-right">{locTotal ? Math.round((l.ftes / locTotal) * 100) : 0}%</span>
                  <span className="font-semibold text-ink-900 w-8 text-right">{l.ftes}</span>
                </button>
              ))}
              {singleLocation && <div className="text-[11.5px] text-ink-500 px-1 pt-1">{locationMix.items[0].seats} seats · {locationMix.items[0].seats ? Math.round((locationMix.items[0].ftes / locationMix.items[0].seats) * 100) : 0}% seat utilisation<br /><button className="link" onClick={() => goTab('Location Mix')}>Add a second location</button></div>}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-[1.42fr_1.28fr_1.3fr] gap-4">
        <Card title="Hiring Pipeline" subtitle="Aggregated from the candidates of every requisition" action={<ViewAll label="Requisitions" onClick={() => goTab('Hiring Plan & Pipeline')} />}>
          <div className="flex items-start gap-2">
            <Funnel stages={funnel} width={110} height={165} />
            <div className="flex-1 min-w-0">
              <CompactTable rows={funnelRows} columns={[
                { key: 'stage', header: 'Stage', className: 'whitespace-nowrap' },
                { key: 'candidates', header: 'Candidates', render: (r) => r.candidates.toLocaleString('en-IN') },
                { key: 'conv', header: 'Conversion %', render: (r) => (r.conv === null ? '-' : `${r.conv}%`) },
              ]} />
            </div>
          </div>
        </Card>
        <Card title="Time to Hire (Days)" subtitle="By business unit" headerRight={<CardLegend items={[{ label: 'Actual', color: CHART_COLORS.blue }, { label: 'Target', color: '#9CC3F7', hollow: true }]} />}
          action={<button className="text-ink-400 hover:text-brand-600 cursor-pointer" title="Edit time to hire" onClick={() => setEditTth(true)}><Pencil size={13} /></button>}>
          <div className="h-[170px]">
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
        <Card title={<span className="whitespace-nowrap">Resource Utilisation</span>} subtitle="Average allocation of onboarded people, by business unit" action={<ViewAll label="Allocation" onClick={() => goTab('Resource Allocation')} />}>
          <div className="h-[170px]">
            <ResponsiveContainer>
              <BarChart data={utilData} margin={{ top: 14, right: 4, left: -24, bottom: 14 }} barCategoryGap="32%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={<WrapTick size={10} />} height={30} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v, _n, item) => [`${v}% · ${(item?.payload as { people: number }).people} people · ${(item?.payload as { bench: number }).bench} on bench`, 'Allocation']} labelFormatter={(_l, p) => String((p?.[0]?.payload as { full?: string })?.full ?? _l)} />
                <Bar dataKey="Allocation" radius={[3, 3, 0, 0]}>
                  {utilData.map((u) => <Cell key={u.full} fill={u.Allocation >= 80 ? CHART_COLORS.blue : CHART_COLORS.amber} />)}
                  <LabelList dataKey="Allocation" position="top" formatter={(v: unknown) => `${v}%`} style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-[1.5fr_1.28fr_1.02fr] gap-4">
        <Card title="Open Positions (Priority)" action={<ViewAll onClick={() => goTab('Hiring Plan & Pipeline')} />}>
          <CompactTable<Position> rows={openPositions} columns={[
            { key: 'role', header: 'Role', className: 'whitespace-nowrap', render: (r) => <RoleLink label={r.role} onClick={() => onOpen(r.id)} /> },
            { key: 'businessUnit', header: 'Business unit', className: 'whitespace-nowrap', render: (r) => <span title={r.businessUnit}>{buShort(r.businessUnit)}</span> },
            { key: 'capability', header: 'Capability', className: 'whitespace-nowrap' },
            { key: 'priority', header: 'Priority', render: (r) => <Badge value={r.priority} /> },
            { key: 'days', header: 'Days Open', className: 'text-right whitespace-nowrap', render: (r) => <span title={`${candidatesFor(r.id).length} applied`}>{positionDaysOpen(r)}</span> },
          ]} />
        </Card>
        <Card title="Skills Availability" action={<ViewAll label="View Details" onClick={() => goTab('Skills & Capability')} />}>
          <CompactTable<SkillRow & { gap: number; coverage: number }> rows={skillRows.slice(0, 7)} onRowClick={() => goTab('Skills & Capability')} columns={[
            { key: 'category', header: 'Skill Category', className: 'whitespace-nowrap', render: (r) => <span title={r.category}>{r.category.replace(/\s*\(.*\)/, '')}</span> },
            { key: 'required', header: 'Required' },
            { key: 'available', header: 'Available' },
            { key: 'gap', header: 'Gap', render: (r) => <span className="text-red-600 font-medium">{r.gap}</span> },
            { key: 'coverage', header: 'Coverage', render: (r) => <span className="flex items-center gap-1.5"><Progress value={r.coverage} color={coverageColor(r.coverage)} className="w-[34px]" /><span className="w-8 text-right">{r.coverage}%</span></span> },
          ]} />
        </Card>
        <Card title="Forecasted Headcount" subtitle="Annual exit headcount, years 1–5" action={<ViewAll label="Scenarios" onClick={() => setMode('input')} />}>
          <CardLegend items={[{ label: 'Base Plan', color: CHART_COLORS.blue }, { label: `Accelerated +${settings.acceleratedPct}%`, color: CHART_COLORS.green }, { label: `Conservative −${settings.conservativePct}%`, color: CHART_COLORS.orange }]} />
          <div className="h-[170px] mt-2">
            <ResponsiveContainer>
              <LineChart data={fcData} margin={{ top: 10, right: 34, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} width={32} domain={[0, fcMax]} />
                <Tooltip {...tooltipStyle} />
                <Line dataKey="Accelerated" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.green, strokeWidth: 0 }} label={endLabel(CHART_COLORS.green)} isAnimationActive={false} />
                <Line dataKey="Base Plan" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.blue, strokeWidth: 0 }} label={endLabel(CHART_COLORS.blue)} isAnimationActive={false} />
                <Line dataKey="Conservative" stroke={CHART_COLORS.orange} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.orange, strokeWidth: 0 }} label={endLabel(CHART_COLORS.orange)} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <NumberGridForm<TimeToHireRow> open={editTth} onClose={() => setEditTth(false)} title="Time to Hire (Days) by business unit" rows={timeToHireRows} labelKey="businessUnit" fields={[{ key: 'actual', label: 'Actual' }, { key: 'target', label: 'Target' }]} onSave={(rows) => timeToHire.setAll(rows)} />
    </>
  )
}
