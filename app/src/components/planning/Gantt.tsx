/**
 * Program Gantt – Microsoft Project style.
 *  - Left: task grid (ID, Task Name with hierarchy, Duration, Start, Finish, % Complete, Status, Resource)
 *  - Right: two-tier timescale (Weeks / Months / Quarters), row striping, grid lines, today line,
 *           summary brackets, task bars with progress, baseline bars (slippage), milestone diamonds,
 *           finish-to-start link arrows, critical path in red
 *  - Interaction: hover sync, click to edit, drag a bar to move it, drag its edges to change start/finish,
 *           drag a milestone to re-date it (changes are committed through onItemChange)
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { MONTHS } from '../../data/common'
import { daysBetween, addDays, type PlanItem, type PlanStatus } from '../../data/planning'

export type GanttScale = 'Weeks' | 'Months' | 'Quarters'
export interface GanttGroup { n: number; name: string; icon: ReactNode; iconClass: string; items: PlanItem[]; label?: string; owner?: string }
export interface GanttChange { start: string; end: string }

export const ROW_H = 28
const TIER_H = 22
export const HEADER_H = TIER_H * 2
const DAY_W: Record<GanttScale, number> = { Weeks: 5, Months: 1.9, Quarters: 1.15 } // px per day
const LEFT_W = 690
const COLS = '44px 1fr 56px 76px 76px 54px 86px 72px'

export const STATUS_BAR: Record<PlanStatus, string> = { 'On Track': '#3B82F6', Completed: '#3B82F6', 'At Risk': '#F59E0B', Delayed: '#EF4444', Pending: '#94A3B8', 'Not Started': '#94A3B8' }
const STATUS_FILL: Record<PlanStatus, string> = { 'On Track': '#1E40AF', Completed: '#1E40AF', 'At Risk': '#B45309', Delayed: '#991B1B', Pending: '#64748B', 'Not Started': '#64748B' }

const fmtShort = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? iso : `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` }
const fmtLong = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? iso : `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
const dur = (a: string, b: string) => Math.max(0, daysBetween(a, b)) + (a === b ? 0 : 1)

type Row = { kind: 'group'; group: GanttGroup; start: string; end: string; progress: number } | { kind: 'item'; group: GanttGroup; item: PlanItem }
type Drag = { item: PlanItem; mode: 'move' | 'start' | 'end'; x0: number; start: string; end: string; dx: number }

export function Gantt({ groups, rangeStart, rangeEnd, today, scale, criticalPath, scrollStep, onItemClick, onAddItem, onItemChange, defaultCollapsed = [], emptyText = 'No items yet. Add initiatives, milestones or activities below or on the Workstreams page.', leftHeader = 'Task Name', showBaseline = true }: {
  groups: GanttGroup[]; rangeStart: string; rangeEnd: string; today: string; scale: GanttScale; criticalPath: boolean; scrollStep: number
  onItemClick: (item: PlanItem) => void; onAddItem?: (group: GanttGroup) => void; onItemChange?: (item: PlanItem, change: GanttChange) => void
  defaultCollapsed?: number[]; emptyText?: string; leftHeader?: string; showBaseline?: boolean
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set(defaultCollapsed))
  const collapsedKey = defaultCollapsed.join(',')
  useEffect(() => { setCollapsed(new Set(defaultCollapsed)) }, [collapsedKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const [hover, setHover] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const justDragged = useRef(false) // suppress the click that follows a drag
  const scrollRef = useRef<HTMLDivElement>(null)

  /* ---------- time axis ---------- */
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1)
  const dayW = DAY_W[scale]
  const totalW = Math.round(totalDays * dayW)
  const x = (iso: string) => Math.max(0, Math.min(totalW, daysBetween(rangeStart, iso) * dayW))
  const months = useMemo(() => {
    const out: { iso: string; y: number; m: number }[] = []
    const d = new Date(rangeStart + 'T00:00:00'); d.setDate(1)
    const end = new Date(rangeEnd + 'T00:00:00')
    while (d <= end) { out.push({ iso: d.toISOString().slice(0, 10), y: d.getFullYear(), m: d.getMonth() }); d.setMonth(d.getMonth() + 1) }
    return out
  }, [rangeStart, rangeEnd])
  /* two tiers: top (years | months) and bottom (quarters | months | weeks) */
  const tiers = useMemo(() => {
    const top: { key: string; label: string; x0: number; x1: number }[] = []
    const bottom: { key: string; label: string; x0: number; x1: number; strong?: boolean }[] = []
    const yearSpan = new Map<number, { x0: number; x1: number }>()
    months.forEach((m, i) => { const x0 = x(m.iso), x1 = months[i + 1] ? x(months[i + 1].iso) : totalW; const cur = yearSpan.get(m.y); yearSpan.set(m.y, cur ? { x0: cur.x0, x1 } : { x0, x1 }) })
    if (scale === 'Weeks') {
      months.forEach((m, i) => top.push({ key: m.iso, label: `${MONTHS[m.m]} ${m.y}`, x0: x(m.iso), x1: months[i + 1] ? x(months[i + 1].iso) : totalW }))
      const d = new Date(rangeStart + 'T00:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
      const end = new Date(rangeEnd + 'T00:00:00')
      while (d <= end) { const iso = d.toISOString().slice(0, 10); const n = new Date(d); n.setDate(n.getDate() + 7); bottom.push({ key: iso, label: String(d.getDate()), x0: x(iso), x1: Math.min(totalW, x(n.toISOString().slice(0, 10))) }); d.setDate(d.getDate() + 7) }
    } else {
      yearSpan.forEach((r, y) => top.push({ key: String(y), label: String(y), x0: r.x0, x1: r.x1 }))
      if (scale === 'Months') months.forEach((m, i) => bottom.push({ key: m.iso, label: MONTHS[m.m], x0: x(m.iso), x1: months[i + 1] ? x(months[i + 1].iso) : totalW, strong: m.m % 3 === 0 }))
      else for (let i = 0; i < months.length; i += 3) { const m = months[i]; const n = months[i + 3]; bottom.push({ key: m.iso, label: `Q${Math.floor(m.m / 3) + 1}`, x0: x(m.iso), x1: n ? x(n.iso) : totalW, strong: true }) }
    }
    return { top, bottom }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, scale, totalW, rangeStart, rangeEnd])

  /* ---------- rows ---------- */
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const g of groups) {
      const starts = g.items.map((i) => i.start).sort(), ends = g.items.map((i) => i.end).sort()
      const progress = g.items.length ? Math.round(g.items.reduce((s, i) => s + i.progress, 0) / g.items.length) : 0
      out.push({ kind: 'group', group: g, start: starts[0] ?? rangeStart, end: ends[ends.length - 1] ?? rangeStart, progress })
      if (!collapsed.has(g.n)) for (const it of g.items) out.push({ kind: 'item', group: g, item: it })
    }
    return out
  }, [groups, collapsed, rangeStart])
  const bodyH = Math.max(rows.length, 1) * ROW_H
  const rowIndexByCode = useMemo(() => { const m = new Map<string, number>(); rows.forEach((r, i) => { if (r.kind === 'item') m.set(r.item.code, i) }); return m }, [rows])
  const itemByCode = useMemo(() => { const m = new Map<string, PlanItem>(); groups.forEach((g) => g.items.forEach((i) => m.set(i.code, i))); return m }, [groups])

  /* effective dates while dragging */
  const live = (it: PlanItem): { start: string; end: string } => (drag && drag.item.id === it.id ? liveOf(drag, dayW) : { start: it.start, end: it.end })

  /* ---------- link arrows (finish-to-start) ---------- */
  const arrows = useMemo(() => {
    const out: { key: string; d: string; critical: boolean }[] = []
    rows.forEach((r, i) => {
      if (r.kind !== 'item' || !r.item.predecessor) return
      const pred = itemByCode.get(r.item.predecessor); const pi = rowIndexByCode.get(r.item.predecessor)
      if (!pred || pi === undefined) return
      const x1 = x(pred.end) + (pred.kind === 'milestone' ? 6 : 0), y1 = pi * ROW_H + ROW_H / 2
      const x2 = x(r.item.start) - (r.item.kind === 'milestone' ? 6 : 0), y2 = i * ROW_H + ROW_H / 2
      const down = y2 > y1
      const d = x2 >= x1 + 14
        ? `M${x1},${y1} H${x1 + 7} V${y2} H${x2 - 2}`
        : `M${x1},${y1} H${x1 + 7} V${y1 + (down ? 1 : -1) * (ROW_H / 2 - 2)} H${x2 - 9} V${y2} H${x2 - 2}`
      out.push({ key: r.item.id, d, critical: !!(r.item.critical && pred.critical) })
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, itemByCode, rowIndexByCode, totalW, drag])

  /* ---------- scrolling / drag plumbing ---------- */
  useEffect(() => { scrollRef.current?.scrollTo({ left: Math.max(0, scrollStep) * (scale === 'Weeks' ? 7 * dayW : scale === 'Months' ? 30 * dayW : 91 * dayW), behavior: 'smooth' }) }, [scrollStep, scale, dayW])
  useEffect(() => {
    if (!drag) return
    const move = (e: MouseEvent) => setDrag((d) => (d ? { ...d, dx: e.clientX - d.x0 } : d))
    const up = () => {
      setDrag((d) => {
        if (d && onItemChange && Math.abs(d.dx) >= dayW / 2) {
          justDragged.current = true; setTimeout(() => { justDragged.current = false }, 150)
          const l = liveOf(d, dayW); if (l.start !== d.item.start || l.end !== d.item.end) setTimeout(() => onItemChange(d.item, l), 0)
        }
        return null
      })
    }
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.item.id, onItemChange])
  const beginDrag = (e: React.MouseEvent, item: PlanItem, mode: Drag['mode']) => {
    if (!onItemChange) return
    e.preventDefault(); e.stopPropagation()
    setDrag({ item, mode, x0: e.clientX, start: item.start, end: item.end, dx: 0 })
  }
  const dragged = (drag && Math.abs(drag.dx) >= dayW / 2) || justDragged.current
  const toggle = (n: number) => setCollapsed((s) => { const c = new Set(s); if (c.has(n)) c.delete(n); else c.add(n); return c })
  const todayX = x(today)

  const rowBg = (r: Row, i: number) => r.kind === 'group' ? 'bg-slate-100' : hover === r.item.id ? 'bg-brand-50' : criticalPath && r.item.critical ? 'bg-red-50/50' : i % 2 ? 'bg-slate-50/60' : 'bg-white'

  return (
    <div className={clsx('flex border border-slate-300 rounded-md overflow-hidden text-[12px] select-none', drag && (drag.mode === 'move' ? 'cursor-grabbing' : 'cursor-ew-resize'))}>
      {/* ================= Left: task grid ================= */}
      <div className="shrink-0 border-r border-slate-300 bg-white" style={{ width: LEFT_W }}>
        <div className="grid items-center bg-slate-100 text-[11.5px] font-semibold text-slate-600 border-b border-slate-300 [&>span]:px-2 [&>span]:border-r [&>span]:border-slate-200 [&>span]:h-full [&>span]:flex [&>span]:items-center" style={{ height: HEADER_H, gridTemplateColumns: COLS }}>
          <span>ID</span><span>{leftHeader}</span><span>Duration</span><span>Start</span><span>Finish</span><span>% Comp.</span><span>Status</span><span className="!border-r-0">Resource</span>
        </div>
        {rows.map((r, i) => r.kind === 'group' ? (
          <div key={`g${r.group.n}`} className={clsx('group grid items-center border-b border-slate-200 cursor-pointer', rowBg(r, i))} style={{ height: ROW_H, gridTemplateColumns: COLS }} onClick={() => toggle(r.group.n)}>
            <span className="px-2 text-slate-500 text-[11px]">{r.group.n}</span>
            <span className="flex items-center gap-1.5 min-w-0 pr-1">
              {collapsed.has(r.group.n) ? <ChevronRight size={13} className="text-slate-500 shrink-0" /> : <ChevronDown size={13} className="text-slate-500 shrink-0" />}
              <span className={clsx('w-4 h-4 rounded flex items-center justify-center shrink-0', r.group.iconClass)}>{r.group.icon}</span>
              <span className="font-bold text-slate-900 truncate">{r.group.label ?? `${r.group.n}. ${r.group.name}`}</span>
              {onAddItem && <button title="Add row to this group" className="ml-auto opacity-0 group-hover:opacity-100 text-brand-600 hover:bg-brand-100 rounded p-0.5 cursor-pointer shrink-0" onClick={(e) => { e.stopPropagation(); onAddItem(r.group) }}><Plus size={13} /></button>}
            </span>
            <span className="px-2 text-slate-700 font-semibold">{r.group.items.length ? `${dur(r.start, r.end)} d` : ''}</span>
            <span className="px-2 text-slate-700 font-semibold whitespace-nowrap">{r.group.items.length ? fmtShort(r.start) : ''}</span>
            <span className="px-2 text-slate-700 font-semibold whitespace-nowrap">{r.group.items.length ? fmtShort(r.end) : ''}</span>
            <span className="px-2 text-slate-700 font-semibold">{r.group.items.length ? `${r.progress}%` : ''}</span>
            <span className="px-2" /><span className="px-2 text-slate-700 truncate">{r.group.owner ?? ''}</span>
          </div>
        ) : (() => {
          const it = r.item; const l = live(it); const crit = criticalPath && it.critical
          return (
            <div key={it.id} className={clsx('grid items-center border-b border-slate-200 cursor-pointer', rowBg(r, i))} style={{ height: ROW_H, gridTemplateColumns: COLS }}
              onClick={() => { if (!justDragged.current && !(drag && Math.abs(drag.dx) >= dayW / 2)) onItemClick(it) }} onMouseEnter={() => setHover(it.id)} onMouseLeave={() => setHover(null)}>
              <span className="px-2 text-slate-500 text-[11px] truncate">{it.code}</span>
              <span className="flex items-center gap-1.5 min-w-0 pr-1" style={{ paddingLeft: it.kind === 'activity' ? 30 : 22 }}>
                {it.kind === 'milestone' ? <span className="w-2 h-2 rotate-45 bg-slate-900 shrink-0" /> : it.kind === 'activity' ? <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" /> : <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: STATUS_BAR[it.status] }} />}
                <span className={clsx('truncate', crit ? 'text-red-700 font-medium' : 'text-slate-900')} title={it.name}>{it.name || <span className="text-slate-400 italic">Untitled</span>}</span>
              </span>
              <span className="px-2 text-slate-700">{it.kind === 'milestone' ? '0 d' : `${dur(l.start, l.end)} d`}</span>
              <span className="px-2 text-slate-700 whitespace-nowrap">{fmtShort(l.start)}</span>
              <span className="px-2 text-slate-700 whitespace-nowrap">{fmtShort(l.end)}</span>
              <span className="px-2 flex items-center gap-1.5"><span className="w-6 h-1.5 rounded-sm bg-slate-200 overflow-hidden shrink-0"><span className="block h-full bg-slate-600" style={{ width: `${it.progress}%` }} /></span><span className="text-slate-700">{it.progress}%</span></span>
              <span className="px-2"><span className="inline-block rounded px-1.5 py-px text-[10.5px] font-medium whitespace-nowrap" style={{ background: STATUS_BAR[it.status] + '22', color: STATUS_FILL[it.status] }}>{it.status}</span></span>
              <span className="px-2 text-slate-700 truncate">{it.owner}</span>
            </div>
          )
        })())}
        {rows.length === 0 && <div className="text-slate-500 italic text-center py-6 px-4">{emptyText}</div>}
      </div>

      {/* ================= Right: timeline ================= */}
      <div ref={scrollRef} className="flex-1 min-w-0 overflow-x-auto scroll-thin bg-white">
        <div className="relative" style={{ width: totalW, height: HEADER_H + bodyH }}>
          {/* timescale */}
          <div className="absolute inset-x-0 top-0 bg-slate-100 border-b border-slate-300" style={{ height: HEADER_H }}>
            {tiers.top.map((t) => <div key={t.key} className="absolute top-0 text-[11.5px] font-semibold text-slate-700 border-r border-b border-slate-300 flex items-center px-1.5 overflow-hidden whitespace-nowrap" style={{ left: t.x0, width: t.x1 - t.x0, height: TIER_H }}>{t.label}</div>)}
            {tiers.bottom.map((t) => <div key={t.key} className={clsx('absolute text-[10.5px] text-slate-600 border-r border-slate-200 flex items-center justify-center overflow-hidden', t.strong && 'border-r-slate-300')} style={{ left: t.x0, width: t.x1 - t.x0, top: TIER_H, height: TIER_H }}>{t.label}</div>)}
          </div>

          {/* body */}
          <div className="absolute inset-x-0" style={{ top: HEADER_H, height: bodyH }}>
            {rows.map((r, i) => <div key={r.kind === 'group' ? `g${r.group.n}` : r.item.id} className={clsx('absolute inset-x-0 border-b border-slate-200', rowBg(r, i))} style={{ top: i * ROW_H, height: ROW_H }} />)}
            {tiers.bottom.map((t) => <div key={t.key} className={clsx('absolute top-0 bottom-0 border-r', t.strong ? 'border-slate-300/80' : 'border-slate-200/70')} style={{ left: t.x1 - 1, width: 0 }} />)}

            {/* bars */}
            {rows.map((r, i) => {
              const top = i * ROW_H
              if (r.kind === 'group') {
                if (!r.group.items.length) return null
                const x0 = x(r.start), x1 = x(r.end)
                return (
                  <div key={`g${r.group.n}`} title={`${r.group.label ?? r.group.name}: ${fmtLong(r.start)} – ${fmtLong(r.end)} · ${r.progress}%`}>
                    <div className="absolute bg-slate-800 rounded-[1px]" style={{ left: x0, width: Math.max(2, x1 - x0), top: top + 9, height: 7 }}>
                      <div className="h-full bg-slate-950/60" style={{ width: `${r.progress}%` }} />
                    </div>
                    <Cap x={x0} y={top + 16} /><Cap x={x1} y={top + 16} />
                  </div>
                )
              }
              const it = r.item; const l = live(it); const crit = criticalPath && it.critical
              const x0 = x(l.start), x1 = x(l.end)
              const tip = `${it.code} ${it.name}\n${fmtLong(l.start)} – ${fmtLong(l.end)} · ${it.status} · ${it.progress}% · ${it.owner}`
              if (it.kind === 'milestone') {
                return (
                  <div key={it.id} onMouseEnter={() => setHover(it.id)} onMouseLeave={() => setHover(null)}>
                    <div className={clsx('absolute rotate-45', onItemChange ? 'cursor-grab' : 'cursor-pointer')} title={tip} onMouseDown={(e) => beginDrag(e, it, 'move')} onClick={() => { if (!justDragged.current && !(drag && Math.abs(drag.dx) >= dayW / 2)) onItemClick(it) }}
                      style={{ left: x1 - 6, top: top + ROW_H / 2 - 6, width: 12, height: 12, background: it.status === 'Completed' ? '#0F172A' : crit ? '#DC2626' : '#0F172A', boxShadow: '0 0 0 1px #fff' }} />
                    <span className="absolute text-[10.5px] text-slate-600 whitespace-nowrap pointer-events-none" style={{ left: x1 + 10, top: top + 7 }}>{fmtShort(l.end)}{it.critical ? ' ★' : ''}</span>
                  </div>
                )
              }
              const h = it.kind === 'activity' ? 10 : 14
              const barTop = top + (ROW_H - h) / 2 - (showBaseline && it.kind === 'activity' ? 2 : 0)
              const base = it.kind === 'activity' ? baselineOf(it) : null
              const bg = crit ? '#DC2626' : STATUS_BAR[it.status], fill = crit ? '#7F1D1D' : STATUS_FILL[it.status]
              return (
                <div key={it.id} onMouseEnter={() => setHover(it.id)} onMouseLeave={() => setHover(null)}>
                  {base && (base.start !== l.start || base.end !== l.end) && (
                    <div className="absolute rounded-[1px] bg-slate-400/70" title={`Baseline: ${fmtLong(base.start)} – ${fmtLong(base.end)}`} style={{ left: x(base.start), width: Math.max(2, x(base.end) - x(base.start)), top: barTop + h + 2, height: 3 }} />
                  )}
                  <div className={clsx('absolute rounded-[2px] group/bar', onItemChange ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer', dragged && drag?.item.id === it.id && 'ring-2 ring-brand-400')} title={tip}
                    style={{ left: x0, width: Math.max(4, x1 - x0), top: barTop, height: h, background: bg, boxShadow: '0 0 0 1px rgba(15,23,42,.25)' }}
                    onMouseDown={(e) => beginDrag(e, it, 'move')} onClick={() => { if (!justDragged.current && !(drag && Math.abs(drag.dx) >= dayW / 2)) onItemClick(it) }}>
                    <div className="h-full rounded-l-[2px]" style={{ width: `${Math.max(0, Math.min(100, it.progress))}%`, background: fill }} />
                    {onItemChange && <>
                      <div className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-white/50" onMouseDown={(e) => beginDrag(e, it, 'start')} />
                      <div className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-white/50" onMouseDown={(e) => beginDrag(e, it, 'end')} />
                    </>}
                  </div>
                  <span className="absolute text-[10.5px] text-slate-600 whitespace-nowrap pointer-events-none" style={{ left: x1 + 6, top: top + 7 }}>{dragged && drag?.item.id === it.id ? `${fmtShort(l.start)} – ${fmtShort(l.end)}` : it.owner}</span>
                </div>
              )
            })}

            {/* link arrows */}
            <svg className="absolute inset-0 pointer-events-none" width={totalW} height={bodyH}>
              <defs>
                <marker id="g-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L7,3.5 L0,7 Z" fill="#334155" /></marker>
                <marker id="g-arrow-crit" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L7,3.5 L0,7 Z" fill="#DC2626" /></marker>
              </defs>
              {arrows.map((a) => <path key={a.key} d={a.d} fill="none" stroke={criticalPath && a.critical ? '#DC2626' : '#334155'} strokeWidth={1.2} markerEnd={`url(#${criticalPath && a.critical ? 'g-arrow-crit' : 'g-arrow'})`} />)}
            </svg>
          </div>

          {/* today line */}
          <div className="absolute bottom-0 border-l-[1.5px] border-dashed border-red-500 pointer-events-none" style={{ left: todayX, top: TIER_H }} />
          <div className="absolute text-[10px] font-semibold text-white bg-red-500 rounded-sm px-1 leading-4 pointer-events-none" style={{ left: todayX - 1, top: TIER_H + 3 }}>Today</div>
        </div>
      </div>
    </div>
  )
}

function liveOf(d: Drag, dayW: number): { start: string; end: string } {
  const days = Math.round(d.dx / dayW)
  if (d.mode === 'move') return { start: addDays(d.start, days), end: addDays(d.end, days) }
  if (d.mode === 'start') { const s = addDays(d.start, days); return { start: s <= d.end ? s : d.end, end: d.end } }
  const e = addDays(d.end, days); return { start: d.start, end: e >= d.start ? e : d.start }
}

/** Summary bar end caps (MS Project style downward brackets). */
function Cap({ x, y }: { x: number; y: number }) {
  return <div className="absolute w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800" style={{ left: x - 4, top: y }} />
}

/** Activities carry their baseline on the plan item via `sub`-level data; the page passes baseline dates through `basis`. */
function baselineOf(it: PlanItem): { start: string; end: string } | null {
  const b = (it as PlanItem & { baselineStart?: string; baselineEnd?: string })
  return b.baselineStart && b.baselineEnd ? { start: b.baselineStart, end: b.baselineEnd } : null
}
