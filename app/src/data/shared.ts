/**
 * Shared collections used by more than one page. Pages read/write these through
 * useCollection('<name>', <seed>) so edits made on one page show up everywhere.
 *
 *  - 'milestones'  : Milestone[]        (Dashboard, Program Planning, Workstreams, Transition)
 *  - 'raid'        : RaidItem[]         (Dashboard, Risks & Issues, Workstreams, Governance)
 *  - 'programKpis' : [ProgramKpis]      (Dashboard headline tiles, editable in Settings/Dashboard)
 */
import type { Workstream, Status, Impact } from './common'

/* ------------------------------------------------------------------ */
/* Milestones                                                          */
/* ------------------------------------------------------------------ */
export interface Milestone {
  id: string
  name: string
  workstream: Workstream
  dueDate: string // ISO
  status: Status
  owner: string
  phase: 'Design' | 'Build' | 'Transition' | 'Operate'
  startDate?: string
  progress?: number
  /** Key milestone: shown on the Dashboard "Upcoming Milestones" and Program Planning "Key Upcoming Milestones" cards */
  critical?: boolean
}

const M = (id: string, name: string, workstream: Workstream, dueDate: string, status: Status, owner: string, phase: Milestone['phase'] = 'Build', critical = false): Milestone =>
  ({ id, name, workstream, dueDate, status, owner, phase, critical })

export const seedMilestones: Milestone[] = [
  // The five "Upcoming Milestones" from the Dashboard / Program Planning mock-ups
  M('ms-001', 'IT infrastructure readiness', 'Technology & Infrastructure', '2027-02-23', 'At Risk', 'R. Mehta', 'Build', true),
  M('ms-002', 'Wave 2 hiring completion', 'Talent & Hiring', '2027-02-28', 'On Track', 'S. Iyer', 'Build', true),
  M('ms-003', 'Transition go/no-go review', 'Transition Readiness', '2027-03-04', 'Pending', 'A. Sharma', 'Transition', true),
  M('ms-004', 'Facility handover', 'Facilities & Workplace', '2027-03-10', 'On Track', 'K. Nair', 'Build', true),
  M('ms-005', 'Security & compliance sign-off', 'Legal & Compliance', '2027-03-18', 'Not Started', 'P. Rao', 'Build', true),
  M('ms-006', 'Office fit-out completion', 'Facilities & Workplace', '2027-03-30', 'On Track', 'K. Nair', 'Build', true),
  M('ms-007', 'Go/No-Go for transition', 'Transition Readiness', '2027-04-04', 'Pending', 'A. Sharma', 'Transition', true),
  // Workstreams page "Key Milestone" column
  M('ms-008', 'Network provisioning', 'Technology & Infrastructure', '2027-02-23', 'At Risk', 'R. Mehta', 'Build'),
  M('ms-009', 'Regulatory approvals', 'Legal & Compliance', '2027-03-18', 'On Track', 'P. Rao', 'Build'),
  M('ms-010', 'Go/No-Go for wave 1', 'Transition Readiness', '2027-04-04', 'At Risk', 'A. Sharma', 'Transition'),
  M('ms-011', 'Service readiness', 'Operations Setup', '2027-04-15', 'On Track', 'M. Khan', 'Build'),
  M('ms-012', 'Vendor contracts signed', 'Finance & Procurement', '2027-02-28', 'Delayed', 'V. Reddy', 'Build'),
  // Technology & Infrastructure "Key Milestones" (Workstreams drill-down)
  M('ms-013', 'Data center setup', 'Technology & Infrastructure', '2027-02-15', 'Completed', 'R. Mehta'),
  M('ms-014', 'Laptop & endpoint setup', 'Technology & Infrastructure', '2027-03-05', 'On Track', 'R. Mehta'),
  M('ms-015', 'Security & access management', 'Technology & Infrastructure', '2027-03-18', 'On Track', 'R. Mehta'),
  M('ms-016', 'Collaboration tools setup', 'Technology & Infrastructure', '2027-03-30', 'On Track', 'R. Mehta'),
  M('ms-017', 'Disaster recovery readiness', 'Technology & Infrastructure', '2027-04-10', 'Pending', 'R. Mehta'),
  M('ms-018', 'Production environment go-live', 'Technology & Infrastructure', '2027-04-20', 'Not Started', 'R. Mehta', 'Build'),
  // Completed / earlier milestones
  M('ms-019', 'Program kick-off', 'Operations Setup', '2026-05-31', 'Completed', 'A. Sharma', 'Design'),
  M('ms-020', 'Governance framework', 'Operations Setup', '2026-06-28', 'Completed', 'A. Sharma', 'Design'),
  M('ms-021', 'Steering committee cadence', 'Operations Setup', '2026-07-15', 'Completed', 'A. Sharma', 'Design'),
  M('ms-022', 'Role architecture', 'Talent & Hiring', '2026-06-28', 'Completed', 'S. Iyer', 'Design'),
  M('ms-023', 'Entity setup and regulatory', 'Legal & Compliance', '2026-07-31', 'Completed', 'P. Rao', 'Design'),
  M('ms-024', 'Tax & statutory registrations', 'Legal & Compliance', '2026-10-30', 'Completed', 'P. Rao'),
  M('ms-025', 'Office lease agreement', 'Facilities & Workplace', '2027-02-15', 'Completed', 'K. Nair'),
  M('ms-026', 'Office space fit-out', 'Facilities & Workplace', '2026-10-30', 'Completed', 'K. Nair'),
  M('ms-027', 'Campus & lateral hiring', 'Talent & Hiring', '2027-01-30', 'On Track', 'S. Iyer'),
  M('ms-028', 'Onboarding & ramp-up', 'Talent & Hiring', '2027-04-30', 'At Risk', 'S. Iyer'),
  M('ms-029', 'IT infrastructure & network', 'Technology & Infrastructure', '2026-12-15', 'At Risk', 'R. Mehta'),
  M('ms-030', 'Security & compliance setup', 'Technology & Infrastructure', '2027-01-30', 'On Track', 'R. Mehta'),
  M('ms-031', 'Payroll go-live', 'Finance & Procurement', '2027-01-15', 'Completed', 'V. Reddy'),
  M('ms-032', 'ERP entity configuration', 'Finance & Procurement', '2026-12-31', 'Completed', 'V. Reddy'),
  M('ms-033', 'Bank accounts operational', 'Finance & Procurement', '2026-09-30', 'Completed', 'V. Reddy'),
  M('ms-034', 'Facility management contract', 'Facilities & Workplace', '2027-03-20', 'Delayed', 'K. Nair'),
  M('ms-035', 'Knowledge transfer for SAP / ERP (France)', 'Transition Readiness', '2027-01-25', 'On Track', 'R. Mehta', 'Transition'),
  M('ms-036', 'Cloud Operations handover from Europe', 'Transition Readiness', '2027-01-28', 'At Risk', 'S. Iyer', 'Transition'),
  M('ms-037', 'Wave 2 readiness review', 'Transition Readiness', '2027-02-05', 'On Track', 'P. Rao', 'Transition'),
  M('ms-038', 'Employee transition to Wave 2', 'Transition Readiness', '2027-02-12', 'On Track', 'K. Nair', 'Transition'),
  M('ms-039', 'Go/No-Go for Wave 3', 'Transition Readiness', '2027-02-28', 'Pending', 'A. Sharma', 'Transition'),
  M('ms-040', 'Cafeteria & transport operational', 'Operations Setup', '2027-03-25', 'Delayed', 'M. Khan'),
  M('ms-041', 'Insurance policies activated', 'Legal & Compliance', '2027-02-28', 'Delayed', 'P. Rao'),
  M('ms-042', 'Stabilization run-rate funding', 'Finance & Procurement', '2027-07-31', 'Delayed', 'V. Reddy', 'Operate'),
]

/* ------------------------------------------------------------------ */
/* RAID register (risks + issues)                                      */
/* ------------------------------------------------------------------ */
export type RiskCategory = 'People & Talent' | 'Technology & Data' | 'Facilities & Infra' | 'Process & Operations' | 'Legal & Compliance' | 'Vendor & Third Party'
export const RISK_CATEGORIES: RiskCategory[] = ['People & Talent', 'Technology & Data', 'Facilities & Infra', 'Process & Operations', 'Legal & Compliance', 'Vendor & Third Party']
export const LIKELIHOOD = ['Very Low', 'Low', 'Medium', 'High', 'Very High'] as const
export const IMPACT_SCALE = ['Very Low', 'Low', 'Medium', 'High', 'Very High'] as const

export interface RaidItem {
  id: string
  code: string // R-001 / I-004
  type: 'Risk' | 'Issue'
  title: string
  workstream: string // display label from the mock-ups e.g. "Technology & Infra"
  category: RiskCategory
  level: Impact // Critical / High / Medium / Low
  status: Status // Open / In Progress / At Risk / Resolved / Closed / On Track / Overdue / Not Started
  owner: string
  dueDate: string
  openedOn: string
  likelihood: (typeof LIKELIHOOD)[number]
  impact: (typeof IMPACT_SCALE)[number]
  impactScore: number // 0-10
  description?: string
  mitigation?: string
  escalated?: boolean
  escalationStatus?: 'Awaiting Decision' | 'In Progress' | 'Resolved'
  /** Short label used on the Dashboard "Key Risks and Issues" card */
  shortTitle?: string
  /** Pinned to the Dashboard "Key Risks and Issues" card */
  keyRisk?: boolean
}

const R = (p: Partial<RaidItem> & Pick<RaidItem, 'code' | 'type' | 'title' | 'workstream' | 'category' | 'level' | 'status' | 'owner' | 'dueDate' | 'openedOn'>): RaidItem => ({
  id: p.id ?? p.code.toLowerCase(),
  likelihood: 'Medium',
  impact: 'Medium',
  impactScore: p.level === 'Critical' ? 8.5 : p.level === 'High' ? 7 : p.level === 'Medium' ? 5 : 3,
  ...p,
})

export const seedRaid: RaidItem[] = [
  // Register rows from the Risks and Issues mock-up (Days Open computed from openedOn vs 20 Oct 2026)
  R({ code: 'R-001', type: 'Risk', shortTitle: 'Network provisioning delay', keyRisk: true, title: 'Delay in IT infrastructure provisioning', workstream: 'Technology & Infra', category: 'Technology & Data', level: 'Critical', status: 'Open', owner: 'R. Mehta', dueDate: '2027-02-25', openedOn: '2027-01-18', likelihood: 'Very High', impact: 'Very High', impactScore: 9.0, escalated: true, escalationStatus: 'Awaiting Decision', description: 'Network circuits and core switching for the Pune site are three weeks behind the telecom provider commitment.', mitigation: 'Escalate network provisioning issue to steering committee; activate backup ISP; re-sequence endpoint rollout.' }),
  R({ code: 'R-002', type: 'Risk', shortTitle: 'Specialist hiring shortfall', keyRisk: true, title: 'Specialist talent hiring shortfall', workstream: 'Talent & Hiring', category: 'People & Talent', level: 'Critical', status: 'Open', owner: 'S. Iyer', dueDate: '2027-02-28', openedOn: '2027-01-22', likelihood: 'High', impact: 'Very High', impactScore: 8.5, escalated: true, escalationStatus: 'Awaiting Decision', description: 'Data Engineer, SAP Functional / Technical and IAM Specialist pipelines are 20% behind the Wave 2 plan.', mitigation: 'Approve additional hiring support for critical roles; engage two specialist agencies; open lateral hiring in Hyderabad.' }),
  R({ code: 'R-003', type: 'Risk', shortTitle: 'Regulatory compliance review', keyRisk: true, title: 'Change in regulatory requirements', workstream: 'Legal & Compliance', category: 'Legal & Compliance', level: 'High', status: 'Open', owner: 'P. Rao', dueDate: '2027-03-05', openedOn: '2027-01-28', likelihood: 'Medium', impact: 'High', impactScore: 7.5, description: 'Draft amendments to state labour compliance may change registration timelines.', mitigation: 'Legal counsel to track amendments; prepare dual filing path.' }),
  R({ code: 'I-004', type: 'Issue', title: 'Access approval delays for data', workstream: 'Technology & Data', category: 'Technology & Data', level: 'High', status: 'In Progress', owner: 'K. Nair', dueDate: '2027-02-22', openedOn: '2027-02-05', likelihood: 'High', impact: 'High', impactScore: 6.8, description: 'Global data access approvals for Wave 1 analysts are pending with the group security office.', mitigation: 'Finalize data access approvals by 25 Oct; daily follow-up with global IT security.' }),
  R({ code: 'R-005', type: 'Risk', shortTitle: 'Vendor contract approval', keyRisk: true, title: 'Vendor delivery slippage', workstream: 'Procurement', category: 'Vendor & Third Party', level: 'High', status: 'In Progress', owner: 'V. Reddy', dueDate: '2027-03-12', openedOn: '2027-02-02', likelihood: 'Medium', impact: 'High', impactScore: 7.0, escalated: true, escalationStatus: 'In Progress', description: 'Laptop supplier lead time has moved from 4 to 7 weeks.', mitigation: 'Split order across two suppliers; prioritise Wave 2 joiners.' }),
  R({ code: 'I-006', type: 'Issue', shortTitle: 'Transition documentation gaps', keyRisk: true, title: 'Inconsistent KT documentation', workstream: 'Transition', category: 'Process & Operations', level: 'Medium', status: 'In Progress', owner: 'A. Sharma', dueDate: '2027-02-28', openedOn: '2027-02-10', likelihood: 'Medium', impact: 'Medium', impactScore: 5.5, description: 'Knowledge transfer packs from the France, Belgium and USA teams use three different templates.', mitigation: 'Standardise on the group KT template; review sessions weekly.' }),
  R({ code: 'R-007', type: 'Risk', title: 'Workspace readiness delay', workstream: 'Facilities & Infra', category: 'Facilities & Infra', level: 'Medium', status: 'At Risk', owner: 'M. Khan', dueDate: '2027-03-15', openedOn: '2027-02-08', likelihood: 'Medium', impact: 'Medium', impactScore: 5.8, description: 'Fit-out punch list closure is running behind the planned handover date.', mitigation: 'Daily site walk; contractor penalty clause review.' }),
  R({ code: 'I-008', type: 'Issue', title: 'Process SOPs not finalized', workstream: 'Operations', category: 'Process & Operations', level: 'Medium', status: 'Open', owner: 'D. Singh', dueDate: '2027-02-22', openedOn: '2027-02-12', likelihood: 'Medium', impact: 'Medium', impactScore: 5.0, description: 'Twelve of twenty operating SOPs are still in draft.', mitigation: 'Assign SOP owners; sign-off by 22 Oct.' }),
  R({ code: 'R-009', type: 'Risk', title: 'Data security & access clearance delays', workstream: 'Technology & Data', category: 'Technology & Data', level: 'High', status: 'Open', owner: 'K. Nair', dueDate: '2027-03-08', openedOn: '2027-01-30', likelihood: 'High', impact: 'High', impactScore: 6.8, mitigation: 'Pre-approve role-based access bundles for each hiring wave.' }),
  // Remaining open risks to reach 24 (6 Critical, 8 High, 10 Medium) across the six categories
  R({ code: 'R-010', type: 'Risk', title: 'Key talent attrition during transition', workstream: 'Talent & Hiring', category: 'People & Talent', level: 'Critical', status: 'At Risk', owner: 'R. Mehta', dueDate: '2027-03-20', openedOn: '2027-01-25', likelihood: 'High', impact: 'Very High', impactScore: 8.2, escalated: true, escalationStatus: 'In Progress', mitigation: 'Retention bonus for critical roles; career path communication.' }),
  R({ code: 'R-011', type: 'Risk', title: 'Knowledge transfer delay from global teams', workstream: 'Transition', category: 'People & Talent', level: 'Critical', status: 'Open', owner: 'S. Iyer', dueDate: '2027-03-02', openedOn: '2027-02-01', likelihood: 'Very High', impact: 'High', impactScore: 8.0, escalated: true, escalationStatus: 'In Progress', mitigation: 'Lock KT calendar with global process owners; weekly attendance tracking.' }),
  R({ code: 'R-012', type: 'Risk', title: 'Power resilience at leased building', workstream: 'Facilities & Infra', category: 'Facilities & Infra', level: 'Critical', status: 'On Track', owner: 'K. Nair', dueDate: '2027-03-25', openedOn: '2027-01-15', likelihood: 'Medium', impact: 'Very High', impactScore: 7.9, mitigation: 'Secondary DG set and UPS sizing validated with landlord.' }),
  R({ code: 'R-013', type: 'Risk', title: 'Transfer pricing documentation gaps', workstream: 'Legal & Compliance', category: 'Legal & Compliance', level: 'High', status: 'On Track', owner: 'P. Rao', dueDate: '2027-04-01', openedOn: '2027-01-20', likelihood: 'Low', impact: 'High', impactScore: 6.5, mitigation: 'Tax advisor engaged; methodology paper due 15 Nov.' }),
  R({ code: 'R-014', type: 'Risk', title: 'Payroll statutory configuration errors', workstream: 'Finance & Procurement', category: 'Process & Operations', level: 'High', status: 'On Track', owner: 'V. Reddy', dueDate: '2027-03-10', openedOn: '2027-02-03', likelihood: 'Medium', impact: 'High', impactScore: 6.2, mitigation: 'Second parallel payroll run before go-live.' }),
  R({ code: 'R-015', type: 'Risk', title: 'Fit-out contractor capacity constraints', workstream: 'Facilities & Infra', category: 'Vendor & Third Party', level: 'High', status: 'At Risk', owner: 'M. Khan', dueDate: '2027-03-18', openedOn: '2027-02-06', likelihood: 'High', impact: 'Medium', impactScore: 6.4, mitigation: 'Add second shift; weekly milestone-linked payments.' }),
  R({ code: 'R-016', type: 'Risk', title: 'Campus hiring conversion below plan', workstream: 'Talent & Hiring', category: 'People & Talent', level: 'High', status: 'Overdue', owner: 'S. Iyer', dueDate: '2027-02-15', openedOn: '2027-01-10', likelihood: 'High', impact: 'Medium', impactScore: 6.0, mitigation: 'Increase offer-to-join engagement; pre-joining bootcamp.' }),
  R({ code: 'R-018', type: 'Risk', title: 'Leadership hiring sequence slippage', workstream: 'Talent & Hiring', category: 'People & Talent', level: 'Medium', status: 'On Track', owner: 'S. Iyer', dueDate: '2027-03-30', openedOn: '2027-02-04', likelihood: 'Medium', impact: 'Medium', impactScore: 5.2 }),
  R({ code: 'R-019', type: 'Risk', title: 'Interview panel availability', workstream: 'Talent & Hiring', category: 'People & Talent', level: 'Medium', status: 'On Track', owner: 'S. Iyer', dueDate: '2027-03-05', openedOn: '2027-02-09', likelihood: 'Medium', impact: 'Low', impactScore: 4.2 }),
  R({ code: 'R-021', type: 'Risk', title: 'Occupancy clearance timing', workstream: 'Facilities & Infra', category: 'Facilities & Infra', level: 'Medium', status: 'On Track', owner: 'K. Nair', dueDate: '2027-03-28', openedOn: '2027-02-11', likelihood: 'Medium', impact: 'Medium', impactScore: 5.1 }),
  R({ code: 'R-022', type: 'Risk', title: 'Month-end close process immaturity', workstream: 'Finance & Procurement', category: 'Process & Operations', level: 'Medium', status: 'On Track', owner: 'V. Reddy', dueDate: '2027-04-05', openedOn: '2027-02-13', likelihood: 'Medium', impact: 'Medium', impactScore: 5.0 }),
  R({ code: 'R-023', type: 'Risk', title: 'Insurance policy activation delay', workstream: 'Legal & Compliance', category: 'Legal & Compliance', level: 'Medium', status: 'Overdue', owner: 'P. Rao', dueDate: '2027-02-16', openedOn: '2027-01-26', likelihood: 'Low', impact: 'Medium', impactScore: 4.6 }),
  R({ code: 'R-024', type: 'Risk', title: 'Facility management vendor onboarding', workstream: 'Operations', category: 'Vendor & Third Party', level: 'Medium', status: 'Overdue', owner: 'M. Khan', dueDate: '2027-02-14', openedOn: '2027-01-29', likelihood: 'Medium', impact: 'Medium', impactScore: 5.3 }),
  R({ code: 'R-025', type: 'Risk', title: 'Transport vendor contract not finalized', workstream: 'Operations', category: 'Process & Operations', level: 'Medium', status: 'Not Started', owner: 'D. Singh', dueDate: '2027-04-10', openedOn: '2027-02-15', likelihood: 'Low', impact: 'Low', impactScore: 3.8 }),
  R({ code: 'R-026', type: 'Risk', title: 'Change resistance in receiving teams', workstream: 'Transition', category: 'People & Talent', level: 'Medium', status: 'Not Started', owner: 'A. Sharma', dueDate: '2027-04-15', openedOn: '2027-02-16', likelihood: 'Low', impact: 'Medium', impactScore: 4.0 }),
  // Remaining open issues to reach 12 (3 High, 6 Medium, 3 Low)
  R({ code: 'I-027', type: 'Issue', title: 'System access delays for Wave 1 joiners', workstream: 'Technology & Infra', category: 'Technology & Data', level: 'High', status: 'Open', owner: 'P. Rao', dueDate: '2027-02-24', openedOn: '2027-02-08', impactScore: 6.6, escalated: true, escalationStatus: 'Resolved' }),
  R({ code: 'I-028', type: 'Issue', title: 'Data quality gaps in HRMS migration', workstream: 'Talent & Hiring', category: 'Technology & Data', level: 'Medium', status: 'In Progress', owner: 'K. Nair', dueDate: '2027-02-28', openedOn: '2027-02-06', impactScore: 5.4 }),
  R({ code: 'I-029', type: 'Issue', title: 'Meeting room AV equipment missing', workstream: 'Facilities & Infra', category: 'Facilities & Infra', level: 'Medium', status: 'Open', owner: 'M. Khan', dueDate: '2027-03-03', openedOn: '2027-02-14', impactScore: 4.5 }),
  R({ code: 'I-030', type: 'Issue', title: 'Agency invoices not matching PO terms', workstream: 'Finance & Procurement', category: 'Vendor & Third Party', level: 'Medium', status: 'In Progress', owner: 'V. Reddy', dueDate: '2027-02-28', openedOn: '2027-02-02', impactScore: 4.4 }),
  R({ code: 'I-031', type: 'Issue', title: 'Visitor access badge system down', workstream: 'Operations', category: 'Facilities & Infra', level: 'Medium', status: 'Open', owner: 'D. Singh', dueDate: '2027-02-21', openedOn: '2027-02-17', impactScore: 4.0 }),
  R({ code: 'I-032', type: 'Issue', title: 'Offer letter template rejected by legal', workstream: 'Legal & Compliance', category: 'Legal & Compliance', level: 'Low', status: 'In Progress', owner: 'P. Rao', dueDate: '2027-02-27', openedOn: '2027-02-13', impactScore: 3.2 }),
  R({ code: 'I-033', type: 'Issue', title: 'Cafeteria vendor onboarding paperwork', workstream: 'Operations', category: 'Process & Operations', level: 'Low', status: 'Open', owner: 'M. Khan', dueDate: '2027-03-07', openedOn: '2027-02-15', impactScore: 2.8 }),
  R({ code: 'R-039', type: 'Risk', title: 'Production environment go-live readiness', workstream: 'Technology & Infra', category: 'Technology & Data', level: 'Critical', status: 'On Track', owner: 'R. Mehta', dueDate: '2027-04-20', openedOn: '2027-02-09', likelihood: 'High', impact: 'Very High', impactScore: 8.3, description: 'Production environment build depends on network provisioning and DR readiness; both milestones are currently At Risk / Delayed.', mitigation: 'Stage production build in cloud landing zone; weekly readiness checkpoint with global infrastructure.' }),
  R({ code: 'I-040', type: 'Issue', title: 'Payroll vendor SLA breach for October cycle', workstream: 'Finance & Procurement', category: 'Vendor & Third Party', level: 'High', status: 'In Progress', owner: 'V. Reddy', dueDate: '2027-02-28', openedOn: '2027-02-11', likelihood: 'High', impact: 'High', impactScore: 6.4, description: 'Payroll vendor missed the statutory filing SLA for the October cycle; penalty exposure under review.', mitigation: 'Invoke SLA credits; run parallel in-house statutory check for November cycle.' }),
  // Technology & Infrastructure rows shown on the Workstreams executive summary
  R({ id: 'r-ws-tech-1', code: 'R-WS1', type: 'Risk', title: 'Cybersecurity compliance', shortTitle: 'Cybersecurity compliance', workstream: 'Technology & Infra', category: 'Technology & Data', level: 'High', status: 'Open', owner: 'K. Nair', dueDate: '2027-02-15', openedOn: '2027-01-20', likelihood: 'High', impact: 'High', impactScore: 6.7, description: 'ISO 27001 control evidence for the site is incomplete ahead of the global audit window.', mitigation: 'Assign control owners; weekly evidence review with group security.' }),
  R({ id: 'r-ws-tech-2', code: 'R-WS2', type: 'Risk', title: 'Licensing cost overrun', shortTitle: 'Licensing cost overrun', workstream: 'Technology & Infra', category: 'Vendor & Third Party', level: 'Medium', status: 'Open', owner: 'V. Reddy', dueDate: '2027-03-20', openedOn: '2027-02-06', likelihood: 'Medium', impact: 'Medium', impactScore: 5.2, description: 'Collaboration and security tooling licences priced above the business case assumption.', mitigation: 'Renegotiate enterprise agreement; right-size licence tiers per role.' }),
  R({ id: 'r-ws-tech-3', code: 'R-WS3', type: 'Issue', title: 'Resource shortage (network)', shortTitle: 'Resource shortage (network)', workstream: 'Technology & Infra', category: 'People & Talent', level: 'Low', status: 'In Progress', owner: 'R. Mehta', dueDate: '2027-03-10', openedOn: '2027-02-09', likelihood: 'Low', impact: 'Medium', impactScore: 3.6, description: 'Only two network engineers available for the cut-over window.', mitigation: 'Borrow one engineer from the global network team for four weeks.' }),
  // Closed / resolved history (for trend and aging views)
  R({ code: 'R-035', type: 'Risk', title: 'Entity incorporation delay', workstream: 'Legal & Compliance', category: 'Legal & Compliance', level: 'High', status: 'Closed', owner: 'P. Rao', dueDate: '2026-07-31', openedOn: '2026-05-20', impactScore: 7.0 }),
  R({ code: 'I-036', type: 'Issue', title: 'Bank KYC documentation rejected', workstream: 'Finance & Procurement', category: 'Process & Operations', level: 'Medium', status: 'Resolved', owner: 'V. Reddy', dueDate: '2026-09-15', openedOn: '2026-08-20', impactScore: 5.0 }),
  R({ code: 'R-037', type: 'Risk', title: 'Lease negotiation overrun', workstream: 'Facilities & Infra', category: 'Facilities & Infra', level: 'High', status: 'Closed', owner: 'K. Nair', dueDate: '2026-10-30', openedOn: '2026-08-02', impactScore: 6.8 }),
  R({ code: 'I-038', type: 'Issue', title: 'ATS integration with HRMS failing', workstream: 'Talent & Hiring', category: 'Technology & Data', level: 'Medium', status: 'Resolved', owner: 'S. Iyer', dueDate: '2026-12-20', openedOn: '2026-11-25', impactScore: 5.1 }),
]

export const isOpen = (r: RaidItem) => !['Closed', 'Resolved'].includes(r.status)
export const daysOpen = (r: RaidItem, today = '2027-02-22') => Math.max(0, Math.round((new Date(today).getTime() - new Date(r.openedOn).getTime()) / 86400000))

/* ------------------------------------------------------------------ */
/* Program-level KPIs (headline tiles on the Dashboard)               */
/* ------------------------------------------------------------------ */
export interface ProgramKpis {
  id: 'program'
  programName: string
  lifecyclePhase: 'Design' | 'Build' | 'Transition' | 'Operate' | 'Transform' | 'Transfer'
  timelineStart: string
  timelineEnd: string
  programCompletion: number
  programCompletionDelta: number
  milestoneAdherence: number
  milestoneAdherenceDelta: number
  talentOnboarded: number
  talentTarget: number
  talentDeltaVsPlan: number
  approvedBudgetCr: number
  actualSpendCr: number
  forecastAtCompletionCr: number
  openCriticalIssues: number
  openCriticalIssuesDelta: number
  transitionReadiness: number
  transitionReadinessDelta: number
  goLiveTarget: string
  goLiveVarianceWeeks: number
  targetBenefitsCr: number
  projectedBenefitsCr: number
  readinessPeople: number
  readinessProcess: number
  readinessTechnology: number
  readinessControls: number
}

export const seedProgramKpis: ProgramKpis[] = [{
  id: 'program',
  programName: 'ENGIE IT GCC - Pune',
  lifecyclePhase: 'Build',
  timelineStart: '2026-05-01',
  timelineEnd: '2028-04-30',
  // Reporting date 22 Feb 2027: ramp month 4 of the Nov 2026 – Apr 2027 ramp (plan to date 285 of 400), Wave 1 stabilising, Wave 2 in progress.
  programCompletion: 64, programCompletionDelta: 5,
  milestoneAdherence: 84, milestoneAdherenceDelta: 4,
  talentOnboarded: 268, talentTarget: 400, talentDeltaVsPlan: -6,
  approvedBudgetCr: 4.0, actualSpendCr: 2.6, forecastAtCompletionCr: 3.8,
  openCriticalIssues: 6, openCriticalIssuesDelta: -2,
  transitionReadiness: 74, transitionReadinessDelta: 9,
  goLiveTarget: '2027-04-30', goLiveVarianceWeeks: 2,
  targetBenefitsCr: 12.0, projectedBenefitsCr: 9.4,
  readinessPeople: 72, readinessProcess: 85, readinessTechnology: 62, readinessControls: 90,
}]

/* ------------------------------------------------------------------ */
/* Workstream summary (health bars, owner, budget) - shared by          */
/* Dashboard and Workstreams page                                      */
/* ------------------------------------------------------------------ */
export interface WorkstreamSummary {
  id: string
  name: Workstream
  description: string
  progress: number
  status: Status
  owner: string
  lead: string
  executiveSponsor: string
  teamSize: number
  activeInitiatives: number
  scheduleHealth: Status
  budgetHealth: Status
  approvedBudgetCr: number
  actualSpendCr: number
  forecastAtCompletionCr: number
}

export const seedWorkstreamSummaries: WorkstreamSummary[] = [
  { id: 'ws-talent', name: 'Talent & Hiring', description: 'Build the India workforce through planned hiring waves, onboarding and ramp-up.', progress: 82, status: 'On Track', owner: 'S. Iyer', lead: 'S. Iyer', executiveSponsor: 'Global CHRO', teamSize: 18, activeInitiatives: 11, scheduleHealth: 'On Track', budgetHealth: 'On Track', approvedBudgetCr: 1.2, actualSpendCr: 0.8, forecastAtCompletionCr: 1.1 },
  { id: 'ws-tech', name: 'Technology & Infrastructure', description: 'Enable secure, scalable and resilient infrastructure for GCC operations.', progress: 68, status: 'At Risk', owner: 'R. Mehta', lead: 'R. Mehta', executiveSponsor: 'Global CIO', teamSize: 25, activeInitiatives: 14, scheduleHealth: 'At Risk', budgetHealth: 'On Track', approvedBudgetCr: 1.0, actualSpendCr: 0.6, forecastAtCompletionCr: 0.8 },
  { id: 'ws-legal', name: 'Legal & Compliance', description: 'Establish the legal entity, statutory registrations and regulatory compliance.', progress: 94, status: 'On Track', owner: 'P. Rao', lead: 'P. Rao', executiveSponsor: 'Group General Counsel', teamSize: 6, activeInitiatives: 5, scheduleHealth: 'On Track', budgetHealth: 'On Track', approvedBudgetCr: 0.3, actualSpendCr: 0.2, forecastAtCompletionCr: 0.3 },
  { id: 'ws-facilities', name: 'Facilities & Workplace', description: 'Deliver the office, fit-out and workplace services for the GCC.', progress: 76, status: 'On Track', owner: 'K. Nair', lead: 'K. Nair', executiveSponsor: 'Global Head of Real Estate', teamSize: 9, activeInitiatives: 8, scheduleHealth: 'On Track', budgetHealth: 'On Track', approvedBudgetCr: 0.6, actualSpendCr: 0.4, forecastAtCompletionCr: 0.5 },
  { id: 'ws-transition', name: 'Transition Readiness', description: 'Prepare waves, knowledge transfer and stabilization for work moving to the GCC.', progress: 59, status: 'At Risk', owner: 'A. Sharma', lead: 'A. Sharma', executiveSponsor: 'Global COO', teamSize: 12, activeInitiatives: 9, scheduleHealth: 'At Risk', budgetHealth: 'On Track', approvedBudgetCr: 0.5, actualSpendCr: 0.3, forecastAtCompletionCr: 0.5 },
  { id: 'ws-ops', name: 'Operations Setup', description: 'Stand up day-one operations, vendors, administration and service readiness.', progress: 71, status: 'On Track', owner: 'M. Khan', lead: 'M. Khan', executiveSponsor: 'GCC Head', teamSize: 10, activeInitiatives: 7, scheduleHealth: 'On Track', budgetHealth: 'On Track', approvedBudgetCr: 0.3, actualSpendCr: 0.2, forecastAtCompletionCr: 0.3 },
  { id: 'ws-finance', name: 'Finance & Procurement', description: 'Set up finance operations, banking, tax, procurement and vendor contracts.', progress: 85, status: 'Delayed', owner: 'V. Reddy', lead: 'V. Reddy', executiveSponsor: 'Global CFO', teamSize: 8, activeInitiatives: 8, scheduleHealth: 'Delayed', budgetHealth: 'At Risk', approvedBudgetCr: 0.1, actualSpendCr: 0.1, forecastAtCompletionCr: 0.2 },
]

/* ------------------------------------------------------------------ */
/* Cross-workstream dependencies (Program Planning heatmap,            */
/* Workstreams "Workstream Dependencies", Transition/Risks tabs)       */
/* ------------------------------------------------------------------ */
export interface Dependency {
  id: string
  from: Workstream // the workstream that depends on `on`
  on: Workstream // the workstream being depended upon
  type: string // "Physical Infrastructure", "Regulatory Approvals", "Vendor Contracts", "IT Support Staffing", ...
  description: string
  impact: Impact
  status: Status // On Track / At Risk / Delayed / Completed
  dueDate: string
  owner: string
}

const WS_ALL: Workstream[] = ['Talent & Hiring', 'Technology & Infrastructure', 'Legal & Compliance', 'Facilities & Workplace', 'Transition Readiness', 'Operations Setup', 'Finance & Procurement']
const DEP_TYPES: Record<Workstream, string[]> = {
  'Talent & Hiring': ['Hiring Wave Joiners', 'IT Support Staffing', 'Role Approvals'],
  'Technology & Infrastructure': ['Network Readiness', 'Device Provisioning', 'System Access'],
  'Legal & Compliance': ['Regulatory Approvals', 'Entity Registration', 'Policy Sign-off'],
  'Facilities & Workplace': ['Physical Infrastructure', 'Seat Availability', 'Occupancy Clearance'],
  'Transition Readiness': ['Knowledge Transfer', 'Wave Go/No-Go', 'Process Documentation'],
  'Operations Setup': ['Vendor Onboarding', 'Service Readiness', 'Support Model'],
  'Finance & Procurement': ['Vendor Contracts', 'Budget Release', 'Purchase Orders'],
}
const DEP_OWNER: Record<Workstream, string> = { 'Talent & Hiring': 'S. Iyer', 'Technology & Infrastructure': 'R. Mehta', 'Legal & Compliance': 'P. Rao', 'Facilities & Workplace': 'K. Nair', 'Transition Readiness': 'A. Sharma', 'Operations Setup': 'M. Khan', 'Finance & Procurement': 'V. Reddy' }

function buildDependencies(): Dependency[] {
  const explicit: Dependency[] = [
    { id: 'dep-001', from: 'Technology & Infrastructure', on: 'Facilities & Workplace', type: 'Physical Infrastructure', description: 'Server room, cabling and power must be ready before network installation.', impact: 'High', status: 'At Risk', dueDate: '2027-02-28', owner: 'K. Nair' },
    { id: 'dep-002', from: 'Technology & Infrastructure', on: 'Legal & Compliance', type: 'Regulatory Approvals', description: 'Data residency and telecom approvals required before production go-live.', impact: 'High', status: 'On Track', dueDate: '2027-03-18', owner: 'P. Rao' },
    { id: 'dep-003', from: 'Technology & Infrastructure', on: 'Finance & Procurement', type: 'Vendor Contracts', description: 'ISP and hardware vendor contracts must be executed before orders release.', impact: 'Medium', status: 'On Track', dueDate: '2027-02-28', owner: 'V. Reddy' },
    { id: 'dep-004', from: 'Technology & Infrastructure', on: 'Talent & Hiring', type: 'IT Support Staffing', description: 'Local IT support engineers required for Wave 2 device rollout.', impact: 'Medium', status: 'On Track', dueDate: '2027-03-05', owner: 'S. Iyer' },
    { id: 'dep-005', from: 'Talent & Hiring', on: 'Technology & Infrastructure', type: 'Device Provisioning', description: 'Laptops and accounts must be ready for each joining cohort.', impact: 'Critical', status: 'At Risk', dueDate: '2027-02-28', owner: 'R. Mehta' },
    { id: 'dep-006', from: 'Talent & Hiring', on: 'Facilities & Workplace', type: 'Seat Availability', description: 'Seats for Wave 2 joiners depend on fit-out completion.', impact: 'Critical', status: 'At Risk', dueDate: '2027-03-10', owner: 'K. Nair' },
    { id: 'dep-007', from: 'Transition Readiness', on: 'Technology & Infrastructure', type: 'System Access', description: 'Global system access for receiving teams before knowledge transfer.', impact: 'Critical', status: 'Delayed', dueDate: '2027-02-22', owner: 'R. Mehta' },
    { id: 'dep-008', from: 'Transition Readiness', on: 'Talent & Hiring', type: 'Hiring Wave Joiners', description: 'Wave 3 receiving team must be onboarded before KT sessions.', impact: 'Critical', status: 'At Risk', dueDate: '2027-03-01', owner: 'S. Iyer' },
    { id: 'dep-009', from: 'Operations Setup', on: 'Finance & Procurement', type: 'Vendor Contracts', description: 'Facility management and cafeteria vendor contracts.', impact: 'High', status: 'Delayed', dueDate: '2027-02-25', owner: 'V. Reddy' },
    { id: 'dep-010', from: 'Finance & Procurement', on: 'Legal & Compliance', type: 'Entity Registration', description: 'GST and PAN required before vendor invoicing.', impact: 'High', status: 'Completed', dueDate: '2026-10-30', owner: 'P. Rao' },
    { id: 'dep-011', from: 'Facilities & Workplace', on: 'Legal & Compliance', type: 'Occupancy Clearance', description: 'Fire and occupancy clearances before handover.', impact: 'Critical', status: 'On Track', dueDate: '2027-03-08', owner: 'P. Rao' },
    { id: 'dep-012', from: 'Transition Readiness', on: 'Operations Setup', type: 'Service Readiness', description: 'Support model and SOPs ready before Wave 2 go-live.', impact: 'Critical', status: 'At Risk', dueDate: '2027-02-28', owner: 'M. Khan' },
  ]
  // Fill deterministically to reach 58 in total (6 Critical, 12 High, 18 Medium, 22 Low)
  const targets: Impact[] = [...Array(8).fill('High'), ...Array(16).fill('Medium'), ...Array(22).fill('Low')]
  const statuses: Status[] = ['On Track', 'On Track', 'On Track', 'At Risk', 'On Track', 'Completed', 'On Track', 'Delayed']
  const generated: Dependency[] = []
  let n = 13, t = 0
  for (let round = 0; round < 3 && t < targets.length; round++) {
    for (let i = 0; i < WS_ALL.length && t < targets.length; i++) {
      for (let j = 0; j < WS_ALL.length && t < targets.length; j++) {
        if (i === j) continue
        const from = WS_ALL[i], on = WS_ALL[j]
        const existing = explicit.filter((d) => d.from === from && d.on === on).length + generated.filter((d) => d.from === from && d.on === on).length
        if (round === 0 && existing >= 1) continue
        if (round === 1 && (i + j) % 2 === 1) continue
        const type = DEP_TYPES[on][(i + j + existing) % 3]
        const month = 10 + ((i * 3 + j + round) % 4)
        generated.push({
          id: `dep-${String(n).padStart(3, '0')}`, from, on, type,
          description: `${from} requires ${type.toLowerCase()} from ${on}.`,
          impact: targets[t], status: statuses[(i * 7 + j + round) % statuses.length],
          dueDate: `2026-${String(Math.min(month, 12)).padStart(2, '0')}-${String(5 + ((i * 5 + j * 3 + round) % 23)).padStart(2, '0')}`,
          owner: DEP_OWNER[on],
        })
        n++; t++
      }
    }
  }
  return [...explicit, ...generated]
}
export const seedDependencies: Dependency[] = buildDependencies()
