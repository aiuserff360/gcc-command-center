/**
 * Cost Model → Scenarios (save / compare up to four against a reference) and Sensitivity (flex each
 * driver ± its percentage, tornado + impact table). Both honour the business-unit filter.
 */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Save, Upload, Trash2, Info } from 'lucide-react'
import { Card, Legend } from '../../ui'
import { tooltipStyle } from '../../charts'
import { uid } from '../../../store/useStore'
import { fmtDate, TODAY } from '../../../data/common'
import { computeModel, sensitivity, FLEX_DRIVERS, type CostScenario, type EntityResult, type FlexDriver } from '../../../data/costModel'
import type { CostModel } from './useCostModel'
import { Stat, PctInput, gth, gtd, hc, lakhFmt, lakhNum, tick } from './shared'
import { money, fmtAxis, fmtTip } from './OutputSummary'

const SC_COLORS = ['#1E5BBE', '#16A34A', '#F59E0B', '#8B5CF6']

export function ScenariosView({ cm, scope }: { cm: CostModel; scope: string }) {
  const { m, inputs, allUnits, scenariosC, save } = cm
  const [selected, setSelected] = useState<string[]>(() => scenariosC.items.slice(0, 3).map((s) => s.id))
  const [name, setName] = useState('')
  const pick = (r: ReturnType<typeof computeModel>): EntityResult => (scope === 'all' ? r.program : r.byUnit[scope] ?? r.program)
  const calc = useMemo(() => scenariosC.items.map((s) => ({ s, e: pick(computeModel(s.inputs, allUnits)) })), [scenariosC.items, allUnits, scope]) // eslint-disable-line react-hooks/exhaustive-deps
  const current = useMemo(() => pick(computeModel(inputs, allUnits)), [inputs, allUnits, scope]) // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = selected.map((id) => calc.find((c) => c.s.id === id)).filter((c): c is NonNullable<typeof c> => !!c)
  const ref = chosen[0]
  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 4 ? cur : [...cur, id]))
  const saveNew = () => { const n = name.trim() || `Scenario ${scenariosC.items.length + 1}`; const sc: CostScenario = { id: uid('cs'), name: n, note: 'Saved from the current model inputs.', savedAt: TODAY, inputs: JSON.parse(JSON.stringify(inputs)) }; scenariosC.add(sc); setSelected((cur) => (cur.length < 4 ? [...cur, sc.id] : cur)); setName('') }
  const rows: { label: string; get: (e: EntityResult) => number; fmt: (v: number) => string; delta?: boolean; lakh?: boolean }[] = [
    { label: 'Horizon', get: (e) => e.years.length, fmt: (v) => `${v} years` },
    { label: 'Final-year headcount', get: (e) => e.years[e.years.length - 1].exit, fmt: (v) => hc(v), delta: true },
    { label: `Total cost over horizon (${m.unitLabel})`, get: (e) => e.total, fmt: (v) => money(m, v), delta: true },
    { label: `Final-year run-rate (${m.unitLabel})`, get: (e) => e.runRate, fmt: (v) => money(m, v), delta: true },
    { label: `Final-year cost per FTE (${m.lakhUnitLabel})`, get: (e) => e.runRateCostPerFte, fmt: (v) => lakhNum(m, v), delta: true, lakh: true },
    { label: `Average cost per FTE (${m.lakhUnitLabel})`, get: (e) => e.avgCostPerFte, fmt: (v) => lakhNum(m, v), delta: true, lakh: true },
    { label: 'Compensation', get: (e) => e.categoryTotals.Compensation, fmt: (v) => money(m, v), delta: true },
    { label: 'Other people costs', get: (e) => e.categoryTotals['Other people costs'], fmt: (v) => money(m, v), delta: true },
    { label: 'Real estate', get: (e) => e.categoryTotals['Real estate'], fmt: (v) => money(m, v), delta: true },
    { label: 'Technology', get: (e) => e.categoryTotals.Technology, fmt: (v) => money(m, v), delta: true },
    { label: 'Centre / corporate + establishment', get: (e) => e.categoryTotals['Centre / corporate'] + e.categoryTotals['One-time establishment'], fmt: (v) => money(m, v), delta: true },
    { label: 'Total cash out incl. deposits', get: (e) => e.cashTotal, fmt: (v) => money(m, v), delta: true },
  ]
  const chart = chosen.map((c, i) => ({ name: c.s.name, total: +m.toDisplay(c.e.total).toFixed(m.digits), fill: SC_COLORS[i] }))
  return (
    <>
      <div className="grid grid-cols-[1fr_1.1fr] gap-4">
        <Card title="Saved scenarios" subtitle="Select up to four to compare; the first selected is the reference. Saving snapshots every model input." action={<span className="inline-flex items-center gap-1.5"><input className="input py-1 text-[12px] w-[170px]" placeholder="Scenario name" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-primary py-1 text-[12px] whitespace-nowrap" onClick={saveNew}><Save size={13} /> Save current model</button></span>}>
          <div className="space-y-2">
            {calc.map((c) => { const i = selected.indexOf(c.s.id); const isCurrent = JSON.stringify(c.s.inputs) === JSON.stringify(inputs); return (
              <div key={c.s.id} className={clsx('flex items-start gap-3 rounded-lg border px-3 py-2', i >= 0 ? 'border-brand-300 bg-brand-50/40' : 'border-line')}>
                <input type="checkbox" className="accent-brand-600 mt-1" checked={i >= 0} onChange={() => toggle(c.s.id)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: i >= 0 ? SC_COLORS[i] : '#CBD5E1' }} /><span className="text-[13px] font-semibold text-ink-900">{c.s.name}</span>{i === 0 && <span className="text-[10.5px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 rounded px-1.5">reference</span>}{isCurrent && <span className="text-[10.5px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 rounded px-1.5">active</span>}</div>
                  <div className="text-[11.5px] text-ink-500 mt-0.5 leading-snug">{c.s.note}</div>
                  <div className="text-[11px] text-ink-500 mt-1">saved {fmtDate(c.s.savedAt)} · {hc(c.e.years[c.e.years.length - 1].exit)} FTE final year · total {m.fmt(c.e.total)} · run-rate {m.fmt(c.e.runRate)}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button title="Load this scenario into the model" className="text-slate-400 hover:text-brand-600 p-1 cursor-pointer" onClick={() => { if (window.confirm(`Load "${c.s.name}" into the cost model? The current inputs are replaced (save them first if needed).`)) save(JSON.parse(JSON.stringify(c.s.inputs))) }}><Upload size={14} /></button>
                  <button title="Delete scenario" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => { if (window.confirm(`Delete scenario "${c.s.name}"?`)) { scenariosC.remove(c.s.id); setSelected((cur) => cur.filter((x) => x !== c.s.id)) } }}><Trash2 size={14} /></button>
                </div>
              </div>) })}
          </div>
          <p className="text-[11.5px] text-ink-500 mt-3">Current model: total {m.fmt(current.total)} · run-rate {m.fmt(current.runRate)} · {lakhFmt(m, current.runRateCostPerFte)} per FTE{scope !== 'all' ? ' (selected business unit)' : ''}.</p>
        </Card>
        <Card title={`Total cost by scenario (${m.unitLabel})`} subtitle={scope === 'all' ? 'Whole program over the horizon.' : 'Selected business unit over the horizon.'}>
          {chosen.length ? (
            <>
              <Legend items={chosen.map((c, i) => ({ label: c.s.name, color: SC_COLORS[i] }))} />
              <div className="h-[250px] mt-1">
                <ResponsiveContainer>
                  <BarChart data={chart} margin={{ top: 18, right: 8, left: -10, bottom: 0 }} barCategoryGap="40%">
                    <CartesianGrid vertical={false} stroke="#EEF2F7" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={tick} />
                    <YAxis tickLine={false} axisLine={false} tick={tick} tickFormatter={fmtAxis(m)} />
                    <Tooltip {...tooltipStyle} formatter={fmtTip(m)} cursor={{ fill: '#F3F6FB' }} />
                    <Bar dataKey="total" radius={[3, 3, 0, 0]} isAnimationActive={false}>{chart.map((c) => <Cell key={c.name} fill={c.fill} />)}<LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : <p className="text-[12.5px] text-ink-500 italic py-10 text-center">Select a scenario to compare. Use "Save current model" to snapshot the inputs you are working on.</p>}
        </Card>
      </div>
      <Card title="Scenario comparison" subtitle="Differences are shown against the reference scenario (first selected).">
        {ref ? (
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={gth}>Metric</th>{chosen.map((c, i) => <th key={c.s.id} className={clsx(gth, 'text-right')}><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: SC_COLORS[i] }} />{c.s.name}</span><span className="block text-[10px] font-normal text-ink-400">{i === 0 ? 'reference' : 'Δ vs reference'}</span></th>)}</tr></thead>
            <tbody>
              {rows.map((r) => <tr key={r.label} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'py-1.5 font-medium')}>{r.label}</td>{chosen.map((c, i) => { const v = r.get(c.e); const d = v - r.get(ref.e); return <td key={c.s.id} className={clsx(gtd, 'text-right px-2 tabular-nums')}>{r.fmt(v)}{i > 0 && r.delta && <span className={clsx('block text-[10.5px]', d > 0 ? 'text-amber-700' : d < 0 ? 'text-green-700' : 'text-ink-400')}>{d === 0 ? '±0' : `${d > 0 ? '+' : '−'}${r.lakh ? lakhNum(m, Math.abs(d)) : r.label.startsWith('Final-year headcount') ? hc(Math.abs(d)) : money(m, Math.abs(d))}`}</span>}</td> })}</tr>)}
            </tbody>
          </table>
        ) : <p className="text-[12.5px] text-ink-500 italic py-6 text-center">Select at least one scenario.</p>}
        <p className="text-[11.5px] text-ink-500 mt-3 inline-flex items-start gap-1.5"><Info size={13} className="mt-0.5 shrink-0" /> Scenarios with different horizons are compared on their own totals; use the run-rate and per-FTE lines for a like-for-like view.</p>
      </Card>
    </>
  )
}

/* ================= Sensitivity ================= */
export function SensitivityView({ cm, scope }: { cm: CostModel; scope: string }) {
  const { m, inputs, allUnits } = cm
  const [flex, setFlex] = useState<Partial<Record<FlexDriver, number>>>({})
  const { base, rows } = useMemo(() => sensitivity(inputs, allUnits, flex, scope === 'all' ? undefined : scope), [inputs, allUnits, flex, scope])
  const top = rows[0]
  const widest = Math.max(...rows.map((r) => r.totalPlus - r.totalMinus), 0)
  const maxAbs = Math.max(...rows.map((r) => Math.max(Math.abs(r.deltaPlus), Math.abs(r.deltaMinus))), 1e-9)
  const last = base.years[base.years.length - 1]
  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <Stat label={`Base ${base.years.length}-year total`} value={m.fmt(base.total)} sub="current inputs" tone="text-brand-600" />
        <Stat label="Most sensitive driver" value={top?.label ?? '—'} sub={top ? `${top.impactPct >= 0 ? '+' : ''}${top.impactPct.toFixed(1)}% at +${top.flex}%` : ''} />
        <Stat label={`Widest swing (${base.years.length}-year)`} value={m.fmt(widest)} sub={top ? `from −${top.flex}% to +${top.flex}% on ${top.label.toLowerCase()}` : ''} />
        <Stat label={`${last.label} cost per FTE`} value={lakhFmt(m, last.costPerFte)} sub="base case" />
      </div>
      <div className="grid grid-cols-[1.5fr_1fr] gap-4">
        <Card title={`Sensitivity of the ${base.years.length}-year total`} subtitle="Change in total cost when each driver is flexed up and down while everything else is held constant.">
          <div className="space-y-2.5 py-2">
            {rows.map((r) => { const wl = (Math.abs(r.deltaMinus) / maxAbs) * 100, wr = (Math.abs(r.deltaPlus) / maxAbs) * 100; return (
              <div key={r.driver} className="flex items-center gap-2 text-[11.5px]">
                <div className="w-[190px] text-right shrink-0"><div className="font-medium text-ink-900">{r.label}</div><div className="text-[10.5px] text-ink-400">±{r.flex}%</div></div>
                <div className="flex-1 flex items-center">
                  <div className="flex-1 flex justify-end"><div className="h-5 rounded-l flex items-center justify-start pl-1.5 text-[10.5px] font-semibold text-navy-900 whitespace-nowrap" style={{ width: `${wl}%`, minWidth: wl > 0 ? 8 : 0, background: '#BFD7F7' }}>{wl > 18 ? `${r.deltaMinus >= 0 ? '+' : '−'}${money(m, Math.abs(r.deltaMinus))}` : ''}</div></div>
                  <div className="w-px h-7 bg-slate-300" />
                  <div className="flex-1"><div className="h-5 rounded-r flex items-center justify-end pr-1.5 text-[10.5px] font-semibold text-white whitespace-nowrap" style={{ width: `${wr}%`, minWidth: wr > 0 ? 8 : 0, background: '#1E5BBE' }}>{wr > 18 ? `${r.deltaPlus >= 0 ? '+' : '−'}${money(m, Math.abs(r.deltaPlus))}` : ''}</div>{wr <= 18 && <span className="ml-1 text-[10.5px] font-semibold text-ink-900">{r.deltaPlus >= 0 ? '+' : '−'}{money(m, Math.abs(r.deltaPlus))}</span>}</div>
                </div>
              </div>) })}
          </div>
          <Legend items={[{ label: 'Driver increased', color: '#1E5BBE' }, { label: 'Driver decreased', color: '#BFD7F7' }]} />
        </Card>
        <Card title="Flex range per driver" subtitle="Adjust the ± percentage applied to each driver.">
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={gth}>Driver</th><th className={clsx(gth, 'text-right')}>Flex ±</th></tr></thead>
            <tbody>{FLEX_DRIVERS.map((d) => <tr key={d.key} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'py-1.5')}><span className="font-medium">{d.label}</span><span className="block text-[10.5px] text-ink-500">{d.hint}</span></td><td className={clsx(gtd, 'text-right')}><PctInput value={flex[d.key] ?? d.defaultFlex} onChange={(v) => setFlex((f) => ({ ...f, [d.key]: v }))} /></td></tr>)}</tbody>
          </table>
        </Card>
      </div>
      <Card title={`Impact table (${m.unitLabel})`} subtitle="Totals with the driver flexed down and up, and the change against the base case.">
        <table className="w-full border-separate border-spacing-0">
          <thead><tr><th className={gth}>Driver</th><th className={clsx(gth, 'text-right')}>Flex</th><th className={clsx(gth, 'text-right')}>Total (−)</th><th className={clsx(gth, 'text-right')}>Total (+)</th><th className={clsx(gth, 'text-right')}>Δ total (+)</th><th className={clsx(gth, 'text-right')}>Δ run-rate (+)</th><th className={clsx(gth, 'text-right')}>Impact</th><th className={clsx(gth, 'text-right')}>Elasticity</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.driver} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'py-1.5 font-medium')}>{r.label}</td><td className={clsx(gtd, 'text-right px-2')}>±{r.flex}%</td><td className={clsx(gtd, 'text-right px-2 tabular-nums')}>{money(m, r.totalMinus)}</td><td className={clsx(gtd, 'text-right px-2 tabular-nums')}>{money(m, r.totalPlus)}</td><td className={clsx(gtd, 'text-right px-2 tabular-nums')}>{r.deltaPlus >= 0 ? '+' : '−'}{money(m, Math.abs(r.deltaPlus))}</td><td className={clsx(gtd, 'text-right px-2 tabular-nums')}>{r.runRatePlus >= 0 ? '+' : '−'}{money(m, Math.abs(r.runRatePlus))}</td><td className={clsx(gtd, 'text-right px-2 font-semibold tabular-nums')}>{r.impactPct >= 0 ? '+' : ''}{r.impactPct.toFixed(1)}%</td><td className={clsx(gtd, 'text-right px-2 tabular-nums text-ink-500')}>{r.elasticity.toFixed(2)}</td></tr>)}</tbody>
        </table>
        <p className="text-[11.5px] text-ink-500 mt-3 inline-flex items-start gap-1.5"><Info size={13} className="mt-0.5 shrink-0" /> How to read this: a driver flexed by +20% that moves the total by 10% has elasticity 0.5; near 1 means the case scales almost linearly with that driver. Headcount usually dominates because it drives every per-employee cost.</p>
      </Card>
    </>
  )
}
