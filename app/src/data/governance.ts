/**
 * Governance page seed data and types – ENGIE IT GCC, Pune.
 * Collections: 'steeringMeetings', 'decisions', 'changeRequests', 'actions', 'stakeholders', 'raci',
 *              'governanceEvents', 'controls', 'ragCriteria', 'governanceSettings',
 *              'businessUnitGovernance' (per-unit sponsor / cadence), 'businessUnitRaci' (units × roles),
 *              'governanceRaidLinks' (business unit / project tag per shared RAID item id)
 *
 * Business unit (= IT domain) is a dimension on every governance record: decisions, change requests, actions,
 * meeting agenda / decision items, stakeholders, events and controls. `'Program-wide'` marks records that are not
 * unit-specific. Unit names come from the 'businessUnits' collection at runtime; the seeds below use the seed names.
 */
import type { Workstream } from './common'
import { BU_NAMES } from './businessUnits'

/** Marker for records that belong to the program rather than to one business unit. */
export const PROGRAM_WIDE = 'Program-wide'
/** The 7 IT domains: Infrastructure & Cloud, Digital Workplace, Cybersecurity & IAM, Enterprise Applications, Data, Analytics & AI, Integration & Engineering, IT Service Management. */
const [INFRA, DWP, CYBER, APPS, DATA, ENG, ITSM] = BU_NAMES

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
  globalExecutiveSponsor: 'C. Dubois (Group COO)',
  indiaProgramSponsor: 'N. Kulkarni (GCC Head, Pune)',
  programDirector: 'R. Banerjee',
  programManager: 'Anita Sharma',
  pmoLead: 'D. Singh',
  steeringMembers: ['C. Dubois (Group COO)', 'N. Kulkarni (GCC Head, Pune)', 'M. Lefèvre (Group CFO)', 'T. Moreau (Group CIO)', 'H. Weber (Group CHRO)', 'R. Banerjee (Program Director)'],
  plannedSteeringMeetings: 12,
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
const SM = (n: number, date: string, title: string, agenda: string, decisionsTaken: string, actions: string, minutesStatus: SteeringMeeting['minutesStatus'], status: SteeringMeeting['status'] = 'Completed', tags: { agenda?: string[]; decisions?: string[] } = {}, attendees = 'C. Dubois, N. Kulkarni, M. Lefèvre, T. Moreau, H. Weber, R. Banerjee, A. Sharma'): SteeringMeeting =>
  ({ id: `sm-${String(n).padStart(3, '0')}`, code: `SC-${String(n).padStart(2, '0')}`, date, title, agenda, attendees, decisionsTaken, actions, minutesStatus, status, agendaUnits: tags.agenda, decisionUnits: tags.decisions })
const PW = PROGRAM_WIDE
export const seedSteeringMeetings: SteeringMeeting[] = [
  SM(1, '2026-05-28', 'Steering Committee #1 – Program mobilisation', 'Charter approval; governance structure; business case re-confirmation (400 Pune IT headcount by Apr 2027)', 'Program charter approved; steering cadence set to monthly', 'Publish governance calendar; confirm workstream leads', 'Approved'),
  SM(2, '2026-06-25', 'Steering Committee #2 – Entity & site', 'Legal entity status; Pune site shortlist (Kharadi / Hinjewadi); hiring plan', 'Pune selected as primary site; entity incorporation approved', 'Lease negotiation to start; Wave 1 hiring plan baseline', 'Approved'),
  SM(3, '2026-07-25', 'Steering Committee #3 – Design sign-off', 'Operating model design; organisation structure (7 IT domains); IT architecture; Infrastructure & Cloud as Wave 1 anchor', 'Operating model approved; hub-and-spoke IT architecture endorsed; Infrastructure & Cloud (Cloud Operations, Network) confirmed as Wave 1 anchor', 'Finalize role architecture; procure network provider', 'Approved', 'Completed', { agenda: [PW, PW, PW, INFRA], decisions: [PW, PW, INFRA] }),
  SM(4, '2026-08-29', 'Steering Committee #4 – Build kick-off', 'Build phase plan; budget tranche release; fit-out contract', 'Build phase approved; ₹ 1.6 Cr tranche released', 'Award fit-out contract; start campus hiring', 'Approved'),
  SM(5, '2026-09-27', 'Steering Committee #5 – Hiring & facilities', 'Wave 1 hiring progress; fit-out status; vendor onboarding; Data, Analytics & AI hiring mix', 'Lateral hiring budget increase approved (CR-002); Data, Analytics & AI to hire 60% laterals', 'Weekly hiring dashboard; fit-out risk review', 'Approved', 'Completed', { agenda: [PW, PW, PW, DATA], decisions: [PW, DATA] }),
  SM(6, '2026-10-24', 'Steering Committee #6 – Transition plan', 'Program health; financial forecast; transition wave plan; BI / Analytics migration data privacy', 'Transition wave sequencing approved (Infra & Cyber → Apps & Data → Workplace & ITSM → Integration); PII masking standard mandated for the BI / Analytics migration', 'Prepare KT calendar; update FAC', 'Approved', 'Completed', { agenda: [PW, PW, PW, DATA], decisions: [PW, DATA] }),
  SM(7, '2026-11-29', 'Steering Committee #7 – Wave 1 go-live', 'Network provisioning; security baseline; DR plan; Wave 1 cut-over (Cloud Operations, Network, IAM); cloud landing zone standard for Group GBS', 'Backup ISP procurement approved; Wave 1 cut-over confirmed for 01 Dec; landing-zone hardening added to Wave 4 prerequisites', 'Order secondary circuit; security audit scheduling', 'Approved', 'Completed', { agenda: [PW, PW, PW, INFRA, ENG], decisions: [PW, INFRA, ENG] }),
  SM(8, '2026-12-26', 'Steering Committee #8 – Wave 1 stabilisation', 'Wave 1 hypercare status; SOC L1 monitoring scope; SOP status; SAP / ERP knowledge-transfer plan with France', 'Wave 1 hypercare exit set for 31 Jan; SOC L1 monitoring accepted into Cybersecurity & IAM scope', 'Close SOP gaps; lock SAP KT calendar with the Networks GBU', 'Approved', 'Completed', { agenda: [INFRA, CYBER, PW, APPS], decisions: [INFRA, CYBER] }),
  SM(9, '2027-01-30', 'Steering Committee #9 – Wave 2 readiness', 'Wave 2 readiness; specialist hiring shortfall; escalations; SAP / ERP AMS staffing model; Business Applications hypercare (USA)', 'Transition go/no-go moved to 04 Mar; specialist hiring agencies approved; Business Applications (Renewables & Flexible Power) hypercare scope accepted into Wave 2', 'Escalate network provisioning; confirm Wave 2 seats; AMS staffing options paper', 'Circulated', 'Completed', { agenda: [PW, DATA, PW, APPS, APPS], decisions: [PW, DATA, APPS] }),
  SM(10, '2027-02-28', 'Steering Committee #10 – Transition go/no-go prep', 'Network escalation decision; CR-004 budget; Wave 3 plan (Digital Workplace, ITSM); benefits forecast; SAP / ERP transition from France (D-018); production data-platform access (D-020); API / Integration squad ramp (D-028)', '', '', 'Scheduled', 'Scheduled', { agenda: [PW, PW, PW, PW, APPS, DATA, ENG] }),
  SM(11, '2027-03-25', 'Steering Committee #11 – Wave 3 review', 'Wave 3 outcome; Wave 4 go/no-go (Integration & Engineering); 2027 budget; major incident ownership (D-025); service desk language coverage (D-022)', '', '', 'Scheduled', 'Scheduled', { agenda: [PW, ENG, PW, ITSM, DWP] }),
]

export interface PackItem { id: string; item: string; owner: string; done: boolean }
export const seedPackChecklist: PackItem[] = [
  { id: 'pk-1', item: 'Program status summary & RAG by workstream', owner: 'A. Sharma', done: true },
  { id: 'pk-2', item: 'Milestone adherence & critical path update', owner: 'D. Singh', done: true },
  { id: 'pk-3', item: 'Financial forecast (budget vs FAC)', owner: 'V. Reddy', done: true },
  { id: 'pk-4', item: 'Decisions required (D-004, D-006, D-007, D-018, D-020, D-028)', owner: 'A. Sharma', done: false },
  { id: 'pk-5', item: 'Change requests for approval (CR-004, CR-005, CR-009, CR-010)', owner: 'R. Banerjee', done: false },
  { id: 'pk-9', item: 'Business unit governance summary (health, open items per IT domain)', owner: 'D. Singh', done: false },
  { id: 'pk-6', item: 'Escalations & top risks', owner: 'A. Sharma', done: true },
  { id: 'pk-7', item: 'Benefits realization update', owner: 'M. Lefèvre', done: false },
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
  D(1, { title: 'Select Pune as primary GCC site', workstream: 'Facilities & Workplace', requestedBy: 'K. Nair', decisionOwner: 'Steering Committee', requiredBy: '2026-06-25', status: 'Approved', impact: 'Critical', rationale: 'Best IT talent density (cloud, SAP, data) and cost-to-quality ratio across the four shortlisted cities.', decidedOn: '2026-06-25', forum: 'Steering Committee' }),
  D(2, { title: 'Approve hub-and-spoke IT architecture', workstream: 'Technology & Infrastructure', requestedBy: 'R. Mehta', decisionOwner: 'T. Moreau', requiredBy: '2026-07-25', status: 'Approved', impact: 'High', rationale: 'Aligns with the group security baseline; reduces DR complexity.', decidedOn: '2026-07-25', forum: 'Steering Committee' }),
  D(3, { title: 'Transition wave sequencing (Infra & Cyber → Apps & Data → Workplace & ITSM → Integration)', workstream: 'Transition Readiness', requestedBy: 'A. Sharma', decisionOwner: 'Steering Committee', requiredBy: '2026-10-24', status: 'Approved', impact: 'High', rationale: 'Infrastructure and IAM are the foundation every later wave depends on; SAP / ERP follows once the France KT calendar is locked.', decidedOn: '2026-10-24', forum: 'Steering Committee' }),
  D(4, { title: 'Activate backup ISP and re-sequence endpoint rollout', workstream: 'Technology & Infrastructure', requestedBy: 'R. Mehta', decisionOwner: 'T. Moreau', requiredBy: '2027-02-15', status: 'Pending', impact: 'Critical', rationale: 'Primary network provisioning is three weeks late; Wave 3 go-live exposure.', forum: 'Steering Committee' }),
  D(5, { title: 'Approve retention bonus scheme for critical roles', workstream: 'Talent & Hiring', requestedBy: 'S. Iyer', decisionOwner: 'H. Weber', requiredBy: '2027-02-10', status: 'Pending', impact: 'High', rationale: 'Attrition risk during transition for 18 critical roles (SAP, cloud, IAM).', forum: 'Program Director' }),
  D(6, { title: 'Engage two specialist hiring agencies', workstream: 'Talent & Hiring', requestedBy: 'S. Iyer', decisionOwner: 'Steering Committee', requiredBy: '2027-02-28', status: 'Pending', impact: 'High', rationale: 'Specialist pipeline 20% behind the Wave 2 plan (data engineering and cybersecurity roles).', forum: 'Steering Committee', businessUnit: DATA, projectId: 'p-data-eng' }),
  D(7, { title: 'Defer Wave 3 go/no-go to 04 Mar', workstream: 'Transition Readiness', requestedBy: 'A. Sharma', decisionOwner: 'Steering Committee', requiredBy: '2027-02-28', status: 'Pending', impact: 'High', rationale: 'KT completion for Digital Workplace and ITSM and system access dependencies unresolved.', forum: 'Steering Committee' }),
  D(8, { title: 'Standardise KT documentation on the group template', workstream: 'Transition Readiness', requestedBy: 'A. Sharma', decisionOwner: 'A. Sharma', requiredBy: '2027-02-22', status: 'Pending', impact: 'Medium', rationale: 'Three competing templates (France, Belgium, USA) causing rework.', forum: 'Workstream Lead' }),
  D(9, { title: 'Accept dual filing path for labour registrations', workstream: 'Legal & Compliance', requestedBy: 'P. Rao', decisionOwner: 'R. Banerjee', requiredBy: '2027-03-05', status: 'Pending', impact: 'Medium', rationale: 'Draft regulatory amendments may change timelines.', forum: 'Program Director' }),
  D(10, { title: 'Open lateral hiring in Hyderabad', workstream: 'Talent & Hiring', requestedBy: 'S. Iyer', decisionOwner: 'Steering Committee', requiredBy: '2027-01-30', status: 'Deferred', impact: 'Medium', rationale: 'Deferred until the Pune Wave 2 numbers are confirmed.', decidedOn: '2027-01-30', forum: 'Steering Committee' }),
  D(11, { title: 'Second fit-out shift to recover handover', workstream: 'Facilities & Workplace', requestedBy: 'K. Nair', decisionOwner: 'R. Banerjee', requiredBy: '2027-02-12', status: 'Approved', impact: 'Medium', rationale: 'Milestone-linked payments protect budget.', decidedOn: '2027-02-09', forum: 'Program Director' }),
  D(12, { title: 'Outsource cafeteria operations to third party', workstream: 'Operations Setup', requestedBy: 'M. Khan', decisionOwner: 'N. Kulkarni', requiredBy: '2027-01-15', status: 'Rejected', impact: 'Low', rationale: 'Rejected in favour of landlord-managed service for Year 1.', decidedOn: '2027-01-12', forum: 'Program Director' }),
  D(13, { title: 'Approve stabilization run-rate funding for Q2 2027', workstream: 'Finance & Procurement', requestedBy: 'V. Reddy', decisionOwner: 'M. Lefèvre', requiredBy: '2027-03-25', status: 'Pending', impact: 'High', rationale: 'Required for the Operate phase budget baseline once the 400 footprint is in place.', forum: 'Steering Committee' }),
  // ---- business-unit (IT domain) level decisions
  D(14, { title: 'Approve 24×7 shift model for Cloud Operations (52 FTE, three pods)', workstream: 'Transition Readiness', requestedBy: 'R. Mehta', decisionOwner: 'Steering Committee', requiredBy: '2027-02-28', status: 'Pending', impact: 'High', rationale: 'European Cloud Operations run follow-the-sun from Pune; night-shift coverage needs a third pod and a transport allowance.', forum: 'Steering Committee', businessUnit: INFRA, projectId: 'p-cloud-ops' }),
  D(15, { title: 'Select network monitoring tooling for the Pune NOC (SolarWinds vs ThousandEyes)', workstream: 'Technology & Infrastructure', requestedBy: 'R. Mehta', decisionOwner: 'T. Moreau', requiredBy: '2027-02-12', status: 'Pending', impact: 'Medium', rationale: 'Group standard is ThousandEyes; the France NOC runs SolarWinds today. Tool must be live before the Network hypercare exit.', forum: 'Program Director', businessUnit: INFRA, projectId: 'p-network' }),
  D(16, { title: 'Accept SOC L1 monitoring into Wave 1 (Build / Transition)', workstream: 'Transition Readiness', requestedBy: 'P. Rao', decisionOwner: 'Steering Committee', requiredBy: '2026-12-26', status: 'Approved', impact: 'Medium', rationale: 'Group CISO wants L1 monitoring in Pune before the EU shift reduction; no headcount beyond the 9 SOC analysts planned.', decidedOn: '2026-12-26', forum: 'Steering Committee', businessUnit: CYBER, projectId: 'p-secops' }),
  D(17, { title: 'IAM tooling licence for Europe – GCC tenant on the group SailPoint platform', workstream: 'Technology & Infrastructure', requestedBy: 'P. Rao', decisionOwner: 'T. Moreau', requiredBy: '2027-02-28', status: 'Pending', impact: 'High', rationale: 'Per-identity licences cost ₹ 0.06 Cr more per year but remove the operator cap for the Pune IAM team.', forum: 'Program Director', businessUnit: CYBER, projectId: 'p-iam' }),
  D(18, { title: 'Approve SAP / ERP transition from France – Networks GBU (71 FTE AMS)', workstream: 'Transition Readiness', requestedBy: 'V. Reddy', decisionOwner: 'Steering Committee', requiredBy: '2027-02-28', status: 'Pending', impact: 'Critical', rationale: 'Networks GBU AMS ticket volumes are 25% above baseline; the France team retains design authority, Pune takes L2/L3 run and month-end.', forum: 'Steering Committee', businessUnit: APPS, projectId: 'p-sap-ams' }),
  D(19, { title: 'Business Applications support for Renewables & Flexible Power – USA shift coverage model', workstream: 'Transition Readiness', requestedBy: 'V. Reddy', decisionOwner: 'Steering Committee', requiredBy: '2027-01-30', status: 'Approved', impact: 'Medium', rationale: 'Houston application support moves to Pune with a 5 pm – 2 am IST overlap shift; no extra headcount.', decidedOn: '2027-01-30', forum: 'Steering Committee', businessUnit: APPS, projectId: 'p-ms-d365' }),
  D(20, { title: 'Grant GCC data engineers production access to the group data platform', workstream: 'Technology & Infrastructure', requestedBy: 'S. Iyer', decisionOwner: 'T. Moreau', requiredBy: '2027-02-15', status: 'Pending', impact: 'Critical', rationale: 'Pipeline operations cannot transfer without production access; data classification sign-off outstanding with the CDO office.', forum: 'Steering Committee', businessUnit: DATA, projectId: 'p-data-eng' }),
  D(21, { title: 'Approve PII masking standard for the BI / Analytics migration', workstream: 'Legal & Compliance', requestedBy: 'S. Iyer', decisionOwner: 'R. Banerjee', requiredBy: '2027-01-12', status: 'Approved', impact: 'High', rationale: 'Required by the group data-privacy policy (GDPR) before GBU reporting moves to Pune.', decidedOn: '2027-01-12', forum: 'Program Director', businessUnit: DATA, projectId: 'p-data-bi' }),
  D(22, { title: 'Service Desk language coverage (French / Dutch) for Wave 3', workstream: 'Talent & Hiring', requestedBy: 'K. Nair', decisionOwner: 'Steering Committee', requiredBy: '2027-03-04', status: 'Pending', impact: 'High', rationale: 'Group GBS users in France and Belgium require native-language L1; option of four bilingual agents vs vendor overflow.', forum: 'Steering Committee', businessUnit: DWP, projectId: 'p-service-desk' }),
  D(23, { title: 'Adopt Intune as the single device-management standard for End User Computing', workstream: 'Technology & Infrastructure', requestedBy: 'K. Nair', decisionOwner: 'K. Nair', requiredBy: '2027-02-09', status: 'Approved', impact: 'Medium', rationale: 'Avoids a parallel SCCM estate; the European workplace team provides training.', decidedOn: '2027-02-09', forum: 'Workstream Lead', businessUnit: DWP, projectId: 'p-euc' }),
  D(24, { title: 'ServiceNow instance strategy – Group tenant for Pune service management', workstream: 'Technology & Infrastructure', requestedBy: 'D. Singh', decisionOwner: 'T. Moreau', requiredBy: '2027-02-09', status: 'Deferred', impact: 'Medium', rationale: 'Deferred to the Q2 QBR pending the group ServiceNow consolidation.', decidedOn: '2027-02-09', forum: 'Program Director', businessUnit: ITSM, projectId: 'p-svcmgmt' }),
  D(25, { title: 'Assign major incident management ownership to the GCC from Wave 3', workstream: 'Operations Setup', requestedBy: 'D. Singh', decisionOwner: 'T. Moreau', requiredBy: '2027-03-25', status: 'Pending', impact: 'High', rationale: 'Group process owner retains design authority; Pune owns the 24×7 major incident bridge and the problem backlog.', forum: 'Steering Committee', businessUnit: ITSM, projectId: 'p-incident' }),
  D(26, { title: 'Cloud landing zone standard for Group GBS (Integration & Engineering build)', workstream: 'Technology & Infrastructure', requestedBy: 'M. Khan', decisionOwner: 'T. Moreau', requiredBy: '2027-03-10', status: 'Pending', impact: 'Medium', rationale: 'Policy-as-code, network segmentation and FinOps tagging for the Pune engineering squads before Wave 4.', forum: 'Program Director', businessUnit: ENG, projectId: 'p-api' }),
  D(27, { title: 'Adopt the group GitLab toolchain for Pune DevOps', workstream: 'Technology & Infrastructure', requestedBy: 'M. Khan', decisionOwner: 'M. Khan', requiredBy: '2027-02-09', status: 'Approved', impact: 'Medium', rationale: 'Avoids a parallel Jenkins estate; the European platform team provides training.', decidedOn: '2027-02-09', forum: 'Workstream Lead', businessUnit: ENG, projectId: 'p-devops' }),
  D(28, { title: 'Confirm API / Integration squad ramp (14 → 30) ahead of Wave 4', workstream: 'Talent & Hiring', requestedBy: 'M. Khan', decisionOwner: 'Steering Committee', requiredBy: '2027-03-04', status: 'Pending', impact: 'High', rationale: 'The GBU integration backlog pulled the Wave 4 build forward by one quarter.', forum: 'Steering Committee', businessUnit: ENG, projectId: 'p-api' }),
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
  CR(1, { title: 'Add DR site readiness to Build scope', type: 'Scope', workstream: 'Technology & Infrastructure', raisedBy: 'R. Mehta', costImpactCr: 0.15, scheduleImpactDays: 10, status: 'Approved', submitted: '2026-08-10', decidedOn: '2026-08-29', description: 'Include disaster-recovery readiness in the Build phase instead of Operate.', crossWorkstreamImpact: 'Facilities (server room sizing), Finance (budget tranche)', benefitImpact: 'Protects go-live resilience; no benefit change' }),
  CR(2, { title: 'Increase lateral hiring budget', type: 'Budget', workstream: 'Talent & Hiring', raisedBy: 'S. Iyer', costImpactCr: 0.20, scheduleImpactDays: 0, status: 'Approved', submitted: '2026-09-12', decidedOn: '2026-09-27', description: 'Agency fees for 40 additional lateral hires (cloud, network, IAM) in Wave 1.', crossWorkstreamImpact: 'Finance (FAC), Facilities (seats)', benefitImpact: 'Accelerates productivity gains by one quarter' }),
  CR(3, { title: 'Extend fit-out completion by 3 weeks', type: 'Timeline', workstream: 'Facilities & Workplace', raisedBy: 'K. Nair', costImpactCr: 0.05, scheduleImpactDays: 21, status: 'Rejected', submitted: '2027-01-05', decidedOn: '2027-01-30', description: 'Contractor requested extension due to material delays.', crossWorkstreamImpact: 'Talent (Wave 2 seats), Transition (Wave 2 go-live)', benefitImpact: 'Would delay ₹ 0.3 Cr of cost savings' }),
  CR(4, { title: 'Backup ISP circuit and network acceleration', type: 'Budget', workstream: 'Technology & Infrastructure', raisedBy: 'R. Mehta', costImpactCr: 0.12, scheduleImpactDays: -14, status: 'In Review', submitted: '2027-02-08', description: 'Secondary circuit from an alternate ISP plus overtime for the core switching install.', crossWorkstreamImpact: 'Transition (system access), Finance (contingency draw)', benefitImpact: 'Protects the 04 Mar go/no-go and the Wave 3 cut-over' }),
  CR(5, { title: 'Specialist agency engagement for Wave 2', type: 'Budget', workstream: 'Talent & Hiring', raisedBy: 'S. Iyer', costImpactCr: 0.08, scheduleImpactDays: 0, status: 'In Review', submitted: '2027-02-12', description: 'Two specialist agencies for Data Engineering and Cybersecurity roles.', crossWorkstreamImpact: 'Finance (FAC), Technology (onboarding)', benefitImpact: 'Recovers productivity gains forecast', businessUnit: DATA, projectId: 'p-data-eng' }),
  CR(6, { title: 'Re-baseline Wave 3 (Digital Workplace, ITSM) by six weeks', type: 'Timeline', workstream: 'Transition Readiness', raisedBy: 'A. Sharma', costImpactCr: 0, scheduleImpactDays: 45, status: 'In Review', submitted: '2027-02-15', description: 'Re-baseline Wave 3 to allow KT completion with the European service-desk vendor and system access.', crossWorkstreamImpact: 'Talent (hiring sequence), Operations (support model)', benefitImpact: 'Defers ₹ 0.4 Cr of 2027 benefits' }),
  CR(7, { title: 'Add employee transport service to Operations scope', type: 'Scope', workstream: 'Operations Setup', raisedBy: 'M. Khan', costImpactCr: 0.06, scheduleImpactDays: 0, status: 'Draft', submitted: '2027-02-18', description: 'Night-shift transport for the 24×7 Cloud Operations and SOC roles.', crossWorkstreamImpact: 'Finance (run-rate), Legal (vendor compliance)', benefitImpact: 'None' }),
  CR(8, { title: 'Defer Hinjewadi satellite office', type: 'Scope', workstream: 'Facilities & Workplace', raisedBy: 'K. Nair', costImpactCr: -0.18, scheduleImpactDays: 0, status: 'Draft', submitted: '2027-02-19', description: 'Defer the second Pune site until headcount exceeds 500.', crossWorkstreamImpact: 'Talent (location strategy)', benefitImpact: 'Improves cost savings by ₹ 0.18 Cr' }),
  // ---- business-unit (IT domain) level change requests
  CR(9, { title: 'Add Finance Applications (Group GBS) support to the Wave 2 AMS scope', type: 'Scope', workstream: 'Transition Readiness', raisedBy: 'V. Reddy', costImpactCr: 0.09, scheduleImpactDays: 15, status: 'In Review', submitted: '2027-02-14', description: 'Group finance applications (treasury, consolidation) support for 11 European entities was out of the original SAP / ERP scope.', crossWorkstreamImpact: 'Talent (6 functional consultants), Technology (interfaces)', benefitImpact: 'Adds ₹ 0.3 Cr annual run-rate savings from 2027', businessUnit: APPS, projectId: 'p-sap-ams' }),
  CR(10, { title: 'IAM operations – add privileged access management (CyberArk) and three FTE', type: 'Scope', workstream: 'Technology & Infrastructure', raisedBy: 'P. Rao', costImpactCr: 0.07, scheduleImpactDays: 10, status: 'In Review', submitted: '2027-02-16', description: 'PAM vault operations and the break-glass process for the European estate join the Pune IAM scope.', crossWorkstreamImpact: 'Finance (run-rate), Talent (3 requisitions)', benefitImpact: 'Reduces audit findings; no benefit change', businessUnit: CYBER, projectId: 'p-iam' }),
  CR(11, { title: 'Defer AI / Automation platform build to Q2 2027', type: 'Timeline', workstream: 'Transition Readiness', raisedBy: 'S. Iyer', costImpactCr: 0, scheduleImpactDays: 40, status: 'Draft', submitted: '2027-02-19', description: 'Production access and model registry dependencies will not be ready for the March start.', crossWorkstreamImpact: 'Technology (access), Talent (AI engineers idle)', benefitImpact: 'Defers ₹ 0.1 Cr of 2027 benefits', businessUnit: DATA, projectId: 'p-data-mlops' }),
  CR(12, { title: 'Second API / Integration pod – accelerate squad ramp', type: 'Budget', workstream: 'Talent & Hiring', raisedBy: 'M. Khan', costImpactCr: 0.11, scheduleImpactDays: 0, status: 'Draft', submitted: '2027-02-17', description: 'Bring forward eight integration-engineering hires from Q3 to Q2 2027.', crossWorkstreamImpact: 'Finance (FAC), Facilities (seats)', benefitImpact: 'Accelerates the GBU integration backlog by one quarter', businessUnit: ENG, projectId: 'p-api' }),
  CR(13, { title: 'Network – secondary SD-WAN link to the France data centre', type: 'Scope', workstream: 'Technology & Infrastructure', raisedBy: 'R. Mehta', costImpactCr: 0.04, scheduleImpactDays: 7, status: 'Approved', submitted: '2027-01-15', decidedOn: '2027-01-30', description: 'Redundant circuit between Pune and the Lyon data centre before the Network cut-over completes.', crossWorkstreamImpact: 'Technology (security audit)', benefitImpact: 'Protects Wave 1 stabilisation', businessUnit: INFRA, projectId: 'p-network' }),
  CR(14, { title: 'Add IT asset / CMDB reconciliation to the Service Management scope', type: 'Scope', workstream: 'Operations Setup', raisedBy: 'D. Singh', costImpactCr: 0.03, scheduleImpactDays: 0, status: 'In Review', submitted: '2027-02-13', description: 'Monthly CMDB reconciliation for the European estate moves with the service management team.', crossWorkstreamImpact: 'Transition (KT sessions), Talent (2 analysts)', benefitImpact: 'Adds ₹ 0.08 Cr annual savings', businessUnit: ITSM, projectId: 'p-svcmgmt' }),
  CR(15, { title: 'Service Desk – extend vendor overlap by two months', type: 'Budget', workstream: 'Operations Setup', raisedBy: 'K. Nair', costImpactCr: 0.05, scheduleImpactDays: 0, status: 'Draft', submitted: '2027-02-18', description: 'Keep the European service-desk vendor in parallel until the Pune team completes two clean months.', crossWorkstreamImpact: 'Finance (run-rate), Legal (vendor contract)', benefitImpact: 'Defers ₹ 0.05 Cr of savings', businessUnit: DWP, projectId: 'p-service-desk' }),
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
  A(1, { action: 'Escalate network provisioning issue to steering committee', owner: 'A. Sharma', due: '2027-02-28', source: 'SC-09', status: 'In Progress', workstream: 'Technology & Infrastructure' }),
  A(2, { action: 'Confirm Wave 2 seat allocation with facilities', owner: 'K. Nair', due: '2027-02-22', source: 'SC-09', status: 'In Progress', workstream: 'Facilities & Workplace' }),
  A(3, { action: 'Finalize data access approvals with group IT security', owner: 'S. Iyer', due: '2027-02-25', source: 'Weekly review 16 Feb', status: 'Open', workstream: 'Technology & Infrastructure', businessUnit: DATA, projectId: 'p-data-eng' }),
  A(4, { action: 'Issue SOP ownership list and sign-off plan', owner: 'D. Singh', due: '2027-02-22', source: 'Weekly review 16 Feb', status: 'Open', workstream: 'Operations Setup' }),
  A(5, { action: 'Order secondary circuit from alternate ISP', owner: 'R. Mehta', due: '2027-02-15', source: 'SC-07', status: 'Overdue', workstream: 'Technology & Infrastructure' }),
  A(6, { action: 'Lock KT calendar with the European and US process owners', owner: 'A. Sharma', due: '2027-02-24', source: 'Weekly review 09 Feb', status: 'In Progress', workstream: 'Transition Readiness' }),
  A(7, { action: 'Publish retention scheme proposal for critical roles', owner: 'S. Iyer', due: '2027-02-10', source: 'SC-08', status: 'Overdue', workstream: 'Talent & Hiring' }),
  A(8, { action: 'Run second parallel payroll before go-live', owner: 'V. Reddy', due: '2027-03-05', source: 'SC-08', status: 'Open', workstream: 'Finance & Procurement' }),
  A(9, { action: 'Prepare benefits realization update for SC-10', owner: 'M. Lefèvre', due: '2027-02-23', source: 'SC-09', status: 'Open', workstream: 'Program Management' }),
  A(10, { action: 'Circulate SC-09 minutes for approval', owner: 'D. Singh', due: '2027-02-07', source: 'SC-09', status: 'Completed', workstream: 'Program Management' }),
  A(11, { action: 'Tax advisor methodology paper on transfer pricing', owner: 'P. Rao', due: '2027-03-15', source: 'Weekly review 02 Feb', status: 'Open', workstream: 'Legal & Compliance' }),
  A(12, { action: 'Daily site walk and punch-list closure tracking', owner: 'M. Khan', due: '2027-02-28', source: 'Weekly review 16 Feb', status: 'In Progress', workstream: 'Facilities & Workplace' }),
  A(13, { action: 'Update program baseline after CR-001 approval', owner: 'D. Singh', due: '2026-09-15', source: 'SC-04', status: 'Completed', workstream: 'Program Management' }),
  A(14, { action: 'Confirm Wave 1 hypercare exit criteria', owner: 'A. Sharma', due: '2027-02-01', source: 'SC-08', status: 'Completed', workstream: 'Transition Readiness' }),
  // ---- business-unit (IT domain) level actions
  A(15, { action: 'Produce SAP / ERP AMS staffing options paper for SC-10', owner: 'V. Reddy', due: '2027-02-23', source: 'SC-09', status: 'In Progress', workstream: 'Transition Readiness', businessUnit: APPS, projectId: 'p-sap-ams' }),
  A(16, { action: 'Run network monitoring tool evaluation (SolarWinds vs ThousandEyes)', owner: 'R. Mehta', due: '2027-02-09', source: 'Infrastructure & Cloud review 22 Jan', status: 'Overdue', workstream: 'Technology & Infrastructure', businessUnit: INFRA, projectId: 'p-network' }),
  A(17, { action: 'Collect IAM licence usage baseline for the European tenant', owner: 'P. Rao', due: '2027-02-24', source: 'Cybersecurity & IAM review 25 Jan', status: 'Open', workstream: 'Technology & Infrastructure', businessUnit: CYBER, projectId: 'p-iam' }),
  A(18, { action: 'Nominate SOC L1 shift leads', owner: 'P. Rao', due: '2027-02-02', source: 'SC-08', status: 'Completed', workstream: 'Operations Setup', businessUnit: CYBER, projectId: 'p-secops' }),
  A(19, { action: 'Submit data-platform access request with data classification', owner: 'S. Iyer', due: '2027-02-14', source: 'Data, Analytics & AI review 29 Jan', status: 'Overdue', workstream: 'Technology & Infrastructure', businessUnit: DATA, projectId: 'p-data-eng' }),
  A(20, { action: 'Close PII masking exceptions on the BI / Analytics migration', owner: 'S. Iyer', due: '2027-02-28', source: 'Weekly review 16 Feb', status: 'In Progress', workstream: 'Legal & Compliance', businessUnit: DATA, projectId: 'p-data-bi' }),
  A(21, { action: 'Draft second-pod ramp plan with the GBU integration owners', owner: 'M. Khan', due: '2027-02-27', source: 'Integration & Engineering review 01 Feb', status: 'Open', workstream: 'Talent & Hiring', businessUnit: ENG, projectId: 'p-api' }),
  A(22, { action: 'Landing-zone hardening sign-off by group security', owner: 'M. Khan', due: '2027-02-28', source: 'SC-07', status: 'In Progress', workstream: 'Technology & Infrastructure', businessUnit: ENG, projectId: 'p-devops' }),
  A(23, { action: 'Agree major incident ownership transfer checklist with E. Schmidt', owner: 'D. Singh', due: '2027-03-10', source: 'IT Service Management review 06 Feb', status: 'Open', workstream: 'Operations Setup', businessUnit: ITSM, projectId: 'p-incident' }),
  A(24, { action: 'Load CMDB reconciliation rules into ServiceNow', owner: 'D. Singh', due: '2027-02-21', source: 'IT Service Management review 06 Feb', status: 'In Progress', workstream: 'Operations Setup', businessUnit: ITSM, projectId: 'p-svcmgmt' }),
  A(25, { action: 'Service-desk vendor SLA breach – remediation plan', owner: 'K. Nair', due: '2027-02-17', source: 'Digital Workplace review 08 Feb', status: 'Overdue', workstream: 'Operations Setup', businessUnit: DWP, projectId: 'p-service-desk' }),
  A(26, { action: 'Draft bilingual (French / Dutch) service-desk agent hiring plan', owner: 'K. Nair', due: '2027-03-12', source: 'Digital Workplace review 08 Feb', status: 'Open', workstream: 'Talent & Hiring', businessUnit: DWP, projectId: 'p-service-desk' }),
  A(27, { action: 'Confirm Cloud Operations third-pod shift roster and transport', owner: 'R. Mehta', due: '2027-02-25', source: 'Infrastructure & Cloud review 22 Jan', status: 'In Progress', workstream: 'Transition Readiness', businessUnit: INFRA, projectId: 'p-cloud-ops' }),
  A(28, { action: 'Lock SAP KT calendar with the Networks GBU (France)', owner: 'V. Reddy', due: '2027-02-26', source: 'SC-08', status: 'In Progress', workstream: 'Transition Readiness', businessUnit: APPS, projectId: 'p-sap-ams' }),
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
  S(1, { name: 'C. Dubois', role: 'Group COO / Global Executive Sponsor', organization: 'ENGIE Group HQ (Paris)', influence: 'High', interest: 'High', engagement: 'Monthly', owner: 'R. Banerjee', group: 'Global Executive', sentiment: 'Supportive' }),
  S(2, { name: 'M. Lefèvre', role: 'Group CFO', organization: 'Group Finance', influence: 'High', interest: 'High', engagement: 'Monthly', owner: 'V. Reddy', group: 'Global Executive', sentiment: 'Neutral' }),
  S(3, { name: 'T. Moreau', role: 'Group CIO', organization: 'Group IT', influence: 'High', interest: 'High', engagement: 'Fortnightly', owner: 'R. Mehta', group: 'Global Executive', sentiment: 'Concerned', businessUnits: [INFRA, APPS, DATA, ENG] }),
  S(4, { name: 'H. Weber', role: 'Group CHRO', organization: 'Group HR', influence: 'High', interest: 'Medium', engagement: 'Monthly', owner: 'S. Iyer', group: 'Global Executive', sentiment: 'Supportive' }),
  S(5, { name: 'N. Kulkarni', role: 'GCC Head / Pune Program Sponsor', organization: 'ENGIE IT GCC, Pune', influence: 'High', interest: 'High', engagement: 'Weekly', owner: 'A. Sharma', group: 'India Leadership', sentiment: 'Supportive' }),
  S(6, { name: 'R. Banerjee', role: 'GCC Program Director', organization: 'ENGIE IT GCC, Pune', influence: 'High', interest: 'High', engagement: 'Weekly', owner: 'A. Sharma', group: 'India Leadership', sentiment: 'Supportive' }),
  S(7, { name: 'P. Lambert', role: 'Global Head of Infrastructure & Cloud', organization: 'Group GBS / Shared IT', influence: 'Medium', interest: 'High', engagement: 'Fortnightly', owner: 'R. Mehta', group: 'Global Functional', sentiment: 'Neutral', businessUnits: [INFRA] }),
  S(8, { name: 'A. Van den Berg', role: 'Group CISO', organization: 'Group Security (Brussels)', influence: 'High', interest: 'High', engagement: 'Fortnightly', owner: 'P. Rao', group: 'Global Executive', sentiment: 'Concerned', businessUnits: [CYBER] }),
  S(9, { name: 'G. Rousseau', role: 'Global Head of Real Estate', organization: 'Group Facilities', influence: 'Medium', interest: 'Medium', engagement: 'Monthly', owner: 'K. Nair', group: 'Global Functional', sentiment: 'Supportive' }),
  S(10, { name: 'S. Desai', role: 'Group General Counsel', organization: 'Group Legal', influence: 'High', interest: 'Low', engagement: 'Quarterly', owner: 'P. Rao', group: 'Global Executive', sentiment: 'Neutral' }),
  S(11, { name: 'Works Council (CSE – France)', role: 'Employee representation', organization: 'ENGIE France entities', influence: 'Medium', interest: 'High', engagement: 'Monthly', owner: 'H. Weber', group: 'External', sentiment: 'Concerned', businessUnits: [APPS, DWP] }),
  S(12, { name: 'Maharashtra IT Dept. / SEZ authority', role: 'State regulator', organization: 'Government', influence: 'Medium', interest: 'Low', engagement: 'As needed', owner: 'P. Rao', group: 'External', sentiment: 'Neutral' }),
  S(13, { name: 'Landlord – EON Kharadi IT Park', role: 'Facility provider', organization: 'External vendor', influence: 'Low', interest: 'Medium', engagement: 'Fortnightly', owner: 'K. Nair', group: 'External', sentiment: 'Supportive' }),
  S(14, { name: 'Receiving team leads (Wave 2)', role: 'Process owners', organization: 'GBU IT teams (France, USA)', influence: 'Low', interest: 'High', engagement: 'Weekly', owner: 'A. Sharma', group: 'Global Functional', sentiment: 'Neutral', businessUnits: [APPS, DATA] }),
  // ---- business-unit sponsors and global counterparts
  S(15, { name: 'J.-M. Fournier', role: 'Head of SAP CoE – Networks GBU', organization: 'Networks GBU IT (Lyon)', influence: 'High', interest: 'High', engagement: 'Fortnightly', owner: 'V. Reddy', group: 'Global Functional', sentiment: 'Neutral', businessUnits: [APPS] }),
  S(16, { name: 'K. O\'Brien', role: 'VP IT – Renewables & Flexible Power', organization: 'R&FP GBU IT (Houston)', influence: 'Medium', interest: 'High', engagement: 'Fortnightly', owner: 'V. Reddy', group: 'Global Functional', sentiment: 'Supportive', businessUnits: [APPS] }),
  S(17, { name: 'I. Martin', role: 'Chief Data Officer', organization: 'Group Data Office', influence: 'High', interest: 'High', engagement: 'Monthly', owner: 'S. Iyer', group: 'Global Executive', sentiment: 'Concerned', businessUnits: [DATA] }),
  S(18, { name: 'L. Janssen', role: 'Head of Digital Workplace', organization: 'Group GBS / Shared IT (Brussels)', influence: 'Medium', interest: 'High', engagement: 'Monthly', owner: 'K. Nair', group: 'Global Functional', sentiment: 'Supportive', businessUnits: [DWP] }),
  S(19, { name: 'E. Schmidt', role: 'Group ITSM Process Owner', organization: 'Group IT Service Management', influence: 'Medium', interest: 'High', engagement: 'Weekly', owner: 'D. Singh', group: 'Global Functional', sentiment: 'Concerned', businessUnits: [ITSM] }),
  S(20, { name: 'R. Costa', role: 'Head of Engineering & Integration', organization: 'Group IT Engineering', influence: 'High', interest: 'Medium', engagement: 'Monthly', owner: 'M. Khan', group: 'Global Executive', sentiment: 'Supportive', businessUnits: [ENG] }),
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
/** Transition-heavy domains (Europe / France / USA work moving to Pune) make the Transition Lead responsible; build-heavy domains consult. */
const TRANSITION_HEAVY = [INFRA, CYBER, APPS]
export const seedBuRaci: BuRaciRow[] = BU_NAMES.map((bu, i) => ({
  id: `buraci-${i}`,
  businessUnit: bu,
  cells: { 'Global Exec Sponsor': 'I', 'India Sponsor': 'A', 'Program Director': 'C', 'Business Unit Owner': 'R', 'Unit Sponsor': 'A', 'Transition Lead': TRANSITION_HEAVY.includes(bu) ? 'R' : 'C', PMO: 'I' },
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
  BG(1, INFRA, 'T. Moreau (Group CIO)', 'Fortnightly', '2027-02-22', 'Cloud Operations shift model and network tooling decisions due before the Wave 1 hypercare exit.'),
  BG(2, DWP, 'L. Janssen (Head of Digital Workplace)', 'Monthly', '2027-03-05', 'Service-desk vendor SLA breach under remediation; bilingual coverage decision gates Wave 3.'),
  BG(3, CYBER, 'A. Van den Berg (Group CISO)', 'Monthly', '2027-02-23', 'IAM licensing decision gates the privileged-access change request.'),
  BG(4, APPS, 'J.-M. Fournier (Head of SAP CoE, Networks GBU)', 'Fortnightly', '2027-02-26', 'SAP / ERP transition approval from France is the Wave 2 critical path.'),
  BG(5, DATA, 'I. Martin (Chief Data Officer)', 'Monthly', '2027-02-27', 'Production data-platform access is the critical path for the run team.'),
  BG(6, ENG, 'R. Costa (Head of Engineering & Integration)', 'Monthly', '2027-02-28', 'Landing-zone standard complete before Wave 4.'),
  BG(7, ITSM, 'E. Schmidt (Group ITSM Process Owner)', 'Monthly', '2027-03-03', 'Major incident ownership transfer from Wave 3.'),
]

/* ---------------- RAID → business unit links (shared 'raid' items stay untouched) ---------------- */
export interface GovRaidLink { id: string; businessUnit: string; projectId?: string } // id = raid item id
export const seedGovRaidLinks: GovRaidLink[] = [
  { id: 'r-001', businessUnit: INFRA, projectId: 'p-network' },
  { id: 'r-039', businessUnit: INFRA, projectId: 'p-cloud-ops' },
  { id: 'r-ws-tech-3', businessUnit: INFRA, projectId: 'p-network' },
  { id: 'r-010', businessUnit: APPS },
  { id: 'r-011', businessUnit: APPS, projectId: 'p-sap-ams' },
  { id: 'i-006', businessUnit: APPS, projectId: 'p-sap-ams' },
  { id: 'r-002', businessUnit: DATA, projectId: 'p-data-eng' },
  { id: 'i-004', businessUnit: DATA, projectId: 'p-data-eng' },
  { id: 'r-009', businessUnit: CYBER, projectId: 'p-iam' },
  { id: 'r-ws-tech-1', businessUnit: CYBER },
  { id: 'i-027', businessUnit: DWP, projectId: 'p-euc' },
  { id: 'r-ws-tech-2', businessUnit: DWP },
  { id: 'r-026', businessUnit: ITSM, projectId: 'p-svcmgmt' },
  { id: 'r-016', businessUnit: ENG },
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
/** First review date per business unit (owner = domain owner from the business unit list); reviews repeat from there. */
const UNIT_REVIEWS: { unit: string; owner: string; first: string; cadence: 'Monthly' | 'Fortnightly' }[] = [
  { unit: INFRA, owner: 'R. Mehta', first: '2027-02-22', cadence: 'Fortnightly' },
  { unit: CYBER, owner: 'P. Rao', first: '2027-02-23', cadence: 'Monthly' },
  { unit: APPS, owner: 'V. Reddy', first: '2027-02-26', cadence: 'Fortnightly' },
  { unit: DATA, owner: 'S. Iyer', first: '2027-02-27', cadence: 'Monthly' },
  { unit: ENG, owner: 'M. Khan', first: '2027-02-28', cadence: 'Monthly' },
  { unit: ITSM, owner: 'D. Singh', first: '2027-03-03', cadence: 'Monthly' },
  { unit: DWP, owner: 'K. Nair', first: '2027-03-05', cadence: 'Monthly' },
]
function buildEvents(): GovEvent[] {
  const ev: GovEvent[] = [
    E(1, { title: 'Steering Committee #10', type: 'Steering Committee', date: '2027-02-28', cadence: 'Monthly', owner: 'R. Banerjee', attendees: 'Steering members' }),
    E(2, { title: 'Steering Committee #11', type: 'Steering Committee', date: '2027-03-25', cadence: 'Monthly', owner: 'R. Banerjee', attendees: 'Steering members' }),
    E(3, { title: 'Steering Committee #12', type: 'Steering Committee', date: '2027-04-16', cadence: 'Monthly', owner: 'R. Banerjee', attendees: 'Steering members' }),
    E(4, { title: 'Q1 2027 Quarterly Business Review', type: 'Quarterly Business Review', date: '2027-04-10', cadence: 'Quarterly', owner: 'C. Dubois', attendees: 'Group ExCo, GCC leadership' }),
    E(5, { title: 'Transition go/no-go review (Wave 3)', type: 'Go/No-Go', date: '2027-03-04', cadence: 'One-off', owner: 'A. Sharma', attendees: 'Steering members, workstream leads' }),
    E(6, { title: 'Go/No-Go for Wave 4', type: 'Go/No-Go', date: '2027-04-04', cadence: 'One-off', owner: 'A. Sharma', attendees: 'Steering members, workstream leads' }),
    E(7, { title: 'Security & compliance audit', type: 'Audit / Compliance', date: '2027-03-18', cadence: 'One-off', owner: 'P. Rao', attendees: 'Internal audit, R. Mehta, P. Rao' }),
    E(8, { title: 'Q2 2027 Quarterly Business Review', type: 'Quarterly Business Review', date: '2027-07-17', cadence: 'Quarterly', owner: 'C. Dubois', attendees: 'Group ExCo, GCC leadership' }),
    // unit-specific one-off reviews
    E(101, { title: 'Cloud Operations hypercare exit review', type: 'Go/No-Go', date: '2027-02-26', cadence: 'One-off', owner: 'R. Mehta', attendees: 'P. Lambert, T. Moreau, R. Mehta, PMO', businessUnit: INFRA }),
    E(102, { title: 'IAM licensing workshop', type: 'Other', date: '2027-02-27', cadence: 'One-off', owner: 'P. Rao', attendees: 'A. Van den Berg, T. Moreau, P. Rao', businessUnit: CYBER }),
    E(103, { title: 'Data-platform access approval board', type: 'Other', date: '2027-02-22', cadence: 'One-off', owner: 'S. Iyer', attendees: 'I. Martin, group IT security, S. Iyer', businessUnit: DATA }),
    E(104, { title: 'SAP / ERP transition approval – Networks GBU', type: 'Go/No-Go', date: '2027-03-02', cadence: 'One-off', owner: 'V. Reddy', attendees: 'J.-M. Fournier, T. Moreau, V. Reddy', businessUnit: APPS }),
    E(105, { title: 'Landing-zone security sign-off', type: 'Audit / Compliance', date: '2027-02-28', cadence: 'One-off', owner: 'M. Khan', attendees: 'Group security, M. Khan, P. Rao', businessUnit: ENG }),
    E(106, { title: 'Major incident ownership transfer workshop', type: 'Other', date: '2027-03-12', cadence: 'One-off', owner: 'D. Singh', attendees: 'E. Schmidt, T. Moreau, D. Singh', businessUnit: ITSM }),
    E(107, { title: 'Service-desk vendor SLA review', type: 'Audit / Compliance', date: '2027-02-21', cadence: 'One-off', owner: 'K. Nair', attendees: 'L. Janssen, service-desk vendor, K. Nair', businessUnit: DWP }),
  ]
  // Recurring business unit reviews (unit owner + sponsor + PMO) until end May 2027
  let u = 200
  for (const r of UNIT_REVIEWS) {
    for (let d = new Date(r.first), k = 0; d <= new Date('2027-05-31') && k < 8; k++) {
      ev.push(E(u++, { title: `${r.unit} ${r.cadence.toLowerCase()} review`, type: 'Business Unit Review', date: d.toISOString().slice(0, 10), cadence: r.cadence, owner: r.owner, attendees: 'Unit owner, unit sponsor, PMO', businessUnit: r.unit }))
      if (r.cadence === 'Monthly') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 14)
    }
  }
  let n = 9
  // Weekly integrated program reviews (Tuesdays) and workstream status (Thursdays) from 20 Feb to end Apr 2027
  for (let d = new Date('2027-02-20'); d <= new Date('2027-04-30'); d.setDate(d.getDate() + 7)) {
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
  { id: 'ctl-1', control: 'Steering committee composition & terms of reference', wbs: '1.3.1', description: 'Membership, quorum and decision rights of the steering committee.', owner: 'R. Banerjee', status: 'Active', lastReviewed: '2027-01-30', evidence: 'ToR v2.1' },
  { id: 'ctl-2', control: 'Decision-making authority & escalation thresholds', wbs: '1.3.2', description: 'Delegation matrix: Workstream Lead < ₹ 5 L; Program Director < ₹ 25 L; Steering Committee above.', owner: 'A. Sharma', status: 'Active', lastReviewed: '2026-12-15', evidence: 'Delegation matrix v1.3' },
  { id: 'ctl-3', control: 'Workstream governance calendar', wbs: '1.3.3', description: 'Published cadence for all reviews, steering and QBRs.', owner: 'D. Singh', status: 'Active', lastReviewed: '2027-02-01', evidence: 'Governance calendar Q1 2027' },
  { id: 'ctl-4', control: 'Weekly & monthly reporting templates', wbs: '1.3.4', description: 'Standard status report and steering pack templates.', owner: 'D. Singh', status: 'Needs Review', lastReviewed: '2026-10-10', evidence: 'Template pack v3 (versioning issue I-034)' },
  { id: 'ctl-5', control: 'RAID, action, dependency & decision registers', wbs: '1.3.5', description: 'Single registers maintained in the Command Center; reviewed weekly.', owner: 'A. Sharma', status: 'Active', lastReviewed: '2027-02-13', evidence: 'Registers (this tool)' },
  { id: 'ctl-6', control: 'Program change-request process', wbs: '1.3.6', description: 'Capture, impact assessment, approval and baseline update for scope/budget/timeline changes.', owner: 'A. Sharma', status: 'Active', lastReviewed: '2027-01-01', evidence: 'CR procedure v1.2' },
  { id: 'ctl-7', control: 'Deliverable acceptance & sign-off procedure', wbs: '1.3.7', description: 'Acceptance criteria, evidence and sign-off roles per deliverable.', owner: 'D. Singh', status: 'In Progress', lastReviewed: '2027-01-20', evidence: 'Acceptance log (62% deliverables mapped)' },
  { id: 'ctl-8', control: 'Program health indicators & RAG criteria', wbs: '1.3.8', description: 'Objective thresholds for schedule, budget, scope and risk RAG.', owner: 'A. Sharma', status: 'Active', lastReviewed: '2026-11-15', evidence: 'RAG criteria table' },
  { id: 'ctl-9', control: 'Document repository & version control', wbs: '1.3.9', description: 'SharePoint program library with controlled folders and naming standard.', owner: 'D. Singh', status: 'Active', lastReviewed: '2026-12-30', evidence: 'Library audit Dec 2026' },
  { id: 'ctl-10', control: 'Weekly integrated program reviews', wbs: '1.3.10', description: 'Cross-workstream review of status, dependencies and escalations.', owner: 'A. Sharma', status: 'Active', lastReviewed: '2027-02-13', evidence: '38 of 41 reviews held' },
  { id: 'ctl-11', control: 'Stakeholder contact & escalation matrix', wbs: '13.1.5', description: 'Named escalation path per stakeholder group (GBU IT, Group GBS, Pune).', owner: 'A. Sharma', status: 'In Progress', lastReviewed: '2027-01-10', evidence: 'Stakeholder register' },
  { id: 'ctl-12', control: 'Program communication plan', wbs: '13.2.1', description: 'Audience, channel and frequency for program communications.', owner: 'D. Singh', status: 'Planned', lastReviewed: '', evidence: 'Draft due 28 Feb' },
  // ---- business-unit (IT domain) specific controls
  { id: 'ctl-13', control: 'Cloud Operations run-book & change governance', wbs: '1.3.11', description: 'Run-book coverage, change windows and on-call rota for the European cloud estate run from Pune.', owner: 'R. Mehta', status: 'Active', lastReviewed: '2027-02-06', evidence: 'Run-book pack v1.0', businessUnits: [INFRA] },
  { id: 'ctl-14', control: 'IAM & privileged access governance', wbs: '1.3.12', description: 'Access certification cycles, PAM break-glass and segregation-of-duties rules for the Pune IAM team.', owner: 'P. Rao', status: 'In Progress', lastReviewed: '2027-02-10', evidence: 'Access governance charter (draft)', businessUnits: [CYBER] },
  { id: 'ctl-15', control: 'Data access & classification approvals', wbs: '1.3.13', description: 'Approval workflow and evidence for production data-platform access by GCC engineers.', owner: 'S. Iyer', status: 'Needs Review', lastReviewed: '2027-01-18', evidence: 'Access approval log – 6 requests pending', businessUnits: [DATA] },
  { id: 'ctl-16', control: 'Release & change control for engineering squads', wbs: '1.3.14', description: 'CAB cadence, change calendar and SRE error-budget policy for the Integration & Engineering squads.', owner: 'M. Khan', status: 'Active', lastReviewed: '2027-02-02', evidence: 'Change calendar; CAB minutes', businessUnits: [ENG, ITSM] },
  { id: 'ctl-17', control: 'SAP AMS SLA & ticket governance', wbs: '1.3.15', description: 'SLA catalogue, priority matrix and ticket hygiene reviews for the SAP / ERP AMS service (Networks GBU).', owner: 'V. Reddy', status: 'In Progress', lastReviewed: '2027-02-13', evidence: 'AMS SLA pack v0.9', businessUnits: [APPS] },
  { id: 'ctl-18', control: 'Service desk SLA & language coverage', wbs: '1.3.16', description: 'SLA catalogue, CSAT and French / Dutch coverage for the Group GBS service desk.', owner: 'K. Nair', status: 'Planned', lastReviewed: '', evidence: 'Draft due 15 Mar', businessUnits: [DWP] },
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
