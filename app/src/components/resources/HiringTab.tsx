import { useMemo, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Card, Badge, Table, FilterSelect } from '../ui'
import { MONTHS, fmtDate } from '../../data/common'
import { FUNCTIONS, POSITION_STATUSES, PRIORITIES, fnShort, isOpenPosition, positionDaysOpen, type Position, type HiringTarget } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { Funnel, MiniStat, CompactTable } from './widgets'
import { PositionForm, NumberGridForm } from './forms'

const TH = 'text-left text-[11.5px] font-medium text-ink-500 px-1.5 py-2 bg-surface/70 first:rounded-l-md last:rounded-r-md whitespace-nowrap'
const TD = 'px-1.5 py-1.5 text-[12.5px] text-ink-900 border-b border-line/70 align-middle'

export default function HiringTab({ d }: { d: ResourceData }) {
  const { positions, hiringTargets, hiringFunnel, workstreamHeadcount, kpi } = d
  const [pos, setPos] = useState<Position | null>(null)
  const [adding, setAdding] = useState(false)
  const [editFunnel, setEditFunnel] = useState(false)
  const [fStatus, setFStatus] = useState('All')
  const [fWs, setFWs] = useState('All')
  const [fPr, setFPr] = useState('All')

  const rows = useMemo(() => positions.items
    .filter((p) => (fStatus === 'All' ? true : fStatus === 'Open (all stages)' ? isOpenPosition(p) : p.status === fStatus))
    .filter((p) => fWs === 'All' || p.workstream === fWs)
    .filter((p) => fPr === 'All' || p.priority === fPr)
    .sort((a, b) => (Number(isOpenPosition(b)) - Number(isOpenPosition(a))) || positionDaysOpen(b) - positionDaysOpen(a)), [positions.items, fStatus, fWs, fPr])

  const totals = MONTHS.map((_, i) => hiringTargets.items.reduce((s, r) => s + (r.targets[i] ?? 0), 0))
  const grand = totals.reduce((a, b) => a + b, 0)
  const setTarget = (r: HiringTarget, i: number, v: string) => hiringTargets.update({ ...r, targets: r.targets.map((t, j) => (j === i ? Math.max(0, parseInt(v) || 0) : t)) })
  const onboardedFor = (ws: string) => workstreamHeadcount.items.find((w) => w.workstream === ws)?.onboarded ?? 0
  const funnelRows = hiringFunnel.items.map((s, i, a) => ({ ...s, conv: i === 0 ? null : a[i - 1].candidates ? Math.round((s.candidates / a[i - 1].candidates) * 100) : 0 }))
  const byStage = POSITION_STATUSES.map((s) => ({ s, n: positions.items.filter((p) => p.status === s).length }))
  const offerRate = hiringFunnel.items[0]?.candidates ? ((hiringFunnel.items.find((s) => s.stage === 'Offer Extended')?.candidates ?? 0) / hiringFunnel.items[0].candidates * 100).toFixed(1) : '0'

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <MiniStat label="2026 hiring target (plan)" value={grand} sub="Sum of monthly targets" />
        <MiniStat label="Open requisitions" value={kpi.openCount} sub={<><span className="text-red-600 font-medium">{kpi.critical} Critical</span> · {kpi.others} Others</>} />
        <MiniStat label="In interview / offer" value={byStage.filter((b) => b.s === 'In Interview' || b.s === 'Offer').reduce((s, b) => s + b.n, 0)} sub={`${byStage.find((b) => b.s === 'Offer')?.n ?? 0} offers out`} />
        <MiniStat label="Sourced to offer" value={`${offerRate}%`} sub="Pipeline conversion" />
        <MiniStat label="Joined (pipeline)" value={hiringFunnel.items.find((s) => s.stage === 'Joined')?.candidates ?? 0} sub="Current hiring cycle" tone="text-green-600" />
      </div>

      <div className="grid grid-cols-[2.3fr_1fr] gap-4">
        <Card title="Monthly Hiring Targets by Function (2026)" subtitle="Click a cell to edit the target; totals and the plan KPI update immediately.">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full tbl border-separate border-spacing-0">
              <thead><tr><th className={TH}>Function</th>{MONTHS.map((m) => <th key={m} className={`${TH} text-center`}>{m}</th>)}<th className={`${TH} text-right`}>Total</th><th className={`${TH} text-right`}>Onboarded</th></tr></thead>
              <tbody>
                {hiringTargets.items.map((r) => (
                  <tr key={r.id}>
                    <td className={`${TD} whitespace-nowrap`}>{r.workstream}</td>
                    {MONTHS.map((m, i) => <td key={m} className={`${TD} text-center px-0.5 py-1`}><input type="number" min={0} value={r.targets[i] ?? 0} onChange={(e) => setTarget(r, i, e.target.value)} className="w-8 text-center text-[12px] rounded-md border border-transparent hover:border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none py-1 bg-transparent" /></td>)}
                    <td className={`${TD} text-right font-semibold`}>{r.targets.reduce((a, b) => a + b, 0)}</td>
                    <td className={`${TD} text-right text-ink-500`}>{onboardedFor(r.workstream)}</td>
                  </tr>
                ))}
                <tr className="bg-surface/60"><td className={`${TD} font-semibold`}>Total</td>{totals.map((t, i) => <td key={i} className={`${TD} text-center font-semibold`}>{t}</td>)}<td className={`${TD} text-right font-bold`}>{grand}</td><td className={`${TD} text-right font-semibold`}>{workstreamHeadcount.items.reduce((s, w) => s + w.onboarded, 0)}</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Hiring Pipeline" action={<button className="link inline-flex items-center gap-1" onClick={() => setEditFunnel(true)}><Pencil size={12} /> Update</button>}>
          <div className="flex items-start gap-2">
            <Funnel stages={hiringFunnel.items} width={92} height={170} />
            <div className="flex-1 min-w-0">
              <CompactTable rows={funnelRows} columns={[
                { key: 'stage', header: 'Stage', className: 'whitespace-nowrap' },
                { key: 'candidates', header: 'Candidates', className: 'text-right', render: (r) => r.candidates.toLocaleString('en-IN') },
                { key: 'conv', header: 'Conv. %', className: 'text-right', render: (r) => (r.conv === null ? '-' : `${r.conv}%`) },
              ]} />
            </div>
          </div>
        </Card>
      </div>

      <Card title="Requisition Register" subtitle={`${rows.length} of ${positions.items.length} requisitions · click a row to edit or change stage`}
        action={<div className="flex items-center gap-2">
          <FilterSelect label="Status" value={fStatus} options={['All', 'Open (all stages)', ...POSITION_STATUSES]} onChange={setFStatus} />
          <FilterSelect label="Workstream" value={fWs} options={['All', ...FUNCTIONS]} onChange={setFWs} />
          <FilterSelect label="Priority" value={fPr} options={['All', ...PRIORITIES]} onChange={setFPr} />
          <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> Add Position</button>
        </div>}>
        <Table<Position> compact rows={rows} onRowClick={(r) => setPos(r)} columns={[
          { key: 'id', header: 'Req ID', render: (r) => <span className="text-ink-500 text-[12px]">{r.id.toUpperCase().replace('POS-', 'REQ-')}</span> },
          { key: 'role', header: 'Role', render: (r) => <span className="font-medium">{r.role}</span> },
          { key: 'workstream', header: 'Workstream', render: (r) => fnShort(r.workstream) },
          { key: 'location', header: 'Location' },
          { key: 'grade', header: 'Grade' },
          { key: 'priority', header: 'Priority', render: (r) => <Badge value={r.priority} /> },
          { key: 'status', header: 'Stage', render: (r) => <Badge value={r.status} /> },
          { key: 'hiringManager', header: 'Hiring Manager' },
          { key: 'openedOn', header: 'Opened', render: (r) => fmtDate(r.openedOn) },
          { key: 'targetDate', header: 'Target Date', render: (r) => <span className={r.targetDate < '2026-10-20' && isOpenPosition(r) ? 'text-red-600' : ''}>{fmtDate(r.targetDate)}</span> },
          { key: 'days', header: 'Days Open', className: 'text-right', render: (r) => isOpenPosition(r) ? positionDaysOpen(r) : '—' },
        ]} />
      </Card>

      <PositionForm open={adding || !!pos} onClose={() => { setAdding(false); setPos(null) }} value={pos} onSave={(p) => { if (pos) positions.update(p); else positions.add(p); setAdding(false); setPos(null) }} onDelete={(id) => positions.remove(id)} />
      <NumberGridForm open={editFunnel} onClose={() => setEditFunnel(false)} title="Hiring Pipeline – stage counts" rows={hiringFunnel.items} labelKey="stage" fields={[{ key: 'candidates', label: 'Candidates' }]} onSave={(rows) => hiringFunnel.setAll(rows)} hint="Conversion % is derived from the previous stage." />
    </>
  )
}
