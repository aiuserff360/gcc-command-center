import { useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Gavel, ListChecks, FileDiff, Flag, ShieldCheck, Plus, Check, X, Pencil, Calendar, Users, Crown, UserCog, Briefcase } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Card, KpiTile, Badge, Tabs, Table, Modal, Field, Input, TextArea, Select, FormGrid, Legend, ConfirmDelete, ViewAll, Stat, SectionTitle, Progress } from '../components/ui'
import { Donut, tooltipStyle } from '../components/charts'
import { useCollection, uid } from '../store/useStore'
import { seedRaid, seedWorkstreamSummaries, isOpen, type RaidItem, type WorkstreamSummary } from '../data/shared'
import { WORKSTREAMS, WORKSTREAM_META, OWNERS, CHART_COLORS, fmtDate, TODAY, type Workstream } from '../data/common'
import {
  seedGovernanceSettings, seedSteeringMeetings, seedPackChecklist, seedDecisions, seedChangeRequests, seedActions, seedStakeholders, seedRaci, seedGovEvents, seedControls, seedRagCriteria, RACI_ROLES,
  type GovernanceSettings, type SteeringMeeting, type PackItem, type Decision, type ChangeRequest, type ActionItem, type Stakeholder, type RaciRow, type RaciValue, type GovEvent, type Control, type RagCriterion,
} from '../data/governance'

const TABS = ['Governance Overview', 'Steering Committee', 'Decision Log', 'Change Requests', 'RAID Summary', 'Stakeholders & RACI', 'Governance Calendar', 'Policies & Controls']
const WS_OPTIONS = [...WORKSTREAMS, 'Program Management'] as const
const VIEW_OPTIONS = ['All Workstreams', ...WORKSTREAMS] as const
const STATUS_COLOR: Record<string, string> = { 'On Track': CHART_COLORS.green, 'At Risk': CHART_COLORS.amber, Delayed: CHART_COLORS.red, Completed: CHART_COLORS.green }
const fmtCrSigned = (v: number) => `${v < 0 ? '−' : ''}₹ ${Math.abs(v).toFixed(2)} Cr`

type Setter<T> = <K extends keyof T>(k: K) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
function useForm<T>(initial: T) {
  const [f, setF] = useState<T>(initial)
  const s: Setter<T> = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const n: Setter<T> = (k) => (e) => setF({ ...f, [k]: parseFloat(e.target.value) || 0 })
  return { f, setF, s, n }
}
function ModalFooter({ onClose, onSave, onDelete, isNew, saveLabel = 'Save' }: { onClose: () => void; onSave: () => void; onDelete?: () => void; isNew: boolean; saveLabel?: string }) {
  return (
    <>
      {!isNew && onDelete && <ConfirmDelete onConfirm={onDelete} />}
      <span className="flex-1" />
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={onSave}>{saveLabel}</button>
    </>
  )
}

export default function Governance() {
  const nav = useNavigate()
  const [tab, setTab] = useState(TABS[0])
  const [view, setView] = useState<string>('All Workstreams')

  const settingsC = useCollection<GovernanceSettings>('governanceSettings', seedGovernanceSettings)
  const gs = settingsC.items[0] ?? seedGovernanceSettings[0]
  const meetingsC = useCollection<SteeringMeeting>('steeringMeetings', seedSteeringMeetings)
  const packC = useCollection<PackItem>('steeringPackChecklist', seedPackChecklist)
  const decisionsC = useCollection<Decision>('decisions', seedDecisions)
  const crC = useCollection<ChangeRequest>('changeRequests', seedChangeRequests)
  const actionsC = useCollection<ActionItem>('actions', seedActions)
  const stakeholdersC = useCollection<Stakeholder>('stakeholders', seedStakeholders)
  const raciC = useCollection<RaciRow>('raci', seedRaci)
  const eventsC = useCollection<GovEvent>('governanceEvents', seedGovEvents)
  const controlsC = useCollection<Control>('controls', seedControls)
  const ragC = useCollection<RagCriterion>('ragCriteria', seedRagCriteria)
  const { items: raid } = useCollection<RaidItem>('raid', seedRaid)
  const { items: wss } = useCollection<WorkstreamSummary>('workstreamSummaries', seedWorkstreamSummaries)

  const inView = (ws: string) => view === 'All Workstreams' || ws === view
  const decisions = useMemo(() => decisionsC.items.filter((d) => inView(d.workstream)), [decisionsC.items, view]) // eslint-disable-line react-hooks/exhaustive-deps
  const crs = useMemo(() => crC.items.filter((c) => inView(c.workstream)), [crC.items, view]) // eslint-disable-line react-hooks/exhaustive-deps
  const actions = useMemo(() => actionsC.items.filter((a) => inView(a.workstream)), [actionsC.items, view]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- derived KPIs ---- */
  const held = meetingsC.items.filter((m) => m.status === 'Completed').length
  const nextMeeting = [...meetingsC.items].filter((m) => m.status === 'Scheduled' && m.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))[0]
  const openDecisions = decisions.filter((d) => d.status === 'Pending')
  const overdueDecisions = openDecisions.filter((d) => d.requiredBy < TODAY)
  const pendingCrs = crs.filter((c) => c.status === 'Draft' || c.status === 'In Review')
  const pendingCrImpact = pendingCrs.reduce((s, c) => s + c.costImpactCr, 0)
  const escalations = raid.filter((r) => r.escalated && isOpen(r))
  const awaiting = escalations.filter((r) => r.escalationStatus === 'Awaiting Decision')
  const healthRag = gs.programHealthScore >= 80 ? 'Green' : gs.programHealthScore >= 65 ? 'Amber' : 'Red'
  const healthTone = healthRag === 'Green' ? 'green' : healthRag === 'Amber' ? 'amber' : 'red'

  const upcomingEvents = useMemo(() => eventsC.items.filter((e) => e.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6), [eventsC.items])
  const crPipeline = useMemo(() => (['Scope', 'Budget', 'Timeline'] as const).map((t) => ({
    type: t, Draft: crs.filter((c) => c.type === t && c.status === 'Draft').length, 'In Review': crs.filter((c) => c.type === t && c.status === 'In Review').length,
    Approved: crs.filter((c) => c.type === t && c.status === 'Approved').length, Rejected: crs.filter((c) => c.type === t && c.status === 'Rejected').length,
  })), [crs])

  /* ---- modal state ---- */
  const [meetingEdit, setMeetingEdit] = useState<SteeringMeeting | null>(null)
  const [decisionEdit, setDecisionEdit] = useState<Decision | null>(null)
  const [crEdit, setCrEdit] = useState<ChangeRequest | null>(null)
  const [actionEdit, setActionEdit] = useState<ActionItem | null>(null)
  const [stEdit, setStEdit] = useState<Stakeholder | null>(null)
  const [eventEdit, setEventEdit] = useState<GovEvent | null>(null)
  const [controlEdit, setControlEdit] = useState<Control | null>(null)
  const [ragEdit, setRagEdit] = useState<RagCriterion | null>(null)
  const [structEdit, setStructEdit] = useState(false)

  const newDecision = (): Decision => ({ id: uid('d'), code: `D-${String(decisionsC.items.length + 1).padStart(3, '0')}`, title: '', workstream: 'Talent & Hiring', requestedBy: 'A. Sharma', decisionOwner: 'Steering Committee', requiredBy: TODAY, status: 'Pending', impact: 'Medium', rationale: '', forum: 'Steering Committee' })
  const newCr = (): ChangeRequest => ({ id: uid('cr'), code: `CR-${String(crC.items.length + 1).padStart(3, '0')}`, title: '', type: 'Scope', workstream: 'Talent & Hiring', raisedBy: 'A. Sharma', costImpactCr: 0, scheduleImpactDays: 0, status: 'Draft', submitted: TODAY, description: '', crossWorkstreamImpact: '', benefitImpact: '' })
  const newAction = (): ActionItem => ({ id: uid('a'), code: `A-${String(actionsC.items.length + 1).padStart(3, '0')}`, action: '', owner: 'A. Sharma', due: TODAY, source: nextMeeting?.code ?? 'Weekly review', status: 'Open', workstream: 'Program Management' })
  const newMeeting = (): SteeringMeeting => ({ id: uid('sm'), code: `SC-${String(meetingsC.items.length + 1).padStart(2, '0')}`, date: TODAY, title: `Steering Committee #${meetingsC.items.length + 1}`, agenda: '', attendees: 'Steering members', decisionsTaken: '', actions: '', minutesStatus: 'Scheduled', status: 'Scheduled' })
  const newStakeholder = (): Stakeholder => ({ id: uid('st'), name: '', role: '', organization: '', influence: 'Medium', interest: 'Medium', engagement: 'Monthly', owner: 'A. Sharma', group: 'Global Functional', sentiment: 'Neutral' })
  const newEvent = (): GovEvent => ({ id: uid('ev'), title: '', type: 'Other', date: TODAY, cadence: 'One-off', owner: 'A. Sharma', attendees: '' })
  const newControl = (): Control => ({ id: uid('ctl'), control: '', wbs: '', description: '', owner: 'A. Sharma', status: 'Planned', lastReviewed: '', evidence: '' })

  const decide = (d: Decision, status: Decision['status']) => decisionsC.update({ ...d, status, decidedOn: status === 'Pending' ? undefined : TODAY })
  const decideCr = (c: ChangeRequest, status: ChangeRequest['status']) => crC.update({ ...c, status, decidedOn: status === 'Approved' || status === 'Rejected' ? TODAY : undefined })

  return (
    <div>
      <PageHeader title="Governance" subtitle="Steer decisions, escalations, changes and compliance across the GCC program." viewValue={view} viewOptions={VIEW_OPTIONS} onView={setView} onEdit={() => setStructEdit(true)} editLabel="Edit governance" />

      <div className="grid grid-cols-5 gap-4 mb-4">
        <KpiTile tone="blue" icon={<Gavel size={22} />} value={<>{held} <span className="text-[16px] text-ink-500 font-semibold">of {gs.plannedSteeringMeetings}</span></>} label="Steering Committees Held" sub={nextMeeting ? <>Next: <b>{fmtDate(nextMeeting.date)}</b></> : 'No meeting scheduled'} />
        <KpiTile tone="violet" icon={<ListChecks size={22} />} value={openDecisions.length} label="Open Decisions" sub={<span className={overdueDecisions.length ? 'text-red-600' : 'text-green-600'}>{overdueDecisions.length} overdue</span>} />
        <KpiTile tone="teal" icon={<FileDiff size={22} />} value={pendingCrs.length} label="Pending Change Requests" sub={<>{fmtCrSigned(pendingCrImpact)} impact</>} />
        <KpiTile tone="red" icon={<Flag size={22} />} value={awaiting.length} label="Escalations Awaiting Decision" sub={<><span className="text-red-600">{awaiting.length} Awaiting Decision</span> | <span className="text-brand-600">{escalations.length - awaiting.length} In Progress</span></>} />
        <KpiTile tone={healthTone} icon={<ShieldCheck size={22} />} value={healthRag} label="Governance Health" sub={<>Program health score <b>{gs.programHealthScore}</b> / 100</>} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-4" />

      {/* ============================ OVERVIEW ============================ */}
      {tab === 'Governance Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-4">
            <Card title="Governance Structure" action={<button className="link inline-flex items-center gap-1" onClick={() => setStructEdit(true)}><Pencil size={12} /> Edit</button>}>
              <div className="space-y-2">
                {[
                  { icon: <Crown size={15} />, role: 'Global Executive Sponsor', name: gs.globalExecutiveSponsor },
                  { icon: <Briefcase size={15} />, role: 'India Program Sponsor', name: gs.indiaProgramSponsor },
                  { icon: <UserCog size={15} />, role: 'GCC Program Director', name: gs.programDirector },
                  { icon: <Users size={15} />, role: 'Program Manager / PMO Lead', name: `${gs.programManager} / ${gs.pmoLead}` },
                ].map((r, i) => (
                  <div key={r.role} className="flex items-center gap-3 text-[12.5px]" style={{ paddingLeft: i * 14 }}>
                    <span className="w-7 h-7 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{r.icon}</span>
                    <div className="min-w-0"><div className="text-ink-500 text-[11px] leading-none">{r.role}</div><div className="font-medium text-ink-900 truncate">{r.name}</div></div>
                  </div>
                ))}
              </div>
              <SectionTitle>Steering Committee members</SectionTitle>
              <div className="flex flex-wrap gap-1.5 mb-3">{gs.steeringMembers.map((m) => <span key={m} className="px-2 py-0.5 rounded-md bg-slate-100 text-[11.5px] text-ink-700">{m}</span>)}</div>
              <SectionTitle>Workstream leads</SectionTitle>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                {wss.map((w) => <div key={w.id} className="flex justify-between gap-2"><span className="text-ink-500 truncate">{WORKSTREAM_META[w.name].short}</span><span className="font-medium text-ink-900">{w.lead}</span></div>)}
              </div>
            </Card>
            <Card title="Upcoming Governance Events" action={<ViewAll onClick={() => setTab('Governance Calendar')} />}>
              <div className="space-y-2.5">
                {upcomingEvents.map((e) => {
                  const d = new Date(e.date)
                  return (
                    <div key={e.id} className="flex items-center gap-3 text-[12.5px] cursor-pointer hover:bg-surface rounded-md px-1 py-0.5" onClick={() => { setTab('Governance Calendar'); setEventEdit(e) }}>
                      <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex flex-col items-center justify-center shrink-0 leading-none"><span className="text-[14px] font-bold">{d.getDate()}</span><span className="text-[9.5px] uppercase">{d.toLocaleDateString('en-GB', { month: 'short' })}</span></div>
                      <div className="min-w-0 flex-1"><div className="font-medium text-ink-900 truncate">{e.title}</div><div className="text-[11.5px] text-ink-500">{e.type} · {e.owner}</div></div>
                    </div>
                  )
                })}
              </div>
            </Card>
            <Card title="RAG Summary by Workstream" action={<ViewAll onClick={() => nav('/workstreams')} />}>
              <div className="space-y-2">
                {wss.map((w) => (
                  <div key={w.id} className="flex items-center gap-2 text-[12.5px]">
                    <span className="w-[112px] text-ink-700 truncate">{WORKSTREAM_META[w.name].short}</span>
                    <Progress value={w.progress} className="flex-1" color={STATUS_COLOR[w.status] ?? CHART_COLORS.blue} />
                    <span className="w-8 text-right font-medium">{w.progress}%</span>
                    <span className="w-[68px] flex justify-end"><Badge value={w.status} /></span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line text-[12px]">
                {(['On Track', 'At Risk', 'Delayed'] as const).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />{s} <b>{wss.filter((w) => w.status === s).length}</b></span>)}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-4">
            <Card title="Open Decisions" subtitle={`${openDecisions.length} pending · ${overdueDecisions.length} overdue`} action={<ViewAll onClick={() => setTab('Decision Log')} />}>
              <Table<Decision> compact rows={[...openDecisions].sort((a, b) => a.requiredBy.localeCompare(b.requiredBy)).slice(0, 6)} onRowClick={(d) => setDecisionEdit(d)} columns={[
                { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
                { key: 'title', header: 'Decision', render: (d) => <div><div className="truncate max-w-[180px] font-medium" title={d.title}>{d.title}</div><div className="text-[11px] text-ink-500 truncate max-w-[180px]">{d.decisionOwner}</div></div> },
                { key: 'requiredBy', header: 'Required By', className: 'whitespace-nowrap', render: (d) => <span className={d.requiredBy < TODAY ? 'text-red-600 font-medium' : ''}>{fmtDate(d.requiredBy)}</span> },
                { key: 'impact', header: 'Impact', render: (d) => <Badge value={d.impact} /> },
              ]} />
            </Card>
            <Card title="Change Request Pipeline">
              <div className="-mt-2 mb-1"><Legend items={[{ label: 'Draft', color: CHART_COLORS.gray }, { label: 'In Review', color: CHART_COLORS.blueLight }, { label: 'Approved', color: CHART_COLORS.green }, { label: 'Rejected', color: CHART_COLORS.red }]} /></div>
              <div className="h-[200px]">
                <ResponsiveContainer>
                  <BarChart data={crPipeline} margin={{ top: 8, right: 8, left: -26, bottom: 0 }} barCategoryGap="35%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="type" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                    <Bar isAnimationActive={false} dataKey="Draft" stackId="a" fill={CHART_COLORS.gray} />
                    <Bar isAnimationActive={false} dataKey="In Review" stackId="a" fill={CHART_COLORS.blueLight} />
                    <Bar isAnimationActive={false} dataKey="Approved" stackId="a" fill={CHART_COLORS.green} />
                    <Bar isAnimationActive={false} dataKey="Rejected" stackId="a" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-[12px] text-ink-500 mt-1"><span>{pendingCrs.length} pending</span><span>{fmtCrSigned(pendingCrImpact)} cost impact</span><span>{pendingCrs.reduce((s, c) => s + Math.max(0, c.scheduleImpactDays), 0)} days schedule</span></div>
            </Card>
            <Card title="Escalations" subtitle={`${awaiting.length} awaiting steering committee decision`} action={<ViewAll onClick={() => nav('/risks')} />}>
              <div className="space-y-2">
                {escalations.map((r) => (
                  <div key={r.id} className="flex items-start gap-2.5 text-[12.5px] cursor-pointer hover:bg-surface rounded-md p-1" onClick={() => nav('/risks')}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${r.level === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}><Flag size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink-900 truncate">{r.code} · {r.shortTitle ?? r.title}</div>
                      <div className="flex items-center gap-2 text-[11.5px] text-ink-500">{r.owner} · due {fmtDate(r.dueDate)}</div>
                    </div>
                    <Badge value={r.escalationStatus ?? 'In Progress'} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============================ STEERING COMMITTEE ============================ */}
      {tab === 'Steering Committee' && (
        <div className="space-y-4">
          <Card title="Steering Committee Meetings Register" subtitle={`${held} held · ${meetingsC.items.filter((m) => m.status === 'Scheduled').length} scheduled · ${meetingsC.items.filter((m) => m.minutesStatus === 'Circulated' || m.minutesStatus === 'Draft').length} minutes awaiting approval`} action={<button className="btn-primary" onClick={() => setMeetingEdit(newMeeting())}><Plus size={14} /> Add Meeting</button>}>
            <Table<SteeringMeeting> rows={[...meetingsC.items].sort((a, b) => b.date.localeCompare(a.date))} onRowClick={setMeetingEdit} columns={[
              { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
              { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (m) => fmtDate(m.date) },
              { key: 'title', header: 'Meeting', render: (m) => <span className="font-medium block max-w-[210px] truncate" title={m.title}>{m.title}</span> },
              { key: 'agenda', header: 'Agenda', render: (m) => <span className="block max-w-[220px] truncate text-ink-700" title={m.agenda}>{m.agenda}</span> },
              { key: 'attendees', header: 'Attendees', render: (m) => <span className="block max-w-[150px] truncate" title={m.attendees}>{m.attendees}</span> },
              { key: 'decisionsTaken', header: 'Decisions Taken', render: (m) => <span className="block max-w-[240px] truncate" title={m.decisionsTaken}>{m.decisionsTaken || '—'}</span> },
              { key: 'actions', header: 'Actions', render: (m) => <span className="block max-w-[200px] truncate" title={m.actions}>{m.actions || '—'}</span> },
              { key: 'minutesStatus', header: 'Minutes', render: (m) => <Badge value={m.minutesStatus === 'Circulated' ? 'In Review' : m.minutesStatus === 'Scheduled' ? 'Pending' : m.minutesStatus} /> },
              { key: 'status', header: 'Status', render: (m) => <Badge value={m.status === 'Scheduled' ? 'Planned' : m.status} /> },
            ]} />
          </Card>
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <Card title={`Next Meeting Pack – ${nextMeeting?.code ?? 'TBC'}`} subtitle={nextMeeting ? `${fmtDate(nextMeeting.date)} · ${packC.items.filter((p) => p.done).length} of ${packC.items.length} items ready` : 'No meeting scheduled'}>
              <div className="space-y-1.5">
                {packC.items.map((p) => (
                  <label key={p.id} className="flex items-center gap-2.5 text-[12.5px] cursor-pointer hover:bg-surface rounded-md px-1 py-1">
                    <input type="checkbox" checked={p.done} onChange={() => packC.update({ ...p, done: !p.done })} className="accent-brand-600" />
                    <span className={`flex-1 ${p.done ? 'line-through text-ink-500' : 'text-ink-900'}`}>{p.item}</span>
                    <span className="text-[11.5px] text-ink-500">{p.owner}</span>
                  </label>
                ))}
              </div>
              <Progress value={Math.round((packC.items.filter((p) => p.done).length / Math.max(1, packC.items.length)) * 100)} className="mt-3" color="#1E5BBE" />
            </Card>
            <Card title="Agenda for Next Meeting">
              {nextMeeting ? (
                <div className="space-y-3 text-[12.5px]">
                  <div className="p-3 rounded-lg bg-surface"><div className="font-medium text-ink-900">{nextMeeting.title}</div><div className="text-ink-500 mt-0.5">{fmtDate(nextMeeting.date)} · {nextMeeting.attendees}</div></div>
                  <ol className="list-decimal pl-5 space-y-1 text-ink-700">{nextMeeting.agenda.split(';').map((a) => a.trim()).filter(Boolean).map((a) => <li key={a}>{a}</li>)}</ol>
                  <SectionTitle>Decisions required</SectionTitle>
                  <ul className="space-y-1">{openDecisions.filter((d) => d.forum === 'Steering Committee').map((d) => <li key={d.id} className="flex items-center gap-2"><Badge value={d.impact} /><span className="truncate">{d.code} {d.title}</span></li>)}</ul>
                  <button className="btn-secondary" onClick={() => setMeetingEdit(nextMeeting)}><Pencil size={13} /> Edit agenda</button>
                </div>
              ) : <p className="text-[12.5px] text-ink-500">Add a scheduled meeting to see its agenda.</p>}
            </Card>
            <Card title="Decisions & Actions by Meeting" headerRight={<Legend items={[{ label: 'Decisions', color: CHART_COLORS.violet }, { label: 'Actions', color: CHART_COLORS.teal }]} />}>
              <div className="h-[230px]">
                <ResponsiveContainer>
                  <BarChart data={meetingsC.items.filter((m) => m.status === 'Completed').map((m) => ({ name: m.code, Decisions: m.decisionsTaken ? m.decisionsTaken.split(';').length : 0, Actions: actionsC.items.filter((a) => a.source === m.code).length }))} margin={{ top: 14, right: 4, left: -26, bottom: 0 }} barGap={2}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                    <Bar isAnimationActive={false} dataKey="Decisions" fill={CHART_COLORS.violet} radius={[3, 3, 0, 0]}><LabelList dataKey="Decisions" position="top" style={{ fontSize: 10.5, fill: '#374151' }} /></Bar>
                    <Bar isAnimationActive={false} dataKey="Actions" fill={CHART_COLORS.teal} radius={[3, 3, 0, 0]}><LabelList dataKey="Actions" position="top" style={{ fontSize: 10.5, fill: '#374151' }} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============================ DECISION LOG ============================ */}
      {tab === 'Decision Log' && <DecisionLog decisions={decisions} onEdit={setDecisionEdit} onAdd={() => setDecisionEdit(newDecision())} onDecide={decide} />}

      {/* ============================ CHANGE REQUESTS ============================ */}
      {tab === 'Change Requests' && <ChangeRequests crs={crs} pipeline={crPipeline} onEdit={setCrEdit} onAdd={() => setCrEdit(newCr())} onDecide={decideCr} />}

      {/* ============================ RAID SUMMARY ============================ */}
      {tab === 'RAID Summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Risks', n: raid.filter((r) => r.type === 'Risk' && isOpen(r)).length, sub: `${raid.filter((r) => r.type === 'Risk' && isOpen(r) && r.level === 'Critical').length} Critical`, color: CHART_COLORS.red, to: () => nav('/risks') },
              { label: 'Issues', n: raid.filter((r) => r.type === 'Issue' && isOpen(r)).length, sub: `${raid.filter((r) => r.type === 'Issue' && isOpen(r) && r.level === 'High').length} High`, color: CHART_COLORS.blue, to: () => nav('/risks') },
              { label: 'Decisions', n: openDecisions.length, sub: `${overdueDecisions.length} overdue`, color: CHART_COLORS.violet, to: () => setTab('Decision Log') },
              { label: 'Actions', n: actions.filter((a) => a.status !== 'Completed').length, sub: `${actions.filter((a) => a.status === 'Overdue' || (a.status !== 'Completed' && a.due < TODAY)).length} overdue`, color: CHART_COLORS.teal, to: undefined },
            ].map((t) => (
              <div key={t.label} className="card px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={t.to}>
                <span className="w-1.5 h-10 rounded-full" style={{ background: t.color }} />
                <div><div className="text-[22px] font-bold leading-tight" style={{ color: t.color }}>{t.n}</div><div className="text-[12px] text-ink-700 font-medium">Open {t.label}</div></div>
                <span className="ml-auto text-[11.5px] text-ink-500">{t.sub}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card title="Top Risks by Impact" action={<ViewAll onClick={() => nav('/risks')} />}>
              <Table<RaidItem> compact rows={raid.filter((r) => r.type === 'Risk' && isOpen(r)).sort((a, b) => b.impactScore - a.impactScore).slice(0, 6)} onRowClick={() => nav('/risks')} columns={[
                { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' }, { key: 'title', header: 'Risk', render: (r) => <span className="block max-w-[220px] truncate" title={r.title}>{r.title}</span> },
                { key: 'level', header: 'Level', render: (r) => <Badge value={r.level} /> }, { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' }, { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
              ]} />
            </Card>
            <Card title="Top Issues" action={<ViewAll onClick={() => nav('/risks')} />}>
              <Table<RaidItem> compact rows={raid.filter((r) => r.type === 'Issue' && isOpen(r)).sort((a, b) => b.impactScore - a.impactScore).slice(0, 6)} onRowClick={() => nav('/risks')} columns={[
                { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' }, { key: 'title', header: 'Issue', render: (r) => <span className="block max-w-[220px] truncate" title={r.title}>{r.title}</span> },
                { key: 'level', header: 'Level', render: (r) => <Badge value={r.level} /> }, { key: 'dueDate', header: 'Due', className: 'whitespace-nowrap', render: (r) => fmtDate(r.dueDate) }, { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
              ]} />
            </Card>
          </div>
          <Card title="Actions Register" subtitle={`${actions.filter((a) => a.status !== 'Completed').length} open · ${actions.filter((a) => a.status === 'Completed').length} completed`} action={<button className="btn-primary" onClick={() => setActionEdit(newAction())}><Plus size={14} /> Add Action</button>}>
            <Table<ActionItem> rows={[...actions].sort((a, b) => (a.status === 'Completed' ? 1 : 0) - (b.status === 'Completed' ? 1 : 0) || a.due.localeCompare(b.due))} onRowClick={setActionEdit} columns={[
              { key: 'code', header: 'ID', className: 'text-ink-500' },
              { key: 'action', header: 'Action', render: (a) => <span className="font-medium">{a.action}</span> },
              { key: 'workstream', header: 'Workstream', render: (a) => a.workstream === 'Program Management' ? 'PMO' : WORKSTREAM_META[a.workstream as Workstream]?.short ?? a.workstream },
              { key: 'owner', header: 'Owner' },
              { key: 'due', header: 'Due', render: (a) => <span className={a.status !== 'Completed' && a.due < TODAY ? 'text-red-600 font-medium' : ''}>{fmtDate(a.due)}</span> },
              { key: 'source', header: 'Source Meeting' },
              { key: 'status', header: 'Status', render: (a) => <Badge value={a.status !== 'Completed' && a.due < TODAY ? 'Overdue' : a.status} /> },
              { key: 'x', header: '', render: (a) => a.status !== 'Completed' && <button className="link" onClick={(e) => { e.stopPropagation(); actionsC.update({ ...a, status: 'Completed' }) }}>Mark done</button> },
            ]} />
          </Card>
        </div>
      )}

      {/* ============================ STAKEHOLDERS & RACI ============================ */}
      {tab === 'Stakeholders & RACI' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[2fr_1fr] gap-4">
            <Card title="Stakeholder Register" subtitle={`${stakeholdersC.items.length} stakeholders · ${stakeholdersC.items.filter((s) => s.sentiment === 'Concerned').length} concerned`} action={<button className="btn-primary" onClick={() => setStEdit(newStakeholder())}><Plus size={14} /> Add Stakeholder</button>}>
              <Table<Stakeholder> compact rows={stakeholdersC.items} onRowClick={setStEdit} columns={[
                { key: 'name', header: 'Stakeholder', render: (s) => <div><div className="font-medium whitespace-nowrap max-w-[170px] truncate" title={s.name}>{s.name}</div><div className="text-[11.5px] text-ink-500 max-w-[170px] truncate" title={s.role}>{s.role}</div></div> },
                { key: 'organization', header: 'Organization', className: 'whitespace-nowrap' },
                { key: 'group', header: 'Group', className: 'whitespace-nowrap' },
                { key: 'influence', header: 'Influence / Interest', className: 'whitespace-nowrap', render: (s) => <span className="inline-flex gap-1"><Badge value={s.influence} /><Badge value={s.interest} /></span> },
                { key: 'engagement', header: 'Engagement', className: 'whitespace-nowrap' },
                { key: 'sentiment', header: 'Sentiment', className: 'whitespace-nowrap', render: (s) => <span className={`inline-flex items-center gap-1.5 text-[12px]`}><span className="w-2 h-2 rounded-full" style={{ background: s.sentiment === 'Supportive' ? CHART_COLORS.green : s.sentiment === 'Concerned' ? CHART_COLORS.red : CHART_COLORS.amber }} />{s.sentiment}</span> },
                { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
              ]} />
            </Card>
            <Card title="Influence / Interest Map" subtitle="Click a stakeholder to edit">
              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                {[
                  { t: 'Manage closely', inf: 'High', int: 'High', cls: 'bg-red-50' },
                  { t: 'Keep satisfied', inf: 'High', int: 'Low', cls: 'bg-amber-50' },
                  { t: 'Keep informed', inf: 'Low', int: 'High', cls: 'bg-blue-50' },
                  { t: 'Monitor', inf: 'Low', int: 'Low', cls: 'bg-slate-100' },
                ].map((q) => {
                  const list = stakeholdersC.items.filter((s) => (q.inf === 'High' ? s.influence === 'High' : s.influence !== 'High') && (q.int === 'High' ? s.interest === 'High' : s.interest !== 'High'))
                  return (
                    <div key={q.t} className={`rounded-lg p-2.5 min-h-[120px] ${q.cls}`}>
                      <div className="font-semibold text-ink-900 mb-1">{q.t} <span className="text-ink-500 font-normal">({list.length})</span></div>
                      <div className="flex flex-wrap gap-1">{list.map((s) => <button key={s.id} className="px-1.5 py-0.5 rounded bg-white/80 text-ink-700 hover:text-brand-600 cursor-pointer" onClick={() => setStEdit(s)}>{s.name}</button>)}</div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[11px] text-ink-500 mt-1.5"><span>← Low interest</span><span>High interest →</span></div>
              <div className="mt-3 pt-3 border-t border-line space-y-1">
                {(['Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'As needed'] as const).map((f) => <Stat key={f} label={`${f} engagement`} value={stakeholdersC.items.filter((s) => s.engagement === f).length} />)}
              </div>
            </Card>
          </div>
          <Card title="RACI Matrix – Workstreams × Key Roles" subtitle="Click a cell to cycle R → A → C → I → blank" headerRight={<Legend items={[{ label: 'R Responsible', color: CHART_COLORS.blue }, { label: 'A Accountable', color: CHART_COLORS.red }, { label: 'C Consulted', color: CHART_COLORS.amber }, { label: 'I Informed', color: CHART_COLORS.gray }]} />}>
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full border-separate border-spacing-0 tbl">
                <thead><tr><th className="th">Workstream</th>{RACI_ROLES.map((r) => <th key={r} className="th text-center">{r}</th>)}</tr></thead>
                <tbody>
                  {raciC.items.map((row) => (
                    <tr key={row.id}>
                      <td className="td font-medium">{row.workstream}</td>
                      {RACI_ROLES.map((r) => {
                        const v = row.cells[r] ?? ''
                        const cls = v === 'R' ? 'bg-blue-50 text-brand-600' : v === 'A' ? 'bg-red-50 text-red-600' : v === 'C' ? 'bg-amber-50 text-amber-700' : v === 'I' ? 'bg-slate-100 text-slate-600' : 'bg-white text-ink-400 border border-dashed border-line'
                        return (
                          <td key={r} className="td text-center">
                            <button className={`w-8 h-8 rounded-md text-[12.5px] font-bold cursor-pointer ${cls}`} onClick={() => raciC.update({ ...row, cells: { ...row.cells, [r]: nextRaci(v) } })}>{v || '–'}</button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ============================ GOVERNANCE CALENDAR ============================ */}
      {tab === 'Governance Calendar' && <GovernanceCalendar events={eventsC.items} onEdit={setEventEdit} onAdd={() => setEventEdit(newEvent())} />}

      {/* ============================ POLICIES & CONTROLS ============================ */}
      {tab === 'Policies & Controls' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_270px] gap-4">
            <Card title="Program Controls" subtitle="WBS 1.3 Governance and controls · 13 Stakeholder Management" action={<button className="btn-primary" onClick={() => setControlEdit(newControl())}><Plus size={14} /> Add Control</button>}>
              <Table<Control> compact rows={controlsC.items} onRowClick={setControlEdit} columns={[
                { key: 'wbs', header: 'WBS', className: 'text-ink-500 whitespace-nowrap' },
                { key: 'control', header: 'Control', render: (c) => <div><div className="font-medium max-w-[330px] truncate" title={c.control}>{c.control}</div><div className="text-[11.5px] text-ink-500 max-w-[330px] truncate" title={c.description}>{c.description}</div></div> },
                { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
                { key: 'lastReviewed', header: 'Last Reviewed', className: 'whitespace-nowrap', render: (c) => c.lastReviewed ? fmtDate(c.lastReviewed) : '—' },
                { key: 'evidence', header: 'Evidence', render: (c) => <span className="block max-w-[140px] truncate" title={c.evidence}>{c.evidence}</span> },
                { key: 'status', header: 'Status', render: (c) => <Badge value={c.status === 'Needs Review' ? 'At Risk' : c.status === 'Planned' ? 'Not Started' : c.status} className={c.status === 'Needs Review' ? '' : ''} /> },
              ]} />
            </Card>
            <Card title="Control Status">
              <Donut size={150} data={[
                { name: 'Active', value: controlsC.items.filter((c) => c.status === 'Active').length, color: CHART_COLORS.green },
                { name: 'In Progress', value: controlsC.items.filter((c) => c.status === 'In Progress').length, color: CHART_COLORS.blueLight },
                { name: 'Needs Review', value: controlsC.items.filter((c) => c.status === 'Needs Review').length, color: CHART_COLORS.amber },
                { name: 'Planned', value: controlsC.items.filter((c) => c.status === 'Planned').length, color: CHART_COLORS.gray },
              ]} center={<><div className="text-[24px] font-bold text-ink-900 leading-none">{controlsC.items.length}</div><div className="text-[11px] text-ink-500 mt-1">Controls</div></>} />
              <div className="mt-3 space-y-1">
                {[['Active', CHART_COLORS.green], ['In Progress', CHART_COLORS.blueLight], ['Needs Review', CHART_COLORS.amber], ['Planned', CHART_COLORS.gray]].map(([l, c]) => (
                  <div key={l} className="flex items-center justify-between text-[12.5px]"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}</span><b>{controlsC.items.filter((x) => x.status === l).length}</b></div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-line text-[12px] text-ink-500">Delegation of authority: Workstream Lead &lt; ₹ 5 L · Program Director &lt; ₹ 25 L · Steering Committee above ₹ 25 L or &gt; 10 days schedule impact.</div>
            </Card>
          </div>
          <Card title="RAG Criteria Definition" subtitle="Program health indicators (WBS 1.3.8) · click a row to edit thresholds">
            <Table<RagCriterion> rows={ragC.items} onRowClick={setRagEdit} columns={[
              { key: 'dimension', header: 'Dimension', render: (r) => <span className="font-medium">{r.dimension}</span>, width: '140px' },
              { key: 'green', header: <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600" /> Green</span>, render: (r) => <span className="text-ink-700">{r.green}</span> },
              { key: 'amber', header: <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Amber</span>, render: (r) => <span className="text-ink-700">{r.amber}</span> },
              { key: 'red', header: <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Red</span>, render: (r) => <span className="text-ink-700">{r.red}</span> },
            ]} />
          </Card>
        </div>
      )}

      {/* ============================ MODALS ============================ */}
      {structEdit && <StructureModal value={gs} onClose={() => setStructEdit(false)} onSave={(v) => { settingsC.update(v); setStructEdit(false) }} />}
      {meetingEdit && <MeetingModal key={meetingEdit.id} value={meetingEdit} isNew={!meetingsC.items.some((m) => m.id === meetingEdit.id)} onClose={() => setMeetingEdit(null)} onSave={(v) => { meetingsC.update(v); setMeetingEdit(null) }} onDelete={() => { meetingsC.remove(meetingEdit.id); setMeetingEdit(null) }} />}
      {decisionEdit && <DecisionModal key={decisionEdit.id} value={decisionEdit} isNew={!decisionsC.items.some((d) => d.id === decisionEdit.id)} onClose={() => setDecisionEdit(null)} onSave={(v) => { decisionsC.update(v); setDecisionEdit(null) }} onDelete={() => { decisionsC.remove(decisionEdit.id); setDecisionEdit(null) }} />}
      {crEdit && <CrModal key={crEdit.id} value={crEdit} isNew={!crC.items.some((c) => c.id === crEdit.id)} onClose={() => setCrEdit(null)} onSave={(v) => { crC.update(v); setCrEdit(null) }} onDelete={() => { crC.remove(crEdit.id); setCrEdit(null) }} />}
      {actionEdit && <ActionModal key={actionEdit.id} value={actionEdit} isNew={!actionsC.items.some((a) => a.id === actionEdit.id)} meetings={meetingsC.items} onClose={() => setActionEdit(null)} onSave={(v) => { actionsC.update(v); setActionEdit(null) }} onDelete={() => { actionsC.remove(actionEdit.id); setActionEdit(null) }} />}
      {stEdit && <StakeholderModal key={stEdit.id} value={stEdit} isNew={!stakeholdersC.items.some((s) => s.id === stEdit.id)} onClose={() => setStEdit(null)} onSave={(v) => { stakeholdersC.update(v); setStEdit(null) }} onDelete={() => { stakeholdersC.remove(stEdit.id); setStEdit(null) }} />}
      {eventEdit && <EventModal key={eventEdit.id} value={eventEdit} isNew={!eventsC.items.some((e) => e.id === eventEdit.id)} onClose={() => setEventEdit(null)} onSave={(v) => { eventsC.update(v); setEventEdit(null) }} onDelete={() => { eventsC.remove(eventEdit.id); setEventEdit(null) }} />}
      {controlEdit && <ControlModal key={controlEdit.id} value={controlEdit} isNew={!controlsC.items.some((c) => c.id === controlEdit.id)} onClose={() => setControlEdit(null)} onSave={(v) => { controlsC.update(v); setControlEdit(null) }} onDelete={() => { controlsC.remove(controlEdit.id); setControlEdit(null) }} />}
      {ragEdit && <RagModal key={ragEdit.id} value={ragEdit} onClose={() => setRagEdit(null)} onSave={(v) => { ragC.update(v); setRagEdit(null) }} />}
    </div>
  )
}

function nextRaci(v: RaciValue): RaciValue { return v === 'R' ? 'A' : v === 'A' ? 'C' : v === 'C' ? 'I' : v === 'I' ? '' : 'R' }

/* ====================================================================== */
/* Decision Log tab                                                        */
/* ====================================================================== */
function DecisionLog({ decisions, onEdit, onAdd, onDecide }: { decisions: Decision[]; onEdit: (d: Decision) => void; onAdd: () => void; onDecide: (d: Decision, s: Decision['status']) => void }) {
  const [status, setStatus] = useState('All')
  const [q, setQ] = useState('')
  const rows = decisions.filter((d) => (status === 'All' || d.status === status) && (q === '' || `${d.code} ${d.title} ${d.decisionOwner}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1) || a.requiredBy.localeCompare(b.requiredBy))
  const byStatus = (['Pending', 'Approved', 'Rejected', 'Deferred'] as const).map((s) => ({ name: s, value: decisions.filter((d) => d.status === s).length, color: s === 'Pending' ? CHART_COLORS.amber : s === 'Approved' ? CHART_COLORS.green : s === 'Rejected' ? CHART_COLORS.red : CHART_COLORS.gray }))
  const avgDays = (() => { const done = decisions.filter((d) => d.decidedOn); return done.length ? Math.round(done.reduce((s, d) => s + Math.max(0, (new Date(d.decidedOn!).getTime() - new Date(d.requiredBy).getTime()) / 86400000), 0) / done.length) : 0 })()
  return (
    <div className="grid grid-cols-[1fr_270px] gap-4">
      <Card title="Decision Log" subtitle={`${decisions.length} decisions · ${decisions.filter((d) => d.status === 'Pending').length} pending`} action={
        <div className="flex items-center gap-2">
          <input className="input !w-[200px] !py-1.5" placeholder="Search decisions…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input !w-auto !py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>{['All', 'Pending', 'Approved', 'Rejected', 'Deferred'].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn-primary" onClick={onAdd}><Plus size={14} /> Add Decision</button>
        </div>}>
        <Table<Decision> rows={rows} onRowClick={onEdit} columns={[
          { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
          { key: 'title', header: 'Decision', render: (d) => <div><div className="font-medium max-w-[230px] truncate" title={d.title}>{d.title}</div><div className="text-[11.5px] text-ink-500 max-w-[230px] truncate" title={d.rationale}>Requested by {d.requestedBy} · {d.rationale}</div></div> },
          { key: 'workstream', header: 'Workstream', className: 'whitespace-nowrap', render: (d) => d.workstream === 'Program Management' ? 'PMO' : WORKSTREAM_META[d.workstream as Workstream]?.short ?? d.workstream },
          { key: 'decisionOwner', header: 'Decision Owner', className: 'whitespace-nowrap' },
          { key: 'requiredBy', header: 'Required By', className: 'whitespace-nowrap', render: (d) => <span className={d.status === 'Pending' && d.requiredBy < TODAY ? 'text-red-600 font-medium' : ''}>{fmtDate(d.requiredBy)}</span> },
          { key: 'impact', header: 'Impact', render: (d) => <Badge value={d.impact} /> },
          { key: 'status', header: 'Status', render: (d) => <div><Badge value={d.status === 'Deferred' ? 'Not Started' : d.status} />{d.decidedOn && <div className="text-[10.5px] text-ink-500 mt-0.5 whitespace-nowrap">{fmtDate(d.decidedOn)}</div>}</div> },
          { key: 'x', header: '', render: (d) => d.status === 'Pending' ? (
            <span className="inline-flex gap-1">
              <button title="Approve" className="w-6 h-6 rounded-md bg-green-50 text-green-700 flex items-center justify-center hover:bg-green-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); onDecide(d, 'Approved') }}><Check size={13} /></button>
              <button title="Reject" className="w-6 h-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); onDecide(d, 'Rejected') }}><X size={13} /></button>
            </span>) : <button className="link" onClick={(e) => { e.stopPropagation(); onDecide(d, 'Pending') }}>Reopen</button> },
        ]} />
      </Card>
      <div className="space-y-4">
        <Card title="Decisions by Status">
          <Donut size={150} data={byStatus} center={<><div className="text-[24px] font-bold text-ink-900 leading-none">{decisions.length}</div><div className="text-[11px] text-ink-500 mt-1">Decisions</div></>} />
          <div className="mt-3 space-y-1">{byStatus.map((s) => <div key={s.name} className="flex items-center justify-between text-[12.5px]"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span><b>{s.value}</b></div>)}</div>
        </Card>
        <Card title="Decision Forums">
          {(['Steering Committee', 'Program Director', 'Workstream Lead'] as const).map((f) => <Stat key={f} label={f} value={<>{decisions.filter((d) => d.forum === f && d.status === 'Pending').length} pending / {decisions.filter((d) => d.forum === f).length}</>} />)}
          <Stat label="Avg. days past required-by" value={`${avgDays} d`} />
        </Card>
      </div>
    </div>
  )
}

/* ====================================================================== */
/* Change Requests tab                                                     */
/* ====================================================================== */
function ChangeRequests({ crs, pipeline, onEdit, onAdd, onDecide }: { crs: ChangeRequest[]; pipeline: { type: string; Draft: number; 'In Review': number; Approved: number; Rejected: number }[]; onEdit: (c: ChangeRequest) => void; onAdd: () => void; onDecide: (c: ChangeRequest, s: ChangeRequest['status']) => void }) {
  const [status, setStatus] = useState('All')
  const rows = crs.filter((c) => status === 'All' || c.status === status).sort((a, b) => b.submitted.localeCompare(a.submitted))
  const approved = crs.filter((c) => c.status === 'Approved')
  const approvedCost = approved.reduce((s, c) => s + c.costImpactCr, 0)
  const approvedDays = approved.reduce((s, c) => s + c.scheduleImpactDays, 0)
  const inReview = crs.filter((c) => c.status === 'In Review')
  const byStatus = (['Draft', 'In Review', 'Approved', 'Rejected'] as const).map((s) => ({ name: s, value: crs.filter((c) => c.status === s).length, color: s === 'Draft' ? CHART_COLORS.gray : s === 'In Review' ? CHART_COLORS.blueLight : s === 'Approved' ? CHART_COLORS.green : CHART_COLORS.red }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-4">
        <Card title="Change Requests by Type">
          <div className="-mt-2 mb-1"><Legend items={[{ label: 'Draft', color: CHART_COLORS.gray }, { label: 'In Review', color: CHART_COLORS.blueLight }, { label: 'Approved', color: CHART_COLORS.green }, { label: 'Rejected', color: CHART_COLORS.red }]} /></div>
          <div className="h-[190px]">
            <ResponsiveContainer>
              <BarChart data={pipeline} margin={{ top: 8, right: 8, left: -26, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="type" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar isAnimationActive={false} dataKey="Draft" stackId="a" fill={CHART_COLORS.gray} /><Bar isAnimationActive={false} dataKey="In Review" stackId="a" fill={CHART_COLORS.blueLight} /><Bar isAnimationActive={false} dataKey="Approved" stackId="a" fill={CHART_COLORS.green} /><Bar isAnimationActive={false} dataKey="Rejected" stackId="a" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Change Requests by Status">
          <div className="flex items-center gap-4">
            <Donut size={140} data={byStatus} center={<><div className="text-[22px] font-bold text-ink-900 leading-none">{crs.length}</div><div className="text-[11px] text-ink-500 mt-1">CRs</div></>} />
            <div className="flex-1 space-y-1.5">{byStatus.map((s) => <div key={s.name} className="flex items-center justify-between text-[12.5px]"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span><b>{s.value}</b></div>)}</div>
          </div>
        </Card>
        <Card title="Approved Change Impact on Baseline">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-surface"><div className="text-[11.5px] text-ink-500">Approved cost impact</div><div className="text-[20px] font-bold text-ink-900">{fmtCrSigned(approvedCost)}</div><div className="text-[11px] text-ink-500">{approved.length} approved CRs</div></div>
            <div className="p-3 rounded-lg bg-surface"><div className="text-[11.5px] text-ink-500">Approved schedule impact</div><div className="text-[20px] font-bold text-ink-900">{approvedDays > 0 ? '+' : ''}{approvedDays} days</div><div className="text-[11px] text-ink-500">net vs baseline</div></div>
            <div className="p-3 rounded-lg bg-blue-50"><div className="text-[11.5px] text-ink-500">In review – cost</div><div className="text-[20px] font-bold text-brand-600">{fmtCrSigned(inReview.reduce((s, c) => s + c.costImpactCr, 0))}</div><div className="text-[11px] text-ink-500">{inReview.length} CRs awaiting approval</div></div>
            <div className="p-3 rounded-lg bg-blue-50"><div className="text-[11.5px] text-ink-500">In review – schedule</div><div className="text-[20px] font-bold text-brand-600">{inReview.reduce((s, c) => s + c.scheduleImpactDays, 0)} days</div><div className="text-[11px] text-ink-500">gross impact if approved</div></div>
          </div>
        </Card>
      </div>
      <Card title="Change Request Register" subtitle="Scope, budget and timeline changes (WBS 14.3)" action={
        <div className="flex items-center gap-2">
          <select className="input !w-auto !py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>{['All', 'Draft', 'In Review', 'Approved', 'Rejected'].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn-primary" onClick={onAdd}><Plus size={14} /> Raise Change Request</button>
        </div>}>
        <Table<ChangeRequest> rows={rows} onRowClick={onEdit} columns={[
          { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
          { key: 'title', header: 'Title', render: (c) => <div><div className="font-medium">{c.title}</div><div className="text-[11.5px] text-ink-500 max-w-[300px] truncate" title={c.description}>{c.description}</div></div> },
          { key: 'type', header: 'Type', render: (c) => <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-medium ${c.type === 'Scope' ? 'bg-violet-50 text-violet-700' : c.type === 'Budget' ? 'bg-teal-50 text-teal-700' : 'bg-orange-50 text-orange-700'}`}>{c.type}</span> },
          { key: 'workstream', header: 'Workstream', render: (c) => c.workstream === 'Program Management' ? 'PMO' : WORKSTREAM_META[c.workstream as Workstream]?.short ?? c.workstream },
          { key: 'raisedBy', header: 'Raised By' },
          { key: 'costImpactCr', header: 'Cost Impact', render: (c) => <span className={c.costImpactCr > 0 ? 'text-red-600' : c.costImpactCr < 0 ? 'text-green-600' : ''}>{fmtCrSigned(c.costImpactCr)}</span> },
          { key: 'scheduleImpactDays', header: 'Schedule Impact', render: (c) => <span className={c.scheduleImpactDays > 0 ? 'text-red-600' : c.scheduleImpactDays < 0 ? 'text-green-600' : ''}>{c.scheduleImpactDays > 0 ? '+' : ''}{c.scheduleImpactDays} d</span> },
          { key: 'submitted', header: 'Submitted', render: (c) => fmtDate(c.submitted) },
          { key: 'status', header: 'Status', render: (c) => <Badge value={c.status} /> },
          { key: 'decidedOn', header: 'Decided On', render: (c) => c.decidedOn ? fmtDate(c.decidedOn) : '—' },
          { key: 'x', header: '', render: (c) => c.status === 'Draft' ? <button className="link" onClick={(e) => { e.stopPropagation(); onDecide(c, 'In Review') }}>Submit</button> : c.status === 'In Review' ? (
            <span className="inline-flex gap-1">
              <button title="Approve" className="w-6 h-6 rounded-md bg-green-50 text-green-700 flex items-center justify-center hover:bg-green-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); onDecide(c, 'Approved') }}><Check size={13} /></button>
              <button title="Reject" className="w-6 h-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); onDecide(c, 'Rejected') }}><X size={13} /></button>
            </span>) : null },
        ]} />
      </Card>
    </div>
  )
}

/* ====================================================================== */
/* Governance Calendar tab                                                 */
/* ====================================================================== */
const CADENCES: { title: string; type: GovEvent['type']; cadence: string; owner: string }[] = [
  { title: 'Weekly integrated program review', type: 'Integrated Program Review', cadence: 'Weekly · Tuesday 10:00 IST', owner: 'A. Sharma' },
  { title: 'Weekly workstream status', type: 'Workstream Status', cadence: 'Weekly · Thursday 15:00 IST', owner: 'D. Singh' },
  { title: 'Monthly steering committee', type: 'Steering Committee', cadence: 'Monthly · last Wednesday', owner: 'R. Banerjee' },
  { title: 'Quarterly business review', type: 'Quarterly Business Review', cadence: 'Quarterly · 2nd week of last month', owner: 'J. Whitfield' },
]
const TYPE_COLOR: Record<GovEvent['type'], string> = { 'Steering Committee': CHART_COLORS.blue, 'Integrated Program Review': CHART_COLORS.teal, 'Workstream Status': CHART_COLORS.blueFaint, 'Quarterly Business Review': CHART_COLORS.violet, 'Go/No-Go': CHART_COLORS.red, 'Audit / Compliance': CHART_COLORS.amber, Other: CHART_COLORS.gray }
function GovernanceCalendar({ events, onEdit, onAdd }: { events: GovEvent[]; onEdit: (e: GovEvent) => void; onAdd: () => void }) {
  const [typeFilter, setTypeFilter] = useState('All types')
  const upcoming = events.filter((e) => e.date >= TODAY && (typeFilter === 'All types' || e.type === typeFilter)).sort((a, b) => a.date.localeCompare(b.date))
  const byMonth = upcoming.reduce<Record<string, GovEvent[]>>((acc, e) => { const k = new Date(e.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); (acc[k] ??= []).push(e); return acc }, {})
  const nextOf = (t: GovEvent['type']) => events.filter((e) => e.type === t && e.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))[0]
  return (
    <div className="grid grid-cols-[340px_1fr] gap-4">
      <div className="space-y-4">
        <Card title="Recurring Cadences">
          <div className="space-y-3">
            {CADENCES.map((c) => {
              const n = nextOf(c.type)
              return (
                <div key={c.title} className="flex gap-3 text-[12.5px]">
                  <span className="w-1.5 rounded-full shrink-0" style={{ background: TYPE_COLOR[c.type] }} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink-900">{c.title}</div>
                    <div className="text-[11.5px] text-ink-500">{c.cadence} · {c.owner}</div>
                    <div className="text-[11.5px] mt-0.5">Next: <b className="text-brand-600">{n ? fmtDate(n.date) : 'not scheduled'}</b></div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        <Card title="Events by Type (next 90 days)">
          {(Object.keys(TYPE_COLOR) as GovEvent['type'][]).map((t) => {
            const n = events.filter((e) => e.type === t && e.date >= TODAY && e.date <= '2027-01-18').length
            return n ? <div key={t} className="flex items-center justify-between text-[12.5px] py-1"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLOR[t] }} />{t}</span><b>{n}</b></div> : null
          })}
        </Card>
      </div>
      <Card title="Governance Calendar" subtitle={`${upcoming.length} upcoming events`} action={
        <div className="flex items-center gap-2">
          <select className="input !w-auto !py-1.5" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>{['All types', ...Object.keys(TYPE_COLOR)].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn-primary" onClick={onAdd}><Plus size={14} /> Add Event</button>
        </div>}>
        <div className="space-y-4">
          {Object.entries(byMonth).map(([month, list]) => (
            <div key={month}>
              <div className="flex items-center gap-2 mb-2"><Calendar size={14} className="text-brand-600" /><h4 className="text-[13px] font-semibold text-ink-900">{month}</h4><span className="text-[11.5px] text-ink-500">{list.length} events</span></div>
              <div className="grid grid-cols-2 gap-2">
                {list.map((e) => {
                  const d = new Date(e.date)
                  return (
                    <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg border border-line hover:bg-surface cursor-pointer text-[12.5px]" onClick={() => onEdit(e)}>
                      <div className="w-10 text-center shrink-0 leading-tight"><div className="text-[15px] font-bold text-ink-900">{d.getDate()}</div><div className="text-[10px] text-ink-500 uppercase">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div></div>
                      <span className="w-1 h-8 rounded-full" style={{ background: TYPE_COLOR[e.type] }} />
                      <div className="min-w-0 flex-1"><div className="font-medium text-ink-900 truncate">{e.title}</div><div className="text-[11.5px] text-ink-500 truncate">{e.type} · {e.owner} · {e.cadence}</div></div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {upcoming.length === 0 && <p className="text-[12.5px] text-ink-500 italic text-center py-6">No upcoming events for this filter.</p>}
        </div>
      </Card>
    </div>
  )
}

/* ====================================================================== */
/* Modals                                                                  */
/* ====================================================================== */
function StructureModal({ value, onClose, onSave }: { value: GovernanceSettings; onClose: () => void; onSave: (v: GovernanceSettings) => void }) {
  const { f, setF, s, n } = useForm(value)
  return (
    <Modal open title="Edit governance structure" onClose={onClose} footer={<ModalFooter isNew onClose={onClose} onSave={() => onSave(f)} />}>
      <FormGrid cols={2}>
        <Field label="Global Executive Sponsor"><Input value={f.globalExecutiveSponsor} onChange={s('globalExecutiveSponsor')} /></Field>
        <Field label="India Program Sponsor"><Input value={f.indiaProgramSponsor} onChange={s('indiaProgramSponsor')} /></Field>
        <Field label="GCC Program Director"><Input value={f.programDirector} onChange={s('programDirector')} /></Field>
        <Field label="Program Manager"><Input value={f.programManager} onChange={s('programManager')} /></Field>
        <Field label="PMO Lead"><Input value={f.pmoLead} onChange={s('pmoLead')} /></Field>
        <Field label="Planned steering committees (year)"><Input type="number" value={f.plannedSteeringMeetings} onChange={n('plannedSteeringMeetings')} /></Field>
        <Field label="Program health score (0–100)"><Input type="number" value={f.programHealthScore} onChange={n('programHealthScore')} /></Field>
        <Field label="Steering Committee members (one per line)" className="col-span-2"><TextArea value={f.steeringMembers.join('\n')} onChange={(e) => setF({ ...f, steeringMembers: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} /></Field>
      </FormGrid>
    </Modal>
  )
}

function MeetingModal({ value, isNew, onClose, onSave, onDelete }: { value: SteeringMeeting; isNew: boolean; onClose: () => void; onSave: (v: SteeringMeeting) => void; onDelete: () => void }) {
  const { f, s } = useForm(value)
  return (
    <Modal open title={isNew ? 'Add steering committee meeting' : `Edit ${f.code}`} onClose={onClose} footer={<ModalFooter isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Meeting ID"><Input value={f.code} onChange={s('code')} /></Field>
        <Field label="Date"><Input type="date" value={f.date} onChange={s('date')} /></Field>
        <Field label="Status"><Select options={['Scheduled', 'Completed', 'Cancelled']} value={f.status} onChange={s('status')} /></Field>
        <Field label="Title" className="col-span-2"><Input value={f.title} onChange={s('title')} /></Field>
        <Field label="Minutes status"><Select options={['Scheduled', 'Draft', 'Circulated', 'Approved']} value={f.minutesStatus} onChange={s('minutesStatus')} /></Field>
        <Field label="Agenda (separate items with ;)" className="col-span-3"><TextArea value={f.agenda} onChange={s('agenda')} /></Field>
        <Field label="Attendees" className="col-span-3"><Input value={f.attendees} onChange={s('attendees')} /></Field>
        <Field label="Decisions taken (separate with ;)" className="col-span-3"><TextArea value={f.decisionsTaken} onChange={s('decisionsTaken')} /></Field>
        <Field label="Actions agreed (separate with ;)" className="col-span-3"><TextArea value={f.actions} onChange={s('actions')} /></Field>
      </FormGrid>
    </Modal>
  )
}

function DecisionModal({ value, isNew, onClose, onSave, onDelete }: { value: Decision; isNew: boolean; onClose: () => void; onSave: (v: Decision) => void; onDelete: () => void }) {
  const { f, setF, s } = useForm(value)
  const set = (status: Decision['status']) => setF({ ...f, status, decidedOn: status === 'Pending' ? undefined : (f.decidedOn ?? TODAY) })
  return (
    <Modal open title={isNew ? 'Add decision' : `Edit ${f.code}`} onClose={onClose} footer={
      <>
        {!isNew && <ConfirmDelete onConfirm={onDelete} />}
        {f.status === 'Pending' && <><button className="btn-secondary !text-green-700" onClick={() => set('Approved')}><Check size={13} /> Approve</button><button className="btn-secondary !text-red-600" onClick={() => set('Rejected')}><X size={13} /> Reject</button><button className="btn-secondary" onClick={() => set('Deferred')}>Defer</button></>}
        <span className="flex-1" />
        <button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave(f)}>Save</button>
      </>}>
      <FormGrid cols={3}>
        <Field label="Decision ID"><Input value={f.code} onChange={s('code')} /></Field>
        <Field label="Title" className="col-span-2"><Input value={f.title} onChange={s('title')} placeholder="What needs to be decided?" /></Field>
        <Field label="Workstream"><Select options={WS_OPTIONS} value={f.workstream} onChange={s('workstream')} /></Field>
        <Field label="Requested by"><Select options={[...OWNERS, 'L. Moreau', 'T. Okafor', 'H. Patel']} value={f.requestedBy} onChange={s('requestedBy')} /></Field>
        <Field label="Decision owner"><Input value={f.decisionOwner} onChange={s('decisionOwner')} /></Field>
        <Field label="Forum"><Select options={['Steering Committee', 'Program Director', 'Workstream Lead']} value={f.forum} onChange={s('forum')} /></Field>
        <Field label="Required by"><Input type="date" value={f.requiredBy} onChange={s('requiredBy')} /></Field>
        <Field label="Impact"><Select options={['Critical', 'High', 'Medium', 'Low']} value={f.impact} onChange={s('impact')} /></Field>
        <Field label="Status"><Select options={['Pending', 'Approved', 'Rejected', 'Deferred']} value={f.status} onChange={(e) => set(e.target.value as Decision['status'])} /></Field>
        <Field label="Decided on"><Input type="date" value={f.decidedOn ?? ''} onChange={(e) => setF({ ...f, decidedOn: e.target.value || undefined })} /></Field>
        <Field label="Rationale / options considered" className="col-span-3"><TextArea value={f.rationale} onChange={s('rationale')} /></Field>
      </FormGrid>
    </Modal>
  )
}

function CrModal({ value, isNew, onClose, onSave, onDelete }: { value: ChangeRequest; isNew: boolean; onClose: () => void; onSave: (v: ChangeRequest) => void; onDelete: () => void }) {
  const { f, setF, s, n } = useForm(value)
  const set = (status: ChangeRequest['status']) => setF({ ...f, status, decidedOn: status === 'Approved' || status === 'Rejected' ? (f.decidedOn ?? TODAY) : undefined })
  return (
    <Modal open width="max-w-3xl" title={isNew ? 'Raise change request' : `Edit ${f.code}`} onClose={onClose} footer={
      <>
        {!isNew && <ConfirmDelete onConfirm={onDelete} />}
        {f.status === 'Draft' && <button className="btn-secondary" onClick={() => set('In Review')}>Submit for review</button>}
        {f.status === 'In Review' && <><button className="btn-secondary !text-green-700" onClick={() => set('Approved')}><Check size={13} /> Approve</button><button className="btn-secondary !text-red-600" onClick={() => set('Rejected')}><X size={13} /> Reject</button></>}
        <span className="flex-1" />
        <button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave(f)}>Save</button>
      </>}>
      <FormGrid cols={3}>
        <Field label="CR ID"><Input value={f.code} onChange={s('code')} /></Field>
        <Field label="Title" className="col-span-2"><Input value={f.title} onChange={s('title')} /></Field>
        <Field label="Type"><Select options={['Scope', 'Budget', 'Timeline']} value={f.type} onChange={s('type')} /></Field>
        <Field label="Workstream"><Select options={WS_OPTIONS} value={f.workstream} onChange={s('workstream')} /></Field>
        <Field label="Raised by"><Select options={OWNERS} value={f.raisedBy} onChange={s('raisedBy')} /></Field>
        <Field label="Description" className="col-span-3"><TextArea value={f.description} onChange={s('description')} /></Field>
      </FormGrid>
      <SectionTitle>Impact assessment</SectionTitle>
      <FormGrid cols={3}>
        <Field label="Cost impact (₹ Cr, negative = saving)"><Input type="number" step="0.01" value={f.costImpactCr} onChange={n('costImpactCr')} /></Field>
        <Field label="Schedule impact (days)"><Input type="number" value={f.scheduleImpactDays} onChange={n('scheduleImpactDays')} /></Field>
        <Field label="Approval authority"><Input readOnly value={Math.abs(f.costImpactCr) >= 0.25 || Math.abs(f.scheduleImpactDays) > 10 ? 'Steering Committee' : Math.abs(f.costImpactCr) >= 0.05 ? 'Program Director' : 'Workstream Lead'} className="bg-surface" /></Field>
        <Field label="Cross-workstream impact" className="col-span-3"><Input value={f.crossWorkstreamImpact} onChange={s('crossWorkstreamImpact')} placeholder="Which workstreams, dependencies or baselines are affected?" /></Field>
        <Field label="Benefit impact" className="col-span-3"><Input value={f.benefitImpact} onChange={s('benefitImpact')} placeholder="Effect on business-case benefits" /></Field>
        <Field label="Submitted"><Input type="date" value={f.submitted} onChange={s('submitted')} /></Field>
        <Field label="Status"><Select options={['Draft', 'In Review', 'Approved', 'Rejected']} value={f.status} onChange={(e) => set(e.target.value as ChangeRequest['status'])} /></Field>
        <Field label="Decided on"><Input type="date" value={f.decidedOn ?? ''} onChange={(e) => setF({ ...f, decidedOn: e.target.value || undefined })} /></Field>
      </FormGrid>
    </Modal>
  )
}

function ActionModal({ value, isNew, meetings, onClose, onSave, onDelete }: { value: ActionItem; isNew: boolean; meetings: SteeringMeeting[]; onClose: () => void; onSave: (v: ActionItem) => void; onDelete: () => void }) {
  const { f, s } = useForm(value)
  return (
    <Modal open title={isNew ? 'Add action' : `Edit ${f.code}`} onClose={onClose} footer={<ModalFooter isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Action ID"><Input value={f.code} onChange={s('code')} /></Field>
        <Field label="Action" className="col-span-2"><Input value={f.action} onChange={s('action')} /></Field>
        <Field label="Owner"><Select options={[...OWNERS, 'L. Moreau', 'R. Banerjee']} value={f.owner} onChange={s('owner')} /></Field>
        <Field label="Due"><Input type="date" value={f.due} onChange={s('due')} /></Field>
        <Field label="Status"><Select options={['Open', 'In Progress', 'Completed', 'Overdue']} value={f.status} onChange={s('status')} /></Field>
        <Field label="Workstream"><Select options={WS_OPTIONS} value={f.workstream} onChange={s('workstream')} /></Field>
        <Field label="Source meeting" className="col-span-2"><Input list="gov-meetings" value={f.source} onChange={s('source')} /><datalist id="gov-meetings">{meetings.map((m) => <option key={m.id} value={m.code}>{m.title}</option>)}<option value="Weekly review">Weekly integrated program review</option></datalist></Field>
      </FormGrid>
    </Modal>
  )
}

function StakeholderModal({ value, isNew, onClose, onSave, onDelete }: { value: Stakeholder; isNew: boolean; onClose: () => void; onSave: (v: Stakeholder) => void; onDelete: () => void }) {
  const { f, s } = useForm(value)
  return (
    <Modal open title={isNew ? 'Add stakeholder' : `Edit ${f.name}`} onClose={onClose} footer={<ModalFooter isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Name"><Input value={f.name} onChange={s('name')} /></Field>
        <Field label="Role" className="col-span-2"><Input value={f.role} onChange={s('role')} /></Field>
        <Field label="Organization"><Input value={f.organization} onChange={s('organization')} /></Field>
        <Field label="Stakeholder group"><Select options={['Global Executive', 'Global Functional', 'India Leadership', 'External']} value={f.group} onChange={s('group')} /></Field>
        <Field label="Relationship owner"><Select options={[...OWNERS, 'R. Banerjee', 'H. Patel']} value={f.owner} onChange={s('owner')} /></Field>
        <Field label="Influence"><Select options={['High', 'Medium', 'Low']} value={f.influence} onChange={s('influence')} /></Field>
        <Field label="Interest"><Select options={['High', 'Medium', 'Low']} value={f.interest} onChange={s('interest')} /></Field>
        <Field label="Engagement frequency"><Select options={['Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'As needed']} value={f.engagement} onChange={s('engagement')} /></Field>
        <Field label="Sentiment"><Select options={['Supportive', 'Neutral', 'Concerned']} value={f.sentiment} onChange={s('sentiment')} /></Field>
      </FormGrid>
    </Modal>
  )
}

function EventModal({ value, isNew, onClose, onSave, onDelete }: { value: GovEvent; isNew: boolean; onClose: () => void; onSave: (v: GovEvent) => void; onDelete: () => void }) {
  const { f, s } = useForm(value)
  return (
    <Modal open title={isNew ? 'Add governance event' : 'Edit event'} onClose={onClose} footer={<ModalFooter isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={2}>
        <Field label="Title" className="col-span-2"><Input value={f.title} onChange={s('title')} /></Field>
        <Field label="Type"><Select options={Object.keys(TYPE_COLOR)} value={f.type} onChange={s('type')} /></Field>
        <Field label="Date"><Input type="date" value={f.date} onChange={s('date')} /></Field>
        <Field label="Cadence"><Select options={['Weekly', 'Monthly', 'Quarterly', 'One-off']} value={f.cadence} onChange={s('cadence')} /></Field>
        <Field label="Owner"><Input value={f.owner} onChange={s('owner')} /></Field>
        <Field label="Attendees" className="col-span-2"><Input value={f.attendees} onChange={s('attendees')} /></Field>
      </FormGrid>
    </Modal>
  )
}

function ControlModal({ value, isNew, onClose, onSave, onDelete }: { value: Control; isNew: boolean; onClose: () => void; onSave: (v: Control) => void; onDelete: () => void }) {
  const { f, s } = useForm(value)
  return (
    <Modal open title={isNew ? 'Add program control' : 'Edit control'} onClose={onClose} footer={<ModalFooter isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="WBS ref"><Input value={f.wbs} onChange={s('wbs')} /></Field>
        <Field label="Control" className="col-span-2"><Input value={f.control} onChange={s('control')} /></Field>
        <Field label="Description" className="col-span-3"><TextArea value={f.description} onChange={s('description')} /></Field>
        <Field label="Owner"><Input value={f.owner} onChange={s('owner')} /></Field>
        <Field label="Status"><Select options={['Active', 'In Progress', 'Planned', 'Needs Review']} value={f.status} onChange={s('status')} /></Field>
        <Field label="Last reviewed"><Input type="date" value={f.lastReviewed} onChange={s('lastReviewed')} /></Field>
        <Field label="Evidence / artefact" className="col-span-3"><Input value={f.evidence} onChange={s('evidence')} /></Field>
      </FormGrid>
    </Modal>
  )
}

function RagModal({ value, onClose, onSave }: { value: RagCriterion; onClose: () => void; onSave: (v: RagCriterion) => void }) {
  const { f, s } = useForm(value)
  return (
    <Modal open title={`RAG criteria – ${f.dimension}`} onClose={onClose} footer={<ModalFooter isNew onClose={onClose} onSave={() => onSave(f)} />}>
      <FormGrid cols={1}>
        <Field label="Dimension"><Input value={f.dimension} onChange={s('dimension')} /></Field>
        <Field label="Green threshold"><TextArea value={f.green} onChange={s('green')} /></Field>
        <Field label="Amber threshold"><TextArea value={f.amber} onChange={s('amber')} /></Field>
        <Field label="Red threshold"><TextArea value={f.red} onChange={s('red')} /></Field>
      </FormGrid>
    </Modal>
  )
}
