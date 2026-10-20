import { useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Plus, Pencil } from 'lucide-react'
import { Card, Badge } from '../ui'
import { Donut, tooltipStyle } from '../charts'
import { CHART_COLORS, SERIES, fmtDate } from '../../data/common'
import { EXIT_REASONS, fnShort, type ExitRecord, type RetentionAction, type AttritionMonth } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { CardLegend, MiniStat, CompactTable } from './widgets'
import { ExitForm, RetentionActionForm, NumberGridForm } from './forms'

export default function AttritionTab({ d }: { d: ResourceData }) {
  const { attrition, exits, retentionActions, kpi } = d
  const [exit, setExit] = useState<ExitRecord | null>(null)
  const [addExit, setAddExit] = useState(false)
  const [act, setAct] = useState<RetentionAction | null>(null)
  const [addAct, setAddAct] = useState(false)
  const [editTrend, setEditTrend] = useState(false)

  const latest = attrition.items[attrition.items.length - 1]
  const exitsYtd = attrition.items.reduce((s, m) => s + m.exits, 0)
  const regrettedYtd = attrition.items.reduce((s, m) => s + m.regretted, 0)
  const regrettedPct = exits.items.length ? Math.round((exits.items.filter((e) => e.regretted).length / exits.items.length) * 100) : 0
  const avgTenure = exits.items.length ? (exits.items.reduce((s, e) => s + e.tenureMonths, 0) / exits.items.length).toFixed(1) : '0'
  const trend = attrition.items.map((m) => ({ month: m.month, 'Attrition rate': m.ratePct, Benchmark: m.benchmarkPct, Exits: m.exits }))
  const reasons = EXIT_REASONS.map((r, i) => ({ name: r, value: exits.items.filter((e) => e.reason === r).length, color: SERIES[i % SERIES.length] })).filter((r) => r.value > 0)
  const sortedExits = [...exits.items].sort((a, b) => b.exitDate.localeCompare(a.exitDate))

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <MiniStat label="Annualised attrition" value={`${latest?.ratePct ?? 0}%`} sub={`Benchmark ${latest?.benchmarkPct ?? 12}% · ${latest?.month ?? ''} 2026`} tone={(latest?.ratePct ?? 0) > (latest?.benchmarkPct ?? 12) ? 'text-red-600' : 'text-green-600'} />
        <MiniStat label="Exits YTD" value={exitsYtd} sub={`of ${kpi.onboarded} onboarded`} />
        <MiniStat label="Regretted exits YTD" value={regrettedYtd} sub={`${regrettedPct}% of register is regretted`} tone="text-red-600" />
        <MiniStat label="Avg tenure at exit" value={`${avgTenure} mo`} sub="Exit register" />
        <MiniStat label="Retention actions" value={retentionActions.items.filter((a) => a.status !== 'Completed').length} sub={`${retentionActions.items.filter((a) => a.status === 'Completed').length} completed`} tone="text-brand-600" />
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <Card title="Attrition Rate Trend (2026)" headerRight={<CardLegend items={[{ label: 'Attrition rate', color: CHART_COLORS.blue, dashed: true }, { label: 'Benchmark', color: CHART_COLORS.red, dashed: true }, { label: 'Exits', color: '#D6E4F7' }]} />}
          action={<button className="link inline-flex items-center gap-1" onClick={() => setEditTrend(true)}><Pencil size={12} /> Update</button>}>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <ComposedChart data={trend} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis yAxisId="rate" tickLine={false} axisLine={false} domain={[0, 16]} tickFormatter={(v) => `${v}%`} />
                <YAxis yAxisId="exits" orientation="right" tickLine={false} axisLine={false} domain={[0, 12]} hide />
                <Tooltip {...tooltipStyle} formatter={(v, n) => [n === 'Exits' ? v : `${v}%`, String(n)]} />
                <Bar yAxisId="exits" dataKey="Exits" fill="#D6E4F7" radius={[3, 3, 0, 0]} barSize={18}><LabelList dataKey="Exits" position="top" style={{ fontSize: 10.5, fill: '#6B7280' }} /></Bar>
                <Line yAxisId="rate" dataKey="Benchmark" stroke={CHART_COLORS.red} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                <Line yAxisId="rate" dataKey="Attrition rate" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.blue, strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Exit Reasons">
          <div className="flex items-center gap-4">
            <Donut size={150} inner={0.62} data={reasons} center={<><div className="text-[24px] font-bold text-ink-900 leading-none">{exits.items.length}</div><div className="text-[11px] text-ink-500 mt-1">exits</div></>} />
            <div className="flex-1 space-y-2">
              {reasons.map((r) => (
                <div key={r.name} className="flex items-center gap-2 text-[12.5px]"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} /><span className="flex-1 text-ink-700">{r.name}</span><span className="font-semibold">{r.value}</span></div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[1.8fr_1fr] gap-4">
        <Card title="Exits Register" subtitle="Click a row to edit" action={<button className="btn-primary" onClick={() => setAddExit(true)}><Plus size={14} /> Record Exit</button>}>
          <CompactTable<ExitRecord> rows={sortedExits} onRowClick={(r) => setExit(r)} columns={[
            { key: 'name', header: 'Name', className: 'whitespace-nowrap', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'role', header: 'Role' },
            { key: 'workstream', header: 'Workstream', className: 'whitespace-nowrap', render: (r) => fnShort(r.workstream) },
            { key: 'location', header: 'Location' },
            { key: 'exitDate', header: 'Exit Date', className: 'whitespace-nowrap', render: (r) => fmtDate(r.exitDate) },
            { key: 'tenureMonths', header: 'Tenure', className: 'text-right', render: (r) => `${r.tenureMonths} mo` },
            { key: 'reason', header: 'Reason', className: 'whitespace-nowrap' },
            { key: 'regretted', header: 'Regretted', render: (r) => <Badge value={r.regretted ? 'Yes' : 'No'} className={r.regretted ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'} /> },
          ]} />
        </Card>
        <Card title="Retention Actions" action={<button className="btn-primary" onClick={() => setAddAct(true)}><Plus size={14} /> Add Action</button>}>
          <div className="space-y-2">
            {retentionActions.items.map((a) => (
              <button key={a.id} onClick={() => setAct(a)} className="w-full text-left rounded-lg border border-line px-3 py-2 hover:bg-surface cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-ink-900 leading-snug">{a.action}</span>
                  <Badge value={a.status} />
                </div>
                <div className="text-[11.5px] text-ink-500 mt-1 flex items-center gap-2 flex-wrap"><span>{a.segment}</span><span>·</span><span>{a.owner}</span><span>·</span><span>Due {fmtDate(a.dueDate)}</span><span>·</span><span className={a.impact === 'High' ? 'text-red-600' : a.impact === 'Medium' ? 'text-amber-600' : 'text-green-600'}>{a.impact} impact</span></div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <ExitForm open={addExit || !!exit} onClose={() => { setAddExit(false); setExit(null) }} value={exit} onSave={(e) => { if (exit) exits.update(e); else exits.add(e); setAddExit(false); setExit(null) }} onDelete={(id) => exits.remove(id)} />
      <RetentionActionForm open={addAct || !!act} onClose={() => { setAddAct(false); setAct(null) }} value={act} onSave={(a) => { if (act) retentionActions.update(a); else retentionActions.add(a); setAddAct(false); setAct(null) }} onDelete={(id) => retentionActions.remove(id)} />
      <NumberGridForm<AttritionMonth> open={editTrend} onClose={() => setEditTrend(false)} title="Attrition trend by month" rows={attrition.items} labelKey="month" fields={[{ key: 'ratePct', label: 'Rate %', step: 0.1 }, { key: 'benchmarkPct', label: 'Benchmark %', step: 0.1 }, { key: 'exits', label: 'Exits' }, { key: 'regretted', label: 'Regretted' }]} onSave={(rows) => attrition.setAll(rows)} />
    </>
  )
}
