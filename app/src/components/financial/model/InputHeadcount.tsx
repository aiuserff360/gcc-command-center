/**
 * Cost model: headcount – exit headcount per business unit (pre-filled from the FTE plan), ramp helper,
 * experience mix and the derived opening / new hires / average headcount that drive every cost.
 */
import { useState } from 'react'
import clsx from 'clsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Wand2, RotateCcw, Check, AlertTriangle } from 'lucide-react'
import { Card, Legend } from '../../ui'
import { tooltipStyle } from '../../charts'
import { CHART_COLORS } from '../../../data/common'
import { BANDS, BAND_COLORS, MAX_YEARS, rampHeadcount, unitExit, unitMix, unitMixMode, sumArr } from '../../../data/costModel'
import type { CostModel } from './useCostModel'
import { UnitSelector, NumInput, PctInput, ModeToggle, MiniBtn, gth, gtd, hc, YEAR_LABEL } from './shared'

export function HeadcountInput({ cm, unit, onUnit }: { cm: CostModel; unit: string; onUnit: (id: string) => void }) {
  const { inputs, result, units, patch } = cm
  const bu = units.find((u) => u.id === unit) ?? units[0]
  const H = result.horizon
  const fy = inputs.settings.firstYear
  if (!bu) return <Card title="Cost model: headcount"><p className="text-[12.5px] text-ink-500 italic py-6 text-center">Add business units in GCC Setup first – the headcount plan is built per business unit.</p></Card>
  const r = result.byUnit[bu.id]
  const exit = unitExit(inputs, bu)
  const plan = [bu.y1, bu.y2, bu.y3, bu.y4, bu.y5]
  const onPlan = plan.slice(0, H).every((v, i) => v === (exit[i] ?? 0))
  const mode = unitMixMode(inputs, bu)
  const [rampY1, setRampY1] = useState(exit[0] ?? 0)
  const [rampYN, setRampYN] = useState(exit[H - 1] ?? 0)
  const [profile, setProfile] = useState<'linear' | 'front' | 'back'>('linear')

  const setExit = (y: number, v: number) => patch((d) => { const o = d.units[bu.id] ?? {}; const e = [...unitExit(d, bu)]; while (e.length < MAX_YEARS) e.push(e[e.length - 1] ?? 0); e[y] = Math.max(0, Math.round(v)); d.units[bu.id] = { ...o, exit: e } })
  const setMix = (y: number | null, b: number, v: number) => patch((d) => {
    const o = d.units[bu.id] ?? {}
    if (y == null) { const mix = [...(o.mixShare ?? d.defaults.mixShare)]; mix[b] = v; d.units[bu.id] = { ...o, mixShare: mix } }
    else { const by = (o.mixByYear ?? d.defaults.mixByYear).map((r) => [...r]); by[y][b] = v; d.units[bu.id] = { ...o, mixByYear: by } }
  })
  const setMode = (mm: 'same' | 'byYear') => patch((d) => { const o = d.units[bu.id] ?? {}; d.units[bu.id] = { ...o, mixMode: mm, mixShare: o.mixShare ?? [...d.defaults.mixShare], mixByYear: o.mixByYear ?? d.defaults.mixByYear.map((r) => [...r]) } })
  const copyY1 = () => patch((d) => { const o = d.units[bu.id] ?? {}; const by = (o.mixByYear ?? d.defaults.mixByYear).map((r) => [...r]); for (let y = 1; y < MAX_YEARS; y++) by[y] = [...by[0]]; d.units[bu.id] = { ...o, mixByYear: by } })
  const generate = () => { const ramp = rampHeadcount(rampY1, rampYN, profile, H); patch((d) => { const o = d.units[bu.id] ?? {}; const e = [...unitExit(d, bu)]; ramp.forEach((v, i) => { e[i] = v }); d.units[bu.id] = { ...o, exit: e } }) }
  const resetPlan = () => patch((d) => { const o = d.units[bu.id] ?? {}; d.units[bu.id] = { ...o, exit: plan } })

  const cards = units.map((u) => { const e = unitExit(inputs, u); return { id: u.id, name: u.name, kind: u.kind, big: <>{e[0]} <span className="text-[11px] font-medium text-ink-500">→ {e[H - 1]}</span></>, sub: `Year 1 → Year ${H} exit headcount`, foot: <span className="text-brand-600">{hc(result.byUnit[u.id]?.years[H - 1]?.avg ?? 0)} avg FTE in Y{H}</span> } })
  const chart = r.years.map((y) => ({ year: YEAR_LABEL(y.y, fy), 'Exit headcount': Math.round(y.exit), 'Average headcount': Math.round(y.avg) }))
  const yearMix = (y: number) => unitMix(inputs, bu, y)
  const lastYear = r.years[H - 1]
  const pyrMax = Math.max(...lastYear.exitByBand, 1)

  return (
    <div className="space-y-4">
      <UnitSelector title="Headcount by business unit" subtitle="Pick a business unit. Its exit headcount is pre-filled from the FTE plan in GCC Setup; the model derives opening, new hires and the average headcount used for costing." cards={cards} selected={bu.id} onSelect={onUnit} />

      <div className="grid grid-cols-[1.5fr_1fr] gap-4">
        <Card title={`Headcount ramp-up – ${bu.name}`} subtitle="Enter the exit headcount (FTE at year end). Other rows are calculated: new hires = net addition + attrition backfill; average = (opening + exit) ÷ 2."
          action={<div className="flex items-center gap-2">{onPlan ? <span className="inline-flex items-center gap-1 text-[11.5px] text-green-700"><Check size={13} /> matches FTE plan</span> : <span className="inline-flex items-center gap-1 text-[11.5px] text-amber-700"><AlertTriangle size={13} /> differs from FTE plan</span>}<MiniBtn onClick={resetPlan}><RotateCcw size={12} /> Reset to FTE plan</MiniBtn></div>}>
          <div className="flex items-end gap-3 flex-wrap rounded-lg border border-line bg-surface/50 px-3 py-2.5 mb-3 text-[12px]">
            <span className="font-semibold text-ink-900 inline-flex items-center gap-1.5"><Wand2 size={13} className="text-brand-600" /> Ramp helper</span>
            <label className="flex flex-col"><span className="text-[10.5px] text-ink-500">Year 1 exit</span><NumInput value={rampY1} onChange={setRampY1} width={70} min={0} step={1} /></label>
            <label className="flex flex-col"><span className="text-[10.5px] text-ink-500">Year {H} exit</span><NumInput value={rampYN} onChange={setRampYN} width={70} min={0} step={1} /></label>
            <label className="flex flex-col"><span className="text-[10.5px] text-ink-500">Growth profile</span><select className="input py-1 text-[12px]" value={profile} onChange={(e) => setProfile(e.target.value as typeof profile)}><option value="linear">Linear (steady growth)</option><option value="front">Front-loaded (fast start, then plateau)</option><option value="back">Back-loaded (slow start, then acceleration)</option></select></label>
            <button className="btn-primary py-1 text-[12px]" onClick={generate}>Generate ramp</button>
          </div>
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={gth}>Metric</th>{r.years.map((y) => <th key={y.y} className={clsx(gth, 'text-right')}>Y{y.y + 1}<span className="block text-[10px] font-normal text-ink-400">{y.calendar}</span></th>)}</tr></thead>
            <tbody>
              <tr><td className={clsx(gtd, 'font-medium')}>Exit headcount <span className="text-[10.5px] text-ink-500">input · FTE at year end</span></td>{r.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right')}><NumInput value={y.exit} onChange={(v) => setExit(y.y, v)} width={72} min={0} step={1} /></td>)}</tr>
              <tr><td className={clsx(gtd, 'text-ink-700')}>Opening headcount</td>{r.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{hc(y.opening)}</td>)}</tr>
              <tr><td className={clsx(gtd, 'text-ink-700')}>Net addition</td>{r.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{hc(y.netAddition)}</td>)}</tr>
              <tr><td className={clsx(gtd, 'text-ink-700')}>Attrition backfill <span className="text-[10.5px] text-ink-500">{inputs.settings.attritionRate}% of average</span></td>{r.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{hc(y.backfill)}</td>)}</tr>
              <tr><td className={clsx(gtd, 'text-ink-700')}>New hires <span className="text-[10.5px] text-ink-500">drive recruitment, devices, onboarding</span></td>{r.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2 font-medium')}>{hc(y.newHires)}</td>)}</tr>
              <tr className="bg-brand-50/50"><td className={clsx(gtd, 'font-semibold')}>Average headcount (for costing) <span className="text-[10.5px] font-normal text-ink-500">(opening + exit) ÷ 2</span></td>{r.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2 font-semibold')}>{hc(y.avg)}</td>)}</tr>
            </tbody>
          </table>
        </Card>
        <Card title="Headcount ramp-up" subtitle="Exit headcount with the average used for costing.">
          <Legend items={[{ label: 'Exit headcount', color: CHART_COLORS.blue }, { label: 'Average headcount', color: CHART_COLORS.blueFaint }]} />
          <div className="h-[280px] mt-2">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ top: 18, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 10.5 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="Exit headcount" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} isAnimationActive={false}><LabelList dataKey="Exit headcount" position="top" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
                <Bar dataKey="Average headcount" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-4">
        <Card title={`Experience mix – ${bu.name}`} subtitle="Share of headcount in each experience band. Totals must equal 100 %; the program default is 20 / 35 / 25 / 15 / 5."
          action={<div className="flex items-center gap-2"><span className="text-[11.5px] text-ink-500">Mix mode</span><ModeToggle value={mode} options={[{ key: 'same', label: 'Same across all years' }, { key: 'byYear', label: 'Customise by year' }]} onChange={setMode} />{mode === 'byYear' && <MiniBtn onClick={copyY1}>Copy Y1 to all years</MiniBtn>}</div>}>
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={gth}>Experience band</th>{mode === 'same' ? <th className={clsx(gth, 'text-right')}>All years</th> : r.years.map((y) => <th key={y.y} className={clsx(gth, 'text-right')}>Y{y.y + 1}</th>)}</tr></thead>
            <tbody>
              {BANDS.map((b, i) => (
                <tr key={b.key}>
                  <td className={clsx(gtd, 'py-1')}><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: BAND_COLORS[i] }} /><span><span className="font-medium">{b.label}</span><span className="block text-[10.5px] text-ink-500">{b.roles}</span></span></span></td>
                  {mode === 'same' ? <td className={clsx(gtd, 'text-right')}><PctInput value={yearMix(0)[i] ?? 0} onChange={(v) => setMix(null, i, v)} /></td> : r.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right')}><PctInput value={yearMix(y.y)[i] ?? 0} onChange={(v) => setMix(y.y, i, v)} /></td>)}
                </tr>
              ))}
              <tr className="bg-surface/70 font-semibold"><td className={clsx(gtd, 'py-1.5')}>Total</td>
                {(mode === 'same' ? [0] : r.years.map((y) => y.y)).map((y) => { const s = sumArr(yearMix(y)); const ok = Math.abs(s - 100) < 0.5; return <td key={y} className={clsx(gtd, 'text-right px-2', ok ? 'text-green-700' : 'text-red-600')}>{ok ? '✓ ' : ''}{s.toFixed(0)} %</td> })}
              </tr>
            </tbody>
          </table>
          <h4 className="text-[12.5px] font-semibold text-ink-900 mt-4 mb-1">Experience-wise headcount (average FTE for costing)</h4>
          <p className="text-[11.5px] text-ink-500 mb-2">Average headcount × experience mix. These FTEs drive compensation and every per-employee cost.</p>
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={gth}>Experience band</th>{r.years.map((y) => <th key={y.y} className={clsx(gth, 'text-right')}>Y{y.y + 1}<span className="block text-[10px] font-normal text-ink-400">avg {hc(y.avg)}</span></th>)}</tr></thead>
            <tbody>
              {BANDS.map((b, i) => <tr key={b.key}><td className={clsx(gtd, 'py-1')}><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: BAND_COLORS[i] }} />{b.label}</span></td>{r.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{hc(y.byBand[i])}</td>)}</tr>)}
              <tr className="bg-surface/70 font-semibold"><td className={clsx(gtd, 'py-1.5')}>Total</td>{r.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{hc(y.avg)}</td>)}</tr>
            </tbody>
          </table>
        </Card>
        <Card title={`Year ${H} experience pyramid`} subtitle={`Exit headcount by band · total ${hc(lastYear.exit)}`}>
          <div className="space-y-2.5 pt-1">
            {BANDS.map((_, i) => i).reverse().map((i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                <span className="w-[86px] text-ink-700 shrink-0">{BANDS[i].label}</span>
                <span className="flex-1 flex justify-center"><span className="h-5 rounded" style={{ width: `${(lastYear.exitByBand[i] / pyrMax) * 100}%`, background: BAND_COLORS[i], minWidth: 4 }} /></span>
                <span className="w-16 text-right font-medium tabular-nums">{hc(lastYear.exitByBand[i])}</span>
                <span className="w-10 text-right text-ink-500 tabular-nums">{(lastYear.exit ? (lastYear.exitByBand[i] / lastYear.exit) * 100 : 0).toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <h4 className="text-[12.5px] font-semibold text-ink-900 mt-5 mb-1">Experience mix trend</h4>
          <div className="h-[170px]">
            <ResponsiveContainer>
              <BarChart data={r.years.map((y) => { const row: Record<string, number | string> = { year: `Y${y.y + 1}` }; const s = sumArr(y.mixShare) || 100; BANDS.forEach((b, i) => { row[b.label] = +((y.mixShare[i] ?? 0) / s * 100).toFixed(1) }); return row })} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 10.5 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10.5 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} cursor={{ fill: '#F3F6FB' }} />
                {BANDS.map((b, i) => <Bar key={b.key} dataKey={b.label} stackId="a" fill={BAND_COLORS[i]} isAnimationActive={false} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
