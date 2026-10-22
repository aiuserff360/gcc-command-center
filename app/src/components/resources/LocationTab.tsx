import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'
import { Plus, MapPin } from 'lucide-react'
import { Card, Table, Progress } from '../ui'
import { Donut, tooltipStyle } from '../charts'
import { isOpenPosition, LOCATION_COLORS, type LocationRow } from '../../data/resources'
import type { ResourceData } from './useResourceData'
import { MiniStat } from './widgets'
import { LocationForm } from './forms'

export default function LocationTab({ d }: { d: ResourceData }) {
  const { locationMix, positions, employees, kpi, settings } = d
  const [loc, setLoc] = useState<LocationRow | null>(null)
  const [adding, setAdding] = useState(false)

  const total = kpi.locationTotal
  const seats = locationMix.items.reduce((s, l) => s + l.seats, 0)
  const base = locationMix.items[0]?.name ?? 'Pune'
  const single = locationMix.items.length === 1
  const rows = locationMix.items.map((l) => ({
    ...l, share: total ? Math.round((l.ftes / total) * 100) : 0, seatUtil: l.seats ? Math.round((l.ftes / l.seats) * 100) : 0,
    openPositions: positions.items.filter((p) => isOpenPosition(p) && p.location === l.name).length,
    sample: employees.items.filter((e) => e.location === l.name).length,
    weightedCost: +(l.costIndex * (l.ftes / (total || 1))).toFixed(3),
  }))
  const blended = +rows.reduce((s, r) => s + r.weightedCost, 0).toFixed(2)
  const seatsNeeded = Math.round(settings.fteTarget * settings.seatRatio)

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <MiniStat label="Locations" value={locationMix.items.length} sub={single ? `${base} only for now` : 'Active GCC sites'} />
        <MiniStat label="FTEs onboarded" value={total} sub={single ? `All in ${base} · ${kpi.onboarded} per headcount actuals` : 'Across all locations'} />
        <MiniStat label="Seats" value={seats} sub={`${seats ? Math.round((total / seats) * 100) : 0}% seat utilisation`} />
        <MiniStat label="Seats needed at target" value={seatsNeeded} sub={`${settings.fteTarget} FTEs × ${settings.seatRatio} seat ratio`} tone={seatsNeeded > seats ? 'text-amber-600' : 'text-green-600'} />
        <MiniStat label="Open positions" value={rows.reduce((s, r) => s + r.openPositions, 0)} sub={single ? `All hiring in ${base}` : 'Across locations'} tone="text-red-600" />
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <Card title="Location Mix" subtitle={single ? `The ENGIE IT GCC is a single-site centre in ${base}. Add a second location when the footprint expands – positions and employees can then be assigned to it.` : 'Click a row to edit FTEs, seats and cost index'} action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus size={14} /> Add Location</button>}>
          <Table compact rows={rows} onRowClick={(r) => setLoc(r)} columns={[
            { key: 'name', header: 'Location', render: (r) => <span className="inline-flex items-center gap-2 font-medium"><span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />{r.name}</span> },
            { key: 'office', header: 'Office / Campus', render: (r) => <span className="text-ink-500">{r.office}</span> },
            { key: 'ftes', header: 'FTEs', className: 'text-right' },
            { key: 'share', header: 'Share', className: 'text-right', render: (r) => `${r.share}%` },
            { key: 'seats', header: 'Seats', className: 'text-right' },
            { key: 'seatUtil', header: 'Seat Utilisation', render: (r) => <span className="flex items-center gap-2"><Progress value={r.seatUtil} className="w-[70px]" color={r.seatUtil > 95 ? '#DC2626' : r.seatUtil > 80 ? '#F59E0B' : '#16A34A'} /><span className="w-9 text-right">{r.seatUtil}%</span></span> },
            { key: 'costIndex', header: 'Cost Index', className: 'text-right', render: (r) => r.costIndex.toFixed(2) },
            { key: 'openPositions', header: 'Open Positions', className: 'text-right', render: (r) => <span className={r.openPositions ? 'text-red-600 font-medium' : ''}>{r.openPositions}</span> },
          ]} />
          {single && (
            <div className="mt-3 rounded-lg border border-dashed border-line px-4 py-3 flex items-center gap-3 text-[12.5px] text-ink-500">
              <MapPin size={16} className="text-brand-600 shrink-0" />
              <span><b className="text-ink-900">{base} = 100% of the footprint.</b> Blended cost index {blended.toFixed(2)} ({base} = 1.00). Seat utilisation will reach {seats ? Math.round((settings.fteTarget / seats) * 100) : 0}% at the {settings.fteTarget}-FTE target – plan the next floor or a second site before then.</span>
            </div>
          )}
        </Card>
        <Card title="FTE Distribution">
          <div className="flex items-center gap-5">
            <Donut size={170} inner={0.62} data={locationMix.items.map((l) => ({ name: l.name, value: l.ftes, color: l.color }))}
              center={<><div className="text-[26px] font-bold text-ink-900 leading-none">{total}</div><div className="text-[11px] text-ink-500 mt-1">FTEs</div></>} />
            <div className="flex-1 space-y-2.5">
              {rows.map((l) => (
                <div key={l.id} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
                  <span className="text-ink-700 flex-1">{l.name}</span>
                  <span className="text-ink-500 w-10 text-right">{l.share}%</span>
                  <span className="font-semibold text-ink-900 w-8 text-right">{l.ftes}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Seats vs FTEs by Location" subtitle={`Seat ratio ${settings.seatRatio} seats per FTE (Settings)`}>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 14, right: 8, left: -20, bottom: 0 }} barGap={3} barCategoryGap="35%" maxBarSize={110}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
              <Bar dataKey="seats" name="Seats" fill="#D6E4F7" radius={[3, 3, 0, 0]}><LabelList dataKey="seats" position="top" style={{ fontSize: 11, fill: '#374151' }} /></Bar>
              <Bar dataKey="ftes" name="FTEs" radius={[3, 3, 0, 0]}>{rows.map((r) => <Cell key={r.id} fill={r.color} />)}<LabelList dataKey="ftes" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <LocationForm open={adding || !!loc} onClose={() => { setAdding(false); setLoc(null) }} baseName={base} value={loc ? { id: loc.id, name: loc.name, ftes: loc.ftes, seats: loc.seats, costIndex: loc.costIndex, color: loc.color, office: loc.office } : null}
        onSave={(l) => { if (loc) locationMix.update(l); else locationMix.add({ ...l, color: l.color === '#5B9BF0' ? LOCATION_COLORS[locationMix.items.length % LOCATION_COLORS.length] : l.color }); setAdding(false); setLoc(null) }} onDelete={(id) => locationMix.remove(id)} />
    </>
  )
}
