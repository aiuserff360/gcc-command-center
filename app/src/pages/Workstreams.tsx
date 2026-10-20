import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ListChecks, Flag, Users, IndianRupee, Euro, Pencil, Plus } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { InputLayout } from '../components/layout/InputLayout'
import { Card, Badge, Table, Tabs, Chevron, Legend } from '../components/ui'
import { Donut, tooltipStyle } from '../components/charts'
import { useCollection, useStore, uid } from '../store/useStore'
import { seedMilestones, seedRaid, seedDependencies, type Milestone, type RaidItem, type Dependency } from '../data/shared'
import { seedInitiatives, seedWsSettings, extraRaid, KEY_MILESTONE, type Initiative, type WsSettings } from '../data/workstreams'
import { MONTHS, fmtDate, CHART_COLORS, TODAY, type Workstream } from '../data/common'
import { Kpi, WsIcon, PctBar, STATUS_COLOR, type WsRow } from '../components/workstreams/common'
import { useWsRows, InitiativesView, MilestonesView, RisksView, BudgetView, DependenciesView, DocumentsView } from '../components/workstreams/views'
import { DeliverablesView } from '../components/workstreams/Deliverables'
import { DrillDown } from '../components/workstreams/DrillDown'
import { WorkstreamForm, SettingsForm } from '../components/workstreams/forms'
import { ALL_WS, WorkstreamGrid, InitiativeGrid, MilestoneGrid, ActivityGrid, PeopleGrid, BudgetLineGrid, DependencyGrid, DocumentGrid } from '../components/workstreams/InputGrids'
import { useMoney } from '../data/money'

const TABS = ['Workstream Overview', 'Initiatives & Milestones', 'Risks & Issues', 'Budget & Costs', 'Dependencies', 'Deliverables', 'Documents']

export default function Workstreams() {
  const wssC = useWsRows()
  const wss = wssC.items
  const settingsC = useCollection<WsSettings>('wsSettings', seedWsSettings)
  const settings = settingsC.items[0] ?? seedWsSettings[0]
  const { items: milestones } = useCollection<Milestone>('milestones', seedMilestones)
  const { items: raid } = useCollection<RaidItem>('raid', seedRaid)
  const { items: inits } = useCollection<Initiative>('initiatives', seedInitiatives)
  const { items: deps } = useCollection<Dependency>('dependencies', seedDependencies)
  const [params] = useSearchParams() // deep link: /workstreams?ws=<name>&tab=<page tab>&sub=<drill-down tab>
  const [tab, setTab] = useState(TABS.includes(params.get('tab') ?? '') ? (params.get('tab') as string) : TABS[0])
  const [selected, setSelected] = useState<string>(params.get('ws') ?? 'Technology & Infrastructure')
  const [editWs, setEditWs] = useState<{ item: WsRow; isNew: boolean } | null>(null)
  const [editKpi, setEditKpi] = useState(false)
  const m = useMoney()
  const mode = useStore((s) => s.mode)
  // Input view: the workstream every grid is filtered to (deep link ?ws=<name> pre-selects it)
  const [inWs, setInWs] = useState<string>(params.get('ws') ?? ALL_WS)

  // One-time merge of the mock-up's Technology rows into the shared RAID register (guarded by id).
  useEffect(() => {
    const live = useStore.getState().collections.raid
    if (!live) return
    extraRaid.forEach((r) => { if (!live.some((x) => x.id === r.id)) useStore.getState().upsert('raid', r) })
  }, [raid])

  /* ---- derived ---- */
  const keyMilestone = (w: WsRow) => {
    const own = milestones.filter((m) => m.workstream === w.name)
    return own.find((m) => m.id === (w.keyMilestoneId ?? KEY_MILESTONE[w.name as Workstream]))
      ?? own.filter((m) => m.status !== 'Completed' && m.dueDate >= TODAY).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
      ?? own.sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0]
  }
  const counts = useMemo(() => ({
    onTrack: wss.filter((w) => w.status === 'On Track' || w.status === 'Completed').length, atRisk: wss.filter((w) => w.status === 'At Risk').length,
    delayed: wss.filter((w) => w.status === 'Delayed').length, notStarted: wss.filter((w) => w.status === 'Not Started').length,
  }), [wss])
  const activeInits = inits.filter((i) => i.status !== 'Completed').length
  const totalBudget = +wss.reduce((a, w) => a + w.approvedBudgetCr, 0).toFixed(1)
  const totalSpent = +wss.reduce((a, w) => a + w.actualSpendCr, 0).toFixed(1)
  const trend = MONTHS.map((m, i) => ({ month: m, Plan: settings.trendPlan[i] ?? null, Actual: settings.trendActual[i] ?? null }))
  const donut = [
    { name: 'On Track', value: counts.onTrack, color: STATUS_COLOR['On Track'] }, { name: 'At Risk', value: counts.atRisk, color: STATUS_COLOR['At Risk'] },
    { name: 'Delayed', value: counts.delayed, color: STATUS_COLOR.Delayed }, { name: 'Not Started', value: counts.notStarted, color: STATUS_COLOR['Not Started'] },
  ]
  const newWs = (): WsRow => ({ id: uid('ws'), name: '' as Workstream, description: '', progress: 0, status: 'Not Started', owner: 'A. Sharma', lead: '', executiveSponsor: '', teamSize: 0, activeInitiatives: 0, scheduleHealth: 'Not Started', budgetHealth: 'On Track', approvedBudgetCr: 0, actualSpendCr: 0, forecastAtCompletionCr: 0 })

  if (mode === 'input') {
    const g = { ws: inWs, onWs: setInWs }
    return (
      <InputLayout title="Workstreams" subtitle="Enter the delivery plan: workstreams, their initiatives, milestones, WBS activities, people, budget lines, dependencies and documents. Program Planning, the Dashboard and the Output view are built from these."
        initialTab={params.get('tab') === 'Initiatives & Milestones' ? 'Initiatives' : undefined}
        tabs={[
          { name: 'Workstreams', content: <WorkstreamGrid />, hint: 'One row per workstream. Lead, owner, sponsor, status, progress, team size and budget headline figures; edit a cell and the change is saved.' },
          { name: 'Initiatives', content: <InitiativeGrid {...g} />, hint: 'Pick a workstream (or keep all) and edit initiatives in the grid. Start and finish dates drive the initiative bars on the Program Planning timeline.' },
          { name: 'Milestones', content: <MilestoneGrid {...g} />, hint: 'Shared milestone register – the same rows appear on the Dashboard, Program Planning and Transition. Star a milestone to make it a key milestone.' },
          { name: 'WBS activities', content: <ActivityGrid {...g} />, hint: 'Activities per workstream and sub-workstream. Baseline and forecast dates feed the Gantt bars and the baseline markers; status and RAG feed the deliverables register.' },
          { name: 'People', content: <PeopleGrid {...g} />, hint: 'Team roster per workstream. The People & Roles drill-down and the headcount figures are built from these rows.' },
          { name: 'Budget lines', content: <BudgetLineGrid {...g} />, hint: 'Planned and actual spend by category. Amounts are entered in the currency selected in the top bar.' },
          { name: 'Dependencies', content: <DependencyGrid {...g} />, hint: 'Cross-workstream dependencies shared with Program Planning and Risks & Issues.' },
          { name: 'Documents', content: <DocumentGrid {...g} />, hint: 'Document register per workstream.' },
        ]} />
    )
  }

  return (
    <div>
      <PageHeader title="Workstreams" subtitle="Plan, execute and monitor progress across all GCC workstreams."
        viewLabel="View" viewValue={selected === '' ? 'All Workstreams' : 'All Workstreams'} viewOptions={['All Workstreams', ...wss.map((w) => w.name)]}
        onView={(v) => { if (v !== 'All Workstreams') { setSelected(v); setTab(TABS[0]) } }}
        onEdit={() => setEditKpi(true)} editLabel="Edit KPIs" />

      {/* KPI tiles */}
      <div className="grid grid-cols-[1fr_1.1fr_1.02fr_1.02fr_0.86fr] gap-4 mb-4">
        <Kpi ring={settings.overallProgress} tone="green" value={`${settings.overallProgress}%`} label="Overall Workstream Progress" trend={settings.overallProgressDelta >= 0 ? 'up' : 'down'}
          sub={<span className={settings.overallProgressDelta >= 0 ? 'text-green-600' : 'text-red-600'}>{settings.overallProgressDelta >= 0 ? '+' : ''}{settings.overallProgressDelta}% vs last month</span>} onClick={() => setEditKpi(true)} />
        <Kpi tone="blue" icon={<ListChecks size={18} />} value={wss.length} label="Workstreams"
          sub={<span><span className="text-green-600">{counts.onTrack} On Track</span> <span className="text-ink-400">|</span> <span className="text-amber-600">{counts.atRisk} At Risk</span> <span className="text-ink-400">|</span> <span className="text-red-600">{counts.delayed} Delayed</span></span>} />
        <Kpi tone="red" icon={<Flag size={18} />} value={activeInits} label="Active Workstream Initiatives" onClick={() => setTab('Initiatives & Milestones')} />
        <Kpi tone="violet" icon={<Users size={18} />} value={deps.length} label="Cross-workstream Dependencies" onClick={() => setTab('Dependencies')} />
        <Kpi tone="green" icon={m.currency === 'EUR' ? <Euro size={18} /> : <IndianRupee size={18} />} value={m.fmt(totalBudget)} label="Total Workstream Budget" sub={<>{m.fmt(totalSpent)} spent ({totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0}%)</>} onClick={() => setTab('Budget & Costs')} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-4" />

      {tab === 'Workstream Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-4">
            <Card title="Workstream Progress" action={<button className="btn-secondary !py-1" onClick={() => setEditWs({ item: newWs(), isNew: true })}><Plus size={13} /> Add workstream</button>}>
              <Table<WsRow> rows={wss} onRowClick={(r) => setSelected(r.name)} columns={[
                { key: 'name', header: 'Workstream', className: '!px-2 whitespace-nowrap', render: (r) => <span className="inline-flex items-center gap-2"><WsIcon name={r.name} box={28} size={15} /><span className={r.name === selected ? 'font-semibold text-brand-600' : 'text-ink-900'}>{r.name}</span></span> },
                { key: 'progress', header: 'Progress', className: '!px-2', render: (r) => <PctBar value={r.progress} width={96} height="h-2.5" /> },
                { key: 'status', header: 'Status', className: '!px-2', render: (r) => <Badge value={r.status} /> },
                { key: 'km', header: 'Key Milestone', className: '!px-2 whitespace-nowrap', render: (r) => keyMilestone(r)?.name ?? <span className="text-ink-400">—</span> },
                { key: 'due', header: 'Next Due Date', className: '!px-2 whitespace-nowrap', render: (r) => { const m = keyMilestone(r); return m ? <span className="whitespace-nowrap">{fmtDate(m.dueDate)}</span> : '—' } },
                { key: 'owner', header: 'Owner', className: '!px-2 whitespace-nowrap' },
                { key: 'edit', header: '', className: '!px-2 w-[52px]', render: (r) => <span className="inline-flex items-center gap-2"><button className="text-ink-400 hover:text-brand-600 cursor-pointer" title="Edit workstream" onClick={(e) => { e.stopPropagation(); setEditWs({ item: r, isNew: false }) }}><Pencil size={13} /></button><Chevron /></span> },
              ]} />
            </Card>
            <div className="space-y-4">
              <Card title="Workstream Status Distribution">
                <div className="flex items-center gap-5">
                  <Donut size={132} inner={0.7} data={donut.filter((d) => d.value > 0)} center={<><div className="text-[22px] font-bold text-ink-900 leading-none">{wss.length}</div><div className="text-[10.5px] text-ink-500 mt-0.5">Workstreams</div></>} />
                  <div className="flex-1 space-y-2">
                    {donut.map((d) => <div key={d.name} className="flex items-center justify-between text-[12.5px]"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span><b>{d.value}</b></div>)}
                  </div>
                </div>
              </Card>
              <Card title="Progress Trend (Overall)" headerRight={<Legend items={[{ label: 'Plan', color: CHART_COLORS.blueLight, dashed: true }, { label: 'Actual', color: CHART_COLORS.blue }]} />}>
                <div className="h-[150px]">
                  <ResponsiveContainer>
                    <LineChart data={trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10.5 }} interval={0} />
                      <YAxis tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} interval={0} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10.5 }} />
                      <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`]} />
                      <Line isAnimationActive={false} type="monotone" dataKey="Plan" stroke={CHART_COLORS.blueLight} strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2.5, fill: CHART_COLORS.blueLight, strokeWidth: 0 }} />
                      <Line isAnimationActive={false} type="monotone" dataKey="Actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 2.5, fill: CHART_COLORS.blue, strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
          <DrillDown wss={wss} selected={selected} initialTab={params.get('sub') ?? undefined} onSelect={setSelected} onEditWorkstream={(w) => setEditWs({ item: w, isNew: false })} />
        </div>
      )}
      {tab === 'Initiatives & Milestones' && <div className="space-y-4"><InitiativesView /><MilestonesView /></div>}
      {tab === 'Risks & Issues' && <RisksView />}
      {tab === 'Budget & Costs' && <BudgetView onEditWorkstream={(w) => setEditWs({ item: w, isNew: false })} />}
      {tab === 'Dependencies' && <DependenciesView />}
      {tab === 'Deliverables' && <DeliverablesView />}
      {tab === 'Documents' && <DocumentsView />}

      {editWs && <WorkstreamForm initial={editWs.item} isNew={editWs.isNew} milestones={milestones} onClose={() => setEditWs(null)}
        onSave={(v) => { if (!v.name) return; wssC.update(v); if (editWs.isNew) setSelected(v.name); setEditWs(null) }}
        onDelete={editWs.isNew ? undefined : () => { wssC.remove(editWs.item.id); if (selected === editWs.item.name) setSelected(wss.find((w) => w.id !== editWs.item.id)?.name ?? ''); setEditWs(null) }} />}
      {editKpi && <SettingsForm initial={settings} onClose={() => setEditKpi(false)} onSave={(v) => { settingsC.update(v); setEditKpi(false) }} />}
    </div>
  )
}
