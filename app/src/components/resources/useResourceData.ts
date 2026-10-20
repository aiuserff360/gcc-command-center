import { useEffect, useMemo } from 'react'
import { useCollection } from '../../store/useStore'
import { useBusinessUnits } from '../footprint/BusinessUnits'
import { TODAY } from '../../data/common'
import {
  seedPositions, seedHeadcountPlan, seedBuHeadcount, seedHiringTargets, seedSkills, seedTrainingPlans, seedEmployees, seedPeopleCost,
  seedLocationMix, seedHeadcountForecast, seedTimeToHire, seedAttrition, seedExits, seedRetentionActions, seedResourceSettings, seedCandidates,
  isOpenPosition, isCriticalPosition, normalizeBu, overviewFunnel, stageIndex, statusForStage, roundsForStage, CANDIDATE_STAGES, NEXT_STEP,
  type Position, type HeadcountMonth, type BuHeadcount, type HiringTarget, type SkillRow, type TrainingPlan, type Employee, type PeopleCostRow,
  type LocationRow, type ForecastQuarter, type TimeToHireRow, type AttritionMonth, type ExitRecord, type RetentionAction, type ResourceSettings, type Candidate, type CandidateStage,
} from '../../data/resources'

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

type Legacy = { id: string; businessUnit?: string; workstream?: string }
/** One-time migration of rows persisted before the business-unit rename (`workstream` → `businessUnit`). */
function useBuMigration<T extends Legacy>(col: { items: T[]; setAll: (l: T[]) => void }, live: string[]) {
  const { items, setAll } = col
  useEffect(() => {
    if (!live.length || !items.some((r) => r.businessUnit === undefined && r.workstream !== undefined)) return
    setAll(items.map((r) => { const { workstream, ...rest } = r; return { ...rest, businessUnit: normalizeBu(r.businessUnit ?? workstream, live) } as T }))
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps
}
/** One row per live business unit (rows for units removed in GCC Setup are hidden; units added there appear with blank numbers). */
function alignToUnits<T extends { id: string; businessUnit: string }>(rows: T[], live: string[], blank: (name: string) => T): T[] {
  return live.map((name) => rows.find((r) => r.businessUnit === name) ?? rows.find((r) => normalizeBu(r.businessUnit, live) === name) ?? blank(name))
}

/** All Resource Management collections plus the derived KPI numbers and candidate-pipeline actions. */
export function useResourceData() {
  const businessUnits = useBusinessUnits()
  const buNames = useMemo(() => businessUnits.items.filter((b) => b.status !== 'Out of Scope').map((b) => b.name), [businessUnits.items])

  const positions = useCollection<Position>('positions', seedPositions)
  const candidates = useCollection<Candidate>('candidates', seedCandidates)
  const headcountPlan = useCollection<HeadcountMonth>('headcountPlan', seedHeadcountPlan)
  const buHeadcount = useCollection<BuHeadcount>('buHeadcount', seedBuHeadcount)
  const hiringTargets = useCollection<HiringTarget>('hiringTargets', seedHiringTargets)
  const skills = useCollection<SkillRow>('skills', seedSkills)
  const trainingPlans = useCollection<TrainingPlan>('trainingPlans', seedTrainingPlans)
  const employees = useCollection<Employee>('employees', seedEmployees)
  const peopleCost = useCollection<PeopleCostRow>('peopleCost', seedPeopleCost)
  const locationMix = useCollection<LocationRow>('locationMix', seedLocationMix)
  const headcountForecast = useCollection<ForecastQuarter>('headcountForecast', seedHeadcountForecast)
  const timeToHire = useCollection<TimeToHireRow>('timeToHire', seedTimeToHire)
  const attrition = useCollection<AttritionMonth>('attrition', seedAttrition)
  const exits = useCollection<ExitRecord>('exits', seedExits)
  const retentionActions = useCollection<RetentionAction>('retentionActions', seedRetentionActions)
  const settingsC = useCollection<ResourceSettings>('resourceSettings', seedResourceSettings)
  const settings = settingsC.items[0] ?? seedResourceSettings[0]

  useBuMigration(positions, buNames)
  useBuMigration(employees, buNames)
  useBuMigration(exits, buNames)
  useBuMigration(hiringTargets, buNames)
  useBuMigration(timeToHire, buNames)
  useBuMigration(peopleCost, buNames)

  /* ---- per-business-unit rows aligned to the live list from GCC Setup / Target Footprint ---- */
  const buHeadcountRows = useMemo(() => alignToUnits(buHeadcount.items, buNames, (n) => ({ id: `bh-${slug(n)}`, businessUnit: n, onboarded: 0, inHiring: 0, open: 0 })), [buHeadcount.items, buNames])
  const hiringTargetRows = useMemo(() => alignToUnits(hiringTargets.items, buNames, (n) => ({ id: `ht-${slug(n)}`, businessUnit: n, targets: Array(12).fill(0) })), [hiringTargets.items, buNames])
  const timeToHireRows = useMemo(() => alignToUnits(timeToHire.items, buNames, (n) => ({ id: `tth-${slug(n)}`, businessUnit: n, actual: 0, target: 30 })), [timeToHire.items, buNames])
  const peopleCostRows = useMemo(() => alignToUnits(peopleCost.items, buNames, (n) => ({ id: `pc-${slug(n)}`, businessUnit: n, budgetCr: 0, actualCr: 0 })), [peopleCost.items, buNames])
  const locations = useMemo(() => locationMix.items.map((l) => l.name), [locationMix.items])

  /* ---- candidate pipeline ---- */
  const candidatesByPosition = useMemo(() => {
    const map = new Map<string, Candidate[]>()
    for (const c of candidates.items) { const list = map.get(c.positionId); if (list) list.push(c); else map.set(c.positionId, [c]) }
    return map
  }, [candidates.items])
  const candidatesFor = (positionId: string) => candidatesByPosition.get(positionId) ?? []
  const funnel = useMemo(() => {
    const ids = new Set(positions.items.map((p) => p.id))
    return overviewFunnel(candidates.items.filter((c) => ids.has(c.positionId)))
  }, [candidates.items, positions.items])

  /** Keep the requisition's stage in step with its furthest candidate. */
  const syncPosition = (positionId: string, stage: CandidateStage) => {
    const p = positions.items.find((x) => x.id === positionId)
    if (!p) return
    if (stage === 'Joined' && p.status !== 'Joined') positions.update({ ...p, status: 'Joined' })
    else if ((stage === 'Offer' || stage === 'Accepted') && (p.status === 'Open' || p.status === 'In Interview')) positions.update({ ...p, status: 'Offer' })
    else if (stageIndex(stage) >= 2 && stageIndex(stage) <= 4 && p.status === 'Open') positions.update({ ...p, status: 'In Interview' })
  }
  const advanceCandidate = (c: Candidate) => {
    const i = stageIndex(c.stage)
    if (i >= CANDIDATE_STAGES.length - 1) return
    const stage = CANDIDATE_STAGES[i + 1]
    candidates.update({ ...c, stage, status: statusForStage(stage), roundsCompleted: roundsForStage(stage), lastActivity: TODAY, nextStep: NEXT_STEP[stage] })
    syncPosition(c.positionId, stage)
  }
  const closeCandidate = (c: Candidate, status: 'Rejected' | 'Withdrawn') =>
    candidates.update({ ...c, status, lastActivity: TODAY, nextStep: status === 'Rejected' ? 'Regret mail sent' : 'Candidate withdrew' })
  const reopenCandidate = (c: Candidate) => candidates.update({ ...c, status: statusForStage(c.stage), lastActivity: TODAY, nextStep: NEXT_STEP[c.stage] })

  const kpi = useMemo(() => {
    const months = headcountPlan.items
    const cur = months.find((m) => m.month === settings.currentMonth) ?? months[months.length - 1]
    const onboarded = cur?.actual ?? 0
    const planned = cur?.planned ?? 0
    const vsPlanPct = planned ? Math.round(((onboarded - planned) / planned) * 100) : 0
    const hiringProgress = settings.fteTarget ? Math.round((onboarded / settings.fteTarget) * 100) : 0
    const open = positions.items.filter(isOpenPosition)
    const critical = open.filter(isCriticalPosition).length
    const costActual = +peopleCostRows.reduce((s, r) => s + r.actualCr, 0).toFixed(2)
    const costBudget = +peopleCostRows.reduce((s, r) => s + r.budgetCr, 0).toFixed(2)
    const costPerFteCr = onboarded ? costActual / onboarded : 0
    const tthDelta = +(settings.avgTimeToHireMonths - settings.timeToHireTargetMonths).toFixed(1)
    const locationTotal = locationMix.items.reduce((s, l) => s + l.ftes, 0)
    return { onboarded, planned, vsPlanPct, hiringProgress, openCount: open.length, critical, others: open.length - critical, costActual, costBudget, costPerFteCr, tthDelta, locationTotal, currentMonth: cur?.month ?? settings.currentMonth }
  }, [headcountPlan.items, positions.items, peopleCostRows, locationMix.items, settings])

  return {
    businessUnits, buNames, locations,
    positions, candidates, candidatesFor, funnel, advanceCandidate, closeCandidate, reopenCandidate,
    headcountPlan, buHeadcount, buHeadcountRows, hiringTargets, hiringTargetRows, skills, trainingPlans, employees, peopleCost, peopleCostRows,
    locationMix, headcountForecast, timeToHire, timeToHireRows, attrition, exits, retentionActions, settingsC, settings, kpi,
  }
}
export type ResourceData = ReturnType<typeof useResourceData>
