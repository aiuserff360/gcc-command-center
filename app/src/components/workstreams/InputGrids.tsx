/**
 * Workstreams – Input view. Inline-editable grids for every collection the delivery plan is built from
 * (workstreams, initiatives, milestones, WBS activities, people, budget lines, dependencies, documents).
 * Every cell writes straight to its collection through `update`, so the Output view, Program Planning
 * and the Dashboard reflect the change immediately.
 */
import { useMemo, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Plus, Trash2, Star } from 'lucide-react'
import { Card } from '../ui'
import { useCollection, useStore, uid } from '../../store/useStore'
import { OWNERS, TODAY, programDef, type Workstream, type Status, type Impact } from '../../data/common'
import { seedMilestones, seedDependencies, type Milestone, type Dependency } from '../../data/shared'
import {
  seedInitiatives, seedTeamMembers, seedWsBudgetLines, seedWsDocuments, INITIATIVE_STATUSES, MEMBER_TYPES, DOC_TYPES, DOC_STATUSES, ROLE_PROFILE, FUNCTION_AREAS,
  type Initiative, type TeamMember, type WsBudgetLine, type WsDocument,
} from '../../data/workstreams'
import { WBS, WBS_TO_DASHBOARD, seedActivities, type Activity } from '../../data/wbs'
import { daysBetween } from '../../data/planning'
import { useMoney, type Money } from '../../data/money'
import { MiniSelect, Toolbar, type WsRow } from './common'
import { useWsRows } from './views'
import { DEP_TYPES } from '../planning/Modals'

export const ALL_WS = 'All workstreams'
const ALL_SUB = 'All sub-workstreams'
const WS_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Not Started', 'Completed'] as const
const MS_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Pending', 'Not Started', 'Completed'] as const
const MS_PHASES = ['Design', 'Build', 'Transition', 'Operate'] as const
const ACT_STATUSES = ['Not Started', 'In Progress', 'At Risk', 'Delayed', 'Completed'] as const
const DEP_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Completed'] as const
const IMPACTS = ['Critical', 'High', 'Medium', 'Low'] as const
const RAGS = ['Green', 'Amber', 'Red'] as const
const uniq = (a: string[]) => a.filter((v, i) => v && a.indexOf(v) === i)
const numeric = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })
const wbsLabel = (w: (typeof WBS)[number]) => `${w.code}. ${w.name}`
const subLabel = (s: (typeof WBS)[number]['subs'][number]) => `${s.code} ${s.name}`
const inScope = (ws: string, rowWs: string) => ws === ALL_WS || rowWs === ws
const pickWs = (ws: string, names: string[]) => (ws === ALL_WS ? names[0] ?? '' : ws) as Workstream

/* ------------------------------------------------------------------ */
/* Cell primitives                                                     */
/* ------------------------------------------------------------------ */
const cell = 'w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-[12px] outline-none hover:border-slate-300 focus:border-brand-400 focus:bg-white'
function Txt({ value, onChange, placeholder, className, list }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; list?: string }) {
  return <input className={clsx(cell, className)} value={value} placeholder={placeholder} list={list} onChange={(e) => onChange(e.target.value)} />
}
/** Text cell that commits on blur / Enter (used where a change cascades to other collections). */
function TxtCommit({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => { if (draft !== null && draft.trim() && draft.trim() !== value) onChange(draft.trim()); setDraft(null) }
  return <input className={clsx(cell, className)} value={draft ?? value} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
}
function Dt({ value, onChange, allowEmpty }: { value: string; onChange: (v: string) => void; allowEmpty?: boolean }) {
  return <input type="date" className={clsx(cell, 'w-[110px]')} value={value} onChange={(e) => (e.target.value || allowEmpty) && onChange(e.target.value)} />
}
function Num({ value, onChange, max = 100, width = 64 }: { value: number; onChange: (v: number) => void; max?: number; width?: number }) {
  return <input type="number" min={0} max={max} className={clsx(cell, 'text-right')} style={{ width }} value={value} onChange={(e) => onChange(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))} />
}
function Sel({ value, options, onChange, className }: { value: string; options: readonly string[]; onChange: (v: string) => void; className?: string }) {
  return <select className={clsx(cell, 'cursor-pointer', className)} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
}
function SelKV({ value, options, onChange, empty = '—', className }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; empty?: string; className?: string }) {
  return (
    <select className={clsx(cell, 'cursor-pointer', className)} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{empty}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
function Chk({ checked, onChange, title }: { checked: boolean; onChange: (v: boolean) => void; title?: string }) {
  return <span className="flex justify-center"><input type="checkbox" title={title} className="w-4 h-4 accent-brand-600 cursor-pointer" checked={checked} onChange={(e) => onChange(e.target.checked)} /></span>
}
/** Money stored in ₹ Cr, edited in the display currency. Keeps a draft while focused so typing is not re-formatted mid-way. */
function MoneyCell({ cr, onChange, m }: { cr: number; onChange: (cr: number) => void; m: Money }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input type="number" step="any" min={0} className={clsx(cell, 'w-[80px] text-right')} value={draft ?? String(m.inputValue(cr))}
      onFocus={() => setDraft(String(m.inputValue(cr)))}
      onChange={(e) => { setDraft(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(m.toBase(Math.max(0, v))) }}
      onBlur={() => setDraft(null)} />
  )
}
function Td({ children, className }: { children?: ReactNode; className?: string }) { return <td className={clsx('px-0.5 py-0.5 border-b border-slate-200 align-middle', className)}>{children}</td> }
function Del({ onClick, label }: { onClick: () => void; label: string }) {
  return <button title="Remove row" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => { if (window.confirm(`Remove ${label || 'this row'}?`)) onClick() }}><Trash2 size={14} /></button>
}
type Head = string | { label: string; className?: string }
function Grid({ head, children, minWidth = 1000, empty, emptyText = 'No rows yet – use the Add button above.' }: { head: Head[]; children: ReactNode; minWidth?: number; empty?: boolean; emptyText?: string }) {
  return (
    <div className="overflow-x-auto scroll-thin -mx-1">
      <table className="w-full border-separate border-spacing-0" style={{ minWidth }}>
        <thead><tr>{head.map((h, i) => { const o = typeof h === 'string' ? { label: h } : h; return <th key={i} className={clsx('text-left text-[11.5px] font-semibold text-slate-600 px-1.5 py-1.5 bg-slate-100 border-b border-slate-300 whitespace-nowrap', o.className)}>{o.label}</th> })}</tr></thead>
        <tbody>
          {children}
          {empty && <tr><td colSpan={head.length} className="text-center text-slate-500 italic py-5 text-[12.5px]">{emptyText}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
function GroupRow({ label, cols }: { label: string; cols: number }) { return <tr><td colSpan={cols} className="text-[12px] font-medium text-brand-700 bg-brand-50/50 border-b border-slate-200 px-2 py-1.5">{label}</td></tr> }
const AddBtn = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => <button className="btn-primary" onClick={onClick}><Plus size={14} /> {children}</button>
const R = 'text-right'

/* ------------------------------------------------------------------ */
/* Workstream selector shared by the grids                            */
/* ------------------------------------------------------------------ */
export type GridProps = { ws: string; onWs: (v: string) => void }
export function WsFilter({ value, onChange, names, allowAll = true }: { value: string; onChange: (v: string) => void; names: string[]; allowAll?: boolean }) {
  const opts = allowAll ? [ALL_WS, ...names] : names
  return <MiniSelect label="Workstream" value={opts.includes(value) ? value : opts[0]} options={opts} onChange={onChange} width={250} />
}
const Count = ({ n, one, many }: { n: number; one: string; many: string }) => <span className="text-[12px] text-ink-500">{n} {n === 1 ? one : many}</span>

/* ------------------------------------------------------------------ */
/* Workstreams                                                         */
/* ------------------------------------------------------------------ */
/** Collections that reference a workstream by name – kept in sync when a workstream is renamed. */
const RENAME_CASCADE: [string, string[]][] = [
  ['initiatives', ['workstream']], ['milestones', ['workstream']], ['activities', ['workstream']], ['teamMembers', ['workstream']],
  ['wsBudgetLines', ['workstream']], ['wsDocuments', ['workstream']], ['dependencies', ['from', 'on']],
]
function renameWorkstream(from: string, to: string) {
  const s = useStore.getState()
  RENAME_CASCADE.forEach(([name, keys]) => {
    const list = s.collections[name]
    if (!list || !list.some((r) => keys.some((k) => (r as Record<string, unknown>)[k] === from))) return
    s.setAll(name, list.map((r) => {
      const o = r as Record<string, unknown>
      if (!keys.some((k) => o[k] === from)) return r
      const n = { ...o }
      keys.forEach((k) => { if (n[k] === from) n[k] = to })
      return n as typeof r
    }))
  })
}
export function WorkstreamGrid() {
  const { items, add, update, remove } = useWsRows()
  const m = useMoney()
  const set = <K extends keyof WsRow>(w: WsRow, k: K, v: WsRow[K]) => update({ ...w, [k]: v })
  const rename = (w: WsRow, name: string) => { update({ ...w, name: name as Workstream }); renameWorkstream(w.name, name) }
  const blank = (): WsRow => ({ id: uid('ws'), name: 'New workstream' as Workstream, description: '', progress: 0, status: 'Not Started', owner: OWNERS[0], lead: OWNERS[0], executiveSponsor: '', teamSize: 0, activeInitiatives: 0, scheduleHealth: 'Not Started', budgetHealth: 'On Track', approvedBudgetCr: 0, actualSpendCr: 0, forecastAtCompletionCr: 0 })
  const tot = (k: 'approvedBudgetCr' | 'actualSpendCr' | 'forecastAtCompletionCr') => items.reduce((a, w) => a + w[k], 0)
  return (
    <Card title="Workstreams" subtitle="The delivery workstreams of the program: who leads and sponsors each one, its status and progress, planned team size and budget. Renaming a workstream renames it everywhere it is referenced."
      action={<AddBtn onClick={() => add(blank())}>Add workstream</AddBtn>}>
      <Grid minWidth={1180} empty={!items.length} head={['Workstream', 'Description', 'Lead', 'Owner', 'Executive sponsor', 'Status', { label: 'Progress %', className: R }, { label: 'Team size', className: R }, { label: `Approved (${m.unitLabel})`, className: R }, { label: `Actual (${m.unitLabel})`, className: R }, { label: `Forecast (${m.unitLabel})`, className: R }, '']}>
        {items.map((w) => (
          <tr key={w.id} className="hover:bg-brand-50/40">
            <Td className="min-w-[170px]"><TxtCommit className="font-medium" value={w.name} onChange={(v) => rename(w, v)} /></Td>
            <Td className="min-w-[180px]"><Txt value={w.description} placeholder="What this workstream delivers" onChange={(v) => set(w, 'description', v)} /></Td>
            <Td className="min-w-[96px]"><Sel value={w.lead} options={uniq([w.lead, ...OWNERS])} onChange={(v) => set(w, 'lead', v)} /></Td>
            <Td className="min-w-[96px]"><Sel value={w.owner} options={uniq([w.owner, ...OWNERS])} onChange={(v) => set(w, 'owner', v)} /></Td>
            <Td className="min-w-[130px]"><Txt value={w.executiveSponsor} placeholder="e.g. Global CIO" onChange={(v) => set(w, 'executiveSponsor', v)} /></Td>
            <Td className="min-w-[104px]"><Sel value={w.status} options={WS_STATUSES} onChange={(v) => set(w, 'status', v as Status)} /></Td>
            <Td><Num value={w.progress} onChange={(v) => set(w, 'progress', v)} /></Td>
            <Td><Num value={w.teamSize} max={9999} onChange={(v) => set(w, 'teamSize', v)} /></Td>
            <Td><MoneyCell cr={w.approvedBudgetCr} m={m} onChange={(v) => set(w, 'approvedBudgetCr', v)} /></Td>
            <Td><MoneyCell cr={w.actualSpendCr} m={m} onChange={(v) => set(w, 'actualSpendCr', v)} /></Td>
            <Td><MoneyCell cr={w.forecastAtCompletionCr} m={m} onChange={(v) => set(w, 'forecastAtCompletionCr', v)} /></Td>
            <Td><Del label={w.name} onClick={() => remove(w.id)} /></Td>
          </tr>
        ))}
        {items.length > 0 && (
          <tr><td colSpan={7} className="text-right text-[12px] text-ink-500 px-2 py-2">Total</td><td className="text-right text-[12.5px] font-semibold px-2 py-2">{items.reduce((a, w) => a + w.teamSize, 0)}</td>
            {(['approvedBudgetCr', 'actualSpendCr', 'forecastAtCompletionCr'] as const).map((k) => <td key={k} className="text-right text-[12.5px] font-semibold px-2 py-2 whitespace-nowrap">{m.num(tot(k), 2)}</td>)}<td /></tr>
        )}
      </Grid>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Initiatives                                                         */
/* ------------------------------------------------------------------ */
export function InitiativeGrid({ ws, onWs }: GridProps) {
  const { names, items: wss } = useWsRows()
  const c = useCollection<Initiative>('initiatives', seedInitiatives)
  const { items: milestones } = useCollection<Milestone>('milestones', seedMilestones)
  const all = ws === ALL_WS
  const rows = useMemo(() => c.items.filter((i) => inScope(ws, i.workstream)), [c.items, ws])
  const set = <K extends keyof Initiative>(i: Initiative, k: K, v: Initiative[K]) => c.update({ ...i, [k]: v })
  const add = () => { const w = pickWs(ws, names); c.add({ id: uid('init'), name: 'New initiative', workstream: w, owner: wss.find((x) => x.name === w)?.lead || OWNERS[0], status: 'Not Started', start: TODAY, end: '2026-12-31', progress: 0 }) }
  return (
    <Card title="Initiatives" subtitle="The initiatives each workstream is delivering, with owner, dates, status and the milestone they lead to. These are the first rows of every workstream plan in Program Planning."
      action={<AddBtn onClick={add}>Add initiative</AddBtn>}>
      <Toolbar right={<Count n={rows.length} one="initiative" many="initiatives" />}><WsFilter value={ws} onChange={onWs} names={names} /></Toolbar>
      <Grid minWidth={all ? 1180 : 1040} empty={!rows.length} head={['#', 'Initiative', ...(all ? ['Workstream'] : []), 'Owner', 'Start', 'Finish', 'Status', { label: '% complete', className: R }, 'Linked milestone', '']}>
        {rows.map((i, idx) => (
          <tr key={i.id} className="hover:bg-brand-50/40">
            <Td className="text-[11px] text-slate-500 px-2 w-8">{idx + 1}</Td>
            <Td className="min-w-[220px]"><Txt className="font-medium" value={i.name} onChange={(v) => set(i, 'name', v)} /></Td>
            {all && <Td><Sel value={i.workstream} options={uniq([i.workstream, ...names])} onChange={(v) => c.update({ ...i, workstream: v as Workstream, milestoneId: undefined })} /></Td>}
            <Td><Sel value={i.owner} options={uniq([i.owner, ...OWNERS])} onChange={(v) => set(i, 'owner', v)} /></Td>
            <Td><Dt value={i.start} onChange={(v) => c.update({ ...i, start: v, end: i.end < v ? v : i.end })} /></Td>
            <Td><Dt value={i.end} onChange={(v) => c.update({ ...i, end: v, start: i.start > v ? v : i.start })} /></Td>
            <Td className="min-w-[104px]"><Sel value={i.status} options={INITIATIVE_STATUSES} onChange={(v) => c.update({ ...i, status: v as Initiative['status'], progress: v === 'Completed' ? 100 : i.progress })} /></Td>
            <Td><Num value={i.progress} onChange={(v) => set(i, 'progress', v)} /></Td>
            <Td className="min-w-[190px]"><SelKV value={i.milestoneId ?? ''} empty="— none —" options={milestones.filter((m) => m.workstream === i.workstream).map((m) => ({ value: m.id, label: m.name }))} onChange={(v) => set(i, 'milestoneId', v || undefined)} /></Td>
            <Td><Del label={i.name} onClick={() => c.remove(i.id)} /></Td>
          </tr>
        ))}
      </Grid>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Milestones (shared 'milestones' collection)                         */
/* ------------------------------------------------------------------ */
export function MilestoneGrid({ ws, onWs }: GridProps) {
  const { names, items: wss } = useWsRows()
  const c = useCollection<Milestone>('milestones', seedMilestones)
  const all = ws === ALL_WS
  const rows = useMemo(() => c.items.filter((m) => inScope(ws, m.workstream)), [c.items, ws])
  const set = <K extends keyof Milestone>(m: Milestone, k: K, v: Milestone[K]) => c.update({ ...m, [k]: v })
  const add = () => { const w = pickWs(ws, names); c.add({ id: uid('ms'), name: 'New milestone', workstream: w, dueDate: TODAY, status: 'Pending', owner: wss.find((x) => x.name === w)?.lead || OWNERS[0], phase: 'Build', progress: 0, critical: false }) }
  return (
    <Card title="Milestones" subtitle="Milestones per workstream and phase. Key milestones (star) appear on the Dashboard and in the Program Planning master plan; the start date is optional and only draws a bar on the timeline."
      action={<AddBtn onClick={add}>Add milestone</AddBtn>}>
      <Toolbar right={<Count n={rows.length} one="milestone" many="milestones" />}><WsFilter value={ws} onChange={onWs} names={names} /></Toolbar>
      <Grid minWidth={all ? 1100 : 980} empty={!rows.length} head={['#', 'Milestone', ...(all ? ['Workstream'] : []), 'Phase', 'Start (optional)', 'Due', 'Status', 'Owner', { label: '% complete', className: R }, { label: 'Key', className: 'text-center' }, '']}>
        {rows.map((m, idx) => (
          <tr key={m.id} className="hover:bg-brand-50/40">
            <Td className="text-[11px] text-slate-500 px-2 w-8">{idx + 1}</Td>
            <Td className="min-w-[220px]"><Txt className="font-medium" value={m.name} onChange={(v) => set(m, 'name', v)} /></Td>
            {all && <Td><Sel value={m.workstream} options={uniq([m.workstream, ...names])} onChange={(v) => set(m, 'workstream', v as Workstream)} /></Td>}
            <Td><Sel value={m.phase} options={MS_PHASES} onChange={(v) => set(m, 'phase', v as Milestone['phase'])} /></Td>
            <Td><Dt value={m.startDate ?? ''} allowEmpty onChange={(v) => set(m, 'startDate', v || undefined)} /></Td>
            <Td><Dt value={m.dueDate} onChange={(v) => set(m, 'dueDate', v)} /></Td>
            <Td className="min-w-[104px]"><Sel value={m.status} options={MS_STATUSES} onChange={(v) => c.update({ ...m, status: v as Status, progress: v === 'Completed' ? 100 : m.progress })} /></Td>
            <Td><Sel value={m.owner} options={uniq([m.owner, ...OWNERS])} onChange={(v) => set(m, 'owner', v)} /></Td>
            <Td><Num value={m.progress ?? 0} onChange={(v) => set(m, 'progress', v)} /></Td>
            <Td className="text-center"><button title="Key milestone (shown on the Dashboard)" className={clsx('p-1 cursor-pointer', m.critical ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400')} onClick={() => set(m, 'critical', !m.critical)}><Star size={14} fill={m.critical ? 'currentColor' : 'none'} /></button></Td>
            <Td><Del label={m.name} onClick={() => c.remove(m.id)} /></Td>
          </tr>
        ))}
      </Grid>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* WBS activities                                                      */
/* ------------------------------------------------------------------ */
export function ActivityGrid({ ws, onWs }: GridProps) {
  const { names, items: wss } = useWsRows()
  const c = useCollection<Activity>('activities', seedActivities)
  const wsName = pickWs(ws, names)
  const mine = useMemo(() => c.items.filter((a) => a.workstream === wsName), [c.items, wsName])
  /** Sub-workstreams from the WBS library mapped to this workstream, plus any custom ones already in use. */
  const subs = useMemo(() => {
    const lib = WBS.filter((w) => WBS_TO_DASHBOARD[wbsLabel(w)] === wsName).flatMap((w) => w.subs.map((s) => ({ wbs: wbsLabel(w), sub: subLabel(s) })))
    mine.forEach((a) => { if (!lib.some((x) => x.sub === a.subWorkstream)) lib.push({ wbs: a.wbsWorkstream, sub: a.subWorkstream }) })
    return lib.sort((a, b) => numeric(a.sub, b.sub))
  }, [wsName, mine])
  const [subSel, setSubSel] = useState(ALL_SUB)
  const sub = subs.some((s) => s.sub === subSel) ? subSel : ALL_SUB
  const rows = useMemo(() => mine.filter((a) => sub === ALL_SUB || a.subWorkstream === sub).sort((a, b) => numeric(a.subWorkstream, b.subWorkstream) || numeric(a.code, b.code)), [mine, sub])
  const upd = (a: Activity, patch: Partial<Activity>) => {
    const n = { ...a, ...patch, lastUpdated: TODAY }
    n.daysDelayed = n.baselineEnd && n.forecastEnd ? Math.max(0, daysBetween(n.baselineEnd, n.forecastEnd)) : 0
    c.update(n)
  }
  const add = () => {
    const s = sub === ALL_SUB ? subs[0] : subs.find((x) => x.sub === sub)
    if (!s) return
    const n = mine.filter((a) => a.subWorkstream === s.sub).length + 1
    c.add({ id: uid('act'), code: `${s.sub.split(' ')[0]}.${n}`, name: 'New activity', wbsWorkstream: s.wbs, subWorkstream: s.sub, workstream: wsName, responsible: wss.find((x) => x.name === wsName)?.lead || OWNERS[0], accountable: OWNERS[0], vendor: '',
      baselineStart: TODAY, baselineEnd: '2026-12-31', forecastStart: TODAY, forecastEnd: '2026-12-31', actualStart: '', actualEnd: '', status: 'Not Started', percentComplete: 0, rag: 'Green', daysDelayed: 0,
      predecessor: '', successor: '', criticalPath: false, budgetLakh: 0, commitmentLakh: 0, actualLakh: 0, forecastLakh: 0, deliverable: '', acceptanceCriteria: '', evidence: '', signOff: 'Pending', lastUpdated: TODAY })
  }
  return (
    <Card title="WBS activities" subtitle="Level 3/4 activities per sub-workstream with baseline and forecast dates, status, RAG and predecessor. They form the expandable sub-workstream groups on each workstream plan; deliverables, financials and sign-off are maintained on the Deliverables register."
      action={<AddBtn onClick={add}>Add activity</AddBtn>}>
      <Toolbar right={<Count n={rows.length} one="activity" many="activities" />}>
        <WsFilter value={wsName} onChange={onWs} names={names} allowAll={false} />
        <MiniSelect label="Sub-workstream" value={sub} options={[ALL_SUB, ...subs.map((s) => s.sub)]} onChange={setSubSel} width={300} />
      </Toolbar>
      <Grid minWidth={1180} empty={!rows.length} emptyText="No activities in this sub-workstream yet – use Add activity." head={['Code', 'Activity', 'Responsible', 'Baseline start', 'Baseline end', 'Forecast start', 'Forecast end', 'Status', { label: '%', className: R }, 'RAG', 'Predecessor', { label: 'Critical', className: 'text-center' }, '']}>
        {rows.map((a, idx) => [
          sub === ALL_SUB && (idx === 0 || rows[idx - 1].subWorkstream !== a.subWorkstream) ? <GroupRow key={`g-${a.subWorkstream}`} label={a.subWorkstream} cols={13} /> : null,
          <tr key={a.id} className="hover:bg-brand-50/40">
            <Td><Txt className="w-[72px] font-mono text-[11.5px]" value={a.code} onChange={(v) => upd(a, { code: v })} /></Td>
            <Td className="min-w-[180px]"><Txt value={a.name} onChange={(v) => upd(a, { name: v })} /></Td>
            <Td className="min-w-[92px]"><Sel value={a.responsible} options={uniq([a.responsible, ...OWNERS])} onChange={(v) => upd(a, { responsible: v })} /></Td>
            <Td><Dt value={a.baselineStart} onChange={(v) => upd(a, { baselineStart: v, baselineEnd: a.baselineEnd < v ? v : a.baselineEnd })} /></Td>
            <Td><Dt value={a.baselineEnd} onChange={(v) => upd(a, { baselineEnd: v, baselineStart: a.baselineStart > v ? v : a.baselineStart })} /></Td>
            <Td><Dt value={a.forecastStart || a.baselineStart} onChange={(v) => upd(a, { forecastStart: v, forecastEnd: (a.forecastEnd || a.baselineEnd) < v ? v : a.forecastEnd || a.baselineEnd })} /></Td>
            <Td><Dt value={a.forecastEnd || a.baselineEnd} onChange={(v) => upd(a, { forecastEnd: v, forecastStart: (a.forecastStart || a.baselineStart) > v ? v : a.forecastStart || a.baselineStart })} /></Td>
            <Td className="min-w-[104px]"><Sel value={a.status} options={uniq([a.status, ...ACT_STATUSES])} onChange={(v) => upd(a, { status: v as Status, percentComplete: v === 'Completed' ? 100 : a.percentComplete, actualEnd: v === 'Completed' && !a.actualEnd ? TODAY : a.actualEnd })} /></Td>
            <Td><Num value={a.percentComplete} onChange={(v) => upd(a, { percentComplete: v })} /></Td>
            <Td className="min-w-[82px]"><Sel value={a.rag} options={RAGS} onChange={(v) => upd(a, { rag: v as Activity['rag'] })} /></Td>
            <Td><Txt className="w-[66px] font-mono text-[11.5px]" value={a.predecessor} placeholder="e.g. 7.2.3" onChange={(v) => upd(a, { predecessor: v })} /></Td>
            <Td><Chk checked={a.criticalPath} title="On the critical path" onChange={(v) => upd(a, { criticalPath: v })} /></Td>
            <Td><Del label={`${a.code} ${a.name}`} onClick={() => c.remove(a.id)} /></Td>
          </tr>,
        ])}
      </Grid>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* People (team members)                                               */
/* ------------------------------------------------------------------ */
export function PeopleGrid({ ws, onWs }: GridProps) {
  const { names } = useWsRows()
  const c = useCollection<TeamMember>('teamMembers', seedTeamMembers)
  const def = programDef(useStore((s) => s.program))
  const all = ws === ALL_WS
  const rows = useMemo(() => c.items.filter((p) => inScope(ws, p.workstream)), [c.items, ws])
  const set = <K extends keyof TeamMember>(p: TeamMember, k: K, v: TeamMember[K]) => c.update({ ...p, [k]: v })
  const setRole = (p: TeamMember, role: string) => {
    const prof = ROLE_PROFILE[role]
    c.update({ ...p, role, functionArea: prof && !p.functionArea ? prof.fn : p.functionArea, responsibilities: prof && !p.responsibilities ? prof.duties : p.responsibilities })
  }
  const add = () => { const w = pickWs(ws, names); const lead = c.items.find((p) => p.workstream === w && p.isLead); c.add({ id: uid('tm'), name: 'New team member', role: '', workstream: w, location: def.city, allocation: 100, startDate: TODAY, type: 'Internal', functionArea: '', responsibilities: '', reportsTo: lead?.name }) }
  const fte = (rows.reduce((a, p) => a + p.allocation, 0) / 100).toFixed(1)
  return (
    <Card title="People" subtitle="Everyone working on the workstreams: role, function, who they report to, engagement type, location and allocation. Choosing a known role fills in the function and typical responsibilities."
      action={<AddBtn onClick={add}>Add team member</AddBtn>}>
      <Toolbar right={<span className="text-[12px] text-ink-500">{rows.length} people · {fte} FTE</span>}><WsFilter value={ws} onChange={onWs} names={names} /></Toolbar>
      <datalist id="grid-roles">{Object.keys(ROLE_PROFILE).map((r) => <option key={r} value={r} />)}</datalist>
      <datalist id="grid-functions">{FUNCTION_AREAS.map((r) => <option key={r} value={r} />)}</datalist>
      <Grid minWidth={1180} empty={!rows.length} head={['Name', 'Role', 'Function', ...(all ? ['Workstream'] : []), 'Reports to', 'Type', 'Location', { label: 'Allocation %', className: R }, 'Responsibilities', { label: 'Lead', className: 'text-center' }, '']}>
        {rows.map((p) => (
          <tr key={p.id} className="hover:bg-brand-50/40">
            <Td className="min-w-[140px]"><Txt className="font-medium" value={p.name} onChange={(v) => set(p, 'name', v)} /></Td>
            <Td className="min-w-[120px]"><Txt value={p.role} list="grid-roles" placeholder="Role" onChange={(v) => setRole(p, v)} /></Td>
            <Td className="min-w-[120px]"><Txt value={p.functionArea} list="grid-functions" placeholder="Function" onChange={(v) => set(p, 'functionArea', v)} /></Td>
            {all && <Td className="min-w-[165px]"><Sel value={p.workstream} options={uniq([p.workstream, ...names])} onChange={(v) => c.update({ ...p, workstream: v as Workstream, reportsTo: undefined })} /></Td>}
            <Td className="min-w-[130px]"><SelKV value={p.reportsTo ?? ''} empty="—" options={c.items.filter((x) => x.workstream === p.workstream && x.id !== p.id && x.name).map((x) => ({ value: x.name, label: x.name }))} onChange={(v) => set(p, 'reportsTo', v || undefined)} /></Td>
            <Td className="min-w-[100px]"><Sel value={p.type} options={MEMBER_TYPES} onChange={(v) => set(p, 'type', v as TeamMember['type'])} /></Td>
            <Td className="min-w-[108px]"><Sel value={p.location} options={uniq([p.location, ...def.locations])} onChange={(v) => set(p, 'location', v)} /></Td>
            <Td><Num value={p.allocation} onChange={(v) => set(p, 'allocation', v)} /></Td>
            <Td className="min-w-[160px]"><Txt value={p.responsibilities} placeholder="What they are doing on this workstream" onChange={(v) => set(p, 'responsibilities', v)} /></Td>
            <Td><Chk checked={!!p.isLead} title="Workstream lead" onChange={(v) => set(p, 'isLead', v)} /></Td>
            <Td><Del label={p.name} onClick={() => c.remove(p.id)} /></Td>
          </tr>
        ))}
      </Grid>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Budget lines                                                        */
/* ------------------------------------------------------------------ */
export function BudgetLineGrid({ ws, onWs }: GridProps) {
  const { names } = useWsRows()
  const c = useCollection<WsBudgetLine>('wsBudgetLines', seedWsBudgetLines)
  const m = useMoney()
  const all = ws === ALL_WS
  const rows = useMemo(() => c.items.filter((l) => inScope(ws, l.workstream)), [c.items, ws])
  const set = <K extends keyof WsBudgetLine>(l: WsBudgetLine, k: K, v: WsBudgetLine[K]) => c.update({ ...l, [k]: v })
  const add = () => c.add({ id: uid('bl'), workstream: pickWs(ws, names), category: 'New category', plannedCr: 0, actualCr: 0 })
  const sum = (k: 'plannedCr' | 'actualCr') => rows.reduce((a, l) => a + l[k], 0)
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
  return (
    <Card title={`Budget lines (${m.unitLabel})`} subtitle={`Planned and actual spend by category per workstream, entered in ${m.unitLabel} (stored in ₹ Cr). The Budget & Costs tab and the workstream budget charts are built from these lines.`}
      action={<AddBtn onClick={add}>Add budget line</AddBtn>}>
      <Toolbar right={<Count n={rows.length} one="budget line" many="budget lines" />}><WsFilter value={ws} onChange={onWs} names={names} /></Toolbar>
      <Grid minWidth={820} empty={!rows.length} head={[...(all ? ['Workstream'] : []), 'Category', { label: `Planned (${m.unitLabel})`, className: R }, { label: `Actual (${m.unitLabel})`, className: R }, { label: 'Remaining', className: R }, { label: 'Spent %', className: R }, '']}>
        {rows.map((l) => (
          <tr key={l.id} className="hover:bg-brand-50/40">
            {all && <Td><Sel value={l.workstream} options={uniq([l.workstream, ...names])} onChange={(v) => set(l, 'workstream', v as Workstream)} /></Td>}
            <Td className="min-w-[260px]"><Txt className="font-medium" value={l.category} onChange={(v) => set(l, 'category', v)} /></Td>
            <Td><MoneyCell cr={l.plannedCr} m={m} onChange={(v) => set(l, 'plannedCr', v)} /></Td>
            <Td><MoneyCell cr={l.actualCr} m={m} onChange={(v) => set(l, 'actualCr', v)} /></Td>
            <Td className={clsx('text-right text-[12px] px-2 whitespace-nowrap', l.plannedCr - l.actualCr < 0 && 'text-red-600 font-medium')}>{m.num(l.plannedCr - l.actualCr, 2)}</Td>
            <Td className={clsx('text-right text-[12px] px-2', pct(l.actualCr, l.plannedCr) > 100 && 'text-red-600 font-medium')}>{pct(l.actualCr, l.plannedCr)}%</Td>
            <Td><Del label={l.category} onClick={() => c.remove(l.id)} /></Td>
          </tr>
        ))}
        {rows.length > 0 && (
          <tr><td colSpan={all ? 2 : 1} className="text-right text-[12px] text-ink-500 px-2 py-2">Total</td>
            <td className="text-right text-[12.5px] font-semibold px-2 py-2 whitespace-nowrap">{m.num(sum('plannedCr'), 2)}</td><td className="text-right text-[12.5px] font-semibold px-2 py-2 whitespace-nowrap">{m.num(sum('actualCr'), 2)}</td>
            <td className="text-right text-[12.5px] font-semibold px-2 py-2 whitespace-nowrap">{m.num(sum('plannedCr') - sum('actualCr'), 2)}</td><td className="text-right text-[12.5px] font-semibold px-2 py-2">{pct(sum('actualCr'), sum('plannedCr'))}%</td><td /></tr>
        )}
      </Grid>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Dependencies (shared 'dependencies' collection)                     */
/* ------------------------------------------------------------------ */
export function DependencyGrid({ ws, onWs }: GridProps) {
  const { names } = useWsRows()
  const c = useCollection<Dependency>('dependencies', seedDependencies)
  const rows = useMemo(() => c.items.filter((d) => ws === ALL_WS || d.from === ws || d.on === ws), [c.items, ws])
  const set = <K extends keyof Dependency>(d: Dependency, k: K, v: Dependency[K]) => c.update({ ...d, [k]: v })
  const add = () => { const from = pickWs(ws, names); c.add({ id: uid('dep'), from, on: (names.find((n) => n !== from) ?? from) as Workstream, type: DEP_TYPES[0], description: '', impact: 'Medium', status: 'On Track', dueDate: TODAY, owner: OWNERS[0] }) }
  return (
    <Card title="Dependencies" subtitle="Cross-workstream dependencies: the workstream that depends, the workstream it depends on, what is needed and by when. Feeds the dependency matrix, the Program Planning heatmap and the Risks & Issues dependency view."
      action={<AddBtn onClick={add}>Add dependency</AddBtn>}>
      <Toolbar right={<Count n={rows.length} one="dependency" many="dependencies" />}><WsFilter value={ws} onChange={onWs} names={names} />{ws !== ALL_WS && <span className="text-[12px] text-ink-500">showing dependencies where {ws} depends on others or others depend on it</span>}</Toolbar>
      <datalist id="grid-dep-types">{DEP_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
      <Grid minWidth={1200} empty={!rows.length} head={['Workstream (depends)', 'Depends on', 'Type', 'Description', 'Impact', 'Status', 'Due', 'Owner', '']}>
        {rows.map((d) => (
          <tr key={d.id} className="hover:bg-brand-50/40">
            <Td className="min-w-[165px]"><Sel className="font-medium" value={d.from} options={uniq([d.from, ...names])} onChange={(v) => set(d, 'from', v as Workstream)} /></Td>
            <Td className="min-w-[165px]"><Sel value={d.on} options={uniq([d.on, ...names])} onChange={(v) => set(d, 'on', v as Workstream)} /></Td>
            <Td className="min-w-[150px]"><Txt value={d.type} list="grid-dep-types" placeholder="e.g. System Access" onChange={(v) => set(d, 'type', v)} /></Td>
            <Td className="min-w-[250px]"><Txt value={d.description} placeholder="What is needed and why" onChange={(v) => set(d, 'description', v)} /></Td>
            <Td><Sel value={d.impact} options={IMPACTS} onChange={(v) => set(d, 'impact', v as Impact)} /></Td>
            <Td className="min-w-[96px]"><Sel value={d.status} options={DEP_STATUSES} onChange={(v) => set(d, 'status', v as Status)} /></Td>
            <Td><Dt value={d.dueDate} onChange={(v) => set(d, 'dueDate', v)} /></Td>
            <Td><Sel value={d.owner} options={uniq([d.owner, ...OWNERS])} onChange={(v) => set(d, 'owner', v)} /></Td>
            <Td><Del label={`${d.type} (${d.from} → ${d.on})`} onClick={() => c.remove(d.id)} /></Td>
          </tr>
        ))}
      </Grid>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */
export function DocumentGrid({ ws, onWs }: GridProps) {
  const { names } = useWsRows()
  const c = useCollection<WsDocument>('wsDocuments', seedWsDocuments)
  const all = ws === ALL_WS
  const rows = useMemo(() => c.items.filter((d) => inScope(ws, d.workstream)), [c.items, ws])
  const set = <K extends keyof WsDocument>(d: WsDocument, k: K, v: WsDocument[K]) => c.update({ ...d, [k]: v })
  const add = () => c.add({ id: uid('doc'), title: 'New document', type: 'Plan', workstream: pickWs(ws, names), owner: OWNERS[0], version: '0.1', updated: TODAY, status: 'Draft' })
  return (
    <Card title="Documents" subtitle="Charters, plans, designs, reports and contracts per workstream with version, owner and approval status."
      action={<AddBtn onClick={add}>Add document</AddBtn>}>
      <Toolbar right={<Count n={rows.length} one="document" many="documents" />}><WsFilter value={ws} onChange={onWs} names={names} /></Toolbar>
      <Grid minWidth={all ? 1150 : 950} empty={!rows.length} head={['Title', 'Type', ...(all ? ['Workstream'] : []), 'Owner', 'Version', 'Last updated', 'Status', '']}>
        {rows.map((d) => (
          <tr key={d.id} className="hover:bg-brand-50/40">
            <Td className="min-w-[300px]"><Txt className="font-medium" value={d.title} onChange={(v) => set(d, 'title', v)} /></Td>
            <Td><Sel value={d.type} options={DOC_TYPES} onChange={(v) => set(d, 'type', v as WsDocument['type'])} /></Td>
            {all && <Td><Sel value={d.workstream} options={uniq([d.workstream, ...names])} onChange={(v) => set(d, 'workstream', v as Workstream)} /></Td>}
            <Td><Sel value={d.owner} options={uniq([d.owner, ...OWNERS])} onChange={(v) => set(d, 'owner', v)} /></Td>
            <Td><Txt className="w-[64px]" value={d.version} onChange={(v) => set(d, 'version', v)} /></Td>
            <Td><Dt value={d.updated} onChange={(v) => set(d, 'updated', v)} /></Td>
            <Td><Sel value={d.status} options={DOC_STATUSES} onChange={(v) => set(d, 'status', v as WsDocument['status'])} /></Td>
            <Td><Del label={d.title} onClick={() => c.remove(d.id)} /></Td>
          </tr>
        ))}
      </Grid>
    </Card>
  )
}
