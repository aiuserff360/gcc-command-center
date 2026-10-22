/**
 * Risks & Issues page – extra types, seeds and helpers.
 * The main register lives in the shared 'raid' collection (src/data/shared.ts).
 * Collections owned by this page:
 *  - 'riskSettings'       : [RiskSettings]        headline KPIs that cannot be derived + supplement flag
 *  - 'raidTrend'          : RaidTrendPoint[]      monthly open risks / issues + new vs closed
 *  - 'riskInsights'       : RiskInsight[]         Key Insights / Recommended Actions
 *  - 'mitigationActions'  : MitigationAction[]    mitigation plan rows linked to a risk code
 *  - 'escalationDecisions': EscalationDecision[]  decision needed / steering date / decision per escalated item
 */
import type { Workstream, Status, Impact } from './common'
import { WORKSTREAMS, MONTHS } from './common'
import { LIKELIHOOD, IMPACT_SCALE, type RaidItem, isOpen } from './shared'

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */
export interface RiskSettings {
  id: 'risk-settings'
  onTrackForClosurePct: number
  onTrackForClosureDelta: number
  avgDaysToResolve: number
  avgDaysToResolveDelta: number
  avgDaysToResolvePrev: number
  wave2DelayProbability: number
  /** true once the two supplementary RAID rows below have been written into the shared 'raid' collection */
  supplementApplied: boolean
}
export const seedRiskSettings: RiskSettings[] = [{
  id: 'risk-settings',
  onTrackForClosurePct: 85, onTrackForClosureDelta: 12,
  avgDaysToResolve: 8, avgDaysToResolveDelta: -35, avgDaysToResolvePrev: 12,
  wave2DelayProbability: 78,
  supplementApplied: false,
}]

/**
 * The shared seed contains 23 open risks (5 Critical) and 11 open issues (2 High); the mock-up shows
 * 24 (6 Critical) and 12 (3 High). These two rows are added once to the shared 'raid' collection.
 */
/** Previously held two rows missing from the shared seed; they now live in src/data/shared.ts. Kept empty for compatibility. */
export const supplementRaid: RaidItem[] = []

/* ------------------------------------------------------------------ */
/* Trend                                                               */
/* ------------------------------------------------------------------ */
export interface RaidTrendPoint {
  id: string
  month: string
  openRisks: number
  openIssues: number
  newRisks: number
  closedRisks: number
  newIssues: number
  closedIssues: number
}
const OPEN_R = [42, 41, 39, 38, 32, 31, 28, 27, 26, 25, 24, 24]
const OPEN_I = [18, 17, 15, 14, 13, 13, 12, 12, 11, 12, 12, 12]
const NEW_R = [6, 4, 3, 4, 2, 3, 2, 3, 2, 3, 2, 1]
const NEW_I = [4, 3, 2, 3, 2, 3, 2, 2, 2, 3, 2, 1]
export const seedRaidTrend: RaidTrendPoint[] = MONTHS.map((m, i) => ({
  id: `trend-${m.toLowerCase()}`,
  month: m,
  openRisks: OPEN_R[i], openIssues: OPEN_I[i],
  newRisks: NEW_R[i], closedRisks: NEW_R[i] + (i === 0 ? 0 : OPEN_R[i - 1] - OPEN_R[i]),
  newIssues: NEW_I[i], closedIssues: NEW_I[i] + (i === 0 ? 0 : OPEN_I[i - 1] - OPEN_I[i]),
}))

/* ------------------------------------------------------------------ */
/* Insights / Recommended actions                                      */
/* ------------------------------------------------------------------ */
export type InsightIcon = 'alert' | 'link' | 'clock' | 'escalate' | 'users' | 'file' | 'trend'
export const INSIGHT_ICONS: InsightIcon[] = ['alert', 'link', 'clock', 'escalate', 'users', 'file', 'trend']
export interface RiskInsight {
  id: string
  kind: 'Insight' | 'Action'
  title: string
  detail: string
  icon: InsightIcon
  linkedCode?: string
  order: number
}
export const seedRiskInsights: RiskInsight[] = [
  { id: 'ins-1', kind: 'Insight', icon: 'alert', title: 'Risk of Wave 2 delay has increased to 78%', detail: 'Driven by hiring shortfall and KT documentation gaps.', linkedCode: 'R-002', order: 1 },
  { id: 'ins-2', kind: 'Insight', icon: 'link', title: '3 risks are linked to the IT infrastructure milestone', detail: 'A delay here may impact 4 downstream deliverables.', linkedCode: 'R-001', order: 2 },
  { id: 'ins-3', kind: 'Insight', icon: 'clock', title: 'Average time to resolve issues has improved by 35%', detail: 'From 12 days to 8 days over the last month.', order: 3 },
  { id: 'act-1', kind: 'Action', icon: 'escalate', title: 'Escalate network provisioning issue to steering committee', detail: 'Impacts transition wave and go-live date.', linkedCode: 'R-001', order: 1 },
  { id: 'act-2', kind: 'Action', icon: 'users', title: 'Approve additional hiring support for critical roles', detail: 'Mitigates talent shortfall risk for Wave 2.', linkedCode: 'R-002', order: 2 },
  { id: 'act-3', kind: 'Action', icon: 'file', title: 'Finalize data access approvals by 25 Oct', detail: 'Unblocks analytics and KT activities.', linkedCode: 'I-004', order: 3 },
]

/* ------------------------------------------------------------------ */
/* Mitigation actions                                                  */
/* ------------------------------------------------------------------ */
export type MitigationStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Overdue'
export const MITIGATION_STATUSES: MitigationStatus[] = ['Not Started', 'In Progress', 'Completed', 'Overdue']
export type Effectiveness = 'High' | 'Medium' | 'Low' | 'Not Assessed'
export const EFFECTIVENESS: Effectiveness[] = ['High', 'Medium', 'Low', 'Not Assessed']
export interface MitigationAction {
  id: string
  riskCode: string
  action: string
  owner: string
  due: string
  status: MitigationStatus
  effectiveness: Effectiveness
}
const MA = (id: string, riskCode: string, action: string, owner: string, due: string, status: MitigationStatus, effectiveness: Effectiveness): MitigationAction => ({ id, riskCode, action, owner, due, status, effectiveness })
export const seedMitigationActions: MitigationAction[] = [
  MA('ma-01', 'R-001', 'Escalate network provisioning issue to steering committee', 'A. Sharma', '2027-02-22', 'In Progress', 'High'),
  MA('ma-02', 'R-001', 'Activate backup ISP and re-sequence endpoint rollout', 'R. Mehta', '2027-02-28', 'In Progress', 'Medium'),
  MA('ma-03', 'R-002', 'Engage two specialist agencies for Senior Data Engineer pipeline', 'S. Iyer', '2027-02-24', 'In Progress', 'Medium'),
  MA('ma-04', 'R-002', 'Open lateral hiring in Hyderabad for Cybersecurity roles', 'S. Iyer', '2027-03-05', 'Not Started', 'Not Assessed'),
  MA('ma-05', 'R-003', 'Legal counsel to track labour-law amendments; prepare dual filing path', 'P. Rao', '2027-03-01', 'In Progress', 'High'),
  MA('ma-06', 'R-005', 'Split laptop order across two suppliers; prioritise Wave 2 joiners', 'V. Reddy', '2027-02-27', 'Completed', 'High'),
  MA('ma-07', 'R-007', 'Daily site walk and contractor penalty clause review', 'M. Khan', '2027-03-10', 'In Progress', 'Medium'),
  MA('ma-08', 'R-009', 'Pre-approve role-based access bundles for each hiring wave', 'K. Nair', '2027-02-28', 'In Progress', 'Medium'),
  MA('ma-09', 'R-010', 'Retention bonus for critical roles; career path communication', 'S. Iyer', '2027-03-15', 'Not Started', 'Not Assessed'),
  MA('ma-10', 'R-011', 'Lock KT calendar with global process owners; weekly attendance tracking', 'A. Sharma', '2027-02-28', 'In Progress', 'High'),
  MA('ma-11', 'R-012', 'Validate secondary DG set and UPS sizing with landlord', 'K. Nair', '2027-03-20', 'In Progress', 'High'),
  MA('ma-12', 'R-013', 'Tax advisor methodology paper', 'P. Rao', '2027-03-15', 'Not Started', 'Not Assessed'),
  MA('ma-13', 'R-014', 'Second parallel payroll run before go-live', 'V. Reddy', '2027-03-05', 'In Progress', 'Medium'),
  MA('ma-14', 'R-016', 'Pre-joining bootcamp to improve offer-to-join conversion', 'S. Iyer', '2027-02-15', 'Overdue', 'Low'),
  MA('ma-15', 'R-017', 'Order secondary circuit from alternate ISP', 'R. Mehta', '2027-02-12', 'Overdue', 'Low'),
  MA('ma-16', 'R-039', 'Stage production build in cloud landing zone', 'R. Mehta', '2027-03-30', 'Not Started', 'Not Assessed'),
]

/* ------------------------------------------------------------------ */
/* Escalation decisions                                                */
/* ------------------------------------------------------------------ */
export interface EscalationDecision {
  id: string
  raidId: string
  decisionNeeded: string
  steeringDate: string
  escalatedOn: string
  escalatedTo: string
  decision?: string
  decidedOn?: string
  decidedBy?: string
}
export const seedEscalationDecisions: EscalationDecision[] = [
  { id: 'esc-r-001', raidId: 'r-001', decisionNeeded: 'Approve backup ISP contract (3% of Technology budget) and accept 2-week go-live slip for Wave 2', steeringDate: '2027-02-23', escalatedOn: '2027-02-10', escalatedTo: 'Steering Committee' },
  { id: 'esc-r-002', raidId: 'r-002', decisionNeeded: 'Approve additional hiring support budget for specialist roles (two agencies)', steeringDate: '2027-02-23', escalatedOn: '2027-02-12', escalatedTo: 'Steering Committee' },
  { id: 'esc-r-005', raidId: 'r-005', decisionNeeded: 'Approve split-order with second laptop supplier at 6% premium', steeringDate: '2027-02-16', escalatedOn: '2027-02-08', escalatedTo: 'Program Director', decision: 'Approved split order; procurement to execute by 27 Oct.', decidedOn: '2027-02-16', decidedBy: 'A. Sharma' },
  { id: 'esc-r-010', raidId: 'r-010', decisionNeeded: 'Approve retention bonus scheme for 18 critical roles', steeringDate: '2027-02-16', escalatedOn: '2027-02-06', escalatedTo: 'Steering Committee', decision: 'Approved in principle; HR to finalise scheme by 15 Nov.', decidedOn: '2027-02-16', decidedBy: 'Global CHRO' },
  { id: 'esc-r-011', raidId: 'r-011', decisionNeeded: 'Mandate global process owner attendance at KT sessions', steeringDate: '2027-02-09', escalatedOn: '2027-02-03', escalatedTo: 'Global COO', decision: 'Mandated; weekly attendance report to COO office.', decidedOn: '2027-02-09', decidedBy: 'Global COO' },
  { id: 'esc-i-027', raidId: 'i-027', decisionNeeded: 'Expedite system access for Wave 1 joiners via temporary accounts', steeringDate: '2027-02-09', escalatedOn: '2027-02-08', escalatedTo: 'Global CIO', decision: 'Temporary accounts approved; resolved 14 Oct.', decidedOn: '2027-02-09', decidedBy: 'Global CIO' },
]

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export const RAID_STATUSES: Status[] = ['Open', 'In Progress', 'At Risk', 'On Track', 'Overdue', 'Not Started', 'Resolved', 'Closed']
export const RAID_LEVELS: Impact[] = ['Critical', 'High', 'Medium', 'Low']
export const RAID_WORKSTREAMS = ['Technology & Infra', 'Technology & Data', 'Talent & Hiring', 'Legal & Compliance', 'Facilities & Infra', 'Transition', 'Operations', 'Procurement', 'Finance & Procurement', 'Program Management']
export const ESCALATION_STATUSES = ['Awaiting Decision', 'In Progress', 'Resolved'] as const
export const VIEW_OPTIONS = ['All Workstreams', ...WORKSTREAMS] as const

/** Map the RAID display workstream label to one of the seven program workstreams. */
export function canonicalWorkstream(label: string): Workstream {
  const l = label.toLowerCase()
  if (l.includes('tech')) return 'Technology & Infrastructure'
  if (l.includes('talent') || l.includes('hiring') || l.includes('people')) return 'Talent & Hiring'
  if (l.includes('legal') || l.includes('compliance')) return 'Legal & Compliance'
  if (l.includes('facilit') || l.includes('workplace')) return 'Facilities & Workplace'
  if (l.includes('transition')) return 'Transition Readiness'
  if (l.includes('finance') || l.includes('procure')) return 'Finance & Procurement'
  return 'Operations Setup'
}
export const matchesView = (r: RaidItem, view: string) => view === 'All Workstreams' || canonicalWorkstream(r.workstream) === view

/** Risk Status donut bucket for an open risk. */
export type StatusBucket = 'On Track' | 'At Risk' | 'Overdue' | 'Not Started'
export function statusBucket(r: RaidItem, today = '2027-02-20'): StatusBucket {
  if (r.status === 'Not Started') return 'Not Started'
  if (r.status === 'Overdue' || r.dueDate < today) return 'Overdue'
  if (r.status === 'At Risk' || r.status === 'Delayed' || (r.level === 'Critical' && r.status === 'Open')) return 'At Risk'
  return 'On Track'
}
export const STATUS_BUCKETS: { name: StatusBucket; color: string }[] = [
  { name: 'On Track', color: '#16A34A' }, { name: 'At Risk', color: '#F59E0B' }, { name: 'Overdue', color: '#DC2626' }, { name: 'Not Started', color: '#CBD5E1' },
]
export const CATEGORY_COLORS: Record<string, string> = {
  'People & Talent': '#1E5BBE', 'Technology & Data': '#5B9BF0', 'Facilities & Infra': '#8B5CF6', 'Process & Operations': '#14B8A6', 'Legal & Compliance': '#F59E0B', 'Vendor & Third Party': '#F97316',
}

/* Heat map: rows = likelihood (index into LIKELIHOOD), cols = impact (index into IMPACT_SCALE) */
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical'
const S: Severity[][] = [
  /* Very Low  */ ['Low', 'Low', 'Medium', 'Medium', 'High'],
  /* Low       */ ['Low', 'Low', 'Medium', 'High', 'High'],
  /* Medium    */ ['Low', 'Medium', 'High', 'High', 'High'],
  /* High      */ ['Medium', 'High', 'High', 'Critical', 'Critical'],
  /* Very High */ ['Medium', 'High', 'Critical', 'Critical', 'Critical'],
]
export const SEVERITY_COLORS: Record<Severity, string> = { Low: '#8FCF7A', Medium: '#F8D45C', High: '#F7A35C', Critical: '#EB5B52' }
export const cellSeverity = (li: number, ii: number): Severity => S[li][ii]
export const cellScore = (li: number, ii: number) => (li + 1) * (ii + 1)
export const likelihoodIndex = (v: string) => Math.max(0, LIKELIHOOD.indexOf(v as (typeof LIKELIHOOD)[number]))
export const impactIndex = (v: string) => Math.max(0, IMPACT_SCALE.indexOf(v as (typeof IMPACT_SCALE)[number]))

export const openRisks = (raid: RaidItem[]) => raid.filter((r) => r.type === 'Risk' && isOpen(r))
export const openIssues = (raid: RaidItem[]) => raid.filter((r) => r.type === 'Issue' && isOpen(r))

export function nextCode(raid: RaidItem[], type: 'Risk' | 'Issue') {
  const max = raid.reduce((m, r) => Math.max(m, parseInt(r.code.split('-')[1] ?? '0', 10) || 0), 0)
  return `${type === 'Risk' ? 'R' : 'I'}-${String(max + 1).padStart(3, '0')}`
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | undefined | boolean)[][]) {
  const esc = (v: string | number | undefined | boolean) => {
    const s = v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
