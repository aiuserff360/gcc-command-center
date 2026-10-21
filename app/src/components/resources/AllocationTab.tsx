/**
 * Resource Allocation – business unit is the base view. Pick a unit (cards or dropdown) and see its
 * whole workforce picture: plan vs actual, requisitions and pipeline, people, roles, grades, cost.
 */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Line, ComposedChart } from 'recharts'
import { Plus, Building2, ChevronRight } from 'lucide-react'
import { Card, Badge, Table, Progress } from '../ui'
import { Donut, BarList, tooltipStyle } from '../charts'
import { CHART_COLORS, SERIES, MONTHS, fmtDate } from '../../data/common'
import { useMoney } from '../../data/money'
import { isOpenPosition, positionDaysOpen, reqId, pipelineFor, requisitionStage, type Employee, type Position } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { CardLegend, MiniStat, CompactTable, lakhNum, RoleLink, Funnel } from './widgets'
import { EmployeeForm } from './forms'

export default function AllocationTab({ d, onOpen, initialUnit }: { d: ResourceData; onOpen?: (positionId: string) => void; initialUnit?: string }) {
  const { employees, businessUnits, buNames, buHeadcountRows, hiringTargetRows, peopleCostRows, timeToHireRows, positions, candidatesFor, locations } = d
  const m = useMoney()
  const [selected, setSelected] = useState<string>(initialUnit && buNames.includes(initialUnit) ? initialUnit : buNames[0] ?? '')
  const [emp, setEmp] = useState<Employee | null>(null)
  const [adding, setAdding] = useState(false)
  const bu = buNames.includes(selected) ? selected : buNames[0]

  /* ---- per-unit summary for the selector cards ---- */
  const cards = useMemo(() => buNames.map((name, i) => {
    const hc = buHeadcountRows.find((r) => r.businessUnit === name)
    const unit = businessUnits.items.find((b) => b.name === name)
    const staff = employees.items.filter((e) => e.businessUnit === name)
    const util = staff.length ? Math.round(staff.reduce((s, e) => s + e.allocationPct, 0) / staff.length) : 0
    const open = positions.items.filter((p) => p.businessUnit === name && isOpenPosition(p)).length
    return { name, kind: unit?.kind ?? '', color: SERIES[i % SERIES.length], onboarded: hc?.onboarded ?? 0, inHiring: hc?.inHiring ?? 0, open, y5: unit?.y5 ?? 0, util }
  }), [buNames, buHeadcountRows, businessUnits.items, employees.items, positions.items])

  /* ---- selected unit detail ---- */
  const unit = businessUnits.items.find((b) => b.name === bu)
  const hc = buHeadcountRows.find((r) => r.businessUnit === bu)
  const staff = useMemo(() => employees.items.filter((e) => e.businessUnit === bu), [employees.items, bu])
  const reqs = useMemo(() => positions.items.filter((p) => p.businessUnit === bu).sort((a, b) => Number(isOpenPosition(b)) - Number(isOpenPosition(a)) || positionDaysOpen(b) - positionDaysOpen(a)), [positions.items, bu])
  const openReqs = reqs.filter(isOpenPosition)
  const cands = useMemo(() => openReqs.flatMap((p) => candidatesFor(p.id)), [openReqs, candidatesFor])
  const pipeline = useMemo(() => pipelineFor(cands), [cands])
  const cost = peopleCostRows.find((r) => r.businessUnit === bu)
  const tth = timeToHireRows.find((r) => r.businessUnit === bu)
  const targets = hiringTargetRows.find((r) => r.businessUnit === bu)?.targets ?? Array(12).fill(0)
  const util = staff.length ? Math.round(staff.reduce((s, e) => s + e.allocationPct, 0) / staff.length) : 0
  const fte = +(staff.reduce((s, e) => s + e.allocationPct, 0) / 100).toFixed(1)
  const bench = staff.filter((e) => e.allocationPct < 50).length
  const y5 = unit?.y5 ?? 0, y1 = unit?.y1 ?? 0
  const pctOfTarget = y5 ? Math.round(((hc?.onboarded ?? 0) / y5) * 100) : 0
  const monthly = useMemo(() => { let cum = 0; return MONTHS.map((mo, i) => { cum += targets[i] ?? 0; return { month: mo, 'Hiring target': targets[i] ?? 0, 'Cumulative plan': cum } }) }, [targets])
  const byRole = useMemo(() => { const map = new Map<string, Employee[]>(); staff.forEach((e) => map.set(e.role, [...(map.get(e.role) ?? []), e])); return [...map.entries()].map(([role, list]) => ({ label: role, value: list.length, right: `${list.length} · ${Math.round(list.reduce((s, e) => s + e.allocationPct, 0) / list.length)}%` })).sort((a, b) => b.value - a.value) }, [staff])
  const byGrade = useMemo(() => ['L1', 'L2', 'L3', 'L4', 'L5'].map((g, i) => ({ name: g, value: staff.filter((e) => e.grade === g).length, color: SERIES[i % SERIES.length] })).filter((g) => g.value), [staff])
  const annualCostL = staff.reduce((s, e) => s + e.annualCostL, 0)

  return (
    <>
      {/* ---------- Business unit selector ---------- */}
      <Card title="Resource allocation by business unit" subtitle="Pick a business unit to see its workforce, requisitions, pipeline and cost." headerRight={
        <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 min-w-[300px] cursor-pointer">
          <Building2 size={16} className="text-brand-600" />
          <select value={bu} onChange={(e) => setSelected(e.target.value)} className="flex-1 bg-transparent outline-none text-[13.5px] font-semibold text-ink-900 cursor-pointer">
            {buNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>}>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(cards.length, 7)}, minmax(0, 1fr))` }}>
          {cards.map((c) => (
            <button key={c.name} onClick={() => setSelected(c.name)} className={clsx('text-left rounded-lg border px-3 py-2.5 cursor-pointer transition-colors', c.name === bu ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line bg-white hover:bg-surface')}>
              <div className="flex items-center gap-1.5 mb-1"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} /><span className="text-[12.5px] font-semibold text-ink-900 truncate" title={c.name}>{c.name}</span></div>
              <div className="text-[10.5px] text-ink-500 truncate">{c.kind}</div>
              <div className="mt-1.5 text-[20px] font-bold text-navy-900 leading-none">{c.onboarded}<span className="text-[11px] font-medium text-ink-500"> / {c.y5}</span></div>
              <div className="text-[10.5px] text-ink-500">onboarded / Year 5 target</div>
              <div className="flex items-center gap-2 mt-1.5 text-[10.5px]"><span className="text-brand-600">{c.inHiring} hiring</span><span className="text-ink-400">·</span><span className="text-amber-600">{c.open} open</span><span className="text-ink-400">·</span><span className={c.util >= 80 ? 'text-green-600' : 'text-amber-600'}>{c.util}% util</span></div>
            </button>
          ))}
        </div>
      </Card>

      {/* ---------- Selected unit: header strip ---------- */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><h3 className="text-[18px] font-bold text-navy-900">{bu}</h3>{unit && <Badge value={unit.status} />}{unit && <span className="text-[11.5px] text-ink-500">{unit.kind} · {unit.wave} · owner {unit.owner}</span>}</div>
            {unit?.description && <p className="text-[12.5px] text-ink-700 mt-0.5 max-w-3xl">{unit.description}</p>}
          </div>
          <div className="text-[12px] text-ink-500">Year 1 plan <b className="text-ink-900">{y1}</b> · Year 5 target <b className="text-ink-900">{y5}</b> · <b className={pctOfTarget >= 50 ? 'text-green-600' : 'text-amber-600'}>{pctOfTarget}%</b> of target onboarded</div>
        </div>
        <div className="grid grid-cols-7 gap-3 mt-3">
          <MiniStat label="Onboarded" value={hc?.onboarded ?? 0} sub={`${hc?.inHiring ?? 0} in hiring`} />
          <MiniStat label="Open requisitions" value={openReqs.length} sub={`${openReqs.filter((p) => p.priority === 'Critical' || p.priority === 'High').length} critical / high`} tone={openReqs.length ? 'text-amber-600' : 'text-green-600'} />
          <MiniStat label="Applicants in pipeline" value={cands.filter((c) => c.status === 'In process' || c.status === 'Offer').length} sub={`${cands.length} applied in total`} />
          <MiniStat label="Allocated FTE" value={fte} sub={`${staff.length} people in allocation sample`} />
          <MiniStat label="Average allocation" value={`${util}%`} sub={bench ? `${bench} on bench` : 'nobody on bench'} tone={util >= 80 ? 'text-green-600' : 'text-amber-600'} />
          <MiniStat label="Time to hire" value={`${tth?.actual ?? 0} d`} sub={`target ${tth?.target ?? 0} d`} tone={(tth?.actual ?? 0) > (tth?.target ?? 0) ? 'text-red-600' : 'text-green-600'} />
          <MiniStat label="People cost" value={m.fmt(cost?.actualCr ?? 0)} sub={`of ${m.fmt(cost?.budgetCr ?? 0)} budget`} />
        </div>
      </Card>

      {/* ---------- Plan, roles, grades ---------- */}
      <div className="grid grid-cols-[1.35fr_1fr_0.8fr] gap-4">
        <Card title="Hiring plan for this business unit" subtitle="Monthly hiring targets and the cumulative plan for the year" headerRight={<CardLegend items={[{ label: 'Hiring target', color: CHART_COLORS.blue }, { label: 'Cumulative plan', color: CHART_COLORS.teal }]} />}>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <ComposedChart data={monthly} margin={{ top: 10, right: 8, left: -18, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10.5 }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="Hiring target" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} isAnimationActive={false}><LabelList dataKey="Hiring target" position="top" style={{ fontSize: 10, fill: '#111827' }} /></Bar>
                <Line dataKey="Cumulative plan" stroke={CHART_COLORS.teal} strokeWidth={2} dot={{ r: 2.5, fill: CHART_COLORS.teal, strokeWidth: 0 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Roles in this business unit" subtitle="People per role · average allocation">
          {byRole.length ? <BarList rows={byRole} labelWidth={150} color={CHART_COLORS.blue} /> : <p className="text-[12.5px] text-ink-500 italic py-6 text-center">No employees recorded yet for this unit.</p>}
        </Card>
        <Card title="Grade mix" subtitle="Employees by grade">
          {byGrade.length ? (
            <div className="flex items-center gap-3">
              <Donut size={120} inner={0.68} data={byGrade} center={<><div className="text-[20px] font-bold leading-none">{staff.length}</div><div className="text-[10px] text-ink-500">people</div></>} />
              <div className="space-y-1 text-[12px]">{byGrade.map((g) => <div key={g.name} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />{g.name}<span className="font-semibold ml-auto pl-3">{g.value}</span></div>)}</div>
            </div>
          ) : <p className="text-[12.5px] text-ink-500 italic py-6 text-center">No employees recorded yet.</p>}
        </Card>
      </div>

      {/* ---------- Requisitions and pipeline ---------- */}
      <div className="grid grid-cols-[1.25fr_1fr] gap-4">
        <Card title="Requisitions" subtitle={`${openReqs.length} open · ${reqs.length - openReqs.length} filled or on hold · click a role for applicants and rounds`}>
          <Table<Position> compact rows={reqs} columns={[
            { key: 'id', header: 'Req.', className: 'whitespace-nowrap text-ink-500', render: (r) => reqId(r) },
            { key: 'role', header: 'Role', render: (r) => onOpen ? <RoleLink label={r.role} onClick={() => onOpen(r.id)} /> : <span className="font-medium">{r.role}</span> },
            { key: 'priority', header: 'Priority', render: (r) => <Badge value={r.priority} /> },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
            { key: 'stage', header: 'Stage it is at', className: 'whitespace-nowrap', render: (r) => <span className="text-[12px]">{isOpenPosition(r) ? requisitionStage(candidatesFor(r.id)) : '—'}</span> },
            { key: 'applied', header: 'Applied', className: 'text-right', render: (r) => candidatesFor(r.id).length },
            { key: 'days', header: 'Days open', className: 'text-right', render: (r) => (isOpenPosition(r) ? positionDaysOpen(r) : '—') },
            { key: 'c', header: '', render: () => <ChevronRight size={14} className="text-ink-400" /> },
          ]} empty="No requisitions for this business unit yet." />
        </Card>
        <Card title="Hiring pipeline for this business unit" subtitle="All applicants across its open requisitions, by round">
          {cands.length ? (
            <div className="flex gap-4">
              <Funnel stages={pipeline.map((p) => ({ id: p.id, stage: p.stage, candidates: p.candidates }))} width={110} height={190} />
              <CompactTable rows={pipeline} columns={[
                { key: 'stage', header: 'Round' },
                { key: 'candidates', header: 'Reached', className: 'text-right' },
                { key: 'conv', header: 'Conv. %', className: 'text-right', render: (r) => (r.conv === null ? '—' : <span className={r.conv >= 60 ? 'text-green-600' : r.conv >= 40 ? 'text-amber-600' : 'text-red-600'}>{r.conv}%</span>) },
                { key: 'atStage', header: 'At round now', className: 'text-right', render: (r) => <span className={r.atStage ? 'text-brand-600 font-medium' : 'text-ink-400'}>{r.atStage}</span> },
              ]} />
            </div>
          ) : <p className="text-[12.5px] text-ink-500 italic py-6 text-center">No open requisitions, so no pipeline for this unit.</p>}
        </Card>
      </div>

      {/* ---------- People ---------- */}
      <Card title={`People in ${bu}`} subtitle={`${staff.length} employees · allocated ${fte} FTE · annual cost ${m.fmtLakh(annualCostL)} · click a row to edit`}
        action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> Add Employee</button>}>
        <Table<Employee> compact rows={staff} onRowClick={(r) => setEmp(r)} columns={[
          { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'role', header: 'Role' },
          { key: 'location', header: 'Location' },
          { key: 'grade', header: 'Grade' },
          { key: 'costBand', header: 'Cost Band' },
          { key: 'annualCostL', header: `Annual Cost (${m.lakhUnitLabel})`, className: 'text-right', render: (r) => lakhNum(r.annualCostL, m) },
          { key: 'startDate', header: 'Start Date', className: 'whitespace-nowrap', render: (r) => fmtDate(r.startDate) },
          { key: 'allocationPct', header: 'Allocation', render: (r) => <span className="flex items-center gap-2"><Progress value={r.allocationPct} className="w-[70px]" color={r.allocationPct >= 100 ? '#16A34A' : r.allocationPct >= 50 ? '#F59E0B' : '#DC2626'} /><span className="w-9 text-right">{r.allocationPct}%</span></span> },
          { key: 'state', header: 'Status', render: (r) => <Badge value={r.allocationPct >= 100 ? 'Allocated' : r.allocationPct >= 50 ? 'Partial' : 'Bench'} className={r.allocationPct >= 100 ? 'bg-green-50 text-green-700' : r.allocationPct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'} /> },
        ]} empty="No employees recorded for this business unit yet. Add one to start the allocation view." />
      </Card>

      <EmployeeForm open={adding || !!emp} onClose={() => { setAdding(false); setEmp(null) }} value={emp} businessUnits={[bu, ...buNames.filter((n) => n !== bu)]} locations={locations}
        onSave={(e) => { if (emp) employees.update(e); else employees.add(e); setAdding(false); setEmp(null) }} onDelete={(id) => employees.remove(id)} />
    </>
  )
}
