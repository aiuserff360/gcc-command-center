/**
 * Hiring Plan & Pipeline – the hiring plan is the organisation structure's ramp (net adds per month in year 1, per
 * year afterwards) by business unit and capability, against the adds actually onboarded up to the reporting month.
 */
import { useState } from 'react'
import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { Card } from '../ui'
import { RAMP_MONTHS, YEAR_KEYS, subY1 } from '../../data/businessUnits'
import { POSITION_STATUSES, OUT_YEARS, type HcView } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { Funnel, MiniStat, CompactTable, HcViewToggle } from './widgets'
import { RequisitionRegister } from './RequisitionRegister'

const TH = 'text-left text-[11.5px] font-medium text-ink-500 px-1.5 py-2 bg-surface/70 first:rounded-l-md last:rounded-r-md whitespace-nowrap'
const TD = 'px-1.5 py-1.5 text-[12.5px] text-ink-900 border-b border-line/70 align-middle'
const adds = (cum: (number | null | undefined)[]) => cum.map((v, i) => (v === null || v === undefined ? null : v - (i ? cum[i - 1] ?? 0 : 0)))

export default function HiringTab({ d, onOpen }: { d: ResourceData; onOpen: (positionId: string) => void }) {
  const { positions, funnel, buHeadcountRows, candidates, kpi, buNames, subsOf, unitPlanMonths, unitActualMonths, unitOf, capActualRows, reportingIdx, reportingMonth, planMonths, actualMonths, planYears } = d
  const [view, setView] = useState<HcView>('Year 1 month-wise')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (bu: string) => setOpen((o) => { const n = new Set(o); if (n.has(bu)) n.delete(bu); else n.add(bu); return n })
  const annual = view !== 'Year 1 month-wise'

  const funnelRows = funnel.map((s, i, a) => ({ ...s, conv: i === 0 ? null : a[i - 1].candidates ? Math.round((s.candidates / a[i - 1].candidates) * 100) : 0 }))
  const byStage = POSITION_STATUSES.map((s) => ({ s, n: positions.items.filter((p) => p.status === s).length }))
  const sourced = funnel[0]?.candidates ?? 0
  const offerRate = sourced ? (((funnel.find((s) => s.stage === 'Offer Extended')?.candidates ?? 0) / sourced) * 100).toFixed(1) : '0'
  const inProcess = candidates.items.filter((c) => c.status === 'In process' || c.status === 'Offer').length
  const programAdds = adds(planMonths), programActualAdds = adds(actualMonths)
  const programYearAdds = [kpi.y1Target, ...planYears].map((v, i, a) => (i ? v - a[i - 1] : v)).slice(1)

  /** one plan / actual cell: plan adds in every month, actual adds (coloured) once the month is reported */
  const cell = (plan: number | null, actual: number | null, reported: boolean, key: string | number, bold = false) => (
    <td key={key} className={clsx(TD, 'text-center px-0.5 py-1 leading-tight', bold && 'font-semibold')}>
      <div className={clsx(reported ? 'text-ink-500 text-[11px]' : 'text-ink-900')}>{plan ?? '—'}</div>
      {reported && <div className={clsx('text-[11.5px] font-semibold', (actual ?? 0) >= (plan ?? 0) ? 'text-green-600' : 'text-red-600')}>{actual ?? '—'}</div>}
    </td>
  )

  return (
    <>
      <div className="grid grid-cols-[1.95fr_1fr] gap-4">
        <div className="grid grid-cols-3 gap-4 content-start">
          <MiniStat label="Year-1 target (Pune)" value={kpi.y1Target} sub={`by ${RAMP_MONTHS[Math.max(0, planMonths.findIndex((v) => v >= kpi.y1Target))] ?? 'Oct 27'} · 4 transition waves`} />
          <MiniStat label={`Onboarded to ${reportingMonth}`} value={kpi.onboarded} sub={<span className={kpi.onboarded >= kpi.planned ? 'text-green-600' : 'text-red-600'}>{kpi.onboarded - kpi.planned >= 0 ? '+' : ''}{kpi.onboarded - kpi.planned} vs plan {kpi.planned}</span>} tone="text-brand-600" />
          <MiniStat label="Open requisitions" value={kpi.openCount} sub={<><span className="text-red-600 font-medium">{kpi.critical} Critical / High</span> · {kpi.others} Others</>} />
          <MiniStat label="In interview / offer" value={byStage.filter((b) => b.s === 'In Interview' || b.s === 'Offer').reduce((s, b) => s + b.n, 0)} sub={`${byStage.find((b) => b.s === 'Offer')?.n ?? 0} offers out`} />
          <MiniStat label="Candidates in process" value={inProcess} sub={`${sourced.toLocaleString('en-IN')} applied · ${offerRate}% sourced to offer`} tone="text-brand-600" />
          <MiniStat label="Joined (pipeline)" value={funnel.find((s) => s.stage === 'Joined')?.candidates ?? 0} sub="Current hiring cycle" tone="text-green-600" />
        </div>
        <Card title="Hiring Pipeline" subtitle="Aggregated from every requisition's candidates">
          <div className="flex items-start gap-3">
            <Funnel stages={funnel} width={96} height={170} />
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

      <Card title="Hiring Plan by Business Unit" subtitle={annual ? 'Net adds per year from the annual targets (years 2–5). Targets are maintained in GCC Setup → Organisation structure.' : `Net adds per month from the year-1 ramp (plan, grey once reported) and the adds actually onboarded (coloured) up to ${reportingMonth}. Click a business unit for its capabilities.`}
          headerRight={<HcViewToggle value={view} onChange={setView} />}>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full tbl border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={TH}>Business unit / capability</th>
                  {(annual ? OUT_YEARS : RAMP_MONTHS).map((m) => <th key={m} className={clsx(TH, 'text-center', !annual && m === reportingMonth && 'text-brand-600')}>{m}</th>)}
                  <th className={clsx(TH, 'text-right')}>{annual ? 'Year 5' : 'Year 1'}</th>
                  <th className={clsx(TH, 'text-right')}>Onboarded</th>
                  <th className={clsx(TH, 'text-right')}>To hire</th>
                </tr>
              </thead>
              <tbody>
                {buNames.map((bu) => {
                  const hc = buHeadcountRows.find((r) => r.businessUnit === bu)
                  const unit = unitOf(bu)
                  const planAdds = adds(unitPlanMonths(bu)), actAdds = adds(unitActualMonths(bu))
                  const yearAdds = YEAR_KEYS.map((k) => unit?.[k] ?? 0).map((v, i, a) => (i ? v - a[i - 1] : v)).slice(1)
                  const isOpen = open.has(bu)
                  const total = annual ? unit?.y5 ?? 0 : hc?.target ?? 0
                  return [
                    <tr key={bu} className="cursor-pointer hover:bg-brand-50/40" onClick={() => toggle(bu)}>
                      <td className={clsx(TD, 'whitespace-nowrap font-medium')}><span className="inline-flex items-center gap-1"><ChevronRight size={12} className={clsx('text-ink-400 transition-transform', isOpen && 'rotate-90')} />{bu}</span></td>
                      {annual ? yearAdds.map((v, i) => cell(v, null, false, i, true)) : planAdds.map((v, i) => cell(v, actAdds[i], i <= reportingIdx, i, true))}
                      <td className={clsx(TD, 'text-right font-semibold')}>{total}</td>
                      <td className={clsx(TD, 'text-right text-ink-700')}>{hc?.onboarded ?? 0}</td>
                      <td className={clsx(TD, 'text-right font-semibold', (hc?.target ?? 0) - (hc?.onboarded ?? 0) > 0 ? 'text-amber-600' : 'text-green-600')}>{Math.max(0, (hc?.target ?? 0) - (hc?.onboarded ?? 0))}</td>
                    </tr>,
                    ...(isOpen ? subsOf(bu).map((s) => {
                      const row = capActualRows.find((r) => r.id === `ca-${s.id}`)
                      const capPlan = adds(s.ramp), capAct = adds(row?.actuals ?? [])
                      const yAdds = [subY1(s), s.y2, s.y3, s.y4, s.y5].map((v, i, a) => (i ? v - a[i - 1] : v)).slice(1)
                      const onboarded = row?.actuals[reportingIdx] ?? 0
                      return (
                        <tr key={s.id} className="bg-surface/40">
                          <td className={clsx(TD, 'whitespace-nowrap text-[12px] text-ink-700 pl-7')}>{s.name}<span className="text-ink-400 text-[11px]"> · {s.roleSkill}</span></td>
                          {annual ? yAdds.map((v, i) => cell(v, null, false, i)) : capPlan.map((v, i) => cell(v, capAct[i], i <= reportingIdx, i))}
                          <td className={clsx(TD, 'text-right text-[12px]')}>{annual ? s.y5 : subY1(s)}</td>
                          <td className={clsx(TD, 'text-right text-[12px] text-ink-700')}>{onboarded}</td>
                          <td className={clsx(TD, 'text-right text-[12px]')}>{Math.max(0, subY1(s) - onboarded)}</td>
                        </tr>
                      )
                    }) : []),
                  ]
                })}
                <tr className="bg-surface/60">
                  <td className={clsx(TD, 'font-semibold')}>Total</td>
                  {annual ? programYearAdds.map((v, i) => cell(v, null, false, i, true)) : programAdds.map((v, i) => cell(v, programActualAdds[i], i <= reportingIdx, i, true))}
                  <td className={clsx(TD, 'text-right font-bold')}>{annual ? planYears[planYears.length - 1] ?? 0 : kpi.y1Target}</td>
                  <td className={clsx(TD, 'text-right font-semibold')}>{kpi.onboarded}</td>
                  <td className={clsx(TD, 'text-right font-bold text-amber-600')}>{Math.max(0, kpi.y1Target - kpi.onboarded)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

      <RequisitionRegister d={d} onOpen={onOpen} />
    </>
  )
}
