/**
 * Requisition drill-down – a slide-over opened from any blue role link. Shows the requisition details, the stage it
 * is at, how many people applied, the application pipeline (counts per round, conversion %, funnel) and the candidate
 * list with next-stage / reject actions. Candidates, the requisition itself and its removal are all editable from here.
 */
import { useEffect, useMemo, useState } from 'react'
import { X, Plus, Pencil, ChevronRight, Ban, RotateCcw, Trash2 } from 'lucide-react'
import { Badge, FilterSelect } from '../ui'
import { fmtDate } from '../../data/common'
import { isOpenPosition, positionDaysOpen, reqId, pipelineFor, requisitionStage, isActiveCandidate, CANDIDATE_STATUSES, type Candidate } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { Funnel, CompactTable, candidateBadge } from './widgets'
import { CandidateForm, PositionForm } from './forms'

function Detail({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <div className="text-[11px] uppercase tracking-wide text-ink-500">{label}</div>
      <div className="text-[13px] font-medium text-ink-900 mt-0.5">{value}</div>
    </div>
  )
}

export function RequisitionDrillDown({ d, positionId, onClose }: { d: ResourceData; positionId: string | null; onClose: () => void }) {
  const { positions, candidates, candidatesFor, advanceCandidate, closeCandidate, reopenCandidate, buNames, locations } = d
  const p = positions.items.find((x) => x.id === positionId)
  const [editPos, setEditPos] = useState(false)
  const [cand, setCand] = useState<Candidate | null>(null)
  const [addCand, setAddCand] = useState(false)
  const [fStatus, setFStatus] = useState('All')
  const subFormOpen = editPos || addCand || !!cand

  useEffect(() => {
    if (!positionId) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !subFormOpen) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [positionId, subFormOpen, onClose])
  useEffect(() => { setFStatus('All') }, [positionId])

  const list = useMemo(() => (positionId ? candidatesFor(positionId) : []), [positionId, candidatesFor])
  const pipeline = useMemo(() => pipelineFor(list), [list])
  const rows = useMemo(() => list
    .filter((c) => fStatus === 'All' || c.status === fStatus)
    .sort((a, b) => Number(isActiveCandidate(b)) - Number(isActiveCandidate(a)) || pipeline.findIndex((s) => s.stage === b.stage) - pipeline.findIndex((s) => s.stage === a.stage) || b.lastActivity.localeCompare(a.lastActivity)), [list, fStatus, pipeline])

  if (!positionId || !p) return null
  const stage = requisitionStage(list)
  const active = list.filter(isActiveCandidate).length
  const offers = list.filter((c) => c.status === 'Offer').length
  const removeReq = () => {
    if (!window.confirm(`Remove requisition ${reqId(p)} – ${p.role} and its ${list.length} candidate records? This cannot be undone.`)) return
    list.forEach((c) => candidates.remove(c.id))
    positions.remove(p.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-900/40" onMouseDown={() => { if (!subFormOpen) onClose() }}>
      <aside className="bg-surface h-full w-[1120px] max-w-[94vw] shadow-2xl flex flex-col" onMouseDown={(e) => e.stopPropagation()} data-testid="req-drilldown">
        {/* header */}
        <div className="bg-white border-b border-line px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11.5px] text-ink-500">{reqId(p)} · {p.businessUnit}</div>
            <h3 className="text-[20px] font-bold text-navy-900 leading-tight">{p.role}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge value={p.priority} /><Badge value={p.status} className={candidateBadge[p.status]} />
              <span className="text-[12px] text-ink-500">Stage: <b className="text-ink-900">{stage}</b> · {list.length} applied · {active} in process{offers ? ` · ${offers} offer${offers > 1 ? 's' : ''} out` : ''}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn-primary" onClick={() => setAddCand(true)}><Plus size={14} /> Add candidate</button>
            <button className="btn-secondary" onClick={() => setEditPos(true)}><Pencil size={14} /> Edit requisition</button>
            <button className="btn-danger" onClick={removeReq}><Trash2 size={14} /> Remove</button>
            <button className="text-ink-500 hover:text-ink-900 cursor-pointer ml-1" onClick={onClose} title="Close"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-6 py-4 space-y-4">
          {/* details */}
          <div className="card px-5 py-4">
            <div className="grid grid-cols-6 gap-x-4 gap-y-3">
              <Detail label="Business unit" value={p.businessUnit} />
              <Detail label="Location" value={p.location} />
              <Detail label="Priority" value={<Badge value={p.priority} />} />
              <Detail label="Hiring manager" value={p.hiringManager} />
              <Detail label="Grade" value={p.grade} />
              <Detail label="Status" value={<Badge value={p.status} className={candidateBadge[p.status]} />} />
              <Detail label="Opened" value={fmtDate(p.openedOn)} />
              <Detail label="Days open" value={isOpenPosition(p) ? `${positionDaysOpen(p)} days` : '—'} />
              <Detail label="Target fill date" value={<span className={p.targetDate < '2026-10-20' && isOpenPosition(p) ? 'text-red-600' : ''}>{fmtDate(p.targetDate)}</span>} />
              <Detail label="Stage it is at" value={stage} />
              <Detail label="Applied" value={`${list.length} candidate${list.length === 1 ? '' : 's'}`} />
              <Detail label="Notes" value={<span className="text-ink-700 font-normal">{p.notes || '—'}</span>} />
            </div>
          </div>

          {/* pipeline */}
          <div className="card px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div><div className="card-title">Application pipeline</div><div className="text-[12px] text-ink-500">Candidates that reached each round, conversion from the previous round, and who is sitting at it now.</div></div>
            </div>
            <div className="flex items-start gap-5">
              <Funnel stages={pipeline} width={140} height={236} />
              <div className="flex-1 min-w-0">
                <CompactTable rows={pipeline} columns={[
                  { key: 'stage', header: 'Round', className: 'whitespace-nowrap', render: (r) => <span className="font-medium">{r.stage}</span> },
                  { key: 'candidates', header: 'Reached', className: 'text-right', render: (r) => <span className="font-semibold">{r.candidates}</span> },
                  { key: 'conv', header: 'Conversion %', className: 'text-right', render: (r) => (r.conv === null ? '—' : <span className={r.conv >= 60 ? 'text-green-600' : r.conv >= 40 ? 'text-amber-600' : 'text-red-600'}>{r.conv}%</span>) },
                  { key: 'atStage', header: 'At this round now', className: 'text-right', render: (r) => (r.atStage ? <span className="text-brand-600 font-medium">{r.atStage}</span> : <span className="text-ink-400">0</span>) },
                  { key: 'dropped', header: 'Rejected / withdrawn here', className: 'text-right', render: (r) => (r.dropped ? <span className="text-red-600">{r.dropped}</span> : <span className="text-ink-400">0</span>) },
                ]} />
              </div>
            </div>
          </div>

          {/* candidates */}
          <div className="card px-5 py-4">
            <div className="flex items-center justify-between mb-2 gap-3">
              <div><div className="card-title">Candidates</div><div className="text-[12px] text-ink-500">{rows.length} of {list.length} · click a name to edit · use the arrow to move a candidate to the next round</div></div>
              <div className="flex items-center gap-2">
                <FilterSelect label="Status" value={fStatus} options={['All', ...CANDIDATE_STATUSES]} onChange={setFStatus} />
                <button className="btn-secondary" onClick={() => setAddCand(true)}><Plus size={14} /> Add candidate</button>
              </div>
            </div>
            <CompactTable<Candidate> rows={rows} empty="No candidates yet – add the first applicant." columns={[
              { key: 'name', header: 'Candidate', className: 'whitespace-nowrap', render: (c) => <button className="text-brand-600 font-medium hover:underline cursor-pointer text-left" onClick={() => setCand(c)}>{c.name}</button> },
              { key: 'source', header: 'Source', className: 'whitespace-nowrap' },
              { key: 'stage', header: 'Current stage', className: 'whitespace-nowrap' },
              { key: 'roundsCompleted', header: 'Rounds', className: 'text-right', render: (c) => `${c.roundsCompleted} / 3` },
              { key: 'status', header: 'Status', render: (c) => <Badge value={c.status} className={candidateBadge[c.status]} /> },
              { key: 'nextStep', header: 'Interview date / next step', render: (c) => <span className="text-ink-700">{c.nextStep || '—'}</span> },
              { key: 'lastActivity', header: 'Last activity', className: 'whitespace-nowrap', render: (c) => fmtDate(c.lastActivity) },
              { key: 'actions', header: '', className: 'text-right whitespace-nowrap', render: (c) => (
                <span className="inline-flex items-center gap-1">
                  {isActiveCandidate(c) && c.stage !== 'Joined' && <button className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 cursor-pointer" title="Move to next round" onClick={() => advanceCandidate(c)}>Next <ChevronRight size={12} /></button>}
                  {isActiveCandidate(c) && c.stage !== 'Joined' && <button className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer" title="Reject" onClick={() => closeCandidate(c, 'Rejected')}><Ban size={11} /> Reject</button>}
                  {(c.status === 'Rejected' || c.status === 'Withdrawn') && <button className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer" title="Reopen" onClick={() => reopenCandidate(c)}><RotateCcw size={11} /> Reopen</button>}
                  <button className="text-ink-400 hover:text-brand-600 cursor-pointer p-0.5" title="Edit" onClick={() => setCand(c)}><Pencil size={12} /></button>
                </span>
              ) },
            ]} />
          </div>
        </div>

        <PositionForm open={editPos} onClose={() => setEditPos(false)} value={p} businessUnits={buNames} locations={locations} onSave={(np) => { positions.update(np); setEditPos(false) }} onDelete={() => { list.forEach((c) => candidates.remove(c.id)); positions.remove(p.id); onClose() }} />
        <CandidateForm open={addCand || !!cand} onClose={() => { setAddCand(false); setCand(null) }} value={cand} positions={positions.items} positionId={p.id}
          onSave={(c) => { if (cand) candidates.update(c); else candidates.add(c); setAddCand(false); setCand(null) }} onDelete={(id) => candidates.remove(id)} />
      </aside>
    </div>
  )
}
