import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Plus, Users, Layers, CalendarClock, Briefcase } from 'lucide-react'
import { Card, KpiTile, Badge, Table, Modal, Field, Input, Select, TextArea, FormGrid, Legend } from '../ui'
import { tooltipStyle } from '../charts'
import { useCollection, uid } from '../../store/useStore'
import { OWNERS, SERIES } from '../../data/common'
import { seedServices, SERVICE_WAVES, SERVICE_STATUSES, YEARS, YEAR_KEYS, type ServiceScope } from '../../data/strategy'
import { EditorFooter, Toolbar, YearFields, textProps } from './shared'

const blank = (): ServiceScope => ({ id: uid('svc'), name: '', wave: 'Wave 1', owner: OWNERS[0], status: 'Planned', description: '', y1: 0, y2: 0, y3: 0, y4: 0, y5: 0 })

export default function ScopeTab() {
  const { items, add, update, remove } = useCollection<ServiceScope>('strategyServices', seedServices)
  const [editing, setEditing] = useState<ServiceScope | null>(null)
  const [isNew, setIsNew] = useState(false)
  const inScope = items.filter((s) => s.status !== 'Out of Scope')
  const totals = useMemo(() => YEAR_KEYS.map((k) => inScope.reduce((s, r) => s + (r[k] || 0), 0)), [inScope])
  const ramp = YEARS.map((y, i) => { const row: Record<string, number | string> = { year: y, total: totals[i] }; inScope.forEach((s) => { row[s.name] = s[YEAR_KEYS[i]] }); return row })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <KpiTile tone="blue" icon={<Users size={22} />} value={totals[4]} label="Target Headcount" sub="by Year 5 (in-scope services)" />
        <KpiTile tone="teal" icon={<Layers size={22} />} value={inScope.length} label="Service Lines in Scope" sub={`${items.length - inScope.length} out of scope`} />
        <KpiTile tone="violet" icon={<CalendarClock size={22} />} value={totals[0]} label="Year 1 Headcount" sub={`${totals[4] ? Math.round((totals[0] / totals[4]) * 100) : 0}% of target`} />
        <KpiTile tone="amber" icon={<Briefcase size={22} />} value={inScope.filter((s) => s.wave === 'Wave 1').length} label="Wave 1 Services" sub="first to transition" />
      </div>
      <Card title="FTE Ramp-up by Service Line" subtitle="Planned headcount by year, stacked by service line." headerRight={<Legend items={inScope.map((s, i) => ({ label: s.name, color: SERIES[i % SERIES.length] }))} />}>
        <div className="h-[240px]">
          <ResponsiveContainer>
            <BarChart data={ramp} margin={{ top: 18, right: 8, left: -20, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
              {inScope.map((s, i) => (
                <Bar key={s.id} dataKey={s.name} stackId="a" fill={SERIES[i % SERIES.length]} radius={i === inScope.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false}>
                  {i === inScope.length - 1 && <LabelList dataKey="total" position="top" style={{ fontSize: 11.5, fill: '#111827', fontWeight: 600 }} />}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Scope of Services" subtitle="Service lines, transition wave, accountable owner and FTEs by year.">
        <Toolbar left={`${items.length} service lines · ${totals[4]} FTEs by Year 5`}>
          <button className="btn-primary" onClick={() => { setEditing(blank()); setIsNew(true) }}><Plus size={14} /> Add Service</button>
        </Toolbar>
        <Table<ServiceScope> rows={items} onRowClick={(r) => { setEditing(r); setIsNew(false) }} columns={[
          { key: 'name', header: 'Service Line', render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-[11.5px] text-ink-500 mt-0.5 max-w-[320px] leading-snug">{r.description}</div></div> },
          { key: 'wave', header: 'Wave' },
          { key: 'owner', header: 'Owner' },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
          ...YEARS.map((y, i) => ({ key: YEAR_KEYS[i], header: `${y} FTEs`, className: 'text-right', render: (r: ServiceScope) => <span className={i === 4 ? 'font-semibold' : ''}>{r[YEAR_KEYS[i]]}</span> })),
        ]} />
        <div className="flex justify-end gap-6 text-[12.5px] mt-2 pr-3">
          <span className="text-ink-500">Total FTEs (in scope)</span>
          {totals.map((t, i) => <span key={i} className="font-semibold w-16 text-right">{t}</span>)}
        </div>
      </Card>
      {editing && <ServiceEditor value={editing} isNew={isNew} onClose={() => setEditing(null)} onDelete={() => { remove(editing.id); setEditing(null) }} onSave={(v) => { if (isNew) add(v); else update(v); setEditing(null) }} />}
    </div>
  )
}

function ServiceEditor({ value, isNew, onClose, onSave, onDelete }: { value: ServiceScope; isNew: boolean; onClose: () => void; onSave: (v: ServiceScope) => void; onDelete: () => void }) {
  const [f, setF] = useState(value)
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add Service Line' : 'Edit Service Line'} footer={<EditorFooter onCancel={onClose} onSave={() => onSave(f)} onDelete={isNew ? undefined : onDelete} />}>
      <FormGrid cols={2}>
        <Field label="Service line"><Input {...textProps(f, setF, 'name')} /></Field>
        <Field label="Owner"><Select options={OWNERS} {...textProps(f, setF, 'owner')} /></Field>
        <Field label="Wave"><Select options={SERVICE_WAVES} {...textProps(f, setF, 'wave')} /></Field>
        <Field label="Status"><Select options={SERVICE_STATUSES} {...textProps(f, setF, 'status')} /></Field>
      </FormGrid>
      <div className="h-3" />
      <Field label="Description"><TextArea {...textProps(f, setF, 'description')} /></Field>
      <div className="h-3" />
      <YearFields value={f} onChange={setF} unit="FTEs" />
    </Modal>
  )
}
