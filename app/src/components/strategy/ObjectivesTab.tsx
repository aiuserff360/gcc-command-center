import { useMemo, useState } from 'react'
import { Plus, Target, CheckCircle2, AlertTriangle, Activity } from 'lucide-react'
import { Card, KpiTile, Badge, Progress, Table, Modal, Field, Input, Select, TextArea, FormGrid, FilterSelect } from '../ui'
import { Donut } from '../charts'
import { useCollection, uid } from '../../store/useStore'
import { OWNERS, WORKSTREAMS, CHART_COLORS, fmtDate } from '../../data/common'
import { seedObjectives, OBJECTIVE_STATUSES, OBJECTIVE_THEMES, PRIORITIES, type StrategyObjective } from '../../data/strategy'
import { EditorFooter, Toolbar, numProps, textProps } from './shared'

const blank = (): StrategyObjective => ({ id: uid('obj'), objective: '', theme: 'Cost', owner: OWNERS[0], target: '', kpi: '', status: 'Not Started', priority: 'Medium', workstream: WORKSTREAMS[0], targetDate: '2027-12-31', progress: 0 })

export default function ObjectivesTab() {
  const { items, add, update, remove } = useCollection<StrategyObjective>('strategyObjectives', seedObjectives)
  const [status, setStatus] = useState('All')
  const [theme, setTheme] = useState('All')
  const [editing, setEditing] = useState<StrategyObjective | null>(null)
  const [isNew, setIsNew] = useState(false)

  const rows = items.filter((o) => (status === 'All' || o.status === status) && (theme === 'All' || o.theme === theme))
  const stats = useMemo(() => ({
    total: items.length,
    onTrack: items.filter((o) => o.status === 'On Track' || o.status === 'Completed').length,
    atRisk: items.filter((o) => o.status === 'At Risk' || o.status === 'Delayed').length,
    avg: items.length ? Math.round(items.reduce((s, o) => s + o.progress, 0) / items.length) : 0,
  }), [items])
  const byStatus = OBJECTIVE_STATUSES.map((s) => ({ name: s, value: items.filter((o) => o.status === s).length, color: { 'On Track': CHART_COLORS.green, 'At Risk': CHART_COLORS.amber, Delayed: CHART_COLORS.red, 'Not Started': CHART_COLORS.gray, Completed: CHART_COLORS.blue }[s] })).filter((d) => d.value > 0)
  const byTheme = OBJECTIVE_THEMES.map((t) => ({ name: t, value: items.filter((o) => o.theme === t).length }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <KpiTile tone="blue" icon={<Target size={22} />} value={stats.total} label="Strategic Objectives" sub="across 5 themes" />
        <KpiTile tone="green" icon={<CheckCircle2 size={22} />} value={stats.onTrack} label="On Track" sub={`${stats.total ? Math.round((stats.onTrack / stats.total) * 100) : 0}% of objectives`} />
        <KpiTile tone="amber" icon={<AlertTriangle size={22} />} value={stats.atRisk} label="At Risk / Delayed" sub="need intervention" />
        <KpiTile tone="teal" icon={<Activity size={22} />} value={`${stats.avg}%`} label="Average Progress" sub="weighted equally" />
      </div>
      <div className="grid grid-cols-[1fr_300px] gap-4">
        <Card title="Strategic Objectives" subtitle="Objectives the GCC must deliver, with owners, targets and the workstream accountable for delivery.">
          <Toolbar left={`${rows.length} of ${items.length} objectives`}>
            <FilterSelect label="Status" value={status} options={['All', ...OBJECTIVE_STATUSES]} onChange={setStatus} />
            <FilterSelect label="Theme" value={theme} options={['All', ...OBJECTIVE_THEMES]} onChange={setTheme} />
            <button className="btn-primary" onClick={() => { setEditing(blank()); setIsNew(true) }}><Plus size={14} /> Add Objective</button>
          </Toolbar>
          <Table<StrategyObjective> rows={rows} onRowClick={(r) => { setEditing(r); setIsNew(false) }} columns={[
            { key: 'objective', header: 'Objective', width: '30%', render: (r) => <div><div className="font-medium text-ink-900 leading-snug">{r.objective}</div><div className="text-[11.5px] text-ink-500 mt-0.5">{r.theme} · Priority: {r.priority}</div></div> },
            { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
            { key: 'target', header: 'Target', width: '14%' },
            { key: 'kpi', header: 'KPI', width: '13%' },
            { key: 'progress', header: 'Progress', className: 'whitespace-nowrap', render: (r) => <div className="flex items-center gap-2"><div className="w-16 shrink-0"><Progress value={r.progress} /></div><span className="w-9 text-right text-[12px] font-medium">{r.progress}%</span></div> },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
            { key: 'workstream', header: 'Linked Workstream', width: '13%' },
            { key: 'targetDate', header: 'Target Date', className: 'whitespace-nowrap', render: (r) => fmtDate(r.targetDate) },
          ]} />
        </Card>
        <div className="space-y-4">
          <Card title="Objectives by Status">
            <Donut size={150} inner={0.7} data={byStatus} center={<><div className="text-[24px] font-bold text-ink-900 leading-none">{stats.total}</div><div className="text-[11px] text-ink-500 mt-1">Objectives</div></>} />
            <div className="mt-3 space-y-1.5">
              {byStatus.map((d) => <div key={d.name} className="flex items-center justify-between text-[12.5px]"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span><span className="font-medium">{d.value}</span></div>)}
            </div>
          </Card>
          <Card title="Objectives by Theme">
            <div className="space-y-2">
              {byTheme.map((t) => <div key={t.name} className="flex items-center gap-3 text-[12.5px]"><span className="w-20 text-ink-700">{t.name}</span><Progress value={stats.total ? (t.value / stats.total) * 100 : 0} className="flex-1" color={CHART_COLORS.blue} /><span className="w-5 text-right font-medium">{t.value}</span></div>)}
            </div>
          </Card>
        </div>
      </div>
      {editing && <ObjectiveEditor value={editing} isNew={isNew} onClose={() => setEditing(null)} onDelete={() => { remove(editing.id); setEditing(null) }} onSave={(v) => { if (isNew) add(v); else update(v); setEditing(null) }} />}
    </div>
  )
}

function ObjectiveEditor({ value, isNew, onClose, onSave, onDelete }: { value: StrategyObjective; isNew: boolean; onClose: () => void; onSave: (v: StrategyObjective) => void; onDelete: () => void }) {
  const [f, setF] = useState(value)
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add Objective' : 'Edit Objective'} footer={<EditorFooter onCancel={onClose} onSave={() => onSave(f)} onDelete={isNew ? undefined : onDelete} />}>
      <FormGrid cols={1}><Field label="Objective"><TextArea {...textProps(f, setF, 'objective')} /></Field></FormGrid>
      <div className="h-3" />
      <FormGrid cols={3}>
        <Field label="Theme"><Select options={OBJECTIVE_THEMES} {...textProps(f, setF, 'theme')} /></Field>
        <Field label="Owner"><Select options={OWNERS} {...textProps(f, setF, 'owner')} /></Field>
        <Field label="Priority"><Select options={PRIORITIES} {...textProps(f, setF, 'priority')} /></Field>
        <Field label="Target"><Input {...textProps(f, setF, 'target')} /></Field>
        <Field label="KPI"><Input {...textProps(f, setF, 'kpi')} /></Field>
        <Field label="Status"><Select options={OBJECTIVE_STATUSES} {...textProps(f, setF, 'status')} /></Field>
        <Field label="Linked workstream"><Select options={WORKSTREAMS} {...textProps(f, setF, 'workstream')} /></Field>
        <Field label="Target date"><Input type="date" {...textProps(f, setF, 'targetDate')} /></Field>
        <Field label="Progress %"><Input {...numProps(f, setF, 'progress')} /></Field>
      </FormGrid>
    </Modal>
  )
}
