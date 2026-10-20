/**
 * Program Planning is an OUTPUT view. Every row on its Gantt is derived from what is
 * entered on the Workstreams page: initiatives, milestones and WBS activities. This module
 * holds the row model and the pure mappers from those inputs to Gantt rows.
 */
import type { Workstream, Status } from './common'
import type { Milestone } from './shared'
import type { Initiative } from './workstreams'
import type { Activity } from './wbs'

export type PlanStatus = Extract<Status, 'On Track' | 'At Risk' | 'Delayed' | 'Completed' | 'Pending' | 'Not Started'>
export const PLAN_STATUSES: PlanStatus[] = ['On Track', 'At Risk', 'Delayed', 'Completed', 'Pending', 'Not Started']
export type PlanKind = 'initiative' | 'milestone' | 'activity'

export interface PlanItem {
  id: string
  group: number
  code: string
  name: string
  workstream: Workstream
  start: string // ISO
  end: string // ISO
  status: PlanStatus
  owner: string
  predecessor?: string // code of the predecessor row
  critical?: boolean
  progress: number // 0-100
  kind: PlanKind
  sourceId: string // id of the underlying initiative / milestone / activity
  sub?: string // WBS sub-workstream (activities)
  baselineStart?: string
  baselineEnd?: string
}

const toPlanStatus = (s: string): PlanStatus => (s === 'In Progress' || s === 'Open' ? 'On Track' : (PLAN_STATUSES.includes(s as PlanStatus) ? (s as PlanStatus) : 'On Track'))

export function initiativeToPlan(i: Initiative, group: number, code: string, linkedMilestone?: Milestone): PlanItem {
  return { id: `pi-${i.id}`, group, code, name: i.name, workstream: i.workstream, start: i.start, end: i.end, status: toPlanStatus(i.status), owner: i.owner, progress: i.progress, kind: 'initiative', sourceId: i.id, critical: !!linkedMilestone?.critical }
}
export function milestoneToPlan(m: Milestone, group: number, code: string): PlanItem {
  return { id: `pm-${m.id}`, group, code, name: m.name, workstream: m.workstream, start: m.startDate && m.startDate < m.dueDate ? m.startDate : m.dueDate, end: m.dueDate, status: toPlanStatus(m.status), owner: m.owner, progress: m.progress ?? (m.status === 'Completed' ? 100 : 0), kind: 'milestone', sourceId: m.id, critical: !!m.critical }
}
export function activityToPlan(a: Activity, group: number): PlanItem {
  const end = a.forecastEnd || a.baselineEnd
  return { id: `pa-${a.id}`, group, code: a.code, name: a.name, workstream: a.workstream, start: a.forecastStart || a.baselineStart, end: end >= (a.forecastStart || a.baselineStart) ? end : a.baselineEnd, status: toPlanStatus(a.status), owner: a.responsible, progress: a.percentComplete, kind: 'activity', sourceId: a.id, sub: a.subWorkstream, predecessor: a.predecessor || undefined, critical: a.criticalPath, baselineStart: a.baselineStart, baselineEnd: a.baselineEnd }
}

/* ---------- Timeline helpers (pure, shared by the Gantt and the page) ---------- */
export const DAY = 86400000
export const toDate = (iso: string) => new Date(iso + 'T00:00:00')
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const addDays = (iso: string, n: number) => {
  const d = toDate(iso)
  d.setDate(d.getDate() + n)
  return isoLocal(d) // local calendar date (toISOString would shift a day in timezones ahead of UTC)
}
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY)
