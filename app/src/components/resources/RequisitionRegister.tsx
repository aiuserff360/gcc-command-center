/**
 * Requisition register – add, edit (row click / pencil), remove (bin), filters by status / business unit / capability /
 * priority. The blue role link opens the requisition drill-down (`onOpen`). Shared by the Hiring Plan & Pipeline tab
 * and the Input view.
 */
import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Card, Badge, FilterSelect } from '../ui'
import { fmtDateShort, TODAY } from '../../data/common'
import { POSITION_STATUSES, PRIORITIES, isOpenPosition, positionDaysOpen, reqId, requisitionStage, buShort, type Position } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { RoleLink, candidateBadge, CompactTable } from './widgets'
import { PositionForm } from './forms'

export function RequisitionRegister({ d, onOpen, title = 'Requisition Register' }: { d: ResourceData; onOpen: (id: string) => void; title?: string }) {
  const { positions, candidates, candidatesFor, buNames, capNames, subFor, locations } = d
  const [pos, setPos] = useState<Position | null>(null)
  const [adding, setAdding] = useState(false)
  const [fStatus, setFStatus] = useState('All')
  const [fBu, setFBu] = useState('All')
  const [fCap, setFCap] = useState('All')
  const [fPr, setFPr] = useState('All')
  const capOptions = useMemo(() => ['All', ...(fBu === 'All' ? [...new Set(positions.items.map((p) => p.capability))].sort() : capNames(fBu))], [fBu, positions.items, capNames])

  const rows = useMemo(() => positions.items
    .filter((p) => (fStatus === 'All' ? true : fStatus === 'Open (all stages)' ? isOpenPosition(p) : p.status === fStatus))
    .filter((p) => fBu === 'All' || p.businessUnit === fBu)
    .filter((p) => fCap === 'All' || p.capability === fCap)
    .filter((p) => fPr === 'All' || p.priority === fPr)
    .sort((a, b) => (Number(isOpenPosition(b)) - Number(isOpenPosition(a))) || positionDaysOpen(b) - positionDaysOpen(a)), [positions.items, fStatus, fBu, fCap, fPr])

  const remove = (p: Position) => {
    const n = candidatesFor(p.id).length
    if (!window.confirm(`Remove requisition ${reqId(p)} – ${p.role}${n ? ` and its ${n} candidate records` : ''}? This cannot be undone.`)) return
    candidatesFor(p.id).forEach((c) => candidates.remove(c.id))
    positions.remove(p.id)
  }
  const source = (p: Position) => {
    const s = subFor(p.businessUnit, p.capability)
    if (!s) return <span className="text-ink-400">—</span>
    return s.transitionType === 'Build' ? <span className="text-teal-700">Build</span> : <span className="text-violet-700" title={`${s.transitionType} · ${s.gbuServed} · ${s.geography}`}>{s.transitionType === 'Build / Transition' ? 'Build / ' : ''}from {s.deliveryLocation}</span>
  }

  return (
    <>
      <Card title={title} subtitle={`${rows.length} of ${positions.items.length} requisitions · click the role to open the requisition and its candidate pipeline · click elsewhere in the row to edit`}
        action={<div className="flex items-center gap-2">
          <FilterSelect label="Status" value={fStatus} options={['All', 'Open (all stages)', ...POSITION_STATUSES]} onChange={setFStatus} />
          <FilterSelect label="Business unit" value={fBu} options={['All', ...buNames]} onChange={(v) => { setFBu(v); setFCap('All') }} />
          <FilterSelect label="Capability" value={fCap} options={capOptions} onChange={setFCap} />
          <FilterSelect label="Priority" value={fPr} options={['All', ...PRIORITIES]} onChange={setFPr} />
          <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> Add Requisition</button>
        </div>}>
        <CompactTable<Position> rows={rows} onRowClick={(r) => setPos(r)} columns={[
          { key: 'id', header: 'Req ID', className: 'whitespace-nowrap', render: (r) => <span className="text-ink-500 text-[12px]">{reqId(r)}</span> },
          { key: 'role', header: 'Role / skill', className: 'whitespace-nowrap', render: (r) => <div><RoleLink label={r.role} onClick={() => onOpen(r.id)} /><div className="text-[11px] text-ink-500">{r.grade} · {r.location}</div></div> },
          { key: 'businessUnit', header: 'Business unit · capability', className: 'whitespace-nowrap', render: (r) => <div><span title={r.businessUnit}>{buShort(r.businessUnit)}</span><div className="text-[11px] text-ink-500">{r.capability}</div></div> },
          { key: 'source', header: 'Source', className: 'whitespace-nowrap text-[12px]', render: source },
          { key: 'priority', header: 'Priority', render: (r) => <Badge value={r.priority} /> },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} className={candidateBadge[r.status]} /> },
          { key: 'stage', header: 'Pipeline stage', className: 'whitespace-nowrap', render: (r) => <span className="text-ink-700">{requisitionStage(candidatesFor(r.id))}</span> },
          { key: 'applied', header: 'Applied', className: 'text-right', render: (r) => candidatesFor(r.id).length },
          { key: 'hiringManager', header: 'Manager', className: 'whitespace-nowrap' },
          { key: 'openedOn', header: 'Opened', className: 'whitespace-nowrap', render: (r) => fmtDateShort(r.openedOn) },
          { key: 'targetDate', header: 'Target', className: 'whitespace-nowrap', render: (r) => <span className={r.targetDate < TODAY && isOpenPosition(r) ? 'text-red-600' : ''}>{fmtDateShort(r.targetDate)}</span> },
          { key: 'days', header: 'Days', className: 'text-right', render: (r) => isOpenPosition(r) ? positionDaysOpen(r) : '—' },
          { key: 'actions', header: '', className: 'text-right whitespace-nowrap', render: (r) => (
            <span className="inline-flex items-center gap-1">
              <button className="text-ink-400 hover:text-brand-600 cursor-pointer p-0.5" title="Edit" onClick={(e) => { e.stopPropagation(); setPos(r) }}><Pencil size={13} /></button>
              <button className="text-ink-400 hover:text-red-600 cursor-pointer p-0.5" title="Remove" onClick={(e) => { e.stopPropagation(); remove(r) }}><Trash2 size={13} /></button>
            </span>
          ) },
        ]} />
      </Card>
      <PositionForm open={adding || !!pos} onClose={() => { setAdding(false); setPos(null) }} value={pos} businessUnits={buNames} capNames={capNames} locations={locations}
        onSave={(p) => { if (pos) positions.update(p); else positions.add(p); setAdding(false); setPos(null) }} onDelete={(id) => { candidatesFor(id).forEach((c) => candidates.remove(c.id)); positions.remove(id) }} />
    </>
  )
}
