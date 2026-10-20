import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ComposedChart, Line, Area, Cell, ReferenceLine } from 'recharts'
import { Target, TrendingUp, Coins, PiggyBank, CheckCircle2, Plus, Pencil, PenLine, CheckCheck } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Card, KpiTile, Badge, Tabs, Table, Modal, Field, Input, TextArea, Select, FormGrid, Legend, ConfirmDelete, ViewAll, Stat, Progress, Ring, SectionTitle } from '../components/ui'
import { Donut, BarList, tooltipStyle } from '../components/charts'
import { useCollection, useStore, uid } from '../store/useStore'
import { InputLayout } from '../components/layout/InputLayout'
import { Grid, GridHead, GridEmpty, GridText, GridSelect, GridDate, GridMoney, GridRemove, GridTotal, AddButton, SaveBar, gtd, gtotal } from '../components/financial/grid'
import clsx from 'clsx'
import { seedProgramKpis, type ProgramKpis } from '../data/shared'
import { WORKSTREAMS, WORKSTREAM_META, CHART_COLORS, fmtDate, TODAY } from '../data/common'
import { useMoney, type Money } from '../data/money'
import { seedBenefitItems, seedValueMonthly, seedSavingsInitiatives, seedValueSettings, BENEFIT_AREAS, BENEFIT_COLORS, WATERFALL, PAYBACK, RUNRATE, type BenefitItem, type BenefitStatus, type ValueMonth, type SavingsInitiative, type ValueSettings, type BenefitArea } from '../data/value'

const TABS = ['Value Overview', 'Benefits Register', 'Cost Savings', 'Productivity & Quality', 'Value Forecast', 'Benefit Owners & Sign-off']
const VIEW_OPTIONS = ['All Benefit Areas', ...BENEFIT_AREAS] as const
/** Convert "₹ 4.2 Cr" / "₹ 28.5 L" embedded in narrative text to the display currency. */
const moneyText = (s: string, money: Money) => money.currency === 'INR' ? s : s.replace(/₹\s*([\d.,]+)\s*(Cr|L)\b/g, (_, n: string, u: string) => (u === 'Cr' ? money.fmt(parseFloat(n.replace(/,/g, ''))) : money.fmtLakh(parseFloat(n.replace(/,/g, '')))))
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)
const STATUS_COLOR: Record<string, string> = { 'On Track': CHART_COLORS.green, 'At Risk': CHART_COLORS.amber, Delayed: CHART_COLORS.red, Realized: CHART_COLORS.teal, 'Not Started': CHART_COLORS.gray }

type Setter<T> = <K extends keyof T>(k: K) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
function useForm<T>(initial: T, money?: Money) {
  const [f, setF] = useState<T>(initial)
  const s: Setter<T> = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const n: Setter<T> = (k) => (e) => setF({ ...f, [k]: parseFloat(e.target.value) || 0 })
  /** Props for a money input: shows the display currency, stores ₹ Cr. */
  const c = (k: keyof T) => ({ type: 'number' as const, step: 'any', value: money!.inputValue(f[k] as number), onChange: (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: money!.toBase(parseFloat(e.target.value) || 0) }) })
  return { f, setF, s, n, c }
}

export default function ValueRealization() {
  const mode = useStore((s) => s.mode)
  if (mode === 'input') return <ValueInput />
  return <ValueOutput />
}

/* ================= Output view (dashboards) ================= */
function ValueOutput() {
  const [tab, setTab] = useState(TABS[0])
  const [view, setView] = useState<string>('All Benefit Areas')
  const money = useMoney()
  const fmt = money.fmt
  /** ₹ Cr -> rounded number in the display unit (chart series). */
  const disp = (cr: number) => +money.toDisplay(cr).toFixed(money.digits)
  const kpisC = useCollection<ProgramKpis>('programKpis', seedProgramKpis)
  const k = kpisC.items[0] ?? seedProgramKpis[0]
  const settingsC = useCollection<ValueSettings>('valueSettings', seedValueSettings)
  const vs = settingsC.items[0] ?? seedValueSettings[0]
  const benefitsC = useCollection<BenefitItem>('benefitItems', seedBenefitItems)
  const monthlyC = useCollection<ValueMonth>('valueMonthly', seedValueMonthly)
  const savingsC = useCollection<SavingsInitiative>('savingsInitiatives', seedSavingsInitiatives)

  const benefits = useMemo(() => benefitsC.items.filter((b) => view === 'All Benefit Areas' || b.benefitArea === view), [benefitsC.items, view])
  const sum = (list: BenefitItem[], key: 'targetCr' | 'forecastCr' | 'realizedCr') => +list.reduce((s, b) => s + b[key], 0).toFixed(2)
  const areaRows = useMemo(() => BENEFIT_AREAS.map((a) => {
    const list = benefitsC.items.filter((b) => b.benefitArea === a)
    const target = sum(list, 'targetCr'), forecast = sum(list, 'forecastCr'), realized = sum(list, 'realizedCr')
    const status = list.some((b) => b.status === 'Delayed') ? 'Delayed' : list.some((b) => b.status === 'At Risk') && pct(forecast, target) < 75 ? 'At Risk' : 'On Track'
    return { area: a, target, forecast, realized, progress: pct(forecast, target), status, count: list.length }
  }), [benefitsC.items])
  const totalTarget = +areaRows.reduce((s, r) => s + r.target, 0).toFixed(1)
  const totalForecast = +areaRows.reduce((s, r) => s + r.forecast, 0).toFixed(1)
  const realizedToDate = +areaRows.reduce((s, r) => s + r.realized, 0).toFixed(1)
  const onTrack = benefitsC.items.filter((b) => b.status === 'On Track' || b.status === 'Realized').length
  const latestMonth = [...monthlyC.items].filter((m) => m.realizedCr !== undefined).slice(-1)[0]

  const [benefitEdit, setBenefitEdit] = useState<BenefitItem | null>(null)
  const [monthEdit, setMonthEdit] = useState<ValueMonth | null>(null)
  const [savingEdit, setSavingEdit] = useState<SavingsInitiative | null>(null)
  const [settingsEdit, setSettingsEdit] = useState(false)
  const [signOff, setSignOff] = useState<BenefitItem | null>(null)
  const newBenefit = (): BenefitItem => ({ id: uid('bn'), code: `B-${String(benefitsC.items.length + 1).padStart(3, '0')}`, benefitArea: view === 'All Benefit Areas' ? 'Cost Savings (Ops)' : (view as BenefitArea), lever: '', targetCr: 0, forecastCr: 0, realizedCr: 0, owner: 'L. Moreau', workstream: 'Finance & Procurement', status: 'Not Started', measurementMethod: '', baseline: '', frequency: 'Monthly', signedOff: false })
  const newSaving = (): SavingsInitiative => ({ id: uid('si'), initiative: '', category: 'Labour Arbitrage', annualisedSavingCr: 0, oneTimeCostCr: 0, start: TODAY, status: 'Planned', owner: 'V. Reddy' })

  const cumulativeData = useMemo(() => monthlyC.items.map((m) => ({ month: m.month, Target: disp(m.targetCr), Forecast: disp(m.forecastCr), Realized: m.realizedCr === undefined ? undefined : disp(m.realizedCr) })), [monthlyC.items, money.currency, money.rate]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader title="Value Realization" subtitle="Track business case benefits, cost savings and value delivered by the GCC." viewValue={view} viewOptions={VIEW_OPTIONS} onView={setView} onEdit={() => setSettingsEdit(true)} editLabel="Edit KPIs" />

      <div className="grid grid-cols-5 gap-4 mb-4">
        <KpiTile tone="navy" icon={<Target size={22} className="text-brand-600" />} value={fmt(k.targetBenefitsCr)} label="Target Benefits (Annual)" sub={<>Business case · {BENEFIT_AREAS.length} benefit areas</>} />
        <KpiTile tone="green" icon={<TrendingUp size={22} />} value={fmt(k.projectedBenefitsCr)} label="Projected Benefits" sub={<span className="text-green-600">{pct(k.projectedBenefitsCr, k.targetBenefitsCr)}% of target</span>} trend="up" />
        <KpiTile tone="teal" icon={<Coins size={22} />} value={fmt(realizedToDate)} label="Realized to Date" sub={<>{pct(realizedToDate, k.targetBenefitsCr)}% of target · as of {latestMonth?.month ?? 'Oct 26'}</>} />
        <KpiTile tone="blue" icon={<PiggyBank size={22} />} value={`${vs.runRateSavingsPct}%`} label="Cost Savings Run-rate" sub={<>vs <b>{vs.targetRunRateSavingsPct}%</b> target by Year 5</>} />
        <KpiTile tone="green" icon={<CheckCircle2 size={22} />} value={<>{onTrack} <span className="text-[16px] text-ink-500 font-semibold">of {benefitsC.items.length}</span></>} label="Benefits On Track" sub={<><span className="text-amber-600">{benefitsC.items.filter((b) => b.status === 'At Risk').length} At Risk</span> | <span className="text-red-600">{benefitsC.items.filter((b) => b.status === 'Delayed').length} Delayed</span></>} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-4" />

      {/* ============================ VALUE OVERVIEW ============================ */}
      {tab === 'Value Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1.5fr_1fr] gap-4">
            <Card title={`Cumulative Benefits (${money.unitLabel})`} subtitle="Target vs forecast vs realized · cumulative from Jan 2026" headerRight={<Legend items={[{ label: 'Target', color: CHART_COLORS.gray, dashed: true }, { label: 'Forecast', color: CHART_COLORS.blueLight }, { label: 'Realized', color: CHART_COLORS.green }]} />} action={<ViewAll label="Record month" onClick={() => setMonthEdit(latestMonth ?? monthlyC.items[0])} />}>
              <div className="h-[240px]">
                <ResponsiveContainer>
                  <ComposedChart data={cumulativeData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} interval={1} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${money.symbol} ${v} ${money.unit}`]} />
                    <Area isAnimationActive={false} type="monotone" dataKey="Realized" stroke={CHART_COLORS.green} fill={CHART_COLORS.green} fillOpacity={0.12} strokeWidth={2.5} dot={{ r: 2.5, fill: CHART_COLORS.green }} connectNulls={false} />
                    <Line isAnimationActive={false} type="monotone" dataKey="Forecast" stroke={CHART_COLORS.blueLight} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} type="monotone" dataKey="Target" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                    <ReferenceLine x="Oct 26" stroke="#CBD5E1" strokeDasharray="3 3" label={{ value: 'Today', position: 'top', fontSize: 10.5, fill: '#6B7280' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Benefits Realized vs Target">
              <div className="flex items-center gap-4">
                <Donut size={150} inner={0.72} data={[{ name: 'Realized', value: realizedToDate, color: CHART_COLORS.green }, { name: 'Forecast (remaining)', value: Math.max(0, totalForecast - realizedToDate), color: CHART_COLORS.blueLight }, { name: 'Gap to target', value: Math.max(0, totalTarget - totalForecast), color: '#E5E7EB' }]}
                  center={<><div className="text-[22px] font-bold text-ink-900 leading-none">{pct(realizedToDate, totalTarget)}%</div><div className="text-[11px] text-ink-500 mt-1">Realized</div></>} />
                <div className="flex-1 space-y-2.5 text-[12.5px]">
                  <div className="flex justify-between"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-600" />Realized</span><b>{fmt(realizedToDate)}</b></div>
                  <div className="flex justify-between"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS.blueLight }} />Forecast</span><b>{fmt(totalForecast)}</b></div>
                  <div className="flex justify-between"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-200" />Gap to target</span><b className="text-red-600">{fmt(+(totalTarget - totalForecast).toFixed(1))}</b></div>
                  <div className="flex justify-between border-t border-line pt-2"><span>Target (annual)</span><b>{fmt(totalTarget)}</b></div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-line grid grid-cols-3 gap-2 text-center">
                <div><div className="text-[11px] text-ink-500">Payback Period</div><div className="text-[15px] font-bold text-ink-900">{vs.paybackYears}</div></div>
                <div><div className="text-[11px] text-ink-500">Run-rate Benefits</div><div className="text-[15px] font-bold text-ink-900">{fmt(vs.annualRunRateBenefitsCr)}</div><div className="text-[10px] text-ink-500">from Year 4</div></div>
                <div><div className="text-[11px] text-ink-500">Target Cost Savings</div><div className="text-[15px] font-bold text-ink-900">{vs.targetRunRateSavingsPct}%</div><div className="text-[10px] text-ink-500">run-rate</div></div>
              </div>
              <button className="link mt-2 inline-flex items-center gap-1" onClick={() => setSettingsEdit(true)}><Pencil size={12} /> Edit business-case assumptions</button>
            </Card>
          </div>

          <div className="grid grid-cols-[1.5fr_1fr] gap-4">
            <Card title="Benefit Realization Tracking" action={<ViewAll onClick={() => setTab('Benefits Register')} />}>
              <table className="w-full border-separate border-spacing-0 tbl">
                <thead><tr><th className="th">Benefit Area</th><th className="th text-right">Target ({money.unitLabel})</th><th className="th text-right">Forecast ({money.unitLabel})</th><th className="th text-right">Realized ({money.unitLabel})</th><th className="th w-[150px]">Progress</th><th className="th">Status</th></tr></thead>
                <tbody>
                  {areaRows.map((r) => (
                    <tr key={r.area} className="cursor-pointer hover:bg-brand-50/60" onClick={() => { setView(r.area); setTab('Benefits Register') }}>
                      <td className="td font-medium whitespace-nowrap"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: BENEFIT_COLORS[r.area] }} />{r.area}</span></td>
                      <td className="td text-right">{money.num(r.target)}</td><td className="td text-right">{money.num(r.forecast)}</td><td className="td text-right">{money.num(r.realized)}</td>
                      <td className="td"><div className="flex items-center gap-2"><Progress value={r.progress} className="flex-1" color={STATUS_COLOR[r.status]} /><span className="w-9 text-right text-[12px] font-medium">{r.progress}%</span></div></td>
                      <td className="td"><Badge value={r.status} /></td>
                    </tr>
                  ))}
                  <tr className="font-semibold"><td className="td">Total</td><td className="td text-right">{money.num(totalTarget)}</td><td className="td text-right">{money.num(totalForecast)}</td><td className="td text-right">{money.num(realizedToDate)}</td><td className="td"><div className="flex items-center gap-2"><Progress value={pct(totalForecast, totalTarget)} className="flex-1" color={CHART_COLORS.blue} /><span className="w-9 text-right text-[12px]">{pct(totalForecast, totalTarget)}%</span></div></td><td className="td" /></tr>
                </tbody>
              </table>
            </Card>
            <Card title={`Benefits by Area (${money.unitLabel})`} headerRight={<Legend items={[{ label: 'Target', color: CHART_COLORS.blueFaint }, { label: 'Forecast', color: CHART_COLORS.blue }, { label: 'Realized', color: CHART_COLORS.green }]} />}>
              <div className="h-[230px]">
                <ResponsiveContainer>
                  <BarChart data={areaRows.map((r) => ({ name: r.area.replace(' (Ops)', ''), Target: disp(r.target), Forecast: disp(r.forecast), Realized: disp(r.realized) }))} margin={{ top: 14, right: 4, left: -24, bottom: 0 }} barGap={2} barCategoryGap="25%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10.5 }} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`${money.symbol} ${v} ${money.unit}`]} />
                    <Bar isAnimationActive={false} dataKey="Target" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]} />
                    <Bar isAnimationActive={false} dataKey="Forecast" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]}><LabelList dataKey="Forecast" position="top" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
                    <Bar isAnimationActive={false} dataKey="Realized" fill={CHART_COLORS.green} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card title="Top Levers by Forecast">
              <BarList labelWidth={190} rows={[...benefitsC.items].sort((a, b) => b.forecastCr - a.forecastCr).slice(0, 6).map((b) => ({ label: b.lever, value: b.forecastCr, color: BENEFIT_COLORS[b.benefitArea], right: fmt(b.forecastCr) }))} />
            </Card>
            <Card title="Run-rate Savings Trajectory" headerRight={<Legend items={[{ label: 'Target', color: CHART_COLORS.blueFaint }, { label: 'Actual', color: CHART_COLORS.blue }]} />}>
              <div className="h-[170px]">
                <ResponsiveContainer>
                  <BarChart data={RUNRATE.map((r, i) => ({ ...r, actual: i === 0 ? vs.runRateSavingsPct : undefined, target: i === RUNRATE.length - 1 ? vs.targetRunRateSavingsPct : r.target }))} margin={{ top: 14, right: 4, left: -24, bottom: 0 }} barGap={2}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} unit="%" />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`${v}%`]} />
                    <Bar isAnimationActive={false} dataKey="target" name="Target" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]}><LabelList dataKey="target" position="top" formatter={(v: unknown) => `${v}%`} style={{ fontSize: 10.5, fill: '#374151' }} /></Bar>
                    <Bar isAnimationActive={false} dataKey="actual" name="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]}><LabelList dataKey="actual" position="top" formatter={(v: unknown) => `${v}%`} style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title={<span className="inline-flex items-center gap-1.5"><span className="text-violet-500">✦</span> Value Insights</span>}>
              <div className="space-y-3 text-[12.5px] text-ink-900 leading-snug">
                <div className="flex gap-2.5"><span className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0"><TrendingUp size={16} className="text-green-600" /></span><div>Program remains on track to achieve {vs.runRateSavingsPct}% cost savings as per business case; {fmt(realizedToDate)} realized to date.</div></div>
                <div className="flex gap-2.5"><span className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0"><Target size={16} className="text-amber-500" /></span><div>Productivity Gains forecast at {areaRows[1]?.progress}% of target – driven by Wave 2 hiring shortfall and KT delays.</div></div>
                <div className="flex gap-2.5"><span className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0"><CheckCheck size={16} className="text-brand-600" /></span><div>{benefitsC.items.filter((b) => b.signedOff).length} of {benefitsC.items.length} benefits signed off by owners; {benefitsC.items.filter((b) => !b.signedOff && b.realizedCr > 0).length} realized benefits await sign-off.</div></div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============================ BENEFITS REGISTER ============================ */}
      {tab === 'Benefits Register' && (
        <Card title="Benefits Register" subtitle={`${benefits.length} benefits · target ${fmt(sum(benefits, 'targetCr'))} · forecast ${fmt(sum(benefits, 'forecastCr'))} · realized ${fmt(sum(benefits, 'realizedCr'))}`} action={<button className="btn-primary" onClick={() => setBenefitEdit(newBenefit())}><Plus size={14} /> Add Benefit</button>}>
          <Table<BenefitItem> rows={benefits} onRowClick={setBenefitEdit} columns={[
            { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
            { key: 'benefitArea', header: 'Benefit Area', render: (b) => <span className="inline-flex items-center gap-2 whitespace-nowrap"><span className="w-2.5 h-2.5 rounded-full" style={{ background: BENEFIT_COLORS[b.benefitArea] }} />{b.benefitArea}</span> },
            { key: 'lever', header: 'Lever', render: (b) => <div><div className="font-medium max-w-[185px] truncate" title={b.lever}>{b.lever}</div><div className="text-[11.5px] text-ink-500 max-w-[185px] truncate" title={b.measurementMethod}>{b.measurementMethod}</div></div> },
            { key: 'targetCr', header: 'Target', render: (b) => fmt(b.targetCr), className: 'text-right whitespace-nowrap' },
            { key: 'forecastCr', header: 'Forecast', render: (b) => fmt(b.forecastCr), className: 'text-right whitespace-nowrap' },
            { key: 'realizedCr', header: 'Realized', render: (b) => <span className="text-green-700 font-medium">{fmt(b.realizedCr)}</span>, className: 'text-right whitespace-nowrap' },
            { key: 'p', header: 'Forecast %', render: (b) => <div className="flex items-center gap-2 w-[92px]"><Progress value={pct(b.forecastCr, b.targetCr)} className="flex-1" color={STATUS_COLOR[b.status]} /><span className="text-[11.5px] w-8 text-right">{pct(b.forecastCr, b.targetCr)}%</span></div> },
            { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
            { key: 'workstream', header: 'Workstream', render: (b) => WORKSTREAM_META[b.workstream].short },
            { key: 'frequency', header: 'Frequency' },
            { key: 'status', header: 'Status', render: (b) => <Badge value={b.status === 'Realized' ? 'Completed' : b.status} /> },
            { key: 'signedOff', header: 'Sign-off', render: (b) => b.signedOff ? <span className="inline-flex items-center gap-1 text-green-700 text-[12px]"><CheckCircle2 size={13} /> Signed</span> : <button className="link" onClick={(e) => { e.stopPropagation(); setSignOff(b) }}>Sign off</button> },
          ]} />
        </Card>
      )}

      {/* ============================ COST SAVINGS ============================ */}
      {tab === 'Cost Savings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1.4fr_1fr] gap-4">
            <Card title={`Cost Build – Onshore Baseline to GCC Run Cost (${money.unitLabel}, steady state)`} subtitle={`${vs.targetRunRateSavingsPct}% target cost savings · ${fmt(vs.baselineCostCr - vs.gccRunCostCr, money.currency === 'INR' ? 0 : 1)} annual saving at Year 4`}>
              <WaterfallChart baselineCr={vs.baselineCostCr} gccCr={vs.gccRunCostCr} money={money} />
            </Card>
            <Card title="Savings Run-rate">
              <div className="flex items-center gap-5">
                <Ring value={Math.round((vs.runRateSavingsPct / vs.targetRunRateSavingsPct) * 100)} size={110} stroke={10} color={CHART_COLORS.blue} label={<div className="text-center"><div className="text-[20px] font-bold text-ink-900 leading-none">{vs.runRateSavingsPct}%</div><div className="text-[10px] text-ink-500 mt-0.5">of {vs.targetRunRateSavingsPct}%</div></div>} />
                <div className="flex-1">
                  <Stat label="Current run-rate savings" value={`${vs.runRateSavingsPct}%`} />
                  <Stat label="Target by Year 5" value={`${vs.targetRunRateSavingsPct}%`} />
                  <Stat label="Onshore baseline cost" value={fmt(vs.baselineCostCr)} />
                  <Stat label="GCC run cost (Year 4)" value={fmt(vs.gccRunCostCr)} />
                  <Stat label="Annualised savings (initiatives)" value={fmt(+savingsC.items.reduce((s, i) => s + i.annualisedSavingCr, 0).toFixed(1))} />
                </div>
              </div>
              <SectionTitle>Savings by Category</SectionTitle>
              <BarList labelWidth={120} rows={(['Labour Arbitrage', 'Vendor', 'Real Estate', 'Automation', 'Process'] as const).map((c, i) => ({ label: c, value: +savingsC.items.filter((s) => s.category === c).reduce((a, s) => a + s.annualisedSavingCr, 0).toFixed(1), color: [CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.amber, CHART_COLORS.violet, CHART_COLORS.blueLight][i] })).filter((r) => r.value > 0)} valueFmt={(v) => fmt(v)} />
            </Card>
          </div>
          <Card title="Cost Savings Initiatives" subtitle={`${savingsC.items.length} initiatives · ${savingsC.items.filter((s) => s.status === 'Realized').length} realized · ${savingsC.items.filter((s) => s.status === 'At Risk').length} at risk`} action={<button className="btn-primary" onClick={() => setSavingEdit(newSaving())}><Plus size={14} /> Add Initiative</button>}>
            <Table<SavingsInitiative> rows={[...savingsC.items].sort((a, b) => a.start.localeCompare(b.start))} onRowClick={setSavingEdit} columns={[
              { key: 'initiative', header: 'Initiative', render: (s) => <span className="font-medium">{s.initiative}</span> },
              { key: 'category', header: 'Category' },
              { key: 'annualisedSavingCr', header: 'Annualised Saving', render: (s) => <span className="text-green-700 font-medium">{fmt(s.annualisedSavingCr)}</span>, className: 'text-right' },
              { key: 'oneTimeCostCr', header: 'One-time Cost', render: (s) => fmt(s.oneTimeCostCr), className: 'text-right' },
              { key: 'payback', header: 'Payback', render: (s) => s.annualisedSavingCr > 0 ? `${Math.max(1, Math.round((s.oneTimeCostCr / s.annualisedSavingCr) * 12))} months` : '—' },
              { key: 'start', header: 'Start', render: (s) => fmtDate(s.start) },
              { key: 'owner', header: 'Owner' },
              { key: 'status', header: 'Status', render: (s) => <Badge value={s.status === 'Realized' ? 'Completed' : s.status === 'Planned' ? 'Not Started' : s.status} /> },
            ]} />
          </Card>
        </div>
      )}

      {/* ============================ PRODUCTIVITY & QUALITY ============================ */}
      {tab === 'Productivity & Quality' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {areaRows.filter((r) => r.area !== 'Cost Savings (Ops)').map((r) => (
              <Card key={r.area} title={r.area} action={<Badge value={r.status} />}>
                <div className="flex items-center gap-4">
                  <Ring value={r.progress} size={84} stroke={9} color={BENEFIT_COLORS[r.area]} label={<span className="text-[15px] font-bold" style={{ color: BENEFIT_COLORS[r.area] }}>{r.progress}%</span>} />
                  <div className="flex-1">
                    <Stat label="Target" value={fmt(r.target)} /><Stat label="Forecast" value={fmt(r.forecast)} /><Stat label="Realized" value={<span className="text-green-700">{fmt(r.realized)}</span>} /><Stat label="Levers" value={r.count} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-[1.6fr_1fr] gap-4">
            <Card title="Non-financial Benefit Levers" subtitle="Productivity, quality and time-to-market levers with measurement baselines" action={<button className="btn-primary" onClick={() => setBenefitEdit({ ...newBenefit(), benefitArea: 'Productivity Gains' })}><Plus size={14} /> Add Lever</button>}>
              <Table<BenefitItem> compact rows={benefitsC.items.filter((b) => b.benefitArea !== 'Cost Savings (Ops)')} onRowClick={setBenefitEdit} columns={[
                { key: 'lever', header: 'Lever', render: (b) => <div><div className="font-medium min-w-[180px] max-w-[230px] truncate" title={b.lever}>{b.lever}</div><div className="text-[11.5px] text-ink-500">{b.benefitArea}</div></div> },
                { key: 'baseline', header: 'Baseline', render: (b) => <span className="block max-w-[115px] truncate" title={moneyText(b.baseline, money)}>{moneyText(b.baseline, money)}</span> },
                { key: 'measurementMethod', header: 'Measurement', render: (b) => <span className="block max-w-[130px] truncate" title={b.measurementMethod}>{b.measurementMethod}</span> },
                { key: 'forecastCr', header: 'Forecast', render: (b) => fmt(b.forecastCr), className: 'text-right whitespace-nowrap' },
                { key: 'status', header: 'Status', render: (b) => <Badge value={b.status} /> },
              ]} />
            </Card>
            <Card title="Operational KPIs behind the Benefits" subtitle="Current vs baseline · editable through the lever's baseline field">
              <div className="space-y-3">
                {[
                  { kpi: 'Transactions per FTE / month', base: 1850, cur: 2140, tgt: 2400, unit: '' },
                  { kpi: 'Manual reporting hours / month', base: 2400, cur: 1650, tgt: 900, unit: 'h', lowerBetter: true },
                  { kpi: 'Finance close rework rate', base: 12, cur: 8.5, tgt: 5, unit: '%', lowerBetter: true },
                  { kpi: 'SLA adherence', base: 91, cur: 95.5, tgt: 98, unit: '%' },
                  { kpi: 'Release cycle (weeks)', base: 14, cur: 11, tgt: 8, unit: 'w', lowerBetter: true },
                  { kpi: 'Overtime cost / month', base: 9.2, cur: 6.8, tgt: 3.5, unit: '', lowerBetter: true, fmtV: (v: number) => money.fmtLakh(v) },
                ].map((r) => {
                  const prog = r.lowerBetter ? pct(r.base - r.cur, r.base - r.tgt) : pct(r.cur - r.base, r.tgt - r.base)
                  const fv = (v: number) => (r.fmtV ? r.fmtV(v) : `${v}${r.unit}`)
                  return (
                    <div key={r.kpi} className="text-[12.5px]">
                      <div className="flex justify-between mb-1"><span className="text-ink-700">{r.kpi}</span><span className="text-ink-500">Baseline {fv(r.base)} → <b className="text-ink-900">{fv(r.cur)}</b> · target {fv(r.tgt)}</span></div>
                      <div className="flex items-center gap-2"><Progress value={prog} className="flex-1" color={prog >= 60 ? CHART_COLORS.green : prog >= 35 ? CHART_COLORS.amber : CHART_COLORS.red} /><span className="w-9 text-right font-medium">{Math.min(100, prog)}%</span></div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============================ VALUE FORECAST ============================ */}
      {tab === 'Value Forecast' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1.4fr_1fr] gap-4">
            <Card title={`Payback – Investment vs Benefits by Year (${money.unitLabel})`} subtitle={`Payback ${vs.paybackYears} · investment ${fmt(vs.totalInvestmentCr)} · ${fmt(vs.annualRunRateBenefitsCr)} run-rate from Year 4`} headerRight={<Legend items={[{ label: 'Investment', color: CHART_COLORS.red }, { label: 'Benefits', color: CHART_COLORS.green }, { label: 'Cumulative net', color: CHART_COLORS.blue }]} />}>
              <div className="h-[250px]">
                <ResponsiveContainer>
                  <ComposedChart data={PAYBACK.reduce<{ year: string; Investment: number; Benefits: number; 'Cumulative net': number }[]>((acc, p) => { const prev = acc.length ? acc[acc.length - 1]['Cumulative net'] : 0; acc.push({ year: p.year, Investment: disp(p.investment), Benefits: disp(p.benefits), 'Cumulative net': +(prev + disp(p.benefits) - disp(p.investment)).toFixed(money.digits) }); return acc }, [])} margin={{ top: 14, right: 8, left: -18, bottom: 0 }} barGap={2}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`${money.symbol} ${v} ${money.unit}`]} />
                    <Bar isAnimationActive={false} dataKey="Investment" fill={CHART_COLORS.red} radius={[3, 3, 0, 0]} barSize={26} />
                    <Bar isAnimationActive={false} dataKey="Benefits" fill={CHART_COLORS.green} radius={[3, 3, 0, 0]} barSize={26}><LabelList dataKey="Benefits" position="top" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
                    <Line isAnimationActive={false} type="monotone" dataKey="Cumulative net" stroke={CHART_COLORS.blue} strokeWidth={2.5} dot={{ r: 3.5, fill: CHART_COLORS.blue }} />
                    <ReferenceLine y={0} stroke="#94A3B8" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Forecast Scenarios (annual benefits at steady state)">
              {[
                { name: 'Business case', value: k.targetBenefitsCr, color: CHART_COLORS.blueFaint, note: 'Approved target' },
                { name: 'Current forecast', value: k.projectedBenefitsCr, color: CHART_COLORS.blue, note: `${pct(k.projectedBenefitsCr, k.targetBenefitsCr)}% of target` },
                { name: 'Upside (Wave 3 on time)', value: +(k.projectedBenefitsCr + 1.4).toFixed(1), color: CHART_COLORS.green, note: 'CR-006 rejected, hiring recovered' },
                { name: 'Downside (3-month slip)', value: +(k.projectedBenefitsCr - 1.9).toFixed(1), color: CHART_COLORS.red, note: 'Go-live slips to Feb 2027' },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-3 py-2 text-[12.5px] border-b border-line/70 last:border-b-0">
                  <span className="w-[150px] text-ink-700">{s.name}</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (s.value / k.targetBenefitsCr) * 100)}%`, background: s.color }} /></div>
                  <span className="w-16 text-right font-semibold">{fmt(s.value)}</span>
                  <span className="w-[150px] text-[11.5px] text-ink-500 truncate">{s.note}</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-line text-[12px] text-ink-500">Projected benefits are editable on the Dashboard (Update program KPIs). Scenario deltas derive from open change requests and the transition plan.</div>
            </Card>
          </div>
          <Card title={`Monthly Value Tracking (cumulative ${money.unitLabel})`} subtitle="Click a month to record realized value" action={<button className="btn-primary" onClick={() => setMonthEdit(latestMonth ?? monthlyC.items[0])}><PenLine size={14} /> Record Realized Value</button>}>
            <Table<ValueMonth> compact rows={monthlyC.items} onRowClick={setMonthEdit} columns={[
              { key: 'month', header: 'Month', render: (m) => <span className="font-medium">{m.month}</span> },
              { key: 'targetCr', header: 'Target', render: (m) => money.num(m.targetCr), className: 'text-right' },
              { key: 'forecastCr', header: 'Forecast', render: (m) => money.num(m.forecastCr), className: 'text-right' },
              { key: 'realizedCr', header: 'Realized', render: (m) => m.realizedCr !== undefined ? <span className="text-green-700 font-medium">{money.num(m.realizedCr)}</span> : <span className="text-ink-400">—</span>, className: 'text-right' },
              { key: 'var', header: 'Variance vs Target', render: (m) => m.realizedCr !== undefined ? <span className={m.realizedCr >= m.targetCr ? 'text-green-700' : 'text-red-600'}>{money.signed(m.realizedCr - m.targetCr)}</span> : <span className="text-ink-400">—</span>, className: 'text-right' },
              { key: 'att', header: 'Attainment', render: (m) => <div className="flex items-center gap-2 w-[160px]"><Progress value={pct(m.realizedCr ?? m.forecastCr, m.targetCr)} className="flex-1" color={m.realizedCr !== undefined ? CHART_COLORS.green : CHART_COLORS.blueFaint} /><span className="w-9 text-right text-[11.5px]">{pct(m.realizedCr ?? m.forecastCr, m.targetCr)}%</span></div> },
            ]} />
          </Card>
        </div>
      )}

      {/* ============================ BENEFIT OWNERS & SIGN-OFF ============================ */}
      {tab === 'Benefit Owners & Sign-off' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_1.6fr] gap-4">
            <Card title="Sign-off Status">
              <div className="flex items-center gap-4">
                <Donut size={140} data={[{ name: 'Signed off', value: benefitsC.items.filter((b) => b.signedOff).length, color: CHART_COLORS.green }, { name: 'Awaiting sign-off', value: benefitsC.items.filter((b) => !b.signedOff && b.realizedCr > 0).length, color: CHART_COLORS.amber }, { name: 'Not yet realized', value: benefitsC.items.filter((b) => !b.signedOff && b.realizedCr === 0).length, color: CHART_COLORS.gray }]}
                  center={<><div className="text-[22px] font-bold text-ink-900 leading-none">{benefitsC.items.filter((b) => b.signedOff).length}/{benefitsC.items.length}</div><div className="text-[11px] text-ink-500 mt-1">Signed off</div></>} />
                <div className="flex-1 space-y-1.5 text-[12.5px]">
                  <div className="flex justify-between"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-600" />Signed off</span><b>{benefitsC.items.filter((b) => b.signedOff).length}</b></div>
                  <div className="flex justify-between"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Awaiting sign-off</span><b>{benefitsC.items.filter((b) => !b.signedOff && b.realizedCr > 0).length}</b></div>
                  <div className="flex justify-between"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" />Not yet realized</span><b>{benefitsC.items.filter((b) => !b.signedOff && b.realizedCr === 0).length}</b></div>
                  <div className="flex justify-between border-t border-line pt-1.5"><span>Signed-off value</span><b className="text-green-700">{fmt(sum(benefitsC.items.filter((b) => b.signedOff), 'realizedCr'))}</b></div>
                </div>
              </div>
            </Card>
            <Card title="Benefit Owners" subtitle="Accountability for target, forecast and realized value">
              <Table<{ id: string; owner: string; n: number; target: number; forecast: number; realized: number; signed: number }> compact rows={Object.values(benefitsC.items.reduce<Record<string, { id: string; owner: string; n: number; target: number; forecast: number; realized: number; signed: number }>>((acc, b) => { const o = (acc[b.owner] ??= { id: b.owner, owner: b.owner, n: 0, target: 0, forecast: 0, realized: 0, signed: 0 }); o.n++; o.target += b.targetCr; o.forecast += b.forecastCr; o.realized += b.realizedCr; o.signed += b.signedOff ? 1 : 0; return acc }, {})).sort((a, b) => b.target - a.target)} columns={[
                { key: 'owner', header: 'Owner', render: (o) => <span className="font-medium">{o.owner}</span> },
                { key: 'n', header: 'Benefits', className: 'text-right' },
                { key: 'target', header: 'Target', render: (o) => fmt(o.target), className: 'text-right' },
                { key: 'forecast', header: 'Forecast', render: (o) => fmt(o.forecast), className: 'text-right' },
                { key: 'realized', header: 'Realized', render: (o) => <span className="text-green-700">{fmt(o.realized)}</span>, className: 'text-right' },
                { key: 'signed', header: 'Signed off', render: (o) => `${o.signed} / ${o.n}`, className: 'text-right' },
                { key: 'att', header: 'Forecast attainment', render: (o) => <div className="flex items-center gap-2 w-[130px]"><Progress value={pct(o.forecast, o.target)} className="flex-1" /><span className="w-9 text-right text-[11.5px]">{pct(o.forecast, o.target)}%</span></div> },
              ]} />
            </Card>
          </div>
          <Card title="Benefit Sign-off Register" subtitle="Owners confirm realized value with evidence; signed-off benefits are locked against the business case">
            <Table<BenefitItem> rows={[...benefitsC.items].sort((a, b) => (a.signedOff ? 1 : 0) - (b.signedOff ? 1 : 0) || b.realizedCr - a.realizedCr)} onRowClick={setBenefitEdit} columns={[
              { key: 'code', header: 'ID', className: 'text-ink-500' },
              { key: 'lever', header: 'Benefit', render: (b) => <div><div className="font-medium">{b.lever}</div><div className="text-[11.5px] text-ink-500">{b.benefitArea}</div></div> },
              { key: 'owner', header: 'Benefit Owner' },
              { key: 'measurementMethod', header: 'Measurement Method', render: (b) => <span className="block max-w-[220px] truncate" title={b.measurementMethod}>{b.measurementMethod}</span> },
              { key: 'realizedCr', header: 'Realized', render: (b) => <span className="text-green-700 font-medium">{fmt(b.realizedCr)}</span>, className: 'text-right' },
              { key: 'signedOffBy', header: 'Signed off by', render: (b) => b.signedOff ? `${b.signedOffBy} · ${fmtDate(b.signedOffOn ?? '')}` : <span className="text-ink-400">—</span> },
              { key: 'signedOff', header: 'Sign-off', render: (b) => b.signedOff ? <Badge value="Approved" /> : b.realizedCr > 0 ? <Badge value="Pending" /> : <Badge value="Not Started" /> },
              { key: 'x', header: '', render: (b) => b.signedOff ? <button className="link" onClick={(e) => { e.stopPropagation(); benefitsC.update({ ...b, signedOff: false, signedOffBy: undefined, signedOffOn: undefined }) }}>Revoke</button> : <button className="btn-secondary !py-1" onClick={(e) => { e.stopPropagation(); setSignOff(b) }}><CheckCheck size={13} /> Sign off</button> },
            ]} />
          </Card>
        </div>
      )}

      {/* ============================ MODALS ============================ */}
      {benefitEdit && <BenefitModal key={benefitEdit.id} value={benefitEdit} isNew={!benefitsC.items.some((b) => b.id === benefitEdit.id)} onClose={() => setBenefitEdit(null)} onSave={(v) => { benefitsC.update(v); setBenefitEdit(null) }} onDelete={() => { benefitsC.remove(benefitEdit.id); setBenefitEdit(null) }} />}
      {monthEdit && <MonthModal key={monthEdit.id} value={monthEdit} months={monthlyC.items} onClose={() => setMonthEdit(null)} onSave={(v) => { monthlyC.update(v); setMonthEdit(null) }} />}
      {savingEdit && <SavingModal key={savingEdit.id} value={savingEdit} isNew={!savingsC.items.some((s) => s.id === savingEdit.id)} onClose={() => setSavingEdit(null)} onSave={(v) => { savingsC.update(v); setSavingEdit(null) }} onDelete={() => { savingsC.remove(savingEdit.id); setSavingEdit(null) }} />}
      {settingsEdit && <SettingsModal value={vs} onClose={() => setSettingsEdit(false)} onSave={(v) => { settingsC.update(v); setSettingsEdit(false) }} />}
      {signOff && <SignOffModal key={signOff.id} value={signOff} onClose={() => setSignOff(null)} onSave={(v) => { benefitsC.update(v); setSignOff(null) }} />}
    </div>
  )
}

/* ================= Input view ================= */
const BENEFIT_STATUSES: BenefitStatus[] = ['On Track', 'At Risk', 'Delayed', 'Realized', 'Not Started']
const FREQUENCIES = ['Monthly', 'Quarterly', 'Annually'] as const
const SAVING_CATEGORIES = ['Labour Arbitrage', 'Vendor', 'Real Estate', 'Automation', 'Process'] as const
const SAVING_STATUSES = ['Planned', 'In Progress', 'Realized', 'At Risk'] as const

function ValueInput() {
  const money = useMoney()
  const u = money.unitLabel
  return (
    <InputLayout
      title="Value Realization"
      subtitle={`Maintain the benefits register, monthly value tracking, savings initiatives and business-case assumptions. Amounts are entered in ${u}.`}
      tabs={[
        { name: 'Benefits register', hint: `One row per benefit lever: annual target, current forecast and realized value to date (${u}), with owner, workstream, status and how it is measured. Sign-off is done on the Output view.`, content: <BenefitRegisterGrid /> },
        { name: 'Monthly value tracking', hint: `Cumulative target, forecast and realized benefits per month (${u}). Leave Realized empty for months not yet reported.`, content: <ValueMonthGrid /> },
        { name: 'Savings initiatives', hint: `Cost-savings initiatives with annualised saving and one-time cost (${u}); payback is derived.`, content: <SavingsGrid /> },
        { name: 'Settings & assumptions', hint: 'Business-case assumptions behind the value dashboards. Target and projected benefits (program KPIs) are maintained on the Dashboard in GCC Setup.', content: <ValueSettingsForm /> },
      ]}
    />
  )
}

function BenefitRegisterGrid() {
  const money = useMoney()
  const { items, add, update, remove } = useCollection<BenefitItem>('benefitItems', seedBenefitItems)
  const set = <K extends keyof BenefitItem>(b: BenefitItem, k: K, v: BenefitItem[K]) => update({ ...b, [k]: v })
  const tot = (k: 'targetCr' | 'forecastCr' | 'realizedCr') => +items.reduce((s, b) => s + b[k], 0).toFixed(2)
  const blank = (): BenefitItem => ({ id: uid('bn'), code: `B-${String(items.length + 1).padStart(3, '0')}`, benefitArea: 'Cost Savings (Ops)', lever: 'New benefit lever', targetCr: 0, forecastCr: 0, realizedCr: 0, owner: '', workstream: 'Finance & Procurement', status: 'Not Started', measurementMethod: '', baseline: '', frequency: 'Monthly', signedOff: false })
  return (
    <Card title={`Benefits register (${money.unitLabel})`} subtitle={`${items.length} benefits · target ${money.fmt(tot('targetCr'))} · forecast ${money.fmt(tot('forecastCr'))} · realized ${money.fmt(tot('realizedCr'))}`} action={<AddButton onClick={() => add(blank())}>Add benefit</AddButton>}>
      <Grid minWidth={1720}>
        <GridHead cols={['ID', 'Benefit area', 'Lever', 'Target', 'Forecast', 'Realized', 'Forecast %', 'Owner', 'Workstream', 'Status', 'Measurement method', 'Baseline', 'Frequency', 'Sign-off', '']} right={[3, 4, 5, 6]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={15} />}
          {items.map((b) => (
            <tr key={b.id} className="hover:bg-brand-50/40">
              <td className={clsx(gtd, 'min-w-[80px]')}><GridText value={b.code} onChange={(x) => set(b, 'code', x)} className="text-ink-500" /></td>
              <td className={clsx(gtd, 'min-w-[170px]')}><GridSelect value={b.benefitArea} options={BENEFIT_AREAS} onChange={(x) => set(b, 'benefitArea', x)} /></td>
              <td className={clsx(gtd, 'min-w-[230px]')}><GridText bold value={b.lever} placeholder="e.g. Labour arbitrage – Finance operations" onChange={(x) => set(b, 'lever', x)} /></td>
              <td className={gtd}><GridMoney cr={b.targetCr} onChange={(x) => set(b, 'targetCr', x ?? 0)} className="ml-auto" /></td>
              <td className={gtd}><GridMoney cr={b.forecastCr} onChange={(x) => set(b, 'forecastCr', x ?? 0)} className="ml-auto" /></td>
              <td className={gtd}><GridMoney cr={b.realizedCr} onChange={(x) => set(b, 'realizedCr', x ?? 0)} className="ml-auto text-green-700" /></td>
              <td className={clsx(gtd, 'text-right text-[12px] px-2 text-ink-500 tabular-nums')}>{pct(b.forecastCr, b.targetCr)}%</td>
              <td className={clsx(gtd, 'min-w-[120px]')}><GridText value={b.owner} placeholder="Owner" onChange={(x) => set(b, 'owner', x)} /></td>
              <td className={clsx(gtd, 'min-w-[200px]')}><GridSelect value={b.workstream} options={WORKSTREAMS} onChange={(x) => set(b, 'workstream', x)} /></td>
              <td className={clsx(gtd, 'min-w-[120px]')}><GridSelect value={b.status} options={BENEFIT_STATUSES} onChange={(x) => set(b, 'status', x)} /></td>
              <td className={clsx(gtd, 'min-w-[220px]')}><GridText value={b.measurementMethod} placeholder="How the benefit is measured" onChange={(x) => set(b, 'measurementMethod', x)} /></td>
              <td className={clsx(gtd, 'min-w-[170px]')}><GridText value={b.baseline} placeholder="Baseline" onChange={(x) => set(b, 'baseline', x)} /></td>
              <td className={clsx(gtd, 'min-w-[105px]')}><GridSelect value={b.frequency} options={FREQUENCIES} onChange={(x) => set(b, 'frequency', x)} /></td>
              <td className={clsx(gtd, 'px-2 whitespace-nowrap text-[11.5px]')}>{b.signedOff ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={13} /> {b.signedOffBy}</span> : <span className="text-ink-400">—</span>}</td>
              <td className={gtd}><GridRemove label={b.lever} onClick={() => remove(b.id)} /></td>
            </tr>
          ))}
          {items.length > 0 && <tr><td colSpan={3} className="text-right text-[12px] text-ink-500 px-2 py-2">Total</td><GridTotal cr={tot('targetCr')} /><GridTotal cr={tot('forecastCr')} /><GridTotal cr={tot('realizedCr')} className="text-green-700" /><td className={clsx(gtotal, 'text-ink-500 font-normal text-[12px]')}>{pct(tot('forecastCr'), tot('targetCr'))}%</td><td colSpan={8} /></tr>}
        </tbody>
      </Grid>
    </Card>
  )
}

function ValueMonthGrid() {
  const money = useMoney()
  const { items, add, update, remove } = useCollection<ValueMonth>('valueMonthly', seedValueMonthly)
  const set = <K extends keyof ValueMonth>(r: ValueMonth, k: K, v: ValueMonth[K]) => update({ ...r, [k]: v })
  return (
    <Card title={`Monthly value tracking (cumulative ${money.unitLabel})`} subtitle="Values are cumulative from January 2026. Realized stays empty for future months and drives the 'Realized to Date' tile once recorded." action={<AddButton onClick={() => add({ id: uid('vm'), month: '', targetCr: 0, forecastCr: 0 })}>Add month</AddButton>}>
      <Grid minWidth={640}>
        <GridHead cols={['Month', 'Target', 'Forecast', 'Realized', 'Variance vs target', 'Attainment', '']} right={[1, 2, 3, 4, 5]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={7} />}
          {items.map((r) => {
            const rec = r.realizedCr !== undefined
            const att = pct(r.realizedCr ?? r.forecastCr, r.targetCr)
            return (
              <tr key={r.id} className="hover:bg-brand-50/40">
                <td className={clsx(gtd, 'min-w-[110px]')}><GridText bold value={r.month} placeholder="e.g. Sep 27" onChange={(x) => set(r, 'month', x)} /></td>
                <td className={gtd}><GridMoney cr={r.targetCr} onChange={(x) => set(r, 'targetCr', x ?? 0)} className="ml-auto" /></td>
                <td className={gtd}><GridMoney cr={r.forecastCr} onChange={(x) => set(r, 'forecastCr', x ?? 0)} className="ml-auto" /></td>
                <td className={gtd}><GridMoney nullable cr={r.realizedCr ?? null} onChange={(x) => set(r, 'realizedCr', x == null ? undefined : x)} className={clsx('ml-auto', rec && 'text-green-700 font-medium')} /></td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 tabular-nums', !rec ? 'text-ink-400' : r.realizedCr! >= r.targetCr ? 'text-green-700' : 'text-red-600')}>{rec ? money.signed(+(r.realizedCr! - r.targetCr).toFixed(3)) : '—'}</td>
                <td className={clsx(gtd, 'text-right text-[12px] px-2 tabular-nums', rec ? 'text-ink-900' : 'text-ink-400')}>{att}%{!rec && ' (fcst)'}</td>
                <td className={gtd}><GridRemove label={r.month || 'this month'} onClick={() => remove(r.id)} /></td>
              </tr>
            )
          })}
        </tbody>
      </Grid>
    </Card>
  )
}

function SavingsGrid() {
  const money = useMoney()
  const { items, add, update, remove } = useCollection<SavingsInitiative>('savingsInitiatives', seedSavingsInitiatives)
  const set = <K extends keyof SavingsInitiative>(r: SavingsInitiative, k: K, v: SavingsInitiative[K]) => update({ ...r, [k]: v })
  const tS = +items.reduce((s, i) => s + i.annualisedSavingCr, 0).toFixed(2), tC = +items.reduce((s, i) => s + i.oneTimeCostCr, 0).toFixed(2)
  return (
    <Card title={`Cost savings initiatives (${money.unitLabel})`} subtitle={`${items.length} initiatives · ${money.fmt(tS)} annualised savings · ${money.fmt(tC)} one-time cost`} action={<AddButton onClick={() => add({ id: uid('si'), initiative: 'New initiative', category: 'Labour Arbitrage', annualisedSavingCr: 0, oneTimeCostCr: 0, start: TODAY, status: 'Planned', owner: '' })}>Add initiative</AddButton>}>
      <Grid minWidth={1000}>
        <GridHead cols={['Initiative', 'Category', 'Annualised saving', 'One-time cost', 'Payback', 'Start', 'Status', 'Owner', '']} right={[2, 3, 4]} />
        <tbody>
          {items.length === 0 && <GridEmpty colSpan={9} />}
          {items.map((r) => (
            <tr key={r.id} className="hover:bg-brand-50/40">
              <td className={clsx(gtd, 'min-w-[300px]')}><GridText bold value={r.initiative} onChange={(x) => set(r, 'initiative', x)} /></td>
              <td className={clsx(gtd, 'min-w-[150px]')}><GridSelect value={r.category} options={SAVING_CATEGORIES} onChange={(x) => set(r, 'category', x)} /></td>
              <td className={gtd}><GridMoney cr={r.annualisedSavingCr} onChange={(x) => set(r, 'annualisedSavingCr', x ?? 0)} className="ml-auto text-green-700" /></td>
              <td className={gtd}><GridMoney cr={r.oneTimeCostCr} onChange={(x) => set(r, 'oneTimeCostCr', x ?? 0)} className="ml-auto" /></td>
              <td className={clsx(gtd, 'text-right text-[12px] px-2 text-ink-500 whitespace-nowrap')}>{r.annualisedSavingCr > 0 ? `${Math.max(1, Math.round((r.oneTimeCostCr / r.annualisedSavingCr) * 12))} months` : '—'}</td>
              <td className={gtd}><GridDate value={r.start} onChange={(x) => set(r, 'start', x)} /></td>
              <td className={clsx(gtd, 'min-w-[120px]')}><GridSelect value={r.status} options={SAVING_STATUSES} onChange={(x) => set(r, 'status', x)} /></td>
              <td className={clsx(gtd, 'min-w-[120px]')}><GridText value={r.owner} placeholder="Owner" onChange={(x) => set(r, 'owner', x)} /></td>
              <td className={gtd}><GridRemove label={r.initiative} onClick={() => remove(r.id)} /></td>
            </tr>
          ))}
          {items.length > 0 && <tr><td colSpan={2} className="text-right text-[12px] text-ink-500 px-2 py-2">Total</td><GridTotal cr={tS} className="text-green-700" /><GridTotal cr={tC} /><td colSpan={5} /></tr>}
        </tbody>
      </Grid>
    </Card>
  )
}

function ValueSettingsForm() {
  const money = useMoney()
  const settingsC = useCollection<ValueSettings>('valueSettings', seedValueSettings)
  const vs = settingsC.items[0] ?? seedValueSettings[0]
  const [f, setF] = useState<ValueSettings>(vs)
  const [saved, setSaved] = useState(false)
  useEffect(() => { setF(vs) }, [vs])
  const dirty = JSON.stringify(f) !== JSON.stringify(vs)
  const num = (k: 'runRateSavingsPct' | 'targetRunRateSavingsPct') => ({ type: 'number' as const, step: 'any', value: f[k], onChange: (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: parseFloat(e.target.value) || 0 }) })
  const c = (k: 'annualRunRateBenefitsCr' | 'baselineCostCr' | 'gccRunCostCr' | 'totalInvestmentCr') => ({ type: 'number' as const, step: 'any', value: money.inputValue(f[k]), onChange: (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: money.toBase(parseFloat(e.target.value) || 0) }) })
  return (
    <Card title="Business-case assumptions" subtitle="Run-rate savings, payback and the steady-state cost build behind the Cost Savings and Value Forecast views.">
      <FormGrid cols={4}>
        <Field label="Cost savings run-rate (%)"><Input {...num('runRateSavingsPct')} /></Field>
        <Field label="Target run-rate savings by Year 5 (%)"><Input {...num('targetRunRateSavingsPct')} /></Field>
        <Field label="Payback period"><Input value={f.paybackYears} onChange={(e) => setF({ ...f, paybackYears: e.target.value })} /></Field>
        <Field label={`Annual run-rate benefits from Year 4 (${money.unitLabel})`}><Input {...c('annualRunRateBenefitsCr')} /></Field>
        <Field label={`Onshore baseline cost (${money.unitLabel})`}><Input {...c('baselineCostCr')} /></Field>
        <Field label={`GCC run cost at steady state (${money.unitLabel})`}><Input {...c('gccRunCostCr')} /></Field>
        <Field label={`Total investment (${money.unitLabel})`}><Input {...c('totalInvestmentCr')} /></Field>
      </FormGrid>
      <SaveBar dirty={dirty} saved={saved} onSave={() => { settingsC.update(f); setSaved(true) }} onDiscard={() => setF(vs)} />
    </Card>
  )
}

/* ---------------- Waterfall ---------------- */
function WaterfallChart({ baselineCr, gccCr, money }: { baselineCr: number; gccCr: number; money: Money }) {
  // Work in display units (₹ Cr or € M); scale the lever steps so that baseline − levers + transition = gcc
  const baseline = money.toDisplay(baselineCr), gcc = money.toDisplay(gccCr)
  const lv = money.currency === 'INR' ? 0 : 1
  const levers = WATERFALL.filter((w) => w.kind === 'down')
  const leverTotal = levers.reduce((s, l) => s + Math.abs(l.value), 0)
  const transition = money.toDisplay(WATERFALL.find((w) => w.kind === 'up')?.value ?? 0)
  const scale = (baseline - gcc + transition) / leverTotal
  let running = baseline
  const data: { name: string; base: number; value: number; fill: string; label: string }[] = [{ name: 'Onshore Baseline', base: 0, value: +baseline.toFixed(2), fill: CHART_COLORS.navy, label: baseline.toFixed(lv) }]
  for (const l of levers) { const v = +(Math.abs(l.value) * scale).toFixed(2); running -= v; data.push({ name: l.name, base: running, value: v, fill: CHART_COLORS.green, label: `−${v.toFixed(lv)}` }) }
  data.push({ name: 'Transition Cost', base: running, value: +transition.toFixed(2), fill: CHART_COLORS.amber, label: `+${transition.toFixed(lv)}` })
  running += transition
  data.push({ name: 'GCC Run Cost', base: 0, value: +running.toFixed(2), fill: CHART_COLORS.blue, label: running.toFixed(lv) })
  return (
    <div className="h-[260px]">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 18, right: 8, left: -18, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10.5 }} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v, name) => (name === 'base' ? [null, null] : [`${money.symbol} ${v} ${money.unit}`, 'Amount'])} />
          <Bar isAnimationActive={false} dataKey="base" stackId="w" fill="transparent" />
          <Bar isAnimationActive={false} dataKey="value" stackId="w" radius={[4, 4, 0, 0]}>
            {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
            <LabelList dataKey="label" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------------- Modals ---------------- */
function Footer({ onClose, onSave, onDelete, isNew, saveLabel = 'Save' }: { onClose: () => void; onSave: () => void; onDelete?: () => void; isNew: boolean; saveLabel?: string }) {
  return (<>{!isNew && onDelete && <ConfirmDelete onConfirm={onDelete} />}<span className="flex-1" /><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={onSave}>{saveLabel}</button></>)
}

function BenefitModal({ value, isNew, onClose, onSave, onDelete }: { value: BenefitItem; isNew: boolean; onClose: () => void; onSave: (v: BenefitItem) => void; onDelete: () => void }) {
  const money = useMoney()
  const { f, s, c } = useForm(value, money)
  return (
    <Modal open width="max-w-3xl" title={isNew ? 'Add benefit' : `Edit ${f.code}`} onClose={onClose} footer={<Footer isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Benefit ID"><Input value={f.code} onChange={s('code')} /></Field>
        <Field label="Benefit area"><Select options={BENEFIT_AREAS} value={f.benefitArea} onChange={s('benefitArea')} /></Field>
        <Field label="Status"><Select options={['On Track', 'At Risk', 'Delayed', 'Realized', 'Not Started']} value={f.status} onChange={s('status')} /></Field>
        <Field label="Lever" className="col-span-3"><Input value={f.lever} onChange={s('lever')} placeholder="e.g. Labour arbitrage – Finance operations" /></Field>
        <Field label={`Target (${money.unitLabel}, annual)`}><Input {...c('targetCr')} /></Field>
        <Field label={`Forecast (${money.unitLabel})`}><Input {...c('forecastCr')} /></Field>
        <Field label={`Realized to date (${money.unitLabel})`}><Input {...c('realizedCr')} /></Field>
        <Field label="Benefit owner"><Input value={f.owner} onChange={s('owner')} /></Field>
        <Field label="Workstream"><Select options={WORKSTREAMS} value={f.workstream} onChange={s('workstream')} /></Field>
        <Field label="Measurement frequency"><Select options={['Monthly', 'Quarterly', 'Annually']} value={f.frequency} onChange={s('frequency')} /></Field>
        <Field label="Measurement method" className="col-span-2"><Input value={f.measurementMethod} onChange={s('measurementMethod')} /></Field>
        <Field label="Baseline"><Input value={f.baseline} onChange={s('baseline')} /></Field>
      </FormGrid>
    </Modal>
  )
}

function MonthModal({ value, months, onClose, onSave }: { value: ValueMonth; months: ValueMonth[]; onClose: () => void; onSave: (v: ValueMonth) => void }) {
  const money = useMoney()
  const [id, setId] = useState(value.id)
  const base = months.find((m) => m.id === id) ?? value
  const [f, setF] = useState<ValueMonth>(base)
  const pick = (nid: string) => { setId(nid); const m = months.find((x) => x.id === nid); if (m) setF(m) }
  return (
    <Modal open title="Record realized value" onClose={onClose} footer={<Footer isNew onClose={onClose} onSave={() => onSave(f)} saveLabel="Record" />}>
      <FormGrid cols={2}>
        <Field label="Month"><select className="input" value={id} onChange={(e) => pick(e.target.value)}>{months.map((m) => <option key={m.id} value={m.id}>{m.month}</option>)}</select></Field>
        <Field label={`Realized (cumulative ${money.unitLabel})`}><Input type="number" step="any" value={f.realizedCr === undefined ? '' : money.inputValue(f.realizedCr)} onChange={(e) => setF({ ...f, realizedCr: e.target.value === '' ? undefined : money.toBase(parseFloat(e.target.value) || 0) })} /></Field>
        <Field label={`Target (cumulative ${money.unitLabel})`}><Input type="number" step="any" value={money.inputValue(f.targetCr)} onChange={(e) => setF({ ...f, targetCr: money.toBase(parseFloat(e.target.value) || 0) })} /></Field>
        <Field label={`Forecast (cumulative ${money.unitLabel})`}><Input type="number" step="any" value={money.inputValue(f.forecastCr)} onChange={(e) => setF({ ...f, forecastCr: money.toBase(parseFloat(e.target.value) || 0) })} /></Field>
      </FormGrid>
      <p className="text-[12px] text-ink-500 mt-3">Leave realized empty for future months. Values are cumulative from January 2026.</p>
    </Modal>
  )
}

function SavingModal({ value, isNew, onClose, onSave, onDelete }: { value: SavingsInitiative; isNew: boolean; onClose: () => void; onSave: (v: SavingsInitiative) => void; onDelete: () => void }) {
  const money = useMoney()
  const { f, s, c } = useForm(value, money)
  return (
    <Modal open title={isNew ? 'Add savings initiative' : 'Edit savings initiative'} onClose={onClose} footer={<Footer isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Initiative" className="col-span-3"><Input value={f.initiative} onChange={s('initiative')} /></Field>
        <Field label="Category"><Select options={['Labour Arbitrage', 'Vendor', 'Real Estate', 'Automation', 'Process']} value={f.category} onChange={s('category')} /></Field>
        <Field label={`Annualised saving (${money.unitLabel})`}><Input {...c('annualisedSavingCr')} /></Field>
        <Field label={`One-time cost (${money.unitLabel})`}><Input {...c('oneTimeCostCr')} /></Field>
        <Field label="Start"><Input type="date" value={f.start} onChange={s('start')} /></Field>
        <Field label="Status"><Select options={['Planned', 'In Progress', 'Realized', 'At Risk']} value={f.status} onChange={s('status')} /></Field>
        <Field label="Owner"><Input value={f.owner} onChange={s('owner')} /></Field>
      </FormGrid>
    </Modal>
  )
}

function SettingsModal({ value, onClose, onSave }: { value: ValueSettings; onClose: () => void; onSave: (v: ValueSettings) => void }) {
  const money = useMoney()
  const { f, s, n, c } = useForm(value, money)
  return (
    <Modal open title="Business-case assumptions" onClose={onClose} footer={<Footer isNew onClose={onClose} onSave={() => onSave(f)} />}>
      <FormGrid cols={2}>
        <Field label="Cost savings run-rate (%)"><Input type="number" value={f.runRateSavingsPct} onChange={n('runRateSavingsPct')} /></Field>
        <Field label="Target run-rate savings by Year 5 (%)"><Input type="number" value={f.targetRunRateSavingsPct} onChange={n('targetRunRateSavingsPct')} /></Field>
        <Field label="Payback period"><Input value={f.paybackYears} onChange={s('paybackYears')} /></Field>
        <Field label={`Annual run-rate benefits from Year 4 (${money.unitLabel})`}><Input {...c('annualRunRateBenefitsCr')} /></Field>
        <Field label={`Onshore baseline cost (${money.unitLabel})`}><Input {...c('baselineCostCr')} /></Field>
        <Field label={`GCC run cost at steady state (${money.unitLabel})`}><Input {...c('gccRunCostCr')} /></Field>
        <Field label={`Total investment (${money.unitLabel})`}><Input {...c('totalInvestmentCr')} /></Field>
      </FormGrid>
    </Modal>
  )
}

function SignOffModal({ value, onClose, onSave }: { value: BenefitItem; onClose: () => void; onSave: (v: BenefitItem) => void }) {
  const money = useMoney()
  const [by, setBy] = useState(value.owner)
  const [on, setOn] = useState(TODAY)
  const [realized, setRealized] = useState(value.realizedCr)
  const [evidence, setEvidence] = useState('')
  return (
    <Modal open title={`Sign off ${value.code} – ${value.lever}`} onClose={onClose} footer={<Footer isNew onClose={onClose} onSave={() => onSave({ ...value, signedOff: true, signedOffBy: by, signedOffOn: on, realizedCr: realized, status: realized >= value.targetCr ? 'Realized' : value.status })} saveLabel="Confirm sign-off" />}>
      <FormGrid cols={2}>
        <Field label="Signed off by"><Input value={by} onChange={(e) => setBy(e.target.value)} /></Field>
        <Field label="Sign-off date"><Input type="date" value={on} onChange={(e) => setOn(e.target.value)} /></Field>
        <Field label={`Realized value confirmed (${money.unitLabel})`}><Input type="number" step="any" value={money.inputValue(realized)} onChange={(e) => setRealized(money.toBase(parseFloat(e.target.value) || 0))} /></Field>
        <Field label="Measurement method"><Input readOnly value={value.measurementMethod} className="bg-surface" /></Field>
        <Field label="Evidence / reference" className="col-span-2"><TextArea value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="e.g. Finance variance report Sep 2026, invoice reconciliation" /></Field>
      </FormGrid>
    </Modal>
  )
}
