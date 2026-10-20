import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { ExternalLink, Pencil, CalendarRange } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Progress, Table, ViewAll, Tabs, Modal } from '../ui'
import { tooltipStyle } from '../charts'
import { useCollection } from '../../store/useStore'
import { seedMilestones, seedRaid, seedDependencies, isOpen, type Milestone, type RaidItem, type Dependency } from '../../data/shared'
import { seedInitiatives, seedTeamMembers, seedWsBudgetLines, seedWsDocuments, raidWorkstreamOf, WS_TOP_RAID, IMPACT_RANK, type Initiative, type TeamMember, type WsBudgetLine, type WsDocument } from '../../data/workstreams'
import { fmtDate, CHART_COLORS, TODAY, type Workstream } from '../../data/common'
import { WsIcon, wsIcon, progressColor, fmtMoneyShort, byDate, shortWs, type WsRow } from './common'
import { useMoney } from '../../data/money'
import { InitiativesView, MilestonesView, RisksView, BudgetView, DependenciesView, DocumentsView } from './views'
import { PeopleView } from './People'
import { DeliverablesView } from './Deliverables'

export const SUB_TABS = ['Executive Summary', 'People & Roles', 'Milestones', 'Initiatives', 'Budget', 'Risks & Issues', 'Dependencies', 'Deliverables', 'Documents']

export function DrillDown({ wss, selected, onSelect, onEditWorkstream, initialTab }: { wss: WsRow[]; selected: string; onSelect: (n: string) => void; onEditWorkstream: (w: WsRow) => void; initialTab?: string }) {
  const [tab, setTab] = useState(initialTab && SUB_TABS.includes(initialTab) ? initialTab : SUB_TABS[0])
  const [full, setFull] = useState(false)
  const nav = useNavigate()
  const w = wss.find((x) => x.name === selected) ?? wss[0]
  if (!w) return null
  const ws = w.name as Workstream
  return (
    <div className="space-y-4">
      <div className="card px-4 pt-3 pb-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-ink-700">Select Workstream</span>
            <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 min-w-[320px] cursor-pointer">
              <span className="text-brand-600">{wsIcon(ws, 18)}</span>
              <select value={w.name} onChange={(e) => onSelect(e.target.value)} className="flex-1 bg-transparent outline-none text-[14px] font-semibold text-ink-900 cursor-pointer">
                {wss.map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" title="Everything entered here is reflected on the Program Planning timeline" onClick={() => nav(`/planning?ws=${encodeURIComponent(w.name)}`)}><CalendarRange size={14} /> View in Program Planning</button>
            <button className="btn-primary" onClick={() => setFull(true)}>View Full Workstream <ExternalLink size={14} /></button>
          </div>
        </div>
        <Tabs size="sm" tabs={SUB_TABS} active={tab} onChange={setTab} className="!border-0 !shadow-none !rounded-none !px-0" />
      </div>
      {tab === 'Executive Summary' && <ExecutiveSummary w={w} onTab={setTab} onEdit={() => onEditWorkstream(w)} />}
      {tab === 'Milestones' && <MilestonesView ws={ws} />}
      {tab === 'Initiatives' && <InitiativesView ws={ws} />}
      {tab === 'Budget' && <BudgetView ws={ws} />}
      {tab === 'Risks & Issues' && <RisksView ws={ws} />}
      {tab === 'Dependencies' && <DependenciesView ws={ws} />}
      {tab === 'Deliverables' && <DeliverablesView ws={ws} />}
      {tab === 'People & Roles' && <PeopleView ws={ws} />}
      {tab === 'Documents' && <DocumentsView ws={ws} />}
      {full && <FullWorkstream w={w} onClose={() => setFull(false)} />}
    </div>
  )
}

/* ---------- hooks shared by the summary and the full report ---------- */
function useWsData(w: WsRow) {
  const ws = w.name as Workstream
  const { items: milestones } = useCollection<Milestone>('milestones', seedMilestones)
  const { items: raid } = useCollection<RaidItem>('raid', seedRaid)
  const { items: deps } = useCollection<Dependency>('dependencies', seedDependencies)
  const { items: inits } = useCollection<Initiative>('initiatives', seedInitiatives)
  const { items: team } = useCollection<TeamMember>('teamMembers', seedTeamMembers)
  const { items: lines } = useCollection<WsBudgetLine>('wsBudgetLines', seedWsBudgetLines)
  const { items: docs } = useCollection<WsDocument>('wsDocuments', seedWsDocuments)
  return useMemo(() => {
    const ms = milestones.filter((m) => m.workstream === ws).sort(byDate)
    const own = raid.filter((r) => raidWorkstreamOf(r.workstream) === ws && isOpen(r))
    const pinned = (WS_TOP_RAID[ws] ?? []).map((id) => raid.find((r) => r.id === id)).filter((r): r is RaidItem => !!r && isOpen(r))
    const rest = own.filter((r) => !pinned.includes(r)).sort((a, b) => IMPACT_RANK[a.level] - IMPACT_RANK[b.level] || b.impactScore - a.impactScore)
    const topRaid = [...pinned, ...rest].slice(0, 5)
    const dependsOn = deps.filter((d) => d.from === ws).sort((a, b) => a.id.localeCompare(b.id)) // registration order (explicit rows first)
    return {
      ms, msOnTrack: ms.filter((m) => m.status === 'On Track' || m.status === 'Completed').length,
      // "Key Milestones" card: milestones due from the start of the current month onwards (earlier ones via View All)
      msKey: ms.filter((m) => m.dueDate >= TODAY.slice(0, 8) + '01'),
      topRaid, raidAll: own, dependsOn, inits: inits.filter((i) => i.workstream === ws), team: team.filter((t) => t.workstream === ws), lines: lines.filter((l) => l.workstream === ws), docs: docs.filter((d) => d.workstream === ws),
    }
  }, [ws, milestones, raid, deps, inits, team, lines, docs])
}

/* ---------- Executive Summary (mock-up layout) ---------- */
function ExecutiveSummary({ w, onTab, onEdit }: { w: WsRow; onTab: (t: string) => void; onEdit: () => void }) {
  const d = useWsData(w)
  const m = useMoney()
  const active = d.inits.filter((i) => i.status !== 'Completed').length
  const budget = d.lines.map((l) => ({ name: l.category, Planned: +m.num(l.plannedCr, 2), Actual: +m.num(l.actualCr, 2) }))
  const row = (label: string, value: React.ReactNode) => <div className="flex items-start justify-between gap-2 text-[12px] py-[5px]"><span className="text-ink-700 shrink-0">{label}</span><span className="font-medium text-ink-900 text-right">{value}</span></div>
  return (
    <div className="grid grid-cols-[215px_335px_290px_minmax(0,1fr)] gap-4 items-start">
      <Card title={<span className="whitespace-nowrap">Workstream Snapshot</span>}>
        <div className="flex items-start gap-2.5 mb-2">
          <WsIcon name={w.name} box={36} size={18} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1"><div className="text-[13.5px] font-semibold text-ink-900 leading-tight">{w.name}</div><button className="text-ink-400 hover:text-brand-600 cursor-pointer shrink-0 mt-0.5" title="Edit workstream" onClick={onEdit}><Pencil size={13} /></button></div>
            <div className="text-[11.5px] text-ink-500 mt-0.5 leading-snug">{w.description}</div>
          </div>
        </div>
        {row('Overall Progress', <span className="flex items-center gap-2"><Progress value={w.progress} className="w-[56px]" color={progressColor(w.progress)} />{w.progress}%</span>)}
        {row('Schedule Health', <Badge value={w.scheduleHealth} />)}
        {row('Budget Health', <Badge value={w.budgetHealth} />)}
        {row('Key Milestones', `${d.ms.length} (${d.msOnTrack} On Track)`)}
        {row('Active Initiatives', active)}
        {row('Team Size', d.team.length)}
        {row('Lead', w.lead)}
        {row('Executive Sponsor', w.executiveSponsor)}
      </Card>
      <Card title="Key Milestones" action={<ViewAll onClick={() => onTab('Milestones')} />}>
        <Table<Milestone> compact rows={d.msKey} onRowClick={() => onTab('Milestones')} columns={[
          { key: 'name', header: 'Milestone', className: '!px-1.5 text-[12px] leading-snug', render: (r) => r.name },
          { key: 'dueDate', header: 'Due Date', className: '!px-1.5 text-[12px] whitespace-nowrap', render: (r) => fmtDate(r.dueDate) },
          { key: 'status', header: 'Status', className: '!px-1.5', render: (r) => <Badge value={r.status} className="!px-1.5" /> },
        ]} />
      </Card>
      <Card title="Top Risks & Issues" action={<ViewAll onClick={() => onTab('Risks & Issues')} />}>
        <Table<RaidItem> compact rows={d.topRaid} onRowClick={() => onTab('Risks & Issues')} columns={[
          { key: 'title', header: 'Risk / Issue', className: '!px-1.5 text-[12px] leading-snug', render: (r) => <span title={r.title}>{r.shortTitle ?? r.title}</span> },
          { key: 'level', header: 'Impact', className: '!px-1.5', render: (r) => <Badge value={r.level} className="!px-1.5" /> },
          { key: 'status', header: 'Status', className: '!px-1.5', render: (r) => <Badge value={r.status} className="!px-1.5" /> },
        ]} />
      </Card>
      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <h3 className="card-title whitespace-nowrap">Budget Tracking ({m.unitLabel})</h3>
            <span className="flex items-center gap-2 text-[11px] text-ink-700">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS.blueFaint }} />Planned</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS.blue }} />Actual</span>
              <ViewAll label="View Details" onClick={() => onTab('Budget')} />
            </span>
          </div>
          <div className="h-[136px]">
            <ResponsiveContainer>
              <BarChart data={budget} margin={{ top: 16, right: 4, left: 4, bottom: 0 }} barGap={2} barCategoryGap="30%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={<WrapTick />} interval={0} height={30} />
                <YAxis hide />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`${m.symbol} ${v} ${m.unit}`]} />
                <Bar isAnimationActive={false} dataKey="Planned" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]}><LabelList dataKey="Planned" position="top" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
                <Bar isAnimationActive={false} dataKey="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]}><LabelList dataKey="Actual" position="top" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Workstream Dependencies" action={<ViewAll onClick={() => onTab('Dependencies')} />}>
          <Table<Dependency> compact rows={d.dependsOn.slice(0, 4)} onRowClick={() => onTab('Dependencies')} columns={[
            { key: 'on', header: 'Depends On', className: '!px-1 text-[12px] whitespace-nowrap', render: (r) => shortWs(r.on) },
            { key: 'type', header: 'Dependency Type', className: '!px-1 text-[12px] whitespace-nowrap', render: (r) => r.type },
            { key: 'impact', header: 'Impact', className: '!px-1', render: (r) => <Badge value={r.impact} className="!px-1 !text-[11px]" /> },
            { key: 'status', header: 'Status', className: '!px-1', render: (r) => <Badge value={r.status} className="!px-1 !text-[11px]" /> },
          ]} />
        </Card>
      </div>
    </div>
  )
}

function WrapTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const v = String(payload?.value ?? '')
  const words = v.split(' ')
  const lines = v.length > 13 && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [v]
  return <text x={x} y={y} textAnchor="middle" fill="#6B7280" fontSize={10.5}>{lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 11 : 12}>{l}</tspan>)}</text>
}

/* ---------- "View Full Workstream" report ---------- */
function FullWorkstream({ w, onClose }: { w: WsRow; onClose: () => void }) {
  const d = useWsData(w)
  const m = useMoney()
  const money = (cr: number) => fmtMoneyShort(cr, m)
  const H = ({ children }: { children: React.ReactNode }) => <h4 className="text-[13px] font-semibold text-ink-900 mt-5 mb-2 pb-1 border-b border-line">{children}</h4>
  const stat = (l: string, v: React.ReactNode) => <div className="rounded-lg bg-surface px-3 py-2"><div className="text-[11px] text-ink-500">{l}</div><div className="text-[15px] font-semibold">{v}</div></div>
  return (
    <Modal open onClose={onClose} width="max-w-5xl" title={<span className="inline-flex items-center gap-2"><WsIcon name={w.name} box={26} size={14} />{w.name} – Full Workstream Report</span>} footer={<button className="btn-secondary" onClick={onClose}>Close</button>}>
      <p className="text-[12.5px] text-ink-700">{w.description}</p>
      <div className="grid grid-cols-6 gap-2 mt-3">
        {stat('Overall Progress', `${w.progress}%`)}{stat('Status', <Badge value={w.status} />)}{stat('Schedule Health', <Badge value={w.scheduleHealth} />)}{stat('Budget Health', <Badge value={w.budgetHealth} />)}
        {stat('Lead', w.lead)}{stat('Executive Sponsor', w.executiveSponsor)}
        {stat('Approved Budget', money(w.approvedBudgetCr))}{stat('Actual Spend', money(w.actualSpendCr))}{stat('Forecast at Completion', money(w.forecastAtCompletionCr))}
        {stat('Milestones', `${d.ms.length} (${d.msOnTrack} on track)`)}{stat('Initiatives', d.inits.length)}{stat('Team', `${d.team.length} members`)}
      </div>
      <H>Milestones ({d.ms.length})</H>
      <Table<Milestone> compact rows={d.ms} columns={[{ key: 'name', header: 'Milestone' }, { key: 'phase', header: 'Phase' }, { key: 'dueDate', header: 'Due Date', render: (r) => fmtDate(r.dueDate) }, { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> }, { key: 'owner', header: 'Owner' }]} />
      <H>Initiatives ({d.inits.length})</H>
      <Table<Initiative> compact rows={d.inits} columns={[{ key: 'name', header: 'Initiative' }, { key: 'owner', header: 'Owner' }, { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> }, { key: 'end', header: 'End', render: (r) => fmtDate(r.end) }, { key: 'progress', header: 'Progress', render: (r) => `${r.progress}%` }]} />
      <H>Open Risks & Issues ({d.raidAll.length})</H>
      <Table<RaidItem> compact rows={d.raidAll} columns={[{ key: 'code', header: 'ID' }, { key: 'title', header: 'Risk / Issue' }, { key: 'level', header: 'Impact', render: (r) => <Badge value={r.level} /> }, { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> }, { key: 'owner', header: 'Owner' }, { key: 'dueDate', header: 'Due', render: (r) => fmtDate(r.dueDate) }]} />
      <H>Budget Lines ({m.unitLabel})</H>
      <Table<WsBudgetLine> compact rows={d.lines} columns={[{ key: 'category', header: 'Category' }, { key: 'plannedCr', header: 'Planned', render: (r) => m.num(r.plannedCr, 2) }, { key: 'actualCr', header: 'Actual', render: (r) => m.num(r.actualCr, 2) }, { key: 'rem', header: 'Remaining', render: (r) => m.num(r.plannedCr - r.actualCr, 2) }]} />
      <H>Dependencies ({d.dependsOn.length})</H>
      <Table<Dependency> compact rows={d.dependsOn} columns={[{ key: 'on', header: 'Depends On' }, { key: 'type', header: 'Dependency Type' }, { key: 'impact', header: 'Impact', render: (r) => <Badge value={r.impact} /> }, { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> }, { key: 'dueDate', header: 'Due', render: (r) => fmtDate(r.dueDate) }]} />
      <H>Team ({d.team.length})</H>
      <Table<TeamMember> compact rows={d.team} columns={[{ key: 'name', header: 'Name' }, { key: 'role', header: 'Role' }, { key: 'type', header: 'Type' }, { key: 'location', header: 'Location' }, { key: 'allocation', header: 'Allocation', render: (r) => `${r.allocation}%` }]} />
      <H>Documents ({d.docs.length})</H>
      <Table<WsDocument> compact rows={d.docs} columns={[{ key: 'title', header: 'Title' }, { key: 'type', header: 'Type' }, { key: 'version', header: 'Version', render: (r) => `v${r.version}` }, { key: 'updated', header: 'Updated', render: (r) => fmtDate(r.updated) }, { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> }]} />
    </Modal>
  )
}
