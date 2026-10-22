/**
 * Workstreams page – types, seeds and helpers for the page-owned collections:
 *   'initiatives'   : Initiative[]   (62 rows – 11/14/5/8/9/7/8 per workstream, matching activeInitiatives)
 *   'teamMembers'   : TeamMember[]   (88 rows – one per seat in WorkstreamSummary.teamSize)
 *   'wsBudgetLines' : WsBudgetLine[] (planned vs actual by category per workstream)
 *   'wsDocuments'   : WsDocument[]
 *   'wsSettings'    : [WsSettings]   (overall progress KPI + Plan/Actual trend – not derivable from the rows)
 * Extra RAID rows for the Technology & Infrastructure executive summary are merged into the shared 'raid'
 * collection on first load (guarded by id).
 */
import type { Workstream, Status } from './common'
import { WORKSTREAMS, LOCATIONS } from './common'
import type { RaidItem } from './shared'

/* ------------------------------------------------------------------ */
/* Settings (single record)                                            */
/* ------------------------------------------------------------------ */
export interface WsSettings {
  id: 'ws-settings'
  overallProgress: number
  overallProgressDelta: number
  trendPlan: number[]
  trendActual: number[]
}
export const seedWsSettings: WsSettings[] = [{
  id: 'ws-settings',
  overallProgress: 78,
  overallProgressDelta: 6,
  trendPlan: [10, 18, 26, 34, 42, 50, 57, 64, 71, 80, 88, 95],
  trendActual: [8, 15, 22, 30, 37, 45, 53, 61, 70, 78, 85, 92],
}]

/** Designated "Key Milestone" per workstream (milestone id in the shared 'milestones' collection). */
export const KEY_MILESTONE: Record<Workstream, string> = {
  'Talent & Hiring': 'ms-002',
  'Technology & Infrastructure': 'ms-008',
  'Legal & Compliance': 'ms-009',
  'Facilities & Workplace': 'ms-006',
  'Transition Readiness': 'ms-010',
  'Operations Setup': 'ms-011',
  'Finance & Procurement': 'ms-012',
}

/* ------------------------------------------------------------------ */
/* Initiatives                                                         */
/* ------------------------------------------------------------------ */
export type InitiativeStatus = Extract<Status, 'On Track' | 'At Risk' | 'Delayed' | 'In Progress' | 'Not Started' | 'Completed'>
export const INITIATIVE_STATUSES: InitiativeStatus[] = ['On Track', 'At Risk', 'Delayed', 'In Progress', 'Not Started', 'Completed']

export interface Initiative {
  id: string
  name: string
  workstream: Workstream
  owner: string
  status: InitiativeStatus
  start: string
  end: string
  progress: number
  milestoneId?: string // linked milestone (shared 'milestones' collection)
  description?: string
}

type InitSeed = [name: string, owner: string, status: InitiativeStatus, start: string, end: string, progress: number, milestoneId?: string]
const INIT: Record<Workstream, InitSeed[]> = {
  'Talent & Hiring': [
    ['Wave 1 leadership hiring', 'S. Iyer', 'On Track', '2026-07-01', '2027-02-28', 90, 'ms-027'],
    ['Wave 2 lateral hiring', 'S. Iyer', 'At Risk', '2026-10-01', '2027-02-28', 72, 'ms-002'],
    ['Campus hiring programme 2026', 'S. Iyer', 'On Track', '2026-11-01', '2027-04-30', 55, 'ms-028'],
    ['Employer branding & careers site', 'D. Singh', 'On Track', '2026-08-01', '2027-03-15', 80],
    ['Onboarding & induction programme', 'S. Iyer', 'In Progress', '2026-12-01', '2027-04-30', 60, 'ms-028'],
    ['Compensation & benefits benchmarking', 'S. Iyer', 'On Track', '2026-06-01', '2027-02-28', 95],
    ['HRMS implementation', 'R. Mehta', 'At Risk', '2026-09-01', '2027-03-30', 65],
    ['Role architecture & job levelling', 'S. Iyer', 'On Track', '2026-05-15', '2027-02-28', 98, 'ms-022'],
    ['Background verification process', 'P. Rao', 'On Track', '2026-10-01', '2027-03-10', 70],
    ['Learning & development curriculum', 'D. Singh', 'Not Started', '2027-03-01', '2027-06-28', 0],
    ['Retention & engagement plan', 'S. Iyer', 'In Progress', '2027-01-01', '2027-05-31', 30],
  ],
  'Technology & Infrastructure': [
    ['Data center & server room setup', 'R. Mehta', 'On Track', '2026-08-01', '2027-02-25', 96, 'ms-013'],
    ['Network provisioning (primary & backup ISP)', 'R. Mehta', 'At Risk', '2026-10-01', '2027-02-23', 62, 'ms-008'],
    ['Laptop & endpoint rollout', 'R. Mehta', 'On Track', '2026-12-01', '2027-03-05', 70, 'ms-014'],
    ['Identity & access management', 'K. Nair', 'On Track', '2026-11-01', '2027-03-18', 68, 'ms-015'],
    ['Security operations & SIEM onboarding', 'K. Nair', 'In Progress', '2026-12-15', '2027-03-30', 45, 'ms-030'],
    ['Collaboration tools rollout', 'R. Mehta', 'On Track', '2027-01-01', '2027-03-30', 50, 'ms-016'],
    ['Disaster recovery readiness', 'R. Mehta', 'Delayed', '2027-01-01', '2027-04-10', 25, 'ms-017'],
    ['Production environment build', 'R. Mehta', 'Not Started', '2027-03-01', '2027-04-20', 0, 'ms-018'],
    ['IT service desk setup', 'M. Khan', 'On Track', '2026-12-01', '2027-03-15', 58],
    ['Software licensing & asset management', 'V. Reddy', 'At Risk', '2026-11-01', '2027-03-20', 55],
    ['Cloud landing zone', 'R. Mehta', 'On Track', '2026-09-01', '2027-02-28', 88, 'ms-001'],
    ['Network security & firewalls', 'K. Nair', 'In Progress', '2026-12-01', '2027-03-25', 48],
    ['Video conferencing & AV', 'R. Mehta', 'On Track', '2027-01-15', '2027-04-05', 35],
    ['Cybersecurity compliance (ISO 27001)', 'K. Nair', 'At Risk', '2026-10-01', '2027-04-15', 40],
  ],
  'Legal & Compliance': [
    ['Entity incorporation & registrations (closure)', 'P. Rao', 'On Track', '2026-05-10', '2027-03-30', 98, 'ms-023'],
    ['Regulatory approvals (SEZ / STPI)', 'P. Rao', 'On Track', '2026-10-01', '2027-03-18', 85, 'ms-009'],
    ['Statutory compliance calendar', 'P. Rao', 'On Track', '2026-09-01', '2027-03-30', 90],
    ['Contract templates & employment policies', 'P. Rao', 'In Progress', '2026-11-01', '2027-03-15', 75],
    ['Insurance programme activation', 'P. Rao', 'Delayed', '2026-12-01', '2027-02-28', 60, 'ms-041'],
  ],
  'Facilities & Workplace': [
    ['Office lease & handover', 'K. Nair', 'On Track', '2026-07-01', '2027-03-10', 92, 'ms-004'],
    ['Office fit-out (floors 3–5)', 'K. Nair', 'On Track', '2026-10-01', '2027-03-30', 74, 'ms-006'],
    ['Workplace design & seating plan', 'K. Nair', 'On Track', '2026-09-01', '2027-02-28', 95],
    ['Facility management contract', 'M. Khan', 'Delayed', '2026-12-01', '2027-03-20', 45, 'ms-034'],
    ['Physical security & access control', 'K. Nair', 'In Progress', '2027-01-01', '2027-03-25', 55],
    ['Cafeteria & pantry setup', 'M. Khan', 'At Risk', '2027-01-15', '2027-03-25', 40, 'ms-040'],
    ['Transport & parking', 'M. Khan', 'Not Started', '2027-03-01', '2027-04-15', 0],
    ['Occupancy & fire clearances', 'P. Rao', 'On Track', '2027-01-01', '2027-03-08', 65],
  ],
  'Transition Readiness': [
    ['Wave 1 transition (Infrastructure & Cloud, Cybersecurity & IAM)', 'A. Sharma', 'At Risk', '2026-11-01', '2027-04-04', 58, 'ms-010'],
    ['Wave 2 transition (Enterprise Applications, Data, Analytics & AI)', 'A. Sharma', 'On Track', '2026-12-15', '2027-02-12', 85, 'ms-038'],
    ['Wave 3 transition (Digital Workplace, IT Service Management)', 'A. Sharma', 'At Risk', '2027-01-15', '2027-02-28', 40, 'ms-039'],
    ['Knowledge transfer framework', 'A. Sharma', 'On Track', '2026-08-01', '2027-01-25', 90, 'ms-035'],
    ['Process documentation & SOPs', 'D. Singh', 'In Progress', '2026-11-01', '2027-03-30', 52],
    ['Shadow / reverse-shadow planning', 'A. Sharma', 'On Track', '2026-12-01', '2027-03-15', 60],
    ['Go/No-Go criteria & readiness scorecard', 'A. Sharma', 'On Track', '2026-10-01', '2027-03-04', 78, 'ms-003'],
    ['Stabilization & hypercare model', 'M. Khan', 'Not Started', '2027-03-15', '2027-05-31', 0],
    ['Global stakeholder alignment', 'A. Sharma', 'In Progress', '2026-09-01', '2027-04-30', 65],
  ],
  'Operations Setup': [
    ['Day-one operations playbook', 'M. Khan', 'On Track', '2026-11-01', '2027-04-15', 70, 'ms-011'],
    ['Vendor onboarding (FM, cafeteria, transport)', 'M. Khan', 'Delayed', '2026-12-01', '2027-03-25', 48, 'ms-040'],
    ['Service readiness checklist', 'M. Khan', 'On Track', '2027-01-01', '2027-04-15', 55, 'ms-011'],
    ['Admin & travel desk', 'D. Singh', 'In Progress', '2027-01-01', '2027-03-30', 60],
    ['Business continuity plan', 'M. Khan', 'At Risk', '2027-01-15', '2027-04-10', 35],
    ['Internal communications & change network', 'A. Sharma', 'On Track', '2026-08-01', '2027-04-30', 80],
    ['Employee helpdesk & ticketing', 'D. Singh', 'Not Started', '2027-03-01', '2027-04-20', 0],
  ],
  'Finance & Procurement': [
    ['Bank accounts & treasury setup', 'V. Reddy', 'On Track', '2026-06-01', '2027-03-30', 97, 'ms-033'],
    ['ERP entity configuration', 'V. Reddy', 'On Track', '2026-08-01', '2026-12-31', 100, 'ms-032'],
    ['Payroll setup & statutory', 'V. Reddy', 'On Track', '2026-09-01', '2027-01-15', 98, 'ms-031'],
    ['Vendor contracts (ISP, hardware, FM)', 'V. Reddy', 'Delayed', '2026-11-01', '2027-02-28', 70, 'ms-012'],
    ['Procurement policy & PO process', 'V. Reddy', 'On Track', '2026-10-01', '2027-03-15', 85],
    ['Transfer pricing & tax advisory', 'P. Rao', 'In Progress', '2026-12-01', '2027-04-01', 55],
    ['Program budget tracking & reporting', 'V. Reddy', 'On Track', '2026-07-01', '2027-07-31', 75],
    ['Vendor master & invoicing', 'V. Reddy', 'At Risk', '2027-01-01', '2027-03-30', 45],
  ],
}
export const seedInitiatives: Initiative[] = WORKSTREAMS.flatMap((ws, wi) =>
  INIT[ws].map(([name, owner, status, start, end, progress, milestoneId], i) => ({
    id: `init-${wi + 1}-${String(i + 1).padStart(2, '0')}`, name, workstream: ws, owner, status, start, end, progress, milestoneId,
  })),
)

/* ------------------------------------------------------------------ */
/* Team members                                                        */
/* ------------------------------------------------------------------ */
export type MemberType = 'Internal' | 'Contractor' | 'Vendor'
export const MEMBER_TYPES: MemberType[] = ['Internal', 'Contractor', 'Vendor']
export interface TeamMember {
  id: string
  name: string
  role: string
  workstream: Workstream
  location: string
  allocation: number // %
  startDate: string
  type: MemberType
  /** Function / discipline the person belongs to (groups the roster) */
  functionArea: string
  /** What they are doing on this workstream */
  responsibilities: string
  /** Name of the person they report to within the workstream */
  reportsTo?: string
  /** Workstream lead */
  isLead?: boolean
}

/** Full names behind the short owner labels used across the demo. */
export const OWNER_FULL_NAME: Record<string, string> = { 'A. Sharma': 'Anita Sharma', 'R. Mehta': 'Rohit Mehta', 'S. Iyer': 'Sanjana Iyer', 'P. Rao': 'Priya Rao', 'K. Nair': 'Kiran Nair', 'M. Khan': 'Mohammed Khan', 'V. Reddy': 'Vikram Reddy', 'D. Singh': 'Deepak Singh' }
export const shortName = (full: string) => { const p = full.trim().split(/\s+/); return p.length > 1 ? `${p[0][0]}. ${p[p.length - 1]}` : full }

/** Role -> function area and typical responsibilities (used for the seed and as defaults in the form). */
export const ROLE_PROFILE: Record<string, { fn: string; duties: string }> = {
  'Talent Lead': { fn: 'Talent Acquisition', duties: 'Owns the hiring plan and waves; runs weekly hiring forecast; escalates critical gaps to the steering committee' },
  Recruiter: { fn: 'Talent Acquisition', duties: 'Sources, screens and schedules candidates for assigned requisitions; tracks offers and joining dates' },
  'Sourcing Specialist': { fn: 'Talent Acquisition', duties: 'Builds candidate pipelines for niche skills; manages agency partners and job boards' },
  'HR Business Partner': { fn: 'HR & Policy', duties: 'Organization design, grades and role architecture; approves new positions with global HR' },
  'Onboarding Coordinator': { fn: 'Onboarding', duties: 'Pre-joining documents, day-one schedule, device and access requests for each cohort' },
  'Campus Hiring Manager': { fn: 'Talent Acquisition', duties: 'Campus programme, assessment events and offer conversion for graduate hires' },
  'Compensation Analyst': { fn: 'HR & Policy', duties: 'Salary benchmarking, pay ranges and offer approvals; benefits budget tracking' },
  'HRMS Analyst': { fn: 'HR Systems & Payroll', duties: 'HRMS configuration, employee master data and payroll parallel testing' },
  'L&D Specialist': { fn: 'Onboarding', duties: 'Induction curriculum and learning paths for new joiners' },
  'IT Lead': { fn: 'IT Leadership', duties: 'Owns the India IT scope, budget and delivery schedule aligned to joining cohorts; interface to global CIO office' },
  'Network Engineer': { fn: 'Network & Connectivity', duties: 'Primary and backup connectivity, LAN and Wi-Fi configuration, secure links to global systems' },
  'Systems Engineer': { fn: 'Infrastructure', duties: 'Server room build, identity and directory services, monitoring' },
  'Cloud Engineer': { fn: 'Infrastructure', duties: 'Cloud landing zone, environments and infrastructure as code' },
  'Security Engineer': { fn: 'Cybersecurity', duties: 'Role-based access, multifactor authentication and endpoint compliance controls' },
  'Security Analyst': { fn: 'Cybersecurity', duties: 'Risk assessment, ISO 27001 control evidence and security validation testing' },
  'Endpoint Engineer': { fn: 'End-user Technology', duties: 'Laptop image, device management and allocation to joining cohorts' },
  'Service Desk Analyst': { fn: 'End-user Technology', duties: 'Day-one support, access issues and the IT asset register' },
  'Collaboration Engineer': { fn: 'End-user Technology', duties: 'Email, collaboration and meeting-room technology setup' },
  'IT Project Manager': { fn: 'IT Leadership', duties: 'Tracks IT deliverables, vendor lead times and cut-over readiness' },
  'DR Specialist': { fn: 'Infrastructure', duties: 'Backup and disaster-recovery design and readiness tests' },
  'Legal Lead': { fn: 'Legal', duties: 'Entity structure, incorporation and intercompany agreements; legal sign-off on contracts and policies' },
  'Corporate Counsel': { fn: 'Legal', duties: 'Drafts and negotiates leases, vendor and employment agreements' },
  'Compliance Manager': { fn: 'Compliance', duties: 'Registration and filing calendar, compliance ownership matrix and readiness reviews' },
  'Company Secretary': { fn: 'Legal', duties: 'Board resolutions, statutory registers and ROC filings' },
  'Regulatory Analyst': { fn: 'Compliance', duties: 'Tracks central, state and municipal obligations and authority clarifications' },
  Paralegal: { fn: 'Legal', duties: 'Documentation, KYC packs and contract repository upkeep' },
  'Facilities Lead': { fn: 'Facilities Leadership', duties: 'Owns office selection, lease, fit-out and handover; facilities budget and vendors' },
  'Fit-out Project Manager': { fn: 'Fit-out & Design', duties: 'Contractor schedule, site inspections, punch-list closure and occupancy clearances' },
  'Workplace Designer': { fn: 'Fit-out & Design', duties: 'Layout, seating plan and collaboration-space design' },
  'Facility Manager': { fn: 'Facilities Operations', duties: 'Housekeeping, maintenance, utilities and helpdesk once the site is live' },
  'Security Supervisor': { fn: 'Facilities Operations', duties: 'Access control, visitor management and security vendor coordination' },
  'Admin Executive': { fn: 'Facilities Operations', duties: 'Cafeteria, transport and office supplies arrangements' },
  'EHS Officer': { fn: 'Facilities Operations', duties: 'Fire safety, evacuation procedures and workplace safety compliance' },
  'Transition Lead': { fn: 'Transition Leadership', duties: 'Owns transition waves, go/no-go reviews and stabilization; coordinates global process owners' },
  'Transition Manager': { fn: 'Transition Delivery', duties: 'Runs a wave end to end: plans, readiness checks and cut-over' },
  'KT Coordinator': { fn: 'Knowledge Transfer', duties: 'Schedules knowledge-transfer sessions, tracks attendance and completion sign-offs' },
  'Process Analyst': { fn: 'Knowledge Transfer', duties: 'Documents processes, identifies knowledge gaps and remediation actions' },
  'Change Manager': { fn: 'Change & Communications', duties: 'Stakeholder engagement, change readiness and resistance management' },
  'SOP Writer': { fn: 'Knowledge Transfer', duties: 'Standard operating procedures for transitioned processes' },
  'Readiness Analyst': { fn: 'Transition Delivery', duties: 'Readiness assessments by dimension and gap register upkeep' },
  'Operations Lead': { fn: 'Operations Leadership', duties: 'Day-one operations, vendor management and the operating organization' },
  'Operations Manager': { fn: 'Workplace Operations', duties: 'Operational ramp-up plan, cohort readiness and support constraints' },
  'Vendor Manager': { fn: 'Vendor Management', duties: 'Vendor onboarding, service delivery reviews and invoice validation' },
  'Admin Manager': { fn: 'Workplace Operations', duties: 'Office administration, consumables and asset inventory' },
  'BCP Coordinator': { fn: 'Workplace Operations', duties: 'Business continuity plan and incident management' },
  'Communications Manager': { fn: 'Change & Communications', duties: 'Program communications plan, launch communications and FAQs' },
  'Helpdesk Lead': { fn: 'Workplace Operations', duties: 'Employee support channels and escalation handling' },
  'Finance Lead': { fn: 'Finance Leadership', duties: 'Owns the finance operating model, banking, budget baseline and executive financial reporting' },
  'Finance Controller': { fn: 'Accounting & Control', duties: 'Chart of accounts, month-end close and consolidation with global finance' },
  'Procurement Manager': { fn: 'Procurement', duties: 'RFPs, vendor selection, purchase orders and contract execution' },
  'Payroll Specialist': { fn: 'Accounting & Control', duties: 'Payroll calendar, statutory deductions and parallel runs' },
  'Treasury Analyst': { fn: 'Treasury & Tax', duties: 'Bank accounts, funding schedule and cash forecasting' },
  'Tax Analyst': { fn: 'Treasury & Tax', duties: 'GST, withholding tax and transfer-pricing documentation' },
  'Accounts Payable Analyst': { fn: 'Accounting & Control', duties: 'Invoice matching to purchase orders and payment tracking' },
}
export const FUNCTION_AREAS = Array.from(new Set(Object.values(ROLE_PROFILE).map((r) => r.fn)))

const FIRST = ['Ananya', 'Rahul', 'Priya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rohan', 'Meera', 'Aditya', 'Divya', 'Karthik', 'Pooja', 'Nikhil', 'Shreya', 'Varun', 'Neha', 'Siddharth', 'Riya', 'Manish', 'Aishwarya', 'Gaurav', 'Lakshmi', 'Harish', 'Nandini', 'Suresh', 'Deepika', 'Akash', 'Ritu', 'Sanjay', 'Tanvi', 'Abhishek', 'Isha', 'Pranav', 'Swati', 'Rajesh', 'Bhavana', 'Mohit', 'Anjali', 'Vivek']
const LAST = ['Krishnan', 'Verma', 'Nambiar', 'Desai', 'Pillai', 'Kulkarni', 'Bose', 'Menon', 'Chawla', 'Reddy', 'Joshi', 'Iyer', 'Bhat', 'Saxena', 'Gupta', 'Rao', 'Mishra', 'Nair', 'Shetty', 'Agarwal', 'Das', 'Patel', 'Chandran', 'Banerjee', 'Hegde', 'Mehta', 'Sinha', 'Varma', 'Ghosh', 'Raman']
const ROLES: Record<Workstream, string[]> = {
  'Talent & Hiring': ['Talent Lead', 'Recruiter', 'Recruiter', 'Sourcing Specialist', 'HR Business Partner', 'Onboarding Coordinator', 'Campus Hiring Manager', 'Compensation Analyst', 'HRMS Analyst', 'L&D Specialist'],
  'Technology & Infrastructure': ['IT Lead', 'Network Engineer', 'Network Engineer', 'Systems Engineer', 'Cloud Engineer', 'Security Engineer', 'Security Analyst', 'Endpoint Engineer', 'Service Desk Analyst', 'Collaboration Engineer', 'IT Project Manager', 'DR Specialist'],
  'Legal & Compliance': ['Legal Lead', 'Corporate Counsel', 'Compliance Manager', 'Company Secretary', 'Regulatory Analyst', 'Paralegal'],
  'Facilities & Workplace': ['Facilities Lead', 'Fit-out Project Manager', 'Workplace Designer', 'Facility Manager', 'Security Supervisor', 'Admin Executive', 'EHS Officer'],
  'Transition Readiness': ['Transition Lead', 'Transition Manager', 'KT Coordinator', 'Process Analyst', 'Change Manager', 'SOP Writer', 'Readiness Analyst'],
  'Operations Setup': ['Operations Lead', 'Operations Manager', 'Vendor Manager', 'Admin Manager', 'BCP Coordinator', 'Communications Manager', 'Helpdesk Lead'],
  'Finance & Procurement': ['Finance Lead', 'Finance Controller', 'Procurement Manager', 'Payroll Specialist', 'Treasury Analyst', 'Tax Analyst', 'Accounts Payable Analyst'],
}
const TEAM_SIZE: Record<Workstream, number> = { 'Talent & Hiring': 18, 'Technology & Infrastructure': 25, 'Legal & Compliance': 6, 'Facilities & Workplace': 9, 'Transition Readiness': 12, 'Operations Setup': 10, 'Finance & Procurement': 8 }

const WS_LEAD: Record<Workstream, string> = { 'Talent & Hiring': 'S. Iyer', 'Technology & Infrastructure': 'R. Mehta', 'Legal & Compliance': 'P. Rao', 'Facilities & Workplace': 'K. Nair', 'Transition Readiness': 'A. Sharma', 'Operations Setup': 'M. Khan', 'Finance & Procurement': 'V. Reddy' }

function buildTeam(): TeamMember[] {
  const out: TeamMember[] = []
  const used = new Set<string>(Object.values(OWNER_FULL_NAME))
  let n = 0
  WORKSTREAMS.forEach((ws, wi) => {
    const roles = ROLES[ws]
    const leadName = OWNER_FULL_NAME[WS_LEAD[ws]]
    for (let i = 0; i < TEAM_SIZE[ws]; i++) {
      let name = ''
      if (i === 0) name = leadName
      else for (let k = 0; ; k++) {
        name = `${FIRST[(n * 7 + k) % FIRST.length]} ${LAST[(n * 11 + k * 3) % LAST.length]}`
        if (!used.has(name)) break
      }
      used.add(name)
      // first entry is the lead role; extra members cycle through the non-lead roles so no role dominates
      const role = i < roles.length ? roles[i] : roles[1 + ((i - roles.length) % (roles.length - 1))]
      const profile = ROLE_PROFILE[role] ?? { fn: 'General', duties: '' }
      const month = 1 + ((wi * 2 + i) % 10)
      out.push({
        id: `tm-${wi + 1}-${String(i + 1).padStart(2, '0')}`,
        name,
        role,
        workstream: ws,
        functionArea: profile.fn,
        responsibilities: profile.duties,
        reportsTo: i === 0 ? undefined : leadName,
        isLead: i === 0,
        location: i % 5 === 4 ? LOCATIONS[1] : i % 7 === 3 ? LOCATIONS[2] : LOCATIONS[0],
        allocation: i === 0 ? 100 : [100, 100, 80, 50, 100, 60, 100][(i + wi) % 7],
        startDate: `2026-${String(month).padStart(2, '0')}-${String(1 + ((i * 5 + wi) % 27)).padStart(2, '0')}`,
        type: i > 0 && (i + wi) % 6 === 5 ? 'Contractor' : i > 0 && (i + wi) % 9 === 8 ? 'Vendor' : 'Internal',
      })
      n++
    }
  })
  return out
}
export const seedTeamMembers: TeamMember[] = buildTeam()

/* ------------------------------------------------------------------ */
/* Budget lines                                                        */
/* ------------------------------------------------------------------ */
export interface WsBudgetLine {
  id: string
  workstream: Workstream
  category: string
  plannedCr: number
  actualCr: number
}
const BUDGET: Record<Workstream, [string, number, number][]> = {
  'Technology & Infrastructure': [['Infrastructure', 1.8, 1.1], ['Software & Tools', 0.9, 0.6], ['Security', 0.7, 0.5], ['Other', 0.6, 0.4]],
  'Talent & Hiring': [['Recruitment Fees', 0.5, 0.35], ['Onboarding & Training', 0.3, 0.2], ['HR Systems', 0.25, 0.15], ['Other', 0.15, 0.1]],
  'Legal & Compliance': [['Legal Advisory', 0.15, 0.1], ['Registrations & Filings', 0.1, 0.07], ['Insurance', 0.05, 0.03]],
  'Facilities & Workplace': [['Fit-out', 0.35, 0.25], ['Furniture & Equipment', 0.15, 0.1], ['FM Services', 0.1, 0.05]],
  'Transition Readiness': [['Travel & KT', 0.25, 0.15], ['Documentation & Tools', 0.1, 0.06], ['Hypercare', 0.15, 0.09]],
  'Operations Setup': [['Vendor Services', 0.15, 0.1], ['Admin & Travel', 0.1, 0.07], ['Other', 0.05, 0.03]],
  'Finance & Procurement': [['ERP & Payroll', 0.06, 0.06], ['Advisory', 0.04, 0.04]],
}
export const seedWsBudgetLines: WsBudgetLine[] = WORKSTREAMS.flatMap((ws, wi) =>
  BUDGET[ws].map(([category, plannedCr, actualCr], i) => ({ id: `bl-${wi + 1}-${i + 1}`, workstream: ws, category, plannedCr, actualCr })),
)

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */
export const DOC_TYPES = ['Plan', 'Charter', 'Design', 'Report', 'Contract', 'Checklist', 'Register', 'Policy', 'Playbook'] as const
export const DOC_STATUSES = ['Draft', 'In Review', 'Approved', 'Published'] as const
export interface WsDocument {
  id: string
  title: string
  type: (typeof DOC_TYPES)[number]
  workstream: Workstream
  owner: string
  version: string
  updated: string
  status: (typeof DOC_STATUSES)[number]
}
const DOCS: [string, WsDocument['type'], Workstream, string, string, string, WsDocument['status']][] = [
  ['Talent & Hiring workstream charter', 'Charter', 'Talent & Hiring', 'S. Iyer', '1.2', '2027-01-12', 'Approved'],
  ['Wave 2 hiring plan', 'Plan', 'Talent & Hiring', 'S. Iyer', '2.4', '2027-02-15', 'Published'],
  ['Onboarding playbook', 'Playbook', 'Talent & Hiring', 'D. Singh', '0.9', '2027-02-18', 'In Review'],
  ['Technology & Infrastructure workstream charter', 'Charter', 'Technology & Infrastructure', 'R. Mehta', '1.0', '2026-12-30', 'Approved'],
  ['Network architecture design', 'Design', 'Technology & Infrastructure', 'R. Mehta', '3.1', '2027-02-16', 'Approved'],
  ['Endpoint rollout plan', 'Plan', 'Technology & Infrastructure', 'R. Mehta', '1.5', '2027-02-12', 'Published'],
  ['Cybersecurity compliance checklist', 'Checklist', 'Technology & Infrastructure', 'K. Nair', '0.7', '2027-02-19', 'Draft'],
  ['DR readiness assessment report', 'Report', 'Technology & Infrastructure', 'R. Mehta', '0.3', '2027-02-17', 'Draft'],
  ['Legal & Compliance workstream charter', 'Charter', 'Legal & Compliance', 'P. Rao', '1.0', '2026-11-20', 'Approved'],
  ['Statutory compliance register', 'Register', 'Legal & Compliance', 'P. Rao', '4.2', '2027-02-14', 'Published'],
  ['Employment policies pack', 'Policy', 'Legal & Compliance', 'P. Rao', '1.8', '2027-02-09', 'In Review'],
  ['Facilities & Workplace workstream charter', 'Charter', 'Facilities & Workplace', 'K. Nair', '1.1', '2026-12-05', 'Approved'],
  ['Office fit-out design pack', 'Design', 'Facilities & Workplace', 'K. Nair', '2.0', '2027-02-08', 'Approved'],
  ['Facility management contract', 'Contract', 'Facilities & Workplace', 'M. Khan', '0.6', '2027-02-18', 'In Review'],
  ['Transition Readiness workstream charter', 'Charter', 'Transition Readiness', 'A. Sharma', '1.3', '2026-12-22', 'Approved'],
  ['Wave 1 transition plan', 'Plan', 'Transition Readiness', 'A. Sharma', '2.2', '2027-02-13', 'Published'],
  ['Go/No-Go readiness checklist', 'Checklist', 'Transition Readiness', 'A. Sharma', '1.4', '2027-02-19', 'In Review'],
  ['Knowledge transfer status report', 'Report', 'Transition Readiness', 'D. Singh', '6.0', '2027-02-16', 'Published'],
  ['Operations Setup workstream charter', 'Charter', 'Operations Setup', 'M. Khan', '1.0', '2026-12-10', 'Approved'],
  ['Day-one operations playbook', 'Playbook', 'Operations Setup', 'M. Khan', '0.8', '2027-02-17', 'Draft'],
  ['Vendor register', 'Register', 'Operations Setup', 'M. Khan', '3.3', '2027-02-15', 'Published'],
  ['Finance & Procurement workstream charter', 'Charter', 'Finance & Procurement', 'V. Reddy', '1.0', '2026-11-28', 'Approved'],
  ['ISP master services agreement', 'Contract', 'Finance & Procurement', 'V. Reddy', '1.1', '2027-02-10', 'In Review'],
  ['Procurement policy', 'Policy', 'Finance & Procurement', 'V. Reddy', '2.0', '2027-01-30', 'Published'],
  ['Monthly program budget report – Sep 2026', 'Report', 'Finance & Procurement', 'V. Reddy', '1.0', '2027-02-05', 'Published'],
]
export const seedWsDocuments: WsDocument[] = DOCS.map(([title, type, workstream, owner, version, updated, status], i) => ({ id: `doc-ws-${String(i + 1).padStart(2, '0')}`, title, type, workstream, owner, version, updated, status }))

/* ------------------------------------------------------------------ */
/* RAID helpers + extra Technology rows from the mock-up               */
/* ------------------------------------------------------------------ */
/** Map a RaidItem.workstream display label to one of the 7 dashboard workstreams. */
export function raidWorkstreamOf(label: string): Workstream | undefined {
  if (/technology/i.test(label)) return 'Technology & Infrastructure'
  if (/talent/i.test(label)) return 'Talent & Hiring'
  if (/legal/i.test(label)) return 'Legal & Compliance'
  if (/facilit/i.test(label)) return 'Facilities & Workplace'
  if (/transition/i.test(label)) return 'Transition Readiness'
  if (/finance|procurement/i.test(label)) return 'Finance & Procurement'
  if (/operation|program/i.test(label)) return 'Operations Setup'
  return undefined
}

/** Rows pinned to the top of the "Top Risks & Issues" card in the executive summary (ids in 'raid'). */
export const WS_TOP_RAID: Partial<Record<Workstream, string[]>> = {
  'Technology & Infrastructure': ['r-001', 'r-ws-tech-1', 'r-005', 'r-ws-tech-2', 'r-ws-tech-3'],
}

/** The three Technology rows now live in src/data/shared.ts (same ids); kept empty for compatibility. */
export const extraRaid: RaidItem[] = []

/* ------------------------------------------------------------------ */
/* Misc helpers                                                        */
/* ------------------------------------------------------------------ */
export const IMPACT_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
export const STATUS_RANK: Record<string, number> = { Delayed: 0, Overdue: 0, 'At Risk': 1, Open: 2, 'In Progress': 3, Pending: 4, 'On Track': 5, 'Not Started': 6, Completed: 7, Resolved: 8, Closed: 9 }
export const OPEN_MS = (s: string) => s !== 'Completed'
