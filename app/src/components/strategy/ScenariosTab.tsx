import { useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Plus, GitBranch, Clock, Percent, Users } from 'lucide-react'
import { Card, KpiTile, Badge, Table, Modal, Field, Input, TextArea, FormGrid, Legend } from '../ui'
import { tooltipStyle } from '../charts'
import { useCollection, uid } from '../../store/useStore'
import { CHART_COLORS } from '../../data/common'
import { seedScenarios, fmtYears, type Scenario } from '../../data/strategy'
import { EditorFooter, Toolbar, numProps, moneyProps, textProps, fmtDisplay } from './shared'
import { useMoney } from '../../data/money'

const blank = (): Scenario => ({ id: uid('scn'), name: '', investmentCr: 12, annualBenefitsCr: 48, paybackYears: 3.5, irrPct: 25, headcountY5: 150, rampMonths: 36, costSavingsPct: 40, isBase: false, assumptions: '' })

export default function ScenariosTab() {
  const { items, add, update, remove, setAll } = useCollection<Scenario>('strategyScenarios', seedScenarios)
  const [editing, setEditing] = useState<Scenario | null>(null)
  const [isNew, setIsNew] = useState(false)
  const base = items.find((s) => s.isBase) ?? items[0]
  const m = useMoney()
  const invKey = `Investment (${m.unitLabel})`, benKey = `Annual Benefits (${m.unitLabel})`
  // Chart series in the display currency (stored values stay in ₹ Cr)
  const chart = items.map((s) => ({ name: s.name, [invKey]: +m.num(s.investmentCr), [benKey]: +m.num(s.annualBenefitsCr), 'IRR (%)': s.irrPct }))
  const tipMoney = fmtDisplay(m)
  const tip = (v: unknown, name: unknown) => (name === 'IRR (%)' ? `${v}%` : tipMoney(v))
  const save = (v: Scenario) => {
    if (v.isBase) setAll(items.filter((s) => s.id !== v.id).map((s) => ({ ...s, isBase: false })).concat(v))
    else if (isNew) add(v); else update(v)
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <KpiTile tone="blue" icon={<GitBranch size={22} />} value={items.length} label="Scenarios Modelled" sub={base ? `Base: ${base.name}` : ''} />
        <KpiTile tone="green" icon={<Percent size={22} />} value={base ? `${base.irrPct}%` : '—'} label="Base Case IRR" sub="5-year view" />
        <KpiTile tone="violet" icon={<Clock size={22} />} value={base ? fmtYears(base.paybackYears) : '—'} label="Base Case Payback" sub={base ? `${m.fmt(base.investmentCr)} investment` : ''} />
        <KpiTile tone="teal" icon={<Users size={22} />} value={base?.headcountY5 ?? '—'} label="Base Case Headcount" sub={base ? `ramp over ${base.rampMonths} months` : ''} />
      </div>
      <div className="grid grid-cols-[1.1fr_1fr] gap-4">
        <Card title={`Scenario Comparison (${m.unitLabel})`} subtitle="Investment and annual benefits per scenario; IRR plotted on the right axis." headerRight={<Legend items={[{ label: invKey, color: CHART_COLORS.blueFaint }, { label: benKey, color: CHART_COLORS.blue }, { label: 'IRR (%)', color: CHART_COLORS.green }]} />}>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <ComposedChart data={chart} margin={{ top: 18, right: 0, left: -20, bottom: 0 }} barGap={4} barCategoryGap="30%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis yAxisId="l" tickLine={false} axisLine={false} />
                <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} domain={[0, 50]} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={tip} />
                <Bar yAxisId="l" dataKey={invKey} fill={CHART_COLORS.blueFaint} radius={[4, 4, 0, 0]} isAnimationActive={false}><LabelList dataKey={invKey} position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
                <Bar yAxisId="l" dataKey={benKey} fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} isAnimationActive={false}><LabelList dataKey={benKey} position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
                <Line yAxisId="r" dataKey="IRR (%)" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.green, strokeWidth: 0 }} isAnimationActive={false}><LabelList dataKey="IRR (%)" position="top" offset={14} formatter={(v: unknown) => `${v}%`} style={{ fontSize: 11, fill: '#15803D', fontWeight: 700, paintOrder: 'stroke', stroke: '#fff', strokeWidth: 4 }} /></Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Scenario Assumptions">
          <div className="space-y-3">
            {items.map((s) => (
              <div key={s.id} className={`rounded-lg border p-3 cursor-pointer hover:bg-surface ${s.isBase ? 'border-brand-300 bg-brand-50/40' : 'border-line'}`} onClick={() => { setEditing(s); setIsNew(false) }}>
                <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{s.name}</span>{s.isBase && <Badge value="Base" className="bg-brand-50 text-brand-600" />}</div>
                <p className="text-[12.5px] text-ink-700 mt-1 leading-snug">{s.assumptions || 'No assumptions recorded.'}</p>
                <div className="flex gap-4 mt-2 text-[11.5px] text-ink-500"><span>Headcount Y5: <b className="text-ink-900">{s.headcountY5}</b></span><span>Ramp: <b className="text-ink-900">{s.rampMonths} months</b></span><span>Cost savings: <b className="text-ink-900">{s.costSavingsPct}%</b></span></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Scenario Analysis (5-year view)" subtitle="Click a row to edit assumptions. Marking a scenario as Base updates the headline KPIs.">
        <Toolbar left={`${items.length} scenarios`}>
          <button className="btn-primary" onClick={() => { setEditing(blank()); setIsNew(true) }}><Plus size={14} /> Add Scenario</button>
        </Toolbar>
        <Table<Scenario> rows={items} onRowClick={(r) => { setEditing(r); setIsNew(false) }} columns={[
          { key: 'name', header: 'Scenario', render: (r) => <span className={r.isBase ? 'font-semibold' : ''}>{r.name}{r.isBase && <span className="ml-2 text-[11px] text-brand-600 font-medium">Base</span>}</span> },
          { key: 'investmentCr', header: invKey, render: (r) => m.num(r.investmentCr) },
          { key: 'annualBenefitsCr', header: benKey, render: (r) => m.num(r.annualBenefitsCr) },
          { key: 'paybackYears', header: 'Payback Period', render: (r) => fmtYears(r.paybackYears) },
          { key: 'irrPct', header: 'IRR', render: (r) => `${r.irrPct}%` },
          { key: 'headcountY5', header: 'Headcount (Y5)' },
          { key: 'rampMonths', header: 'Ramp (months)' },
          { key: 'costSavingsPct', header: 'Cost Savings', render: (r) => `${r.costSavingsPct}%` },
          { key: 'ratio', header: 'Benefit / Investment', render: (r) => `${(r.annualBenefitsCr / (r.investmentCr || 1)).toFixed(1)}x` },
        ]} />
      </Card>
      {editing && <ScenarioEditor value={editing} isNew={isNew} onClose={() => setEditing(null)} onDelete={() => { remove(editing.id); setEditing(null) }} onSave={save} />}
    </div>
  )
}

function ScenarioEditor({ value, isNew, onClose, onSave, onDelete }: { value: Scenario; isNew: boolean; onClose: () => void; onSave: (v: Scenario) => void; onDelete: () => void }) {
  const [f, setF] = useState(value)
  const m = useMoney()
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add Scenario' : `Edit Scenario – ${value.name}`} footer={<EditorFooter onCancel={onClose} onSave={() => onSave(f)} onDelete={isNew ? undefined : onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Scenario"><Input {...textProps(f, setF, 'name')} /></Field>
        <Field label="Base case"><select className="input" value={f.isBase ? 'Yes' : 'No'} onChange={(e) => setF({ ...f, isBase: e.target.value === 'Yes' })}><option>Yes</option><option>No</option></select></Field>
        <Field label={`Investment (${m.unitLabel})`}><Input {...moneyProps(f, setF, 'investmentCr', m)} /></Field>
        <Field label={`Annual benefits (${m.unitLabel})`}><Input {...moneyProps(f, setF, 'annualBenefitsCr', m)} /></Field>
        <Field label="Payback period (years)"><Input {...numProps(f, setF, 'paybackYears')} /></Field>
        <Field label="IRR (%)"><Input {...numProps(f, setF, 'irrPct')} /></Field>
        <Field label="Headcount by Year 5"><Input {...numProps(f, setF, 'headcountY5')} /></Field>
        <Field label="Ramp-up (months)"><Input {...numProps(f, setF, 'rampMonths')} /></Field>
        <Field label="Cost savings (%)"><Input {...numProps(f, setF, 'costSavingsPct')} /></Field>
      </FormGrid>
      <div className="h-3" />
      <Field label="Assumptions"><TextArea {...textProps(f, setF, 'assumptions')} /></Field>
    </Modal>
  )
}
