/**
 * Target Footprint – Output view. Mirrors the client's "IT GCC Target Footprint & Headcount Ramp-Up" slide in the
 * Command Center style: KPI tiles, the capability footprint table with the monthly ramp, four summary charts,
 * the years 2–5 outlook and a business-unit deep dive. Everything is derived from 'businessUnits' + 'subUnits'.
 */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, LineChart, Line } from 'recharts'
import { Users, BarChart3, Globe, Settings2, Pencil } from 'lucide-react'
import { Card, KpiTile, Badge, FilterSelect } from '../ui'
import { Donut, BarList, tooltipStyle } from '../charts'
import { CHART_COLORS } from '../../data/common'
import { RAMP_MONTHS, YEARS, YEAR_KEYS, GEOGRAPHIES, subUnitsOf, subY1, buShortName, type BusinessUnit, type SubUnit } from '../../data/businessUnits'
import { useBusinessUnits, DomainIcon, domainColor, GEO_COLORS, geoShort, waveShort, WAVE_BADGE, monthLong, monthAxis, monthReached, monthStarted } from './BusinessUnits'

const th = 'text-left text-[11px] font-semibold text-ink-700 px-1.5 py-1.5 bg-brand-50 border-b border-brand-100 align-bottom leading-tight'
const td = 'px-1.5 py-1 text-[11.5px] text-ink-900 border-b border-line/70 align-middle leading-snug'
const num = 'text-right tabular-nums'
const dash = (v: number) => (v ? v : <span className="text-ink-400">–</span>)
const pct = (v: number, t: number) => (t ? `${Math.round((v / t) * 100)}%` : '0%')
const waveNo = (w: string) => parseInt(w.replace(/\D/g, ''), 10) || 0

export function TargetFootprintOutput({ initialUnit, onEdit }: { initialUnit?: string; onEdit?: () => void }) {
  const { items, subUnits } = useBusinessUnits()
  const units = useMemo(() => items.filter((u) => u.status !== 'Out of Scope'), [items])
  const rows = useMemo(() => units.map((u) => ({ u, i: items.indexOf(u), subs: subUnitsOf(subUnits.items, u.id) })), [units, items, subUnits.items])
  const subs = useMemo(() => rows.flatMap((r) => r.subs), [rows])
  const ramp = useMemo(() => RAMP_MONTHS.map((_, i) => subs.reduce((t, s) => t + (s.ramp[i] ?? 0), 0)), [subs])
  const total = ramp[ramp.length - 1] ?? 0
  const reached = monthReached(ramp)
  const started = monthStarted(ramp)
  const months = RAMP_MONTHS.slice(0, Math.max(6, reached + 1))
  const waves = useMemo(() => [...new Set(subs.map((s) => s.wave))].sort((a, b) => waveNo(a) - waveNo(b)), [subs])
  const geos = useMemo(() => { const set = new Set(subs.map((s) => s.geography)); return [...GEOGRAPHIES.filter((g) => set.has(g)), ...[...set].filter((g) => !(GEOGRAPHIES as readonly string[]).includes(g))] }, [subs])
  // a capability serving "Global / Multi-region" supports every ENGIE business; otherwise list the regions served
  const global = geos.some((g) => g.startsWith('Global'))
  const covered = global ? [...new Set([...GEOGRAPHIES, ...geos])] : geos
  const current = subs.reduce((t, s) => t + s.currentHc, 0)
  const targetSum = subs.reduce((t, s) => t + s.targetHc, 0)
  const byGbu = useMemo(() => { const m = new Map<string, number>(); subs.forEach((s) => m.set(s.gbuServed || '—', (m.get(s.gbuServed || '—') ?? 0) + subY1(s))); return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value) }, [subs])
  const byGeo = useMemo(() => geos.map((g, i) => ({ name: g, value: subs.filter((s) => s.geography === g).reduce((t, s) => t + subY1(s), 0), color: GEO_COLORS[i % GEO_COLORS.length] })), [geos, subs])
  const yearTotals = YEAR_KEYS.map((k) => units.reduce((t, u) => t + u[k], 0))
  const rampData = months.map((m, i) => ({ month: monthAxis(m), 'Pune HC': ramp[i] }))

  const names = units.map((u) => u.name)
  const [sel, setSel] = useState(initialUnit ?? '')
  const unit = units.find((u) => u.name === sel) ?? units[0]

  return (
    <div className="space-y-4">
      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-4">
        <KpiTile tone="blue" icon={<Users size={22} />} value={total} label="Total Target Pune IT Headcount" sub={`by ${monthLong(RAMP_MONTHS[reached])} · ${current} current HC at source`} />
        <KpiTile tone="green" icon={<BarChart3 size={22} />} value={waves.length} label="Transition Waves" sub={`from ${monthLong(RAMP_MONTHS[started])} to ${monthLong(RAMP_MONTHS[reached])}`} />
        <KpiTile tone="violet" icon={<Globe size={22} />} value={<span className="text-[18px]">{global || geos.length >= GEOGRAPHIES.length ? 'All ENGIE Businesses' : `${geos.length} Region${geos.length === 1 ? '' : 's'}`}</span>} label="Supports" sub={covered.map(geoShort).join(', ') || '—'} />
        <KpiTile tone="amber" icon={<Settings2 size={22} />} value={<>{units.length} <span className="text-[16px]">IT Domains</span></>} label="Covers" sub={<span className="block leading-tight" title={units.map((u) => u.name).join(', ')}>{units.map((u) => buShortName(u.name)).join(', ')}</span>} />
      </div>

      {/* Footprint table */}
      <Card title="Target IT Footprint by Capability with Headcount Ramp-Up" subtitle="Every capability the GCC delivers from Pune, who it serves, where the work comes from and how the headcount ramps month by month."
        action={onEdit && <button className="btn-primary" onClick={onEdit}><Pencil size={13} /> Edit in Input view</button>}>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full border-separate border-spacing-0 min-w-[1080px]">
            <thead>
              <tr>
                {['IT Domain', 'Capability / Service', 'GBU / BU Served', 'Geography', 'Country / Entity', 'Current Delivery Location'].map((h) => <th key={h} rowSpan={2} className={clsx(th, h === 'Current Delivery Location' && 'max-w-[90px]')}>{h}</th>)}
                <th rowSpan={2} className={clsx(th, num)}>Current HC</th>
                <th rowSpan={2} className={clsx(th, num, 'bg-green-50 border-green-100 text-green-800')}>Target Pune HC</th>
                {['Role / Skill', 'Transition Type'].map((h) => <th key={h} rowSpan={2} className={th}>{h}</th>)}
                <th rowSpan={2} className={clsx(th, 'bg-amber-50 border-amber-100 text-amber-800')}>Wave</th>
                <th colSpan={months.length} className={clsx(th, 'text-center bg-brand-100/60')}>Monthly Headcount Ramp-Up (Pune)</th>
              </tr>
              <tr>{months.map((m) => <th key={m} className={clsx(th, num, 'bg-brand-100/60')}>{m.split(' ')[0]}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => r.subs.map((s, j) => (
                <tr key={s.id} className="hover:bg-brand-50/40">
                  <td className={clsx(td, 'whitespace-nowrap', j === 0 && r.i > 0 && 'border-t border-t-line')}>
                    <span className="inline-flex items-center gap-1.5 font-medium" title={r.u.name}><span className="w-5 h-5 rounded flex items-center justify-center text-white shrink-0" style={{ background: domainColor(r.i) }}><DomainIcon name={r.u.icon} size={12} /></span>{buShortName(r.u.name)}</span>
                  </td>
                  <td className={clsx(td, 'font-medium')}>{s.name}</td>
                  <td className={clsx(td, 'max-w-[130px]')}>{s.gbuServed}</td>
                  <td className={td}>{geoShort(s.geography)}</td>
                  <td className={td}>{s.countryEntity}</td>
                  <td className={td}>{s.deliveryLocation}</td>
                  <td className={clsx(td, num)}>{dash(s.currentHc)}</td>
                  <td className={clsx(td, num, 'font-semibold bg-green-50/60 text-green-800')}>{dash(s.targetHc)}</td>
                  <td className={clsx(td, 'max-w-[140px]')}>{s.roleSkill}</td>
                  <td className={clsx(td, 'max-w-[90px]')}>{s.transitionType}</td>
                  <td className={clsx(td, 'text-center')}><span className={clsx('inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold', WAVE_BADGE[s.wave] ?? 'bg-slate-100 text-slate-700')}>{waveShort(s.wave)}</span></td>
                  {months.map((_, i) => <td key={i} className={clsx(td, num, i === reached && 'font-semibold')}>{dash(s.ramp[i] ?? 0)}</td>)}
                </tr>
              )))}
              <tr className="bg-surface/80">
                <td className={clsx(td, 'font-bold text-[12px] border-t-2 border-slate-300 border-b-0')}>TOTAL</td>
                {Array.from({ length: 5 }).map((_, i) => <td key={i} className={clsx(td, 'text-ink-400 border-t-2 border-slate-300 border-b-0')}>–</td>)}
                <td className={clsx(td, num, 'font-bold text-[12px] border-t-2 border-slate-300 border-b-0')}>{current}</td>
                <td className={clsx(td, num, 'font-bold text-[12px] border-t-2 border-slate-300 border-b-0 bg-green-50 text-green-800')}>{targetSum}</td>
                {Array.from({ length: 3 }).map((_, i) => <td key={i} className={clsx(td, 'text-ink-400 border-t-2 border-slate-300 border-b-0')}>–</td>)}
                {months.map((_, i) => <td key={i} className={clsx(td, num, 'font-bold text-[12px] border-t-2 border-slate-300 border-b-0', i === reached && 'text-brand-600')}>{ramp[i]}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Four summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card title="Target Headcount by IT Domain">
          <div className="flex items-center gap-3">
            <Donut size={112} inner={0.66} data={rows.map((r) => ({ name: buShortName(r.u.name), value: r.u.y1, color: domainColor(r.i) }))} center={<><div className="text-[18px] font-bold text-ink-900 leading-none">{total}</div><div className="text-[10.5px] text-ink-500 mt-0.5">Pune HC</div></>} />
            <ul className="flex-1 min-w-0 space-y-1 text-[11px]">
              {rows.map((r) => <li key={r.u.id} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: domainColor(r.i) }} /><span className="truncate text-ink-700" title={r.u.name}>{buShortName(r.u.name)}</span><span className="ml-auto font-semibold text-ink-900 whitespace-nowrap">{r.u.y1} <span className="font-normal text-ink-500">({pct(r.u.y1, total)})</span></span></li>)}
            </ul>
          </div>
        </Card>
        <Card title="Headcount Ramp-Up (All Domains)" subtitle="Cumulative Pune HC, year 1">
          <div className="h-[170px]">
            <ResponsiveContainer>
              <BarChart data={rampData} margin={{ top: 18, right: 4, left: -22, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#E3E8F0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#6B7280' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#6B7280' }} allowDecimals={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="Pune HC" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} isAnimationActive={false}><LabelList dataKey="Pune HC" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Target Headcount by GBU / Business" subtitle="Year-1 Pune HC by the GBU served">
          <BarList rows={byGbu.slice(0, 7)} color={CHART_COLORS.blue} labelWidth={176} />
        </Card>
        <Card title="Target Headcount by Geography">
          <div className="flex items-center gap-3">
            <Donut size={112} inner={0.66} data={byGeo} center={<><div className="text-[18px] font-bold text-ink-900 leading-none">{total}</div><div className="text-[10.5px] text-ink-500 mt-0.5">Pune HC</div></>} />
            <ul className="flex-1 min-w-0 space-y-1.5 text-[11px]">
              {byGeo.map((g) => <li key={g.name} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: g.color }} /><span className="truncate text-ink-700" title={g.name}>{geoShort(g.name)}</span><span className="ml-auto font-semibold text-ink-900 whitespace-nowrap">{g.value} <span className="font-normal text-ink-500">({pct(g.value, total)})</span></span></li>)}
            </ul>
          </div>
        </Card>
      </div>

      {/* Years 2–5 outlook */}
      <Card title="Years 2–5 outlook" subtitle="Year 1 is tracked month by month (above); from year 2 the plan carries annual exit headcount targets by business unit.">
        <div className="grid grid-cols-[1.35fr_1fr] gap-6">
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={th}>Business unit (IT domain)</th>{YEARS.map((y, i) => <th key={y} className={clsx(th, num)}>{y}{i === 0 && <span className="block text-[10px] font-normal text-ink-500">{monthLong(RAMP_MONTHS[reached])}</span>}</th>)}<th className={clsx(th, num)}>Y1 → Y5</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.u.id} className="hover:bg-brand-50/40">
                  <td className={clsx(td, 'whitespace-nowrap')}><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: domainColor(r.i) }} />{r.u.name}</span></td>
                  {YEAR_KEYS.map((k, i) => <td key={k} className={clsx(td, num, i === 0 && 'font-medium')}>{r.u[k]}</td>)}
                  <td className={clsx(td, num, 'text-green-700 font-medium')}>{r.u.y1 ? `+${Math.round(((r.u.y5 - r.u.y1) / r.u.y1) * 100)}%` : '—'}</td>
                </tr>
              ))}
              <tr className="bg-surface/80"><td className={clsx(td, 'font-bold border-t-2 border-slate-300 border-b-0')}>Program total</td>{yearTotals.map((v, i) => <td key={i} className={clsx(td, num, 'font-bold border-t-2 border-slate-300 border-b-0')}>{v}</td>)}<td className={clsx(td, num, 'font-bold text-green-700 border-t-2 border-slate-300 border-b-0')}>{yearTotals[0] ? `+${Math.round(((yearTotals[4] - yearTotals[0]) / yearTotals[0]) * 100)}%` : '—'}</td></tr>
            </tbody>
          </table>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={YEARS.map((y, i) => ({ year: y, 'Pune HC': yearTotals[i] }))} margin={{ top: 18, right: 4, left: -22, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid vertical={false} stroke="#E3E8F0" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#6B7280' }} allowDecimals={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="Pune HC" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} isAnimationActive={false}><LabelList dataKey="Pune HC" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Business-unit deep dive */}
      <Card title="Business unit deep dive" subtitle="Pick a business unit to see its capabilities, month-wise ramp and the GBU / geography split." headerRight={unit && <FilterSelect label="Business unit" value={unit.name} options={names} onChange={setSel} />}>
        <div className="grid grid-cols-7 gap-3 mb-4">
          {rows.map((r) => (
            <button key={r.u.id} onClick={() => setSel(r.u.name)} className={clsx('text-left rounded-lg border px-3 py-2.5 cursor-pointer transition-colors min-w-0', unit?.id === r.u.id ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100' : 'border-line hover:bg-surface')}>
              <div className="flex items-center gap-1.5 min-w-0"><span className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0" style={{ background: domainColor(r.i) }}><DomainIcon name={r.u.icon} size={13} /></span><span className="text-[12px] font-semibold text-ink-900 truncate" title={r.u.name}>{buShortName(r.u.name)}</span></div>
              <div className="text-[20px] font-bold text-navy-900 leading-tight mt-1">{r.u.y1}</div>
              <div className="text-[11px] text-ink-500 truncate">{r.subs.length} capabilities · {r.u.wave}</div>
            </button>
          ))}
        </div>
        {unit && <UnitDeepDive unit={unit} index={items.indexOf(unit)} subs={subUnitsOf(subUnits.items, unit.id)} />}
      </Card>
    </div>
  )
}

function UnitDeepDive({ unit, index, subs }: { unit: BusinessUnit; index: number; subs: SubUnit[] }) {
  const color = domainColor(index)
  const ramp = RAMP_MONTHS.map((_, i) => subs.reduce((t, s) => t + (s.ramp[i] ?? 0), 0))
  const reached = monthReached(ramp)
  const current = subs.reduce((t, s) => t + s.currentHc, 0)
  const waves = [...new Set(subs.map((s) => s.wave))].sort((a, b) => waveNo(a) - waveNo(b))
  const agg = (key: (s: SubUnit) => string) => { const m = new Map<string, number>(); subs.forEach((s) => m.set(key(s), (m.get(key(s)) ?? 0) + subY1(s))); return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value) }
  const stat = (label: string, value: React.ReactNode) => <div className="rounded-lg border border-line px-3 py-2 min-w-0"><div className="text-[11px] text-ink-500">{label}</div><div className="text-[15px] font-bold text-ink-900 truncate">{value}</div></div>
  return (
    <div>
      <div className="flex items-start gap-3 mb-3">
        <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: color }}><DomainIcon name={unit.icon} size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h4 className="text-[15px] font-semibold text-ink-900">{unit.name}</h4><Badge value={unit.status} /></div>
          <p className="text-[12px] text-ink-500 mt-0.5">{unit.description || 'No description yet.'}</p>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-3 mb-4">
        {stat('Capabilities', subs.length)}
        {stat('Current HC at source', current)}
        {stat('Target Pune HC (year 1)', <span style={{ color }}>{unit.y1}</span>)}
        {stat('Reached by', monthLong(RAMP_MONTHS[reached]))}
        {stat('Waves', waves.map(waveShort).join(', ') || '—')}
        {stat('Owner', unit.owner)}
      </div>
      <div className="grid grid-cols-[1.55fr_1fr] gap-4">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full border-separate border-spacing-0">
            <thead><tr>{['Capability / Service', 'GBU served', 'Geography', 'From', 'Role / Skill', 'Type', 'Wave'].map((h) => <th key={h} className={th}>{h}</th>)}<th className={clsx(th, num)}>Current HC</th><th className={clsx(th, num, 'bg-green-50 border-green-100 text-green-800')}>Target Pune HC</th><th className={clsx(th, num)}>Year 5</th></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-brand-50/40">
                  <td className={clsx(td, 'font-medium')}>{s.name}</td>
                  <td className={clsx(td, 'max-w-[120px]')}>{s.gbuServed}</td>
                  <td className={td}>{geoShort(s.geography)}</td>
                  <td className={td}>{s.deliveryLocation}</td>
                  <td className={clsx(td, 'max-w-[130px]')}>{s.roleSkill}</td>
                  <td className={clsx(td, 'max-w-[80px]')}>{s.transitionType}</td>
                  <td className={clsx(td, 'text-center')}><span className={clsx('inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold', WAVE_BADGE[s.wave] ?? 'bg-slate-100 text-slate-700')}>{waveShort(s.wave)}</span></td>
                  <td className={clsx(td, num)}>{dash(s.currentHc)}</td>
                  <td className={clsx(td, num, 'font-semibold bg-green-50/60 text-green-800')}>{dash(subY1(s))}</td>
                  <td className={clsx(td, num, 'text-ink-700')}>{dash(s.y5)}</td>
                </tr>
              ))}
              {subs.length === 0 && <tr><td colSpan={10} className={clsx(td, 'text-center text-ink-500 italic py-5')}>No capabilities configured for this business unit yet.</td></tr>}
              <tr className="bg-surface/80"><td className={clsx(td, 'font-bold border-t-2 border-slate-300 border-b-0')} colSpan={7}>Total</td><td className={clsx(td, num, 'font-bold border-t-2 border-slate-300 border-b-0')}>{current}</td><td className={clsx(td, num, 'font-bold border-t-2 border-slate-300 border-b-0 bg-green-50 text-green-800')}>{unit.y1}</td><td className={clsx(td, num, 'font-bold border-t-2 border-slate-300 border-b-0')}>{unit.y5}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="space-y-4 min-w-0">
          <div>
            <div className="text-[12.5px] font-semibold text-ink-900 mb-1">Month-wise ramp · year 1 <span className="font-normal text-ink-500">(cumulative Pune HC)</span></div>
            <div className="h-[150px]">
              <ResponsiveContainer>
                <LineChart data={RAMP_MONTHS.map((m, i) => ({ month: monthAxis(m), 'Pune HC': ramp[i] }))} margin={{ top: 14, right: 10, left: -22, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E3E8F0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} interval={1} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#6B7280' }} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="Pune HC" stroke={color} strokeWidth={2} dot={{ r: 2.5, fill: color, strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-4">
            <div className="min-w-0"><div className="text-[12.5px] font-semibold text-ink-900 mb-2">By GBU served</div><BarList rows={agg((s) => s.gbuServed || '—')} color={color} labelWidth={190} /></div>
            <div><div className="text-[12.5px] font-semibold text-ink-900 mb-2">By geography</div><BarList rows={agg((s) => s.geography)} color={color} labelWidth={190} /></div>
          </div>
        </div>
      </div>
    </div>
  )
}
