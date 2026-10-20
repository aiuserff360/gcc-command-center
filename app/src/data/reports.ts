/**
 * Reports page – seed data and types.
 * Collections: 'reports', 'reportCommentary', 'reportSchedules', 'recipients'
 */
export type ReportType = 'Weekly' | 'Monthly' | 'Financial' | 'Hiring' | 'Ad hoc'
export type ReportStatus = 'Draft' | 'Published' | 'Sent'
export const REPORT_TYPES: ReportType[] = ['Weekly', 'Monthly', 'Financial', 'Hiring', 'Ad hoc']
export const REPORT_STATUSES: ReportStatus[] = ['Draft', 'Published', 'Sent']

export interface Report {
  id: string
  name: string
  type: ReportType
  period: string
  owner: string
  generatedOn: string // ISO
  status: ReportStatus
  recipients: number
}

export const seedReports: Report[] = [
  { id: 'rp-001', name: 'Weekly Program Update – W43', type: 'Weekly', period: '13–19 Oct 2026', owner: 'A. Sharma', generatedOn: '2026-10-19', status: 'Draft', recipients: 14 },
  { id: 'rp-002', name: 'Weekly Program Update – W42', type: 'Weekly', period: '06–12 Oct 2026', owner: 'A. Sharma', generatedOn: '2026-10-12', status: 'Sent', recipients: 14 },
  { id: 'rp-003', name: 'Weekly Program Update – W41', type: 'Weekly', period: '29 Sep–05 Oct 2026', owner: 'A. Sharma', generatedOn: '2026-10-05', status: 'Sent', recipients: 14 },
  { id: 'rp-004', name: 'Steering Committee Dashboard – Oct 2026', type: 'Monthly', period: 'Oct 2026', owner: 'A. Sharma', generatedOn: '2026-10-16', status: 'Published', recipients: 9 },
  { id: 'rp-005', name: 'Steering Committee Dashboard – Sep 2026', type: 'Monthly', period: 'Sep 2026', owner: 'A. Sharma', generatedOn: '2026-09-25', status: 'Sent', recipients: 9 },
  { id: 'rp-006', name: 'Financial Report – Q3 FY26', type: 'Financial', period: 'Jul–Sep 2026', owner: 'V. Reddy', generatedOn: '2026-10-08', status: 'Sent', recipients: 7 },
  { id: 'rp-007', name: 'Financial Report – Sep 2026', type: 'Financial', period: 'Sep 2026', owner: 'V. Reddy', generatedOn: '2026-10-03', status: 'Sent', recipients: 7 },
  { id: 'rp-008', name: 'Hiring & Workforce Report – Oct 2026', type: 'Hiring', period: 'Oct 2026 (MTD)', owner: 'S. Iyer', generatedOn: '2026-10-15', status: 'Published', recipients: 11 },
  { id: 'rp-009', name: 'Hiring & Workforce Report – Sep 2026', type: 'Hiring', period: 'Sep 2026', owner: 'S. Iyer', generatedOn: '2026-10-01', status: 'Sent', recipients: 11 },
  { id: 'rp-010', name: 'IT Provisioning Delay – Impact Analysis', type: 'Ad hoc', period: 'As of 14 Oct 2026', owner: 'R. Mehta', generatedOn: '2026-10-14', status: 'Sent', recipients: 6 },
  { id: 'rp-011', name: 'Wave 1 Transition Readiness Snapshot', type: 'Ad hoc', period: 'As of 09 Oct 2026', owner: 'A. Sharma', generatedOn: '2026-10-09', status: 'Published', recipients: 8 },
  { id: 'rp-012', name: 'Weekly Program Update – W40', type: 'Weekly', period: '22–28 Sep 2026', owner: 'A. Sharma', generatedOn: '2026-09-28', status: 'Sent', recipients: 14 },
  { id: 'rp-013', name: 'Steering Committee Dashboard – Aug 2026', type: 'Monthly', period: 'Aug 2026', owner: 'A. Sharma', generatedOn: '2026-08-28', status: 'Sent', recipients: 9 },
]

export type CommentaryId = 'weekly' | 'monthly' | 'financial' | 'hiring'
export interface ReportCommentary {
  id: CommentaryId
  text: string
  updatedOn: string
  sentOn?: string
}
/** The four narrative blocks maintained in the Input view (Reports → Commentary). */
export const COMMENTARY_META: { id: CommentaryId; title: string; report: string; hint: string }[] = [
  { id: 'weekly', title: 'Weekly commentary', report: 'Weekly Program Update · section 6 "Program Manager commentary"', hint: 'Two to four sentences: overall status, the key watch item, what moved this week and any decision the Steering Committee must take.' },
  { id: 'monthly', title: 'Monthly commentary', report: 'Monthly Steering Committee Dashboard · "PMO commentary"', hint: 'Executive summary for the one-page steering pack: headline progress, material variances and the asks of the committee.' },
  { id: 'financial', title: 'Financial commentary', report: 'Financial Report · "Variance commentary"', hint: 'Explain budget vs actual vs forecast variances by workstream and the offsets or recovery actions agreed.' },
  { id: 'hiring', title: 'Hiring commentary', report: 'Hiring & Workforce Report · "Commentary"', hint: 'Headcount plan vs actual, hard-to-fill roles by business unit, upcoming cohorts and attrition watch items.' },
]
export const seedReportCommentary: ReportCommentary[] = [
  { id: 'weekly', updatedOn: '2026-10-19', sentOn: '2026-10-12', text: 'Program remains on track at 72% completion. Network provisioning slippage is the key watch item for the 23 Oct IT readiness milestone; a recovery plan with the ISP is in place and reviewed daily. Wave 2 hiring is ahead of plan (+12%) and the facility handover remains on schedule for 10 Nov. Steering Committee decision needed on vendor contract approval (Finance & Procurement) to avoid a two-week delay.' },
  { id: 'monthly', updatedOn: '2026-10-16', text: 'October closes with the program at 72% completion and milestone adherence improving to 85%. The Pune Tower B lease is executed and fit-out is on schedule for the 10 Nov handover. Budget consumption is in line with plan; forecast at completion remains inside the approved envelope. Two asks for the committee: approval of the ISP master services agreement and confirmation of the Wave 2 hiring envelope for the SAP and Data & AI practices.' },
  { id: 'financial', updatedOn: '2026-10-08', text: 'Actual spend is 65% of the approved budget, with forecast at completion at 95% of budget (5% headroom). Finance & Procurement is trending over budget due to accelerated vendor onboarding; offset identified in Technology (software licensing deferred to FY27).' },
  { id: 'hiring', updatedOn: '2026-10-15', text: '320 of 450 target positions onboarded (71%). Campus cohort of 45 joins on 02 Nov. Specialist roles in the SAP Practice and R&D – Platform & Cloud business units remain the gap – 8 open requisitions >45 days. Lateral hiring sprint with two new agencies approved.' },
]

export type Cadence = 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly'
export type Channel = 'Email' | 'Teams' | 'Portal'
export const CADENCES: Cadence[] = ['Weekly', 'Fortnightly', 'Monthly', 'Quarterly']
export const CHANNELS: Channel[] = ['Email', 'Teams', 'Portal']

export interface ReportSchedule {
  id: string
  report: string
  cadence: Cadence
  dayTime: string
  recipients: string[] // recipient handles or group names
  channel: Channel
  active: boolean
  lastRun: string
  nextRun: string
}
export const seedReportSchedules: ReportSchedule[] = [
  { id: 'rs-001', report: 'Weekly Program Update', cadence: 'Weekly', dayTime: 'Monday 08:00', recipients: ['Steering Committee', 'Workstream Leads', 'PMO'], channel: 'Email', active: true, lastRun: '2026-10-19 08:00', nextRun: '2026-10-26 08:00' },
  { id: 'rs-002', report: 'Monthly Steering Committee Dashboard', cadence: 'Monthly', dayTime: '3rd Thursday 17:00', recipients: ['Steering Committee', 'Executive Sponsors'], channel: 'Portal', active: true, lastRun: '2026-10-15 17:00', nextRun: '2026-11-19 17:00' },
  { id: 'rs-003', report: 'Financial Report', cadence: 'Monthly', dayTime: '5th working day 10:00', recipients: ['Global CFO', 'Finance Controller', 'PMO'], channel: 'Email', active: true, lastRun: '2026-10-07 10:00', nextRun: '2026-11-06 10:00' },
  { id: 'rs-004', report: 'Hiring & Workforce Report', cadence: 'Fortnightly', dayTime: 'Wednesday 09:00', recipients: ['Global CHRO', 'Talent Team', 'Workstream Leads'], channel: 'Teams', active: true, lastRun: '2026-10-14 09:00', nextRun: '2026-10-28 09:00' },
  { id: 'rs-005', report: 'Risk & Issue Digest', cadence: 'Weekly', dayTime: 'Friday 16:00', recipients: ['Workstream Leads', 'PMO'], channel: 'Teams', active: true, lastRun: '2026-10-16 16:00', nextRun: '2026-10-23 16:00' },
  { id: 'rs-006', report: 'Quarterly Business Review Pack', cadence: 'Quarterly', dayTime: '1st Monday 09:00', recipients: ['Executive Sponsors', 'Steering Committee'], channel: 'Portal', active: false, lastRun: '2026-10-05 09:00', nextRun: '2027-01-04 09:00' },
]

export interface Recipient {
  id: string
  name: string
  role: string
  handle: string // domain-free, e.g. "s.iyer"
  groups: string[]
}
export const RECIPIENT_GROUPS = ['Steering Committee', 'Executive Sponsors', 'Workstream Leads', 'PMO', 'Talent Team', 'Finance Controller', 'Global CFO', 'Global CHRO'] as const
export const seedRecipients: Recipient[] = [
  { id: 'rc-001', name: 'Anita Sharma', role: 'Program Manager', handle: 'a.sharma', groups: ['PMO', 'Steering Committee'] },
  { id: 'rc-002', name: 'Rahul Mehta', role: 'IT Lead', handle: 'r.mehta', groups: ['Workstream Leads'] },
  { id: 'rc-003', name: 'Sunita Iyer', role: 'Talent Lead', handle: 's.iyer', groups: ['Workstream Leads', 'Talent Team'] },
  { id: 'rc-004', name: 'Prakash Rao', role: 'Legal Lead', handle: 'p.rao', groups: ['Workstream Leads'] },
  { id: 'rc-005', name: 'Kavya Nair', role: 'Facilities Lead', handle: 'k.nair', groups: ['Workstream Leads'] },
  { id: 'rc-006', name: 'Mohammed Khan', role: 'Operations Lead', handle: 'm.khan', groups: ['Workstream Leads'] },
  { id: 'rc-007', name: 'Vikram Reddy', role: 'Procurement Lead', handle: 'v.reddy', groups: ['Workstream Leads', 'Finance Controller'] },
  { id: 'rc-008', name: 'Deepak Singh', role: 'PMO Analyst', handle: 'd.singh', groups: ['PMO'] },
  { id: 'rc-009', name: 'Claire Dubois', role: 'Global COO (Sponsor)', handle: 'c.dubois', groups: ['Steering Committee', 'Executive Sponsors'] },
  { id: 'rc-010', name: 'Marc Lefèvre', role: 'Global CFO', handle: 'm.lefevre', groups: ['Steering Committee', 'Executive Sponsors', 'Global CFO'] },
  { id: 'rc-011', name: 'Hannah Weber', role: 'Global CHRO', handle: 'h.weber', groups: ['Steering Committee', 'Executive Sponsors', 'Global CHRO'] },
  { id: 'rc-012', name: 'Thomas Moreau', role: 'Global CIO', handle: 't.moreau', groups: ['Steering Committee', 'Executive Sponsors'] },
  { id: 'rc-013', name: 'Neha Kulkarni', role: 'GCC Head (Pune)', handle: 'n.kulkarni', groups: ['Steering Committee'] },
  { id: 'rc-014', name: 'Arjun Desai', role: 'Finance Controller – India', handle: 'a.desai', groups: ['Finance Controller'] },
]
