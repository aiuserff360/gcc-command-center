/**
 * Strategy & Business Case – types, seed data and derivation helpers.
 *
 * Collections (all via useCollection):
 *  - 'strategy'                : [StrategySettings]   single record – headline KPIs, rationale, assumptions, weights, version
 *  - 'strategyObjectives'      : StrategyObjective[]
 *  - 'strategyInvestments'     : InvestmentLine[]     cost lines by year → Total Investment KPI + Investment vs Returns chart
 *  - 'strategyOperatingModels' : OperatingModel[]     4 model cards + decision-criteria scores
 *  - 'strategyServices'        : ServiceScope[]       FTEs by year → Target Headcount KPI + Scope of Services bars
 *  - 'strategyLocations'       : LocationOption[]     sub-scores → weighted Overall Score
 *  - 'strategyBenefits'        : BenefitItem[]        ₹ Cr by year and category → Value Case Summary + Annual Run-rate KPI
 *  - 'strategyScenarios'       : Scenario[]
 *  - 'strategyApprovals'       : ApprovalRecord[]
 */
import type { Workstream } from './common'

export const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'] as const
export const YEAR_KEYS = ['y1', 'y2', 'y3', 'y4', 'y5'] as const
export type YearKey = (typeof YEAR_KEYS)[number]
export type YearValues = Record<YearKey, number>

export const round1 = (v: number) => Math.round(v * 10) / 10

/* ------------------------------------------------------------------ */
/* Settings (single record)                                            */
/* ------------------------------------------------------------------ */
export interface RationaleItem { title: string; description: string }
export interface WeightedCriterion { name: string; weight: number }

export interface StrategySettings {
  id: 'strategy'
  version: string
  lastUpdated: string // ISO
  purpose: string
  targetCostSavingsPct: number
  costSavingsBasis: string
  paybackPeriod: string
  paybackBasis: string
  investmentHorizonYears: number
  runRateFromYear: number // 1-5
  discountRatePct: number
  /** Cumulative Benefits line of the "Investment vs Returns" chart (₹ Cr, Year 1–5) */
  cumulativeBenefitsCr: number[]
  rationale: RationaleItem[]
  assumptions: string[]
  /** Decision criteria for the operating-model scoring matrix (weights sum to 100) */
  omCriteria: WeightedCriterion[]
  /** Location scorecard weights (sum to 100) */
  locationWeights: { talent: number; cost: number; infrastructure: number; ecosystem: number }
}

export const seedStrategy: StrategySettings[] = [{
  id: 'strategy',
  version: '2.1',
  lastUpdated: '2026-10-15',
  purpose: 'Establish a wholly owned Global Capability Center in India that delivers engineering, data and enterprise services at scale, reduces the global cost base and builds long-term strategic capability.',
  targetCostSavingsPct: 40,
  costSavingsBasis: 'vs current global cost base',
  paybackPeriod: '3–5 years',
  paybackBasis: 'Base case',
  investmentHorizonYears: 3,
  runRateFromYear: 4,
  discountRatePct: 10,
  cumulativeBenefitsCr: [5, 18, 32, 64, 96],
  rationale: [
    { title: 'Access to Talent', description: 'Leverage deep talent pool for critical capabilities' },
    { title: 'Cost Efficiency', description: 'Significant cost arbitrage and productivity gains' },
    { title: 'Capability Expansion', description: 'Build advanced capabilities (AI, data, engineering)' },
    { title: 'Business Resilience', description: 'Diversify delivery footprint and improve agility' },
  ],
  assumptions: [
    'Headcount ramp-up as per plan',
    '20–30% productivity improvement by Year 3',
    'Stable cost differential (vs home country)',
    'No major regulatory changes',
    'Continued access to target talent pool',
    'Service scope as defined in operating model',
  ],
  omCriteria: [
    { name: 'Control & IP protection', weight: 25 },
    { name: 'Speed to market', weight: 15 },
    { name: 'Cost efficiency', weight: 20 },
    { name: 'Scalability', weight: 15 },
    { name: 'Risk & compliance', weight: 10 },
    { name: 'Long-term value', weight: 15 },
  ],
  locationWeights: { talent: 35, cost: 25, infrastructure: 20, ecosystem: 20 },
}]

/* ------------------------------------------------------------------ */
/* Strategic objectives                                                */
/* ------------------------------------------------------------------ */
export const OBJECTIVE_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Not Started', 'Completed'] as const
export const PRIORITIES = ['High', 'Medium', 'Low'] as const
export const OBJECTIVE_THEMES = ['Cost', 'Talent', 'Capability', 'Resilience', 'Governance'] as const

export interface StrategyObjective {
  id: string
  objective: string
  theme: (typeof OBJECTIVE_THEMES)[number]
  owner: string
  target: string
  kpi: string
  status: (typeof OBJECTIVE_STATUSES)[number]
  priority: (typeof PRIORITIES)[number]
  workstream: Workstream
  targetDate: string
  progress: number
}

export const seedObjectives: StrategyObjective[] = [
  { id: 'obj-01', objective: 'Achieve 40% run-rate cost savings vs current global cost base', theme: 'Cost', owner: 'V. Reddy', target: '40% by Year 4', kpi: 'Run-rate cost savings %', status: 'On Track', priority: 'High', workstream: 'Finance & Procurement', targetDate: '2029-12-31', progress: 35 },
  { id: 'obj-02', objective: 'Build a 150-FTE centre across six service lines by Year 5', theme: 'Talent', owner: 'S. Iyer', target: '150 FTEs by Year 5', kpi: 'Headcount vs plan', status: 'On Track', priority: 'High', workstream: 'Talent & Hiring', targetDate: '2030-12-31', progress: 40 },
  { id: 'obj-03', objective: 'Establish AI, data and platform engineering capabilities as a global centre of excellence', theme: 'Capability', owner: 'R. Mehta', target: '3 CoEs live by Year 3', kpi: 'CoEs operational', status: 'At Risk', priority: 'High', workstream: 'Technology & Infrastructure', targetDate: '2028-12-31', progress: 20 },
  { id: 'obj-04', objective: 'Deliver 20–30% productivity improvement through automation and process redesign', theme: 'Capability', owner: 'M. Khan', target: '25% by Year 3', kpi: 'Productivity index', status: 'On Track', priority: 'Medium', workstream: 'Operations Setup', targetDate: '2028-12-31', progress: 30 },
  { id: 'obj-05', objective: 'Diversify delivery footprint to reduce single-location concentration risk', theme: 'Resilience', owner: 'A. Sharma', target: '≥ 30% of critical services from GCC', kpi: 'Share of critical services delivered', status: 'Not Started', priority: 'Medium', workstream: 'Transition Readiness', targetDate: '2028-06-30', progress: 10 },
  { id: 'obj-06', objective: 'Operate within a compliant, audit-ready governance and controls framework', theme: 'Governance', owner: 'P. Rao', target: 'Zero material audit findings', kpi: 'Audit findings (material)', status: 'On Track', priority: 'High', workstream: 'Legal & Compliance', targetDate: '2027-12-31', progress: 55 },
  { id: 'obj-07', objective: 'Achieve top-quartile employee engagement and < 12% attrition', theme: 'Talent', owner: 'S. Iyer', target: 'eNPS ≥ 40; attrition < 12%', kpi: 'eNPS / attrition %', status: 'Not Started', priority: 'Medium', workstream: 'Talent & Hiring', targetDate: '2028-12-31', progress: 5 },
  { id: 'obj-08', objective: 'Transition 80% of in-scope services with zero critical service disruptions', theme: 'Resilience', owner: 'A. Sharma', target: '80% transitioned by Year 2', kpi: 'Services transitioned %', status: 'At Risk', priority: 'High', workstream: 'Transition Readiness', targetDate: '2027-12-31', progress: 25 },
]

/* ------------------------------------------------------------------ */
/* Investment lines                                                    */
/* ------------------------------------------------------------------ */
export const INVESTMENT_CATEGORIES = ['Setup', 'Ramp-up', 'Contingency'] as const

export interface InvestmentLine extends YearValues {
  id: string
  costLine: string
  category: (typeof INVESTMENT_CATEGORIES)[number]
  owner: string
  notes: string
}

export const seedInvestments: InvestmentLine[] = [
  { id: 'inv-01', costLine: 'Facilities fit-out & lease deposits', category: 'Setup', owner: 'K. Nair', notes: 'Phase 1 floor plus expansion floor in Year 3', y1: 1.5, y2: 0.2, y3: 1.0, y4: 0, y5: 0 },
  { id: 'inv-02', costLine: 'Technology & infrastructure setup', category: 'Setup', owner: 'R. Mehta', notes: 'Network, end-user compute, cloud landing zone, security tooling', y1: 1.5, y2: 0.3, y3: 1.5, y4: 0, y5: 0 },
  { id: 'inv-03', costLine: 'Talent acquisition & onboarding', category: 'Ramp-up', owner: 'S. Iyer', notes: 'Recruitment fees, employer branding, onboarding programme', y1: 1.0, y2: 0.3, y3: 1.5, y4: 0, y5: 0 },
  { id: 'inv-04', costLine: 'Transition & knowledge transfer', category: 'Ramp-up', owner: 'A. Sharma', notes: 'Travel, shadowing, parallel-run costs', y1: 0.6, y2: 0.1, y3: 1.2, y4: 0, y5: 0 },
  { id: 'inv-05', costLine: 'Legal, entity setup & compliance', category: 'Setup', owner: 'P. Rao', notes: 'Entity incorporation, SEZ registration, advisory fees', y1: 0.4, y2: 0.1, y3: 0.3, y4: 0, y5: 0 },
  { id: 'inv-06', costLine: 'Contingency', category: 'Contingency', owner: 'V. Reddy', notes: 'Held against Year 3 expansion', y1: 0, y2: 0, y3: 0.5, y4: 0, y5: 0 },
]

/* ------------------------------------------------------------------ */
/* Operating models                                                    */
/* ------------------------------------------------------------------ */
export const OM_STATUSES = ['Recommended', 'Option', 'Not Preferred'] as const

export interface OperatingModel {
  id: string
  name: string
  subtitle: string
  status: (typeof OM_STATUSES)[number]
  traits: string[]
  /** score 1–5 per decision criterion (keyed by criterion name) */
  scores: Record<string, number>
  description: string
}

export const seedOperatingModels: OperatingModel[] = [
  { id: 'om-captive', name: 'Captive GCC', subtitle: 'Wholly owned', status: 'Recommended', traits: ['Wholly owned entity', 'Full control', 'Long-term value', 'Scalable'],
    scores: { 'Control & IP protection': 5, 'Speed to market': 3, 'Cost efficiency': 4, 'Scalability': 5, 'Risk & compliance': 4, 'Long-term value': 5 },
    description: 'Own legal entity, own leadership team, own facilities. Highest control and long-term value; longest setup effort.' },
  { id: 'om-hybrid', name: 'Hybrid', subtitle: 'Captive + partner', status: 'Option', traits: ['Mix of captive + partner', 'Faster ramp-up', 'Flexible model', 'Shared investment'],
    scores: { 'Control & IP protection': 4, 'Speed to market': 4, 'Cost efficiency': 4, 'Scalability': 4, 'Risk & compliance': 3, 'Long-term value': 4 },
    description: 'Core capabilities in the captive, non-core or surge capacity through a partner. Balances speed with control.' },
  { id: 'om-bot', name: 'BOT', subtitle: 'Build-Operate-Transfer', status: 'Option', traits: ['Partner builds & operates', 'Lower initial effort', 'Defined transition', 'Suitable for non-core'],
    scores: { 'Control & IP protection': 3, 'Speed to market': 5, 'Cost efficiency': 3, 'Scalability': 3, 'Risk & compliance': 3, 'Long-term value': 3 },
    description: 'Partner sets up and runs the centre for 2–3 years, then transfers it. Fast start with a contractual transfer path.' },
  { id: 'om-outsourced', name: 'Outsourced', subtitle: 'Third-party', status: 'Not Preferred', traits: ['Third-party delivery', 'Quick start', 'Lower control', 'Limited long-term value'],
    scores: { 'Control & IP protection': 2, 'Speed to market': 5, 'Cost efficiency': 3, 'Scalability': 3, 'Risk & compliance': 2, 'Long-term value': 2 },
    description: 'Services delivered by a third-party provider under an SLA. Fastest start but limited control and capability build.' },
]

/* ------------------------------------------------------------------ */
/* Scope & services                                                    */
/* ------------------------------------------------------------------ */
export const SERVICE_WAVES = ['Wave 1', 'Wave 2', 'Wave 3'] as const
export const SERVICE_STATUSES = ['In Scope', 'Planned', 'Under Evaluation', 'Out of Scope'] as const

export interface ServiceScope extends YearValues {
  id: string
  name: string
  wave: (typeof SERVICE_WAVES)[number]
  owner: string
  status: (typeof SERVICE_STATUSES)[number]
  description: string
}

export const seedServices: ServiceScope[] = [
  { id: 'svc-01', name: 'Engineering & Product Development', wave: 'Wave 1', owner: 'R. Mehta', status: 'In Scope', description: 'Platform engineering, product squads, QA automation, SRE', y1: 15, y2: 30, y3: 45, y4: 55, y5: 60 },
  { id: 'svc-02', name: 'Data & Analytics', wave: 'Wave 1', owner: 'R. Mehta', status: 'In Scope', description: 'Data engineering, BI, data science and AI/ML', y1: 6, y2: 14, y3: 22, y4: 28, y5: 30 },
  { id: 'svc-03', name: 'IT & Infrastructure', wave: 'Wave 2', owner: 'M. Khan', status: 'In Scope', description: 'Cloud operations, service desk, network and security operations', y1: 5, y2: 12, y3: 18, y4: 22, y5: 25 },
  { id: 'svc-04', name: 'Finance & Accounting', wave: 'Wave 2', owner: 'V. Reddy', status: 'In Scope', description: 'Record-to-report, accounts payable, FP&A support', y1: 2, y2: 6, y3: 10, y4: 13, y5: 15 },
  { id: 'svc-05', name: 'HR & People Services', wave: 'Wave 3', owner: 'S. Iyer', status: 'In Scope', description: 'HR operations, payroll support, talent acquisition shared services', y1: 1, y2: 3, y3: 6, y4: 8, y5: 10 },
  { id: 'svc-06', name: 'Procurement & Supply Chain', wave: 'Wave 3', owner: 'V. Reddy', status: 'In Scope', description: 'Source-to-pay operations, vendor management, category analytics', y1: 1, y2: 3, y3: 6, y4: 8, y5: 10 },
]

/* ------------------------------------------------------------------ */
/* Locations                                                           */
/* ------------------------------------------------------------------ */
export interface LocationOption {
  id: string
  name: string
  costIndex: number
  /** sub-scores 0–10 */
  talentScore: number
  costScore: number
  infrastructureScore: number
  ecosystemScore: number
  talentPool: string
  notes: string
  shortlisted: boolean
}

export const seedLocations: LocationOption[] = [
  { id: 'loc-blr', name: 'Bengaluru', costIndex: 1.0, talentScore: 9, costScore: 7, infrastructureScore: 9, ecosystemScore: 9, talentPool: '~1.5M tech professionals; strongest for AI/ML, platform engineering and product', notes: 'Highest competition for talent; attrition pressure in engineering roles.', shortlisted: true },
  { id: 'loc-hyd', name: 'Hyderabad', costIndex: 0.9, talentScore: 8, costScore: 8, infrastructureScore: 8, ecosystemScore: 8, talentPool: '~900K tech professionals; strong for enterprise IT, data and shared services', notes: 'Attractive SEZ incentives; large pharma and financial-services GCC cluster.', shortlisted: true },
  { id: 'loc-pun', name: 'Pune', costIndex: 0.8, talentScore: 7, costScore: 8, infrastructureScore: 7, ecosystemScore: 6.75, talentPool: '~600K tech professionals; strong engineering and automotive/manufacturing domain base', notes: 'Good value; infrastructure improving with new metro lines.', shortlisted: false },
  { id: 'loc-che', name: 'Chennai', costIndex: 0.8, talentScore: 7, costScore: 7.5, infrastructureScore: 7, ecosystemScore: 6.5, talentPool: '~550K tech professionals; strong in BFSI operations and finance shared services', notes: 'Lower attrition than Bengaluru; weather-related business continuity risk.', shortlisted: false },
  { id: 'loc-cbe', name: 'Tier-2 (Coimbatore)', costIndex: 0.6, talentScore: 5.5, costScore: 9.5, infrastructureScore: 6, ecosystemScore: 5, talentPool: '~120K tech professionals; strong engineering colleges, limited senior leadership pool', notes: 'Lowest cost; suited to a satellite or support-services centre in a later wave.', shortlisted: false },
]

export const bandTalent = (s: number) => (s >= 8 ? 'High' : s >= 5 ? 'Medium' : 'Low')
export const bandInfra = (s: number) => (s >= 8 ? 'Strong' : s >= 6.5 ? 'Good' : 'Moderate')
export const bandEcosystem = (s: number) => (s >= 8 ? 'Strong' : s >= 6.5 ? 'Good' : 'Developing')
export function locationOverall(l: LocationOption, w: StrategySettings['locationWeights']) {
  const total = w.talent + w.cost + w.infrastructure + w.ecosystem || 1
  return round1((l.talentScore * w.talent + l.costScore * w.cost + l.infrastructureScore * w.infrastructure + l.ecosystemScore * w.ecosystem) / total)
}

/* ------------------------------------------------------------------ */
/* Benefits                                                            */
/* ------------------------------------------------------------------ */
export const BENEFIT_CATEGORIES = ['Cost Savings', 'Productivity Gains', 'Revenue Impact'] as const
export type BenefitCategory = (typeof BENEFIT_CATEGORIES)[number]
export const BENEFIT_STATUSES = ['Planned', 'In Progress', 'On Track', 'At Risk', 'Realised'] as const

export interface BenefitItem extends YearValues {
  id: string
  name: string
  category: BenefitCategory
  kpi: string
  owner: string
  workstream: Workstream
  /** forecast of the Year-5 run-rate, ₹ Cr */
  forecastCr: number
  status: (typeof BENEFIT_STATUSES)[number]
  measurement: string
}

export const seedBenefits: BenefitItem[] = [
  { id: 'ben-01', name: 'Labour cost arbitrage', category: 'Cost Savings', kpi: 'Cost per FTE vs home country', owner: 'V. Reddy', workstream: 'Finance & Procurement', forecastCr: 20, status: 'On Track', measurement: 'Loaded cost per FTE, quarterly', y1: 2, y2: 6, y3: 10, y4: 15, y5: 20 },
  { id: 'ben-02', name: 'Vendor consolidation savings', category: 'Cost Savings', kpi: 'Third-party spend reduction', owner: 'V. Reddy', workstream: 'Finance & Procurement', forecastCr: 10, status: 'At Risk', measurement: 'Vendor spend baseline vs actual', y1: 1, y2: 3, y3: 6, y4: 9, y5: 12 },
  { id: 'ben-03', name: 'Automation & process efficiency', category: 'Productivity Gains', kpi: 'Hours automated per month', owner: 'M. Khan', workstream: 'Operations Setup', forecastCr: 13, status: 'In Progress', measurement: 'Automation register, monthly', y1: 1, y2: 4, y3: 7, y4: 10, y5: 13 },
  { id: 'ben-04', name: 'Delivery productivity uplift', category: 'Productivity Gains', kpi: 'Throughput per squad', owner: 'R. Mehta', workstream: 'Technology & Infrastructure', forecastCr: 7, status: 'Planned', measurement: 'Story points / release cadence', y1: 0, y2: 2, y3: 3, y4: 5, y5: 7 },
  { id: 'ben-05', name: 'Faster time-to-market', category: 'Revenue Impact', kpi: 'Release cycle time', owner: 'R. Mehta', workstream: 'Technology & Infrastructure', forecastCr: 8, status: 'Planned', measurement: 'Attributed revenue from accelerated releases', y1: 1, y2: 2, y3: 4, y4: 6, y5: 8 },
  { id: 'ben-06', name: 'New digital capabilities revenue', category: 'Revenue Impact', kpi: 'Revenue from AI/data products', owner: 'A. Sharma', workstream: 'Transition Readiness', forecastCr: 4, status: 'Planned', measurement: 'Product P&L attribution', y1: 0, y2: 1, y3: 2, y4: 3, y5: 4 },
]

/* ------------------------------------------------------------------ */
/* Scenarios                                                           */
/* ------------------------------------------------------------------ */
export interface Scenario {
  id: string
  name: string
  investmentCr: number
  annualBenefitsCr: number
  paybackYears: number
  irrPct: number
  headcountY5: number
  rampMonths: number
  costSavingsPct: number
  isBase: boolean
  assumptions: string
}

export const seedScenarios: Scenario[] = [
  { id: 'scn-base', name: 'Base Case', investmentCr: 12.0, annualBenefitsCr: 48.0, paybackYears: 3.5, irrPct: 28, headcountY5: 150, rampMonths: 36, costSavingsPct: 40, isBase: true, assumptions: 'Headcount ramp as per plan; productivity +25% by Year 3; stable cost differential.' },
  { id: 'scn-acc', name: 'Accelerated', investmentCr: 14.0, annualBenefitsCr: 60.0, paybackYears: 2.8, irrPct: 32, headcountY5: 190, rampMonths: 24, costSavingsPct: 45, isBase: false, assumptions: 'Wave 2 and Wave 3 pulled forward 12 months; additional floor leased in Year 2; higher recruitment spend.' },
  { id: 'scn-con', name: 'Conservative', investmentCr: 10.0, annualBenefitsCr: 32.0, paybackYears: 4.2, irrPct: 18, headcountY5: 110, rampMonths: 48, costSavingsPct: 30, isBase: false, assumptions: 'Slower hiring; Wave 3 deferred; productivity gains limited to 15%; cost differential erodes 5%.' },
]

/* ------------------------------------------------------------------ */
/* Approvals                                                           */
/* ------------------------------------------------------------------ */
export const APPROVAL_STATUSES = ['Approved', 'Pending', 'In Review', 'Rejected'] as const
export const APPROVAL_ITEMS = ['Strategy & Business Case v2.1', 'Operating model selection', 'Location decision', 'Investment envelope (3-year)', 'Scope of services', 'Benefits register', 'Key assumptions'] as const

export interface ApprovalRecord {
  id: string
  approver: string
  role: string
  item: string
  date: string // ISO
  status: (typeof APPROVAL_STATUSES)[number]
  comments: string
}

export const seedApprovals: ApprovalRecord[] = [
  { id: 'apr-01', approver: 'J. Whitfield', role: 'Group CEO', item: 'Strategy & Business Case v2.1', date: '2026-10-28', status: 'Pending', comments: 'Scheduled for the Oct Executive Committee.' },
  { id: 'apr-02', approver: 'L. Fernandes', role: 'Group CFO', item: 'Investment envelope (3-year)', date: '2026-10-14', status: 'Approved', comments: 'Approved with contingency held centrally.' },
  { id: 'apr-03', approver: 'D. Okafor', role: 'Chief Technology Officer', item: 'Operating model selection', date: '2026-10-09', status: 'Approved', comments: 'Captive GCC endorsed; revisit hybrid for surge capacity.' },
  { id: 'apr-04', approver: 'Anita Sharma', role: 'Program Manager', item: 'Scope of services', date: '2026-10-07', status: 'Approved', comments: '' },
  { id: 'apr-05', approver: 'M. Castellanos', role: 'Chief People Officer', item: 'Location decision', date: '2026-10-21', status: 'In Review', comments: 'Requested attrition benchmarks for Bengaluru vs Hyderabad.' },
  { id: 'apr-06', approver: 'P. Rao', role: 'Legal Lead', item: 'Key assumptions', date: '2026-10-02', status: 'Approved', comments: 'Regulatory assumption to be re-validated quarterly.' },
  { id: 'apr-07', approver: 'L. Fernandes', role: 'Group CFO', item: 'Benefits register', date: '2026-09-30', status: 'Rejected', comments: 'Revenue impact benefits need attribution methodology before sign-off.' },
]

/* ------------------------------------------------------------------ */
/* Derivations                                                         */
/* ------------------------------------------------------------------ */
export const sumYears = (r: YearValues) => YEAR_KEYS.reduce((s, k) => s + (r[k] || 0), 0)

/** Value Case Summary: benefits by category per year (₹ Cr) */
export function valueCaseByYear(benefits: BenefitItem[]) {
  return YEARS.map((year, i) => {
    const k = YEAR_KEYS[i]
    const row: Record<string, number | string> = { year }
    let total = 0
    for (const c of BENEFIT_CATEGORIES) {
      const v = round1(benefits.filter((b) => b.category === c).reduce((s, b) => s + (b[k] || 0), 0))
      row[c] = v
      total += v
    }
    row.total = round1(total)
    return row as { year: string; total: number } & Record<BenefitCategory, number>
  })
}

/** Investment per year and cumulative (₹ Cr) */
export function investmentByYear(lines: InvestmentLine[]) {
  let cum = 0
  return YEARS.map((year, i) => {
    const k = YEAR_KEYS[i]
    const v = round1(lines.reduce((s, l) => s + (l[k] || 0), 0))
    cum = round1(cum + v)
    return { year, investment: v, cumulative: cum }
  })
}

export const totalInvestment = (lines: InvestmentLine[]) => round1(lines.reduce((s, l) => s + sumYears(l), 0))

export function omWeightedScore(m: OperatingModel, criteria: WeightedCriterion[]) {
  const total = criteria.reduce((s, c) => s + c.weight, 0) || 1
  return round1(criteria.reduce((s, c) => s + (m.scores[c.name] ?? 0) * c.weight, 0) / total)
}

export function npv(cashflows: number[], ratePct: number) {
  const r = ratePct / 100
  return round1(cashflows.reduce((s, cf, i) => s + cf / Math.pow(1 + r, i + 1), 0))
}

export const fmtYears = (v: number) => `${v.toFixed(1)} years`
