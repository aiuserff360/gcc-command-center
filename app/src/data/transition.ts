/**
 * Transition Management – types, seed data and helpers (ENGIE IT GCC, Pune).
 *
 * Business units (the 7 IT domains) → capabilities (sub-units) → transition projects are the base of everything on
 * this page. Each project moves one capability from its current delivery location (Europe, France, USA, Belgium,
 * Netherlands …) for the GBU it serves, in the capability's wave. Accounts (applications, services, business entities,
 * platforms) are onboarded to the GCC through a project, and knowledge transfer is tracked per project.
 *
 * Collections owned by this page:
 *  - 'transitionProjects'     : TransitionProject[]     (one or two per capability – 26 projects across the 4 waves)
 *  - 'transitionAccounts'     : TransitionAccount[]     (accounts onboarded at project level – 3–8 per project)
 *  - 'waves'                  : Wave[]                  (4 waves Nov 2026 – Apr 2027 – scope and progress derived from the projects)
 *  - 'ktItems'                : KtItem[]                (knowledge-transfer tracker keyed by project; pending = not signed off)
 *  - 'readinessAssessments'   : ReadinessAssessment[]   (one per project – five dimension scores, average = readiness score)
 *  - 'readinessGaps'          : ReadinessGap[]          (gap register keyed by project)
 *  - 'stabilizationChecklist' : ChecklistItem[]         (stabilization readiness = % items done)
 *  - 'transitionSettings'     : [TransitionSettings]    (numbers that cannot be derived: deltas, go-live wave/status, threshold, trend)
 *  - 'milestoneWaves'         : MilestoneWave[]         (explicit wave override per shared milestone id)
 *  - 'milestoneProjects'      : MilestoneProject[]      (optional project link per shared Transition milestone id)
 *  - 'transitionRaidLinks'    : RaidLink[]              (business unit / project link per shared RAID item id)
 *  - 'transitionDepLinks'     : DepLink[]               (business unit / project link per shared dependency id)
 *
 * Shared collections read here: 'businessUnits', 'subUnits', 'milestones', 'raid', 'dependencies'.
 */
import type { Status, Impact } from './common'
import { TODAY } from './common'
import type { Milestone, RaidItem } from './shared'
import { seedSubUnits, seedBusinessUnitsRaw, buShortName, RAMP_START, RAMP_MONTHS, type SubUnit } from './businessUnits'

export const TRANSITION_TABS = ['Transition Overview', 'Wave Plan', 'Accounts', 'KT Tracking', 'Readiness & Stabilization', 'Risks & Issues', 'Dependencies', 'Reports'] as const
export const TRANSITION_DATE_RANGE = '01 Nov 2026 – 30 Apr 2027'
/** Fixed timeline window used by the Gantt-like charts (Nov '26 – May '27: the four waves plus stabilisation). */
export const TIMELINE_START = '2026-11-01'
export const TIMELINE_END = '2027-05-31'

/* ------------------------------------------------------------------ */
/* Business-unit / capability helpers                                   */
/* ------------------------------------------------------------------ */
/** Short label for the dense wave-scope cells ("Infra & Cloud, Cyber & IAM"); the full name goes in the title. */
export const shortBu = (name: string) => buShortName(name)
const unitName = (id: string) => seedBusinessUnitsRaw.find((b) => b.id === id)?.name ?? id
const sub = (id: string): SubUnit => seedSubUnits.find((s) => s.id === id)!
export const capabilityOf = (p: { subUnitId?: string; capability?: string }, subs: SubUnit[]) => subs.find((s) => s.id === p.subUnitId) ?? (p.capability ? subs.find((s) => s.name === p.capability) : undefined)

/* ------------------------------------------------------------------ */
/* Transition projects                                                 */
/* ------------------------------------------------------------------ */
export const PROJECT_STATUSES = ['Not Started', 'In Progress', 'On Track', 'At Risk', 'Delayed', 'Stabilizing', 'Completed'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export interface TransitionProject {
  id: string
  name: string
  businessUnit: string // IT domain
  subUnitId: string // capability / service ('subUnits' id)
  capability: string // capability / service name (denormalised for display and filters)
  gbu: string // GBU served
  deliveryLocation: string // current delivery location the work transitions from
  transitionType: string // Transition | Build | Build / Transition
  wave: number
  status: ProjectStatus
  progress: number
  startDate: string
  endDate: string
  goLiveDate: string
  globalOwner: string
  indiaLead: string
  region: string // geography served
  scopeSummary: string
  ftes: number // target Pune FTEs delivered by the project
  description: string
  notes?: string
}

export const IN_TRANSITION: ProjectStatus[] = ['In Progress', 'On Track', 'At Risk', 'Delayed', 'Stabilizing']
export const isInTransition = (p: TransitionProject) => IN_TRANSITION.includes(p.status)
export const projectStatusColor = (s: ProjectStatus) =>
  s === 'Completed' || s === 'On Track' ? '#16A34A' : s === 'In Progress' ? '#2B6FD6' : s === 'Stabilizing' ? '#8B5CF6' : s === 'At Risk' ? '#F59E0B' : s === 'Delayed' ? '#DC2626' : '#BFD7F7'

const P = (id: string, subUnitId: string, name: string, status: ProjectStatus, progress: number, startDate: string, endDate: string, goLiveDate: string, globalOwner: string, indiaLead: string, ftes: number, scopeSummary: string, description: string): TransitionProject => {
  const s = sub(subUnitId)
  return { id, name, businessUnit: unitName(s.businessUnitId), subUnitId, capability: s.name, gbu: s.gbuServed, deliveryLocation: s.deliveryLocation, transitionType: s.transitionType, wave: Number(s.wave.replace('Wave ', '')), status, progress, startDate, endDate, goLiveDate, globalOwner, indiaLead, region: s.geography, ftes, scopeSummary, description }
}

/** 26 projects – one per capability (two for SAP / ERP and Business Applications); FTEs add up to the 400 Pune target. */
export const seedProjects: TransitionProject[] = [
  // Wave 1 (Nov–Dec 2026) – Infrastructure & Cloud
  P('p-cloud-ops', 'su-cloud-ops', 'Cloud Operations – Azure & AWS run', 'Completed', 100, '2026-11-02', '2026-12-31', '2026-12-14', 'J. Dupont', 'R. Mehta', 52, 'L2/L3 cloud operations for the Group landing zones: monitoring, incident, patching, FinOps reporting', 'Moves the Group cloud operations run team from the Europe hub to Pune; 24x7 follow-the-sun coverage from December.'),
  P('p-network', 'su-network', 'Network Operations – France', 'Stabilizing', 92, '2026-11-02', '2027-01-15', '2026-12-21', 'C. Martin', 'R. Mehta', 44, 'WAN / LAN / Wi-Fi operations, firewall change execution and network monitoring for all ENGIE sites', 'Network operations transfer from the Paris delivery centre; hypercare with the France NOC until mid-January.'),
  P('p-hosting', 'su-hosting', 'Hosting / Data Centre – Belgium', 'Completed', 100, '2026-11-16', '2026-12-31', '2026-12-18', 'L. Peeters', 'R. Mehta', 7, 'Server and storage operations for the Brussels data centre; backup and DR drills', 'Build / transition of the hosting operations team; Pune owns the backup and restore service from December.'),
  P('p-infra-ops', 'su-infra-ops', 'Infrastructure Operations – Netherlands', 'Stabilizing', 88, '2026-11-16', '2027-01-15', '2026-12-28', 'S. de Vries', 'R. Mehta', 4, 'Infrastructure monitoring, capacity reporting and job scheduling operations', 'Build of the infrastructure operations desk around the Netherlands run team; shift handover model stabilising.'),
  // Wave 1 – Cybersecurity & IAM
  P('p-iam', 'su-iam', 'Identity & Access Operations', 'Completed', 100, '2026-11-02', '2026-12-31', '2026-12-11', 'A. Lefebvre', 'P. Rao', 20, 'Joiner / mover / leaver, access certification, privileged access and directory operations for all GBUs', 'IAM operations transfer from the Europe security hub; access certification cycle Q4 ran from Pune.'),
  P('p-secops', 'su-secops', 'Security Operations (SOC L1/L2)', 'Stabilizing', 85, '2026-11-09', '2027-01-29', '2027-01-04', 'M. Fischer', 'P. Rao', 9, 'Security monitoring, alert triage and incident response L1/L2 for the Group SOC', 'Build / transition of SOC analysts; Pune covers the APAC and Europe shifts since January.'),
  P('p-vuln', 'su-vuln', 'Vulnerability Management', 'Stabilizing', 80, '2026-12-01', '2027-02-26', '2027-01-25', 'M. Fischer', 'P. Rao', 4, 'Vulnerability scanning, remediation tracking and reporting across the Group estate', 'Small build; Pune owns the monthly vulnerability report from January.'),
  P('p-seceng', 'su-seceng', 'Security Engineering build', 'In Progress', 55, '2027-01-04', '2027-03-31', '2027-03-15', 'A. Lefebvre', 'P. Rao', 3, 'Security tooling engineering: SIEM content, EDR policies, security automation', 'Build of a small security engineering pod; first engineers joined in February.'),
  // Wave 2 (Jan–Feb 2027) – Enterprise Applications
  P('p-sap-ams', 'su-sap', 'SAP / ERP AMS – Networks Europe', 'In Progress', 68, '2027-01-04', '2027-03-12', '2027-02-26', 'F. Moreau', 'V. Reddy', 45, 'L2/L3 application management for the Networks S/4HANA core: FI/CO, MM, PM, batch and interface operations', 'Moves the SAP AMS run team from the France delivery centre to Pune; month-end close support is the go-live gate.'),
  P('p-sap-fico', 'su-sap', 'SAP FI/CO & S/4 rollout support – Networks', 'On Track', 60, '2027-01-11', '2027-03-26', '2027-03-19', 'F. Moreau', 'V. Reddy', 26, 'Rollout and hypercare support for the S/4HANA finance template across the Networks entities in France and Belgium', 'Receives the rollout support squad from France; localisation knowledge for FR / BE tax is the critical KT item.'),
  P('p-ms-d365', 'su-bizapps', 'Business Applications support – Renewables NA', 'In Progress', 62, '2027-01-04', '2027-03-12', '2027-02-26', 'J. Carter', 'M. Khan', 24, 'Support for Salesforce, Dynamics 365 and the asset-management applications of Renewables & Flexible Power North America', 'Transfers the application support pod from Houston to Pune; release calendar aligned to the summer peak freeze.'),
  P('p-ms-power', 'su-bizapps', 'Renewables asset & trading apps – NA', 'At Risk', 48, '2027-01-18', '2027-03-26', '2027-03-19', 'T. Nguyen', 'M. Khan', 12, 'Support for the wind / solar asset performance and energy-trading applications used by Renewables North America', 'Trading application knowledge sits with two US engineers – the main readiness risk for this project.'),
  // Wave 2 – Data, Analytics & AI
  P('p-data-eng', 'su-dataeng', 'Data Engineering run team', 'On Track', 70, '2027-01-04', '2027-03-12', '2027-02-26', 'B. Müller', 'S. Iyer', 32, 'Pipeline operations (Databricks / ADF), data quality monitoring and lakehouse access management for the Group data platform', 'Build / transition of the data engineering run team; takes over the overnight pipeline window first.'),
  P('p-data-plat', 'su-dataplat', 'Data Platforms (Databricks / Azure)', 'In Progress', 55, '2027-01-11', '2027-03-19', '2027-03-12', 'B. Müller', 'S. Iyer', 9, 'Platform engineering for the lakehouse: workspaces, clusters, cost governance, platform upgrades', 'Platform team built around the Europe data platform leads; cost governance handed over last.'),
  P('p-data-bi', 'su-bi', 'BI / Analytics – Power BI build', 'In Progress', 50, '2027-01-18', '2027-03-26', '2027-03-19', 'H. Jansen', 'S. Iyer', 7, 'Power BI semantic models, report build and refresh operations for Group finance and GBU reporting', 'Build of the BI delivery team in Pune; first reports migrated for Group finance.'),
  P('p-data-mlops', 'su-ai', 'AI / Automation CoE', 'At Risk', 30, '2027-02-01', '2027-04-16', '2027-04-09', 'H. Jansen', 'S. Iyer', 5, 'GenAI use-case delivery, MLOps pipelines and process automation (RPA) for the GBUs', 'Build of the AI / automation centre of excellence; model-governance controls still under review.'),
  // Wave 3 (Mar 2027) – Digital Workplace
  P('p-euc', 'su-euc', 'End User Computing – Europe', 'In Progress', 15, '2027-02-15', '2027-04-09', '2027-03-29', 'P. Rousseau', 'K. Nair', 27, 'Endpoint engineering (Intune / SCCM), device lifecycle, application packaging and workplace L2 support', 'Transfers the EUC engineering team from the Europe workplace hub; KT started mid-February.'),
  P('p-service-desk', 'su-service-desk', 'Service Desk build (L1)', 'In Progress', 12, '2027-02-15', '2027-04-09', '2027-03-29', 'P. Rousseau', 'K. Nair', 7, 'L1 service desk for the Group IT catalogue: ticket logging, triage and first-time resolution', 'Build of a Pune L1 desk complementing the Europe desk; takes the APAC hours first.'),
  P('p-collab', 'su-collab', 'Collaboration (M365 / Teams)', 'Not Started', 0, '2027-03-01', '2027-04-16', '2027-04-09', 'E. Rossi', 'K. Nair', 3, 'Microsoft 365 tenant operations, Teams telephony and SharePoint support', 'Small build; starts with the M365 tenant operations runbooks.'),
  P('p-wp-support', 'su-wp-support', 'Workplace Support – France', 'Not Started', 0, '2027-03-01', '2027-04-16', '2027-04-09', 'C. Martin', 'K. Nair', 3, 'Remote workplace support for the France sites: VIP support, meeting-room technology, printing', 'Build of a remote support pod for the France sites, working with the Paris onsite team.'),
  // Wave 3 – IT Service Management
  P('p-svcmgmt', 'su-svcmgmt', 'Service Management (ServiceNow)', 'In Progress', 18, '2027-02-15', '2027-04-09', '2027-03-29', 'D. Novak', 'D. Singh', 18, 'Service delivery management, SLA reporting and ServiceNow process ownership for the Group IT services', 'Build / transition of service managers from the Europe ITSM team; SLA reporting moves first.'),
  P('p-incident', 'su-incident', 'Incident / Problem Management', 'In Progress', 10, '2027-02-22', '2027-04-09', '2027-03-29', 'D. Novak', 'D. Singh', 6, 'Major incident management, problem management and post-incident reviews', 'Build of the incident / problem desk; shadowing the Europe major-incident managers.'),
  P('p-change', 'su-change', 'Change / Release Management', 'Not Started', 0, '2027-03-01', '2027-04-16', '2027-04-09', 'E. Rossi', 'D. Singh', 4, 'Change advisory, release calendar and change-risk assessment', 'Build; CAB secretariat moves to Pune after the Wave 3 go-live.'),
  P('p-asset', 'su-asset', 'IT Asset / Configuration (CMDB)', 'Not Started', 0, '2027-03-01', '2027-04-16', '2027-04-09', 'E. Rossi', 'D. Singh', 3, 'Hardware / software asset management, licence compliance and CMDB data quality', 'Build; CMDB data-quality reporting is the first service.'),
  // Wave 4 (Apr 2027) – Integration & Engineering
  P('p-api', 'su-api', 'API / Integration platform build', 'Not Started', 0, '2027-04-01', '2027-05-21', '2027-05-14', 'T. Okafor', 'M. Khan', 14, 'Integration engineering on the Group API platform (MuleSoft / Azure Integration Services): new interfaces, platform operations', 'Build of the integration engineering team; starts with the interface backlog of the Networks SAP programme.'),
  P('p-devops', 'su-devops', 'DevOps – build (CI/CD platform)', 'Not Started', 0, '2027-04-01', '2027-05-21', '2027-05-14', 'T. Okafor', 'M. Khan', 7, 'CI/CD pipelines, infrastructure as code and platform engineering for the GBU application teams', 'Build; pairs with the Europe platform engineering leads through May.'),
  P('p-appeng', 'su-appeng', 'Application Engineering squad', 'Not Started', 0, '2027-04-12', '2027-05-28', '2027-05-21', 'E. Rossi', 'M. Khan', 3, 'Full-stack engineering for internal applications of the GBUs', 'Build; first squad onboarded to the Renewables digital backlog.'),
  P('p-testing', 'su-testing', 'Testing / QA automation', 'Not Started', 0, '2027-04-12', '2027-05-28', '2027-05-21', 'E. Rossi', 'M. Khan', 2, 'Test automation framework, regression suites and performance testing for the application teams', 'Build; consolidates regression testing of the SAP and business applications into one hub.'),
]

/* ------------------------------------------------------------------ */
/* Accounts onboarded through the projects                             */
/* ------------------------------------------------------------------ */
export const ACCOUNT_TYPES = ['Application', 'Service', 'Business entity', 'Platform'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]
export const ACCOUNT_STATUSES = ['Planned', 'In KT', 'Onboarded', 'Live', 'On hold'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export interface TransitionAccount {
  id: string
  projectId: string
  businessUnit: string
  name: string // e.g. "ENGIE Networks – SAP FI/CO Europe"
  gbu: string
  geography: string
  type: AccountType
  status: AccountStatus
  plannedDate: string
  onboardedDate?: string
  owner: string
  notes: string
}

export const isOnboarded = (a: TransitionAccount) => a.status === 'Onboarded' || a.status === 'Live'
export const accountStatusColor: Record<AccountStatus, string> = { Planned: '#BFD7F7', 'In KT': '#5B9BF0', Onboarded: '#16A34A', Live: '#0F766E', 'On hold': '#F59E0B' }

let accN = 0
const A = (projectId: string, name: string, type: AccountType, status: AccountStatus, plannedDate: string, onboardedDate?: string, notes = '', gbu?: string, geography?: string, owner?: string): TransitionAccount => {
  accN++
  const p = seedProjects.find((x) => x.id === projectId)!
  return { id: `acc-${String(accN).padStart(3, '0')}`, projectId, businessUnit: p.businessUnit, name, gbu: gbu ?? p.gbu, geography: geography ?? p.region, type, status, plannedDate, onboardedDate: onboardedDate ?? (isOnboarded({ status } as TransitionAccount) ? plannedDate : undefined), owner: owner ?? p.globalOwner, notes }
}
const GROUP = 'Group / GBS / Shared IT', NET = 'Networks', REN = 'Renewables & Flexible Power', LEI = 'Local Energy Infrastructure', SEM = 'Supply & Energy Management'

export const seedAccounts: TransitionAccount[] = [
  // Cloud Operations
  A('p-cloud-ops', 'Group – Azure landing zone', 'Platform', 'Live', '2026-11-30', '2026-11-27', 'Hub-and-spoke landing zone; 24x7 from Pune', GROUP),
  A('p-cloud-ops', 'Group – AWS organisation (Renewables workloads)', 'Platform', 'Live', '2026-12-14', '2026-12-11', '', REN, 'Americas'),
  A('p-cloud-ops', 'Networks – SAP on Azure hosting', 'Service', 'Live', '2026-12-14', '2026-12-14', 'HANA large instances; change windows agreed with SAP AMS', NET, 'Europe'),
  A('p-cloud-ops', 'Supply & Energy Management – trading cloud environment', 'Service', 'Onboarded', '2027-01-15', '2027-01-18', 'Hypercare with the Brussels trading IT team', SEM, 'Europe'),
  A('p-cloud-ops', 'Group – FinOps reporting service', 'Service', 'Live', '2026-12-21', '2026-12-21', '', GROUP),
  A('p-cloud-ops', 'Local Energy Infrastructure – district heating IoT platform', 'Platform', 'On hold', '2027-02-15', undefined, 'Waiting for the OT security review', LEI, 'Europe'),
  // Network
  A('p-network', 'ENGIE France – WAN & site LAN operations', 'Service', 'Live', '2026-12-21', '2026-12-21', '', GROUP, 'Europe'),
  A('p-network', 'Group – SD-WAN platform (Cisco Meraki)', 'Platform', 'Live', '2026-12-21', '2026-12-18', '', GROUP),
  A('p-network', 'Group – firewall change execution (Palo Alto)', 'Service', 'Onboarded', '2027-01-15', '2027-01-12', 'Change execution only; policy design stays in France', GROUP),
  A('p-network', 'Networks – substation connectivity (France)', 'Service', 'Onboarded', '2027-01-29', '2027-02-02', 'Hypercare until mid-February', NET, 'Europe'),
  A('p-network', 'Renewables – wind-farm site connectivity (Americas)', 'Service', 'In KT', '2027-03-12', undefined, 'Follows the Wave 2 Renewables application transition', REN, 'Americas'),
  // Hosting
  A('p-hosting', 'Brussels data centre – server & storage operations', 'Service', 'Live', '2026-12-18', '2026-12-18', '', GROUP),
  A('p-hosting', 'Group – backup & restore service (Veeam)', 'Service', 'Live', '2026-12-18', '2026-12-18', '', GROUP),
  A('p-hosting', 'Group – disaster recovery drills', 'Service', 'Onboarded', '2027-01-29', '2027-01-29', 'First DR drill run from Pune on 29 Jan', GROUP),
  // Infrastructure Operations
  A('p-infra-ops', 'Group – infrastructure monitoring (Dynatrace)', 'Platform', 'Live', '2026-12-28', '2026-12-28', '', GROUP),
  A('p-infra-ops', 'Group – job scheduling (Control-M)', 'Service', 'Onboarded', '2027-01-15', '2027-01-15', '', GROUP),
  A('p-infra-ops', 'Netherlands – capacity & availability reporting', 'Service', 'Onboarded', '2027-01-29', '2027-02-01', '', GROUP, 'Europe'),
  // IAM
  A('p-iam', 'Group – Active Directory & Entra ID operations', 'Platform', 'Live', '2026-12-11', '2026-12-11', '', GROUP),
  A('p-iam', 'Group – joiner / mover / leaver service', 'Service', 'Live', '2026-12-11', '2026-12-11', '', GROUP),
  A('p-iam', 'Group – privileged access management (CyberArk)', 'Platform', 'Live', '2026-12-18', '2026-12-18', '', GROUP),
  A('p-iam', 'Networks – SAP role & access certification', 'Service', 'Onboarded', '2027-01-29', '2027-01-29', 'Q4 certification cycle run from Pune', NET, 'Europe'),
  A('p-iam', 'Renewables NA – application access requests', 'Service', 'Onboarded', '2027-02-12', '2027-02-12', '', REN, 'Americas'),
  // SOC
  A('p-secops', 'Group SOC – alert triage L1 (APAC & Europe shifts)', 'Service', 'Live', '2027-01-04', '2027-01-04', '', GROUP),
  A('p-secops', 'Group – SIEM platform operations (Sentinel)', 'Platform', 'Onboarded', '2027-01-29', '2027-02-01', '', GROUP),
  A('p-secops', 'Group – phishing & email security response', 'Service', 'Onboarded', '2027-02-12', '2027-02-12', '', GROUP),
  A('p-secops', 'Supply & Energy Management – trading platform security monitoring', 'Service', 'In KT', '2027-03-05', undefined, 'Needs trading-platform log onboarding', SEM, 'Europe'),
  // Vulnerability
  A('p-vuln', 'Group – vulnerability scanning (Qualys)', 'Platform', 'Live', '2027-01-25', '2027-01-25', '', GROUP),
  A('p-vuln', 'Group – monthly vulnerability report', 'Service', 'Onboarded', '2027-02-05', '2027-02-05', '', GROUP),
  A('p-vuln', 'Networks – OT vulnerability assessments', 'Service', 'In KT', '2027-03-19', undefined, '', NET, 'Europe'),
  // Security engineering
  A('p-seceng', 'Group – SIEM content engineering', 'Service', 'In KT', '2027-03-15', undefined, '', GROUP),
  A('p-seceng', 'Group – EDR policy management (Defender)', 'Service', 'In KT', '2027-03-15', undefined, '', GROUP),
  A('p-seceng', 'Group – security automation (SOAR playbooks)', 'Platform', 'Planned', '2027-04-09', undefined, '', GROUP),
  // SAP AMS
  A('p-sap-ams', 'ENGIE Networks – SAP FI/CO Europe', 'Application', 'Onboarded', '2027-02-12', '2027-02-15', 'Hypercare; February close is the first from Pune', NET, 'Europe'),
  A('p-sap-ams', 'ENGIE Networks – SAP MM / procurement', 'Application', 'Onboarded', '2027-02-12', '2027-02-15', '', NET, 'Europe'),
  A('p-sap-ams', 'ENGIE Networks – SAP PM (asset maintenance)', 'Application', 'In KT', '2027-02-26', undefined, 'Work-order processes for the gas network entities', NET, 'Europe'),
  A('p-sap-ams', 'ENGIE Networks – SAP batch & interface operations', 'Service', 'In KT', '2027-02-26', undefined, '', NET, 'Europe'),
  A('p-sap-ams', 'GRDF – S/4HANA core (France)', 'Business entity', 'In KT', '2027-03-05', undefined, 'Largest Networks entity; dedicated support pod', NET, 'Europe'),
  A('p-sap-ams', 'GRTgaz – S/4HANA core (France)', 'Business entity', 'Planned', '2027-03-12', undefined, '', NET, 'Europe'),
  A('p-sap-ams', 'Storengy – SAP finance & logistics', 'Business entity', 'Planned', '2027-03-12', undefined, '', NET, 'Europe'),
  // SAP FI/CO rollout
  A('p-sap-fico', 'Networks France – S/4 finance template rollout support', 'Service', 'Onboarded', '2027-02-19', '2027-02-19', '', NET, 'Europe'),
  A('p-sap-fico', 'Networks Belgium (Fluxys interfaces) – FI/CO localisation', 'Business entity', 'In KT', '2027-03-12', undefined, 'BE tax localisation sessions pending', NET, 'Europe'),
  A('p-sap-fico', 'Networks – period-end close support', 'Service', 'In KT', '2027-03-05', undefined, '', NET, 'Europe'),
  A('p-sap-fico', 'Networks – SAP Analytics Cloud finance reporting', 'Application', 'Planned', '2027-03-19', undefined, '', NET, 'Europe'),
  // Business applications – Renewables NA
  A('p-ms-d365', 'Renewables NA – Salesforce', 'Application', 'Onboarded', '2027-02-12', '2027-02-12', 'Sales & PPA contract management', REN, 'Americas'),
  A('p-ms-d365', 'Renewables NA – Dynamics 365 Field Service', 'Application', 'Onboarded', '2027-02-19', '2027-02-19', '', REN, 'Americas'),
  A('p-ms-d365', 'Renewables NA – Maximo asset management', 'Application', 'In KT', '2027-02-26', undefined, '', REN, 'Americas'),
  A('p-ms-d365', 'Renewables NA – ServiceNow HR & IT catalogue', 'Application', 'In KT', '2027-03-05', undefined, '', REN, 'Americas'),
  A('p-ms-d365', 'Renewables NA – document management (SharePoint / OpenText)', 'Application', 'Planned', '2027-03-12', undefined, '', REN, 'Americas'),
  // Renewables asset & trading
  A('p-ms-power', 'Renewables NA – wind asset performance (Bazefield)', 'Application', 'In KT', '2027-03-05', undefined, '', REN, 'Americas'),
  A('p-ms-power', 'Renewables NA – solar monitoring (PowerFactors)', 'Application', 'In KT', '2027-03-12', undefined, '', REN, 'Americas'),
  A('p-ms-power', 'Renewables NA – energy trading & scheduling (ETRM)', 'Application', 'On hold', '2027-03-19', undefined, 'Knowledge held by two US engineers; retention plan pending', REN, 'Americas'),
  A('p-ms-power', 'Renewables NA – market settlements reporting', 'Service', 'Planned', '2027-03-19', undefined, '', REN, 'Americas'),
  // Data engineering
  A('p-data-eng', 'Group – data lakehouse pipeline operations', 'Platform', 'Onboarded', '2027-02-12', '2027-02-12', 'Overnight window run from Pune', GROUP),
  A('p-data-eng', 'Group finance – data marts (consolidation feeds)', 'Service', 'Onboarded', '2027-02-19', '2027-02-19', '', GROUP, 'Europe'),
  A('p-data-eng', 'Networks – smart-meter data pipelines', 'Service', 'In KT', '2027-02-26', undefined, '', NET, 'Europe'),
  A('p-data-eng', 'Renewables – asset telemetry ingestion', 'Service', 'In KT', '2027-03-05', undefined, '', REN, 'Global / Multi-region'),
  A('p-data-eng', 'Supply & Energy Management – market data feeds', 'Service', 'Planned', '2027-03-12', undefined, '', SEM, 'Europe'),
  A('p-data-eng', 'Group – data quality monitoring service', 'Service', 'Onboarded', '2027-02-19', '2027-02-22', '', GROUP),
  // Data platforms
  A('p-data-plat', 'Group – Databricks workspaces', 'Platform', 'Onboarded', '2027-02-19', '2027-02-19', '', GROUP),
  A('p-data-plat', 'Group – Azure Data Factory / Synapse', 'Platform', 'In KT', '2027-03-05', undefined, '', GROUP),
  A('p-data-plat', 'Group – platform cost governance', 'Service', 'Planned', '2027-03-12', undefined, 'Handed over last', GROUP),
  // BI
  A('p-data-bi', 'Group finance – Power BI reporting (monthly close pack)', 'Application', 'Onboarded', '2027-02-19', '2027-02-19', '', GROUP, 'Europe'),
  A('p-data-bi', 'Networks – operational dashboards', 'Application', 'In KT', '2027-03-05', undefined, '', NET, 'Europe'),
  A('p-data-bi', 'Renewables – asset performance dashboards', 'Application', 'Planned', '2027-03-19', undefined, '', REN, 'Global / Multi-region'),
  A('p-data-bi', 'Group – Power BI refresh operations', 'Service', 'In KT', '2027-03-05', undefined, '', GROUP),
  // AI / automation
  A('p-data-mlops', 'Group – GenAI assistant platform (Azure OpenAI)', 'Platform', 'In KT', '2027-03-26', undefined, '', GROUP),
  A('p-data-mlops', 'Group – RPA automation estate (UiPath)', 'Platform', 'Planned', '2027-04-09', undefined, '', GROUP),
  A('p-data-mlops', 'Supply & Energy Management – demand forecasting models', 'Service', 'On hold', '2027-04-09', undefined, 'Model-governance controls under review', SEM, 'Europe'),
  // EUC
  A('p-euc', 'Group – endpoint management (Intune / Autopilot)', 'Platform', 'In KT', '2027-03-29', undefined, '', GROUP),
  A('p-euc', 'Group – application packaging service', 'Service', 'In KT', '2027-03-29', undefined, '', GROUP),
  A('p-euc', 'ENGIE Europe – device lifecycle (Windows 11 estate)', 'Service', 'Planned', '2027-04-09', undefined, '', GROUP, 'Europe'),
  A('p-euc', 'Group – workplace L2 support', 'Service', 'Planned', '2027-04-09', undefined, '', GROUP),
  // Service desk
  A('p-service-desk', 'Group IT – L1 service desk (APAC hours)', 'Service', 'In KT', '2027-03-29', undefined, '', GROUP),
  A('p-service-desk', 'Group IT – L1 service desk (Europe hours)', 'Service', 'Planned', '2027-04-09', undefined, '', GROUP),
  A('p-service-desk', 'Renewables NA – application service desk', 'Service', 'Planned', '2027-04-09', undefined, '', REN, 'Americas'),
  // Collaboration
  A('p-collab', 'Group – Microsoft 365 tenant operations', 'Platform', 'Planned', '2027-04-09', undefined, '', GROUP),
  A('p-collab', 'Group – Teams telephony', 'Service', 'Planned', '2027-04-16', undefined, '', GROUP),
  A('p-collab', 'Group – SharePoint & OneDrive support', 'Service', 'Planned', '2027-04-16', undefined, '', GROUP),
  // Workplace support
  A('p-wp-support', 'ENGIE France – VIP & executive support', 'Service', 'Planned', '2027-04-09', undefined, '', GROUP, 'Europe'),
  A('p-wp-support', 'ENGIE France – meeting-room technology', 'Service', 'Planned', '2027-04-16', undefined, '', GROUP, 'Europe'),
  A('p-wp-support', 'ENGIE France – print services', 'Service', 'Planned', '2027-04-16', undefined, '', GROUP, 'Europe'),
  // Service management
  A('p-svcmgmt', 'Group IT – SLA & service reporting', 'Service', 'In KT', '2027-03-29', undefined, '', GROUP),
  A('p-svcmgmt', 'Group – ServiceNow process ownership (ITSM)', 'Platform', 'In KT', '2027-03-29', undefined, '', GROUP),
  A('p-svcmgmt', 'Networks – service delivery management', 'Service', 'Planned', '2027-04-09', undefined, '', NET, 'Europe'),
  A('p-svcmgmt', 'Renewables – service delivery management', 'Service', 'Planned', '2027-04-09', undefined, '', REN, 'Global / Multi-region'),
  A('p-svcmgmt', 'Local Energy Infrastructure – service delivery management', 'Service', 'Planned', '2027-04-16', undefined, '', LEI, 'Europe'),
  // Incident / problem
  A('p-incident', 'Group – major incident management', 'Service', 'In KT', '2027-03-29', undefined, '', GROUP),
  A('p-incident', 'Group – problem management & post-incident reviews', 'Service', 'Planned', '2027-04-09', undefined, '', GROUP),
  A('p-incident', 'Group – incident reporting (ServiceNow Performance Analytics)', 'Service', 'Planned', '2027-04-16', undefined, '', GROUP),
  // Change / release
  A('p-change', 'Group – change advisory board secretariat', 'Service', 'Planned', '2027-04-09', undefined, '', GROUP),
  A('p-change', 'Group – release calendar', 'Service', 'Planned', '2027-04-16', undefined, '', GROUP),
  A('p-change', 'Networks – SAP change & transport governance', 'Service', 'Planned', '2027-04-16', undefined, '', NET, 'Europe'),
  // Asset / CMDB
  A('p-asset', 'Group – CMDB data quality', 'Service', 'Planned', '2027-04-09', undefined, '', GROUP),
  A('p-asset', 'Group – software asset & licence compliance', 'Service', 'Planned', '2027-04-16', undefined, '', GROUP),
  A('p-asset', 'Group – hardware asset lifecycle', 'Service', 'Planned', '2027-04-16', undefined, '', GROUP),
  // API / integration
  A('p-api', 'Group – API platform operations (MuleSoft)', 'Platform', 'Planned', '2027-05-14', undefined, '', GROUP),
  A('p-api', 'Networks – SAP interface backlog (PI/PO to AIS)', 'Service', 'Planned', '2027-05-14', undefined, '', NET, 'Europe'),
  A('p-api', 'Renewables – asset data integrations', 'Service', 'Planned', '2027-05-21', undefined, '', REN, 'Global / Multi-region'),
  A('p-api', 'Supply & Energy Management – market-data integrations', 'Service', 'Planned', '2027-05-28', undefined, '', SEM, 'Europe'),
  // DevOps
  A('p-devops', 'Group – CI/CD platform (Azure DevOps / GitHub)', 'Platform', 'Planned', '2027-05-14', undefined, '', GROUP),
  A('p-devops', 'Group – infrastructure as code (Terraform modules)', 'Service', 'Planned', '2027-05-21', undefined, '', GROUP),
  A('p-devops', 'Renewables – digital products pipelines', 'Service', 'Planned', '2027-05-28', undefined, '', REN, 'Global / Multi-region'),
  // Application engineering
  A('p-appeng', 'Renewables – digital backlog (customer portal)', 'Application', 'Planned', '2027-05-21', undefined, '', REN, 'Global / Multi-region'),
  A('p-appeng', 'Local Energy Infrastructure – district energy portal', 'Application', 'Planned', '2027-05-28', undefined, '', LEI, 'Europe'),
  A('p-appeng', 'Group – internal tools (Power Apps estate)', 'Application', 'Planned', '2027-05-28', undefined, '', GROUP),
  // Testing
  A('p-testing', 'Networks – SAP regression suite', 'Service', 'Planned', '2027-05-21', undefined, '', NET, 'Europe'),
  A('p-testing', 'Renewables NA – business applications regression', 'Service', 'Planned', '2027-05-28', undefined, '', REN, 'Americas'),
  A('p-testing', 'Group – performance testing service', 'Service', 'Planned', '2027-05-28', undefined, '', GROUP),
]

export function accountStats(list: TransitionAccount[]) {
  const by = (s: AccountStatus) => list.filter((a) => a.status === s).length
  const onboarded = list.filter(isOnboarded).length
  return { total: list.length, onboarded, live: by('Live'), onboardedOnly: by('Onboarded'), inKt: by('In KT'), planned: by('Planned'), onHold: by('On hold'), pct: list.length ? Math.round((onboarded / list.length) * 100) : 0 }
}
export const projectAccounts = (p: TransitionProject | string, list: TransitionAccount[]) => accountStats(list.filter((a) => a.projectId === (typeof p === 'string' ? p : p.id)))
export const unitAccounts = (unit: string, list: TransitionAccount[]) => accountStats(list.filter((a) => a.businessUnit === unit))

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

/** The four waves of the client's footprint slide (Nov 2026 – Apr 2027). */
export const seedWaves: Wave[] = [
  { id: 'wave-1', number: 1, name: 'Foundations – Cloud, Network, Identity & Security', startDate: '2026-11-01', endDate: '2026-12-31', status: 'Completed', color: WAVE_COLORS[0], lead: 'R. Mehta' },
  { id: 'wave-2', number: 2, name: 'Enterprise Applications & Data', startDate: '2027-01-01', endDate: '2027-02-28', status: 'In Progress', color: WAVE_COLORS[1], lead: 'V. Reddy' },
  { id: 'wave-3', number: 3, name: 'Workplace & Service Management', startDate: '2027-03-01', endDate: '2027-03-31', status: 'On Track', color: WAVE_COLORS[2], lead: 'K. Nair' },
  { id: 'wave-4', number: 4, name: 'Integration & DevOps – build', startDate: '2027-04-01', endDate: '2027-04-30', status: 'Not Started', color: WAVE_COLORS[3], lead: 'M. Khan' },
]

export const waveLabel = (n: number) => `Wave ${n}`
export const waveIsActive = (w: Wave, projects: TransitionProject[] = []) => w.status !== 'Completed' && (['In Progress', 'On Track', 'At Risk', 'Delayed'].includes(w.status) || waveProgress(w, projects) > 0)
export const waveHasStarted = (w: Wave, today = TODAY) => w.startDate <= today
export const waveProjects = (w: Wave | number, projects: TransitionProject[]) => { const n = typeof w === 'number' ? w : w.number; return projects.filter((p) => p.wave === n) }
/** Business units in a wave – derived from its projects (first-seen order). */
export const waveUnits = (w: Wave | number, projects: TransitionProject[]) => Array.from(new Set(waveProjects(w, projects).map((p) => p.businessUnit)))
/** Capabilities in a wave – derived from its projects (first-seen order). */
export const waveCapabilities = (w: Wave | number, projects: TransitionProject[]) => Array.from(new Set(waveProjects(w, projects).map((p) => p.capability).filter(Boolean)))
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
export const seedMilestoneWaves: MilestoneWave[] = [{ id: 'ms-039', wave: 3 }, { id: 'ms-003', wave: 2 }, { id: 'ms-007', wave: 4 }, { id: 'ms-010', wave: 1 }, { id: 'ms-037', wave: 2 }]

export interface MilestoneProject { id: string; projectId: string } // id = milestone id
export const seedMilestoneProjects: MilestoneProject[] = [
  { id: 'ms-035', projectId: 'p-sap-fico' },
  { id: 'ms-036', projectId: 'p-cloud-ops' },
  { id: 'ms-038', projectId: 'p-sap-ams' },
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
  /** Date the global owner signed off (set when signOff becomes 'Signed'); drives the burndown. */
  signedOffOn?: string
}

export const ktStatusFor = (planned: number, done: number): KtStatus => (done >= planned && planned > 0 ? 'Completed' : done > 0 ? 'In Progress' : 'Not Started')
/** Pending = not yet signed off; completed = signed off. */
export const ktIsCompleted = (k: KtItem) => k.signOff === 'Signed'
export const ktIsPending = (k: KtItem) => !ktIsCompleted(k)
export const ktIsOverdue = (k: KtItem, today = TODAY) => ktIsPending(k) && k.targetDate < today
export const ktDueThisMonth = (k: KtItem, today = TODAY) => ktIsPending(k) && k.targetDate.slice(0, 7) === today.slice(0, 7)

let ktN = 0
/** done = sessions delivered; sign = 'S' signed, 'P' pending sign-off (all sessions delivered), undefined = follows the sessions. */
const K = (projectId: string, process: string, planned: number, done: number, targetDate: string, signedOffOn?: string): KtItem => {
  ktN++
  const p = seedProjects.find((x) => x.id === projectId)!
  const status = ktStatusFor(planned, done)
  const signOff: KtSignOff = signedOffOn ? 'Signed' : status === 'Completed' ? 'Pending' : status === 'In Progress' ? 'Pending' : 'Not Started'
  return {
    id: `kt-${String(ktN).padStart(3, '0')}`, projectId, businessUnit: p.businessUnit, process, wave: p.wave, globalOwner: p.globalOwner, indiaOwner: p.indiaLead,
    sessionsPlanned: planned, sessionsDone: done, status, signOff, targetDate, signedOffOn,
  }
}

export const seedKtItems: KtItem[] = [
  // Wave 1 – signed off except a few late sign-offs and the security engineering build
  K('p-cloud-ops', 'Landing zone operations & monitoring', 8, 8, '2026-11-27', '2026-11-27'),
  K('p-cloud-ops', 'Incident & change handling (cloud)', 6, 6, '2026-12-11', '2026-12-10'),
  K('p-cloud-ops', 'FinOps reporting & cost anomalies', 4, 4, '2026-12-18', '2026-12-21'),
  K('p-network', 'WAN / LAN operations runbooks', 8, 8, '2026-12-04', '2026-12-04'),
  K('p-network', 'Firewall change execution', 6, 6, '2026-12-18', '2026-12-22'),
  K('p-network', 'Substation connectivity (Networks France)', 5, 5, '2027-01-22', '2027-01-29'),
  K('p-hosting', 'Server & storage operations', 6, 6, '2026-12-04', '2026-12-04'),
  K('p-hosting', 'Backup, restore & DR drills', 5, 5, '2026-12-18', '2026-12-18'),
  K('p-infra-ops', 'Monitoring & event handling (Dynatrace)', 5, 5, '2026-12-11', '2026-12-11'),
  K('p-infra-ops', 'Job scheduling operations (Control-M)', 4, 4, '2027-01-08', '2027-01-12'),
  K('p-iam', 'Joiner / mover / leaver processing', 6, 6, '2026-11-27', '2026-11-27'),
  K('p-iam', 'Privileged access operations (CyberArk)', 6, 6, '2026-12-11', '2026-12-11'),
  K('p-iam', 'SAP access certification (Networks)', 5, 5, '2027-01-22', '2027-01-29'),
  K('p-secops', 'Alert triage & escalation (L1)', 8, 8, '2026-12-18', '2026-12-18'),
  K('p-secops', 'SIEM platform operations (Sentinel)', 6, 6, '2027-01-22', '2027-01-29'),
  K('p-secops', 'Trading platform security monitoring', 5, 2, '2027-03-05'),
  K('p-vuln', 'Scanning & remediation tracking (Qualys)', 5, 5, '2027-01-15', '2027-01-20'),
  K('p-vuln', 'Monthly vulnerability reporting', 3, 3, '2027-02-05'),
  K('p-vuln', 'OT vulnerability assessments', 4, 1, '2027-03-19'),
  K('p-seceng', 'SIEM content engineering', 6, 4, '2027-03-05'),
  K('p-seceng', 'EDR policy management (Defender)', 5, 2, '2027-03-12'),
  K('p-seceng', 'Security automation playbooks', 4, 0, '2027-04-02'),
  // Wave 2 – in progress
  K('p-sap-ams', 'Incident & service request handling (L2)', 8, 8, '2027-02-05', '2027-02-08'),
  K('p-sap-ams', 'Month-end close support (FI/CO)', 6, 6, '2027-02-19'),
  K('p-sap-ams', 'Batch & interface monitoring', 6, 4, '2027-02-26'),
  K('p-sap-ams', 'Plant maintenance (PM) work-order processes', 6, 2, '2027-03-05'),
  K('p-sap-fico', 'Finance template configuration support', 8, 6, '2027-02-26'),
  K('p-sap-fico', 'Period-end close support', 6, 4, '2027-03-05'),
  K('p-sap-fico', 'FR / BE tax localisation', 6, 1, '2027-03-19'),
  K('p-ms-d365', 'Salesforce case & release management', 6, 6, '2027-02-05', '2027-02-09'),
  K('p-ms-d365', 'Dynamics 365 Field Service support', 6, 5, '2027-02-19'),
  K('p-ms-d365', 'Maximo asset management support', 6, 2, '2027-03-05'),
  K('p-ms-power', 'Wind asset performance (Bazefield)', 6, 4, '2027-02-26'),
  K('p-ms-power', 'Solar monitoring (PowerFactors)', 5, 2, '2027-03-12'),
  K('p-ms-power', 'Energy trading & scheduling (ETRM)', 6, 0, '2027-03-19'),
  K('p-data-eng', 'Pipeline operations (Databricks / ADF)', 8, 8, '2027-02-05', '2027-02-08'),
  K('p-data-eng', 'Data quality monitoring', 6, 6, '2027-02-12', '2027-02-15'),
  K('p-data-eng', 'Smart-meter & telemetry pipelines', 6, 3, '2027-03-05'),
  K('p-data-eng', 'Lakehouse access management', 4, 2, '2027-02-19'),
  K('p-data-plat', 'Databricks workspace administration', 6, 6, '2027-02-19'),
  K('p-data-plat', 'ADF / Synapse platform operations', 6, 3, '2027-03-05'),
  K('p-data-plat', 'Platform cost governance', 4, 1, '2027-03-12'),
  K('p-data-bi', 'Semantic model & report build', 6, 5, '2027-02-19'),
  K('p-data-bi', 'Refresh operations & monitoring', 4, 2, '2027-03-05'),
  K('p-data-bi', 'GBU dashboard migration', 6, 1, '2027-03-19'),
  K('p-data-mlops', 'GenAI platform operations', 6, 2, '2027-03-26'),
  K('p-data-mlops', 'MLOps pipelines & model registry', 6, 1, '2027-04-02'),
  K('p-data-mlops', 'RPA estate support (UiPath)', 4, 0, '2027-04-09'),
  // Wave 3 – starting
  K('p-euc', 'Endpoint management (Intune / Autopilot)', 8, 3, '2027-03-19'),
  K('p-euc', 'Application packaging', 6, 1, '2027-03-26'),
  K('p-euc', 'Workplace L2 support runbooks', 6, 0, '2027-04-02'),
  K('p-service-desk', 'Ticket logging & triage (ServiceNow)', 6, 2, '2027-03-19'),
  K('p-service-desk', 'Knowledge base & first-time resolution', 5, 0, '2027-03-26'),
  K('p-collab', 'Microsoft 365 tenant operations', 5, 0, '2027-03-26'),
  K('p-collab', 'Teams telephony support', 4, 0, '2027-04-09'),
  K('p-wp-support', 'VIP & meeting-room support (France)', 5, 0, '2027-03-26'),
  K('p-wp-support', 'Print services', 3, 0, '2027-04-09'),
  K('p-svcmgmt', 'SLA & service reporting', 6, 2, '2027-03-19'),
  K('p-svcmgmt', 'ServiceNow ITSM process ownership', 6, 1, '2027-03-26'),
  K('p-svcmgmt', 'GBU service delivery reviews', 5, 0, '2027-04-09'),
  K('p-incident', 'Major incident management', 6, 1, '2027-03-19'),
  K('p-incident', 'Problem management & post-incident reviews', 5, 0, '2027-04-02'),
  K('p-change', 'Change advisory board secretariat', 5, 0, '2027-04-02'),
  K('p-change', 'Release calendar & change-risk assessment', 4, 0, '2027-04-09'),
  K('p-asset', 'CMDB data quality', 5, 0, '2027-04-02'),
  K('p-asset', 'Licence compliance (SAM)', 4, 0, '2027-04-09'),
  // Wave 4 – not started
  K('p-api', 'API platform operations (MuleSoft)', 6, 0, '2027-05-07'),
  K('p-api', 'Interface development standards', 6, 0, '2027-05-14'),
  K('p-api', 'SAP interface backlog (PI/PO to AIS)', 6, 0, '2027-05-21'),
  K('p-devops', 'CI/CD pipeline standards', 6, 0, '2027-05-07'),
  K('p-devops', 'Infrastructure as code (Terraform modules)', 5, 0, '2027-05-14'),
  K('p-appeng', 'Renewables digital backlog onboarding', 6, 0, '2027-05-14'),
  K('p-appeng', 'Engineering practices & code review', 4, 0, '2027-05-21'),
  K('p-testing', 'Test automation framework onboarding', 5, 0, '2027-05-14'),
  K('p-testing', 'SAP regression suite handover', 6, 0, '2027-05-21'),
]

export function ktStats(items: KtItem[]) {
  const planned = items.reduce((s, i) => s + i.sessionsPlanned, 0)
  const done = items.reduce((s, i) => s + Math.min(i.sessionsDone, i.sessionsPlanned), 0)
  const pct = planned ? Math.round((done / planned) * 100) : 0
  const count = (st: KtStatus) => items.filter((i) => i.status === st).length
  const signed = items.filter(ktIsCompleted).length
  const pending = items.length - signed
  const inProgress = items.filter((i) => ktIsPending(i) && i.sessionsDone > 0).length
  return {
    planned, done, pct, total: items.length, completed: count('Completed'), inProgress: count('In Progress'), notStarted: count('Not Started'), signed,
    /** sign-off view: completed = signed off, pending = not yet signed off */
    pending, pendingInProgress: inProgress, pendingNotStarted: pending - inProgress, awaitingSignOff: items.filter((i) => i.status === 'Completed' && !ktIsCompleted(i)).length,
    completedPct: items.length ? Math.round((signed / items.length) * 100) : 0,
    overdue: items.filter((i) => ktIsOverdue(i)).length, dueThisMonth: items.filter((i) => ktDueThisMonth(i)).length,
  }
}
export const projectKt = (p: TransitionProject | string, kt: KtItem[]) => ktStats(kt.filter((k) => k.projectId === (typeof p === 'string' ? p : p.id)))
export const unitKt = (unit: string, kt: KtItem[]) => ktStats(kt.filter((k) => k.businessUnit === unit))

/** "YYYY-MM" of the n-th ramp month (0 = Nov 2026). */
export const rampMonthKey = (i: number) => { const [y, m] = RAMP_START.split('-').map(Number); const t = m - 1 + i; return `${y + Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}` }
/**
 * KT burndown over the ramp months: planned pending items (by target date) vs actual pending items (by sign-off date,
 * up to the current month). Ends two months after the last target date.
 */
export function ktBurndown(items: KtItem[], today = TODAY) {
  const last = items.reduce((m, k) => (k.targetDate > m ? k.targetDate : m), today).slice(0, 7)
  const nowKey = today.slice(0, 7)
  const rows: { month: string; key: string; Planned: number; Actual: number | null }[] = []
  for (let i = 0; i < RAMP_MONTHS.length; i++) {
    const key = rampMonthKey(i)
    const planned = items.filter((k) => k.targetDate.slice(0, 7) > key).length
    const actual = key <= nowKey ? items.filter((k) => !(ktIsCompleted(k) && (k.signedOffOn ?? k.targetDate).slice(0, 7) <= key)).length : null
    rows.push({ month: RAMP_MONTHS[i], key, Planned: planned, Actual: actual })
    if (key > last && i >= 1) break
  }
  return rows
}

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
  return { id: `ra-${projectId}`, projectId, businessUnit: p.businessUnit, wave: p.wave, people: v(0), process: v(1), technology: v(2), facilities: v(3), controls: v(4), status, nextAction, assessedOn: '2027-02-16' }
}
export const seedReadinessAssessments: ReadinessAssessment[] = [
  RA('p-cloud-ops', 96, 'Completed', 'Hand over to steady-state service governance'),
  RA('p-network', 90, 'On Track', 'Exit hypercare with the France NOC'),
  RA('p-hosting', 94, 'Completed', 'Schedule the Q2 DR drill from Pune'),
  RA('p-infra-ops', 86, 'On Track', 'Confirm shift handover checklist with the Netherlands team'),
  RA('p-iam', 95, 'Completed', 'Close the Wave 1 lessons-learned review'),
  RA('p-secops', 84, 'On Track', 'Onboard trading platform logs to Sentinel'),
  RA('p-vuln', 80, 'On Track', 'Agree OT assessment scope with Networks'),
  RA('p-seceng', 62, 'On Track', 'Complete EDR policy KT with the Europe security engineers'),
  RA('p-sap-ams', 78, 'On Track', 'Close batch & interface monitoring KT before the Feb close'),
  RA('p-sap-fico', 70, 'On Track', 'Complete FR / BE tax localisation sessions'),
  RA('p-ms-d365', 74, 'On Track', 'Confirm summer release freeze with Renewables NA'),
  RA('p-ms-power', 52, 'At Risk', 'Secure ETRM KT slots with the two Houston engineers'),
  RA('p-data-eng', 76, 'On Track', 'Validate the overnight pipeline runbook'),
  RA('p-data-plat', 68, 'On Track', 'Agree platform change windows with the Europe leads'),
  RA('p-data-bi', 64, 'On Track', 'Finalise the Networks dashboard migration list'),
  RA('p-data-mlops', 44, 'At Risk', 'Complete the model-governance control review'),
  RA('p-euc', 48, 'On Track', 'Provision the Intune test tenant for Pune'),
  RA('p-service-desk', 46, 'On Track', 'Agree APAC-hours routing in ServiceNow'),
  RA('p-collab', 30, 'Not Started', 'Confirm M365 admin role model'),
  RA('p-wp-support', 28, 'Not Started', 'Agree remote-support tooling with the Paris onsite team'),
  RA('p-svcmgmt', 50, 'On Track', 'Baseline SLA reports for all GBUs'),
  RA('p-incident', 42, 'On Track', 'Shadow two major incidents with the Europe MIM team'),
  RA('p-change', 26, 'Not Started', 'Confirm CAB calendar and tooling access'),
  RA('p-asset', 24, 'Not Started', 'Baseline CMDB data-quality report'),
  RA('p-api', 22, 'Not Started', 'Confirm MuleSoft licences and sandbox for Pune'),
  RA('p-devops', 20, 'Not Started', 'Agree CI/CD platform standards with Europe platform engineering'),
  RA('p-appeng', 14, 'Not Started', 'Confirm Renewables digital backlog ownership'),
  RA('p-testing', 12, 'Not Started', 'Inventory SAP regression suites'),
]

/* ------------------------------------------------------------------ */
/* Readiness gaps (20 = 6 New | 14 Resolved)                           */
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
  G('p-sap-ams', 'Technology & Data', 'Batch & interface monitoring access for the Pune AMS team not provisioned', 'High', 'R. Mehta', 'New', '2027-02-14', '2027-02-28'),
  G('p-ms-power', 'People & Organization', 'ETRM knowledge held by two Houston engineers only', 'Critical', 'M. Khan', 'New', '2027-02-15', '2027-03-05'),
  G('p-data-mlops', 'Controls & Compliance', 'Model-governance controls for the AI platform not reviewed', 'Medium', 'P. Rao', 'New', '2027-02-17', '2027-03-20'),
  G('p-euc', 'Facilities & Infrastructure', 'Intune test tenant and device lab not set up in Pune', 'Medium', 'K. Nair', 'New', '2027-02-18', '2027-03-12'),
  G('p-svcmgmt', 'Process & Governance', 'SLA reporting baseline not agreed with the GBUs', 'High', 'D. Singh', 'New', '2027-02-19', '2027-03-12'),
  G('p-sap-fico', 'People & Organization', 'FR / BE tax localisation SME availability not confirmed', 'High', 'V. Reddy', 'New', '2027-02-20', '2027-03-05'),
  G('p-cloud-ops', 'People & Organization', 'Cloud operations shadowing schedule not confirmed', 'Medium', 'R. Mehta', 'Resolved', '2026-11-02', '2026-11-10'),
  G('p-cloud-ops', 'Technology & Data', 'Azure privileged roles not mapped for the Pune engineers', 'High', 'P. Rao', 'Resolved', '2026-11-04', '2026-11-18'),
  G('p-network', 'Facilities & Infrastructure', 'NOC bay network cabling in Pune incomplete', 'Medium', 'K. Nair', 'Resolved', '2026-11-06', '2026-11-20'),
  G('p-network', 'Process & Governance', 'Escalation matrix for the France NOC not published', 'Medium', 'R. Mehta', 'Resolved', '2026-11-12', '2026-11-26'),
  G('p-iam', 'Controls & Compliance', 'SoD matrix not updated for IAM operations roles', 'High', 'P. Rao', 'Resolved', '2026-11-08', '2026-11-22'),
  G('p-iam', 'Technology & Data', 'CyberArk vault access missing for Pune IAM team', 'Medium', 'R. Mehta', 'Resolved', '2026-11-15', '2026-11-29'),
  G('p-hosting', 'Process & Governance', 'Backup runbooks reference the Brussels ticket queue', 'Low', 'R. Mehta', 'Resolved', '2026-11-20', '2026-12-04'),
  G('p-secops', 'People & Organization', 'SOC shift roster for APAC hours not approved', 'Medium', 'P. Rao', 'Resolved', '2026-12-01', '2026-12-15'),
  G('p-infra-ops', 'Technology & Data', 'Control-M agent access for the Pune desk pending', 'Medium', 'R. Mehta', 'Resolved', '2026-12-05', '2026-12-19'),
  G('p-sap-ams', 'Facilities & Infrastructure', 'Wave 2 SAP AMS seating plan not signed off', 'Low', 'K. Nair', 'Resolved', '2027-01-05', '2027-01-12'),
  G('p-ms-d365', 'Process & Governance', 'Release SOP references the Houston ticketing queue', 'Low', 'M. Khan', 'Resolved', '2027-01-08', '2027-01-22'),
  G('p-ms-d365', 'Technology & Data', 'Salesforce sandbox access missing for the Pune pod', 'Medium', 'R. Mehta', 'Resolved', '2027-01-10', '2027-01-24'),
  G('p-data-eng', 'Controls & Compliance', 'Privileged access review for pipeline admins pending', 'High', 'P. Rao', 'Resolved', '2027-01-18', '2027-02-01'),
  G('p-data-plat', 'Facilities & Infrastructure', 'Data platform bay network cabling incomplete', 'Medium', 'K. Nair', 'Resolved', '2027-01-22', '2027-02-05'),
]

/* ------------------------------------------------------------------ */
/* Stabilization checklist (11 of 12 done → 92%)                       */
/* ------------------------------------------------------------------ */
export interface ChecklistItem { id: string; item: string; owner: string; done: boolean; area: string }
export const seedChecklist: ChecklistItem[] = [
  { id: 'chk-01', item: 'Hypercare support rota agreed with the Europe and France teams', owner: 'A. Sharma', done: true, area: 'Support' },
  { id: 'chk-02', item: 'SLA and KPI baseline captured for Wave 1 capabilities', owner: 'D. Singh', done: true, area: 'Performance' },
  { id: 'chk-03', item: 'Escalation matrix published and tested', owner: 'A. Sharma', done: true, area: 'Governance' },
  { id: 'chk-04', item: 'Knowledge base and runbook repository live (ServiceNow)', owner: 'D. Singh', done: true, area: 'Process' },
  { id: 'chk-05', item: 'Issue and defect log with daily triage', owner: 'A. Sharma', done: true, area: 'Governance' },
  { id: 'chk-06', item: 'Backup resources identified for critical capabilities', owner: 'S. Iyer', done: true, area: 'People' },
  { id: 'chk-07', item: 'Monitoring dashboards configured for service health', owner: 'R. Mehta', done: true, area: 'Technology' },
  { id: 'chk-08', item: 'Business continuity plan validated for the Pune site', owner: 'K. Nair', done: true, area: 'Facilities' },
  { id: 'chk-09', item: 'Stabilization exit criteria signed by the global owners', owner: 'A. Sharma', done: true, area: 'Governance' },
  { id: 'chk-10', item: 'Change-freeze window agreed for the Wave 2 go-lives', owner: 'R. Mehta', done: true, area: 'Technology' },
  { id: 'chk-11', item: 'Weekly stabilization review cadence in place', owner: 'A. Sharma', done: true, area: 'Governance' },
  { id: 'chk-12', item: 'Retention plan for critical Wave 1 / Wave 2 talent approved', owner: 'S. Iyer', done: false, area: 'People' },
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
  ktDeltaPct: 11,
  stabilizationDeltaPct: 8,
  goLiveWave: 3,
  goLiveStatus: 'On track',
  readinessThreshold: 70,
  trendMonths: ["Oct '26", "Nov '26", "Dec '26", "Jan '27", "Feb '27"],
  trendPlanned: [10, 28, 46, 62, 76],
  trendActual: [14, 33, 52, 68, 81],
}]
/** Target go-live of a wave = the last go-live among its projects. */
export const waveGoLive = (n: number, projects: TransitionProject[]) => waveProjects(n, projects).map((p) => p.goLiveDate).sort().pop()
/** Next go-live on or after today for a set of projects. */
export const nextGoLive = (projects: TransitionProject[], today = TODAY) => projects.filter((p) => p.goLiveDate >= today && p.status !== 'Completed').map((p) => p.goLiveDate).sort()[0]

/* ------------------------------------------------------------------ */
/* RAID / dependency links for the transition view                     */
/* ------------------------------------------------------------------ */
export interface RaidLink { id: string; businessUnit: string; projectId?: string } // id = raid item id
export const seedRaidLinks: RaidLink[] = [
  { id: 'r-011', businessUnit: 'Enterprise Applications', projectId: 'p-sap-ams' },
  { id: 'r-010', businessUnit: 'Infrastructure & Cloud' },
  { id: 'i-006', businessUnit: 'Data, Analytics & AI', projectId: 'p-data-eng' },
  { id: 'r-026', businessUnit: 'Digital Workplace', projectId: 'p-euc' },
  { id: 'i-027', businessUnit: 'Cybersecurity & IAM', projectId: 'p-iam' },
  { id: 'i-028', businessUnit: 'Data, Analytics & AI', projectId: 'p-data-bi' },
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

/** Business unit / project a shared dependency relates to (id = dependency id). */
export interface DepLink { id: string; businessUnit: string; projectId?: string }
export const seedDepLinks: DepLink[] = [
  { id: 'dep-007', businessUnit: 'Enterprise Applications', projectId: 'p-sap-ams' },
  { id: 'dep-008', businessUnit: 'Digital Workplace', projectId: 'p-euc' },
  { id: 'dep-012', businessUnit: 'IT Service Management', projectId: 'p-svcmgmt' },
]
export const depLink = (id: string, links: DepLink[]) => links.find((l) => l.id === id)

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
