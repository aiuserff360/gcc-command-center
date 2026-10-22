/**
 * Organisation structure editor – business units (IT domains) as a configurable tree, each with its capabilities
 * (sub-units) as an inline grid carrying every attribute of the client's footprint slide.
 * Shared by GCC Setup (tab 2) and the Input view of Target Footprint.
 */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { Card } from '../ui'
import { Grid, Row, Td, TextCell, NumCell, RemoveBtn, AddBtn, cellCls, selectCls } from '../ui/InlineGrid'
import { uid } from '../../store/useStore'
import { OWNERS } from '../../data/common'
import { BU_WAVES, BU_STATUSES, GEOGRAPHIES, GBUS, TRANSITION_TYPES, DELIVERY_LOCATIONS, RAMP_MONTHS, subUnitsOf, subY1, type BusinessUnit, type SubUnit } from '../../data/businessUnits'
import { useBusinessUnits, DomainIcon, domainColor, ICON_NAMES } from './BusinessUnits'

const blankUnit = (n: number): BusinessUnit => ({ id: uid('bu'), name: 'New business unit', kind: 'IT Domain', wave: 'Wave 1', owner: OWNERS[0], status: 'Planned', description: '', y1: 0, y2: 0, y3: 0, y4: 0, y5: 0, icon: ICON_NAMES[n % ICON_NAMES.length] })
const blankSub = (u: BusinessUnit): SubUnit => ({ id: uid('su'), businessUnitId: u.id, name: 'New capability', gbuServed: GBUS[0], geography: GEOGRAPHIES[0], countryEntity: 'Group', deliveryLocation: DELIVERY_LOCATIONS[0], currentHc: 0, targetHc: 0, roleSkill: '', transitionType: 'Transition', wave: u.wave, ramp: Array(RAMP_MONTHS.length).fill(0), y2: 0, y3: 0, y4: 0, y5: 0, status: 'Planned' })

/** Text input with a datalist – pick a value from the list or type a new one. */
function ComboCell({ value, options, onChange, min, placeholder }: { value: string; options: readonly string[]; onChange: (v: string) => void; min?: number; placeholder?: string }) {
  const id = useMemo(() => uid('dl'), [])
  return (
    <>
      <input className={cellCls} style={min ? { minWidth: min } : undefined} list={id} value={value} placeholder={placeholder} title={value} onChange={(e) => onChange(e.target.value)} />
      <datalist id={id}>{options.map((o) => <option key={o} value={o} />)}</datalist>
    </>
  )
}

function Sel<T extends string>({ value, options, width, onChange }: { value: T; options: readonly string[]; width: number; onChange: (v: T) => void }) {
  const opts = options.includes(value) ? options : [value, ...options]
  return <select className={clsx(cellCls, 'cursor-pointer')} style={{ width }} value={value} title={value} onChange={(e) => onChange(e.target.value as T)}>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select>
}

const HEADERS = ['Capability / Service', 'GBU served', 'Geography', 'Country / Entity', 'Current delivery loc.', { label: 'Current HC', right: true }, { label: 'Target Pune HC', right: true }, 'Role / Skill', 'Transition type', 'Wave', 'Status', '']

export function OrgStructureEditor({ compact }: { compact?: boolean }) {
  const { items, add, update, remove, subUnits } = useBusinessUnits()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const setU = <K extends keyof BusinessUnit>(u: BusinessUnit, k: K, v: BusinessUnit[K]) => update({ ...u, [k]: v })
  const setS = <K extends keyof SubUnit>(s: SubUnit, k: K, v: SubUnit[K]) => subUnits.update({ ...s, [k]: v })
  const inScope = items.filter((u) => u.status !== 'Out of Scope')
  const allSubs = subUnits.items.filter((s) => s.status !== 'Out of Scope' && inScope.some((u) => u.id === s.businessUnitId))
  const totals = { subs: allSubs.length, current: allSubs.reduce((t, s) => t + s.currentHc, 0), target: allSubs.reduce((t, s) => t + subY1(s), 0) }
  const removeUnit = (u: BusinessUnit) => {
    const mine = subUnits.items.filter((s) => s.businessUnitId === u.id)
    if (!window.confirm(`Remove ${u.name}${mine.length ? ` and its ${mine.length} capabilit${mine.length === 1 ? 'y' : 'ies'}` : ''}?`)) return
    mine.forEach((s) => subUnits.remove(s.id)); remove(u.id)
  }
  return (
    <Card title={compact ? undefined : 'Organisation structure'} subtitle={compact ? undefined : 'Business units are the IT domains of the GCC; under each, the capabilities / services it will deliver from Pune with the GBU served, geography, source location, headcount, role / skill, transition type and wave. Headcount by year is derived from the capabilities.'}
      headerRight={<span className="text-[12px] text-ink-500 whitespace-nowrap">{inScope.length} business units · {totals.subs} capabilities · current HC <b className="text-ink-900">{totals.current}</b> · target Pune HC <b className="text-ink-900">{totals.target}</b></span>}
      action={<AddBtn label="Add business unit" onClick={() => add(blankUnit(items.length))} />}>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-[12.5px] text-ink-500 italic text-center py-6">No business units yet. Use "Add business unit" to create the first IT domain.</p>}
        {items.map((u, i) => {
          const mine = subUnitsOf(subUnits.items, u.id)
          const all = subUnits.items.filter((s) => s.businessUnitId === u.id)
          const open = !collapsed.has(u.id)
          const color = domainColor(i)
          return (
            <div key={u.id} className={clsx('rounded-lg border border-line overflow-hidden', u.status === 'Out of Scope' && 'opacity-60')}>
              <div className="flex items-center gap-2 px-2 py-1.5 bg-surface/70 border-b border-line">
                <button className="text-ink-500 hover:text-ink-900 cursor-pointer p-0.5" title={open ? 'Collapse' : 'Expand'} onClick={() => toggle(u.id)}>{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>
                <span className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-white" style={{ background: color }}><DomainIcon name={u.icon} size={15} /></span>
                <select className={clsx(selectCls, 'cursor-pointer text-[11px] text-ink-500')} style={{ width: 84 }} title="Icon" value={u.icon ?? 'Boxes'} onChange={(e) => setU(u, 'icon', e.target.value)}>{ICON_NAMES.map((n) => <option key={n}>{n}</option>)}</select>
                <input className={clsx(cellCls, 'font-semibold text-[13px] w-[230px]')} value={u.name} title="Business unit (IT domain)" onChange={(e) => setU(u, 'name', e.target.value)} />
                <label className="text-[11px] text-ink-500 whitespace-nowrap">Owner</label>
                <select className={clsx(selectCls, 'cursor-pointer')} value={u.owner} onChange={(e) => setU(u, 'owner', e.target.value)}>{OWNERS.map((o) => <option key={o}>{o}</option>)}</select>
                <label className="text-[11px] text-ink-500 whitespace-nowrap">Lead wave</label>
                <select className={clsx(selectCls, 'cursor-pointer')} value={u.wave} onChange={(e) => setU(u, 'wave', e.target.value as BusinessUnit['wave'])}>{BU_WAVES.map((o) => <option key={o}>{o}</option>)}</select>
                <label className="text-[11px] text-ink-500 whitespace-nowrap">Status</label>
                <select className={clsx(selectCls, 'cursor-pointer')} value={u.status} onChange={(e) => setU(u, 'status', e.target.value as BusinessUnit['status'])}>{BU_STATUSES.map((o) => <option key={o}>{o}</option>)}</select>
                <input className={clsx(cellCls, 'flex-1 min-w-[160px] text-ink-700')} value={u.description} placeholder="Description – what this business unit covers" title={u.description} onChange={(e) => setU(u, 'description', e.target.value)} />
                <span className="text-[11.5px] text-ink-500 whitespace-nowrap pl-1">{mine.length} cap. · HC {mine.reduce((t, s) => t + s.currentHc, 0)} → <b className="text-ink-900">{u.y1}</b></span>
                <button title="Remove business unit" className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" onClick={() => removeUnit(u)}><Trash2 size={14} /></button>
              </div>
              {open && (
                <div className="px-1 pb-1">
                  <Grid headers={HEADERS} count={all.length} minWidth={1000} empty="No capabilities yet. Use “Add capability” to add the first service of this business unit.">
                    {all.map((s) => (
                      <Row key={s.id} muted={s.status === 'Out of Scope'}>
                        <Td min={138}><TextCell value={s.name} className="font-medium" onChange={(v) => setS(s, 'name', v)} /></Td>
                        <Td min={124}><ComboCell value={s.gbuServed} options={GBUS} onChange={(v) => setS(s, 'gbuServed', v)} placeholder="GBU / BU served" /></Td>
                        <Td><Sel value={s.geography} options={GEOGRAPHIES} width={118} onChange={(v) => setS(s, 'geography', v)} /></Td>
                        <Td min={78}><TextCell value={s.countryEntity} onChange={(v) => setS(s, 'countryEntity', v)} placeholder="Country / entity" /></Td>
                        <Td min={92}><ComboCell value={s.deliveryLocation} options={DELIVERY_LOCATIONS} onChange={(v) => setS(s, 'deliveryLocation', v)} placeholder="From where" /></Td>
                        <Td className="text-right"><NumCell value={s.currentHc} min={0} className="w-[56px]" onChange={(v) => setS(s, 'currentHc', v)} /></Td>
                        <Td className="text-right"><NumCell value={s.targetHc} min={0} className="w-[60px] font-semibold" onChange={(v) => setS(s, 'targetHc', v)} /></Td>
                        <Td min={122}><TextCell value={s.roleSkill} onChange={(v) => setS(s, 'roleSkill', v)} placeholder="e.g. Cloud Engineers" /></Td>
                        <Td><Sel value={s.transitionType} options={TRANSITION_TYPES} width={112} onChange={(v) => setS(s, 'transitionType', v)} /></Td>
                        <Td><Sel value={s.wave} options={BU_WAVES} width={76} onChange={(v) => setS(s, 'wave', v)} /></Td>
                        <Td><Sel value={s.status} options={BU_STATUSES} width={100} onChange={(v) => setS(s, 'status', v)} /></Td>
                        <Td sticky><RemoveBtn name={s.name} onClick={() => subUnits.remove(s.id)} /></Td>
                      </Row>
                    ))}
                  </Grid>
                  <div className="flex items-center justify-between px-1 pt-1.5">
                    <span className="text-[11.5px] text-ink-500">{mine.length} capabilit{mine.length === 1 ? 'y' : 'ies'} in scope · current HC {mine.reduce((t, s) => t + s.currentHc, 0)} · target Pune HC by end of year 1 <b className="text-ink-900">{u.y1}</b> (from the ramp)</span>
                    <button className="btn-secondary py-1 text-[12px]" onClick={() => subUnits.add(blankSub(u))}>+ Add capability</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
