/**
 * KT Tracking tab – knowledge transfer completed vs pending at every level: program tiles, by business unit (stacked
 * bars + table), by project (table), KT burndown over the ramp months, due-this-month / overdue lists and the
 * item-level tracker with "Mark done" / "Sign off" actions. Pending = not yet signed off; completed = signed off.
 */
import { useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine } from 'recharts'
import { Plus, Pencil, Trash2, Check, CheckCircle2, AlertTriangle, CalendarClock } from 'lucide-react'
import clsx from 'clsx'
import { Card, Badge, Progress, Ring, Table, Legend, FilterSelect, EmptyNote } from '../ui'
import { tooltipStyle } from '../charts'
import { CHART_COLORS, TODAY } from '../../data/common'
import { RAMP_MONTHS } from '../../data/businessUnits'
import { ktStats, ktIsCompleted, ktIsPending, ktIsOverdue, ktDueThisMonth, ktBurndown, ktStatusFor, shortBu, fmtD, monthLabel, KT_STATUSES, type KtItem } from '../../data/transition'
import { WaveDot, ProjectLink, TIGHT, sortWaves } from './Overview'
import type { Tx } from './types'

const Small = ({ children, onClick, tone = 'bg-brand-50 text-brand-600 hover:bg-brand-100', title }: { children: React.ReactNode; onClick: () => void; tone?: string; title?: string }) => (
  <button type="button" title={title} className={clsx('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium cursor-pointer whitespace-nowrap', tone)} onClick={(e) => { e.stopPropagation(); onClick() }}>{children}</button>
)
const TRACK_FILTERS = ['All', 'Pending', 'Completed (signed off)', 'Awaiting sign-off', ...KT_STATUSES] as const
const waveNo = (v: string) => (v === 'All' ? undefined : Number(v.replace('Wave ', '')))

export function KtTracking({ tx }: { tx: Tx }) {
  const { waves, kt, projects, unitNames, open, openProject } = tx
  const sorted = sortWaves(waves.items)
  const [fUnit, setFUnit] = useState('All'); const [fProject, setFProject] = useState('All'); const [fWave, setFWave] = useState('All'); const [fTrack, setFTrack] = useState('All')
  const projOptions = ['All', ...projects.items.filter((p) => fUnit === 'All' || p.businessUnit === fUnit).map((p) => p.name)]
  const projectOf = (k: KtItem) => projects.items.find((p) => p.id === k.projectId)
  const scope = useMemo(() => kt.items.filter((k) => (fUnit === 'All' || k.businessUnit === fUnit) && (fProject === 'All' || projectOf(k)?.name === fProject) && (waveNo(fWave) === undefined || k.wave === waveNo(fWave))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kt.items, projects.items, fUnit, fProject, fWave])
  const rows = scope.filter((k) => fTrack === 'All' ? true : fTrack === 'Pending' ? ktIsPending(k) : fTrack === 'Completed (signed off)' ? ktIsCompleted(k) : fTrack === 'Awaiting sign-off' ? k.status === 'Completed' && ktIsPending(k) : k.status === fTrack)
    .sort((a, b) => Number(ktIsCompleted(a)) - Number(ktIsCompleted(b)) || a.targetDate.localeCompare(b.targetDate) || a.wave - b.wave)
  const s = ktStats(scope)
  const byUnit = unitNames.map((u) => { const list = scope.filter((k) => k.businessUnit === u); const st = ktStats(list); return { id: u, name: shortBu(u), unit: u, projects: new Set(list.map((k) => k.projectId)).size, Completed: st.signed, 'In progress': st.pendingInProgress, 'Not started': st.pendingNotStarted, ...st } }).filter((x) => x.total > 0)
  const byProject = projects.items.filter((p) => scope.some((k) => k.projectId === p.id)).map((p) => ({ id: p.id, p, ...ktStats(scope.filter((k) => k.projectId === p.id)) })).sort((a, b) => a.p.wave - b.p.wave || unitNames.indexOf(a.p.businessUnit) - unitNames.indexOf(b.p.businessUnit))
  const burndown = useMemo(() => ktBurndown(scope), [scope])
  const overdue = scope.filter((k) => ktIsOverdue(k)).sort((a, b) => a.targetDate.localeCompare(b.targetDate))
  const dueNow = scope.filter((k) => ktDueThisMonth(k) && !ktIsOverdue(k)).sort((a, b) => a.targetDate.localeCompare(b.targetDate))

  const markDone = (k: KtItem) => kt.update({ ...k, sessionsDone: k.sessionsPlanned, status: ktStatusFor(k.sessionsPlanned, k.sessionsPlanned), signOff: k.signOff === 'Not Started' ? 'Pending' : k.signOff })
  const signOff = (k: KtItem) => kt.update({ ...k, sessionsDone: Math.max(k.sessionsDone, k.sessionsPlanned), status: 'Completed', signOff: 'Signed', signedOffOn: TODAY })
  const reopen = (k: KtItem) => kt.update({ ...k, signOff: 'Pending', signedOffOn: undefined })
  const actions = (k: KtItem) => (
    <span className="inline-flex items-center gap-1">
      {k.status !== 'Completed' && <Small title="Mark all planned sessions delivered" tone="bg-green-50 text-green-700 hover:bg-green-100" onClick={() => markDone(k)}><Check size={11} /> Mark done</Small>}
      {ktIsPending(k) && <Small title="Record the global owner's sign-off (completes the item)" tone="bg-violet-50 text-violet-700 hover:bg-violet-100" onClick={() => signOff(k)}><CheckCircle2 size={11} /> Sign off</Small>}
      {ktIsCompleted(k) && <Small title="Reopen – remove the sign-off" tone="bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={() => reopen(k)}>Reopen</Small>}
      <button className="text-ink-400 hover:text-brand-600 cursor-pointer p-0.5" title="Edit" onClick={(e) => { e.stopPropagation(); open({ kind: 'kt', item: k }) }}><Pencil size={12} /></button>
      <button className="text-ink-400 hover:text-red-600 cursor-pointer p-0.5" title="Remove" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Remove KT item “${k.process}”?`)) kt.remove(k.id) }}><Trash2 size={12} /></button>
    </span>
  )
  const DueList = ({ items, tone, empty }: { items: KtItem[]; tone: 'red' | 'amber'; empty: string }) => items.length ? (
    <div className="space-y-1 max-h-[300px] overflow-y-auto scroll-thin pr-1">
      {items.map((k) => { const p = projectOf(k); return (
        <div key={k.id} className="flex items-stretch gap-2 rounded-md border border-line px-2 py-1.5 text-[12px] hover:bg-surface cursor-pointer" onClick={() => open({ kind: 'kt', item: k })}>
          <span className={clsx('w-1.5 rounded-full shrink-0 self-stretch', tone === 'red' ? 'bg-red-500' : 'bg-amber-400')} />
          <span className="flex-1 min-w-0">
            <span className="flex items-start justify-between gap-2"><span className="font-medium text-ink-900 leading-snug" title={k.process}>{k.process}</span><span className={clsx('text-[11.5px] font-semibold whitespace-nowrap', tone === 'red' ? 'text-red-600' : 'text-amber-600')}>{fmtD(k.targetDate)}</span></span>
            <span className="block text-[10.5px] text-ink-500 truncate" title={p?.name}>{p?.name ?? '–'} · {k.businessUnit} · {k.sessionsDone}/{k.sessionsPlanned} sessions · {k.status === 'Completed' ? 'awaiting sign-off' : k.status.toLowerCase()}</span>
            <span className="block mt-1">{actions(k)}</span>
          </span>
        </div>) })}
    </div>
  ) : <EmptyNote>{empty}</EmptyNote>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <FilterSelect label="Business unit" value={fUnit} options={['All', ...unitNames]} onChange={(v) => { setFUnit(v); setFProject('All') }} />
        <FilterSelect label="Project" value={projOptions.includes(fProject) ? fProject : 'All'} options={projOptions} onChange={setFProject} />
        <FilterSelect label="Wave" value={fWave} options={['All', ...sorted.map((w) => `Wave ${w.number}`)]} onChange={setFWave} />
        <FilterSelect label="Tracker" value={fTrack} options={TRACK_FILTERS} onChange={setFTrack} />
        <span className="ml-auto"><button className="btn-primary" onClick={() => open({ kind: 'kt', item: null, projectId: projects.items.find((p) => p.name === fProject)?.id ?? projects.items.find((p) => fUnit === 'All' || p.businessUnit === fUnit)?.id })}><Plus size={14} /> Add KT Item</button></span>
      </div>

      {/* program tiles */}
      <div className="grid grid-cols-6 gap-4">
        <div className="card px-4 py-3 flex items-center gap-3"><Ring value={s.completedPct} size={48} stroke={6} color={CHART_COLORS.green} label={<span className="text-[11px] font-semibold text-green-700">{s.completedPct}%</span>} /><div><div className="text-[12px] text-ink-500">KT items completed</div><div className="text-[20px] font-bold text-green-700 leading-tight">{s.signed} <span className="text-[13px] text-ink-500">/ {s.total}</span></div><div className="text-[11px] text-ink-500">signed off</div></div></div>
        <div className="card px-4 py-3"><div className="text-[12px] text-ink-500">KT items pending</div><div className="text-[22px] font-bold text-amber-600 leading-tight">{s.pending}</div><div className="text-[11px] text-ink-500">{s.pendingInProgress} in progress · {s.pendingNotStarted} not started</div></div>
        <div className="card px-4 py-3"><div className="text-[12px] text-ink-500">Sessions delivered / planned</div><div className="text-[22px] font-bold text-brand-600 leading-tight">{s.done} <span className="text-[13px] text-ink-500">/ {s.planned}</span></div><div className="text-[11px] text-ink-500">{s.pct}% of planned sessions</div></div>
        <div className="card px-4 py-3"><div className="text-[12px] text-ink-500">Sign-offs done / pending</div><div className="text-[22px] font-bold text-violet-600 leading-tight">{s.signed} <span className="text-[13px] text-ink-500">/ {s.pending}</span></div><div className="text-[11px] text-ink-500">{s.awaitingSignOff} delivered, awaiting sign-off</div></div>
        <div className="card px-4 py-3"><div className="text-[12px] text-ink-500 flex items-center gap-1"><CalendarClock size={12} /> Due this month</div><div className="text-[22px] font-bold text-ink-900 leading-tight">{dueNow.length}</div><div className="text-[11px] text-ink-500">{monthLabel(TODAY.slice(0, 7))} · pending items</div></div>
        <div className="card px-4 py-3"><div className="text-[12px] text-ink-500 flex items-center gap-1"><AlertTriangle size={12} className="text-red-500" /> Overdue</div><div className={`text-[22px] font-bold leading-tight ${overdue.length ? 'text-red-600' : 'text-green-600'}`}>{overdue.length}</div><div className="text-[11px] text-ink-500">pending past target date</div></div>
      </div>

      {/* by business unit */}
      <div className="grid grid-cols-[1fr_1.3fr] gap-4">
        <Card title="KT by business unit" subtitle="Items completed (signed off) vs pending">
          {byUnit.length ? (
            <>
              <Legend items={[{ label: 'Completed', color: CHART_COLORS.green }, { label: 'Pending – in progress', color: CHART_COLORS.blueLight }, { label: 'Pending – not started', color: CHART_COLORS.blueFaint }]} />
              <div className="h-[230px] mt-2">
                <ResponsiveContainer>
                  <BarChart data={byUnit} margin={{ top: 18, right: 4, left: -16, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10.5 }} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10.5 }} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v, n) => [`${v} item${v === 1 ? '' : 's'}`, String(n)]} labelFormatter={(l, p) => { const d = p?.[0]?.payload as (typeof byUnit)[number] | undefined; return d ? `${d.unit} – ${d.completedPct}% completed` : String(l) }} />
                    <Bar isAnimationActive={false} dataKey="Completed" stackId="a" fill={CHART_COLORS.green} />
                    <Bar isAnimationActive={false} dataKey="In progress" stackId="a" fill={CHART_COLORS.blueLight} />
                    <Bar isAnimationActive={false} dataKey="Not started" stackId="a" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="completedPct" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : <EmptyNote>No KT items match the filters.</EmptyNote>}
        </Card>
        <Card title="Completed vs pending by business unit" subtitle="Click a business unit to filter the tracker">
          <div className={TIGHT}><Table compact rows={byUnit} onRowClick={(r) => { setFUnit(r.unit); setFProject('All') }} empty="No KT items match the filters." columns={[
            { key: 'unit', header: 'Business unit', render: (r) => <span className="font-medium whitespace-nowrap">{r.unit}</span> },
            { key: 'projects', header: 'Projects', className: 'text-right' },
            { key: 'total', header: 'Items', className: 'text-right' },
            { key: 'signed', header: 'Completed', className: 'text-right', render: (r) => <span className="text-green-700 font-medium">{r.signed}</span> },
            { key: 'pending', header: 'Pending', className: 'text-right', render: (r) => <span className={r.pending ? 'text-amber-600 font-medium' : ''}>{r.pending}</span> },
            { key: 'sessions', header: 'Sessions', className: 'whitespace-nowrap', render: (r) => `${r.done} / ${r.planned}` },
            { key: 'overdue', header: 'Overdue', className: 'text-right', render: (r) => <span className={r.overdue ? 'text-red-600 font-medium' : 'text-ink-400'}>{r.overdue}</span> },
            { key: 'pct', header: '% complete', width: '120px', render: (r) => <span className="flex items-center gap-1.5"><Progress value={r.completedPct} color={CHART_COLORS.green} className="w-[60px]" /><span className="font-medium w-8 text-right">{r.completedPct}%</span></span> },
          ]} /></div>
        </Card>
      </div>

      {/* burndown + due lists */}
      <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-4">
        <Card title="KT burndown" subtitle="Pending items over the ramp months: planned (by target date) vs actual (by sign-off date)">
          <div className="flex justify-end"><Legend items={[{ label: 'Planned pending', color: '#9CA3AF', dashed: true }, { label: 'Actual pending', color: CHART_COLORS.blue }]} /></div>
          <div className="h-[220px] mt-1">
            <ResponsiveContainer>
              <LineChart data={burndown} margin={{ top: 16, right: 18, left: -16, bottom: 0 }}>
                <CartesianGrid />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v} pending`]} />
                <ReferenceLine x={RAMP_MONTHS[Math.max(0, burndown.findIndex((r) => r.key === TODAY.slice(0, 7)))]} stroke="#DC2626" strokeDasharray="4 4" label={{ value: 'Today', position: 'top', fontSize: 10.5, fill: '#DC2626' }} />
                <Line isAnimationActive={false} type="monotone" dataKey="Planned" stroke="#9CA3AF" strokeDasharray="4 4" strokeWidth={1.5} dot={{ r: 3, fill: '#9CA3AF', strokeWidth: 0 }} />
                <Line isAnimationActive={false} type="monotone" dataKey="Actual" stroke={CHART_COLORS.blue} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.blue, strokeWidth: 0 }} connectNulls={false}>
                  <LabelList dataKey="Actual" position="top" offset={8} style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title={`Due this month – ${monthLabel(TODAY.slice(0, 7))}`} subtitle={`${dueNow.length} pending items with a target date this month`}>
          <DueList items={dueNow} tone="amber" empty="Nothing else is due this month." />
        </Card>
        <Card title="Overdue" subtitle={`${overdue.length} pending items past their target date`}>
          <DueList items={overdue} tone="red" empty="No overdue KT items." />
        </Card>
      </div>

      {/* by project */}
      <Card title="KT by project" subtitle="Completed / pending items and sessions per transition project – click the project for its deep dive">
        <div className={TIGHT}><Table compact rows={byProject} onRowClick={(r) => openProject(r.p.id)} empty="No KT items match the filters." columns={[
          { key: 'project', header: 'Project', render: (r) => <span className="block leading-snug min-w-[180px]"><ProjectLink project={r.p} onClick={() => openProject(r.p.id)} /><span className="block text-[10.5px] text-ink-500">{r.p.businessUnit} · {r.p.capability} · from {r.p.deliveryLocation}</span></span> },
          { key: 'wave', header: 'Wave', render: (r) => <WaveDot wave={sorted.find((w) => w.number === r.p.wave)} size={20} /> },
          { key: 'owners', header: 'Global owner / India lead', className: 'whitespace-nowrap', render: (r) => <span className="text-[11.5px]">{r.p.globalOwner} / {r.p.indiaLead}</span> },
          { key: 'total', header: 'Items', className: 'text-right' },
          { key: 'signed', header: 'Completed', className: 'text-right', render: (r) => <span className="text-green-700 font-medium">{r.signed}</span> },
          { key: 'pending', header: 'Pending', className: 'text-right', render: (r) => <span className={r.pending ? 'text-amber-600 font-medium' : ''}>{r.pending}</span> },
          { key: 'awaiting', header: 'Awaiting sign-off', className: 'text-right', render: (r) => r.awaitingSignOff || <span className="text-ink-400">0</span> },
          { key: 'sessions', header: 'Sessions', className: 'whitespace-nowrap', render: (r) => `${r.done} / ${r.planned}` },
          { key: 'overdue', header: 'Overdue', className: 'text-right', render: (r) => <span className={r.overdue ? 'text-red-600 font-medium' : 'text-ink-400'}>{r.overdue}</span> },
          { key: 'pct', header: '% complete', width: '120px', render: (r) => <span className="flex items-center gap-1.5"><Progress value={r.completedPct} color={CHART_COLORS.green} className="w-[60px]" /><span className="font-medium w-8 text-right">{r.completedPct}%</span></span> },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.completedPct >= 100 ? 'Completed' : r.done > 0 ? 'In Progress' : 'Not Started'} /> },
        ]} /></div>
      </Card>

      {/* item tracker */}
      <Card title="Knowledge transfer tracker" subtitle={`${rows.length} items · pending = not yet signed off · click a row to edit, use the actions to mark sessions done or record the sign-off`}>
        <Table<KtItem> compact rows={rows} onRowClick={(k) => open({ kind: 'kt', item: k })} empty="No KT items match the filters." columns={[
          { key: 'process', header: 'Process / activity', render: (k) => <span className={clsx('font-medium block min-w-[200px]', ktIsCompleted(k) && 'text-ink-500')}>{k.process}</span> },
          { key: 'bu', header: 'Business unit', className: 'whitespace-nowrap', render: (k) => <span className="text-[12px]">{k.businessUnit}</span> },
          { key: 'project', header: 'Project', render: (k) => { const p = projectOf(k); return p ? <ProjectLink project={p} onClick={() => openProject(p.id)} className="text-[12px]" /> : <span className="text-ink-400">–</span> } },
          { key: 'wave', header: 'Wave', render: (k) => <WaveDot wave={sorted.find((w) => w.number === k.wave)} size={20} /> },
          { key: 'globalOwner', header: 'Global owner', className: 'whitespace-nowrap', render: (k) => <span className="text-[12px]">{k.globalOwner}</span> },
          { key: 'indiaOwner', header: 'India owner', className: 'whitespace-nowrap', render: (k) => <span className="text-[12px]">{k.indiaOwner}</span> },
          { key: 'sessions', header: 'Sessions', render: (k) => <span className="flex items-center gap-2"><Progress value={k.sessionsPlanned ? (k.sessionsDone / k.sessionsPlanned) * 100 : 0} className="w-[60px]" /><span className="text-[12px] whitespace-nowrap">{k.sessionsDone} / {k.sessionsPlanned}</span></span> },
          { key: 'targetDate', header: 'Target', className: 'whitespace-nowrap', render: (k) => <span className={ktIsOverdue(k) ? 'text-red-600 font-medium' : ''}>{fmtD(k.targetDate)}</span> },
          { key: 'status', header: 'Sessions status', render: (k) => <Badge value={k.status} /> },
          { key: 'track', header: 'Tracker', render: (k) => ktIsCompleted(k) ? <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-green-700 whitespace-nowrap"><CheckCircle2 size={12} /> Completed{k.signedOffOn ? ` · ${fmtD(k.signedOffOn)}` : ''}</span> : <span className={clsx('inline-flex items-center gap-1 text-[11.5px] font-medium whitespace-nowrap', ktIsOverdue(k) ? 'text-red-600' : 'text-amber-600')}>Pending{k.status === 'Completed' ? ' · awaiting sign-off' : ''}</span> },
          { key: 'act', header: '', className: 'text-right whitespace-nowrap', render: actions },
        ]} />
      </Card>
    </div>
  )
}
