import { useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine } from 'recharts'
import { Plus } from 'lucide-react'
import { Card, Badge, Table, FilterSelect, Progress } from '../ui'
import { tooltipStyle } from '../charts'
import { CHART_COLORS, fmtDate } from '../../data/common'
import { FUNCTIONS, RES_LOCATIONS, fnShort, type Employee } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { CardLegend, MiniStat, CompactTable } from './widgets'
import { EmployeeForm } from './forms'

export default function AllocationTab({ d }: { d: ResourceData }) {
  const { employees, headcountPlan, workstreamHeadcount, kpi } = d
  const [emp, setEmp] = useState<Employee | null>(null)
  const [adding, setAdding] = useState(false)
  const [fWs, setFWs] = useState('All')
  const [fLoc, setFLoc] = useState('All')

  const byWs = useMemo(() => FUNCTIONS.map((ws) => {
    const list = employees.items.filter((e) => e.workstream === ws)
    const avg = list.length ? Math.round(list.reduce((s, e) => s + e.allocationPct, 0) / list.length) : 0
    return { workstream: ws, name: fnShort(ws), people: list.length, onboarded: workstreamHeadcount.items.find((w) => w.workstream === ws)?.onboarded ?? 0, avg, full: list.filter((e) => e.allocationPct >= 100).length, bench: list.filter((e) => e.allocationPct < 50).length, fte: +(list.reduce((s, e) => s + e.allocationPct, 0) / 100).toFixed(1) }
  }), [employees.items, workstreamHeadcount.items])
  const overallUtil = employees.items.length ? Math.round(employees.items.reduce((s, e) => s + e.allocationPct, 0) / employees.items.length) : 0
  const bench = employees.items.filter((e) => e.allocationPct < 50).length
  const partial = employees.items.filter((e) => e.allocationPct >= 50 && e.allocationPct < 100).length
  const utilData = headcountPlan.items.map((m) => ({ month: m.month, Planned: m.plannedUtil, Actual: m.actualUtil }))
  const rows = employees.items.filter((e) => fWs === 'All' || e.workstream === fWs).filter((e) => fLoc === 'All' || e.location === fLoc)

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <MiniStat label="Employees in allocation sample" value={employees.items.length} sub={`of ${kpi.onboarded} onboarded FTEs`} />
        <MiniStat label="Average allocation" value={`${overallUtil}%`} sub="Billable / project allocation" tone={overallUtil >= 80 ? 'text-green-600' : 'text-amber-600'} />
        <MiniStat label="Fully allocated" value={employees.items.filter((e) => e.allocationPct >= 100).length} sub="100% allocated" />
        <MiniStat label="Partially allocated" value={partial} sub="50–99%" tone="text-amber-600" />
        <MiniStat label="On bench (< 50%)" value={bench} sub="Available for redeployment" tone={bench > 0 ? 'text-red-600' : 'text-green-600'} />
      </div>

      <div className="grid grid-cols-[1.45fr_1.1fr_1fr] gap-4">
        <Card title="Allocation by Workstream" subtitle="People in sample, allocated FTE and average allocation %">
          <CompactTable rows={byWs.map((r) => ({ ...r, id: r.workstream }))} columns={[
            { key: 'workstream', header: 'Workstream', className: 'whitespace-nowrap', render: (r) => r.name },
            { key: 'onboarded', header: 'Onboarded', className: 'text-right' },
            { key: 'people', header: 'People', className: 'text-right' },
            { key: 'fte', header: 'Allocated FTE', className: 'text-right' },
            { key: 'avg', header: 'Utilization', render: (r) => <span className="flex items-center gap-2"><Progress value={r.avg} className="w-[70px]" /><span className="w-9 text-right">{r.avg}%</span></span> },
            { key: 'bench', header: 'Bench', className: 'text-right', render: (r) => <span className={r.bench ? 'text-red-600 font-medium' : ''}>{r.bench}</span> },
          ]} />
        </Card>
        <Card title="Utilization by Workstream (%)" subtitle="Dashed line = 85% target">
          <div className="h-[230px]">
            <ResponsiveContainer>
              <BarChart data={byWs} layout="vertical" margin={{ top: 4, right: 30, left: 0, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={92} tick={{ fontSize: 11 }} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`${v}%`, 'Utilization']} />
                <ReferenceLine x={85} stroke={CHART_COLORS.green} strokeDasharray="4 3" />
                <Bar dataKey="avg" fill={CHART_COLORS.blue} radius={[0, 3, 3, 0]} barSize={14}><LabelList dataKey="avg" position="right" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} formatter={(v: unknown) => `${v}%`} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Resource Utilization (Ramp-up)" headerRight={<CardLegend items={[{ label: 'Planned', color: '#5B9BF0', dashed: true }, { label: 'Actual', color: CHART_COLORS.blue, dashed: true }]} />}>
          <div className="h-[230px]">
            <ResponsiveContainer>
              <LineChart data={utilData} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`]} />
                <Line dataKey="Planned" stroke="#5B9BF0" strokeWidth={2} dot={{ r: 3, fill: '#5B9BF0', strokeWidth: 0 }} />
                <Line dataKey="Actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.blue, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Team Allocation" subtitle={`${rows.length} employees · click a row to edit`}
        action={<div className="flex items-center gap-2">
          <FilterSelect label="Workstream" value={fWs} options={['All', ...FUNCTIONS]} onChange={setFWs} />
          <FilterSelect label="Location" value={fLoc} options={['All', ...RES_LOCATIONS]} onChange={setFLoc} />
          <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> Add Employee</button>
        </div>}>
        <Table<Employee> compact rows={rows} onRowClick={(r) => setEmp(r)} columns={[
          { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'role', header: 'Role' },
          { key: 'workstream', header: 'Workstream', render: (r) => fnShort(r.workstream) },
          { key: 'location', header: 'Location' },
          { key: 'grade', header: 'Grade' },
          { key: 'costBand', header: 'Cost Band' },
          { key: 'annualCostL', header: 'Annual Cost (₹ L)', className: 'text-right' },
          { key: 'startDate', header: 'Start Date', render: (r) => fmtDate(r.startDate) },
          { key: 'allocationPct', header: 'Allocation', render: (r) => <span className="flex items-center gap-2"><Progress value={r.allocationPct} className="w-[70px]" color={r.allocationPct >= 100 ? '#16A34A' : r.allocationPct >= 50 ? '#F59E0B' : '#DC2626'} /><span className="w-9 text-right">{r.allocationPct}%</span></span> },
          { key: 'state', header: 'Status', render: (r) => <Badge value={r.allocationPct >= 100 ? 'Allocated' : r.allocationPct >= 50 ? 'Partial' : 'Bench'} className={r.allocationPct >= 100 ? 'bg-green-50 text-green-700' : r.allocationPct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'} /> },
        ]} />
      </Card>

      <EmployeeForm open={adding || !!emp} onClose={() => { setAdding(false); setEmp(null) }} value={emp} onSave={(e) => { if (emp) employees.update(e); else employees.add(e); setAdding(false); setEmp(null) }} onDelete={(id) => employees.remove(id)} />
    </>
  )
}
