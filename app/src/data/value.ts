/**
 * Value Realization seed data and types.
 * Collections: 'benefitItems', 'valueMonthly', 'savingsInitiatives', 'valueSettings'
 */
import type { Workstream } from './common'

export type BenefitArea = 'Cost Savings (Ops)' | 'Productivity Gains' | 'Quality & Efficiency' | 'Time to Market'
export const BENEFIT_AREAS: BenefitArea[] = ['Cost Savings (Ops)', 'Productivity Gains', 'Quality & Efficiency', 'Time to Market']
export const BENEFIT_COLORS: Record<BenefitArea, string> = { 'Cost Savings (Ops)': '#1E5BBE', 'Productivity Gains': '#14B8A6', 'Quality & Efficiency': '#8B5CF6', 'Time to Market': '#F59E0B' }

export interface ValueSettings {
  id: 'value'
  realizedToDateCr: number
  runRateSavingsPct: number
  targetRunRateSavingsPct: number
  paybackYears: string
  annualRunRateBenefitsCr: number
  baselineCostCr: number
  gccRunCostCr: number
  totalInvestmentCr: number
}
export const seedValueSettings: ValueSettings[] = [{
  id: 'value', realizedToDateCr: 3.1, runRateSavingsPct: 15, targetRunRateSavingsPct: 40, paybackYears: '3–5 years', annualRunRateBenefitsCr: 48.0, baselineCostCr: 120.0, gccRunCostCr: 72.0, totalInvestmentCr: 18.5,
}]

export type BenefitStatus = 'On Track' | 'At Risk' | 'Delayed' | 'Realized' | 'Not Started'
export interface BenefitItem {
  id: string
  code: string
  benefitArea: BenefitArea
  lever: string
  targetCr: number
  forecastCr: number
  realizedCr: number
  owner: string
  workstream: Workstream
  status: BenefitStatus
  measurementMethod: string
  baseline: string
  frequency: 'Monthly' | 'Quarterly' | 'Annually'
  signedOff: boolean
  signedOffBy?: string
  signedOffOn?: string
}
const B = (n: number, p: Omit<BenefitItem, 'id' | 'code'>): BenefitItem => ({ id: `bn-${String(n).padStart(3, '0')}`, code: `B-${String(n).padStart(3, '0')}`, ...p })
export const seedBenefitItems: BenefitItem[] = [
  // Cost Savings (Ops) – target 6.0 / forecast 4.8
  B(1, { benefitArea: 'Cost Savings (Ops)', lever: 'Labour arbitrage – Finance operations', targetCr: 2.4, forecastCr: 2.1, realizedCr: 0.9, owner: 'L. Moreau', workstream: 'Finance & Procurement', status: 'On Track', measurementMethod: 'Fully-loaded cost per FTE vs onshore baseline', baseline: '₹ 28.5 L per FTE (onshore)', frequency: 'Monthly', signedOff: true, signedOffBy: 'L. Moreau', signedOffOn: '2026-07-15' }),
  B(2, { benefitArea: 'Cost Savings (Ops)', lever: 'Labour arbitrage – IT service delivery', targetCr: 2.0, forecastCr: 1.5, realizedCr: 0.5, owner: 'T. Okafor', workstream: 'Technology & Infrastructure', status: 'At Risk', measurementMethod: 'Cost per ticket and FTE cost delta', baseline: '₹ 31.0 L per FTE (onshore)', frequency: 'Monthly', signedOff: false }),
  B(3, { benefitArea: 'Cost Savings (Ops)', lever: 'Vendor consolidation & contract renegotiation', targetCr: 1.0, forecastCr: 0.8, realizedCr: 0.4, owner: 'V. Reddy', workstream: 'Finance & Procurement', status: 'On Track', measurementMethod: 'Contract value delta vs prior-year spend', baseline: '₹ 4.2 Cr annual vendor spend', frequency: 'Quarterly', signedOff: true, signedOffBy: 'V. Reddy', signedOffOn: '2026-09-01' }),
  B(4, { benefitArea: 'Cost Savings (Ops)', lever: 'Real-estate footprint reduction (onshore)', targetCr: 0.6, forecastCr: 0.4, realizedCr: 0.1, owner: 'G. Alvarez', workstream: 'Facilities & Workplace', status: 'On Track', measurementMethod: 'Released seats × cost per seat', baseline: '180 onshore seats', frequency: 'Quarterly', signedOff: false }),
  // Productivity Gains – 3.0 / 2.2
  B(5, { benefitArea: 'Productivity Gains', lever: 'Process standardisation – P2P & R2R', targetCr: 1.2, forecastCr: 0.9, realizedCr: 0.3, owner: 'E. Lindqvist', workstream: 'Transition Readiness', status: 'At Risk', measurementMethod: 'Transactions per FTE vs baseline', baseline: '1,850 txn / FTE / month', frequency: 'Monthly', signedOff: false }),
  B(6, { benefitArea: 'Productivity Gains', lever: 'Automation of recurring reports', targetCr: 0.8, forecastCr: 0.6, realizedCr: 0.2, owner: 'R. Mehta', workstream: 'Technology & Infrastructure', status: 'On Track', measurementMethod: 'Hours saved × blended rate', baseline: '2,400 hrs / month manual reporting', frequency: 'Monthly', signedOff: false }),
  B(7, { benefitArea: 'Productivity Gains', lever: 'Follow-the-sun coverage for IT support', targetCr: 1.0, forecastCr: 0.7, realizedCr: 0.2, owner: 'M. Chen', workstream: 'Operations Setup', status: 'At Risk', measurementMethod: 'Overtime & on-call cost avoided', baseline: '₹ 1.1 Cr annual overtime', frequency: 'Quarterly', signedOff: false }),
  // Quality & Efficiency – 1.5 / 1.0
  B(8, { benefitArea: 'Quality & Efficiency', lever: 'First-time-right improvement in Finance close', targetCr: 0.8, forecastCr: 0.5, realizedCr: 0.2, owner: 'E. Lindqvist', workstream: 'Finance & Procurement', status: 'On Track', measurementMethod: 'Rework hours avoided', baseline: '12% rework rate', frequency: 'Monthly', signedOff: false }),
  B(9, { benefitArea: 'Quality & Efficiency', lever: 'SLA adherence & penalty avoidance', targetCr: 0.7, forecastCr: 0.5, realizedCr: 0.2, owner: 'M. Khan', workstream: 'Operations Setup', status: 'On Track', measurementMethod: 'SLA penalties avoided vs prior year', baseline: '₹ 0.6 Cr penalties FY25', frequency: 'Quarterly', signedOff: true, signedOffBy: 'N. Krishnan', signedOffOn: '2026-09-30' }),
  // Time to Market – 1.0 / 0.7
  B(10, { benefitArea: 'Time to Market', lever: 'Faster product release cycle (engineering)', targetCr: 0.6, forecastCr: 0.4, realizedCr: 0.1, owner: 'T. Okafor', workstream: 'Talent & Hiring', status: 'On Track', measurementMethod: 'Release lead-time reduction × revenue impact', baseline: '14-week release cycle', frequency: 'Quarterly', signedOff: false }),
  B(11, { benefitArea: 'Time to Market', lever: 'Analytics capacity for commercial teams', targetCr: 0.4, forecastCr: 0.3, realizedCr: 0.0, owner: 'H. Patel', workstream: 'Talent & Hiring', status: 'Not Started', measurementMethod: 'Analyst hours delivered × agreed value rate', baseline: '0 hrs (new capability)', frequency: 'Quarterly', signedOff: false }),
]

export interface ValueMonth {
  id: string
  month: string // 'Jan 26'
  targetCr: number // cumulative
  forecastCr: number // cumulative
  realizedCr?: number // cumulative, undefined for future months
}
const target = [0.2, 0.4, 0.7, 1.0, 1.4, 1.9, 2.4, 3.0, 3.6, 4.3, 5.0, 5.8, 6.6, 7.4, 8.2, 9.0, 9.8, 10.6, 11.3, 12.0]
const forecast = [0.2, 0.3, 0.5, 0.8, 1.1, 1.5, 1.9, 2.4, 2.9, 3.4, 3.9, 4.5, 5.1, 5.7, 6.3, 6.9, 7.5, 8.1, 8.8, 9.4]
const realized = [0.1, 0.3, 0.5, 0.8, 1.1, 1.5, 1.9, 2.3, 2.7, 3.1]
const months = ['Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26', 'Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27', 'May 27', 'Jun 27', 'Jul 27', 'Aug 27']
export const seedValueMonthly: ValueMonth[] = months.map((m, i) => ({ id: `vm-${String(i + 1).padStart(2, '0')}`, month: m, targetCr: target[i], forecastCr: forecast[i], realizedCr: realized[i] }))

export interface SavingsInitiative {
  id: string
  initiative: string
  category: 'Labour Arbitrage' | 'Vendor' | 'Real Estate' | 'Automation' | 'Process'
  annualisedSavingCr: number
  oneTimeCostCr: number
  start: string
  status: 'Realized' | 'In Progress' | 'Planned' | 'At Risk'
  owner: string
}
export const seedSavingsInitiatives: SavingsInitiative[] = [
  { id: 'si-1', initiative: 'Finance ops transition (Wave 1) – 85 FTE', category: 'Labour Arbitrage', annualisedSavingCr: 2.4, oneTimeCostCr: 0.9, start: '2026-09-15', status: 'In Progress', owner: 'E. Lindqvist' },
  { id: 'si-2', initiative: 'IT service desk transition (Wave 2) – 120 FTE', category: 'Labour Arbitrage', annualisedSavingCr: 2.0, oneTimeCostCr: 1.1, start: '2026-11-12', status: 'At Risk', owner: 'M. Chen' },
  { id: 'si-3', initiative: 'Managed-service vendor consolidation (3 → 1)', category: 'Vendor', annualisedSavingCr: 0.6, oneTimeCostCr: 0.1, start: '2026-07-01', status: 'Realized', owner: 'V. Reddy' },
  { id: 'si-4', initiative: 'Software licence renegotiation', category: 'Vendor', annualisedSavingCr: 0.4, oneTimeCostCr: 0.0, start: '2026-08-01', status: 'In Progress', owner: 'V. Reddy' },
  { id: 'si-5', initiative: 'Release 2 onshore floors (London)', category: 'Real Estate', annualisedSavingCr: 0.6, oneTimeCostCr: 0.2, start: '2027-01-01', status: 'Planned', owner: 'G. Alvarez' },
  { id: 'si-6', initiative: 'Reporting automation (RPA bots)', category: 'Automation', annualisedSavingCr: 0.8, oneTimeCostCr: 0.3, start: '2026-10-01', status: 'In Progress', owner: 'R. Mehta' },
  { id: 'si-7', initiative: 'P2P process standardisation', category: 'Process', annualisedSavingCr: 0.7, oneTimeCostCr: 0.2, start: '2026-10-15', status: 'In Progress', owner: 'E. Lindqvist' },
  { id: 'si-8', initiative: 'HR ops transition (Wave 3) – 60 FTE', category: 'Labour Arbitrage', annualisedSavingCr: 1.3, oneTimeCostCr: 0.6, start: '2027-02-01', status: 'Planned', owner: 'H. Patel' },
]

/** Business-case cost build: baseline onshore cost → levers → GCC run cost (₹ Cr, steady state Year 4) */
export const WATERFALL = [
  { name: 'Onshore Baseline', value: 120, kind: 'total' },
  { name: 'Labour Arbitrage', value: -32, kind: 'down' },
  { name: 'Vendor', value: -6, kind: 'down' },
  { name: 'Real Estate', value: -5, kind: 'down' },
  { name: 'Automation', value: -8, kind: 'down' },
  { name: 'GCC Run Cost', value: 72, kind: 'total' },
  { name: 'Transition Cost', value: 3, kind: 'up' },
] as const

/** Payback: yearly investment vs benefits (₹ Cr) */
export const PAYBACK = [
  { year: 'Y1 (2026)', investment: 8.5, benefits: 3.5 },
  { year: 'Y2 (2027)', investment: 6.0, benefits: 12.0 },
  { year: 'Y3 (2028)', investment: 2.5, benefits: 24.0 },
  { year: 'Y4 (2029)', investment: 1.5, benefits: 48.0 },
  { year: 'Y5 (2030)', investment: 1.0, benefits: 48.0 },
]

/** Run-rate savings % trajectory */
export const RUNRATE = [
  { year: '2026', actual: 15, target: 15 },
  { year: '2027', actual: undefined, target: 25 },
  { year: '2028', actual: undefined, target: 33 },
  { year: '2029', actual: undefined, target: 38 },
  { year: '2030', actual: undefined, target: 40 },
]
