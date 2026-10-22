/**
 * Transition Overview – business units and the projects under them are the base of the page.
 * 1. business-unit selector (cards + dropdown), 2. deep dive for the selected unit (header strip, projects table with
 * drill-down links, KT / readiness / timeline / go-live charts), 3. program-wide context cards from the mock-up.
 */
import { useMemo, type ReactNode } from 'react'
import clsx from 'clsx'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Users, GitBranch, Database, Building2, ShieldCheck, FileText, ClipboardCheck, AlertTriangle, BookOpen, ChevronRight, Plus, Rocket, Boxes, MapPin } from 'lucide-react'
import { Card, Badge, Progress, Table, ViewAll, Legend, EmptyNote } from '../ui'
import { tooltipStyle } from '../charts'
import { CHART_COLORS, SERIES, TODAY } from '../../data/common'
import type { RaidItem } from '../../data/shared'
import { isOpen } from '../../data/shared'
import { subUnitsOf, subY1 } from '../../data/businessUnits'
import {
  ktStats, projectKt, unitKt, projectReadiness, avgScore, assessmentScore, dimAverage, isTransitionRaid, raidLabel, raidLink, TRANSITION_RAID_LABELS, waveProgressColor, waveScope, waveCapabilities, waveProjects, waveProgress, waveHasStarted, waveGoLive, nextGoLive, isInTransition, projectStatusColor, readinessColor, fmtD, fmtLong, DIMENSIONS, TIMELINE_START, TIMELINE_END,
  projectAccounts, unitAccounts, accountStatusColor, ACCOUNT_STATUSES,
  type Wave, type KtItem, type Dimension, type TransitionProject, type ReadinessAssessment, type TransitionAccount,
} from '../../data/transition'
import type { Tx } from './types'

/** Compact table styling for the dense overview cards (mock-up uses ~11.5px cells). */
export const TIGHT = '[&_.td]:px-1! [&_.th]:px-1! [&_.td]:py-1.5! [&_.td]:text-[11.5px]! [&_.th]:text-[11px]! [&_td_.rounded-md]:px-1! [&_td_.rounded-md]:text-[11px]!'

export const DIM_ICON: Record<Dimension, ReactNode> = {
  'People & Organization': <Users size={15} />, 'Process & Governance': <GitBranch size={15} />, 'Technology & Data': <Database size={15} />,
  'Facilities & Infrastructure': <Building2 size={15} />, 'Controls & Compliance': <ShieldCheck size={15} />,
}

export function WaveDot({ wave, size = 26 }: { wave?: Wave; size?: number }) {
  if (!wave) return <span className="text-ink-500">–</span>
  return <span className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0" style={{ width: size, height: size, background: wave.color, fontSize: size * 0.46 }}>{wave.number}</span>
}

/** Status badge that also knows the project-only "Stabilizing" state. */
export function StatusBadge({ value }: { value: string }) {
  return <Badge value={value} className={value === 'Stabilizing' ? 'bg-violet-50 text-violet-700' : undefined} />
}

/** Blue project name that opens the project drill-down (stops the row's own click). */
export function ProjectLink({ project, onClick, className }: { project: TransitionProject; onClick: () => void; className?: string }) {
  return <button type="button" className={clsx('text-brand-600 font-medium hover:underline cursor-pointer text-left', className)} onClick={(e) => { e.stopPropagation(); onClick() }}>{project.name}</button>
}

export const sortWaves = (w: Wave[]) => [...w].sort((a, b) => a.number - b.number)
export const unitColor = (unitNames: string[], unit: string) => SERIES[Math.max(0, unitNames.indexOf(unit)) % SERIES.length]
/** Assessments of projects whose wave has started – the program-wide readiness population. */
export function activeAssessments(tx: Tx): ReadinessAssessment[] {
  const started = tx.waves.items.filter((w) => waveHasStarted(w)).map((w) => w.number)
  return tx.assessments.items.filter((a) => started.includes(a.wave))
}

export function ktByWave(waves: Wave[], kt: KtItem[]) {
  return waves.map((w) => {
    const s = ktStats(kt.filter((k) => k.wave === w.number))
    const share = (n: number) => (s.total ? +((s.pct * n) / s.total).toFixed(1) : 0)
    return { wave: w, name: `Wave ${w.number}`, label: s.pct, 'Not Started': share(s.notStarted), 'In Progress': share(s.inProgress), Completed: share(s.completed), ...s }
  })
}

function Mini({ label, value, sub, tone = 'text-ink-900' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 min-w-0">
      <div className="text-[11px] text-ink-500 truncate">{label}</div>
      <div className={`text-[18px] font-bold leading-tight mt-0.5 ${tone}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-500 mt-0.5 truncate">{sub}</div>}
    </div>
  )
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */
export default function Overview({ tx }: { tx: Tx }) {
  return (
    <div className="space-y-4">
      <UnitSelector tx={tx} />
      <UnitDeepDive tx={tx} />
      <ProgramCards tx={tx} />
    </div>
  )
}

/* ================================================================== */
/* 1. Business unit selector                                           */
/* ================================================================== */
export function UnitSelector({ tx, subtitle = 'Pick a business unit to see its transition projects, knowledge transfer, readiness and go-lives.' }: { tx: Tx; subtitle?: string }) {
  const { units, unitNames, subs, projects, accounts, kt, assessments, unit, setUnit } = tx
  const cards = useMemo(() => unitNames.map((name) => {
    const ps = projects.items.filter((p) => p.businessUnit === name)
    const u = units.find((b) => b.name === name)
    const caps = u ? subUnitsOf(subs.items, u.id).length : 0
    const ra = assessments.items.filter((a) => ps.some((p) => p.id === a.projectId))
    const acc = unitAccounts(name, accounts.items)
    return { name, kind: u ? `${caps} capabilit${caps === 1 ? 'y' : 'ies'} · ${u.y1} Pune HC` : '', color: unitColor(unitNames, name), projects: ps.length, inTransition: ps.filter(isInTransition).length, completed: ps.filter((p) => p.status === 'Completed').length, kt: unitKt(name, kt.items).pct, readiness: avgScore(ra), next: nextGoLive(ps), acc }
  }), [unitNames, units, subs.items, projects.items, accounts.items, kt.items, assessments.items])
  return (
    <Card title="Transition by business unit" subtitle={subtitle} headerRight={
      <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 min-w-[300px] cursor-pointer">
        <Building2 size={16} className="text-brand-600" />
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className="flex-1 bg-transparent outline-none text-[13.5px] font-semibold text-ink-900 cursor-pointer">
          {unitNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>}>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(cards.length, 1), 7)}, minmax(0, 1fr))` }}>
        {cards.map((c) => (
          <button key={c.name} onClick={() => setUnit(c.name)} className={clsx('text-left rounded-lg border px-3 py-2.5 cursor-pointer transition-colors min-w-0', c.name === unit ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line bg-white hover:bg-surface')}>
            <div className="flex items-center gap-1.5 mb-1"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} /><span className="text-[12.5px] font-semibold text-ink-900 truncate" title={c.name}>{c.name}</span></div>
            <div className="text-[10.5px] text-ink-500 truncate">{c.kind}</div>
            <div className="mt-1.5 text-[20px] font-bold text-navy-900 leading-none">{c.projects}<span className="text-[11px] font-medium text-ink-500"> project{c.projects === 1 ? '' : 's'}</span></div>
            <div className="text-[10.5px] text-ink-500">{c.inTransition} in transition · {c.completed} completed</div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[10.5px] whitespace-nowrap"><span className="text-green-600">KT {c.kt}%</span><span className="text-ink-400">·</span><span className={c.readiness >= 65 ? 'text-brand-600' : 'text-amber-600'}>ready {c.readiness}%</span></div>
            <div className="text-[10.5px] text-teal-700 truncate">accounts onboarded {c.acc.onboarded} / {c.acc.total}</div>
            <div className="text-[10.5px] text-ink-500 truncate">{c.next ? `go-live ${fmtD(c.next)}` : 'no go-live pending'}</div>
          </button>
        ))}
      </div>
    </Card>
  )
}

/* ================================================================== */
/* 2. Selected business unit deep dive                                 */
/* ================================================================== */
function UnitDeepDive({ tx }: { tx: Tx }) {
  const { units, subs, projects, accounts, waves, kt, assessments, gaps, raid, raidLinks, unit, open, openProject, setTab } = tx
  const u = units.find((b) => b.name === unit)
  const caps = u ? subUnitsOf(subs.items, u.id) : []
  const sorted = sortWaves(waves.items)
  const ps = useMemo(() => projects.items.filter((p) => p.businessUnit === unit).sort((a, b) => a.wave - b.wave || a.goLiveDate.localeCompare(b.goLiveDate)), [projects.items, unit])
  const ra = useMemo(() => assessments.items.filter((a) => ps.some((p) => p.id === a.projectId)), [assessments.items, ps])
  const ks = unitKt(unit, kt.items)
  const openGaps = gaps.items.filter((g) => g.businessUnit === unit && g.status !== 'Resolved').length
  const risks = raid.items.filter((r) => raidLink(r, raidLinks.items)?.businessUnit === unit).filter(isOpen)
  const next = nextGoLive(ps)
  const waveOf = (n: number) => sorted.find((w) => w.number === n)
  const unitAcc = accounts.items.filter((a) => a.businessUnit === unit)
  const acc = unitAccounts(unit, accounts.items)
  const accRows = ps.map((p) => { const row: Record<string, string | number> = { name: p.name, id: p.id }; ACCOUNT_STATUSES.forEach((s) => { row[s] = unitAcc.filter((a) => a.projectId === p.id && a.status === s).length }); return row })
  const accList = [...unitAcc].sort((a, b) => ACCOUNT_STATUSES.indexOf(a.status) - ACCOUNT_STATUSES.indexOf(b.status) || a.plannedDate.localeCompare(b.plannedDate))

  const ktRows = ps.map((p) => { const s = projectKt(p, kt.items); return { name: p.name, Done: s.done, Remaining: Math.max(0, s.planned - s.done), pct: s.pct, planned: s.planned } })
  const goLives = ps.filter((p) => p.status !== 'Completed').sort((a, b) => a.goLiveDate.localeCompare(b.goLiveDate))

  return (
    <>
      {/* header strip */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><h3 className="text-[18px] font-bold text-navy-900">{unit}</h3>{u && <Badge value={u.status} />}{u && <span className="text-[11.5px] text-ink-500">{u.kind} · owner {u.owner} · {caps.length} capabilities · {u.y1} Pune HC by end of year 1</span>}</div>
            {u?.description && <p className="text-[12.5px] text-ink-700 mt-0.5 max-w-3xl">{u.description}</p>}
            {caps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {caps.map((c) => { const cp = ps.filter((p) => p.subUnitId === c.id); return (
                  <span key={c.id} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2 py-1 text-[11px] text-ink-700" title={`${c.name} · GBU ${c.gbuServed} · ${c.geography} · from ${c.deliveryLocation} · ${c.transitionType} · ${c.wave} · ${c.currentHc} → ${subY1(c)} Pune HC`}>
                    <WaveDot wave={waveOf(Number(c.wave.replace('Wave ', '')))} size={14} /><span className="font-medium text-ink-900">{c.name}</span><span className="text-ink-400">·</span><MapPin size={10} className="text-ink-400" />{c.deliveryLocation}<span className="text-ink-400">·</span>{subY1(c)} HC{cp.length > 0 && <><span className="text-ink-400">·</span><span style={{ color: projectStatusColor(cp[0].status) }}>{cp.length === 1 ? cp[0].status : `${cp.length} projects`}</span></>}
                  </span>) })}
              </div>
            )}
          </div>
          <button className="btn-primary" onClick={() => open({ kind: 'project', item: null, businessUnit: unit })}><Plus size={14} /> Add project</button>
        </div>
        <div className="grid grid-cols-8 gap-3 mt-3">
          <Mini label="Projects" value={ps.length} sub={`${ps.reduce((s, p) => s + p.ftes, 0)} target Pune FTEs`} />
          <Mini label="In transition" value={ps.filter(isInTransition).length} sub={`${ps.filter((p) => p.status === 'Completed').length} completed · ${ps.filter((p) => p.status === 'Not Started').length} not started`} tone="text-brand-600" />
          <Mini label="Accounts onboarded" value={<>{acc.onboarded} <span className="text-[12px] text-ink-500">/ {acc.total}</span></>} sub={`${acc.live} live · ${acc.inKt} in KT · ${acc.planned} planned`} tone="text-teal-700" />
          <Mini label="Knowledge transfer" value={`${ks.pct}%`} sub={`${ks.done} / ${ks.planned} sessions`} tone="text-green-600" />
          <Mini label="Readiness" value={`${avgScore(ra)}%`} sub={`${ra.filter((a) => assessmentScore(a) >= tx.settings.readinessThreshold).length} of ${ra.length} projects ready`} tone={avgScore(ra) >= 65 ? 'text-brand-600' : 'text-amber-600'} />
          <Mini label="Open gaps" value={openGaps} sub={`${gaps.items.filter((g) => g.businessUnit === unit && g.status === 'Resolved').length} resolved`} tone={openGaps ? 'text-amber-600' : 'text-green-600'} />
          <Mini label="Open risks & issues" value={risks.length} sub={`${risks.filter((r) => r.level === 'Critical' || r.level === 'High').length} critical / high`} tone={risks.length ? 'text-red-600' : 'text-green-600'} />
          <Mini label="Next go-live" value={next ? fmtD(next) : '—'} sub={next ? ps.find((p) => p.goLiveDate === next && p.status !== 'Completed')?.name : 'nothing pending'} />
        </div>
      </Card>

      {/* projects table */}
      <Card title={`Transition projects – ${unit}`} subtitle={`${ps.length} projects · click a project name for the deep dive (KT items, readiness, gaps, milestones, risks)`}>
        <Table<TransitionProject> compact rows={ps} onRowClick={(p) => openProject(p.id)} empty="No transition projects for this business unit yet. Use “Add project” to create one." columns={[
          { key: 'name', header: 'Project', render: (p) => <span className="block min-w-[190px]"><ProjectLink project={p} onClick={() => openProject(p.id)} /><span className="block text-[11px] text-ink-500 truncate max-w-[260px]" title={p.scopeSummary}>{p.scopeSummary}</span></span> },
          { key: 'capability', header: 'Capability', render: (p) => <span className="block leading-snug text-[12px] min-w-[120px]"><span className="text-ink-900">{p.capability || '—'}</span><span className="block text-[10.5px] text-ink-500 whitespace-nowrap">from {p.deliveryLocation} · {p.gbu}</span></span> },
          { key: 'wave', header: 'Wave', render: (p) => <WaveDot wave={waveOf(p.wave)} size={22} /> },
          { key: 'status', header: 'Status', render: (p) => <StatusBadge value={p.status} /> },
          { key: 'progress', header: 'Progress', width: '120px', render: (p) => <span className="flex items-center gap-1.5"><Progress value={p.progress} color={projectStatusColor(p.status)} className="w-[64px]" /><span className="text-[12px] font-medium w-8 text-right">{p.progress}%</span></span> },
          { key: 'accounts', header: 'Accounts', className: 'whitespace-nowrap', render: (p) => { const a = projectAccounts(p, accounts.items); return <span className="text-[12px]" title={`${a.live} live · ${a.onboardedOnly} onboarded · ${a.inKt} in KT · ${a.planned} planned · ${a.onHold} on hold`}><b className="text-teal-700">{a.onboarded}</b> / {a.total}<span className="block text-[10.5px] text-ink-500">onboarded</span></span> } },
          { key: 'kt', header: 'KT %', className: 'text-right', render: (p) => { const s = projectKt(p, kt.items); return <span className="font-medium" title={`${s.done} / ${s.planned} sessions · ${s.signed} of ${s.total} items signed off`}>{s.pct}%</span> } },
          { key: 'readiness', header: 'Readiness', render: (p) => { const s = projectReadiness(p, assessments.items); return <span className="inline-flex items-center justify-center w-11 h-5.5 rounded-md text-[11.5px] font-semibold text-white" style={{ background: readinessColor(s) }}>{s}%</span> } },
          { key: 'goLiveDate', header: 'Go-live', className: 'whitespace-nowrap', render: (p) => <span className={p.goLiveDate < TODAY && !['Completed', 'Stabilizing'].includes(p.status) ? 'text-red-600 font-medium' : ''}>{fmtD(p.goLiveDate)}</span> },
          { key: 'globalOwner', header: 'Global owner', className: 'whitespace-nowrap' },
          { key: 'indiaLead', header: 'India lead', className: 'whitespace-nowrap' },
          { key: 'ftes', header: 'FTEs', className: 'text-right' },
          { key: 'c', header: '', render: () => <ChevronRight size={14} className="text-ink-400" /> },
        ]} />
      </Card>

      {/* accounts */}
      <div className="grid grid-cols-[1fr_1.3fr] gap-4">
        <Card title={`Accounts onboarded by project – ${unit}`} subtitle={`${acc.onboarded} of ${acc.total} accounts onboarded (${acc.pct}%) · applications, services, business entities and platforms moving through the projects`} action={<ViewAll label="Accounts register" onClick={() => setTab('Accounts')} />}>
          {accRows.length ? (
            <>
              <Legend items={ACCOUNT_STATUSES.map((s) => ({ label: s, color: accountStatusColor[s] }))} />
              <div style={{ height: Math.max(120, accRows.length * 40 + 24) }} className="mt-1">
                <ResponsiveContainer>
                  <BarChart data={accRows} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10.5 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={160} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v, n) => [`${v} account${v === 1 ? '' : 's'}`, String(n)]} />
                    {ACCOUNT_STATUSES.map((s, i) => <Bar key={s} isAnimationActive={false} dataKey={s} stackId="a" fill={accountStatusColor[s]} radius={i === ACCOUNT_STATUSES.length - 1 ? [0, 3, 3, 0] : undefined} />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : <EmptyNote>No projects yet.</EmptyNote>}
        </Card>
        <Card title={`Accounts – ${unit}`} subtitle="Click an account to edit it, or the project for its deep dive" action={<button className="btn-secondary" onClick={() => open({ kind: 'account', item: null, businessUnit: unit })}><Plus size={13} /> Add account</button>}>
          <div className={clsx(TIGHT, 'max-h-[300px] overflow-y-auto scroll-thin')}><Table<TransitionAccount> compact rows={accList} onRowClick={(a) => open({ kind: 'account', item: a })} empty="No accounts logged for this business unit yet." columns={[
            { key: 'name', header: 'Account', render: (a) => <span className="block leading-snug min-w-[180px]"><span className="font-medium">{a.name}</span><span className="block text-[10.5px] text-ink-500">{a.type} · {a.gbu} · {a.geography}</span></span> },
            { key: 'project', header: 'Project', render: (a) => { const p = ps.find((x) => x.id === a.projectId); return p ? <ProjectLink project={p} onClick={() => openProject(p.id)} className="text-[11.5px]" /> : <span className="text-ink-400">–</span> } },
            { key: 'status', header: 'Status', render: (a) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px]"><span className="w-2 h-2 rounded-full" style={{ background: accountStatusColor[a.status] }} />{a.status}</span> },
            { key: 'date', header: 'Planned / onboarded', className: 'whitespace-nowrap', render: (a) => <span className="text-[11.5px]">{a.onboardedDate ? fmtD(a.onboardedDate) : <span className={a.plannedDate < TODAY && a.status !== 'On hold' ? 'text-red-600' : ''}>{fmtD(a.plannedDate)}</span>}</span> },
          ]} /></div>
        </Card>
      </div>

      {/* charts */}
      <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-4">
        <Card title="Knowledge transfer by project" subtitle="Sessions delivered vs remaining">
          {ktRows.length ? (
            <>
              <Legend items={[{ label: 'Delivered', color: CHART_COLORS.green }, { label: 'Remaining', color: CHART_COLORS.blueFaint }]} />
              <div style={{ height: Math.max(120, ktRows.length * 44 + 24) }} className="mt-1">
                <ResponsiveContainer>
                  <BarChart data={ktRows} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10.5 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v, n) => [`${v} sessions`, String(n)]} />
                    <Bar isAnimationActive={false} dataKey="Done" stackId="a" fill={CHART_COLORS.green} />
                    <Bar isAnimationActive={false} dataKey="Remaining" stackId="a" fill={CHART_COLORS.blueFaint} radius={[0, 3, 3, 0]}>
                      <LabelList dataKey="pct" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : <EmptyNote>No projects yet.</EmptyNote>}
        </Card>
        <Card title="Readiness by dimension" subtitle={`Average across ${ra.length} assessed project${ra.length === 1 ? '' : 's'}`}>
          <div className="space-y-3 pt-0.5">
            {DIMENSIONS.map((d) => { const v = dimAverage(ra, d); return (
              <div key={d} className="flex items-center gap-2.5 text-[12.5px]">
                <span className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{DIM_ICON[d]}</span>
                <span className="w-[150px] text-[12px] text-ink-700 truncate" title={d}>{d}</span>
                <span className="w-9 text-right font-semibold text-ink-900">{v}%</span>
                <Progress value={v} className="flex-1" color={readinessColor(v)} />
              </div>) })}
          </div>
          <div className="mt-3 pt-2 border-t border-line text-[12px] text-ink-500 flex items-center justify-between"><span>Unit readiness score</span><span className="text-[15px] font-bold" style={{ color: readinessColor(avgScore(ra)) }}>{avgScore(ra)}%</span></div>
        </Card>
        <Card title="Upcoming go-lives" subtitle="Projects of this business unit by go-live date">
          {goLives.length ? (
            <div className="space-y-1.5">
              {goLives.map((p) => (
                <button key={p.id} onClick={() => openProject(p.id)} className="w-full flex items-center gap-2.5 rounded-lg border border-line px-2.5 py-2 text-left hover:bg-brand-50/50 cursor-pointer">
                  <span className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', p.goLiveDate < TODAY ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600')}><Rocket size={15} /></span>
                  <span className="flex-1 min-w-0"><span className="block text-[12.5px] font-medium text-ink-900 truncate">{p.name}</span><span className="block text-[11px] text-ink-500">Wave {p.wave} · {p.status} · {p.progress}%</span></span>
                  <span className={clsx('text-[12px] font-semibold whitespace-nowrap', p.goLiveDate < TODAY ? 'text-red-600' : 'text-ink-900')}>{fmtD(p.goLiveDate)}</span>
                </button>
              ))}
            </div>
          ) : <EmptyNote>All projects of this unit are live.</EmptyNote>}
        </Card>
      </div>

      <Card title={`Project timeline – ${unit}`} subtitle="Bars show project duration across the waves; darker overlay shows progress, the flag marks go-live">
        <GanttRows rows={ps.map((p) => ({ id: p.id, label: p.name, start: p.startDate, end: p.endDate, color: waveOf(p.wave)?.color ?? '#94A3B8', progress: p.progress, marker: p.goLiveDate, title: `${p.name} · Wave ${p.wave} · ${fmtD(p.startDate)} – ${fmtD(p.endDate)} · go-live ${fmtD(p.goLiveDate)}`, onClick: () => openProject(p.id) }))} labelWidth={190} />
      </Card>
    </>
  )
}

/* ================================================================== */
/* 3. Program-wide context cards                                       */
/* ================================================================== */
function ProgramCards({ tx }: { tx: Tx }) {
  const { waves, kt, projects, raid, raidLinks, settings, open, setTab, setUnit, openProject } = tx
  const sortedWaves = useMemo(() => sortWaves(waves.items), [waves.items])
  const ktData = useMemo(() => ktByWave(sortedWaves, kt.items), [sortedWaves, kt.items])
  const active = activeAssessments(tx)

  const keyRisks = useMemo(() => {
    const openItems = raid.items.filter((r) => isTransitionRaid(r, raidLinks.items)).filter(isOpen)
    const order = Object.keys(TRANSITION_RAID_LABELS)
    const pinned = order.map((c) => openItems.find((r) => r.code === c)).filter((r): r is RaidItem => !!r)
    const rest = openItems.filter((r) => !order.includes(r.code)).sort((a, b) => b.impactScore - a.impactScore)
    return [...pinned, ...rest].slice(0, 5)
  }, [raid.items, raidLinks.items])

  const trend = settings.trendMonths.map((m, i) => ({ month: m, Planned: settings.trendPlanned[i] ?? 0, Actual: settings.trendActual[i] ?? 0 }))

  return (
    <>
      <div className="flex items-center gap-2 pt-1"><span className="text-[13px] font-semibold text-ink-900">Program-wide transition context</span><span className="text-[12px] text-ink-500">· all business units</span></div>
      <div className="grid grid-cols-[1.65fr_0.85fr_1fr] gap-4">
        <Card title="Transition Waves" subtitle="Scope = business units with projects in the wave" action={<ViewAll label="View Plan" onClick={() => setTab('Wave Plan')} />}>
          <div className={TIGHT}><Table<Wave> compact rows={sortedWaves} onRowClick={(w) => open({ kind: 'wave', item: w })} columns={[
            { key: 'number', header: 'Wave', render: (w) => <WaveDot wave={w} /> },
            { key: 'scope', header: 'Scope (business units · capabilities)', render: (w) => <span className="block max-w-[250px] leading-snug" title={waveCapabilities(w, projects.items).join(', ')}>{waveScope(w, projects.items) || <span className="text-ink-400">no projects</span>}{waveCapabilities(w, projects.items).length > 0 && <span className="block text-[10.5px] text-ink-500">{waveCapabilities(w, projects.items).length} capabilities · {waveProjects(w, projects.items).reduce((s, p) => s + p.ftes, 0)} FTEs</span>}</span> },
            { key: 'startDate', header: 'Start Date', render: (w) => <span className="whitespace-nowrap">{fmtD(w.startDate)}</span> },
            { key: 'endDate', header: 'End Date', render: (w) => <span className="whitespace-nowrap">{fmtD(w.endDate)}</span> },
            { key: 'status', header: 'Status', render: (w) => <Badge value={w.status} /> },
            { key: 'progress', header: 'Progress', width: '92px', render: (w) => { const p = waveProgress(w, projects.items); return <span className="flex items-center gap-1.5"><Progress value={p} color={waveProgressColor(w)} className="w-[48px]" /><span className="font-medium w-7 text-right">{p}%</span></span> } },
          ]} /></div>
        </Card>

        <Card title={<span className="whitespace-nowrap">Knowledge Transfer Completion</span>} subtitle="By wave">
          <Legend items={[{ label: 'Completed', color: CHART_COLORS.green }, { label: 'In Progress', color: CHART_COLORS.blueLight }, { label: 'Not Started', color: CHART_COLORS.blueFaint }]} />
          <div className="h-[196px] mt-2">
            <ResponsiveContainer>
              <BarChart data={ktData} margin={{ top: 18, right: 4, left: -4, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10.5 }} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10.5 }} width={42} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v, n, p) => { const d = p.payload as (typeof ktData)[number]; const c = n === 'Completed' ? d.completed : n === 'In Progress' ? d.inProgress : d.notStarted; return [`${c} item${c === 1 ? '' : 's'} (${v}%)`, String(n)] }} labelFormatter={(l, p) => { const d = p?.[0]?.payload as (typeof ktData)[number] | undefined; return d ? `${l} – ${d.label}% complete (${d.done}/${d.planned} sessions)` : String(l) }} />
                <Bar isAnimationActive={false} dataKey="Not Started" stackId="a" fill={CHART_COLORS.blueFaint} />
                <Bar isAnimationActive={false} dataKey="In Progress" stackId="a" fill={CHART_COLORS.blueLight} />
                <Bar isAnimationActive={false} dataKey="Completed" stackId="a" fill={CHART_COLORS.green} radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="label" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 11.5, fill: '#111827', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={<span className="whitespace-nowrap text-[14px]">Transition Readiness by Dimension</span>} subtitle={`Projects in started waves (${active.length})`} action={<ViewAll label="View Details" onClick={() => setTab('Readiness & Stabilization')} />}>
          <div className="space-y-3 pt-0.5">
            {DIMENSIONS.map((d) => {
              const v = dimAverage(active, d)
              return (
                <div key={d} className="flex items-center gap-2.5 text-[12.5px]">
                  <span className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{DIM_ICON[d]}</span>
                  <span className="w-[148px] text-[12px] text-ink-700 truncate">{d}</span>
                  <span className="w-9 text-right font-semibold text-ink-900">{v}%</span>
                  <Progress value={v} className="flex-1" color={v >= 65 ? '#16A34A' : '#F59E0B'} />
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[0.95fr_1.4fr_1.05fr] gap-4">
        <Card title="Transition Milestone Trend" action={<ViewAll label="View Details" onClick={() => setTab('Reports')} />}>
          <div className="flex justify-end"><Legend items={[{ label: 'Planned', color: '#9CA3AF', dashed: true }, { label: 'Actual', color: CHART_COLORS.blue }]} /></div>
          <div className="h-[200px] mt-1">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 16, right: 18, left: -22, bottom: 0 }}>
                <CartesianGrid />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11.5 }} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11 }} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`]} />
                <Line isAnimationActive={false} type="linear" dataKey="Planned" stroke="#9CA3AF" strokeDasharray="4 4" strokeWidth={1.5} dot={{ r: 3, fill: '#9CA3AF', strokeWidth: 0 }} />
                <Line isAnimationActive={false} type="linear" dataKey="Actual" stroke={CHART_COLORS.blue} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.blue, strokeWidth: 0 }}>
                  <LabelList dataKey="Actual" position="top" offset={8} formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Key Risks & Issues" subtitle="Open transition risks and issues by business unit / project" action={<ViewAll onClick={() => setTab('Risks & Issues')} />}>
          <div className={TIGHT}><Table<RaidItem> compact rows={keyRisks} onRowClick={(r) => open({ kind: 'raid', item: r })} columns={[
            { key: 'title', header: 'Risk / Issue', render: (r) => <span className="whitespace-nowrap font-medium">{raidLabel(r)}</span> },
            { key: 'unit', header: 'Business unit / project', render: (r) => { const l = raidLink(r, raidLinks.items); const p = l?.projectId ? projects.items.find((x) => x.id === l.projectId) : undefined; return l ? <span className="block leading-snug"><button className="text-brand-600 hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); setUnit(l.businessUnit) }}>{l.businessUnit}</button>{p && <span className="block text-ink-500"><button className="hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); openProject(p.id) }}>{p.name}</button></span>}</span> : <span className="text-ink-400">program-wide</span> } },
            { key: 'level', header: 'Impact', render: (r) => <Badge value={r.level} /> },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
            { key: 'owner', header: 'Owner', render: (r) => <span className="whitespace-nowrap">{r.owner}</span> },
          ]} /></div>
        </Card>

        <Card title="Quick Actions">
          <div className="space-y-2">
            {[
              { icon: <FileText size={17} />, title: 'View Transition Plan', sub: 'Waves, business units, projects and milestones', go: () => setTab('Wave Plan') },
              { icon: <ClipboardCheck size={17} />, title: 'Update Readiness Assessment', sub: 'Score a project on the five dimensions', go: () => open({ kind: 'assessment', item: null, projectId: projects.items.find((p) => p.businessUnit === tx.unit)?.id }) },
              { icon: <AlertTriangle size={17} className="text-red-500" />, title: 'Log Issue / Risk', sub: 'Raise a transition risk for a business unit or project', go: () => open({ kind: 'raid', item: null, businessUnit: tx.unit }) },
              { icon: <BookOpen size={17} />, title: 'View Knowledge Transfer Tracker', sub: 'KT completed vs pending by business unit and project', go: () => setTab('KT Tracking') },
              { icon: <Boxes size={17} className="text-teal-600" />, title: 'Accounts Onboarded', sub: 'Applications, services and entities onboarded per project', go: () => setTab('Accounts') },
            ].map((a) => (
              <button key={a.title} onClick={a.go} className="w-full flex items-center gap-3 rounded-lg bg-surface hover:bg-brand-50 px-3 py-2.5 text-left cursor-pointer transition-colors">
                <span className="w-8 h-8 rounded-md bg-white border border-line text-brand-600 flex items-center justify-center shrink-0">{a.icon}</span>
                <span className="flex-1 min-w-0"><span className="block text-[12.5px] font-semibold text-ink-900">{a.title}</span><span className="block text-[11.5px] text-ink-500 truncate">{a.sub}</span></span>
                <ChevronRight size={16} className="text-ink-400" />
              </button>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-line text-[11.5px] text-ink-500">Target go-live Wave {settings.goLiveWave}: <b className="text-ink-900">{(() => { const d = waveGoLive(settings.goLiveWave, projects.items); return d ? fmtLong(d) : '—' })()}</b> · {settings.goLiveStatus}</div>
        </Card>
      </div>
    </>
  )
}

/* ================================================================== */
/* Gantt-like rows (waves or projects) on a fixed Nov '26 – May '27 window */
/* ================================================================== */
export interface GanttRow { id: string; label: ReactNode; start: string; end: string; color: string; progress?: number; marker?: string; title?: string; onClick?: () => void }
const DAY = 86400000
const utc = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
const monthStart = (iso: string) => { const d = new Date(utc(iso)); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)) }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function GanttRows({ rows, rangeStart = TIMELINE_START, rangeEnd = TIMELINE_END, labelWidth = 56, height = 20, empty = 'Nothing to show on the timeline yet.' }: {
  rows: GanttRow[]; rangeStart?: string; rangeEnd?: string; labelWidth?: number; height?: number; empty?: string
}) {
  if (!rows.length) return <EmptyNote>{empty}</EmptyNote>
  const minS = rows.reduce((m, r) => (r.start < m ? r.start : m), rangeStart)
  const maxE = rows.reduce((m, r) => (r.end > m ? r.end : m), rangeEnd)
  const start = monthStart(minS)
  const endM = monthStart(maxE); const end = new Date(Date.UTC(endM.getUTCFullYear(), endM.getUTCMonth() + 1, 1))
  const total = end.getTime() - start.getTime()
  const months: { label: string; left: number; width: number }[] = []
  for (let d = new Date(start); d < end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    months.push({ label: `${MON[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`, left: ((d.getTime() - start.getTime()) / total) * 100, width: ((next.getTime() - d.getTime()) / total) * 100 })
  }
  const pct = (iso: string, endOfDay = false) => Math.max(0, Math.min(100, ((utc(iso) + (endOfDay ? DAY : 0) - start.getTime()) / total) * 100))
  const today = pct(TODAY)
  const showToday = today > 0 && today < 100
  return (
    <div className="text-[11.5px]">
      <div className="flex">
        <div className="shrink-0" style={{ width: labelWidth }} />
        <div className="relative flex-1 h-5 text-ink-500">
          {months.map((m) => <span key={m.label} className="absolute top-0 text-center" style={{ left: `${m.left}%`, width: `${m.width}%` }}>{m.label}</span>)}
        </div>
      </div>
      <div className="flex">
        <div className="shrink-0 pr-2" style={{ width: labelWidth }}>
          {rows.map((r) => <div key={r.id} className="text-ink-700 flex items-center truncate" style={{ height: height + 8 }} title={typeof r.label === 'string' ? r.label : undefined}>{r.label}</div>)}
        </div>
        <div className="relative flex-1 border-l border-line">
          {months.map((m) => <span key={m.label} className="absolute top-0 bottom-0 border-r border-line/80" style={{ left: `${m.left}%`, width: `${m.width}%` }} />)}
          {rows.map((r) => (
            <div key={r.id} className="relative" style={{ height: height + 8 }}>
              <button title={r.title} onClick={r.onClick} className={clsx('absolute rounded-full', r.onClick && 'cursor-pointer hover:opacity-90')}
                style={{ left: `${pct(r.start)}%`, width: `${Math.max(1.5, pct(r.end, true) - pct(r.start))}%`, top: 4, height, background: r.color }}>
                {r.progress !== undefined && <span className="absolute inset-y-0 left-0 rounded-full bg-black/15" style={{ width: `${r.progress}%` }} />}
              </button>
              {r.marker && <span className="absolute -translate-x-1/2 text-[10px] leading-none pointer-events-none" style={{ left: `${pct(r.marker)}%`, top: 2 }} title={`Go-live ${fmtD(r.marker)}`}><Rocket size={12} className="text-navy-900" /></span>}
            </div>
          ))}
          {showToday && (
            <>
              <span className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-500" style={{ left: `${today}%` }} />
              <span className="absolute -bottom-5 -translate-x-1/2 text-red-600 font-semibold" style={{ left: `${today}%` }}>Today</span>
            </>
          )}
        </div>
      </div>
      <div className="h-5" />
    </div>
  )
}

/** Wave Gantt built on the generic rows. */
export function WaveGantt({ waves, projects, onClick, height = 22 }: { waves: Wave[]; projects: TransitionProject[]; onClick?: (w: Wave) => void; height?: number }) {
  return <GanttRows height={height} empty="No waves defined." rows={sortWaves(waves).map((w) => ({ id: w.id, label: `Wave ${w.number}`, start: w.startDate, end: w.endDate, color: w.color, progress: waveProgress(w, projects), title: `Wave ${w.number}: ${waveScope(w, projects)} (${fmtD(w.startDate)} – ${fmtD(w.endDate)})`, onClick: onClick ? () => onClick(w) : undefined }))} />
}
