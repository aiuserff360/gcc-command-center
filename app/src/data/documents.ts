/**
 * Documents page – seed data and types.
 * Collections: 'documents', 'documentVersions', 'documentSignOffs'
 */
import type { Workstream } from './common'

export type DocType = 'Charter' | 'Plan' | 'Register' | 'Contract' | 'Policy' | 'Report' | 'Template' | 'Minutes' | 'Deliverable'
export type DocStatus = 'Draft' | 'In Review' | 'Approved' | 'Superseded'
export type DocWorkstream = Workstream | 'Program Office'
export const DOC_TYPES: DocType[] = ['Charter', 'Plan', 'Register', 'Contract', 'Policy', 'Report', 'Template', 'Minutes', 'Deliverable']
export const DOC_STATUSES: DocStatus[] = ['Draft', 'In Review', 'Approved', 'Superseded']
export const DOC_WORKSTREAMS: DocWorkstream[] = ['Program Office', 'Talent & Hiring', 'Technology & Infrastructure', 'Legal & Compliance', 'Facilities & Workplace', 'Transition Readiness', 'Operations Setup', 'Finance & Procurement']

export interface Doc {
  id: string
  title: string
  type: DocType
  workstream: DocWorkstream
  owner: string
  version: string
  updatedOn: string // ISO
  status: DocStatus
  signOffBy: string
  size: number // KB
  tags: string[]
  link: string
}

const D = (id: string, title: string, type: DocType, workstream: DocWorkstream, owner: string, version: string, updatedOn: string, status: DocStatus, signOffBy: string, size: number, tags: string[]): Doc =>
  ({ id, title, type, workstream, owner, version, updatedOn, status, signOffBy, size, tags, link: `sharepoint://gcc-program/${workstream.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}/${id}` })

export const seedDocuments: Doc[] = [
  D('doc-001', 'Program Charter v2.1', 'Charter', 'Program Office', 'A. Sharma', '2.1', '2026-10-14', 'Approved', 'Global COO', 1840, ['governance', 'charter']),
  D('doc-002', 'Integrated Program Schedule', 'Plan', 'Program Office', 'D. Singh', '7.3', '2026-10-19', 'In Review', 'A. Sharma', 4210, ['schedule', 'baseline']),
  D('doc-003', 'RAID Register', 'Register', 'Program Office', 'D. Singh', '14.0', '2026-10-19', 'Approved', 'A. Sharma', 960, ['raid', 'risks']),
  D('doc-004', 'Office Lease Agreement – Pune Tower B', 'Contract', 'Facilities & Workplace', 'K. Nair', '1.0', '2026-10-15', 'Approved', 'Group General Counsel', 3120, ['lease', 'contract', 'pune']),
  D('doc-005', 'India Employment Agreement Template', 'Template', 'Talent & Hiring', 'S. Iyer', '3.0', '2026-09-30', 'Approved', 'P. Rao', 310, ['hr', 'template']),
  D('doc-006', 'POSH Policy', 'Policy', 'Legal & Compliance', 'P. Rao', '1.2', '2026-10-06', 'Approved', 'Global CHRO', 540, ['policy', 'compliance']),
  D('doc-007', 'Transfer Pricing Methodology', 'Deliverable', 'Finance & Procurement', 'V. Reddy', '2.0', '2026-10-17', 'In Review', 'Global CFO', 1230, ['tax', 'transfer-pricing']),
  D('doc-008', 'Steering Committee Minutes – Oct 2026', 'Minutes', 'Program Office', 'A. Sharma', '1.0', '2026-10-16', 'In Review', 'Global COO', 280, ['steerco', 'minutes']),
  D('doc-009', 'Weekly Status Report – W42', 'Report', 'Program Office', 'A. Sharma', '1.0', '2026-10-12', 'Approved', 'A. Sharma', 420, ['weekly', 'status']),
  D('doc-010', 'IT Security Baseline', 'Deliverable', 'Technology & Infrastructure', 'R. Mehta', '1.4', '2026-10-18', 'In Review', 'Global CISO', 2050, ['security', 'baseline']),
  D('doc-011', 'Payroll Parallel Run Report', 'Report', 'Talent & Hiring', 'S. Iyer', '1.0', '2026-10-13', 'Approved', 'Finance Controller', 760, ['payroll', 'hrms']),
  D('doc-012', 'Transition Wave 1 Plan', 'Plan', 'Transition Readiness', 'A. Sharma', '2.2', '2026-10-19', 'In Review', 'Global COO', 1980, ['transition', 'wave-1']),
  D('doc-013', 'Knowledge Transfer Pack – Finance', 'Deliverable', 'Transition Readiness', 'A. Sharma', '1.1', '2026-10-11', 'Draft', 'Global CFO', 5420, ['kt', 'finance']),
  D('doc-014', 'GCC Business Case & Investment Mandate', 'Charter', 'Program Office', 'A. Sharma', '1.3', '2026-02-10', 'Approved', 'Global CFO', 2210, ['business-case']),
  D('doc-015', 'Certificate of Incorporation – GCC India Pvt Ltd', 'Contract', 'Legal & Compliance', 'P. Rao', '1.0', '2026-03-28', 'Approved', 'Group General Counsel', 180, ['entity', 'statutory']),
  D('doc-016', 'Intercompany Services Agreement', 'Contract', 'Finance & Procurement', 'V. Reddy', '1.1', '2026-09-22', 'Approved', 'Global CFO', 890, ['intercompany', 'contract']),
  D('doc-017', 'Office Fit-out Design Pack', 'Deliverable', 'Facilities & Workplace', 'K. Nair', '3.0', '2026-06-18', 'Approved', 'Global Head of Real Estate', 11800, ['fit-out', 'design']),
  D('doc-018', 'Workforce Plan FY26–27', 'Plan', 'Talent & Hiring', 'S. Iyer', '4.1', '2026-10-09', 'Approved', 'Global CHRO', 1340, ['workforce', 'headcount']),
  D('doc-019', 'Compensation & Benefits Framework', 'Policy', 'Talent & Hiring', 'S. Iyer', '2.0', '2026-08-30', 'Approved', 'Global CHRO', 720, ['c&b', 'policy']),
  D('doc-020', 'Network Provisioning Recovery Plan', 'Plan', 'Technology & Infrastructure', 'R. Mehta', '1.2', '2026-10-18', 'Draft', 'Global CIO', 610, ['network', 'recovery']),
  D('doc-021', 'Vendor Master Services Agreement – ISP', 'Contract', 'Finance & Procurement', 'V. Reddy', '0.9', '2026-10-16', 'In Review', 'Group General Counsel', 1450, ['vendor', 'isp']),
  D('doc-022', 'Weekly Status Report Template', 'Template', 'Program Office', 'D. Singh', '2.0', '2026-04-02', 'Approved', 'A. Sharma', 150, ['template', 'weekly']),
  D('doc-023', 'Steering Committee Pack Template', 'Template', 'Program Office', 'D. Singh', '1.5', '2026-05-14', 'Approved', 'A. Sharma', 420, ['template', 'steerco']),
  D('doc-024', 'Risk Register Template', 'Template', 'Program Office', 'D. Singh', '1.0', '2026-02-20', 'Approved', 'A. Sharma', 95, ['template', 'raid']),
  D('doc-025', 'Deliverable Acceptance Form Template', 'Template', 'Program Office', 'D. Singh', '1.1', '2026-03-05', 'Approved', 'A. Sharma', 80, ['template', 'sign-off']),
  D('doc-026', 'Statement of Work Template', 'Template', 'Finance & Procurement', 'V. Reddy', '2.2', '2026-07-01', 'Approved', 'P. Rao', 210, ['template', 'procurement']),
  D('doc-027', 'Day-One Operations Runbook', 'Deliverable', 'Operations Setup', 'M. Khan', '1.0', '2026-10-10', 'In Review', 'GCC Head', 1670, ['operations', 'runbook']),
  D('doc-028', 'Facilities Services SLA', 'Contract', 'Operations Setup', 'M. Khan', '1.0', '2026-09-18', 'Approved', 'K. Nair', 380, ['sla', 'facilities']),
  D('doc-029', 'GST & Statutory Registrations Register', 'Register', 'Legal & Compliance', 'P. Rao', '3.0', '2026-10-02', 'Approved', 'Finance Controller', 260, ['statutory', 'register']),
  D('doc-030', 'Steering Committee Minutes – Sep 2026', 'Minutes', 'Program Office', 'A. Sharma', '1.0', '2026-09-19', 'Approved', 'Global COO', 240, ['steerco', 'minutes']),
  D('doc-031', 'Program Charter v2.0', 'Charter', 'Program Office', 'A. Sharma', '2.0', '2026-07-22', 'Superseded', 'Global COO', 1790, ['governance', 'charter']),
  D('doc-032', 'Dependency Register', 'Register', 'Program Office', 'D. Singh', '9.0', '2026-10-17', 'Approved', 'A. Sharma', 520, ['dependencies']),
  D('doc-033', 'Cybersecurity Compliance Assessment', 'Report', 'Technology & Infrastructure', 'R. Mehta', '1.0', '2026-10-07', 'Approved', 'Global CISO', 1980, ['security', 'assessment']),
]

export interface DocVersion {
  id: string
  docId: string
  version: string
  date: string
  author: string
  note: string
  size: number
}
export const seedDocumentVersions: DocVersion[] = [
  { id: 'dv-001', docId: 'doc-001', version: '2.1', date: '2026-10-14', author: 'A. Sharma', note: 'Updated governance cadence and SteerCo membership after Oct review.', size: 1840 },
  { id: 'dv-002', docId: 'doc-001', version: '2.0', date: '2026-07-22', author: 'A. Sharma', note: 'Re-baselined scope for Pune site; added Transition workstream.', size: 1790 },
  { id: 'dv-003', docId: 'doc-001', version: '1.0', date: '2026-01-28', author: 'A. Sharma', note: 'Initial approved charter.', size: 1520 },
  { id: 'dv-004', docId: 'doc-002', version: '7.3', date: '2026-10-19', author: 'D. Singh', note: 'Network provisioning re-forecast; Wave 2 hiring pulled forward.', size: 4210 },
  { id: 'dv-005', docId: 'doc-002', version: '7.2', date: '2026-10-12', author: 'D. Singh', note: 'Weekly update.', size: 4180 },
  { id: 'dv-006', docId: 'doc-002', version: '7.1', date: '2026-10-05', author: 'D. Singh', note: 'Weekly update; facility handover confirmed 10 Nov.', size: 4160 },
  { id: 'dv-007', docId: 'doc-003', version: '14.0', date: '2026-10-19', author: 'D. Singh', note: 'Added R-028 vendor delivery slippage; closed I-011.', size: 960 },
  { id: 'dv-008', docId: 'doc-003', version: '13.0', date: '2026-10-12', author: 'D. Singh', note: 'Weekly RAID review.', size: 940 },
  { id: 'dv-009', docId: 'doc-007', version: '2.0', date: '2026-10-17', author: 'V. Reddy', note: 'Incorporated advisor feedback on cost-plus mark-up benchmarking.', size: 1230 },
  { id: 'dv-010', docId: 'doc-007', version: '1.0', date: '2026-09-12', author: 'V. Reddy', note: 'First draft for Global Tax review.', size: 1100 },
  { id: 'dv-011', docId: 'doc-010', version: '1.4', date: '2026-10-18', author: 'R. Mehta', note: 'Added endpoint encryption and MFA controls.', size: 2050 },
  { id: 'dv-012', docId: 'doc-010', version: '1.3', date: '2026-10-04', author: 'R. Mehta', note: 'Aligned with global ISMS control catalogue.', size: 1990 },
  { id: 'dv-013', docId: 'doc-012', version: '2.2', date: '2026-10-19', author: 'A. Sharma', note: 'Go/No-Go criteria refined; added hypercare roster.', size: 1980 },
  { id: 'dv-014', docId: 'doc-012', version: '2.1', date: '2026-10-08', author: 'A. Sharma', note: 'Updated KT schedule for Finance processes.', size: 1920 },
  { id: 'dv-015', docId: 'doc-012', version: '2.0', date: '2026-09-24', author: 'A. Sharma', note: 'Wave 1 scope confirmed (AP, AR, GL).', size: 1850 },
  { id: 'dv-016', docId: 'doc-004', version: '1.0', date: '2026-10-15', author: 'K. Nair', note: 'Executed lease – 5 years, 42,000 sq ft.', size: 3120 },
  { id: 'dv-017', docId: 'doc-020', version: '1.2', date: '2026-10-18', author: 'R. Mehta', note: 'Daily ISP checkpoint added; fallback MPLS circuit.', size: 610 },
  { id: 'dv-018', docId: 'doc-020', version: '1.1', date: '2026-10-15', author: 'R. Mehta', note: 'Initial recovery plan.', size: 580 },
]

export interface DocSignOff {
  id: string
  docId: string
  docTitle: string
  action: 'Approved' | 'Rejected'
  by: string
  comment: string
  date: string
}
export const seedDocumentSignOffs: DocSignOff[] = [
  { id: 'so-001', docId: 'doc-001', docTitle: 'Program Charter v2.1', action: 'Approved', by: 'Global COO', comment: 'Approved with updated SteerCo cadence.', date: '2026-10-14' },
  { id: 'so-002', docId: 'doc-004', docTitle: 'Office Lease Agreement – Pune Tower B', action: 'Approved', by: 'Group General Counsel', comment: 'Lease terms reviewed and executed.', date: '2026-10-15' },
  { id: 'so-003', docId: 'doc-011', docTitle: 'Payroll Parallel Run Report', action: 'Approved', by: 'Finance Controller', comment: 'Zero variances in run 2. Go for live payroll.', date: '2026-10-13' },
  { id: 'so-004', docId: 'doc-033', docTitle: 'Cybersecurity Compliance Assessment', action: 'Approved', by: 'Global CISO', comment: 'Two medium findings tracked in RAID.', date: '2026-10-07' },
]

export const fmtSize = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`)
