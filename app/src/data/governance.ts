/**
 * Governance page seed data and types.
 * Collections: 'steeringMeetings', 'decisions', 'changeRequests', 'actions', 'stakeholders', 'raci',
 *              'governanceEvents', 'controls', 'ragCriteria', 'governanceSettings'
 */
import type { Workstream } from './common'

/* ---------------- Governance structure (static, editable in settings) ---------------- */
export interface GovernanceSettings {
  id: 'governance'
  globalExecutiveSponsor: string
  indiaProgramSponsor: string
  programDirector: string
  programManager: string
  pmoLead: string
  steeringMembers: string[]
  plannedSteeringMeetings: number
  programHealthScore: number
}
export const seedGovernanceSettings: GovernanceSettings[] = [{
  id: 'governance',
  globalExecutiveSponsor: 'J. Whitfield (Group COO)',
  indiaProgramSponsor: 'N. Krishnan (GCC Head, India)',
  programDirector: 'R. Banerjee',
  programManager: 'Anita Sharma',
  pmoLead: 'D. Singh',
  steeringMembers: ['J. Whitfield (Group COO)', 'N. Krishnan (GCC Head)', 'L. Moreau (Global CFO)', 'T. Okafor (Global CIO)', 'H. Patel (Global CHRO)', 'R. Banerjee (Program Director)'],
  plannedSteeringMeetings: 10,
  programHealthScore: 78,
}]

/* ---------------- Steering committee meetings ---------------- */
export interface SteeringMeeting {
  id: string
  code: string
  date: string
  title: string
  agenda: string
  attendees: string
  decisionsTaken: string
  actions: string
  minutesStatus: 'Draft' | 'Circulated' | 'Approved' | 'Scheduled'
  status: 'Completed' | 'Scheduled' | 'Cancelled'
}
const SM = (n: number, date: string, title: string, agenda: string, decisionsTaken: string, actions: string, minutesStatus: SteeringMeeting['minutesStatus'], status: SteeringMeeting['status'] = 'Completed', attendees = 'J. Whitfield, N. Krishnan, L. Moreau, T. Okafor, H. Patel, R. Banerjee, A. Sharma'): SteeringMeeting =>
  ({ id: `sm-${String(n).padStart(3, '0')}`, code: `SC-${String(n).padStart(2, '0')}`, date, title, agenda, attendees, decisionsTaken, actions, minutesStatus, status })
export const seedSteeringMeetings: SteeringMeeting[] = [
  SM(1, '2026-01-28', 'Steering Committee #1 – Program mobilisation', 'Charter approval; governance structure; business case re-confirmation', 'Program charter approved; steering cadence set to monthly', 'Publish governance calendar; confirm workstream leads', 'Approved'),
  SM(2, '2026-02-25', 'Steering Committee #2 – Entity & site', 'Legal entity status; Bengaluru site shortlist; hiring plan', 'Bengaluru selected as primary site; entity incorporation approved', 'Lease negotiation to start; Wave 1 hiring plan baseline', 'Approved'),
  SM(3, '2026-03-25', 'Steering Committee #3 – Design sign-off', 'Operating model design; org structure; IT architecture', 'Operating model approved; hub-and-spoke IT architecture endorsed', 'Finalize role architecture; procure network provider', 'Approved'),
  SM(4, '2026-04-29', 'Steering Committee #4 – Build kick-off', 'Build phase plan; budget tranche release; fit-out contract', 'Build phase approved; ₹ 1.6 Cr tranche released', 'Award fit-out contract; start campus hiring', 'Approved'),
  SM(5, '2026-05-27', 'Steering Committee #5 – Hiring & facilities', 'Wave 1 hiring progress; fit-out status; vendor onboarding', 'Lateral hiring budget increase approved (CR-002)', 'Weekly hiring dashboard; fit-out risk review', 'Approved'),
  SM(6, '2026-06-24', 'Steering Committee #6 – Mid-year review', 'Program health; financial forecast; transition wave plan', 'Transition wave sequencing approved (Finance → IT → HR)', 'Prepare KT calendar; update FAC', 'Approved'),
  SM(7, '2026-07-29', 'Steering Committee #7 – Technology readiness', 'Network provisioning; security baseline; DR plan', 'Backup ISP procurement approved', 'Order secondary circuit; security audit scheduling', 'Approved'),
  SM(8, '2026-08-26', 'Steering Committee #8 – Wave 1 go-live', 'Wave 1 go/no-go; payroll go-live; SOP status', 'Wave 1 go-live approved for 15 Sep', 'Close SOP gaps; parallel payroll run', 'Approved'),
  SM(9, '2026-09-30', 'Steering Committee #9 – Wave 2 readiness', 'Wave 2 readiness; specialist hiring shortfall; escalations', 'Transition go/no-go moved to 04 Nov; specialist hiring agencies approved', 'Escalate network provisioning; confirm Wave 2 seats', 'Circulated'),
  SM(10, '2026-10-28', 'Steering Committee #10 – Transition go/no-go prep', 'Network escalation decision; CR-004 budget; Wave 3 plan; benefits forecast', '', '', 'Scheduled', 'Scheduled'),
  SM(11, '2026-11-25', 'Steering Committee #11 – Go-live review', 'Go-live outcome; stabilization KPIs; 2027 budget', '', '', 'Scheduled', 'Scheduled'),
]

export interface PackItem { id: string; item: string; owner: string; done: boolean }
export const seedPackChecklist: PackItem[] = [
  { id: 'pk-1', item: 'Program status summary & RAG by workstream', owner: 'A. Sharma', done: true },
  { id: 'pk-2', item: 'Milestone adherence & critical path update', owner: 'D. Singh', done: true },
  { id: 'pk-3', item: 'Financial forecast (budget vs FAC)', owner: 'V. Reddy', done: true },
  { id: 'pk-4', item: 'Decisions required (D-004, D-006, D-007)', owner: 'A. Sharma', done: false },
  { id: 'pk-5', item: 'Change requests for approval (CR-004, CR-005)', owner: 'R. Banerjee', done: false },
  { id: 'pk-6', item: 'Escalations & top risks', owner: 'A. Sharma', done: true },
  { id: 'pk-7', item: 'Benefits realization update', owner: 'L. Moreau', done: false },
  { id: 'pk-8', item: 'Pack circulated 3 working days before', owner: 'D. Singh', done: false },
]

/* ---------------- Decision log ---------------- */
export type DecisionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Deferred'
export interface Decision {
  id: string
  code: string
  title: string
  workstream: Workstream | 'Program Management'
  requestedBy: string
  decisionOwner: string
  requiredBy: string
  status: DecisionStatus
  impact: 'Critical' | 'High' | 'Medium' | 'Low'
  rationale: string
  decidedOn?: string
  forum: 'Steering Committee' | 'Program Director' | 'Workstream Lead'
}
const D = (n: number, p: Omit<Decision, 'id' | 'code'>): Decision => ({ id: `d-${String(n).padStart(3, '0')}`, code: `D-${String(n).padStart(3, '0')}`, ...p })
export const seedDecisions: Decision[] = [
  D(1, { title: 'Select Bengaluru as primary GCC site', workstream: 'Facilities & Workplace', requestedBy: 'K. Nair', decisionOwner: 'Steering Committee', requiredBy: '2026-02-25', status: 'Approved', impact: 'Critical', rationale: 'Best talent density and cost-to-quality ratio across the four shortlisted cities.', decidedOn: '2026-02-25', forum: 'Steering Committee' }),
  D(2, { title: 'Approve hub-and-spoke IT architecture', workstream: 'Technology & Infrastructure', requestedBy: 'R. Mehta', decisionOwner: 'T. Okafor', requiredBy: '2026-03-25', status: 'Approved', impact: 'High', rationale: 'Aligns with global security baseline; reduces DR complexity.', decidedOn: '2026-03-25', forum: 'Steering Committee' }),
  D(3, { title: 'Transition wave sequencing (Finance → IT → HR)', workstream: 'Transition Readiness', requestedBy: 'A. Sharma', decisionOwner: 'Steering Committee', requiredBy: '2026-06-24', status: 'Approved', impact: 'High', rationale: 'Finance processes most documented; earliest benefits.', decidedOn: '2026-06-24', forum: 'Steering Committee' }),
  D(4, { title: 'Activate backup ISP and re-sequence endpoint rollout', workstream: 'Technology & Infrastructure', requestedBy: 'R. Mehta', decisionOwner: 'T. Okafor', requiredBy: '2026-10-15', status: 'Pending', impact: 'Critical', rationale: 'Primary network provisioning is three weeks late; go-live exposure.', forum: 'Steering Committee' }),
  D(5, { title: 'Approve retention bonus scheme for critical roles', workstream: 'Talent & Hiring', requestedBy: 'S. Iyer', decisionOwner: 'H. Patel', requiredBy: '2026-10-10', status: 'Pending', impact: 'High', rationale: 'Attrition risk during transition for 18 critical roles.', forum: 'Program Director' }),
  D(6, { title: 'Engage two specialist hiring agencies', workstream: 'Talent & Hiring', requestedBy: 'S. Iyer', decisionOwner: 'Steering Committee', requiredBy: '2026-10-28', status: 'Pending', impact: 'High', rationale: 'Specialist pipeline 20% behind Wave 2 plan.', forum: 'Steering Committee' }),
  D(7, { title: 'Defer Wave 3 go/no-go to 04 Dec', workstream: 'Transition Readiness', requestedBy: 'A. Sharma', decisionOwner: 'Steering Committee', requiredBy: '2026-10-28', status: 'Pending', impact: 'High', rationale: 'KT completion and system access dependencies unresolved.', forum: 'Steering Committee' }),
  D(8, { title: 'Standardise KT documentation on global template', workstream: 'Transition Readiness', requestedBy: 'A. Sharma', decisionOwner: 'A. Sharma', requiredBy: '2026-10-22', status: 'Pending', impact: 'Medium', rationale: 'Three competing templates causing rework.', forum: 'Workstream Lead' }),
  D(9, { title: 'Accept dual filing path for labour registrations', workstream: 'Legal & Compliance', requestedBy: 'P. Rao', decisionOwner: 'R. Banerjee', requiredBy: '2026-11-05', status: 'Pending', impact: 'Medium', rationale: 'Draft regulatory amendments may change timelines.', forum: 'Program Director' }),
  D(10, { title: 'Open lateral hiring in Hyderabad', workstream: 'Talent & Hiring', requestedBy: 'S. Iyer', decisionOwner: 'Steering Committee', requiredBy: '2026-09-30', status: 'Deferred', impact: 'Medium', rationale: 'Deferred until Bengaluru Wave 2 numbers are confirmed.', decidedOn: '2026-09-30', forum: 'Steering Committee' }),
  D(11, { title: 'Second fit-out shift to recover handover', workstream: 'Facilities & Workplace', requestedBy: 'K. Nair', decisionOwner: 'R. Banerjee', requiredBy: '2026-10-12', status: 'Approved', impact: 'Medium', rationale: 'Milestone-linked payments protect budget.', decidedOn: '2026-10-09', forum: 'Program Director' }),
  D(12, { title: 'Outsource cafeteria operations to third party', workstream: 'Operations Setup', requestedBy: 'M. Khan', decisionOwner: 'N. Krishnan', requiredBy: '2026-09-15', status: 'Rejected', impact: 'Low', rationale: 'Rejected in favour of landlord-managed service for Year 1.', decidedOn: '2026-09-12', forum: 'Program Director' }),
  D(13, { title: 'Approve stabilization run-rate funding for Q1 2027', workstream: 'Finance & Procurement', requestedBy: 'V. Reddy', decisionOwner: 'L. Moreau', requiredBy: '2026-11-25', status: 'Pending', impact: 'High', rationale: 'Required for Operate phase budget baseline.', forum: 'Steering Committee' }),
]

/* ---------------- Change requests ---------------- */
export type CrStatus = 'Draft' | 'In Review' | 'Approved' | 'Rejected'
export interface ChangeRequest {
  id: string
  code: string
  title: string
  type: 'Scope' | 'Budget' | 'Timeline'
  workstream: Workstream | 'Program Management'
  raisedBy: string
  costImpactCr: number
  scheduleImpactDays: number
  status: CrStatus
  submitted: string
  decidedOn?: string
  description: string
  crossWorkstreamImpact: string
  benefitImpact: string
}
const CR = (n: number, p: Omit<ChangeRequest, 'id' | 'code'>): ChangeRequest => ({ id: `cr-${String(n).padStart(3, '0')}`, code: `CR-${String(n).padStart(3, '0')}`, ...p })
export const seedChangeRequests: ChangeRequest[] = [
  CR(1, { title: 'Add DR site readiness to Build scope', type: 'Scope', workstream: 'Technology & Infrastructure', raisedBy: 'R. Mehta', costImpactCr: 0.15, scheduleImpactDays: 10, status: 'Approved', submitted: '2026-04-10', decidedOn: '2026-04-29', description: 'Include disaster-recovery readiness in the Build phase instead of Operate.', crossWorkstreamImpact: 'Facilities (server room sizing), Finance (budget tranche)', benefitImpact: 'Protects go-live resilience; no benefit change' }),
  CR(2, { title: 'Increase lateral hiring budget', type: 'Budget', workstream: 'Talent & Hiring', raisedBy: 'S. Iyer', costImpactCr: 0.20, scheduleImpactDays: 0, status: 'Approved', submitted: '2026-05-12', decidedOn: '2026-05-27', description: 'Agency fees for 40 additional lateral hires in Wave 1.', crossWorkstreamImpact: 'Finance (FAC), Facilities (seats)', benefitImpact: 'Accelerates productivity gains by one quarter' }),
  CR(3, { title: 'Extend fit-out completion by 3 weeks', type: 'Timeline', workstream: 'Facilities & Workplace', raisedBy: 'K. Nair', costImpactCr: 0.05, scheduleImpactDays: 21, status: 'Rejected', submitted: '2026-09-05', decidedOn: '2026-09-30', description: 'Contractor requested extension due to material delays.', crossWorkstreamImpact: 'Talent (Wave 2 seats), Transition (Wave 2 go-live)', benefitImpact: 'Would delay ₹ 0.3 Cr of cost savings' }),
  CR(4, { title: 'Backup ISP circuit and network acceleration', type: 'Budget', workstream: 'Technology & Infrastructure', raisedBy: 'R. Mehta', costImpactCr: 0.12, scheduleImpactDays: -14, status: 'In Review', submitted: '2026-10-08', description: 'Secondary circuit from alternate ISP plus overtime for core switching install.', crossWorkstreamImpact: 'Transition (system access), Finance (contingency draw)', benefitImpact: 'Protects 12 Nov go-live and Q4 benefits' }),
  CR(5, { title: 'Specialist agency engagement for Wave 2', type: 'Budget', workstream: 'Talent & Hiring', raisedBy: 'S. Iyer', costImpactCr: 0.08, scheduleImpactDays: 0, status: 'In Review', submitted: '2026-10-12', description: 'Two specialist agencies for Data Engineering and Cybersecurity roles.', crossWorkstreamImpact: 'Finance (FAC), Technology (onboarding)', benefitImpact: 'Recovers productivity gains forecast' }),
  CR(6, { title: 'Move Wave 3 scope (HR Ops) to Q1 2027', type: 'Timeline', workstream: 'Transition Readiness', raisedBy: 'A. Sharma', costImpactCr: 0, scheduleImpactDays: 45, status: 'In Review', submitted: '2026-10-15', description: 'Re-baseline Wave 3 to allow KT completion and system access.', crossWorkstreamImpact: 'Talent (hiring sequence), Operations (support model)', benefitImpact: 'Defers ₹ 0.4 Cr of 2026 benefits to 2027' }),
  CR(7, { title: 'Add employee transport service to Operations scope', type: 'Scope', workstream: 'Operations Setup', raisedBy: 'M. Khan', costImpactCr: 0.06, scheduleImpactDays: 0, status: 'Draft', submitted: '2026-10-18', description: 'Night-shift transport for Wave 2 global support roles.', crossWorkstreamImpact: 'Finance (run-rate), Legal (vendor compliance)', benefitImpact: 'None' }),
  CR(8, { title: 'Reduce Pune satellite office scope', type: 'Scope', workstream: 'Facilities & Workplace', raisedBy: 'K. Nair', costImpactCr: -0.18, scheduleImpactDays: 0, status: 'Draft', submitted: '2026-10-19', description: 'Defer satellite office until headcount exceeds 500.', crossWorkstreamImpact: 'Talent (location strategy)', benefitImpact: 'Improves cost savings by ₹ 0.18 Cr' }),
]

/* ---------------- Actions register ---------------- */
export interface ActionItem {
  id: string
  code: string
  action: string
  owner: string
  due: string
  source: string
  status: 'Open' | 'In Progress' | 'Completed' | 'Overdue'
  workstream: Workstream | 'Program Management'
}
const A = (n: number, p: Omit<ActionItem, 'id' | 'code'>): ActionItem => ({ id: `a-${String(n).padStart(3, '0')}`, code: `A-${String(n).padStart(3, '0')}`, ...p })
export const seedActions: ActionItem[] = [
  A(1, { action: 'Escalate network provisioning issue to steering committee', owner: 'A. Sharma', due: '2026-10-28', source: 'SC-09', status: 'In Progress', workstream: 'Technology & Infrastructure' }),
  A(2, { action: 'Confirm Wave 2 seat allocation with facilities', owner: 'K. Nair', due: '2026-10-22', source: 'SC-09', status: 'In Progress', workstream: 'Facilities & Workplace' }),
  A(3, { action: 'Finalize data access approvals with global IT security', owner: 'K. Nair', due: '2026-10-25', source: 'Weekly review 13 Oct', status: 'Open', workstream: 'Technology & Infrastructure' }),
  A(4, { action: 'Issue SOP ownership list and sign-off plan', owner: 'D. Singh', due: '2026-10-22', source: 'Weekly review 13 Oct', status: 'Open', workstream: 'Operations Setup' }),
  A(5, { action: 'Order secondary circuit from alternate ISP', owner: 'R. Mehta', due: '2026-10-15', source: 'SC-07', status: 'Overdue', workstream: 'Technology & Infrastructure' }),
  A(6, { action: 'Lock KT calendar with global process owners', owner: 'A. Sharma', due: '2026-10-24', source: 'Weekly review 06 Oct', status: 'In Progress', workstream: 'Transition Readiness' }),
  A(7, { action: 'Publish retention scheme proposal for critical roles', owner: 'S. Iyer', due: '2026-10-10', source: 'SC-08', status: 'Overdue', workstream: 'Talent & Hiring' }),
  A(8, { action: 'Run second parallel payroll before go-live', owner: 'V. Reddy', due: '2026-11-05', source: 'SC-08', status: 'Open', workstream: 'Finance & Procurement' }),
  A(9, { action: 'Prepare benefits realization update for SC-10', owner: 'L. Moreau', due: '2026-10-23', source: 'SC-09', status: 'Open', workstream: 'Program Management' }),
  A(10, { action: 'Circulate SC-09 minutes for approval', owner: 'D. Singh', due: '2026-10-07', source: 'SC-09', status: 'Completed', workstream: 'Program Management' }),
  A(11, { action: 'Tax advisor methodology paper on transfer pricing', owner: 'P. Rao', due: '2026-11-15', source: 'Weekly review 29 Sep', status: 'Open', workstream: 'Legal & Compliance' }),
  A(12, { action: 'Daily site walk and punch-list closure tracking', owner: 'M. Khan', due: '2026-10-30', source: 'Weekly review 13 Oct', status: 'In Progress', workstream: 'Facilities & Workplace' }),
  A(13, { action: 'Update program baseline after CR-001 approval', owner: 'D. Singh', due: '2026-05-15', source: 'SC-04', status: 'Completed', workstream: 'Program Management' }),
  A(14, { action: 'Confirm Wave 1 go-live hypercare exit criteria', owner: 'A. Sharma', due: '2026-10-01', source: 'SC-08', status: 'Completed', workstream: 'Transition Readiness' }),
]

/* ---------------- Stakeholders & RACI ---------------- */
export interface Stakeholder {
  id: string
  name: string
  role: string
  organization: string
  influence: 'High' | 'Medium' | 'Low'
  interest: 'High' | 'Medium' | 'Low'
  engagement: 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly' | 'As needed'
  owner: string
  group: 'Global Executive' | 'Global Functional' | 'India Leadership' | 'External'
  sentiment: 'Supportive' | 'Neutral' | 'Concerned'
}
const S = (n: number, p: Omit<Stakeholder, 'id'>): Stakeholder => ({ id: `st-${String(n).padStart(3, '0')}`, ...p })
export const seedStakeholders: Stakeholder[] = [
  S(1, { name: 'J. Whitfield', role: 'Group COO / Global Executive Sponsor', organization: 'Group HQ', influence: 'High', interest: 'High', engagement: 'Monthly', owner: 'R. Banerjee', group: 'Global Executive', sentiment: 'Supportive' }),
  S(2, { name: 'L. Moreau', role: 'Global CFO', organization: 'Group Finance', influence: 'High', interest: 'High', engagement: 'Monthly', owner: 'V. Reddy', group: 'Global Executive', sentiment: 'Neutral' }),
  S(3, { name: 'T. Okafor', role: 'Global CIO', organization: 'Group IT', influence: 'High', interest: 'High', engagement: 'Fortnightly', owner: 'R. Mehta', group: 'Global Executive', sentiment: 'Concerned' }),
  S(4, { name: 'H. Patel', role: 'Global CHRO', organization: 'Group HR', influence: 'High', interest: 'Medium', engagement: 'Monthly', owner: 'S. Iyer', group: 'Global Executive', sentiment: 'Supportive' }),
  S(5, { name: 'N. Krishnan', role: 'GCC Head / India Program Sponsor', organization: 'GCC India', influence: 'High', interest: 'High', engagement: 'Weekly', owner: 'A. Sharma', group: 'India Leadership', sentiment: 'Supportive' }),
  S(6, { name: 'R. Banerjee', role: 'GCC Program Director', organization: 'GCC India', influence: 'High', interest: 'High', engagement: 'Weekly', owner: 'A. Sharma', group: 'India Leadership', sentiment: 'Supportive' }),
  S(7, { name: 'E. Lindqvist', role: 'Global Head of Finance Operations', organization: 'Group Finance', influence: 'Medium', interest: 'High', engagement: 'Fortnightly', owner: 'A. Sharma', group: 'Global Functional', sentiment: 'Neutral' }),
  S(8, { name: 'M. Chen', role: 'Global Head of IT Service Delivery', organization: 'Group IT', influence: 'Medium', interest: 'High', engagement: 'Weekly', owner: 'R. Mehta', group: 'Global Functional', sentiment: 'Concerned' }),
  S(9, { name: 'G. Alvarez', role: 'Global Head of Real Estate', organization: 'Group Facilities', influence: 'Medium', interest: 'Medium', engagement: 'Monthly', owner: 'K. Nair', group: 'Global Functional', sentiment: 'Supportive' }),
  S(10, { name: 'S. Desai', role: 'Group General Counsel', organization: 'Group Legal', influence: 'High', interest: 'Low', engagement: 'Quarterly', owner: 'P. Rao', group: 'Global Executive', sentiment: 'Neutral' }),
  S(11, { name: 'Works Council (EU)', role: 'Employee representation', organization: 'EU entities', influence: 'Medium', interest: 'High', engagement: 'Monthly', owner: 'H. Patel', group: 'External', sentiment: 'Concerned' }),
  S(12, { name: 'Karnataka IT Dept.', role: 'State regulator', organization: 'Government', influence: 'Medium', interest: 'Low', engagement: 'As needed', owner: 'P. Rao', group: 'External', sentiment: 'Neutral' }),
  S(13, { name: 'Landlord – Prestige Tech Park', role: 'Facility provider', organization: 'External vendor', influence: 'Low', interest: 'Medium', engagement: 'Fortnightly', owner: 'K. Nair', group: 'External', sentiment: 'Supportive' }),
  S(14, { name: 'Receiving team leads (Wave 2)', role: 'Process owners', organization: 'Global functions', influence: 'Low', interest: 'High', engagement: 'Weekly', owner: 'A. Sharma', group: 'Global Functional', sentiment: 'Neutral' }),
]

export const RACI_ROLES = ['Global Exec Sponsor', 'India Sponsor', 'Program Director', 'Program Manager', 'Workstream Lead', 'PMO', 'Global Function Head'] as const
export type RaciValue = 'R' | 'A' | 'C' | 'I' | ''
export interface RaciRow { id: string; workstream: Workstream; cells: Record<string, RaciValue> }
const WS7: Workstream[] = ['Talent & Hiring', 'Technology & Infrastructure', 'Legal & Compliance', 'Facilities & Workplace', 'Transition Readiness', 'Operations Setup', 'Finance & Procurement']
export const seedRaci: RaciRow[] = WS7.map((ws, i) => ({
  id: `raci-${i}`,
  workstream: ws,
  cells: { 'Global Exec Sponsor': 'I', 'India Sponsor': 'A', 'Program Director': i === 4 ? 'A' : 'C', 'Program Manager': 'C', 'Workstream Lead': 'R', PMO: 'I', 'Global Function Head': i === 0 || i === 1 || i === 6 ? 'C' : 'I' },
}))

/* ---------------- Governance calendar ---------------- */
export interface GovEvent {
  id: string
  title: string
  type: 'Steering Committee' | 'Integrated Program Review' | 'Workstream Status' | 'Quarterly Business Review' | 'Go/No-Go' | 'Audit / Compliance' | 'Other'
  date: string
  cadence: 'Weekly' | 'Monthly' | 'Quarterly' | 'One-off'
  owner: string
  attendees: string
}
const E = (n: number, p: Omit<GovEvent, 'id'>): GovEvent => ({ id: `ev-${String(n).padStart(3, '0')}`, ...p })
function buildEvents(): GovEvent[] {
  const ev: GovEvent[] = [
    E(1, { title: 'Steering Committee #10', type: 'Steering Committee', date: '2026-10-28', cadence: 'Monthly', owner: 'R. Banerjee', attendees: 'Steering members' }),
    E(2, { title: 'Steering Committee #11', type: 'Steering Committee', date: '2026-11-25', cadence: 'Monthly', owner: 'R. Banerjee', attendees: 'Steering members' }),
    E(3, { title: 'Steering Committee #12', type: 'Steering Committee', date: '2026-12-16', cadence: 'Monthly', owner: 'R. Banerjee', attendees: 'Steering members' }),
    E(4, { title: 'Q4 Quarterly Business Review', type: 'Quarterly Business Review', date: '2026-12-10', cadence: 'Quarterly', owner: 'J. Whitfield', attendees: 'Group ExCo, GCC leadership' }),
    E(5, { title: 'Transition go/no-go review', type: 'Go/No-Go', date: '2026-11-04', cadence: 'One-off', owner: 'A. Sharma', attendees: 'Steering members, workstream leads' }),
    E(6, { title: 'Go/No-Go for Wave 3', type: 'Go/No-Go', date: '2026-12-04', cadence: 'One-off', owner: 'A. Sharma', attendees: 'Steering members, workstream leads' }),
    E(7, { title: 'Security & compliance audit', type: 'Audit / Compliance', date: '2026-11-18', cadence: 'One-off', owner: 'P. Rao', attendees: 'Internal audit, R. Mehta, P. Rao' }),
    E(8, { title: 'Q1 2027 Quarterly Business Review', type: 'Quarterly Business Review', date: '2027-03-17', cadence: 'Quarterly', owner: 'J. Whitfield', attendees: 'Group ExCo, GCC leadership' }),
  ]
  let n = 9
  // Weekly integrated program reviews (Tuesdays) and workstream status (Thursdays) from 20 Oct to end Dec 2026
  for (let d = new Date('2026-10-20'); d <= new Date('2026-12-31'); d.setDate(d.getDate() + 7)) {
    const iso = d.toISOString().slice(0, 10)
    ev.push(E(n++, { title: 'Weekly integrated program review', type: 'Integrated Program Review', date: iso, cadence: 'Weekly', owner: 'A. Sharma', attendees: 'Workstream leads, PMO' }))
    const t = new Date(d); t.setDate(t.getDate() + 2)
    ev.push(E(n++, { title: 'Weekly workstream status', type: 'Workstream Status', date: t.toISOString().slice(0, 10), cadence: 'Weekly', owner: 'D. Singh', attendees: 'Workstream leads' }))
  }
  return ev.sort((a, b) => a.date.localeCompare(b.date))
}
export const seedGovEvents: GovEvent[] = buildEvents()

/* ---------------- Policies & controls ---------------- */
export interface Control {
  id: string
  control: string
  wbs: string
  description: string
  owner: string
  status: 'Active' | 'In Progress' | 'Planned' | 'Needs Review'
  lastReviewed: string
  evidence: string
}
export const seedControls: Control[] = [
  { id: 'ctl-1', control: 'Steering committee composition & terms of reference', wbs: '1.3.1', description: 'Membership, quorum and decision rights of the steering committee.', owner: 'R. Banerjee', status: 'Active', lastReviewed: '2026-09-30', evidence: 'ToR v2.1' },
  { id: 'ctl-2', control: 'Decision-making authority & escalation thresholds', wbs: '1.3.2', description: 'Delegation matrix: Workstream Lead < ₹ 5 L; Program Director < ₹ 25 L; Steering Committee above.', owner: 'A. Sharma', status: 'Active', lastReviewed: '2026-08-15', evidence: 'Delegation matrix v1.3' },
  { id: 'ctl-3', control: 'Workstream governance calendar', wbs: '1.3.3', description: 'Published cadence for all reviews, steering and QBRs.', owner: 'D. Singh', status: 'Active', lastReviewed: '2026-10-01', evidence: 'Governance calendar Q4' },
  { id: 'ctl-4', control: 'Weekly & monthly reporting templates', wbs: '1.3.4', description: 'Standard status report and steering pack templates.', owner: 'D. Singh', status: 'Needs Review', lastReviewed: '2026-06-10', evidence: 'Template pack v3 (versioning issue I-034)' },
  { id: 'ctl-5', control: 'RAID, action, dependency & decision registers', wbs: '1.3.5', description: 'Single registers maintained in the Command Center; reviewed weekly.', owner: 'A. Sharma', status: 'Active', lastReviewed: '2026-10-13', evidence: 'Registers (this tool)' },
  { id: 'ctl-6', control: 'Program change-request process', wbs: '1.3.6', description: 'Capture, impact assessment, approval and baseline update for scope/budget/timeline changes.', owner: 'A. Sharma', status: 'Active', lastReviewed: '2026-09-01', evidence: 'CR procedure v1.2' },
  { id: 'ctl-7', control: 'Deliverable acceptance & sign-off procedure', wbs: '1.3.7', description: 'Acceptance criteria, evidence and sign-off roles per deliverable.', owner: 'D. Singh', status: 'In Progress', lastReviewed: '2026-09-20', evidence: 'Acceptance log (62% deliverables mapped)' },
  { id: 'ctl-8', control: 'Program health indicators & RAG criteria', wbs: '1.3.8', description: 'Objective thresholds for schedule, budget, scope and risk RAG.', owner: 'A. Sharma', status: 'Active', lastReviewed: '2026-07-15', evidence: 'RAG criteria table' },
  { id: 'ctl-9', control: 'Document repository & version control', wbs: '1.3.9', description: 'SharePoint program library with controlled folders and naming standard.', owner: 'D. Singh', status: 'Active', lastReviewed: '2026-08-30', evidence: 'Library audit Aug 2026' },
  { id: 'ctl-10', control: 'Weekly integrated program reviews', wbs: '1.3.10', description: 'Cross-workstream review of status, dependencies and escalations.', owner: 'A. Sharma', status: 'Active', lastReviewed: '2026-10-13', evidence: '38 of 41 reviews held' },
  { id: 'ctl-11', control: 'Stakeholder contact & escalation matrix', wbs: '13.1.5', description: 'Named escalation path per stakeholder group.', owner: 'A. Sharma', status: 'In Progress', lastReviewed: '2026-09-10', evidence: 'Stakeholder register' },
  { id: 'ctl-12', control: 'Program communication plan', wbs: '13.2.1', description: 'Audience, channel and frequency for program communications.', owner: 'D. Singh', status: 'Planned', lastReviewed: '', evidence: 'Draft due 31 Oct' },
]

export interface RagCriterion {
  id: string
  dimension: string
  green: string
  amber: string
  red: string
}
export const seedRagCriteria: RagCriterion[] = [
  { id: 'rag-1', dimension: 'Schedule', green: 'Milestone variance ≤ 5 days; critical path intact', amber: 'Variance 6–15 days; recovery plan in place', red: 'Variance > 15 days or go-live at risk' },
  { id: 'rag-2', dimension: 'Budget', green: 'FAC within ±5% of approved budget', amber: 'FAC overrun 5–10% or contingency > 50% used', red: 'FAC overrun > 10%; CR required' },
  { id: 'rag-3', dimension: 'Scope', green: 'No unapproved scope change', amber: 'CR in review with schedule or cost impact', red: 'Scope change without approval or baseline impact' },
  { id: 'rag-4', dimension: 'Risks & Issues', green: 'No open Critical; High items have mitigation', amber: '1–2 open Critical with mitigation on track', red: '> 2 open Critical or unmitigated High items' },
  { id: 'rag-5', dimension: 'Resources', green: 'Hiring ≥ 95% of plan; key roles filled', amber: 'Hiring 85–95% of plan; ≤ 2 key roles vacant', red: 'Hiring < 85% of plan or > 2 key roles vacant' },
  { id: 'rag-6', dimension: 'Benefits', green: 'Forecast ≥ 90% of target', amber: 'Forecast 75–90% of target', red: 'Forecast < 75% of target' },
]
