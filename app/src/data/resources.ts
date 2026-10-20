// Resource Management – types, constants and seed data. Wording mirrors mockups/05-resource-management.jpeg,
// with the client's changes: headcount is by BUSINESS UNIT (src/data/businessUnits.ts), the GCC is Pune-only for now,
// and every requisition carries its own candidate pipeline ('candidates' collection).
import { OWNERS, TODAY, MONTHS, CHART_COLORS } from './common'
import { seedBusinessUnits, BU_NAMES } from './businessUnits'

/* ---------- Business units on this page ---------- */
/** Short names used in compact tables / chart axes. Unknown names fall back to the full name. */
export const BU_SHORT: Record<string, string> = {
  'SAP Practice': 'SAP',
  'Microsoft Practice': 'Microsoft',
  'Data & AI Practice': 'Data & AI',
  'R&D – Product Engineering': 'R&D Product',
  'R&D – Platform & Cloud': 'R&D Cloud',
  'Finance Shared Services': 'Finance SS',
  'HR Shared Services': 'HR SS',
}
export const buShort = (name: string) => BU_SHORT[name] ?? name
/** Two-line labels for narrow chart axes ("\n" = line break, see WrapTick). */
export const BU_AXIS: Record<string, string> = {
  'SAP Practice': 'SAP', 'Microsoft Practice': 'Microsoft', 'Data & AI Practice': 'Data &\nAI', 'R&D – Product Engineering': 'R&D\nProduct', 'R&D – Platform & Cloud': 'R&D\nCloud', 'Finance Shared Services': 'Finance\nSS', 'HR Shared Services': 'HR\nSS',
}
export const buAxis = (name: string) => BU_AXIS[name] ?? buShort(name)
/** Fallback mapping for rows that still carry the old function / workstream names (persisted data, imports). */
export const LEGACY_FN_TO_BU: Record<string, string> = {
  'Engineering & Product': 'R&D – Product Engineering',
  'Data & Analytics': 'Data & AI Practice',
  'IT & Infrastructure': 'R&D – Platform & Cloud',
  'Finance & Accounting': 'Finance Shared Services',
  'HR & People Services': 'HR Shared Services',
  'Procurement & Supply Chain': 'Finance Shared Services',
  'Other / Central': 'SAP Practice',
}
/** Resolve any stored name to a business unit from the live list (legacy function names are mapped, unknown names kept). */
export const normalizeBu = (name: string | undefined, live: readonly string[] = BU_NAMES) => {
  if (!name) return live[0] ?? ''
  if (live.includes(name)) return name
  const mapped = LEGACY_FN_TO_BU[name]
  return mapped && live.includes(mapped) ? mapped : name
}

/** Suggested locations when a second site is added later; the GCC is Pune-only today. */
export const RES_LOCATIONS = ['Pune', 'Bengaluru', 'Hyderabad', 'Chennai'] as const
export const DEFAULT_LOCATION = RES_LOCATIONS[0]
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const
export type Priority = (typeof PRIORITIES)[number]
export const POSITION_STATUSES = ['Open', 'In Interview', 'Offer', 'Joined', 'On Hold'] as const
export type PositionStatus = (typeof POSITION_STATUSES)[number]
export const GRADES = ['L1', 'L2', 'L3', 'L4', 'L5'] as const
export const COST_BANDS = ['Band A', 'Band B', 'Band C', 'Band D'] as const

/* ---------- Date helpers (local, no TZ shift) ---------- */
const pad = (n: number) => String(n).padStart(2, '0')
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const daysBetween = (from: string, to = TODAY) => Math.max(0, Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000))

/* ---------- Types ---------- */
export interface Position {
  id: string; role: string; businessUnit: string; location: string; priority: Priority; status: PositionStatus
  openedOn: string; targetDate: string; hiringManager: string; grade: string; notes?: string
}
export const isOpenPosition = (p: Position) => p.status === 'Open' || p.status === 'In Interview' || p.status === 'Offer'
export const isCriticalPosition = (p: Position) => p.priority === 'Critical' || p.priority === 'High'
export const positionDaysOpen = (p: Position) => daysBetween(p.openedOn)
export const reqId = (p: Position) => p.id.toUpperCase().replace('POS-', 'REQ-')

export interface HeadcountMonth { id: string; month: string; planned: number; actual: number; target: number; plannedUtil: number; actualUtil: number }
export interface BuHeadcount { id: string; businessUnit: string; onboarded: number; inHiring: number; open: number }
export interface FunnelStage { id: string; stage: string; candidates: number }
export interface HiringTarget { id: string; businessUnit: string; targets: number[] /* Jan..Dec */ }
export interface SkillRow { id: string; category: string; required: number; available: number; owner: string }
export interface TrainingPlan { id: string; program: string; skill: string; participants: number; startDate: string; endDate: string; status: 'Planned' | 'In Progress' | 'Completed'; owner: string }
export interface Employee { id: string; name: string; role: string; businessUnit: string; location: string; grade: string; allocationPct: number; costBand: string; annualCostL: number; startDate: string }
export interface PeopleCostRow { id: string; businessUnit: string; budgetCr: number; actualCr: number }
export interface LocationRow { id: string; name: string; ftes: number; seats: number; costIndex: number; color: string; office: string }
export interface ForecastQuarter { id: string; quarter: string; base: number; accelerated: number; conservative: number }
export interface TimeToHireRow { id: string; businessUnit: string; actual: number; target: number }
export interface AttritionMonth { id: string; month: string; ratePct: number; benchmarkPct: number; exits: number; regretted: number }
export interface ExitRecord { id: string; name: string; role: string; businessUnit: string; location: string; exitDate: string; reason: string; regretted: boolean; tenureMonths: number }
export interface RetentionAction { id: string; action: string; segment: string; owner: string; dueDate: string; status: 'Planned' | 'In Progress' | 'Completed'; impact: 'High' | 'Medium' | 'Low' }
export interface ResourceSettings { id: string; fteTarget: number; avgTimeToHireMonths: number; timeToHireTargetMonths: number; seatRatio: number; currentMonth: string }

/* ---------- Candidates (application pipeline per requisition) ---------- */
export const CANDIDATE_STAGES = ['Applied', 'Screened', 'Round 1 technical', 'Round 2 technical / case', 'HR round', 'Offer', 'Accepted', 'Joined'] as const
export type CandidateStage = (typeof CANDIDATE_STAGES)[number]
export const CANDIDATE_STATUSES = ['In process', 'Offer', 'Rejected', 'Withdrawn', 'Joined'] as const
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number]
export const CANDIDATE_SOURCES = ['LinkedIn', 'Naukri', 'Referral', 'Agency', 'Campus', 'Careers site', 'Internal'] as const
export interface Candidate {
  id: string; positionId: string; name: string; source: string
  /** furthest stage reached */
  stage: CandidateStage; status: CandidateStatus
  /** interview rounds completed (Round 1, Round 2, HR) */
  roundsCompleted: number
  lastActivity: string; nextStep: string; notes: string
}
export const stageIndex = (s: string) => Math.max(0, CANDIDATE_STAGES.indexOf(s as CandidateStage))
export const isActiveCandidate = (c: Candidate) => c.status === 'In process' || c.status === 'Offer'
/** Interview rounds completed once a candidate sits at `stage` (the round at that stage is still pending). */
export const roundsForStage = (stage: CandidateStage) => Math.max(0, Math.min(3, stageIndex(stage) - 2))
/** Status implied by a stage for a candidate still in the process. */
export const statusForStage = (stage: CandidateStage): CandidateStatus => (stage === 'Joined' ? 'Joined' : stage === 'Offer' || stage === 'Accepted' ? 'Offer' : 'In process')
export const NEXT_STEP: Record<CandidateStage, string> = {
  Applied: 'CV screening by TA',
  Screened: 'Schedule Round 1 technical',
  'Round 1 technical': 'Round 1 technical interview',
  'Round 2 technical / case': 'Round 2 technical / case study',
  'HR round': 'HR round – fit, compensation',
  Offer: 'Offer released – awaiting acceptance',
  Accepted: 'Background check, joining date',
  Joined: 'Onboarding',
}
/** Pipeline counts for one requisition: candidates that reached each stage, conversion from the previous stage, and how many sit there now. */
export function pipelineFor(cands: Candidate[]) {
  return CANDIDATE_STAGES.map((stage, i, all) => {
    const reached = cands.filter((c) => stageIndex(c.stage) >= i).length
    const prev = i === 0 ? null : cands.filter((c) => stageIndex(c.stage) >= i - 1).length
    const atStage = cands.filter((c) => c.stage === stage && isActiveCandidate(c)).length
    const dropped = cands.filter((c) => c.stage === stage && !isActiveCandidate(c) && c.status !== 'Joined').length
    return { id: `st-${i}`, stage, candidates: reached, conv: prev === null ? null : prev ? Math.round((reached / prev) * 100) : 0, atStage, dropped, last: i === all.length - 1 }
  })
}
/** Overview "Hiring Pipeline" stages (mock-up wording) mapped onto the candidate stages. */
export const OVERVIEW_FUNNEL: { stage: string; from: CandidateStage }[] = [
  { stage: 'Sourced', from: 'Applied' },
  { stage: 'Screened', from: 'Screened' },
  { stage: 'Technical Interview', from: 'Round 1 technical' },
  { stage: 'HR Interview', from: 'HR round' },
  { stage: 'Offer Extended', from: 'Offer' },
  { stage: 'Joined', from: 'Joined' },
]
export function overviewFunnel(cands: Candidate[]): FunnelStage[] {
  return OVERVIEW_FUNNEL.map((s, i) => ({ id: `fs-${i + 1}`, stage: s.stage, candidates: cands.filter((c) => stageIndex(c.stage) >= stageIndex(s.from)).length }))
}
/** The stage a requisition "is at": the furthest stage any active candidate has reached. */
export function requisitionStage(cands: Candidate[]): CandidateStage | 'No applicants yet' {
  const active = cands.filter(isActiveCandidate)
  const pool = active.length ? active : cands
  if (!pool.length) return 'No applicants yet'
  return CANDIDATE_STAGES[Math.max(...pool.map((c) => stageIndex(c.stage)))]
}

/* ---------- Seeds ---------- */
export const seedResourceSettings: ResourceSettings[] = [
  { id: 'res-settings', fteTarget: 450, avgTimeToHireMonths: 4.2, timeToHireTargetMonths: 3.4, seatRatio: 1.2, currentMonth: 'Oct' },
]

const PLANNED = [50, 80, 110, 140, 170, 200, 225, 250, 270, 286, 360, 450]
const ACTUAL = [55, 85, 115, 150, 185, 220, 250, 280, 300, 320, 350, 385]
const TARGET = [100, 135, 170, 205, 240, 275, 310, 345, 380, 410, 435, 450]
const PLAN_UTIL = [22, 26, 30, 36, 42, 48, 54, 58, 62, 62, 76, 88]
const ACT_UTIL = [18, 24, 30, 34, 42, 50, 56, 60, 66, 68, 74, 82]
export const seedHeadcountPlan: HeadcountMonth[] = MONTHS.map((m, i) => ({ id: `hc-${m}`, month: m, planned: PLANNED[i], actual: ACTUAL[i], target: TARGET[i], plannedUtil: PLAN_UTIL[i], actualUtil: ACT_UTIL[i] }))

/**
 * Headcount by business unit. Onboarded (320 of the 450 target) is split in proportion to the business units' FTE plan
 * (src/data/businessUnits.ts); "open" equals the open requisitions per business unit in the register below.
 */
const BU = seedBusinessUnits
const buId = (name: string) => BU.find((b) => b.name === name)?.id.replace('bu-', '') ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
export const OPEN_PER_BU: Record<string, number> = { 'SAP Practice': 20, 'Microsoft Practice': 14, 'Data & AI Practice': 10, 'R&D – Product Engineering': 9, 'R&D – Platform & Cloud': 6, 'Finance Shared Services': 5, 'HR Shared Services': 4 } // 68
const ONBOARDED_PER_BU: Record<string, number> = { 'SAP Practice': 107, 'Microsoft Practice': 75, 'Data & AI Practice': 47, 'R&D – Product Engineering': 38, 'R&D – Platform & Cloud': 21, 'Finance Shared Services': 17, 'HR Shared Services': 15 } // 320
const IN_HIRING_PER_BU: Record<string, number> = { 'SAP Practice': 18, 'Microsoft Practice': 13, 'Data & AI Practice': 9, 'R&D – Product Engineering': 8, 'R&D – Platform & Cloud': 6, 'Finance Shared Services': 4, 'HR Shared Services': 4 } // 62
export const seedBuHeadcount: BuHeadcount[] = BU.map((b) => ({ id: `bh-${buId(b.name)}`, businessUnit: b.name, onboarded: ONBOARDED_PER_BU[b.name] ?? 0, inHiring: IN_HIRING_PER_BU[b.name] ?? 0, open: OPEN_PER_BU[b.name] ?? 0 }))

export const FUNNEL_COLORS = [CHART_COLORS.blue, CHART_COLORS.blueLight, CHART_COLORS.teal, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.orange, CHART_COLORS.violet, CHART_COLORS.navy]

export const seedTimeToHire: TimeToHireRow[] = [
  { id: 'tth-sap', businessUnit: 'SAP Practice', actual: 42, target: 30 },
  { id: 'tth-ms', businessUnit: 'Microsoft Practice', actual: 38, target: 30 },
  { id: 'tth-data', businessUnit: 'Data & AI Practice', actual: 52, target: 35 },
  { id: 'tth-rd-prod', businessUnit: 'R&D – Product Engineering', actual: 45, target: 30 },
  { id: 'tth-rd-cloud', businessUnit: 'R&D – Platform & Cloud', actual: 40, target: 30 },
  { id: 'tth-fin', businessUnit: 'Finance Shared Services', actual: 32, target: 25 },
  { id: 'tth-hr', businessUnit: 'HR Shared Services', actual: 28, target: 25 },
]

/** Single location today: Pune hosts all 320 onboarded FTEs. A second site can be added from the Location Mix tab. */
export const seedLocationMix: LocationRow[] = [
  { id: 'loc-pune', name: 'Pune', ftes: 320, seats: 384, costIndex: 1.0, color: CHART_COLORS.blue, office: 'EON Free Zone, Cluster C' },
]
export const LOCATION_COLORS = [CHART_COLORS.blue, CHART_COLORS.blueLight, CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.violet]

export const seedSkills: SkillRow[] = [
  { id: 'sk-sap', category: 'SAP S/4HANA', required: 60, available: 44, owner: 'R. Mehta' },
  { id: 'sk-ms', category: 'Microsoft Dynamics / Power Platform', required: 40, available: 28, owner: 'R. Mehta' },
  { id: 'sk-cloud', category: 'Cloud (Azure/AWS)', required: 45, available: 30, owner: 'M. Khan' },
  { id: 'sk-data', category: 'Data Engineering & AI/ML', required: 35, available: 22, owner: 'S. Iyer' },
  { id: 'sk-prod', category: 'Product Engineering', required: 50, available: 42, owner: 'M. Khan' },
  { id: 'sk-cyber', category: 'Cybersecurity', required: 20, available: 11, owner: 'M. Khan' },
  { id: 'sk-fin', category: 'Finance & HR operations', required: 25, available: 20, owner: 'V. Reddy' },
]

export const seedTrainingPlans: TrainingPlan[] = [
  { id: 'tp-1', program: 'SAP S/4HANA finance academy', skill: 'SAP S/4HANA', participants: 18, startDate: '2026-09-07', endDate: '2026-11-27', status: 'In Progress', owner: 'R. Mehta' },
  { id: 'tp-2', program: 'Azure Solutions Architect bootcamp', skill: 'Cloud (Azure/AWS)', participants: 24, startDate: '2026-11-02', endDate: '2026-12-18', status: 'Planned', owner: 'M. Khan' },
  { id: 'tp-3', program: 'Databricks & GenAI certification track', skill: 'Data Engineering & AI/ML', participants: 15, startDate: '2026-10-05', endDate: '2026-12-04', status: 'In Progress', owner: 'S. Iyer' },
  { id: 'tp-4', program: 'Power Platform developer programme', skill: 'Microsoft Dynamics / Power Platform', participants: 12, startDate: '2026-11-16', endDate: '2027-01-29', status: 'Planned', owner: 'R. Mehta' },
  { id: 'tp-5', program: 'Security operations (SOC) upskilling', skill: 'Cybersecurity', participants: 10, startDate: '2026-08-10', endDate: '2026-10-09', status: 'Completed', owner: 'M. Khan' },
]

export const seedPeopleCost: PeopleCostRow[] = [
  { id: 'pc-sap', businessUnit: 'SAP Practice', budgetCr: 1.7, actualCr: 1.25 },
  { id: 'pc-ms', businessUnit: 'Microsoft Practice', budgetCr: 1.2, actualCr: 0.88 },
  { id: 'pc-data', businessUnit: 'Data & AI Practice', budgetCr: 0.8, actualCr: 0.58 },
  { id: 'pc-rd-prod', businessUnit: 'R&D – Product Engineering', budgetCr: 0.65, actualCr: 0.47 },
  { id: 'pc-rd-cloud', businessUnit: 'R&D – Platform & Cloud', budgetCr: 0.4, actualCr: 0.3 },
  { id: 'pc-fin', businessUnit: 'Finance Shared Services', budgetCr: 0.25, actualCr: 0.18 },
  { id: 'pc-hr', businessUnit: 'HR Shared Services', budgetCr: 0.2, actualCr: 0.14 },
]

export const seedHeadcountForecast: ForecastQuarter[] = [
  { id: 'fq-1', quarter: "Q1'26", base: 100, accelerated: 110, conservative: 90 },
  { id: 'fq-2', quarter: "Q2'26", base: 165, accelerated: 185, conservative: 140 },
  { id: 'fq-3', quarter: "Q3'26", base: 230, accelerated: 260, conservative: 195 },
  { id: 'fq-4', quarter: "Q4'26", base: 290, accelerated: 330, conservative: 245 },
  { id: 'fq-5', quarter: "Q1'27", base: 340, accelerated: 390, conservative: 290 },
  { id: 'fq-6', quarter: "Q2'27", base: 385, accelerated: 440, conservative: 325 },
  { id: 'fq-7', quarter: "Q3'27", base: 420, accelerated: 485, conservative: 355 },
  { id: 'fq-8', quarter: "Q4'27", base: 450, accelerated: 520, conservative: 380 },
]

export const seedHiringTargets: HiringTarget[] = [
  { id: 'ht-sap', businessUnit: 'SAP Practice', targets: [3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 4, 4] },
  { id: 'ht-ms', businessUnit: 'Microsoft Practice', targets: [2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 3, 3] },
  { id: 'ht-data', businessUnit: 'Data & AI Practice', targets: [1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 1] },
  { id: 'ht-rd-prod', businessUnit: 'R&D – Product Engineering', targets: [1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
  { id: 'ht-rd-cloud', businessUnit: 'R&D – Platform & Cloud', targets: [1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1] },
  { id: 'ht-fin', businessUnit: 'Finance Shared Services', targets: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0] },
  { id: 'ht-hr', businessUnit: 'HR Shared Services', targets: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0] },
]

const ATTR_RATE = [6.0, 6.4, 7.1, 7.8, 8.3, 9.0, 9.6, 10.1, 10.8, 11.4]
const ATTR_EXITS = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4]
const ATTR_REGRET = [0, 1, 1, 1, 1, 2, 1, 2, 2, 3]
export const seedAttrition: AttritionMonth[] = MONTHS.slice(0, 10).map((m, i) => ({ id: `at-${m}`, month: m, ratePct: ATTR_RATE[i], benchmarkPct: 12, exits: ATTR_EXITS[i], regretted: ATTR_REGRET[i] }))

export const EXIT_REASONS = ['Better compensation', 'Career growth', 'Relocation', 'Higher studies', 'Personal reasons', 'Performance', 'Role mismatch'] as const
export const seedExits: ExitRecord[] = [
  { id: 'ex-1', name: 'Rohit Kulkarni', role: 'Data Engineer', businessUnit: 'Data & AI Practice', location: 'Pune', exitDate: '2026-10-09', reason: 'Better compensation', regretted: true, tenureMonths: 7 },
  { id: 'ex-2', name: 'Shreya Menon', role: 'Backend Engineer', businessUnit: 'R&D – Product Engineering', location: 'Pune', exitDate: '2026-10-02', reason: 'Career growth', regretted: true, tenureMonths: 8 },
  { id: 'ex-3', name: 'Imran Shaikh', role: 'SAP Basis Consultant', businessUnit: 'SAP Practice', location: 'Pune', exitDate: '2026-09-25', reason: 'Relocation', regretted: false, tenureMonths: 6 },
  { id: 'ex-4', name: 'Pallavi Joshi', role: 'AP Analyst', businessUnit: 'Finance Shared Services', location: 'Pune', exitDate: '2026-09-18', reason: 'Personal reasons', regretted: false, tenureMonths: 5 },
  { id: 'ex-5', name: 'Karthik Raman', role: 'Cloud Engineer', businessUnit: 'R&D – Platform & Cloud', location: 'Pune', exitDate: '2026-09-04', reason: 'Better compensation', regretted: true, tenureMonths: 9 },
  { id: 'ex-6', name: 'Neha Agarwal', role: 'Dynamics 365 Consultant', businessUnit: 'Microsoft Practice', location: 'Pune', exitDate: '2026-08-21', reason: 'Career growth', regretted: true, tenureMonths: 6 },
  { id: 'ex-7', name: 'Vikram Pillai', role: 'SAP MM Consultant', businessUnit: 'SAP Practice', location: 'Pune', exitDate: '2026-08-07', reason: 'Role mismatch', regretted: false, tenureMonths: 4 },
  { id: 'ex-8', name: 'Ananya Bose', role: 'HR Operations Analyst', businessUnit: 'HR Shared Services', location: 'Pune', exitDate: '2026-07-24', reason: 'Higher studies', regretted: false, tenureMonths: 7 },
]

export const seedRetentionActions: RetentionAction[] = [
  { id: 'ra-1', action: 'Mid-cycle compensation correction for Data & Cloud engineers', segment: 'Critical skills (L3–L4)', owner: 'S. Iyer', dueDate: '2026-11-15', status: 'In Progress', impact: 'High' },
  { id: 'ra-2', action: 'Launch GCC career-path framework and promotion calendar', segment: 'All employees', owner: 'A. Sharma', dueDate: '2026-12-01', status: 'Planned', impact: 'High' },
  { id: 'ra-3', action: 'Stay interviews for top-50 critical talent', segment: 'High performers', owner: 'S. Iyer', dueDate: '2026-10-31', status: 'In Progress', impact: 'Medium' },
  { id: 'ra-4', action: 'Retention bonus for Wave 1 joiners completing 18 months', segment: 'Wave 1 cohort', owner: 'D. Singh', dueDate: '2027-01-31', status: 'Planned', impact: 'Medium' },
  { id: 'ra-5', action: 'Manager capability programme (first-time managers)', segment: 'People managers', owner: 'M. Khan', dueDate: '2026-09-30', status: 'Completed', impact: 'Medium' },
]

/* ---------- Positions (68 open: 24 Critical/High, 44 Medium/Low; plus 8 filled and 2 on hold) ---------- */
const ROLE_POOL: Record<string, string[]> = {
  'SAP Practice': ['SAP FICO Consultant', 'SAP MM Consultant', 'SAP SD Consultant', 'SAP ABAP Developer', 'SAP Basis Administrator', 'S/4HANA Solution Architect', 'SAP PP/QM Consultant', 'SAP Integration (BTP) Developer', 'SAP EWM Consultant', 'SAP Fiori Developer', 'SAP AMS Lead', 'SAP Data Migration Analyst'],
  'Microsoft Practice': ['Dynamics 365 F&O Consultant', 'Power Platform Developer', 'Azure Application Developer', '.NET Engineer', 'Dynamics 365 CE Consultant', 'M365 Engineer', 'Power BI Developer', 'Microsoft Solution Architect', 'SharePoint Developer'],
  'Data & AI Practice': ['Senior Data Engineer', 'Data Scientist', 'ML Engineer', 'BI Developer', 'Data Architect', 'GenAI Engineer', 'Analytics Lead', 'Data Governance Analyst'],
  'R&D – Product Engineering': ['Senior Software Engineer', 'Full-stack Developer', 'Product Manager', 'QA Automation Engineer', 'Frontend Engineer', 'Backend Engineer', 'Site Reliability Engineer', 'UX Designer', 'Scrum Master'],
  'R&D – Platform & Cloud': ['Cloud Platform Engineer', 'DevOps Engineer', 'Cybersecurity Analyst', 'Security Engineer', 'Infrastructure Architect', 'Identity & Access Engineer'],
  'Finance Shared Services': ['FP&A Specialist', 'GL Accountant', 'AP Analyst', 'Treasury Analyst', 'Revenue Accountant'],
  'HR Shared Services': ['HR Business Partner', 'Talent Acquisition Specialist', 'HR Operations Analyst', 'Payroll Specialist', 'L&D Lead'],
}
const roleFor = (bu: string, k: number) => { const pool = ROLE_POOL[bu] ?? ['Analyst']; return pool[k % pool.length] }

function buildPositions(): Position[] {
  const mk = (i: number, role: string, bu: string, pr: Priority, days: number, status: PositionStatus): Position => {
    const openedOn = addDays(TODAY, -days)
    return { id: `pos-${String(i + 1).padStart(3, '0')}`, role, businessUnit: bu, location: DEFAULT_LOCATION, priority: pr, status, openedOn, targetDate: addDays(openedOn, 75 + (i % 3) * 15), hiringManager: OWNERS[i % OWNERS.length], grade: GRADES[1 + (i % 4)] }
  }
  // the five mock-up rows (longest-open requisitions)
  const list: Position[] = [
    mk(0, 'Senior Data Engineer', 'Data & AI Practice', 'High', 45, 'In Interview'),
    mk(1, 'Cybersecurity Analyst', 'R&D – Platform & Cloud', 'High', 38, 'Open'),
    mk(2, 'FP&A Specialist', 'Finance Shared Services', 'Medium', 28, 'In Interview'),
    mk(3, 'HR Business Partner', 'HR Shared Services', 'Medium', 26, 'Open'),
    mk(4, 'SAP FICO Consultant', 'SAP Practice', 'Critical', 24, 'Offer'),
  ]
  const remaining: Record<string, number> = { ...OPEN_PER_BU }
  remaining['Data & AI Practice']--; remaining['R&D – Platform & Cloud']--; remaining['Finance Shared Services']--; remaining['HR Shared Services']--; remaining['SAP Practice']--
  // round-robin across business units so the register is interleaved rather than grouped
  const names = Object.keys(OPEN_PER_BU)
  const perBu: Record<string, { role: string; bu: string }[]> = Object.fromEntries(names.map((bu) => [bu, Array.from({ length: remaining[bu] }, (_, k) => ({ role: roleFor(bu, k + 1), bu }))]))
  const queue: { role: string; bu: string }[] = []
  const total = names.reduce((s, b) => s + remaining[b], 0) // 63
  while (queue.length < total) for (const bu of names) { const nxt = perBu[bu].shift(); if (nxt) queue.push(nxt) }
  const n = queue.length
  let acc = 0
  const statuses: PositionStatus[] = ['Open', 'Open', 'In Interview', 'Open', 'Offer', 'In Interview']
  queue.forEach((q, j) => {
    const i = j + 5
    acc += 21 // 63 × 21/63 = 21 more Critical/High → 24 in total
    let pr: Priority
    if (acc >= n) { acc -= n; pr = j % 2 ? 'High' : 'Critical' } else pr = j % 4 === 0 ? 'Low' : 'Medium'
    const days = 3 + ((i * 5) % 21)
    list.push(mk(i, q.role, q.bu, pr, days, statuses[i % statuses.length]))
  })
  // filled this cycle (Joined) and parked requisitions
  list.push(mk(68, 'S/4HANA Solution Architect', 'SAP Practice', 'Critical', 70, 'Joined'))
  list.push(mk(69, 'Data Platform Lead', 'Data & AI Practice', 'Critical', 66, 'Joined'))
  list.push(mk(70, 'Microsoft Solution Architect', 'Microsoft Practice', 'High', 62, 'Joined'))
  list.push(mk(71, 'Engineering Manager', 'R&D – Product Engineering', 'High', 58, 'Joined'))
  list.push(mk(72, 'DevOps Lead', 'R&D – Platform & Cloud', 'High', 55, 'Joined'))
  list.push(mk(73, 'Finance Transformation Lead', 'Finance Shared Services', 'High', 60, 'Joined'))
  list.push(mk(74, 'SAP ABAP Developer', 'SAP Practice', 'Medium', 52, 'Joined'))
  list.push(mk(75, 'Power BI Developer', 'Microsoft Practice', 'Medium', 50, 'Joined'))
  list.push(mk(76, 'Office Manager', 'HR Shared Services', 'Low', 30, 'On Hold'))
  list.push(mk(77, 'SAP EWM Consultant', 'SAP Practice', 'Low', 20, 'On Hold'))
  return list
}
export const seedPositions: Position[] = buildPositions()

/* ---------- Employees (sample of onboarded FTEs for allocation) ---------- */
const FIRST = ['Aarav', 'Diya', 'Ishaan', 'Meera', 'Kabir', 'Sanya', 'Arjun', 'Nisha', 'Rahul', 'Priya', 'Varun', 'Tanvi', 'Siddharth', 'Kavya', 'Aditya', 'Riya', 'Nikhil', 'Pooja', 'Manish', 'Sneha', 'Harsh', 'Lakshmi', 'Dev', 'Anjali', 'Yash', 'Swati', 'Rajat', 'Gayatri', 'Omkar', 'Bhavna', 'Tarun', 'Deepa', 'Sameer', 'Ritika', 'Gaurav', 'Madhuri', 'Ankit', 'Shruti', 'Rohan', 'Ira', 'Vivek', 'Mitali', 'Pranav', 'Aisha', 'Kunal', 'Nandini']
const LAST = ['Sharma', 'Nair', 'Patel', 'Reddy', 'Iyer', 'Khan', 'Desai', 'Menon', 'Gupta', 'Rao', 'Verma', 'Bhat', 'Chowdhury', 'Joshi', 'Singh', 'Pillai', 'Mishra', 'Kapoor', 'Kulkarni', 'Deshpande', 'Jadhav', 'Shinde', 'Sawant', 'Ghosh', 'Banerjee', 'Shah']
const EMP_ROLES: Record<string, string[]> = {
  'SAP Practice': ['SAP FICO Consultant', 'SAP ABAP Developer', 'SAP MM Consultant', 'SAP Basis Administrator', 'S/4HANA Architect'],
  'Microsoft Practice': ['Dynamics 365 Consultant', 'Power Platform Developer', '.NET Engineer', 'Azure Developer'],
  'Data & AI Practice': ['Data Engineer', 'Data Scientist', 'BI Analyst', 'ML Engineer'],
  'R&D – Product Engineering': ['Senior Software Engineer', 'Product Owner', 'QA Engineer', 'Frontend Engineer'],
  'R&D – Platform & Cloud': ['Cloud Engineer', 'DevOps Engineer', 'Security Analyst'],
  'Finance Shared Services': ['GL Accountant', 'FP&A Analyst', 'AP Specialist'],
  'HR Shared Services': ['HR Generalist', 'Recruiter', 'HR Ops Analyst'],
}
const EMP_PER_BU: Record<string, number> = { 'SAP Practice': 10, 'Microsoft Practice': 7, 'Data & AI Practice': 5, 'R&D – Product Engineering': 5, 'R&D – Platform & Cloud': 3, 'Finance Shared Services': 3, 'HR Shared Services': 3 }
const BAND_COST: Record<string, number> = { 'Band A': 8, 'Band B': 14, 'Band C': 22, 'Band D': 34 } // ₹ Lakh per annum
function buildEmployees(): Employee[] {
  const out: Employee[] = []
  let i = 0
  for (const bu of Object.keys(EMP_PER_BU)) {
    for (let k = 0; k < EMP_PER_BU[bu]; k++, i++) {
      const band = COST_BANDS[(i + k) % 4]
      const alloc = [100, 100, 80, 100, 50, 100, 60, 100, 100, 30][i % 10]
      const roles = EMP_ROLES[bu] ?? ['Analyst']
      out.push({
        id: `emp-${String(i + 1).padStart(3, '0')}`, name: `${FIRST[i % FIRST.length]} ${LAST[(i * 5) % LAST.length]}`, role: roles[k % roles.length], businessUnit: bu,
        location: DEFAULT_LOCATION, grade: GRADES[(i + 1) % 5], allocationPct: alloc, costBand: band, annualCostL: BAND_COST[band],
        startDate: addDays('2026-01-12', (i * 9) % 270),
      })
    }
  }
  return out
}
export const seedEmployees: Employee[] = buildEmployees()

/* ---------- Candidates: a deterministic pipeline for every requisition ---------- */
/** mulberry32 – small seeded PRNG so the demo data is identical on every load. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const APPLICANTS: Record<Priority, [number, number]> = { Critical: [28, 40], High: [20, 30], Medium: [12, 20], Low: [8, 12] }
/** probability of passing from stage i to i+1 */
const PASS = [0.55, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9]
/** furthest stage any candidate can have reached, by requisition status */
const MAX_STAGE: Record<PositionStatus, number> = { Open: 2, 'In Interview': 4, Offer: 6, Joined: 7, 'On Hold': 1 }

export function buildCandidates(positions: Position[]): Candidate[] {
  const out: Candidate[] = []
  positions.forEach((p, pi) => {
    const r = rng(1000 + pi * 7919)
    const [lo, hi] = APPLICANTS[p.priority]
    const n = p.status === 'On Hold' ? 4 : lo + Math.floor(r() * (hi - lo + 1))
    const maxStage = MAX_STAGE[p.status]
    const daysOpen = positionDaysOpen(p)
    let offerGiven = false
    for (let k = 0; k < n; k++) {
      let s = 0
      let status: CandidateStatus = 'In process'
      // walk the funnel: pass, drop, or wait (still in process) at each stage
      while (s < maxStage) {
        const roll = r()
        if (roll < PASS[s]) { s++; continue }
        if (roll < PASS[s] + 0.14) break // pending at this stage
        status = r() < 0.8 ? 'Rejected' : 'Withdrawn'
        break
      }
      // interviewed at the requisition's current round and not taken forward
      if (status === 'In process' && s === maxStage && s >= 2 && s <= 4 && r() < 0.4) status = r() < 0.85 ? 'Rejected' : 'Withdrawn'
      const stage = CANDIDATE_STAGES[s]
      if (status === 'In process') {
        if (stage === 'Joined') status = 'Joined'
        else if (stage === 'Offer' || stage === 'Accepted') { if (offerGiven && p.status === 'Offer') { s = 4; status = 'In process' } else { status = 'Offer'; offerGiven = true } }
      }
      const finalStage = CANDIDATE_STAGES[s]
      const ageDays = Math.floor(r() * Math.max(1, Math.min(daysOpen, 14)))
      const lastActivity = addDays(TODAY, -ageDays)
      const rounds = status === 'Rejected' || status === 'Withdrawn' ? Math.max(0, Math.min(3, s - 1)) : s >= 5 ? 3 : roundsForStage(finalStage)
      const nextDate = addDays(TODAY, 1 + Math.floor(r() * 9))
      const nextStep = status === 'Rejected' ? 'Regret mail sent' : status === 'Withdrawn' ? 'Candidate withdrew' : status === 'Joined' ? 'Onboarded' : s >= 2 && s <= 4 ? `${NEXT_STEP[finalStage]} · ${nextDate}` : NEXT_STEP[finalStage]
      const name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`
      out.push({ id: `cand-${p.id.slice(4)}-${String(k + 1).padStart(2, '0')}`, positionId: p.id, name, source: CANDIDATE_SOURCES[Math.floor(r() * CANDIDATE_SOURCES.length)], stage: finalStage, status, roundsCompleted: rounds, lastActivity, nextStep, notes: '' })
    }
    // a filled requisition has exactly one joiner; other offer-stage candidates declined
    if (p.status === 'Joined') {
      const mine = out.filter((x) => x.positionId === p.id).sort((a, b) => stageIndex(b.stage) - stageIndex(a.stage))
      mine.forEach((c, idx) => {
        if (idx === 0) { c.stage = 'Joined'; c.status = 'Joined'; c.roundsCompleted = 3; c.nextStep = 'Onboarded' }
        else if (c.status === 'Joined' || c.status === 'Offer') { c.stage = 'Offer'; c.status = 'Withdrawn'; c.roundsCompleted = 3; c.nextStep = 'Declined offer' }
      })
    }
  })
  return out
}
export const seedCandidates: Candidate[] = buildCandidates(seedPositions)
