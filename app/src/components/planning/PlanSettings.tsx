/**
 * Program Planning – Input view "Plan settings": the few program-level fields the timeline needs that
 * are not derived from the Workstreams inputs (timeline window, go-live target, milestone adherence).
 * Writes straight to the 'programKpis' record.
 */
import { useState } from 'react'
import { CalendarDays, Target, Info } from 'lucide-react'
import { Card, Field, Input, FormGrid } from '../ui'
import type { ProgramKpis, Milestone } from '../../data/shared'
import { TODAY, fmtDate } from '../../data/common'

type NumKey = 'goLiveVarianceWeeks' | 'milestoneAdherence' | 'milestoneAdherenceDelta'
type DateKey = 'timelineStart' | 'timelineEnd' | 'goLiveTarget'

/** Number input that keeps a draft while typing so "-" or "1." are not normalised away mid-entry. */
function NumInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Input type="number" step="any" min={min} max={max} value={draft ?? String(value)}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => { setDraft(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(max !== undefined ? Math.min(max, min !== undefined ? Math.max(min, v) : v) : v) }}
      onBlur={() => setDraft(null)} />
  )
}

export function PlanSettingsForm({ value, onChange, milestones }: { value: ProgramKpis; onChange: (v: ProgramKpis) => void; milestones: Milestone[] }) {
  const set = <K extends keyof ProgramKpis>(k: K, v: ProgramKpis[K]) => onChange({ ...value, [k]: v })
  const date = (k: DateKey) => ({ type: 'date' as const, value: value[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => e.target.value && set(k, e.target.value) })
  const num = (k: NumKey, min?: number, max?: number) => <NumInput value={value[k]} min={min} max={max} onChange={(v) => set(k, v)} />
  // Adherence as the milestones themselves tell it: of everything due by today, how much is complete.
  const due = milestones.filter((m) => m.dueDate <= TODAY)
  const met = due.filter((m) => m.status === 'Completed').length
  const derived = due.length ? Math.round((met / due.length) * 100) : 0
  const inWindow = milestones.filter((m) => m.dueDate >= value.timelineStart && m.dueDate <= value.timelineEnd).length
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
      <Card title="Plan settings" subtitle="Program-level dates and headline figures shown on the Program Planning page. Saved as you type.">
        <div className="text-[12px] font-semibold text-brand-600 uppercase tracking-wide border-b border-line pb-1 mb-3 inline-flex items-center gap-1.5"><CalendarDays size={13} /> Timeline</div>
        <FormGrid cols={3}>
          <Field label="Timeline start"><Input {...date('timelineStart')} max={value.timelineEnd} /></Field>
          <Field label="Timeline end"><Input {...date('timelineEnd')} min={value.timelineStart} /></Field>
          <Field label="Current go-live target"><Input {...date('goLiveTarget')} /></Field>
          <Field label="Go-live variance vs baseline (weeks)">{num('goLiveVarianceWeeks')}</Field>
        </FormGrid>
        <div className="text-[12px] font-semibold text-brand-600 uppercase tracking-wide border-b border-line pb-1 mb-3 mt-5 inline-flex items-center gap-1.5"><Target size={13} /> Milestone adherence</div>
        <FormGrid cols={3}>
          <Field label="Milestone adherence %">{num('milestoneAdherence', 0, 100)}</Field>
          <Field label="Change vs last month (percentage points)">{num('milestoneAdherenceDelta')}</Field>
          <div className="flex items-end pb-1"><button className="btn-secondary" onClick={() => set('milestoneAdherence', derived)} disabled={!due.length}>Use value from milestones ({derived}%)</button></div>
        </FormGrid>
      </Card>
      <Card title="What the timeline shows">
        <ul className="space-y-2.5 text-[12.5px] text-ink-700">
          <li><span className="text-ink-500">Timeline window</span><br /><b>{fmtDate(value.timelineStart)} – {fmtDate(value.timelineEnd)}</b> · {inWindow} of {milestones.length} milestones fall inside it</li>
          <li><span className="text-ink-500">Go-live target</span><br /><b>{fmtDate(value.goLiveTarget)}</b> · {value.goLiveVarianceWeeks >= 0 ? '+' : ''}{value.goLiveVarianceWeeks} weeks vs baseline</li>
          <li><span className="text-ink-500">Milestone adherence</span><br /><b>{value.milestoneAdherence}%</b> shown on the page · from the milestone register: {met} of {due.length} milestones due by {fmtDate(TODAY)} are complete ({derived}%)</li>
        </ul>
        <p className="mt-4 text-[12px] text-ink-500 inline-flex items-start gap-1.5"><Info size={13} className="mt-0.5 shrink-0" /> Initiatives, milestones, WBS activities and people are entered under Workstreams; the Gantt, master plan and summaries are built from them.</p>
      </Card>
    </div>
  )
}
