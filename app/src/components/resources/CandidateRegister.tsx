/**
 * Candidate register across all requisitions (Input view › Candidates): add / edit / remove, inline stage and status
 * changes, next-round / reject actions. The requisition link opens the drill-down.
 */
import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ChevronRight, Ban, RotateCcw, Search } from 'lucide-react'
import { Card, Table, FilterSelect } from '../ui'
import { fmtDateShort, TODAY } from '../../data/common'
import { CANDIDATE_STAGES, CANDIDATE_STATUSES, isActiveCandidate, reqId, buShort, statusForStage, roundsForStage, NEXT_STEP, stageIndex, type Candidate, type CandidateStage, type CandidateStatus } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { RoleLink, candidateBadge } from './widgets'
import { CandidateForm } from './forms'

const PAGE = 60
const SELECT = 'border border-transparent rounded px-1.5 py-1 text-[12px] outline-none hover:border-slate-300 focus:border-brand-400 focus:bg-white cursor-pointer'

export function CandidateRegister({ d, onOpen }: { d: ResourceData; onOpen: (positionId: string) => void }) {
  const { candidates, positions, advanceCandidate, closeCandidate, reopenCandidate } = d
  const [cand, setCand] = useState<Candidate | null>(null)
  const [adding, setAdding] = useState(false)
  const [fReq, setFReq] = useState('All')
  const [fStage, setFStage] = useState('All')
  const [fStatus, setFStatus] = useState('All')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const posById = useMemo(() => new Map(positions.items.map((p) => [p.id, p])), [positions.items])
  const reqLabel = (id: string) => { const p = posById.get(id); return p ? `${reqId(p)} · ${p.role}` : id }
  const reqOptions = useMemo(() => ['All', ...positions.items.map((p) => `${reqId(p)} · ${p.role}`)], [positions.items])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return candidates.items
      .filter((c) => fReq === 'All' || reqLabel(c.positionId) === fReq)
      .filter((c) => fStage === 'All' || c.stage === fStage)
      .filter((c) => fStatus === 'All' || c.status === fStatus)
      .filter((c) => !needle || c.name.toLowerCase().includes(needle) || (posById.get(c.positionId)?.role.toLowerCase().includes(needle) ?? false) || (posById.get(c.positionId)?.capability.toLowerCase().includes(needle) ?? false))
      .sort((a, b) => Number(isActiveCandidate(b)) - Number(isActiveCandidate(a)) || stageIndex(b.stage) - stageIndex(a.stage) || b.lastActivity.localeCompare(a.lastActivity))
  }, [candidates.items, fReq, fStage, fStatus, q, posById]) // eslint-disable-line react-hooks/exhaustive-deps

  const setStage = (c: Candidate, stage: CandidateStage) => candidates.update({ ...c, stage, status: c.status === 'Rejected' || c.status === 'Withdrawn' ? c.status : statusForStage(stage), roundsCompleted: roundsForStage(stage), nextStep: NEXT_STEP[stage], lastActivity: TODAY })
  const setStatus = (c: Candidate, status: CandidateStatus) => candidates.update({ ...c, status, lastActivity: TODAY })
  const counts = { active: candidates.items.filter((c) => c.status === 'In process').length, offer: candidates.items.filter((c) => c.status === 'Offer').length, joined: candidates.items.filter((c) => c.status === 'Joined').length }

  return (
    <>
      <Card title="Candidates" subtitle={`${rows.length} of ${candidates.items.length} candidates · ${counts.active} in process · ${counts.offer} offers out · ${counts.joined} joined · stage and status can be changed inline`}
        action={<div className="flex items-center gap-2">
          <label className="card px-2.5 py-1.5 flex items-center gap-1.5"><Search size={13} className="text-ink-400" /><input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} placeholder="Search name, role or capability" className="text-[13px] outline-none bg-transparent w-40" /></label>
          <FilterSelect label="Requisition" value={fReq} options={reqOptions} onChange={(v) => { setFReq(v); setLimit(PAGE) }} />
          <FilterSelect label="Stage" value={fStage} options={['All', ...CANDIDATE_STAGES]} onChange={(v) => { setFStage(v); setLimit(PAGE) }} />
          <FilterSelect label="Status" value={fStatus} options={['All', ...CANDIDATE_STATUSES]} onChange={(v) => { setFStatus(v); setLimit(PAGE) }} />
          <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> Add Candidate</button>
        </div>}>
        <Table<Candidate> compact rows={rows.slice(0, limit)} columns={[
          { key: 'name', header: 'Candidate', className: 'whitespace-nowrap', render: (c) => <div><button className="text-ink-900 font-medium hover:text-brand-600 hover:underline cursor-pointer text-left" onClick={() => setCand(c)}>{c.name}</button><div className="text-[11px] text-ink-500">{c.source} · {c.roundsCompleted}/3 rounds</div></div> },
          { key: 'positionId', header: 'Requisition', className: 'whitespace-nowrap', render: (c) => { const p = posById.get(c.positionId); return p ? <div><RoleLink label={p.role} onClick={() => onOpen(p.id)} /><div className="text-[11px] text-ink-500">{reqId(p)} · {buShort(p.businessUnit)} · {p.capability}</div></div> : <span className="text-ink-400">{c.positionId}</span> } },
          { key: 'stage', header: 'Stage', className: 'whitespace-nowrap', render: (c) => <select className={`${SELECT} bg-transparent w-[172px]`} value={c.stage} onChange={(e) => setStage(c, e.target.value as CandidateStage)}>{CANDIDATE_STAGES.map((s) => <option key={s}>{s}</option>)}</select> },
          { key: 'status', header: 'Status', className: 'whitespace-nowrap', render: (c) => <select className={`${SELECT} w-[118px] font-medium ${candidateBadge[c.status]}`} value={c.status} onChange={(e) => setStatus(c, e.target.value as CandidateStatus)}>{CANDIDATE_STATUSES.map((s) => <option key={s}>{s}</option>)}</select> },
          { key: 'nextStep', header: 'Next step / interview', render: (c) => <span className="text-ink-700 text-[12px] leading-snug">{c.nextStep || '—'}</span> },
          { key: 'lastActivity', header: 'Last activity', className: 'whitespace-nowrap', render: (c) => fmtDateShort(c.lastActivity) },
          { key: 'actions', header: '', className: 'text-right whitespace-nowrap', render: (c) => (
            <span className="inline-flex items-center gap-1">
              {isActiveCandidate(c) && c.stage !== 'Joined' && <button className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 cursor-pointer" title="Move to next round" onClick={() => advanceCandidate(c)}>Next <ChevronRight size={12} /></button>}
              {isActiveCandidate(c) && c.stage !== 'Joined' && <button className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer" title="Reject" onClick={() => closeCandidate(c, 'Rejected')}><Ban size={11} /></button>}
              {(c.status === 'Rejected' || c.status === 'Withdrawn') && <button className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer" title="Reopen" onClick={() => reopenCandidate(c)}><RotateCcw size={11} /></button>}
              <button className="text-ink-400 hover:text-brand-600 cursor-pointer p-0.5" title="Edit" onClick={() => setCand(c)}><Pencil size={13} /></button>
              <button className="text-ink-400 hover:text-red-600 cursor-pointer p-0.5" title="Remove" onClick={() => { if (window.confirm(`Remove candidate ${c.name}?`)) candidates.remove(c.id) }}><Trash2 size={13} /></button>
            </span>
          ) },
        ]} />
        {rows.length > limit && <div className="flex justify-center pt-3"><button className="btn-secondary" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more of {rows.length - limit} remaining</button></div>}
      </Card>
      <CandidateForm open={adding || !!cand} onClose={() => { setAdding(false); setCand(null) }} value={cand} positions={positions.items}
        onSave={(c) => { if (cand) candidates.update(c); else candidates.add(c); setAdding(false); setCand(null) }} onDelete={(id) => candidates.remove(id)} />
    </>
  )
}
