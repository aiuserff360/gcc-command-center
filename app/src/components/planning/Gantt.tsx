import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { ChevronDown, ChevronRight, MoveHorizontal, Plus } from 'lucide-react'
import { Badge } from '../ui'
import { MONTHS } from '../../data/common'
import { daysBetween, type PlanItem, type PlanStatus } from '../../data/planning'

export type GanttScale = 'Months' | 'Quarters'
export interface GanttGroup { n: number; name: string; icon: ReactNode; iconClass: string; items: PlanItem[] }

export const ROW_H = 26
export const HEADER_H = 44
const COL_W: Record<GanttScale, number> = { Months: 46, Quarters: 92 }
const LEFT_W = 500

export const STATUS_BAR: Record<PlanStatus, string> = {
  'On Track': '#5B9BF0', Completed: '#5B9BF0', 'At Risk': '#FBBF24', Delayed: '#F87171', Pending: '#CBD5E1', 'Not Started': '#CBD5E1',
}
export const STATUS_DOT: Record<PlanStatus, string> = {
  'On Track': '#16A34A', Completed: '#16A34A', 'At Risk': '#F59E0B', Delayed: '#DC2626', Pending: '#94A3B8', 'Not Started': '#94A3B8',
}

const fmtDateShort = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? iso : `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` }
const fmtDate = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? iso : `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` }

type Row = { kind: 'group'; group: GanttGroup; start: string; end: string } | { kind: 'item'; group: GanttGroup; item: PlanItem }

export function Gantt({ groups, rangeStart, rangeEnd, today, scale, criticalPath, scrollStep, onItemClick, onAddItem }: {
  groups: GanttGroup[]; rangeStart: string; rangeEnd: string; today: string; scale: GanttScale; criticalPath: boolean; scrollStep: number
  onItemClick: (item: PlanItem) => void; onAddItem?: (group: GanttGroup) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  /* ---- time axis ---- */
  const colW = COL_W[scale]
  const months = useMemo(() => {
    const out: { iso: string; label: string; year: number; month: number }[] = []
    const d = new Date(rangeStart + 'T00:00:00')
    const end = new Date(rangeEnd + 'T00:00:00')
    d.setDate(1)
    while (d <= end) {
      out.push({ iso: d.toISOString().slice(0, 10), label: MONTHS[d.getMonth()], year: d.getFullYear(), month: d.getMonth() })
      d.setMonth(d.getMonth() + 1)
    }
    return out
  }, [rangeStart, rangeEnd])
  const nCols = scale === 'Months' ? months.length : Math.ceil(months.length / 3)
  const totalW = nCols * colW
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1)
  const x = (iso: string) => Math.max(0, Math.min(totalW, (daysBetween(rangeStart, iso) / totalDays) * totalW))

  const columns = useMemo(() => {
    if (scale === 'Months') return months.map((m) => ({ key: m.iso, label: m.label, x: x(m.iso) }))
    const qs: { key: string; label: string; x: number }[] = []
    for (let i = 0; i < months.length; i += 3) {
      const m = months[i]
      qs.push({ key: m.iso, label: `Q${Math.floor(m.month / 3) + 1}`, x: x(m.iso) })
    }
    return qs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, scale, totalW])
  const years = useMemo(() => {
    const map = new Map<number, { x0: number; x1: number }>()
    months.forEach((m, i) => {
      const next = months[i + 1]
      const x0 = x(m.iso), x1 = next ? x(next.iso) : totalW
      const cur = map.get(m.year)
      map.set(m.year, cur ? { x0: cur.x0, x1 } : { x0, x1 })
    })
    return [...map.entries()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, totalW])

  /* ---- rows ---- */
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const g of groups) {
      const starts = g.items.map((i) => i.start).sort(), ends = g.items.map((i) => i.end).sort()
      out.push({ kind: 'group', group: g, start: starts[0] ?? rangeStart, end: ends[ends.length - 1] ?? rangeStart })
      if (!collapsed.has(g.n)) for (const it of g.items) out.push({ kind: 'item', group: g, item: it })
    }
    return out
  }, [groups, collapsed, rangeStart])
  const bodyH = rows.length * ROW_H
  const rowIndexByCode = useMemo(() => {
    const m = new Map<string, number>()
    rows.forEach((r, i) => { if (r.kind === 'item') m.set(r.item.code, i) })
    return m
  }, [rows])
  const itemByCode = useMemo(() => {
    const m = new Map<string, PlanItem>()
    groups.forEach((g) => g.items.forEach((i) => m.set(i.code, i)))
    return m
  }, [groups])

  /* ---- dependency arrows ---- */
  const arrows = useMemo(() => {
    const out: { key: string; d: string; critical: boolean }[] = []
    rows.forEach((r, i) => {
      if (r.kind !== 'item' || !r.item.predecessor) return
      const pred = itemByCode.get(r.item.predecessor)
      const pi = rowIndexByCode.get(r.item.predecessor)
      if (!pred || pi === undefined) return
      const x1 = x(pred.end), y1 = pi * ROW_H + ROW_H / 2
      const x2 = x(r.item.start), y2 = i * ROW_H + ROW_H / 2
      const dir = y2 > y1 ? 1 : -1
      let d: string
      if (x2 >= x1 + 12) d = `M${x1},${y1} H${x1 + 8} V${y2} H${x2 - 1}`
      else d = `M${x1},${y1} H${x1 + 8} V${y1 + dir * (ROW_H / 2)} H${x2 - 8} V${y2} H${x2 - 1}`
      out.push({ key: r.item.code, d, critical: !!(r.item.critical && pred.critical) })
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, itemByCode, rowIndexByCode, totalW])

  /* ---- scrolling (driven by the toolbar in the page) ---- */
  useEffect(() => {
    scrollRef.current?.scrollTo({ left: Math.max(0, scrollStep) * colW, behavior: 'smooth' })
  }, [scrollStep, colW])

  const toggle = (n: number) => setCollapsed((s) => { const c = new Set(s); if (c.has(n)) c.delete(n); else c.add(n); return c })
  const todayX = x(today)
  // Put the "Today" label to the right of the line when it would collide with the centred year label
  const todayYear = years.find(([, r]) => todayX >= r.x0 && todayX < r.x1)
  const yearCenter = todayYear ? (todayYear[1].x0 + todayYear[1].x1) / 2 : -999
  const todayLabelRight = yearCenter > todayX - 125 && yearCenter < todayX + 5

  return (
    <div className="flex border border-line rounded-lg overflow-hidden text-[12.5px]">
      {/* ---------- Left: plan table ---------- */}
      <div className="shrink-0 border-r border-line" style={{ width: LEFT_W }}>
        <div className="grid items-center bg-surface/70 text-[12px] font-medium text-ink-500 border-b border-line" style={{ height: HEADER_H, gridTemplateColumns: '62px 1fr 74px 74px 96px' }}>
          <span className="px-2">ID</span><span className="px-1">Workstream / Milestone</span><span className="px-2">Start</span><span className="px-2">End</span><span className="px-2">Status</span>
        </div>
        {rows.map((r, i) => r.kind === 'group' ? (
          <div key={`g${r.group.n}`} className="group grid items-center bg-brand-50 border-b border-line/70 cursor-pointer select-none" style={{ height: ROW_H, gridTemplateColumns: '62px 1fr' }} onClick={() => toggle(r.group.n)}>
            <span className="flex items-center gap-1.5 pl-2 text-ink-500">
              {collapsed.has(r.group.n) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <span className={clsx('w-5 h-5 rounded-md flex items-center justify-center', r.group.iconClass)}>{r.group.icon}</span>
            </span>
            <span className="flex items-center justify-between pr-2">
              <span className="font-semibold text-ink-900 truncate">{r.group.n}. {r.group.name}</span>
              {onAddItem && <button title="Add plan item" className="opacity-0 group-hover:opacity-100 text-brand-600 hover:bg-brand-100 rounded p-0.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); onAddItem(r.group) }}><Plus size={13} /></button>}
            </span>
          </div>
        ) : (
          <div key={r.item.id} className={clsx('grid items-center border-b border-line/70 cursor-pointer hover:bg-brand-50/60', criticalPath && r.item.critical && 'bg-red-50/40', i === rows.length - 1 && 'border-b-0')}
            style={{ height: ROW_H, gridTemplateColumns: '62px 1fr 74px 74px 96px' }} onClick={() => onItemClick(r.item)}>
            <span className="flex items-center gap-1.5 pl-6 text-ink-400"><MoveHorizontal size={12} /></span>
            <span className="flex items-center gap-2 min-w-0 pl-0.5"><span className="text-ink-700 w-6 shrink-0">{r.item.code}</span><span className="text-ink-900 truncate">{r.item.name}</span>{criticalPath && r.item.critical && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Critical path" />}</span>
            <span className="px-2 text-ink-700 whitespace-nowrap">{fmtDateShort(r.item.start)}</span>
            <span className="px-2 text-ink-700 whitespace-nowrap">{fmtDateShort(r.item.end)}</span>
            <span className="px-2"><Badge value={r.item.status} /></span>
          </div>
        ))}
        {rows.length === 0 && <div className="text-ink-500 italic text-center py-6">No plan items. Use "Add plan item" to create one.</div>}
      </div>

      {/* ---------- Right: timeline ---------- */}
      <div ref={scrollRef} className="flex-1 min-w-0 overflow-x-auto scroll-thin">
        <div className="relative" style={{ width: totalW, height: HEADER_H + Math.max(bodyH, ROW_H) }}>
          {/* header: years + columns */}
          <div className="absolute inset-x-0 top-0 bg-surface/70 border-b border-line" style={{ height: HEADER_H }}>
            {years.map(([y, r]) => (
              <div key={y} className="absolute top-0 text-[12px] font-semibold text-ink-900 text-center border-r border-line/70 leading-5" style={{ left: r.x0, width: r.x1 - r.x0, height: 20 }}>{y}</div>
            ))}
            {columns.map((c, i) => (
              <div key={c.key} className="absolute text-[11.5px] text-ink-500 text-center border-r border-line/60 flex items-center justify-center" style={{ left: c.x, width: (columns[i + 1]?.x ?? totalW) - c.x, top: 20, height: HEADER_H - 20 }}>{c.label}</div>
            ))}
            <div className="absolute top-0.5 text-[11px] font-semibold text-red-600 whitespace-nowrap" style={todayLabelRight ? { left: todayX + 5 } : { right: totalW - todayX + 4 }}>Today: {fmtDate(today)}</div>
          </div>

          {/* body */}
          <div className="absolute inset-x-0" style={{ top: HEADER_H, height: bodyH }}>
            {/* column grid lines */}
            {columns.map((c) => <div key={c.key} className="absolute top-0 bottom-0 border-r border-line/50" style={{ left: c.x, width: 0 }} />)}
            {/* row backgrounds */}
            {rows.map((r, i) => (
              <div key={r.kind === 'group' ? `g${r.group.n}` : r.item.id} className={clsx('absolute inset-x-0 border-b border-line/60', r.kind === 'group' ? 'bg-brand-50/70' : criticalPath && r.item.critical ? 'bg-red-50/40' : '')} style={{ top: i * ROW_H, height: ROW_H }} />
            ))}
            {/* bars */}
            {rows.map((r, i) => {
              const top = i * ROW_H
              if (r.kind === 'group') {
                const x0 = x(r.start), x1 = x(r.end)
                return (
                  <div key={`g${r.group.n}`}>
                    <div className="absolute rounded-sm" style={{ left: x0, width: Math.max(2, x1 - x0), top: top + 8, height: 10, background: '#0B2240' }} />
                    <Diamond x={x0} y={top + ROW_H / 2} color="#0B2240" />
                    <Diamond x={x1} y={top + ROW_H / 2} color="#0B2240" />
                  </div>
                )
              }
              const it = r.item
              const x0 = x(it.start), x1 = x(it.end)
              const isCrit = criticalPath && it.critical
              return (
                <div key={it.id} className="cursor-pointer" onClick={() => onItemClick(it)} title={`${it.code} ${it.name}: ${fmtDate(it.start)} – ${fmtDate(it.end)} · ${it.status} · ${it.progress}%`}>
                  <div className="absolute rounded" style={{ left: x0, width: Math.max(4, x1 - x0), top: top + 7, height: 12, background: STATUS_BAR[it.status], boxShadow: isCrit ? '0 0 0 1.5px #DC2626' : undefined, opacity: criticalPath && !it.critical ? 0.75 : 1 }}>
                    <div className="h-full rounded-l" style={{ width: `${Math.max(0, Math.min(100, it.progress))}%`, background: 'rgba(0,0,0,0.14)' }} />
                  </div>
                  <Diamond x={x0} y={top + ROW_H / 2} color={it.progress > 0 ? '#16A34A' : '#94A3B8'} />
                  {it.end >= today && <Diamond x={x1} y={top + ROW_H / 2} color={STATUS_DOT[it.status]} />}
                </div>
              )
            })}
            {/* dependency arrows */}
            <svg className="absolute inset-0 pointer-events-none" width={totalW} height={bodyH}>
              <defs>
                <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 Z" fill="#475569" /></marker>
                <marker id="gantt-arrow-crit" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 Z" fill="#DC2626" /></marker>
              </defs>
              {arrows.map((a) => (
                <path key={a.key} d={a.d} fill="none" stroke={criticalPath && a.critical ? '#DC2626' : '#475569'} strokeWidth={1.4} markerEnd={`url(#${criticalPath && a.critical ? 'gantt-arrow-crit' : 'gantt-arrow'})`} />
              ))}
            </svg>
          </div>

          {/* today line */}
          <div className="absolute top-5 bottom-0 border-l-[1.5px] border-dashed border-red-500 pointer-events-none" style={{ left: todayX }} />
        </div>
      </div>
    </div>
  )
}

function Diamond({ x, y, color }: { x: number; y: number; color: string }) {
  return <div className="absolute rotate-45 rounded-[1px] ring-1 ring-white" style={{ left: x - 5, top: y - 5, width: 10, height: 10, background: color }} />
}
