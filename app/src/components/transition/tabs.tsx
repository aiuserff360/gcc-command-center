import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Plus, Pencil, Copy, Check, CheckCircle2, Circle, AlertTriangle, ShieldAlert, ArrowUpRight, Flag } from 'lucide-react'
import { Card, Badge, Progress, Ring, Table, Legend, FilterSelect, Stat, EmptyNote } from '../ui'
import { Donut, BarList, tooltipStyle } from '../charts'
import { CHART_COLORS, TODAY } from '../../data/common'
import type { RaidItem, Dependency } from '../../data/shared'
import { isOpen, daysOpen } from '../../data/shared'
import type { Activity } from '../../data/wbs'
import {
  ktStats, milestoneWave, isTransitionMilestone, isTransitionRaid, raidLabel, waveProgressColor, waveFunctions, waveForDate, assessmentScore, readinessColor,
  DIMENSIONS, READINESS_WORKSTREAMS, KT_STATUSES, GAP_STATUSES, monthKey, monthLabel, fmtD,
  type Wave, type KtItem, type ReadinessGap, type ChecklistItem,
} from '../../data/transition'
import { WaveDot, Gantt, DIM_ICON, ktByWave, TIGHT } from './Overview'
import type { Tx } from './types'

const AddBtn = ({ label, onClick }: { label: string; onClick: () => void }) => <button className="btn-primary" onClick={onClick}><Plus size={14} /> {label}</button>
const sortWaves = (w: Wave[]) => [...w].sort((a, b) => a.number - b.number)
const WAVE_ALL = (waves: Wave[]) => ['All', ...sortWaves(waves).map((w) => `Wave ${w.number}`)]
const waveNo = (v: string) => (v === 'All' ? undefined : Number(v.replace('Wave ', '')))

/* ================================================================== */
/* Wave Plan                                                           */
/* ================================================================== */
export function WavePlan({ tx }: { tx: Tx }) {
  const { waves, kt, milestones, msWaves, activities, currentWave, open } = tx
  const sorted = sortWaves(waves.items)
  const [sel, setSel] = useState<number>(currentWave.number)
  const wave = sorted.find((w) => w.number === sel) ?? sorted[0]
  const wsMilestones = useMemo(() => milestones.items.filter(isTransitionMilestone).map((m) => ({ m, wave: milestoneWave(m, sorted, msWaves.items) })).filter((x) => !wave || x.wave === wave.number).sort((a, b) => a.m.dueDate.localeCompare(b.m.dueDate)), [milestones.items, msWaves.items, sorted, wave])
  const acts = useMemo(() => activities.items.filter((a) => a.wbsWorkstream.startsWith('12.')).map((a) => ({ ...a, waveNo: waveForDate(sorted, a.forecastEnd || a.baselineEnd) })), [activities.items, sorted])
  const [actFilter, setActFilter] = useState('Selected wave')
  const actRows = acts.filter((a) => actFilter === 'All' || a.waveNo === wave?.number)
  const ktW = kt.items.filter((k) => k.wave === wave?.number)
  const ks = ktStats(ktW)

  return (
    <div className="space-y-4">
      <Card title="Transition Waves" subtitle="Click a wave to edit its scope, dates, status and progress" action={<AddBtn label="Add Wave" onClick={() => open({ kind: 'wave', item: null })} />}>
        <Table<Wave> rows={sorted} onRowClick={(w) => open({ kind: 'wave', item: w })} columns={[
          { key: 'number', header: 'Wave', render: (w) => <WaveDot wave={w} /> },
          { key: 'scope', header: 'Scope' },
          { key: 'functions', header: 'Functions', render: (w) => <span className="flex flex-wrap gap-1">{waveFunctions(w).map((f) => <span key={f} className="rounded-md bg-surface px-1.5 py-0.5 text-[11.5px] text-ink-700">{f}</span>)}</span> },
          { key: 'startDate', header: 'Start Date', render: (w) => fmtD(w.startDate) },
          { key: 'endDate', header: 'End Date', render: (w) => fmtD(w.endDate) },
          { key: 'lead', header: 'Wave Lead' },
          { key: 'kt', header: 'KT Items', render: (w) => kt.items.filter((k) => k.wave === w.number).length },
          { key: 'status', header: 'Status', render: (w) => <Badge value={w.status} /> },
          { key: 'progress', header: 'Progress', width: '140px', render: (w) => <span className="flex items-center gap-2"><Progress value={w.progress} color={waveProgressColor(w)} className="w-[80px]" /><span className="text-[12.5px] font-medium w-8 text-right">{w.progress}%</span></span> },
        ]} />
      </Card>

      <div className="grid grid-cols-[1.2fr_1fr] gap-4">
        <Card title="Transition Timeline" subtitle="Bars show wave duration; darker overlay shows progress">
          <Gantt waves={sorted} height={24} onClick={(w) => open({ kind: 'wave', item: w })} />
        </Card>
        <Card title="Wave Detail" headerRight={<div className="flex gap-1">{sorted.map((w) => <button key={w.id} onClick={() => setSel(w.number)} className="cursor-pointer rounded-full border-2 transition-all" style={{ borderColor: sel === w.number ? '#0B2240' : 'transparent' }}><WaveDot wave={w} size={24} /></button>)}</div>}>
          {wave ? (
            <div>
              <div className="flex items-center gap-3 mb-2"><WaveDot wave={wave} size={34} /><div><div className="text-[14px] font-semibold text-ink-900">Wave {wave.number} – {wave.scope}</div><div className="text-[12px] text-ink-500">{fmtD(wave.startDate)} – {fmtD(wave.endDate)} · Lead {wave.lead}</div></div><span className="ml-auto"><Badge value={wave.status} /></span></div>
              <Stat label="Wave progress" value={<span className="flex items-center gap-2"><Progress value={wave.progress} color={waveProgressColor(wave)} className="w-[100px]" />{wave.progress}%</span>} />
              <Stat label="Functions in scope" value={waveFunctions(wave).join(', ')} />
              <Stat label="Knowledge transfer" value={`${ks.pct}% (${ks.done} / ${ks.planned} sessions, ${ks.completed} of ${ks.total} items complete)`} />
              <Stat label="Milestones" value={`${wsMilestones.length} (${wsMilestones.filter((x) => x.m.status === 'At Risk' || x.m.status === 'Delayed').length} at risk / delayed)`} />
              <Stat label="Transition activities" value={`${acts.filter((a) => a.waveNo === wave.number).length} scheduled in this wave`} />
              <div className="mt-2 flex gap-2"><button className="btn-secondary" onClick={() => open({ kind: 'wave', item: wave })}><Pencil size={13} /> Edit wave</button><button className="btn-secondary" onClick={() => open({ kind: 'milestone', item: null, wave: wave.number })}><Plus size={13} /> Add milestone</button></div>
            </div>
          ) : <EmptyNote>No wave selected.</EmptyNote>}
        </Card>
      </div>

      <div className="grid grid-cols-[1fr_1.4fr] gap-4">
        <Card title={`Wave ${wave?.number ?? ''} Milestones`} action={<AddBtn label="Add Milestone" onClick={() => open({ kind: 'milestone', item: null, wave: wave?.number })} />}>
          <Table compact rows={wsMilestones.map((x) => ({ id: x.m.id, ...x }))} onRowClick={(r) => open({ kind: 'milestone', item: r.m, wave: r.wave })} columns={[
            { key: 'name', header: 'Milestone', render: (r) => r.m.name },
            { key: 'dueDate', header: 'Target Date', render: (r) => fmtD(r.m.dueDate) },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.m.status} /> },
            { key: 'owner', header: 'Owner', render: (r) => r.m.owner },
          ]} />
        </Card>
        <Card title="Transition Activities (WBS 12 – Transition & Knowledge Transfer)" subtitle="Activities are placed in the wave whose dates contain their forecast end; click a row to update tracking fields"
          headerRight={<FilterSelect label="Show" value={actFilter} options={['Selected wave', 'All']} onChange={setActFilter} />}>
          <Table compact rows={actRows} onRowClick={(a) => { const { waveNo: _w, ...orig } = a; void _w; open({ kind: 'activity', item: orig as Activity }) }} columns={[
            { key: 'name', header: 'Activity', render: (a) => <span className="block min-w-[220px]"><span className="font-medium"><span className="text-ink-500 mr-1.5">{a.code}</span>{a.name}</span><span className="block text-[11px] text-ink-500">{a.subWorkstream.replace(/^\d+\.\d+\s/, '')}</span></span> },
            { key: 'wave', header: 'Wave', render: (a) => <WaveDot wave={sorted.find((w) => w.number === a.waveNo)} size={22} /> },
            { key: 'forecastEnd', header: 'Forecast End', render: (a) => <span className="whitespace-nowrap">{fmtD(a.forecastEnd)}</span> },
            { key: 'status', header: 'Status', render: (a) => <Badge value={a.status} /> },
            { key: 'percentComplete', header: '% Complete', render: (a) => <span className="font-medium">{a.percentComplete}%</span> },
            { key: 'responsible', header: 'Owner', render: (a) => <span className="whitespace-nowrap">{a.responsible}</span> },
          ]} />
        </Card>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Knowledge Transfer                                                  */
/* ================================================================== */
export function KnowledgeTransfer({ tx }: { tx: Tx }) {
  const { waves, kt, open } = tx
  const sorted = sortWaves(waves.items)
  const [fWave, setFWave] = useState('All'); const [fFn, setFFn] = useState('All'); const [fStatus, setFStatus] = useState('All')
  const fns = ['All', ...Array.from(new Set(kt.items.map((k) => k.function)))]
  const rows = kt.items.filter((k) => (waveNo(fWave) === undefined || k.wave === waveNo(fWave)) && (fFn === 'All' || k.function === fFn) && (fStatus === 'All' || k.status === fStatus)).sort((a, b) => a.wave - b.wave || a.targetDate.localeCompare(b.targetDate))
  const s = ktStats(rows)
  const byFn = fns.filter((f) => f !== 'All').map((f) => ({ f, ...ktStats(rows.filter((k) => k.function === f)) })).filter((x) => x.total > 0)
  const byWave = ktByWave(sorted, rows)
  const months = useMemo(() => {
    const map = new Map<string, { id: string; items: number; planned: number; done: number; signed: number }>()
    rows.forEach((k) => { const key = monthKey(k.targetDate); const m = map.get(key) ?? { id: key, items: 0, planned: 0, done: 0, signed: 0 }; m.items++; m.planned += k.sessionsPlanned; m.done += Math.min(k.sessionsDone, k.sessionsPlanned); if (k.signOff === 'Signed') m.signed++; map.set(key, m) })
    return [...map.values()].sort((a, b) => a.id.localeCompare(b.id))
  }, [rows])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FilterSelect label="Wave" value={fWave} options={WAVE_ALL(sorted)} onChange={setFWave} />
        <FilterSelect label="Function" value={fFn} options={fns} onChange={setFFn} />
        <FilterSelect label="Status" value={fStatus} options={['All', ...KT_STATUSES]} onChange={setFStatus} />
        <span className="ml-auto"><AddBtn label="Add KT Item" onClick={() => open({ kind: 'kt', item: null })} /></span>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {[
          ['KT Items', s.total, 'text-ink-900'], ['Sessions Delivered', `${s.done} / ${s.planned}`, 'text-brand-600'], ['KT Completion', `${s.pct}%`, 'text-green-600'], ['In Progress', s.inProgress, 'text-brand-600'], ['Signed Off', `${s.signed} / ${s.total}`, 'text-violet-600'],
        ].map(([l, v, c]) => <div key={l as string} className="card px-4 py-3"><div className="text-[12px] text-ink-500">{l as string}</div><div className={`text-[22px] font-bold ${c as string}`}>{v as React.ReactNode}</div></div>)}
      </div>
      <div className="grid grid-cols-[1fr_1fr_1.1fr] gap-4">
        <Card title="Knowledge Transfer Completion" subtitle="By wave">
          <Legend items={[{ label: 'Completed', color: CHART_COLORS.green }, { label: 'In Progress', color: CHART_COLORS.blueLight }, { label: 'Not Started', color: CHART_COLORS.blueFaint }]} />
          <div className="h-[200px] mt-2"><ResponsiveContainer><BarChart data={byWave} margin={{ top: 18, right: 4, left: -18, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11.5 }} /><YAxis tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`${v}%`]} />
            <Bar isAnimationActive={false} dataKey="Not Started" stackId="a" fill={CHART_COLORS.blueFaint} /><Bar isAnimationActive={false} dataKey="In Progress" stackId="a" fill={CHART_COLORS.blueLight} /><Bar isAnimationActive={false} dataKey="Completed" stackId="a" fill={CHART_COLORS.green} radius={[3, 3, 0, 0]}><LabelList dataKey="label" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 11.5, fill: '#111827', fontWeight: 600 }} /></Bar>
          </BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Completion by Function" subtitle="Sessions delivered / planned">
          {byFn.length ? <BarList labelWidth={130} max={100} rows={byFn.map((x) => ({ label: x.f, value: x.pct, color: x.pct >= 80 ? CHART_COLORS.green : x.pct >= 50 ? CHART_COLORS.blueLight : CHART_COLORS.amber, right: `${x.pct}%` }))} /> : <EmptyNote>No items match the filters.</EmptyNote>}
        </Card>
        <Card title="Session Calendar Summary" subtitle="Sessions by target month">
          <div className={TIGHT}><Table compact rows={months} columns={[
            { key: 'id', header: 'Month', render: (m) => <span className="whitespace-nowrap font-medium">{monthLabel(m.id)}</span> },
            { key: 'items', header: 'Items Due' },
            { key: 'planned', header: 'Planned' },
            { key: 'done', header: 'Delivered' },
            { key: 'remaining', header: 'Remaining', render: (m) => <span className={m.planned - m.done > 0 && m.id < TODAY.slice(0, 7) ? 'text-red-600 font-medium' : ''}>{m.planned - m.done}</span> },
            { key: 'signed', header: 'Signed Off', render: (m) => `${m.signed} / ${m.items}` },
          ]} /></div>
        </Card>
      </div>
      <Card title="Knowledge Transfer Tracker" subtitle={`${rows.length} items · click a row to edit`}>
        <Table<KtItem> compact rows={rows} onRowClick={(k) => open({ kind: 'kt', item: k })} columns={[
          { key: 'process', header: 'Process / Activity', render: (k) => <span className="font-medium">{k.process}</span> },
          { key: 'function', header: 'Function' },
          { key: 'wave', header: 'Wave', render: (k) => <WaveDot wave={sorted.find((w) => w.number === k.wave)} size={22} /> },
          { key: 'globalOwner', header: 'Global Owner' },
          { key: 'indiaOwner', header: 'India Owner' },
          { key: 'sessions', header: 'Sessions', render: (k) => <span className="flex items-center gap-2"><Progress value={k.sessionsPlanned ? (k.sessionsDone / k.sessionsPlanned) * 100 : 0} className="w-[64px]" /><span className="text-[12px] whitespace-nowrap">{k.sessionsDone} / {k.sessionsPlanned}</span></span> },
          { key: 'targetDate', header: 'Target Date', render: (k) => fmtD(k.targetDate) },
          { key: 'status', header: 'Status', render: (k) => <Badge value={k.status} /> },
          { key: 'signOff', header: 'Sign-off', render: (k) => <Badge value={k.signOff === 'Signed' ? 'Completed' : k.signOff} className="!bg-transparent !px-0" /> },
        ]} />
      </Card>
    </div>
  )
}

/* ================================================================== */
/* Readiness & Stabilization                                           */
/* ================================================================== */
export function Readiness({ tx }: { tx: Tx }) {
  const { waves, assessments, gaps, checklist, settings, open } = tx
  const sorted = sortWaves(waves.items)
  const [gapStatus, setGapStatus] = useState('All')
  const [gapWave, setGapWave] = useState('All')
  const gapRows = gaps.items.filter((g) => (gapStatus === 'All' || g.status === gapStatus) && (waveNo(gapWave) === undefined || g.wave === waveNo(gapWave))).sort((a, b) => (a.status === 'Resolved' ? 1 : 0) - (b.status === 'Resolved' ? 1 : 0) || b.raised.localeCompare(a.raised))
  const gapCount = (s: string) => gaps.items.filter((g) => g.status === s).length
  const done = checklist.items.filter((c) => c.done).length
  const stabPct = checklist.items.length ? Math.round((done / checklist.items.length) * 100) : 0
  const wsList = Array.from(new Set([...READINESS_WORKSTREAMS, ...assessments.items.map((a) => a.workstream)]))
  const waveAvg = (n: number) => { const a = assessments.items.filter((x) => x.wave === n); return a.length ? Math.round(a.reduce((s, x) => s + assessmentScore(x), 0) / a.length) : 0 }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <Card title="Readiness Matrix" subtitle="Readiness score by wave and workstream (average of five dimensions) – click a cell to update" action={<AddBtn label="Update Readiness Assessment" onClick={() => open({ kind: 'assessment', item: null })} />}>
          <div className="overflow-x-auto"><table className="w-full tbl">
            <thead><tr><th className="th">Workstream</th>{sorted.map((w) => <th key={w.id} className="th text-center"><span className="inline-flex items-center gap-1.5"><WaveDot wave={w} size={18} /> Wave {w.number}</span></th>)}</tr></thead>
            <tbody>
              {wsList.map((ws) => <tr key={ws}><td className="td font-medium">{ws}</td>{sorted.map((w) => { const a = assessments.items.find((x) => x.wave === w.number && x.workstream === ws); return <td key={w.id} className="td text-center">{a ? <button className="inline-flex flex-col items-center cursor-pointer group" onClick={() => open({ kind: 'assessment', item: a })}><span className="inline-flex items-center justify-center w-12 h-6 rounded-md text-[12px] font-semibold text-white group-hover:opacity-85" style={{ background: readinessColor(assessmentScore(a)) }}>{assessmentScore(a)}%</span><span className="text-[10.5px] text-ink-500 mt-0.5">{a.status}</span></button> : <span className="text-ink-400">–</span>}</td> })}</tr>)}
              <tr><td className="td font-semibold text-ink-700">Wave average</td>{sorted.map((w) => <td key={w.id} className="td text-center font-semibold">{waveAvg(w.number)}%</td>)}</tr>
            </tbody>
          </table></div>
          <Legend items={[{ label: '≥ 80 Ready', color: '#16A34A' }, { label: '65–79 Progressing', color: '#5B9BF0' }, { label: '50–64 At risk', color: '#F59E0B' }, { label: '< 50 Not ready', color: '#DC2626' }]} />
        </Card>
        <Card title="Transition Readiness by Dimension" subtitle="Program-level readiness scores" action={<button className="link inline-flex items-center gap-1" onClick={() => open({ kind: 'settings' })}><Pencil size={12} /> Edit</button>}>
          <div className="space-y-3">
            {DIMENSIONS.map((d) => { const v = settings.dims[d]; return <div key={d} className="flex items-center gap-2.5 text-[12.5px]"><span className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{DIM_ICON[d]}</span><span className="w-[160px] text-ink-700">{d}</span><span className="w-9 text-right font-semibold">{v}%</span><Progress value={v} className="flex-1" color={v >= 65 ? '#16A34A' : '#F59E0B'} /></div> })}
          </div>
          <div className="mt-4 pt-3 border-t border-line">
            <div className="text-[12px] text-ink-500 mb-1">Current wave dimension averages (from assessments)</div>
            {DIMENSIONS.map((d) => { const a = assessments.items.filter((x) => x.wave === tx.currentWave.number); const v = a.length ? Math.round(a.reduce((s, x) => s + x.dims[d], 0) / a.length) : 0; return <Stat key={d} label={d} value={`${v}%`} /> })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[1.9fr_1fr] gap-4">
        <Card title="Readiness Gap Register" subtitle={`${gaps.items.length} gaps · ${gapCount('New')} new · ${gapCount('Open')} open · ${gapCount('Resolved')} resolved`}
          headerRight={<div className="flex gap-2"><FilterSelect label="Wave" value={gapWave} options={WAVE_ALL(sorted)} onChange={setGapWave} /><FilterSelect label="Status" value={gapStatus} options={['All', ...GAP_STATUSES]} onChange={setGapStatus} /></div>}
          action={<AddBtn label="Add Gap" onClick={() => open({ kind: 'gap', item: null })} />}>
          <Table<ReadinessGap> compact rows={gapRows} onRowClick={(g) => open({ kind: 'gap', item: g })} columns={[
            { key: 'code', header: 'ID', render: (g) => <span className="text-ink-500 whitespace-nowrap">{g.code}</span> },
            { key: 'description', header: 'Gap', render: (g) => <span className="font-medium">{g.description}</span> },
            { key: 'wave', header: 'Wave', render: (g) => <WaveDot wave={sorted.find((w) => w.number === g.wave)} size={22} /> },
            { key: 'dimension', header: 'Dimension', render: (g) => <span className="text-[12px]">{g.dimension}</span> },
            { key: 'severity', header: 'Severity', render: (g) => <Badge value={g.severity} /> },
            { key: 'owner', header: 'Owner', render: (g) => <span className="whitespace-nowrap">{g.owner}</span> },
            { key: 'due', header: 'Due', render: (g) => <span className={`whitespace-nowrap ${g.status !== 'Resolved' && g.due < TODAY ? 'text-red-600 font-medium' : ''}`}>{fmtD(g.due)}</span> },
            { key: 'status', header: 'Status', render: (g) => <Badge value={g.status === 'New' ? 'Open' : g.status} className={g.status === 'New' ? '!bg-amber-50 !text-amber-700' : ''} /> },
            { key: 'act', header: '', render: (g) => g.status !== 'Resolved' ? <button className="link whitespace-nowrap" onClick={(e) => { e.stopPropagation(); gaps.update({ ...g, status: 'Resolved' }) }}>Resolve</button> : <button className="link whitespace-nowrap text-ink-500" onClick={(e) => { e.stopPropagation(); gaps.update({ ...g, status: 'Open' }) }}>Reopen</button> },
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
  const { raid, open } = tx
  const [fType, setFType] = useState('All'); const [fStatus, setFStatus] = useState('Open items')
  const all = raid.items.filter(isTransitionRaid)
  const rows = all.filter((r) => (fType === 'All' || r.type === fType) && (fStatus === 'All' ? true : fStatus === 'Open items' ? isOpen(r) : r.status === fStatus)).sort((a, b) => b.impactScore - a.impactScore)
  const openItems = all.filter(isOpen)
  const tiles = [
    { l: 'Open Risks', v: openItems.filter((r) => r.type === 'Risk').length, icon: <ShieldAlert size={20} />, c: 'bg-red-50 text-red-600' },
    { l: 'Open Issues', v: openItems.filter((r) => r.type === 'Issue').length, icon: <AlertTriangle size={20} />, c: 'bg-amber-50 text-amber-600' },
    { l: 'Critical / High', v: openItems.filter((r) => r.level === 'Critical' || r.level === 'High').length, icon: <Flag size={20} />, c: 'bg-red-50 text-red-600' },
    { l: 'Escalated', v: openItems.filter((r) => r.escalated).length, icon: <ArrowUpRight size={20} />, c: 'bg-orange-50 text-orange-600' },
  ]
  const byLevel = ['Critical', 'High', 'Medium', 'Low'].map((l) => ({ name: l, value: openItems.filter((r) => r.level === l).length, color: ({ Critical: '#DC2626', High: '#F97316', Medium: '#F59E0B', Low: '#16A34A' } as Record<string, string>)[l] ?? '#94A3B8' }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {tiles.map((t) => <div key={t.l} className="card px-4 py-3 flex items-center gap-3"><span className={`w-10 h-10 rounded-full flex items-center justify-center ${t.c}`}>{t.icon}</span><div><div className="text-[22px] font-bold text-ink-900 leading-tight">{t.v}</div><div className="text-[12px] text-ink-700">{t.l}</div></div></div>)}
      </div>
      <div className="grid grid-cols-[1fr_2.4fr] gap-4">
        <Card title="Open Items by Level">
          <Donut size={150} data={byLevel.filter((d) => d.value > 0)} center={<><div className="text-[22px] font-bold">{openItems.length}</div><div className="text-[11px] text-ink-500">open</div></>} />
          <div className="mt-3"><Legend items={byLevel.map((d) => ({ label: `${d.name} (${d.value})`, color: d.color }))} /></div>
        </Card>
        <Card title="Transition Risks & Issues" subtitle="Items on the Transition workstream and transition-related items from the program RAID register"
          headerRight={<div className="flex gap-2"><FilterSelect label="Type" value={fType} options={['All', 'Risk', 'Issue']} onChange={setFType} /><FilterSelect label="Status" value={fStatus} options={['Open items', 'All', 'Open', 'In Progress', 'At Risk', 'On Track', 'Not Started', 'Overdue', 'Resolved', 'Closed']} onChange={setFStatus} /></div>}
          action={<AddBtn label="Log Issue / Risk" onClick={() => open({ kind: 'raid', item: null })} />}>
          <Table<RaidItem> compact rows={rows} onRowClick={(r) => open({ kind: 'raid', item: r })} columns={[
            { key: 'code', header: 'ID', render: (r) => <span className="text-ink-500">{r.code}</span> },
            { key: 'type', header: 'Type', render: (r) => <Badge value={r.type} /> },
            { key: 'title', header: 'Risk / Issue', render: (r) => <span><span className="font-medium">{raidLabel(r)}</span>{raidLabel(r) !== r.title && <span className="block text-[11px] text-ink-500">{r.title}</span>}</span> },
            { key: 'level', header: 'Impact', render: (r) => <Badge value={r.level} /> },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
            { key: 'owner', header: 'Owner' },
            { key: 'dueDate', header: 'Due', render: (r) => fmtD(r.dueDate) },
            { key: 'days', header: 'Days Open', render: (r) => daysOpen(r) },
            { key: 'mitigation', header: 'Mitigation', render: (r) => <span className="text-[12px] text-ink-700 line-clamp-2 max-w-[260px]">{r.mitigation || '–'}</span> },
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
  const { deps, open } = tx
  const [dir, setDir] = useState('Transition depends on')
  const rows = deps.items.filter((d) => (dir === 'Transition depends on' ? d.from === 'Transition Readiness' : d.on === 'Transition Readiness')).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const byStatus = ['On Track', 'At Risk', 'Delayed', 'Completed'].map((s) => ({ name: s, value: rows.filter((d) => d.status === s).length, color: ({ 'On Track': '#16A34A', 'At Risk': '#F59E0B', Delayed: '#DC2626', Completed: '#5B9BF0' } as Record<string, string>)[s] ?? '#94A3B8' }))
  const byWs = Array.from(new Set(rows.map((d) => (dir === 'Transition depends on' ? d.on : d.from)))).map((ws) => ({ label: ws, value: rows.filter((d) => (dir === 'Transition depends on' ? d.on : d.from) === ws).length }))
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
      </div>
      <Card title="Transition Dependencies" subtitle="Cross-workstream dependencies for Transition Readiness – click a row to edit"
        headerRight={<FilterSelect label="Direction" value={dir} options={['Transition depends on', 'Depends on Transition']} onChange={setDir} />}
        action={<AddBtn label="Add Dependency" onClick={() => open({ kind: 'dependency', item: null })} />}>
        <Table<Dependency> compact rows={rows} onRowClick={(d) => open({ kind: 'dependency', item: d })} columns={[
          { key: 'ws', header: dir === 'Transition depends on' ? 'Depends On' : 'Dependent Workstream', render: (d) => <span className="font-medium">{dir === 'Transition depends on' ? d.on : d.from}</span> },
          { key: 'type', header: 'Type' },
          { key: 'description', header: 'Description', render: (d) => <span className="text-[12px] text-ink-700">{d.description}</span> },
          { key: 'impact', header: 'Impact', render: (d) => <Badge value={d.impact} /> },
          { key: 'status', header: 'Status', render: (d) => <Badge value={d.status} /> },
          { key: 'dueDate', header: 'Due Date', render: (d) => <span className={d.status !== 'Completed' && d.dueDate < TODAY ? 'text-red-600 font-medium' : ''}>{fmtD(d.dueDate)}</span> },
          { key: 'owner', header: 'Owner' },
        ]} />
      </Card>
    </div>
  )
}

/* ================================================================== */
/* Reports                                                             */
/* ================================================================== */
export function Reports({ tx }: { tx: Tx }) {
  const { waves, kt, milestones, msWaves, raid, gaps, assessments, checklist, settings, currentWave } = tx
  const sorted = sortWaves(waves.items)
  const [sel, setSel] = useState(`Wave ${currentWave.number}`)
  const [copied, setCopied] = useState(false)
  const wave = sorted.find((w) => w.number === waveNo(sel)) ?? sorted[0]

  const summary = useMemo(() => {
    if (!wave) return ''
    const ks = ktStats(kt.items.filter((k) => k.wave === wave.number))
    const ms = milestones.items.filter(isTransitionMilestone).filter((m) => milestoneWave(m, sorted, msWaves.items) === wave.number).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const ra = assessments.items.filter((a) => a.wave === wave.number)
    const avg = ra.length ? Math.round(ra.reduce((s, a) => s + assessmentScore(a), 0) / ra.length) : 0
    const atRisk = ra.filter((a) => assessmentScore(a) < settings.readinessThreshold)
    const g = gaps.items.filter((x) => x.wave === wave.number)
    const openGaps = g.filter((x) => x.status !== 'Resolved')
    const risks = raid.items.filter(isTransitionRaid).filter(isOpen).sort((a, b) => b.impactScore - a.impactScore).slice(0, 5)
    const done = checklist.items.filter((c) => c.done).length
    const line = (s: string) => `- ${s}`
    return [
      `WAVE ${wave.number} STATUS REPORT – ${wave.scope}`,
      `As of ${fmtD(TODAY)} · ${fmtD(wave.startDate)} – ${fmtD(wave.endDate)} · Lead: ${wave.lead}`,
      ``,
      `Overall: ${wave.status}, ${wave.progress}% complete.`,
      ``,
      `Knowledge transfer`,
      line(`${ks.pct}% of planned sessions delivered (${ks.done} of ${ks.planned}); ${ks.completed} of ${ks.total} items complete, ${ks.signed} signed off.`),
      ...kt.items.filter((k) => k.wave === wave.number && k.status !== 'Completed').slice(0, 4).map((k) => line(`${k.process} (${k.function}): ${k.sessionsDone}/${k.sessionsPlanned} sessions, ${k.status}, target ${fmtD(k.targetDate)}.`)),
      ``,
      `Readiness`,
      line(`Average readiness ${avg}% across ${ra.length} workstreams (threshold ${settings.readinessThreshold}%).`),
      ...atRisk.map((a) => line(`${a.workstream} at ${assessmentScore(a)}% (${a.status}) – next action: ${a.nextAction}.`)),
      line(`${openGaps.length} open readiness gap${openGaps.length === 1 ? '' : 's'} (${g.filter((x) => x.status === 'Resolved').length} resolved).`),
      ...openGaps.slice(0, 4).map((x) => line(`${x.code} ${x.description} – ${x.severity}, ${x.owner}, due ${fmtD(x.due)}.`)),
      ``,
      `Milestones`,
      ...(ms.length ? ms.map((m) => line(`${m.name} – ${fmtD(m.dueDate)} – ${m.status} (${m.owner}).`)) : [line('No milestones assigned to this wave.')]),
      ``,
      `Top transition risks & issues`,
      ...risks.map((r) => line(`${r.code} ${raidLabel(r)} – ${r.level}, ${r.status}, owner ${r.owner}.`)),
      ``,
      `Stabilization readiness: ${checklist.items.length ? Math.round((done / checklist.items.length) * 100) : 0}% (${done} of ${checklist.items.length} checklist items). Target go-live Wave ${settings.goLiveWave}: ${fmtD(settings.goLiveDate)} – ${settings.goLiveStatus}.`,
    ].join('\n')
  }, [wave, kt.items, milestones.items, msWaves.items, raid.items, gaps.items, assessments.items, checklist.items, settings, sorted])

  const copy = async () => {
    try { await navigator.clipboard.writeText(summary) } catch { /* clipboard unavailable in some contexts */ }
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  const fns = Array.from(new Set(kt.items.map((k) => k.function)))
  const ktRows = fns.map((f) => { const items = kt.items.filter((k) => k.function === f); const s = ktStats(items); const w = sorted.find((x) => waveFunctions(x).includes(f)); return { id: f, f, wave: w, ...s } }).sort((a, b) => (a.wave?.number ?? 99) - (b.wave?.number ?? 99))
  const trend = settings.trendMonths.map((m, i) => ({ month: m, Planned: settings.trendPlanned[i] ?? 0, Actual: settings.trendActual[i] ?? 0 }))

  return (
    <div className="grid grid-cols-[1.1fr_1fr] gap-4">
      <Card title="Wave Status Report" subtitle="Generated from the current wave, KT, readiness, gap and RAID data"
        headerRight={<FilterSelect label="Wave" value={sel} options={sorted.map((w) => `Wave ${w.number}`)} onChange={setSel} />}
        action={<button className="btn-primary" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy summary'}</button>}>
        <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-ink-900 bg-surface rounded-lg p-4 max-h-[560px] overflow-y-auto scroll-thin">{summary}</pre>
      </Card>
      <div className="space-y-4">
        <Card title="KT Completion by Workstream" subtitle="Knowledge transfer sessions by receiving function">
          <Table compact rows={ktRows} columns={[
            { key: 'f', header: 'Workstream / Function', render: (r) => <span className="font-medium">{r.f}</span> },
            { key: 'wave', header: 'Wave', render: (r) => <WaveDot wave={r.wave} size={22} /> },
            { key: 'total', header: 'Items' },
            { key: 'sessions', header: 'Sessions', render: (r) => `${r.done} / ${r.planned}` },
            { key: 'pct', header: 'Completion', render: (r) => <span className="flex items-center gap-2"><Progress value={r.pct} className="w-[64px]" /><span className="text-[12.5px] font-medium w-8">{r.pct}%</span></span> },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.pct >= 100 ? 'Completed' : r.pct > 0 ? 'In Progress' : 'Not Started'} /> },
          ]} />
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
