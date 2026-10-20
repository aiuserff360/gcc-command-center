/**
 * Plan Inputs – inline editors for every level of the plan (workstream, initiatives, milestones,
 * WBS activities). Every change writes straight to the shared collections, so the Gantt above and
 * the Workstreams page update immediately.
 */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Plus, Trash2, Star } from 'lucide-react'
import { Tabs, Select } from '../ui'
import { uid } from '../../store/useStore'
import { OWNERS, TODAY, type Workstream, type Status } from '../../data/common'
import type { Milestone } from '../../data/shared'
import type { Initiative } from '../../data/workstreams'
import { INITIATIVE_STATUSES } from '../../data/workstreams'
import type { Activity } from '../../data/wbs'
import type { WsRow } from '../workstreams/common'

export const EDITOR_TABS = ['Workstream', 'Initiatives', 'Milestones', 'Activities'] as const
export type EditorTab = (typeof EDITOR_TABS)[number]
const WS_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Not Started', 'Completed'] as const
const MS_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Pending', 'Not Started', 'Completed'] as const
const MS_PHASES = ['Design', 'Build', 'Transition', 'Operate'] as const
const ACT_STATUSES = ['Not Started', 'In Progress', 'At Risk', 'Delayed', 'Completed'] as const
const RAGS = ['Green', 'Amber', 'Red'] as const

/* ---------- tiny cell primitives ---------- */
const cell = 'w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-[12px] outline-none hover:border-slate-300 focus:border-brand-400 focus:bg-white'
function Txt({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return <input className={clsx(cell, className)} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}
function Dt({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="date" className={clsx(cell, 'w-[128px]')} value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
}
function Num({ value, onChange, max = 100 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return <input type="number" min={0} max={max} className={clsx(cell, 'w-[64px] text-right')} value={value} onChange={(e) => onChange(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))} />
}
function Sel({ value, options, onChange, className }: { value: string; options: readonly string[]; onChange: (v: string) => void; className?: string }) {
  return <select className={clsx(cell, 'cursor-pointer', className)} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select>
}
function Th({ children, className }: { children?: React.ReactNode; className?: string }) { return <th className={clsx('text-left text-[11.5px] font-semibold text-slate-600 px-1.5 py-1.5 bg-slate-100 border-b border-slate-300 whitespace-nowrap', className)}>{children}</th> }
function Td({ children, className }: { children: React.ReactNode; className?: string }) { return <td className={clsx('px-0.5 py-0.5 border-b border-slate-200 align-middle', className)}>{children}</td> }
function Del({ onClick }: { onClick: () => void }) { return <button title="Delete row" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => { if (window.confirm('Delete this row?')) onClick() }}><Trash2 size={14} /></button> }

export interface PlanEditorProps {
  ws: Workstream
  wsRow?: WsRow
  onWsChange: (w: WsRow) => void
  initiatives: Initiative[]; onInitChange: (i: Initiative) => void; onInitAdd: (i: Initiative) => void; onInitRemove: (id: string) => void
  milestones: Milestone[]; onMsChange: (m: Milestone) => void; onMsAdd: (m: Milestone) => void; onMsRemove: (id: string) => void
  activities: Activity[]; onActChange: (a: Activity) => void; onActAdd: (a: Activity) => void; onActRemove: (id: string) => void
  subWorkstreams: string[]
  tab: EditorTab; onTab: (t: EditorTab) => void
}

export function PlanEditor(p: PlanEditorProps) {
  const [sub, setSub] = useState<string>('All')
  const subs = useMemo(() => ['All', ...p.subWorkstreams], [p.subWorkstreams])
  const acts = useMemo(() => p.activities.filter((a) => sub === 'All' || a.subWorkstream === sub).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })), [p.activities, sub])
  const msOptions = useMemo(() => ['—', ...p.milestones.map((m) => m.name)], [p.milestones])
  const w = p.wsRow

  const addInit = () => p.onInitAdd({ id: uid('init'), name: 'New initiative', workstream: p.ws, owner: w?.lead ?? 'A. Sharma', status: 'Not Started', start: TODAY, end: '2026-12-31', progress: 0 })
  const addMs = () => p.onMsAdd({ id: uid('ms'), name: 'New milestone', workstream: p.ws, dueDate: TODAY, status: 'Pending', owner: w?.lead ?? 'A. Sharma', phase: 'Build', progress: 0, critical: false })
  const addAct = () => {
    const s = sub === 'All' ? p.subWorkstreams[0] ?? '' : sub
    const wbs = p.activities.find((a) => a.subWorkstream === s)?.wbsWorkstream ?? ''
    const n = p.activities.filter((a) => a.subWorkstream === s).length + 1
    p.onActAdd({ id: uid('act'), code: `${s.split(' ')[0] || 'X'}.${n}`, name: 'New activity', wbsWorkstream: wbs, subWorkstream: s, workstream: p.ws, responsible: w?.lead ?? 'A. Sharma', accountable: 'A. Sharma', vendor: '',
      baselineStart: TODAY, baselineEnd: '2026-12-31', forecastStart: TODAY, forecastEnd: '2026-12-31', actualStart: '', actualEnd: '', status: 'Not Started', percentComplete: 0, rag: 'Green', daysDelayed: 0,
      predecessor: '', successor: '', criticalPath: false, budgetLakh: 0, commitmentLakh: 0, actualLakh: 0, forecastLakh: 0, deliverable: '', acceptanceCriteria: '', evidence: '', signOff: 'Pending', lastUpdated: TODAY })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <div>
          <h3 className="card-title">Plan Inputs – {p.ws}</h3>
          <p className="text-[12px] text-ink-500 mt-0.5">Edit the plan at each level. Changes apply immediately to the Gantt above and to the Workstreams page.</p>
        </div>
        {p.tab === 'Initiatives' && <button className="btn-primary" onClick={addInit}><Plus size={14} /> Add initiative</button>}
        {p.tab === 'Milestones' && <button className="btn-primary" onClick={addMs}><Plus size={14} /> Add milestone</button>}
        {p.tab === 'Activities' && <div className="flex items-center gap-2"><span className="text-[12px] text-ink-500">Sub-workstream</span><Select className="!w-72" options={subs} value={sub} onChange={(e) => setSub(e.target.value)} /><button className="btn-primary" onClick={addAct} disabled={!p.subWorkstreams.length}><Plus size={14} /> Add activity</button></div>}
      </div>
      <Tabs size="sm" tabs={[...EDITOR_TABS]} active={p.tab} onChange={(t) => p.onTab(t as EditorTab)} className="!border-0 !shadow-none !rounded-none mx-2" />
      <div className="px-4 pb-4 overflow-x-auto scroll-thin">
        {p.tab === 'Workstream' && w && (
          <div className="grid grid-cols-4 gap-3 max-w-4xl pt-2">
            <label className="text-[12px] text-ink-500">Workstream<div className="text-[13px] font-semibold text-ink-900 mt-1">{w.name}</div></label>
            <label className="text-[12px] text-ink-500">Status<Sel className="mt-0.5 border-slate-300" value={w.status} options={WS_STATUSES} onChange={(v) => p.onWsChange({ ...w, status: v as Status })} /></label>
            <label className="text-[12px] text-ink-500">Progress %<Num value={w.progress} onChange={(v) => p.onWsChange({ ...w, progress: v })} /></label>
            <label className="text-[12px] text-ink-500">Team size<Num max={999} value={w.teamSize} onChange={(v) => p.onWsChange({ ...w, teamSize: v })} /></label>
            <label className="text-[12px] text-ink-500">Lead<Sel className="mt-0.5 border-slate-300" value={w.lead} options={OWNERS} onChange={(v) => p.onWsChange({ ...w, lead: v })} /></label>
            <label className="text-[12px] text-ink-500">Owner<Sel className="mt-0.5 border-slate-300" value={w.owner} options={OWNERS} onChange={(v) => p.onWsChange({ ...w, owner: v })} /></label>
            <label className="text-[12px] text-ink-500 col-span-2">Executive sponsor<Txt className="mt-0.5 border-slate-300" value={w.executiveSponsor} onChange={(v) => p.onWsChange({ ...w, executiveSponsor: v })} /></label>
            <label className="text-[12px] text-ink-500 col-span-4">Description<Txt className="mt-0.5 border-slate-300" value={w.description} onChange={(v) => p.onWsChange({ ...w, description: v })} /></label>
          </div>
        )}

        {p.tab === 'Initiatives' && (
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><Th className="w-8">#</Th><Th>Initiative</Th><Th>Owner</Th><Th>Start</Th><Th>Finish</Th><Th>Status</Th><Th className="text-right">% Comp.</Th><Th>Linked milestone</Th><Th className="w-8" /></tr></thead>
            <tbody>
              {p.initiatives.map((i, idx) => (
                <tr key={i.id} className="hover:bg-brand-50/40">
                  <Td className="text-[11px] text-slate-500 px-2">I{idx + 1}</Td>
                  <Td><Txt value={i.name} onChange={(v) => p.onInitChange({ ...i, name: v })} /></Td>
                  <Td><Sel value={i.owner} options={OWNERS} onChange={(v) => p.onInitChange({ ...i, owner: v })} /></Td>
                  <Td><Dt value={i.start} onChange={(v) => p.onInitChange({ ...i, start: v, end: i.end < v ? v : i.end })} /></Td>
                  <Td><Dt value={i.end} onChange={(v) => p.onInitChange({ ...i, end: v, start: i.start > v ? v : i.start })} /></Td>
                  <Td><Sel value={i.status} options={INITIATIVE_STATUSES} onChange={(v) => p.onInitChange({ ...i, status: v as Initiative['status'] })} /></Td>
                  <Td><Num value={i.progress} onChange={(v) => p.onInitChange({ ...i, progress: v })} /></Td>
                  <Td><Sel value={p.milestones.find((m) => m.id === i.milestoneId)?.name ?? '—'} options={msOptions} onChange={(v) => p.onInitChange({ ...i, milestoneId: p.milestones.find((m) => m.name === v)?.id })} /></Td>
                  <Td><Del onClick={() => p.onInitRemove(i.id)} /></Td>
                </tr>
              ))}
              {p.initiatives.length === 0 && <tr><td colSpan={9} className="text-center text-slate-500 italic py-5">No initiatives yet – add one above.</td></tr>}
            </tbody>
          </table>
        )}

        {p.tab === 'Milestones' && (
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><Th className="w-8">#</Th><Th>Milestone</Th><Th>Phase</Th><Th>Start (optional)</Th><Th>Due</Th><Th>Status</Th><Th>Owner</Th><Th className="text-right">% Comp.</Th><Th>Key</Th><Th className="w-8" /></tr></thead>
            <tbody>
              {p.milestones.map((m, idx) => (
                <tr key={m.id} className="hover:bg-brand-50/40">
                  <Td className="text-[11px] text-slate-500 px-2">M{idx + 1}</Td>
                  <Td><Txt value={m.name} onChange={(v) => p.onMsChange({ ...m, name: v })} /></Td>
                  <Td><Sel value={m.phase} options={MS_PHASES} onChange={(v) => p.onMsChange({ ...m, phase: v as Milestone['phase'] })} /></Td>
                  <Td><Dt value={m.startDate ?? ''} onChange={(v) => p.onMsChange({ ...m, startDate: v })} /></Td>
                  <Td><Dt value={m.dueDate} onChange={(v) => p.onMsChange({ ...m, dueDate: v })} /></Td>
                  <Td><Sel value={m.status} options={MS_STATUSES} onChange={(v) => p.onMsChange({ ...m, status: v as Status })} /></Td>
                  <Td><Sel value={m.owner} options={OWNERS} onChange={(v) => p.onMsChange({ ...m, owner: v })} /></Td>
                  <Td><Num value={m.progress ?? 0} onChange={(v) => p.onMsChange({ ...m, progress: v })} /></Td>
                  <Td><button title="Key milestone (shown on the Dashboard)" className={clsx('p-1 cursor-pointer', m.critical ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400')} onClick={() => p.onMsChange({ ...m, critical: !m.critical })}><Star size={14} fill={m.critical ? 'currentColor' : 'none'} /></button></Td>
                  <Td><Del onClick={() => p.onMsRemove(m.id)} /></Td>
                </tr>
              ))}
              {p.milestones.length === 0 && <tr><td colSpan={10} className="text-center text-slate-500 italic py-5">No milestones yet – add one above.</td></tr>}
            </tbody>
          </table>
        )}

        {p.tab === 'Activities' && (
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><Th>Code</Th><Th>Activity</Th><Th>Sub-workstream</Th><Th>Responsible</Th><Th>Baseline start</Th><Th>Baseline end</Th><Th>Forecast start</Th><Th>Forecast end</Th><Th>Status</Th><Th className="text-right">%</Th><Th>RAG</Th><Th>Pred.</Th><Th>Crit.</Th><Th className="w-8" /></tr></thead>
            <tbody>
              {acts.map((a) => (
                <tr key={a.id} className="hover:bg-brand-50/40">
                  <Td className="text-[11px] text-slate-500 px-2 whitespace-nowrap">{a.code}</Td>
                  <Td><Txt className="min-w-[200px]" value={a.name} onChange={(v) => p.onActChange({ ...a, name: v })} /></Td>
                  <Td className="text-[11px] text-slate-600 px-2 whitespace-nowrap max-w-[160px] truncate" >{a.subWorkstream}</Td>
                  <Td><Sel value={a.responsible} options={OWNERS} onChange={(v) => p.onActChange({ ...a, responsible: v })} /></Td>
                  <Td><Dt value={a.baselineStart} onChange={(v) => p.onActChange({ ...a, baselineStart: v })} /></Td>
                  <Td><Dt value={a.baselineEnd} onChange={(v) => p.onActChange({ ...a, baselineEnd: v })} /></Td>
                  <Td><Dt value={a.forecastStart || a.baselineStart} onChange={(v) => p.onActChange({ ...a, forecastStart: v })} /></Td>
                  <Td><Dt value={a.forecastEnd || a.baselineEnd} onChange={(v) => p.onActChange({ ...a, forecastEnd: v })} /></Td>
                  <Td><Sel value={a.status} options={ACT_STATUSES} onChange={(v) => p.onActChange({ ...a, status: v as Status, percentComplete: v === 'Completed' ? 100 : a.percentComplete })} /></Td>
                  <Td><Num value={a.percentComplete} onChange={(v) => p.onActChange({ ...a, percentComplete: v })} /></Td>
                  <Td><Sel value={a.rag} options={RAGS} onChange={(v) => p.onActChange({ ...a, rag: v as Activity['rag'] })} /></Td>
                  <Td><Txt className="w-[72px]" value={a.predecessor} placeholder="e.g. 7.2.3" onChange={(v) => p.onActChange({ ...a, predecessor: v })} /></Td>
                  <Td className="text-center"><input type="checkbox" checked={a.criticalPath} onChange={(e) => p.onActChange({ ...a, criticalPath: e.target.checked })} /></Td>
                  <Td><Del onClick={() => p.onActRemove(a.id)} /></Td>
                </tr>
              ))}
              {acts.length === 0 && <tr><td colSpan={14} className="text-center text-slate-500 italic py-5">No activities in this sub-workstream – add one above.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
