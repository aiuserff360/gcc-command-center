import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Users, GitBranch, Database, Building2, ShieldCheck, FileText, ClipboardCheck, AlertTriangle, BookOpen, ChevronRight } from 'lucide-react'
import { Card, Badge, Progress, Table, ViewAll, Legend } from '../ui'
import { tooltipStyle } from '../charts'
import { CHART_COLORS, TODAY } from '../../data/common'
import type { Milestone, RaidItem } from '../../data/shared'
import { isOpen } from '../../data/shared'
import {
  ktStats, milestoneWave, isTransitionMilestone, isTransitionRaid, raidLabel, TRANSITION_RAID_LABELS, waveProgressColor, assessmentScore, readinessColor, DIMENSIONS, READINESS_WORKSTREAMS, waveFunctions, fmtD,
  type Wave, type KtItem, type ReadinessAssessment, type Dimension,
} from '../../data/transition'
import type { Tx } from './types'

/** Compact table styling for the dense overview cards (mock-up uses ~11.5px cells). */
export const TIGHT = '[&_.td]:px-1! [&_.th]:px-1! [&_.td]:py-1.5! [&_.td]:text-[11.5px]! [&_.th]:text-[11px]! [&_td_.rounded-md]:px-1! [&_td_.rounded-md]:text-[11px]!'

export const DIM_ICON: Record<Dimension, React.ReactNode> = {
  'People & Organization': <Users size={15} />, 'Process & Governance': <GitBranch size={15} />, 'Technology & Data': <Database size={15} />,
  'Facilities & Infrastructure': <Building2 size={15} />, 'Controls & Compliance': <ShieldCheck size={15} />,
}

export function WaveDot({ wave, size = 26 }: { wave?: Wave; size?: number }) {
  if (!wave) return <span className="text-ink-500">–</span>
  return <span className="inline-flex items-center justify-center rounded-full text-white font-semibold" style={{ width: size, height: size, background: wave.color, fontSize: size * 0.46 }}>{wave.number}</span>
}

export function ktByWave(waves: Wave[], kt: KtItem[]) {
  return waves.map((w) => {
    const s = ktStats(kt.filter((k) => k.wave === w.number))
    const share = (n: number) => (s.total ? +((s.pct * n) / s.total).toFixed(1) : 0)
    return { wave: w, name: `Wave ${w.number}`, label: s.pct, 'Not Started': share(s.notStarted), 'In Progress': share(s.inProgress), Completed: share(s.completed), ...s }
  })
}

export default function Overview({ tx }: { tx: Tx }) {
  const { waves, kt, assessments, milestones, msWaves, raid, settings, view, currentWave, open, setTab } = tx
  const sortedWaves = useMemo(() => [...waves.items].sort((a, b) => a.number - b.number), [waves.items])
  const ktData = useMemo(() => ktByWave(sortedWaves, kt.items), [sortedWaves, kt.items])

  const upcoming = useMemo(() =>
    milestones.items.filter(isTransitionMilestone).filter((m) => m.status !== 'Completed').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5), [milestones.items])

  const keyRisks = useMemo(() => {
    const open = raid.items.filter(isTransitionRaid).filter(isOpen)
    const order = Object.keys(TRANSITION_RAID_LABELS)
    const pinned = order.map((c) => open.find((r) => r.code === c)).filter((r): r is RaidItem => !!r)
    const rest = open.filter((r) => !order.includes(r.code)).sort((a, b) => b.impactScore - a.impactScore)
    return [...pinned, ...rest].slice(0, 5)
  }, [raid.items])

  const waveReadiness = useMemo(() => {
    const rows = READINESS_WORKSTREAMS.map((ws) => assessments.items.find((a) => a.wave === currentWave.number && a.workstream === ws)).filter((a): a is ReadinessAssessment => !!a)
    const extra = assessments.items.filter((a) => a.wave === currentWave.number && !READINESS_WORKSTREAMS.includes(a.workstream as never))
    return [...rows, ...extra]
  }, [assessments.items, currentWave])
  const readyCount = waveReadiness.filter((a) => assessmentScore(a) >= settings.readinessThreshold).length

  const trend = settings.trendMonths.map((m, i) => ({ month: m, Planned: settings.trendPlanned[i] ?? 0, Actual: settings.trendActual[i] ?? 0 }))
  const waveOf = (n?: number) => sortedWaves.find((w) => w.number === n)

  return (
    <div className="space-y-4">
      {/* Row 1 */}
      <div className="grid grid-cols-[1.65fr_0.85fr_1fr] gap-4">
        {view === 'Workstream' ? <WorkstreamCard tx={tx} /> : view === 'Function' ? <FunctionCard tx={tx} /> : (
          <Card title="Transition Waves" action={<ViewAll label="View Plan" onClick={() => setTab('Wave Plan')} />}>
            <div className={TIGHT}><Table<Wave> compact rows={sortedWaves} onRowClick={(w) => open({ kind: 'wave', item: w })} columns={[
              { key: 'number', header: 'Wave', render: (w) => <WaveDot wave={w} /> },
              { key: 'scope', header: 'Scope', render: (w) => <span className="whitespace-nowrap">{w.scope}</span> },
              { key: 'startDate', header: 'Start Date', render: (w) => <span className="whitespace-nowrap">{fmtD(w.startDate)}</span> },
              { key: 'endDate', header: 'End Date', render: (w) => <span className="whitespace-nowrap">{fmtD(w.endDate)}</span> },
              { key: 'status', header: 'Status', render: (w) => <Badge value={w.status} /> },
              { key: 'progress', header: 'Progress', width: '92px', render: (w) => <span className="flex items-center gap-1.5"><Progress value={w.progress} color={waveProgressColor(w)} className="w-[48px]" /><span className="font-medium w-7 text-right">{w.progress}%</span></span> },
            ]} /></div>
          </Card>
        )}

        <Card title={<span className="whitespace-nowrap">Knowledge Transfer Completion</span>}>
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

        <Card title={<span className="whitespace-nowrap text-[14px]">Transition Readiness by Dimension</span>} action={<ViewAll label="View Details" onClick={() => setTab('Readiness & Stabilization')} />}>
          <div className="space-y-3 pt-0.5">
            {DIMENSIONS.map((d) => {
              const v = settings.dims[d]
              return (
                <div key={d} className="flex items-center gap-2.5 text-[12.5px] cursor-pointer" onClick={() => open({ kind: 'settings' })}>
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

      {/* Row 2 */}
      <div className="grid grid-cols-[1.4fr_0.95fr_1.05fr] gap-4">
        <Card title="Upcoming Milestones" action={<ViewAll onClick={() => setTab('Wave Plan')} />}>
          <div className={TIGHT}><Table<Milestone> compact rows={upcoming} onRowClick={(m) => open({ kind: 'milestone', item: m, wave: milestoneWave(m, sortedWaves, msWaves.items) })} columns={[
            { key: 'name', header: 'Milestone' },
            { key: 'wave', header: 'Wave', render: (m) => { const n = milestoneWave(m, sortedWaves, msWaves.items); return <span className="font-semibold" style={{ color: waveOf(n)?.color ?? '#6B7280' }}>{n ?? '–'}</span> } },
            { key: 'dueDate', header: 'Target Date', render: (m) => <span className="whitespace-nowrap">{fmtD(m.dueDate)}</span> },
            { key: 'status', header: 'Status', render: (m) => <Badge value={m.status} /> },
            { key: 'owner', header: 'Owner', render: (m) => <span className="whitespace-nowrap">{m.owner}</span> },
          ]} /></div>
        </Card>

        <Card title="Transition Timeline" action={<ViewAll label="Wave Plan" onClick={() => setTab('Wave Plan')} />}>
          <Gantt waves={sortedWaves} onClick={(w) => open({ kind: 'wave', item: w })} />
        </Card>

        <Card title="Key Risks & Issues" action={<ViewAll onClick={() => setTab('Risks & Issues')} />}>
          <div className={TIGHT}><Table<RaidItem> compact rows={keyRisks} onRowClick={(r) => open({ kind: 'raid', item: r })} columns={[
            { key: 'title', header: 'Risk / Issue', render: (r) => <span className="whitespace-nowrap">{raidLabel(r)}</span> },
            { key: 'level', header: 'Impact', render: (r) => <Badge value={r.level} /> },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
            { key: 'owner', header: 'Owner', render: (r) => <span className="whitespace-nowrap">{r.owner}</span> },
          ]} /></div>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-[1.4fr_0.95fr_1.05fr] gap-4">
        <Card title={`Wave ${currentWave.number} – Transition Readiness`} headerRight={
          <div className="flex flex-col items-end gap-1 w-[150px]">
            <span className="text-[11.5px] text-ink-500">{readyCount} of {waveReadiness.length} complete</span>
            <Progress value={waveReadiness.length ? (readyCount / waveReadiness.length) * 100 : 0} color="#16A34A" height="h-1.5" />
          </div>
        }>
          <div className={TIGHT}><Table<ReadinessAssessment> compact rows={waveReadiness} onRowClick={(a) => open({ kind: 'assessment', item: a })} columns={[
            { key: 'workstream', header: 'Workstream', render: (a) => <span className="whitespace-nowrap">{a.workstream}</span> },
            { key: 'readiness', header: 'Readiness', width: '60px', render: (a) => { const s = assessmentScore(a); return <Progress value={s} color={readinessColor(s)} className="w-[48px]" /> } },
            { key: 'score', header: 'Score', render: (a) => <span className="font-medium">{assessmentScore(a)}%</span> },
            { key: 'status', header: 'Status', render: (a) => <Badge value={a.status} /> },
            { key: 'nextAction', header: 'Next Action', render: (a) => <span className="leading-snug">{a.nextAction}</span> },
          ]} /></div>
        </Card>

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

        <Card title="Quick Actions">
          <div className="space-y-2">
            {[
              { icon: <FileText size={17} />, title: 'View Transition Plan', sub: 'Wave details, milestones and owners', go: () => setTab('Wave Plan') },
              { icon: <ClipboardCheck size={17} />, title: 'Update Readiness Assessment', sub: 'Capture current readiness status', go: () => open({ kind: 'assessment', item: waveReadiness[0] ?? null }) },
              { icon: <AlertTriangle size={17} className="text-red-500" />, title: 'Log Issue / Risk', sub: 'Raise and track transition risks', go: () => open({ kind: 'raid', item: null }) },
              { icon: <BookOpen size={17} />, title: 'View Knowledge Transfer Tracker', sub: 'Monitor KT completion by workstream', go: () => setTab('Knowledge Transfer') },
            ].map((a) => (
              <button key={a.title} onClick={a.go} className="w-full flex items-center gap-3 rounded-lg bg-surface hover:bg-brand-50 px-3 py-2.5 text-left cursor-pointer transition-colors">
                <span className="w-8 h-8 rounded-md bg-white border border-line text-brand-600 flex items-center justify-center shrink-0">{a.icon}</span>
                <span className="flex-1 min-w-0"><span className="block text-[12.5px] font-semibold text-ink-900">{a.title}</span><span className="block text-[11.5px] text-ink-500 truncate">{a.sub}</span></span>
                <ChevronRight size={16} className="text-ink-400" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ---------- Gantt ---------- */
const DAY = 86400000
const monthStart = (iso: string) => { const d = new Date(iso); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)) }
export function Gantt({ waves, onClick, height = 22 }: { waves: Wave[]; onClick?: (w: Wave) => void; height?: number }) {
  if (!waves.length) return <p className="text-[12.5px] text-ink-500 italic py-6 text-center">No waves defined.</p>
  const minS = waves.reduce((m, w) => (w.startDate < m ? w.startDate : m), waves[0].startDate)
  const maxE = waves.reduce((m, w) => (w.endDate > m ? w.endDate : m), waves[0].endDate)
  const start = monthStart(minS)
  const endM = monthStart(maxE); const end = new Date(Date.UTC(endM.getUTCFullYear(), endM.getUTCMonth() + 1, 1))
  const total = end.getTime() - start.getTime()
  const months: { label: string; left: number; width: number }[] = []
  for (let d = new Date(start); d < end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    months.push({ label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`, left: ((d.getTime() - start.getTime()) / total) * 100, width: ((next.getTime() - d.getTime()) / total) * 100 })
  }
  const pct = (iso: string, endOfDay = false) => Math.max(0, Math.min(100, ((new Date(iso).getTime() + (endOfDay ? DAY : 0) - start.getTime()) / total) * 100))
  const today = pct(TODAY)
  const showToday = today > 0 && today < 100
  return (
    <div className="text-[11.5px]">
      <div className="flex">
        <div className="w-14 shrink-0" />
        <div className="relative flex-1 h-5 text-ink-500">
          {months.map((m) => <span key={m.label} className="absolute top-0 text-center" style={{ left: `${m.left}%`, width: `${m.width}%` }}>{m.label}</span>)}
        </div>
      </div>
      <div className="flex">
        <div className="w-14 shrink-0">
          {waves.map((w) => <div key={w.id} className="text-ink-700 flex items-center" style={{ height: height + 8 }}>Wave {w.number}</div>)}
        </div>
        <div className="relative flex-1 border-l border-line">
          {months.map((m) => <span key={m.label} className="absolute top-0 bottom-0 border-r border-line/80" style={{ left: `${m.left}%`, width: `${m.width}%` }} />)}
          {waves.map((w) => (
            <div key={w.id} className="relative" style={{ height: height + 8 }}>
              <button title={`Wave ${w.number}: ${w.scope} (${fmtD(w.startDate)} – ${fmtD(w.endDate)})`} onClick={() => onClick?.(w)} className="absolute rounded-full cursor-pointer hover:opacity-90"
                style={{ left: `${pct(w.startDate)}%`, width: `${Math.max(1.5, pct(w.endDate, true) - pct(w.startDate))}%`, top: 4, height, background: w.color }}>
                <span className="absolute inset-y-0 left-0 rounded-full bg-black/15" style={{ width: `${w.progress}%` }} />
              </button>
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

/* ---------- Alternative first cards for "View by" ---------- */
function WorkstreamCard({ tx }: { tx: Tx }) {
  const { assessments, waves, open } = tx
  const sorted = [...waves.items].sort((a, b) => a.number - b.number)
  const rows = READINESS_WORKSTREAMS.map((ws) => ({ id: ws, ws, scores: sorted.map((w) => assessments.items.find((a) => a.wave === w.number && a.workstream === ws)) }))
  return (
    <Card title="Readiness by Workstream" subtitle="Readiness score per workstream across transition waves" action={<ViewAll label="View Details" onClick={() => tx.setTab('Readiness & Stabilization')} />}>
      <div className="overflow-x-auto"><table className="w-full tbl"><thead><tr><th className="th">Workstream</th>{sorted.map((w) => <th key={w.id} className="th text-center">Wave {w.number}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className="td font-medium">{r.ws}</td>{r.scores.map((a, i) => <td key={i} className="td text-center">{a ? <button className="inline-flex items-center justify-center w-11 h-6 rounded-md text-[12px] font-semibold text-white cursor-pointer" style={{ background: readinessColor(assessmentScore(a)) }} onClick={() => open({ kind: 'assessment', item: a })}>{assessmentScore(a)}%</button> : <span className="text-ink-400">–</span>}</td>)}</tr>)}</tbody></table></div>
    </Card>
  )
}
function FunctionCard({ tx }: { tx: Tx }) {
  const { kt, waves, open, setTab } = tx
  const fns = Array.from(new Set(kt.items.map((k) => k.function)))
  const rows = fns.map((fn) => { const items = kt.items.filter((k) => k.function === fn); const s = ktStats(items); const w = waves.items.find((x) => waveFunctions(x).includes(fn)); return { id: fn, fn, wave: w, ...s } })
  return (
    <Card title="Knowledge Transfer by Function" subtitle="Sessions delivered vs planned per function" action={<ViewAll label="Tracker" onClick={() => setTab('Knowledge Transfer')} />}>
      <Table compact rows={rows} onRowClick={(r) => { const first = kt.items.find((k) => k.function === r.fn); if (first) open({ kind: 'kt', item: first }) }} columns={[
        { key: 'fn', header: 'Function' },
        { key: 'wave', header: 'Wave', render: (r) => <WaveDot wave={r.wave} size={22} /> },
        { key: 'total', header: 'Items' },
        { key: 'sessions', header: 'Sessions', render: (r) => `${r.done} / ${r.planned}` },
        { key: 'pct', header: 'Completion', render: (r) => <span className="flex items-center gap-2"><Progress value={r.pct} className="w-[64px]" /><span className="text-[12.5px] font-medium">{r.pct}%</span></span> },
        { key: 'signed', header: 'Signed off', render: (r) => `${r.signed} / ${r.total}` },
      ]} />
    </Card>
  )
}
