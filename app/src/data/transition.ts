/**
 * Transition Management – types, seed data and helpers.
 *
 * Collections owned by this page:
 *  - 'waves'                  : Wave[]                  (5 transition waves)
 *  - 'ktItems'                : KtItem[]                (knowledge-transfer tracker; per-wave completion is derived from sessions)
 *  - 'readinessAssessments'   : ReadinessAssessment[]   (wave × workstream readiness matrix)
 *  - 'readinessGaps'          : ReadinessGap[]          (gap register – 18 rows: 5 New, 13 Resolved)
 *  - 'stabilizationChecklist' : ChecklistItem[]         (stabilization readiness = % items done)
 *  - 'transitionSettings'     : [TransitionSettings]    (numbers that cannot be derived: deltas, go-live, dimension scores, trend)
 *  - 'milestoneWaves'         : MilestoneWave[]         (explicit wave override per shared milestone id)
 *
 * Shared collections read here: 'milestones', 'raid', 'dependencies', 'activities'.
 */
import type { Status, Impact } from './common'
import { TODAY } from './common'
import type { Milestone, RaidItem } from './shared'

export const TRANSITION_VIEWS = ['Transition Wave', 'Workstream', 'Function'] as const
export const TRANSITION_TABS = ['Transition Overview', 'Wave Plan', 'Knowledge Transfer', 'Readiness & Stabilization', 'Risks & Issues', 'Dependencies', 'Reports'] as const
export const TRANSITION_DATE_RANGE = '01 Sep 2026 – 31 Dec 2026'

/* ------------------------------------------------------------------ */
/* Waves                                                               */
/* ------------------------------------------------------------------ */
export const WAVE_STATUSES = ['Not Started', 'In Progress', 'On Track', 'At Risk', 'Delayed', 'Completed'] as const
export type WaveStatus = (typeof WAVE_STATUSES)[number]

export interface Wave {
  id: string
  number: number
  scope: string // "Finance, HR, Procurement"
  startDate: string
  endDate: string
  status: WaveStatus
  progress: number
  color: string
  lead: string
}

export const WAVE_COLORS = ['#5B9BF0', '#16A34A', '#F59E0B', '#8B5CF6', '#14B8A6', '#1E5BBE', '#F97316']

export const seedWaves: Wave[] = [
  { id: 'wave-1', number: 1, scope: 'Finance, HR, Procurement', startDate: '2026-09-01', endDate: '2026-09-30', status: 'In Progress', progress: 78, color: WAVE_COLORS[0], lead: 'R. Mehta' },
  { id: 'wave-2', number: 2, scope: 'IT, Facilities, Support', startDate: '2026-10-01', endDate: '2026-10-31', status: 'On Track', progress: 65, color: WAVE_COLORS[1], lead: 'S. Iyer' },
  { id: 'wave-3', number: 3, scope: 'Operations, Analytics', startDate: '2026-11-01', endDate: '2026-11-30', status: 'Not Started', progress: 22, color: WAVE_COLORS[2], lead: 'P. Rao' },
  { id: 'wave-4', number: 4, scope: 'Business Applications', startDate: '2026-12-01', endDate: '2026-12-31', status: 'Not Started', progress: 0, color: WAVE_COLORS[3], lead: 'K. Nair' },
  { id: 'wave-5', number: 5, scope: 'Final Stabilization', startDate: '2027-01-01', endDate: '2027-01-31', status: 'Not Started', progress: 0, color: WAVE_COLORS[4], lead: 'A. Sharma' },
]

export const waveFunctions = (w: Wave) => w.scope.split(',').map((s) => s.trim()).filter(Boolean)
export const waveLabel = (n: number) => `Wave ${n}`
export const waveIsActive = (w: Wave) => w.status !== 'Completed' && (w.progress > 0 || ['In Progress', 'On Track', 'At Risk', 'Delayed'].includes(w.status))
export const waveHasStarted = (w: Wave, today = TODAY) => w.startDate <= today

export const waveProgressColor = (w: Wave) =>
  w.status === 'Completed' || w.status === 'On Track' ? '#16A34A' : w.status === 'In Progress' ? '#2B6FD6' : w.status === 'At Risk' ? '#F59E0B' : w.status === 'Delayed' ? '#DC2626' : '#BFD7F7'

/** Which wave a date falls into (by wave date range); undefined when outside every wave. */
export function waveForDate(waves: Wave[], date: string): number | undefined {
  return waves.find((w) => date >= w.startDate && date <= w.endDate)?.number
}

/* ------------------------------------------------------------------ */
/* Milestone → wave mapping                                            */
/* ------------------------------------------------------------------ */
export interface MilestoneWave { id: string; wave: number } // id = milestone id
export const seedMilestoneWaves: MilestoneWave[] = [{ id: 'ms-039', wave: 3 }]

export function milestoneWave(m: Milestone, waves: Wave[], overrides: MilestoneWave[]): number | undefined {
  const o = overrides.find((x) => x.id === m.id)
  if (o) return o.wave
  const named = /wave\s*(\d+)/i.exec(m.name)
  if (named) return Number(named[1])
  return waveForDate(waves, m.dueDate)
}

export const isTransitionMilestone = (m: Milestone) => m.phase === 'Transition' && m.workstream === 'Transition Readiness'

/* ------------------------------------------------------------------ */
/* Knowledge transfer                                                  */
/* ------------------------------------------------------------------ */
export const KT_STATUSES = ['Completed', 'In Progress', 'Not Started'] as const
export type KtStatus = (typeof KT_STATUSES)[number]
export const KT_SIGNOFF = ['Signed', 'Pending', 'Not Started'] as const
export type KtSignOff = (typeof KT_SIGNOFF)[number]
export const KT_FUNCTIONS = ['Finance', 'HR', 'Procurement', 'IT', 'Facilities', 'Support', 'Operations', 'Analytics', 'Business Applications', 'Stabilization'] as const

export interface KtItem {
  id: string
  process: string
  function: string
  wave: number
  globalOwner: string
  indiaOwner: string
  sessionsPlanned: number
  sessionsDone: number
  status: KtStatus
  signOff: KtSignOff
  targetDate: string
}

const GLOBAL = ['J. Carter', 'M. Weber', 'L. Chen', 'D. Novak', 'E. Rossi', 'T. Okafor', 'H. Tanaka', 'B. Müller']
let ktN = 0
const K = (process: string, fn: string, wave: number, planned: number, done: number, indiaOwner: string, targetDate: string): KtItem => {
  ktN++
  const status: KtStatus = done >= planned ? 'Completed' : done > 0 ? 'In Progress' : 'Not Started'
  return {
    id: `kt-${String(ktN).padStart(3, '0')}`, process, function: fn, wave, globalOwner: GLOBAL[ktN % GLOBAL.length], indiaOwner,
    sessionsPlanned: planned, sessionsDone: done, status, signOff: status === 'Completed' ? 'Signed' : status === 'In Progress' ? 'Pending' : 'Not Started', targetDate,
  }
}

export const seedKtItems: KtItem[] = [
  // Wave 1 – Finance, HR, Procurement (38 of 49 sessions → 78%)
  K('Accounts payable processing', 'Finance', 1, 6, 6, 'V. Reddy', '2026-09-12'),
  K('General ledger close', 'Finance', 1, 8, 8, 'V. Reddy', '2026-09-18'),
  K('Fixed asset accounting', 'Finance', 1, 4, 4, 'V. Reddy', '2026-09-20'),
  K('Payroll processing', 'HR', 1, 6, 6, 'S. Iyer', '2026-09-22'),
  K('Employee onboarding administration', 'HR', 1, 5, 4, 'S. Iyer', '2026-09-26'),
  K('Benefits administration', 'HR', 1, 4, 3, 'S. Iyer', '2026-09-28'),
  K('Purchase order processing', 'Procurement', 1, 6, 4, 'V. Reddy', '2026-09-29'),
  K('Vendor master maintenance', 'Procurement', 1, 4, 3, 'V. Reddy', '2026-09-30'),
  K('Invoice reconciliation', 'Finance', 1, 6, 0, 'V. Reddy', '2026-10-08'),
  // Wave 2 – IT, Facilities, Support (49 of 79 sessions → 62%)
  K('Service desk L1', 'IT', 2, 12, 12, 'R. Mehta', '2026-10-09'),
  K('End-user device support', 'IT', 2, 8, 8, 'R. Mehta', '2026-10-12'),
  K('Network operations monitoring', 'IT', 2, 10, 6, 'R. Mehta', '2026-10-23'),
  K('Identity & access management', 'IT', 2, 8, 5, 'R. Mehta', '2026-10-24'),
  K('Facilities helpdesk', 'Facilities', 2, 6, 5, 'K. Nair', '2026-10-21'),
  K('Workplace vendor coordination', 'Facilities', 2, 6, 3, 'K. Nair', '2026-10-27'),
  K('Application support L2', 'Support', 2, 12, 7, 'M. Khan', '2026-10-29'),
  K('Incident & problem management', 'Support', 2, 8, 3, 'M. Khan', '2026-10-30'),
  K('IT asset lifecycle management', 'IT', 2, 9, 0, 'R. Mehta', '2026-11-06'),
  // Wave 3 – Operations, Analytics (25 of 56 sessions → 45%)
  K('Order management', 'Operations', 3, 8, 8, 'M. Khan', '2026-10-16'),
  K('Reporting & dashboards', 'Analytics', 3, 8, 7, 'D. Singh', '2026-11-05'),
  K('Data quality monitoring', 'Analytics', 3, 6, 4, 'D. Singh', '2026-11-10'),
  K('Master data management', 'Operations', 3, 8, 2, 'M. Khan', '2026-11-14'),
  K('Forecasting models', 'Analytics', 3, 8, 0, 'D. Singh', '2026-11-20'),
  K('Logistics coordination', 'Operations', 3, 8, 0, 'M. Khan', '2026-11-24'),
  K('Customer service operations', 'Operations', 3, 10, 4, 'M. Khan', '2026-11-27'),
  // Wave 4 – Business Applications (13 of 46 sessions → 28%)
  K('ERP application support', 'Business Applications', 4, 10, 6, 'R. Mehta', '2026-12-04'),
  K('CRM administration', 'Business Applications', 4, 8, 3, 'R. Mehta', '2026-12-09'),
  K('HRMS configuration support', 'Business Applications', 4, 8, 0, 'S. Iyer', '2026-12-15'),
  K('Integration monitoring', 'Business Applications', 4, 6, 0, 'R. Mehta', '2026-12-18'),
  K('BI platform administration', 'Business Applications', 4, 6, 0, 'D. Singh', '2026-12-22'),
  K('Release & change management', 'Business Applications', 4, 8, 4, 'R. Mehta', '2026-12-28'),
  // Wave 5 – Final Stabilization (3 of 25 sessions → 12%)
  K('Hypercare support model', 'Stabilization', 5, 8, 2, 'A. Sharma', '2027-01-09'),
  K('SLA monitoring & reporting', 'Stabilization', 5, 6, 1, 'A. Sharma', '2027-01-16'),
  K('Continuous improvement backlog', 'Stabilization', 5, 6, 0, 'M. Khan', '2027-01-23'),
  K('Steady-state governance', 'Stabilization', 5, 5, 0, 'A. Sharma', '2027-01-30'),
]

export function ktStats(items: KtItem[]) {
  const planned = items.reduce((s, i) => s + i.sessionsPlanned, 0)
  const done = items.reduce((s, i) => s + Math.min(i.sessionsDone, i.sessionsPlanned), 0)
  const pct = planned ? Math.round((done / planned) * 100) : 0
  const count = (st: KtStatus) => items.filter((i) => i.status === st).length
  return { planned, done, pct, total: items.length, completed: count('Completed'), inProgress: count('In Progress'), notStarted: count('Not Started'), signed: items.filter((i) => i.signOff === 'Signed').length }
}

/* ------------------------------------------------------------------ */
/* Readiness                                                           */
/* ------------------------------------------------------------------ */
export const READINESS_WORKSTREAMS = ['Finance & Procurement', 'HR & People Services', 'IT & Digital', 'Facilities', 'Operations', 'Compliance & Legal'] as const
export type ReadinessWorkstream = (typeof READINESS_WORKSTREAMS)[number]
export const DIMENSIONS = ['People & Organization', 'Process & Governance', 'Technology & Data', 'Facilities & Infrastructure', 'Controls & Compliance'] as const
export type Dimension = (typeof DIMENSIONS)[number]
export const READINESS_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Not Started', 'Completed'] as const

export interface ReadinessAssessment {
  id: string
  wave: number
  workstream: string
  dims: Record<Dimension, number>
  status: Status
  nextAction: string
  assessedOn: string
}

export const assessmentScore = (a: ReadinessAssessment) => Math.round(DIMENSIONS.reduce((s, d) => s + (a.dims[d] ?? 0), 0) / DIMENSIONS.length)
export const readinessColor = (score: number) => (score >= 80 ? '#16A34A' : score >= 65 ? '#5B9BF0' : score >= 50 ? '#F59E0B' : '#DC2626')

const OFFSETS = [3, -1, -5, 4, -1] // sums to 0 so the mean equals the target score
const dimsFor = (score: number): Record<Dimension, number> =>
  Object.fromEntries(DIMENSIONS.map((d, i) => [d, Math.max(0, Math.min(100, score + OFFSETS[i]))])) as Record<Dimension, number>

const W1: [string, number, Status, string][] = [
  ['Finance & Procurement', 85, 'On Track', 'Finalize invoice process handover'],
  ['HR & People Services', 72, 'On Track', 'Complete org structure alignment'],
  ['IT & Digital', 54, 'At Risk', 'Resolve network provisioning'],
  ['Facilities', 90, 'On Track', 'Confirm workspace readiness'],
  ['Operations', 68, 'On Track', 'Validate process walk-through'],
  ['Compliance & Legal', 76, 'On Track', 'Complete regulatory filings'],
]
const LATER: Record<number, [number[], Status[], string[]]> = {
  2: [[66, 60, 48, 74, 58, 64], ['On Track', 'On Track', 'At Risk', 'On Track', 'At Risk', 'On Track'], ['Confirm Wave 2 PO approvals', 'Complete HR policy localisation', 'Close network provisioning actions', 'Hand over workplace services', 'Validate support model SOPs', 'File statutory registrations']],
  3: [[42, 38, 30, 52, 40, 45], ['Not Started', 'Not Started', 'At Risk', 'Not Started', 'Not Started', 'Not Started'], ['Plan Wave 3 finance scope', 'Confirm Wave 3 hiring plan', 'Provision analytics platform access', 'Allocate Wave 3 seating', 'Baseline operations KPIs', 'Review data-handling controls']],
  4: [[22, 18, 12, 26, 16, 24], ['Not Started', 'Not Started', 'Not Started', 'Not Started', 'Not Started', 'Not Started'], ['Scope application licence transfer', 'Define application support roles', 'Plan environment access for apps team', 'Confirm lab space', 'Draft application run-book', 'Review licence compliance']],
  5: [[10, 8, 6, 12, 8, 10], ['Not Started', 'Not Started', 'Not Started', 'Not Started', 'Not Started', 'Not Started'], ['Define stabilization budget', 'Plan retention measures', 'Define hypercare tooling', 'Confirm steady-state seating', 'Define SLA reporting', 'Plan compliance audit']],
}
export const seedReadinessAssessments: ReadinessAssessment[] = [
  ...W1.map(([ws, score, status, nextAction], i) => ({ id: `ra-1-${i + 1}`, wave: 1, workstream: ws, dims: dimsFor(score), status, nextAction, assessedOn: '2026-10-16' })),
  ...Object.entries(LATER).flatMap(([wave, [scores, statuses, actions]]) =>
    READINESS_WORKSTREAMS.map((ws, i) => ({ id: `ra-${wave}-${i + 1}`, wave: Number(wave), workstream: ws, dims: dimsFor(scores[i]), status: statuses[i], nextAction: actions[i], assessedOn: '2026-10-16' })),
  ),
]

/* ------------------------------------------------------------------ */
/* Readiness gaps (18 = 5 New | 13 Resolved)                           */
/* ------------------------------------------------------------------ */
export const GAP_STATUSES = ['New', 'Open', 'Resolved'] as const
export type GapStatus = (typeof GAP_STATUSES)[number]
export interface ReadinessGap {
  id: string
  code: string
  wave: number
  dimension: Dimension
  workstream: string
  description: string
  severity: Impact
  owner: string
  status: GapStatus
  raised: string
  due: string
}
let gapN = 0
const G = (wave: number, dimension: Dimension, workstream: string, description: string, severity: Impact, owner: string, status: GapStatus, raised: string, due: string): ReadinessGap => {
  gapN++
  return { id: `gap-${String(gapN).padStart(3, '0')}`, code: `G-${String(gapN).padStart(3, '0')}`, wave, dimension, workstream, description, severity, owner, status, raised, due }
}
export const seedReadinessGaps: ReadinessGap[] = [
  G(1, 'Technology & Data', 'IT & Digital', 'Network provisioning for Wave 1 floor not complete', 'High', 'R. Mehta', 'New', '2026-10-14', '2026-10-28'),
  G(1, 'Process & Governance', 'Operations', 'Process walk-through for order-to-cash not validated', 'Medium', 'M. Khan', 'New', '2026-10-15', '2026-10-30'),
  G(2, 'People & Organization', 'HR & People Services', 'Wave 2 receiving team two roles unfilled', 'High', 'S. Iyer', 'New', '2026-10-16', '2026-11-05'),
  G(2, 'Technology & Data', 'IT & Digital', 'Global system access pending for 14 Wave 2 joiners', 'Critical', 'R. Mehta', 'New', '2026-10-17', '2026-10-24'),
  G(3, 'Controls & Compliance', 'Compliance & Legal', 'Data-handling controls for analytics scope not reviewed', 'Medium', 'P. Rao', 'New', '2026-10-19', '2026-11-12'),
  G(1, 'People & Organization', 'Finance & Procurement', 'AP team shadowing schedule not confirmed', 'Medium', 'V. Reddy', 'Resolved', '2026-09-02', '2026-09-10'),
  G(1, 'Process & Governance', 'Finance & Procurement', 'GL close checklist missing India entity steps', 'Medium', 'V. Reddy', 'Resolved', '2026-09-04', '2026-09-15'),
  G(1, 'Technology & Data', 'Finance & Procurement', 'ERP role mapping incomplete for AP processors', 'High', 'R. Mehta', 'Resolved', '2026-09-05', '2026-09-18'),
  G(1, 'Facilities & Infrastructure', 'Facilities', 'Wave 1 seating plan not signed off', 'Low', 'K. Nair', 'Resolved', '2026-09-06', '2026-09-12'),
  G(1, 'Controls & Compliance', 'Compliance & Legal', 'SoD matrix not updated for payroll roles', 'High', 'P. Rao', 'Resolved', '2026-09-08', '2026-09-22'),
  G(1, 'People & Organization', 'HR & People Services', 'Payroll backup resource not identified', 'Medium', 'S. Iyer', 'Resolved', '2026-09-09', '2026-09-20'),
  G(1, 'Process & Governance', 'HR & People Services', 'Onboarding SOP references global ticketing tool', 'Low', 'S. Iyer', 'Resolved', '2026-09-11', '2026-09-24'),
  G(1, 'Technology & Data', 'HR & People Services', 'HRMS test environment access missing', 'Medium', 'R. Mehta', 'Resolved', '2026-09-12', '2026-09-25'),
  G(1, 'Process & Governance', 'Operations', 'Escalation matrix for Wave 1 not published', 'Medium', 'M. Khan', 'Resolved', '2026-09-15', '2026-09-28'),
  G(2, 'Facilities & Infrastructure', 'Facilities', 'Service desk bay cabling incomplete', 'Medium', 'K. Nair', 'Resolved', '2026-09-20', '2026-10-05'),
  G(2, 'People & Organization', 'IT & Digital', 'L1 service desk shift roster not approved', 'Medium', 'R. Mehta', 'Resolved', '2026-09-24', '2026-10-08'),
  G(2, 'Controls & Compliance', 'IT & Digital', 'Privileged access review for admins pending', 'High', 'P. Rao', 'Resolved', '2026-09-28', '2026-10-12'),
  G(2, 'Process & Governance', 'Operations', 'Incident severity definitions not aligned with global', 'Low', 'M. Khan', 'Resolved', '2026-10-01', '2026-10-15'),
]

/* ------------------------------------------------------------------ */
/* Stabilization checklist (11 of 12 done → 92%)                       */
/* ------------------------------------------------------------------ */
export interface ChecklistItem { id: string; item: string; owner: string; done: boolean; area: string }
export const seedChecklist: ChecklistItem[] = [
  { id: 'chk-01', item: 'Hypercare support rota agreed with global teams', owner: 'A. Sharma', done: true, area: 'Support' },
  { id: 'chk-02', item: 'SLA and KPI baseline captured for Wave 1 processes', owner: 'M. Khan', done: true, area: 'Performance' },
  { id: 'chk-03', item: 'Escalation matrix published and tested', owner: 'A. Sharma', done: true, area: 'Governance' },
  { id: 'chk-04', item: 'Knowledge base and SOP repository live', owner: 'D. Singh', done: true, area: 'Process' },
  { id: 'chk-05', item: 'Issue and defect log with daily triage', owner: 'A. Sharma', done: true, area: 'Governance' },
  { id: 'chk-06', item: 'Backup resources identified for critical processes', owner: 'S. Iyer', done: true, area: 'People' },
  { id: 'chk-07', item: 'Monitoring dashboards configured for service health', owner: 'R. Mehta', done: true, area: 'Technology' },
  { id: 'chk-08', item: 'Business continuity plan validated for the site', owner: 'K. Nair', done: true, area: 'Facilities' },
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
  goLiveDate: string
  goLiveStatus: 'On track' | 'At risk' | 'Delayed'
  readinessThreshold: number
  dims: Record<Dimension, number>
  trendMonths: string[]
  trendPlanned: number[]
  trendActual: number[]
}
export const seedTransitionSettings: TransitionSettings[] = [{
  id: 'transition-settings',
  ktDeltaPct: 12,
  stabilizationDeltaPct: 8,
  goLiveWave: 3,
  goLiveDate: '2026-10-28',
  goLiveStatus: 'On track',
  readinessThreshold: 70,
  dims: { 'People & Organization': 72, 'Process & Governance': 68, 'Technology & Data': 54, 'Facilities & Infrastructure': 81, 'Controls & Compliance': 76 },
  trendMonths: ["Sep '26", "Oct '26", "Nov '26", "Dec '26", "Jan '27"],
  trendPlanned: [15, 30, 46, 64, 78],
  trendActual: [22, 38, 55, 74, 85],
}]

/* ------------------------------------------------------------------ */
/* RAID helpers for the transition view                                */
/* ------------------------------------------------------------------ */
export const TRANSITION_RAID_LABELS: Record<string, string> = {
  'R-011': 'Knowledge transfer delay',
  'R-010': 'Key talent attrition',
  'I-027': 'System access delays',
  'I-028': 'Data quality gaps',
  'R-026': 'Change resistance',
}
export const isTransitionRaid = (r: RaidItem) => r.workstream === 'Transition' || r.code in TRANSITION_RAID_LABELS
export const raidLabel = (r: RaidItem) => TRANSITION_RAID_LABELS[r.code] ?? r.shortTitle ?? r.title

/** Short display label for the long dashboard-style milestone names used in the mock-up. */
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
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} '${String(y).slice(2)}`
}
