import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Plus, Star } from 'lucide-react'
import { Card, Badge, Table, Legend, Chevron } from '../ui'
import { Donut, BarList, tooltipStyle } from '../charts'
import { useCollection, uid } from '../../store/useStore'
import { seedMilestones, seedRaid, seedWorkstreamSummaries, seedDependencies, isOpen, daysOpen, type Milestone, type RaidItem, type Dependency } from '../../data/shared'
import { seedInitiatives, seedTeamMembers, seedWsBudgetLines, seedWsDocuments, raidWorkstreamOf, IMPACT_RANK, STATUS_RANK, type Initiative, type TeamMember, type WsBudgetLine, type WsDocument } from '../../data/workstreams'
import { fmtDate, CHART_COLORS, TODAY, type Workstream } from '../../data/common'
import { Toolbar, MiniSelect, SearchBox, Strip, WsIcon, PctBar, shortWs, STATUS_COLOR, fmtCr2, byDate, pct, type WsRow } from './common'
import { InitiativeForm, MilestoneForm, TeamMemberForm, RaidForm, BudgetLineForm, DependencyForm, DocumentForm } from './forms'

type Edit<T> = { item: T; isNew: boolean } | null
export function useWsRows() {
  const c = useCollection<WsRow>('workstreamSummaries', seedWorkstreamSummaries)
  return { ...c, names: c.items.map((w) => w.name as string) }
}
const ALL = 'All'
const withAll = (a: readonly string[]) => [ALL, ...a]
const matches = (q: string, ...vals: (string | undefined)[]) => !q || vals.some((v) => (v ?? '').toLowerCase().includes(q.toLowerCase()))

/* ================================================================== */
/* Initiatives                                                         */
/* ================================================================== */
export function InitiativesView({ ws }: { ws?: Workstream }) {
  const { names } = useWsRows()
  const inits = useCollection<Initiative>('initiatives', seedInitiatives)
  const { items: milestones } = useCollection<Milestone>('milestones', seedMilestones)
  const [fWs, setFWs] = useState(ALL), [fStatus, setFStatus] = useState(ALL), [q, setQ] = useState('')
  const [edit, setEdit] = useState<Edit<Initiative>>(null)
  const scope = useMemo(() => inits.items.filter((i) => (ws ? i.workstream === ws : true)), [inits.items, ws])
  const rows = scope.filter((i) => (fWs === ALL || i.workstream === fWs) && (fStatus === ALL || i.status === fStatus) && matches(q, i.name, i.owner))
  const count = (s: string) => scope.filter((i) => i.status === s).length
  const active = scope.filter((i) => i.status !== 'Completed')
  const avg = active.length ? Math.round(active.reduce((a, i) => a + i.progress, 0) / active.length) : 0
  const byWs = names.map((n) => ({ name: shortWs(n), 'On Track': 0, 'At Risk': 0, Delayed: 0, 'In Progress': 0, 'Not Started': 0, Completed: 0 } as Record<string, number | string>))
  scope.forEach((i) => { const r = byWs.find((b) => b.name === shortWs(i.workstream)); if (r) r[i.status] = (r[i.status] as number) + 1 })
  const msName = (id?: string) => milestones.find((m) => m.id === id)?.name ?? '—'
  const newItem = (): Initiative => ({ id: uid('init'), name: '', workstream: ws ?? (names[0] as Workstream), owner: 'A. Sharma', status: 'Not Started', start: TODAY, end: '2026-12-31', progress: 0 })
  return (
    <div className="space-y-4">
      {!ws && (
        <div className="grid grid-cols-[1.6fr_1fr] gap-4">
          <Card title="Initiatives by Workstream" headerRight={<Legend items={[{ label: 'On Track', color: CHART_COLORS.green }, { label: 'At Risk', color: CHART_COLORS.amber }, { label: 'Delayed', color: CHART_COLORS.red }, { label: 'In Progress', color: CHART_COLORS.blue }, { label: 'Not Started', color: CHART_COLORS.gray }, { label: 'Completed', color: CHART_COLORS.teal }]} />}>
            <div className="h-[200px]">
              <ResponsiveContainer>
                <BarChart data={byWs} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                  <Bar isAnimationActive={false} dataKey="On Track" stackId="a" fill={CHART_COLORS.green} />
                  <Bar isAnimationActive={false} dataKey="At Risk" stackId="a" fill={CHART_COLORS.amber} />
                  <Bar isAnimationActive={false} dataKey="Delayed" stackId="a" fill={CHART_COLORS.red} />
                  <Bar isAnimationActive={false} dataKey="In Progress" stackId="a" fill={CHART_COLORS.blue} />
                  <Bar isAnimationActive={false} dataKey="Not Started" stackId="a" fill={CHART_COLORS.gray} />
                  <Bar isAnimationActive={false} dataKey="Completed" stackId="a" fill={CHART_COLORS.teal} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Initiatives by Status">
            <div className="flex items-center gap-4">
              <Donut size={150} inner={0.7} data={[
                { name: 'On Track', value: count('On Track'), color: CHART_COLORS.green }, { name: 'At Risk', value: count('At Risk'), color: CHART_COLORS.amber }, { name: 'Delayed', value: count('Delayed'), color: CHART_COLORS.red },
                { name: 'In Progress', value: count('In Progress'), color: CHART_COLORS.blue }, { name: 'Not Started', value: count('Not Started'), color: CHART_COLORS.gray }, { name: 'Completed', value: count('Completed'), color: CHART_COLORS.teal },
              ]} center={<><div className="text-[22px] font-bold leading-none">{active.length}</div><div className="text-[11px] text-ink-500 mt-1">Active</div></>} />
              <div className="flex-1 space-y-1.5 text-[12.5px]">
                {['On Track', 'At Risk', 'Delayed', 'In Progress', 'Not Started', 'Completed'].map((s) => (
                  <div key={s} className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />{s}</span><b>{count(s)}</b></div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
      <Card title={ws ? 'Initiatives' : 'Initiatives Register'} subtitle={`${active.length} active initiatives · average progress ${avg}%`} action={<button className="btn-primary" onClick={() => setEdit({ item: newItem(), isNew: true })}><Plus size={14} /> Add initiative</button>}>
        <Toolbar>
          {!ws && <MiniSelect label="Workstream" value={fWs} options={withAll(names)} onChange={setFWs} />}
          <MiniSelect label="Status" value={fStatus} options={withAll(['On Track', 'At Risk', 'Delayed', 'In Progress', 'Not Started', 'Completed'])} onChange={setFStatus} />
          <SearchBox value={q} onChange={setQ} placeholder="Search initiatives…" />
        </Toolbar>
        <Table<Initiative> compact rows={rows} onRowClick={(r) => setEdit({ item: r, isNew: false })} columns={[
          { key: 'name', header: 'Initiative', render: (r) => <span className="font-medium">{r.name}</span> },
          ...(ws ? [] : [{ key: 'workstream', header: 'Workstream', render: (r: Initiative) => <span className="inline-flex items-center gap-1.5"><WsIcon name={r.workstream} box={22} size={12} />{shortWs(r.workstream)}</span> }]),
          { key: 'owner', header: 'Owner' },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
          { key: 'start', header: 'Start', className: 'whitespace-nowrap', render: (r) => fmtDate(r.start) },
          { key: 'end', header: 'End', className: 'whitespace-nowrap', render: (r) => fmtDate(r.end) },
          { key: 'progress', header: 'Progress', width: '160px', render: (r) => <PctBar value={r.progress} width={80} /> },
          { key: 'milestoneId', header: 'Linked Milestone', render: (r) => <span className="text-ink-700">{msName(r.milestoneId)}</span> },
          { key: 'c', header: '', render: () => <Chevron /> },
        ]} />
      </Card>
      {edit && <InitiativeForm initial={edit.item} isNew={edit.isNew} wsOptions={names} milestones={milestones} onClose={() => setEdit(null)}
        onSave={(v) => { inits.update(v); setEdit(null) }} onDelete={edit.isNew ? undefined : () => { inits.remove(edit.item.id); setEdit(null) }} />}
    </div>
  )
}

/* ================================================================== */
/* Milestones (shared)                                                 */
/* ================================================================== */
export function MilestonesView({ ws }: { ws?: Workstream }) {
  const { names } = useWsRows()
  const ms = useCollection<Milestone>('milestones', seedMilestones)
  const [fWs, setFWs] = useState(ALL), [fStatus, setFStatus] = useState(ALL), [fPhase, setFPhase] = useState(ALL), [q, setQ] = useState('')
  const [edit, setEdit] = useState<Edit<Milestone>>(null)
  const scope = ms.items.filter((m) => (ws ? m.workstream === ws : true))
  const rows = scope.filter((m) => (fWs === ALL || m.workstream === fWs) && (fStatus === ALL || m.status === fStatus) && (fPhase === ALL || m.phase === fPhase) && matches(q, m.name, m.owner)).sort(byDate)
  const count = (s: string[]) => scope.filter((m) => s.includes(m.status)).length
  const overdue = scope.filter((m) => m.status !== 'Completed' && m.dueDate < TODAY).length
  const newItem = (): Milestone => ({ id: uid('ms'), name: '', workstream: ws ?? (names[0] as Workstream), dueDate: TODAY, status: 'Not Started', owner: 'A. Sharma', phase: 'Build' })
  return (
    <Card title={ws ? 'Milestones' : 'Milestones Register'} subtitle={`${scope.length} milestones · ${count(['Completed'])} completed · ${overdue} past due`} action={<button className="btn-primary" onClick={() => setEdit({ item: newItem(), isNew: true })}><Plus size={14} /> Add milestone</button>}>
      <Strip items={[
        { label: 'Total', value: scope.length }, { label: 'On Track', value: count(['On Track']), color: CHART_COLORS.green }, { label: 'At Risk', value: count(['At Risk']), color: CHART_COLORS.amber },
        { label: 'Delayed', value: count(['Delayed']), color: CHART_COLORS.red }, { label: 'Pending / Not Started', value: count(['Pending', 'Not Started']), color: '#6B7280' }, { label: 'Completed', value: count(['Completed']), color: CHART_COLORS.teal },
      ]} />
      <Toolbar>
        {!ws && <MiniSelect label="Workstream" value={fWs} options={withAll(names)} onChange={setFWs} />}
        <MiniSelect label="Status" value={fStatus} options={withAll(['On Track', 'At Risk', 'Delayed', 'Pending', 'Not Started', 'Completed'])} onChange={setFStatus} />
        <MiniSelect label="Phase" value={fPhase} options={withAll(['Design', 'Build', 'Transition', 'Operate'])} onChange={setFPhase} />
        <SearchBox value={q} onChange={setQ} placeholder="Search milestones…" />
      </Toolbar>
      <Table<Milestone> compact rows={rows} onRowClick={(r) => setEdit({ item: r, isNew: false })} columns={[
        { key: 'name', header: 'Milestone', render: (r) => <span className="font-medium inline-flex items-center gap-1.5">{r.critical && <Star size={12} className="text-amber-500 fill-amber-400" />}{r.name}</span> },
        ...(ws ? [] : [{ key: 'workstream', header: 'Workstream', render: (r: Milestone) => shortWs(r.workstream) }]),
        { key: 'phase', header: 'Phase' },
        { key: 'dueDate', header: 'Due Date', render: (r) => <span className={r.status !== 'Completed' && r.dueDate < TODAY ? 'text-red-600 font-medium' : ''}>{fmtDate(r.dueDate)}</span> },
        { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
        { key: 'owner', header: 'Owner' },
        { key: 'c', header: '', render: () => <Chevron /> },
      ]} />
      {edit && <MilestoneForm initial={edit.item} isNew={edit.isNew} wsOptions={names} onClose={() => setEdit(null)}
        onSave={(v) => { ms.update(v); setEdit(null) }} onDelete={edit.isNew ? undefined : () => { ms.remove(edit.item.id); setEdit(null) }} />}
    </Card>
  )
}

/* ================================================================== */
/* Team & Resources                                                    */
/* ================================================================== */
export function ResourcesView({ ws }: { ws?: Workstream }) {
  const { items: wss, names } = useWsRows()
  const { items: members } = useCollection<TeamMember>('teamMembers', seedTeamMembers)
  const scope = members.filter((m) => (ws ? m.workstream === ws : true))
  const fte = (list: TeamMember[]) => +(list.reduce((a, m) => a + m.allocation, 0) / 100).toFixed(1)
  if (!ws) {
    const rows = wss.map((w) => {
      const list = members.filter((m) => m.workstream === w.name)
      return { id: w.id, name: w.name, planned: w.teamSize, onboarded: list.length, fte: fte(list), internal: list.filter((m) => m.type === 'Internal').length, external: list.filter((m) => m.type !== 'Internal').length, gap: w.teamSize - list.length }
    })
    const chart = rows.map((r) => ({ name: shortWs(r.name), Planned: r.planned, Onboarded: r.onboarded }))
    return (
      <div className="grid grid-cols-[1.1fr_1fr] gap-4">
        <Card title="Headcount by Workstream" subtitle={`${members.length} team members · ${fte(members)} FTE across ${wss.length} workstreams`}>
          <Table<(typeof rows)[number]> compact rows={rows} columns={[
            { key: 'name', header: 'Workstream', className: 'whitespace-nowrap', render: (r) => <span className="inline-flex items-center gap-2"><WsIcon name={r.name} box={24} size={13} />{r.name}</span> },
            { key: 'planned', header: 'Planned', className: 'text-right' },
            { key: 'onboarded', header: 'Onboarded', className: 'text-right' },
            { key: 'fte', header: 'FTE', className: 'text-right' },
            { key: 'internal', header: 'Internal', className: 'text-right' },
            { key: 'external', header: 'Contractor / Vendor', className: 'text-right' },
            { key: 'gap', header: 'Gap', className: 'text-right', render: (r) => <span className={r.gap > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{r.gap > 0 ? `-${r.gap}` : r.gap === 0 ? '0' : `+${-r.gap}`}</span> },
          ]} />
        </Card>
        <Card title="Planned vs Onboarded Headcount" headerRight={<Legend items={[{ label: 'Planned', color: CHART_COLORS.blueFaint }, { label: 'Onboarded', color: CHART_COLORS.blue }]} />}>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ top: 16, right: 8, left: -24, bottom: 0 }} barGap={2} barCategoryGap="28%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar isAnimationActive={false} dataKey="Planned" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]}><LabelList dataKey="Planned" position="top" style={{ fontSize: 10.5, fill: '#6B7280' }} /></Bar>
                <Bar isAnimationActive={false} dataKey="Onboarded" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]}><LabelList dataKey="Onboarded" position="top" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    )
  }
  const w = wss.find((x) => x.name === ws)
  const roles = Object.entries(scope.reduce<Record<string, number>>((a, m) => ({ ...a, [m.role]: (a[m.role] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])
  const locs = Object.entries(scope.reduce<Record<string, number>>((a, m) => ({ ...a, [m.location]: (a[m.location] ?? 0) + 1 }), {}))
  const types = ['Internal', 'Contractor', 'Vendor'].map((t) => ({ name: t, value: scope.filter((m) => m.type === t).length, color: t === 'Internal' ? CHART_COLORS.blue : t === 'Contractor' ? CHART_COLORS.teal : CHART_COLORS.amber }))
  const avgAlloc = scope.length ? Math.round(scope.reduce((a, m) => a + m.allocation, 0) / scope.length) : 0
  void names
  return (
    <div className="space-y-4">
      <Strip items={[
        { label: 'Planned team size', value: w?.teamSize ?? 0 }, { label: 'Onboarded', value: scope.length, color: CHART_COLORS.blue }, { label: 'FTE', value: fte(scope), color: CHART_COLORS.blue },
        { label: 'Gap to plan', value: (w?.teamSize ?? 0) - scope.length, color: (w?.teamSize ?? 0) - scope.length > 0 ? CHART_COLORS.red : CHART_COLORS.green }, { label: 'Average allocation', value: `${avgAlloc}%` },
        { label: 'Contractors / Vendors', value: scope.filter((m) => m.type !== 'Internal').length, color: CHART_COLORS.amber },
      ]} />
      <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-4">
        <Card title="Headcount by Role"><BarList rows={roles.map(([label, value]) => ({ label, value }))} labelWidth={170} /></Card>
        <Card title="By Location"><div className="flex items-center gap-4"><Donut size={130} inner={0.68} data={locs.map(([name, value], i) => ({ name, value, color: [CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.amber, CHART_COLORS.violet][i % 4] }))} center={<div className="text-[20px] font-bold">{scope.length}</div>} /><div className="space-y-1.5 text-[12.5px]">{locs.map(([n, v], i) => <div key={n} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: [CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.amber, CHART_COLORS.violet][i % 4] }} />{n} <b>{v}</b></div>)}</div></div></Card>
        <Card title="By Engagement Type"><div className="flex items-center gap-4"><Donut size={130} inner={0.68} data={types} center={<div className="text-[20px] font-bold">{scope.length}</div>} /><div className="space-y-1.5 text-[12.5px]">{types.map((t) => <div key={t.name} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />{t.name} <b>{t.value}</b></div>)}</div></div></Card>
      </div>
    </div>
  )
}

export function TeamView({ ws }: { ws?: Workstream }) {
  const { names } = useWsRows()
  const team = useCollection<TeamMember>('teamMembers', seedTeamMembers)
  const [fWs, setFWs] = useState(ALL), [fType, setFType] = useState(ALL), [fLoc, setFLoc] = useState(ALL), [q, setQ] = useState('')
  const [edit, setEdit] = useState<Edit<TeamMember>>(null)
  const scope = team.items.filter((m) => (ws ? m.workstream === ws : true))
  const locs = withAll(scope.map((m) => m.location).filter((v, i, a) => a.indexOf(v) === i))
  const rows = scope.filter((m) => (fWs === ALL || m.workstream === fWs) && (fType === ALL || m.type === fType) && (fLoc === ALL || m.location === fLoc) && matches(q, m.name, m.role))
  const newItem = (): TeamMember => ({ id: uid('tm'), name: '', role: '', workstream: ws ?? (names[0] as Workstream), location: 'Bengaluru', allocation: 100, startDate: TODAY, type: 'Internal' })
  return (
    <Card title={ws ? 'Team' : 'Team Roster'} subtitle={`${scope.length} members`} action={<button className="btn-primary" onClick={() => setEdit({ item: newItem(), isNew: true })}><Plus size={14} /> Add team member</button>}>
      <Toolbar>
        {!ws && <MiniSelect label="Workstream" value={fWs} options={withAll(names)} onChange={setFWs} />}
        <MiniSelect label="Type" value={fType} options={withAll(['Internal', 'Contractor', 'Vendor'])} onChange={setFType} />
        <MiniSelect label="Location" value={fLoc} options={locs} onChange={setFLoc} />
        <SearchBox value={q} onChange={setQ} placeholder="Search name or role…" />
      </Toolbar>
      <Table<TeamMember> compact rows={rows} onRowClick={(r) => setEdit({ item: r, isNew: false })} columns={[
        { key: 'name', header: 'Name', render: (r) => <span className="inline-flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-[10px] font-semibold flex items-center justify-center">{r.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span><span className="font-medium">{r.name}</span></span> },
        { key: 'role', header: 'Role' },
        ...(ws ? [] : [{ key: 'workstream', header: 'Workstream', render: (r: TeamMember) => shortWs(r.workstream) }]),
        { key: 'type', header: 'Type', render: (r) => <Badge value={r.type} /> },
        { key: 'location', header: 'Location' },
        { key: 'allocation', header: 'Allocation', width: '150px', render: (r) => <PctBar value={r.allocation} width={80} color={r.allocation === 100 ? '#1E5BBE' : '#5B9BF0'} /> },
        { key: 'startDate', header: 'Start Date', className: 'whitespace-nowrap', render: (r) => fmtDate(r.startDate) },
        { key: 'c', header: '', render: () => <Chevron /> },
      ]} />
      {edit && <TeamMemberForm initial={edit.item} isNew={edit.isNew} wsOptions={names} onClose={() => setEdit(null)}
        onSave={(v) => { team.update(v); setEdit(null) }} onDelete={edit.isNew ? undefined : () => { team.remove(edit.item.id); setEdit(null) }} />}
    </Card>
  )
}

/* ================================================================== */
/* Risks & Issues (shared RAID)                                        */
/* ================================================================== */
export function RisksView({ ws }: { ws?: Workstream }) {
  const { names } = useWsRows()
  const raid = useCollection<RaidItem>('raid', seedRaid)
  const [fWs, setFWs] = useState(ALL), [fType, setFType] = useState(ALL), [fStatus, setFStatus] = useState(ALL), [fLevel, setFLevel] = useState(ALL), [q, setQ] = useState('')
  const [edit, setEdit] = useState<Edit<RaidItem>>(null)
  const scope = raid.items.filter((r) => (ws ? raidWorkstreamOf(r.workstream) === ws : true))
  const rows = scope.filter((r) => (fWs === ALL || raidWorkstreamOf(r.workstream) === fWs) && (fType === ALL || r.type === fType) && (fStatus === ALL || r.status === fStatus) && (fLevel === ALL || r.level === fLevel) && matches(q, r.title, r.code, r.owner))
    .sort((a, b) => (isOpen(a) === isOpen(b) ? 0 : isOpen(a) ? -1 : 1) || IMPACT_RANK[a.level] - IMPACT_RANK[b.level] || b.impactScore - a.impactScore)
  const open = scope.filter(isOpen)
  const nextCode = () => { const used = new Set(raid.items.map((r) => r.code)); let n = raid.items.length + 1; while (used.has(`R-${String(n).padStart(3, '0')}`)) n++; return `R-${String(n).padStart(3, '0')}` }
  const newItem = (): RaidItem => ({ id: uid('raid'), code: nextCode(), type: 'Risk', title: '', workstream: ws ?? (names[0] as string), category: 'Process & Operations', level: 'Medium', status: 'Open', owner: 'A. Sharma', dueDate: TODAY, openedOn: TODAY, likelihood: 'Medium', impact: 'Medium', impactScore: 5 })
  const byWs = names.map((n) => ({ label: shortWs(n), value: open.filter((r) => raidWorkstreamOf(r.workstream) === n).length, color: CHART_COLORS.red }))
  return (
    <div className="space-y-4">
      <div className={ws ? '' : 'grid grid-cols-[minmax(0,1fr)_270px] gap-4'}>
        <Card title={ws ? 'Risks & Issues' : 'Risks & Issues by Workstream'} subtitle={`${open.length} open · ${scope.length - open.length} resolved / closed`} action={<button className="btn-primary" onClick={() => setEdit({ item: newItem(), isNew: true })}><Plus size={14} /> Add risk / issue</button>}>
          <Strip items={[
            { label: 'Open risks', value: open.filter((r) => r.type === 'Risk').length, color: CHART_COLORS.red }, { label: 'Open issues', value: open.filter((r) => r.type === 'Issue').length, color: CHART_COLORS.blue },
            { label: 'Critical / High', value: open.filter((r) => ['Critical', 'High'].includes(r.level)).length, color: CHART_COLORS.red }, { label: 'Overdue', value: open.filter((r) => r.dueDate < TODAY).length, color: CHART_COLORS.amber },
            { label: 'Escalated', value: open.filter((r) => r.escalated).length, color: CHART_COLORS.orange }, { label: 'Avg impact score', value: open.length ? (open.reduce((a, r) => a + r.impactScore, 0) / open.length).toFixed(1) : '0' },
          ]} />
          <Toolbar>
            {!ws && <MiniSelect label="Workstream" value={fWs} options={withAll(names)} onChange={setFWs} />}
            <MiniSelect label="Type" value={fType} options={withAll(['Risk', 'Issue'])} onChange={setFType} />
            <MiniSelect label="Impact" value={fLevel} options={withAll(['Critical', 'High', 'Medium', 'Low'])} onChange={setFLevel} />
            <MiniSelect label="Status" value={fStatus} options={withAll(['Open', 'In Progress', 'At Risk', 'On Track', 'Overdue', 'Not Started', 'Resolved', 'Closed'])} onChange={setFStatus} />
            <SearchBox value={q} onChange={setQ} placeholder="Search risks & issues…" />
          </Toolbar>
          <Table<RaidItem> compact rows={rows} onRowClick={(r) => setEdit({ item: r, isNew: false })} columns={[
            { key: 'code', header: 'ID', className: 'whitespace-nowrap', render: (r) => <span className="text-ink-500 font-mono text-[12px]">{r.code}</span> },
            { key: 'type', header: 'Type', render: (r) => <Badge value={r.type} /> },
            { key: 'title', header: 'Risk / Issue', render: (r) => <span className="font-medium">{r.title}</span> },
            { key: 'workstream', header: 'Workstream' },
            { key: 'level', header: 'Impact', render: (r) => <Badge value={r.level} /> },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
            { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
            { key: 'dueDate', header: 'Due Date', className: 'whitespace-nowrap', render: (r) => fmtDate(r.dueDate) },
            { key: 'days', header: 'Days Open', className: 'text-right', render: (r) => (isOpen(r) ? daysOpen(r) : '—') },
            { key: 'c', header: '', render: () => <Chevron /> },
          ]} />
        </Card>
        {!ws && <Card title="Open Items by Workstream"><BarList rows={byWs} labelWidth={95} /></Card>}
      </div>
      {edit && <RaidForm initial={edit.item} isNew={edit.isNew} wsOptions={names} onClose={() => setEdit(null)}
        onSave={(v) => { raid.update(v); setEdit(null) }} onDelete={edit.isNew ? undefined : () => { raid.remove(edit.item.id); setEdit(null) }} />}
    </div>
  )
}

/* ================================================================== */
/* Budget & Costs                                                      */
/* ================================================================== */
export function BudgetView({ ws, onEditWorkstream }: { ws?: Workstream; onEditWorkstream?: (w: WsRow) => void }) {
  const { items: wss, names } = useWsRows()
  const lines = useCollection<WsBudgetLine>('wsBudgetLines', seedWsBudgetLines)
  const [fWs, setFWs] = useState(ALL)
  const [edit, setEdit] = useState<Edit<WsBudgetLine>>(null)
  const scope = lines.items.filter((l) => (ws ? l.workstream === ws : fWs === ALL || l.workstream === fWs))
  const newItem = (): WsBudgetLine => ({ id: uid('bl'), workstream: ws ?? (fWs === ALL ? (names[0] as Workstream) : (fWs as Workstream)), category: '', plannedCr: 0, actualCr: 0 })
  const w = wss.find((x) => x.name === ws)
  const sum = (k: 'plannedCr' | 'actualCr') => +scope.reduce((a, l) => a + l[k], 0).toFixed(2)
  const linesTable = (
    <Card title={ws ? 'Budget Lines (₹ Cr)' : 'Budget Lines by Category (₹ Cr)'} subtitle={`Planned ${fmtCr2(sum('plannedCr'))} · Actual ${fmtCr2(sum('actualCr'))} (${pct(sum('actualCr'), sum('plannedCr'))}% spent)`} action={<button className="btn-primary" onClick={() => setEdit({ item: newItem(), isNew: true })}><Plus size={14} /> Add budget line</button>}>
      {!ws && <Toolbar><MiniSelect label="Workstream" value={fWs} options={withAll(names)} onChange={setFWs} /></Toolbar>}
      <Table<WsBudgetLine> compact rows={scope} onRowClick={(r) => setEdit({ item: r, isNew: false })} columns={[
        ...(ws ? [] : [{ key: 'workstream', header: 'Workstream', render: (r: WsBudgetLine) => shortWs(r.workstream) }]),
        { key: 'category', header: 'Category', render: (r) => <span className="font-medium">{r.category}</span> },
        { key: 'plannedCr', header: 'Planned', className: 'text-right', render: (r) => r.plannedCr.toFixed(2) },
        { key: 'actualCr', header: 'Actual', className: 'text-right', render: (r) => r.actualCr.toFixed(2) },
        { key: 'var', header: 'Remaining', className: 'text-right', render: (r) => <span className={r.plannedCr - r.actualCr < 0 ? 'text-red-600 font-medium' : ''}>{(r.plannedCr - r.actualCr).toFixed(2)}</span> },
        { key: 'pct', header: 'Spent %', width: '150px', render: (r) => <PctBar value={pct(r.actualCr, r.plannedCr)} width={80} color={pct(r.actualCr, r.plannedCr) > 100 ? '#DC2626' : '#1E5BBE'} /> },
        { key: 'c', header: '', render: () => <Chevron /> },
      ]} />
    </Card>
  )
  const form = edit && <BudgetLineForm initial={edit.item} isNew={edit.isNew} wsOptions={names} onClose={() => setEdit(null)} onSave={(v) => { lines.update(v); setEdit(null) }} onDelete={edit.isNew ? undefined : () => { lines.remove(edit.item.id); setEdit(null) }} />
  if (ws) {
    const chart = scope.map((l) => ({ name: l.category, Planned: l.plannedCr, Actual: l.actualCr }))
    return (
      <div className="space-y-4">
        <Strip items={[
          { label: 'Approved budget', value: fmtCr2(w?.approvedBudgetCr ?? 0) }, { label: 'Actual spend', value: fmtCr2(w?.actualSpendCr ?? 0), color: CHART_COLORS.blue }, { label: 'Forecast at completion', value: fmtCr2(w?.forecastAtCompletionCr ?? 0), color: CHART_COLORS.teal },
          { label: 'Budget health', value: <Badge value={w?.budgetHealth ?? 'On Track'} /> }, { label: 'Lines planned', value: fmtCr2(sum('plannedCr')) }, { label: 'Lines actual', value: fmtCr2(sum('actualCr')), color: CHART_COLORS.blue },
        ]} />
        <div className="grid grid-cols-[1fr_1.3fr] gap-4">
          <Card title="Budget Tracking (₹ Cr)" headerRight={<Legend items={[{ label: 'Planned', color: CHART_COLORS.blueFaint }, { label: 'Actual', color: CHART_COLORS.blue }]} />}>
            <div className="h-[240px]">
              <ResponsiveContainer>
                <BarChart data={chart} margin={{ top: 18, right: 8, left: -8, bottom: 0 }} barGap={2} barCategoryGap="30%">
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`₹ ${v} Cr`]} />
                  <Bar isAnimationActive={false} dataKey="Planned" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]}><LabelList dataKey="Planned" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
                  <Bar isAnimationActive={false} dataKey="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]}><LabelList dataKey="Actual" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          {linesTable}
        </div>
        {form}
      </div>
    )
  }
  const chart = wss.map((x) => ({ name: shortWs(x.name), Approved: x.approvedBudgetCr, Actual: x.actualSpendCr, Forecast: x.forecastAtCompletionCr }))
  const tot = (k: 'approvedBudgetCr' | 'actualSpendCr' | 'forecastAtCompletionCr') => +wss.reduce((a, x) => a + x[k], 0).toFixed(2)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1.2fr_1fr] gap-4">
        <Card title="Workstream Budget (₹ Cr)" subtitle="Click a row to edit the workstream's approved, actual and forecast figures">
          <Table<WsRow> compact rows={wss} onRowClick={(r) => onEditWorkstream?.(r)} columns={[
            { key: 'name', header: 'Workstream', className: 'whitespace-nowrap', render: (r) => <span className="inline-flex items-center gap-2"><WsIcon name={r.name} box={24} size={13} />{r.name}</span> },
            { key: 'approvedBudgetCr', header: 'Approved', className: 'text-right', render: (r) => r.approvedBudgetCr.toFixed(2) },
            { key: 'actualSpendCr', header: 'Actual', className: 'text-right', render: (r) => r.actualSpendCr.toFixed(2) },
            { key: 'forecastAtCompletionCr', header: 'Forecast', className: 'text-right', render: (r) => r.forecastAtCompletionCr.toFixed(2) },
            { key: 'variance', header: 'Variance', className: 'text-right', render: (r) => { const v = r.approvedBudgetCr - r.forecastAtCompletionCr; return <span className={v < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{v >= 0 ? '+' : ''}{v.toFixed(2)}</span> } },
            { key: 'spent', header: 'Spent %', className: 'text-right', render: (r) => `${pct(r.actualSpendCr, r.approvedBudgetCr)}%` },
            { key: 'budgetHealth', header: 'Budget Health', render: (r) => <Badge value={r.budgetHealth} /> },
            { key: 'c', header: '', render: () => <Chevron /> },
          ]} />
          <div className="flex items-center justify-end gap-6 text-[12.5px] mt-2 pr-10 text-ink-700">
            <span>Total approved <b>{fmtCr2(tot('approvedBudgetCr'))}</b></span><span>Actual <b>{fmtCr2(tot('actualSpendCr'))}</b></span><span>Forecast <b>{fmtCr2(tot('forecastAtCompletionCr'))}</b></span>
          </div>
        </Card>
        <Card title="Approved vs Actual vs Forecast (₹ Cr)" headerRight={<Legend items={[{ label: 'Approved', color: CHART_COLORS.blueFaint }, { label: 'Actual', color: CHART_COLORS.blue }, { label: 'Forecast', color: CHART_COLORS.teal }]} />}>
          <div className="h-[290px]">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barGap={1} barCategoryGap="25%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`₹ ${v} Cr`]} />
                <Bar isAnimationActive={false} dataKey="Approved" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]} />
                <Bar isAnimationActive={false} dataKey="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} />
                <Bar isAnimationActive={false} dataKey="Forecast" fill={CHART_COLORS.teal} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      {linesTable}
      {form}
    </div>
  )
}

/* ================================================================== */
/* Dependencies (shared)                                               */
/* ================================================================== */
export function DependenciesView({ ws }: { ws?: Workstream }) {
  const { names } = useWsRows()
  const deps = useCollection<Dependency>('dependencies', seedDependencies)
  const [dir, setDir] = useState<'from' | 'on'>('from')
  const [fFrom, setFFrom] = useState(ALL), [fOn, setFOn] = useState(ALL), [fStatus, setFStatus] = useState(ALL), [fImpact, setFImpact] = useState(ALL)
  const [edit, setEdit] = useState<Edit<Dependency>>(null)
  const scope = deps.items.filter((d) => (ws ? d[dir] === ws : true))
  const rows = scope.filter((d) => (fFrom === ALL || d.from === fFrom) && (fOn === ALL || d.on === fOn) && (fStatus === ALL || d.status === fStatus) && (fImpact === ALL || d.impact === fImpact))
    .sort((a, b) => IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact] || STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.dueDate.localeCompare(b.dueDate))
  const cnt = (f: (d: Dependency) => boolean) => scope.filter(f).length
  const newItem = (): Dependency => ({ id: uid('dep'), from: ws ?? (names[0] as Workstream), on: (names[1] ?? names[0]) as Workstream, type: '', description: '', impact: 'Medium', status: 'On Track', dueDate: TODAY, owner: 'A. Sharma' })
  const max = Math.max(1, ...names.flatMap((f) => names.map((o) => deps.items.filter((d) => d.from === f && d.on === o).length)))
  return (
    <div className="space-y-4">
      {!ws && (
        <Card title="Dependency Matrix" subtitle="Rows = workstream that depends · Columns = workstream depended upon · click a cell to filter the register">
          <div className="overflow-x-auto">
            <table className="text-[12px] border-separate border-spacing-0.5">
              <thead><tr><th className="text-left text-ink-500 font-medium px-2 py-1">Depends ↓ / On →</th>{names.map((n) => <th key={n} className="text-ink-500 font-medium px-1 py-1 w-[118px]">{shortWs(n)}</th>)}</tr></thead>
              <tbody>
                {names.map((f) => (
                  <tr key={f}>
                    <td className="px-2 py-1 font-medium whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><WsIcon name={f} box={20} size={11} />{f}</span></td>
                    {names.map((o) => {
                      const n = deps.items.filter((d) => d.from === f && d.on === o).length
                      const bad = deps.items.filter((d) => d.from === f && d.on === o && ['At Risk', 'Delayed'].includes(d.status)).length
                      const sel = fFrom === f && fOn === o
                      return (
                        <td key={o} className="p-0">
                          <button disabled={f === o} onClick={() => { setFFrom(sel ? ALL : f); setFOn(sel ? ALL : o) }}
                            className={`w-full h-9 rounded-md text-[12px] font-semibold flex items-center justify-center gap-1 ${f === o ? 'bg-slate-100 text-slate-300' : 'cursor-pointer hover:ring-2 ring-brand-300'} ${sel ? 'ring-2 ring-brand-600' : ''}`}
                            style={f === o ? undefined : { background: n ? `rgba(30,91,190,${0.12 + (n / max) * 0.5})` : '#F8FAFC', color: n / max > 0.55 ? '#fff' : '#111827' }}>
                            {f === o ? '—' : n || ''}{bad > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title={`${bad} at risk / delayed`} />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card title={ws ? 'Dependencies' : 'Dependency Register'} subtitle={`${scope.length} dependencies · ${cnt((d) => ['At Risk', 'Delayed'].includes(d.status))} at risk or delayed`} action={<button className="btn-primary" onClick={() => setEdit({ item: newItem(), isNew: true })}><Plus size={14} /> Add dependency</button>}>
        <Strip items={[
          { label: 'Total', value: scope.length }, { label: 'Critical', value: cnt((d) => d.impact === 'Critical'), color: CHART_COLORS.red }, { label: 'High', value: cnt((d) => d.impact === 'High'), color: CHART_COLORS.orange },
          { label: 'At Risk', value: cnt((d) => d.status === 'At Risk'), color: CHART_COLORS.amber }, { label: 'Delayed', value: cnt((d) => d.status === 'Delayed'), color: CHART_COLORS.red }, { label: 'Completed', value: cnt((d) => d.status === 'Completed'), color: CHART_COLORS.green },
        ]} />
        <Toolbar>
          {ws && (
            <div className="inline-flex rounded-lg border border-line overflow-hidden text-[12.5px]">
              {(['from', 'on'] as const).map((d) => <button key={d} onClick={() => setDir(d)} className={`px-3 py-1.5 cursor-pointer ${dir === d ? 'bg-brand-600 text-white font-medium' : 'bg-white text-ink-700 hover:bg-surface'}`}>{d === 'from' ? 'Depends on others' : 'Others depend on it'}</button>)}
            </div>
          )}
          {!ws && <MiniSelect label="Depends" value={fFrom} options={withAll(names)} onChange={setFFrom} />}
          {!ws && <MiniSelect label="On" value={fOn} options={withAll(names)} onChange={setFOn} />}
          <MiniSelect label="Impact" value={fImpact} options={withAll(['Critical', 'High', 'Medium', 'Low'])} onChange={setFImpact} />
          <MiniSelect label="Status" value={fStatus} options={withAll(['On Track', 'At Risk', 'Delayed', 'Completed'])} onChange={setFStatus} />
        </Toolbar>
        <Table<Dependency> compact rows={rows} onRowClick={(r) => setEdit({ item: r, isNew: false })} columns={[
          { key: 'from', header: ws && dir === 'from' ? 'Depends On' : 'Workstream', className: 'whitespace-nowrap', render: (r) => <span className="font-medium">{ws && dir === 'from' ? r.on : r.from}</span> },
          ...(!ws || dir === 'on' ? [{ key: 'on', header: ws ? 'Depended On By' : 'Depends On', className: 'whitespace-nowrap', render: (r: Dependency) => (ws ? r.from : r.on) }] : []),
          { key: 'type', header: 'Dependency Type' },
          { key: 'description', header: 'Description', render: (r) => <span className="text-ink-700 line-clamp-1 max-w-[320px]">{r.description}</span> },
          { key: 'impact', header: 'Impact', render: (r) => <Badge value={r.impact} /> },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
          { key: 'dueDate', header: 'Due Date', className: 'whitespace-nowrap', render: (r) => fmtDate(r.dueDate) },
          { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
          { key: 'c', header: '', render: () => <Chevron /> },
        ]} />
      </Card>
      {edit && <DependencyForm initial={edit.item} isNew={edit.isNew} wsOptions={names} onClose={() => setEdit(null)}
        onSave={(v) => { deps.update(v); setEdit(null) }} onDelete={edit.isNew ? undefined : () => { deps.remove(edit.item.id); setEdit(null) }} />}
    </div>
  )
}

/* ================================================================== */
/* Documents                                                           */
/* ================================================================== */
export function DocumentsView({ ws }: { ws?: Workstream }) {
  const { names } = useWsRows()
  const docs = useCollection<WsDocument>('wsDocuments', seedWsDocuments)
  const [fWs, setFWs] = useState(ALL), [fType, setFType] = useState(ALL), [fStatus, setFStatus] = useState(ALL), [q, setQ] = useState('')
  const [edit, setEdit] = useState<Edit<WsDocument>>(null)
  const scope = docs.items.filter((d) => (ws ? d.workstream === ws : true))
  const rows = scope.filter((d) => (fWs === ALL || d.workstream === fWs) && (fType === ALL || d.type === fType) && (fStatus === ALL || d.status === fStatus) && matches(q, d.title, d.owner)).sort((a, b) => b.updated.localeCompare(a.updated))
  const cnt = (s: string) => scope.filter((d) => d.status === s).length
  const newItem = (): WsDocument => ({ id: uid('doc'), title: '', type: 'Plan', workstream: ws ?? (names[0] as Workstream), owner: 'A. Sharma', version: '0.1', updated: TODAY, status: 'Draft' })
  return (
    <Card title={ws ? 'Documents' : 'Document Register'} subtitle={`${scope.length} documents`} action={<button className="btn-primary" onClick={() => setEdit({ item: newItem(), isNew: true })}><Plus size={14} /> Add document</button>}>
      <Strip items={[{ label: 'Total', value: scope.length }, { label: 'Draft', value: cnt('Draft'), color: '#6B7280' }, { label: 'In Review', value: cnt('In Review'), color: CHART_COLORS.blue }, { label: 'Approved', value: cnt('Approved'), color: CHART_COLORS.green }, { label: 'Published', value: cnt('Published'), color: CHART_COLORS.teal }]} />
      <Toolbar>
        {!ws && <MiniSelect label="Workstream" value={fWs} options={withAll(names)} onChange={setFWs} />}
        <MiniSelect label="Type" value={fType} options={withAll(['Plan', 'Charter', 'Design', 'Report', 'Contract', 'Checklist', 'Register', 'Policy', 'Playbook'])} onChange={setFType} />
        <MiniSelect label="Status" value={fStatus} options={withAll(['Draft', 'In Review', 'Approved', 'Published'])} onChange={setFStatus} />
        <SearchBox value={q} onChange={setQ} placeholder="Search documents…" />
      </Toolbar>
      <Table<WsDocument> compact rows={rows} onRowClick={(r) => setEdit({ item: r, isNew: false })} columns={[
        { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
        { key: 'type', header: 'Type' },
        ...(ws ? [] : [{ key: 'workstream', header: 'Workstream', render: (r: WsDocument) => shortWs(r.workstream) }]),
        { key: 'owner', header: 'Owner' },
        { key: 'version', header: 'Version', render: (r) => `v${r.version}` },
        { key: 'updated', header: 'Updated', render: (r) => fmtDate(r.updated) },
        { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
        { key: 'c', header: '', render: () => <Chevron /> },
      ]} />
      {edit && <DocumentForm initial={edit.item} isNew={edit.isNew} wsOptions={names} onClose={() => setEdit(null)}
        onSave={(v) => { docs.update(v); setEdit(null) }} onDelete={edit.isNew ? undefined : () => { docs.remove(edit.item.id); setEdit(null) }} />}
    </Card>
  )
}
