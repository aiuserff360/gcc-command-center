/**
 * Program Planning page data: the integrated master plan (Gantt) items.
 * Milestones and dependencies are read from the shared collections in ./shared.ts.
 */
import type { Workstream, Status } from './common'

export type PlanStatus = Extract<Status, 'On Track' | 'At Risk' | 'Delayed' | 'Completed' | 'Pending' | 'Not Started'>
export const PLAN_STATUSES: PlanStatus[] = ['On Track', 'At Risk', 'Delayed', 'Completed', 'Pending', 'Not Started']

export interface PlanGroup {
  n: number
  name: string
  workstream: Workstream
}

/** Plan groups as shown on the mock-up (1-4) plus the remaining dashboard workstreams (5-8). */
export const PLAN_GROUPS: PlanGroup[] = [
  { n: 1, name: 'Governance & Program Management', workstream: 'Operations Setup' },
  { n: 2, name: 'Talent & Hiring', workstream: 'Talent & Hiring' },
  { n: 3, name: 'Technology & Infrastructure', workstream: 'Technology & Infrastructure' },
  { n: 4, name: 'Legal & Compliance', workstream: 'Legal & Compliance' },
  { n: 5, name: 'Facilities & Workplace', workstream: 'Facilities & Workplace' },
  { n: 6, name: 'Transition Readiness', workstream: 'Transition Readiness' },
  { n: 7, name: 'Operations Setup', workstream: 'Operations Setup' },
  { n: 8, name: 'Finance & Procurement', workstream: 'Finance & Procurement' },
]

export interface PlanItem {
  id: string
  group: number // PLAN_GROUPS.n
  code: string // "1.1"
  name: string
  workstream: Workstream
  start: string // ISO
  end: string // ISO
  status: PlanStatus
  owner: string
  predecessor?: string // code of the predecessor item, e.g. "1.1"
  critical?: boolean
  progress: number // 0-100
}

const P = (group: number, code: string, name: string, workstream: Workstream, start: string, end: string, status: PlanStatus, owner: string, progress: number, predecessor?: string, critical = false): PlanItem =>
  ({ id: `pi-${code.replace('.', '-')}`, group, code, name, workstream, start, end, status, owner, progress, predecessor, critical })

export const seedPlanItems: PlanItem[] = [
  // 1. Governance & Program Management
  P(1, '1.1', 'Program kick-off', 'Operations Setup', '2026-01-01', '2026-01-31', 'Completed', 'A. Sharma', 100),
  P(1, '1.2', 'Governance framework', 'Operations Setup', '2026-01-15', '2026-02-28', 'Completed', 'A. Sharma', 100, '1.1'),
  P(1, '1.3', 'Steering committee cadence', 'Operations Setup', '2026-02-01', '2026-03-15', 'On Track', 'A. Sharma', 90, '1.2'),
  // 2. Talent & Hiring
  P(2, '2.1', 'Role architecture', 'Talent & Hiring', '2026-01-05', '2026-02-28', 'Completed', 'S. Iyer', 100),
  P(2, '2.2', 'Campus & lateral hiring', 'Talent & Hiring', '2026-03-01', '2026-09-30', 'On Track', 'S. Iyer', 80, '1.3', true),
  P(2, '2.3', 'Onboarding & ramp-up', 'Talent & Hiring', '2026-08-01', '2026-12-31', 'At Risk', 'S. Iyer', 45, undefined, true),
  // 3. Technology & Infrastructure
  P(3, '3.1', 'Office space fit-out', 'Technology & Infrastructure', '2026-02-01', '2026-06-30', 'On Track', 'K. Nair', 95),
  P(3, '3.2', 'IT infrastructure & network', 'Technology & Infrastructure', '2026-03-15', '2026-08-15', 'At Risk', 'R. Mehta', 70, '3.1', true),
  P(3, '3.3', 'Security & compliance setup', 'Technology & Infrastructure', '2026-05-01', '2026-09-30', 'On Track', 'R. Mehta', 75, '3.2', true),
  // 4. Legal & Compliance
  P(4, '4.1', 'Entity setup and regulatory', 'Legal & Compliance', '2026-01-01', '2026-03-31', 'Completed', 'P. Rao', 100),
  P(4, '4.2', 'Tax & statutory registrations', 'Legal & Compliance', '2026-03-01', '2026-06-30', 'On Track', 'P. Rao', 100, '4.1'),
  // 5. Facilities & Workplace
  P(5, '5.1', 'Office lease agreement', 'Facilities & Workplace', '2026-01-15', '2026-04-30', 'Completed', 'K. Nair', 100),
  P(5, '5.2', 'Interior design & furniture', 'Facilities & Workplace', '2026-05-01', '2026-11-30', 'On Track', 'K. Nair', 70, '5.1'),
  P(5, '5.3', 'Facility handover', 'Facilities & Workplace', '2026-10-01', '2026-11-10', 'On Track', 'K. Nair', 35, '5.2'),
  // 6. Transition Readiness
  P(6, '6.1', 'Knowledge transfer wave 1', 'Transition Readiness', '2026-06-01', '2026-09-25', 'On Track', 'A. Sharma', 95),
  P(6, '6.2', 'Wave 2 readiness review', 'Transition Readiness', '2026-08-01', '2026-10-12', 'On Track', 'P. Rao', 100, '6.1'),
  P(6, '6.3', 'Go/No-Go for transition', 'Transition Readiness', '2026-11-01', '2026-12-04', 'Pending', 'A. Sharma', 0, '6.2', true),
  P(6, '6.4', 'Wave 3 transition & stabilization', 'Transition Readiness', '2026-12-15', '2027-03-31', 'Not Started', 'A. Sharma', 0, '6.3', true),
  // 7. Operations Setup
  P(7, '7.1', 'Support model & SOPs', 'Operations Setup', '2026-06-01', '2026-11-30', 'At Risk', 'M. Khan', 55, undefined, true),
  P(7, '7.2', 'Vendor onboarding', 'Operations Setup', '2026-07-01', '2026-11-25', 'Delayed', 'M. Khan', 40),
  P(7, '7.3', 'Service readiness', 'Operations Setup', '2026-10-01', '2026-12-15', 'On Track', 'M. Khan', 20, '7.2'),
  // 8. Finance & Procurement
  P(8, '8.1', 'Bank accounts operational', 'Finance & Procurement', '2026-03-01', '2026-05-31', 'Completed', 'V. Reddy', 100),
  P(8, '8.2', 'ERP entity configuration', 'Finance & Procurement', '2026-05-01', '2026-08-31', 'Completed', 'V. Reddy', 100, '8.1'),
  P(8, '8.3', 'Payroll go-live', 'Finance & Procurement', '2026-07-01', '2026-09-15', 'Completed', 'V. Reddy', 100, '8.2'),
  P(8, '8.4', 'Stabilization run-rate funding', 'Finance & Procurement', '2027-01-01', '2027-03-31', 'Delayed', 'V. Reddy', 10),
]

/* ---------- Timeline helpers (pure, shared by the Gantt and the page) ---------- */
export const DAY = 86400000
export const toDate = (iso: string) => new Date(iso + 'T00:00:00')
export const addDays = (iso: string, n: number) => {
  const d = toDate(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY)
