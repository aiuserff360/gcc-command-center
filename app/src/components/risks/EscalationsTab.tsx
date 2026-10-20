import { useMemo, useState, useEffect } from 'react'
import { Flag, Plus } from 'lucide-react'
import { Card, Table, Badge, Modal, Field, Input, TextArea, Select, FormGrid } from '../ui'
import { fmtDate, TODAY } from '../../data/common'
import { isOpen, type RaidItem } from '../../data/shared'
import { ESCALATION_STATUSES, type EscalationDecision } from '../../data/risks'
import { uid } from '../../store/useStore'

const FORUMS = ['Steering Committee', 'Program Director', 'Global CIO', 'Global CHRO', 'Global COO', 'Global CFO', 'GCC Head']
type Row = RaidItem & { dec?: EscalationDecision }

export function EscalationsTab({ raid, decisions, onSaveRaid, onSaveDecision, onOpenRaid, hideStats }: {
  raid: RaidItem[]; decisions: EscalationDecision[]; onSaveRaid: (r: RaidItem) => void; onSaveDecision: (d: EscalationDecision) => void; onOpenRaid: (r: RaidItem) => void
  /** Input view: registers only, no stat tiles */
  hideStats?: boolean
}) {
  const [record, setRecord] = useState<Row | null>(null)
  const [escalate, setEscalate] = useState(false)
  const [showResolved, setShowResolved] = useState(true)
  const rows: Row[] = useMemo(() => raid
    .filter((r) => r.escalated)
    .map((r) => ({ ...r, dec: decisions.find((d) => d.raidId === r.id) }))
    .filter((r) => showResolved || (r.escalationStatus !== 'Resolved' && isOpen(r)))
    .sort((a, b) => (order(a) - order(b)) || b.impactScore - a.impactScore), [raid, decisions, showResolved])
  const active = raid.filter((r) => r.escalated && isOpen(r) && r.escalationStatus !== 'Resolved')
  const awaiting = active.filter((r) => r.escalationStatus === 'Awaiting Decision')
  const inProg = active.filter((r) => r.escalationStatus === 'In Progress')
  const resolved = raid.filter((r) => r.escalated && (r.escalationStatus === 'Resolved' || !isOpen(r)))
  const nextSteering = decisions.filter((d) => d.steeringDate >= TODAY && !d.decision).map((d) => d.steeringDate).sort()[0]

  return (
    <div className="space-y-4">
      {!hideStats && <div className="grid grid-cols-5 gap-4">
        {[['Active Escalations', active.length, 'text-ink-900'], ['Awaiting Decision', awaiting.length, 'text-red-600'], ['In Progress', inProg.length, 'text-brand-600'], ['Resolved', resolved.length, 'text-green-600']].map(([l, v, c]) => (
          <div key={l as string} className="card px-4 py-3"><div className="text-[12px] text-ink-500">{l as string}</div><div className={`text-[22px] font-bold ${c}`}>{v as number}</div></div>
        ))}
        <div className="card px-4 py-3"><div className="text-[12px] text-ink-500">Next steering decision</div><div className="text-[18px] font-bold text-ink-900 mt-1">{nextSteering ? fmtDate(nextSteering) : '–'}</div></div>
      </div>}
      <Card title="Escalations" subtitle="Risks and issues escalated beyond the workstream – decision needed, forum, steering date and recorded decision"
        headerRight={<div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-700 cursor-pointer"><input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show resolved</label>
          <button className="btn-primary" onClick={() => setEscalate(true)}><Flag size={14} /> Escalate an item</button>
        </div>}>
        <Table<Row> compact rows={rows} onRowClick={(r) => setRecord(r)} columns={[
          { key: 'code', header: 'ID', render: (r) => <button className="link" onClick={(e) => { e.stopPropagation(); onOpenRaid(r) }}>{r.code}</button> },
          { key: 'type', header: 'Type', render: (r) => <Badge value={r.type} /> },
          { key: 'title', header: 'Title', render: (r) => <span className="block max-w-[240px] truncate font-medium" title={r.title}>{r.title}</span> },
          { key: 'level', header: 'Level', render: (r) => <Badge value={r.level} /> },
          { key: 'workstream', header: 'Workstream' },
          { key: 'escalatedTo', header: 'Escalated To', render: (r) => r.dec?.escalatedTo ?? '–' },
          { key: 'decisionNeeded', header: 'Decision Needed', render: (r) => <span className="block max-w-[260px] whitespace-normal leading-snug text-[12.5px]">{r.dec?.decisionNeeded ?? <span className="text-ink-400 italic">Not recorded</span>}</span> },
          { key: 'steeringDate', header: 'Steering Date', render: (r) => r.dec?.steeringDate ? <span className={r.dec.steeringDate < TODAY && !r.dec.decision ? 'text-red-600 font-medium' : ''}>{fmtDate(r.dec.steeringDate)}</span> : '–' },
          { key: 'escalationStatus', header: 'Escalation Status', render: (r) => <Badge value={r.escalationStatus ?? 'Awaiting Decision'} /> },
          { key: 'decision', header: 'Decision', render: (r) => r.dec?.decision ? <span className="block max-w-[220px] whitespace-normal leading-snug text-[12px] text-ink-700">{r.dec.decision}<span className="text-ink-400"> · {r.dec.decidedBy}, {fmtDate(r.dec.decidedOn ?? '')}</span></span> : <button className="link" onClick={(e) => { e.stopPropagation(); setRecord(r) }}>Record decision</button> },
        ]} empty="No escalations. Use 'Escalate an item' to raise one." />
      </Card>

      <DecisionModal row={record} onClose={() => setRecord(null)}
        onSave={(d, status) => { onSaveDecision(d); if (record) onSaveRaid({ ...stripDec(record), escalated: true, escalationStatus: status }); setRecord(null) }}
        onDeescalate={() => { if (record) onSaveRaid({ ...stripDec(record), escalated: false, escalationStatus: undefined }); setRecord(null) }} />
      <EscalateModal open={escalate} candidates={raid.filter((r) => isOpen(r) && !r.escalated).sort((a, b) => b.impactScore - a.impactScore)} onClose={() => setEscalate(false)}
        onSave={(item, d) => { onSaveRaid({ ...item, escalated: true, escalationStatus: 'Awaiting Decision' }); onSaveDecision(d); setEscalate(false) }} />
    </div>
  )
}

const order = (r: RaidItem) => (r.escalationStatus === 'Awaiting Decision' ? 0 : r.escalationStatus === 'In Progress' ? 1 : 2)
const stripDec = (r: Row): RaidItem => { const { dec: _d, ...rest } = r; return rest }

function DecisionModal({ row, onClose, onSave, onDeescalate }: { row: Row | null; onClose: () => void; onSave: (d: EscalationDecision, status: RaidItem['escalationStatus']) => void; onDeescalate: () => void }) {
  const blank = (r: Row): EscalationDecision => r.dec ?? { id: uid('esc'), raidId: r.id, decisionNeeded: '', steeringDate: TODAY, escalatedOn: TODAY, escalatedTo: FORUMS[0] }
  const [f, setF] = useState<EscalationDecision | null>(row ? blank(row) : null)
  const [status, setStatus] = useState<RaidItem['escalationStatus']>(row?.escalationStatus ?? 'Awaiting Decision')
  useEffect(() => { setF(row ? blank(row) : null); setStatus(row?.escalationStatus ?? 'Awaiting Decision') }, [row])
  if (!row || !f) return null
  return (
    <Modal open={!!row} onClose={onClose} title={`Record decision – ${row.code} ${row.title}`} width="max-w-2xl"
      footer={<><button className="btn-danger" onClick={onDeescalate}>De-escalate</button><span className="flex-1" /><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave(f, status)}>Save</button></>}>
      <FormGrid cols={3}>
        <Field label="Escalated to"><Select options={FORUMS.includes(f.escalatedTo) ? FORUMS : [f.escalatedTo, ...FORUMS]} value={f.escalatedTo} onChange={(e) => setF({ ...f, escalatedTo: e.target.value })} /></Field>
        <Field label="Escalated on"><Input type="date" value={f.escalatedOn} onChange={(e) => setF({ ...f, escalatedOn: e.target.value })} /></Field>
        <Field label="Steering date"><Input type="date" value={f.steeringDate} onChange={(e) => setF({ ...f, steeringDate: e.target.value })} /></Field>
        <Field label="Decision needed" className="col-span-3"><TextArea value={f.decisionNeeded} onChange={(e) => setF({ ...f, decisionNeeded: e.target.value })} /></Field>
        <Field label="Decision taken" className="col-span-3"><TextArea value={f.decision ?? ''} onChange={(e) => setF({ ...f, decision: e.target.value || undefined })} placeholder="Record the decision and any conditions" /></Field>
        <Field label="Decided by"><Input value={f.decidedBy ?? ''} onChange={(e) => setF({ ...f, decidedBy: e.target.value || undefined })} /></Field>
        <Field label="Decided on"><Input type="date" value={f.decidedOn ?? ''} onChange={(e) => setF({ ...f, decidedOn: e.target.value || undefined })} /></Field>
        <Field label="Escalation status"><Select options={ESCALATION_STATUSES} value={status ?? 'Awaiting Decision'} onChange={(e) => setStatus(e.target.value as RaidItem['escalationStatus'])} /></Field>
      </FormGrid>
    </Modal>
  )
}

function EscalateModal({ open, candidates, onClose, onSave }: { open: boolean; candidates: RaidItem[]; onClose: () => void; onSave: (item: RaidItem, d: EscalationDecision) => void }) {
  const [code, setCode] = useState(candidates[0]?.code ?? '')
  const [f, setF] = useState({ decisionNeeded: '', steeringDate: '2026-10-23', escalatedTo: FORUMS[0] })
  useEffect(() => { if (open) { setCode(candidates[0]?.code ?? ''); setF({ decisionNeeded: '', steeringDate: '2026-10-23', escalatedTo: FORUMS[0] }) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const labels = candidates.map((c) => `${c.code} – ${c.title} (${c.level})`)
  const item = candidates.find((c) => c.code === code)
  return (
    <Modal open={open} onClose={onClose} title="Escalate a risk / issue" width="max-w-xl"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { if (!item) return; onSave(item, { id: uid('esc'), raidId: item.id, escalatedOn: TODAY, ...f }) }}><Plus size={14} /> Escalate</button></>}>
      <FormGrid cols={2}>
        <Field label="Risk / issue" className="col-span-2"><Select options={labels} value={labels.find((l) => l.startsWith(code + ' ')) ?? ''} onChange={(e) => setCode(e.target.value.split(' – ')[0])} /></Field>
        <Field label="Escalate to"><Select options={FORUMS} value={f.escalatedTo} onChange={(e) => setF({ ...f, escalatedTo: e.target.value })} /></Field>
        <Field label="Steering date"><Input type="date" value={f.steeringDate} onChange={(e) => setF({ ...f, steeringDate: e.target.value })} /></Field>
        <Field label="Decision needed" className="col-span-2"><TextArea value={f.decisionNeeded} onChange={(e) => setF({ ...f, decisionNeeded: e.target.value })} placeholder="What decision is required from the forum?" /></Field>
      </FormGrid>
    </Modal>
  )
}
