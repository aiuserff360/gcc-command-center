import { useMemo, useState } from 'react'
import { CheckCircle2, CalendarCheck, Share2, CalendarDays, Target, ChevronLeft, ChevronRight, Plus, ClipboardList, Users, Cpu, Scale, Building2, ArrowLeftRight, Settings2, Wallet, Search } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Card, KpiTile, Badge, Table, ViewAll, Modal, Progress, Tabs, Input, Select, EmptyNote } from '../components/ui'
import { Donut } from '../components/charts'
import { useCollection, uid } from '../store/useStore'
import { ProgramKpiEditor } from '../components/ProgramKpiEditor'
import { seedMilestones, seedProgramKpis, seedDependencies, type Milestone, type ProgramKpis, type Dependency } from '../data/shared'
import { WORKSTREAMS, WORKSTREAM_META, MONTHS, TODAY, CHART_COLORS, type Workstream, type Impact } from '../data/common'
import { PLAN_GROUPS, seedPlanItems, addDays, type PlanItem } from '../data/planning'
import { Gantt, type GanttGroup, type GanttScale } from '../components/planning/Gantt'
import { PlanItemModal, MilestoneModal, DependencyModal, DependencyForm, MS_STATUSES, MS_PHASES, IMPACTS, DEP_STATUSES } from '../components/planning/Modals'

/** "23 Oct 2026" with 3-letter months (matches the mock-up; the shared helper renders "Sept") */
const fmtDate = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? iso : `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` }

const VIEWS = ['Master Plan', 'Workstream', 'Milestones', 'Dependencies'] as const
type View = (typeof VIEWS)[number]

/* Short workstream labels as used in the mock-up tables */
const WS_SHORT: Record<string, string> = {
  'Talent & Hiring': 'Talent', 'Technology & Infrastructure': 'Technology', 'Legal & Compliance': 'Compliance', 'Facilities & Workplace': 'Facilities',
  'Transition Readiness': 'Transition', 'Operations Setup': 'Operations', 'Finance & Procurement': 'Finance',
}
const msShort = (m: Milestone) => (m.name.startsWith('Go/No-Go') ? 'Program' : WS_SHORT[m.workstream] ?? m.workstream)

const GROUP_ICON: Record<number, { icon: React.ReactNode; cls: string }> = {
  1: { icon: <ClipboardList size={12} />, cls: 'bg-blue-50 text-brand-600' }, 2: { icon: <Users size={12} />, cls: 'bg-blue-50 text-brand-600' },
  3: { icon: <Cpu size={12} />, cls: 'bg-green-50 text-green-600' }, 4: { icon: <Scale size={12} />, cls: 'bg-violet-50 text-violet-600' },
  5: { icon: <Building2 size={12} />, cls: 'bg-amber-50 text-amber-600' }, 6: { icon: <ArrowLeftRight size={12} />, cls: 'bg-violet-50 text-violet-600' },
  7: { icon: <Settings2 size={12} />, cls: 'bg-teal-50 text-teal-600' }, 8: { icon: <Wallet size={12} />, cls: 'bg-green-50 text-green-600' },
}

/* Heatmap axes (as on the mock-up) */
const HEAT_WS: { label: string; ws: Workstream }[] = [
  { label: 'Talent', ws: 'Talent & Hiring' }, { label: 'Tech', ws: 'Technology & Infrastructure' }, { label: 'Facilities', ws: 'Facilities & Workplace' },
  { label: 'Compliance', ws: 'Legal & Compliance' }, { label: 'Finance', ws: 'Finance & Procurement' }, { label: 'Transition', ws: 'Transition Readiness' },
]
const IMPACT_RANK: Record<Impact, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
const IMPACT_COLOR: Record<Impact, { bg: string; fg: string }> = {
  Critical: { bg: '#EF4444', fg: '#fff' }, High: { bg: '#FB923C', fg: '#7C2D12' }, Medium: { bg: '#FCD34D', fg: '#78350F' }, Low: { bg: '#FEF3C7', fg: '#92400E' },
}

const newMilestone = (): Milestone => ({ id: uid('ms'), name: '', workstream: 'Talent & Hiring', dueDate: TODAY, status: 'On Track', owner: 'A. Sharma', phase: 'Build', progress: 0, critical: false })
const newDependency = (from: Workstream = 'Talent & Hiring', on: Workstream = 'Technology & Infrastructure'): Dependency =>
  ({ id: uid('dep'), from, on, type: 'System Access', description: '', impact: 'Medium', status: 'On Track', dueDate: TODAY, owner: 'A. Sharma' })
const newPlanItem = (group: number, existing: PlanItem[]): PlanItem => {
  const g = PLAN_GROUPS.find((x) => x.n === group) ?? PLAN_GROUPS[0]
  const n = existing.filter((i) => i.group === g.n).length + 1
  return { id: uid('pi'), group: g.n, code: `${g.n}.${n}`, name: '', workstream: g.workstream, start: TODAY, end: addDays(TODAY, 30), status: 'Not Started', owner: 'A. Sharma', progress: 0 }
}

export default function Planning() {
  const [view, setView] = useState<View>('Master Plan')
  const [editKpis, setEditKpis] = useState(false)
  const kpisC = useCollection<ProgramKpis>('programKpis', seedProgramKpis)
  const k = kpisC.items[0] ?? seedProgramKpis[0]
  const ms = useCollection<Milestone>('milestones', seedMilestones)
  const deps = useCollection<Dependency>('dependencies', seedDependencies)
  const plan = useCollection<PlanItem>('planItems', seedPlanItems)

  /* Gantt controls */
  const [scale, setScale] = useState<GanttScale>('Months')
  const [critical, setCritical] = useState(true)
  const [scrollStep, setScrollStep] = useState(0)
  const [wsFilter, setWsFilter] = useState<Workstream>('Talent & Hiring')

  /* Modals */
  const [planEdit, setPlanEdit] = useState<{ item: PlanItem; isNew: boolean } | null>(null)
  const [msEdit, setMsEdit] = useState<{ item: Milestone; isNew: boolean } | null>(null)
  const [depEdit, setDepEdit] = useState<{ item: Dependency; isNew: boolean } | null>(null)
  const [cell, setCell] = useState<{ from: Workstream; on: Workstream } | null>(null)

  /* ---------- derived ---------- */
  const msCounts = useMemo(() => {
    const c = (s: string[]) => ms.items.filter((m) => s.includes(m.status)).length
    return { onTrack: c(['On Track', 'Completed']), atRisk: c(['At Risk']), delayed: c(['Delayed']), other: c(['Pending', 'Not Started']), total: ms.items.length }
  }, [ms.items])
  const pct = (n: number) => (msCounts.total ? Math.round((n / msCounts.total) * 100) : 0)

  const upcoming = useMemo(() => {
    const limit = addDays(TODAY, 90)
    const open = ms.items.filter((m) => m.status !== 'Completed' && m.dueDate >= TODAY).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const key = open.filter((m) => m.critical && m.dueDate <= limit)
    return (key.length ? key : open).slice(0, 7)
  }, [ms.items])

  const depCounts = useMemo(() => {
    const by = (i: Impact) => deps.items.filter((d) => d.impact === i).length
    return { Critical: by('Critical'), High: by('High'), Medium: by('Medium'), Low: by('Low'), total: deps.items.length }
  }, [deps.items])
  const heat = useMemo(() => {
    const m = new Map<string, { count: number; top: Impact | null }>()
    for (const d of deps.items) {
      const key = `${d.from}|${d.on}`
      const cur = m.get(key) ?? { count: 0, top: null }
      cur.count++
      if (!cur.top || IMPACT_RANK[d.impact] > IMPACT_RANK[cur.top]) cur.top = d.impact
      m.set(key, cur)
    }
    return m
  }, [deps.items])

  const ganttGroups = useMemo<GanttGroup[]>(() => PLAN_GROUPS.map((g) => ({
    n: g.n, name: g.name, icon: GROUP_ICON[g.n]?.icon ?? <ClipboardList size={12} />, iconClass: GROUP_ICON[g.n]?.cls ?? 'bg-blue-50 text-brand-600',
    items: plan.items.filter((i) => i.group === g.n).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
  })), [plan.items])
  const wsGroups = useMemo(() => ganttGroups.filter((g) => g.items.some((i) => i.workstream === wsFilter) || PLAN_GROUPS.find((p) => p.n === g.n)?.workstream === wsFilter)
    .map((g) => ({ ...g, items: g.items.filter((i) => i.workstream === wsFilter) })).filter((g) => g.items.length), [ganttGroups, wsFilter])
  const planCodes = useMemo(() => plan.items.map((i) => i.code).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [plan.items])
  const planProgress = useMemo(() => {
    const items = view === 'Workstream' ? wsGroups.flatMap((g) => g.items) : plan.items
    return items.length ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length) : 0
  }, [plan.items, wsGroups, view])

  const dateRange = `${fmtDate(k.timelineStart)} – ${fmtDate(k.timelineEnd)}`
  const maxStep = scale === 'Months' ? 8 : 0

  const ganttToolbar = (
    <div className="flex items-center gap-2">
      <button className="btn-secondary !px-2 !py-1 text-[12px]" onClick={() => setPlanEdit({ item: newPlanItem(1, plan.items), isNew: true })}><Plus size={13} /> Add</button>
      <div className="flex items-center rounded-md border border-line overflow-hidden text-[12px]">
        <button title="Scroll to start" className="px-2 py-1 hover:bg-surface cursor-pointer border-r border-line" onClick={() => setScrollStep(0)}>L</button>
        <button title="Previous" className="px-1.5 py-1 hover:bg-surface cursor-pointer border-r border-line" onClick={() => setScrollStep((s) => Math.max(0, s - 3))}><ChevronLeft size={14} /></button>
        <button title="Next" className="px-1.5 py-1 hover:bg-surface cursor-pointer" onClick={() => setScrollStep((s) => Math.min(maxStep, s + 3))}><ChevronRight size={14} /></button>
      </div>
      <select value={scale} onChange={(e) => { setScale(e.target.value as GanttScale); setScrollStep(0) }} className="rounded-md border border-line bg-white px-2 py-1 text-[12px] font-medium outline-none cursor-pointer">
        <option>Months</option><option>Quarters</option>
      </select>
      <label className="flex items-center gap-2 text-[12px] text-ink-700 cursor-pointer select-none">
        Critical Path
        <button role="switch" aria-checked={critical} onClick={() => setCritical((c) => !c)} className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${critical ? 'bg-brand-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${critical ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </label>
    </div>
  )

  const cellDeps = cell ? deps.items.filter((d) => d.from === cell.from && d.on === cell.on) : []

  return (
    <div className="space-y-4">
      <PageHeader title="Program Planning" subtitle="Integrated plan, milestones and dependencies across the GCC lifecycle." viewValue={view} viewOptions={VIEWS} onView={(v) => setView(v as View)} dateRange={dateRange} onEdit={() => setEditKpis(true)} editLabel="Edit KPIs" />
      <ProgramKpiEditor open={editKpis} onClose={() => setEditKpis(false)} value={k} onSave={(v) => { kpisC.update(v); setEditKpis(false) }} />

      {/* KPI tiles */}
      <div className="grid grid-cols-[1fr_1.12fr_1.18fr_1fr_0.9fr] gap-4">
        <KpiTile tone="green" icon={<CheckCircle2 size={22} />} value={`${k.programCompletion}%`} label="Overall Program Progress" trend="up" sub={<span className="text-green-600">+{k.programCompletionDelta}% vs last month</span>} />
        <KpiTile tone="blue" icon={<CalendarCheck size={22} />} value={msCounts.total} label="Total Milestones" sub={<span><span className="text-green-600">{msCounts.onTrack} On Track</span><span className="text-ink-400 mx-1">|</span><span className="text-amber-600">{msCounts.atRisk} At Risk</span><span className="text-ink-400 mx-1">|</span><span className="text-red-600">{msCounts.delayed} Delayed</span></span>} />
        <KpiTile tone="violet" icon={<Share2 size={22} />} value={depCounts.total} label="Cross-workstream Dependencies" sub={<span className="text-red-600"><span className="text-[9px] align-middle">▼</span> {depCounts.Critical} Critical</span>} />
        <KpiTile tone="orange" icon={<CalendarDays size={22} />} value={fmtDate(k.goLiveTarget)} label="Current Go-Live Target" sub={<span className="text-red-600"><span className="text-[9px] align-middle">▲</span> +{k.goLiveVarianceWeeks} weeks vs baseline</span>} />
        <KpiTile tone="blue" icon={<Target size={22} />} value={`${k.milestoneAdherence}%`} label="Milestone Adherence" trend="up" sub={<span className="text-green-600">+{k.milestoneAdherenceDelta}% vs last month</span>} />
      </div>

      {/* Main area */}
      {view === 'Master Plan' && (
        <Card title="Program Timeline" headerRight={ganttToolbar}>
          <Gantt groups={ganttGroups} rangeStart={k.timelineStart} rangeEnd={k.timelineEnd} today={TODAY} scale={scale} criticalPath={critical} scrollStep={scrollStep}
            onItemClick={(item) => setPlanEdit({ item, isNew: false })} onAddItem={(g) => setPlanEdit({ item: newPlanItem(g.n, plan.items), isNew: true })} />
          <div className="flex items-center justify-between mt-3 text-[12px] text-ink-500">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5"><span className="w-5 h-2.5 rounded-sm bg-navy-900" /> Workstream summary</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-5 h-2.5 rounded-sm" style={{ background: '#5B9BF0' }} /> On Track / Completed</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-5 h-2.5 rounded-sm" style={{ background: '#FBBF24' }} /> At Risk</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-5 h-2.5 rounded-sm" style={{ background: '#F87171' }} /> Delayed</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-5 h-2.5 rounded-sm bg-slate-300" /> Not Started / Pending</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rotate-45 bg-green-600" /> Milestone</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-5 border-t border-dashed border-red-500" /> Today</span>
            </div>
            <span>{plan.items.length} plan items · {planProgress}% weighted progress · click a row to edit</span>
          </div>
        </Card>
      )}

      {view === 'Workstream' && (
        <Card title="Workstream Plan" subtitle={`${wsFilter} · ${wsGroups.flatMap((g) => g.items).length} plan items · ${planProgress}% progress`} headerRight={ganttToolbar}>
          <Tabs size="sm" className="mb-3 !shadow-none" tabs={[...WORKSTREAMS]} active={wsFilter} onChange={(t) => setWsFilter(t as Workstream)} />
          <Gantt groups={wsGroups} rangeStart={k.timelineStart} rangeEnd={k.timelineEnd} today={TODAY} scale={scale} criticalPath={critical} scrollStep={scrollStep}
            onItemClick={(item) => setPlanEdit({ item, isNew: false })} onAddItem={(g) => setPlanEdit({ item: newPlanItem(g.n, plan.items), isNew: true })} />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="rounded-lg border border-line p-3">
              <div className="text-[12px] text-ink-500 mb-2">Milestones for {WS_SHORT[wsFilter]}</div>
              {(['On Track', 'At Risk', 'Delayed', 'Completed'] as const).map((s) => (
                <div key={s} className="flex items-center justify-between text-[12.5px] py-0.5"><Badge value={s} /><span className="font-medium">{ms.items.filter((m) => m.workstream === wsFilter && m.status === s).length}</span></div>
              ))}
            </div>
            <div className="rounded-lg border border-line p-3">
              <div className="text-[12px] text-ink-500 mb-2">Dependencies of {WS_SHORT[wsFilter]} on others</div>
              {IMPACTS.map((i) => (
                <div key={i} className="flex items-center justify-between text-[12.5px] py-0.5"><Badge value={i} /><span className="font-medium">{deps.items.filter((d) => d.from === wsFilter && d.impact === i).length}</span></div>
              ))}
            </div>
            <div className="rounded-lg border border-line p-3">
              <div className="text-[12px] text-ink-500 mb-2">Upcoming milestones</div>
              {ms.items.filter((m) => m.workstream === wsFilter && m.status !== 'Completed' && m.dueDate >= TODAY).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4).map((m) => (
                <button key={m.id} className="w-full flex items-center justify-between text-[12.5px] py-0.5 cursor-pointer hover:text-brand-600 text-left" onClick={() => setMsEdit({ item: m, isNew: false })}><span className="truncate">{m.name}</span><span className="text-ink-500 shrink-0 ml-2">{fmtDate(m.dueDate)}</span></button>
              ))}
              {ms.items.filter((m) => m.workstream === wsFilter && m.status !== 'Completed' && m.dueDate >= TODAY).length === 0 && <EmptyNote>No upcoming milestones.</EmptyNote>}
            </div>
          </div>
        </Card>
      )}

      {view === 'Milestones' && <MilestoneRegister rows={ms.items} onEdit={(m) => setMsEdit({ item: m, isNew: false })} onAdd={() => setMsEdit({ item: newMilestone(), isNew: true })} />}
      {view === 'Dependencies' && <DependencyRegister rows={deps.items} onEdit={(d) => setDepEdit({ item: d, isNew: false })} onAdd={() => setDepEdit({ item: newDependency(), isNew: true })} />}

      {/* Bottom row */}
      <div className="grid grid-cols-[290px_1fr_392px] gap-4">
        <Card title="Milestone Status">
          <div className="flex items-center gap-3 pt-1">
            <div className="shrink-0"><Donut size={112} inner={0.74} data={[
              { name: 'On Track', value: msCounts.onTrack, color: CHART_COLORS.green }, { name: 'At Risk', value: msCounts.atRisk, color: CHART_COLORS.amber },
              { name: 'Delayed', value: msCounts.delayed, color: CHART_COLORS.red }, ...(msCounts.other ? [{ name: 'Pending', value: msCounts.other, color: '#CBD5E1' }] : []),
            ]} center={<><div className="text-[24px] font-bold text-ink-900 leading-none">{msCounts.total}</div><div className="text-[10px] text-ink-500 mt-0.5 whitespace-nowrap">Total Milestones</div></>} /></div>
            <div className="flex-1 min-w-0 space-y-2.5 text-[11.5px]">
              {[['On Track', msCounts.onTrack, CHART_COLORS.green], ['At Risk', msCounts.atRisk, CHART_COLORS.amber], ['Delayed', msCounts.delayed, CHART_COLORS.red], ...(msCounts.other ? [['Pending', msCounts.other, '#CBD5E1']] : [])].map(([l, n, c]) => (
                <button key={l as string} className="w-full flex items-center gap-2 cursor-pointer hover:text-brand-600" onClick={() => setView('Milestones')}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c as string }} /><span className="flex-1 text-left text-ink-700 whitespace-nowrap">{l as string}</span>
                  <span className="w-5 text-right font-semibold text-ink-900">{n as number}</span><span className="w-8 text-right text-ink-700">{pct(n as number)}%</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
        <Card title={<>Key Upcoming Milestones <span className="font-normal text-[13px] text-ink-700">(Next 90 days)</span></>} action={<div className="flex items-center gap-3"><button className="link inline-flex items-center gap-1" onClick={() => setMsEdit({ item: newMilestone(), isNew: true })}><Plus size={12} /> Add Milestone</button><ViewAll onClick={() => setView('Milestones')} /></div>}>
          <div className="[&_.td]:text-[11.5px]! [&_.td]:px-1.5! [&_.th]:px-1.5!">
          <Table<Milestone> compact rows={upcoming} onRowClick={(m) => setMsEdit({ item: m, isNew: false })} columns={[
            { key: 'name', header: 'Milestone', className: 'whitespace-nowrap' },
            { key: 'workstream', header: 'Workstream', width: '80px', render: (r) => msShort(r) },
            { key: 'dueDate', header: 'Due Date', width: '86px', className: 'whitespace-nowrap', render: (r) => fmtDate(r.dueDate) },
            { key: 'status', header: 'Status', width: '86px', render: (r) => <Badge value={r.status} /> },
            { key: 'owner', header: 'Owner', width: '70px', className: 'whitespace-nowrap' },
          ]} />
          </div>
        </Card>
        <Card title="Dependency Heatmap" action={<ViewAll label="View Details" onClick={() => setView('Dependencies')} />}>
          <div className="grid gap-[2px] text-[11.5px]" style={{ gridTemplateColumns: `58px repeat(${HEAT_WS.length}, 1fr)` }}>
            <span />
            {HEAT_WS.map((c) => <span key={c.ws} className="text-center font-medium text-ink-700 text-[10px] tracking-tight whitespace-nowrap pb-0.5">{c.label}</span>)}
            {HEAT_WS.map((r) => (
              <HeatRow key={r.ws} row={r} heat={heat} onCell={(on) => setCell({ from: r.ws, on })} />
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-[11.5px] text-ink-700">
            {IMPACTS.map((i) => <span key={i} className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: IMPACT_COLOR[i].bg }} />{i} ({depCounts[i]})</span>)}
          </div>
        </Card>
      </div>

      {/* ---------- Modals ---------- */}
      {planEdit && <PlanItemModal open value={planEdit.item} isNew={planEdit.isNew} codes={planCodes} onClose={() => setPlanEdit(null)} onSave={(v) => { if (planEdit.isNew) plan.add(v); else plan.update(v); setPlanEdit(null) }} onDelete={(id) => plan.remove(id)} />}
      {msEdit && <MilestoneModal open value={msEdit.item} isNew={msEdit.isNew} onClose={() => setMsEdit(null)} onSave={(v) => { if (msEdit.isNew) ms.add(v); else ms.update(v); setMsEdit(null) }} onDelete={(id) => ms.remove(id)} />}
      {depEdit && <DependencyModal open value={depEdit.item} isNew={depEdit.isNew} onClose={() => setDepEdit(null)} onSave={(v) => { if (depEdit.isNew) deps.add(v); else deps.update(v); setDepEdit(null) }} onDelete={(id) => deps.remove(id)} />}
      {cell && <HeatCellModal from={cell.from} on={cell.on} rows={cellDeps} onClose={() => setCell(null)} onAdd={(d) => deps.add(d)} onEdit={(d) => { setCell(null); setDepEdit({ item: d, isNew: false }) }} />}
    </div>
  )
}

/* ---------- Heatmap row ---------- */
function HeatRow({ row, heat, onCell }: { row: { label: string; ws: Workstream }; heat: Map<string, { count: number; top: Impact | null }>; onCell: (on: Workstream) => void }) {
  return (
    <>
      <span className="text-ink-700 font-medium flex items-center text-[11px] whitespace-nowrap">{row.label}</span>
      {HEAT_WS.map((c) => {
        if (c.ws === row.ws) return <span key={c.ws} className="h-[26px] rounded-[3px] bg-slate-200 text-slate-500 flex items-center justify-center">-</span>
        const h = heat.get(`${row.ws}|${c.ws}`)
        const col = h?.top ? IMPACT_COLOR[h.top] : { bg: '#F3F6FB', fg: '#9CA3AF' }
        return (
          <button key={c.ws} title={`${row.label} depends on ${c.label}: ${h?.count ?? 0} dependencies${h?.top ? ` (highest impact ${h.top})` : ''}`} onClick={() => onCell(c.ws)}
            className="h-[26px] rounded-[3px] flex items-center justify-center font-semibold cursor-pointer hover:ring-2 hover:ring-brand-400" style={{ background: col.bg, color: col.fg }}>{h?.count ?? ''}</button>
        )
      })}
    </>
  )
}

/* ---------- Heatmap cell modal: list + add ---------- */
function HeatCellModal({ from, on, rows, onClose, onAdd, onEdit }: { from: Workstream; on: Workstream; rows: Dependency[]; onClose: () => void; onAdd: (d: Dependency) => void; onEdit: (d: Dependency) => void }) {
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState<Dependency>(newDependency(from, on))
  return (
    <Modal open onClose={onClose} width="max-w-3xl" title={<>{WS_SHORT[from]} → {WS_SHORT[on]} dependencies <span className="text-ink-500 font-normal text-[13px]">({rows.length})</span></>}
      footer={adding ? <><button className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button><button className="btn-primary" onClick={() => { onAdd(f); setF(newDependency(from, on)); setAdding(false) }}>Save dependency</button></> : <><button className="btn-secondary" onClick={onClose}>Close</button><button className="btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> Add dependency</button></>}>
      <p className="text-[12.5px] text-ink-500 mb-3"><b className="text-ink-900">{from}</b> depends on <b className="text-ink-900">{on}</b>.</p>
      {adding ? <DependencyForm f={f} setF={setF} /> : (
        <Table<Dependency> compact rows={rows} onRowClick={onEdit} empty="No dependencies between these workstreams yet." columns={[
          { key: 'id', header: 'ID', render: (r) => r.id.toUpperCase() },
          { key: 'type', header: 'Type' },
          { key: 'description', header: 'Description', render: (r) => <span className="text-ink-700">{r.description}</span> },
          { key: 'impact', header: 'Impact', render: (r) => <Badge value={r.impact} /> },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
          { key: 'dueDate', header: 'Due', render: (r) => fmtDate(r.dueDate) },
          { key: 'owner', header: 'Owner' },
        ]} />
      )}
    </Modal>
  )
}

/* ---------- Milestones view ---------- */
function MilestoneRegister({ rows, onEdit, onAdd }: { rows: Milestone[]; onEdit: (m: Milestone) => void; onAdd: () => void }) {
  const [q, setQ] = useState('')
  const [ws, setWs] = useState('All workstreams')
  const [st, setSt] = useState('All statuses')
  const [ph, setPh] = useState('All phases')
  const [key, setKey] = useState(false)
  const filtered = rows.filter((m) => (ws === 'All workstreams' || m.workstream === ws) && (st === 'All statuses' || m.status === st) && (ph === 'All phases' || m.phase === ph) && (!key || m.critical)
    && (!q || `${m.name} ${m.owner}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const counts = { total: filtered.length, overdue: filtered.filter((m) => m.status !== 'Completed' && m.dueDate < TODAY).length, done: filtered.filter((m) => m.status === 'Completed').length }
  return (
    <Card title="Milestone Register" subtitle={`${counts.total} milestones · ${counts.done} completed · ${counts.overdue} past due and not complete`} action={<button className="btn-primary" onClick={onAdd}><Plus size={14} /> Add Milestone</button>}>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative w-64"><Search size={14} className="absolute left-2.5 top-2.5 text-ink-400" /><Input className="!pl-8" placeholder="Search milestone or owner" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select className="!w-56" options={['All workstreams', ...WORKSTREAMS]} value={ws} onChange={(e) => setWs(e.target.value)} />
        <Select className="!w-40" options={['All statuses', ...MS_STATUSES]} value={st} onChange={(e) => setSt(e.target.value)} />
        <Select className="!w-36" options={['All phases', ...MS_PHASES]} value={ph} onChange={(e) => setPh(e.target.value)} />
        <label className="flex items-center gap-1.5 text-[12.5px] text-ink-700 cursor-pointer ml-1"><input type="checkbox" checked={key} onChange={(e) => setKey(e.target.checked)} /> Key milestones only</label>
      </div>
      <Table<Milestone> compact rows={filtered} onRowClick={onEdit} columns={[
        { key: 'name', header: 'Milestone', render: (r) => <span className="font-medium">{r.name}{r.critical && <span className="ml-1.5 text-[10px] text-brand-600 bg-brand-50 rounded px-1 py-px align-middle">KEY</span>}</span> },
        { key: 'workstream', header: 'Workstream', render: (r) => <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: WORKSTREAM_META[r.workstream]?.color }} />{r.workstream}</span> },
        { key: 'phase', header: 'Phase' },
        { key: 'startDate', header: 'Start', render: (r) => (r.startDate ? fmtDate(r.startDate) : <span className="text-ink-400">–</span>) },
        { key: 'dueDate', header: 'Due Date', render: (r) => <span className={r.status !== 'Completed' && r.dueDate < TODAY ? 'text-red-600 font-medium' : ''}>{fmtDate(r.dueDate)}</span> },
        { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
        { key: 'owner', header: 'Owner' },
        { key: 'progress', header: 'Progress', width: '140px', render: (r) => { const v = r.progress ?? (r.status === 'Completed' ? 100 : 0); return <span className="flex items-center gap-2"><Progress value={v} className="w-20" /><span className="text-[12px] w-8">{v}%</span></span> } },
      ]} />
    </Card>
  )
}

/* ---------- Dependencies view ---------- */
function DependencyRegister({ rows, onEdit, onAdd }: { rows: Dependency[]; onEdit: (d: Dependency) => void; onAdd: () => void }) {
  const [from, setFrom] = useState('All workstreams')
  const [on, setOn] = useState('All workstreams')
  const [imp, setImp] = useState('All impacts')
  const [st, setSt] = useState('All statuses')
  const rank: Record<Impact, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  const filtered = rows.filter((d) => (from === 'All workstreams' || d.from === from) && (on === 'All workstreams' || d.on === on) && (imp === 'All impacts' || d.impact === imp) && (st === 'All statuses' || d.status === st))
    .sort((a, b) => rank[a.impact] - rank[b.impact] || a.dueDate.localeCompare(b.dueDate))
  const open = filtered.filter((d) => d.status !== 'Completed')
  return (
    <Card title="Dependency Register" subtitle={`${filtered.length} dependencies · ${open.length} open · ${open.filter((d) => d.status === 'At Risk' || d.status === 'Delayed').length} at risk or delayed`} action={<button className="btn-primary" onClick={onAdd}><Plus size={14} /> Add Dependency</button>}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[12px] text-ink-500">Workstream</span><Select className="!w-52" options={['All workstreams', ...WORKSTREAMS]} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-[12px] text-ink-500 ml-1">depends on</span><Select className="!w-52" options={['All workstreams', ...WORKSTREAMS]} value={on} onChange={(e) => setOn(e.target.value)} />
        <Select className="!w-36" options={['All impacts', ...IMPACTS]} value={imp} onChange={(e) => setImp(e.target.value)} />
        <Select className="!w-36" options={['All statuses', ...DEP_STATUSES]} value={st} onChange={(e) => setSt(e.target.value)} />
      </div>
      <Table<Dependency> compact rows={filtered} onRowClick={onEdit} columns={[
        { key: 'id', header: 'ID', render: (r) => <span className="text-ink-500">{r.id.toUpperCase()}</span> },
        { key: 'from', header: 'Workstream', render: (r) => WS_SHORT[r.from] },
        { key: 'on', header: 'Depends on', render: (r) => <span className="font-medium">{WS_SHORT[r.on]}</span> },
        { key: 'type', header: 'Type' },
        { key: 'description', header: 'Description', render: (r) => <span className="text-ink-700 block max-w-[380px] truncate" title={r.description}>{r.description}</span> },
        { key: 'impact', header: 'Impact', render: (r) => <Badge value={r.impact} /> },
        { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
        { key: 'dueDate', header: 'Due Date', render: (r) => fmtDate(r.dueDate) },
        { key: 'owner', header: 'Owner' },
      ]} />
    </Card>
  )
}
