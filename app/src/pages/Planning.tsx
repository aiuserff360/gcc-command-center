import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, CalendarCheck, Share2, CalendarDays, Target, ChevronLeft, ChevronRight, Plus, Flag, Layers, Search, ExternalLink, Info } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { InputLayout } from '../components/layout/InputLayout'
import { Card, KpiTile, Badge, Table, ViewAll, Modal, Progress, Tabs, Input, Select } from '../components/ui'
import { Donut } from '../components/charts'
import { useCollection, useStore, uid } from '../store/useStore'
import { ProgramKpiEditor } from '../components/ProgramKpiEditor'
import { seedMilestones, seedProgramKpis, seedDependencies, seedRaid, isOpen, type Milestone, type ProgramKpis, type Dependency, type RaidItem } from '../data/shared'
import { WORKSTREAMS, WORKSTREAM_META, MONTHS, TODAY, CHART_COLORS, type Workstream, type Impact } from '../data/common'
import { initiativeToPlan, milestoneToPlan, activityToPlan, type PlanItem } from '../data/planning'
import { seedInitiatives, seedTeamMembers, seedWsBudgetLines, raidWorkstreamOf, type Initiative, type TeamMember, type WsBudgetLine } from '../data/workstreams'
import { seedActivities, WBS_TO_DASHBOARD, type Activity } from '../data/wbs'
import { useMoney } from '../data/money'
import { Gantt, type GanttGroup, type GanttScale, type GanttChange } from '../components/planning/Gantt'
import { MilestoneModal, DependencyModal, DependencyForm, MS_STATUSES, MS_PHASES, IMPACTS, DEP_STATUSES } from '../components/planning/Modals'
import { PlanSettingsForm } from '../components/planning/PlanSettings'
import { useWsRows, DependenciesView, RisksView, BudgetView } from '../components/workstreams/views'
import { PeopleView } from '../components/workstreams/People'
import { DeliverablesView, ActivityForm } from '../components/workstreams/Deliverables'
import { InitiativeForm } from '../components/workstreams/forms'
import { wsIcon, Strip } from '../components/workstreams/common'

/** "23 Oct 2026" with 3-letter months */
const fmtDate = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? iso : `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` }

const VIEWS = ['Workstream', 'Master Plan', 'Milestones', 'Dependencies'] as const
type View = (typeof VIEWS)[number]
const DETAIL_TABS = ['Dependencies', 'Risks & Issues', 'People & Roles', 'Budget', 'Deliverables register'] as const

/* Short workstream labels as used in the mock-up tables */
const WS_SHORT: Record<string, string> = {
  'Talent & Hiring': 'Talent', 'Technology & Infrastructure': 'Technology', 'Legal & Compliance': 'Compliance', 'Facilities & Workplace': 'Facilities',
  'Transition Readiness': 'Transition', 'Operations Setup': 'Operations', 'Finance & Procurement': 'Finance',
}
const msShort = (m: Milestone) => (m.name.startsWith('Go/No-Go') ? 'Program' : WS_SHORT[m.workstream] ?? m.workstream)
const WS_ICON_CLS: Record<string, string> = {
  'Talent & Hiring': 'bg-blue-50 text-brand-600', 'Technology & Infrastructure': 'bg-green-50 text-green-600', 'Legal & Compliance': 'bg-violet-50 text-violet-600',
  'Facilities & Workplace': 'bg-amber-50 text-amber-600', 'Transition Readiness': 'bg-violet-50 text-violet-600', 'Operations Setup': 'bg-teal-50 text-teal-600', 'Finance & Procurement': 'bg-green-50 text-green-600',
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

const newMilestone = (ws: Workstream = 'Talent & Hiring'): Milestone => ({ id: uid('ms'), name: '', workstream: ws, dueDate: TODAY, status: 'On Track', owner: 'A. Sharma', phase: 'Build', progress: 0, critical: false })
const newDependency = (from: Workstream = 'Talent & Hiring', on: Workstream = 'Technology & Infrastructure'): Dependency =>
  ({ id: uid('dep'), from, on, type: 'System Access', description: '', impact: 'Medium', status: 'On Track', dueDate: TODAY, owner: 'A. Sharma' })
const newInitiative = (ws: Workstream): Initiative => ({ id: uid('init'), name: '', workstream: ws, owner: 'A. Sharma', status: 'Not Started', start: TODAY, end: '2026-12-31', progress: 0 })
const newActivity = (ws: Workstream, sub: string, wbs: string, code: string): Activity => ({
  id: uid('act'), code, name: '', wbsWorkstream: wbs, subWorkstream: sub, workstream: ws, responsible: 'A. Sharma', accountable: 'A. Sharma', vendor: '',
  baselineStart: TODAY, baselineEnd: '2026-12-31', forecastStart: TODAY, forecastEnd: '2026-12-31', actualStart: '', actualEnd: '', status: 'Not Started', percentComplete: 0, rag: 'Green', daysDelayed: 0,
  predecessor: '', successor: '', criticalPath: false, budgetLakh: 0, commitmentLakh: 0, actualLakh: 0, forecastLakh: 0, deliverable: '', acceptanceCriteria: '', evidence: '', signOff: 'Pending', lastUpdated: TODAY,
})
const byStart = (a: { start: string }, b: { start: string }) => a.start.localeCompare(b.start)
const byDue = (a: Milestone, b: Milestone) => a.dueDate.localeCompare(b.dueDate)
const uniq = (a: string[]) => a.filter((v, i) => v && a.indexOf(v) === i)
const numeric = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })

export default function Planning() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [view, setView] = useState<View>(VIEWS.includes(params.get('view') as View) ? (params.get('view') as View) : 'Workstream')
  const [editKpis, setEditKpis] = useState(false)
  const mode = useStore((s) => s.mode)
  const kpisC = useCollection<ProgramKpis>('programKpis', seedProgramKpis)
  const k = kpisC.items[0] ?? seedProgramKpis[0]
  const ms = useCollection<Milestone>('milestones', seedMilestones)
  const deps = useCollection<Dependency>('dependencies', seedDependencies)
  const inits = useCollection<Initiative>('initiatives', seedInitiatives)
  const acts = useCollection<Activity>('activities', seedActivities)
  const { items: raid } = useCollection<RaidItem>('raid', seedRaid)
  const { items: team } = useCollection<TeamMember>('teamMembers', seedTeamMembers)
  const { items: lines } = useCollection<WsBudgetLine>('wsBudgetLines', seedWsBudgetLines)
  const wss = useWsRows()
  const money = useMoney()

  /* Selected workstream (deep link: /planning?ws=<name>) */
  const [ws, setWs] = useState<Workstream>(() => { const p = params.get('ws'); return (p && WORKSTREAMS.includes(p as Workstream) ? p : 'Technology & Infrastructure') as Workstream })
  useEffect(() => { const p = params.get('ws'); if (p && wss.items.some((w) => w.name === p)) setWs(p as Workstream) }, [params, wss.items])
  const [detail, setDetail] = useState<(typeof DETAIL_TABS)[number]>('Dependencies')

  /* Gantt controls */
  const [scale, setScale] = useState<GanttScale>('Months')
  const [critical, setCritical] = useState(true)
  const [scrollStep, setScrollStep] = useState(0)
  const [showActs, setShowActs] = useState(true)

  /* Modals */
  const [msEdit, setMsEdit] = useState<{ item: Milestone; isNew: boolean } | null>(null)
  const [depEdit, setDepEdit] = useState<{ item: Dependency; isNew: boolean } | null>(null)
  const [initEdit, setInitEdit] = useState<{ item: Initiative; isNew: boolean } | null>(null)
  const [actEdit, setActEdit] = useState<{ item: Activity; isNew: boolean } | null>(null)
  const [cell, setCell] = useState<{ from: Workstream; on: Workstream } | null>(null)

  /* ---------- program-wide derived ---------- */
  const scopedMs = useMemo(() => (view === 'Workstream' ? ms.items.filter((m) => m.workstream === ws) : ms.items), [ms.items, view, ws])
  const msCounts = useMemo(() => {
    const c = (s: string[]) => scopedMs.filter((m) => s.includes(m.status)).length
    return { onTrack: c(['On Track', 'Completed']), atRisk: c(['At Risk']), delayed: c(['Delayed']), other: c(['Pending', 'Not Started']), total: scopedMs.length }
  }, [scopedMs])
  const allMsCounts = useMemo(() => {
    const c = (s: string[]) => ms.items.filter((m) => s.includes(m.status)).length
    return { onTrack: c(['On Track', 'Completed']), atRisk: c(['At Risk']), delayed: c(['Delayed']), total: ms.items.length }
  }, [ms.items])
  const pct = (n: number) => (msCounts.total ? Math.round((n / msCounts.total) * 100) : 0)
  const upcoming = useMemo(() => {
    const open = scopedMs.filter((m) => m.status !== 'Completed' && m.dueDate >= TODAY).sort(byDue)
    const limit = new Date(TODAY + 'T00:00:00'); limit.setDate(limit.getDate() + 90)
    const key = open.filter((m) => m.critical && m.dueDate <= limit.toISOString().slice(0, 10))
    return (view === 'Workstream' ? open : key.length ? key : open).slice(0, 7)
  }, [scopedMs, view])
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

  /* ---------- Master plan: one group per workstream, rows = initiatives + key milestones ---------- */
  const masterGroups = useMemo<GanttGroup[]>(() => wss.items.map((w, gi) => {
    const n = gi + 1, name = w.name as Workstream
    const its = inits.items.filter((i) => i.workstream === name).sort(byStart).map((i, idx) => initiativeToPlan(i, n, `${n}.${idx + 1}`, ms.items.find((m) => m.id === i.milestoneId)))
    const keyMs = ms.items.filter((m) => m.workstream === name && m.critical).sort(byDue).map((m, idx) => milestoneToPlan(m, n, `${n}.M${idx + 1}`))
    return { n, name, icon: wsIcon(name, 12), iconClass: WS_ICON_CLS[name] ?? 'bg-blue-50 text-brand-600', items: [...its, ...keyMs], owner: w.lead }
  }), [wss.items, inits.items, ms.items])

  /* ---------- Workstream plan: Initiatives, Milestones, then WBS sub-workstreams with their activities ---------- */
  const wsActs = useMemo(() => acts.items.filter((a) => a.workstream === ws), [acts.items, ws])
  const subGroupsMeta = useMemo(() => uniq(wsActs.map((a) => a.subWorkstream)).sort(numeric), [wsActs])
  const wsGroups = useMemo<GanttGroup[]>(() => {
    const its = inits.items.filter((i) => i.workstream === ws).sort(byStart).map((i, idx) => initiativeToPlan(i, 1, `I${idx + 1}`, ms.items.find((m) => m.id === i.milestoneId)))
    const mss = ms.items.filter((m) => m.workstream === ws).sort(byDue).map((m, idx) => milestoneToPlan(m, 2, `M${idx + 1}`))
    const groups: GanttGroup[] = [
      { n: 1, name: 'Initiatives', label: `Initiatives (${its.length})`, icon: <Flag size={12} />, iconClass: 'bg-blue-50 text-brand-600', items: its },
      { n: 2, name: 'Milestones', label: `Milestones (${mss.length})`, icon: <CalendarCheck size={12} />, iconClass: 'bg-green-50 text-green-600', items: mss },
    ]
    if (showActs) subGroupsMeta.forEach((sub, i) => {
      const rows = wsActs.filter((a) => a.subWorkstream === sub).sort((a, b) => numeric(a.code, b.code)).map((a) => activityToPlan(a, 3 + i))
      groups.push({ n: 3 + i, name: sub, label: `${sub} (${rows.length} activities)`, icon: <Layers size={12} />, iconClass: 'bg-slate-100 text-slate-600', items: rows })
    })
    return groups
  }, [inits.items, ms.items, wsActs, subGroupsMeta, ws, showActs])
  const collapsedSubs = useMemo(() => subGroupsMeta.map((_, i) => 3 + i), [subGroupsMeta])

  /* ---------- Workstream summary strip ---------- */
  const wsRow = wss.items.find((w) => w.name === ws)
  const summary = useMemo(() => {
    const its = inits.items.filter((i) => i.workstream === ws)
    const mss = ms.items.filter((m) => m.workstream === ws)
    const done = wsActs.filter((a) => a.status === 'Completed').length
    const risks = raid.filter((r) => raidWorkstreamOf(r.workstream) === ws && isOpen(r))
    const dep = deps.items.filter((d) => d.from === ws)
    const budget = lines.filter((l) => l.workstream === ws)
    const planned = budget.reduce((s, l) => s + l.plannedCr, 0), actual = budget.reduce((s, l) => s + l.actualCr, 0)
    const avg = wsActs.length ? Math.round(wsActs.reduce((s, a) => s + a.percentComplete, 0) / wsActs.length) : 0
    return { its, active: its.filter((i) => i.status !== 'Completed').length, mss, msOk: mss.filter((m) => m.status === 'On Track' || m.status === 'Completed').length, done, avg, risks, dep, planned, actual, team: team.filter((t) => t.workstream === ws).length }
  }, [inits.items, ms.items, wsActs, raid, deps.items, lines, team, ws])

  const dateRange = `${fmtDate(k.timelineStart)} – ${fmtDate(k.timelineEnd)}`
  const maxStep = scale === 'Weeks' ? 90 : scale === 'Months' ? 18 : 6
  const wbsOf = (sub: string) => wsActs.find((a) => a.subWorkstream === sub)?.wbsWorkstream ?? Object.keys(WBS_TO_DASHBOARD).find((w) => WBS_TO_DASHBOARD[w] === ws) ?? ''
  const nextActCode = (sub: string) => { const n = wsActs.filter((a) => a.subWorkstream === sub).length + 1; return `${sub.split(' ')[0]}.${n}` }

  const commitDates = (it: PlanItem, c: GanttChange) => {
    if (it.kind === 'initiative') { const i = inits.items.find((x) => x.id === it.sourceId); if (i) inits.update({ ...i, start: c.start, end: c.end }) }
    else if (it.kind === 'milestone') { const m = ms.items.find((x) => x.id === it.sourceId); if (m) ms.update({ ...m, dueDate: c.end, startDate: m.startDate ? c.start : m.startDate }) }
    else { const a = acts.items.find((x) => x.id === it.sourceId); if (a) acts.update({ ...a, forecastStart: c.start, forecastEnd: c.end, lastUpdated: TODAY }) }
  }
  const openPlanItem = (it: PlanItem) => {
    if (it.kind === 'initiative') { const i = inits.items.find((x) => x.id === it.sourceId); if (i) setInitEdit({ item: i, isNew: false }) }
    else if (it.kind === 'milestone') { const m = ms.items.find((x) => x.id === it.sourceId); if (m) setMsEdit({ item: m, isNew: false }) }
    else { const a = acts.items.find((x) => x.id === it.sourceId); if (a) setActEdit({ item: a, isNew: false }) }
  }
  const addToGroup = (g: GanttGroup, scope: Workstream) => {
    if (view === 'Master Plan') { setInitEdit({ item: newInitiative(g.name as Workstream), isNew: true }); return }
    if (g.n === 1) setInitEdit({ item: newInitiative(scope), isNew: true })
    else if (g.n === 2) setMsEdit({ item: newMilestone(scope), isNew: true })
    else setActEdit({ item: newActivity(scope, g.name, wbsOf(g.name), nextActCode(g.name)), isNew: true })
  }

  const ganttToolbar = (
    <div className="flex items-center gap-2">
      {view === 'Workstream' && (
        <label className="flex items-center gap-1.5 text-[12px] text-ink-700 cursor-pointer select-none mr-1"><input type="checkbox" checked={showActs} onChange={(e) => setShowActs(e.target.checked)} /> WBS activities</label>
      )}
      <div className="flex items-center rounded-md border border-line overflow-hidden text-[12px]">
        <button title="Scroll to start" className="px-2 py-1 hover:bg-surface cursor-pointer border-r border-line" onClick={() => setScrollStep(0)}>L</button>
        <button title="Previous" className="px-1.5 py-1 hover:bg-surface cursor-pointer border-r border-line" onClick={() => setScrollStep((s) => Math.max(0, s - 3))}><ChevronLeft size={14} /></button>
        <button title="Next" className="px-1.5 py-1 hover:bg-surface cursor-pointer" onClick={() => setScrollStep((s) => Math.min(maxStep, s + 3))}><ChevronRight size={14} /></button>
      </div>
      <select value={scale} onChange={(e) => { setScale(e.target.value as GanttScale); setScrollStep(0) }} className="rounded-md border border-line bg-white px-2 py-1 text-[12px] font-medium outline-none cursor-pointer">
        <option>Weeks</option><option>Months</option><option>Quarters</option>
      </select>
      <label className="flex items-center gap-2 text-[12px] text-ink-700 cursor-pointer select-none">
        Critical Path
        <button role="switch" aria-checked={critical} onClick={() => setCritical((c) => !c)} className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${critical ? 'bg-brand-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${critical ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </label>
    </div>
  )
  const legend = (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="inline-flex items-center gap-1.5"><span className="w-5 h-1.5 rounded-sm bg-slate-800" /> Summary</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm" style={{ background: '#3B82F6' }} /> On Track / Completed</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm" style={{ background: '#F59E0B' }} /> At Risk</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm" style={{ background: '#EF4444' }} /> Delayed / Critical path</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm bg-slate-400" /> Not Started / Pending</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-5 h-[3px] rounded-sm bg-slate-400/70" /> Baseline</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rotate-45 bg-slate-900" /> Milestone</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-5 border-t border-dashed border-red-500" /> Today</span>
    </div>
  )

  const cellDeps = cell ? deps.items.filter((d) => d.from === cell.from && d.on === cell.on) : []
  const masterCount = masterGroups.reduce((s, g) => s + g.items.length, 0)

  /* ---------- Input view: Program Planning is an output of Workstreams, so only the shared registers and the plan settings live here ---------- */
  const INPUT_HINT = 'Initiatives, milestones, activities and people are entered under Workstreams; this timeline reflects them.'
  if (mode === 'input') {
    return (
      <>
        <InputLayout title="Program Planning" subtitle={INPUT_HINT}
          right={<button className="btn-secondary" onClick={() => nav('/workstreams')}>Enter plan under Workstreams <ExternalLink size={14} /></button>}
          tabs={[
            { name: 'Milestones register', content: <MilestoneRegister rows={ms.items} onEdit={(m) => setMsEdit({ item: m, isNew: false })} onAdd={() => setMsEdit({ item: newMilestone(), isNew: true })} />, hint: 'Shared with the Workstreams page and the Dashboard. Click a row to edit it; the Workstreams Input view has the same rows as an inline grid.' },
            { name: 'Dependencies register', content: <DependencyRegister rows={deps.items} onEdit={(d) => setDepEdit({ item: d, isNew: false })} onAdd={() => setDepEdit({ item: newDependency(), isNew: true })} />, hint: 'Cross-workstream dependencies behind the heatmap and the dependency matrix.' },
            { name: 'Plan settings', content: <PlanSettingsForm value={k} onChange={(v) => kpisC.update(v)} milestones={ms.items} />, hint: 'Timeline window, go-live target and milestone adherence shown on the page header and KPI tiles.' },
          ]} />
        {msEdit && <MilestoneModal open value={msEdit.item} isNew={msEdit.isNew} onClose={() => setMsEdit(null)} onSave={(v) => { if (msEdit.isNew) ms.add(v); else ms.update(v); setMsEdit(null) }} onDelete={(id) => ms.remove(id)} />}
        {depEdit && <DependencyModal open value={depEdit.item} isNew={depEdit.isNew} onClose={() => setDepEdit(null)} onSave={(v) => { if (depEdit.isNew) deps.add(v); else deps.update(v); setDepEdit(null) }} onDelete={(id) => deps.remove(id)} />}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Program Planning" subtitle="Integrated plan, milestones and dependencies across the GCC lifecycle – built from the inputs captured on the Workstreams page." viewValue={view} viewOptions={VIEWS} onView={(v) => setView(v as View)} dateRange={dateRange} onEdit={() => setEditKpis(true)} editLabel="Edit KPIs" />
      <ProgramKpiEditor open={editKpis} onClose={() => setEditKpis(false)} value={k} onSave={(v) => { kpisC.update(v); setEditKpis(false) }} />

      {/* KPI tiles */}
      <div className="grid grid-cols-[1fr_1.12fr_1.18fr_1fr_0.9fr] gap-4">
        <KpiTile tone="green" icon={<CheckCircle2 size={22} />} value={`${k.programCompletion}%`} label="Overall Program Progress" trend="up" sub={<span className="text-green-600">+{k.programCompletionDelta}% vs last month</span>} />
        <KpiTile tone="blue" icon={<CalendarCheck size={22} />} value={allMsCounts.total} label="Total Milestones" sub={<span><span className="text-green-600">{allMsCounts.onTrack} On Track</span><span className="text-ink-400 mx-1">|</span><span className="text-amber-600">{allMsCounts.atRisk} At Risk</span><span className="text-ink-400 mx-1">|</span><span className="text-red-600">{allMsCounts.delayed} Delayed</span></span>} />
        <KpiTile tone="violet" icon={<Share2 size={22} />} value={depCounts.total} label="Cross-workstream Dependencies" sub={<span className="text-red-600"><span className="text-[9px] align-middle">▼</span> {depCounts.Critical} Critical</span>} />
        <KpiTile tone="orange" icon={<CalendarDays size={22} />} value={fmtDate(k.goLiveTarget)} label="Current Go-Live Target" sub={<span className="text-red-600"><span className="text-[9px] align-middle">▲</span> +{k.goLiveVarianceWeeks} weeks vs baseline</span>} />
        <KpiTile tone="blue" icon={<Target size={22} />} value={`${k.milestoneAdherence}%`} label="Milestone Adherence" trend="up" sub={<span className="text-green-600">+{k.milestoneAdherenceDelta}% vs last month</span>} />
      </div>

      {/* ---------- Workstream view (default) ---------- */}
      {view === 'Workstream' && (
        <>
          <div className="card px-4 py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-ink-700">Select Workstream</span>
                <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 min-w-[320px] cursor-pointer">
                  <span className="text-brand-600">{wsIcon(ws, 18)}</span>
                  <select value={ws} onChange={(e) => { setWs(e.target.value as Workstream); setScrollStep(0) }} className="flex-1 bg-transparent outline-none text-[14px] font-semibold text-ink-900 cursor-pointer">
                    {wss.items.map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
                  </select>
                </label>
                {wsRow && <Badge value={wsRow.status} />}
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden xl:inline-flex items-center gap-1.5 text-[12px] text-ink-500"><Info size={13} /> Inputs are managed on the Workstreams page; this view reflects them.</span>
                <button className="btn-secondary" onClick={() => nav(`/workstreams?ws=${encodeURIComponent(ws)}`)}>Open in Workstreams <ExternalLink size={14} /></button>
              </div>
            </div>
            <div className="mt-3 -mb-3">
              <Strip items={[
                { label: 'Progress', value: `${wsRow?.progress ?? 0}%`, color: '#1E5BBE' },
                { label: 'Lead / Sponsor', value: <span className="text-[14px]">{wsRow?.lead ?? '—'} · {wsRow?.executiveSponsor ?? '—'}</span> },
                { label: 'Initiatives (active / total)', value: `${summary.active} / ${summary.its.length}` },
                { label: 'Milestones (on track / total)', value: `${summary.msOk} / ${summary.mss.length}`, color: summary.msOk === summary.mss.length ? '#16A34A' : '#F59E0B' },
                { label: 'WBS activities complete', value: `${summary.done} / ${wsActs.length}` },
                { label: 'Avg. activity completion', value: `${summary.avg}%` },
                { label: 'Open risks & issues', value: summary.risks.length, color: summary.risks.length ? '#DC2626' : '#16A34A' },
                { label: 'Dependencies on others', value: summary.dep.length },
                { label: 'Team members', value: summary.team },
                { label: `Spend / plan (${money.unitLabel})`, value: `${money.num(summary.actual)} / ${money.num(summary.planned)}` },
              ]} />
            </div>
          </div>

          <Card title={`${ws} – Plan`} subtitle={`${summary.its.length} initiatives · ${summary.mss.length} milestones · ${wsActs.length} WBS activities in ${subGroupsMeta.length} sub-workstreams`} headerRight={ganttToolbar}>
            <Gantt groups={wsGroups} rangeStart={k.timelineStart} rangeEnd={k.timelineEnd} today={TODAY} scale={scale} criticalPath={critical} scrollStep={scrollStep} defaultCollapsed={collapsedSubs}
              leftHeader="Task Name" onItemClick={openPlanItem} onAddItem={(g) => addToGroup(g, ws)} onItemChange={commitDates} />
            <div className="flex items-center justify-between mt-3 text-[12px] text-ink-500">{legend}<span>click a row to open it · drag a bar to move it, drag its edge to change start or finish · expand a sub-workstream for its activities</span></div>
          </Card>

          <Tabs tabs={[...DETAIL_TABS]} active={detail} onChange={(t) => setDetail(t as (typeof DETAIL_TABS)[number])} />
          {detail === 'Deliverables register' && <DeliverablesView ws={ws} />}
          {detail === 'Dependencies' && <DependenciesView ws={ws} />}
          {detail === 'Risks & Issues' && <RisksView ws={ws} />}
          {detail === 'People & Roles' && <PeopleView ws={ws} />}
          {detail === 'Budget' && <BudgetView ws={ws} />}
        </>
      )}

      {/* ---------- Master plan ---------- */}
      {view === 'Master Plan' && (
        <Card title="Program Timeline" subtitle="All workstreams – initiatives and key milestones as entered on the Workstreams page" headerRight={ganttToolbar}>
          <Gantt groups={masterGroups} rangeStart={k.timelineStart} rangeEnd={k.timelineEnd} today={TODAY} scale={scale} criticalPath={critical} scrollStep={scrollStep}
            leftHeader="Task Name" onItemClick={openPlanItem} onAddItem={(g) => addToGroup(g, g.name as Workstream)} onItemChange={commitDates} />
          <div className="flex items-center justify-between mt-3 text-[12px] text-ink-500">{legend}<span>{masterCount} rows across {masterGroups.length} workstreams · click a row to open it · drag bars to re-plan</span></div>
        </Card>
      )}

      {view === 'Milestones' && <MilestoneRegister rows={ms.items} onEdit={(m) => setMsEdit({ item: m, isNew: false })} onAdd={() => setMsEdit({ item: newMilestone(), isNew: true })} />}
      {view === 'Dependencies' && <DependencyRegister rows={deps.items} onEdit={(d) => setDepEdit({ item: d, isNew: false })} onAdd={() => setDepEdit({ item: newDependency(), isNew: true })} />}

      {/* Bottom row */}
      <div className="grid grid-cols-[290px_1fr_392px] gap-4">
        <Card title={view === 'Workstream' ? `Milestone Status – ${WS_SHORT[ws]}` : 'Milestone Status'}>
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
        <Card title={<>{view === 'Workstream' ? `Upcoming Milestones – ${WS_SHORT[ws]}` : 'Key Upcoming Milestones'} <span className="font-normal text-[13px] text-ink-700">(Next 90 days)</span></>} action={<div className="flex items-center gap-3"><button className="link inline-flex items-center gap-1" onClick={() => setMsEdit({ item: newMilestone(view === 'Workstream' ? ws : 'Talent & Hiring'), isNew: true })}><Plus size={12} /> Add Milestone</button><ViewAll onClick={() => setView('Milestones')} /></div>}>
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

      {/* ---------- Modals (same forms as the Workstreams page, so edits stay in sync) ---------- */}
      {msEdit && <MilestoneModal open value={msEdit.item} isNew={msEdit.isNew} onClose={() => setMsEdit(null)} onSave={(v) => { if (msEdit.isNew) ms.add(v); else ms.update(v); setMsEdit(null) }} onDelete={(id) => ms.remove(id)} />}
      {depEdit && <DependencyModal open value={depEdit.item} isNew={depEdit.isNew} onClose={() => setDepEdit(null)} onSave={(v) => { if (depEdit.isNew) deps.add(v); else deps.update(v); setDepEdit(null) }} onDelete={(id) => deps.remove(id)} />}
      {initEdit && <InitiativeForm initial={initEdit.item} isNew={initEdit.isNew} wsOptions={wss.names} milestones={ms.items} onClose={() => setInitEdit(null)} onSave={(v) => { if (initEdit.isNew) inits.add(v); else inits.update(v); setInitEdit(null) }} onDelete={initEdit.isNew ? undefined : () => { inits.remove(initEdit.item.id); setInitEdit(null) }} />}
      {actEdit && <ActivityForm initial={actEdit.item} isNew={actEdit.isNew} onClose={() => setActEdit(null)} onSave={(v) => { if (actEdit.isNew) acts.add({ ...v, lastUpdated: TODAY }); else acts.update({ ...v, lastUpdated: TODAY }); setActEdit(null) }} onDelete={actEdit.isNew ? undefined : () => { acts.remove(actEdit.item.id); setActEdit(null) }} />}
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
