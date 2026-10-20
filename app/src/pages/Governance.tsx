import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Gavel, ListChecks, FileDiff, Flag, ShieldCheck, Plus, Check, X, Pencil, Calendar, Users, Crown, UserCog, Briefcase, Save, Building2, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Card, KpiTile, Badge, Tabs, Table, Modal, Field, Input, TextArea, Select, FormGrid, Legend, ConfirmDelete, ViewAll, Stat, SectionTitle, Progress } from '../components/ui'
import { Grid, Row, Td, TextCell, NumCell, DateCell, SelectCell, RemoveBtn, EditBtn, AddBtn, GridToolbar, cellCls, selectCls } from '../components/ui/InlineGrid'
import { InputLayout } from '../components/layout/InputLayout'
import { Donut, tooltipStyle } from '../components/charts'
import { useCollection, useStore, uid } from '../store/useStore'
import { seedRaid, seedWorkstreamSummaries, isOpen, type RaidItem, type WorkstreamSummary } from '../data/shared'
import { WORKSTREAMS, WORKSTREAM_META, OWNERS, CHART_COLORS, fmtDate, TODAY, type Workstream } from '../data/common'
import { useMoney, type Money } from '../data/money'
import {
  seedGovernanceSettings, seedSteeringMeetings, seedPackChecklist, seedDecisions, seedChangeRequests, seedActions, seedStakeholders, seedRaci, seedGovEvents, seedControls, seedRagCriteria, RACI_ROLES,
  seedBuGovernance, seedBuRaci, seedGovRaidLinks, PROGRAM_WIDE, agendaItems, decisionItems, meetingUnits,
  type GovernanceSettings, type SteeringMeeting, type PackItem, type Decision, type ChangeRequest, type ActionItem, type Stakeholder, type RaciRow, type RaciValue, type GovEvent, type Control, type RagCriterion,
  type BuGovernance, type BuRaciRow, type GovRaidLink, type MeetingItem,
} from '../data/governance'
import { seedProjects, seedRaidLinks, type TransitionProject, type RaidLink } from '../data/transition'
import { useBusinessUnits } from '../components/footprint/BusinessUnits'
import { UNIT_ALL, isUnit, matchUnit, raidUnitName, unitHealth, type UnitData } from '../components/governance/units'
import { UnitFilter, UnitChip, UnitChips, UnitSelect, UnitToggles, UnitTagsCell, ProjectSelect } from '../components/governance/UnitFilter'
import UnitOverview, { Link as UnitLink } from '../components/governance/UnitOverview'
import { BuRaciMatrix } from '../components/governance/RaciTables'
import InputUnitTab from '../components/governance/InputUnitTab'

const TABS = ['Governance Overview', 'Steering Committee', 'Decision Log', 'Change Requests', 'RAID Summary', 'Stakeholders & RACI', 'Governance Calendar', 'Policies & Controls']
const WS_OPTIONS = [...WORKSTREAMS, 'Program Management'] as const
const VIEW_OPTIONS = ['All Workstreams', ...WORKSTREAMS] as const
const STATUS_COLOR: Record<string, string> = { 'On Track': CHART_COLORS.green, 'At Risk': CHART_COLORS.amber, Delayed: CHART_COLORS.red, Completed: CHART_COLORS.green }
/** Change-request amounts are small, so show one more decimal than the default (₹ 0.08 Cr | € 0.009 M). */
const signedMoney = (v: number, money: Money) => `${v < 0 ? '−' : ''}${money.fmt(Math.abs(v), money.digits + 1)}`
/** Convert "₹ 4.2 Cr" / "₹ 28.5 L" embedded in narrative text to the display currency. */
const moneyText = (s: string, money: Money) => money.currency === 'INR' ? s : s.replace(/₹\s*([\d.,]+)\s*(Cr|L)\b/g, (_, n: string, u: string) => (u === 'Cr' ? money.fmt(parseFloat(n.replace(/,/g, ''))) : money.fmtLakh(parseFloat(n.replace(/,/g, '')))))

/** Business unit of a seed row with the same id, else Program-wide (used when migrating persisted rows). */
const seedUnit = <T extends { id: string; businessUnit: string }>(seed: T[], id: string) => seed.find((x) => x.id === id)?.businessUnit ?? PROGRAM_WIDE
/** Normalise persisted rows on read (`fix` returns the corrected row or null when nothing is missing) and write the corrected list back once. */
function useMigrated<T extends { id: string }>(c: ReturnType<typeof useCollection<T>>, fix: (x: T) => T | null) {
  const raw = c.items
  const items = useMemo(() => raw.map((x) => fix(x) ?? x), [raw]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useMemo(() => raw.some((x) => fix(x) !== null), [raw]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (dirty) c.setAll(items) }, [dirty, items]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...c, items }
}

type Setter<T> = <K extends keyof T>(k: K) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
function useForm<T>(initial: T, money?: Money) {
  const [f, setF] = useState<T>(initial)
  const s: Setter<T> = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const n: Setter<T> = (k) => (e) => setF({ ...f, [k]: parseFloat(e.target.value) || 0 })
  /** Props for a money input: shows the display currency, stores ₹ Cr. */
  const c = (k: keyof T) => ({ type: 'number' as const, step: 'any', value: money!.inputValue(f[k] as number), onChange: (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: money!.toBase(parseFloat(e.target.value) || 0) }) })
  return { f, setF, s, n, c }
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
  const mode = useStore((s) => s.mode)
  const [tab, setTab] = useState(TABS[0])
  const [view, setView] = useState<string>('All Workstreams')
  /** Business unit selected on the overview; shared by every tab's filter (All / Program-wide / unit). */
  const [unit, setUnit] = useState<string>(UNIT_ALL)
  const money = useMoney()
  const { items: businessUnits } = useBusinessUnits()
  const unitNames = useMemo(() => businessUnits.filter((b) => b.status !== 'Out of Scope').map((b) => b.name), [businessUnits])

  const settingsC = useCollection<GovernanceSettings>('governanceSettings', seedGovernanceSettings)
  const gs = settingsC.items[0] ?? seedGovernanceSettings[0]
  const meetingsC = useCollection<SteeringMeeting>('steeringMeetings', seedSteeringMeetings)
  const packC = useCollection<PackItem>('steeringPackChecklist', seedPackChecklist)
  /* Collections that gained the business-unit dimension: persisted rows from before it are normalised on read
     (same id as a seed row → the seed's unit, otherwise Program-wide) and written back once. */
  const decisionsC = useMigrated(useCollection<Decision>('decisions', seedDecisions), (d) => (d.businessUnit ? null : { ...d, businessUnit: seedUnit(seedDecisions, d.id) }))
  const crC = useMigrated(useCollection<ChangeRequest>('changeRequests', seedChangeRequests), (c) => (c.businessUnit ? null : { ...c, businessUnit: seedUnit(seedChangeRequests, c.id) }))
  const actionsC = useMigrated(useCollection<ActionItem>('actions', seedActions), (a) => (a.businessUnit ? null : { ...a, businessUnit: seedUnit(seedActions, a.id) }))
  const stakeholdersC = useMigrated(useCollection<Stakeholder>('stakeholders', seedStakeholders), (s) => (s.businessUnits ? null : { ...s, businessUnits: seedStakeholders.find((x) => x.id === s.id)?.businessUnits ?? [] }))
  const raciC = useCollection<RaciRow>('raci', seedRaci)
  const eventsC = useMigrated(useCollection<GovEvent>('governanceEvents', seedGovEvents), (e) => (e.businessUnit ? null : { ...e, businessUnit: seedUnit(seedGovEvents, e.id) }))
  const controlsC = useMigrated(useCollection<Control>('controls', seedControls), (c) => (c.businessUnits ? null : { ...c, businessUnits: seedControls.find((x) => x.id === c.id)?.businessUnits ?? [] }))
  const ragC = useCollection<RagCriterion>('ragCriteria', seedRagCriteria)
  const { items: raid } = useCollection<RaidItem>('raid', seedRaid)
  const wssC = useCollection<WorkstreamSummary>('workstreamSummaries', seedWorkstreamSummaries)
  const wss = wssC.items
  const buGovC = useCollection<BuGovernance>('businessUnitGovernance', seedBuGovernance)
  const buRaciC = useCollection<BuRaciRow>('businessUnitRaci', seedBuRaci)
  const govLinksC = useCollection<GovRaidLink>('governanceRaidLinks', seedGovRaidLinks)
  const { items: projects } = useCollection<TransitionProject>('transitionProjects', seedProjects) // read-only here
  const { items: txLinks } = useCollection<RaidLink>('transitionRaidLinks', seedRaidLinks) // read-only here

  /* ---- one-time migration of the settings record (thresholds for the business-unit health) ---- */
  useEffect(() => {
    if (settingsC.items[0] && settingsC.items[0].unitHealthAmberFrom === undefined) settingsC.update({ ...settingsC.items[0], unitHealthAmberFrom: 5, unitHealthRedFrom: 12 })
  }, [settingsC.items]) // eslint-disable-line react-hooks/exhaustive-deps

  const inView = (ws: string) => view === 'All Workstreams' || ws === view
  const decisions = useMemo(() => decisionsC.items.filter((d) => inView(d.workstream) && matchUnit(unit, d.businessUnit)), [decisionsC.items, view, unit]) // eslint-disable-line react-hooks/exhaustive-deps
  const crs = useMemo(() => crC.items.filter((c) => inView(c.workstream) && matchUnit(unit, c.businessUnit)), [crC.items, view, unit]) // eslint-disable-line react-hooks/exhaustive-deps
  const actions = useMemo(() => actionsC.items.filter((a) => inView(a.workstream) && matchUnit(unit, a.businessUnit)), [actionsC.items, view, unit]) // eslint-disable-line react-hooks/exhaustive-deps
  const raidInUnit = useMemo(() => raid.filter((r) => matchUnit(unit, raidUnitName(r, govLinksC.items, txLinks))), [raid, unit, govLinksC.items, txLinks])
  const unitLevel = {
    decisions: decisionsC.items.filter((d) => d.status === 'Pending' && d.businessUnit !== PROGRAM_WIDE).length,
    crs: crC.items.filter((c) => (c.status === 'Draft' || c.status === 'In Review') && c.businessUnit !== PROGRAM_WIDE).length,
    escalations: raid.filter((r) => r.escalated && isOpen(r) && raidUnitName(r, govLinksC.items, txLinks) !== PROGRAM_WIDE).length,
  }

  /* ---- derived KPIs ---- */
  const held = meetingsC.items.filter((m) => m.status === 'Completed').length
  const nextMeeting = [...meetingsC.items].filter((m) => m.status === 'Scheduled' && m.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))[0]
  const openDecisions = decisions.filter((d) => d.status === 'Pending')
  const overdueDecisions = openDecisions.filter((d) => d.requiredBy < TODAY)
  const pendingCrs = crs.filter((c) => c.status === 'Draft' || c.status === 'In Review')
  const pendingCrImpact = pendingCrs.reduce((s, c) => s + c.costImpactCr, 0)
  const escalations = raidInUnit.filter((r) => r.escalated && isOpen(r))
  const awaiting = escalations.filter((r) => r.escalationStatus === 'Awaiting Decision')
  const healthRag = gs.programHealthScore >= 80 ? 'Green' : gs.programHealthScore >= 65 ? 'Amber' : 'Red'
  const healthTone = healthRag === 'Green' ? 'green' : healthRag === 'Amber' ? 'amber' : 'red'

  /* ---- business-unit dimension: everything the unit views need, plus the per-unit health roll-up ---- */
  const unitData: UnitData = useMemo(() => ({
    units: businessUnits, unitNames, decisions: decisionsC.items, crs: crC.items, actions: actionsC.items, raid, govLinks: govLinksC.items, txLinks,
    events: eventsC.items, meetings: meetingsC.items, profiles: buGovC.items, buRaci: buRaciC.items, projects, stakeholders: stakeholdersC.items, controls: controlsC.items, gs,
  }), [businessUnits, unitNames, decisionsC.items, crC.items, actionsC.items, raid, govLinksC.items, txLinks, eventsC.items, meetingsC.items, buGovC.items, buRaciC.items, projects, stakeholdersC.items, controlsC.items, gs])
  const unitRags = useMemo(() => unitNames.map((n) => unitHealth(decisionsC.items.filter((d) => d.businessUnit === n), crC.items.filter((c) => c.businessUnit === n), actionsC.items.filter((a) => a.businessUnit === n), raid.filter((r) => raidUnitName(r, govLinksC.items, txLinks) === n), gs).rag), [unitNames, decisionsC.items, crC.items, actionsC.items, raid, govLinksC.items, txLinks, gs])
  const ragCount = (r: string) => unitRags.filter((x) => x === r).length
  const unitProfile = isUnit(unit) ? buGovC.items.find((p) => p.businessUnit === unit) : undefined

  const upcomingEvents = useMemo(() => eventsC.items.filter((e) => e.date >= TODAY && matchUnit(unit, e.businessUnit)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6), [eventsC.items, unit])
  const stakeholdersInUnit = useMemo(() => stakeholdersC.items.filter((s) => matchUnit(unit, s.businessUnits)), [stakeholdersC.items, unit])
  /** A unit sees its own controls plus the program-wide ones that apply to every unit. */
  const controlsInUnit = useMemo(() => controlsC.items.filter((c) => matchUnit(unit, c.businessUnits) || (isUnit(unit) && c.businessUnits.length === 0)), [controlsC.items, unit])
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

  const defaultUnit = isUnit(unit) ? unit : PROGRAM_WIDE
  const defaultUnits = isUnit(unit) ? [unit] : []
  const newDecision = (): Decision => ({ id: uid('d'), code: `D-${String(decisionsC.items.length + 1).padStart(3, '0')}`, title: '', workstream: 'Talent & Hiring', requestedBy: 'A. Sharma', decisionOwner: 'Steering Committee', requiredBy: TODAY, status: 'Pending', impact: 'Medium', rationale: '', forum: 'Steering Committee', businessUnit: defaultUnit })
  const newCr = (): ChangeRequest => ({ id: uid('cr'), code: `CR-${String(crC.items.length + 1).padStart(3, '0')}`, title: '', type: 'Scope', workstream: 'Talent & Hiring', raisedBy: 'A. Sharma', costImpactCr: 0, scheduleImpactDays: 0, status: 'Draft', submitted: TODAY, description: '', crossWorkstreamImpact: '', benefitImpact: '', businessUnit: defaultUnit })
  const newAction = (): ActionItem => ({ id: uid('a'), code: `A-${String(actionsC.items.length + 1).padStart(3, '0')}`, action: '', owner: 'A. Sharma', due: TODAY, source: nextMeeting?.code ?? 'Weekly review', status: 'Open', workstream: 'Program Management', businessUnit: defaultUnit })
  const newMeeting = (): SteeringMeeting => ({ id: uid('sm'), code: `SC-${String(meetingsC.items.length + 1).padStart(2, '0')}`, date: TODAY, title: `Steering Committee #${meetingsC.items.length + 1}`, agenda: '', attendees: 'Steering members', decisionsTaken: '', actions: '', minutesStatus: 'Scheduled', status: 'Scheduled', agendaUnits: [], decisionUnits: [] })
  const newStakeholder = (): Stakeholder => ({ id: uid('st'), name: '', role: '', organization: '', influence: 'Medium', interest: 'Medium', engagement: 'Monthly', owner: 'A. Sharma', group: 'Global Functional', sentiment: 'Neutral', businessUnits: defaultUnits })
  const newEvent = (): GovEvent => ({ id: uid('ev'), title: '', type: isUnit(unit) ? 'Business Unit Review' : 'Other', date: TODAY, cadence: 'One-off', owner: 'A. Sharma', attendees: '', businessUnit: defaultUnit })
  const newControl = (): Control => ({ id: uid('ctl'), control: '', wbs: '', description: '', owner: 'A. Sharma', status: 'Planned', lastReviewed: '', evidence: '', businessUnits: defaultUnits })

  const decide = (d: Decision, status: Decision['status']) => decisionsC.update({ ...d, status, decidedOn: status === 'Pending' ? undefined : TODAY })
  const decideCr = (c: ChangeRequest, status: ChangeRequest['status']) => crC.update({ ...c, status, decidedOn: status === 'Approved' || status === 'Rejected' ? TODAY : undefined })

  const inputProps: GovInputProps = {
    gs, settingsC, meetingsC, packC, decisionsC, crC, actionsC, stakeholdersC, raciC, eventsC, controlsC, ragC, wss: wssC, buGovC, buRaciC, govLinksC, unitData, unitNames,
    newMeeting, newDecision, newCr, newAction, newStakeholder, newEvent, newControl,
    openMeeting: setMeetingEdit, openDecision: setDecisionEdit, openCr: setCrEdit, openAction: setActionEdit, openStakeholder: setStEdit, openEvent: setEventEdit, openControl: setControlEdit, openRag: setRagEdit,
  }
  const unitFilterProps = { unit, units: unitNames, setUnit }
  const unitScope = isUnit(unit) ? unit : unit === PROGRAM_WIDE ? 'Program-wide items' : 'all business units'

  return (
    <div>
      {mode === 'input' ? <GovernanceInput {...inputProps} /> : <>
      <PageHeader title="Governance" subtitle={isUnit(unit) ? `Governance for ${unit} – owner ${businessUnits.find((b) => b.name === unit)?.owner ?? '—'}, sponsor ${unitProfile?.sponsor ?? '—'}. Clear the business unit filter to see the whole program.` : 'Steer decisions, escalations, changes and compliance across the GCC program and each business unit.'} viewValue={view} viewOptions={VIEW_OPTIONS} onView={setView} onEdit={() => setStructEdit(true)} editLabel="Edit governance"
        right={<UnitFilter value={unit} units={unitNames} onChange={setUnit} className="!py-2" />} />

      <div className="grid grid-cols-6 gap-4 mb-4">
        <KpiTile tone="blue" icon={<Gavel size={22} />} value={<>{held} <span className="text-[16px] text-ink-500 font-semibold">of {gs.plannedSteeringMeetings}</span></>} label="Steering Committees Held" sub={nextMeeting ? <>Next: <b>{fmtDate(nextMeeting.date)}</b></> : 'No meeting scheduled'} />
        <KpiTile tone="violet" icon={<ListChecks size={22} />} value={openDecisions.length} label="Open Decisions" sub={<><span className={overdueDecisions.length ? 'text-red-600' : 'text-green-600'}>{overdueDecisions.length} overdue</span>{!isUnit(unit) && <> · {unitLevel.decisions} unit-level</>}</>} />
        <KpiTile tone="teal" icon={<FileDiff size={22} />} value={pendingCrs.length} label="Pending Change Requests" sub={<>{signedMoney(pendingCrImpact, money)} impact{!isUnit(unit) && <> · {unitLevel.crs} unit-level</>}</>} />
        <KpiTile tone="red" icon={<Flag size={22} />} value={awaiting.length} label="Escalations Awaiting Decision" sub={<><span className="text-red-600">{awaiting.length} Awaiting</span> | <span className="text-brand-600">{escalations.length - awaiting.length} In Progress</span>{!isUnit(unit) && <> · {unitLevel.escalations} unit-level</>}</>} />
        <KpiTile tone={healthTone} icon={<ShieldCheck size={22} />} value={healthRag} label="Governance Health" sub={<>Program health score <b>{gs.programHealthScore}</b> / 100</>} />
        <KpiTile tone={ragCount('Red') ? 'red' : ragCount('Amber') ? 'amber' : 'green'} icon={<Building2 size={22} />} value={<>{ragCount('Green')} <span className="text-[16px] text-ink-500 font-semibold">of {unitNames.length}</span></>} label="Business Units Green" sub={<><span className="text-amber-600">{ragCount('Amber')} Amber</span> · <span className="text-red-600">{ragCount('Red')} Red</span></>} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-4" />

      {/* ============================ OVERVIEW ============================ */}
      {tab === 'Governance Overview' && (
        <div className="space-y-4">
          <UnitOverview d={unitData} unit={unit} setUnit={setUnit} buRaciC={buRaciC} open={{ decision: setDecisionEdit, cr: setCrEdit, action: setActionEdit, event: setEventEdit, stakeholder: setStEdit, control: setControlEdit, risks: () => nav('/risks'), transition: () => nav('/transition') }} />
          <div className="flex items-center gap-2 pt-1"><span className="text-[13px] font-semibold text-ink-900">Program-level governance</span><span className="text-[12px] text-ink-500">· {unitScope}</span></div>
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

          <div className="grid grid-cols-[1.5fr_1fr_0.95fr] gap-4">
            <Card title="Open Decisions" subtitle={`${openDecisions.length} pending · ${overdueDecisions.length} overdue`} action={<ViewAll onClick={() => setTab('Decision Log')} />}>
              <Table<Decision> compact rows={[...openDecisions].sort((a, b) => a.requiredBy.localeCompare(b.requiredBy)).slice(0, 6)} onRowClick={(d) => setDecisionEdit(d)} columns={[
                { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
                { key: 'title', header: 'Decision', render: (d) => <div><div className="truncate max-w-[135px] font-medium" title={d.title}>{d.title}</div><div className="text-[11px] text-ink-500 truncate max-w-[135px]">{d.decisionOwner}</div></div> },
                { key: 'businessUnit', header: 'Unit', render: (d) => <UnitChip unit={d.businessUnit} onSelect={setUnit} short /> },
                { key: 'requiredBy', header: 'Required', className: 'whitespace-nowrap', render: (d) => <span className={d.requiredBy < TODAY ? 'text-red-600 font-medium' : ''}>{fmtDate(d.requiredBy)}</span> },
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
              <div className="flex justify-between text-[12px] text-ink-500 mt-1"><span>{pendingCrs.length} pending</span><span>{signedMoney(pendingCrImpact, money)} cost impact</span><span>{pendingCrs.reduce((s, c) => s + Math.max(0, c.scheduleImpactDays), 0)} days schedule</span></div>
            </Card>
            <Card title="Escalations" subtitle={`${awaiting.length} awaiting steering committee decision`} action={<ViewAll onClick={() => nav('/risks')} />}>
              <div className="space-y-2">
                {escalations.map((r) => (
                  <div key={r.id} className="flex items-start gap-2.5 text-[12.5px] cursor-pointer hover:bg-surface rounded-md p-1" onClick={() => nav('/risks')}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${r.level === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}><Flag size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink-900 truncate">{r.code} · {r.shortTitle ?? r.title}</div>
                      <div className="flex items-center gap-2 text-[11.5px] text-ink-500">{r.owner} · due {fmtDate(r.dueDate)} <UnitChip unit={raidUnitName(r, govLinksC.items, txLinks)} onSelect={setUnit} /></div>
                    </div>
                    <Badge value={r.escalationStatus ?? 'In Progress'} />
                  </div>
                ))}
                {escalations.length === 0 && <p className="text-[12.5px] text-ink-500 italic text-center py-4">No open escalations for {unitScope}.</p>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============================ STEERING COMMITTEE ============================ */}
      {tab === 'Steering Committee' && (
        <div className="space-y-4">
          <Card title="Steering Committee Meetings Register" subtitle={`${held} held · ${meetingsC.items.filter((m) => m.status === 'Scheduled').length} scheduled · ${meetingsC.items.filter((m) => m.minutesStatus === 'Circulated' || m.minutesStatus === 'Draft').length} minutes awaiting approval${isUnit(unit) ? ` · showing meetings with ${unit} on the agenda or in the decisions` : ''}`} action={<div className="flex items-center gap-2"><UnitFilter value={unit} units={unitNames} onChange={setUnit} /><button className="btn-primary" onClick={() => setMeetingEdit(newMeeting())}><Plus size={14} /> Add Meeting</button></div>}>
            <Table<SteeringMeeting> rows={[...meetingsC.items].filter((m) => matchUnit(unit, meetingUnits(m))).sort((a, b) => b.date.localeCompare(a.date))} onRowClick={setMeetingEdit} empty={`No meetings touching ${unitScope}.`} columns={[
              { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
              { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (m) => fmtDate(m.date) },
              { key: 'title', header: 'Meeting', render: (m) => <span className="font-medium block max-w-[170px] truncate" title={m.title}>{m.title}</span> },
              { key: 'agenda', header: 'Agenda', render: (m) => <span className="block max-w-[170px] truncate text-ink-700" title={m.agenda}>{m.agenda}</span> },
              { key: 'units', header: 'Business units', render: (m) => { const us = meetingUnits(m).filter((u) => u !== PROGRAM_WIDE); return <span className="block max-w-[170px]"><UnitChips units={us} onSelect={setUnit} max={2} short /></span> } },
              { key: 'decisionsTaken', header: 'Decisions Taken', render: (m) => <span className="block max-w-[180px] truncate" title={moneyText(m.decisionsTaken, money)}>{moneyText(m.decisionsTaken, money) || '—'}</span> },
              { key: 'actions', header: 'Actions', render: (m) => <span className="block max-w-[140px] truncate" title={m.actions}>{m.actions || '—'}</span> },
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
                  <ol className="list-decimal pl-5 space-y-1 text-ink-700">{agendaItems(nextMeeting).map((a, i) => <li key={i} className={clsx(isUnit(unit) && a.businessUnit !== unit && a.businessUnit !== PROGRAM_WIDE && 'opacity-50')}>{a.text} {a.businessUnit !== PROGRAM_WIDE && <UnitChip unit={a.businessUnit} onSelect={setUnit} />}</li>)}</ol>
                  <SectionTitle>Decisions required{isUnit(unit) ? ` – ${unit}` : ''}</SectionTitle>
                  <ul className="space-y-1">{openDecisions.filter((d) => d.forum === 'Steering Committee').map((d) => <li key={d.id} className="flex items-center gap-2"><Badge value={d.impact} /><UnitLink onClick={() => setDecisionEdit(d)} className="truncate">{d.code} {d.title}</UnitLink>{d.businessUnit !== PROGRAM_WIDE && <UnitChip unit={d.businessUnit} onSelect={setUnit} />}</li>)}</ul>
                  {openDecisions.filter((d) => d.forum === 'Steering Committee').length === 0 && <p className="text-ink-500 italic">No open steering decisions for {unitScope}.</p>}
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
          <DecisionsByUnit meetings={meetingsC.items} units={unitNames} unit={unit} setUnit={setUnit} money={money} onOpen={setMeetingEdit} />
        </div>
      )}

      {/* ============================ DECISION LOG ============================ */}
      {tab === 'Decision Log' && <DecisionLog decisions={decisions} onEdit={setDecisionEdit} onAdd={() => setDecisionEdit(newDecision())} onDecide={decide} uf={unitFilterProps} />}

      {/* ============================ CHANGE REQUESTS ============================ */}
      {tab === 'Change Requests' && <ChangeRequests crs={crs} pipeline={crPipeline} onEdit={setCrEdit} onAdd={() => setCrEdit(newCr())} onDecide={decideCr} uf={unitFilterProps} />}

      {/* ============================ RAID SUMMARY ============================ */}
      {tab === 'RAID Summary' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[12.5px] text-ink-500">RAID summary for <b className="text-ink-900">{unitScope}</b>{isUnit(unit) && ' · risks and issues are tagged to business units in the Input view'}</div>
            <UnitFilter value={unit} units={unitNames} onChange={setUnit} />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Risks', n: raidInUnit.filter((r) => r.type === 'Risk' && isOpen(r)).length, sub: `${raidInUnit.filter((r) => r.type === 'Risk' && isOpen(r) && r.level === 'Critical').length} Critical`, color: CHART_COLORS.red, to: () => nav('/risks') },
              { label: 'Issues', n: raidInUnit.filter((r) => r.type === 'Issue' && isOpen(r)).length, sub: `${raidInUnit.filter((r) => r.type === 'Issue' && isOpen(r) && r.level === 'High').length} High`, color: CHART_COLORS.blue, to: () => nav('/risks') },
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
              <Table<RaidItem> compact rows={raidInUnit.filter((r) => r.type === 'Risk' && isOpen(r)).sort((a, b) => b.impactScore - a.impactScore).slice(0, 6)} onRowClick={() => nav('/risks')} empty={`No open risks for ${unitScope}.`} columns={[
                { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' }, { key: 'title', header: 'Risk', render: (r) => <span className="block max-w-[170px] truncate" title={r.title}>{r.title}</span> },
                { key: 'unit', header: 'Unit', render: (r) => <UnitChip unit={raidUnitName(r, govLinksC.items, txLinks)} onSelect={setUnit} short /> },
                { key: 'level', header: 'Level', render: (r) => <Badge value={r.level} /> }, { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' }, { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
              ]} />
            </Card>
            <Card title="Top Issues" action={<ViewAll onClick={() => nav('/risks')} />}>
              <Table<RaidItem> compact rows={raidInUnit.filter((r) => r.type === 'Issue' && isOpen(r)).sort((a, b) => b.impactScore - a.impactScore).slice(0, 6)} onRowClick={() => nav('/risks')} empty={`No open issues for ${unitScope}.`} columns={[
                { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' }, { key: 'title', header: 'Issue', render: (r) => <span className="block max-w-[155px] truncate" title={r.title}>{r.title}</span> },
                { key: 'unit', header: 'Unit', render: (r) => <UnitChip unit={raidUnitName(r, govLinksC.items, txLinks)} onSelect={setUnit} short /> },
                { key: 'level', header: 'Level', render: (r) => <Badge value={r.level} /> }, { key: 'dueDate', header: 'Due', className: 'whitespace-nowrap', render: (r) => fmtDate(r.dueDate) }, { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
              ]} />
            </Card>
          </div>
          <Card title="Actions Register" subtitle={`${actions.filter((a) => a.status !== 'Completed').length} open · ${actions.filter((a) => a.status === 'Completed').length} completed · ${unitScope}`} action={<div className="flex items-center gap-2"><UnitFilter value={unit} units={unitNames} onChange={setUnit} /><button className="btn-primary" onClick={() => setActionEdit(newAction())}><Plus size={14} /> Add Action</button></div>}>
            <Table<ActionItem> rows={[...actions].sort((a, b) => (a.status === 'Completed' ? 1 : 0) - (b.status === 'Completed' ? 1 : 0) || a.due.localeCompare(b.due))} onRowClick={setActionEdit} empty={`No actions for ${unitScope}.`} columns={[
              { key: 'code', header: 'ID', className: 'text-ink-500' },
              { key: 'action', header: 'Action', render: (a) => <span className="font-medium">{a.action}</span> },
              { key: 'businessUnit', header: 'Business unit', render: (a) => <UnitChip unit={a.businessUnit} onSelect={setUnit} /> },
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
          <div className="grid grid-cols-[2.7fr_1fr] gap-4">
            <Card title="Stakeholder Register" subtitle={`${stakeholdersInUnit.length} stakeholders · ${stakeholdersInUnit.filter((s) => s.sentiment === 'Concerned').length} concerned · ${unitScope}`} action={<div className="flex items-center gap-2"><UnitFilter value={unit} units={unitNames} onChange={setUnit} /><button className="btn-primary" onClick={() => setStEdit(newStakeholder())}><Plus size={14} /> Add Stakeholder</button></div>}>
              <Table<Stakeholder> compact rows={stakeholdersInUnit} onRowClick={setStEdit} empty={`No stakeholders for ${unitScope}.`} columns={[
                { key: 'name', header: 'Stakeholder', render: (s) => <div><div className="font-medium whitespace-nowrap max-w-[180px] truncate" title={s.name}>{s.name}</div><div className="text-[11.5px] text-ink-500 max-w-[180px] truncate" title={`${s.role} · ${s.organization}`}>{s.role} · {s.organization}</div></div> },
                { key: 'businessUnits', header: 'Business units', render: (s) => <span className="block max-w-[150px]"><UnitChips units={s.businessUnits} onSelect={setUnit} max={2} short /></span> },
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
                  const list = stakeholdersInUnit.filter((s) => (q.inf === 'High' ? s.influence === 'High' : s.influence !== 'High') && (q.int === 'High' ? s.interest === 'High' : s.interest !== 'High'))
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
                {(['Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'As needed'] as const).map((f) => <Stat key={f} label={`${f} engagement`} value={stakeholdersInUnit.filter((s) => s.engagement === f).length} />)}
              </div>
            </Card>
          </div>
          <BuRaciMatrix raciC={buRaciC} units={unitNames} highlight={isUnit(unit) ? unit : undefined} onSelectUnit={setUnit} />
          <RaciMatrix raciC={raciC} />
        </div>
      )}

      {/* ============================ GOVERNANCE CALENDAR ============================ */}
      {tab === 'Governance Calendar' && <GovernanceCalendar events={eventsC.items.filter((e) => matchUnit(unit, e.businessUnit))} onEdit={setEventEdit} onAdd={() => setEventEdit(newEvent())} uf={unitFilterProps} profiles={buGovC.items} />}

      {/* ============================ POLICIES & CONTROLS ============================ */}
      {tab === 'Policies & Controls' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_270px] gap-4">
            <Card title="Program Controls" subtitle={`WBS 1.3 Governance and controls · 13 Stakeholder Management · ${unitScope}${isUnit(unit) ? ' (unit-specific and program-wide controls)' : ''}`} action={<div className="flex items-center gap-2"><UnitFilter value={unit} units={unitNames} onChange={setUnit} /><button className="btn-primary" onClick={() => setControlEdit(newControl())}><Plus size={14} /> Add Control</button></div>}>
              <Table<Control> compact rows={controlsInUnit} onRowClick={setControlEdit} empty={`No controls for ${unitScope}.`} columns={[
                { key: 'wbs', header: 'WBS', className: 'text-ink-500 whitespace-nowrap' },
                { key: 'control', header: 'Control', render: (c) => <div><div className="font-medium max-w-[260px] truncate" title={c.control}>{c.control}</div><div className="text-[11.5px] text-ink-500 max-w-[260px] truncate" title={moneyText(c.description, money)}>{moneyText(c.description, money)}</div></div> },
                { key: 'businessUnits', header: 'Applies to', render: (c) => <span className="block max-w-[150px]"><UnitChips units={c.businessUnits} onSelect={setUnit} short /></span> },
                { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
                { key: 'lastReviewed', header: 'Last Reviewed', className: 'whitespace-nowrap', render: (c) => c.lastReviewed ? fmtDate(c.lastReviewed) : '—' },
                { key: 'evidence', header: 'Evidence', render: (c) => <span className="block max-w-[140px] truncate" title={c.evidence}>{c.evidence}</span> },
                { key: 'status', header: 'Status', render: (c) => <Badge value={c.status === 'Needs Review' ? 'At Risk' : c.status === 'Planned' ? 'Not Started' : c.status} className={c.status === 'Needs Review' ? '' : ''} /> },
              ]} />
            </Card>
            <Card title="Control Status">
              <Donut size={150} data={[
                { name: 'Active', value: controlsInUnit.filter((c) => c.status === 'Active').length, color: CHART_COLORS.green },
                { name: 'In Progress', value: controlsInUnit.filter((c) => c.status === 'In Progress').length, color: CHART_COLORS.blueLight },
                { name: 'Needs Review', value: controlsInUnit.filter((c) => c.status === 'Needs Review').length, color: CHART_COLORS.amber },
                { name: 'Planned', value: controlsInUnit.filter((c) => c.status === 'Planned').length, color: CHART_COLORS.gray },
              ]} center={<><div className="text-[24px] font-bold text-ink-900 leading-none">{controlsInUnit.length}</div><div className="text-[11px] text-ink-500 mt-1">Controls</div></>} />
              <div className="mt-3 space-y-1">
                {[['Active', CHART_COLORS.green], ['In Progress', CHART_COLORS.blueLight], ['Needs Review', CHART_COLORS.amber], ['Planned', CHART_COLORS.gray]].map(([l, c]) => (
                  <div key={l} className="flex items-center justify-between text-[12.5px]"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}</span><b>{controlsInUnit.filter((x) => x.status === l).length}</b></div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-line text-[12px] text-ink-500">By business unit: {unitNames.map((n) => `${n.replace('R&D – ', 'R&D ').replace(' Practice', '').replace(' Shared Services', ' SS')} ${controlsC.items.filter((c) => c.businessUnits.includes(n)).length}`).join(' · ')} · program-wide {controlsC.items.filter((c) => !c.businessUnits.length).length}</div>
              <div className="mt-3 pt-3 border-t border-line text-[12px] text-ink-500">Delegation of authority: Workstream Lead &lt; {money.fmtLakh(5)} · Program Director &lt; {money.fmtLakh(25)} · Steering Committee above {money.fmtLakh(25)} or &gt; 10 days schedule impact.</div>
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

      </>}

      {/* ============================ MODALS (both views) ============================ */}
      {structEdit && <StructureModal value={gs} onClose={() => setStructEdit(false)} onSave={(v) => { settingsC.update(v); setStructEdit(false) }} />}
      {meetingEdit && <MeetingModal key={meetingEdit.id} value={meetingEdit} units={unitNames} isNew={!meetingsC.items.some((m) => m.id === meetingEdit.id)} onClose={() => setMeetingEdit(null)} onSave={(v) => { meetingsC.update(v); setMeetingEdit(null) }} onDelete={() => { meetingsC.remove(meetingEdit.id); setMeetingEdit(null) }} />}
      {decisionEdit && <DecisionModal key={decisionEdit.id} value={decisionEdit} units={unitNames} projects={projects} isNew={!decisionsC.items.some((d) => d.id === decisionEdit.id)} onClose={() => setDecisionEdit(null)} onSave={(v) => { decisionsC.update(v); setDecisionEdit(null) }} onDelete={() => { decisionsC.remove(decisionEdit.id); setDecisionEdit(null) }} />}
      {crEdit && <CrModal key={crEdit.id} value={crEdit} units={unitNames} projects={projects} isNew={!crC.items.some((c) => c.id === crEdit.id)} onClose={() => setCrEdit(null)} onSave={(v) => { crC.update(v); setCrEdit(null) }} onDelete={() => { crC.remove(crEdit.id); setCrEdit(null) }} />}
      {actionEdit && <ActionModal key={actionEdit.id} value={actionEdit} units={unitNames} projects={projects} isNew={!actionsC.items.some((a) => a.id === actionEdit.id)} meetings={meetingsC.items} onClose={() => setActionEdit(null)} onSave={(v) => { actionsC.update(v); setActionEdit(null) }} onDelete={() => { actionsC.remove(actionEdit.id); setActionEdit(null) }} />}
      {stEdit && <StakeholderModal key={stEdit.id} value={stEdit} units={unitNames} isNew={!stakeholdersC.items.some((s) => s.id === stEdit.id)} onClose={() => setStEdit(null)} onSave={(v) => { stakeholdersC.update(v); setStEdit(null) }} onDelete={() => { stakeholdersC.remove(stEdit.id); setStEdit(null) }} />}
      {eventEdit && <EventModal key={eventEdit.id} value={eventEdit} units={unitNames} isNew={!eventsC.items.some((e) => e.id === eventEdit.id)} onClose={() => setEventEdit(null)} onSave={(v) => { eventsC.update(v); setEventEdit(null) }} onDelete={() => { eventsC.remove(eventEdit.id); setEventEdit(null) }} />}
      {controlEdit && <ControlModal key={controlEdit.id} value={controlEdit} units={unitNames} isNew={!controlsC.items.some((c) => c.id === controlEdit.id)} onClose={() => setControlEdit(null)} onSave={(v) => { controlsC.update(v); setControlEdit(null) }} onDelete={() => { controlsC.remove(controlEdit.id); setControlEdit(null) }} />}
      {ragEdit && <RagModal key={ragEdit.id} value={ragEdit} onClose={() => setRagEdit(null)} onSave={(v) => { ragC.update(v); setRagEdit(null) }} />}
    </div>
  )
}

/** Shared business-unit filter state handed to the tab components. */
type UF = { unit: string; units: string[]; setUnit: (u: string) => void }
const scopeLabel = (unit: string) => (isUnit(unit) ? unit : unit === PROGRAM_WIDE ? 'Program-wide items' : 'all business units')

/** Steering Committee › decisions taken, grouped by business unit (from the per-item tags on each meeting). */
function DecisionsByUnit({ meetings, units, unit, setUnit, money, onOpen }: UF & { meetings: SteeringMeeting[]; money: Money; onOpen: (m: SteeringMeeting) => void }) {
  const done = [...meetings].filter((m) => m.status === 'Completed').sort((a, b) => b.date.localeCompare(a.date))
  const all = done.flatMap((m) => decisionItems(m).map((it) => ({ ...it, meeting: m })))
  const groups = [PROGRAM_WIDE, ...units].map((u) => ({ unit: u, items: all.filter((x) => x.businessUnit === u) }))
  const shown = isUnit(unit) ? all.filter((x) => x.businessUnit === unit) : unit === PROGRAM_WIDE ? all.filter((x) => x.businessUnit === PROGRAM_WIDE) : all.filter((x) => x.businessUnit !== PROGRAM_WIDE)
  return (
    <div className="grid grid-cols-[300px_1fr] gap-4">
      <Card title="Decisions taken by business unit" subtitle={`${all.length} decisions across ${done.length} meetings`}>
        <div className="space-y-1">
          {groups.map((g) => (
            <button key={g.unit} onClick={() => setUnit(g.unit === unit ? UNIT_ALL : g.unit)} className={clsx('w-full flex items-center gap-2 text-[12.5px] rounded-md px-2 py-1 cursor-pointer text-left', g.unit === unit ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface')}>
              <span className="flex-1 min-w-0 truncate">{g.unit}</span>
              <span className="w-[70px] shrink-0"><Progress value={all.length ? (g.items.length / all.length) * 100 : 0} color={g.unit === PROGRAM_WIDE ? CHART_COLORS.gray : CHART_COLORS.violet} /></span>
              <b className="w-5 text-right">{g.items.length}</b>
            </button>
          ))}
        </div>
      </Card>
      <Card title={isUnit(unit) ? `Decisions taken – ${unit}` : unit === PROGRAM_WIDE ? 'Program-wide decisions taken' : 'Business-unit decisions taken'} subtitle={`${shown.length} decisions · click a row to open the meeting`}>
        {shown.length ? (
          <table className="w-full border-separate border-spacing-0 tbl">
            <thead><tr><th className="th">Meeting</th><th className="th">Date</th><th className="th">Business unit</th><th className="th">Decision</th></tr></thead>
            <tbody>
              {shown.map((x, i) => (
                <tr key={i} className="cursor-pointer hover:bg-brand-50/60" onClick={() => onOpen(x.meeting)}>
                  <td className="td py-1.5 text-ink-500 whitespace-nowrap">{x.meeting.code}</td>
                  <td className="td py-1.5 whitespace-nowrap">{fmtDate(x.meeting.date)}</td>
                  <td className="td py-1.5"><UnitChip unit={x.businessUnit} onSelect={setUnit} /></td>
                  <td className="td py-1.5">{moneyText(x.text, money)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-[12.5px] text-ink-500 italic text-center py-6">No decisions tagged to {scopeLabel(unit)} yet. Tag decision items in the meeting form.</p>}
      </Card>
    </div>
  )
}

function nextRaci(v: RaciValue): RaciValue { return v === 'R' ? 'A' : v === 'A' ? 'C' : v === 'C' ? 'I' : v === 'I' ? '' : 'R' }
const RACI_LEGEND = [{ label: 'R Responsible', color: CHART_COLORS.blue }, { label: 'A Accountable', color: CHART_COLORS.red }, { label: 'C Consulted', color: CHART_COLORS.amber }, { label: 'I Informed', color: CHART_COLORS.gray }]

function RaciMatrix({ raciC, editable }: { raciC: ReturnType<typeof useCollection<RaciRow>>; editable?: boolean }) {
  const add = () => { const used = raciC.items.map((r) => r.workstream); const ws = WORKSTREAMS.find((w) => !used.includes(w)) ?? WORKSTREAMS[0]; raciC.add({ id: uid('raci'), workstream: ws, cells: Object.fromEntries(RACI_ROLES.map((r) => [r, ''])) }) }
  return (
    <Card title="RACI Matrix – Workstreams × Key Roles" subtitle="Click a cell to cycle R → A → C → I → blank" headerRight={<Legend items={RACI_LEGEND} />} action={editable ? <AddBtn label="Add row" onClick={add} /> : undefined}>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full border-separate border-spacing-0 tbl">
          <thead><tr><th className="th">Workstream</th>{RACI_ROLES.map((r) => <th key={r} className="th text-center">{r}</th>)}{editable && <th className="th" />}</tr></thead>
          <tbody>
            {raciC.items.map((row) => (
              <tr key={row.id}>
                <td className="td font-medium">{editable ? <SelectCell value={row.workstream} options={WORKSTREAMS} className="font-medium min-w-[200px]" onChange={(v) => raciC.update({ ...row, workstream: v as Workstream })} /> : row.workstream}</td>
                {RACI_ROLES.map((r) => {
                  const v = row.cells[r] ?? ''
                  const cls = v === 'R' ? 'bg-blue-50 text-brand-600' : v === 'A' ? 'bg-red-50 text-red-600' : v === 'C' ? 'bg-amber-50 text-amber-700' : v === 'I' ? 'bg-slate-100 text-slate-600' : 'bg-white text-ink-400 border border-dashed border-line'
                  return (
                    <td key={r} className="td text-center">
                      <button className={`w-8 h-8 rounded-md text-[12.5px] font-bold cursor-pointer ${cls}`} onClick={() => raciC.update({ ...row, cells: { ...row.cells, [r]: nextRaci(v) } })}>{v || '–'}</button>
                    </td>
                  )
                })}
                {editable && <td className="td"><RemoveBtn name={`the ${row.workstream} RACI row`} onClick={() => raciC.remove(row.id)} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ====================================================================== */
/* Decision Log tab                                                        */
/* ====================================================================== */
function DecisionLog({ decisions, onEdit, onAdd, onDecide, uf }: { decisions: Decision[]; onEdit: (d: Decision) => void; onAdd: () => void; onDecide: (d: Decision, s: Decision['status']) => void; uf: UF }) {
  const [status, setStatus] = useState('All')
  const [q, setQ] = useState('')
  const byUnit = [PROGRAM_WIDE, ...uf.units].map((u) => ({ unit: u, open: decisions.filter((d) => d.businessUnit === u && d.status === 'Pending').length, total: decisions.filter((d) => d.businessUnit === u).length })).filter((x) => x.total)
  const rows = decisions.filter((d) => (status === 'All' || d.status === status) && (q === '' || `${d.code} ${d.title} ${d.decisionOwner}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1) || a.requiredBy.localeCompare(b.requiredBy))
  const byStatus = (['Pending', 'Approved', 'Rejected', 'Deferred'] as const).map((s) => ({ name: s, value: decisions.filter((d) => d.status === s).length, color: s === 'Pending' ? CHART_COLORS.amber : s === 'Approved' ? CHART_COLORS.green : s === 'Rejected' ? CHART_COLORS.red : CHART_COLORS.gray }))
  const avgDays = (() => { const done = decisions.filter((d) => d.decidedOn); return done.length ? Math.round(done.reduce((s, d) => s + Math.max(0, (new Date(d.decidedOn!).getTime() - new Date(d.requiredBy).getTime()) / 86400000), 0) / done.length) : 0 })()
  return (
    <div className="grid grid-cols-[1fr_240px] gap-4">
      <Card title="Decision Log" subtitle={`${decisions.length} decisions · ${decisions.filter((d) => d.status === 'Pending').length} pending · ${scopeLabel(uf.unit)}`} action={
        <div className="flex items-center gap-2">
          <input className="input !w-[180px] !py-1.5" placeholder="Search decisions…" value={q} onChange={(e) => setQ(e.target.value)} />
          <UnitFilter value={uf.unit} units={uf.units} onChange={uf.setUnit} />
          <select className="input !w-auto !py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>{['All', 'Pending', 'Approved', 'Rejected', 'Deferred'].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn-primary" onClick={onAdd}><Plus size={14} /> Add Decision</button>
        </div>}>
        <Table<Decision> rows={rows} onRowClick={onEdit} empty={`No decisions for ${scopeLabel(uf.unit)}.`} columns={[
          { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
          { key: 'title', header: 'Decision', render: (d) => <div><div className="font-medium max-w-[170px] truncate" title={d.title}>{d.title}</div><div className="text-[11.5px] text-ink-500 max-w-[170px] truncate" title={d.rationale}>Requested by {d.requestedBy} · {d.rationale}</div></div> },
          { key: 'businessUnit', header: 'Business unit', render: (d) => <UnitChip unit={d.businessUnit} onSelect={uf.setUnit} short /> },
          { key: 'workstream', header: 'Workstream', className: 'whitespace-nowrap', render: (d) => d.workstream === 'Program Management' ? 'PMO' : WORKSTREAM_META[d.workstream as Workstream]?.short ?? d.workstream },
          { key: 'decisionOwner', header: 'Owner', render: (d) => <span className="block max-w-[96px] truncate" title={d.decisionOwner}>{d.decisionOwner}</span> },
          { key: 'requiredBy', header: 'Required', className: 'whitespace-nowrap', render: (d) => <span className={d.status === 'Pending' && d.requiredBy < TODAY ? 'text-red-600 font-medium' : ''}>{fmtDate(d.requiredBy)}</span> },
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
        <Card title="By Business Unit" subtitle="pending / total · click to filter">
          {byUnit.map((x) => <button key={x.unit} onClick={() => uf.setUnit(x.unit === uf.unit ? UNIT_ALL : x.unit)} className={clsx('w-full flex items-center justify-between text-[12.5px] py-1 px-1 rounded-md cursor-pointer', x.unit === uf.unit ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface')}><span className="truncate">{x.unit}</span><span className="font-medium shrink-0"><span className={x.open ? 'text-amber-600' : ''}>{x.open}</span> / {x.total}</span></button>)}
          {byUnit.length === 0 && <p className="text-[12px] text-ink-500 italic">No decisions.</p>}
        </Card>
      </div>
    </div>
  )
}

/* ====================================================================== */
/* Change Requests tab                                                     */
/* ====================================================================== */
function ChangeRequests({ crs, pipeline, onEdit, onAdd, onDecide, uf }: { crs: ChangeRequest[]; pipeline: { type: string; Draft: number; 'In Review': number; Approved: number; Rejected: number }[]; onEdit: (c: ChangeRequest) => void; onAdd: () => void; onDecide: (c: ChangeRequest, s: ChangeRequest['status']) => void; uf: UF }) {
  const money = useMoney()
  const [status, setStatus] = useState('All')
  const byUnit = [PROGRAM_WIDE, ...uf.units].map((u) => { const l = crs.filter((c) => c.businessUnit === u); const p = l.filter((c) => c.status === 'Draft' || c.status === 'In Review'); return { unit: u, pending: p.length, total: l.length, cost: p.reduce((s, c) => s + c.costImpactCr, 0) } }).filter((x) => x.total)
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
            <div className="p-3 rounded-lg bg-surface"><div className="text-[11.5px] text-ink-500">Approved cost impact</div><div className="text-[20px] font-bold text-ink-900">{signedMoney(approvedCost, money)}</div><div className="text-[11px] text-ink-500">{approved.length} approved CRs</div></div>
            <div className="p-3 rounded-lg bg-surface"><div className="text-[11.5px] text-ink-500">Approved schedule impact</div><div className="text-[20px] font-bold text-ink-900">{approvedDays > 0 ? '+' : ''}{approvedDays} days</div><div className="text-[11px] text-ink-500">net vs baseline</div></div>
            <div className="p-3 rounded-lg bg-blue-50"><div className="text-[11.5px] text-ink-500">In review – cost</div><div className="text-[20px] font-bold text-brand-600">{signedMoney(inReview.reduce((s, c) => s + c.costImpactCr, 0), money)}</div><div className="text-[11px] text-ink-500">{inReview.length} CRs awaiting approval</div></div>
            <div className="p-3 rounded-lg bg-blue-50"><div className="text-[11.5px] text-ink-500">In review – schedule</div><div className="text-[20px] font-bold text-brand-600">{inReview.reduce((s, c) => s + c.scheduleImpactDays, 0)} days</div><div className="text-[11px] text-ink-500">gross impact if approved</div></div>
          </div>
          <div className="mt-3 pt-2 border-t border-line">
            <div className="text-[11.5px] text-ink-500 mb-1">Pending by business unit (count · cost) · click to filter</div>
            <div className="flex flex-wrap gap-1.5">{byUnit.map((x) => <button key={x.unit} onClick={() => uf.setUnit(x.unit === uf.unit ? UNIT_ALL : x.unit)} className={clsx('rounded-md px-2 py-0.5 text-[11px] font-medium border cursor-pointer', x.unit === uf.unit ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-700 border-line hover:bg-surface')}>{x.unit} <b>{x.pending}</b>{x.pending ? ` · ${signedMoney(x.cost, money)}` : ''}</button>)}</div>
          </div>
        </Card>
      </div>
      <Card title="Change Request Register" subtitle={`Scope, budget and timeline changes (WBS 14.3) · ${scopeLabel(uf.unit)}`} action={
        <div className="flex items-center gap-2">
          <UnitFilter value={uf.unit} units={uf.units} onChange={uf.setUnit} />
          <select className="input !w-auto !py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>{['All', 'Draft', 'In Review', 'Approved', 'Rejected'].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn-primary" onClick={onAdd}><Plus size={14} /> Raise Change Request</button>
        </div>}>
        <Table<ChangeRequest> rows={rows} onRowClick={onEdit} empty={`No change requests for ${scopeLabel(uf.unit)}.`} columns={[
          { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
          { key: 'title', header: 'Title', render: (c) => <div><div className="font-medium max-w-[225px] truncate" title={c.title}>{c.title}</div><div className="text-[11.5px] text-ink-500 max-w-[225px] truncate" title={c.description}>{c.description}</div></div> },
          { key: 'businessUnit', header: 'Business unit', render: (c) => <UnitChip unit={c.businessUnit} onSelect={uf.setUnit} short /> },
          { key: 'type', header: 'Type', render: (c) => <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-medium ${c.type === 'Scope' ? 'bg-violet-50 text-violet-700' : c.type === 'Budget' ? 'bg-teal-50 text-teal-700' : 'bg-orange-50 text-orange-700'}`}>{c.type}</span> },
          { key: 'workstream', header: 'Workstream', render: (c) => c.workstream === 'Program Management' ? 'PMO' : WORKSTREAM_META[c.workstream as Workstream]?.short ?? c.workstream },
          { key: 'raisedBy', header: 'Raised By' },
          { key: 'costImpactCr', header: 'Cost Impact', render: (c) => <span className={c.costImpactCr > 0 ? 'text-red-600' : c.costImpactCr < 0 ? 'text-green-600' : ''}>{signedMoney(c.costImpactCr, money)}</span> },
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
const TYPE_COLOR: Record<GovEvent['type'], string> = { 'Steering Committee': CHART_COLORS.blue, 'Integrated Program Review': CHART_COLORS.teal, 'Workstream Status': CHART_COLORS.blueFaint, 'Business Unit Review': CHART_COLORS.orange, 'Quarterly Business Review': CHART_COLORS.violet, 'Go/No-Go': CHART_COLORS.red, 'Audit / Compliance': CHART_COLORS.amber, Other: CHART_COLORS.gray }
function GovernanceCalendar({ events, onEdit, onAdd, uf, profiles }: { events: GovEvent[]; onEdit: (e: GovEvent) => void; onAdd: () => void; uf: UF; profiles: BuGovernance[] }) {
  const [typeFilter, setTypeFilter] = useState('All types')
  const upcoming = events.filter((e) => e.date >= TODAY && (typeFilter === 'All types' || e.type === typeFilter)).sort((a, b) => a.date.localeCompare(b.date))
  const byMonth = upcoming.reduce<Record<string, GovEvent[]>>((acc, e) => { const k = new Date(e.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); (acc[k] ??= []).push(e); return acc }, {})
  const nextOf = (t: GovEvent['type']) => events.filter((e) => e.type === t && e.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))[0]
  const nextUnitReview = (u: string) => events.filter((e) => e.businessUnit === u && e.type === 'Business Unit Review' && e.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))[0]
  const unitRows = (isUnit(uf.unit) ? [uf.unit] : uf.units).map((u) => ({ unit: u, p: profiles.find((x) => x.businessUnit === u), next: nextUnitReview(u) }))
  return (
    <div className="grid grid-cols-[340px_1fr] gap-4">
      <div className="space-y-4">
        {!isUnit(uf.unit) && <Card title="Recurring Cadences" subtitle="Program-wide">
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
        </Card>}
        {uf.unit !== PROGRAM_WIDE && <Card title="Business unit reviews" subtitle="Cadence and next review per unit · click to filter">
          <div className="space-y-2">
            {unitRows.map((r) => (
              <button key={r.unit} onClick={() => uf.setUnit(r.unit === uf.unit ? UNIT_ALL : r.unit)} className={clsx('w-full flex gap-3 text-[12.5px] text-left rounded-md px-1.5 py-1 cursor-pointer', r.unit === uf.unit ? 'bg-brand-50' : 'hover:bg-surface')}>
                <span className="w-1.5 rounded-full shrink-0" style={{ background: TYPE_COLOR['Business Unit Review'] }} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink-900 truncate">{r.unit}</span>
                  <span className="block text-[11.5px] text-ink-500 truncate">{r.p ? `${r.p.cadence} · ${r.p.reviewForum} · sponsor ${r.p.sponsor}` : 'no governance profile'}</span>
                  <span className="block text-[11.5px] mt-0.5">Next: <b className="text-brand-600">{r.next ? fmtDate(r.next.date) : r.p?.nextReview ? fmtDate(r.p.nextReview) : 'not scheduled'}</b></span>
                </span>
              </button>
            ))}
          </div>
        </Card>}
        <Card title="Events by Type (next 90 days)">
          {(Object.keys(TYPE_COLOR) as GovEvent['type'][]).map((t) => {
            const n = events.filter((e) => e.type === t && e.date >= TODAY && e.date <= '2027-01-18').length
            return n ? <div key={t} className="flex items-center justify-between text-[12.5px] py-1"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLOR[t] }} />{t}</span><b>{n}</b></div> : null
          })}
        </Card>
      </div>
      <Card title="Governance Calendar" subtitle={`${upcoming.length} upcoming events · ${scopeLabel(uf.unit)}`} action={
        <div className="flex items-center gap-2">
          <UnitFilter value={uf.unit} units={uf.units} onChange={uf.setUnit} />
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
                      {e.businessUnit !== PROGRAM_WIDE && <UnitChip unit={e.businessUnit} onSelect={uf.setUnit} className="shrink-0" />}
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

/** Agenda / decisions-taken editor: one row per item with its business unit tag (stored as the ;-joined text + index-aligned tags). */
function MeetingItemsEditor({ label, items, units, onChange, placeholder }: { label: string; items: MeetingItem[]; units: string[]; onChange: (items: MeetingItem[]) => void; placeholder: string }) {
  const set = (i: number, patch: Partial<MeetingItem>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  return (
    <div className="col-span-3">
      <div className="flex items-center justify-between mb-1"><label className="label !mb-0">{label}</label><button type="button" className="link inline-flex items-center gap-1" onClick={() => onChange([...items, { text: '', businessUnit: PROGRAM_WIDE }])}><Plus size={12} /> Add item</button></div>
      <div className="space-y-1">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-[11px] text-ink-500 w-4 text-right">{i + 1}</span>
            <Input value={it.text} placeholder={placeholder} className="!py-1.5 flex-1" onChange={(e) => set(i, { text: e.target.value })} />
            <UnitSelect value={it.businessUnit} units={units} className="!py-1.5 !w-[190px] text-[12px]" onChange={(v) => set(i, { businessUnit: v })} />
            <button type="button" title="Remove item" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-[12px] text-ink-500 italic">No items yet.</p>}
      </div>
    </div>
  )
}
const joinItems = (items: MeetingItem[]) => ({ text: items.map((x) => x.text.replace(/;/g, ',').trim()).join('; '), units: items.map((x) => x.businessUnit) })

function MeetingModal({ value, units, isNew, onClose, onSave, onDelete }: { value: SteeringMeeting; units: string[]; isNew: boolean; onClose: () => void; onSave: (v: SteeringMeeting) => void; onDelete: () => void }) {
  const { f, setF, s } = useForm(value)
  const [agenda, setAgenda] = useState<MeetingItem[]>(() => agendaItems(value))
  const [decisions, setDecisions] = useState<MeetingItem[]>(() => decisionItems(value))
  const save = () => { const a = joinItems(agenda), d = joinItems(decisions); onSave({ ...f, agenda: a.text, agendaUnits: a.units, decisionsTaken: d.text, decisionUnits: d.units }) }
  const touched = Array.from(new Set([...agenda, ...decisions].map((x) => x.businessUnit).filter((u) => u !== PROGRAM_WIDE)))
  return (
    <Modal open width="max-w-3xl" title={isNew ? 'Add steering committee meeting' : `Edit ${f.code}`} onClose={onClose} footer={<ModalFooter isNew={isNew} onClose={onClose} onSave={save} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Meeting ID"><Input value={f.code} onChange={s('code')} /></Field>
        <Field label="Date"><Input type="date" value={f.date} onChange={s('date')} /></Field>
        <Field label="Status"><Select options={['Scheduled', 'Completed', 'Cancelled']} value={f.status} onChange={s('status')} /></Field>
        <Field label="Title" className="col-span-2"><Input value={f.title} onChange={s('title')} /></Field>
        <Field label="Minutes status"><Select options={['Scheduled', 'Draft', 'Circulated', 'Approved']} value={f.minutesStatus} onChange={s('minutesStatus')} /></Field>
        <MeetingItemsEditor label="Agenda items (tag each with a business unit or Program-wide)" items={agenda} units={units} onChange={setAgenda} placeholder="Agenda item" />
        <Field label="Attendees" className="col-span-3"><Input value={f.attendees} onChange={s('attendees')} /></Field>
        <MeetingItemsEditor label="Decisions taken" items={decisions} units={units} onChange={setDecisions} placeholder="Decision taken" />
        <Field label="Actions agreed (separate with ;)" className="col-span-3"><TextArea value={f.actions} onChange={(e) => setF({ ...f, actions: e.target.value })} /></Field>
      </FormGrid>
      <div className="mt-3 text-[11.5px] text-ink-500">Business units touched by this meeting: {touched.length ? touched.join(', ') : 'none (Program-wide only)'}</div>
    </Modal>
  )
}

function DecisionModal({ value, units, projects, isNew, onClose, onSave, onDelete }: { value: Decision; units: string[]; projects: TransitionProject[]; isNew: boolean; onClose: () => void; onSave: (v: Decision) => void; onDelete: () => void }) {
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
        <Field label="Business unit"><UnitSelect value={f.businessUnit} units={units} onChange={(v) => setF({ ...f, businessUnit: v, projectId: v === f.businessUnit ? f.projectId : undefined })} /></Field>
        <Field label="Transition project (optional)"><ProjectSelect value={f.projectId} unit={f.businessUnit} projects={projects} onChange={(id) => setF({ ...f, projectId: id })} /></Field>
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

function CrModal({ value, units, projects, isNew, onClose, onSave, onDelete }: { value: ChangeRequest; units: string[]; projects: TransitionProject[]; isNew: boolean; onClose: () => void; onSave: (v: ChangeRequest) => void; onDelete: () => void }) {
  const money = useMoney()
  const { f, setF, s, n, c } = useForm(value, money)
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
        <Field label="Business unit"><UnitSelect value={f.businessUnit} units={units} onChange={(v) => setF({ ...f, businessUnit: v, projectId: v === f.businessUnit ? f.projectId : undefined })} /></Field>
        <Field label="Transition project (optional)"><ProjectSelect value={f.projectId} unit={f.businessUnit} projects={projects} onChange={(id) => setF({ ...f, projectId: id })} /></Field>
        <Field label="Workstream"><Select options={WS_OPTIONS} value={f.workstream} onChange={s('workstream')} /></Field>
        <Field label="Raised by"><Select options={OWNERS} value={f.raisedBy} onChange={s('raisedBy')} /></Field>
        <Field label="Description" className="col-span-3"><TextArea value={f.description} onChange={s('description')} /></Field>
      </FormGrid>
      <SectionTitle>Impact assessment</SectionTitle>
      <FormGrid cols={3}>
        <Field label={`Cost impact (${money.unitLabel}, negative = saving)`}><Input {...c('costImpactCr')} /></Field>
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

function ActionModal({ value, units, projects, isNew, meetings, onClose, onSave, onDelete }: { value: ActionItem; units: string[]; projects: TransitionProject[]; isNew: boolean; meetings: SteeringMeeting[]; onClose: () => void; onSave: (v: ActionItem) => void; onDelete: () => void }) {
  const { f, setF, s } = useForm(value)
  return (
    <Modal open title={isNew ? 'Add action' : `Edit ${f.code}`} onClose={onClose} footer={<ModalFooter isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Action ID"><Input value={f.code} onChange={s('code')} /></Field>
        <Field label="Action" className="col-span-2"><Input value={f.action} onChange={s('action')} /></Field>
        <Field label="Business unit"><UnitSelect value={f.businessUnit} units={units} onChange={(v) => setF({ ...f, businessUnit: v, projectId: v === f.businessUnit ? f.projectId : undefined })} /></Field>
        <Field label="Transition project (optional)" className="col-span-2"><ProjectSelect value={f.projectId} unit={f.businessUnit} projects={projects} onChange={(id) => setF({ ...f, projectId: id })} /></Field>
        <Field label="Owner"><Select options={[...OWNERS, 'L. Moreau', 'R. Banerjee']} value={f.owner} onChange={s('owner')} /></Field>
        <Field label="Due"><Input type="date" value={f.due} onChange={s('due')} /></Field>
        <Field label="Status"><Select options={['Open', 'In Progress', 'Completed', 'Overdue']} value={f.status} onChange={s('status')} /></Field>
        <Field label="Workstream"><Select options={WS_OPTIONS} value={f.workstream} onChange={s('workstream')} /></Field>
        <Field label="Source meeting" className="col-span-2"><Input list="gov-meetings" value={f.source} onChange={s('source')} /><datalist id="gov-meetings">{meetings.map((m) => <option key={m.id} value={m.code}>{m.title}</option>)}<option value="Weekly review">Weekly integrated program review</option></datalist></Field>
      </FormGrid>
    </Modal>
  )
}

function StakeholderModal({ value, units, isNew, onClose, onSave, onDelete }: { value: Stakeholder; units: string[]; isNew: boolean; onClose: () => void; onSave: (v: Stakeholder) => void; onDelete: () => void }) {
  const { f, setF, s } = useForm(value)
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
        <Field label="Business units represented / sponsored (none = program-wide)" className="col-span-3"><UnitToggles value={f.businessUnits ?? []} units={units} onChange={(v) => setF({ ...f, businessUnits: v })} /></Field>
      </FormGrid>
    </Modal>
  )
}

function EventModal({ value, units, isNew, onClose, onSave, onDelete }: { value: GovEvent; units: string[]; isNew: boolean; onClose: () => void; onSave: (v: GovEvent) => void; onDelete: () => void }) {
  const { f, setF, s } = useForm(value)
  return (
    <Modal open title={isNew ? 'Add governance event' : 'Edit event'} onClose={onClose} footer={<ModalFooter isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={2}>
        <Field label="Title" className="col-span-2"><Input value={f.title} onChange={s('title')} /></Field>
        <Field label="Type"><Select options={Object.keys(TYPE_COLOR)} value={f.type} onChange={s('type')} /></Field>
        <Field label="Business unit"><UnitSelect value={f.businessUnit} units={units} onChange={(v) => setF({ ...f, businessUnit: v })} /></Field>
        <Field label="Date"><Input type="date" value={f.date} onChange={s('date')} /></Field>
        <Field label="Cadence"><Select options={['Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'One-off']} value={f.cadence} onChange={s('cadence')} /></Field>
        <Field label="Owner"><Input value={f.owner} onChange={s('owner')} /></Field>
        <Field label="Attendees"><Input value={f.attendees} onChange={s('attendees')} /></Field>
      </FormGrid>
    </Modal>
  )
}

function ControlModal({ value, units, isNew, onClose, onSave, onDelete }: { value: Control; units: string[]; isNew: boolean; onClose: () => void; onSave: (v: Control) => void; onDelete: () => void }) {
  const { f, setF, s } = useForm(value)
  return (
    <Modal open title={isNew ? 'Add program control' : 'Edit control'} onClose={onClose} footer={<ModalFooter isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="WBS ref"><Input value={f.wbs} onChange={s('wbs')} /></Field>
        <Field label="Control" className="col-span-2"><Input value={f.control} onChange={s('control')} /></Field>
        <Field label="Description" className="col-span-3"><TextArea value={f.description} onChange={s('description')} /></Field>
        <Field label="Applies to business units (none = program-wide)" className="col-span-3"><UnitToggles value={f.businessUnits ?? []} units={units} onChange={(v) => setF({ ...f, businessUnits: v })} /></Field>
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

/* ====================================================================== */
/* Input view                                                              */
/* ====================================================================== */
type Coll<T extends { id: string }> = ReturnType<typeof useCollection<T>>
interface GovInputProps {
  gs: GovernanceSettings; settingsC: Coll<GovernanceSettings>
  meetingsC: Coll<SteeringMeeting>; packC: Coll<PackItem>; decisionsC: Coll<Decision>; crC: Coll<ChangeRequest>; actionsC: Coll<ActionItem>
  stakeholdersC: Coll<Stakeholder>; raciC: Coll<RaciRow>; eventsC: Coll<GovEvent>; controlsC: Coll<Control>; ragC: Coll<RagCriterion>; wss: Coll<WorkstreamSummary>
  buGovC: Coll<BuGovernance>; buRaciC: Coll<BuRaciRow>; govLinksC: Coll<GovRaidLink>; unitData: UnitData; unitNames: string[]
  newMeeting: () => SteeringMeeting; newDecision: () => Decision; newCr: () => ChangeRequest; newAction: () => ActionItem; newStakeholder: () => Stakeholder; newEvent: () => GovEvent; newControl: () => Control
  openMeeting: (m: SteeringMeeting) => void; openDecision: (d: Decision) => void; openCr: (c: ChangeRequest) => void; openAction: (a: ActionItem) => void
  openStakeholder: (s: Stakeholder) => void; openEvent: (e: GovEvent) => void; openControl: (c: Control) => void; openRag: (r: RagCriterion) => void
}
const DECISION_STATUSES = ['Pending', 'Approved', 'Rejected', 'Deferred'] as const
const FORUMS = ['Steering Committee', 'Program Director', 'Workstream Lead'] as const
const IMPACTS = ['Critical', 'High', 'Medium', 'Low'] as const
const CR_STATUSES = ['Draft', 'In Review', 'Approved', 'Rejected'] as const
const ACTION_STATUSES = ['Open', 'In Progress', 'Completed', 'Overdue'] as const
const LEVELS3 = ['High', 'Medium', 'Low'] as const
const ENGAGEMENTS = ['Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'As needed'] as const
const ST_GROUPS = ['Global Executive', 'Global Functional', 'India Leadership', 'External'] as const
const SENTIMENTS = ['Supportive', 'Neutral', 'Concerned'] as const
const CADENCE_OPTS = ['Weekly', 'Monthly', 'Quarterly', 'One-off'] as const
const CONTROL_STATUSES = ['Active', 'In Progress', 'Planned', 'Needs Review'] as const
const PEOPLE = [...OWNERS, 'R. Banerjee', 'L. Moreau', 'T. Okafor', 'H. Patel', 'J. Whitfield', 'N. Krishnan'] as const

function GovernanceInput(p: GovInputProps) {
  return (
    <InputLayout title="Governance" subtitle="Maintain the governance structure, business unit governance, steering meetings, decisions, change requests, actions, stakeholders and controls that drive the governance dashboards."
      tabs={[
        { name: 'Governance structure', content: <StructureTab p={p} /> },
        { name: 'Business unit governance', content: <InputUnitTab d={p.unitData} profilesC={p.buGovC} settingsC={p.settingsC} buRaciC={p.buRaciC} linksC={p.govLinksC} />, hint: 'Sponsor, cadence and next review per business unit, the health thresholds, the business-unit RACI and which risks and issues belong to which unit.' },
        { name: 'Steering meetings', content: <MeetingsTab p={p} /> },
        { name: 'Decisions', content: <DecisionsTab p={p} /> },
        { name: 'Change requests', content: <CrTab p={p} /> },
        { name: 'Actions', content: <ActionsTab p={p} /> },
        { name: 'Stakeholders & RACI', content: <StakeholdersTab p={p} /> },
        { name: 'Calendar events', content: <EventsTab p={p} /> },
        { name: 'Controls & RAG criteria', content: <ControlsTab p={p} /> },
      ]} />
  )
}

function SaveBar({ dirty, saved, onSave, onDiscard }: { dirty: boolean; saved: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      {saved && !dirty && <span className="text-[12px] text-green-600 inline-flex items-center gap-1"><Check size={13} /> Saved</span>}
      <button className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed" disabled={!dirty} onClick={onDiscard}>Discard</button>
      <button className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={!dirty} onClick={onSave}><Save size={14} /> Save</button>
    </div>
  )
}

/* ---- Governance structure ---- */
function StructureTab({ p }: { p: GovInputProps }) {
  const { gs, settingsC, wss } = p
  const [f, setF] = useState<GovernanceSettings>(gs)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(gs)
  const save = () => { settingsC.update(f); setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const setMember = (i: number, v: string) => setF({ ...f, steeringMembers: f.steeringMembers.map((m, j) => (j === i ? v : m)) })
  const setWs = <K extends keyof WorkstreamSummary>(w: WorkstreamSummary, k: K, v: WorkstreamSummary[K]) => wss.update({ ...w, [k]: v })
  return (
    <div className="grid grid-cols-[1.1fr_1fr] gap-4">
      <div className="space-y-4">
        <Card title="Sponsors and program leadership" subtitle="Shown on the Governance Structure card and used as defaults across the registers.">
          <FormGrid cols={2}>
            <Field label="Global Executive Sponsor"><Input value={f.globalExecutiveSponsor} onChange={(e) => setF({ ...f, globalExecutiveSponsor: e.target.value })} /></Field>
            <Field label="India Program Sponsor"><Input value={f.indiaProgramSponsor} onChange={(e) => setF({ ...f, indiaProgramSponsor: e.target.value })} /></Field>
            <Field label="GCC Program Director"><Input value={f.programDirector} onChange={(e) => setF({ ...f, programDirector: e.target.value })} /></Field>
            <Field label="Program Manager"><Input value={f.programManager} onChange={(e) => setF({ ...f, programManager: e.target.value })} /></Field>
            <Field label="PMO Lead"><Input value={f.pmoLead} onChange={(e) => setF({ ...f, pmoLead: e.target.value })} /></Field>
            <Field label="Planned steering committees (year)"><Input type="number" min={0} value={f.plannedSteeringMeetings} onChange={(e) => setF({ ...f, plannedSteeringMeetings: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Program health score (0–100)"><Input type="number" min={0} max={100} value={f.programHealthScore} onChange={(e) => setF({ ...f, programHealthScore: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })} /></Field>
            <Field label="Governance health (derived)"><div className="pt-1.5"><Badge value={f.programHealthScore >= 80 ? 'Green' : f.programHealthScore >= 65 ? 'Amber' : 'Red'} /> <span className="text-[11.5px] text-ink-500 ml-1">≥ 80 Green · 65–79 Amber · &lt; 65 Red</span></div></Field>
          </FormGrid>
          <SaveBar dirty={dirty} saved={saved} onSave={save} onDiscard={() => setF(gs)} />
        </Card>
        <Card title="Steering Committee members" subtitle="Name and role, one per row." action={<AddBtn label="Add member" onClick={() => setF({ ...f, steeringMembers: [...f.steeringMembers, ''] })} />}>
          <div className="space-y-0.5">
            {f.steeringMembers.map((m, i) => (
              <div key={i} className="flex items-center gap-1 border-b border-slate-200">
                <span className="text-[11.5px] text-ink-500 w-6 text-right pr-1">{i + 1}</span>
                <input className={cellCls} value={m} placeholder="Name (role)" onChange={(e) => setMember(i, e.target.value)} />
                <RemoveBtn name={m || 'this member'} onClick={() => setF({ ...f, steeringMembers: f.steeringMembers.filter((_, j) => j !== i) })} />
              </div>
            ))}
            {f.steeringMembers.length === 0 && <p className="text-[12.5px] text-ink-500 italic text-center py-4">No members yet.</p>}
          </div>
          <SaveBar dirty={dirty} saved={saved} onSave={save} onDiscard={() => setF(gs)} />
        </Card>
      </div>
      <Card title="Workstream leads" subtitle="Lead, accountable owner and executive sponsor per workstream (shared with GCC Setup and Workstreams).">
        <Grid count={wss.items.length} minWidth={520} headers={['Workstream', 'Lead', 'Accountable owner', 'Executive sponsor']}>
          {wss.items.map((w) => (
            <Row key={w.id}>
              <Td><span className="px-1.5 text-[12.5px] font-medium whitespace-nowrap">{w.name}</span></Td>
              <Td><SelectCell value={w.lead} options={OWNERS} onChange={(v) => setWs(w, 'lead', v)} /></Td>
              <Td><SelectCell value={w.owner} options={OWNERS} onChange={(v) => setWs(w, 'owner', v)} /></Td>
              <Td min={160}><TextCell value={w.executiveSponsor} placeholder="Executive sponsor" onChange={(v) => setWs(w, 'executiveSponsor', v)} /></Td>
            </Row>
          ))}
        </Grid>
      </Card>
    </div>
  )
}

/* ---- Steering meetings + pack checklist ---- */
function MeetingsTab({ p }: { p: GovInputProps }) {
  const { meetingsC, packC, newMeeting, openMeeting } = p
  const rows = [...meetingsC.items].sort((a, b) => b.date.localeCompare(a.date))
  const set = <K extends keyof SteeringMeeting>(m: SteeringMeeting, k: K, v: SteeringMeeting[K]) => meetingsC.update({ ...m, [k]: v })
  const setP = <K extends keyof PackItem>(i: PackItem, k: K, v: PackItem[K]) => packC.update({ ...i, [k]: v })
  return (
    <div className="space-y-4">
      <Card title="Steering committee meetings" subtitle={`${meetingsC.items.filter((m) => m.status === 'Completed').length} held · ${meetingsC.items.filter((m) => m.status === 'Scheduled').length} scheduled. Agenda, decisions and actions are ;-separated lists; open the form to edit them in full and to tag each agenda item and decision with a business unit.`} action={<AddBtn label="Add meeting" onClick={() => meetingsC.add(newMeeting())} />}>
        <Grid count={rows.length} minWidth={1400} headers={['ID', 'Date', 'Meeting', 'Status', 'Minutes', 'Agenda', 'Business units', 'Attendees', 'Decisions taken', 'Actions agreed', '']}>
          {rows.map((m) => (
            <Row key={m.id} muted={m.status === 'Cancelled'}>
              <Td><TextCell value={m.code} className="w-[64px] text-ink-500" onChange={(v) => set(m, 'code', v)} /></Td>
              <Td><DateCell value={m.date} onChange={(v) => set(m, 'date', v)} /></Td>
              <Td min={240}><TextCell value={m.title} placeholder="Meeting title" className="font-medium" onChange={(v) => set(m, 'title', v)} /></Td>
              <Td><SelectCell value={m.status} options={['Scheduled', 'Completed', 'Cancelled']} onChange={(v) => set(m, 'status', v)} /></Td>
              <Td><SelectCell value={m.minutesStatus} options={['Scheduled', 'Draft', 'Circulated', 'Approved']} onChange={(v) => set(m, 'minutesStatus', v)} /></Td>
              <Td min={200}><TextCell value={m.agenda} placeholder="Item; item; item" onChange={(v) => set(m, 'agenda', v)} /></Td>
              <Td min={150}><button type="button" title="Tag agenda and decision items by business unit in the form" className="px-1 py-0.5 text-left cursor-pointer" onClick={() => openMeeting(m)}><UnitChips units={meetingUnits(m).filter((u) => u !== PROGRAM_WIDE)} /></button></Td>
              <Td min={150}><TextCell value={m.attendees} placeholder="Attendees" onChange={(v) => set(m, 'attendees', v)} /></Td>
              <Td min={200}><TextCell value={m.decisionsTaken} placeholder="Decision; decision" onChange={(v) => set(m, 'decisionsTaken', v)} /></Td>
              <Td min={180}><TextCell value={m.actions} placeholder="Action; action" onChange={(v) => set(m, 'actions', v)} /></Td>
              <Td sticky><EditBtn onClick={() => openMeeting(m)} /><RemoveBtn name={m.code} onClick={() => meetingsC.remove(m.id)} /></Td>
            </Row>
          ))}
        </Grid>
      </Card>
      <Card title="Next meeting pack checklist" subtitle={`${packC.items.filter((i) => i.done).length} of ${packC.items.length} items ready. Tick items as they are prepared.`} action={<AddBtn label="Add item" onClick={() => packC.add({ id: uid('pk'), item: '', owner: 'A. Sharma', done: false })} />}>
        <div className="max-w-[860px]">
          {packC.items.length === 0 && <p className="text-[12.5px] text-ink-500 italic text-center py-4">No checklist items yet.</p>}
          {packC.items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 border-b border-slate-200 py-0.5 hover:bg-brand-50/40 rounded">
              <input type="checkbox" className="accent-brand-600 ml-2" checked={i.done} onChange={(e) => setP(i, 'done', e.target.checked)} />
              <input className={`${cellCls} flex-1 min-w-0 ${i.done ? 'line-through text-ink-500' : 'font-medium'}`} value={i.item} placeholder="Pack item" onChange={(e) => setP(i, 'item', e.target.value)} />
              <select className={`${selectCls} shrink-0 cursor-pointer`} value={i.owner} onChange={(e) => setP(i, 'owner', e.target.value)}>{(PEOPLE.includes(i.owner as (typeof PEOPLE)[number]) ? PEOPLE : [i.owner, ...PEOPLE]).map((o) => <option key={o}>{o}</option>)}</select>
              <RemoveBtn name={i.item || 'this item'} onClick={() => packC.remove(i.id)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ---- Decisions ---- */
function DecisionsTab({ p }: { p: GovInputProps }) {
  const { decisionsC, newDecision, openDecision, unitNames } = p
  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('All')
  const [fUnit, setFUnit] = useState(UNIT_ALL)
  const rows = decisionsC.items.filter((d) => (fStatus === 'All' || d.status === fStatus) && matchUnit(fUnit, d.businessUnit) && (!q || `${d.code} ${d.title} ${d.decisionOwner} ${d.requestedBy}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1) || a.requiredBy.localeCompare(b.requiredBy))
  const set = <K extends keyof Decision>(d: Decision, k: K, v: Decision[K]) => decisionsC.update({ ...d, [k]: v })
  const setStatus = (d: Decision, status: Decision['status']) => decisionsC.update({ ...d, status, decidedOn: status === 'Pending' ? undefined : (d.decidedOn ?? TODAY) })
  return (
    <Card title="Decision log" subtitle={`${decisionsC.items.length} decisions · ${decisionsC.items.filter((d) => d.status === 'Pending').length} pending. Approving, rejecting or deferring stamps today's date as the decision date.`} action={<AddBtn label="Add decision" onClick={() => decisionsC.add(newDecision())} />}>
      <GridToolbar q={q} onQ={setQ} placeholder="Search decisions…" count={rows.length}>
        <UnitFilter value={fUnit} units={unitNames} onChange={setFUnit} />
        <select className="input py-1.5 w-auto text-[12.5px]" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>{['All', ...DECISION_STATUSES].map((s) => <option key={s}>{s}</option>)}</select>
      </GridToolbar>
      <Grid count={rows.length} minWidth={1560} headers={['ID', 'Decision', 'Business unit', 'Workstream', 'Requested by', 'Decision owner', 'Forum', 'Required by', 'Impact', 'Status', 'Decided on', 'Rationale', '']}>
        {rows.map((d) => (
          <Row key={d.id} muted={d.status !== 'Pending'}>
            <Td><TextCell value={d.code} className="w-[64px] text-ink-500" onChange={(v) => set(d, 'code', v)} /></Td>
            <Td min={260}><TextCell value={d.title} placeholder="What needs to be decided?" className="font-medium" onChange={(v) => set(d, 'title', v)} /></Td>
            <Td><SelectCell value={d.businessUnit} options={[PROGRAM_WIDE, ...unitNames]} onChange={(v) => decisionsC.update({ ...d, businessUnit: v, projectId: v === d.businessUnit ? d.projectId : undefined })} /></Td>
            <Td><SelectCell value={d.workstream} options={WS_OPTIONS} onChange={(v) => set(d, 'workstream', v as Decision['workstream'])} /></Td>
            <Td><SelectCell value={d.requestedBy} options={PEOPLE} onChange={(v) => set(d, 'requestedBy', v)} /></Td>
            <Td min={140}><TextCell value={d.decisionOwner} placeholder="Owner" onChange={(v) => set(d, 'decisionOwner', v)} /></Td>
            <Td><SelectCell value={d.forum} options={FORUMS} onChange={(v) => set(d, 'forum', v)} /></Td>
            <Td><DateCell value={d.requiredBy} onChange={(v) => set(d, 'requiredBy', v)} /></Td>
            <Td><SelectCell value={d.impact} options={IMPACTS} onChange={(v) => set(d, 'impact', v)} /></Td>
            <Td><SelectCell value={d.status} options={DECISION_STATUSES} onChange={(v) => setStatus(d, v)} /></Td>
            <Td><DateCell value={d.decidedOn ?? ''} onChange={(v) => set(d, 'decidedOn', v || undefined)} /></Td>
            <Td min={220}><TextCell value={d.rationale} placeholder="Rationale / options considered" onChange={(v) => set(d, 'rationale', v)} /></Td>
            <Td sticky><EditBtn onClick={() => openDecision(d)} /><RemoveBtn name={d.code} onClick={() => decisionsC.remove(d.id)} /></Td>
          </Row>
        ))}
      </Grid>
    </Card>
  )
}

/* ---- Change requests ---- */
function CrTab({ p }: { p: GovInputProps }) {
  const { crC, newCr, openCr, unitNames } = p
  const money = useMoney()
  const [fStatus, setFStatus] = useState('All')
  const [fUnit, setFUnit] = useState(UNIT_ALL)
  const rows = crC.items.filter((c) => (fStatus === 'All' || c.status === fStatus) && matchUnit(fUnit, c.businessUnit)).sort((a, b) => b.submitted.localeCompare(a.submitted))
  const set = <K extends keyof ChangeRequest>(c: ChangeRequest, k: K, v: ChangeRequest[K]) => crC.update({ ...c, [k]: v })
  const setStatus = (c: ChangeRequest, status: ChangeRequest['status']) => crC.update({ ...c, status, decidedOn: status === 'Approved' || status === 'Rejected' ? (c.decidedOn ?? TODAY) : undefined })
  return (
    <Card title="Change request register" subtitle={`${crC.items.length} change requests · ${crC.items.filter((c) => c.status === 'Draft' || c.status === 'In Review').length} pending. Cost impact is entered in ${money.unitLabel} (negative = saving); open the form for the impact assessment.`}
      action={<div className="flex items-center gap-2"><UnitFilter value={fUnit} units={unitNames} onChange={setFUnit} /><select className="input !w-auto !py-1.5" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>{['All', ...CR_STATUSES].map((s) => <option key={s}>{s}</option>)}</select><AddBtn label="Raise change request" onClick={() => crC.add(newCr())} /></div>}>
      <Grid count={rows.length} minWidth={1460} headers={['ID', 'Title', 'Business unit', 'Type', 'Workstream', 'Raised by', { label: `Cost (${money.unitLabel})`, right: true }, { label: 'Schedule (days)', right: true }, 'Submitted', 'Status', 'Decided on', '']}>
        {rows.map((c) => (
          <Row key={c.id} muted={c.status === 'Rejected'}>
            <Td><TextCell value={c.code} className="w-[72px] text-ink-500" onChange={(v) => set(c, 'code', v)} /></Td>
            <Td min={280}><TextCell value={c.title} placeholder="Change request title" className="font-medium" onChange={(v) => set(c, 'title', v)} /></Td>
            <Td><SelectCell value={c.businessUnit} options={[PROGRAM_WIDE, ...unitNames]} onChange={(v) => crC.update({ ...c, businessUnit: v, projectId: v === c.businessUnit ? c.projectId : undefined })} /></Td>
            <Td><SelectCell value={c.type} options={['Scope', 'Budget', 'Timeline']} onChange={(v) => set(c, 'type', v)} /></Td>
            <Td><SelectCell value={c.workstream} options={WS_OPTIONS} onChange={(v) => set(c, 'workstream', v as ChangeRequest['workstream'])} /></Td>
            <Td><SelectCell value={c.raisedBy} options={PEOPLE} onChange={(v) => set(c, 'raisedBy', v)} /></Td>
            <Td><NumCell value={money.inputValue(c.costImpactCr)} decimals className="w-[84px]" onChange={(v) => set(c, 'costImpactCr', money.toBase(v))} /></Td>
            <Td><NumCell value={c.scheduleImpactDays} className="w-[64px]" onChange={(v) => set(c, 'scheduleImpactDays', v)} /></Td>
            <Td><DateCell value={c.submitted} onChange={(v) => set(c, 'submitted', v)} /></Td>
            <Td><SelectCell value={c.status} options={CR_STATUSES} onChange={(v) => setStatus(c, v)} /></Td>
            <Td><DateCell value={c.decidedOn ?? ''} onChange={(v) => set(c, 'decidedOn', v || undefined)} /></Td>
            <Td sticky><EditBtn onClick={() => openCr(c)} /><RemoveBtn name={c.code} onClick={() => crC.remove(c.id)} /></Td>
          </Row>
        ))}
      </Grid>
    </Card>
  )
}

/* ---- Actions ---- */
function ActionsTab({ p }: { p: GovInputProps }) {
  const { actionsC, meetingsC, newAction, openAction, unitNames } = p
  const [q, setQ] = useState('')
  const [hideDone, setHideDone] = useState(false)
  const [fUnit, setFUnit] = useState(UNIT_ALL)
  const rows = actionsC.items.filter((a) => (!hideDone || a.status !== 'Completed') && matchUnit(fUnit, a.businessUnit) && (!q || `${a.code} ${a.action} ${a.owner} ${a.source}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (a.status === 'Completed' ? 1 : 0) - (b.status === 'Completed' ? 1 : 0) || a.due.localeCompare(b.due))
  const set = <K extends keyof ActionItem>(a: ActionItem, k: K, v: ActionItem[K]) => actionsC.update({ ...a, [k]: v })
  const sources = Array.from(new Set([...meetingsC.items.map((m) => m.code), 'Weekly review', ...actionsC.items.map((a) => a.source)]))
  return (
    <Card title="Actions register" subtitle={`${actionsC.items.filter((a) => a.status !== 'Completed').length} open · ${actionsC.items.filter((a) => a.status === 'Completed').length} completed. Actions past their due date show as Overdue on the dashboards.`} action={<AddBtn label="Add action" onClick={() => actionsC.add(newAction())} />}>
      <GridToolbar q={q} onQ={setQ} placeholder="Search actions…" count={rows.length}>
        <UnitFilter value={fUnit} units={unitNames} onChange={setFUnit} />
        <label className="inline-flex items-center gap-1.5 cursor-pointer text-ink-700"><input type="checkbox" className="accent-brand-600" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide completed</label>
      </GridToolbar>
      <Grid count={rows.length} minWidth={1260} headers={['ID', 'Action', 'Business unit', 'Workstream', 'Owner', 'Due', 'Source meeting', 'Status', '']}>
        {rows.map((a) => (
          <Row key={a.id} muted={a.status === 'Completed'}>
            <Td><TextCell value={a.code} className="w-[64px] text-ink-500" onChange={(v) => set(a, 'code', v)} /></Td>
            <Td min={320}><TextCell value={a.action} placeholder="What has to be done" className="font-medium" onChange={(v) => set(a, 'action', v)} /></Td>
            <Td><SelectCell value={a.businessUnit} options={[PROGRAM_WIDE, ...unitNames]} onChange={(v) => actionsC.update({ ...a, businessUnit: v, projectId: v === a.businessUnit ? a.projectId : undefined })} /></Td>
            <Td><SelectCell value={a.workstream} options={WS_OPTIONS} onChange={(v) => set(a, 'workstream', v as ActionItem['workstream'])} /></Td>
            <Td><SelectCell value={a.owner} options={PEOPLE} onChange={(v) => set(a, 'owner', v)} /></Td>
            <Td><DateCell value={a.due} onChange={(v) => set(a, 'due', v)} /></Td>
            <Td><SelectCell value={a.source} options={sources} onChange={(v) => set(a, 'source', v)} /></Td>
            <Td><SelectCell value={a.status} options={ACTION_STATUSES} onChange={(v) => set(a, 'status', v)} /></Td>
            <Td sticky>
              {a.status !== 'Completed' && <button title="Mark done" className="text-slate-400 hover:text-green-600 p-1 cursor-pointer" onClick={() => set(a, 'status', 'Completed')}><Check size={14} /></button>}
              <EditBtn onClick={() => openAction(a)} /><RemoveBtn name={a.code} onClick={() => actionsC.remove(a.id)} />
            </Td>
          </Row>
        ))}
      </Grid>
    </Card>
  )
}

/* ---- Stakeholders & RACI ---- */
function StakeholdersTab({ p }: { p: GovInputProps }) {
  const { stakeholdersC, raciC, buRaciC, newStakeholder, openStakeholder, unitNames } = p
  const [fUnit, setFUnit] = useState(UNIT_ALL)
  const rows = stakeholdersC.items.filter((s) => matchUnit(fUnit, s.businessUnits))
  const set = <K extends keyof Stakeholder>(s: Stakeholder, k: K, v: Stakeholder[K]) => stakeholdersC.update({ ...s, [k]: v })
  return (
    <div className="space-y-4">
      <Card title="Stakeholder register" subtitle={`${stakeholdersC.items.length} stakeholders · ${stakeholdersC.items.filter((s) => s.sentiment === 'Concerned').length} concerned. Influence and interest place each stakeholder on the engagement map; business units mark who a stakeholder represents or sponsors.`} action={<div className="flex items-center gap-2"><UnitFilter value={fUnit} units={unitNames} onChange={setFUnit} /><AddBtn label="Add stakeholder" onClick={() => stakeholdersC.add(newStakeholder())} /></div>}>
        <Grid count={rows.length} minWidth={1520} headers={['Stakeholder', 'Role', 'Organization', 'Business units', 'Group', 'Influence', 'Interest', 'Engagement', 'Sentiment', 'Relationship owner', '']}>
          {rows.map((s) => (
            <Row key={s.id}>
              <Td min={170}><TextCell value={s.name} placeholder="Name" className="font-medium" onChange={(v) => set(s, 'name', v)} /></Td>
              <Td min={220}><TextCell value={s.role} placeholder="Role" onChange={(v) => set(s, 'role', v)} /></Td>
              <Td min={130}><TextCell value={s.organization} placeholder="Organization" onChange={(v) => set(s, 'organization', v)} /></Td>
              <Td min={220}><UnitTagsCell value={s.businessUnits ?? []} units={unitNames} onChange={(v) => set(s, 'businessUnits', v)} /></Td>
              <Td><SelectCell value={s.group} options={ST_GROUPS} onChange={(v) => set(s, 'group', v)} /></Td>
              <Td><SelectCell value={s.influence} options={LEVELS3} onChange={(v) => set(s, 'influence', v)} /></Td>
              <Td><SelectCell value={s.interest} options={LEVELS3} onChange={(v) => set(s, 'interest', v)} /></Td>
              <Td><SelectCell value={s.engagement} options={ENGAGEMENTS} onChange={(v) => set(s, 'engagement', v)} /></Td>
              <Td><SelectCell value={s.sentiment} options={SENTIMENTS} onChange={(v) => set(s, 'sentiment', v)} /></Td>
              <Td><SelectCell value={s.owner} options={PEOPLE} onChange={(v) => set(s, 'owner', v)} /></Td>
              <Td sticky><EditBtn onClick={() => openStakeholder(s)} /><RemoveBtn name={s.name || 'this stakeholder'} onClick={() => stakeholdersC.remove(s.id)} /></Td>
            </Row>
          ))}
        </Grid>
      </Card>
      <BuRaciMatrix raciC={buRaciC} units={unitNames} editable />
      <RaciMatrix raciC={raciC} editable />
    </div>
  )
}

/* ---- Calendar events ---- */
function EventsTab({ p }: { p: GovInputProps }) {
  const { eventsC, newEvent, openEvent, unitNames } = p
  const [q, setQ] = useState('')
  const [fType, setFType] = useState('All types')
  const [fUnit, setFUnit] = useState(UNIT_ALL)
  const [past, setPast] = useState(false)
  const rows = eventsC.items.filter((e) => (past || e.date >= TODAY) && (fType === 'All types' || e.type === fType) && matchUnit(fUnit, e.businessUnit) && (!q || `${e.title} ${e.owner} ${e.attendees}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.date.localeCompare(b.date))
  const set = <K extends keyof GovEvent>(e: GovEvent, k: K, v: GovEvent[K]) => eventsC.update({ ...e, [k]: v })
  return (
    <Card title="Governance calendar events" subtitle={`${eventsC.items.filter((e) => e.date >= TODAY).length} upcoming events. Steering committees, reviews, go/no-go gates and audits shown on the calendar and the Upcoming Governance Events card.`} action={<AddBtn label="Add event" onClick={() => eventsC.add(newEvent())} />}>
      <GridToolbar q={q} onQ={setQ} placeholder="Search events…" count={rows.length}>
        <UnitFilter value={fUnit} units={unitNames} onChange={setFUnit} />
        <select className="input py-1.5 w-auto text-[12.5px]" value={fType} onChange={(e) => setFType(e.target.value)}>{['All types', ...Object.keys(TYPE_COLOR)].map((s) => <option key={s}>{s}</option>)}</select>
        <label className="inline-flex items-center gap-1.5 cursor-pointer text-ink-700"><input type="checkbox" className="accent-brand-600" checked={past} onChange={(e) => setPast(e.target.checked)} /> Include past events</label>
      </GridToolbar>
      <Grid count={rows.length} minWidth={1180} headers={['Date', 'Event', 'Business unit', 'Type', 'Cadence', 'Owner', 'Attendees', '']}>
        {rows.map((e) => (
          <Row key={e.id} muted={e.date < TODAY}>
            <Td><span className="flex items-center gap-1.5"><span className="w-1 h-6 rounded-full ml-1" style={{ background: TYPE_COLOR[e.type] }} /><DateCell value={e.date} onChange={(v) => set(e, 'date', v)} /></span></Td>
            <Td min={260}><TextCell value={e.title} placeholder="Event title" className="font-medium" onChange={(v) => set(e, 'title', v)} /></Td>
            <Td><SelectCell value={e.businessUnit} options={[PROGRAM_WIDE, ...unitNames]} onChange={(v) => set(e, 'businessUnit', v)} /></Td>
            <Td><SelectCell value={e.type} options={Object.keys(TYPE_COLOR)} onChange={(v) => set(e, 'type', v as GovEvent['type'])} /></Td>
            <Td><SelectCell value={e.cadence} options={CADENCE_OPTS} onChange={(v) => set(e, 'cadence', v)} /></Td>
            <Td><SelectCell value={e.owner} options={PEOPLE} onChange={(v) => set(e, 'owner', v)} /></Td>
            <Td min={200}><TextCell value={e.attendees} placeholder="Attendees" onChange={(v) => set(e, 'attendees', v)} /></Td>
            <Td sticky><EditBtn onClick={() => openEvent(e)} /><RemoveBtn name={e.title || 'this event'} onClick={() => eventsC.remove(e.id)} /></Td>
          </Row>
        ))}
      </Grid>
    </Card>
  )
}

/* ---- Controls & RAG criteria ---- */
function ControlsTab({ p }: { p: GovInputProps }) {
  const { controlsC, ragC, newControl, openControl, openRag, unitNames } = p
  const [fUnit, setFUnit] = useState(UNIT_ALL)
  const rows = controlsC.items.filter((c) => matchUnit(fUnit, c.businessUnits))
  const set = <K extends keyof Control>(c: Control, k: K, v: Control[K]) => controlsC.update({ ...c, [k]: v })
  const setR = <K extends keyof RagCriterion>(r: RagCriterion, k: K, v: RagCriterion[K]) => ragC.update({ ...r, [k]: v })
  return (
    <div className="space-y-4">
      <Card title="Program controls" subtitle="WBS 1.3 Governance and controls · 13 Stakeholder Management. Status and last review date feed the Control Status chart; a control with no business unit applies program-wide." action={<div className="flex items-center gap-2"><UnitFilter value={fUnit} units={unitNames} onChange={setFUnit} /><AddBtn label="Add control" onClick={() => controlsC.add(newControl())} /></div>}>
        <Grid count={rows.length} minWidth={1480} headers={['WBS', 'Control', 'Description', 'Applies to', 'Owner', 'Status', 'Last reviewed', 'Evidence / artefact', '']}>
          {rows.map((c) => (
            <Row key={c.id}>
              <Td><TextCell value={c.wbs} className="w-[64px] text-ink-500" onChange={(v) => set(c, 'wbs', v)} /></Td>
              <Td min={260}><TextCell value={c.control} placeholder="Control" className="font-medium" onChange={(v) => set(c, 'control', v)} /></Td>
              <Td min={280}><TextCell value={c.description} placeholder="What the control covers" onChange={(v) => set(c, 'description', v)} /></Td>
              <Td min={220}><UnitTagsCell value={c.businessUnits ?? []} units={unitNames} onChange={(v) => set(c, 'businessUnits', v)} /></Td>
              <Td><SelectCell value={c.owner} options={PEOPLE} onChange={(v) => set(c, 'owner', v)} /></Td>
              <Td><SelectCell value={c.status} options={CONTROL_STATUSES} onChange={(v) => set(c, 'status', v)} /></Td>
              <Td><DateCell value={c.lastReviewed} onChange={(v) => set(c, 'lastReviewed', v)} /></Td>
              <Td min={160}><TextCell value={c.evidence} placeholder="Evidence" onChange={(v) => set(c, 'evidence', v)} /></Td>
              <Td sticky><EditBtn onClick={() => openControl(c)} /><RemoveBtn name={c.control || 'this control'} onClick={() => controlsC.remove(c.id)} /></Td>
            </Row>
          ))}
        </Grid>
      </Card>
      <Card title="RAG criteria definition" subtitle="Program health indicators (WBS 1.3.8): the thresholds for Green, Amber and Red per dimension." action={<AddBtn label="Add dimension" onClick={() => ragC.add({ id: uid('rag'), dimension: '', green: '', amber: '', red: '' })} />}>
        <Grid count={ragC.items.length} minWidth={1000} headers={['Dimension', 'Green', 'Amber', 'Red', '']}>
          {ragC.items.map((r) => (
            <Row key={r.id}>
              <Td min={140}><TextCell value={r.dimension} placeholder="Dimension" className="font-medium" onChange={(v) => setR(r, 'dimension', v)} /></Td>
              <Td min={260}><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600 shrink-0 ml-1" /><TextCell value={r.green} placeholder="Green threshold" onChange={(v) => setR(r, 'green', v)} /></span></Td>
              <Td min={260}><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ml-1" /><TextCell value={r.amber} placeholder="Amber threshold" onChange={(v) => setR(r, 'amber', v)} /></span></Td>
              <Td min={260}><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0 ml-1" /><TextCell value={r.red} placeholder="Red threshold" onChange={(v) => setR(r, 'red', v)} /></span></Td>
              <Td sticky><EditBtn onClick={() => openRag(r)} /><RemoveBtn name={r.dimension || 'this dimension'} onClick={() => ragC.remove(r.id)} /></Td>
            </Row>
          ))}
        </Grid>
      </Card>
    </div>
  )
}
