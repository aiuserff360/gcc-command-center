/**
 * All Resource Management data in one hook: the organisation structure (business units = IT domains, capabilities =
 * sub-units, read straight from the 'businessUnits' / 'subUnits' collections and rolled up), the plan derived from the
 * sub-unit ramps (month-wise for year 1, annual for years 2–5), the actuals per capability and month, requisitions with
 * their candidate pipelines, and the derived KPI numbers.
 */
import { useEffect, useMemo } from 'react'
import { useCollection, useStore } from '../../store/useStore'
import { variantSeed } from '../../data/variants'
import { TODAY } from '../../data/common'
import { seedBusinessUnits, seedSubUnits, rollUpUnits, programRamp, unitRamp, subY1, RAMP_MONTHS, YEAR_KEYS, type BusinessUnit, type SubUnit } from '../../data/businessUnits'
import {
  seedPositions, seedCapabilityActuals, seedSkills, seedTrainingPlans, seedEmployees, seedPeopleCost, seedLocationMix, seedTimeToHire, seedAttrition, seedExits,
  seedRetentionActions, seedResourceSettings, seedCandidates, RESOURCE_SCHEMA, REPORTING_IDX, OUT_YEARS,
  isOpenPosition, isInHiring, isCriticalPosition, overviewFunnel, stageIndex, statusForStage, roundsForStage, CANDIDATE_STAGES, NEXT_STEP,
  type Position, type CapabilityActuals, type CapHeadcount, type BuHeadcount, type SkillRow, type TrainingPlan, type Employee, type PeopleCostRow,
  type LocationRow, type TimeToHireRow, type AttritionMonth, type ExitRecord, type RetentionAction, type ResourceSettings, type Candidate, type CandidateStage, type HcView,
} from '../../data/resources'

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/** One row per live business unit (rows for units removed in GCC Setup are hidden; units added there appear with blank numbers). */
function alignToUnits<T extends { id: string; businessUnit: string }>(rows: T[], live: string[], blank: (name: string) => T): T[] {
  return live.map((name) => rows.find((r) => r.businessUnit === name) ?? blank(name))
}

/** Seeds re-applied when persisted data predates the current model (old business units, no capability level). */
const RESET: [string, { id: string }[]][] = [
  ['positions', seedPositions], ['candidates', seedCandidates], ['capabilityActuals', seedCapabilityActuals], ['skills', seedSkills], ['trainingPlans', seedTrainingPlans],
  ['employees', seedEmployees], ['peopleCost', seedPeopleCost], ['locationMix', seedLocationMix], ['timeToHire', seedTimeToHire], ['attrition', seedAttrition],
  ['exits', seedExits], ['retentionActions', seedRetentionActions], ['resourceSettings', seedResourceSettings],
]

/** Series for the headcount plan-vs-actual charts: year 1 month-wise, or years 2–5 annual (plan only). */
export interface HcPoint { label: string; Planned: number; Actual: number | null; current?: boolean }

export function useResourceData() {
  const unitsC = useCollection<BusinessUnit>('businessUnits', seedBusinessUnits)
  const subsC = useCollection<SubUnit>('subUnits', seedSubUnits)
  const positions = useCollection<Position>('positions', seedPositions)
  const candidates = useCollection<Candidate>('candidates', seedCandidates)
  const capActuals = useCollection<CapabilityActuals>('capabilityActuals', seedCapabilityActuals)
  const skills = useCollection<SkillRow>('skills', seedSkills)
  const trainingPlans = useCollection<TrainingPlan>('trainingPlans', seedTrainingPlans)
  const employees = useCollection<Employee>('employees', seedEmployees)
  const peopleCost = useCollection<PeopleCostRow>('peopleCost', seedPeopleCost)
  const locationMix = useCollection<LocationRow>('locationMix', seedLocationMix)
  const timeToHire = useCollection<TimeToHireRow>('timeToHire', seedTimeToHire)
  const attrition = useCollection<AttritionMonth>('attrition', seedAttrition)
  const exits = useCollection<ExitRecord>('exits', seedExits)
  const retentionActions = useCollection<RetentionAction>('retentionActions', seedRetentionActions)
  const settingsC = useCollection<ResourceSettings>('resourceSettings', seedResourceSettings)
  const settings = settingsC.items[0] ?? seedResourceSettings[0]

  /* ---- one-time re-seed of data persisted under the previous (pre-ENGIE) model ---- */
  const program = useStore((s) => s.program)
  const setAll = useStore((s) => s.setAll)
  const stale = settingsC.items.length > 0 && settings.schema !== RESOURCE_SCHEMA
  useEffect(() => {
    if (!stale) return
    for (const [name, seed] of RESET) setAll(name, variantSeed(name, seed, program))
  }, [stale, program, setAll])

  /* ---- organisation structure: business units (rolled up from capabilities) and capabilities ---- */
  const businessUnits = useMemo(() => ({ ...unitsC, items: rollUpUnits(unitsC.items, subsC.items) }), [unitsC, subsC.items])
  const inScopeUnits = useMemo(() => businessUnits.items.filter((b) => b.status !== 'Out of Scope'), [businessUnits.items])
  const buNames = useMemo(() => inScopeUnits.map((b) => b.name), [inScopeUnits])
  const buIdByName = useMemo(() => new Map(businessUnits.items.map((b) => [b.name, b.id])), [businessUnits.items])
  const buNameById = useMemo(() => new Map(businessUnits.items.map((b) => [b.id, b.name])), [businessUnits.items])
  const subs = useMemo(() => subsC.items.filter((s) => s.status !== 'Out of Scope' && buNames.includes(buNameById.get(s.businessUnitId) ?? '')), [subsC.items, buNames, buNameById])
  const subsOf = (bu: string) => subs.filter((s) => s.businessUnitId === buIdByName.get(bu))
  const subFor = (bu: string, cap: string) => subsOf(bu).find((s) => s.name === cap)
  const capNames = (bu: string) => subsOf(bu).map((s) => s.name)
  const unitOf = (bu: string) => businessUnits.items.find((b) => b.name === bu)

  /* ---- reporting month and the plan (owned by the sub-unit ramps) ---- */
  const reportingIdx = RAMP_MONTHS.includes(settings.currentMonth as (typeof RAMP_MONTHS)[number]) ? RAMP_MONTHS.indexOf(settings.currentMonth as (typeof RAMP_MONTHS)[number]) : REPORTING_IDX
  const reportingMonth = RAMP_MONTHS[reportingIdx]
  const planMonths = useMemo(() => programRamp(subs), [subs])
  const planYears = useMemo(() => YEAR_KEYS.slice(1).map((k) => inScopeUnits.reduce((t, b) => t + (b[k] || 0), 0)), [inScopeUnits])
  const unitPlanMonths = (bu: string) => unitRamp(subs, buIdByName.get(bu) ?? '')
  const unitPlanYears = (bu: string) => { const u = unitOf(bu); return YEAR_KEYS.slice(1).map((k) => u?.[k] ?? 0) }

  /* ---- actuals per capability (aligned to the live capabilities) and the derived headcount rows ---- */
  const capActualRows = useMemo(() => subs.map((s) => {
    const bu = buNameById.get(s.businessUnitId) ?? ''
    const row = capActuals.items.find((r) => r.id === `ca-${s.id}`) ?? capActuals.items.find((r) => r.businessUnit === bu && r.capability === s.name)
    // headcount is whole people (program variants scale the seed and can leave decimals)
    return row ? { ...row, actuals: RAMP_MONTHS.map((_, i) => (row.actuals[i] === null || row.actuals[i] === undefined ? null : Math.round(row.actuals[i] as number))) } : { id: `ca-${s.id}`, businessUnit: bu, capability: s.name, actuals: RAMP_MONTHS.map(() => null) }
  }), [subs, capActuals.items, buNameById])
  const actualAt = (row: CapabilityActuals | undefined, i: number) => row?.actuals[i] ?? null

  const capHeadcountRows = useMemo<CapHeadcount[]>(() => subs.map((s, i) => {
    const bu = buNameById.get(s.businessUnitId) ?? ''
    const row = capActualRows[i]
    const mine = positions.items.filter((p) => p.businessUnit === bu && p.capability === s.name)
    return { id: `ch-${s.id}`, businessUnit: bu, capability: s.name, onboarded: actualAt(row, reportingIdx) ?? 0, inHiring: mine.filter(isInHiring).length, open: mine.filter((p) => p.status === 'Open').length, plan: s.ramp[reportingIdx] ?? 0, target: subY1(s) }
  }), [subs, capActualRows, positions.items, reportingIdx, buNameById])
  const buHeadcountRows = useMemo<BuHeadcount[]>(() => buNames.map((name) => {
    const caps = capHeadcountRows.filter((c) => c.businessUnit === name)
    const sum = (k: 'onboarded' | 'inHiring' | 'open' | 'plan' | 'target') => caps.reduce((t, c) => t + c[k], 0)
    // requisitions whose capability is not (or no longer) in the structure still count for the unit
    const orphans = positions.items.filter((p) => p.businessUnit === name && !caps.some((c) => c.capability === p.capability))
    return { id: `bh-${slug(name)}`, businessUnit: name, onboarded: sum('onboarded'), inHiring: sum('inHiring') + orphans.filter(isInHiring).length, open: sum('open') + orphans.filter((p) => p.status === 'Open').length, plan: sum('plan'), target: sum('target'), capabilities: caps }
  }), [buNames, capHeadcountRows, positions.items])

  /** Program actual per month of year 1 (null once no capability has reported). */
  const actualMonths = useMemo(() => RAMP_MONTHS.map((_, i) => {
    const vals = capActualRows.map((r) => r.actuals[i]).filter((v): v is number => v !== null && v !== undefined)
    return vals.length ? vals.reduce((t, v) => t + v, 0) : null
  }), [capActualRows])
  const unitActualMonths = (bu: string) => RAMP_MONTHS.map((_, i) => {
    const vals = capActualRows.filter((r) => r.businessUnit === bu).map((r) => r.actuals[i]).filter((v): v is number => v !== null && v !== undefined)
    return vals.length ? vals.reduce((t, v) => t + v, 0) : null
  })
  /** Chart series for the selected view; `bu` narrows to one business unit. */
  const hcSeries = (view: HcView, bu?: string): HcPoint[] => {
    if (view === 'Year 1 month-wise') {
      const plan = bu ? unitPlanMonths(bu) : planMonths
      const act = bu ? unitActualMonths(bu) : actualMonths
      return RAMP_MONTHS.map((label, i) => ({ label, Planned: plan[i] ?? 0, Actual: i <= reportingIdx ? act[i] : null, current: i === reportingIdx }))
    }
    const plan = bu ? unitPlanYears(bu) : planYears
    return OUT_YEARS.map((label, i) => ({ label, Planned: plan[i] ?? 0, Actual: null }))
  }
  const setActual = (row: CapabilityActuals, i: number, v: number | null) => capActuals.update({ ...row, actuals: RAMP_MONTHS.map((_, j) => (j === i ? v : row.actuals[j] ?? null)) })

  /* ---- per-business-unit rows aligned to the live list from GCC Setup / Target Footprint ---- */
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
    const onboarded = actualMonths[reportingIdx] ?? 0
    const planned = planMonths[reportingIdx] ?? 0
    const vsPlanPct = planned ? Math.round(((onboarded - planned) / planned) * 100) : 0
    const hiringProgress = settings.fteTarget ? Math.round((onboarded / settings.fteTarget) * 100) : 0
    const open = positions.items.filter(isOpenPosition)
    const critical = open.filter(isCriticalPosition).length
    const costActual = +peopleCostRows.reduce((s, r) => s + r.actualCr, 0).toFixed(2)
    const costBudget = +peopleCostRows.reduce((s, r) => s + r.budgetCr, 0).toFixed(2)
    const costPerFteCr = onboarded ? costActual / onboarded : 0
    const tthDelta = +(settings.avgTimeToHireMonths - settings.timeToHireTargetMonths).toFixed(1)
    const locationTotal = locationMix.items.reduce((s, l) => s + l.ftes, 0)
    const y1Target = planMonths[planMonths.length - 1] ?? 0
    return { onboarded, planned, vsPlanPct, hiringProgress, openCount: open.length, inHiring: open.filter(isInHiring).length, critical, others: open.length - critical, costActual, costBudget, costPerFteCr, tthDelta, locationTotal, y1Target, reportingMonth, reportingIdx }
  }, [actualMonths, planMonths, reportingIdx, reportingMonth, positions.items, peopleCostRows, locationMix.items, settings])

  return {
    businessUnits, subUnits: subsC, subs, buNames, subsOf, subFor, capNames, unitOf, locations,
    reportingIdx, reportingMonth, planMonths, planYears, unitPlanMonths, unitPlanYears, actualMonths, unitActualMonths, hcSeries,
    capActuals, capActualRows, setActual, capHeadcountRows, buHeadcountRows,
    positions, candidates, candidatesFor, funnel, advanceCandidate, closeCandidate, reopenCandidate,
    skills, trainingPlans, employees, peopleCost, peopleCostRows, locationMix, timeToHire, timeToHireRows, attrition, exits, retentionActions, settingsC, settings, kpi,
  }
}
export type ResourceData = ReturnType<typeof useResourceData>
