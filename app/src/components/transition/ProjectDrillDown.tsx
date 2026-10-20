/**
 * Project drill-down – a slide-over opened from any blue project link. Overview and timeline, KT items (add / +1 session /
 * mark done / sign-off), readiness by dimension (editable scores, status, next action), gaps (add / resolve), linked
 * Transition milestones, risks & issues of the project / business unit, and notes. Everything writes straight to the collections.
 */
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { X, Plus, Pencil, Trash2, Check, CheckCircle2, Link2, Save, Rocket } from 'lucide-react'
import { Badge, Progress, Ring, Table, EmptyNote } from '../ui'
import { TODAY } from '../../data/common'
import type { Milestone } from '../../data/shared'
import { isOpen } from '../../data/shared'
import { uid } from '../../store/useStore'
import {
  projectKt, assessmentScore, readinessColor, blankAssessment, ktStatusFor, isTransitionMilestone, milestoneWave, raidLink, raidLabel, projectStatusColor, fmtD, DIMENSIONS, DIM_KEY, READINESS_STATUSES,
  type KtItem, type ReadinessGap, type ReadinessAssessment,
} from '../../data/transition'
import type { Tx } from './types'
import { WaveDot, StatusBadge, GanttRows, DIM_ICON, TIGHT } from './Overview'

function Detail({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-3' : undefined}>
      <div className="text-[11px] uppercase tracking-wide text-ink-500">{label}</div>
      <div className="text-[13px] font-medium text-ink-900 mt-0.5">{value}</div>
    </div>
  )
}
const Section = ({ title, sub, action, children }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="card px-5 py-4 min-w-0">
    <div className="flex items-start justify-between gap-3 mb-2"><div><div className="card-title">{title}</div>{sub && <div className="text-[12px] text-ink-500">{sub}</div>}</div><div className="flex items-center gap-2 shrink-0">{action}</div></div>
    {children}
  </div>
)
const Small = ({ children, onClick, tone = 'bg-brand-50 text-brand-600 hover:bg-brand-100', title }: { children: React.ReactNode; onClick: () => void; tone?: string; title?: string }) => (
  <button type="button" title={title} className={clsx('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium cursor-pointer whitespace-nowrap', tone)} onClick={(e) => { e.stopPropagation(); onClick() }}>{children}</button>
)

export function ProjectDrillDown({ tx, projectId, blocked, onClose }: { tx: Tx; projectId: string | null; blocked: boolean; onClose: () => void }) {
  const { projects, waves, kt, assessments, gaps, milestones, msWaves, msProjects, raid, raidLinks, open } = tx
  const p = projects.items.find((x) => x.id === projectId)
  const [notes, setNotes] = useState('')
  const [linkMs, setLinkMs] = useState('')
  useEffect(() => { setNotes(p?.notes ?? ''); setLinkMs('') }, [projectId, p?.notes])
  useEffect(() => {
    if (!projectId) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !blocked) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [projectId, blocked, onClose])

  if (!projectId || !p) return null
  const wave = waves.items.find((w) => w.number === p.wave)
  const items = kt.items.filter((k) => k.projectId === p.id).sort((a, b) => a.targetDate.localeCompare(b.targetDate))
  const ks = projectKt(p, kt.items)
  const a = assessments.items.find((x) => x.projectId === p.id)
  const score = a ? assessmentScore(a) : 0
  const projGaps = gaps.items.filter((g) => g.projectId === p.id).sort((x, y) => (x.status === 'Resolved' ? 1 : 0) - (y.status === 'Resolved' ? 1 : 0) || y.raised.localeCompare(x.raised))
  const linked = milestones.items.filter((m) => msProjects.items.some((l) => l.id === m.id && l.projectId === p.id)).sort((x, y) => x.dueDate.localeCompare(y.dueDate))
  const linkable = milestones.items.filter(isTransitionMilestone).filter((m) => !msProjects.items.some((l) => l.id === m.id)).sort((x, y) => x.dueDate.localeCompare(y.dueDate))
  const risks = raid.items.map((r) => ({ r, l: raidLink(r, raidLinks.items) })).filter(({ l }) => l && (l.projectId === p.id || (!l.projectId && l.businessUnit === p.businessUnit))).sort((x, y) => Number(isOpen(y.r)) - Number(isOpen(x.r)) || y.r.impactScore - x.r.impactScore)

  const setSessions = (k: KtItem, planned: number, done: number) => {
    const status = ktStatusFor(planned, done)
    kt.update({ ...k, sessionsPlanned: planned, sessionsDone: Math.max(0, done), status, signOff: status === 'Completed' && k.signOff === 'Not Started' ? 'Pending' : k.signOff })
  }
  const setDim = (key: keyof ReadinessAssessment, v: number) => { if (a) assessments.update({ ...a, [key]: Math.max(0, Math.min(100, v)), assessedOn: TODAY }) }
  const removeProject = () => {
    if (!window.confirm(`Remove project “${p.name}” with its ${items.length} KT items, readiness assessment and ${projGaps.length} gaps? This cannot be undone.`)) return
    items.forEach((k) => kt.remove(k.id)); if (a) assessments.remove(a.id); projGaps.forEach((g) => gaps.remove(g.id)); msProjects.items.filter((l) => l.projectId === p.id).forEach((l) => msProjects.remove(l.id))
    projects.remove(p.id); onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-navy-900/40" onMouseDown={() => { if (!blocked) onClose() }}>
      <aside className="bg-surface h-full w-[1140px] max-w-[94vw] shadow-2xl flex flex-col" onMouseDown={(e) => e.stopPropagation()} data-testid="project-drilldown">
        {/* header */}
        <div className="bg-white border-b border-line px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11.5px] text-ink-500 flex items-center gap-1.5">{p.businessUnit} <span className="text-ink-300">·</span> <WaveDot wave={wave} size={16} /> Wave {p.wave}{wave?.name ? ` – ${wave.name}` : ''}</div>
            <h3 className="text-[20px] font-bold text-navy-900 leading-tight truncate">{p.name}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge value={p.status} />
              <span className="flex items-center gap-1.5 text-[12px] text-ink-500"><Progress value={p.progress} color={projectStatusColor(p.status)} className="w-[80px]" /><b className="text-ink-900">{p.progress}%</b></span>
              <span className="text-[12px] text-ink-500">KT <b className="text-ink-900">{ks.pct}%</b> · readiness <b className="text-ink-900">{score}%</b> · go-live <b className="text-ink-900">{fmtD(p.goLiveDate)}</b> · {p.ftes} FTEs</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn-primary" onClick={() => open({ kind: 'kt', item: null, projectId: p.id })}><Plus size={14} /> Add KT item</button>
            <button className="btn-secondary" onClick={() => open({ kind: 'project', item: p })}><Pencil size={14} /> Edit project</button>
            <button className="btn-danger" onClick={removeProject}><Trash2 size={14} /> Remove</button>
            <button className="text-ink-500 hover:text-ink-900 cursor-pointer ml-1" onClick={onClose} title="Close"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-6 py-4 space-y-4">
          {/* overview */}
          <div className="card px-5 py-4">
            <div className="grid grid-cols-6 gap-x-4 gap-y-3">
              <Detail label="Business unit" value={p.businessUnit} />
              <Detail label="Wave" value={<span className="inline-flex items-center gap-1.5"><WaveDot wave={wave} size={18} /> Wave {p.wave}</span>} />
              <Detail label="Status" value={<StatusBadge value={p.status} />} />
              <Detail label="Global owner" value={p.globalOwner || '—'} />
              <Detail label="India lead" value={p.indiaLead} />
              <Detail label="FTEs transitioning" value={p.ftes} />
              <Detail label="Start" value={fmtD(p.startDate)} />
              <Detail label="End" value={fmtD(p.endDate)} />
              <Detail label="Go-live" value={<span className={p.goLiveDate < TODAY && !['Completed', 'Stabilizing'].includes(p.status) ? 'text-red-600' : ''}>{fmtD(p.goLiveDate)}</span>} />
              <Detail label="Region / client" value={p.region || '—'} wide />
              <Detail label="Scope" value={<span className="text-ink-700 font-normal">{p.scopeSummary || '—'}</span>} wide />
              <Detail label="Description" value={<span className="text-ink-700 font-normal">{p.description || '—'}</span>} wide />
            </div>
            <div className="mt-4 pt-3 border-t border-line">
              <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1">Timeline</div>
              <GanttRows labelWidth={120} rows={[
                ...(wave ? [{ id: 'w', label: `Wave ${wave.number}`, start: wave.startDate, end: wave.endDate, color: wave.color + '66', title: `Wave ${wave.number}: ${fmtD(wave.startDate)} – ${fmtD(wave.endDate)}` }] : []),
                { id: 'p', label: 'Project', start: p.startDate, end: p.endDate, color: wave?.color ?? '#5B9BF0', progress: p.progress, marker: p.goLiveDate, title: `${fmtD(p.startDate)} – ${fmtD(p.endDate)} · go-live ${fmtD(p.goLiveDate)}` },
              ]} />
            </div>
          </div>

          {/* KT items */}
          <Section title="Knowledge transfer items" sub={`${ks.done} of ${ks.planned} sessions delivered (${ks.pct}%) · ${ks.completed} of ${ks.total} items complete · ${ks.signed} signed off`} action={<button className="btn-secondary" onClick={() => open({ kind: 'kt', item: null, projectId: p.id })}><Plus size={14} /> Add KT item</button>}>
            <div className={TIGHT}><Table<KtItem> compact rows={items} onRowClick={(k) => open({ kind: 'kt', item: k })} empty="No KT items yet – add the first process to transfer." columns={[
              { key: 'process', header: 'Process / activity', render: (k) => <span className="font-medium">{k.process}</span> },
              { key: 'globalOwner', header: 'Global owner', className: 'whitespace-nowrap' },
              { key: 'indiaOwner', header: 'India owner', className: 'whitespace-nowrap' },
              { key: 'sessions', header: 'Sessions done / planned', render: (k) => <span className="flex items-center gap-2"><Progress value={k.sessionsPlanned ? (k.sessionsDone / k.sessionsPlanned) * 100 : 0} className="w-[70px]" /><span className="whitespace-nowrap">{k.sessionsDone} / {k.sessionsPlanned}</span></span> },
              { key: 'targetDate', header: 'Target', className: 'whitespace-nowrap', render: (k) => <span className={k.status !== 'Completed' && k.targetDate < TODAY ? 'text-red-600 font-medium' : ''}>{fmtD(k.targetDate)}</span> },
              { key: 'status', header: 'Status', render: (k) => <Badge value={k.status} /> },
              { key: 'signOff', header: 'Sign-off', render: (k) => <Badge value={k.signOff === 'Signed' ? 'Completed' : k.signOff} /> },
              { key: 'act', header: '', className: 'text-right whitespace-nowrap', render: (k) => (
                <span className="inline-flex items-center gap-1">
                  {k.status !== 'Completed' && <Small title="Record one more delivered session" onClick={() => setSessions(k, k.sessionsPlanned, k.sessionsDone + 1)}>+1 session</Small>}
                  {k.status !== 'Completed' && <Small title="Mark all planned sessions delivered" tone="bg-green-50 text-green-700 hover:bg-green-100" onClick={() => setSessions(k, k.sessionsPlanned, k.sessionsPlanned)}><Check size={11} /> Mark done</Small>}
                  {k.status === 'Completed' && k.signOff !== 'Signed' && <Small title="Record the global owner's sign-off" tone="bg-violet-50 text-violet-700 hover:bg-violet-100" onClick={() => kt.update({ ...k, signOff: 'Signed' })}><CheckCircle2 size={11} /> Sign off</Small>}
                  <button className="text-ink-400 hover:text-brand-600 cursor-pointer p-0.5" title="Edit" onClick={(e) => { e.stopPropagation(); open({ kind: 'kt', item: k }) }}><Pencil size={12} /></button>
                  <button className="text-ink-400 hover:text-red-600 cursor-pointer p-0.5" title="Remove" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Remove KT item “${k.process}”?`)) kt.remove(k.id) }}><Trash2 size={12} /></button>
                </span>) },
            ]} /></div>
          </Section>

          <div className="grid grid-cols-[1fr_1.25fr] gap-4">
            {/* readiness */}
            <Section title="Readiness by dimension" sub={a ? `Assessed ${fmtD(a.assessedOn)} · scores write straight to the assessment` : 'Not assessed yet'} action={a ? <button className="btn-secondary" onClick={() => open({ kind: 'assessment', item: a })}><Pencil size={13} /> Full form</button> : <button className="btn-primary" onClick={() => assessments.add(blankAssessment(uid('ra'), p))}><Plus size={14} /> Assess project</button>}>
              {a ? (
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <Ring value={score} size={64} stroke={8} color={readinessColor(score)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[20px] font-bold leading-tight" style={{ color: readinessColor(score) }}>{score}%</div>
                      <div className="flex items-center gap-2 mt-1"><span className="text-[11.5px] text-ink-500">Status</span><select className="input py-1 w-auto text-[12px]" value={a.status} onChange={(e) => assessments.update({ ...a, status: e.target.value as ReadinessAssessment['status'], assessedOn: TODAY })}>{(READINESS_STATUSES.includes(a.status as never) ? READINESS_STATUSES : [a.status, ...READINESS_STATUSES]).map((s) => <option key={s}>{s}</option>)}</select></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {DIMENSIONS.map((d) => { const k = DIM_KEY[d]; const v = a[k] ?? 0; return (
                      <div key={d} className="flex items-center gap-2 text-[12.5px]">
                        <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{DIM_ICON[d]}</span>
                        <span className="w-[150px] text-[12px] text-ink-700 truncate" title={d}>{d}</span>
                        <Progress value={v} className="flex-1" color={readinessColor(v)} />
                        <input type="number" min={0} max={100} value={v} onChange={(e) => setDim(k, Number(e.target.value) || 0)} className="w-[58px] rounded border border-line px-1.5 py-0.5 text-right text-[12px] outline-none focus:border-brand-400" />
                      </div>) })}
                  </div>
                  <div className="mt-3"><div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1">Next action</div><input className="input py-1.5 text-[12.5px]" value={a.nextAction} placeholder="What has to happen next" onChange={(e) => assessments.update({ ...a, nextAction: e.target.value })} /></div>
                </div>
              ) : <EmptyNote>Create the assessment to score people, process, technology, facilities and controls.</EmptyNote>}
            </Section>

            {/* gaps */}
            <Section title="Readiness gaps" sub={`${projGaps.filter((g) => g.status !== 'Resolved').length} open · ${projGaps.filter((g) => g.status === 'Resolved').length} resolved`} action={<button className="btn-secondary" onClick={() => open({ kind: 'gap', item: null, projectId: p.id })}><Plus size={14} /> Add gap</button>}>
              <div className={TIGHT}><Table<ReadinessGap> compact rows={projGaps} onRowClick={(g) => open({ kind: 'gap', item: g })} empty="No readiness gaps logged for this project." columns={[
                { key: 'code', header: 'ID', render: (g) => <span className="text-ink-500 whitespace-nowrap">{g.code}</span> },
                { key: 'description', header: 'Gap', render: (g) => <span className={clsx('font-medium leading-snug block min-w-[160px]', g.status === 'Resolved' && 'text-ink-500')}>{g.description}<span className="block text-[10.5px] text-ink-500 font-normal">{g.dimension} · {g.owner}</span></span> },
                { key: 'severity', header: 'Severity', render: (g) => <Badge value={g.severity} /> },
                { key: 'due', header: 'Due', render: (g) => <span className={`whitespace-nowrap ${g.status !== 'Resolved' && g.due < TODAY ? 'text-red-600 font-medium' : ''}`}>{fmtD(g.due)}</span> },
                { key: 'status', header: 'Status', render: (g) => <Badge value={g.status === 'New' ? 'Open' : g.status} className={g.status === 'New' ? 'bg-amber-50! text-amber-700!' : ''} /> },
                { key: 'act', header: '', className: 'text-right', render: (g) => g.status !== 'Resolved' ? <Small tone="bg-green-50 text-green-700 hover:bg-green-100" onClick={() => gaps.update({ ...g, status: 'Resolved' })}><Check size={11} /> Resolve</Small> : <Small tone="bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={() => gaps.update({ ...g, status: 'Open' })}>Reopen</Small> },
              ]} /></div>
            </Section>
          </div>

          <div className="grid grid-cols-[1fr_1.25fr] gap-4">
            {/* milestones */}
            <Section title="Linked transition milestones" sub="Milestones from the shared program milestone list linked to this project" action={<button className="btn-secondary" onClick={() => open({ kind: 'milestone', item: null, projectId: p.id, wave: p.wave })}><Plus size={14} /> Add milestone</button>}>
              <div className={TIGHT}><Table<Milestone> compact rows={linked} onRowClick={(m) => open({ kind: 'milestone', item: m, wave: milestoneWave(m, waves.items, msWaves.items, projects.items, msProjects.items), projectId: p.id })} empty="No milestones linked yet." columns={[
                { key: 'name', header: 'Milestone', render: (m) => <span className="font-medium">{m.name}</span> },
                { key: 'dueDate', header: 'Target', className: 'whitespace-nowrap', render: (m) => fmtD(m.dueDate) },
                { key: 'status', header: 'Status', render: (m) => <Badge value={m.status} /> },
                { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
                { key: 'act', header: '', className: 'text-right', render: (m) => <Small tone="bg-slate-100 text-slate-600 hover:bg-slate-200" title="Unlink from this project" onClick={() => msProjects.remove(m.id)}>Unlink</Small> },
              ]} /></div>
              {linkable.length > 0 && (
                <div className="flex items-center gap-2 mt-2 text-[12px]">
                  <Link2 size={13} className="text-ink-400" />
                  <select className="input py-1 text-[12px] flex-1" value={linkMs} onChange={(e) => setLinkMs(e.target.value)}><option value="">Link an existing transition milestone…</option>{linkable.map((m) => <option key={m.id} value={m.id}>{m.name} · {fmtD(m.dueDate)}</option>)}</select>
                  <button className="btn-secondary py-1 disabled:opacity-50" disabled={!linkMs} onClick={() => { msProjects.update({ id: linkMs, projectId: p.id }); setLinkMs('') }}>Link</button>
                </div>
              )}
            </Section>

            {/* risks */}
            <Section title="Risks & issues" sub="Items of this project plus unit-level items of its business unit (from the program RAID register)" action={<button className="btn-secondary" onClick={() => open({ kind: 'raid', item: null, businessUnit: p.businessUnit, projectId: p.id })}><Plus size={14} /> Log risk / issue</button>}>
              <div className={TIGHT}><Table compact rows={risks.map(({ r, l }) => ({ id: r.id, r, l }))} onRowClick={(x) => open({ kind: 'raid', item: x.r })} empty="No risks or issues linked to this project or its business unit." columns={[
                { key: 'code', header: 'ID', render: (x) => <span className="text-ink-500 whitespace-nowrap">{x.r.code}</span> },
                { key: 'type', header: 'Type', render: (x) => <Badge value={x.r.type} /> },
                { key: 'title', header: 'Risk / Issue', render: (x) => <span className="block leading-snug min-w-[160px]"><span className="font-medium">{raidLabel(x.r)}</span><span className="block text-[10.5px] text-ink-500">{x.l?.projectId ? 'this project' : `${p.businessUnit} (unit-level)`}</span></span> },
                { key: 'level', header: 'Impact', render: (x) => <Badge value={x.r.level} /> },
                { key: 'status', header: 'Status', render: (x) => <Badge value={x.r.status} /> },
                { key: 'owner', header: 'Owner', className: 'whitespace-nowrap', render: (x) => x.r.owner },
                { key: 'due', header: 'Due', className: 'whitespace-nowrap', render: (x) => fmtD(x.r.dueDate) },
              ]} /></div>
            </Section>
          </div>

          {/* notes */}
          <Section title="Notes" sub="Free-text notes on this project (decisions, blockers, context for the next steering review)" action={<button className="btn-primary disabled:opacity-50" disabled={notes === (p.notes ?? '')} onClick={() => projects.update({ ...p, notes })}><Save size={14} /> Save notes</button>}>
            <textarea className="input min-h-[88px] text-[12.5px]" value={notes} placeholder="Add notes…" onChange={(e) => setNotes(e.target.value)} />
          </Section>
          <div className="text-[11px] text-ink-400 flex items-center gap-1 pb-2"><Rocket size={11} /> Go-live {fmtD(p.goLiveDate)} · last assessed {a ? fmtD(a.assessedOn) : '—'}</div>
        </div>
      </aside>
    </div>
  )
}

