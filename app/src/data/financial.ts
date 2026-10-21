// Financial Management – types and seed data. Wording mirrors mock-up 06-financial-management exactly.
import { MONTHS } from './common'

export const FIN_TABS = ['Financial Overview', 'Cost Model', 'Budget Breakdown', 'Actuals & Forecast', 'Cost by Workstream', 'Cost by Category', 'Benefits Tracking', 'Scenario Analysis', 'Approvals & Commitments'] as const
export type FinTab = (typeof FIN_TABS)[number]

export const VIEW_OPTIONS = ['Total Program', 'Setup (Capex)', 'Ramp-up (Opex)'] as const
export type ViewBy = (typeof VIEW_OPTIONS)[number]

export const COST_CATEGORIES = ['People Costs', 'IT Hardware & Software', 'Facilities & Real Estate', 'Professional Services', 'Travel & Relocation', 'Other Operating Costs'] as const
export type CostCategory = (typeof COST_CATEGORIES)[number]

/** Finance view of workstreams (mock-up names). */
export const FIN_WORKSTREAMS = ['Talent & Hiring', 'Technology & Infrastructure', 'Facilities & Workplace', 'Legal & Compliance', 'Transition & Knowledge Transfer', 'Program Management', 'Other (Travel, Misc)'] as const

export const FIN_WS_COLORS: Record<string, string> = {
  'Talent & Hiring': '#1E4FA8',
  'Technology & Infrastructure': '#5B9BF0',
  'Facilities & Workplace': '#14B8A6',
  'Legal & Compliance': '#16A34A',
  'Transition & Knowledge Transfer': '#F59E0B',
  'Program Management': '#8B5CF6',
  'Other (Travel, Misc)': '#CBD5E1',
}

export interface BudgetLine {
  id: string
  workstream: string
  approvedCr: number
  actualCr: number
  forecastCr: number
  /** Share (0–1) of this line that is Setup (Capex); the rest is Ramp-up (Opex). */
  setupShare: number
  /** Approved budget split by cost category (₹ Cr). */
  allocation: Partial<Record<CostCategory, number>>
  owner?: string
}

export const seedBudgetLines: BudgetLine[] = [
  { id: 'bl-talent', workstream: 'Talent & Hiring', approvedCr: 1.2, actualCr: 0.8, forecastCr: 1.14, setupShare: 0.3, owner: 'S. Iyer', allocation: { 'People Costs': 0.8, 'Professional Services': 0.2, 'Travel & Relocation': 0.1, 'Other Operating Costs': 0.1 } },
  { id: 'bl-tech', workstream: 'Technology & Infrastructure', approvedCr: 1.0, actualCr: 0.6, forecastCr: 0.84, setupShare: 0.7, owner: 'R. Mehta', allocation: { 'IT Hardware & Software': 0.6, 'People Costs': 0.2, 'Professional Services': 0.2 } },
  { id: 'bl-facilities', workstream: 'Facilities & Workplace', approvedCr: 0.6, actualCr: 0.4, forecastCr: 0.5, setupShare: 0.8, owner: 'K. Nair', allocation: { 'Facilities & Real Estate': 0.5, 'Other Operating Costs': 0.1 } },
  { id: 'bl-legal', workstream: 'Legal & Compliance', approvedCr: 0.3, actualCr: 0.2, forecastCr: 0.3, setupShare: 0.5, owner: 'P. Rao', allocation: { 'Professional Services': 0.2, 'Other Operating Costs': 0.1 } },
  { id: 'bl-transition', workstream: 'Transition & Knowledge Transfer', approvedCr: 0.5, actualCr: 0.3, forecastCr: 0.5, setupShare: 0.4, owner: 'A. Sharma', allocation: { 'People Costs': 0.2, 'Travel & Relocation': 0.1, 'Professional Services': 0.1, 'Other Operating Costs': 0.1 } },
  { id: 'bl-pm', workstream: 'Program Management', approvedCr: 0.3, actualCr: 0.2, forecastCr: 0.3, setupShare: 0.3, owner: 'A. Sharma', allocation: { 'People Costs': 0.2, 'Professional Services': 0.1 } },
  { id: 'bl-other', workstream: 'Other (Travel, Misc)', approvedCr: 0.1, actualCr: 0.1, forecastCr: 0.2, setupShare: 0.5, owner: 'V. Reddy', allocation: { 'Travel & Relocation': 0.05, 'Other Operating Costs': 0.05 } },
]

export interface MonthlyFinancial {
  id: string
  month: string
  budgetCr: number
  actualCr: number
  forecastCr: number
  inflowCr: number
  outflowCr: number
}

const mBudget = [1.2, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.3]
const mActual = [0.15, 0.18, 0.2, 0.2, 0.22, 0.22, 0.24, 0.25, 0.26, 0.28, 0.2, 0.2]
const mForecast = [0.2, 0.25, 0.28, 0.3, 0.3, 0.32, 0.33, 0.35, 0.37, 0.38, 0.35, 0.37]
const mInflow = [0.45, 0.5, 0.55, 0.55, 0.6, 0.65, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]
const mOutflow = [0.3, 0.35, 0.35, 0.4, 0.4, 0.4, 0.45, 0.45, 0.5, 0.5, 0.55, 0.55]
export const seedMonthlyFinancials: MonthlyFinancial[] = MONTHS.map((m, i) => ({
  id: `mf-${m.toLowerCase()}`, month: m, budgetCr: mBudget[i], actualCr: mActual[i], forecastCr: mForecast[i], inflowCr: mInflow[i], outflowCr: mOutflow[i],
}))

export interface PhaseSpend { id: string; phase: string; actualCr: number; forecastCr: number; budgetCr: number | null }
export const seedPhaseSpend: PhaseSpend[] = [
  { id: 'ps-design', phase: 'Design', actualCr: 0.4, forecastCr: 0.5, budgetCr: null },
  { id: 'ps-build', phase: 'Build', actualCr: 1.6, forecastCr: 2.1, budgetCr: 2.3 },
  { id: 'ps-transition', phase: 'Transition', actualCr: 0.5, forecastCr: 0.9, budgetCr: 1.0 },
  { id: 'ps-operate', phase: 'Operate (Year 1)', actualCr: 0.1, forecastCr: 0.3, budgetCr: 0.4 },
]

export interface CostCategoryRow { id: string; name: string; actualCr: number; forecastCr: number; description?: string }
export const seedCostCategories: CostCategoryRow[] = [
  { id: 'cc-people', name: 'People Costs', actualCr: 0.9, forecastCr: 1.1, description: 'Salaries, benefits, recruitment fees and onboarding' },
  { id: 'cc-it', name: 'IT Hardware & Software', actualCr: 0.4, forecastCr: 0.6, description: 'End-user devices, network, licences and cloud' },
  { id: 'cc-facilities', name: 'Facilities & Real Estate', actualCr: 0.4, forecastCr: 0.6, description: 'Lease, fit-out, utilities and workplace services' },
  { id: 'cc-services', name: 'Professional Services', actualCr: 0.4, forecastCr: 0.5, description: 'Advisory, legal, audit and implementation partners' },
  { id: 'cc-travel', name: 'Travel & Relocation', actualCr: 0.1, forecastCr: 0.2, description: 'Transition travel, relocation and visas' },
  { id: 'cc-other', name: 'Other Operating Costs', actualCr: 0.4, forecastCr: 0.5, description: 'Insurance, contingency, admin and miscellaneous' },
]

export interface FinancialMilestone { id: string; name: string; amountCr: number; dueDate: string; status: 'Completed' | 'On Track' | 'At Risk' | 'Pending' | 'Not Started' | 'Delayed'; workstream: string; owner: string }
export const seedFinancialMilestones: FinancialMilestone[] = [
  { id: 'fm-1', name: 'Office lease agreement', amountCr: 0.4, dueDate: '2026-10-15', status: 'Completed', workstream: 'Facilities & Workplace', owner: 'K. Nair' },
  { id: 'fm-2', name: 'IT infrastructure setup', amountCr: 0.6, dueDate: '2026-11-30', status: 'On Track', workstream: 'Technology & Infrastructure', owner: 'R. Mehta' },
  { id: 'fm-3', name: 'Wave 2 hiring spend', amountCr: 0.5, dueDate: '2026-12-31', status: 'At Risk', workstream: 'Talent & Hiring', owner: 'S. Iyer' },
  { id: 'fm-4', name: 'Transition support costs', amountCr: 0.3, dueDate: '2027-02-28', status: 'Pending', workstream: 'Transition & Knowledge Transfer', owner: 'A. Sharma' },
  { id: 'fm-5', name: 'Stabilization run-rate funding', amountCr: 0.8, dueDate: '2027-03-31', status: 'Not Started', workstream: 'Program Management', owner: 'V. Reddy' },
  { id: 'fm-7', name: 'Year 1 operating budget release', amountCr: 2.5, dueDate: '2027-04-15', status: 'Not Started', workstream: 'Program Management', owner: 'V. Reddy' },
]

export interface Benefit { id: string; area: string; targetCr: number; forecastCr: number; status: 'On Track' | 'At Risk' | 'Delayed' | 'Completed'; owner: string; startQuarter: string; description?: string }
export const seedBenefits: Benefit[] = [
  { id: 'bn-1', area: 'Cost Savings (Ops)', targetCr: 6.0, forecastCr: 4.8, status: 'On Track', owner: 'Global COO', startQuarter: 'Q1 FY27', description: 'Labour arbitrage and vendor consolidation on transitioned operations' },
  { id: 'bn-2', area: 'Productivity Gains', targetCr: 3.0, forecastCr: 2.2, status: 'At Risk', owner: 'GCC Head', startQuarter: 'Q2 FY27', description: 'Automation and process standardisation across waves' },
  { id: 'bn-3', area: 'Quality & Efficiency', targetCr: 1.5, forecastCr: 1.0, status: 'On Track', owner: 'M. Khan', startQuarter: 'Q3 FY27', description: 'Lower rework and SLA penalties' },
  { id: 'bn-4', area: 'Time to Market', targetCr: 1.0, forecastCr: 0.7, status: 'On Track', owner: 'Global CIO', startQuarter: 'Q3 FY27', description: 'Faster release cycles from follow-the-sun delivery' },
  { id: 'bn-5', area: 'Tax & Working Capital', targetCr: 0.5, forecastCr: 0.7, status: 'Completed', owner: 'Global CFO', startQuarter: 'Q1 FY27', description: 'SEZ tax incentives and consolidated vendor payment terms' },
]
export const BENEFIT_QUARTERS = ['Q1 FY27', 'Q2 FY27', 'Q3 FY27', 'Q4 FY27', 'Q1 FY28', 'Q2 FY28', 'Q3 FY28', 'Q4 FY28']
/** Annualised run-rate attained by quarter (share of full forecast). */
export const BENEFIT_RAMP = [0.05, 0.12, 0.22, 0.35, 0.5, 0.68, 0.85, 1.0]

export interface RunRateYear { id: string; year: string; operatingCostCr: number; productivitySavingsCr: number }
export const seedRunRate: RunRateYear[] = [
  { id: 'rr-1', year: 'Year 1', operatingCostCr: 1.5, productivitySavingsCr: 1.0 },
  { id: 'rr-2', year: 'Year 2', operatingCostCr: 2.8, productivitySavingsCr: 2.0 },
  { id: 'rr-3', year: 'Year 3', operatingCostCr: 4.2, productivitySavingsCr: 3.0 },
  { id: 'rr-4', year: 'Year 4', operatingCostCr: 5.6, productivitySavingsCr: 4.0 },
  { id: 'rr-5', year: 'Year 5', operatingCostCr: 7.0, productivitySavingsCr: 5.0 },
]

export type CommitmentStatus = 'Open' | 'In Progress' | 'Closed' | 'Approved'
export interface Commitment {
  id: string; poNumber: string; vendor: string; description: string; workstream: string; category: CostCategory
  committedCr: number; invoicedCr: number; paidCr: number; status: CommitmentStatus; date: string
}
export const seedCommitments: Commitment[] = [
  { id: 'cm-1', poNumber: 'PO-26-0012', vendor: 'Prestige Realty', description: 'Office lease – Bengaluru Tower B (36 months)', workstream: 'Facilities & Workplace', category: 'Facilities & Real Estate', committedCr: 0.4, invoicedCr: 0.4, paidCr: 0.4, status: 'Closed', date: '2026-06-12' },
  { id: 'cm-2', poNumber: 'PO-26-0018', vendor: 'Spacewise Interiors', description: 'Fit-out and workplace furniture', workstream: 'Facilities & Workplace', category: 'Facilities & Real Estate', committedCr: 0.15, invoicedCr: 0.1, paidCr: 0.05, status: 'In Progress', date: '2026-07-20' },
  { id: 'cm-3', poNumber: 'PO-26-0021', vendor: 'Dell Technologies', description: 'End-user devices (450 laptops) and peripherals', workstream: 'Technology & Infrastructure', category: 'IT Hardware & Software', committedCr: 0.3, invoicedCr: 0.2, paidCr: 0.2, status: 'In Progress', date: '2026-07-28' },
  { id: 'cm-4', poNumber: 'PO-26-0024', vendor: 'Cisco / Sify', description: 'Network, MPLS links and data-centre connectivity', workstream: 'Technology & Infrastructure', category: 'IT Hardware & Software', committedCr: 0.2, invoicedCr: 0.1, paidCr: 0.05, status: 'In Progress', date: '2026-08-05' },
  { id: 'cm-5', poNumber: 'PO-26-0027', vendor: 'Microsoft', description: 'M365 and Azure licences – Year 1', workstream: 'Technology & Infrastructure', category: 'IT Hardware & Software', committedCr: 0.1, invoicedCr: 0.1, paidCr: 0.1, status: 'Closed', date: '2026-08-14' },
  { id: 'cm-6', poNumber: 'PO-26-0031', vendor: 'ABC Recruitment Partners', description: 'Wave 1 and Wave 2 lateral hiring fees', workstream: 'Talent & Hiring', category: 'Professional Services', committedCr: 0.2, invoicedCr: 0.12, paidCr: 0.1, status: 'In Progress', date: '2026-08-22' },
  { id: 'cm-7', poNumber: 'PO-26-0033', vendor: 'Khaitan & Co', description: 'Entity set-up, SEZ and statutory registrations', workstream: 'Legal & Compliance', category: 'Professional Services', committedCr: 0.15, invoicedCr: 0.15, paidCr: 0.15, status: 'Closed', date: '2026-05-30' },
  { id: 'cm-8', poNumber: 'PO-26-0036', vendor: 'Deloitte', description: 'Transition methodology and knowledge-transfer support', workstream: 'Transition & Knowledge Transfer', category: 'Professional Services', committedCr: 0.25, invoicedCr: 0.1, paidCr: 0.05, status: 'In Progress', date: '2026-09-02' },
  { id: 'cm-9', poNumber: 'PO-26-0040', vendor: 'MakeMyTrip Corporate', description: 'Transition travel and relocation (Wave 2)', workstream: 'Transition & Knowledge Transfer', category: 'Travel & Relocation', committedCr: 0.1, invoicedCr: 0.04, paidCr: 0.04, status: 'Open', date: '2026-09-18' },
  { id: 'cm-10', poNumber: 'PO-26-0042', vendor: 'FutureFactor360', description: 'PMO and Command Center services', workstream: 'Program Management', category: 'Professional Services', committedCr: 0.2, invoicedCr: 0.12, paidCr: 0.12, status: 'In Progress', date: '2026-04-10' },
  { id: 'cm-11', poNumber: 'PO-26-0045', vendor: 'ICICI Lombard', description: 'Insurance and employee benefits cover', workstream: 'Other (Travel, Misc)', category: 'Other Operating Costs', committedCr: 0.05, invoicedCr: 0.05, paidCr: 0.0, status: 'Approved', date: '2026-10-01' },
  { id: 'cm-12', poNumber: 'PO-26-0047', vendor: 'Tata Communications', description: 'Security operations centre and monitoring', workstream: 'Technology & Infrastructure', category: 'IT Hardware & Software', committedCr: 0.12, invoicedCr: 0.0, paidCr: 0.0, status: 'Open', date: '2026-10-12' },
]

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected'
export interface FinancialApproval { id: string; item: string; amountCr: number; requester: string; approver: string; workstream: string; status: ApprovalStatus; date: string; notes?: string }
export const seedApprovals: FinancialApproval[] = [
  { id: 'ap-1', item: 'Wave 2 hiring budget increase', amountCr: 0.15, requester: 'S. Iyer', approver: 'Global CFO', workstream: 'Talent & Hiring', status: 'Pending', date: '2026-10-14', notes: 'Lateral hiring premium for niche cloud skills' },
  { id: 'ap-2', item: 'Additional SOC monitoring licences', amountCr: 0.06, requester: 'R. Mehta', approver: 'Global CIO', workstream: 'Technology & Infrastructure', status: 'Pending', date: '2026-10-16' },
  { id: 'ap-3', item: 'Transition travel – Wave 3 pre-visits', amountCr: 0.04, requester: 'A. Sharma', approver: 'Global COO', workstream: 'Transition & Knowledge Transfer', status: 'Pending', date: '2026-10-18' },
  { id: 'ap-4', item: 'Office fit-out change order (cafeteria)', amountCr: 0.05, requester: 'K. Nair', approver: 'Global CFO', workstream: 'Facilities & Workplace', status: 'Approved', date: '2026-09-28' },
  { id: 'ap-5', item: 'Contingency release – network redundancy', amountCr: 0.08, requester: 'R. Mehta', approver: 'Steering Committee', workstream: 'Technology & Infrastructure', status: 'Approved', date: '2026-09-15' },
  { id: 'ap-6', item: 'Executive offsite in Goa', amountCr: 0.03, requester: 'M. Khan', approver: 'Global CFO', workstream: 'Other (Travel, Misc)', status: 'Rejected', date: '2026-09-10', notes: 'Deferred to Operate phase' },
]

export interface FinanceScenario {
  id: string; name: string; investmentCr: number; annualBenefitsCr: number; year1RealizationPct: number; year2RealizationPct: number; costInflationPct: number; status: 'Recommended' | 'Option' | 'Not Preferred'; description: string
}
export const seedScenarios: FinanceScenario[] = [
  { id: 'sc-base', name: 'Base', investmentCr: 3.8, annualBenefitsCr: 9.4, year1RealizationPct: 40, year2RealizationPct: 80, costInflationPct: 6, status: 'Recommended', description: 'Current plan: 450 FTE by Dec 2026, two transition waves.' },
  { id: 'sc-accel', name: 'Accelerated', investmentCr: 4.4, annualBenefitsCr: 11.0, year1RealizationPct: 55, year2RealizationPct: 90, costInflationPct: 7, status: 'Option', description: 'Pull Wave 3 forward by two quarters with lateral hiring premium.' },
  { id: 'sc-cons', name: 'Conservative', investmentCr: 4.0, annualBenefitsCr: 7.5, year1RealizationPct: 30, year2RealizationPct: 65, costInflationPct: 6, status: 'Option', description: 'Slower ramp, single transition wave per year, higher retention buffer.' },
]

export interface FinanceSettings { id: string; runRateYear: string; headroomPctOfBudget: number; discountRatePct: number; contingencyPct: number; varianceCommentary: string }
export const seedFinanceSettings: FinanceSettings[] = [{
  id: 'fs-1', runRateYear: 'Year 5', headroomPctOfBudget: 55, discountRatePct: 12, contingencyPct: 10,
  // Narrative only – amounts per workstream are generated at render time in the selected currency (Actuals & Forecast tab).
  varianceCommentary: 'Forecast at completion is trending about 5% below the approved budget. Technology & Infrastructure is running under budget after the network contract was renegotiated; Other (Travel, Misc) is over on Wave 2 transition travel and will be offset from contingency.',
}]

/* ---------- helpers ---------- */
export const r1 = (v: number) => Math.round(v * 10) / 10
export const r2 = (v: number) => Math.round(v * 100) / 100
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)
export const fmtVar = (v: number, digits = 1) => { const r = Math.round(v * 10 ** digits) / 10 ** digits; return r > 0 ? `+${r.toFixed(digits)}` : r < 0 ? r.toFixed(digits) : (0).toFixed(digits) }

/** Scale a budget line to the selected view (Total / Setup / Ramp-up). */
export const viewShare = (view: ViewBy, setupShare: number) => (view === 'Total Program' ? 1 : view === 'Setup (Capex)' ? setupShare : 1 - setupShare)

/** Simple IRR on yearly cash flows via bisection. */
export function irr(flows: number[]): number {
  const npv = (r: number) => flows.reduce((acc, f, t) => acc + f / Math.pow(1 + r, t), 0)
  let lo = -0.9, hi = 10
  if (npv(lo) * npv(hi) > 0) return NaN
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid
  }
  return (lo + hi) / 2
}
export function npv(flows: number[], ratePct: number): number {
  return flows.reduce((acc, f, t) => acc + f / Math.pow(1 + ratePct / 100, t), 0)
}
/** Yearly net cash flows for a scenario (Year 0 = investment, 5 benefit years with ramp and inflation on costs). */
export function scenarioFlows(s: FinanceScenario, years = 5): number[] {
  const ramp = [s.year1RealizationPct / 100, s.year2RealizationPct / 100, 1, 1, 1]
  const flows = [-s.investmentCr]
  for (let y = 0; y < years; y++) {
    const benefit = s.annualBenefitsCr * (ramp[y] ?? 1)
    const runCost = s.investmentCr * 0.35 * Math.pow(1 + s.costInflationPct / 100, y)
    flows.push(r2(benefit - runCost))
  }
  return flows
}
export function paybackMonths(flows: number[]): number {
  let cum = flows[0]
  for (let y = 1; y < flows.length; y++) {
    if (cum + flows[y] >= 0) return Math.round(((y - 1) + -cum / flows[y]) * 12)
    cum += flows[y]
  }
  return NaN
}
