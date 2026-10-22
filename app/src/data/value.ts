/**
 * Value Realization seed data and types – ENGIE IT GCC, Pune (IT run-rate savings vs the European / US baseline).
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
  B(1, { benefitArea: 'Cost Savings (Ops)', lever: 'IT run-rate savings – Infrastructure & Cloud transition from Europe', targetCr: 2.4, forecastCr: 2.1, realizedCr: 0.9, owner: 'T. Moreau', workstream: 'Technology & Infrastructure', status: 'On Track', measurementMethod: 'Fully loaded cost per FTE vs the European baseline (Cloud Operations, Network)', baseline: '₹ 28.5 L per FTE (Europe)', frequency: 'Monthly', signedOff: true, signedOffBy: 'T. Moreau', signedOffOn: '2026-11-15' }),
  B(2, { benefitArea: 'Cost Savings (Ops)', lever: 'IT run-rate savings – SAP / ERP & Business Applications (France, USA)', targetCr: 2.0, forecastCr: 1.5, realizedCr: 0.5, owner: 'J.-M. Fournier', workstream: 'Transition Readiness', status: 'At Risk', measurementMethod: 'AMS cost per ticket and FTE cost delta vs the Networks GBU / Houston baseline', baseline: '₹ 31.0 L per FTE (France / USA)', frequency: 'Monthly', signedOff: false }),
  B(3, { benefitArea: 'Cost Savings (Ops)', lever: 'Managed-service vendor consolidation & contract renegotiation (Europe)', targetCr: 1.0, forecastCr: 0.8, realizedCr: 0.4, owner: 'V. Reddy', workstream: 'Finance & Procurement', status: 'On Track', measurementMethod: 'Contract value delta vs prior-year spend', baseline: '₹ 4.2 Cr annual vendor spend', frequency: 'Quarterly', signedOff: true, signedOffBy: 'V. Reddy', signedOffOn: '2027-01-01' }),
  B(4, { benefitArea: 'Cost Savings (Ops)', lever: 'Real-estate footprint reduction – European IT sites', targetCr: 0.6, forecastCr: 0.4, realizedCr: 0.1, owner: 'G. Rousseau', workstream: 'Facilities & Workplace', status: 'On Track', measurementMethod: 'Released seats × cost per seat', baseline: '180 seats (Paris, Brussels, Lyon)', frequency: 'Quarterly', signedOff: false }),
  // Productivity Gains – 3.0 / 2.2
  B(5, { benefitArea: 'Productivity Gains', lever: 'Process standardisation – ITSM (incident / change) across GBUs', targetCr: 1.2, forecastCr: 0.9, realizedCr: 0.3, owner: 'E. Schmidt', workstream: 'Operations Setup', status: 'At Risk', measurementMethod: 'Tickets resolved per FTE vs baseline', baseline: '1,850 tickets / FTE / month', frequency: 'Monthly', signedOff: false }),
  B(6, { benefitArea: 'Productivity Gains', lever: 'Automation of recurring reports – BI / Analytics', targetCr: 0.8, forecastCr: 0.6, realizedCr: 0.2, owner: 'S. Iyer', workstream: 'Technology & Infrastructure', status: 'On Track', measurementMethod: 'Hours saved × blended rate', baseline: '2,400 hrs / month manual reporting', frequency: 'Monthly', signedOff: false }),
  B(7, { benefitArea: 'Productivity Gains', lever: 'Follow-the-sun coverage – Service Desk & Cloud Operations', targetCr: 1.0, forecastCr: 0.7, realizedCr: 0.2, owner: 'P. Lambert', workstream: 'Operations Setup', status: 'At Risk', measurementMethod: 'Overtime & on-call cost avoided in Europe', baseline: '₹ 1.1 Cr annual overtime', frequency: 'Quarterly', signedOff: false }),
  // Quality & Efficiency – 1.5 / 1.0
  B(8, { benefitArea: 'Quality & Efficiency', lever: 'First-time-right improvement – change / release', targetCr: 0.8, forecastCr: 0.5, realizedCr: 0.2, owner: 'D. Singh', workstream: 'Operations Setup', status: 'On Track', measurementMethod: 'Failed changes and rework hours avoided', baseline: '12% failed-change rate', frequency: 'Monthly', signedOff: false }),
  B(9, { benefitArea: 'Quality & Efficiency', lever: 'SLA adherence & penalty avoidance – AMS contracts', targetCr: 0.7, forecastCr: 0.5, realizedCr: 0.2, owner: 'V. Reddy', workstream: 'Transition Readiness', status: 'On Track', measurementMethod: 'SLA penalties avoided vs prior year', baseline: '₹ 0.6 Cr penalties 2025', frequency: 'Quarterly', signedOff: true, signedOffBy: 'N. Kulkarni', signedOffOn: '2027-01-30' }),
  // Time to Market – 1.0 / 0.7
  B(10, { benefitArea: 'Time to Market', lever: 'Faster release cycle – Integration & Engineering (DevOps)', targetCr: 0.6, forecastCr: 0.4, realizedCr: 0.1, owner: 'R. Costa', workstream: 'Technology & Infrastructure', status: 'On Track', measurementMethod: 'Release lead-time reduction × business impact', baseline: '14-week release cycle', frequency: 'Quarterly', signedOff: false }),
  B(11, { benefitArea: 'Time to Market', lever: 'Analytics & AI capacity for the GBUs', targetCr: 0.4, forecastCr: 0.3, realizedCr: 0.0, owner: 'I. Martin', workstream: 'Talent & Hiring', status: 'Not Started', measurementMethod: 'Analyst hours delivered × agreed value rate', baseline: '0 hrs (new capability)', frequency: 'Quarterly', signedOff: false }),
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
const months = ['May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26', 'Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27', 'May 27', 'Jun 27', 'Jul 27', 'Aug 27', 'Sep 27', 'Oct 27', 'Nov 27', 'Dec 27']
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
  { id: 'si-1', initiative: 'Infrastructure & Cloud transition from Europe (Wave 1) – 107 FTE', category: 'Labour Arbitrage', annualisedSavingCr: 2.4, oneTimeCostCr: 0.9, start: '2026-12-01', status: 'In Progress', owner: 'P. Lambert' },
  { id: 'si-2', initiative: 'SAP / ERP & Business Applications transition (Wave 2) – 107 FTE', category: 'Labour Arbitrage', annualisedSavingCr: 2.0, oneTimeCostCr: 1.1, start: '2027-02-01', status: 'At Risk', owner: 'J.-M. Fournier' },
  { id: 'si-3', initiative: 'Managed-service vendor consolidation (3 → 1)', category: 'Vendor', annualisedSavingCr: 0.6, oneTimeCostCr: 0.1, start: '2026-11-01', status: 'Realized', owner: 'V. Reddy' },
  { id: 'si-4', initiative: 'Software licence renegotiation (monitoring, ITSM, IAM)', category: 'Vendor', annualisedSavingCr: 0.4, oneTimeCostCr: 0.0, start: '2026-12-01', status: 'In Progress', owner: 'V. Reddy' },
  { id: 'si-5', initiative: 'Release 2 IT floors (Paris La Défense)', category: 'Real Estate', annualisedSavingCr: 0.6, oneTimeCostCr: 0.2, start: '2027-05-01', status: 'Planned', owner: 'G. Rousseau' },
  { id: 'si-6', initiative: 'Reporting automation – BI / Analytics (RPA bots)', category: 'Automation', annualisedSavingCr: 0.8, oneTimeCostCr: 0.3, start: '2027-02-01', status: 'In Progress', owner: 'S. Iyer' },
  { id: 'si-7', initiative: 'ITSM process standardisation (incident / change)', category: 'Process', annualisedSavingCr: 0.7, oneTimeCostCr: 0.2, start: '2027-02-15', status: 'In Progress', owner: 'E. Schmidt' },
  { id: 'si-8', initiative: 'Digital Workplace & IT Service Management transition (Wave 3) – 71 FTE', category: 'Labour Arbitrage', annualisedSavingCr: 1.3, oneTimeCostCr: 0.6, start: '2027-03-01', status: 'Planned', owner: 'L. Janssen' },
]

/** Business-case cost build: European / US IT baseline → levers → GCC run cost (₹ Cr, steady state Year 4) */
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
