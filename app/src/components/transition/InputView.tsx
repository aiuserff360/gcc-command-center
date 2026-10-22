/**
 * Transition Management – Input view: the registers and settings behind the transition dashboards, based on
 * business units and the projects under them. Inline edits write straight to the collections; the pencil opens the full form.
 */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CheckCircle2, Circle, Save, Check, Building2 } from 'lucide-react'
import { Card, Field, Input, Select, FormGrid, Badge, Progress } from '../ui'
import { Grid, Row, Td, TextCell, NumCell, DateCell, SelectCell, CheckCell, RemoveBtn, EditBtn, AddBtn, GridToolbar, cellCls, selectCls } from '../ui/InlineGrid'
import { InputLayout } from '../layout/InputLayout'
import { uid } from '../../store/useStore'
import { OWNERS, WORKSTREAMS, TODAY } from '../../data/common'
import type { Milestone } from '../../data/shared'
import { GBUS, GEOGRAPHIES, DELIVERY_LOCATIONS, TRANSITION_TYPES, subUnitsOf, type SubUnit } from '../../data/businessUnits'
import {
  WAVE_STATUSES, WAVE_COLORS, KT_STATUSES, KT_SIGNOFF, DIMENSIONS, DIM_KEY, DIM_SHORT, READINESS_STATUSES, GAP_STATUSES, PROJECT_STATUSES, ACCOUNT_TYPES, ACCOUNT_STATUSES,
  assessmentScore, readinessColor, milestoneWave, ktStats, ktStatusFor, ktIsCompleted, waveLabel, waveScope, waveCapabilities, waveProgress, projectKt, projectReadiness, projectAccounts, unitAccounts, accountStats, isOnboarded, blankAssessment, avgScore, dimAverage, unitKt,
  type Wave, type KtItem, type ReadinessAssessment, type ReadinessGap, type ChecklistItem, type TransitionSettings, type TransitionProject, type TransitionAccount, type AccountStatus,
} from '../../data/transition'
import { WaveDot, StatusBadge } from './Overview'
import type { Tx } from './types'

const MS_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Pending', 'Not Started', 'Completed'] as const
const AREAS = ['Governance', 'Support', 'Performance', 'Process', 'People', 'Technology', 'Facilities'] as const
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const
const sortWaves = (w: Wave[]) => [...w].sort((a, b) => a.number - b.number)
const waveNos = (waves: Wave[]) => sortWaves(waves).map((w) => String(w.number))
const projectName = (projects: TransitionProject[], id: string) => projects.find((p) => p.id === id)?.name ?? '–'

/** Business-unit picker (same pattern as the Output view): cards + dropdown. */
function UnitPicker({ tx, counts }: { tx: Tx; counts: (unit: string) => string }) {
  const { unitNames, unit, setUnit } = tx
  return (
    <div className="flex items-center gap-2 flex-wrap mb-3">
      <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 min-w-[280px] cursor-pointer">
        <Building2 size={15} className="text-brand-600" />
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className="flex-1 bg-transparent outline-none text-[13px] font-semibold text-ink-900 cursor-pointer">{unitNames.map((n) => <option key={n} value={n}>{n}</option>)}</select>
      </label>
      <div className="flex items-center gap-1.5 flex-wrap">
        {unitNames.map((n) => <button key={n} onClick={() => setUnit(n)} className={clsx('rounded-md border px-2 py-1 text-[11.5px] cursor-pointer whitespace-nowrap', n === unit ? 'border-brand-600 bg-brand-50 text-brand-600 font-semibold' : 'border-line bg-white text-ink-700 hover:bg-surface')}>{n}<span className="text-ink-400 ml-1">{counts(n)}</span></button>)}
      </div>
    </div>
  )
}

/* ================================================================== */
/* Projects by business unit                                           */
/* ================================================================== */
function ProjectsTab({ tx }: { tx: Tx }) {
  const { projects, subs, units, accounts, waves, kt, assessments, unit, unitNames, open, openProject } = tx
  const sorted = sortWaves(waves.items)
  const u = units.find((b) => b.name === unit)
  const caps = u ? subUnitsOf(subs.items, u.id) : []
  const rows = useMemo(() => projects.items.filter((p) => p.businessUnit === unit).sort((a, b) => a.wave - b.wave || a.startDate.localeCompare(b.startDate)), [projects.items, unit])
  const set = <K extends keyof TransitionProject>(p: TransitionProject, k: K, v: TransitionProject[K]) => projects.update({ ...p, [k]: v })
  const setCap = (p: TransitionProject, id: string) => { const c = subs.items.find((s) => s.id === id); if (c) projects.update({ ...p, subUnitId: c.id, capability: c.name, gbu: c.gbuServed, deliveryLocation: c.deliveryLocation, transitionType: c.transitionType, region: c.geography }) }
  const setWave = (p: TransitionProject, wave: number) => {
    projects.update({ ...p, wave })
    kt.items.filter((k) => k.projectId === p.id).forEach((k) => kt.update({ ...k, wave }))
    assessments.items.filter((a) => a.projectId === p.id).forEach((a) => assessments.update({ ...a, wave }))
    tx.gaps.items.filter((g) => g.projectId === p.id).forEach((g) => tx.gaps.update({ ...g, wave }))
  }
  const add = () => { const c = caps[0]; projects.add({ id: uid('proj'), name: '', businessUnit: unit, subUnitId: c?.id ?? '', capability: c?.name ?? '', gbu: c?.gbuServed ?? GBUS[0], deliveryLocation: c?.deliveryLocation ?? DELIVERY_LOCATIONS[0], transitionType: c?.transitionType ?? TRANSITION_TYPES[0], wave: c ? Number(c.wave.replace('Wave ', '')) || 1 : sorted[0]?.number ?? 1, status: 'Not Started', progress: 0, startDate: TODAY, endDate: TODAY, goLiveDate: TODAY, globalOwner: '', indiaLead: OWNERS[0], region: c?.geography ?? GEOGRAPHIES[0], scopeSummary: '', ftes: c?.targetHc ?? 0, description: '', notes: '' }) }
  const remove = (p: TransitionProject) => { kt.items.filter((k) => k.projectId === p.id).forEach((k) => kt.remove(k.id)); assessments.items.filter((a) => a.projectId === p.id).forEach((a) => assessments.remove(a.id)); tx.gaps.items.filter((g) => g.projectId === p.id).forEach((g) => tx.gaps.remove(g.id)); accounts.items.filter((a) => a.projectId === p.id).forEach((a) => accounts.remove(a.id)); projects.remove(p.id) }
  const capOptions = (p: TransitionProject): SubUnit[] => (caps.some((c) => c.id === p.subUnitId) ? caps : [...subs.items.filter((c) => c.id === p.subUnitId), ...caps])
  return (
    <Card title="Transition projects by business unit" subtitle={`${projects.items.length} projects across ${unitNames.length} business units. Each project transitions one capability from its current delivery location for the GBU it serves, in the capability's wave (pick the capability and GBU, geography, delivery location, type and wave follow). Status, progress, dates, owners and FTEs drive the unit cards, wave scope and timeline; accounts, KT % and readiness are derived from the registers.`} action={<AddBtn label={`Add project to ${unit}`} onClick={add} />}>
      <UnitPicker tx={tx} counts={(n) => String(projects.items.filter((p) => p.businessUnit === n).length)} />
      <Grid count={rows.length} minWidth={2200} headers={['Project', 'Capability / service', 'GBU served', 'Geography', 'From (delivery location)', 'Type', 'Wave', 'Status', { label: 'Progress %', right: true }, 'Start', 'End', 'Go-live', 'Global owner', 'India lead', { label: 'FTEs', right: true }, 'Scope summary', { label: 'Accounts', right: true }, { label: 'KT %', right: true }, { label: 'Readiness', right: true }, '']} empty={caps.length ? 'No projects yet. Use "Add project" to create one.' : 'This business unit has no capabilities yet – add them in GCC Setup → Organisation structure first.'}>
        {rows.map((p) => (
          <Row key={p.id}>
            <Td min={230}><TextCell value={p.name} placeholder="Project name" className="font-medium" onChange={(v) => set(p, 'name', v)} /></Td>
            <Td min={190}><select className={clsx(selectCls, 'cursor-pointer max-w-[230px]')} value={p.subUnitId} onChange={(e) => setCap(p, e.target.value)}>{!p.subUnitId && <option value="">– pick a capability –</option>}{capOptions(p).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Td>
            <Td><SelectCell value={p.gbu} options={GBUS.includes(p.gbu as never) ? GBUS : [p.gbu, ...GBUS]} onChange={(v) => set(p, 'gbu', v)} /></Td>
            <Td><SelectCell value={p.region} options={GEOGRAPHIES.includes(p.region as never) ? GEOGRAPHIES : [p.region, ...GEOGRAPHIES]} onChange={(v) => set(p, 'region', v)} /></Td>
            <Td><SelectCell value={p.deliveryLocation} options={DELIVERY_LOCATIONS.includes(p.deliveryLocation as never) ? DELIVERY_LOCATIONS : [p.deliveryLocation, ...DELIVERY_LOCATIONS]} onChange={(v) => set(p, 'deliveryLocation', v)} /></Td>
            <Td><SelectCell value={p.transitionType} options={TRANSITION_TYPES.includes(p.transitionType as never) ? TRANSITION_TYPES : [p.transitionType, ...TRANSITION_TYPES]} onChange={(v) => set(p, 'transitionType', v)} /></Td>
            <Td><span className="flex items-center gap-1"><WaveDot wave={sorted.find((w) => w.number === p.wave)} size={20} /><SelectCell value={String(p.wave)} options={waveNos(sorted)} onChange={(v) => setWave(p, Number(v))} className="w-[52px]" /></span></Td>
            <Td><SelectCell value={p.status} options={PROJECT_STATUSES} onChange={(v) => set(p, 'status', v)} /></Td>
            <Td><NumCell value={p.progress} min={0} max={100} className="w-[60px]" onChange={(v) => set(p, 'progress', v)} /></Td>
            <Td><DateCell value={p.startDate} onChange={(v) => set(p, 'startDate', v)} /></Td>
            <Td><DateCell value={p.endDate} onChange={(v) => set(p, 'endDate', v)} /></Td>
            <Td><DateCell value={p.goLiveDate} onChange={(v) => set(p, 'goLiveDate', v)} /></Td>
            <Td min={110}><TextCell value={p.globalOwner} placeholder="Global owner" onChange={(v) => set(p, 'globalOwner', v)} /></Td>
            <Td><SelectCell value={p.indiaLead} options={OWNERS} onChange={(v) => set(p, 'indiaLead', v)} /></Td>
            <Td><NumCell value={p.ftes} min={0} className="w-[56px]" onChange={(v) => set(p, 'ftes', v)} /></Td>
            <Td min={240}><TextCell value={p.scopeSummary} placeholder="What moves to the GCC" onChange={(v) => set(p, 'scopeSummary', v)} /></Td>
            <Td className="text-right text-[12px] pr-2 whitespace-nowrap">{(() => { const a = projectAccounts(p, accounts.items); return <span><b className="text-teal-700">{a.onboarded}</b> / {a.total}</span> })()}</Td>
            <Td className="text-right text-[12px] pr-2">{projectKt(p, kt.items).pct}%</Td>
            <Td className="text-right pr-2">{(() => { const s = projectReadiness(p, assessments.items); return <span className="inline-flex items-center justify-center w-11 h-5 rounded-md text-[11px] font-semibold text-white" style={{ background: readinessColor(s) }}>{s}%</span> })()}</Td>
            <Td sticky><button className="link text-[11.5px] mr-1" onClick={() => openProject(p.id)}>Deep dive</button><EditBtn onClick={() => open({ kind: 'project', item: p })} /><RemoveBtn name={p.name || 'this project'} onClick={() => remove(p)} /></Td>
          </Row>
        ))}
      </Grid>
    </Card>
  )
}

/* ================================================================== */
/* Accounts onboarded                                                  */
/* ================================================================== */
function AccountsInputTab({ tx }: { tx: Tx }) {
  const { accounts, projects, unit, open } = tx
  const [q, setQ] = useState('')
  const [fProject, setFProject] = useState('All')
  const [fStatus, setFStatus] = useState('All')
  const unitProjects = projects.items.filter((p) => p.businessUnit === unit)
  const rows = useMemo(() => accounts.items.filter((a) => a.businessUnit === unit && (fProject === 'All' || a.projectId === fProject) && (fStatus === 'All' || a.status === fStatus) && (!q || `${a.name} ${a.gbu} ${a.type} ${a.owner} ${projectName(projects.items, a.projectId)}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => projectName(projects.items, a.projectId).localeCompare(projectName(projects.items, b.projectId)) || ACCOUNT_STATUSES.indexOf(a.status) - ACCOUNT_STATUSES.indexOf(b.status) || a.plannedDate.localeCompare(b.plannedDate)), [accounts.items, projects.items, unit, q, fProject, fStatus])
  const s = unitAccounts(unit, accounts.items)
  const set = <K extends keyof TransitionAccount>(a: TransitionAccount, k: K, v: TransitionAccount[K]) => accounts.update({ ...a, [k]: v })
  const setStatus = (a: TransitionAccount, status: AccountStatus) => accounts.update({ ...a, status, onboardedDate: isOnboarded({ status } as TransitionAccount) ? a.onboardedDate || TODAY : a.onboardedDate })
  const setProject = (a: TransitionAccount, id: string) => { const p = projects.items.find((x) => x.id === id); if (p) accounts.update({ ...a, projectId: p.id, businessUnit: p.businessUnit }) }
  const add = () => { const p = unitProjects.find((x) => x.id === fProject) ?? unitProjects[0]; if (!p) return; accounts.add({ id: uid('acc'), projectId: p.id, businessUnit: p.businessUnit, name: '', gbu: p.gbu, geography: p.region, type: 'Application', status: 'Planned', plannedDate: TODAY, onboardedDate: undefined, owner: p.globalOwner, notes: '' }) }
  return (
    <Card title="Accounts onboarded by project" subtitle={`${unit}: ${s.total} accounts · ${s.onboarded} onboarded (${s.live} live) · ${s.inKt} in KT · ${s.planned} planned · ${s.onHold} on hold. An account is a business, application, entity or platform onboarded to the GCC through a project; Onboarded and Live count towards the "Accounts Onboarded" tile.`} action={<AddBtn label="Add account" onClick={add} />}>
      <UnitPicker tx={tx} counts={(n) => { const a = unitAccounts(n, accounts.items); return `${a.onboarded}/${a.total}` }} />
      <GridToolbar q={q} onQ={setQ} placeholder="Search account, GBU, owner…" count={rows.length}>
        <select className="input py-1.5 w-auto text-[12.5px]" value={unitProjects.some((p) => p.id === fProject) ? fProject : 'All'} onChange={(e) => setFProject(e.target.value)}><option value="All">All projects of {unit}</option>{unitProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select className="input py-1.5 w-auto text-[12.5px]" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>{['All', ...ACCOUNT_STATUSES].map((st) => <option key={st}>{st}</option>)}</select>
      </GridToolbar>
      <Grid count={rows.length} minWidth={1500} headers={['Account', 'Project', 'Type', 'GBU served', 'Geography', 'Status', 'Planned', 'Onboarded', 'Owner', 'Notes', '']} empty={unitProjects.length ? 'No accounts yet. Use "Add account" to log one.' : 'Add a project to this business unit first (Projects tab).'}>
        {rows.map((a) => (
          <Row key={a.id}>
            <Td min={260}><TextCell value={a.name} placeholder="e.g. ENGIE Networks – SAP FI/CO Europe" className="font-medium" onChange={(v) => set(a, 'name', v)} /></Td>
            <Td min={200}><select className={clsx(selectCls, 'cursor-pointer max-w-[260px]')} value={a.projectId} onChange={(e) => setProject(a, e.target.value)}>{(unitProjects.some((p) => p.id === a.projectId) ? unitProjects : [...projects.items.filter((p) => p.id === a.projectId), ...unitProjects]).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Td>
            <Td><SelectCell value={a.type} options={ACCOUNT_TYPES} onChange={(v) => set(a, 'type', v)} /></Td>
            <Td><SelectCell value={a.gbu} options={GBUS.includes(a.gbu as never) ? GBUS : [a.gbu, ...GBUS]} onChange={(v) => set(a, 'gbu', v)} /></Td>
            <Td><SelectCell value={a.geography} options={GEOGRAPHIES.includes(a.geography as never) ? GEOGRAPHIES : [a.geography, ...GEOGRAPHIES]} onChange={(v) => set(a, 'geography', v)} /></Td>
            <Td><SelectCell value={a.status} options={ACCOUNT_STATUSES} onChange={(v) => setStatus(a, v)} /></Td>
            <Td><DateCell value={a.plannedDate} onChange={(v) => set(a, 'plannedDate', v)} /></Td>
            <Td><DateCell value={a.onboardedDate ?? ''} onChange={(v) => set(a, 'onboardedDate', v || undefined)} /></Td>
            <Td min={120}><TextCell value={a.owner} placeholder="Owner" onChange={(v) => set(a, 'owner', v)} /></Td>
            <Td min={220}><TextCell value={a.notes} placeholder="Notes" onChange={(v) => set(a, 'notes', v)} /></Td>
            <Td sticky><EditBtn onClick={() => open({ kind: 'account', item: a })} /><RemoveBtn name={a.name || 'this account'} onClick={() => accounts.remove(a.id)} /></Td>
          </Row>
        ))}
      </Grid>
    </Card>
  )
}

/* ================================================================== */
/* Waves                                                               */
/* ================================================================== */
function WavesTab({ tx }: { tx: Tx }) {
  const { waves, kt, projects, open } = tx
  const sorted = sortWaves(waves.items)
  const set = <K extends keyof Wave>(w: Wave, k: K, v: Wave[K]) => waves.update({ ...w, [k]: v })
  const add = () => { const n = Math.max(0, ...sorted.map((w) => w.number)) + 1; const last = sorted[sorted.length - 1]; waves.add({ id: uid('wave'), number: n, name: '', startDate: last?.endDate ?? TODAY, endDate: last?.endDate ?? TODAY, status: 'Not Started', color: WAVE_COLORS[(n - 1) % WAVE_COLORS.length], lead: OWNERS[0] }) }
  return (
    <Card title="Transition waves" subtitle="The four waves of the ENGIE IT GCC footprint (Nov 2026 – Apr 2027). Scope (business units, capabilities) and progress are derived from the projects assigned to the wave in the Projects tab; dates, status and lead are entered here." action={<AddBtn label="Add wave" onClick={add} />}>
      <Grid count={sorted.length} minWidth={1300} headers={['Wave', 'Name', 'Business units in scope (derived)', 'Capabilities (derived)', 'Start', 'End', 'Status', { label: 'Progress', right: true }, 'Wave lead', 'Colour', { label: 'Projects', right: true }, { label: 'KT items', right: true }, '']}>
        {sorted.map((w) => (
          <Row key={w.id}>
            <Td><span className="flex items-center gap-1.5 pl-1"><WaveDot wave={w} size={22} /><NumCell value={w.number} min={1} className="w-[52px]" onChange={(v) => set(w, 'number', v)} /></span></Td>
            <Td min={200}><TextCell value={w.name} placeholder="Wave name" onChange={(v) => set(w, 'name', v)} className="font-medium" /></Td>
            <Td min={180}><span className="block px-1.5 text-[12px] text-ink-700 leading-snug">{waveScope(w, projects.items) || <span className="text-ink-400">no projects yet</span>}</span></Td>
            <Td min={240}><span className="block px-1.5 text-[11.5px] text-ink-700 leading-snug max-w-[320px]" title={waveCapabilities(w, projects.items).join(', ')}>{waveCapabilities(w, projects.items).join(', ') || <span className="text-ink-400">—</span>}</span></Td>
            <Td><DateCell value={w.startDate} onChange={(v) => set(w, 'startDate', v)} /></Td>
            <Td><DateCell value={w.endDate} onChange={(v) => set(w, 'endDate', v)} /></Td>
            <Td><SelectCell value={w.status} options={WAVE_STATUSES} onChange={(v) => set(w, 'status', v)} /></Td>
            <Td className="text-right text-[12px] pr-2"><span className="inline-flex items-center gap-1.5"><Progress value={waveProgress(w, projects.items)} className="w-[48px]" />{waveProgress(w, projects.items)}%</span></Td>
            <Td><SelectCell value={w.lead} options={OWNERS} onChange={(v) => set(w, 'lead', v)} /></Td>
            <Td><span className="flex items-center gap-1 px-1">{WAVE_COLORS.map((c) => <button key={c} title={c} className="w-4 h-4 rounded-full border-2 cursor-pointer" style={{ background: c, borderColor: w.color === c ? '#0B2240' : 'transparent' }} onClick={() => set(w, 'color', c)} />)}</span></Td>
            <Td className="text-right text-[12px] pr-2">{projects.items.filter((p) => p.wave === w.number).length}</Td>
            <Td className="text-right text-[12px] pr-2">{kt.items.filter((k) => k.wave === w.number).length}</Td>
            <Td sticky><EditBtn onClick={() => open({ kind: 'wave', item: w })} /><RemoveBtn name={`Wave ${w.number}`} onClick={() => waves.remove(w.id)} /></Td>
          </Row>
        ))}
      </Grid>
    </Card>
  )
}

/* ================================================================== */
/* Knowledge transfer                                                  */
/* ================================================================== */
function KtTab({ tx }: { tx: Tx }) {
  const { waves, kt, projects, unit, open } = tx
  const sorted = sortWaves(waves.items)
  const [q, setQ] = useState('')
  const [fProject, setFProject] = useState('All')
  const unitProjects = projects.items.filter((p) => p.businessUnit === unit)
  const rows = useMemo(() => kt.items.filter((k) => k.businessUnit === unit && (fProject === 'All' || k.projectId === fProject) && (!q || `${k.process} ${projectName(projects.items, k.projectId)} ${k.globalOwner} ${k.indiaOwner}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.wave - b.wave || projectName(projects.items, a.projectId).localeCompare(projectName(projects.items, b.projectId)) || a.targetDate.localeCompare(b.targetDate)), [kt.items, projects.items, unit, q, fProject])
  const s = unitKt(unit, kt.items)
  const setSessions = (k: KtItem, planned: number, done: number) => {
    const status = ktStatusFor(planned, done)
    kt.update({ ...k, sessionsPlanned: planned, sessionsDone: done, status, signOff: status === 'Completed' && k.signOff === 'Not Started' ? 'Pending' : k.signOff })
  }
  const set = <K extends keyof KtItem>(k: KtItem, key: K, v: KtItem[K]) => kt.update({ ...k, [key]: v })
  const setSignOff = (k: KtItem, v: KtItem['signOff']) => kt.update({ ...k, signOff: v, signedOffOn: v === 'Signed' ? k.signedOffOn || TODAY : undefined })
  const setProject = (k: KtItem, id: string) => { const p = projects.items.find((x) => x.id === id); if (p) kt.update({ ...k, projectId: p.id, businessUnit: p.businessUnit, wave: p.wave }) }
  const add = () => { const p = unitProjects.find((x) => x.id === fProject) ?? unitProjects[0]; if (!p) return; kt.add({ id: uid('kt'), projectId: p.id, businessUnit: p.businessUnit, process: '', wave: p.wave, globalOwner: p.globalOwner, indiaOwner: p.indiaLead, sessionsPlanned: 6, sessionsDone: 0, status: 'Not Started', signOff: 'Not Started', targetDate: TODAY }) }
  return (
    <Card title="Knowledge transfer items by project" subtitle={`${unit}: ${s.total} items · ${s.signed} completed (signed off) · ${s.pending} pending · ${s.done} of ${s.planned} sessions delivered (${s.pct}%). Status follows the sessions; an item is completed once the global owner signs it off (the KT Tracking tab counts pending = not signed off). Business unit and wave follow the project.`} action={<AddBtn label="Add KT item" onClick={add} />}>
      <UnitPicker tx={tx} counts={(n) => String(kt.items.filter((k) => k.businessUnit === n).length)} />
      <GridToolbar q={q} onQ={setQ} placeholder="Search process, project, owner…" count={rows.length}>
        <select className="input py-1.5 w-auto text-[12.5px]" value={unitProjects.some((p) => p.id === fProject) ? fProject : 'All'} onChange={(e) => setFProject(e.target.value)}><option value="All">All projects of {unit}</option>{unitProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </GridToolbar>
      <Grid count={rows.length} minWidth={1500} headers={['Process / activity', 'Project', 'Wave', 'Global owner', 'India owner', { label: 'Planned', right: true }, { label: 'Done', right: true }, 'Status', 'Sign-off', 'Signed off on', 'Target date', 'Tracker', '']} empty={unitProjects.length ? 'No KT items yet. Use "Add KT item" to create one.' : 'Add a project to this business unit first (Projects tab).'}>
        {rows.map((k) => (
          <Row key={k.id}>
            <Td min={240}><TextCell value={k.process} placeholder="Process or activity" className="font-medium" onChange={(v) => set(k, 'process', v)} /></Td>
            <Td min={200}><select className={clsx(selectCls, 'cursor-pointer max-w-[260px]')} value={k.projectId} onChange={(e) => setProject(k, e.target.value)}>{(unitProjects.some((p) => p.id === k.projectId) ? unitProjects : [...projects.items.filter((p) => p.id === k.projectId), ...unitProjects]).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Td>
            <Td><span className="flex items-center gap-1 px-1"><WaveDot wave={sorted.find((w) => w.number === k.wave)} size={20} /><span className="text-[12px] text-ink-500 whitespace-nowrap">{waveLabel(k.wave)}</span></span></Td>
            <Td min={110}><TextCell value={k.globalOwner} placeholder="Global owner" onChange={(v) => set(k, 'globalOwner', v)} /></Td>
            <Td><SelectCell value={k.indiaOwner} options={OWNERS} onChange={(v) => set(k, 'indiaOwner', v)} /></Td>
            <Td><NumCell value={k.sessionsPlanned} min={0} className="w-[60px]" onChange={(v) => setSessions(k, v, k.sessionsDone)} /></Td>
            <Td><NumCell value={k.sessionsDone} min={0} className="w-[60px]" onChange={(v) => setSessions(k, k.sessionsPlanned, v)} /></Td>
            <Td><SelectCell value={k.status} options={KT_STATUSES} onChange={(v) => set(k, 'status', v)} /></Td>
            <Td><SelectCell value={k.signOff} options={KT_SIGNOFF} onChange={(v) => setSignOff(k, v)} /></Td>
            <Td>{k.signOff === 'Signed' ? <DateCell value={k.signedOffOn ?? ''} onChange={(v) => set(k, 'signedOffOn', v || undefined)} /> : <span className="block text-ink-400 px-2">—</span>}</Td>
            <Td><DateCell value={k.targetDate} onChange={(v) => set(k, 'targetDate', v)} /></Td>
            <Td><span className={clsx('px-1.5 text-[11.5px] font-medium whitespace-nowrap', ktIsCompleted(k) ? 'text-green-700' : k.targetDate < TODAY ? 'text-red-600' : 'text-amber-600')}>{ktIsCompleted(k) ? 'Completed' : k.targetDate < TODAY ? 'Pending · overdue' : 'Pending'}</span></Td>
            <Td sticky><EditBtn onClick={() => open({ kind: 'kt', item: k })} /><RemoveBtn name={k.process || 'this KT item'} onClick={() => kt.remove(k.id)} /></Td>
          </Row>
        ))}
      </Grid>
    </Card>
  )
}

/* ================================================================== */
/* Readiness assessments                                               */
/* ================================================================== */
function AssessmentsTab({ tx }: { tx: Tx }) {
  const { waves, assessments, projects, unit, open } = tx
  const sorted = sortWaves(waves.items)
  const rows = projects.items.filter((p) => p.businessUnit === unit).sort((a, b) => a.wave - b.wave).map((p) => ({ p, a: assessments.items.find((x) => x.projectId === p.id) }))
  const list = rows.map((r) => r.a).filter((a): a is ReadinessAssessment => !!a)
  const setDim = (a: ReadinessAssessment, key: keyof ReadinessAssessment, v: number) => assessments.update({ ...a, [key]: v, assessedOn: TODAY })
  return (
    <Card title="Readiness assessments by project" subtitle="Score each project on the five readiness dimensions (0–100). The overall score is the average of the dimensions and feeds the project table, unit cards and the readiness matrix.">
      <UnitPicker tx={tx} counts={(n) => `${assessments.items.filter((a) => a.businessUnit === n).length}/${projects.items.filter((p) => p.businessUnit === n).length}`} />
      <div className="text-[12.5px] text-ink-700 mb-3">{unit} · {list.length} of {rows.length} projects assessed · average readiness <b>{avgScore(list)}%</b></div>
      <Grid count={rows.length} minWidth={1180} headers={['Project', 'Wave', ...DIMENSIONS.map((d) => ({ label: DIM_SHORT[d], right: true })), { label: 'Score', right: true }, 'Status', 'Next action', '']} empty="Add a project to this business unit first (Projects tab).">
        {rows.map(({ p, a }) => (
          <Row key={p.id}>
            <Td min={200}><span className="block px-1.5 leading-snug"><span className="text-[12.5px] font-medium">{p.name}</span><span className="block text-[10.5px] text-ink-500"><StatusBadge value={p.status} /></span></span></Td>
            <Td><span className="px-1"><WaveDot wave={sorted.find((w) => w.number === p.wave)} size={20} /></span></Td>
            {DIMENSIONS.map((d) => <Td key={d}>{a ? <NumCell value={a[DIM_KEY[d]] ?? 0} min={0} max={100} className="w-[64px]" onChange={(v) => setDim(a, DIM_KEY[d], v)} /> : <span className="block text-right text-ink-400 pr-2">–</span>}</Td>)}
            <Td className="text-right">{a ? <span className="inline-flex items-center justify-center w-12 h-6 rounded-md text-[12px] font-semibold text-white" style={{ background: readinessColor(assessmentScore(a)) }}>{assessmentScore(a)}%</span> : <span className="text-ink-400 pr-2">–</span>}</Td>
            <Td>{a ? <SelectCell value={a.status} options={READINESS_STATUSES} onChange={(v) => assessments.update({ ...a, status: v as ReadinessAssessment['status'] })} /> : null}</Td>
            <Td min={240}>{a ? <TextCell value={a.nextAction} placeholder="Next action" onChange={(v) => assessments.update({ ...a, nextAction: v })} /> : <button className="link px-1.5" onClick={() => assessments.add(blankAssessment(uid('ra'), p))}>+ Assess this project</button>}</Td>
            <Td sticky>{a && <><EditBtn onClick={() => open({ kind: 'assessment', item: a })} /><RemoveBtn name={`the assessment for ${p.name}`} onClick={() => assessments.remove(a.id)} /></>}</Td>
          </Row>
        ))}
        <tr><td className="text-[12px] text-ink-500 px-2 py-2" colSpan={2}>Business unit average</td>{DIMENSIONS.map((d) => <td key={d} className="text-right text-[12.5px] font-semibold px-2 py-2">{dimAverage(list, d)}%</td>)}<td className="text-right text-[12.5px] font-semibold px-2 py-2">{avgScore(list)}%</td><td colSpan={3} /></tr>
      </Grid>
    </Card>
  )
}

/* ================================================================== */
/* Readiness gaps                                                      */
/* ================================================================== */
function GapsTab({ tx }: { tx: Tx }) {
  const { waves, gaps, projects, open } = tx
  const sorted = sortWaves(waves.items)
  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('All')
  const [fUnit, setFUnit] = useState('All')
  const rows = useMemo(() => gaps.items.filter((g) => (fStatus === 'All' || g.status === fStatus) && (fUnit === 'All' || g.businessUnit === fUnit) && (!q || `${g.code} ${g.description} ${g.owner} ${g.businessUnit} ${projectName(projects.items, g.projectId)}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (a.status === 'Resolved' ? 1 : 0) - (b.status === 'Resolved' ? 1 : 0) || b.raised.localeCompare(a.raised)), [gaps.items, projects.items, q, fStatus, fUnit])
  const set = <K extends keyof ReadinessGap>(g: ReadinessGap, k: K, v: ReadinessGap[K]) => gaps.update({ ...g, [k]: v })
  const setProject = (g: ReadinessGap, id: string) => { const p = projects.items.find((x) => x.id === id); if (p) gaps.update({ ...g, projectId: p.id, businessUnit: p.businessUnit, wave: p.wave }) }
  const add = () => { const n = gaps.items.reduce((m, g) => Math.max(m, parseInt(g.code.split('-')[1] ?? '0', 10) || 0), 0) + 1; const p = projects.items.find((x) => fUnit === 'All' || x.businessUnit === fUnit) ?? projects.items[0]; if (!p) return; gaps.add({ id: uid('gap'), code: `G-${String(n).padStart(3, '0')}`, projectId: p.id, businessUnit: p.businessUnit, wave: p.wave, dimension: DIMENSIONS[0], description: '', severity: 'Medium', owner: OWNERS[0], status: 'New', raised: TODAY, due: TODAY }) }
  const count = (s: string) => gaps.items.filter((g) => g.status === s).length
  const sortedProjects = [...projects.items].sort((a, b) => a.businessUnit.localeCompare(b.businessUnit) || a.name.localeCompare(b.name))
  return (
    <Card title="Readiness gaps" subtitle={`${gaps.items.length} gaps · ${count('New')} new · ${count('Open')} open · ${count('Resolved')} resolved. Each gap belongs to a project (business unit and wave follow it). New and resolved counts feed the Readiness Gaps tile.`} action={<AddBtn label="Add gap" onClick={add} />}>
      <GridToolbar q={q} onQ={setQ} placeholder="Search gaps…" count={rows.length}>
        <select className="input py-1.5 w-auto text-[12.5px]" value={fUnit} onChange={(e) => setFUnit(e.target.value)}>{['All', ...tx.unitNames].map((u) => <option key={u} value={u}>{u === 'All' ? 'All business units' : u}</option>)}</select>
        <select className="input py-1.5 w-auto text-[12.5px]" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>{['All', ...GAP_STATUSES].map((s) => <option key={s}>{s}</option>)}</select>
      </GridToolbar>
      <Grid count={rows.length} minWidth={1360} headers={['ID', 'Gap', 'Project', 'Business unit', 'Wave', 'Dimension', 'Severity', 'Owner', 'Status', 'Raised', 'Due', '']}>
        {rows.map((g) => (
          <Row key={g.id} muted={g.status === 'Resolved'}>
            <Td><TextCell value={g.code} className="w-[64px] text-ink-500" onChange={(v) => set(g, 'code', v)} /></Td>
            <Td min={280}><TextCell value={g.description} placeholder="Describe the gap" className="font-medium" onChange={(v) => set(g, 'description', v)} /></Td>
            <Td min={200}><select className={clsx(selectCls, 'cursor-pointer max-w-[240px]')} value={g.projectId} onChange={(e) => setProject(g, e.target.value)}>{sortedProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Td>
            <Td><span className="px-1.5 text-[12px] text-ink-700 whitespace-nowrap">{g.businessUnit}</span></Td>
            <Td><span className="px-1"><WaveDot wave={sorted.find((w) => w.number === g.wave)} size={20} /></span></Td>
            <Td><SelectCell value={g.dimension} options={DIMENSIONS} onChange={(v) => set(g, 'dimension', v)} /></Td>
            <Td><SelectCell value={g.severity} options={SEVERITIES} onChange={(v) => set(g, 'severity', v)} /></Td>
            <Td><SelectCell value={g.owner} options={OWNERS} onChange={(v) => set(g, 'owner', v)} /></Td>
            <Td><SelectCell value={g.status} options={GAP_STATUSES} onChange={(v) => set(g, 'status', v)} /></Td>
            <Td><DateCell value={g.raised} onChange={(v) => set(g, 'raised', v)} /></Td>
            <Td><DateCell value={g.due} onChange={(v) => set(g, 'due', v)} /></Td>
            <Td sticky><EditBtn onClick={() => open({ kind: 'gap', item: g })} /><RemoveBtn name={g.code} onClick={() => gaps.remove(g.id)} /></Td>
          </Row>
        ))}
      </Grid>
    </Card>
  )
}

/* ================================================================== */
/* Stabilization checklist                                             */
/* ================================================================== */
function ChecklistTab({ tx }: { tx: Tx }) {
  const { checklist } = tx
  const done = checklist.items.filter((c) => c.done).length
  const pct = checklist.items.length ? Math.round((done / checklist.items.length) * 100) : 0
  const set = <K extends keyof ChecklistItem>(c: ChecklistItem, k: K, v: ChecklistItem[K]) => checklist.update({ ...c, [k]: v })
  const add = () => checklist.add({ id: uid('chk'), item: '', owner: OWNERS[0], done: false, area: 'Governance' })
  return (
    <Card title="Stabilization checklist" subtitle={`${done} of ${checklist.items.length} items complete → stabilization readiness ${pct}%. Tick an item when it is done; the percentage is the Stabilization Readiness tile.`} action={<AddBtn label="Add item" onClick={add} />}>
      <div className="max-w-[980px]">
        {checklist.items.length === 0 && <p className="text-[12.5px] text-ink-500 italic text-center py-6">No checklist items yet. Use "Add item" to create one.</p>}
        {checklist.items.map((c) => (
          <div key={c.id} className="flex items-center gap-2 border-b border-slate-200 py-0.5 hover:bg-brand-50/40 rounded">
            <button className="cursor-pointer shrink-0 px-1" title={c.done ? 'Mark as not done' : 'Mark as done'} onClick={() => set(c, 'done', !c.done)}>{c.done ? <CheckCircle2 size={18} className="text-green-600" /> : <Circle size={18} className="text-ink-400" />}</button>
            <input className={clsx(cellCls, 'flex-1 min-w-0', c.done ? 'text-ink-500 line-through' : 'font-medium')} value={c.item} placeholder="Checklist item" onChange={(e) => set(c, 'item', e.target.value)} />
            <select className={clsx(selectCls, 'shrink-0 cursor-pointer')} value={c.area} onChange={(e) => set(c, 'area', e.target.value)}>{(AREAS.includes(c.area as (typeof AREAS)[number]) ? AREAS : [c.area, ...AREAS]).map((a) => <option key={a}>{a}</option>)}</select>
            <select className={clsx(selectCls, 'shrink-0 cursor-pointer')} value={c.owner} onChange={(e) => set(c, 'owner', e.target.value)}>{(OWNERS.includes(c.owner as (typeof OWNERS)[number]) ? OWNERS : [c.owner, ...OWNERS]).map((o) => <option key={o}>{o}</option>)}</select>
            <RemoveBtn name={c.item || 'this item'} onClick={() => checklist.remove(c.id)} />
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ================================================================== */
/* Transition milestones (shared 'milestones' collection)              */
/* ================================================================== */
function MilestonesTab({ tx }: { tx: Tx }) {
  const { waves, milestones, msWaves, msProjects, projects, open } = tx
  const sorted = sortWaves(waves.items)
  const rows = useMemo(() => milestones.items.filter((m) => m.phase === 'Transition').map((m) => ({ m, wave: milestoneWave(m, sorted, msWaves.items, projects.items, msProjects.items), projectId: msProjects.items.find((l) => l.id === m.id)?.projectId ?? '' })).sort((a, b) => a.m.dueDate.localeCompare(b.m.dueDate)), [milestones.items, msWaves.items, msProjects.items, projects.items, sorted])
  const set = <K extends keyof Milestone>(m: Milestone, k: K, v: Milestone[K]) => milestones.update({ ...m, [k]: v })
  const add = () => { const id = uid('ms'); milestones.add({ id, name: '', workstream: 'Transition Readiness', dueDate: TODAY, status: 'Not Started', owner: OWNERS[0], phase: 'Transition', critical: false }); msWaves.update({ id, wave: tx.currentWave.number }) }
  const sortedProjects = [...projects.items].sort((a, b) => a.businessUnit.localeCompare(b.businessUnit) || a.name.localeCompare(b.name))
  return (
    <Card title="Transition milestones" subtitle="Milestones in the Transition phase of the shared program milestone list. Link a milestone to a project to show it in the project deep dive; the wave follows the project unless set explicitly." action={<AddBtn label="Add milestone" onClick={add} />}>
      <Grid count={rows.length} minWidth={1200} headers={['Milestone', 'Project (optional)', 'Wave', 'Workstream', 'Target date', 'Status', 'Owner', { label: 'Key', width: '50px' }, '']}>
        {rows.map(({ m, wave, projectId }) => (
          <Row key={m.id}>
            <Td min={280}><TextCell value={m.name} placeholder="Milestone" className="font-medium" onChange={(v) => set(m, 'name', v)} /></Td>
            <Td min={220}><select className={clsx(selectCls, 'cursor-pointer max-w-[260px]')} value={projectId} onChange={(e) => (e.target.value ? msProjects.update({ id: m.id, projectId: e.target.value }) : msProjects.remove(m.id))}><option value="">– none –</option>{sortedProjects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.businessUnit})</option>)}</select></Td>
            <Td><span className="flex items-center gap-1"><WaveDot wave={sorted.find((w) => w.number === wave)} size={20} /><SelectCell value={wave ? String(wave) : '–'} options={['–', ...waveNos(sorted)]} className="w-[56px]" onChange={(v) => (v === '–' ? msWaves.remove(m.id) : msWaves.update({ id: m.id, wave: Number(v) }))} /></span></Td>
            <Td><SelectCell value={m.workstream} options={WORKSTREAMS} onChange={(v) => set(m, 'workstream', v as Milestone['workstream'])} /></Td>
            <Td><DateCell value={m.dueDate} onChange={(v) => set(m, 'dueDate', v)} /></Td>
            <Td><SelectCell value={m.status} options={MS_STATUSES} onChange={(v) => set(m, 'status', v as Milestone['status'])} /></Td>
            <Td><SelectCell value={m.owner} options={OWNERS} onChange={(v) => set(m, 'owner', v)} /></Td>
            <Td><CheckCell value={!!m.critical} title="Key milestone (shown on the Dashboard)" onChange={(v) => set(m, 'critical', v)} /></Td>
            <Td sticky><EditBtn onClick={() => open({ kind: 'milestone', item: m, wave, projectId: projectId || undefined })} /><RemoveBtn name={m.name || 'this milestone'} onClick={() => { milestones.remove(m.id); msWaves.remove(m.id); msProjects.remove(m.id) }} /></Td>
          </Row>
        ))}
      </Grid>
    </Card>
  )
}

/* ================================================================== */
/* Settings                                                            */
/* ================================================================== */
function SettingsTab({ tx, onSave }: { tx: Tx; onSave: (s: TransitionSettings) => void }) {
  const { settings, waves, projects, kt, assessments, gaps, checklist } = tx
  const sorted = sortWaves(waves.items)
  const [f, setF] = useState<TransitionSettings>(settings)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(settings)
  const num = (v: string) => (v === '' ? 0 : Number(v))
  const save = () => { onSave(f); setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const arr = (key: 'trendPlanned' | 'trendActual', i: number, v: number) => setF({ ...f, [key]: f[key].map((x, j) => (j === i ? v : x)) })
  const done = checklist.items.filter((c) => c.done).length
  return (
    <div className="grid grid-cols-[1.1fr_1fr] gap-4">
      <Card title="Headline KPIs and go-live" subtitle="Numbers that cannot be derived from the registers: month-on-month deltas, the go-live wave and status, and the readiness threshold.">
        <FormGrid cols={3}>
          <Field label="Go-live wave"><Select options={waveNos(sorted)} value={String(f.goLiveWave)} onChange={(e) => setF({ ...f, goLiveWave: Number(e.target.value) })} /></Field>
          <Field label="Go-live status"><Select options={['On track', 'At risk', 'Delayed']} value={f.goLiveStatus} onChange={(e) => setF({ ...f, goLiveStatus: e.target.value as TransitionSettings['goLiveStatus'] })} /></Field>
          <Field label="Readiness 'complete' threshold (%)"><Input type="number" min={0} max={100} value={f.readinessThreshold} onChange={(e) => setF({ ...f, readinessThreshold: num(e.target.value) })} /></Field>
          <Field label="KT change vs last month (%)"><Input type="number" value={f.ktDeltaPct} onChange={(e) => setF({ ...f, ktDeltaPct: num(e.target.value) })} /></Field>
          <Field label="Stabilization change vs last month (%)"><Input type="number" value={f.stabilizationDeltaPct} onChange={(e) => setF({ ...f, stabilizationDeltaPct: num(e.target.value) })} /></Field>
        </FormGrid>
        <h4 className="text-[13px] font-semibold mt-4 mb-2">Transition milestone trend (% complete)</h4>
        <table className="w-full tbl text-[12.5px]">
          <thead><tr><th className="th">Month</th>{f.trendMonths.map((m) => <th key={m} className="th">{m}</th>)}</tr></thead>
          <tbody>
            <tr><td className="td">Planned</td>{f.trendPlanned.map((v, i) => <td key={i} className="td"><Input type="number" min={0} max={100} value={v} onChange={(e) => arr('trendPlanned', i, num(e.target.value))} /></td>)}</tr>
            <tr><td className="td">Actual</td>{f.trendActual.map((v, i) => <td key={i} className="td"><Input type="number" min={0} max={100} value={v} onChange={(e) => arr('trendActual', i, num(e.target.value))} /></td>)}</tr>
          </tbody>
        </table>
        <SaveBar dirty={dirty} saved={saved} onSave={save} onDiscard={() => setF(settings)} />
      </Card>
      <Card title="Derived headline numbers" subtitle="These come straight from the registers – change the projects, KT items, assessments, gaps and checklist to move them.">
        <div className="space-y-1">
          {[
            ['Transition projects', `${projects.items.length} across ${tx.unitNames.length} business units · ${new Set(projects.items.map((p) => p.capability)).size} capabilities`],
            ['Accounts onboarded', `${accountStats(tx.accounts.items).onboarded} of ${tx.accounts.items.length} (${accountStats(tx.accounts.items).live} live · ${accountStats(tx.accounts.items).inKt} in KT)`],
            ['KT items completed / pending', `${ktStats(kt.items).signed} / ${ktStats(kt.items).pending} (${ktStats(kt.items).overdue} overdue)`],
            ['Knowledge transfer (all waves)', `${ktStats(kt.items).pct}% – ${ktStats(kt.items).done} of ${ktStats(kt.items).planned} sessions`],
            ['Readiness (all projects)', `${avgScore(assessments.items)}% average`],
            ['Readiness gaps', `${gaps.items.length} (${gaps.items.filter((g) => g.status === 'New').length} new · ${gaps.items.filter((g) => g.status === 'Resolved').length} resolved)`],
            ['Stabilization readiness', `${checklist.items.length ? Math.round((done / checklist.items.length) * 100) : 0}% (${done} of ${checklist.items.length} items)`],
            ['Wave progress', sorted.map((w) => `W${w.number} ${waveProgress(w, projects.items)}%`).join(' · ')],
          ].map(([l, v]) => <div key={l} className="flex items-center justify-between text-[12.5px] py-1.5 border-b border-line/70 last:border-b-0"><span className="text-ink-500">{l}</span><span className="font-medium text-ink-900 text-right">{v}</span></div>)}
        </div>
        <div className="flex items-center justify-between text-[12.5px] mt-4 pt-3 border-t border-line"><span className="text-ink-500">Program readiness vs threshold</span><Badge value={avgScore(assessments.items.filter((a) => sorted.filter((w) => w.startDate <= TODAY).some((w) => w.number === a.wave))) >= f.readinessThreshold ? 'On Track' : 'At Risk'} /></div>
      </Card>
    </div>
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

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */
export function TransitionInput({ tx, onSaveSettings }: { tx: Tx; onSaveSettings: (s: TransitionSettings) => void }) {
  return (
    <InputLayout title="Transition Management" subtitle="Maintain the transition projects of each business unit and capability, the accounts they onboard, their knowledge transfer items, readiness scores and gaps, the waves and the stabilization checklist that drive the transition dashboards."
      tabs={[
        { name: 'Projects by business unit', content: <ProjectsTab tx={tx} /> },
        { name: 'Accounts', content: <AccountsInputTab tx={tx} /> },
        { name: 'Knowledge transfer items', content: <KtTab tx={tx} /> },
        { name: 'Readiness assessments', content: <AssessmentsTab tx={tx} /> },
        { name: 'Readiness gaps', content: <GapsTab tx={tx} /> },
        { name: 'Stabilization checklist', content: <ChecklistTab tx={tx} /> },
        { name: 'Waves', content: <WavesTab tx={tx} /> },
        { name: 'Transition milestones', content: <MilestonesTab tx={tx} /> },
        { name: 'Settings', content: <SettingsTab tx={tx} onSave={onSaveSettings} /> },
      ]} />
  )
}
