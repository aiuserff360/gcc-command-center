import { useMemo } from 'react'
import { useCollection } from '../../store/useStore'
import { useMoney } from '../../data/money'
import {
  seedBudgetLines, seedMonthlyFinancials, seedPhaseSpend, seedCostCategories, seedFinancialMilestones, seedBenefits, seedRunRate, seedCommitments, seedApprovals, seedScenarios, seedFinanceSettings,
  COST_CATEGORIES, viewShare, sum, r2, pct,
  type BudgetLine, type MonthlyFinancial, type PhaseSpend, type CostCategoryRow, type FinancialMilestone, type Benefit, type RunRateYear, type Commitment, type FinancialApproval, type FinanceScenario, type FinanceSettings, type ViewBy, type CostCategory,
} from '../../data/financial'

export function useFinance(view: ViewBy) {
  /** Currency formatter for the selected top-bar currency; all derived numbers below stay in ₹ Cr. */
  const m = useMoney()
  const budgetLines = useCollection<BudgetLine>('budgetLines', seedBudgetLines)
  const monthly = useCollection<MonthlyFinancial>('monthlyFinancials', seedMonthlyFinancials)
  const phases = useCollection<PhaseSpend>('phaseSpend', seedPhaseSpend)
  const categories = useCollection<CostCategoryRow>('costCategories', seedCostCategories)
  const milestones = useCollection<FinancialMilestone>('financialMilestones', seedFinancialMilestones)
  const benefits = useCollection<Benefit>('benefits', seedBenefits)
  const runRate = useCollection<RunRateYear>('runRate', seedRunRate)
  const commitments = useCollection<Commitment>('commitments', seedCommitments)
  const approvals = useCollection<FinancialApproval>('financialApprovals', seedApprovals)
  const scenarios = useCollection<FinanceScenario>('financeScenarios', seedScenarios)
  const settingsC = useCollection<FinanceSettings>('financeSettings', seedFinanceSettings)
  const settings = settingsC.items[0] ?? seedFinanceSettings[0]

  const derived = useMemo(() => {
    /** Budget lines scaled to the selected view (Total / Setup / Ramp-up). */
    const lines = budgetLines.items.map((l) => {
      const s = viewShare(view, l.setupShare)
      return { ...l, approvedCr: r2(l.approvedCr * s), actualCr: r2(l.actualCr * s), forecastCr: r2(l.forecastCr * s), share: s }
    })
    const approved = sum(lines.map((l) => l.approvedCr))
    const actual = sum(lines.map((l) => l.actualCr))
    const forecast = sum(lines.map((l) => l.forecastCr))
    const headroom = approved - forecast
    const approvedAll = sum(budgetLines.items.map((l) => l.approvedCr))
    /** Global scale applied to monthly / phase series for the Setup / Ramp-up views. */
    const scale = view === 'Total Program' || approvedAll === 0 ? 1 : approved / approvedAll

    const months = monthly.items.map((m) => ({ ...m, budgetCr: r2(m.budgetCr * scale), actualCr: r2(m.actualCr * scale), forecastCr: r2(m.forecastCr * scale), inflowCr: r2(m.inflowCr * scale), outflowCr: r2(m.outflowCr * scale) }))
    let ca = 0, cf = 0, cb = 0
    const cumulative = months.map((m) => {
      ca += m.actualCr; cf += m.forecastCr; cb += m.budgetCr
      return { id: m.id, month: m.month, monthlyActual: m.actualCr, cumActual: r2(ca), cumForecast: r2(cf), cumBudget: r2(cb), budgetCr: m.budgetCr, actualCr: m.actualCr, forecastCr: m.forecastCr }
    })
    const cashFlow = months.map((m) => ({ month: m.month, Inflow: m.inflowCr, Outflow: m.outflowCr, Net: r2(m.inflowCr - m.outflowCr) }))

    const phaseRows = phases.items.map((p) => ({ id: p.id, phase: p.phase, Actual: r2(p.actualCr * scale), Forecast: r2(p.forecastCr * scale), Budget: p.budgetCr == null ? null : r2(p.budgetCr * scale) }))

    const allocation = lines.map((l) => {
      const share = l.share
      const cells = Object.fromEntries(COST_CATEGORIES.map((c) => [c, r2((l.allocation[c] ?? 0) * share)])) as Record<CostCategory, number>
      const allocated = sum(Object.values(cells))
      return { ...l, cells, allocated: r2(allocated), unallocated: r2(l.approvedCr - allocated) }
    })
    const categoryBudget = Object.fromEntries(COST_CATEGORIES.map((c) => [c, r2(sum(allocation.map((a) => a.cells[c])))])) as Record<string, number>
    const categoryRows = categories.items.map((c) => ({ ...c, budgetCr: categoryBudget[c.name] ?? 0, actualCr: r2(c.actualCr * scale), forecastCr: r2(c.forecastCr * scale) }))

    const donut = lines.filter((l) => l.forecastCr > 0).map((l) => ({ name: l.workstream, value: l.forecastCr, pct: pct(l.forecastCr, forecast) }))

    const runRows = runRate.items.map((r) => ({ id: r.id, year: r.year, 'Operating Cost': r.operatingCostCr, 'Productivity Savings': r.productivitySavingsCr, 'Net Run-rate': r2(r.operatingCostCr + r.productivitySavingsCr) }))
    const runRateYear = runRows.find((r) => r.year === settings.runRateYear) ?? runRows[runRows.length - 1]
    const projectedRunRate = runRateYear?.['Net Run-rate'] ?? 0

    const benefitTarget = sum(benefits.items.map((b) => b.targetCr))
    const benefitForecast = sum(benefits.items.map((b) => b.forecastCr))

    const committed = sum(commitments.items.map((c) => c.committedCr))
    const invoiced = sum(commitments.items.map((c) => c.invoicedCr))
    const paid = sum(commitments.items.map((c) => c.paidCr))

    return {
      lines, approved, actual, forecast, headroom, scale, months, cumulative, cashFlow, phaseRows, allocation, categoryBudget, categoryRows, donut,
      runRows, runRateYear, projectedRunRate, benefitTarget, benefitForecast, benefitPct: pct(benefitForecast, benefitTarget), committed, invoiced, paid,
    }
  }, [view, budgetLines.items, monthly.items, phases.items, categories.items, benefits.items, runRate.items, commitments.items, settings.runRateYear])

  return { m, budgetLines, monthly, phases, categories, milestones, benefits, runRate, commitments, approvals, scenarios, settingsC, settings, ...derived }
}

export type Fin = ReturnType<typeof useFinance>
