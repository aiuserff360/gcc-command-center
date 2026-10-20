import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine } from 'recharts'
import { Plus, Wallet, Coins, Sigma, Percent, Clock, Scale, Settings2 } from 'lucide-react'
import { Card, KpiTile, Badge, Modal, Field, Input, Select, TextArea, FormGrid, Legend } from '../ui'
import { tooltipStyle } from '../charts'
import { useCollection, uid } from '../../store/useStore'
import { OWNERS, CHART_COLORS } from '../../data/common'
import { seedInvestments, seedBenefits, seedScenarios, seedStrategy, investmentByYear, valueCaseByYear, totalInvestment, sumYears, npv, round1, fmtYears, INVESTMENT_CATEGORIES, YEARS, YEAR_KEYS, type InvestmentLine, type BenefitItem, type Scenario, type StrategySettings } from '../../data/strategy'
import { EditorFooter, Toolbar, YearFields, numProps, textProps } from './shared'

const blank = (): InvestmentLine => ({ id: uid('inv'), costLine: '', category: 'Setup', owner: OWNERS[0], notes: '', y1: 0, y2: 0, y3: 0, y4: 0, y5: 0 })

export default function BusinessCaseTab() {
  const { items, add, update, remove } = useCollection<InvestmentLine>('strategyInvestments', seedInvestments)
  const { items: benefits } = useCollection<BenefitItem>('strategyBenefits', seedBenefits)
  const { items: scenarios } = useCollection<Scenario>('strategyScenarios', seedScenarios)
  const settingsC = useCollection<StrategySettings>('strategy', seedStrategy)
  const s = settingsC.items[0] ?? seedStrategy[0]
  const [editing, setEditing] = useState<InvestmentLine | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [assump, setAssump] = useState(false)
  const base = scenarios.find((x) => x.isBase) ?? scenarios[0]

  const inv = useMemo(() => investmentByYear(items), [items])
  const vc = useMemo(() => valueCaseByYear(benefits), [benefits])
  const total = totalInvestment(items)
  const fiveYearBenefits = round1(vc.reduce((a, r) => a + r.total, 0))
  const cash = useMemo(() => {
    let cum = 0
    const r = s.discountRatePct / 100
    return YEARS.map((year, i) => {
      const investment = inv[i].investment, benefit = vc[i].total, net = round1(benefit - investment)
      cum = round1(cum + net)
      return { year, investment, benefit, net, cumulative: cum, discounted: round1(net / Math.pow(1 + r, i + 1)) }
    })
  }, [inv, vc, s.discountRatePct])
  const npvValue = npv(cash.map((c) => c.net), s.discountRatePct)
  const yearTotals = YEAR_KEYS.map((k) => round1(items.reduce((a, l) => a + (l[k] || 0), 0)))
  const catTotals = INVESTMENT_CATEGORIES.map((c) => ({ name: c, value: round1(items.filter((l) => l.category === c).reduce((a, l) => a + sumYears(l), 0)) }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-4">
        <KpiTile tone="orange" icon={<Wallet size={22} />} value={`₹ ${total.toFixed(1)} Cr`} label="Total Investment" sub={`${s.investmentHorizonYears} years · Setup + Ramp-up`} />
        <KpiTile tone="green" icon={<Coins size={22} />} value={`₹ ${fiveYearBenefits.toFixed(1)} Cr`} label="5-Year Benefits" sub="from benefit register" />
        <KpiTile tone="blue" icon={<Sigma size={22} />} value={`₹ ${npvValue.toFixed(1)} Cr`} label={`NPV @ ${s.discountRatePct}%`} sub="5-year net cash flows" />
        <KpiTile tone="teal" icon={<Percent size={22} />} value={base ? `${base.irrPct}%` : '—'} label="IRR" sub={base ? `${base.name} scenario` : ''} />
        <KpiTile tone="violet" icon={<Clock size={22} />} value={base ? fmtYears(base.paybackYears) : '—'} label="Payback Period" sub={base ? `${base.name} scenario` : ''} />
        <KpiTile tone="navy" icon={<Scale size={22} />} value={`${(fiveYearBenefits / (total || 1)).toFixed(1)}x`} label="Benefit ÷ Investment" sub="5-year basis" />
      </div>
      <div className="grid grid-cols-[1.2fr_1fr] gap-4">
        <Card title="Cash Flow Profile (₹ Cr)" subtitle="Annual investment vs benefits, with cumulative net position." headerRight={<Legend items={[{ label: 'Investment', color: CHART_COLORS.amber }, { label: 'Benefits', color: CHART_COLORS.blue }, { label: 'Cumulative Net', color: CHART_COLORS.green }]} />}>
          <div className="h-[230px]">
            <ResponsiveContainer>
              <ComposedChart data={cash} margin={{ top: 18, right: 8, left: -20, bottom: 0 }} barGap={4} barCategoryGap="30%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <ReferenceLine y={0} stroke="#CBD5E1" />
                <Bar dataKey="investment" name="Investment" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} isAnimationActive={false}><LabelList dataKey="investment" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
                <Bar dataKey="benefit" name="Benefits" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} isAnimationActive={false}><LabelList dataKey="benefit" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
                <Line dataKey="cumulative" name="Cumulative Net" stroke={CHART_COLORS.green} strokeWidth={2} isAnimationActive={false} dot={{ r: 4, fill: CHART_COLORS.green, strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Cash Flow Table (₹ Cr)" action={<button className="link inline-flex items-center gap-1" onClick={() => setAssump(true)}><Settings2 size={12} /> Edit assumptions</button>}>
          <table className="w-full border-separate border-spacing-0 tbl">
            <thead><tr><th className="th">Year</th><th className="th text-right">Investment</th><th className="th text-right">Benefits</th><th className="th text-right">Net</th><th className="th text-right">Cumulative</th><th className="th text-right">Discounted</th></tr></thead>
            <tbody>
              {cash.map((c) => (
                <tr key={c.year}><td className="td font-medium">{c.year}</td><td className="td text-right text-amber-700">{c.investment.toFixed(1)}</td><td className="td text-right text-brand-600">{c.benefit.toFixed(1)}</td><td className="td text-right">{c.net.toFixed(1)}</td><td className={`td text-right font-medium ${c.cumulative >= 0 ? 'text-green-700' : 'text-red-600'}`}>{c.cumulative.toFixed(1)}</td><td className="td text-right text-ink-500">{c.discounted.toFixed(1)}</td></tr>
              ))}
              <tr><td className="td font-semibold">Total</td><td className="td text-right font-semibold">{total.toFixed(1)}</td><td className="td text-right font-semibold">{fiveYearBenefits.toFixed(1)}</td><td className="td text-right font-semibold">{round1(fiveYearBenefits - total).toFixed(1)}</td><td className="td" /><td className="td text-right font-semibold">{npvValue.toFixed(1)}</td></tr>
            </tbody>
          </table>
          <p className="text-[11.5px] text-ink-500 mt-2">Discount rate {s.discountRatePct}% · IRR and payback shown above are taken from the {base?.name ?? 'base'} scenario.</p>
        </Card>
      </div>
      <Card title="Investment Breakdown (₹ Cr)" subtitle="Setup and ramp-up cost lines by year. Totals feed the Total Investment KPI and the Investment vs Returns chart.">
        <Toolbar left={<span className="inline-flex gap-4">{catTotals.map((c) => <span key={c.name}>{c.name}: <b className="text-ink-900">₹ {c.value.toFixed(1)} Cr</b></span>)}</span>}>
          <button className="btn-primary" onClick={() => { setEditing(blank()); setIsNew(true) }}><Plus size={14} /> Add Cost Line</button>
        </Toolbar>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full border-separate border-spacing-0 tbl">
            <thead><tr><th className="th">Cost Line</th><th className="th">Category</th><th className="th">Owner</th>{YEARS.map((y) => <th key={y} className="th text-right">{y}</th>)}<th className="th text-right">Total</th><th className="th">Notes</th></tr></thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => { setEditing(l); setIsNew(false) }}>
                  <td className="td font-medium">{l.costLine}</td><td className="td"><Badge value={l.category} /></td><td className="td">{l.owner}</td>
                  {YEAR_KEYS.map((k) => <td key={k} className="td text-right">{(l[k] || 0).toFixed(1)}</td>)}
                  <td className="td text-right font-semibold">{sumYears(l).toFixed(1)}</td><td className="td text-ink-500 text-[12px]">{l.notes}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td className="td text-ink-500 text-center py-6" colSpan={10}>No cost lines yet. Use "Add Cost Line" to create one.</td></tr>}
              <tr className="bg-surface/60"><td className="td font-semibold" colSpan={3}>Total investment</td>{yearTotals.map((t, i) => <td key={i} className="td text-right font-semibold">{t.toFixed(1)}</td>)}<td className="td text-right font-bold text-brand-600">{total.toFixed(1)}</td><td className="td" /></tr>
            </tbody>
          </table>
        </div>
      </Card>
      {editing && <InvestmentEditor value={editing} isNew={isNew} onClose={() => setEditing(null)} onDelete={() => { remove(editing.id); setEditing(null) }} onSave={(v) => { if (isNew) add(v); else update(v); setEditing(null) }} />}
      {assump && <AssumptionsEditor value={s} onClose={() => setAssump(false)} onSave={(v) => { settingsC.update(v); setAssump(false) }} />}
    </div>
  )
}

function InvestmentEditor({ value, isNew, onClose, onSave, onDelete }: { value: InvestmentLine; isNew: boolean; onClose: () => void; onSave: (v: InvestmentLine) => void; onDelete: () => void }) {
  const [f, setF] = useState(value)
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add Cost Line' : 'Edit Cost Line'} footer={<EditorFooter onCancel={onClose} onSave={() => onSave(f)} onDelete={isNew ? undefined : onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Cost line"><Input {...textProps(f, setF, 'costLine')} /></Field>
        <Field label="Category"><Select options={INVESTMENT_CATEGORIES} {...textProps(f, setF, 'category')} /></Field>
        <Field label="Owner"><Select options={OWNERS} {...textProps(f, setF, 'owner')} /></Field>
      </FormGrid>
      <div className="h-3" />
      <YearFields value={f} onChange={setF} unit="₹ Cr" />
      <div className="h-3" />
      <Field label="Notes"><TextArea {...textProps(f, setF, 'notes')} /></Field>
    </Modal>
  )
}

function AssumptionsEditor({ value, onClose, onSave }: { value: StrategySettings; onClose: () => void; onSave: (v: StrategySettings) => void }) {
  const [f, setF] = useState(value)
  return (
    <Modal open onClose={onClose} title="Business case assumptions" width="max-w-md" footer={<EditorFooter onCancel={onClose} onSave={() => onSave(f)} />}>
      <FormGrid cols={1}>
        <Field label="Discount rate (%)"><Input {...numProps(f, setF, 'discountRatePct')} /></Field>
        <Field label="Investment horizon (years)"><Input {...numProps(f, setF, 'investmentHorizonYears')} /></Field>
        <Field label="Run-rate benefits counted from year"><Input {...numProps(f, setF, 'runRateFromYear')} min={1} max={5} /></Field>
      </FormGrid>
    </Modal>
  )
}
