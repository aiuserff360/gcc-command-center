import { useMemo, useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Card, Table, Badge, Modal, Field, Input, TextArea, Select, FormGrid, ConfirmDelete } from '../ui'
import { fmtDate, WORKSTREAMS, WORKSTREAM_META, OWNERS, type Impact, type Status, type Workstream } from '../../data/common'
import { isOpen, type RaidItem, type Dependency } from '../../data/shared'
import { canonicalWorkstream } from '../../data/risks'
import { uid } from '../../store/useStore'

const DEP_STATUSES: Status[] = ['On Track', 'At Risk', 'Delayed', 'Completed']
type Row = Dependency & { linked: RaidItem[] }

export function DependenciesTab({ deps, raid, onSave, onDelete, onOpenRaid, view }: {
  deps: Dependency[]; raid: RaidItem[]; onSave: (d: Dependency) => void; onDelete: (id: string) => void; onOpenRaid: (r: RaidItem) => void; view: string
}) {
  const [edit, setEdit] = useState<Dependency | null | 'new'>(null)
  const [onlyAtRisk, setOnlyAtRisk] = useState(true)
  const [fWs, setFWs] = useState('All')
  const rows: Row[] = useMemo(() => {
    const open = raid.filter(isOpen)
    return deps
      .filter((d) => (!onlyAtRisk || d.status === 'At Risk' || d.status === 'Delayed'))
      .filter((d) => fWs === 'All' || d.from === fWs || d.on === fWs)
      .filter((d) => view === 'All Workstreams' || d.from === view || d.on === view)
      .map((d) => ({ ...d, linked: open.filter((r) => r.type === 'Risk' && canonicalWorkstream(r.workstream) === d.on).sort((a, b) => b.impactScore - a.impactScore) }))
      .sort((a, b) => sev(a) - sev(b) || a.dueDate.localeCompare(b.dueDate))
  }, [deps, raid, onlyAtRisk, fWs, view])
  const counts = { total: deps.length, atRisk: deps.filter((d) => d.status === 'At Risk').length, delayed: deps.filter((d) => d.status === 'Delayed').length, critical: deps.filter((d) => d.impact === 'Critical' && d.status !== 'Completed').length }
  const byWs = WORKSTREAMS.map((w) => ({ w, atRisk: deps.filter((d) => d.on === w && (d.status === 'At Risk' || d.status === 'Delayed')).length, total: deps.filter((d) => d.on === w).length }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[['Dependencies', counts.total, 'text-ink-900'], ['At Risk', counts.atRisk, 'text-amber-600'], ['Delayed', counts.delayed, 'text-red-600'], ['Critical impact (open)', counts.critical, 'text-red-600']].map(([l, v, c]) => (
          <div key={l as string} className="card px-4 py-3"><div className="text-[12px] text-ink-500">{l as string}</div><div className={`text-[22px] font-bold ${c}`}>{v as number}</div></div>
        ))}
      </div>
      <div className="space-y-4">
        <Card title="Dependencies at Risk" subtitle="Cross-workstream dependencies that are At Risk or Delayed, with the open risks on the supplying workstream"
          headerRight={<div className="flex items-center gap-2 text-[12.5px]">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-ink-700 whitespace-nowrap"><input type="checkbox" checked={onlyAtRisk} onChange={(e) => setOnlyAtRisk(e.target.checked)} /> At Risk / Delayed only</label>
            <select value={fWs} onChange={(e) => setFWs(e.target.value)} className="input py-1.5 w-auto">{['All', ...WORKSTREAMS].map((w) => <option key={w}>{w}</option>)}</select>
            <button className="btn-primary whitespace-nowrap" onClick={() => setEdit('new')}><Plus size={14} /> Add Dependency</button>
          </div>}>
          <Table<Row> compact rows={rows} onRowClick={(r) => setEdit(r)} columns={[
            { key: 'from', header: 'Workstream', className: 'whitespace-nowrap', render: (r) => <span className="font-medium">{WORKSTREAM_META[r.from]?.short ?? r.from}</span> },
            { key: 'on', header: 'Depends On', className: 'whitespace-nowrap', render: (r) => WORKSTREAM_META[r.on]?.short ?? r.on },
            { key: 'type', header: 'Dependency', render: (r) => <div className="max-w-[340px]"><div className="font-medium whitespace-nowrap">{r.type}</div><div className="text-[11.5px] text-ink-500 truncate" title={r.description}>{r.description}</div></div> },
            { key: 'impact', header: 'Impact', render: (r) => <Badge value={r.impact} /> },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
            { key: 'dueDate', header: 'Due Date', className: 'whitespace-nowrap', render: (r) => fmtDate(r.dueDate) },
            { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
            { key: 'linked', header: 'Linked Risks', render: (r) => r.linked.length === 0 ? <span className="text-ink-400">–</span> : (
              <span className="flex flex-nowrap gap-1">
                {r.linked.slice(0, 3).map((l) => <button key={l.id} className="rounded-md bg-red-50 text-red-700 px-1.5 py-0.5 text-[11px] font-medium hover:bg-red-100" title={l.title} onClick={(e) => { e.stopPropagation(); onOpenRaid(l) }}>{l.code}</button>)}
                {r.linked.length > 3 && <span className="text-[11px] text-ink-500">+{r.linked.length - 3}</span>}
              </span>
            ) },
          ]} empty="No dependencies match the current filters." />
        </Card>
        <Card title="Dependency Exposure by Supplier" subtitle="At Risk / Delayed dependencies on each workstream">
          <div className="grid grid-cols-2 gap-x-10 gap-y-2.5">
            {byWs.map((b) => (
              <div key={b.w} className="flex items-center gap-2 text-[12.5px]">
                <span className="w-[190px] truncate text-ink-700" title={b.w}>{b.w}</span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${b.total ? (b.atRisk / b.total) * 100 : 0}%`, background: b.atRisk >= 3 ? '#DC2626' : b.atRisk > 0 ? '#F59E0B' : '#16A34A' }} /></div>
                <span className="w-12 text-right font-medium">{b.atRisk} / {b.total}</span>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-ink-500 mt-3">Linked risks are matched by the supplying workstream of each dependency. Click a code to open the risk.</p>
        </Card>
      </div>
      <DependencyModal open={edit !== null} value={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSave={(d) => { onSave(d); setEdit(null) }} onDelete={(id) => { onDelete(id); setEdit(null) }} />
    </div>
  )
}
const sev = (d: Dependency) => (d.status === 'Delayed' ? 0 : d.status === 'At Risk' ? 1 : d.status === 'On Track' ? 2 : 3) * 10 + ['Critical', 'High', 'Medium', 'Low'].indexOf(d.impact)

function DependencyModal({ open, value, onClose, onSave, onDelete }: { open: boolean; value: Dependency | null; onClose: () => void; onSave: (d: Dependency) => void; onDelete: (id: string) => void }) {
  const blank = (): Dependency => ({ id: '', from: WORKSTREAMS[0], on: WORKSTREAMS[1], type: '', description: '', impact: 'Medium', status: 'On Track', dueDate: '2026-11-15', owner: OWNERS[0] })
  const [f, setF] = useState<Dependency>(value ?? blank())
  useEffect(() => { if (open) setF(value ?? blank()) }, [open, value]) // eslint-disable-line react-hooks/exhaustive-deps
  const strip = (d: Dependency): Dependency => { const { linked: _l, ...rest } = d as Dependency & { linked?: unknown }; return rest as Dependency }
  return (
    <Modal open={open} onClose={onClose} title={f.id ? 'Edit dependency' : 'Add dependency'} width="max-w-2xl"
      footer={<>{f.id && <ConfirmDelete onConfirm={() => onDelete(f.id)} />}<span className="flex-1" /><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { if (!f.type.trim()) return; onSave(strip({ ...f, id: f.id || uid('dep') })) }}>Save</button></>}>
      <FormGrid cols={2}>
        <Field label="Workstream (depends)"><Select options={WORKSTREAMS} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value as Workstream })} /></Field>
        <Field label="Depends on"><Select options={WORKSTREAMS} value={f.on} onChange={(e) => setF({ ...f, on: e.target.value as Workstream })} /></Field>
        <Field label="Dependency type" className="col-span-2"><Input value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} placeholder="e.g. Network Readiness" /></Field>
        <Field label="Description" className="col-span-2"><TextArea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Impact"><Select options={['Critical', 'High', 'Medium', 'Low']} value={f.impact} onChange={(e) => setF({ ...f, impact: e.target.value as Impact })} /></Field>
        <Field label="Status"><Select options={DEP_STATUSES} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Status })} /></Field>
        <Field label="Due date"><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
        <Field label="Owner"><Select options={OWNERS.includes(f.owner as (typeof OWNERS)[number]) ? OWNERS : [f.owner, ...OWNERS]} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></Field>
      </FormGrid>
    </Modal>
  )
}
