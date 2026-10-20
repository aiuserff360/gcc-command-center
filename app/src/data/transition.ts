/**
 * Transition Management – types, seed data and helpers.
 *
 * Business units and the transition projects under them are the base of everything on this page.
 *
 * Collections owned by this page:
 *  - 'transitionProjects'     : TransitionProject[]     (the unit of transition – 2–4 per business unit, spread over waves 1–5)
 *  - 'waves'                  : Wave[]                  (5 waves – scope and progress are derived from the projects in the wave)
 *  - 'ktItems'                : KtItem[]                (knowledge-transfer tracker keyed by project; per-project / per-unit / per-wave % derived from sessions)
 *  - 'readinessAssessments'   : ReadinessAssessment[]   (one per project – five dimension scores, average = readiness score)
 *  - 'readinessGaps'          : ReadinessGap[]          (gap register keyed by project – 18 rows: 5 New, 13 Resolved)
 *  - 'stabilizationChecklist' : ChecklistItem[]         (stabilization readiness = % items done)
 *  - 'transitionSettings'     : [TransitionSettings]    (numbers that cannot be derived: deltas, go-live wave/status, threshold, trend)
 *  - 'milestoneWaves'         : MilestoneWave[]         (explicit wave override per shared milestone id)
 *  - 'milestoneProjects'      : MilestoneProject[]      (optional project link per shared Transition milestone id)
 *  - 'transitionRaidLinks'    : RaidLink[]              (business unit / project link per shared RAID item id)
 *
 * Shared collections read here: 'businessUnits', 'milestones', 'raid', 'dependencies'.
 */
import type { Status, Impact } from './common'
import { TODAY } from './common'
import type { Milestone, RaidItem } from './shared'

export const TRANSITION_TABS = ['Transition Overview', 'Wave Plan', 'Knowledge Transfer', 'Readiness & Stabilization', 'Risks & Issues', 'Dependencies', 'Reports'] as const
export const TRANSITION_DATE_RANGE = '01 Sep 2026 – 31 Mar 2027'
/** Fixed timeline window used by the Gantt-like charts (Sep '26 – Mar '27). */
export const TIMELINE_START = '2026-09-01'
export const TIMELINE_END = '2027-03-31'

/* ------------------------------------------------------------------ */
/* Business-unit helpers                                               */
/* ------------------------------------------------------------------ */
/** Short label for the dense wave-scope cells ("SAP, Microsoft, Finance SS"); the full name goes in the title. */
export const shortBu = (name: string) =>
  name.replace(' Practice', '').replace('R&D – Product Engineering', 'R&D Product').replace('R&D – Platform & Cloud', 'R&D Platform').replace(' Shared Services', ' SS')

/* ------------------------------------------------------------------ */
/* Transition projects                                                 */
/* ------------------------------------------------------------------ */
export const PROJECT_STATUSES = ['Not Started', 'In Progress', 'On Track', 'At Risk', 'Delayed', 'Stabilizing', 'Completed'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export interface TransitionProject {
  id: string
  name: string
  businessUnit: string
  wave: number
  status: ProjectStatus
  progress: number
  startDate: string
  endDate: string
  goLiveDate: string
  globalOwner: string
  indiaLead: string
  region: string // region / client served
  scopeSummary: string
  ftes: number
  description: string
  notes?: string
}

export const IN_TRANSITION: ProjectStatus[] = ['In Progress', 'On Track', 'At Risk', 'Delayed', 'Stabilizing']
export const isInTransition = (p: TransitionProject) => IN_TRANSITION.includes(p.status)
export const projectStatusColor = (s: ProjectStatus) =>
  s === 'Completed' || s === 'On Track' ? '#16A34A' : s === 'In Progress' ? '#2B6FD6' : s === 'Stabilizing' ? '#8B5CF6' : s === 'At Risk' ? '#F59E0B' : s === 'Delayed' ? '#DC2626' : '#BFD7F7'

const P = (id: string, name: string, businessUnit: string, wave: number, status: ProjectStatus, progress: number, startDate: string, endDate: string, goLiveDate: string, globalOwner: string, indiaLead: string, region: string, ftes: number, scopeSummary: string, description: string): TransitionProject =>
  ({ id, name, businessUnit, wave, status, progress, startDate, endDate, goLiveDate, globalOwner, indiaLead, region, ftes, scopeSummary, description })

export const seedProjects: TransitionProject[] = [
  // SAP Practice
  P('p-sap-ams', 'S/4HANA AMS – Europe', 'SAP Practice', 1, 'In Progress', 72, '2026-09-01', '2026-10-31', '2026-10-26', 'M. Weber', 'R. Mehta', 'Europe – DACH & Nordics clients', 24, 'L2/L3 application management for S/4HANA finance and logistics; incident, change and batch operations', 'Moves the European S/4HANA AMS run team from the Frankfurt delivery centre to Pune, including on-call coverage for month-end.'),
  P('p-sap-fico', 'SAP FI/CO rollout support – APAC', 'SAP Practice', 2, 'On Track', 64, '2026-10-01', '2026-11-30', '2026-11-23', 'L. Chen', 'R. Mehta', 'APAC – Singapore hub', 14, 'Rollout and hypercare support for FI/CO templates across APAC entities; localisation and period-end', 'Receives the APAC FI/CO rollout support squad; localisation knowledge for SG, MY and AU tax is the critical KT item.'),
  P('p-sap-ewm', 'SAP EWM warehouse support – Global', 'SAP Practice', 3, 'In Progress', 24, '2026-10-26', '2026-12-31', '2026-12-18', 'D. Novak', 'R. Mehta', 'Global – 14 distribution centres', 11, 'Extended Warehouse Management support for 14 DCs: RF, printing, inbound/outbound process issues', 'Follow-the-sun EWM support; Pune takes the APAC and Europe shifts after wave 3.'),
  // Microsoft Practice
  P('p-ms-d365', 'Dynamics 365 CE support', 'Microsoft Practice', 1, 'On Track', 68, '2026-09-07', '2026-10-31', '2026-10-30', 'J. Carter', 'M. Khan', 'North America – retail clients', 16, 'Case management, sales and marketing configuration, release management for D365 CE tenants', 'Transfers the D365 CE support pod from Toronto; release calendar aligned to the retail peak season freeze.'),
  P('p-ms-power', 'Power Platform CoE', 'Microsoft Practice', 2, 'At Risk', 50, '2026-10-05', '2026-11-30', '2026-11-27', 'E. Rossi', 'M. Khan', 'Global – internal CoE', 9, 'Centre of excellence: solution governance, ALM, canvas/model-driven app support, Dataverse admin', 'Dataverse administration knowledge sits with two global engineers – the main readiness risk for this project.'),
  P('p-ms-azure', 'Azure app modernisation squad', 'Microsoft Practice', 4, 'Not Started', 0, '2026-12-01', '2027-01-31', '2027-01-25', 'T. Okafor', 'M. Khan', 'Europe – banking client', 12, 'Containerisation and re-platforming of legacy .NET apps to Azure; DevOps pipelines', 'Squad built in Pune around the global architects; starts with the app portfolio assessment backlog.'),
  // Data & AI Practice
  P('p-data-bi', 'Enterprise BI migration', 'Data & AI Practice', 1, 'Stabilizing', 80, '2026-09-01', '2026-10-15', '2026-10-12', 'H. Tanaka', 'D. Singh', 'Global – finance & sales reporting', 10, 'Migration of enterprise BI from legacy reporting to Power BI; semantic models, report rebuild, refresh ops', 'Went live on 12 Oct; in hypercare with the global BI team until end October.'),
  P('p-data-eng', 'Data engineering run team', 'Data & AI Practice', 2, 'On Track', 68, '2026-10-01', '2026-11-20', '2026-11-16', 'B. Müller', 'D. Singh', 'Global – lakehouse platform', 13, 'Pipeline operations (Airflow/Databricks), data quality monitoring, lakehouse access management', 'Run team for the enterprise lakehouse; takes over the overnight pipeline operations window first.'),
  P('p-data-mlops', 'MLOps platform', 'Data & AI Practice', 3, 'In Progress', 20, '2026-11-02', '2026-12-31', '2026-12-21', 'L. Chen', 'D. Singh', 'Global – data science teams', 8, 'Model registry, deployment pipelines, feature store operations and drift monitoring', 'Platform engineering for ML; pairs with the global MLOps leads through December.'),
  // R&D – Product Engineering
  P('p-rd-pay', 'Product squad – payments', 'R&D – Product Engineering', 2, 'In Progress', 58, '2026-10-12', '2026-11-30', '2026-11-30', 'J. Carter', 'M. Khan', 'Global product – payments module', 15, 'Full-stack squad owning the payments module: features, CI/CD release train, on-call', 'First R&D product squad in Pune; domain onboarding with the Berlin payments team.'),
  P('p-rd-qa', 'QA automation hub', 'R&D – Product Engineering', 4, 'Not Started', 0, '2026-12-07', '2027-01-31', '2027-01-29', 'E. Rossi', 'M. Khan', 'Global product – all squads', 10, 'Central test automation: framework, regression suites, performance testing', 'Consolidates regression testing for all product squads into one Pune hub.'),
  // R&D – Platform & Cloud
  P('p-rd-cloud', 'Cloud platform engineering', 'R&D – Platform & Cloud', 3, 'In Progress', 18, '2026-10-26', '2026-12-31', '2026-12-15', 'T. Okafor', 'R. Mehta', 'Global – product cloud platform', 9, 'Landing zone operations, Terraform modules, FinOps reporting for the product cloud', 'Platform team transfer starts with landing-zone operations; FinOps reporting handed over last.'),
  P('p-rd-devsec', 'DevSecOps tooling', 'R&D – Platform & Cloud', 5, 'Not Started', 0, '2027-01-15', '2027-03-15', '2027-03-10', 'D. Novak', 'R. Mehta', 'Global – security engineering', 6, 'SAST/DAST pipeline integration, secrets management, vulnerability triage', 'Final R&D transfer; depends on the cloud platform team being stable.'),
  // Finance Shared Services
  P('p-fin-r2r', 'Record-to-report', 'Finance Shared Services', 1, 'Completed', 100, '2026-09-01', '2026-10-10', '2026-10-05', 'M. Weber', 'V. Reddy', 'Group – 11 legal entities', 9, 'General ledger close, intercompany reconciliation, fixed asset accounting', 'First process to complete transition; September close run from Pune with global review.'),
  P('p-fin-ap', 'Accounts payable', 'Finance Shared Services', 2, 'On Track', 72, '2026-10-01', '2026-11-15', '2026-11-09', 'H. Tanaka', 'V. Reddy', 'Group – 11 legal entities', 8, 'Invoice processing, vendor master maintenance, payment runs', 'AP processing moves with the November payment-run cycle as the go-live gate.'),
  // HR Shared Services
  P('p-hr-ops', 'HR operations & payroll support', 'HR Shared Services', 4, 'Not Started', 0, '2026-12-01', '2027-01-31', '2027-01-22', 'B. Müller', 'S. Iyer', 'India & UK employee population', 8, 'Payroll processing support, employee lifecycle transactions, HR helpdesk tier 1', 'Takes over HR operations after the year-end payroll cycle closes.'),
  P('p-hr-ta', 'Talent acquisition services', 'HR Shared Services', 5, 'Not Started', 0, '2027-01-18', '2027-03-15', '2027-03-12', 'E. Rossi', 'S. Iyer', 'Global – sourcing & scheduling', 7, 'Sourcing and screening, interview scheduling and offers, ATS administration', 'Recruitment operations support for global hiring; last transition wave.'),
]

/* ------------------------------------------------------------------ */
/* Waves                                                               */
/* ------------------------------------------------------------------ */
export const WAVE_STATUSES = ['Not Started', 'In Progress', 'On Track', 'At Risk', 'Delayed', 'Completed'] as const
export type WaveStatus = (typeof WAVE_STATUSES)[number]

export interface Wave {
  id: string
  number: number
  name: string
  startDate: string
  endDate: string
  status: WaveStatus
  color: string
  lead: string
}

export const WAVE_COLORS = ['#5B9BF0', '#16A34A', '#F59E0B', '#8B5CF6', '#14B8A6', '#1E5BBE', '#F97316']

export const seedWaves: Wave[] = [
  { id: 'wave-1', number: 1, name: 'Run & shared-service foundations', startDate: '2026-09-01', endDate: '2026-10-31', status: 'In Progress', color: WAVE_COLORS[0], lead: 'R. Mehta' },
  { id: 'wave-2', number: 2, name: 'Practice scale-up', startDate: '2026-10-01', endDate: '2026-11-30', status: 'On Track', color: WAVE_COLORS[1], lead: 'S. Iyer' },
  { id: 'wave-3', number: 3, name: 'Platform & engineering', startDate: '2026-10-26', endDate: '2026-12-31', status: 'In Progress', color: WAVE_COLORS[2], lead: 'P. Rao' },
  { id: 'wave-4', number: 4, name: 'Modernisation & HR', startDate: '2026-12-01', endDate: '2027-01-31', status: 'Not Started', color: WAVE_COLORS[3], lead: 'K. Nair' },
  { id: 'wave-5', number: 5, name: 'Final transfers & stabilization', startDate: '2027-01-15', endDate: '2027-03-15', status: 'Not Started', color: WAVE_COLORS[4], lead: 'A. Sharma' },
]

export const waveLabel = (n: number) => `Wave ${n}`
export const waveIsActive = (w: Wave, projects: TransitionProject[] = []) => w.status !== 'Completed' && (['In Progress', 'On Track', 'At Risk', 'Delayed'].includes(w.status) || waveProgress(w, projects) > 0)
export const waveHasStarted = (w: Wave, today = TODAY) => w.startDate <= today
export const waveProjects = (w: Wave | number, projects: TransitionProject[]) => { const n = typeof w === 'number' ? w : w.number; return projects.filter((p) => p.wave === n) }
/** Business units in a wave – derived from its projects (first-seen order). */
export const waveUnits = (w: Wave | number, projects: TransitionProject[]) => Array.from(new Set(waveProjects(w, projects).map((p) => p.businessUnit)))
/** Wave scope = its business units; short labels so it fits in a table cell. */
export const waveScope = (w: Wave | number, projects: TransitionProject[]) => waveUnits(w, projects).map(shortBu).join(', ')
/** Wave progress = average progress of its projects. */
export const waveProgress = (w: Wave | number, projects: TransitionProject[]) => { const ps = waveProjects(w, projects); return ps.length ? Math.round(ps.reduce((s, p) => s + p.progress, 0) / ps.length) : 0 }

export const waveProgressColor = (w: Wave) =>
  w.status === 'Completed' || w.status === 'On Track' ? '#16A34A' : w.status === 'In Progress' ? '#2B6FD6' : w.status === 'At Risk' ? '#F59E0B' : w.status === 'Delayed' ? '#DC2626' : '#BFD7F7'

/** Which wave a date falls into (by wave date range); undefined when outside every wave. */
export function waveForDate(waves: Wave[], date: string): number | undefined {
  return waves.find((w) => date >= w.startDate && date <= w.endDate)?.number
}

/* ------------------------------------------------------------------ */
/* Milestone → wave / project mapping                                  */
/* ------------------------------------------------------------------ */
export interface MilestoneWave { id: string; wave: number } // id = milestone id
export const seedMilestoneWaves: MilestoneWave[] = [{ id: 'ms-039', wave: 3 }, { id: 'ms-003', wave: 2 }, { id: 'ms-007', wave: 4 }, { id: 'ms-010', wave: 1 }]

export interface MilestoneProject { id: string; projectId: string } // id = milestone id
export const seedMilestoneProjects: MilestoneProject[] = [
  { id: 'ms-035', projectId: 'p-fin-r2r' },
  { id: 'ms-036', projectId: 'p-sap-ams' },
  { id: 'ms-038', projectId: 'p-fin-ap' },
]

export function milestoneWave(m: Milestone, waves: Wave[], overrides: MilestoneWave[], projects: TransitionProject[] = [], links: MilestoneProject[] = []): number | undefined {
  const o = overrides.find((x) => x.id === m.id)
  if (o) return o.wave
  const link = links.find((x) => x.id === m.id)
  const p = link && projects.find((x) => x.id === link.projectId)
  if (p) return p.wave
  const named = /wave\s*(\d+)/i.exec(m.name)
  if (named) return Number(named[1])
  return waveForDate(waves, m.dueDate)
}

export const isTransitionMilestone = (m: Milestone) => m.phase === 'Transition'

/* ------------------------------------------------------------------ */
/* Knowledge transfer                                                  */
/* ------------------------------------------------------------------ */
export const KT_STATUSES = ['Completed', 'In Progress', 'Not Started'] as const
export type KtStatus = (typeof KT_STATUSES)[number]
export const KT_SIGNOFF = ['Signed', 'Pending', 'Not Started'] as const
export type KtSignOff = (typeof KT_SIGNOFF)[number]

export interface KtItem {
  id: string
  projectId: string
  businessUnit: string
  process: string
  wave: number
  globalOwner: string
  indiaOwner: string
  sessionsPlanned: number
  sessionsDone: number
  status: KtStatus
  signOff: KtSignOff
  targetDate: string
}

export const ktStatusFor = (planned: number, done: number): KtStatus => (done >= planned && planned > 0 ? 'Completed' : done > 0 ? 'In Progress' : 'Not Started')

let ktN = 0
const K = (projectId: string, process: string, planned: number, done: number, targetDate: string): KtItem => {
  ktN++
  const p = seedProjects.find((x) => x.id === projectId)!
  const status = ktStatusFor(planned, done)
  return {
    id: `kt-${String(ktN).padStart(3, '0')}`, projectId, businessUnit: p.businessUnit, process, wave: p.wave, globalOwner: p.globalOwner, indiaOwner: p.indiaLead,
    sessionsPlanned: planned, sessionsDone: done, status, signOff: status === 'Completed' ? 'Signed' : status === 'In Progress' ? 'Pending' : 'Not Started', targetDate,
  }
}

export const seedKtItems: KtItem[] = [
  // Wave 1 (62 of 80 sessions → 78%; waves 1+2 (started) → 68%)
  K('p-sap-ams', 'Incident & service request handling (L2)', 8, 8, '2026-09-25'),
  K('p-sap-ams', 'Change & transport management', 6, 5, '2026-10-09'),
  K('p-sap-ams', 'Month-end batch monitoring', 5, 3, '2026-10-23'),
  K('p-sap-ams', 'Interface monitoring (PI/PO)', 6, 1, '2026-10-30'),
  K('p-ms-d365', 'Case management configuration', 6, 6, '2026-09-30'),
  K('p-ms-d365', 'Release & deployment process', 5, 2, '2026-10-21'),
  K('p-ms-d365', 'Integration with Azure services', 6, 2, '2026-10-29'),
  K('p-data-bi', 'Semantic model migration', 8, 8, '2026-09-18'),
  K('p-data-bi', 'Report rebuild & validation', 8, 5, '2026-10-02'),
  K('p-data-bi', 'Scheduled refresh & monitoring', 4, 4, '2026-10-09'),
  K('p-fin-r2r', 'General ledger close', 8, 8, '2026-09-18'),
  K('p-fin-r2r', 'Intercompany reconciliation', 6, 6, '2026-09-25'),
  K('p-fin-r2r', 'Fixed asset accounting', 4, 4, '2026-10-02'),
  // Wave 2 (54 of 90 sessions → 60%)
  K('p-sap-fico', 'FI/CO configuration support', 8, 6, '2026-10-23'),
  K('p-sap-fico', 'Period-end close support', 6, 4, '2026-11-06'),
  K('p-sap-fico', 'APAC tax localisation', 6, 2, '2026-11-18'),
  K('p-ms-power', 'Solution governance & ALM', 6, 4, '2026-10-28'),
  K('p-ms-power', 'Canvas app support', 6, 3, '2026-11-11'),
  K('p-ms-power', 'Dataverse administration', 5, 0, '2026-11-24'),
  K('p-data-eng', 'Pipeline operations (Airflow)', 8, 6, '2026-10-23'),
  K('p-data-eng', 'Data quality monitoring', 6, 4, '2026-11-04'),
  K('p-data-eng', 'Lakehouse access management', 4, 2, '2026-11-13'),
  K('p-rd-pay', 'Payments domain onboarding', 8, 6, '2026-10-30'),
  K('p-rd-pay', 'CI/CD & release train', 6, 4, '2026-11-13'),
  K('p-rd-pay', 'On-call & incident runbooks', 6, 0, '2026-11-27'),
  K('p-fin-ap', 'Invoice processing', 6, 6, '2026-10-16'),
  K('p-fin-ap', 'Vendor master maintenance', 4, 4, '2026-10-23'),
  K('p-fin-ap', 'Payment runs', 5, 3, '2026-11-06'),
  // Wave 3 (24 of 54 sessions → 44%)
  K('p-sap-ewm', 'Warehouse task monitoring', 6, 4, '2026-11-13'),
  K('p-sap-ewm', 'RF device & label printing support', 5, 2, '2026-11-27'),
  K('p-sap-ewm', 'Inbound / outbound process support', 8, 2, '2026-12-11'),
  K('p-data-mlops', 'Model registry & deployment', 6, 4, '2026-11-20'),
  K('p-data-mlops', 'Feature store operations', 6, 2, '2026-12-04'),
  K('p-data-mlops', 'Monitoring & drift alerts', 5, 1, '2026-12-16'),
  K('p-rd-cloud', 'Landing zone operations', 8, 5, '2026-11-13'),
  K('p-rd-cloud', 'Terraform modules & IaC standards', 6, 3, '2026-11-27'),
  K('p-rd-cloud', 'Cost & FinOps reporting', 4, 1, '2026-12-11'),
  // Wave 4 (15 of 52 sessions → 29%)
  K('p-ms-azure', 'App portfolio assessment', 6, 4, '2026-12-11'),
  K('p-ms-azure', 'Containerisation patterns', 6, 1, '2027-01-08'),
  K('p-ms-azure', 'Azure DevOps pipelines', 5, 0, '2027-01-22'),
  K('p-rd-qa', 'Test framework onboarding', 6, 3, '2026-12-18'),
  K('p-rd-qa', 'Regression suite handover', 8, 2, '2027-01-15'),
  K('p-rd-qa', 'Performance testing', 4, 0, '2027-01-27'),
  K('p-hr-ops', 'Payroll processing (India & UK)', 6, 3, '2026-12-16'),
  K('p-hr-ops', 'Employee lifecycle transactions', 6, 2, '2027-01-08'),
  K('p-hr-ops', 'HR helpdesk tier 1', 5, 0, '2027-01-20'),
  // Wave 5 (4 of 31 sessions → 13%)
  K('p-rd-devsec', 'SAST/DAST pipeline integration', 6, 1, '2027-02-05'),
  K('p-rd-devsec', 'Secrets management', 5, 1, '2027-02-19'),
  K('p-rd-devsec', 'Vulnerability triage', 5, 0, '2027-03-05'),
  K('p-hr-ta', 'Sourcing & screening', 6, 1, '2027-02-10'),
  K('p-hr-ta', 'Interview scheduling & offers', 5, 1, '2027-02-24'),
  K('p-hr-ta', 'ATS administration', 4, 0, '2027-03-10'),
]

export function ktStats(items: KtItem[]) {
  const planned = items.reduce((s, i) => s + i.sessionsPlanned, 0)
  const done = items.reduce((s, i) => s + Math.min(i.sessionsDone, i.sessionsPlanned), 0)
  const pct = planned ? Math.round((done / planned) * 100) : 0
  const count = (st: KtStatus) => items.filter((i) => i.status === st).length
  return { planned, done, pct, total: items.length, completed: count('Completed'), inProgress: count('In Progress'), notStarted: count('Not Started'), signed: items.filter((i) => i.signOff === 'Signed').length }
}
export const projectKt = (p: TransitionProject | string, kt: KtItem[]) => ktStats(kt.filter((k) => k.projectId === (typeof p === 'string' ? p : p.id)))
export const unitKt = (unit: string, kt: KtItem[]) => ktStats(kt.filter((k) => k.businessUnit === unit))

/* ------------------------------------------------------------------ */
/* Readiness                                                           */
/* ------------------------------------------------------------------ */
export const DIMENSIONS = ['People & Organization', 'Process & Governance', 'Technology & Data', 'Facilities & Infrastructure', 'Controls & Compliance'] as const
export type Dimension = (typeof DIMENSIONS)[number]
export const DIM_KEYS = ['people', 'process', 'technology', 'facilities', 'controls'] as const
export type DimKey = (typeof DIM_KEYS)[number]
export const DIM_KEY: Record<Dimension, DimKey> = { 'People & Organization': 'people', 'Process & Governance': 'process', 'Technology & Data': 'technology', 'Facilities & Infrastructure': 'facilities', 'Controls & Compliance': 'controls' }
export const DIM_SHORT: Record<Dimension, string> = { 'People & Organization': 'People', 'Process & Governance': 'Process', 'Technology & Data': 'Technology', 'Facilities & Infrastructure': 'Facilities', 'Controls & Compliance': 'Controls' }
export const READINESS_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Not Started', 'Completed'] as const

export interface ReadinessAssessment {
  id: string
  projectId: string
  businessUnit: string
  wave: number
  people: number
  process: number
  technology: number
  facilities: number
  controls: number
  status: Status
  nextAction: string
  assessedOn: string
}

export const assessmentScore = (a: ReadinessAssessment) => Math.round(DIM_KEYS.reduce((s, k) => s + (a[k] ?? 0), 0) / DIM_KEYS.length)
export const readinessColor = (score: number) => (score >= 80 ? '#16A34A' : score >= 65 ? '#5B9BF0' : score >= 50 ? '#F59E0B' : '#DC2626')
/** Average of one dimension across a set of assessments. */
export const dimAverage = (list: ReadinessAssessment[], d: Dimension) => (list.length ? Math.round(list.reduce((s, a) => s + (a[DIM_KEY[d]] ?? 0), 0) / list.length) : 0)
export const avgScore = (list: ReadinessAssessment[]) => (list.length ? Math.round(list.reduce((s, a) => s + assessmentScore(a), 0) / list.length) : 0)
export const projectAssessment = (p: TransitionProject | string, list: ReadinessAssessment[]) => list.find((a) => a.projectId === (typeof p === 'string' ? p : p.id))
export const projectReadiness = (p: TransitionProject | string, list: ReadinessAssessment[]) => { const a = projectAssessment(p, list); return a ? assessmentScore(a) : 0 }
export const blankAssessment = (id: string, p: TransitionProject, score = 50): ReadinessAssessment =>
  ({ id, projectId: p.id, businessUnit: p.businessUnit, wave: p.wave, people: score, process: score, technology: score, facilities: score, controls: score, status: 'Not Started', nextAction: '', assessedOn: TODAY })

const OFFSETS = [3, -1, -5, 4, -1] // sums to 0 so the mean equals the target score
const RA = (projectId: string, score: number, status: Status, nextAction: string): ReadinessAssessment => {
  const p = seedProjects.find((x) => x.id === projectId)!
  const v = (i: number) => Math.max(0, Math.min(100, score + OFFSETS[i]))
  return { id: `ra-${projectId}`, projectId, businessUnit: p.businessUnit, wave: p.wave, people: v(0), process: v(1), technology: v(2), facilities: v(3), controls: v(4), status, nextAction, assessedOn: '2026-10-16' }
}
export const seedReadinessAssessments: ReadinessAssessment[] = [
  RA('p-sap-ams', 82, 'On Track', 'Close PI/PO interface monitoring KT before go-live'),
  RA('p-ms-d365', 76, 'On Track', 'Confirm release freeze calendar with retail clients'),
  RA('p-data-bi', 90, 'Completed', 'Exit hypercare on 31 Oct'),
  RA('p-fin-r2r', 94, 'Completed', 'Hand over October close to steady-state governance'),
  RA('p-sap-fico', 70, 'On Track', 'Complete APAC tax localisation sessions'),
  RA('p-ms-power', 54, 'At Risk', 'Secure Dataverse admin KT slots with global engineers'),
  RA('p-data-eng', 72, 'On Track', 'Validate overnight pipeline operations runbook'),
  RA('p-rd-pay', 62, 'On Track', 'Finalise on-call rota and incident runbooks'),
  RA('p-fin-ap', 78, 'On Track', 'Dry-run November payment cycle from Pune'),
  RA('p-sap-ewm', 48, 'At Risk', 'Provision RF device test environment in Pune'),
  RA('p-data-mlops', 44, 'Not Started', 'Confirm feature store access for the Pune team'),
  RA('p-rd-cloud', 52, 'On Track', 'Agree landing-zone change windows with global SRE'),
  RA('p-ms-azure', 28, 'Not Started', 'Confirm banking-client security clearance'),
  RA('p-rd-qa', 24, 'Not Started', 'Baseline regression suite inventory'),
  RA('p-hr-ops', 26, 'Not Started', 'Schedule payroll processing shadowing after year-end'),
  RA('p-rd-devsec', 12, 'Not Started', 'Define tooling licences for the Pune team'),
  RA('p-hr-ta', 10, 'Not Started', 'Confirm ATS access model and data-privacy review'),
]

/* ------------------------------------------------------------------ */
/* Readiness gaps (18 = 5 New | 13 Resolved)                           */
/* ------------------------------------------------------------------ */
export const GAP_STATUSES = ['New', 'Open', 'Resolved'] as const
export type GapStatus = (typeof GAP_STATUSES)[number]
export interface ReadinessGap {
  id: string
  code: string
  projectId: string
  businessUnit: string
  wave: number
  dimension: Dimension
  description: string
  severity: Impact
  owner: string
  status: GapStatus
  raised: string
  due: string
}
let gapN = 0
const G = (projectId: string, dimension: Dimension, description: string, severity: Impact, owner: string, status: GapStatus, raised: string, due: string): ReadinessGap => {
  gapN++
  const p = seedProjects.find((x) => x.id === projectId)!
  return { id: `gap-${String(gapN).padStart(3, '0')}`, code: `G-${String(gapN).padStart(3, '0')}`, projectId, businessUnit: p.businessUnit, wave: p.wave, dimension, description, severity, owner, status, raised, due }
}
export const seedReadinessGaps: ReadinessGap[] = [
  G('p-sap-ams', 'Technology & Data', 'PI/PO monitoring access for Pune AMS team not provisioned', 'High', 'R. Mehta', 'New', '2026-10-14', '2026-10-28'),
  G('p-ms-power', 'People & Organization', 'Dataverse administration knowledge held by two global engineers only', 'Critical', 'M. Khan', 'New', '2026-10-15', '2026-11-05'),
  G('p-rd-pay', 'Process & Governance', 'On-call and incident runbooks for the payments module not written', 'High', 'M. Khan', 'New', '2026-10-16', '2026-11-13'),
  G('p-sap-ewm', 'Facilities & Infrastructure', 'RF device and label-printing test rig for EWM not set up in Pune', 'Medium', 'K. Nair', 'New', '2026-10-17', '2026-11-20'),
  G('p-data-mlops', 'Controls & Compliance', 'Model-governance controls for the MLOps platform not reviewed', 'Medium', 'P. Rao', 'New', '2026-10-19', '2026-11-27'),
  G('p-fin-r2r', 'People & Organization', 'GL close shadowing schedule not confirmed', 'Medium', 'V. Reddy', 'Resolved', '2026-09-02', '2026-09-10'),
  G('p-fin-r2r', 'Process & Governance', 'Close checklist missing India entity steps', 'Medium', 'V. Reddy', 'Resolved', '2026-09-04', '2026-09-15'),
  G('p-fin-r2r', 'Technology & Data', 'ERP role mapping incomplete for Pune accountants', 'High', 'R. Mehta', 'Resolved', '2026-09-05', '2026-09-18'),
  G('p-sap-ams', 'Facilities & Infrastructure', 'Wave 1 AMS seating plan not signed off', 'Low', 'K. Nair', 'Resolved', '2026-09-06', '2026-09-12'),
  G('p-fin-r2r', 'Controls & Compliance', 'SoD matrix not updated for close roles', 'High', 'P. Rao', 'Resolved', '2026-09-08', '2026-09-22'),
  G('p-data-bi', 'People & Organization', 'BI refresh-operations backup resource not identified', 'Medium', 'D. Singh', 'Resolved', '2026-09-09', '2026-09-20'),
  G('p-ms-d365', 'Process & Governance', 'Release SOP references the Toronto ticketing queue', 'Low', 'M. Khan', 'Resolved', '2026-09-11', '2026-09-24'),
  G('p-ms-d365', 'Technology & Data', 'D365 sandbox tenant access missing for Pune pod', 'Medium', 'R. Mehta', 'Resolved', '2026-09-12', '2026-09-25'),
  G('p-sap-ams', 'Process & Governance', 'Escalation matrix for European AMS not published', 'Medium', 'R. Mehta', 'Resolved', '2026-09-15', '2026-09-28'),
  G('p-data-eng', 'Facilities & Infrastructure', 'Lakehouse ops bay network cabling incomplete', 'Medium', 'K. Nair', 'Resolved', '2026-09-20', '2026-10-05'),
  G('p-sap-fico', 'People & Organization', 'APAC shift roster for FI/CO support not approved', 'Medium', 'R. Mehta', 'Resolved', '2026-09-24', '2026-10-08'),
  G('p-data-eng', 'Controls & Compliance', 'Privileged access review for pipeline admins pending', 'High', 'P. Rao', 'Resolved', '2026-09-28', '2026-10-12'),
  G('p-fin-ap', 'Process & Governance', 'Invoice exception severity definitions not aligned with global', 'Low', 'V. Reddy', 'Resolved', '2026-10-01', '2026-10-15'),
]

/* ------------------------------------------------------------------ */
/* Stabilization checklist (11 of 12 done → 92%)                       */
/* ------------------------------------------------------------------ */
export interface ChecklistItem { id: string; item: string; owner: string; done: boolean; area: string }
export const seedChecklist: ChecklistItem[] = [
  { id: 'chk-01', item: 'Hypercare support rota agreed with global teams', owner: 'A. Sharma', done: true, area: 'Support' },
  { id: 'chk-02', item: 'SLA and KPI baseline captured for Wave 1 projects', owner: 'M. Khan', done: true, area: 'Performance' },
  { id: 'chk-03', item: 'Escalation matrix published and tested', owner: 'A. Sharma', done: true, area: 'Governance' },
  { id: 'chk-04', item: 'Knowledge base and SOP repository live', owner: 'D. Singh', done: true, area: 'Process' },
  { id: 'chk-05', item: 'Issue and defect log with daily triage', owner: 'A. Sharma', done: true, area: 'Governance' },
  { id: 'chk-06', item: 'Backup resources identified for critical projects', owner: 'S. Iyer', done: true, area: 'People' },
  { id: 'chk-07', item: 'Monitoring dashboards configured for service health', owner: 'R. Mehta', done: true, area: 'Technology' },
  { id: 'chk-08', item: 'Business continuity plan validated for the Pune site', owner: 'K. Nair', done: true, area: 'Facilities' },
  { id: 'chk-09', item: 'Stabilization exit criteria signed by global owners', owner: 'A. Sharma', done: true, area: 'Governance' },
  { id: 'chk-10', item: 'Change-freeze window agreed for go-live', owner: 'R. Mehta', done: true, area: 'Technology' },
  { id: 'chk-11', item: 'Weekly stabilization review cadence in place', owner: 'A. Sharma', done: true, area: 'Governance' },
  { id: 'chk-12', item: 'Retention plan for critical Wave 1 talent approved', owner: 'S. Iyer', done: false, area: 'People' },
]

/* ------------------------------------------------------------------ */
/* Settings (non-derivable numbers)                                    */
/* ------------------------------------------------------------------ */
export interface TransitionSettings {
  id: string
  ktDeltaPct: number
  stabilizationDeltaPct: number
  goLiveWave: number
  goLiveStatus: 'On track' | 'At risk' | 'Delayed'
  readinessThreshold: number
  trendMonths: string[]
  trendPlanned: number[]
  trendActual: number[]
}
export const seedTransitionSettings: TransitionSettings[] = [{
  id: 'transition-settings',
  ktDeltaPct: 12,
  stabilizationDeltaPct: 8,
  goLiveWave: 3,
  goLiveStatus: 'On track',
  readinessThreshold: 70,
  trendMonths: ["Sep '26", "Oct '26", "Nov '26", "Dec '26", "Jan '27"],
  trendPlanned: [15, 30, 46, 64, 78],
  trendActual: [22, 38, 55, 74, 85],
}]
/** Target go-live of a wave = the last go-live among its projects. */
export const waveGoLive = (n: number, projects: TransitionProject[]) => waveProjects(n, projects).map((p) => p.goLiveDate).sort().pop()
/** Next go-live on or after today for a set of projects. */
export const nextGoLive = (projects: TransitionProject[], today = TODAY) => projects.filter((p) => p.goLiveDate >= today && p.status !== 'Completed').map((p) => p.goLiveDate).sort()[0]

/* ------------------------------------------------------------------ */
/* RAID links for the transition view                                  */
/* ------------------------------------------------------------------ */
export interface RaidLink { id: string; businessUnit: string; projectId?: string } // id = raid item id
export const seedRaidLinks: RaidLink[] = [
  { id: 'r-011', businessUnit: 'SAP Practice', projectId: 'p-sap-ams' },
  { id: 'r-010', businessUnit: 'SAP Practice' },
  { id: 'i-006', businessUnit: 'Finance Shared Services', projectId: 'p-fin-r2r' },
  { id: 'r-026', businessUnit: 'Microsoft Practice', projectId: 'p-ms-d365' },
  { id: 'i-027', businessUnit: 'Data & AI Practice', projectId: 'p-data-bi' },
  { id: 'i-028', businessUnit: 'HR Shared Services', projectId: 'p-hr-ops' },
]
export const TRANSITION_RAID_LABELS: Record<string, string> = {
  'R-011': 'Knowledge transfer delay',
  'R-010': 'Key talent attrition',
  'I-027': 'System access delays',
  'I-028': 'Data quality gaps',
  'R-026': 'Change resistance',
}
export const isTransitionRaid = (r: RaidItem, links: RaidLink[] = []) => r.workstream === 'Transition' || r.code in TRANSITION_RAID_LABELS || links.some((l) => l.id === r.id)
export const raidLabel = (r: RaidItem) => TRANSITION_RAID_LABELS[r.code] ?? r.shortTitle ?? r.title
export const raidLink = (r: RaidItem, links: RaidLink[]) => links.find((l) => l.id === r.id)

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */
export const fmtLong = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) // "Oct 28, 2026"
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "01 Sep 2026" (the shared fmtDate yields "Sept" in Chrome's en-GB locale). */
export const fmtD = (iso: string) => { const [y, m, d] = (iso ?? '').split('-'); return y && m && d ? `${d} ${MON[Number(m) - 1]} ${y}` : iso }

export const monthKey = (iso: string) => iso.slice(0, 7)
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return `${MON[m - 1]} '${String(y).slice(2)}`
}
