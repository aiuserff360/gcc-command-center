import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Plus, TrendingUp, Coins, Gauge, AlertTriangle } from 'lucide-react'
import { Card, KpiTile, Badge, Table, Modal, Field, Input, Select, FormGrid, FilterSelect, Legend } from '../ui'
import { Donut, tooltipStyle } from '../charts'
import { useCollection, uid } from '../../store/useStore'
import { OWNERS, WORKSTREAMS, CHART_COLORS } from '../../data/common'
import { seedBenefits, seedStrategy, valueCaseByYear, round1, BENEFIT_CATEGORIES, BENEFIT_STATUSES, YEARS, YEAR_KEYS, type BenefitItem, type StrategySettings } from '../../data/strategy'
import { EditorFooter, Toolbar, YearFields, moneyProps, textProps, fmtDisplay } from './shared'
import { useMoney, numMoney } from '../../data/money'

export const CATEGORY_COLORS: Record<string, string> = { 'Cost Savings': CHART_COLORS.blue, 'Productivity Gains': CHART_COLORS.blueLight, 'Revenue Impact': '#10B981' }
const blank = (): BenefitItem => ({ id: uid('ben'), name: '', category: 'Cost Savings', kpi: '', owner: OWNERS[0], workstream: WORKSTREAMS[0], forecastCr: 0, status: 'Planned', measurement: '', y1: 0, y2: 0, y3: 0, y4: 0, y5: 0 })

export default function BenefitsTab() {
  const { items, add, update, remove } = useCollection<BenefitItem>('strategyBenefits', seedBenefits)
  const settingsC = useCollection<StrategySettings>('strategy', seedStrategy)
  const s = settingsC.items[0] ?? seedStrategy[0]
  const [cat, setCat] = useState('All')
  const [editing, setEditing] = useState<BenefitItem | null>(null)
  const [isNew, setIsNew] = useState(false)
  const m = useMoney()
  const { currency, rate } = m
  const tip = fmtDisplay(m)
  const vcCr = useMemo(() => valueCaseByYear(items), [items])
  // Chart series in the display currency (stored values stay in ₹ Cr)
  const vc = useMemo(() => {
    const d = (cr: number) => +numMoney(cr, currency, rate)
    return vcCr.map((r) => ({ ...r, total: d(r.total), ...Object.fromEntries(BENEFIT_CATEGORIES.map((c) => [c, d(r[c])])) }))
  }, [vcCr, currency, rate])
  const fiveYear = round1(vcCr.reduce((a, r) => a + r.total, 0))
  const runRate = vcCr[Math.min(4, Math.max(0, s.runRateFromYear - 1))]?.total ?? 0
  const targetY5 = round1(items.reduce((a, b) => a + b.y5, 0))
  const forecastY5 = round1(items.reduce((a, b) => a + b.forecastCr, 0))
  const atRisk = items.filter((b) => b.status === 'At Risk').length
  const rows = items.filter((b) => cat === 'All' || b.category === cat)
  const byCat = BENEFIT_CATEGORIES.map((c) => ({ name: c, value: round1(items.filter((b) => b.category === c).reduce((a, b) => a + b.y5, 0)), color: CATEGORY_COLORS[c] }))
  const byCatDisplay = byCat.map((d) => ({ ...d, value: +m.num(d.value) }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <KpiTile tone="green" icon={<Coins size={22} />} value={m.fmt(fiveYear)} label="5-Year Benefits" sub="sum of Year 1–5" />
        <KpiTile tone="violet" icon={<TrendingUp size={22} />} value={m.fmt(runRate)} label="Annual Run-rate Benefits" sub={`from Year ${s.runRateFromYear} onwards`} />
        <KpiTile tone="blue" icon={<Gauge size={22} />} value={m.fmt(forecastY5)} label="Forecast Year-5 Run-rate" sub={<span className={forecastY5 >= targetY5 ? 'text-green-600' : 'text-amber-600'}>{targetY5 ? Math.round((forecastY5 / targetY5) * 100) : 0}% of {m.fmt(targetY5)} target</span>} />
        <KpiTile tone="amber" icon={<AlertTriangle size={22} />} value={atRisk} label="Benefits At Risk" sub={`of ${items.length} in register`} />
      </div>
      <div className="grid grid-cols-[1fr_320px] gap-4">
        <Card title={`Value Case Summary (${m.unitLabel})`} subtitle="Benefits by category per year – derived from the register below." headerRight={<Legend items={BENEFIT_CATEGORIES.map((c) => ({ label: c, color: CATEGORY_COLORS[c] }))} />}>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={vc} margin={{ top: 18, right: 8, left: -20, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={tip} />
                {BENEFIT_CATEGORIES.map((c, i) => (
                  <Bar key={c} dataKey={c} stackId="a" fill={CATEGORY_COLORS[c]} radius={i === 2 ? [4, 4, 0, 0] : 0} isAnimationActive={false}>
                    {i === 2 && <LabelList dataKey="total" position="top" style={{ fontSize: 11.5, fill: '#111827', fontWeight: 600 }} />}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Year-5 Run-rate by Category">
          <Donut size={150} inner={0.7} data={byCatDisplay} center={<><div className="text-[20px] font-bold text-ink-900 leading-none">{m.fmt(targetY5, currency === 'INR' ? 0 : 1)}</div><div className="text-[11px] text-ink-500 mt-1">Year 5</div></>} />
          <div className="mt-3 space-y-1.5">
            {byCat.map((d) => <div key={d.name} className="flex items-center justify-between text-[12.5px]"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span><span className="font-medium">{m.fmt(d.value)}</span></div>)}
          </div>
        </Card>
      </div>
      <Card title="Benefit Register" subtitle={`Each benefit with its KPI, owner, planned value by year (${m.unitLabel}), Year-5 target and current forecast.`}>
        <Toolbar left={`${rows.length} of ${items.length} benefits`}>
          <FilterSelect label="Category" value={cat} options={['All', ...BENEFIT_CATEGORIES]} onChange={setCat} />
          <button className="btn-primary" onClick={() => { setEditing(blank()); setIsNew(true) }}><Plus size={14} /> Add Benefit</button>
        </Toolbar>
        <Table<BenefitItem> rows={rows} onRowClick={(r) => { setEditing(r); setIsNew(false) }} columns={[
          { key: 'name', header: 'Benefit', render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-[11.5px] text-ink-500 mt-0.5">{r.kpi}</div></div> },
          { key: 'category', header: 'Category', render: (r) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[r.category] }} />{r.category}</span> },
          { key: 'owner', header: 'Owner' },
          ...YEARS.map((y, i) => ({ key: YEAR_KEYS[i], header: y.replace('Year ', 'Y'), className: 'text-right', render: (r: BenefitItem) => m.num(r[YEAR_KEYS[i]]) })),
          { key: 'target', header: 'Target (Y5)', className: 'text-right', render: (r) => <span className="font-semibold">{m.num(r.y5)}</span> },
          { key: 'forecastCr', header: 'Forecast', className: 'text-right', render: (r) => <span className={r.forecastCr >= r.y5 ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>{m.num(r.forecastCr)}</span> },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
        ]} />
      </Card>
      {editing && <BenefitEditor value={editing} isNew={isNew} onClose={() => setEditing(null)} onDelete={() => { remove(editing.id); setEditing(null) }} onSave={(v) => { if (isNew) add(v); else update(v); setEditing(null) }} />}
    </div>
  )
}

function BenefitEditor({ value, isNew, onClose, onSave, onDelete }: { value: BenefitItem; isNew: boolean; onClose: () => void; onSave: (v: BenefitItem) => void; onDelete: () => void }) {
  const [f, setF] = useState(value)
  const m = useMoney()
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add Benefit' : 'Edit Benefit'} footer={<EditorFooter onCancel={onClose} onSave={() => onSave(f)} onDelete={isNew ? undefined : onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Benefit"><Input {...textProps(f, setF, 'name')} /></Field>
        <Field label="Category"><Select options={BENEFIT_CATEGORIES} {...textProps(f, setF, 'category')} /></Field>
        <Field label="Status"><Select options={BENEFIT_STATUSES} {...textProps(f, setF, 'status')} /></Field>
        <Field label="KPI"><Input {...textProps(f, setF, 'kpi')} /></Field>
        <Field label="Owner"><Select options={OWNERS} {...textProps(f, setF, 'owner')} /></Field>
        <Field label="Workstream"><Select options={WORKSTREAMS} {...textProps(f, setF, 'workstream')} /></Field>
        <Field label="Measurement"><Input {...textProps(f, setF, 'measurement')} /></Field>
        <Field label={`Forecast Year-5 run-rate (${m.unitLabel})`}><Input {...moneyProps(f, setF, 'forecastCr', m)} /></Field>
      </FormGrid>
      <div className="h-3" />
      <YearFields value={f} onChange={setF} money={m} />
    </Modal>
  )
}
