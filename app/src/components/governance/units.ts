/**
 * Business-unit dimension helpers for the Governance module: filter matching, RAID → unit links and the
 * per-unit "governance health" score (overdue decisions, pending CR impact, overdue actions, open escalations).
 */
import { TODAY } from '../../data/common'
import { isOpen, type RaidItem } from '../../data/shared'
import type { RaidLink, TransitionProject } from '../../data/transition'
import { buShortName, type BusinessUnit } from '../../data/businessUnits'
import { PROGRAM_WIDE, type Decision, type ChangeRequest, type ActionItem, type GovRaidLink, type GovernanceSettings, type GovEvent, type BuGovernance, type BuRaciRow, type Stakeholder, type Control, type SteeringMeeting } from '../../data/governance'

/** Filter value meaning "no business unit filter". */
export const UNIT_ALL = 'All business units'
export const unitOptions = (units: string[]) => [UNIT_ALL, PROGRAM_WIDE, ...units]

/** Does a record tagged with one unit (or several) pass the toolbar filter? */
export function matchUnit(filter: string, tag: string | string[] | undefined): boolean {
  if (filter === UNIT_ALL) return true
  const tags = Array.isArray(tag) ? tag : [tag ?? PROGRAM_WIDE]
  if (filter === PROGRAM_WIDE) return tags.length === 0 || tags.every((t) => t === PROGRAM_WIDE)
  return tags.includes(filter)
}
/** Multi-tag records (stakeholders, controls): empty list = Program-wide. */
export const tagsLabel = (tags: string[]) => (tags.length ? tags : [PROGRAM_WIDE])
/** Compact unit label for dense tables: 'Infrastructure & Cloud' → 'Infra & Cloud', 'Data, Analytics & AI' → 'Data & AI' (see BU_SHORT_NAMES). */
export const shortUnit = (u: string) => (u === PROGRAM_WIDE ? 'Program' : buShortName(u))
export const isUnit = (filter: string) => filter !== UNIT_ALL && filter !== PROGRAM_WIDE

/** Business unit of a shared RAID item: governance link first, then the transition link, else Program-wide. */
export function raidUnit(r: RaidItem, govLinks: GovRaidLink[], txLinks: RaidLink[] = []): GovRaidLink | undefined {
  return govLinks.find((l) => l.id === r.id) ?? txLinks.find((l) => l.id === r.id)
}
export const raidUnitName = (r: RaidItem, govLinks: GovRaidLink[], txLinks: RaidLink[] = []) => raidUnit(r, govLinks, txLinks)?.businessUnit ?? PROGRAM_WIDE

export const isActionOpen = (a: ActionItem) => a.status !== 'Completed'
export const isActionOverdue = (a: ActionItem) => isActionOpen(a) && (a.status === 'Overdue' || a.due < TODAY)
export const isCrPending = (c: ChangeRequest) => c.status === 'Draft' || c.status === 'In Review'
export const isCrMaterial = (c: ChangeRequest) => Math.abs(c.costImpactCr) >= 0.05 || c.scheduleImpactDays > 10

/** Weights that build the governance health score (shown on the Input tab so the thresholds make sense). */
export const HEALTH_WEIGHTS = {
  overdueDecision: 3, openDecisionHigh: 2, openDecision: 1,
  pendingCr: 1, materialCr: 1,
  overdueAction: 2, openAction: 0.5,
  openEscalation: 3, criticalHighRaid: 1,
} as const

export type Rag = 'Green' | 'Amber' | 'Red'
export interface UnitHealth {
  score: number
  rag: Rag
  openDecisions: number; overdueDecisions: number
  pendingCrs: number; pendingCrCost: number; pendingCrDays: number
  openActions: number; overdueActions: number
  openRaid: number; escalations: number
}
export function unitHealth(decisions: Decision[], crs: ChangeRequest[], actions: ActionItem[], raid: RaidItem[], gs: Pick<GovernanceSettings, 'unitHealthAmberFrom' | 'unitHealthRedFrom'>): UnitHealth {
  const openD = decisions.filter((d) => d.status === 'Pending')
  const overdueD = openD.filter((d) => d.requiredBy < TODAY)
  const pendingC = crs.filter(isCrPending)
  const openA = actions.filter(isActionOpen)
  const overdueA = actions.filter(isActionOverdue)
  const openR = raid.filter(isOpen)
  const esc = openR.filter((r) => r.escalated && r.escalationStatus !== 'Resolved')
  const w = HEALTH_WEIGHTS
  const score = overdueD.length * w.overdueDecision
    + openD.filter((d) => d.requiredBy >= TODAY).reduce((s, d) => s + (d.impact === 'Critical' || d.impact === 'High' ? w.openDecisionHigh : w.openDecision), 0)
    + pendingC.reduce((s, c) => s + w.pendingCr + (isCrMaterial(c) ? w.materialCr : 0), 0)
    + overdueA.length * w.overdueAction + (openA.length - overdueA.length) * w.openAction
    + esc.length * w.openEscalation
    + openR.filter((r) => (r.level === 'Critical' || r.level === 'High') && !esc.includes(r)).length * w.criticalHighRaid
  const amber = gs.unitHealthAmberFrom ?? 5, red = gs.unitHealthRedFrom ?? 12
  const rag: Rag = score >= red ? 'Red' : score >= amber ? 'Amber' : 'Green'
  return {
    score: Math.round(score * 10) / 10, rag,
    openDecisions: openD.length, overdueDecisions: overdueD.length,
    pendingCrs: pendingC.length, pendingCrCost: pendingC.reduce((s, c) => s + c.costImpactCr, 0), pendingCrDays: pendingC.reduce((s, c) => s + Math.max(0, c.scheduleImpactDays), 0),
    openActions: openA.length, overdueActions: overdueA.length,
    openRaid: openR.length, escalations: esc.length,
  }
}
export const RAG_COLOR: Record<Rag, string> = { Green: '#16A34A', Amber: '#F59E0B', Red: '#DC2626' }
export const RAG_TEXT: Record<Rag, string> = { Green: 'text-green-600', Amber: 'text-amber-600', Red: 'text-red-600' }

/* ---------------- Everything the unit views need, and the per-unit slice of it ---------------- */

export interface UnitData {
  units: BusinessUnit[]
  unitNames: string[]
  decisions: Decision[]; crs: ChangeRequest[]; actions: ActionItem[]
  raid: RaidItem[]; govLinks: GovRaidLink[]; txLinks: RaidLink[]
  events: GovEvent[]; meetings: SteeringMeeting[]
  profiles: BuGovernance[]; buRaci: BuRaciRow[]
  projects: TransitionProject[]; stakeholders: Stakeholder[]; controls: Control[]
  gs: GovernanceSettings
}

export function unitSlice(d: UnitData, unit: string) {
  const bu = d.units.find((b) => b.name === unit)
  const profile = d.profiles.find((p) => p.businessUnit === unit)
  const decisions = d.decisions.filter((x) => x.businessUnit === unit)
  const crs = d.crs.filter((x) => x.businessUnit === unit)
  const actions = d.actions.filter((x) => x.businessUnit === unit)
  const raid = d.raid.filter((r) => raidUnitName(r, d.govLinks, d.txLinks) === unit)
  const events = d.events.filter((e) => e.businessUnit === unit && e.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))
  const projects = d.projects.filter((p) => p.businessUnit === unit)
  const stakeholders = d.stakeholders.filter((s) => s.businessUnits.includes(unit))
  const controls = d.controls.filter((c) => c.businessUnits.length === 0 || c.businessUnits.includes(unit))
  const raci = d.buRaci.filter((r) => r.businessUnit === unit)
  const health = unitHealth(decisions, crs, actions, raid, d.gs)
  const nextReviewEvent = events.find((e) => e.type === 'Business Unit Review')
  const nextReview = nextReviewEvent?.date ?? profile?.nextReview
  return { unit, bu, profile, decisions, crs, actions, raid, events, projects, stakeholders, controls, raci, health, nextReview, nextReviewEvent }
}
export type UnitSlice = ReturnType<typeof unitSlice>
