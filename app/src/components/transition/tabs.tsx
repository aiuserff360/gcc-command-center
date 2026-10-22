import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Plus, Pencil, Copy, Check, CheckCircle2, Circle, AlertTriangle, ShieldAlert, ArrowUpRight, Flag } from 'lucide-react'
import { Card, Badge, Progress, Ring, Table, Legend, FilterSelect, Stat, EmptyNote } from '../ui'
import { Donut, BarList, tooltipStyle } from '../charts'
import { CHART_COLORS, TODAY } from '../../data/common'
import type { RaidItem, Dependency } from '../../data/shared'
import { isOpen, daysOpen } from '../../data/shared'
import {
  ktStats, projectKt, unitKt, milestoneWave, isTransitionMilestone, isTransitionRaid, raidLabel, raidLink, depLink, waveProgressColor, waveScope, waveUnits, waveCapabilities, waveProjects, waveProgress, waveGoLive, assessmentScore, readinessColor, dimAverage, avgScore, projectReadiness, projectStatusColor, shortBu, projectAccounts, unitAccounts, accountStats,
  DIMENSIONS, DIM_SHORT, GAP_STATUSES, fmtD,
  type Wave, type ReadinessGap, type ChecklistItem, type TransitionProject, type ReadinessAssessment,
} from '../../data/transition'
import { WaveDot, WaveGantt, GanttRows, DIM_ICON, TIGHT, ProjectLink, StatusBadge, sortWaves, activeAssessments, unitColor } from './Overview'
import type { Tx } from './types'

const AddBtn = ({ label, onClick }: { label: string; onClick: () => void }) => <button className="btn-primary" onClick={onClick}><Plus size={14} /> {label}</button>
const WAVE_ALL = (waves: Wave[]) => ['All', ...sortWaves(waves).map((w) => `Wave ${w.number}`)]
const waveNo = (v: string) => (v === 'All' ? undefined : Number(v.replace('Wave ', '')))
const UNIT_ALL = (names: string[]) => ['All', ...names]

/** Shared project table used by the Wave Plan and Readiness tabs. */
function ProjectRows({ tx, rows, showUnit = true }: { tx: Tx; rows: TransitionProject[]; showUnit?: boolean }) {
  const { waves, kt, assessments, accounts, openProject } = tx
  const sorted = sortWaves(waves.items)
  return (
    <Table<TransitionProject> compact rows={rows} onRowClick={(p) => openProject(p.id)} empty="No projects in this selection." columns={[
      { key: 'name', header: 'Project', render: (p) => <span className="block min-w-[190px]"><ProjectLink project={p} onClick={() => openProject(p.id)} /></span> },
      ...(showUnit ? [{ key: 'bu', header: 'Business unit · capability', render: (p: TransitionProject) => <span className="block leading-snug text-[12px] whitespace-nowrap">{p.businessUnit}<span className="block text-[10.5px] text-ink-500">{p.capability} · from {p.deliveryLocation}</span></span> }] : []),
      { key: 'gbu', header: 'GBU served', className: 'whitespace-nowrap', render: (p) => <span className="text-[12px]">{p.gbu}</span> },
      { key: 'wave', header: 'Wave', render: (p) => <WaveDot wave={sorted.find((w) => w.number === p.wave)} size={22} /> },
      { key: 'status', header: 'Status', render: (p) => <StatusBadge value={p.status} /> },
      { key: 'progress', header: 'Progress', width: '120px', render: (p) => <span className="flex items-center gap-1.5"><Progress value={p.progress} color={projectStatusColor(p.status)} className="w-[64px]" /><span className="text-[12px] font-medium w-8 text-right">{p.progress}%</span></span> },
      { key: 'accounts', header: 'Accounts', className: 'whitespace-nowrap', render: (p) => { const a = projectAccounts(p, accounts.items); return <span className="text-[12px]"><b className="text-teal-700">{a.onboarded}</b> / {a.total}</span> } },
      { key: 'kt', header: 'KT %', className: 'text-right', render: (p) => <span className="font-medium">{projectKt(p, kt.items).pct}%</span> },
      { key: 'readiness', header: 'Readiness', render: (p) => { const s = projectReadiness(p, assessments.items); return <span className="inline-flex items-center justify-center w-11 h-5.5 rounded-md text-[11.5px] font-semibold text-white" style={{ background: readinessColor(s) }}>{s}%</span> } },
      { key: 'goLiveDate', header: 'Go-live', className: 'whitespace-nowrap', render: (p) => fmtD(p.goLiveDate) },
      { key: 'indiaLead', header: 'India lead', className: 'whitespace-nowrap' },
      { key: 'ftes', header: 'FTEs', className: 'text-right' },
    ]} />
  )
}

/* ================================================================== */
/* Wave Plan                                                           */
/* ================================================================== */
export function WavePlan({ tx }: { tx: Tx }) {
  const { waves, kt, projects, accounts, milestones, msWaves, msProjects, currentWave, open, openProject, unitNames } = tx
  const sorted = sortWaves(waves.items)
  const [sel, setSel] = useState<number>(currentWave.number)
  const wave = sorted.find((w) => w.number === sel) ?? sorted[0]
  const wsMilestones = useMemo(() => milestones.items.filter(isTransitionMilestone).map((m) => ({ m, wave: milestoneWave(m, sorted, msWaves.items, projects.items, msProjects.items), project: projects.items.find((p) => msProjects.items.find((l) => l.id === m.id)?.projectId === p.id) })).filter((x) => !wave || x.wave === wave.number).sort((a, b) => a.m.dueDate.localeCompare(b.m.dueDate)), [milestones.items, msWaves.items, msProjects.items, projects.items, sorted, wave])
  const wp = wave ? waveProjects(wave, projects.items).sort((a, b) => a.businessUnit.localeCompare(b.businessUnit) || a.goLiveDate.localeCompare(b.goLiveDate)) : []
  const ks = ktStats(kt.items.filter((k) => k.wave === wave?.number))
  const wa = accountStats(accounts.items.filter((a) => wp.some((p) => p.id === a.projectId)))
  const allRows = useMemo(() => [...projects.items].sort((a, b) => a.wave - b.wave || a.startDate.localeCompare(b.startDate)).map((p) => ({ id: p.id, label: <span className="flex items-center gap-1.5 min-w-0"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: unitColor(unitNames, p.businessUnit) }} /><span className="truncate" title={`${p.businessUnit} · ${p.name}`}>{p.name}</span></span>, start: p.startDate, end: p.endDate, color: sorted.find((w) => w.number === p.wave)?.color ?? '#94A3B8', progress: p.progress, marker: p.goLiveDate, title: `${p.name} (${p.businessUnit}) · Wave ${p.wave} · ${fmtD(p.startDate)} – ${fmtD(p.endDate)} · go-live ${fmtD(p.goLiveDate)}`, onClick: () => openProject(p.id) })), [projects.items, sorted, unitNames, openProject])

  return (
    <div className="space-y-4">
      <Card title="Transition Waves" subtitle="The four waves of the ENGIE IT GCC footprint (Nov 2026 – Apr 2027). Each wave moves a set of capabilities to Pune; scope and progress are derived from the projects in the wave – click a wave to edit its name, dates, status and lead." action={<AddBtn label="Add Wave" onClick={() => open({ kind: 'wave', item: null })} />}>
        <Table<Wave> rows={sorted} onRowClick={(w) => open({ kind: 'wave', item: w })} columns={[
          { key: 'number', header: 'Wave', render: (w) => <span className="inline-flex items-center gap-2"><WaveDot wave={w} /><span className="font-medium block max-w-[220px] leading-snug">{w.name}</span></span> },
          { key: 'units', header: 'Business units in scope', render: (w) => <span className="flex flex-wrap gap-1 max-w-[260px]">{waveUnits(w, projects.items).map((u) => <span key={u} className="rounded-md bg-surface px-1.5 py-0.5 text-[11.5px] text-ink-700 whitespace-nowrap" title={u}>{shortBu(u)}</span>)}{!waveUnits(w, projects.items).length && <span className="text-ink-400 text-[12px]">no projects</span>}</span> },
          { key: 'caps', header: 'Capabilities', render: (w) => { const c = waveCapabilities(w, projects.items); return <span className="block min-w-[200px] max-w-[260px] text-[11.5px] text-ink-700 leading-snug" title={c.join(', ')}>{c.length ? <><b>{c.length}</b> · {c.slice(0, 3).join(', ')}{c.length > 3 ? ` +${c.length - 3} more` : ''}</> : '—'}</span> } },
          { key: 'projects', header: 'Projects', className: 'text-right', render: (w) => waveProjects(w, projects.items).length },
          { key: 'ftes', header: 'FTEs', className: 'text-right', render: (w) => waveProjects(w, projects.items).reduce((s, p) => s + p.ftes, 0) },
          { key: 'startDate', header: 'Start Date', className: 'whitespace-nowrap', render: (w) => fmtD(w.startDate) },
          { key: 'endDate', header: 'End Date', className: 'whitespace-nowrap', render: (w) => fmtD(w.endDate) },
          { key: 'goLive', header: 'Last go-live', className: 'whitespace-nowrap', render: (w) => { const d = waveGoLive(w.number, projects.items); return d ? fmtD(d) : '—' } },
          { key: 'lead', header: 'Wave Lead', className: 'whitespace-nowrap' },
          { key: 'kt', header: 'KT %', className: 'text-right', render: (w) => `${ktStats(kt.items.filter((k) => k.wave === w.number)).pct}%` },
          { key: 'status', header: 'Status', render: (w) => <Badge value={w.status} /> },
          { key: 'progress', header: 'Progress', width: '140px', render: (w) => { const p = waveProgress(w, projects.items); return <span className="flex items-center gap-2"><Progress value={p} color={waveProgressColor(w)} className="w-[80px]" /><span className="text-[12.5px] font-medium w-8 text-right">{p}%</span></span> } },
        ]} />
      </Card>

      <div className="grid grid-cols-[1.2fr_1fr] gap-4">
        <Card title="Transition Timeline" subtitle="Bars show wave duration; darker overlay shows progress derived from the wave's projects">
          <WaveGantt waves={sorted} projects={projects.items} height={24} onClick={(w) => open({ kind: 'wave', item: w })} />
        </Card>
        <Card title="Wave Detail" headerRight={<div className="flex gap-1">{sorted.map((w) => <button key={w.id} onClick={() => setSel(w.number)} className="cursor-pointer rounded-full border-2 transition-all" style={{ borderColor: sel === w.number ? '#0B2240' : 'transparent' }}><WaveDot wave={w} size={24} /></button>)}</div>}>
          {wave ? (
            <div>
              <div className="flex items-center gap-3 mb-2"><WaveDot wave={wave} size={34} /><div className="min-w-0"><div className="text-[14px] font-semibold text-ink-900 truncate">Wave {wave.number} – {wave.name}</div><div className="text-[12px] text-ink-500">{fmtD(wave.startDate)} – {fmtD(wave.endDate)} · Lead {wave.lead}</div></div><span className="ml-auto"><Badge value={wave.status} /></span></div>
              <Stat label="Wave progress" value={<span className="flex items-center gap-2"><Progress value={waveProgress(wave, projects.items)} color={waveProgressColor(wave)} className="w-[100px]" />{waveProgress(wave, projects.items)}%</span>} />
              <Stat label="Business units in scope" value={<span className="text-right">{waveScope(wave, projects.items) || '—'}</span>} />
              <Stat label="Capabilities" value={<span className="text-right block max-w-[320px] leading-snug">{waveCapabilities(wave, projects.items).join(', ') || '—'}</span>} />
              <Stat label="From" value={Array.from(new Set(wp.map((p) => p.deliveryLocation))).join(', ') || '—'} />
              <Stat label="Projects" value={`${wp.length} (${wp.filter((p) => p.status === 'Completed').length} completed, ${wp.filter((p) => p.status === 'At Risk' || p.status === 'Delayed').length} at risk / delayed)`} />
              <Stat label="Target Pune FTEs" value={wp.reduce((s, p) => s + p.ftes, 0)} />
              <Stat label="Accounts onboarded" value={`${wa.onboarded} of ${wa.total} (${wa.live} live, ${wa.inKt} in KT)`} />
              <Stat label="Knowledge transfer" value={`${ks.pct}% (${ks.done} / ${ks.planned} sessions, ${ks.completed} of ${ks.total} items complete)`} />
              <Stat label="Milestones" value={`${wsMilestones.length} (${wsMilestones.filter((x) => x.m.status === 'At Risk' || x.m.status === 'Delayed').length} at risk / delayed)`} />
              <div className="mt-2 flex gap-2"><button className="btn-secondary" onClick={() => open({ kind: 'wave', item: wave })}><Pencil size={13} /> Edit wave</button><button className="btn-secondary" onClick={() => open({ kind: 'project', item: null, wave: wave.number })}><Plus size={13} /> Add project</button><button className="btn-secondary" onClick={() => open({ kind: 'milestone', item: null, wave: wave.number })}><Plus size={13} /> Add milestone</button></div>
            </div>
          ) : <EmptyNote>No wave selected.</EmptyNote>}
        </Card>
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-4">
        <Card title={`Wave ${wave?.number ?? ''} projects by business unit and capability`} subtitle="Click a project for its deep dive" action={<AddBtn label="Add Project" onClick={() => open({ kind: 'project', item: null, wave: wave?.number })} />}>
          <ProjectRows tx={tx} rows={wp} />
        </Card>
        <Card title={`Wave ${wave?.number ?? ''} Milestones`} action={<AddBtn label="Add Milestone" onClick={() => open({ kind: 'milestone', item: null, wave: wave?.number })} />}>
          <Table compact rows={wsMilestones.map((x) => ({ id: x.m.id, ...x }))} onRowClick={(r) => open({ kind: 'milestone', item: r.m, wave: r.wave, projectId: r.project?.id })} columns={[
            { key: 'name', header: 'Milestone', render: (r) => <span className="block leading-snug"><span className="font-medium">{r.m.name}</span>{r.project && <span className="block text-[11px] text-ink-500">{r.project.name}</span>}</span> },
            { key: 'dueDate', header: 'Target Date', className: 'whitespace-nowrap', render: (r) => fmtD(r.m.dueDate) },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.m.status} /> },
            { key: 'owner', header: 'Owner', className: 'whitespace-nowrap', render: (r) => r.m.owner },
          ]} />
        </Card>
      </div>

      <Card title="Project timeline across waves" subtitle="All transition projects, Nov '26 – May '27, coloured by wave; the rocket marks go-live. Click a bar for the project deep dive.">
        <div className="mb-2"><Legend items={sorted.map((w) => ({ label: `Wave ${w.number}`, color: w.color }))} /></div>
        <GanttRows rows={allRows} labelWidth={230} height={16} />
      </Card>
    </div>
  )
}

/* ================================================================== */
/* Readiness & Stabilization                                           */
/* ================================================================== */
export function Readiness({ tx }: { tx: Tx }) {
  const { waves, projects, assessments, gaps, checklist, settings, unitNames, open, openProject } = tx
  const sorted = sortWaves(waves.items)
  const [fUnit, setFUnit] = useState('All')
  const [gapStatus, setGapStatus] = useState('All')
  const [gapWave, setGapWave] = useState('All')
  const rows = useMemo(() => projects.items.filter((p) => fUnit === 'All' || p.businessUnit === fUnit).sort((a, b) => unitNames.indexOf(a.businessUnit) - unitNames.indexOf(b.businessUnit) || a.wave - b.wave).map((p) => ({ id: p.id, p, a: assessments.items.find((x) => x.projectId === p.id) })), [projects.items, assessments.items, fUnit, unitNames])
  const assessed = rows.map((r) => r.a).filter((a): a is ReadinessAssessment => !!a)
  const gapRows = gaps.items.filter((g) => (fUnit === 'All' || g.businessUnit === fUnit) && (gapStatus === 'All' || g.status === gapStatus) && (waveNo(gapWave) === undefined || g.wave === waveNo(gapWave))).sort((a, b) => (a.status === 'Resolved' ? 1 : 0) - (b.status === 'Resolved' ? 1 : 0) || b.raised.localeCompare(a.raised))
  const gapCount = (s: string) => gaps.items.filter((g) => g.status === s).length
  const done = checklist.items.filter((c) => c.done).length
  const stabPct = checklist.items.length ? Math.round((done / checklist.items.length) * 100) : 0
  const program = activeAssessments(tx)
  const cell = (v: number) => <span className="inline-flex items-center justify-center w-10 h-5.5 rounded-md text-[11.5px] font-semibold text-white" style={{ background: readinessColor(v) }}>{v}</span>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1.7fr_1fr] gap-4">
        <Card title="Readiness Matrix by Project" subtitle="Five dimension scores per project (average = readiness score) – click a row to update" headerRight={<FilterSelect label="Business unit" value={fUnit} options={UNIT_ALL(unitNames)} onChange={setFUnit} />} action={<AddBtn label="Update Readiness Assessment" onClick={() => open({ kind: 'assessment', item: null, projectId: rows[0]?.p.id })} />}>
          <div className={TIGHT}><Table compact rows={rows} onRowClick={(r) => (r.a ? open({ kind: 'assessment', item: r.a }) : open({ kind: 'assessment', item: null, projectId: r.p.id }))} columns={[
            { key: 'project', header: 'Project', render: (r) => <span className="block leading-snug min-w-[150px]"><ProjectLink project={r.p} onClick={() => openProject(r.p.id)} /><span className="block text-[10.5px] text-ink-500">{shortBu(r.p.businessUnit)} · {r.p.capability} · from {r.p.deliveryLocation}</span></span> },
            { key: 'wave', header: 'Wave', render: (r) => <WaveDot wave={sorted.find((w) => w.number === r.p.wave)} size={20} /> },
            ...DIMENSIONS.map((d) => ({ key: d, header: DIM_SHORT[d], className: 'text-center', render: (r: (typeof rows)[number]) => (r.a ? cell(r.a[({ 'People & Organization': 'people', 'Process & Governance': 'process', 'Technology & Data': 'technology', 'Facilities & Infrastructure': 'facilities', 'Controls & Compliance': 'controls' } as const)[d]]) : <span className="text-ink-400">–</span>) })),
            { key: 'score', header: 'Score', className: 'text-center', render: (r) => (r.a ? <span className="font-semibold">{assessmentScore(r.a)}%</span> : <button className="link" onClick={(e) => { e.stopPropagation(); open({ kind: 'assessment', item: null, projectId: r.p.id }) }}>Assess</button>) },
            { key: 'status', header: 'Status', render: (r) => (r.a ? <Badge value={r.a.status} /> : null) },
            { key: 'next', header: 'Next Action', render: (r) => <span className="leading-snug block max-w-[220px]">{r.a?.nextAction ?? ''}</span> },
          ]} /></div>
          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            <Legend items={[{ label: '≥ 80 Ready', color: '#16A34A' }, { label: '65–79 Progressing', color: '#5B9BF0' }, { label: '50–64 At risk', color: '#F59E0B' }, { label: '< 50 Not ready', color: '#DC2626' }]} />
            <span className="text-[12px] text-ink-500">{fUnit === 'All' ? 'Program' : fUnit} average <b className="text-ink-900">{avgScore(assessed)}%</b> · {assessed.filter((a) => assessmentScore(a) >= settings.readinessThreshold).length} of {assessed.length} at or above the {settings.readinessThreshold}% threshold</span>
          </div>
        </Card>
        <Card title="Transition Readiness by Dimension" subtitle={`Program-wide: projects in started waves (${program.length})`}>
          <div className="space-y-3">
            {DIMENSIONS.map((d) => { const v = dimAverage(program, d); return <div key={d} className="flex items-center gap-2.5 text-[12.5px]"><span className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{DIM_ICON[d]}</span><span className="w-[150px] text-ink-700 truncate">{d}</span><span className="w-9 text-right font-semibold">{v}%</span><Progress value={v} className="flex-1" color={v >= 65 ? '#16A34A' : '#F59E0B'} /></div> })}
          </div>
          <div className="mt-4 pt-3 border-t border-line">
            <div className="text-[12px] text-ink-500 mb-1">Readiness by business unit (all projects)</div>
            {unitNames.map((u) => { const list = assessments.items.filter((a) => a.businessUnit === u); const v = avgScore(list); return <Stat key={u} label={u} value={<span className="inline-flex items-center gap-2"><Progress value={v} className="w-[70px]" color={readinessColor(v)} />{v}%</span>} /> })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[2.2fr_1fr] gap-4">
        <Card title="Readiness Gap Register" subtitle={`${gaps.items.length} gaps · ${gapCount('New')} new · ${gapCount('Open')} open · ${gapCount('Resolved')} resolved`}
          headerRight={<div className="flex gap-2"><FilterSelect label="Wave" value={gapWave} options={WAVE_ALL(sorted)} onChange={setGapWave} /><FilterSelect label="Status" value={gapStatus} options={['All', ...GAP_STATUSES]} onChange={setGapStatus} /></div>}
          action={<AddBtn label="Add Gap" onClick={() => open({ kind: 'gap', item: null, projectId: rows[0]?.p.id })} />}>
          <Table<ReadinessGap> compact rows={gapRows} onRowClick={(g) => open({ kind: 'gap', item: g })} columns={[
            { key: 'code', header: 'ID', render: (g) => <span className="text-ink-500 whitespace-nowrap">{g.code}</span> },
            { key: 'description', header: 'Gap', render: (g) => <span className="font-medium leading-snug block min-w-[200px]">{g.description}</span> },
            { key: 'project', header: 'Business unit / project', render: (g) => { const p = projects.items.find((x) => x.id === g.projectId); return <span className="block leading-snug text-[12px]"><span className="text-ink-700">{g.businessUnit}</span>{p && <span className="block"><ProjectLink project={p} onClick={() => openProject(p.id)} className="text-[11.5px]" /></span>}</span> } },
            { key: 'wave', header: 'Wave', render: (g) => <WaveDot wave={sorted.find((w) => w.number === g.wave)} size={22} /> },
            { key: 'dimension', header: 'Dimension', render: (g) => <span className="text-[12px] whitespace-nowrap" title={g.dimension}>{DIM_SHORT[g.dimension] ?? g.dimension}</span> },
            { key: 'severity', header: 'Severity', render: (g) => <Badge value={g.severity} /> },
            { key: 'owner', header: 'Owner', render: (g) => <span className="whitespace-nowrap">{g.owner}</span> },
            { key: 'due', header: 'Due', className: 'whitespace-nowrap', render: (g) => <span className={`whitespace-nowrap ${g.status !== 'Resolved' && g.due < TODAY ? 'text-red-600 font-medium' : ''}`}>{fmtD(g.due)}</span> },
            { key: 'status', header: 'Status', render: (g) => <Badge value={g.status === 'New' ? 'Open' : g.status} className={g.status === 'New' ? 'bg-amber-50! text-amber-700!' : ''} /> },
            { key: 'act', header: '', className: 'whitespace-nowrap', render: (g) => g.status !== 'Resolved' ? <button className="link whitespace-nowrap" onClick={(e) => { e.stopPropagation(); gaps.update({ ...g, status: 'Resolved' }) }}>Resolve</button> : <button className="link whitespace-nowrap text-ink-500" onClick={(e) => { e.stopPropagation(); gaps.update({ ...g, status: 'Open' }) }}>Reopen</button> },
          ]} />
        </Card>
        <Card title="Stabilization Checklist" subtitle="Stabilization readiness = items complete" action={<AddBtn label="Add Item" onClick={() => open({ kind: 'checklist', item: null })} />}>
          <div className="flex items-center gap-4 mb-3">
            <Ring value={stabPct} size={70} stroke={8} color="#8B5CF6" />
            <div><div className="text-[22px] font-bold text-violet-600 leading-tight">{stabPct}%</div><div className="text-[12px] text-ink-500">{done} of {checklist.items.length} items complete</div></div>
          </div>
          <div className="space-y-1.5">
            {checklist.items.map((c: ChecklistItem) => (
              <div key={c.id} className="flex items-start gap-2 text-[12.5px] rounded-md hover:bg-surface px-1.5 py-1">
                <button className="cursor-pointer shrink-0 mt-0.5" onClick={() => checklist.update({ ...c, done: !c.done })}>{c.done ? <CheckCircle2 size={16} className="text-green-600" /> : <Circle size={16} className="text-ink-400" />}</button>
                <button className="flex-1 text-left cursor-pointer" onClick={() => open({ kind: 'checklist', item: c })}><span className={c.done ? 'text-ink-500 line-through' : 'text-ink-900'}>{c.item}</span><span className="block text-[11px] text-ink-500">{c.area} · {c.owner}</span></button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Risks & Issues                                                      */
/* ================================================================== */
export function RisksIssues({ tx }: { tx: Tx }) {
  const { raid, raidLinks, projects, unitNames, open, openProject } = tx
  const [fType, setFType] = useState('All'); const [fStatus, setFStatus] = useState('Open items'); const [fUnit, setFUnit] = useState('All')
  const all = raid.items.filter((r) => isTransitionRaid(r, raidLinks.items))
  const rows = all.filter((r) => (fType === 'All' || r.type === fType) && (fUnit === 'All' || raidLink(r, raidLinks.items)?.businessUnit === fUnit) && (fStatus === 'All' ? true : fStatus === 'Open items' ? isOpen(r) : r.status === fStatus)).sort((a, b) => b.impactScore - a.impactScore)
  const openItems = all.filter(isOpen)
  const tiles = [
    { l: 'Open Risks', v: openItems.filter((r) => r.type === 'Risk').length, icon: <ShieldAlert size={20} />, c: 'bg-red-50 text-red-600' },
    { l: 'Open Issues', v: openItems.filter((r) => r.type === 'Issue').length, icon: <AlertTriangle size={20} />, c: 'bg-amber-50 text-amber-600' },
    { l: 'Critical / High', v: openItems.filter((r) => r.level === 'Critical' || r.level === 'High').length, icon: <Flag size={20} />, c: 'bg-red-50 text-red-600' },
    { l: 'Escalated', v: openItems.filter((r) => r.escalated).length, icon: <ArrowUpRight size={20} />, c: 'bg-orange-50 text-orange-600' },
  ]
  const byLevel = ['Critical', 'High', 'Medium', 'Low'].map((l) => ({ name: l, value: openItems.filter((r) => r.level === l).length, color: ({ Critical: '#DC2626', High: '#F97316', Medium: '#F59E0B', Low: '#16A34A' } as Record<string, string>)[l] ?? '#94A3B8' }))
  const byUnit = unitNames.map((u) => ({ label: u, value: openItems.filter((r) => raidLink(r, raidLinks.items)?.businessUnit === u).length })).filter((x) => x.value > 0)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {tiles.map((t) => <div key={t.l} className="card px-4 py-3 flex items-center gap-3"><span className={`w-10 h-10 rounded-full flex items-center justify-center ${t.c}`}>{t.icon}</span><div><div className="text-[22px] font-bold text-ink-900 leading-tight">{t.v}</div><div className="text-[12px] text-ink-700">{t.l}</div></div></div>)}
      </div>
      <div className="grid grid-cols-[0.8fr_2.8fr] gap-4">
        <div className="space-y-4">
          <Card title="Open Items by Level">
            <Donut size={150} data={byLevel.filter((d) => d.value > 0)} center={<><div className="text-[22px] font-bold">{openItems.length}</div><div className="text-[11px] text-ink-500">open</div></>} />
            <div className="mt-3"><Legend items={byLevel.map((d) => ({ label: `${d.name} (${d.value})`, color: d.color }))} /></div>
          </Card>
          <Card title="Open Items by Business Unit">
            {byUnit.length ? <BarList labelWidth={150} rows={byUnit.map((b) => ({ ...b, color: CHART_COLORS.violet }))} /> : <EmptyNote>No open items linked to a business unit.</EmptyNote>}
          </Card>
        </div>
        <Card title="Transition Risks & Issues" subtitle="Items on the Transition workstream of the program RAID register, linked to a business unit / project"
          headerRight={<div className="flex gap-2"><FilterSelect label="Business unit" value={fUnit} options={UNIT_ALL(unitNames)} onChange={setFUnit} /><FilterSelect label="Type" value={fType} options={['All', 'Risk', 'Issue']} onChange={setFType} /><FilterSelect label="Status" value={fStatus} options={['Open items', 'All', 'Open', 'In Progress', 'At Risk', 'On Track', 'Not Started', 'Overdue', 'Resolved', 'Closed']} onChange={setFStatus} /></div>}
          action={<AddBtn label="Log Issue / Risk" onClick={() => open({ kind: 'raid', item: null, businessUnit: fUnit === 'All' ? undefined : fUnit })} />}>
          <Table<RaidItem> compact rows={rows} onRowClick={(r) => open({ kind: 'raid', item: r })} columns={[
            { key: 'code', header: 'ID', className: 'whitespace-nowrap', render: (r) => <span className="text-ink-500">{r.code}</span> },
            { key: 'type', header: 'Type', render: (r) => <Badge value={r.type} /> },
            { key: 'title', header: 'Risk / Issue', render: (r) => <span className="block min-w-[150px]"><span className="font-medium">{raidLabel(r)}</span>{raidLabel(r) !== r.title && <span className="block text-[11px] text-ink-500">{r.title}</span>}</span> },
            { key: 'unit', header: 'Business unit / project', render: (r) => { const l = raidLink(r, raidLinks.items); const p = l?.projectId ? projects.items.find((x) => x.id === l.projectId) : undefined; return l ? <span className="block leading-snug text-[12px]"><span className="text-ink-700 whitespace-nowrap">{l.businessUnit}</span>{p && <span className="block"><ProjectLink project={p} onClick={() => openProject(p.id)} className="text-[11.5px]" /></span>}</span> : <span className="text-ink-400 text-[12px]">program-wide</span> } },
            { key: 'level', header: 'Impact', render: (r) => <Badge value={r.level} /> },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
            { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
            { key: 'dueDate', header: 'Due', className: 'whitespace-nowrap', render: (r) => <span className="text-[12px]">{fmtD(r.dueDate)}</span> },
            { key: 'days', header: 'Days', className: 'text-right', render: (r) => daysOpen(r) },
          ]} />
        </Card>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Dependencies                                                        */
/* ================================================================== */
export function Dependencies({ tx }: { tx: Tx }) {
  const { deps, depLinks, projects, unitNames, open, openProject } = tx
  const [dir, setDir] = useState('Transition depends on')
  const [fUnit, setFUnit] = useState('All')
  const linkOf = (id: string) => depLink(id, depLinks.items)
  const all = deps.items.filter((d) => (dir === 'Transition depends on' ? d.from === 'Transition Readiness' : d.on === 'Transition Readiness'))
  const rows = all.filter((d) => fUnit === 'All' || linkOf(d.id)?.businessUnit === fUnit).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const byStatus = ['On Track', 'At Risk', 'Delayed', 'Completed'].map((s) => ({ name: s, value: rows.filter((d) => d.status === s).length, color: ({ 'On Track': '#16A34A', 'At Risk': '#F59E0B', Delayed: '#DC2626', Completed: '#5B9BF0' } as Record<string, string>)[s] ?? '#94A3B8' }))
  const byWs = Array.from(new Set(rows.map((d) => (dir === 'Transition depends on' ? d.on : d.from)))).map((ws) => ({ label: ws, value: rows.filter((d) => (dir === 'Transition depends on' ? d.on : d.from) === ws).length }))
  const byUnit = unitNames.map((u) => ({ label: shortBu(u), value: all.filter((d) => linkOf(d.id)?.businessUnit === u).length })).filter((x) => x.value > 0)
  return (
    <div className="grid grid-cols-[1fr_2.4fr] gap-4">
      <div className="space-y-4">
        <Card title="Dependency Status">
          <Donut size={150} data={byStatus.filter((d) => d.value > 0)} center={<><div className="text-[22px] font-bold">{rows.length}</div><div className="text-[11px] text-ink-500">dependencies</div></>} />
          <div className="mt-3"><Legend items={byStatus.map((d) => ({ label: `${d.name} (${d.value})`, color: d.color }))} /></div>
        </Card>
        <Card title={dir === 'Transition depends on' ? 'By Providing Workstream' : 'By Dependent Workstream'}>
          <BarList labelWidth={150} rows={byWs.map((b) => ({ ...b, color: CHART_COLORS.violet }))} />
        </Card>
        <Card title="By Business Unit" subtitle="Dependencies linked to a business unit / project">
          {byUnit.length ? <BarList labelWidth={110} rows={byUnit.map((b) => ({ ...b, color: CHART_COLORS.teal }))} /> : <EmptyNote>No dependencies linked to a business unit yet.</EmptyNote>}
        </Card>
      </div>
      <Card title="Transition Dependencies" subtitle="What the transition of the business units and capabilities depends on from the other program workstreams – click a row to edit and link it to a business unit / project"
        headerRight={<div className="flex gap-2"><FilterSelect label="Business unit" value={fUnit} options={UNIT_ALL(unitNames)} onChange={setFUnit} /><FilterSelect label="Direction" value={dir} options={['Transition depends on', 'Depends on Transition']} onChange={setDir} /></div>}
        action={<AddBtn label="Add Dependency" onClick={() => open({ kind: 'dependency', item: null, businessUnit: fUnit === 'All' ? undefined : fUnit })} />}>
        <Table<Dependency> compact rows={rows} onRowClick={(d) => open({ kind: 'dependency', item: d })} columns={[
          { key: 'ws', header: dir === 'Transition depends on' ? 'Depends On' : 'Dependent Workstream', render: (d) => <span className="font-medium whitespace-nowrap">{dir === 'Transition depends on' ? d.on : d.from}</span> },
          { key: 'type', header: 'Type', className: 'whitespace-nowrap' },
          { key: 'description', header: 'Description', render: (d) => <span className="text-[12px] text-ink-700 block min-w-[200px]">{d.description}</span> },
          { key: 'unit', header: 'Business unit / project', render: (d) => { const l = linkOf(d.id); const p = l?.projectId ? projects.items.find((x) => x.id === l.projectId) : undefined; return l ? <span className="block leading-snug text-[12px]"><span className="text-ink-700 whitespace-nowrap">{l.businessUnit}</span>{p && <span className="block"><ProjectLink project={p} onClick={() => openProject(p.id)} className="text-[11.5px]" /></span>}</span> : <span className="text-ink-400 text-[12px]">program-wide</span> } },
          { key: 'impact', header: 'Impact', render: (d) => <Badge value={d.impact} /> },
          { key: 'status', header: 'Status', render: (d) => <Badge value={d.status} /> },
          { key: 'dueDate', header: 'Due Date', className: 'whitespace-nowrap', render: (d) => <span className={d.status !== 'Completed' && d.dueDate < TODAY ? 'text-red-600 font-medium' : ''}>{fmtD(d.dueDate)}</span> },
          { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
        ]} />
      </Card>
    </div>
  )
}

/* ================================================================== */
/* Reports                                                             */
/* ================================================================== */
export function Reports({ tx }: { tx: Tx }) {
  const { waves, kt, projects, accounts, milestones, msWaves, msProjects, raid, raidLinks, gaps, assessments, checklist, settings, currentWave, unitNames } = tx
  const sorted = sortWaves(waves.items)
  const [sel, setSel] = useState(`Wave ${currentWave.number}`)
  const [copied, setCopied] = useState(false)
  const wave = sorted.find((w) => w.number === waveNo(sel)) ?? sorted[0]

  const summary = useMemo(() => {
    if (!wave) return ''
    const wp = waveProjects(wave, projects.items)
    const ks = ktStats(kt.items.filter((k) => k.wave === wave.number))
    const ms = milestones.items.filter(isTransitionMilestone).filter((m) => milestoneWave(m, sorted, msWaves.items, projects.items, msProjects.items) === wave.number).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const ra = assessments.items.filter((a) => a.wave === wave.number)
    const atRisk = ra.filter((a) => assessmentScore(a) < settings.readinessThreshold)
    const g = gaps.items.filter((x) => x.wave === wave.number)
    const openGaps = g.filter((x) => x.status !== 'Resolved')
    const risks = raid.items.filter((r) => isTransitionRaid(r, raidLinks.items)).filter(isOpen).filter((r) => { const l = raidLink(r, raidLinks.items); return !l || waveUnits(wave, projects.items).includes(l.businessUnit) }).sort((a, b) => b.impactScore - a.impactScore).slice(0, 5)
    const done = checklist.items.filter((c) => c.done).length
    const wa = accountStats(accounts.items.filter((a) => wp.some((p) => p.id === a.projectId)))
    const line = (s: string) => `- ${s}`
    const pName = (id: string) => projects.items.find((p) => p.id === id)?.name ?? id
    const goLive = waveGoLive(settings.goLiveWave, projects.items)
    return [
      `WAVE ${wave.number} STATUS REPORT – ${wave.name}`,
      `As of ${fmtD(TODAY)} · ${fmtD(wave.startDate)} – ${fmtD(wave.endDate)} · Lead: ${wave.lead}`,
      `Business units in scope: ${waveUnits(wave, projects.items).join(', ') || 'none'}`,
      `Capabilities: ${waveCapabilities(wave, projects.items).join(', ') || 'none'}`,
      ``,
      `Overall: ${wave.status}, ${waveProgress(wave, projects.items)}% complete across ${wp.length} projects (${wp.reduce((s, p) => s + p.ftes, 0)} target Pune FTEs).`,
      ...wp.map((p) => { const a = projectAccounts(p, accounts.items); return line(`${p.name} (${p.businessUnit} · ${p.capability}, from ${p.deliveryLocation} for ${p.gbu}): ${p.status}, ${p.progress}%, accounts onboarded ${a.onboarded}/${a.total}, KT ${projectKt(p, kt.items).pct}%, readiness ${projectReadiness(p, assessments.items)}%, go-live ${fmtD(p.goLiveDate)}.`) }),
      ``,
      `Accounts onboarded`,
      line(`${wa.onboarded} of ${wa.total} accounts onboarded (${wa.live} live, ${wa.onboardedOnly} onboarded, ${wa.inKt} in KT, ${wa.planned} planned, ${wa.onHold} on hold).`),
      ...accounts.items.filter((a) => wp.some((p) => p.id === a.projectId) && a.status === 'On hold').map((a) => line(`On hold: ${a.name} – ${a.notes || 'no reason recorded'}.`)),
      ``,
      `Knowledge transfer`,
      line(`${ks.signed} of ${ks.total} items completed (signed off), ${ks.pending} pending (${ks.overdue} overdue); ${ks.pct}% of planned sessions delivered (${ks.done} of ${ks.planned}).`),
      ...kt.items.filter((k) => k.wave === wave.number && k.status !== 'Completed').slice(0, 4).map((k) => line(`${k.process} (${pName(k.projectId)}): ${k.sessionsDone}/${k.sessionsPlanned} sessions, ${k.status}, target ${fmtD(k.targetDate)}.`)),
      ``,
      `Readiness`,
      line(`Average readiness ${avgScore(ra)}% across ${ra.length} projects (threshold ${settings.readinessThreshold}%).`),
      ...atRisk.map((a) => line(`${pName(a.projectId)} at ${assessmentScore(a)}% (${a.status}) – next action: ${a.nextAction}.`)),
      line(`${openGaps.length} open readiness gap${openGaps.length === 1 ? '' : 's'} (${g.filter((x) => x.status === 'Resolved').length} resolved).`),
      ...openGaps.slice(0, 4).map((x) => line(`${x.code} ${x.description} (${pName(x.projectId)}) – ${x.severity}, ${x.owner}, due ${fmtD(x.due)}.`)),
      ``,
      `Milestones`,
      ...(ms.length ? ms.map((m) => line(`${m.name} – ${fmtD(m.dueDate)} – ${m.status} (${m.owner}).`)) : [line('No milestones assigned to this wave.')]),
      ``,
      `Top transition risks & issues`,
      ...(risks.length ? risks.map((r) => { const l = raidLink(r, raidLinks.items); return line(`${r.code} ${raidLabel(r)} – ${r.level}, ${r.status}, owner ${r.owner}${l ? ` (${l.projectId ? pName(l.projectId) : l.businessUnit})` : ''}.`) }) : [line('None open.')]),
      ``,
      `Stabilization readiness: ${checklist.items.length ? Math.round((done / checklist.items.length) * 100) : 0}% (${done} of ${checklist.items.length} checklist items). Target go-live Wave ${settings.goLiveWave}: ${goLive ? fmtD(goLive) : '—'} – ${settings.goLiveStatus}.`,
    ].join('\n')
  }, [wave, kt.items, projects.items, accounts.items, milestones.items, msWaves.items, msProjects.items, raid.items, raidLinks.items, gaps.items, assessments.items, checklist.items, settings, sorted])

  const copy = async () => {
    try { await navigator.clipboard.writeText(summary) } catch { /* clipboard unavailable in some contexts */ }
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  const ktRows = unitNames.map((u) => { const s = unitKt(u, kt.items); const ps = projects.items.filter((p) => p.businessUnit === u); const a = unitAccounts(u, accounts.items); return { id: u, u, projects: ps.length, caps: new Set(ps.map((p) => p.capability)).size, waves: Array.from(new Set(ps.map((p) => p.wave))).sort().join(', '), acc: a, ...s } })
  const trend = settings.trendMonths.map((m, i) => ({ month: m, Planned: settings.trendPlanned[i] ?? 0, Actual: settings.trendActual[i] ?? 0 }))

  return (
    <div className="grid grid-cols-[1.1fr_1fr] gap-4">
      <Card title="Wave Status Report" subtitle="Generated from the wave's projects, KT, readiness, gap and RAID data"
        headerRight={<FilterSelect label="Wave" value={sel} options={sorted.map((w) => `Wave ${w.number}`)} onChange={setSel} />}
        action={<button className="btn-primary" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy summary'}</button>}>
        <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-ink-900 bg-surface rounded-lg p-4 max-h-[620px] overflow-y-auto scroll-thin">{summary}</pre>
      </Card>
      <div className="space-y-4">
        <Card title="KT Completion by Business Unit" subtitle="Knowledge transfer and accounts onboarded by receiving business unit">
          <div className={TIGHT}><Table compact rows={ktRows} columns={[
            { key: 'u', header: 'Business Unit', render: (r) => <span className="font-medium whitespace-nowrap">{r.u}</span> },
            { key: 'projects', header: 'Projects', className: 'text-right', render: (r) => <span title={`${r.caps} capabilities`}>{r.projects}</span> },
            { key: 'waves', header: 'Waves', className: 'whitespace-nowrap' },
            { key: 'acc', header: 'Accounts', className: 'whitespace-nowrap', render: (r) => <span><b className="text-teal-700">{r.acc.onboarded}</b> / {r.acc.total}</span> },
            { key: 'items', header: 'KT done / pending', className: 'whitespace-nowrap', render: (r) => <span><span className="text-green-700 font-medium">{r.signed}</span> / <span className={r.pending ? 'text-amber-600' : ''}>{r.pending}</span></span> },
            { key: 'sessions', header: 'Sessions', className: 'whitespace-nowrap', render: (r) => `${r.done} / ${r.planned}` },
            { key: 'pct', header: 'Completion', render: (r) => <span className="flex items-center gap-2"><Progress value={r.pct} className="w-[56px]" /><span className="text-[12px] font-medium w-8">{r.pct}%</span></span> },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.pct >= 100 ? 'Completed' : r.pct > 0 ? 'In Progress' : 'Not Started'} /> },
          ]} /></div>
        </Card>
        <Card title="Transition Milestone Trend" subtitle="Planned vs actual milestone completion">
          <div className="h-[180px]"><ResponsiveContainer><BarChart data={trend} margin={{ top: 16, right: 4, left: -22, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11.5 }} /><YAxis tickLine={false} axisLine={false} domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`${v}%`]} />
            <Bar isAnimationActive={false} dataKey="Planned" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]} /><Bar isAnimationActive={false} dataKey="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]}><LabelList dataKey="Actual" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
          </BarChart></ResponsiveContainer></div>
          <Legend items={[{ label: 'Planned', color: CHART_COLORS.blueFaint }, { label: 'Actual', color: CHART_COLORS.blue }]} />
        </Card>
      </div>
    </div>
  )
}

