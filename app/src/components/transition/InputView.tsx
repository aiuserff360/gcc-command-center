/**
 * Transition Management – Input view: the registers and settings behind the transition dashboards.
 * Inline edits write straight to the collections; the pencil opens the full form (modals owned by the page).
 */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CheckCircle2, Circle, Save, Check } from 'lucide-react'
import { Card, Field, Input, Select, FormGrid, Badge } from '../ui'
import { Grid, Row, Td, TextCell, NumCell, DateCell, SelectCell, CheckCell, RemoveBtn, EditBtn, AddBtn, GridToolbar, cellCls, selectCls } from '../ui/InlineGrid'
import { InputLayout } from '../layout/InputLayout'
import { uid } from '../../store/useStore'
import { OWNERS, WORKSTREAMS, TODAY } from '../../data/common'
import type { Milestone } from '../../data/shared'
import {
  WAVE_STATUSES, WAVE_COLORS, KT_STATUSES, KT_SIGNOFF, KT_FUNCTIONS, READINESS_WORKSTREAMS, DIMENSIONS, READINESS_STATUSES, GAP_STATUSES,
  assessmentScore, readinessColor, milestoneWave, ktStats, waveLabel,
  type Wave, type KtItem, type ReadinessAssessment, type ReadinessGap, type ChecklistItem, type TransitionSettings, type Dimension, type KtStatus,
} from '../../data/transition'
import { WaveDot } from './Overview'
import type { Tx } from './types'

const MS_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Pending', 'Not Started', 'Completed'] as const
const AREAS = ['Governance', 'Support', 'Performance', 'Process', 'People', 'Technology', 'Facilities'] as const
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const
const sortWaves = (w: Wave[]) => [...w].sort((a, b) => a.number - b.number)
const waveNos = (waves: Wave[]) => sortWaves(waves).map((w) => String(w.number))

/* ================================================================== */
/* Waves                                                               */
/* ================================================================== */
function WavesTab({ tx }: { tx: Tx }) {
  const { waves, kt, open } = tx
  const sorted = sortWaves(waves.items)
  const set = <K extends keyof Wave>(w: Wave, k: K, v: Wave[K]) => waves.update({ ...w, [k]: v })
  const add = () => { const n = Math.max(0, ...sorted.map((w) => w.number)) + 1; const last = sorted[sorted.length - 1]; waves.add({ id: uid('wave'), number: n, scope: '', startDate: last?.endDate ?? TODAY, endDate: last?.endDate ?? TODAY, status: 'Not Started', progress: 0, color: WAVE_COLORS[(n - 1) % WAVE_COLORS.length], lead: OWNERS[0] }) }
  return (
    <Card title="Transition waves" subtitle="Each wave moves a set of functions to the GCC. Scope is a comma-separated list of functions; progress and status drive the wave tiles and timeline." action={<AddBtn label="Add wave" onClick={add} />}>
      <Grid count={sorted.length} minWidth={1000} headers={['Wave', 'Scope (functions, comma-separated)', 'Start', 'End', 'Status', { label: 'Progress %', right: true }, 'Wave lead', 'Colour', { label: 'KT items', right: true }, '']}>
        {sorted.map((w) => (
          <Row key={w.id}>
            <Td><span className="flex items-center gap-1.5 pl-1"><WaveDot wave={w} size={22} /><NumCell value={w.number} min={1} className="w-[52px]" onChange={(v) => set(w, 'number', v)} /></span></Td>
            <Td min={300}><TextCell value={w.scope} placeholder="Finance, HR, Procurement" onChange={(v) => set(w, 'scope', v)} className="font-medium" /></Td>
            <Td><DateCell value={w.startDate} onChange={(v) => set(w, 'startDate', v)} /></Td>
            <Td><DateCell value={w.endDate} onChange={(v) => set(w, 'endDate', v)} /></Td>
            <Td><SelectCell value={w.status} options={WAVE_STATUSES} onChange={(v) => set(w, 'status', v)} /></Td>
            <Td><NumCell value={w.progress} min={0} max={100} onChange={(v) => set(w, 'progress', v)} /></Td>
            <Td><SelectCell value={w.lead} options={OWNERS} onChange={(v) => set(w, 'lead', v)} /></Td>
            <Td><span className="flex items-center gap-1 px-1">{WAVE_COLORS.map((c) => <button key={c} title={c} className="w-4 h-4 rounded-full border-2 cursor-pointer" style={{ background: c, borderColor: w.color === c ? '#0B2240' : 'transparent' }} onClick={() => set(w, 'color', c)} />)}</span></Td>
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
  const { waves, kt, open } = tx
  const sorted = sortWaves(waves.items)
  const [q, setQ] = useState('')
  const [fWave, setFWave] = useState('All')
  const rows = useMemo(() => kt.items.filter((k) => (fWave === 'All' || k.wave === Number(fWave)) && (!q || `${k.process} ${k.function} ${k.globalOwner} ${k.indiaOwner}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.wave - b.wave || a.targetDate.localeCompare(b.targetDate)), [kt.items, q, fWave])
  const s = ktStats(kt.items)
  const setSessions = (k: KtItem, planned: number, done: number) => {
    const status: KtStatus = done >= planned && planned > 0 ? 'Completed' : done > 0 ? 'In Progress' : 'Not Started'
    kt.update({ ...k, sessionsPlanned: planned, sessionsDone: done, status, signOff: status === 'Completed' && k.signOff === 'Not Started' ? 'Pending' : k.signOff })
  }
  const set = <K extends keyof KtItem>(k: KtItem, key: K, v: KtItem[K]) => kt.update({ ...k, [key]: v })
  const add = () => kt.add({ id: uid('kt'), process: '', function: KT_FUNCTIONS[0], wave: fWave === 'All' ? (sorted[0]?.number ?? 1) : Number(fWave), globalOwner: '', indiaOwner: OWNERS[0], sessionsPlanned: 6, sessionsDone: 0, status: 'Not Started', signOff: 'Not Started', targetDate: TODAY })
  return (
    <Card title="Knowledge transfer items" subtitle={`${s.total} items · ${s.done} of ${s.planned} sessions delivered (${s.pct}%) · ${s.signed} signed off. Status follows the sessions; sign-off is recorded by the global owner.`} action={<AddBtn label="Add KT item" onClick={add} />}>
      <GridToolbar q={q} onQ={setQ} placeholder="Search process, function, owner…" count={rows.length}>
        <select className="input py-1.5 w-auto text-[12.5px]" value={fWave} onChange={(e) => setFWave(e.target.value)}>{['All', ...waveNos(sorted)].map((w) => <option key={w} value={w}>{w === 'All' ? 'All waves' : waveLabel(Number(w))}</option>)}</select>
      </GridToolbar>
      <Grid count={rows.length} minWidth={1180} headers={['Process / activity', 'Function', 'Wave', 'Global owner', 'India owner', { label: 'Planned', right: true }, { label: 'Done', right: true }, 'Status', 'Sign-off', 'Target date', '']}>
        {rows.map((k) => (
          <Row key={k.id}>
            <Td min={240}><TextCell value={k.process} placeholder="Process or activity" className="font-medium" onChange={(v) => set(k, 'process', v)} /></Td>
            <Td><SelectCell value={k.function} options={KT_FUNCTIONS} onChange={(v) => set(k, 'function', v)} /></Td>
            <Td><span className="flex items-center gap-1"><WaveDot wave={sorted.find((w) => w.number === k.wave)} size={20} /><SelectCell value={String(k.wave)} options={waveNos(sorted)} onChange={(v) => set(k, 'wave', Number(v))} className="w-[52px]" /></span></Td>
            <Td min={110}><TextCell value={k.globalOwner} placeholder="Global owner" onChange={(v) => set(k, 'globalOwner', v)} /></Td>
            <Td><SelectCell value={k.indiaOwner} options={OWNERS} onChange={(v) => set(k, 'indiaOwner', v)} /></Td>
            <Td><NumCell value={k.sessionsPlanned} min={0} className="w-[60px]" onChange={(v) => setSessions(k, v, k.sessionsDone)} /></Td>
            <Td><NumCell value={k.sessionsDone} min={0} className="w-[60px]" onChange={(v) => setSessions(k, k.sessionsPlanned, v)} /></Td>
            <Td><SelectCell value={k.status} options={KT_STATUSES} onChange={(v) => set(k, 'status', v)} /></Td>
            <Td><SelectCell value={k.signOff} options={KT_SIGNOFF} onChange={(v) => set(k, 'signOff', v)} /></Td>
            <Td><DateCell value={k.targetDate} onChange={(v) => set(k, 'targetDate', v)} /></Td>
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
  const { waves, assessments, open } = tx
  const sorted = sortWaves(waves.items)
  const [sel, setSel] = useState<number>(tx.currentWave.number)
  const wave = sorted.find((w) => w.number === sel) ?? sorted[0]
  const wsList = Array.from(new Set([...READINESS_WORKSTREAMS, ...assessments.items.map((a) => a.workstream)]))
  const rows = wsList.map((ws) => ({ ws, a: assessments.items.find((x) => x.wave === wave?.number && x.workstream === ws) }))
  const setDim = (a: ReadinessAssessment, d: Dimension, v: number) => assessments.update({ ...a, dims: { ...a.dims, [d]: v }, assessedOn: TODAY })
  const create = (ws: string) => assessments.add({ id: uid('ra'), wave: wave?.number ?? 1, workstream: ws, dims: Object.fromEntries(DIMENSIONS.map((d) => [d, 50])) as Record<Dimension, number>, status: 'Not Started', nextAction: '', assessedOn: TODAY })
  const avg = (d: Dimension) => { const list = rows.map((r) => r.a).filter((a): a is ReadinessAssessment => !!a); return list.length ? Math.round(list.reduce((s, a) => s + a.dims[d], 0) / list.length) : 0 }
  const waveAvg = (() => { const list = rows.map((r) => r.a).filter((a): a is ReadinessAssessment => !!a); return list.length ? Math.round(list.reduce((s, a) => s + assessmentScore(a), 0) / list.length) : 0 })()
  return (
    <Card title="Readiness assessments" subtitle="Score each workstream on the five readiness dimensions (0–100) per wave. The overall score is the average of the dimensions and feeds the readiness matrix."
      headerRight={<div className="flex items-center gap-1">{sorted.map((w) => <button key={w.id} onClick={() => setSel(w.number)} className={clsx('rounded-full border-2 cursor-pointer transition-all', sel === w.number ? 'border-navy-900' : 'border-transparent')} title={`Wave ${w.number} – ${w.scope}`}><WaveDot wave={w} size={24} /></button>)}</div>}>
      {wave && <div className="text-[12.5px] text-ink-700 mb-3">Wave {wave.number} – {wave.scope} · average readiness <b>{waveAvg}%</b></div>}
      <Grid count={rows.length} minWidth={1120} headers={['Workstream', ...DIMENSIONS.map((d) => ({ label: d.replace(' & ', ' & '), right: true })), { label: 'Score', right: true }, 'Status', 'Next action', '']}>
        {rows.map(({ ws, a }) => (
          <Row key={ws}>
            <Td min={170}><span className="px-1.5 text-[12.5px] font-medium">{ws}</span></Td>
            {DIMENSIONS.map((d) => <Td key={d}>{a ? <NumCell value={a.dims[d] ?? 0} min={0} max={100} className="w-[64px]" onChange={(v) => setDim(a, d, v)} /> : <span className="block text-right text-ink-400 pr-2">–</span>}</Td>)}
            <Td className="text-right">{a ? <span className="inline-flex items-center justify-center w-12 h-6 rounded-md text-[12px] font-semibold text-white" style={{ background: readinessColor(assessmentScore(a)) }}>{assessmentScore(a)}%</span> : <span className="text-ink-400 pr-2">–</span>}</Td>
            <Td>{a ? <SelectCell value={a.status} options={READINESS_STATUSES} onChange={(v) => assessments.update({ ...a, status: v as ReadinessAssessment['status'] })} /> : null}</Td>
            <Td min={220}>{a ? <TextCell value={a.nextAction} placeholder="Next action" onChange={(v) => assessments.update({ ...a, nextAction: v })} /> : <button className="link px-1.5" onClick={() => create(ws)}>+ Assess this workstream</button>}</Td>
            <Td sticky>{a && <><EditBtn onClick={() => open({ kind: 'assessment', item: a })} /><RemoveBtn name={`the ${ws} assessment for Wave ${a.wave}`} onClick={() => assessments.remove(a.id)} /></>}</Td>
          </Row>
        ))}
        <tr><td className="text-[12px] text-ink-500 px-2 py-2">Wave average</td>{DIMENSIONS.map((d) => <td key={d} className="text-right text-[12.5px] font-semibold px-2 py-2">{avg(d)}%</td>)}<td className="text-right text-[12.5px] font-semibold px-2 py-2">{waveAvg}%</td><td colSpan={3} /></tr>
      </Grid>
    </Card>
  )
}

/* ================================================================== */
/* Readiness gaps                                                      */
/* ================================================================== */
function GapsTab({ tx }: { tx: Tx }) {
  const { waves, gaps, open } = tx
  const sorted = sortWaves(waves.items)
  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('All')
  const rows = useMemo(() => gaps.items.filter((g) => (fStatus === 'All' || g.status === fStatus) && (!q || `${g.code} ${g.description} ${g.owner} ${g.workstream}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (a.status === 'Resolved' ? 1 : 0) - (b.status === 'Resolved' ? 1 : 0) || b.raised.localeCompare(a.raised)), [gaps.items, q, fStatus])
  const set = <K extends keyof ReadinessGap>(g: ReadinessGap, k: K, v: ReadinessGap[K]) => gaps.update({ ...g, [k]: v })
  const add = () => { const n = gaps.items.reduce((m, g) => Math.max(m, parseInt(g.code.split('-')[1] ?? '0', 10) || 0), 0) + 1; gaps.add({ id: uid('gap'), code: `G-${String(n).padStart(3, '0')}`, wave: sorted[0]?.number ?? 1, dimension: DIMENSIONS[0], workstream: READINESS_WORKSTREAMS[0], description: '', severity: 'Medium', owner: OWNERS[0], status: 'New', raised: TODAY, due: TODAY }) }
  const count = (s: string) => gaps.items.filter((g) => g.status === s).length
  return (
    <Card title="Readiness gaps" subtitle={`${gaps.items.length} gaps · ${count('New')} new · ${count('Open')} open · ${count('Resolved')} resolved. New and resolved counts feed the Readiness Gaps tile.`} action={<AddBtn label="Add gap" onClick={add} />}>
      <GridToolbar q={q} onQ={setQ} placeholder="Search gaps…" count={rows.length}>
        <select className="input py-1.5 w-auto text-[12.5px]" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>{['All', ...GAP_STATUSES].map((s) => <option key={s}>{s}</option>)}</select>
      </GridToolbar>
      <Grid count={rows.length} minWidth={1240} headers={['ID', 'Gap', 'Wave', 'Dimension', 'Workstream', 'Severity', 'Owner', 'Status', 'Raised', 'Due', '']}>
        {rows.map((g) => (
          <Row key={g.id} muted={g.status === 'Resolved'}>
            <Td><TextCell value={g.code} className="w-[64px] text-ink-500" onChange={(v) => set(g, 'code', v)} /></Td>
            <Td min={280}><TextCell value={g.description} placeholder="Describe the gap" className="font-medium" onChange={(v) => set(g, 'description', v)} /></Td>
            <Td><SelectCell value={String(g.wave)} options={waveNos(sorted)} onChange={(v) => set(g, 'wave', Number(v))} className="w-[52px]" /></Td>
            <Td><SelectCell value={g.dimension} options={DIMENSIONS} onChange={(v) => set(g, 'dimension', v)} /></Td>
            <Td><SelectCell value={g.workstream} options={READINESS_WORKSTREAMS} onChange={(v) => set(g, 'workstream', v)} /></Td>
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
  const { waves, milestones, msWaves, open } = tx
  const sorted = sortWaves(waves.items)
  const rows = useMemo(() => milestones.items.filter((m) => m.phase === 'Transition').map((m) => ({ m, wave: milestoneWave(m, sorted, msWaves.items) })).sort((a, b) => a.m.dueDate.localeCompare(b.m.dueDate)), [milestones.items, msWaves.items, sorted])
  const set = <K extends keyof Milestone>(m: Milestone, k: K, v: Milestone[K]) => milestones.update({ ...m, [k]: v })
  const add = () => { const id = uid('ms'); milestones.add({ id, name: '', workstream: 'Transition Readiness', dueDate: TODAY, status: 'Not Started', owner: OWNERS[0], phase: 'Transition', critical: false }); msWaves.update({ id, wave: tx.currentWave.number }) }
  return (
    <Card title="Transition milestones" subtitle="Milestones in the Transition phase of the shared program milestone list. Setting the wave here overrides the wave derived from the milestone name or date." action={<AddBtn label="Add milestone" onClick={add} />}>
      <Grid count={rows.length} minWidth={1000} headers={['Milestone', 'Wave', 'Workstream', 'Target date', 'Status', 'Owner', { label: 'Key', width: '50px' }, '']}>
        {rows.map(({ m, wave }) => (
          <Row key={m.id}>
            <Td min={300}><TextCell value={m.name} placeholder="Milestone" className="font-medium" onChange={(v) => set(m, 'name', v)} /></Td>
            <Td><span className="flex items-center gap-1"><WaveDot wave={sorted.find((w) => w.number === wave)} size={20} /><SelectCell value={wave ? String(wave) : '–'} options={['–', ...waveNos(sorted)]} className="w-[56px]" onChange={(v) => (v === '–' ? msWaves.remove(m.id) : msWaves.update({ id: m.id, wave: Number(v) }))} /></span></Td>
            <Td><SelectCell value={m.workstream} options={WORKSTREAMS} onChange={(v) => set(m, 'workstream', v as Milestone['workstream'])} /></Td>
            <Td><DateCell value={m.dueDate} onChange={(v) => set(m, 'dueDate', v)} /></Td>
            <Td><SelectCell value={m.status} options={MS_STATUSES} onChange={(v) => set(m, 'status', v as Milestone['status'])} /></Td>
            <Td><SelectCell value={m.owner} options={OWNERS} onChange={(v) => set(m, 'owner', v)} /></Td>
            <Td><CheckCell value={!!m.critical} title="Key milestone (shown on the Dashboard)" onChange={(v) => set(m, 'critical', v)} /></Td>
            <Td sticky><EditBtn onClick={() => open({ kind: 'milestone', item: m, wave })} /><RemoveBtn name={m.name || 'this milestone'} onClick={() => { milestones.remove(m.id); msWaves.remove(m.id) }} /></Td>
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
  const { settings, waves } = tx
  const sorted = sortWaves(waves.items)
  const [f, setF] = useState<TransitionSettings>(settings)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(settings)
  const num = (v: string) => (v === '' ? 0 : Number(v))
  const save = () => { onSave(f); setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const arr = (key: 'trendPlanned' | 'trendActual', i: number, v: number) => setF({ ...f, [key]: f[key].map((x, j) => (j === i ? v : x)) })
  return (
    <div className="grid grid-cols-[1.1fr_1fr] gap-4">
      <Card title="Headline KPIs and go-live" subtitle="Numbers that cannot be derived from the registers: month-on-month deltas and the target go-live.">
        <FormGrid cols={3}>
          <Field label="Go-live wave"><Select options={waveNos(sorted)} value={String(f.goLiveWave)} onChange={(e) => setF({ ...f, goLiveWave: Number(e.target.value) })} /></Field>
          <Field label="Target go-live date"><Input type="date" value={f.goLiveDate} onChange={(e) => setF({ ...f, goLiveDate: e.target.value })} /></Field>
          <Field label="Go-live status"><Select options={['On track', 'At risk', 'Delayed']} value={f.goLiveStatus} onChange={(e) => setF({ ...f, goLiveStatus: e.target.value as TransitionSettings['goLiveStatus'] })} /></Field>
          <Field label="KT change vs last month (%)"><Input type="number" value={f.ktDeltaPct} onChange={(e) => setF({ ...f, ktDeltaPct: num(e.target.value) })} /></Field>
          <Field label="Stabilization change vs last month (%)"><Input type="number" value={f.stabilizationDeltaPct} onChange={(e) => setF({ ...f, stabilizationDeltaPct: num(e.target.value) })} /></Field>
          <Field label="Readiness 'complete' threshold (%)"><Input type="number" min={0} max={100} value={f.readinessThreshold} onChange={(e) => setF({ ...f, readinessThreshold: num(e.target.value) })} /></Field>
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
      <Card title="Program-level readiness by dimension" subtitle="Scores shown on the Transition Readiness by Dimension card (0–100).">
        <div className="space-y-3">
          {DIMENSIONS.map((d) => (
            <div key={d} className="flex items-center gap-3 text-[12.5px]">
              <span className="w-[190px] text-ink-700">{d}</span>
              <input type="range" min={0} max={100} value={f.dims[d]} onChange={(e) => setF({ ...f, dims: { ...f.dims, [d]: num(e.target.value) } })} className="flex-1 accent-brand-600" />
              <Input type="number" min={0} max={100} value={f.dims[d]} onChange={(e) => setF({ ...f, dims: { ...f.dims, [d]: Math.max(0, Math.min(100, num(e.target.value))) } })} className="!w-20" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[12.5px] mt-4 pt-3 border-t border-line"><span className="text-ink-500">Average readiness</span><Badge value={Math.round(DIMENSIONS.reduce((s, d) => s + f.dims[d], 0) / DIMENSIONS.length) >= f.readinessThreshold ? 'On Track' : 'At Risk'} /></div>
        <SaveBar dirty={dirty} saved={saved} onSave={save} onDiscard={() => setF(settings)} />
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
    <InputLayout title="Transition Management" subtitle="Maintain the waves, knowledge transfer tracker, readiness scores, gaps and stabilization checklist that drive the transition dashboards."
      tabs={[
        { name: 'Waves', content: <WavesTab tx={tx} /> },
        { name: 'Knowledge transfer items', content: <KtTab tx={tx} /> },
        { name: 'Readiness assessments', content: <AssessmentsTab tx={tx} /> },
        { name: 'Readiness gaps', content: <GapsTab tx={tx} /> },
        { name: 'Stabilization checklist', content: <ChecklistTab tx={tx} /> },
        { name: 'Transition milestones', content: <MilestonesTab tx={tx} /> },
        { name: 'Settings', content: <SettingsTab tx={tx} onSave={onSaveSettings} /> },
      ]} />
  )
}
