/**
 * "Governance by business unit" – unit cards + dropdown, then the deep dive for the selected unit:
 * header strip (owner / sponsor, next review, health, counts) → open decisions, change requests, actions,
 * escalations & risks, upcoming governance events, RACI row, linked transition projects, stakeholders, controls.
 */
import { useMemo, type ReactNode } from 'react'
import clsx from 'clsx'
import { Building2, Flag, Rocket, ChevronRight, Calendar } from 'lucide-react'
import { Card, Badge, Table, EmptyNote, SectionTitle } from '../ui'
import { SERIES, fmtDate, TODAY } from '../../data/common'
import { isOpen, type RaidItem } from '../../data/shared'
import { useMoney, type Money } from '../../data/money'
import type { TransitionProject } from '../../data/transition'
import { type Decision, type ChangeRequest, type ActionItem, type GovEvent, type Stakeholder, type Control, type BuRaciRow } from '../../data/governance'
import { unitSlice, isCrPending, isActionOpen, isActionOverdue, raidUnit, UNIT_ALL, isUnit, RAG_COLOR, RAG_TEXT, type UnitData, type UnitSlice } from './units'
import { BuRaciMatrix } from './RaciTables'
import type { useCollection } from '../../store/useStore'

export interface UnitOpeners {
  decision: (d: Decision) => void
  cr: (c: ChangeRequest) => void
  action: (a: ActionItem) => void
  event: (e: GovEvent) => void
  stakeholder: (s: Stakeholder) => void
  control: (c: Control) => void
  risks: () => void
  transition: () => void
}
const signed = (v: number, m: Money) => `${v < 0 ? '−' : ''}${m.fmt(Math.abs(v), m.digits + 1)}`

/** Blue link that opens a modal without triggering the row click. */
export function Link({ children, onClick, className }: { children: ReactNode; onClick: () => void; className?: string }) {
  return <button type="button" className={clsx('text-brand-600 font-medium hover:underline cursor-pointer text-left', className)} onClick={(e) => { e.stopPropagation(); onClick() }}>{children}</button>
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
const RagDot = ({ rag }: { rag: 'Green' | 'Amber' | 'Red' }) => <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: RAG_COLOR[rag] }}><span className="w-2 h-2 rounded-full" style={{ background: RAG_COLOR[rag] }} />{rag}</span>

/* ================================================================== */
export default function UnitOverview({ d, unit, setUnit, open, buRaciC }: { d: UnitData; unit: string; setUnit: (u: string) => void; open: UnitOpeners; buRaciC: ReturnType<typeof useCollection<BuRaciRow>> }) {
  const slices = useMemo(() => d.unitNames.map((n) => unitSlice(d, n)), [d])
  const selected = isUnit(unit) ? slices.find((s) => s.unit === unit) : undefined
  return (
    <>
      <Card title="Governance by business unit" subtitle="Open decisions, pending change requests, actions and escalations per unit with the derived governance health. Pick a unit for the deep dive; the choice carries into every tab." headerRight={
        <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 min-w-[280px] cursor-pointer">
          <Building2 size={16} className="text-brand-600" />
          <select value={isUnit(unit) ? unit : UNIT_ALL} onChange={(e) => setUnit(e.target.value)} className="flex-1 bg-transparent outline-none text-[13.5px] font-semibold text-ink-900 cursor-pointer">
            <option value={UNIT_ALL}>All business units</option>
            {d.unitNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>}>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(slices.length, 1), 7)}, minmax(0, 1fr))` }}>
          {slices.map((s, i) => (
            <button key={s.unit} onClick={() => setUnit(s.unit === unit ? UNIT_ALL : s.unit)} className={clsx('text-left rounded-lg border px-3 py-2.5 cursor-pointer transition-colors min-w-0', s.unit === unit ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line bg-white hover:bg-surface')}>
              <div className="flex items-center gap-1.5 mb-0.5"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: SERIES[i % SERIES.length] }} /><span className="text-[12.5px] font-semibold text-ink-900 truncate" title={s.unit}>{s.unit}</span></div>
              <div className="flex items-center justify-between gap-1"><span className="text-[10.5px] text-ink-500 truncate">{s.bu?.kind ?? ''}</span><RagDot rag={s.health.rag} /></div>
              <div className="mt-1.5 text-[20px] font-bold text-navy-900 leading-none">{s.health.openDecisions}<span className="text-[11px] font-medium text-ink-500"> open decision{s.health.openDecisions === 1 ? '' : 's'}</span></div>
              <div className={clsx('text-[10.5px]', s.health.overdueDecisions ? 'text-red-600' : 'text-ink-500')}>{s.health.overdueDecisions} overdue</div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[10.5px] whitespace-nowrap"><span className="text-brand-600">{s.health.pendingCrs} CR{s.health.pendingCrs === 1 ? '' : 's'}</span><span className="text-ink-400">·</span><span className={s.health.overdueActions ? 'text-amber-600' : 'text-ink-700'}>{s.health.openActions} actions</span><span className="text-ink-400">·</span><span className={s.health.escalations ? 'text-red-600' : 'text-ink-700'}>{s.health.escalations} esc.</span></div>
              <div className="text-[10.5px] text-ink-500 truncate">{s.nextReview ? `review ${fmtDate(s.nextReview)}` : 'no review scheduled'}</div>
            </button>
          ))}
        </div>
      </Card>
      {selected && <UnitDeepDive s={selected} d={d} open={open} buRaciC={buRaciC} setUnit={setUnit} />}
    </>
  )
}

/* ================================================================== */
function UnitDeepDive({ s, d, open, buRaciC, setUnit }: { s: UnitSlice; d: UnitData; open: UnitOpeners; buRaciC: ReturnType<typeof useCollection<BuRaciRow>>; setUnit: (u: string) => void }) {
  const m = useMoney()
  const h = s.health
  const openDecisions = s.decisions.filter((x) => x.status === 'Pending').sort((a, b) => a.requiredBy.localeCompare(b.requiredBy))
  const decided = s.decisions.filter((x) => x.status !== 'Pending')
  const crs = [...s.crs].sort((a, b) => Number(isCrPending(b)) - Number(isCrPending(a)) || b.submitted.localeCompare(a.submitted))
  const actions = s.actions.filter(isActionOpen).sort((a, b) => a.due.localeCompare(b.due))
  const raid = s.raid.filter(isOpen).sort((a, b) => Number(!!b.escalated) - Number(!!a.escalated) || b.impactScore - a.impactScore)
  const project = (id?: string) => (id ? d.projects.find((p) => p.id === id) : undefined)
  const ProjectTag = ({ id }: { id?: string }) => { const p = project(id); return p ? <span className="block text-[10.5px] text-ink-500 truncate max-w-[220px]" title={p.name}>{p.name}</span> : null }
  const meetingsForUnit = d.meetings.filter((mt) => mt.status === 'Scheduled' && (mt.agendaUnits ?? []).includes(s.unit))
  return (
    <>
      {/* header strip */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><h3 className="text-[18px] font-bold text-navy-900">{s.unit}</h3><Badge value={h.rag} />{s.bu && <span className="text-[11.5px] text-ink-500">{s.bu.kind} · {s.bu.wave} · health score {h.score}</span>}</div>
            <div className="text-[12.5px] text-ink-700 mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
              <span>Owner <b className="text-ink-900">{s.bu?.owner ?? '—'}</b></span>
              <span>Sponsor <b className="text-ink-900">{s.profile?.sponsor ?? '—'}</b></span>
              <span>Cadence <b className="text-ink-900">{s.profile?.cadence ?? '—'}</b>{s.profile?.reviewForum && <span className="text-ink-500"> · {s.profile.reviewForum}</span>}</span>
              <span>Next review <b className={clsx(s.nextReview && s.nextReview < TODAY ? 'text-red-600' : 'text-ink-900')}>{s.nextReview ? fmtDate(s.nextReview) : 'not scheduled'}</b></span>
            </div>
            {s.profile?.notes && <p className="text-[12px] text-ink-500 mt-1 max-w-3xl">{s.profile.notes}</p>}
          </div>
          <button className="btn-secondary" onClick={() => setUnit(UNIT_ALL)}>Clear selection</button>
        </div>
        <div className="grid grid-cols-8 gap-3 mt-3">
          <Mini label="Open decisions" value={h.openDecisions} sub={`${h.overdueDecisions} overdue · ${decided.length} decided`} tone={h.overdueDecisions ? 'text-red-600' : 'text-ink-900'} />
          <Mini label="Pending CRs" value={h.pendingCrs} sub={`${signed(h.pendingCrCost, m)} · ${h.pendingCrDays} d`} tone="text-brand-600" />
          <Mini label="Open actions" value={h.openActions} sub={`${h.overdueActions} overdue`} tone={h.overdueActions ? 'text-amber-600' : 'text-ink-900'} />
          <Mini label="Escalations" value={h.escalations} sub={`${h.openRaid} open risks & issues`} tone={h.escalations ? 'text-red-600' : 'text-green-600'} />
          <Mini label="Upcoming events" value={s.events.length} sub={s.events[0] ? `next ${fmtDate(s.events[0].date)}` : 'none scheduled'} />
          <Mini label="Transition projects" value={s.projects.length} sub={`${s.projects.filter((p) => p.status !== 'Completed').length} in flight`} />
          <Mini label="Stakeholders" value={s.stakeholders.length} sub={`${s.stakeholders.filter((x) => x.sentiment === 'Concerned').length} concerned`} />
          <Mini label="Controls" value={s.controls.length} sub={`${s.controls.filter((c) => c.businessUnits.includes(s.unit)).length} unit-specific`} />
        </div>
      </Card>

      {/* decisions + change requests */}
      <div className="grid grid-cols-[1fr_1.15fr] gap-4">
        <Card title={`Open decisions – ${s.unit}`} subtitle={`${openDecisions.length} pending · ${h.overdueDecisions} overdue · ${decided.length} decided`}>
          <Table<Decision> compact rows={openDecisions} onRowClick={open.decision} empty="No open decisions for this business unit." columns={[
            { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
            { key: 'title', header: 'Decision', render: (x) => <span className="block max-w-[190px]"><Link onClick={() => open.decision(x)} className="block truncate max-w-[190px]">{x.title}</Link><ProjectTag id={x.projectId} /></span> },
            { key: 'forum', header: 'Forum', render: (x) => <span className="text-[11.5px] block max-w-[90px] leading-tight">{x.forum}</span> },
            { key: 'requiredBy', header: 'Required', className: 'whitespace-nowrap', render: (x) => <span className={x.requiredBy < TODAY ? 'text-red-600 font-medium' : ''}>{fmtDate(x.requiredBy)}</span> },
            { key: 'impact', header: 'Impact', render: (x) => <Badge value={x.impact} /> },
          ]} />
        </Card>
        <Card title={`Change requests – ${s.unit}`} subtitle={`${h.pendingCrs} pending · ${signed(h.pendingCrCost, m)} cost · ${h.pendingCrDays} days schedule impact`}>
          <Table<ChangeRequest> compact rows={crs} onRowClick={open.cr} empty="No change requests for this business unit." columns={[
            { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
            { key: 'title', header: 'Change request', render: (x) => <span className="block max-w-[190px]"><Link onClick={() => open.cr(x)} className="block truncate max-w-[190px]">{x.title}</Link><ProjectTag id={x.projectId} /></span> },
            { key: 'type', header: 'Type', render: (x) => <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${x.type === 'Scope' ? 'bg-violet-50 text-violet-700' : x.type === 'Budget' ? 'bg-teal-50 text-teal-700' : 'bg-orange-50 text-orange-700'}`}>{x.type}</span> },
            { key: 'costImpactCr', header: 'Cost', className: 'whitespace-nowrap', render: (x) => <span className={x.costImpactCr > 0 ? 'text-red-600' : x.costImpactCr < 0 ? 'text-green-600' : ''}>{signed(x.costImpactCr, m)}</span> },
            { key: 'scheduleImpactDays', header: 'Schedule', className: 'whitespace-nowrap', render: (x) => <span className={x.scheduleImpactDays > 0 ? 'text-red-600' : x.scheduleImpactDays < 0 ? 'text-green-600' : ''}>{x.scheduleImpactDays > 0 ? '+' : ''}{x.scheduleImpactDays} d</span> },
            { key: 'status', header: 'Status', render: (x) => <Badge value={x.status} /> },
          ]} />
        </Card>
      </div>

      {/* actions + escalations + events */}
      <div className="grid grid-cols-[1.3fr_1fr_0.85fr] gap-4">
        <Card title={`Open actions – ${s.unit}`} subtitle={`${actions.length} open · ${h.overdueActions} overdue`}>
          <Table<ActionItem> compact rows={actions} onRowClick={open.action} empty="No open actions for this business unit." columns={[
            { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
            { key: 'action', header: 'Action', render: (x) => <span className="block max-w-[170px]"><Link onClick={() => open.action(x)} className="block truncate max-w-[170px]">{x.action}</Link><span className="block text-[10.5px] text-ink-500 truncate">{x.owner} · {x.source}</span></span> },
            { key: 'due', header: 'Due', className: 'whitespace-nowrap', render: (x) => <span className={isActionOverdue(x) ? 'text-red-600 font-medium' : ''}>{fmtDate(x.due)}</span> },
            { key: 'status', header: 'Status', render: (x) => <Badge value={isActionOverdue(x) ? 'Overdue' : x.status} /> },
          ]} />
        </Card>
        <Card title="Escalations, risks & issues" subtitle={`${h.escalations} escalated · ${raid.length} open · tagged to ${s.unit}`} action={<button className="link" onClick={open.risks}>Open RAID</button>}>
          {raid.length ? (
            <div className="space-y-1.5">
              {raid.map((r: RaidItem) => {
                const p = project(raidUnit(r, d.govLinks, d.txLinks)?.projectId)
                return (
                  <div key={r.id} className="flex items-start gap-2.5 text-[12.5px] cursor-pointer hover:bg-surface rounded-md p-1" onClick={open.risks}>
                    <span className={clsx('w-7 h-7 rounded-full flex items-center justify-center shrink-0', r.escalated && r.escalationStatus !== 'Resolved' ? 'bg-red-50 text-red-600' : r.level === 'Critical' || r.level === 'High' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500')}><Flag size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink-900 truncate">{r.code} · {r.shortTitle ?? r.title}</div>
                      <div className="text-[11px] text-ink-500 truncate">{r.type} · {r.level} · {r.owner} · due {fmtDate(r.dueDate)}{p ? ` · ${p.name}` : ''}</div>
                    </div>
                    <Badge value={r.escalated && r.escalationStatus ? r.escalationStatus : r.status} />
                  </div>
                )
              })}
            </div>
          ) : <EmptyNote>No open risks or issues tagged to this business unit.</EmptyNote>}
        </Card>
        <Card title="Upcoming governance events" subtitle={`${s.events.length} for ${s.unit}${meetingsForUnit.length ? ` · on the agenda of ${meetingsForUnit.map((x) => x.code).join(', ')}` : ''}`}>
          {s.events.length ? (
            <div className="space-y-1.5">
              {s.events.slice(0, 6).map((e) => {
                const dt = new Date(e.date)
                return (
                  <div key={e.id} className="flex items-center gap-2.5 text-[12.5px] cursor-pointer hover:bg-surface rounded-md px-1 py-0.5" onClick={() => open.event(e)}>
                    <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex flex-col items-center justify-center shrink-0 leading-none"><span className="text-[13px] font-bold">{dt.getDate()}</span><span className="text-[9px] uppercase">{dt.toLocaleDateString('en-GB', { month: 'short' })}</span></div>
                    <div className="min-w-0 flex-1"><div className="font-medium text-ink-900 truncate">{e.title}</div><div className="text-[11px] text-ink-500 truncate">{e.type} · {e.owner}</div></div>
                  </div>
                )
              })}
            </div>
          ) : <EmptyNote>No upcoming events for this business unit.</EmptyNote>}
          {meetingsForUnit.length > 0 && <div className="mt-2 pt-2 border-t border-line text-[11.5px] text-ink-500 flex items-center gap-1.5"><Calendar size={12} className="text-brand-600" /> Steering agenda items for this unit: {meetingsForUnit.map((x) => `${x.code} (${fmtDate(x.date)})`).join(', ')}</div>}
        </Card>
      </div>

      {/* RACI row, then projects + stakeholders / controls */}
      <BuRaciMatrix raciC={buRaciC} units={d.unitNames} highlight={s.unit} title={`RACI – ${s.unit}`} />
      <div className="grid grid-cols-[1.25fr_1fr] gap-4">
        <div className="space-y-4 min-w-0">
          <Card title={`Linked transition projects – ${s.unit}`} subtitle={`${s.projects.length} projects · decisions, change requests and actions above reference them`} action={<button className="link" onClick={open.transition}>Open Transition</button>}>
            <Table<TransitionProject> compact rows={s.projects} onRowClick={open.transition} empty="No transition projects for this business unit." columns={[
              { key: 'name', header: 'Project', render: (p) => <span className="block max-w-[200px]"><span className="font-medium block truncate">{p.name}</span><span className="block text-[10.5px] text-ink-500 truncate">{p.scopeSummary}</span></span> },
              { key: 'wave', header: 'Wave', className: 'whitespace-nowrap', render: (p) => `Wave ${p.wave}` },
              { key: 'status', header: 'Status', render: (p) => <Badge value={p.status} className={p.status === 'Stabilizing' ? 'bg-violet-50 text-violet-700' : undefined} /> },
              { key: 'goLiveDate', header: 'Go-live', className: 'whitespace-nowrap', render: (p) => <span className="inline-flex items-center gap-1"><Rocket size={12} className={p.goLiveDate < TODAY && p.status !== 'Completed' && p.status !== 'Stabilizing' ? 'text-red-600' : 'text-ink-400'} />{fmtDate(p.goLiveDate)}</span> },
              { key: 'items', header: 'Gov. items', className: 'text-right', render: (p) => s.decisions.filter((x) => x.projectId === p.id).length + s.crs.filter((x) => x.projectId === p.id).length + s.actions.filter((x) => x.projectId === p.id).length },
              { key: 'c', header: '', render: () => <ChevronRight size={14} className="text-ink-400" /> },
            ]} />
          </Card>
        </div>
        <div className="space-y-4 min-w-0">
          <Card title={<span className="block truncate">Stakeholders – {s.unit}</span>} subtitle="Sponsors and global counterparts for this unit">
            {s.stakeholders.length ? (
              <div className="space-y-1">
                {s.stakeholders.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 text-[12.5px] rounded-md px-1 py-1 hover:bg-surface cursor-pointer" onClick={() => open.stakeholder(st)}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.sentiment === 'Supportive' ? '#16A34A' : st.sentiment === 'Concerned' ? '#DC2626' : '#F59E0B' }} />
                    <span className="min-w-0 flex-1"><Link onClick={() => open.stakeholder(st)} className="block truncate">{st.name}</Link><span className="block text-[11px] text-ink-500 truncate">{st.role} · {st.engagement}</span></span>
                    <Badge value={st.influence} />
                  </div>
                ))}
              </div>
            ) : <EmptyNote>No stakeholder tagged to this business unit yet.</EmptyNote>}
          </Card>
          <Card title={<span className="block truncate">Controls – {s.unit}</span>} subtitle={`${s.controls.filter((c) => c.businessUnits.includes(s.unit)).length} unit-specific · ${s.controls.filter((c) => !c.businessUnits.length).length} program-wide`}>
            <SectionTitle>Unit-specific</SectionTitle>
            {s.controls.filter((c) => c.businessUnits.includes(s.unit)).map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-[12.5px] py-1 border-b border-line/70 last:border-0 cursor-pointer hover:bg-surface rounded-md px-1" onClick={() => open.control(c)}>
                <span className="min-w-0 flex-1"><Link onClick={() => open.control(c)} className="block truncate">{c.control}</Link><span className="block text-[11px] text-ink-500 truncate">{c.wbs} · {c.owner} · {c.lastReviewed ? `reviewed ${fmtDate(c.lastReviewed)}` : 'not reviewed'}</span></span>
                <Badge value={c.status === 'Needs Review' ? 'At Risk' : c.status === 'Planned' ? 'Not Started' : c.status} />
              </div>
            ))}
            {s.controls.filter((c) => c.businessUnits.includes(s.unit)).length === 0 && <EmptyNote>No unit-specific control.</EmptyNote>}
            <div className="text-[11.5px] text-ink-500 mt-2 pt-2 border-t border-line">Plus {s.controls.filter((c) => !c.businessUnits.length).length} program-wide controls (see Policies & Controls).</div>
          </Card>
        </div>
      </div>
      <div className="text-[11.5px] text-ink-500 flex items-center gap-1.5"><span className={clsx('font-semibold', RAG_TEXT[h.rag])}>Health {h.rag}</span> · score {h.score} = overdue decisions ×3, open high-impact decisions ×2 (others ×1), pending CRs ×1 (+1 if material), overdue actions ×2, open actions ×0.5, open escalations ×3, other critical/high risks ×1 · Amber from {d.gs.unitHealthAmberFrom ?? 5}, Red from {d.gs.unitHealthRedFrom ?? 12} (thresholds editable in the Input view).</div>
    </>
  )
}
