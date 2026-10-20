// Resource Management – types, constants and seed data. Wording mirrors mockups/05-resource-management.jpeg.
import { OWNERS, TODAY, MONTHS, CHART_COLORS } from './common'

/* ---------- Functions (workstreams used on this page) ---------- */
export const FUNCTIONS = [
  'Engineering & Product',
  'Data & Analytics',
  'IT & Infrastructure',
  'Finance & Accounting',
  'HR & People Services',
  'Procurement & Supply Chain',
  'Other / Central',
] as const
export type Fn = (typeof FUNCTIONS)[number]
/** Short names used in compact tables / chart axes (as in the mock-up). */
export const FN_SHORT: Record<Fn, string> = {
  'Engineering & Product': 'Engineering',
  'Data & Analytics': 'Data & Analytics',
  'IT & Infrastructure': 'IT & Infra',
  'Finance & Accounting': 'Finance',
  'HR & People Services': 'HR',
  'Procurement & Supply Chain': 'Procurement',
  'Other / Central': 'Other',
}
export const fnShort = (f: string) => FN_SHORT[f as Fn] ?? f

export const RES_LOCATIONS = ['Bengaluru', 'Hyderabad', 'Pune', 'Chennai'] as const
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const
export type Priority = (typeof PRIORITIES)[number]
export const POSITION_STATUSES = ['Open', 'In Interview', 'Offer', 'Joined', 'On Hold'] as const
export type PositionStatus = (typeof POSITION_STATUSES)[number]
export const GRADES = ['L1', 'L2', 'L3', 'L4', 'L5'] as const
export const COST_BANDS = ['Band A', 'Band B', 'Band C', 'Band D'] as const
export const VIEW_BY = ['FTE Headcount', 'Cost', 'Seats'] as const
export type ViewBy = (typeof VIEW_BY)[number]

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
  id: string; role: string; workstream: Fn | string; location: string; priority: Priority; status: PositionStatus
  openedOn: string; targetDate: string; hiringManager: string; grade: string; notes?: string
}
export const isOpenPosition = (p: Position) => p.status === 'Open' || p.status === 'In Interview' || p.status === 'Offer'
export const isCriticalPosition = (p: Position) => p.priority === 'Critical' || p.priority === 'High'
export const positionDaysOpen = (p: Position) => daysBetween(p.openedOn)

export interface HeadcountMonth { id: string; month: string; planned: number; actual: number; target: number; plannedUtil: number; actualUtil: number }
export interface WorkstreamHeadcount { id: string; workstream: Fn | string; onboarded: number; inHiring: number; open: number }
export interface FunnelStage { id: string; stage: string; candidates: number }
export interface HiringTarget { id: string; workstream: Fn | string; targets: number[] /* Jan..Dec */ }
export interface SkillRow { id: string; category: string; required: number; available: number; owner: string }
export interface TrainingPlan { id: string; program: string; skill: string; participants: number; startDate: string; endDate: string; status: 'Planned' | 'In Progress' | 'Completed'; owner: string }
export interface Employee { id: string; name: string; role: string; workstream: Fn | string; location: string; grade: string; allocationPct: number; costBand: string; annualCostL: number; startDate: string }
export interface PeopleCostRow { id: string; workstream: Fn | string; budgetCr: number; actualCr: number }
export interface LocationRow { id: string; name: string; ftes: number; seats: number; costIndex: number; color: string; office: string }
export interface ForecastQuarter { id: string; quarter: string; base: number; accelerated: number; conservative: number }
export interface TimeToHireRow { id: string; workstream: Fn | string; actual: number; target: number }
export interface AttritionMonth { id: string; month: string; ratePct: number; benchmarkPct: number; exits: number; regretted: number }
export interface ExitRecord { id: string; name: string; role: string; workstream: Fn | string; location: string; exitDate: string; reason: string; regretted: boolean; tenureMonths: number }
export interface RetentionAction { id: string; action: string; segment: string; owner: string; dueDate: string; status: 'Planned' | 'In Progress' | 'Completed'; impact: 'High' | 'Medium' | 'Low' }
export interface ResourceSettings { id: string; fteTarget: number; avgTimeToHireMonths: number; timeToHireTargetMonths: number; seatRatio: number; currentMonth: string }

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

export const seedWorkstreamHeadcount: WorkstreamHeadcount[] = [
  { id: 'wh-eng', workstream: 'Engineering & Product', onboarded: 85, inHiring: 20, open: 25 },
  { id: 'wh-data', workstream: 'Data & Analytics', onboarded: 60, inHiring: 15, open: 15 },
  { id: 'wh-it', workstream: 'IT & Infrastructure', onboarded: 45, inHiring: 10, open: 10 },
  { id: 'wh-fin', workstream: 'Finance & Accounting', onboarded: 40, inHiring: 10, open: 5 },
  { id: 'wh-hr', workstream: 'HR & People Services', onboarded: 30, inHiring: 8, open: 7 },
  { id: 'wh-proc', workstream: 'Procurement & Supply Chain', onboarded: 25, inHiring: 7, open: 8 },
  { id: 'wh-other', workstream: 'Other / Central', onboarded: 35, inHiring: 10, open: 5 },
]

export const seedHiringFunnel: FunnelStage[] = [
  { id: 'fs-1', stage: 'Sourced', candidates: 1240 },
  { id: 'fs-2', stage: 'Screened', candidates: 680 },
  { id: 'fs-3', stage: 'Technical Interview', candidates: 320 },
  { id: 'fs-4', stage: 'HR Interview', candidates: 150 },
  { id: 'fs-5', stage: 'Offer Extended', candidates: 90 },
  { id: 'fs-6', stage: 'Joined', candidates: 68 },
]
export const FUNNEL_COLORS = [CHART_COLORS.blue, CHART_COLORS.blueLight, CHART_COLORS.teal, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.orange]

export const seedTimeToHire: TimeToHireRow[] = [
  { id: 'tth-eng', workstream: 'Engineering & Product', actual: 45, target: 30 },
  { id: 'tth-data', workstream: 'Data & Analytics', actual: 52, target: 35 },
  { id: 'tth-it', workstream: 'IT & Infrastructure', actual: 38, target: 30 },
  { id: 'tth-fin', workstream: 'Finance & Accounting', actual: 32, target: 25 },
  { id: 'tth-hr', workstream: 'HR & People Services', actual: 28, target: 25 },
  { id: 'tth-proc', workstream: 'Procurement & Supply Chain', actual: 40, target: 30 },
]

export const seedLocationMix: LocationRow[] = [
  { id: 'loc-blr', name: 'Bengaluru', ftes: 218, seats: 260, costIndex: 1.0, color: CHART_COLORS.blue, office: 'Embassy TechVillage, Tower B' },
  { id: 'loc-hyd', name: 'Hyderabad', ftes: 64, seats: 80, costIndex: 0.92, color: CHART_COLORS.blueLight, office: 'Raheja Mindspace, Bldg 9' },
  { id: 'loc-pune', name: 'Pune', ftes: 26, seats: 40, costIndex: 0.95, color: CHART_COLORS.green, office: 'EON Free Zone, Cluster C' },
  { id: 'loc-chn', name: 'Chennai', ftes: 12, seats: 20, costIndex: 0.9, color: CHART_COLORS.orange, office: 'DLF Cybercity, Block 1' },
]

export const seedSkills: SkillRow[] = [
  { id: 'sk-cloud', category: 'Cloud (AWS/Azure)', required: 60, available: 42, owner: 'R. Mehta' },
  { id: 'sk-data', category: 'Data Engineering', required: 50, available: 32, owner: 'S. Iyer' },
  { id: 'sk-cyber', category: 'Cybersecurity', required: 35, available: 20, owner: 'R. Mehta' },
  { id: 'sk-sap', category: 'SAP / ERP', required: 40, available: 28, owner: 'V. Reddy' },
  { id: 'sk-prod', category: 'Product Engineering', required: 70, available: 60, owner: 'A. Sharma' },
  { id: 'sk-auto', category: 'Process Automation', required: 30, available: 18, owner: 'M. Khan' },
]

export const seedTrainingPlans: TrainingPlan[] = [
  { id: 'tp-1', program: 'AWS Solutions Architect bootcamp', skill: 'Cloud (AWS/Azure)', participants: 24, startDate: '2026-11-02', endDate: '2026-12-18', status: 'Planned', owner: 'R. Mehta' },
  { id: 'tp-2', program: 'Databricks & Spark certification track', skill: 'Data Engineering', participants: 18, startDate: '2026-10-05', endDate: '2026-12-04', status: 'In Progress', owner: 'S. Iyer' },
  { id: 'tp-3', program: 'Security operations (SOC) upskilling', skill: 'Cybersecurity', participants: 12, startDate: '2026-11-16', endDate: '2027-01-29', status: 'Planned', owner: 'R. Mehta' },
  { id: 'tp-4', program: 'SAP S/4HANA finance academy', skill: 'SAP / ERP', participants: 15, startDate: '2026-09-07', endDate: '2026-11-27', status: 'In Progress', owner: 'V. Reddy' },
  { id: 'tp-5', program: 'UiPath RPA developer programme', skill: 'Process Automation', participants: 10, startDate: '2026-08-10', endDate: '2026-10-09', status: 'Completed', owner: 'M. Khan' },
]

export const seedPeopleCost: PeopleCostRow[] = [
  { id: 'pc-eng', workstream: 'Engineering & Product', budgetCr: 1.6, actualCr: 1.15 },
  { id: 'pc-data', workstream: 'Data & Analytics', budgetCr: 1.0, actualCr: 0.72 },
  { id: 'pc-it', workstream: 'IT & Infrastructure', budgetCr: 0.7, actualCr: 0.52 },
  { id: 'pc-fin', workstream: 'Finance & Accounting', budgetCr: 0.55, actualCr: 0.42 },
  { id: 'pc-hr', workstream: 'HR & People Services', budgetCr: 0.4, actualCr: 0.32 },
  { id: 'pc-proc', workstream: 'Procurement & Supply Chain', budgetCr: 0.35, actualCr: 0.27 },
  { id: 'pc-other', workstream: 'Other / Central', budgetCr: 0.6, actualCr: 0.4 },
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
  { id: 'ht-eng', workstream: 'Engineering & Product', targets: [6, 6, 8, 8, 8, 10, 10, 10, 12, 12, 12, 10] },
  { id: 'ht-data', workstream: 'Data & Analytics', targets: [4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 6] },
  { id: 'ht-it', workstream: 'IT & Infrastructure', targets: [3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 4] },
  { id: 'ht-fin', workstream: 'Finance & Accounting', targets: [2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 4] },
  { id: 'ht-hr', workstream: 'HR & People Services', targets: [2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 3] },
  { id: 'ht-proc', workstream: 'Procurement & Supply Chain', targets: [2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 3] },
  { id: 'ht-other', workstream: 'Other / Central', targets: [3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 4] },
]

const ATTR_RATE = [6.0, 6.4, 7.1, 7.8, 8.3, 9.0, 9.6, 10.1, 10.8, 11.4]
const ATTR_EXITS = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4]
const ATTR_REGRET = [0, 1, 1, 1, 1, 2, 1, 2, 2, 3]
export const seedAttrition: AttritionMonth[] = MONTHS.slice(0, 10).map((m, i) => ({ id: `at-${m}`, month: m, ratePct: ATTR_RATE[i], benchmarkPct: 12, exits: ATTR_EXITS[i], regretted: ATTR_REGRET[i] }))

export const EXIT_REASONS = ['Better compensation', 'Career growth', 'Relocation', 'Higher studies', 'Personal reasons', 'Performance', 'Role mismatch'] as const
export const seedExits: ExitRecord[] = [
  { id: 'ex-1', name: 'Rohit Kulkarni', role: 'Data Engineer', workstream: 'Data & Analytics', location: 'Bengaluru', exitDate: '2026-10-09', reason: 'Better compensation', regretted: true, tenureMonths: 7 },
  { id: 'ex-2', name: 'Shreya Menon', role: 'Backend Engineer', workstream: 'Engineering & Product', location: 'Bengaluru', exitDate: '2026-10-02', reason: 'Career growth', regretted: true, tenureMonths: 8 },
  { id: 'ex-3', name: 'Imran Shaikh', role: 'Service Desk Analyst', workstream: 'IT & Infrastructure', location: 'Hyderabad', exitDate: '2026-09-25', reason: 'Relocation', regretted: false, tenureMonths: 6 },
  { id: 'ex-4', name: 'Pallavi Joshi', role: 'AP Analyst', workstream: 'Finance & Accounting', location: 'Pune', exitDate: '2026-09-18', reason: 'Personal reasons', regretted: false, tenureMonths: 5 },
  { id: 'ex-5', name: 'Karthik Raman', role: 'Cloud Engineer', workstream: 'IT & Infrastructure', location: 'Bengaluru', exitDate: '2026-09-04', reason: 'Better compensation', regretted: true, tenureMonths: 9 },
  { id: 'ex-6', name: 'Neha Agarwal', role: 'Product Manager', workstream: 'Engineering & Product', location: 'Bengaluru', exitDate: '2026-08-21', reason: 'Career growth', regretted: true, tenureMonths: 6 },
  { id: 'ex-7', name: 'Vikram Pillai', role: 'Sourcing Specialist', workstream: 'Procurement & Supply Chain', location: 'Chennai', exitDate: '2026-08-07', reason: 'Role mismatch', regretted: false, tenureMonths: 4 },
  { id: 'ex-8', name: 'Ananya Bose', role: 'HR Operations Analyst', workstream: 'HR & People Services', location: 'Hyderabad', exitDate: '2026-07-24', reason: 'Higher studies', regretted: false, tenureMonths: 7 },
]

export const seedRetentionActions: RetentionAction[] = [
  { id: 'ra-1', action: 'Mid-cycle compensation correction for Data & Cloud engineers', segment: 'Critical skills (L3–L4)', owner: 'S. Iyer', dueDate: '2026-11-15', status: 'In Progress', impact: 'High' },
  { id: 'ra-2', action: 'Launch GCC career-path framework and promotion calendar', segment: 'All employees', owner: 'A. Sharma', dueDate: '2026-12-01', status: 'Planned', impact: 'High' },
  { id: 'ra-3', action: 'Stay interviews for top-50 critical talent', segment: 'High performers', owner: 'S. Iyer', dueDate: '2026-10-31', status: 'In Progress', impact: 'Medium' },
  { id: 'ra-4', action: 'Retention bonus for Wave 1 joiners completing 18 months', segment: 'Wave 1 cohort', owner: 'D. Singh', dueDate: '2027-01-31', status: 'Planned', impact: 'Medium' },
  { id: 'ra-5', action: 'Manager capability programme (first-time managers)', segment: 'People managers', owner: 'M. Khan', dueDate: '2026-09-30', status: 'Completed', impact: 'Medium' },
]

/* ---------- Positions (68 open: 24 Critical/High, 44 Medium/Low; plus 4 closed) ---------- */
const ROLE_POOL: Record<Fn, string[]> = {
  'Engineering & Product': ['Senior Software Engineer', 'Full-stack Developer', 'Product Manager', 'QA Automation Engineer', 'DevOps Engineer', 'Engineering Manager', 'Frontend Engineer', 'Backend Engineer', 'Platform Engineer', 'Scrum Master', 'UX Designer', 'Site Reliability Engineer', 'Mobile Engineer', 'Solutions Architect', 'Technical Writer', 'Release Manager'],
  'Data & Analytics': ['Data Scientist', 'BI Developer', 'Analytics Lead', 'ML Engineer', 'Data Analyst', 'Data Governance Analyst', 'Data Architect', 'Reporting Analyst', 'Data Engineer'],
  'IT & Infrastructure': ['Network Engineer', 'Cloud Engineer', 'IT Support Lead', 'Systems Administrator', 'Identity & Access Analyst', 'Service Desk Analyst', 'Infrastructure Architect', 'Security Engineer'],
  'Finance & Accounting': ['GL Accountant', 'AP Analyst', 'Treasury Analyst', 'Tax Analyst', 'Financial Controller', 'Revenue Accountant'],
  'HR & People Services': ['Talent Acquisition Specialist', 'L&D Lead', 'HR Operations Analyst', 'Compensation Analyst', 'Onboarding Coordinator'],
  'Procurement & Supply Chain': ['Category Manager', 'Sourcing Specialist', 'Vendor Manager', 'Contracts Analyst', 'Supply Planner'],
  'Other / Central': ['PMO Analyst', 'Facilities Coordinator', 'Compliance Officer', 'Change Manager', 'Communications Lead', 'Admin Executive'],
}
const OPEN_PER_FN: Record<Fn, number> = { 'Engineering & Product': 22, 'Data & Analytics': 13, 'IT & Infrastructure': 9, 'Finance & Accounting': 6, 'HR & People Services': 6, 'Procurement & Supply Chain': 7, 'Other / Central': 5 }

function buildPositions(): Position[] {
  const mk = (i: number, role: string, ws: Fn, loc: string, pr: Priority, days: number, status: PositionStatus): Position => {
    const openedOn = addDays(TODAY, -days)
    return { id: `pos-${String(i + 1).padStart(3, '0')}`, role, workstream: ws, location: loc, priority: pr, status, openedOn, targetDate: addDays(openedOn, 75 + (i % 3) * 15), hiringManager: OWNERS[i % OWNERS.length], grade: GRADES[1 + (i % 4)] }
  }
  // the five mock-up rows (longest-open requisitions)
  const list: Position[] = [
    mk(0, 'Senior Data Engineer', 'Data & Analytics', 'Bengaluru', 'High', 45, 'In Interview'),
    mk(1, 'Cybersecurity Analyst', 'IT & Infrastructure', 'Hyderabad', 'High', 38, 'Open'),
    mk(2, 'FP&A Specialist', 'Finance & Accounting', 'Bengaluru', 'Medium', 28, 'In Interview'),
    mk(3, 'HR Business Partner', 'HR & People Services', 'Pune', 'Medium', 26, 'Open'),
    mk(4, 'Procurement Analyst', 'Procurement & Supply Chain', 'Chennai', 'Medium', 24, 'Offer'),
  ]
  const remaining: Record<Fn, number> = { ...OPEN_PER_FN }
  remaining['Data & Analytics']--; remaining['IT & Infrastructure']--; remaining['Finance & Accounting']--; remaining['HR & People Services']--; remaining['Procurement & Supply Chain']--
  // round-robin across functions so the register is interleaved rather than grouped
  const perFn: Record<Fn, { role: string; ws: Fn }[]> = Object.fromEntries(FUNCTIONS.map((ws) => [ws, Array.from({ length: remaining[ws] }, (_, k) => ({ role: ROLE_POOL[ws][k % ROLE_POOL[ws].length], ws }))])) as Record<Fn, { role: string; ws: Fn }[]>
  const queue: { role: string; ws: Fn }[] = []
  while (queue.length < 63) for (const ws of FUNCTIONS) { const nxt = perFn[ws].shift(); if (nxt) queue.push(nxt) }
  const n = queue.length // 63
  let acc = 0
  const statuses: PositionStatus[] = ['Open', 'Open', 'In Interview', 'Open', 'Offer', 'In Interview']
  queue.forEach((q, j) => {
    const i = j + 5
    acc += 22
    let pr: Priority
    if (acc >= n) { acc -= n; pr = j % 2 ? 'High' : 'Critical' } else pr = j % 4 === 0 ? 'Low' : 'Medium'
    const days = 3 + ((i * 5) % 21)
    list.push(mk(i, q.role, q.ws, RES_LOCATIONS[(i * 3) % 4 === 0 ? 1 : i % 5 === 0 ? 2 : i % 11 === 0 ? 3 : 0], pr, days, statuses[i % statuses.length]))
  })
  // closed / parked requisitions
  list.push(mk(68, 'Finance Transformation Lead', 'Finance & Accounting', 'Bengaluru', 'High', 60, 'Joined'))
  list.push(mk(69, 'Data Platform Lead', 'Data & Analytics', 'Hyderabad', 'Critical', 70, 'Joined'))
  list.push(mk(70, 'Office Manager', 'Other / Central', 'Chennai', 'Low', 30, 'On Hold'))
  list.push(mk(71, 'Payroll Specialist', 'HR & People Services', 'Pune', 'Low', 20, 'On Hold'))
  return list
}
export const seedPositions: Position[] = buildPositions()

/* ---------- Employees (sample of onboarded FTEs for allocation) ---------- */
const FIRST = ['Aarav', 'Diya', 'Ishaan', 'Meera', 'Kabir', 'Sanya', 'Arjun', 'Nisha', 'Rahul', 'Priya', 'Varun', 'Tanvi', 'Siddharth', 'Kavya', 'Aditya', 'Riya', 'Nikhil', 'Pooja', 'Manish', 'Sneha', 'Harsh', 'Lakshmi', 'Dev', 'Anjali', 'Yash', 'Swati', 'Rajat', 'Gayatri', 'Omkar', 'Bhavna', 'Tarun', 'Deepa', 'Sameer', 'Ritika', 'Gaurav', 'Madhuri']
const LAST = ['Sharma', 'Nair', 'Patel', 'Reddy', 'Iyer', 'Khan', 'Desai', 'Menon', 'Gupta', 'Rao', 'Verma', 'Bhat', 'Chowdhury', 'Joshi', 'Singh', 'Pillai', 'Mishra', 'Kapoor']
const EMP_ROLES: Record<Fn, string[]> = {
  'Engineering & Product': ['Senior Software Engineer', 'Product Owner', 'QA Engineer', 'DevOps Engineer', 'Frontend Engineer', 'Backend Engineer'],
  'Data & Analytics': ['Data Engineer', 'Data Scientist', 'BI Analyst', 'Analytics Manager'],
  'IT & Infrastructure': ['Network Engineer', 'Cloud Engineer', 'Security Analyst', 'IT Support Engineer'],
  'Finance & Accounting': ['GL Accountant', 'FP&A Analyst', 'AP Specialist'],
  'HR & People Services': ['HR Generalist', 'Recruiter', 'HR Ops Analyst'],
  'Procurement & Supply Chain': ['Buyer', 'Category Analyst', 'Vendor Coordinator'],
  'Other / Central': ['PMO Analyst', 'Facilities Executive', 'Compliance Analyst'],
}
const EMP_PER_FN: Record<Fn, number> = { 'Engineering & Product': 10, 'Data & Analytics': 7, 'IT & Infrastructure': 5, 'Finance & Accounting': 4, 'HR & People Services': 3, 'Procurement & Supply Chain': 3, 'Other / Central': 4 }
const BAND_COST: Record<string, number> = { 'Band A': 8, 'Band B': 14, 'Band C': 22, 'Band D': 34 } // ₹ Lakh per annum
function buildEmployees(): Employee[] {
  const out: Employee[] = []
  let i = 0
  for (const ws of FUNCTIONS) {
    for (let k = 0; k < EMP_PER_FN[ws]; k++, i++) {
      const band = COST_BANDS[(i + k) % 4]
      const alloc = [100, 100, 80, 100, 50, 100, 60, 100, 100, 30][i % 10]
      out.push({
        id: `emp-${String(i + 1).padStart(3, '0')}`, name: `${FIRST[i % FIRST.length]} ${LAST[(i * 5) % LAST.length]}`, role: EMP_ROLES[ws][k % EMP_ROLES[ws].length], workstream: ws,
        location: RES_LOCATIONS[i % 7 === 0 ? 2 : i % 4 === 0 ? 1 : i % 13 === 0 ? 3 : 0], grade: GRADES[(i + 1) % 5], allocationPct: alloc, costBand: band, annualCostL: BAND_COST[band],
        startDate: addDays('2026-01-12', (i * 9) % 270),
      })
    }
  }
  return out
}
export const seedEmployees: Employee[] = buildEmployees()
