import { useMemo, useState } from 'react'
import { BarChart, Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { FileText, Pencil, MoreVertical, Target, BarChart3, Coins, TrendingUp, Users, Check, CheckCircle2, Crosshair, IndianRupee, Lightbulb, Globe } from 'lucide-react'
import { Card, KpiTile, Tabs, ViewAll, Modal, Field, Input, Select, TextArea, FormGrid, FilterSelect, Legend } from '../components/ui'
import { BarList, tooltipStyle } from '../components/charts'
import { useCollection, useStore, type Phase } from '../store/useStore'
import { PHASES, fmtDate, CHART_COLORS } from '../data/common'
import {
  seedStrategy, seedInvestments, seedOperatingModels, seedServices, seedLocations, seedBenefits, seedScenarios,
  valueCaseByYear, investmentByYear, totalInvestment, locationOverall, bandTalent, bandInfra, bandEcosystem, fmtYears, BENEFIT_CATEGORIES, YEARS,
  type StrategySettings, type InvestmentLine, type OperatingModel, type ServiceScope, type LocationOption, type BenefitItem, type Scenario,
} from '../data/strategy'
import { numProps, textProps, OmPill, ScorePill, EditorFooter } from '../components/strategy/shared'
import { OM_ICON } from '../components/strategy/OperatingModelTab'
import { CATEGORY_COLORS } from '../components/strategy/BenefitsTab'
import { Dot } from '../components/strategy/LocationTab'
import ObjectivesTab from '../components/strategy/ObjectivesTab'
import BusinessCaseTab from '../components/strategy/BusinessCaseTab'
import OperatingModelTab from '../components/strategy/OperatingModelTab'
import ScopeTab from '../components/strategy/ScopeTab'
import LocationTab from '../components/strategy/LocationTab'
import BenefitsTab from '../components/strategy/BenefitsTab'
import ScenariosTab from '../components/strategy/ScenariosTab'
import ApprovalsTab from '../components/strategy/ApprovalsTab'

/** Compact cell classes for the dense Overview tables (self-contained so they are not overridden by .th/.td). */
const TH = 'text-left text-[11px] font-medium text-ink-500 px-1.5 py-1.5 bg-surface/70 first:rounded-l-md last:rounded-r-md whitespace-nowrap leading-tight'
const TD = 'px-1.5 py-2 text-[11.5px] text-ink-900 border-b border-line/70 align-middle whitespace-nowrap'

const TABS = ['Overview', 'Strategic Objectives', 'Business Case', 'Operating Model', 'Scope & Services', 'Talent & Location', 'Benefits & KPIs', 'Scenarios', 'Approvals']
const RATIONALE_ICONS = [
  <span className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0"><Crosshair size={20} /></span>,
  <span className="w-10 h-10 rounded-full bg-blue-50 text-brand-600 flex items-center justify-center shrink-0"><IndianRupee size={20} /></span>,
  <span className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0"><Lightbulb size={20} /></span>,
  <span className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><Globe size={20} /></span>,
]

export default function Strategy() {
  const [tab, setTab] = useState('Overview')
  const [edit, setEdit] = useState(false)
  const phase = useStore((s) => s.phase)
  const setPhase = useStore((s) => s.setPhase)
  const settingsC = useCollection<StrategySettings>('strategy', seedStrategy)
  const s = settingsC.items[0] ?? seedStrategy[0]

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-navy-900 leading-tight">Strategy & Business Case</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">Define the purpose, value, operating model and investment case for the GCC.</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <FilterSelect label="Current Phase" value={phase} options={PHASES} onChange={(v) => setPhase(v as Phase)} icon={<FileText size={24} className="text-brand-600" />} />
          <div className="border-l border-line pl-4 leading-tight">
            <div className="text-[13px] font-medium text-ink-900">Version {s.version}</div>
            <div className="text-[12px] text-ink-500 mt-0.5">Last updated: {fmtDate(s.lastUpdated)}</div>
          </div>
          <button className="btn-primary px-4 py-2.5 text-[13.5px]" onClick={() => setEdit(true)}><Pencil size={15} /> Edit Strategy</button>
          <button className="text-ink-500 hover:text-ink-900 cursor-pointer"><MoreVertical size={18} /></button>
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-4" />
      {tab === 'Overview' && <Overview s={s} go={setTab} onEdit={() => setEdit(true)} />}
      {tab === 'Strategic Objectives' && <ObjectivesTab />}
      {tab === 'Business Case' && <BusinessCaseTab />}
      {tab === 'Operating Model' && <OperatingModelTab />}
      {tab === 'Scope & Services' && <ScopeTab />}
      {tab === 'Talent & Location' && <LocationTab />}
      {tab === 'Benefits & KPIs' && <BenefitsTab />}
      {tab === 'Scenarios' && <ScenariosTab />}
      {tab === 'Approvals' && <ApprovalsTab />}
      {edit && <StrategyEditor value={s} onClose={() => setEdit(false)} onSave={(v) => { settingsC.update(v); setEdit(false) }} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overview tab                                                        */
/* ------------------------------------------------------------------ */
function Overview({ s, go, onEdit }: { s: StrategySettings; go: (t: string) => void; onEdit: () => void }) {
  const { items: investments } = useCollection<InvestmentLine>('strategyInvestments', seedInvestments)
  const { items: models } = useCollection<OperatingModel>('strategyOperatingModels', seedOperatingModels)
  const { items: services } = useCollection<ServiceScope>('strategyServices', seedServices)
  const { items: locations } = useCollection<LocationOption>('strategyLocations', seedLocations)
  const { items: benefits } = useCollection<BenefitItem>('strategyBenefits', seedBenefits)
  const { items: scenarios } = useCollection<Scenario>('strategyScenarios', seedScenarios)

  const vc = useMemo(() => valueCaseByYear(benefits), [benefits])
  const inv = useMemo(() => investmentByYear(investments), [investments])
  const total = totalInvestment(investments)
  const runRate = vc[Math.min(4, Math.max(0, s.runRateFromYear - 1))]?.total ?? 0
  const headcount = services.filter((x) => x.status !== 'Out of Scope').reduce((a, x) => a + x.y5, 0)
  const ivr = YEARS.map((year, i) => ({ year, 'Total Investment (Cumulative)': inv[i].cumulative, 'Cumulative Benefits': s.cumulativeBenefitsCr[i] ?? 0 }))
  const scoredLocations = locations.map((l) => ({ ...l, overall: locationOverall(l, s.locationWeights) })).sort((a, b) => b.overall - a.overall)
  const scopeRows = services.filter((x) => x.status !== 'Out of Scope').slice().sort((a, b) => b.y5 - a.y5)
  const yMax = Math.max(100, ...vc.map((r) => r.total), ...ivr.map((r) => r['Cumulative Benefits']))
  const ticks = [0, 20, 40, 60, 80, 100].filter((t) => t <= yMax)

  return (
    <div className="space-y-4">
      {/* KPI tiles */}
      <div className="grid grid-cols-5 gap-4">
        <KpiTile tone="green" icon={<Target size={22} />} value={`${s.targetCostSavingsPct}%`} label="Target Cost Savings (Run-rate)" sub={s.costSavingsBasis} />
        <KpiTile tone="blue" icon={<BarChart3 size={22} />} value={s.paybackPeriod} label="Payback Period" sub={s.paybackBasis} />
        <KpiTile tone="orange" icon={<Coins size={22} />} value={`₹ ${total.toFixed(1)} Cr`} label={`Total Investment (${s.investmentHorizonYears} years)`} sub="Setup + Ramp-up" />
        <KpiTile tone="violet" icon={<TrendingUp size={22} />} value={`₹ ${runRate.toFixed(1)} Cr`} label="Annual Run-rate Benefits" sub={`from Year ${s.runRateFromYear} onwards`} />
        <KpiTile tone="blue" icon={<Users size={22} />} value={headcount} label="Target Headcount" sub="by Year 5" />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-[1fr_1.1fr_1fr] gap-4">
        <Card title="Strategic Rationale">
          <div className="space-y-4 pt-1">
            {s.rationale.map((r, i) => (
              <div key={r.title} className="flex items-center gap-3">
                {RATIONALE_ICONS[i % RATIONALE_ICONS.length]}
                <div><div className="text-[13.5px] font-semibold text-ink-900">{r.title}</div><div className="text-[12px] text-ink-500 leading-snug">{r.description}</div></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Value Case Summary (₹ Cr)">
          <Legend items={BENEFIT_CATEGORIES.map((c) => ({ label: c, color: CATEGORY_COLORS[c] }))} />
          <div className="h-[200px] mt-2">
            <ResponsiveContainer>
              <BarChart data={vc} margin={{ top: 18, right: 4, left: -22, bottom: 0 }} barCategoryGap="38%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[0, yMax]} ticks={ticks} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                {BENEFIT_CATEGORIES.map((c, i) => (
                  <Bar key={c} dataKey={c} stackId="a" fill={CATEGORY_COLORS[c]} radius={i === 2 ? [3, 3, 0, 0] : 0} isAnimationActive={false}>
                    {i === 2 && <LabelList dataKey="total" position="top" style={{ fontSize: 11.5, fill: '#111827', fontWeight: 600 }} />}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Investment vs Returns (₹ Cr)">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-700">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.blue }} />Total Investment (Cumulative)</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-flex items-center"><span className="w-2 border-t-2" style={{ borderColor: '#10B981' }} /><span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} /><span className="w-2 border-t-2" style={{ borderColor: '#10B981' }} /></span>Cumulative Benefits</span>
          </div>
          <div className="h-[200px] mt-2">
            <ResponsiveContainer>
              <ComposedChart data={ivr} margin={{ top: 18, right: 10, left: -22, bottom: 0 }} barCategoryGap="38%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[0, yMax]} ticks={ticks} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="Total Investment (Cumulative)" fill="#DCE7F7" radius={[3, 3, 0, 0]} isAnimationActive={false}><LabelList dataKey="Total Investment (Cumulative)" position="top" style={{ fontSize: 11.5, fill: '#111827', fontWeight: 600 }} /></Bar>
                <Line dataKey="Cumulative Benefits" stroke="#10B981" strokeWidth={2} isAnimationActive={false} dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}><LabelList dataKey="Cumulative Benefits" position="top" offset={8} style={{ fontSize: 11.5, fill: '#111827', fontWeight: 600 }} /></Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-[1.45fr_1fr] gap-4">
        <Card title="Operating Model" action={<ViewAll label="View Details" onClick={() => go('Operating Model')} />}>
          <div className="grid grid-cols-4 divide-x divide-line">
            {models.map((m, i) => (
              <div key={m.id} className={`flex flex-col ${i === 0 ? 'pr-2' : i === models.length - 1 ? 'pl-2' : 'px-2'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{OM_ICON[m.name] ?? <Target size={20} />}</span>
                  <span className="text-[13.5px] font-semibold text-ink-900 truncate">{m.name}</span>
                </div>
                <ul className="mt-3 space-y-1.5 flex-1">
                  {m.traits.map((t) => <li key={t} className="flex items-start gap-1.5 text-[11.5px] text-ink-700 leading-snug"><Check size={13} className="text-green-600 shrink-0 mt-0.5" />{t}</li>)}
                </ul>
                <div className="mt-3"><OmPill status={m.status} /></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Scope of Services" action={<ViewAll label="View Details" onClick={() => go('Scope & Services')} />}>
          <BarList labelWidth={212} max={Math.max(90, ...scopeRows.map((r) => r.y5))} rows={scopeRows.map((r) => ({ label: r.name, value: r.y5, color: r.y5 >= 50 ? CHART_COLORS.blue : r.y5 >= 20 ? '#2B6FD6' : CHART_COLORS.blueLight, right: `${r.y5} FTEs` }))} />
        </Card>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-[1.6fr_1.08fr_0.72fr] gap-4">
        <Card title="Location Analysis" action={<ViewAll label="View Details" onClick={() => go('Talent & Location')} />}>
          <table className="w-full border-separate border-spacing-0">
            <thead><tr>{['Location', 'Talent Availability', 'Cost Index', 'Infrastructure', 'Ecosystem', 'Overall Score'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {scoredLocations.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => go('Talent & Location')}>
                  <td className={TD}>{r.name}</td><td className={TD}><Dot level={bandTalent(r.talentScore)} /></td><td className={TD}>{r.costIndex.toFixed(1)}</td><td className={TD}>{bandInfra(r.infrastructureScore)}</td><td className={TD}>{bandEcosystem(r.ecosystemScore)}</td><td className={TD}><ScorePill value={r.overall} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Scenario Analysis (5-year view)" action={<ViewAll label="View Details" onClick={() => go('Scenarios')} />}>
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={TH}>Scenario</th><th className={TH}>Investment<br />(₹ Cr)</th><th className={TH}>Annual Benefits<br />(₹ Cr)</th><th className={TH}>Payback<br />Period</th><th className={`${TH} text-right`}>IRR</th></tr></thead>
            <tbody>
              {scenarios.map((sc) => (
                <tr key={sc.id} className={`cursor-pointer hover:bg-brand-50/60 ${sc.isBase ? 'bg-surface/70 font-semibold' : ''}`} onClick={() => go('Scenarios')}>
                  <td className={`${TD} py-2.5`}>{sc.name}</td><td className={`${TD} py-2.5`}>{sc.investmentCr.toFixed(1)}</td><td className={`${TD} py-2.5`}>{sc.annualBenefitsCr.toFixed(1)}</td><td className={`${TD} py-2.5`}>{fmtYears(sc.paybackYears)}</td><td className={`${TD} py-2.5 text-right`}>{sc.irrPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Key Assumptions" action={<ViewAll label="Edit" onClick={onEdit} />}>
          <ul className="space-y-2.5 pt-0.5">
            {s.assumptions.map((a) => <li key={a} className="flex items-start gap-2 text-[12px] text-ink-700 leading-snug"><CheckCircle2 size={15} className="text-green-600 shrink-0 mt-px" />{a}</li>)}
          </ul>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Edit Strategy modal                                                 */
/* ------------------------------------------------------------------ */
function StrategyEditor({ value, onClose, onSave }: { value: StrategySettings; onClose: () => void; onSave: (v: StrategySettings) => void }) {
  const [f, setF] = useState<StrategySettings>(value)
  const phase = useStore((s) => s.phase)
  const setPhase = useStore((s) => s.setPhase)
  const [assumptions, setAssumptions] = useState(value.assumptions.join('\n'))
  const [cum, setCum] = useState<number[]>([...value.cumulativeBenefitsCr, 0, 0, 0, 0, 0].slice(0, 5))
  const setRationale = (i: number, patch: Partial<StrategySettings['rationale'][number]>) => setF({ ...f, rationale: f.rationale.map((r, j) => (j === i ? { ...r, ...patch } : r)) })
  const save = () => onSave({ ...f, assumptions: assumptions.split('\n').map((a) => a.trim()).filter(Boolean), cumulativeBenefitsCr: cum })
  return (
    <Modal open onClose={onClose} title="Edit Strategy" width="max-w-3xl" footer={<EditorFooter onCancel={onClose} onSave={save} saveLabel="Save changes" />}>
      <FormGrid cols={3}>
        <Field label="Version"><Input {...textProps(f, setF, 'version')} /></Field>
        <Field label="Last updated"><Input type="date" {...textProps(f, setF, 'lastUpdated')} /></Field>
        <Field label="Current phase"><Select options={PHASES} value={phase} onChange={(e) => setPhase(e.target.value as Phase)} /></Field>
        <Field label="Target cost savings (run-rate) %"><Input {...numProps(f, setF, 'targetCostSavingsPct')} /></Field>
        <Field label="Cost savings basis"><Input {...textProps(f, setF, 'costSavingsBasis')} /></Field>
        <Field label="Investment horizon (years)"><Input {...numProps(f, setF, 'investmentHorizonYears')} /></Field>
        <Field label="Payback period"><Input {...textProps(f, setF, 'paybackPeriod')} /></Field>
        <Field label="Payback basis"><Input {...textProps(f, setF, 'paybackBasis')} /></Field>
        <Field label="Run-rate benefits from year"><Input {...numProps(f, setF, 'runRateFromYear')} min={1} max={5} /></Field>
      </FormGrid>
      <div className="h-3" />
      <Field label="Purpose statement"><TextArea {...textProps(f, setF, 'purpose')} /></Field>
      <div className="h-4" />
      <div className="label">Strategic rationale</div>
      <div className="space-y-2">
        {f.rationale.map((r, i) => (
          <div key={i} className="grid grid-cols-[200px_1fr] gap-2">
            <Input value={r.title} onChange={(e) => setRationale(i, { title: e.target.value })} />
            <Input value={r.description} onChange={(e) => setRationale(i, { description: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="h-4" />
      <div className="label">Cumulative Benefits – Investment vs Returns chart (₹ Cr)</div>
      <div className="grid grid-cols-5 gap-3">
        {YEARS.map((y, i) => <Field key={y} label={y}><Input type="number" step="any" value={cum[i]} onChange={(e) => setCum(cum.map((v, j) => (j === i ? parseFloat(e.target.value) || 0 : v)))} /></Field>)}
      </div>
      <div className="h-4" />
      <Field label="Key assumptions (one per line)"><TextArea value={assumptions} onChange={(e) => setAssumptions(e.target.value)} className="min-h-[120px]" /></Field>
      <p className="text-[11.5px] text-ink-500 mt-2">Total Investment, Annual Run-rate Benefits and Target Headcount are derived from the Business Case, Benefits & KPIs and Scope & Services tabs.</p>
    </Modal>
  )
}
