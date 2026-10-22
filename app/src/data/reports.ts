/**
 * Reports page – seed data and types (ENGIE IT GCC, Pune; reporting date 22 Feb 2027).
 * Collections: 'reports', 'reportCommentary', 'reportSchedules', 'recipients', 'headcountActuals'
 */
import { RAMP_MONTHS } from './businessUnits'

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
  { id: 'rp-001', name: 'Weekly Program Update – W07', type: 'Weekly', period: '15–21 Feb 2027', owner: 'A. Sharma', generatedOn: '2027-02-19', status: 'Draft', recipients: 14 },
  { id: 'rp-002', name: 'Weekly Program Update – W06', type: 'Weekly', period: '08–14 Feb 2027', owner: 'A. Sharma', generatedOn: '2027-02-12', status: 'Sent', recipients: 14 },
  { id: 'rp-003', name: 'Weekly Program Update – W05', type: 'Weekly', period: '01–07 Feb 2027', owner: 'A. Sharma', generatedOn: '2027-02-05', status: 'Sent', recipients: 14 },
  { id: 'rp-004', name: 'Steering Committee Dashboard – Jan 2027', type: 'Monthly', period: 'Jan 2027', owner: 'A. Sharma', generatedOn: '2027-02-16', status: 'Published', recipients: 9 },
  { id: 'rp-005', name: 'Steering Committee Dashboard – Dec 2026', type: 'Monthly', period: 'Dec 2026', owner: 'A. Sharma', generatedOn: '2027-01-25', status: 'Sent', recipients: 9 },
  { id: 'rp-006', name: 'Financial Report – Q4 2026', type: 'Financial', period: 'Oct–Dec 2026', owner: 'V. Reddy', generatedOn: '2027-02-08', status: 'Sent', recipients: 7 },
  { id: 'rp-007', name: 'Financial Report – Jan 2027', type: 'Financial', period: 'Jan 2027', owner: 'V. Reddy', generatedOn: '2027-02-03', status: 'Sent', recipients: 7 },
  { id: 'rp-008', name: 'Hiring & Workforce Report – Feb 2027', type: 'Hiring', period: 'Feb 2027 (MTD)', owner: 'S. Iyer', generatedOn: '2027-02-15', status: 'Published', recipients: 11 },
  { id: 'rp-009', name: 'Hiring & Workforce Report – Jan 2027', type: 'Hiring', period: 'Jan 2027', owner: 'S. Iyer', generatedOn: '2027-02-01', status: 'Sent', recipients: 11 },
  { id: 'rp-010', name: 'Pune Network Provisioning Delay – Impact Analysis', type: 'Ad hoc', period: 'As of 14 Feb 2027', owner: 'R. Mehta', generatedOn: '2027-02-14', status: 'Sent', recipients: 6 },
  { id: 'rp-011', name: 'Wave 2 Transition Readiness Snapshot (SAP / ERP, Data)', type: 'Ad hoc', period: 'As of 09 Feb 2027', owner: 'A. Sharma', generatedOn: '2027-02-09', status: 'Published', recipients: 8 },
  { id: 'rp-012', name: 'Weekly Program Update – W04', type: 'Weekly', period: '25–31 Jan 2027', owner: 'A. Sharma', generatedOn: '2027-01-28', status: 'Sent', recipients: 14 },
  { id: 'rp-013', name: 'Steering Committee Dashboard – Nov 2026', type: 'Monthly', period: 'Nov 2026', owner: 'A. Sharma', generatedOn: '2026-12-28', status: 'Sent', recipients: 9 },
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
  { id: 'hiring', title: 'Hiring commentary', report: 'Hiring & Workforce Report · "Commentary"', hint: 'Headcount plan vs actual, hard-to-fill roles by business unit and capability, upcoming cohorts and attrition watch items.' },
]
export const seedReportCommentary: ReportCommentary[] = [
  { id: 'weekly', updatedOn: '2027-02-19', sentOn: '2027-02-12', text: 'ENGIE IT GCC Pune remains on track at 64% completion. Network provisioning slippage is the key watch item for the 23 Feb IT infrastructure readiness milestone and the Network cut-over from France; a recovery plan with the ISP is in place and reviewed daily. Wave 1 (Infrastructure & Cloud, Cybersecurity & IAM) is in hypercare, Wave 2 (Enterprise Applications, Data, Analytics & AI) onboarding is at 268 of the 285 planned to date and the facility handover remains on schedule for 10 Mar. Steering Committee decision needed on the SAP / ERP transition from the Networks GBU (D-018) to protect the Wave 3 go/no-go on 04 Mar.' },
  { id: 'monthly', updatedOn: '2027-02-16', text: 'January closes with the program at 64% completion and milestone adherence improving to 84%. Wave 1 went live on 01 Dec with Cloud Operations, Network and IAM now run from Pune; hypercare exits on 31 Jan. The Kharadi lease is executed and fit-out is on schedule for the 10 Mar handover. Budget consumption is in line with plan; forecast at completion remains inside the approved envelope. Two asks for the committee: approval of the backup ISP contract (CR-004) and confirmation of the Wave 2 hiring envelope for Enterprise Applications (SAP Functional / Technical) and Data, Analytics & AI.' },
  { id: 'financial', updatedOn: '2027-02-08', text: 'Actual spend is 65% of the approved budget, with forecast at completion at 95% of budget (5% headroom). Transition & Knowledge Transfer is trending over budget on Wave 2 travel to France and Houston; offset identified in Technology & Infrastructure (network contract renegotiated, licensing deferred to Q3).' },
  { id: 'hiring', updatedOn: '2027-02-15', text: '268 of 400 target Pune positions onboarded (67%) against 285 planned at ramp month 4 (−6%). Wave 1 domains are on plan: Infrastructure & Cloud 84 and Cybersecurity & IAM 27 onboarded. The gap sits in Enterprise Applications (SAP Functional / Technical transitioning from France – 11 open requisitions > 45 days) and Data Engineers. Campus cohort of 45 joins on 01 Mar for Digital Workplace and IT Service Management (Wave 3); the lateral hiring sprint with two specialist agencies is approved.' },
]

/** Actual cumulative Pune headcount per ramp month (year 1 only, up to the reporting date); plan comes from programRamp(subUnits). */
export interface HeadcountActual { id: string; month: string; actual: number }
export const seedHeadcountActuals: HeadcountActual[] = [18, 76, 170, 268].map((actual, i) => ({ id: `ha-${String(i + 1).padStart(2, '0')}`, month: RAMP_MONTHS[i], actual }))

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
  { id: 'rs-001', report: 'Weekly Program Update', cadence: 'Weekly', dayTime: 'Monday 08:00', recipients: ['Steering Committee', 'Workstream Leads', 'PMO'], channel: 'Email', active: true, lastRun: '2027-02-19 08:00', nextRun: '2027-02-26 08:00' },
  { id: 'rs-002', report: 'Monthly Steering Committee Dashboard', cadence: 'Monthly', dayTime: '3rd Thursday 17:00', recipients: ['Steering Committee', 'Executive Sponsors'], channel: 'Portal', active: true, lastRun: '2027-02-15 17:00', nextRun: '2027-03-19 17:00' },
  { id: 'rs-003', report: 'Financial Report', cadence: 'Monthly', dayTime: '5th working day 10:00', recipients: ['Group CFO', 'Finance Controller', 'PMO'], channel: 'Email', active: true, lastRun: '2027-02-07 10:00', nextRun: '2027-03-06 10:00' },
  { id: 'rs-004', report: 'Hiring & Workforce Report', cadence: 'Fortnightly', dayTime: 'Wednesday 09:00', recipients: ['Group CHRO', 'Talent Team', 'Workstream Leads'], channel: 'Teams', active: true, lastRun: '2027-02-14 09:00', nextRun: '2027-02-28 09:00' },
  { id: 'rs-005', report: 'Risk & Issue Digest', cadence: 'Weekly', dayTime: 'Friday 16:00', recipients: ['Workstream Leads', 'PMO'], channel: 'Teams', active: true, lastRun: '2027-02-16 16:00', nextRun: '2027-02-23 16:00' },
  { id: 'rs-006', report: 'Quarterly Business Review Pack', cadence: 'Quarterly', dayTime: '1st Monday 09:00', recipients: ['Executive Sponsors', 'Steering Committee'], channel: 'Portal', active: false, lastRun: '2027-02-05 09:00', nextRun: '2027-05-04 09:00' },
]

export interface Recipient {
  id: string
  name: string
  role: string
  handle: string // domain-free, e.g. "s.iyer"
  groups: string[]
}
export const RECIPIENT_GROUPS = ['Steering Committee', 'Executive Sponsors', 'Workstream Leads', 'PMO', 'Talent Team', 'Finance Controller', 'Group CFO', 'Group CHRO'] as const
export const seedRecipients: Recipient[] = [
  { id: 'rc-001', name: 'Anita Sharma', role: 'Program Manager', handle: 'a.sharma', groups: ['PMO', 'Steering Committee'] },
  { id: 'rc-002', name: 'Rahul Mehta', role: 'IT Lead · Infrastructure & Cloud owner', handle: 'r.mehta', groups: ['Workstream Leads'] },
  { id: 'rc-003', name: 'Sunita Iyer', role: 'Talent Lead · Data, Analytics & AI owner', handle: 's.iyer', groups: ['Workstream Leads', 'Talent Team'] },
  { id: 'rc-004', name: 'Prakash Rao', role: 'Legal Lead · Cybersecurity & IAM owner', handle: 'p.rao', groups: ['Workstream Leads'] },
  { id: 'rc-005', name: 'Kavya Nair', role: 'Facilities Lead · Digital Workplace owner', handle: 'k.nair', groups: ['Workstream Leads'] },
  { id: 'rc-006', name: 'Mohammed Khan', role: 'Operations Lead · Integration & Engineering owner', handle: 'm.khan', groups: ['Workstream Leads'] },
  { id: 'rc-007', name: 'Vikram Reddy', role: 'Procurement Lead · Enterprise Applications owner', handle: 'v.reddy', groups: ['Workstream Leads', 'Finance Controller'] },
  { id: 'rc-008', name: 'Deepak Singh', role: 'PMO Analyst · IT Service Management owner', handle: 'd.singh', groups: ['PMO'] },
  { id: 'rc-009', name: 'Claire Dubois', role: 'Group COO (Sponsor)', handle: 'c.dubois', groups: ['Steering Committee', 'Executive Sponsors'] },
  { id: 'rc-010', name: 'Marc Lefèvre', role: 'Group CFO', handle: 'm.lefevre', groups: ['Steering Committee', 'Executive Sponsors', 'Group CFO'] },
  { id: 'rc-011', name: 'Hannah Weber', role: 'Group CHRO', handle: 'h.weber', groups: ['Steering Committee', 'Executive Sponsors', 'Group CHRO'] },
  { id: 'rc-012', name: 'Thomas Moreau', role: 'Group CIO', handle: 't.moreau', groups: ['Steering Committee', 'Executive Sponsors'] },
  { id: 'rc-013', name: 'Neha Kulkarni', role: 'GCC Head (Pune)', handle: 'n.kulkarni', groups: ['Steering Committee'] },
  { id: 'rc-014', name: 'Arjun Desai', role: 'Finance Controller – India', handle: 'a.desai', groups: ['Finance Controller'] },
]
