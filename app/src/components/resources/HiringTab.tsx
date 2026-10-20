import { Card } from '../ui'
import { MONTHS } from '../../data/common'
import { POSITION_STATUSES, type HiringTarget } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { Funnel, MiniStat, CompactTable } from './widgets'
import { RequisitionRegister } from './RequisitionRegister'

const TH = 'text-left text-[11.5px] font-medium text-ink-500 px-1.5 py-2 bg-surface/70 first:rounded-l-md last:rounded-r-md whitespace-nowrap'
const TD = 'px-1.5 py-1.5 text-[12.5px] text-ink-900 border-b border-line/70 align-middle'

export default function HiringTab({ d, onOpen }: { d: ResourceData; onOpen: (positionId: string) => void }) {
  const { positions, hiringTargets, hiringTargetRows, funnel, buHeadcountRows, candidates, kpi } = d

  const totals = MONTHS.map((_, i) => hiringTargetRows.reduce((s, r) => s + (r.targets[i] ?? 0), 0))
  const grand = totals.reduce((a, b) => a + b, 0)
  const setTarget = (r: HiringTarget, i: number, v: string) => hiringTargets.update({ ...r, targets: r.targets.map((t, j) => (j === i ? Math.max(0, parseInt(v) || 0) : t)) })
  const onboardedFor = (bu: string) => buHeadcountRows.find((w) => w.businessUnit === bu)?.onboarded ?? 0
  const funnelRows = funnel.map((s, i, a) => ({ ...s, conv: i === 0 ? null : a[i - 1].candidates ? Math.round((s.candidates / a[i - 1].candidates) * 100) : 0 }))
  const byStage = POSITION_STATUSES.map((s) => ({ s, n: positions.items.filter((p) => p.status === s).length }))
  const sourced = funnel[0]?.candidates ?? 0
  const offerRate = sourced ? (((funnel.find((s) => s.stage === 'Offer Extended')?.candidates ?? 0) / sourced) * 100).toFixed(1) : '0'
  const inProcess = candidates.items.filter((c) => c.status === 'In process' || c.status === 'Offer').length

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <MiniStat label="2026 hiring target (plan)" value={grand} sub="Sum of monthly targets" />
        <MiniStat label="Open requisitions" value={kpi.openCount} sub={<><span className="text-red-600 font-medium">{kpi.critical} Critical</span> · {kpi.others} Others</>} />
        <MiniStat label="In interview / offer" value={byStage.filter((b) => b.s === 'In Interview' || b.s === 'Offer').reduce((s, b) => s + b.n, 0)} sub={`${byStage.find((b) => b.s === 'Offer')?.n ?? 0} offers out`} />
        <MiniStat label="Candidates in process" value={inProcess} sub={`${sourced.toLocaleString('en-IN')} applied · ${offerRate}% sourced to offer`} tone="text-brand-600" />
        <MiniStat label="Joined (pipeline)" value={funnel.find((s) => s.stage === 'Joined')?.candidates ?? 0} sub="Current hiring cycle" tone="text-green-600" />
      </div>

      <div className="grid grid-cols-[2.3fr_1fr] gap-4">
        <Card title="Monthly Hiring Targets by Business Unit (2026)" subtitle="Click a cell to edit the target; totals and the plan KPI update immediately.">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full tbl border-separate border-spacing-0">
              <thead><tr><th className={TH}>Business unit</th>{MONTHS.map((m) => <th key={m} className={`${TH} text-center`}>{m}</th>)}<th className={`${TH} text-right`}>Total</th><th className={`${TH} text-right`}>Onboarded</th></tr></thead>
              <tbody>
                {hiringTargetRows.map((r) => (
                  <tr key={r.id}>
                    <td className={`${TD} whitespace-nowrap`}>{r.businessUnit}</td>
                    {MONTHS.map((m, i) => <td key={m} className={`${TD} text-center px-0.5 py-1`}><input type="number" min={0} value={r.targets[i] ?? 0} onChange={(e) => setTarget(r, i, e.target.value)} className="w-8 text-center text-[12px] rounded-md border border-transparent hover:border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none py-1 bg-transparent" /></td>)}
                    <td className={`${TD} text-right font-semibold`}>{r.targets.reduce((a, b) => a + b, 0)}</td>
                    <td className={`${TD} text-right text-ink-500`}>{onboardedFor(r.businessUnit)}</td>
                  </tr>
                ))}
                <tr className="bg-surface/60"><td className={`${TD} font-semibold`}>Total</td>{totals.map((t, i) => <td key={i} className={`${TD} text-center font-semibold`}>{t}</td>)}<td className={`${TD} text-right font-bold`}>{grand}</td><td className={`${TD} text-right font-semibold`}>{buHeadcountRows.reduce((s, w) => s + w.onboarded, 0)}</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Hiring Pipeline" subtitle="Aggregated from every requisition's candidates">
          <div className="flex items-start gap-2">
            <Funnel stages={funnel} width={92} height={170} />
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

      <RequisitionRegister d={d} onOpen={onOpen} />
    </>
  )
}
