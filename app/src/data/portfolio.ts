/**
 * Transformation Portfolio seed data and types.
 * Collections: 'programs', 'portfolioInitiatives', 'programBenefits', 'investmentYears'
 */
import type { Workstream } from './common'

export type ProgramPhase = 'Design' | 'Build' | 'Transition' | 'Operate' | 'Transform' | 'Transfer'
export const PROGRAM_PHASES: ProgramPhase[] = ['Design', 'Build', 'Transition', 'Operate', 'Transform', 'Transfer']
export type Rag = 'Green' | 'Amber' | 'Red'

export interface Program {
  id: string
  name: string
  location: string
  region: 'India' | 'Europe' | 'APAC' | 'Global'
  type: 'GCC Build' | 'Consolidation' | 'Digital'
  owner: string
  sponsor: string
  phase: ProgramPhase
  progress: number
  budgetCr: number
  spendCr: number
  headcountTarget: number
  headcountCurrent: number
  status: Rag
  start: string
  end: string
  goLive?: string
  description: string
  /** phase windows for the roadmap, keyed by phase → [startISO, endISO] */
  phasePlan: Partial<Record<ProgramPhase, [string, string]>>
}
export const seedPrograms: Program[] = [
  { id: 'pg-india', name: 'GCC Program - India', location: 'Bengaluru', region: 'India', type: 'GCC Build', owner: 'Anita Sharma', sponsor: 'J. Whitfield', phase: 'Build', progress: 72, budgetCr: 4.0, spendCr: 2.6, headcountTarget: 450, headcountCurrent: 320, status: 'Amber', start: '2026-01-01', end: '2027-12-31', goLive: '2026-11-12', description: 'Captive GCC for Finance, IT and HR operations with 450 FTE by end of 2027.',
    phasePlan: { Design: ['2026-01-01', '2026-03-31'], Build: ['2026-04-01', '2026-11-12'], Transition: ['2026-09-15', '2027-03-31'], Operate: ['2027-04-01', '2027-12-31'], Transform: ['2028-01-01', '2028-12-31'] } },
  { id: 'pg-poland', name: 'GCC Program - Poland', location: 'Kraków', region: 'Europe', type: 'GCC Build', owner: 'M. Kowalski', sponsor: 'L. Moreau', phase: 'Design', progress: 18, budgetCr: 3.2, spendCr: 0.5, headcountTarget: 220, headcountCurrent: 12, status: 'Green', start: '2026-07-01', end: '2028-06-30', goLive: '2027-06-15', description: 'Near-shore EU hub for finance control, treasury and EU-language customer support.',
    phasePlan: { Design: ['2026-07-01', '2026-12-31'], Build: ['2027-01-01', '2027-06-15'], Transition: ['2027-05-01', '2027-12-31'], Operate: ['2028-01-01', '2028-06-30'] } },
  { id: 'pg-philippines', name: 'GCC Program - Philippines', location: 'Manila', region: 'APAC', type: 'GCC Build', owner: 'R. Santos', sponsor: 'H. Patel', phase: 'Transition', progress: 55, budgetCr: 2.4, spendCr: 1.4, headcountTarget: 300, headcountCurrent: 165, status: 'Amber', start: '2025-10-01', end: '2027-06-30', goLive: '2026-08-01', description: 'Customer operations and HR shared services hub; Wave 2 in transition.',
    phasePlan: { Design: ['2025-10-01', '2026-01-31'], Build: ['2026-02-01', '2026-08-01'], Transition: ['2026-07-01', '2027-02-28'], Operate: ['2027-03-01', '2027-06-30'], Transform: ['2027-07-01', '2028-06-30'] } },
  { id: 'pg-ssc', name: 'Shared Services Consolidation', location: 'Global', region: 'Global', type: 'Consolidation', owner: 'E. Lindqvist', sponsor: 'L. Moreau', phase: 'Transform', progress: 40, budgetCr: 1.8, spendCr: 0.9, headcountTarget: 0, headcountCurrent: 0, status: 'Red', start: '2026-03-01', end: '2027-09-30', description: 'Consolidate six regional shared-service centres into the three GCC hubs.',
    phasePlan: { Design: ['2026-03-01', '2026-05-31'], Transform: ['2026-06-01', '2027-06-30'], Transfer: ['2027-07-01', '2027-09-30'] } },
  { id: 'pg-dwp', name: 'Digital Workplace Rollout', location: 'Global', region: 'Global', type: 'Digital', owner: 'M. Chen', sponsor: 'T. Okafor', phase: 'Operate', progress: 90, budgetCr: 1.1, spendCr: 1.0, headcountTarget: 0, headcountCurrent: 0, status: 'Green', start: '2025-09-01', end: '2026-12-31', description: 'Global collaboration, device and identity platform rollout across all hubs.',
    phasePlan: { Design: ['2025-09-01', '2025-11-30'], Build: ['2025-12-01', '2026-04-30'], Transition: ['2026-05-01', '2026-08-31'], Operate: ['2026-09-01', '2026-12-31'] } },
]
export const PROGRAM_NAMES = seedPrograms.map((p) => p.name)

export type InitiativeType = 'Transformation' | 'Transition' | 'Enablement' | 'Optimization' | 'Compliance'
export interface PortfolioInitiative {
  id: string
  code: string
  name: string
  program: string
  type: InitiativeType
  workstream: Workstream | 'Program Management'
  owner: string
  status: 'On Track' | 'At Risk' | 'Delayed' | 'Completed' | 'Not Started'
  progress: number
  benefitCr: number
  due: string
}
const I = (n: number, p: Omit<PortfolioInitiative, 'id' | 'code'>): PortfolioInitiative => ({ id: `pi-${String(n).padStart(3, '0')}`, code: `IN-${String(n).padStart(3, '0')}`, ...p })
export const seedPortfolioInitiatives: PortfolioInitiative[] = [
  I(1, { name: 'Finance operations transition (Wave 1)', program: 'GCC Program - India', type: 'Transition', workstream: 'Transition Readiness', owner: 'A. Sharma', status: 'On Track', progress: 85, benefitCr: 2.4, due: '2026-12-31' }),
  I(2, { name: 'IT service desk transition (Wave 2)', program: 'GCC Program - India', type: 'Transition', workstream: 'Transition Readiness', owner: 'R. Mehta', status: 'At Risk', progress: 48, benefitCr: 2.0, due: '2027-02-28' }),
  I(3, { name: 'Bengaluru campus fit-out', program: 'GCC Program - India', type: 'Enablement', workstream: 'Facilities & Workplace', owner: 'K. Nair', status: 'On Track', progress: 76, benefitCr: 0, due: '2026-11-30' }),
  I(4, { name: 'Wave 2 specialist hiring', program: 'GCC Program - India', type: 'Enablement', workstream: 'Talent & Hiring', owner: 'S. Iyer', status: 'At Risk', progress: 62, benefitCr: 0, due: '2026-11-15' }),
  I(5, { name: 'Reporting automation (RPA)', program: 'GCC Program - India', type: 'Optimization', workstream: 'Technology & Infrastructure', owner: 'R. Mehta', status: 'On Track', progress: 40, benefitCr: 0.8, due: '2027-03-31' }),
  I(6, { name: 'Security & compliance certification (ISO 27001)', program: 'GCC Program - India', type: 'Compliance', workstream: 'Legal & Compliance', owner: 'P. Rao', status: 'On Track', progress: 55, benefitCr: 0, due: '2027-01-31' }),
  I(7, { name: 'Kraków site selection & lease', program: 'GCC Program - Poland', type: 'Enablement', workstream: 'Facilities & Workplace', owner: 'M. Kowalski', status: 'On Track', progress: 35, benefitCr: 0, due: '2026-12-15' }),
  I(8, { name: 'EU entity incorporation', program: 'GCC Program - Poland', type: 'Compliance', workstream: 'Legal & Compliance', owner: 'P. Rao', status: 'On Track', progress: 20, benefitCr: 0, due: '2026-12-31' }),
  I(9, { name: 'Treasury & controlling operating model', program: 'GCC Program - Poland', type: 'Transformation', workstream: 'Finance & Procurement', owner: 'E. Lindqvist', status: 'Not Started', progress: 5, benefitCr: 1.6, due: '2027-06-30' }),
  I(10, { name: 'Customer operations transition (Wave 2)', program: 'GCC Program - Philippines', type: 'Transition', workstream: 'Transition Readiness', owner: 'R. Santos', status: 'At Risk', progress: 50, benefitCr: 1.9, due: '2027-01-31' }),
  I(11, { name: 'HR shared services stabilization', program: 'GCC Program - Philippines', type: 'Transition', workstream: 'Operations Setup', owner: 'H. Patel', status: 'On Track', progress: 70, benefitCr: 1.1, due: '2026-12-31' }),
  I(12, { name: 'Manila workforce ramp to 300', program: 'GCC Program - Philippines', type: 'Enablement', workstream: 'Talent & Hiring', owner: 'R. Santos', status: 'Delayed', progress: 55, benefitCr: 0, due: '2027-03-31' }),
  I(13, { name: 'Close Dublin & Singapore SSCs', program: 'Shared Services Consolidation', type: 'Transformation', workstream: 'Operations Setup', owner: 'E. Lindqvist', status: 'Delayed', progress: 30, benefitCr: 3.2, due: '2027-06-30' }),
  I(14, { name: 'Global process ownership model', program: 'Shared Services Consolidation', type: 'Transformation', workstream: 'Finance & Procurement', owner: 'L. Moreau', status: 'At Risk', progress: 45, benefitCr: 1.2, due: '2027-03-31' }),
  I(15, { name: 'Unified ERP instance migration', program: 'Shared Services Consolidation', type: 'Transformation', workstream: 'Technology & Infrastructure', owner: 'T. Okafor', status: 'Delayed', progress: 25, benefitCr: 2.0, due: '2027-09-30' }),
  I(16, { name: 'Identity & access platform rollout', program: 'Digital Workplace Rollout', type: 'Enablement', workstream: 'Technology & Infrastructure', owner: 'M. Chen', status: 'Completed', progress: 100, benefitCr: 0.5, due: '2026-06-30' }),
  I(17, { name: 'Collaboration suite migration (all hubs)', program: 'Digital Workplace Rollout', type: 'Enablement', workstream: 'Technology & Infrastructure', owner: 'M. Chen', status: 'On Track', progress: 88, benefitCr: 0.7, due: '2026-12-15' }),
  I(18, { name: 'Device-as-a-service adoption', program: 'Digital Workplace Rollout', type: 'Optimization', workstream: 'Technology & Infrastructure', owner: 'R. Mehta', status: 'On Track', progress: 80, benefitCr: 0.4, due: '2026-12-31' }),
]

export interface ProgramBenefit {
  id: string
  program: string
  costSavingsCr: number
  productivityCr: number
  qualityCr: number
  timeToMarketCr: number
  realizedCr: number
}
export const seedProgramBenefits: ProgramBenefit[] = [
  { id: 'pb-india', program: 'GCC Program - India', costSavingsCr: 6.0, productivityCr: 3.0, qualityCr: 1.5, timeToMarketCr: 1.0, realizedCr: 3.1 },
  { id: 'pb-poland', program: 'GCC Program - Poland', costSavingsCr: 4.0, productivityCr: 1.5, qualityCr: 0.8, timeToMarketCr: 0.4, realizedCr: 0.0 },
  { id: 'pb-philippines', program: 'GCC Program - Philippines', costSavingsCr: 4.5, productivityCr: 1.8, qualityCr: 1.0, timeToMarketCr: 0.3, realizedCr: 2.2 },
  { id: 'pb-ssc', program: 'Shared Services Consolidation', costSavingsCr: 5.5, productivityCr: 1.2, qualityCr: 0.9, timeToMarketCr: 0.0, realizedCr: 0.8 },
  { id: 'pb-dwp', program: 'Digital Workplace Rollout', costSavingsCr: 0.6, productivityCr: 1.4, qualityCr: 0.5, timeToMarketCr: 0.6, realizedCr: 1.9 },
]

export interface InvestmentYear {
  id: string
  program: string
  y2026: number
  y2027: number
  y2028: number
}
export const seedInvestmentYears: InvestmentYear[] = [
  { id: 'iv-india', program: 'GCC Program - India', y2026: 2.8, y2027: 1.2, y2028: 0.4 },
  { id: 'iv-poland', program: 'GCC Program - Poland', y2026: 0.6, y2027: 1.8, y2028: 0.8 },
  { id: 'iv-philippines', program: 'GCC Program - Philippines', y2026: 1.5, y2027: 0.9, y2028: 0.2 },
  { id: 'iv-ssc', program: 'Shared Services Consolidation', y2026: 0.9, y2027: 0.9, y2028: 0.3 },
  { id: 'iv-dwp', program: 'Digital Workplace Rollout', y2026: 1.0, y2027: 0.1, y2028: 0.0 },
]

export const PROGRAM_COLORS: Record<string, string> = {
  'GCC Program - India': '#1E5BBE',
  'GCC Program - Poland': '#14B8A6',
  'GCC Program - Philippines': '#8B5CF6',
  'Shared Services Consolidation': '#F59E0B',
  'Digital Workplace Rollout': '#5B9BF0',
}
export const PHASE_COLORS: Record<ProgramPhase, string> = { Design: '#BFD7F7', Build: '#1E5BBE', Transition: '#14B8A6', Operate: '#16A34A', Transform: '#8B5CF6', Transfer: '#F59E0B' }
export const RAG_COLORS: Record<Rag, string> = { Green: '#16A34A', Amber: '#F59E0B', Red: '#DC2626' }
