/**
 * Governance page seed data and types.
 * Collections: 'steeringMeetings', 'decisions', 'changeRequests', 'actions', 'stakeholders', 'raci',
 *              'governanceEvents', 'controls', 'ragCriteria', 'governanceSettings',
 *              'businessUnitGovernance' (per-unit sponsor / cadence), 'businessUnitRaci' (units × roles),
 *              'governanceRaidLinks' (business unit / project tag per shared RAID item id)
 *
 * Business unit is a dimension on every governance record: decisions, change requests, actions, meeting agenda /
 * decision items, stakeholders, events and controls. `'Program-wide'` marks records that are not unit-specific.
 */
import type { Workstream } from './common'
import { BU_NAMES } from './businessUnits'

/** Marker for records that belong to the program rather than to one business unit. */
export const PROGRAM_WIDE = 'Program-wide'
const [SAP, MS, DATA, RD_PROD, RD_CLOUD, FIN, HR] = BU_NAMES

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
  /** Business unit governance health: score (weighted open items) at or above which a unit is Amber / Red. */
  unitHealthAmberFrom: number
  unitHealthRedFrom: number
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
  unitHealthAmberFrom: 5,
  unitHealthRedFrom: 12,
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
  /** Business unit tag per ;-separated agenda item (index-aligned; missing = Program-wide). */
  agendaUnits?: string[]
  /** Business unit tag per ;-separated decision taken (index-aligned; missing = Program-wide). */
  decisionUnits?: string[]
}
export interface MeetingItem { text: string; businessUnit: string }
/** Split a ;-separated list and pair each item with its business unit tag. */
export const splitItems = (text: string, units?: string[]): MeetingItem[] => text.split(';').map((t) => t.trim()).map((t, i) => ({ text: t, businessUnit: units?.[i] || PROGRAM_WIDE })).filter((x) => x.text)
export const agendaItems = (m: SteeringMeeting) => splitItems(m.agenda, m.agendaUnits)
export const decisionItems = (m: SteeringMeeting) => splitItems(m.decisionsTaken, m.decisionUnits)
/** Business units touched by a meeting (agenda or decisions). */
export const meetingUnits = (m: SteeringMeeting) => Array.from(new Set([...agendaItems(m), ...decisionItems(m)].map((x) => x.businessUnit)))
const SM = (n: number, date: string, title: string, agenda: string, decisionsTaken: string, actions: string, minutesStatus: SteeringMeeting['minutesStatus'], status: SteeringMeeting['status'] = 'Completed', tags: { agenda?: string[]; decisions?: string[] } = {}, attendees = 'J. Whitfield, N. Krishnan, L. Moreau, T. Okafor, H. Patel, R. Banerjee, A. Sharma'): SteeringMeeting =>
  ({ id: `sm-${String(n).padStart(3, '0')}`, code: `SC-${String(n).padStart(2, '0')}`, date, title, agenda, attendees, decisionsTaken, actions, minutesStatus, status, agendaUnits: tags.agenda, decisionUnits: tags.decisions })
const PW = PROGRAM_WIDE
export const seedSteeringMeetings: SteeringMeeting[] = [
  SM(1, '2026-01-28', 'Steering Committee #1 – Program mobilisation', 'Charter approval; governance structure; business case re-confirmation', 'Program charter approved; steering cadence set to monthly', 'Publish governance calendar; confirm workstream leads', 'Approved'),
  SM(2, '2026-02-25', 'Steering Committee #2 – Entity & site', 'Legal entity status; Bengaluru site shortlist; hiring plan', 'Bengaluru selected as primary site; entity incorporation approved', 'Lease negotiation to start; Wave 1 hiring plan baseline', 'Approved'),
  SM(3, '2026-03-25', 'Steering Committee #3 – Design sign-off', 'Operating model design; org structure; IT architecture; SAP and Microsoft practice scope', 'Operating model approved; hub-and-spoke IT architecture endorsed; SAP Practice confirmed as Wave 1 anchor', 'Finalize role architecture; procure network provider', 'Approved', 'Completed', { agenda: [PW, PW, PW, SAP], decisions: [PW, PW, SAP] }),
  SM(4, '2026-04-29', 'Steering Committee #4 – Build kick-off', 'Build phase plan; budget tranche release; fit-out contract', 'Build phase approved; ₹ 1.6 Cr tranche released', 'Award fit-out contract; start campus hiring', 'Approved'),
  SM(5, '2026-05-27', 'Steering Committee #5 – Hiring & facilities', 'Wave 1 hiring progress; fit-out status; vendor onboarding; Data & AI hiring mix', 'Lateral hiring budget increase approved (CR-002); Data & AI Practice to hire 60% laterals', 'Weekly hiring dashboard; fit-out risk review', 'Approved', 'Completed', { agenda: [PW, PW, PW, DATA], decisions: [PW, DATA] }),
  SM(6, '2026-06-24', 'Steering Committee #6 – Mid-year review', 'Program health; financial forecast; transition wave plan; BI migration data privacy', 'Transition wave sequencing approved (Finance → IT → HR); PII masking standard mandated for BI migration', 'Prepare KT calendar; update FAC', 'Approved', 'Completed', { agenda: [PW, PW, PW, DATA], decisions: [PW, DATA] }),
  SM(7, '2026-07-29', 'Steering Committee #7 – Technology readiness', 'Network provisioning; security baseline; DR plan; cloud landing zone for R&D', 'Backup ISP procurement approved; landing-zone hardening added to Wave 3 prerequisites', 'Order secondary circuit; security audit scheduling', 'Approved', 'Completed', { agenda: [PW, PW, PW, RD_CLOUD], decisions: [PW, RD_CLOUD] }),
  SM(8, '2026-08-26', 'Steering Committee #8 – Wave 1 go-live', 'Wave 1 go/no-go; payroll go-live; SOP status; Power Platform CoE ownership', 'Wave 1 go-live approved for 15 Sep; Power Platform CoE established under GCC ownership', 'Close SOP gaps; parallel payroll run', 'Approved', 'Completed', { agenda: [PW, HR, PW, MS], decisions: [PW, MS] }),
  SM(9, '2026-09-30', 'Steering Committee #9 – Wave 2 readiness', 'Wave 2 readiness; specialist hiring shortfall; escalations; S/4HANA AMS staffing model; APAC FI/CO hypercare', 'Transition go/no-go moved to 04 Nov; specialist hiring agencies approved; APAC FI/CO hypercare scope accepted into Wave 2', 'Escalate network provisioning; confirm Wave 2 seats; AMS staffing options paper', 'Circulated', 'Completed', { agenda: [PW, DATA, PW, SAP, SAP], decisions: [PW, DATA, SAP] }),
  SM(10, '2026-10-28', 'Steering Committee #10 – Transition go/no-go prep', 'Network escalation decision; CR-004 budget; Wave 3 plan; benefits forecast; S/4HANA AMS staffing model (D-014); payments squad ramp (D-021); lakehouse production access (D-019)', '', '', 'Scheduled', 'Scheduled', { agenda: [PW, PW, PW, PW, SAP, RD_PROD, DATA] }),
  SM(11, '2026-11-25', 'Steering Committee #11 – Go-live review', 'Go-live outcome; stabilization KPIs; 2027 budget; record-to-report process ownership (D-025); payroll support ownership (D-027)', '', '', 'Scheduled', 'Scheduled', { agenda: [PW, PW, PW, FIN, HR] }),
]

export interface PackItem { id: string; item: string; owner: string; done: boolean }
export const seedPackChecklist: PackItem[] = [
  { id: 'pk-1', item: 'Program status summary & RAG by workstream', owner: 'A. Sharma', done: true },
  { id: 'pk-2', item: 'Milestone adherence & critical path update', owner: 'D. Singh', done: true },
  { id: 'pk-3', item: 'Financial forecast (budget vs FAC)', owner: 'V. Reddy', done: true },
  { id: 'pk-4', item: 'Decisions required (D-004, D-006, D-007, D-014, D-019, D-021)', owner: 'A. Sharma', done: false },
  { id: 'pk-5', item: 'Change requests for approval (CR-004, CR-005, CR-009, CR-010)', owner: 'R. Banerjee', done: false },
  { id: 'pk-9', item: 'Business unit governance summary (health, open items per unit)', owner: 'D. Singh', done: false },
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
  /** Business unit the decision belongs to, or Program-wide. */
  businessUnit: string
  /** Optional transition project ('transitionProjects' id) the decision relates to. */
  projectId?: string
}
const D = (n: number, p: Omit<Decision, 'id' | 'code' | 'businessUnit'> & { businessUnit?: string }): Decision => ({ id: `d-${String(n).padStart(3, '0')}`, code: `D-${String(n).padStart(3, '0')}`, businessUnit: PROGRAM_WIDE, ...p })
export const seedDecisions: Decision[] = [
  D(1, { title: 'Select Bengaluru as primary GCC site', workstream: 'Facilities & Workplace', requestedBy: 'K. Nair', decisionOwner: 'Steering Committee', requiredBy: '2026-02-25', status: 'Approved', impact: 'Critical', rationale: 'Best talent density and cost-to-quality ratio across the four shortlisted cities.', decidedOn: '2026-02-25', forum: 'Steering Committee' }),
  D(2, { title: 'Approve hub-and-spoke IT architecture', workstream: 'Technology & Infrastructure', requestedBy: 'R. Mehta', decisionOwner: 'T. Okafor', requiredBy: '2026-03-25', status: 'Approved', impact: 'High', rationale: 'Aligns with global security baseline; reduces DR complexity.', decidedOn: '2026-03-25', forum: 'Steering Committee' }),
  D(3, { title: 'Transition wave sequencing (Finance → IT → HR)', workstream: 'Transition Readiness', requestedBy: 'A. Sharma', decisionOwner: 'Steering Committee', requiredBy: '2026-06-24', status: 'Approved', impact: 'High', rationale: 'Finance processes most documented; earliest benefits.', decidedOn: '2026-06-24', forum: 'Steering Committee' }),
  D(4, { title: 'Activate backup ISP and re-sequence endpoint rollout', workstream: 'Technology & Infrastructure', requestedBy: 'R. Mehta', decisionOwner: 'T. Okafor', requiredBy: '2026-10-15', status: 'Pending', impact: 'Critical', rationale: 'Primary network provisioning is three weeks late; go-live exposure.', forum: 'Steering Committee' }),
  D(5, { title: 'Approve retention bonus scheme for critical roles', workstream: 'Talent & Hiring', requestedBy: 'S. Iyer', decisionOwner: 'H. Patel', requiredBy: '2026-10-10', status: 'Pending', impact: 'High', rationale: 'Attrition risk during transition for 18 critical roles.', forum: 'Program Director' }),
  D(6, { title: 'Engage two specialist hiring agencies', workstream: 'Talent & Hiring', requestedBy: 'S. Iyer', decisionOwner: 'Steering Committee', requiredBy: '2026-10-28', status: 'Pending', impact: 'High', rationale: 'Specialist pipeline 20% behind Wave 2 plan (data engineering and cybersecurity roles).', forum: 'Steering Committee', businessUnit: DATA, projectId: 'p-data-eng' }),
  D(7, { title: 'Defer Wave 3 go/no-go to 04 Dec', workstream: 'Transition Readiness', requestedBy: 'A. Sharma', decisionOwner: 'Steering Committee', requiredBy: '2026-10-28', status: 'Pending', impact: 'High', rationale: 'KT completion and system access dependencies unresolved.', forum: 'Steering Committee' }),
  D(8, { title: 'Standardise KT documentation on global template', workstream: 'Transition Readiness', requestedBy: 'A. Sharma', decisionOwner: 'A. Sharma', requiredBy: '2026-10-22', status: 'Pending', impact: 'Medium', rationale: 'Three competing templates causing rework.', forum: 'Workstream Lead' }),
  D(9, { title: 'Accept dual filing path for labour registrations', workstream: 'Legal & Compliance', requestedBy: 'P. Rao', decisionOwner: 'R. Banerjee', requiredBy: '2026-11-05', status: 'Pending', impact: 'Medium', rationale: 'Draft regulatory amendments may change timelines.', forum: 'Program Director' }),
  D(10, { title: 'Open lateral hiring in Hyderabad', workstream: 'Talent & Hiring', requestedBy: 'S. Iyer', decisionOwner: 'Steering Committee', requiredBy: '2026-09-30', status: 'Deferred', impact: 'Medium', rationale: 'Deferred until Bengaluru Wave 2 numbers are confirmed.', decidedOn: '2026-09-30', forum: 'Steering Committee' }),
  D(11, { title: 'Second fit-out shift to recover handover', workstream: 'Facilities & Workplace', requestedBy: 'K. Nair', decisionOwner: 'R. Banerjee', requiredBy: '2026-10-12', status: 'Approved', impact: 'Medium', rationale: 'Milestone-linked payments protect budget.', decidedOn: '2026-10-09', forum: 'Program Director' }),
  D(12, { title: 'Outsource cafeteria operations to third party', workstream: 'Operations Setup', requestedBy: 'M. Khan', decisionOwner: 'N. Krishnan', requiredBy: '2026-09-15', status: 'Rejected', impact: 'Low', rationale: 'Rejected in favour of landlord-managed service for Year 1.', decidedOn: '2026-09-12', forum: 'Program Director' }),
  D(13, { title: 'Approve stabilization run-rate funding for Q1 2027', workstream: 'Finance & Procurement', requestedBy: 'V. Reddy', decisionOwner: 'L. Moreau', requiredBy: '2026-11-25', status: 'Pending', impact: 'High', rationale: 'Required for Operate phase budget baseline.', forum: 'Steering Committee' }),
  // ---- business-unit level decisions
  D(14, { title: 'Approve S/4HANA AMS L2/L3 staffing model (24 → 30 FTE)', workstream: 'Transition Readiness', requestedBy: 'R. Mehta', decisionOwner: 'Steering Committee', requiredBy: '2026-10-28', status: 'Pending', impact: 'High', rationale: 'Europe AMS ticket volumes 25% above baseline; shift coverage needs a third L2 pod.', forum: 'Steering Committee', businessUnit: SAP, projectId: 'p-sap-ams' }),
  D(15, { title: 'Select AMS ticketing tool (Solution Manager vs ServiceNow)', workstream: 'Technology & Infrastructure', requestedBy: 'R. Mehta', decisionOwner: 'T. Okafor', requiredBy: '2026-10-12', status: 'Pending', impact: 'Medium', rationale: 'Global ITSM standard is ServiceNow; SAP teams run SolMan today. Tool must be live before hypercare exit.', forum: 'Program Director', businessUnit: SAP, projectId: 'p-sap-ams' }),
  D(16, { title: 'Accept APAC FI/CO hypercare scope into Wave 2', workstream: 'Transition Readiness', requestedBy: 'R. Mehta', decisionOwner: 'Steering Committee', requiredBy: '2026-09-30', status: 'Approved', impact: 'Medium', rationale: 'Singapore hub rollout aligns with Wave 2 timing; no extra headcount.', decidedOn: '2026-09-30', forum: 'Steering Committee', businessUnit: SAP, projectId: 'p-sap-fico' }),
  D(17, { title: 'Approve Dynamics 365 / Power Platform licensing model (per-app vs per-user)', workstream: 'Technology & Infrastructure', requestedBy: 'M. Khan', decisionOwner: 'T. Okafor', requiredBy: '2026-10-30', status: 'Pending', impact: 'High', rationale: 'Per-user licences cost ₹ 0.06 Cr more per year but remove the per-app cap for the CoE.', forum: 'Program Director', businessUnit: MS, projectId: 'p-ms-power' }),
  D(18, { title: 'Establish Power Platform CoE under GCC ownership', workstream: 'Operations Setup', requestedBy: 'M. Khan', decisionOwner: 'Steering Committee', requiredBy: '2026-08-26', status: 'Approved', impact: 'High', rationale: 'Consolidates citizen-development governance in one team.', decidedOn: '2026-08-26', forum: 'Steering Committee', businessUnit: MS, projectId: 'p-ms-power' }),
  D(19, { title: 'Grant GCC data engineers production read access to the lakehouse', workstream: 'Technology & Infrastructure', requestedBy: 'D. Singh', decisionOwner: 'T. Okafor', requiredBy: '2026-10-15', status: 'Pending', impact: 'Critical', rationale: 'Pipeline operations cannot transfer without production access; data classification sign-off outstanding.', forum: 'Steering Committee', businessUnit: DATA, projectId: 'p-data-eng' }),
  D(20, { title: 'Approve PII masking standard for BI migration', workstream: 'Legal & Compliance', requestedBy: 'D. Singh', decisionOwner: 'R. Banerjee', requiredBy: '2026-09-12', status: 'Approved', impact: 'High', rationale: 'Required by group data-privacy policy before finance and sales reporting moves.', decidedOn: '2026-09-12', forum: 'Program Director', businessUnit: DATA, projectId: 'p-data-bi' }),
  D(21, { title: 'Ramp payments squad to two pods in Q4', workstream: 'Talent & Hiring', requestedBy: 'M. Khan', decisionOwner: 'Steering Committee', requiredBy: '2026-11-04', status: 'Pending', impact: 'High', rationale: 'Product roadmap pulled the payments release forward by one quarter.', forum: 'Steering Committee', businessUnit: RD_PROD, projectId: 'p-rd-pay' }),
  D(22, { title: 'Adopt the global QA automation framework for the QA hub', workstream: 'Technology & Infrastructure', requestedBy: 'M. Khan', decisionOwner: 'M. Khan', requiredBy: '2026-10-09', status: 'Approved', impact: 'Medium', rationale: 'Avoids a parallel framework; global team provides training.', decidedOn: '2026-10-09', forum: 'Workstream Lead', businessUnit: RD_PROD, projectId: 'p-rd-qa' }),
  D(23, { title: 'Confirm cloud platform squad ramp (12 → 18) ahead of Wave 3', workstream: 'Talent & Hiring', requestedBy: 'M. Khan', decisionOwner: 'R. Banerjee', requiredBy: '2026-11-10', status: 'Pending', impact: 'Medium', rationale: 'Platform on-call rota needs six more engineers for 24×7 coverage.', forum: 'Program Director', businessUnit: RD_CLOUD, projectId: 'p-rd-cloud' }),
  D(24, { title: 'Approve DevSecOps tooling stack (GitHub Advanced Security)', workstream: 'Technology & Infrastructure', requestedBy: 'M. Khan', decisionOwner: 'T. Okafor', requiredBy: '2026-10-09', status: 'Deferred', impact: 'Medium', rationale: 'Deferred to the Q4 QBR pending global tooling consolidation.', decidedOn: '2026-10-09', forum: 'Program Director', businessUnit: RD_CLOUD, projectId: 'p-rd-devsec' }),
  D(25, { title: 'Assign record-to-report process ownership to the GCC from Jan 2027', workstream: 'Finance & Procurement', requestedBy: 'V. Reddy', decisionOwner: 'L. Moreau', requiredBy: '2026-11-25', status: 'Pending', impact: 'High', rationale: 'Global process owner retains design authority; GCC owns execution and close calendar.', forum: 'Steering Committee', businessUnit: FIN, projectId: 'p-fin-r2r' }),
  D(26, { title: 'Approve AP invoice approval thresholds for the GCC team', workstream: 'Finance & Procurement', requestedBy: 'V. Reddy', decisionOwner: 'R. Banerjee', requiredBy: '2026-10-09', status: 'Approved', impact: 'Medium', rationale: 'Thresholds mirror the global delegation matrix.', decidedOn: '2026-10-09', forum: 'Program Director', businessUnit: FIN, projectId: 'p-fin-ap' }),
  D(27, { title: 'Confirm payroll support process ownership (GCC vs vendor)', workstream: 'Operations Setup', requestedBy: 'S. Iyer', decisionOwner: 'H. Patel', requiredBy: '2026-10-16', status: 'Pending', impact: 'High', rationale: 'October SLA breach by the payroll vendor reopened the in-house option.', forum: 'Program Director', businessUnit: HR, projectId: 'p-hr-ops' }),
  D(28, { title: 'Approve talent acquisition services SLA catalogue', workstream: 'Operations Setup', requestedBy: 'S. Iyer', decisionOwner: 'S. Iyer', requiredBy: '2026-11-20', status: 'Pending', impact: 'Medium', rationale: 'Receiving HR teams need agreed turnaround times before Wave 3.', forum: 'Workstream Lead', businessUnit: HR, projectId: 'p-hr-ta' }),
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
  /** Business unit the change belongs to, or Program-wide. */
  businessUnit: string
  projectId?: string
}
const CR = (n: number, p: Omit<ChangeRequest, 'id' | 'code' | 'businessUnit'> & { businessUnit?: string }): ChangeRequest => ({ id: `cr-${String(n).padStart(3, '0')}`, code: `CR-${String(n).padStart(3, '0')}`, businessUnit: PROGRAM_WIDE, ...p })
export const seedChangeRequests: ChangeRequest[] = [
  CR(1, { title: 'Add DR site readiness to Build scope', type: 'Scope', workstream: 'Technology & Infrastructure', raisedBy: 'R. Mehta', costImpactCr: 0.15, scheduleImpactDays: 10, status: 'Approved', submitted: '2026-04-10', decidedOn: '2026-04-29', description: 'Include disaster-recovery readiness in the Build phase instead of Operate.', crossWorkstreamImpact: 'Facilities (server room sizing), Finance (budget tranche)', benefitImpact: 'Protects go-live resilience; no benefit change' }),
  CR(2, { title: 'Increase lateral hiring budget', type: 'Budget', workstream: 'Talent & Hiring', raisedBy: 'S. Iyer', costImpactCr: 0.20, scheduleImpactDays: 0, status: 'Approved', submitted: '2026-05-12', decidedOn: '2026-05-27', description: 'Agency fees for 40 additional lateral hires in Wave 1.', crossWorkstreamImpact: 'Finance (FAC), Facilities (seats)', benefitImpact: 'Accelerates productivity gains by one quarter' }),
  CR(3, { title: 'Extend fit-out completion by 3 weeks', type: 'Timeline', workstream: 'Facilities & Workplace', raisedBy: 'K. Nair', costImpactCr: 0.05, scheduleImpactDays: 21, status: 'Rejected', submitted: '2026-09-05', decidedOn: '2026-09-30', description: 'Contractor requested extension due to material delays.', crossWorkstreamImpact: 'Talent (Wave 2 seats), Transition (Wave 2 go-live)', benefitImpact: 'Would delay ₹ 0.3 Cr of cost savings' }),
  CR(4, { title: 'Backup ISP circuit and network acceleration', type: 'Budget', workstream: 'Technology & Infrastructure', raisedBy: 'R. Mehta', costImpactCr: 0.12, scheduleImpactDays: -14, status: 'In Review', submitted: '2026-10-08', description: 'Secondary circuit from alternate ISP plus overtime for core switching install.', crossWorkstreamImpact: 'Transition (system access), Finance (contingency draw)', benefitImpact: 'Protects 12 Nov go-live and Q4 benefits' }),
  CR(5, { title: 'Specialist agency engagement for Wave 2', type: 'Budget', workstream: 'Talent & Hiring', raisedBy: 'S. Iyer', costImpactCr: 0.08, scheduleImpactDays: 0, status: 'In Review', submitted: '2026-10-12', description: 'Two specialist agencies for Data Engineering and Cybersecurity roles.', crossWorkstreamImpact: 'Finance (FAC), Technology (onboarding)', benefitImpact: 'Recovers productivity gains forecast', businessUnit: DATA, projectId: 'p-data-eng' }),
  CR(6, { title: 'Move Wave 3 scope (HR Ops) to Q1 2027', type: 'Timeline', workstream: 'Transition Readiness', raisedBy: 'A. Sharma', costImpactCr: 0, scheduleImpactDays: 45, status: 'In Review', submitted: '2026-10-15', description: 'Re-baseline Wave 3 to allow KT completion and system access.', crossWorkstreamImpact: 'Talent (hiring sequence), Operations (support model)', benefitImpact: 'Defers ₹ 0.4 Cr of 2026 benefits to 2027' }),
  CR(7, { title: 'Add employee transport service to Operations scope', type: 'Scope', workstream: 'Operations Setup', raisedBy: 'M. Khan', costImpactCr: 0.06, scheduleImpactDays: 0, status: 'Draft', submitted: '2026-10-18', description: 'Night-shift transport for Wave 2 global support roles.', crossWorkstreamImpact: 'Finance (run-rate), Legal (vendor compliance)', benefitImpact: 'None' }),
  CR(8, { title: 'Reduce Pune satellite office scope', type: 'Scope', workstream: 'Facilities & Workplace', raisedBy: 'K. Nair', costImpactCr: -0.18, scheduleImpactDays: 0, status: 'Draft', submitted: '2026-10-19', description: 'Defer satellite office until headcount exceeds 500.', crossWorkstreamImpact: 'Talent (location strategy)', benefitImpact: 'Improves cost savings by ₹ 0.18 Cr' }),
  // ---- business-unit level change requests
  CR(9, { title: 'Add EWM warehouse support to Wave 3 AMS scope', type: 'Scope', workstream: 'Transition Readiness', raisedBy: 'R. Mehta', costImpactCr: 0.09, scheduleImpactDays: 15, status: 'In Review', submitted: '2026-10-14', description: 'Extended Warehouse Management support for 14 distribution centres was out of the original AMS scope.', crossWorkstreamImpact: 'Talent (6 EWM consultants), Technology (interfaces)', benefitImpact: 'Adds ₹ 0.3 Cr annual run-rate savings from 2027', businessUnit: SAP, projectId: 'p-sap-ewm' }),
  CR(10, { title: 'Power Platform CoE – add ALM tooling and three FTE', type: 'Scope', workstream: 'Technology & Infrastructure', raisedBy: 'M. Khan', costImpactCr: 0.07, scheduleImpactDays: 10, status: 'In Review', submitted: '2026-10-16', description: 'Application lifecycle management pipelines and environment governance for the CoE.', crossWorkstreamImpact: 'Finance (run-rate), Talent (3 requisitions)', benefitImpact: 'Reduces citizen-app rework; no benefit change', businessUnit: MS, projectId: 'p-ms-power' }),
  CR(11, { title: 'Defer MLOps platform transition to Q1 2027', type: 'Timeline', workstream: 'Transition Readiness', raisedBy: 'D. Singh', costImpactCr: 0, scheduleImpactDays: 40, status: 'Draft', submitted: '2026-10-19', description: 'Production access and model registry dependencies will not be ready for the December go-live.', crossWorkstreamImpact: 'Technology (access), Talent (ML engineers idle)', benefitImpact: 'Defers ₹ 0.1 Cr of 2026 benefits', businessUnit: DATA, projectId: 'p-data-mlops' }),
  CR(12, { title: 'Second payments pod – accelerate squad ramp', type: 'Budget', workstream: 'Talent & Hiring', raisedBy: 'M. Khan', costImpactCr: 0.11, scheduleImpactDays: 0, status: 'Draft', submitted: '2026-10-17', description: 'Bring forward eight product-engineering hires from Q1 2027 to Q4 2026.', crossWorkstreamImpact: 'Finance (FAC), Facilities (seats)', benefitImpact: 'Accelerates payments release by one quarter', businessUnit: RD_PROD, projectId: 'p-rd-pay' }),
  CR(13, { title: 'Cloud landing-zone hardening before Wave 3', type: 'Scope', workstream: 'Technology & Infrastructure', raisedBy: 'M. Khan', costImpactCr: 0.04, scheduleImpactDays: 7, status: 'Approved', submitted: '2026-09-15', decidedOn: '2026-09-30', description: 'Security baseline, policy-as-code and network segmentation for the R&D landing zone.', crossWorkstreamImpact: 'Technology (security audit)', benefitImpact: 'Protects Wave 3 go-live', businessUnit: RD_CLOUD, projectId: 'p-rd-cloud' }),
  CR(14, { title: 'Add FP&A reporting support to record-to-report scope', type: 'Scope', workstream: 'Finance & Procurement', raisedBy: 'V. Reddy', costImpactCr: 0.03, scheduleImpactDays: 0, status: 'In Review', submitted: '2026-10-13', description: 'Monthly management reporting pack preparation moves with the R2R team.', crossWorkstreamImpact: 'Transition (KT sessions), Talent (2 analysts)', benefitImpact: 'Adds ₹ 0.08 Cr annual savings', businessUnit: FIN, projectId: 'p-fin-r2r' }),
  CR(15, { title: 'Payroll support – extend vendor overlap by two months', type: 'Budget', workstream: 'Operations Setup', raisedBy: 'S. Iyer', costImpactCr: 0.05, scheduleImpactDays: 0, status: 'Draft', submitted: '2026-10-18', description: 'Keep the payroll vendor in parallel until the GCC team completes two clean cycles.', crossWorkstreamImpact: 'Finance (run-rate), Legal (vendor contract)', benefitImpact: 'Defers ₹ 0.05 Cr of savings', businessUnit: HR, projectId: 'p-hr-ops' }),
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
  /** Business unit the action belongs to, or Program-wide. */
  businessUnit: string
  projectId?: string
}
const A = (n: number, p: Omit<ActionItem, 'id' | 'code' | 'businessUnit'> & { businessUnit?: string }): ActionItem => ({ id: `a-${String(n).padStart(3, '0')}`, code: `A-${String(n).padStart(3, '0')}`, businessUnit: PROGRAM_WIDE, ...p })
export const seedActions: ActionItem[] = [
  A(1, { action: 'Escalate network provisioning issue to steering committee', owner: 'A. Sharma', due: '2026-10-28', source: 'SC-09', status: 'In Progress', workstream: 'Technology & Infrastructure' }),
  A(2, { action: 'Confirm Wave 2 seat allocation with facilities', owner: 'K. Nair', due: '2026-10-22', source: 'SC-09', status: 'In Progress', workstream: 'Facilities & Workplace' }),
  A(3, { action: 'Finalize data access approvals with global IT security', owner: 'K. Nair', due: '2026-10-25', source: 'Weekly review 13 Oct', status: 'Open', workstream: 'Technology & Infrastructure', businessUnit: DATA, projectId: 'p-data-eng' }),
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
  // ---- business-unit level actions
  A(15, { action: 'Produce AMS staffing options paper for SC-10', owner: 'R. Mehta', due: '2026-10-23', source: 'SC-09', status: 'In Progress', workstream: 'Transition Readiness', businessUnit: SAP, projectId: 'p-sap-ams' }),
  A(16, { action: 'Run AMS ticketing tool evaluation (SolMan vs ServiceNow)', owner: 'R. Mehta', due: '2026-10-09', source: 'SAP Practice review 24 Sep', status: 'Overdue', workstream: 'Technology & Infrastructure', businessUnit: SAP, projectId: 'p-sap-ams' }),
  A(17, { action: 'Collect Power Platform licence usage baseline', owner: 'M. Khan', due: '2026-10-24', source: 'Microsoft Practice review 25 Sep', status: 'Open', workstream: 'Technology & Infrastructure', businessUnit: MS, projectId: 'p-ms-power' }),
  A(18, { action: 'Nominate CoE governance board members', owner: 'M. Khan', due: '2026-10-02', source: 'SC-08', status: 'Completed', workstream: 'Operations Setup', businessUnit: MS, projectId: 'p-ms-power' }),
  A(19, { action: 'Submit lakehouse access request with data classification', owner: 'D. Singh', due: '2026-10-14', source: 'Data & AI Practice review 29 Sep', status: 'Overdue', workstream: 'Technology & Infrastructure', businessUnit: DATA, projectId: 'p-data-eng' }),
  A(20, { action: 'Close PII masking exceptions on BI migration', owner: 'D. Singh', due: '2026-10-28', source: 'Weekly review 13 Oct', status: 'In Progress', workstream: 'Legal & Compliance', businessUnit: DATA, projectId: 'p-data-bi' }),
  A(21, { action: 'Draft second-pod ramp plan with product owners', owner: 'M. Khan', due: '2026-10-27', source: 'R&D review 01 Oct', status: 'Open', workstream: 'Talent & Hiring', businessUnit: RD_PROD, projectId: 'p-rd-pay' }),
  A(22, { action: 'Landing-zone hardening sign-off by group security', owner: 'M. Khan', due: '2026-10-30', source: 'SC-07', status: 'In Progress', workstream: 'Technology & Infrastructure', businessUnit: RD_CLOUD, projectId: 'p-rd-cloud' }),
  A(23, { action: 'Agree R2R ownership transfer checklist with E. Lindqvist', owner: 'V. Reddy', due: '2026-11-10', source: 'Finance SS review 06 Oct', status: 'Open', workstream: 'Finance & Procurement', businessUnit: FIN, projectId: 'p-fin-r2r' }),
  A(24, { action: 'Load AP approval thresholds into the workflow tool', owner: 'V. Reddy', due: '2026-10-21', source: 'Finance SS review 06 Oct', status: 'In Progress', workstream: 'Finance & Procurement', businessUnit: FIN, projectId: 'p-fin-ap' }),
  A(25, { action: 'Payroll vendor SLA breach – remediation plan', owner: 'S. Iyer', due: '2026-10-17', source: 'HR SS review 08 Oct', status: 'Overdue', workstream: 'Operations Setup', businessUnit: HR, projectId: 'p-hr-ops' }),
  A(26, { action: 'Draft talent acquisition services SLA catalogue', owner: 'S. Iyer', due: '2026-11-12', source: 'HR SS review 08 Oct', status: 'Open', workstream: 'Operations Setup', businessUnit: HR, projectId: 'p-hr-ta' }),
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
  /** Business units this stakeholder represents or sponsors; empty = program-wide. */
  businessUnits: string[]
}
const S = (n: number, p: Omit<Stakeholder, 'id' | 'businessUnits'> & { businessUnits?: string[] }): Stakeholder => ({ id: `st-${String(n).padStart(3, '0')}`, businessUnits: [], ...p })
export const seedStakeholders: Stakeholder[] = [
  S(1, { name: 'J. Whitfield', role: 'Group COO / Global Executive Sponsor', organization: 'Group HQ', influence: 'High', interest: 'High', engagement: 'Monthly', owner: 'R. Banerjee', group: 'Global Executive', sentiment: 'Supportive' }),
  S(2, { name: 'L. Moreau', role: 'Global CFO', organization: 'Group Finance', influence: 'High', interest: 'High', engagement: 'Monthly', owner: 'V. Reddy', group: 'Global Executive', sentiment: 'Neutral', businessUnits: [FIN] }),
  S(3, { name: 'T. Okafor', role: 'Global CIO', organization: 'Group IT', influence: 'High', interest: 'High', engagement: 'Fortnightly', owner: 'R. Mehta', group: 'Global Executive', sentiment: 'Concerned', businessUnits: [SAP, MS, DATA, RD_CLOUD] }),
  S(4, { name: 'H. Patel', role: 'Global CHRO', organization: 'Group HR', influence: 'High', interest: 'Medium', engagement: 'Monthly', owner: 'S. Iyer', group: 'Global Executive', sentiment: 'Supportive', businessUnits: [HR] }),
  S(5, { name: 'N. Krishnan', role: 'GCC Head / India Program Sponsor', organization: 'GCC India', influence: 'High', interest: 'High', engagement: 'Weekly', owner: 'A. Sharma', group: 'India Leadership', sentiment: 'Supportive' }),
  S(6, { name: 'R. Banerjee', role: 'GCC Program Director', organization: 'GCC India', influence: 'High', interest: 'High', engagement: 'Weekly', owner: 'A. Sharma', group: 'India Leadership', sentiment: 'Supportive' }),
  S(7, { name: 'E. Lindqvist', role: 'Global Head of Finance Operations', organization: 'Group Finance', influence: 'Medium', interest: 'High', engagement: 'Fortnightly', owner: 'A. Sharma', group: 'Global Functional', sentiment: 'Neutral', businessUnits: [FIN] }),
  S(8, { name: 'M. Chen', role: 'Global Head of IT Service Delivery', organization: 'Group IT', influence: 'Medium', interest: 'High', engagement: 'Weekly', owner: 'R. Mehta', group: 'Global Functional', sentiment: 'Concerned', businessUnits: [SAP, MS] }),
  S(9, { name: 'G. Alvarez', role: 'Global Head of Real Estate', organization: 'Group Facilities', influence: 'Medium', interest: 'Medium', engagement: 'Monthly', owner: 'K. Nair', group: 'Global Functional', sentiment: 'Supportive' }),
  S(10, { name: 'S. Desai', role: 'Group General Counsel', organization: 'Group Legal', influence: 'High', interest: 'Low', engagement: 'Quarterly', owner: 'P. Rao', group: 'Global Executive', sentiment: 'Neutral' }),
  S(11, { name: 'Works Council (EU)', role: 'Employee representation', organization: 'EU entities', influence: 'Medium', interest: 'High', engagement: 'Monthly', owner: 'H. Patel', group: 'External', sentiment: 'Concerned', businessUnits: [FIN, HR] }),
  S(12, { name: 'Karnataka IT Dept.', role: 'State regulator', organization: 'Government', influence: 'Medium', interest: 'Low', engagement: 'As needed', owner: 'P. Rao', group: 'External', sentiment: 'Neutral' }),
  S(13, { name: 'Landlord – Prestige Tech Park', role: 'Facility provider', organization: 'External vendor', influence: 'Low', interest: 'Medium', engagement: 'Fortnightly', owner: 'K. Nair', group: 'External', sentiment: 'Supportive' }),
  S(14, { name: 'Receiving team leads (Wave 2)', role: 'Process owners', organization: 'Global functions', influence: 'Low', interest: 'High', engagement: 'Weekly', owner: 'A. Sharma', group: 'Global Functional', sentiment: 'Neutral', businessUnits: [SAP, DATA, RD_PROD] }),
  // ---- business-unit sponsors and global counterparts
  S(15, { name: 'M. Weber', role: 'Global Head of SAP Delivery', organization: 'Group IT', influence: 'High', interest: 'High', engagement: 'Fortnightly', owner: 'R. Mehta', group: 'Global Functional', sentiment: 'Neutral', businessUnits: [SAP] }),
  S(16, { name: 'E. Rossi', role: 'Global Microsoft Practice Lead', organization: 'Group IT', influence: 'Medium', interest: 'High', engagement: 'Fortnightly', owner: 'M. Khan', group: 'Global Functional', sentiment: 'Supportive', businessUnits: [MS] }),
  S(17, { name: 'H. Tanaka', role: 'Chief Data Officer', organization: 'Group Data Office', influence: 'High', interest: 'High', engagement: 'Monthly', owner: 'D. Singh', group: 'Global Executive', sentiment: 'Concerned', businessUnits: [DATA] }),
  S(18, { name: 'A. Fischer', role: 'VP Product Engineering', organization: 'Group Product', influence: 'High', interest: 'Medium', engagement: 'Monthly', owner: 'M. Khan', group: 'Global Executive', sentiment: 'Supportive', businessUnits: [RD_PROD, RD_CLOUD] }),
  S(19, { name: 'P. Oyelaran', role: 'Global Payroll Lead', organization: 'Group HR', influence: 'Medium', interest: 'High', engagement: 'Weekly', owner: 'S. Iyer', group: 'Global Functional', sentiment: 'Concerned', businessUnits: [HR] }),
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

/** Business-unit RACI: who is responsible / accountable for each unit's governance. Collection 'businessUnitRaci'. */
export const BU_RACI_ROLES = ['Global Exec Sponsor', 'India Sponsor', 'Program Director', 'Business Unit Owner', 'Unit Sponsor', 'Transition Lead', 'PMO'] as const
export interface BuRaciRow { id: string; businessUnit: string; cells: Record<string, RaciValue> }
export const seedBuRaci: BuRaciRow[] = BU_NAMES.map((bu, i) => ({
  id: `buraci-${i}`,
  businessUnit: bu,
  cells: { 'Global Exec Sponsor': 'I', 'India Sponsor': 'A', 'Program Director': 'C', 'Business Unit Owner': 'R', 'Unit Sponsor': 'A', 'Transition Lead': bu === FIN || bu === HR ? 'R' : 'C', PMO: 'I' },
}))

/* ---------------- Business unit governance (sponsor, cadence, next review) ---------------- */
export interface BuGovernance {
  id: string
  businessUnit: string
  /** Global sponsor for the unit (the accountable owner comes from the business unit list). */
  sponsor: string
  cadence: 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly'
  reviewForum: string
  nextReview: string
  notes: string
}
const BG = (n: number, businessUnit: string, sponsor: string, cadence: BuGovernance['cadence'], nextReview: string, notes: string): BuGovernance =>
  ({ id: `bug-${n}`, businessUnit, sponsor, cadence, reviewForum: `${businessUnit} ${cadence.toLowerCase()} review`, nextReview, notes })
export const seedBuGovernance: BuGovernance[] = [
  BG(1, SAP, 'T. Okafor (Global CIO)', 'Monthly', '2026-10-22', 'AMS staffing and ticketing tool decisions due before hypercare exit.'),
  BG(2, MS, 'T. Okafor (Global CIO)', 'Monthly', '2026-10-23', 'Licensing model decision gates the CoE ALM change request.'),
  BG(3, DATA, 'H. Tanaka (Chief Data Officer)', 'Monthly', '2026-10-27', 'Production data access is the critical path for the run team.'),
  BG(4, RD_PROD, 'A. Fischer (VP Product Engineering)', 'Fortnightly', '2026-10-29', 'Squad ramp decisions follow the global product roadmap.'),
  BG(5, RD_CLOUD, 'A. Fischer (VP Product Engineering)', 'Monthly', '2026-10-30', 'Landing-zone hardening complete before Wave 3.'),
  BG(6, FIN, 'L. Moreau (Global CFO)', 'Monthly', '2026-11-03', 'Process ownership transfer from Jan 2027.'),
  BG(7, HR, 'H. Patel (Global CHRO)', 'Monthly', '2026-11-05', 'Payroll vendor SLA breach under remediation.'),
]

/* ---------------- RAID → business unit links (shared 'raid' items stay untouched) ---------------- */
export interface GovRaidLink { id: string; businessUnit: string; projectId?: string } // id = raid item id
export const seedGovRaidLinks: GovRaidLink[] = [
  { id: 'r-001', businessUnit: SAP, projectId: 'p-sap-ams' },
  { id: 'r-010', businessUnit: SAP },
  { id: 'r-011', businessUnit: SAP, projectId: 'p-sap-ams' },
  { id: 'r-026', businessUnit: MS, projectId: 'p-ms-d365' },
  { id: 'r-002', businessUnit: DATA, projectId: 'p-data-eng' },
  { id: 'i-004', businessUnit: DATA, projectId: 'p-data-eng' },
  { id: 'r-009', businessUnit: DATA },
  { id: 'i-027', businessUnit: DATA, projectId: 'p-data-bi' },
  { id: 'r-016', businessUnit: RD_PROD },
  { id: 'r-039', businessUnit: RD_CLOUD, projectId: 'p-rd-cloud' },
  { id: 'r-022', businessUnit: FIN, projectId: 'p-fin-r2r' },
  { id: 'r-014', businessUnit: HR, projectId: 'p-hr-ops' },
  { id: 'i-028', businessUnit: HR, projectId: 'p-hr-ops' },
  { id: 'i-040', businessUnit: HR, projectId: 'p-hr-ops' },
  { id: 'i-038', businessUnit: HR, projectId: 'p-hr-ta' },
]

/* ---------------- Governance calendar ---------------- */
export interface GovEvent {
  id: string
  title: string
  type: 'Steering Committee' | 'Integrated Program Review' | 'Workstream Status' | 'Business Unit Review' | 'Quarterly Business Review' | 'Go/No-Go' | 'Audit / Compliance' | 'Other'
  date: string
  cadence: 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly' | 'One-off'
  owner: string
  attendees: string
  /** Business unit the event is held for, or Program-wide. */
  businessUnit: string
}
const E = (n: number, p: Omit<GovEvent, 'id' | 'businessUnit'> & { businessUnit?: string }): GovEvent => ({ id: `ev-${String(n).padStart(3, '0')}`, businessUnit: PROGRAM_WIDE, ...p })
/** First review date per business unit; monthly reviews repeat from there. */
const UNIT_REVIEWS: { unit: string; owner: string; first: string; cadence: 'Monthly' | 'Fortnightly' }[] = [
  { unit: SAP, owner: 'R. Mehta', first: '2026-10-22', cadence: 'Monthly' },
  { unit: MS, owner: 'R. Mehta', first: '2026-10-23', cadence: 'Monthly' },
  { unit: DATA, owner: 'R. Mehta', first: '2026-10-27', cadence: 'Monthly' },
  { unit: RD_PROD, owner: 'M. Khan', first: '2026-10-29', cadence: 'Fortnightly' },
  { unit: RD_CLOUD, owner: 'M. Khan', first: '2026-10-30', cadence: 'Monthly' },
  { unit: FIN, owner: 'V. Reddy', first: '2026-11-03', cadence: 'Monthly' },
  { unit: HR, owner: 'S. Iyer', first: '2026-11-05', cadence: 'Monthly' },
]
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
    // unit-specific one-off reviews
    E(101, { title: 'S/4HANA AMS hypercare exit review', type: 'Go/No-Go', date: '2026-10-26', cadence: 'One-off', owner: 'R. Mehta', attendees: 'M. Weber, T. Okafor, R. Mehta, PMO', businessUnit: SAP }),
    E(102, { title: 'Power Platform licensing workshop', type: 'Other', date: '2026-10-27', cadence: 'One-off', owner: 'M. Khan', attendees: 'E. Rossi, T. Okafor, M. Khan', businessUnit: MS }),
    E(103, { title: 'Lakehouse access approval board', type: 'Other', date: '2026-10-22', cadence: 'One-off', owner: 'D. Singh', attendees: 'H. Tanaka, group IT security, D. Singh', businessUnit: DATA }),
    E(104, { title: 'Payments squad ramp review', type: 'Other', date: '2026-11-02', cadence: 'One-off', owner: 'M. Khan', attendees: 'A. Fischer, product owners, M. Khan', businessUnit: RD_PROD }),
    E(105, { title: 'Landing-zone security sign-off', type: 'Audit / Compliance', date: '2026-10-30', cadence: 'One-off', owner: 'M. Khan', attendees: 'Group security, M. Khan, P. Rao', businessUnit: RD_CLOUD }),
    E(106, { title: 'Record-to-report ownership transfer workshop', type: 'Other', date: '2026-11-12', cadence: 'One-off', owner: 'V. Reddy', attendees: 'E. Lindqvist, L. Moreau, V. Reddy', businessUnit: FIN }),
    E(107, { title: 'Payroll vendor SLA review', type: 'Audit / Compliance', date: '2026-10-21', cadence: 'One-off', owner: 'S. Iyer', attendees: 'P. Oyelaran, payroll vendor, S. Iyer', businessUnit: HR }),
  ]
  // Recurring business unit reviews (unit owner + sponsor + PMO) until end Jan 2027
  let u = 200
  for (const r of UNIT_REVIEWS) {
    for (let d = new Date(r.first), k = 0; d <= new Date('2027-01-31') && k < 8; k++) {
      ev.push(E(u++, { title: `${r.unit} ${r.cadence.toLowerCase()} review`, type: 'Business Unit Review', date: d.toISOString().slice(0, 10), cadence: r.cadence, owner: r.owner, attendees: 'Unit owner, unit sponsor, PMO', businessUnit: r.unit }))
      if (r.cadence === 'Monthly') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 14)
    }
  }
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
  /** Business units the control applies to; empty = Program-wide (all units). */
  businessUnits: string[]
}
export const seedControls: Control[] = ([
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
  // ---- business-unit specific controls
  { id: 'ctl-13', control: 'SAP AMS SLA & ticket governance', wbs: '1.3.11', description: 'SLA catalogue, priority matrix and ticket hygiene reviews for the S/4HANA AMS service.', owner: 'R. Mehta', status: 'Active', lastReviewed: '2026-10-06', evidence: 'AMS SLA pack v1.0', businessUnits: [SAP] },
  { id: 'ctl-14', control: 'Power Platform solution governance & ALM', wbs: '1.3.12', description: 'Environment strategy, DLP policies and release pipeline for citizen-developed solutions.', owner: 'M. Khan', status: 'In Progress', lastReviewed: '2026-10-10', evidence: 'CoE governance charter (draft)', businessUnits: [MS] },
  { id: 'ctl-15', control: 'Data access & classification approvals', wbs: '1.3.13', description: 'Approval workflow and evidence for production data access by GCC engineers.', owner: 'D. Singh', status: 'Needs Review', lastReviewed: '2026-09-18', evidence: 'Access approval log – 6 requests pending', businessUnits: [DATA] },
  { id: 'ctl-16', control: 'Release & change control for product squads', wbs: '1.3.14', description: 'CAB cadence, change calendar and SRE error-budget policy for R&D squads.', owner: 'M. Khan', status: 'Active', lastReviewed: '2026-10-02', evidence: 'Change calendar; CAB minutes', businessUnits: [RD_PROD, RD_CLOUD] },
  { id: 'ctl-17', control: 'Financial close & payroll statutory controls', wbs: '1.3.15', description: 'Close checklist, reconciliations and payroll statutory control matrix for shared services.', owner: 'V. Reddy', status: 'In Progress', lastReviewed: '2026-10-13', evidence: 'Close checklist; payroll control matrix', businessUnits: [FIN, HR] },
] as (Omit<Control, 'businessUnits'> & { businessUnits?: string[] })[]).map((c) => ({ businessUnits: [], ...c }))

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
