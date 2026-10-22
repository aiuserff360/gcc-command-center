// Resource Management – types, constants and seed data, aligned to the ENGIE IT GCC model (src/data/businessUnits.ts):
//   business unit (IT domain) → capability (sub-unit) → positions / people / actuals.
// The headcount PLAN is owned by the organisation structure (sub-unit ramps: month-wise for year 1, annual for years 2–5);
// this module owns the ACTUALS (per capability and month), the requisitions with their candidate pipelines, the allocation
// sample, skills, people cost, time to hire and attrition. The GCC is Pune-only for now.
import { OWNERS, TODAY, CHART_COLORS } from './common'
import { seedBusinessUnits, seedSubUnits, RAMP_MONTHS, RAMP_START, buShortName, type SubUnit } from './businessUnits'

/* ---------- Business units / capabilities on this page ---------- */
export const buShort = (name: string) => buShortName(name)
/** Two-line labels for narrow chart axes ("\n" = line break, see WrapTick). */
export const BU_AXIS: Record<string, string> = {
  'Infrastructure & Cloud': 'Infra &\nCloud', 'Digital Workplace': 'Digital\nWorkplace', 'Cybersecurity & IAM': 'Cyber &\nIAM', 'Enterprise Applications': 'Enterprise\nApps',
  'Data, Analytics & AI': 'Data &\nAI', 'Integration & Engineering': 'Integration\n& Eng.', 'IT Service Management': 'ITSM',
}
export const buAxis = (name: string) => BU_AXIS[name] ?? buShort(name)
/** Resolve any stored name to a business unit from the live list (unknown names kept so nothing is silently dropped). */
export const normalizeBu = (name: string | undefined, live: readonly string[]) => (name && live.includes(name) ? name : name || live[0] || '')
/** Where a requisition's work comes from, in the slide's wording: "Transition from France", "Build (new capability)". */
export const sourceLabel = (s?: Pick<SubUnit, 'transitionType' | 'deliveryLocation'> | null) =>
  !s ? '—' : s.transitionType === 'Build' ? 'Build (new capability)' : s.transitionType === 'Transition' ? `Transition from ${s.deliveryLocation}` : `Build / transition from ${s.deliveryLocation}`

/** Suggested locations when a second site is added later; the GCC is Pune-only today. */
export const RES_LOCATIONS = ['Pune', 'Bengaluru', 'Hyderabad', 'Chennai'] as const
export const DEFAULT_LOCATION = RES_LOCATIONS[0]
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const
export type Priority = (typeof PRIORITIES)[number]
export const POSITION_STATUSES = ['Open', 'In Interview', 'Offer', 'Joined', 'On Hold'] as const
export type PositionStatus = (typeof POSITION_STATUSES)[number]
export const GRADES = ['L1', 'L2', 'L3', 'L4', 'L5'] as const
export const COST_BANDS = ['Band A', 'Band B', 'Band C', 'Band D'] as const
/** Year selector for every headcount view: month-wise for the first year, annual bars for years 2–5. */
export const HC_VIEWS = ['Year 1 month-wise', 'Years 2–5 annual'] as const
export type HcView = (typeof HC_VIEWS)[number]
export const OUT_YEARS = ['Year 2', 'Year 3', 'Year 4', 'Year 5'] as const

/* ---------- Date helpers (local, no TZ shift) ---------- */
const pad = (n: number) => String(n).padStart(2, '0')
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const daysBetween = (from: string, to = TODAY) => Math.max(0, Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000))
/** Ramp month index (0 = Nov 26) of an ISO date, clamped to the first year. */
export const rampIndexOf = (iso: string) => {
  const [y, m] = iso.split('-').map(Number)
  const [sy, sm] = RAMP_START.split('-').map(Number)
  return Math.max(0, Math.min(RAMP_MONTHS.length - 1, (y - sy) * 12 + (m - sm)))
}
/** First day of a ramp month: 0 → 2026-11-01. */
export const rampMonthStart = (i: number) => {
  const [sy, sm] = RAMP_START.split('-').map(Number)
  const total = sy * 12 + (sm - 1) + i
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`
}
/** Reporting month = the ramp month that contains TODAY (Feb 27 → index 3). */
export const REPORTING_IDX = rampIndexOf(TODAY)
export const REPORTING_MONTH = RAMP_MONTHS[REPORTING_IDX]

/* ---------- Types ---------- */
export interface Position {
  id: string; role: string; businessUnit: string; capability: string; location: string; priority: Priority; status: PositionStatus
  openedOn: string; targetDate: string; hiringManager: string; grade: string; notes?: string
}
export const isOpenPosition = (p: Position) => p.status === 'Open' || p.status === 'In Interview' || p.status === 'Offer'
export const isInHiring = (p: Position) => p.status === 'In Interview' || p.status === 'Offer'
export const isCriticalPosition = (p: Position) => p.priority === 'Critical' || p.priority === 'High'
export const positionDaysOpen = (p: Position) => daysBetween(p.openedOn)
export const reqId = (p: Position) => p.id.toUpperCase().replace('POS-', 'REQ-')

/** Cumulative Pune headcount actually onboarded per capability, per month of year 1 (null = not reported yet). */
export interface CapabilityActuals { id: string; businessUnit: string; capability: string; actuals: (number | null)[] }
/** Derived headcount row (per capability, rolled up to the business unit). */
export interface CapHeadcount { id: string; businessUnit: string; capability: string; onboarded: number; inHiring: number; open: number; plan: number; target: number }
export interface BuHeadcount { id: string; businessUnit: string; onboarded: number; inHiring: number; open: number; plan: number; target: number; capabilities: CapHeadcount[] }
export interface FunnelStage { id: string; stage: string; candidates: number }
export interface SkillRow { id: string; category: string; required: number; available: number; owner: string }
export interface TrainingPlan { id: string; program: string; skill: string; participants: number; startDate: string; endDate: string; status: 'Planned' | 'In Progress' | 'Completed'; owner: string }
export interface Employee { id: string; name: string; role: string; businessUnit: string; capability: string; location: string; grade: string; allocationPct: number; costBand: string; annualCostL: number; startDate: string }
export interface PeopleCostRow { id: string; businessUnit: string; budgetCr: number; actualCr: number }
export interface LocationRow { id: string; name: string; ftes: number; seats: number; costIndex: number; color: string; office: string }
export interface TimeToHireRow { id: string; businessUnit: string; actual: number; target: number }
export interface AttritionMonth { id: string; month: string; ratePct: number; benchmarkPct: number; exits: number; regretted: number }
export interface ExitRecord { id: string; name: string; role: string; businessUnit: string; capability: string; location: string; exitDate: string; reason: string; regretted: boolean; tenureMonths: number }
export interface RetentionAction { id: string; action: string; segment: string; owner: string; dueDate: string; status: 'Planned' | 'In Progress' | 'Completed'; impact: 'High' | 'Medium' | 'Low' }
export interface ResourceSettings {
  id: string; schema: string; fteTarget: number; avgTimeToHireMonths: number; timeToHireTargetMonths: number; seatRatio: number
  /** reporting month – one of RAMP_MONTHS; the FTEs Onboarded KPI reads this month's actuals */
  currentMonth: string
  /** forecast scenarios for the annual view: accelerated = plan × (1 + %), conservative = plan × (1 − %) */
  acceleratedPct: number; conservativePct: number
}
/** Bumped whenever the seed model changes; persisted data from an older schema is re-seeded (string: program variants scale numbers). */
export const RESOURCE_SCHEMA = 'engie-v3'

/* ---------- Candidates (application pipeline per requisition) ---------- */
export const CANDIDATE_STAGES = ['Applied', 'Screened', 'Round 1 technical', 'Round 2 technical / case', 'HR round', 'Offer', 'Accepted', 'Joined'] as const
export type CandidateStage = (typeof CANDIDATE_STAGES)[number]
export const CANDIDATE_STATUSES = ['In process', 'Offer', 'Rejected', 'Withdrawn', 'Joined'] as const
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number]
export const CANDIDATE_SOURCES = ['LinkedIn', 'Naukri', 'Referral', 'Agency', 'Campus', 'Careers site', 'Internal', 'ENGIE transfer'] as const
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
  { id: 'res-settings', schema: RESOURCE_SCHEMA, fteTarget: 400, avgTimeToHireMonths: 1.5, timeToHireTargetMonths: 1.2, seatRatio: 1.1, currentMonth: REPORTING_MONTH, acceleratedPct: 8, conservativePct: 10 },
]

const SUBS = seedSubUnits
const BU = seedBusinessUnits
const buName = (buId: string) => BU.find((b) => b.id === buId)?.name ?? buId
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/**
 * Actual onboarded headcount per capability at the reporting month (Feb 27): plan 285, actual 268.
 * The shortfall sits where transitions lag – SAP (France), cloud / network (Europe), workplace and IAM.
 */
const DEFICIT_AT_REPORTING: Record<string, number> = {
  'su-cloud-ops': 2, 'su-network': 2, 'su-euc': 2, 'su-wp-support': 1, 'su-iam': 1, 'su-secops': 1, 'su-sap': 5, 'su-bizapps': 1, 'su-dataeng': 1, 'su-svcmgmt': 1,
} // 17
/** Actual cumulative headcount per month up to the reporting month: the plan minus a shortfall that grows into the reporting month. */
export function buildCapabilityActuals(subs: SubUnit[] = SUBS, reportingIdx = REPORTING_IDX): CapabilityActuals[] {
  return subs.map((s) => {
    const deficit = DEFICIT_AT_REPORTING[s.id] ?? 0
    const actuals: (number | null)[] = RAMP_MONTHS.map((_, i) => {
      if (i > reportingIdx) return null
      const plan = s.ramp[i] ?? 0
      const cut = Math.round((deficit * (i + 1)) / (reportingIdx + 1))
      return Math.max(0, plan - cut)
    })
    // actuals are cumulative – never let a month fall below the previous one
    for (let i = 1; i <= reportingIdx; i++) if ((actuals[i] ?? 0) < (actuals[i - 1] ?? 0)) actuals[i] = actuals[i - 1]
    return { id: `ca-${s.id}`, businessUnit: buName(s.businessUnitId), capability: s.name, actuals }
  })
}
export const seedCapabilityActuals: CapabilityActuals[] = buildCapabilityActuals()
const actualAt = (subId: string) => seedCapabilityActuals.find((a) => a.id === `ca-${subId}`)?.actuals[REPORTING_IDX] ?? 0

export const FUNNEL_COLORS = [CHART_COLORS.blue, CHART_COLORS.blueLight, CHART_COLORS.teal, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.orange, CHART_COLORS.violet, CHART_COLORS.navy]

export const seedTimeToHire: TimeToHireRow[] = [
  { id: 'tth-infra', businessUnit: 'Infrastructure & Cloud', actual: 38, target: 30 },
  { id: 'tth-dwp', businessUnit: 'Digital Workplace', actual: 29, target: 30 },
  { id: 'tth-cyber', businessUnit: 'Cybersecurity & IAM', actual: 48, target: 35 },
  { id: 'tth-apps', businessUnit: 'Enterprise Applications', actual: 54, target: 35 },
  { id: 'tth-data', businessUnit: 'Data, Analytics & AI', actual: 46, target: 35 },
  { id: 'tth-eng', businessUnit: 'Integration & Engineering', actual: 36, target: 30 },
  { id: 'tth-itsm', businessUnit: 'IT Service Management', actual: 27, target: 25 },
]

/** Single location today: Pune hosts all 268 onboarded FTEs. A second site can be added from the Location Mix tab. */
export const seedLocationMix: LocationRow[] = [
  { id: 'loc-pune', name: 'Pune', ftes: 268, seats: 440, costIndex: 1.0, color: CHART_COLORS.blue, office: 'EON Free Zone, Kharadi – Tower 4' },
]
export const LOCATION_COLORS = [CHART_COLORS.blue, CHART_COLORS.blueLight, CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.violet]

/** Required = year-1 target of the capabilities needing the skill; available = onboarded today. */
export const seedSkills: SkillRow[] = [
  { id: 'sk-cloud', category: 'Cloud operations (Azure / AWS)', required: 52, available: 39, owner: 'R. Mehta' },
  { id: 'sk-network', category: 'Network & SD-WAN', required: 44, available: 33, owner: 'R. Mehta' },
  { id: 'sk-sap', category: 'SAP S/4HANA functional / technical', required: 71, available: 44, owner: 'V. Reddy' },
  { id: 'sk-appsupport', category: 'Application support (Americas GBUs)', required: 36, available: 24, owner: 'V. Reddy' },
  { id: 'sk-iam', category: 'Identity & access (SailPoint, PAM)', required: 20, available: 15, owner: 'P. Rao' },
  { id: 'sk-secops', category: 'Security operations (SOC, vulnerability)', required: 16, available: 10, owner: 'P. Rao' },
  { id: 'sk-data', category: 'Data engineering (Databricks / Snowflake)', required: 41, available: 29, owner: 'S. Iyer' },
  { id: 'sk-ai', category: 'BI, AI & automation', required: 12, available: 8, owner: 'S. Iyer' },
  { id: 'sk-workplace', category: 'Digital workplace (M365 / Intune)', required: 40, available: 22, owner: 'K. Nair' },
  { id: 'sk-itsm', category: 'ITSM / ServiceNow', required: 31, available: 21, owner: 'D. Singh' },
  { id: 'sk-integration', category: 'Integration, DevOps & engineering', required: 26, available: 15, owner: 'M. Khan' },
]

export const seedTrainingPlans: TrainingPlan[] = [
  { id: 'tp-1', program: 'SAP S/4HANA knowledge-transfer academy (France → Pune)', skill: 'SAP S/4HANA functional / technical', participants: 26, startDate: '2027-01-11', endDate: '2027-04-02', status: 'In Progress', owner: 'V. Reddy' },
  { id: 'tp-2', program: 'Azure / AWS cloud operations certification track', skill: 'Cloud operations (Azure / AWS)', participants: 22, startDate: '2026-12-07', endDate: '2027-02-26', status: 'In Progress', owner: 'R. Mehta' },
  { id: 'tp-3', program: 'SailPoint IdentityNow & CyberArk PAM certification', skill: 'Identity & access (SailPoint, PAM)', participants: 10, startDate: '2027-03-01', endDate: '2027-04-23', status: 'Planned', owner: 'P. Rao' },
  { id: 'tp-4', program: 'Databricks & Snowflake data engineering bootcamp', skill: 'Data engineering (Databricks / Snowflake)', participants: 16, startDate: '2027-02-08', endDate: '2027-04-09', status: 'In Progress', owner: 'S. Iyer' },
  { id: 'tp-5', program: 'ServiceNow ITSM fundamentals & ITIL 4', skill: 'ITSM / ServiceNow', participants: 18, startDate: '2027-03-15', endDate: '2027-05-07', status: 'Planned', owner: 'D. Singh' },
  { id: 'tp-6', program: 'ENGIE business induction – GBUs, geographies, energy value chain', skill: 'Application support (Americas GBUs)', participants: 120, startDate: '2026-11-09', endDate: '2027-01-29', status: 'Completed', owner: 'K. Nair' },
  { id: 'tp-7', program: 'M365 / Intune modern workplace programme', skill: 'Digital workplace (M365 / Intune)', participants: 14, startDate: '2027-01-18', endDate: '2027-03-12', status: 'In Progress', owner: 'K. Nair' },
]

/** Annual people cost per business unit in ₹ Cr: budget = year-1 target × blended cost, run-rate = onboarded × blended cost. */
export const seedPeopleCost: PeopleCostRow[] = [
  { id: 'pc-infra', businessUnit: 'Infrastructure & Cloud', budgetCr: 18.2, actualCr: 13.6 },
  { id: 'pc-dwp', businessUnit: 'Digital Workplace', budgetCr: 4.4, actualCr: 2.4 },
  { id: 'pc-cyber', businessUnit: 'Cybersecurity & IAM', budgetCr: 7.2, actualCr: 5.0 },
  { id: 'pc-apps', businessUnit: 'Enterprise Applications', budgetCr: 22.5, actualCr: 14.3 },
  { id: 'pc-data', businessUnit: 'Data, Analytics & AI', budgetCr: 11.7, actualCr: 8.1 },
  { id: 'pc-eng', businessUnit: 'Integration & Engineering', budgetCr: 4.9, actualCr: 2.9 },
  { id: 'pc-itsm', businessUnit: 'IT Service Management', budgetCr: 4.3, actualCr: 2.9 },
]

/** Annualised attrition since the ramp started (Nov 26); benchmark = Pune IT GCC market. */
const ATTR_RATE = [0, 1.8, 3.6, 5.1]
const ATTR_EXITS = [0, 1, 2, 3]
const ATTR_REGRET = [0, 1, 1, 2]
export const seedAttrition: AttritionMonth[] = RAMP_MONTHS.slice(0, REPORTING_IDX + 1).map((m, i) => ({ id: `at-${slug(m)}`, month: m, ratePct: ATTR_RATE[i] ?? 0, benchmarkPct: 12, exits: ATTR_EXITS[i] ?? 0, regretted: ATTR_REGRET[i] ?? 0 }))

export const EXIT_REASONS = ['Better compensation', 'Career growth', 'Relocation', 'Higher studies', 'Personal reasons', 'Performance', 'Role mismatch'] as const
export const seedExits: ExitRecord[] = [
  { id: 'ex-1', name: 'Rohit Kulkarni', role: 'Data Engineer (Databricks)', businessUnit: 'Data, Analytics & AI', capability: 'Data Engineering', location: 'Pune', exitDate: '2027-02-12', reason: 'Better compensation', regretted: true, tenureMonths: 3 },
  { id: 'ex-2', name: 'Shreya Menon', role: 'Cloud Engineer (Azure)', businessUnit: 'Infrastructure & Cloud', capability: 'Cloud Operations', location: 'Pune', exitDate: '2027-02-05', reason: 'Career growth', regretted: true, tenureMonths: 3 },
  { id: 'ex-3', name: 'Imran Shaikh', role: 'SAP Basis Administrator', businessUnit: 'Enterprise Applications', capability: 'SAP / ERP', location: 'Pune', exitDate: '2027-01-29', reason: 'Relocation', regretted: false, tenureMonths: 2 },
  { id: 'ex-4', name: 'Pallavi Joshi', role: 'Network Engineer', businessUnit: 'Infrastructure & Cloud', capability: 'Network', location: 'Pune', exitDate: '2027-01-15', reason: 'Role mismatch', regretted: false, tenureMonths: 2 },
  { id: 'ex-5', name: 'Karthik Raman', role: 'IAM Specialist', businessUnit: 'Cybersecurity & IAM', capability: 'Identity & Access', location: 'Pune', exitDate: '2027-01-08', reason: 'Better compensation', regretted: true, tenureMonths: 2 },
  { id: 'ex-6', name: 'Neha Agarwal', role: 'Service Manager', businessUnit: 'IT Service Management', capability: 'Service Management', location: 'Pune', exitDate: '2026-12-18', reason: 'Personal reasons', regretted: false, tenureMonths: 1 },
]

export const seedRetentionActions: RetentionAction[] = [
  { id: 'ra-1', action: 'Market correction for SAP, cloud and IAM specialists (critical transition skills)', segment: 'Critical skills (L3–L4)', owner: 'V. Reddy', dueDate: '2027-03-15', status: 'In Progress', impact: 'High' },
  { id: 'ra-2', action: 'ENGIE IT GCC career-path framework and promotion calendar', segment: 'All employees', owner: 'A. Sharma', dueDate: '2027-04-01', status: 'Planned', impact: 'High' },
  { id: 'ra-3', action: 'Stay interviews for the Wave 1 transition cohort (Infra, Cyber)', segment: 'Wave 1 joiners', owner: 'P. Rao', dueDate: '2027-02-28', status: 'In Progress', impact: 'Medium' },
  { id: 'ra-4', action: 'Retention bonus for knowledge-transfer leads completing 18 months', segment: 'KT leads (France, USA, Europe)', owner: 'D. Singh', dueDate: '2027-05-31', status: 'Planned', impact: 'Medium' },
  { id: 'ra-5', action: 'First-time manager programme for capability leads', segment: 'Capability leads', owner: 'M. Khan', dueDate: '2027-01-30', status: 'Completed', impact: 'Medium' },
]

/* ---------- Roles per capability (slide "Role / Skill" plus realistic variants) ---------- */
export const ROLE_POOL: Record<string, string[]> = {
  'Cloud Operations': ['Cloud Engineer (Azure)', 'Cloud Engineer (AWS)', 'Senior Cloud Engineer', 'Cloud Operations Lead', 'FinOps Analyst'],
  Network: ['Network Engineer', 'Senior Network Engineer', 'SD-WAN Engineer', 'Network Security Engineer'],
  'Hosting / Data Centre': ['Hosting Engineer', 'VMware Administrator', 'Storage & Backup Engineer'],
  'Infrastructure Operations': ['Infrastructure Analyst', 'Linux Administrator', 'Windows Server Administrator'],
  'End User Computing': ['Workplace Engineer', 'Intune / M365 Engineer', 'Senior Workplace Engineer', 'EUC Lead'],
  'Service Desk': ['Service Desk Analyst', 'Service Desk Team Lead'],
  Collaboration: ['Collaboration Engineer (Teams)', 'M365 Collaboration Specialist'],
  'Workplace Support': ['Workplace Support Analyst', 'Deskside Support Engineer'],
  'Identity & Access': ['IAM Specialist', 'IAM Engineer (SailPoint)', 'PAM Engineer (CyberArk)', 'Senior IAM Specialist'],
  'Security Operations': ['SOC Analyst L1', 'SOC Analyst L2', 'Threat Detection Engineer'],
  'Vulnerability Management': ['Vulnerability Analyst', 'Vulnerability Management Lead'],
  'Security Engineering': ['Security Engineer', 'Cloud Security Engineer'],
  'SAP / ERP': ['SAP FI/CO Functional Consultant', 'SAP MM Functional Consultant', 'SAP SD Functional Consultant', 'SAP ABAP Developer', 'SAP Basis Administrator', 'SAP PM Functional Consultant', 'SAP Integration (PI/PO) Developer', 'S/4HANA Solution Architect'],
  'Business Applications': ['App Support Engineer', 'Senior App Support Engineer', 'Application Support Lead', 'Salesforce Support Engineer', 'ETRM Application Analyst'],
  'Finance Applications': ['Finance Application Analyst'],
  'HR Applications': ['HR Application Analyst (SuccessFactors)'],
  'Data Engineering': ['Data Engineer', 'Senior Data Engineer', 'Data Engineer (Databricks)', 'Data Engineering Lead'],
  'Data Platforms': ['Data Platform Engineer', 'Snowflake Platform Engineer'],
  'BI / Analytics': ['BI Developer (Power BI)', 'Analytics Engineer'],
  'AI / Automation': ['AI / Automation Engineer', 'GenAI Engineer', 'RPA Developer'],
  'API / Integration': ['Integration Engineer', 'API Developer (MuleSoft)', 'Senior Integration Engineer'],
  DevOps: ['DevOps Engineer', 'Platform Engineer (Kubernetes)', 'CI/CD Engineer'],
  'Application Engineering': ['Application Engineer', 'Full-stack Engineer'],
  Testing: ['Test Engineer', 'Test Automation Engineer'],
  'Service Management': ['Service Manager', 'Service Delivery Manager', 'Senior Service Manager', 'Service Level Manager'],
  'Incident / Problem': ['Incident Manager', 'Problem Manager', 'Major Incident Manager'],
  'Change / Release': ['Change Manager', 'Release Manager'],
  'IT Asset / Configuration': ['IT Asset Analyst', 'CMDB Analyst'],
}
/** "Cloud Engineers" → "Cloud Engineer" for capabilities added later in GCC Setup. */
const singular = (roleSkill: string) => roleSkill.replace(/s$/, '').replace(/ \/ /g, ' / ')
export const rolesFor = (cap: string, roleSkill = '') => ROLE_POOL[cap] ?? (roleSkill ? [singular(roleSkill)] : ['Analyst'])
const roleFor = (s: SubUnit, k: number) => { const pool = rolesFor(s.name, s.roleSkill); return pool[k % pool.length] }

/* ---------- Positions: one requisition per head still to hire to reach the year-1 target (400 − 268 = 132 open) ---------- */
function buildPositions(): Position[] {
  const mk = (i: number, role: string, s: SubUnit, pr: Priority, days: number, status: PositionStatus): Position => {
    const openedOn = addDays(TODAY, -days)
    return { id: `pos-${String(i + 1).padStart(3, '0')}`, role, businessUnit: buName(s.businessUnitId), capability: s.name, location: DEFAULT_LOCATION, priority: pr, status, openedOn, targetDate: addDays(openedOn, 45 + (i % 3) * 15), hiringManager: OWNERS[i % OWNERS.length], grade: GRADES[1 + (i % 4)] }
  }
  // remaining to hire per capability, interleaved so the register is not grouped by capability
  const queue: { s: SubUnit; k: number }[] = []
  const remaining = SUBS.map((s) => ({ s, n: Math.max(0, s.targetHc - actualAt(s.id)), k: 0 }))
  let left = remaining.reduce((t, r) => t + r.n, 0) // 132
  while (left > 0) for (const r of remaining) if (r.k < r.n) { queue.push({ s: r.s, k: r.k++ }); left-- }
  const statuses: PositionStatus[] = ['Open', 'In Interview', 'Open', 'Offer', 'In Interview', 'Open', 'Open', 'In Interview', 'Open', 'In Interview', 'Open'] // 6 open · 4 interview · 1 offer per cycle → 72 open, 60 in hiring
  const hot: Priority[] = ['Critical', 'High', 'Medium', 'Medium', 'High', 'Medium', 'Low', 'Medium', 'Critical', 'Medium']
  const cool: Priority[] = ['Medium', 'Low', 'Medium', 'High', 'Medium', 'Low']
  const list = queue.map((q, j) => {
    const scarce = q.s.transitionType === 'Transition' || q.s.name === 'Identity & Access' || q.s.name === 'Data Engineering'
    const pr = scarce ? hot[(j + q.k) % hot.length] : cool[(j + q.k) % cool.length]
    const days = 4 + ((j * 7 + q.k * 3) % 38)
    return mk(j, roleFor(q.s, q.k), q.s, pr, days, statuses[j % statuses.length])
  })
  const sub = (id: string) => SUBS.find((s) => s.id === id)!
  // filled this cycle (Joined) and parked requisitions
  const n = list.length
  list.push(mk(n, 'S/4HANA Solution Architect', sub('su-sap'), 'Critical', 74, 'Joined'))
  list.push(mk(n + 1, 'Cloud Operations Lead', sub('su-cloud-ops'), 'Critical', 70, 'Joined'))
  list.push(mk(n + 2, 'Data Engineering Lead', sub('su-dataeng'), 'High', 66, 'Joined'))
  list.push(mk(n + 3, 'Senior IAM Specialist', sub('su-iam'), 'High', 62, 'Joined'))
  list.push(mk(n + 4, 'Network Security Engineer', sub('su-network'), 'High', 58, 'Joined'))
  list.push(mk(n + 5, 'Application Support Lead', sub('su-bizapps'), 'High', 60, 'Joined'))
  list.push(mk(n + 6, 'Service Delivery Manager', sub('su-svcmgmt'), 'Medium', 52, 'Joined'))
  list.push(mk(n + 7, 'EUC Lead', sub('su-euc'), 'Medium', 50, 'Joined'))
  list.push(mk(n + 8, 'Finance Application Analyst', sub('su-finapps'), 'Low', 30, 'On Hold'))
  list.push(mk(n + 9, 'HR Application Analyst (SuccessFactors)', sub('su-hrapps'), 'Low', 20, 'On Hold'))
  return list
}
export const seedPositions: Position[] = buildPositions()

/* ---------- Employees (sample of onboarded FTEs for allocation, ~15% of each capability) ---------- */
const FIRST = ['Aarav', 'Diya', 'Ishaan', 'Meera', 'Kabir', 'Sanya', 'Arjun', 'Nisha', 'Rahul', 'Priya', 'Varun', 'Tanvi', 'Siddharth', 'Kavya', 'Aditya', 'Riya', 'Nikhil', 'Pooja', 'Manish', 'Sneha', 'Harsh', 'Lakshmi', 'Dev', 'Anjali', 'Yash', 'Swati', 'Rajat', 'Gayatri', 'Omkar', 'Bhavna', 'Tarun', 'Deepa', 'Sameer', 'Ritika', 'Gaurav', 'Madhuri', 'Ankit', 'Shruti', 'Rohan', 'Ira', 'Vivek', 'Mitali', 'Pranav', 'Aisha', 'Kunal', 'Nandini']
const LAST = ['Sharma', 'Nair', 'Patel', 'Reddy', 'Iyer', 'Khan', 'Desai', 'Menon', 'Gupta', 'Rao', 'Verma', 'Bhat', 'Chowdhury', 'Joshi', 'Singh', 'Pillai', 'Mishra', 'Kapoor', 'Kulkarni', 'Deshpande', 'Jadhav', 'Shinde', 'Sawant', 'Ghosh', 'Banerjee', 'Shah']
const BAND_COST: Record<string, number> = { 'Band A': 9, 'Band B': 15, 'Band C': 24, 'Band D': 36 } // ₹ Lakh per annum
function buildEmployees(): Employee[] {
  const out: Employee[] = []
  let i = 0
  for (const s of SUBS) {
    const onboarded = actualAt(s.id)
    const n = onboarded ? Math.max(1, Math.round(onboarded * 0.15)) : 0
    const actuals = seedCapabilityActuals.find((a) => a.id === `ca-${s.id}`)?.actuals ?? []
    const firstIdx = Math.max(0, actuals.findIndex((v) => (v ?? 0) > 0))
    const roles = rolesFor(s.name, s.roleSkill)
    for (let k = 0; k < n; k++, i++) {
      const band = COST_BANDS[(i + k) % 4]
      const alloc = [100, 100, 80, 100, 50, 100, 60, 100, 100, 30][i % 10]
      let startDate = addDays(rampMonthStart(firstIdx), (i * 11 + k * 5) % 45)
      if (startDate > TODAY) startDate = addDays(TODAY, -(i % 20) - 1)
      out.push({
        id: `emp-${String(i + 1).padStart(3, '0')}`, name: `${FIRST[i % FIRST.length]} ${LAST[(i * 5) % LAST.length]}`, role: roles[k % roles.length], businessUnit: buName(s.businessUnitId), capability: s.name,
        location: DEFAULT_LOCATION, grade: GRADES[(i + 1) % 5], allocationPct: alloc, costBand: band, annualCostL: BAND_COST[band], startDate,
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
const APPLICANTS: Record<Priority, [number, number]> = { Critical: [18, 26], High: [14, 20], Medium: [9, 14], Low: [6, 10] }
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
