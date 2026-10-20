import { useMemo } from 'react'
import { useCollection } from '../../store/useStore'
import {
  seedPositions, seedHeadcountPlan, seedWorkstreamHeadcount, seedHiringFunnel, seedHiringTargets, seedSkills, seedTrainingPlans, seedEmployees, seedPeopleCost,
  seedLocationMix, seedHeadcountForecast, seedTimeToHire, seedAttrition, seedExits, seedRetentionActions, seedResourceSettings, isOpenPosition, isCriticalPosition,
  type Position, type HeadcountMonth, type WorkstreamHeadcount, type FunnelStage, type HiringTarget, type SkillRow, type TrainingPlan, type Employee, type PeopleCostRow,
  type LocationRow, type ForecastQuarter, type TimeToHireRow, type AttritionMonth, type ExitRecord, type RetentionAction, type ResourceSettings,
} from '../../data/resources'

/** All Resource Management collections plus the derived KPI numbers. */
export function useResourceData() {
  const positions = useCollection<Position>('positions', seedPositions)
  const headcountPlan = useCollection<HeadcountMonth>('headcountPlan', seedHeadcountPlan)
  const workstreamHeadcount = useCollection<WorkstreamHeadcount>('workstreamHeadcount', seedWorkstreamHeadcount)
  const hiringFunnel = useCollection<FunnelStage>('hiringFunnel', seedHiringFunnel)
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

  const kpi = useMemo(() => {
    const months = headcountPlan.items
    const cur = months.find((m) => m.month === settings.currentMonth) ?? months[months.length - 1]
    const onboarded = cur?.actual ?? 0
    const planned = cur?.planned ?? 0
    const vsPlanPct = planned ? Math.round(((onboarded - planned) / planned) * 100) : 0
    const hiringProgress = settings.fteTarget ? Math.round((onboarded / settings.fteTarget) * 100) : 0
    const open = positions.items.filter(isOpenPosition)
    const critical = open.filter(isCriticalPosition).length
    const costActual = +peopleCost.items.reduce((s, r) => s + r.actualCr, 0).toFixed(2)
    const costBudget = +peopleCost.items.reduce((s, r) => s + r.budgetCr, 0).toFixed(2)
    const costPerFteCr = onboarded ? costActual / onboarded : 0
    const tthDelta = +(settings.avgTimeToHireMonths - settings.timeToHireTargetMonths).toFixed(1)
    const locationTotal = locationMix.items.reduce((s, l) => s + l.ftes, 0)
    return { onboarded, planned, vsPlanPct, hiringProgress, openCount: open.length, critical, others: open.length - critical, costActual, costBudget, costPerFteCr, tthDelta, locationTotal, currentMonth: cur?.month ?? settings.currentMonth }
  }, [headcountPlan.items, positions.items, peopleCost.items, locationMix.items, settings])

  return { positions, headcountPlan, workstreamHeadcount, hiringFunnel, hiringTargets, skills, trainingPlans, employees, peopleCost, locationMix, headcountForecast, timeToHire, attrition, exits, retentionActions, settingsC, settings, kpi }
}
export type ResourceData = ReturnType<typeof useResourceData>
