/**
 * Business units – the Output view (Target Footprint) and the inline input grid shared with GCC Setup.
 */
import { useMemo } from 'react'
import clsx from 'clsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Plus, Users, Layers, CalendarClock, Briefcase, Trash2 } from 'lucide-react'
import { Card, KpiTile, Badge, Table, Legend } from '../ui'
import { tooltipStyle } from '../charts'
import { useCollection, uid } from '../../store/useStore'
import { OWNERS, SERIES } from '../../data/common'
import { seedBusinessUnits, BU_KINDS, BU_WAVES, BU_STATUSES, YEARS, YEAR_KEYS, type BusinessUnit } from '../../data/businessUnits'

export function useBusinessUnits() {
  return useCollection<BusinessUnit>('businessUnits', seedBusinessUnits)
}
const blank = (): BusinessUnit => ({ id: uid('bu'), name: 'New business unit', kind: 'Technology Practice', wave: 'Wave 1', owner: OWNERS[0], status: 'Planned', description: '', y1: 0, y2: 0, y3: 0, y4: 0, y5: 0 })

/* ------------------------------------------------------------------ */
/* Output view                                                         */
/* ------------------------------------------------------------------ */
export function BusinessUnitsOutput({ onEdit }: { onEdit?: () => void }) {
  const { items } = useBusinessUnits()
  const inScope = items.filter((s) => s.status !== 'Out of Scope')
  const totals = useMemo(() => YEAR_KEYS.map((k) => inScope.reduce((s, r) => s + (r[k] || 0), 0)), [inScope])
  const ramp = YEARS.map((y, i) => { const row: Record<string, number | string> = { year: y, total: totals[i] }; inScope.forEach((s) => { row[s.name] = s[YEAR_KEYS[i]] }); return row })
  const kinds = BU_KINDS.map((k) => ({ kind: k, n: inScope.filter((b) => b.kind === k).length, fte: inScope.filter((b) => b.kind === k).reduce((s, b) => s + b.y5, 0) }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <KpiTile tone="blue" icon={<Users size={22} />} value={totals[4]} label="Target Headcount" sub="by Year 5 (in-scope business units)" />
        <KpiTile tone="teal" icon={<Layers size={22} />} value={inScope.length} label="Business Units in Scope" sub={`${items.length - inScope.length} out of scope`} />
        <KpiTile tone="violet" icon={<CalendarClock size={22} />} value={totals[0]} label="Year 1 Headcount" sub={`${totals[4] ? Math.round((totals[0] / totals[4]) * 100) : 0}% of target`} />
        <KpiTile tone="amber" icon={<Briefcase size={22} />} value={inScope.filter((s) => s.wave === 'Wave 1').length} label="Wave 1 Business Units" sub="first to transition" />
      </div>
      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <Card title="FTE Ramp-up by Business Unit" subtitle="Planned headcount by year, stacked by business unit.">
          <div className="mb-2"><Legend items={inScope.map((s, i) => ({ label: s.name, color: SERIES[i % SERIES.length] }))} /></div>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <BarChart data={ramp} margin={{ top: 18, right: 8, left: -20, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                {inScope.map((s, i) => (
                  <Bar key={s.id} dataKey={s.name} stackId="a" fill={SERIES[i % SERIES.length]} isAnimationActive={false} radius={i === inScope.length - 1 ? [3, 3, 0, 0] : undefined}>
                    {i === inScope.length - 1 && <LabelList dataKey="total" position="top" style={{ fontSize: 11.5, fill: '#111827', fontWeight: 600 }} />}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Footprint by Type" subtitle="Business units and Year 5 FTEs by kind">
          <div className="space-y-3 pt-1">
            {kinds.map((k) => (
              <div key={k.kind} className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
                <div><div className="text-[13px] font-semibold text-ink-900">{k.kind}</div><div className="text-[11.5px] text-ink-500">{k.n} business unit{k.n === 1 ? '' : 's'}</div></div>
                <div className="text-right"><div className="text-[18px] font-bold text-brand-600">{k.fte}</div><div className="text-[11px] text-ink-500">FTEs by Year 5</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Business Units" subtitle="Practices, R&D groups and shared services the GCC will host, with transition wave, accountable owner and FTEs by year." action={onEdit && <button className="btn-primary" onClick={onEdit}><Plus size={14} /> Edit in Input view</button>}>
        <Table<BusinessUnit> compact rows={items} columns={[
          { key: 'name', header: 'Business Unit', render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-[11.5px] text-ink-500 mt-0.5 max-w-[360px] leading-snug">{r.description}</div></div> },
          { key: 'kind', header: 'Type' },
          { key: 'wave', header: 'Wave', className: 'whitespace-nowrap' },
          { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
          ...YEAR_KEYS.map((k, i) => ({ key: k, header: `${YEARS[i]} FTEs`, className: 'text-right', render: (r: BusinessUnit) => <span className={clsx(i === 4 && 'font-semibold')}>{r[k]}</span> })),
        ]} />
        <div className="flex justify-end gap-8 text-[12.5px] font-semibold text-ink-900 mt-2 pr-3">
          <span className="text-ink-500 font-normal">Total FTEs (in scope)</span>{totals.map((t, i) => <span key={i} className="w-14 text-right">{t}</span>)}
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Input grid                                                          */
/* ------------------------------------------------------------------ */
const cell = 'w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-[12px] outline-none hover:border-slate-300 focus:border-brand-400 focus:bg-white'
export function BusinessUnitGrid({ compact }: { compact?: boolean }) {
  const { items, add, update, remove } = useBusinessUnits()
  const totals = useMemo(() => YEAR_KEYS.map((k) => items.filter((b) => b.status !== 'Out of Scope').reduce((s, r) => s + (r[k] || 0), 0)), [items])
  const set = <K extends keyof BusinessUnit>(b: BusinessUnit, k: K, v: BusinessUnit[K]) => update({ ...b, [k]: v })
  return (
    <Card title={compact ? undefined : 'Business Units'} subtitle={compact ? undefined : 'Name the practices, R&D groups and shared services, who owns them, and the planned FTEs per year. Totals feed the headcount targets everywhere.'}
      action={<button className="btn-primary" onClick={() => add(blank())}><Plus size={14} /> Add business unit</button>}>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full border-separate border-spacing-0 min-w-[1240px]">
          <thead><tr>{['Business unit', 'Type', 'Description', 'Wave', 'Owner', 'Status', ...YEARS, ''].map((h, i) => <th key={i} className={clsx('text-left text-[11.5px] font-semibold text-slate-600 px-1.5 py-1.5 bg-slate-100 border-b border-slate-300 whitespace-nowrap', i >= 6 && i <= 10 && 'text-right')}>{h}</th>)}</tr></thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="hover:bg-brand-50/40">
                <td className="border-b border-slate-200 px-0.5 py-0.5 min-w-[200px]"><input className={clsx(cell, 'font-medium')} value={b.name} onChange={(e) => set(b, 'name', e.target.value)} /></td>
                <td className="border-b border-slate-200 px-0.5 py-0.5 min-w-[170px]"><select className={clsx(cell, 'cursor-pointer')} value={b.kind} onChange={(e) => set(b, 'kind', e.target.value as BusinessUnit['kind'])}>{BU_KINDS.map((k) => <option key={k}>{k}</option>)}</select></td>
                <td className="border-b border-slate-200 px-0.5 py-0.5 min-w-[260px]"><input className={cell} value={b.description} placeholder="What this unit will do" onChange={(e) => set(b, 'description', e.target.value)} /></td>
                <td className="border-b border-slate-200 px-0.5 py-0.5 min-w-[96px]"><select className={clsx(cell, 'cursor-pointer')} value={b.wave} onChange={(e) => set(b, 'wave', e.target.value as BusinessUnit['wave'])}>{BU_WAVES.map((k) => <option key={k}>{k}</option>)}</select></td>
                <td className="border-b border-slate-200 px-0.5 py-0.5 min-w-[110px]"><select className={clsx(cell, 'cursor-pointer')} value={b.owner} onChange={(e) => set(b, 'owner', e.target.value)}>{OWNERS.map((k) => <option key={k}>{k}</option>)}</select></td>
                <td className="border-b border-slate-200 px-0.5 py-0.5 min-w-[140px]"><select className={clsx(cell, 'cursor-pointer')} value={b.status} onChange={(e) => set(b, 'status', e.target.value as BusinessUnit['status'])}>{BU_STATUSES.map((k) => <option key={k}>{k}</option>)}</select></td>
                {YEAR_KEYS.map((k) => <td key={k} className="border-b border-slate-200 px-0.5 py-0.5"><input type="number" min={0} className={clsx(cell, 'w-[64px] text-right')} value={b[k]} onChange={(e) => set(b, k, Math.max(0, parseInt(e.target.value) || 0))} /></td>)}
                <td className="border-b border-slate-200 px-0.5 py-0.5"><button title="Remove" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => { if (window.confirm(`Remove ${b.name}?`)) remove(b.id) }}><Trash2 size={14} /></button></td>
              </tr>
            ))}
            <tr><td colSpan={6} className="text-right text-[12px] text-ink-500 px-2 py-2">Total FTEs (in scope)</td>{totals.map((t, i) => <td key={i} className="text-right text-[12.5px] font-semibold px-2 py-2">{t}</td>)}<td /></tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}
