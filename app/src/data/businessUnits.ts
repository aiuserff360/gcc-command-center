/**
 * Organisation structure of the GCC – aligned to the ENGIE IT GCC model:
 *   business unit (IT domain)  →  sub-unit (capability / service)  →  attributes (GBU served, geography,
 *   country / entity, current delivery location, current HC, target Pune HC, role / skill, transition type, wave)
 *   plus the headcount ramp: month-wise for the first year, annual targets for years 2+.
 *
 * Collections: 'businessUnits' (domains) and 'subUnits' (capabilities). The program manager configures both in
 * GCC Setup → Organisation structure. Domain-level yearly FTEs (y1..y5) are derived from the sub-units.
 */
export const BU_KINDS = ['IT Domain', 'Shared Services', 'R&D'] as const
export type BuKind = (typeof BU_KINDS)[number]
export const BU_WAVES = ['Wave 1', 'Wave 2', 'Wave 3', 'Wave 4', 'Wave 5'] as const
export const BU_STATUSES = ['In Scope', 'Planned', 'Under Evaluation', 'Out of Scope'] as const
export const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'] as const
export const YEAR_KEYS = ['y1', 'y2', 'y3', 'y4', 'y5'] as const
export type YearKey = (typeof YEAR_KEYS)[number]

export const GEOGRAPHIES = ['Global / Multi-region', 'Europe', 'Americas', 'AMEA / APAC'] as const
export const GBUS = ['Multiple GBUs', 'Group / GBS / Shared IT', 'Networks', 'Renewables & Flexible Power', 'Local Energy Infrastructure', 'Supply & Energy Management'] as const
export const TRANSITION_TYPES = ['Transition', 'Build', 'Build / Transition'] as const
export const DELIVERY_LOCATIONS = ['Europe', 'France', 'USA', 'Belgium', 'Netherlands', 'UK', 'Brazil', 'Australia'] as const
/** First-year months of the ramp (program ramp starts Nov 2026). */
export const RAMP_START = '2026-11'
export const RAMP_MONTHS = ['Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27', 'May 27', 'Jun 27', 'Jul 27', 'Aug 27', 'Sep 27', 'Oct 27'] as const

export interface BusinessUnit {
  id: string
  name: string
  kind: BuKind
  wave: (typeof BU_WAVES)[number]
  owner: string
  status: (typeof BU_STATUSES)[number]
  description: string
  /** Yearly exit FTEs. Derived from sub-units when the unit has any (see rollUpUnits); editable otherwise. */
  y1: number; y2: number; y3: number; y4: number; y5: number
  /** lucide icon name used on the footprint table */
  icon?: string
}

export interface SubUnit {
  id: string
  businessUnitId: string
  name: string // capability / service, e.g. "Cloud Operations"
  gbuServed: string
  geography: (typeof GEOGRAPHIES)[number] | string
  countryEntity: string
  deliveryLocation: string // current delivery location (from where work transitions)
  currentHc: number // current HC at source
  targetHc: number // target Pune HC at end of year 1
  roleSkill: string
  transitionType: (typeof TRANSITION_TYPES)[number]
  wave: (typeof BU_WAVES)[number]
  /** Year-1 month-wise cumulative Pune headcount (12 months from RAMP_START). */
  ramp: number[]
  /** Annual exit headcount for years 2..5 */
  y2: number; y3: number; y4: number; y5: number
  status: (typeof BU_STATUSES)[number]
}

/* ------------------------------------------------------------------ */
/* Seed – ENGIE IT GCC, Pune                                           */
/* ------------------------------------------------------------------ */
const U = (id: string, name: string, owner: string, description: string, icon: string, wave: BusinessUnit['wave'] = 'Wave 1'): BusinessUnit =>
  ({ id, name, kind: 'IT Domain', wave, owner, status: 'In Scope', description, y1: 0, y2: 0, y3: 0, y4: 0, y5: 0, icon })

export const seedBusinessUnitsRaw: BusinessUnit[] = [
  U('bu-infra', 'Infrastructure & Cloud', 'R. Mehta', 'Cloud Operations, Hosting / Data Centre, Network, Infrastructure Operations', 'Cloud', 'Wave 1'),
  U('bu-dwp', 'Digital Workplace', 'K. Nair', 'Service Desk, End User Computing, Collaboration, Workplace Support', 'Laptop', 'Wave 3'),
  U('bu-cyber', 'Cybersecurity & IAM', 'P. Rao', 'Identity & Access, Security Operations, Vulnerability Management, Security Engineering', 'ShieldCheck', 'Wave 1'),
  U('bu-apps', 'Enterprise Applications', 'V. Reddy', 'SAP / ERP, Finance Applications, HR Applications, Business Applications', 'AppWindow', 'Wave 2'),
  U('bu-data', 'Data, Analytics & AI', 'S. Iyer', 'Data Engineering, Data Platforms, BI / Analytics, AI / Automation', 'Database', 'Wave 2'),
  U('bu-eng', 'Integration & Engineering', 'M. Khan', 'API / Integration, DevOps, Application Engineering, Testing', 'Workflow', 'Wave 4'),
  U('bu-itsm', 'IT Service Management', 'D. Singh', 'Incident / Problem, Change / Release, Service Management, IT Asset / Configuration', 'Settings2', 'Wave 3'),
]

/** Cumulative month-wise ramp: the client's 6-month shape scaled to the capability's target, flat afterwards. */
const shape = (pts: number[], target: number): number[] => {
  const last = pts[pts.length - 1] || 1
  const six = pts.map((v, i) => (i === pts.length - 1 ? target : Math.min(target, Math.round((v / last) * target))))
  return [...six, ...Array(12 - six.length).fill(target)]
}
/** Capabilities without a stated ramp: ramp linearly over a month window to the target. */
const rampTo = (target: number, startMonth: number, endMonth: number) =>
  Array.from({ length: 12 }, (_, i) => (i < startMonth ? 0 : i >= endMonth ? target : Math.round((target * (i - startMonth + 1)) / (endMonth - startMonth + 1))))
const G: [number, number, number, number] = [1.07, 1.13, 1.18, 1.22]
const S = (id: string, bu: string, name: string, gbu: string, geo: string, country: string, loc: string, cur: number, target: number, role: string, type: SubUnit['transitionType'], wave: SubUnit['wave'], ramp: number[], growth: [number, number, number, number] = G): SubUnit =>
  ({ id, businessUnitId: bu, name, gbuServed: gbu, geography: geo, countryEntity: country, deliveryLocation: loc, currentHc: cur, targetHc: target, roleSkill: role, transitionType: type, wave, ramp, y2: Math.round(target * growth[0]), y3: Math.round(target * growth[1]), y4: Math.round(target * growth[2]), y5: Math.round(target * growth[3]), status: 'In Scope' })

/** Target Pune headcount = 400 by Apr 2027 (client headline); domain mix follows the client's footprint slide. */
export const seedSubUnits: SubUnit[] = [
  // Infrastructure & Cloud – 107
  S('su-cloud-ops', 'bu-infra', 'Cloud Operations', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 25, 52, 'Cloud Engineers', 'Transition', 'Wave 1', shape([10, 25, 40, 55, 65, 70], 52)),
  S('su-network', 'bu-infra', 'Network', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'France', 20, 44, 'Network Engineers', 'Transition', 'Wave 1', shape([8, 18, 30, 40, 48, 50], 44)),
  S('su-hosting', 'bu-infra', 'Hosting / Data Centre', 'Group / GBS / Shared IT', 'Europe', 'Group', 'Belgium', 0, 7, 'Hosting Engineers', 'Build / Transition', 'Wave 1', rampTo(7, 1, 4)),
  S('su-infra-ops', 'bu-infra', 'Infrastructure Operations', 'Group / GBS / Shared IT', 'Europe', 'Group', 'Netherlands', 0, 4, 'Infrastructure Analysts', 'Build', 'Wave 1', rampTo(4, 1, 4)),
  // Digital Workplace – 40
  S('su-euc', 'bu-dwp', 'End User Computing', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 30, 27, 'Workplace Engineers', 'Transition', 'Wave 3', shape([0, 5, 18, 32, 42, 45], 27)),
  S('su-service-desk', 'bu-dwp', 'Service Desk', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 0, 7, 'Service Desk Analysts', 'Build', 'Wave 3', rampTo(7, 2, 5)),
  S('su-collab', 'bu-dwp', 'Collaboration', 'Group / GBS / Shared IT', 'Europe', 'Group', 'Europe', 0, 3, 'Collaboration Engineers', 'Build', 'Wave 3', rampTo(3, 3, 5)),
  S('su-wp-support', 'bu-dwp', 'Workplace Support', 'Group / GBS / Shared IT', 'Europe', 'Group', 'France', 0, 3, 'Workplace Support Analysts', 'Build', 'Wave 3', rampTo(3, 3, 5)),
  // Cybersecurity & IAM – 36
  S('su-iam', 'bu-cyber', 'Identity & Access', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 15, 20, 'IAM Specialists', 'Transition', 'Wave 1', shape([5, 12, 22, 32, 38, 40], 20)),
  S('su-secops', 'bu-cyber', 'Security Operations', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 0, 9, 'SOC Analysts', 'Build / Transition', 'Wave 1', shape([0, 2, 5, 8, 10, 10], 9)),
  S('su-vuln', 'bu-cyber', 'Vulnerability Management', 'Group / GBS / Shared IT', 'Global / Multi-region', 'Group', 'Europe', 0, 4, 'Vulnerability Analysts', 'Build', 'Wave 1', shape([0, 0, 2, 4, 5, 5], 4)),
  S('su-seceng', 'bu-cyber', 'Security Engineering', 'Group / GBS / Shared IT', 'Global / Multi-region', 'Group', 'Europe', 0, 3, 'Security Engineers', 'Build', 'Wave 1', shape([0, 0, 0, 1, 2, 3], 3)),
  // Enterprise Applications – 107
  S('su-sap', 'bu-apps', 'SAP / ERP', 'Networks', 'Europe', 'France', 'France', 35, 71, 'SAP Functional / Technical', 'Transition', 'Wave 2', shape([0, 10, 30, 55, 75, 80], 71)),
  S('su-bizapps', 'bu-apps', 'Business Applications', 'Renewables & Flexible Power', 'Americas', 'USA', 'USA', 25, 36, 'App Support Engineers', 'Transition', 'Wave 2', shape([0, 8, 18, 28, 36, 40], 36)),
  S('su-finapps', 'bu-apps', 'Finance Applications', 'Group / GBS / Shared IT', 'Europe', 'Group', 'Belgium', 0, 0, 'Finance Application Analysts', 'Build', 'Wave 2', rampTo(0, 3, 6), [1, 1, 1, 1]),
  S('su-hrapps', 'bu-apps', 'HR Applications', 'Group / GBS / Shared IT', 'Europe', 'Group', 'France', 0, 0, 'HR Application Analysts', 'Build', 'Wave 2', rampTo(0, 3, 6), [1, 1, 1, 1]),
  // Data, Analytics & AI – 53
  S('su-dataeng', 'bu-data', 'Data Engineering', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 18, 32, 'Data Engineers', 'Build / Transition', 'Wave 2', shape([5, 15, 28, 44, 55, 60], 32)),
  S('su-dataplat', 'bu-data', 'Data Platforms', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 0, 9, 'Platform Engineers', 'Build / Transition', 'Wave 2', shape([0, 3, 5, 8, 10, 10], 9)),
  S('su-bi', 'bu-data', 'BI / Analytics', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 0, 7, 'BI Developers', 'Build', 'Wave 2', shape([0, 2, 4, 6, 8, 8], 7)),
  S('su-ai', 'bu-data', 'AI / Automation', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 0, 5, 'AI / Automation Engineers', 'Build', 'Wave 2', shape([0, 0, 1, 3, 4, 6], 5), [1.2, 1.4, 1.6, 1.8]),
  // Integration & Engineering – 26
  S('su-api', 'bu-eng', 'API / Integration', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 15, 14, 'Integration Engineers', 'Build', 'Wave 4', shape([0, 0, 8, 18, 26, 30], 14)),
  S('su-devops', 'bu-eng', 'DevOps', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 10, 7, 'DevOps Engineers', 'Build', 'Wave 4', shape([0, 0, 6, 12, 18, 20], 7)),
  S('su-appeng', 'bu-eng', 'Application Engineering', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 0, 3, 'Application Engineers', 'Build', 'Wave 4', shape([0, 0, 1, 2, 3, 4], 3)),
  S('su-testing', 'bu-eng', 'Testing', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 0, 2, 'Test Engineers', 'Build', 'Wave 4', shape([0, 0, 1, 1, 2, 2], 2)),
  // IT Service Management – 31
  S('su-svcmgmt', 'bu-itsm', 'Service Management', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 20, 18, 'Service Managers', 'Build / Transition', 'Wave 3', shape([0, 5, 15, 25, 32, 35], 18)),
  S('su-incident', 'bu-itsm', 'Incident / Problem', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 0, 6, 'Incident & Problem Managers', 'Build', 'Wave 3', shape([0, 1, 3, 5, 6, 7], 6)),
  S('su-change', 'bu-itsm', 'Change / Release', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 0, 4, 'Change & Release Managers', 'Build', 'Wave 3', shape([0, 1, 2, 4, 5, 5], 4)),
  S('su-asset', 'bu-itsm', 'IT Asset / Configuration', 'Multiple GBUs', 'Global / Multi-region', 'Group', 'Europe', 0, 3, 'Asset & CMDB Analysts', 'Build', 'Wave 3', shape([0, 0, 1, 2, 3, 3], 3)),
]

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export const subUnitsOf = (subs: SubUnit[], buId: string) => subs.filter((s) => s.businessUnitId === buId && s.status !== 'Out of Scope')
export const subY1 = (s: SubUnit) => s.ramp[s.ramp.length - 1] ?? s.targetHc
/** Roll sub-unit targets up into the domain's y1..y5 (y1 = end of the first-year ramp). */
export function rollUpUnits(units: BusinessUnit[], subs: SubUnit[]): BusinessUnit[] {
  return units.map((u) => {
    const mine = subUnitsOf(subs, u.id)
    if (!mine.length) return u
    return { ...u, y1: mine.reduce((t, s) => t + subY1(s), 0), y2: mine.reduce((t, s) => t + s.y2, 0), y3: mine.reduce((t, s) => t + s.y3, 0), y4: mine.reduce((t, s) => t + s.y4, 0), y5: mine.reduce((t, s) => t + s.y5, 0) }
  })
}
/** Month-wise program ramp for year 1 (sum of sub-unit ramps). */
export const programRamp = (subs: SubUnit[]) => RAMP_MONTHS.map((_, i) => subs.filter((s) => s.status !== 'Out of Scope').reduce((t, s) => t + (s.ramp[i] ?? 0), 0))
export const unitRamp = (subs: SubUnit[], buId: string) => RAMP_MONTHS.map((_, i) => subUnitsOf(subs, buId).reduce((t, s) => t + (s.ramp[i] ?? 0), 0))
export const seedBusinessUnits: BusinessUnit[] = rollUpUnits(seedBusinessUnitsRaw, seedSubUnits)
export const BU_NAMES = seedBusinessUnits.map((b) => b.name)
export const buTotal = (b: BusinessUnit, k: YearKey) => b[k]
/** Short labels for dense tables and chart axes. */
export const BU_SHORT_NAMES: Record<string, string> = { 'Infrastructure & Cloud': 'Infra & Cloud', 'Digital Workplace': 'Workplace', 'Cybersecurity & IAM': 'Cyber & IAM', 'Enterprise Applications': 'Ent. Apps', 'Data, Analytics & AI': 'Data & AI', 'Integration & Engineering': 'Integration', 'IT Service Management': 'ITSM' }
export const buShortName = (n: string) => BU_SHORT_NAMES[n] ?? n
