import { useState } from 'react'
import { Plus, CheckCircle2, Clock, Eye, XCircle } from 'lucide-react'
import { Card, KpiTile, Badge, Table, Modal, Field, Input, Select, TextArea, FormGrid, FilterSelect, Progress } from '../ui'
import { useCollection, uid } from '../../store/useStore'
import { fmtDate } from '../../data/common'
import { seedApprovals, APPROVAL_STATUSES, APPROVAL_ITEMS, type ApprovalRecord } from '../../data/strategy'
import { EditorFooter, Toolbar, textProps } from './shared'

const blank = (): ApprovalRecord => ({ id: uid('apr'), approver: '', role: '', item: APPROVAL_ITEMS[0], date: '2026-10-20', status: 'Pending', comments: '' })

export default function ApprovalsTab() {
  const { items, add, update, remove } = useCollection<ApprovalRecord>('strategyApprovals', seedApprovals)
  const [status, setStatus] = useState('All')
  const [editing, setEditing] = useState<ApprovalRecord | null>(null)
  const [isNew, setIsNew] = useState(false)
  const count = (s: string) => items.filter((a) => a.status === s).length
  const rows = items.filter((a) => status === 'All' || a.status === status).slice().sort((a, b) => b.date.localeCompare(a.date))
  const pct = items.length ? Math.round((count('Approved') / items.length) * 100) : 0
  const itemStatus = APPROVAL_ITEMS.map((it) => {
    const recs = items.filter((a) => a.item === it)
    const st = recs.length === 0 ? 'Not Started' : recs.some((r) => r.status === 'Rejected') ? 'Rejected' : recs.every((r) => r.status === 'Approved') ? 'Approved' : recs.some((r) => r.status === 'In Review') ? 'In Review' : 'Pending'
    return { item: it, status: st, count: recs.length }
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <KpiTile tone="green" icon={<CheckCircle2 size={22} />} value={count('Approved')} label="Approved" sub={`${pct}% of approval items`} />
        <KpiTile tone="amber" icon={<Clock size={22} />} value={count('Pending')} label="Pending" sub="awaiting decision" />
        <KpiTile tone="blue" icon={<Eye size={22} />} value={count('In Review')} label="In Review" sub="with approver" />
        <KpiTile tone="red" icon={<XCircle size={22} />} value={count('Rejected')} label="Rejected" sub="requires rework" />
      </div>
      <div className="grid grid-cols-[1fr_320px] gap-4">
        <Card title="Approval Log" subtitle="Sign-offs required for the strategy, business case, operating model, location and scope decisions.">
          <Toolbar left={`${rows.length} of ${items.length} records`}>
            <FilterSelect label="Status" value={status} options={['All', ...APPROVAL_STATUSES]} onChange={setStatus} />
            <button className="btn-primary" onClick={() => { setEditing(blank()); setIsNew(true) }}><Plus size={14} /> Add Approval</button>
          </Toolbar>
          <Table<ApprovalRecord> rows={rows} onRowClick={(r) => { setEditing(r); setIsNew(false) }} columns={[
            { key: 'approver', header: 'Approver', render: (r) => <span className="font-medium">{r.approver}</span> },
            { key: 'role', header: 'Role' },
            { key: 'item', header: 'Item' },
            { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
            { key: 'comments', header: 'Comments', render: (r) => <span className="text-ink-500">{r.comments || '—'}</span> },
          ]} />
        </Card>
        <Card title="Approval Progress">
          <div className="flex items-center gap-3 mb-4"><Progress value={pct} className="flex-1" color="#16A34A" height="h-2.5" /><span className="text-[13px] font-semibold">{pct}%</span></div>
          <div className="space-y-2.5">
            {itemStatus.map((i) => (
              <div key={i.item} className="flex items-center justify-between gap-2 text-[12.5px]"><span className="text-ink-700 leading-snug">{i.item}</span><Badge value={i.status} /></div>
            ))}
          </div>
        </Card>
      </div>
      {editing && <ApprovalEditor value={editing} isNew={isNew} onClose={() => setEditing(null)} onDelete={() => { remove(editing.id); setEditing(null) }} onSave={(v) => { if (isNew) add(v); else update(v); setEditing(null) }} />}
    </div>
  )
}

function ApprovalEditor({ value, isNew, onClose, onSave, onDelete }: { value: ApprovalRecord; isNew: boolean; onClose: () => void; onSave: (v: ApprovalRecord) => void; onDelete: () => void }) {
  const [f, setF] = useState(value)
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add Approval' : 'Edit Approval'} footer={<EditorFooter onCancel={onClose} onSave={() => onSave(f)} onDelete={isNew ? undefined : onDelete} />}>
      <FormGrid cols={2}>
        <Field label="Approver"><Input {...textProps(f, setF, 'approver')} placeholder="Name" /></Field>
        <Field label="Role"><Input {...textProps(f, setF, 'role')} placeholder="e.g. Group CFO" /></Field>
        <Field label="Item"><Select options={APPROVAL_ITEMS} {...textProps(f, setF, 'item')} /></Field>
        <Field label="Date"><Input type="date" {...textProps(f, setF, 'date')} /></Field>
        <Field label="Status"><Select options={APPROVAL_STATUSES} {...textProps(f, setF, 'status')} /></Field>
      </FormGrid>
      <div className="h-3" />
      <Field label="Comments"><TextArea {...textProps(f, setF, 'comments')} /></Field>
    </Modal>
  )
}
