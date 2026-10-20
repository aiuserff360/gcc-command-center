/**
 * Settings page – seed data and types.
 * Collections: 'users', 'lookups', 'notificationSettings'
 */
export type UserRole = 'Program Manager' | 'Workstream Lead' | 'Steering Member' | 'Viewer'
export const USER_ROLES: UserRole[] = ['Program Manager', 'Workstream Lead', 'Steering Member', 'Viewer']

export interface User {
  id: string
  name: string
  role: UserRole
  workstream: string
  handle: string
  status: 'Active' | 'Invited' | 'Deactivated'
  lastActive: string
}
export const seedUsers: User[] = [
  { id: 'us-001', name: 'Anita Sharma', role: 'Program Manager', workstream: 'All', handle: 'a.sharma', status: 'Active', lastActive: '2026-10-20' },
  { id: 'us-002', name: 'Deepak Singh', role: 'Program Manager', workstream: 'All', handle: 'd.singh', status: 'Active', lastActive: '2026-10-20' },
  { id: 'us-003', name: 'Rahul Mehta', role: 'Workstream Lead', workstream: 'Technology & Infrastructure', handle: 'r.mehta', status: 'Active', lastActive: '2026-10-20' },
  { id: 'us-004', name: 'Sunita Iyer', role: 'Workstream Lead', workstream: 'Talent & Hiring', handle: 's.iyer', status: 'Active', lastActive: '2026-10-19' },
  { id: 'us-005', name: 'Prakash Rao', role: 'Workstream Lead', workstream: 'Legal & Compliance', handle: 'p.rao', status: 'Active', lastActive: '2026-10-17' },
  { id: 'us-006', name: 'Kavya Nair', role: 'Workstream Lead', workstream: 'Facilities & Workplace', handle: 'k.nair', status: 'Active', lastActive: '2026-10-19' },
  { id: 'us-007', name: 'Mohammed Khan', role: 'Workstream Lead', workstream: 'Operations Setup', handle: 'm.khan', status: 'Active', lastActive: '2026-10-16' },
  { id: 'us-008', name: 'Vikram Reddy', role: 'Workstream Lead', workstream: 'Finance & Procurement', handle: 'v.reddy', status: 'Active', lastActive: '2026-10-20' },
  { id: 'us-009', name: 'Claire Dubois', role: 'Steering Member', workstream: 'All', handle: 'c.dubois', status: 'Active', lastActive: '2026-10-16' },
  { id: 'us-010', name: 'Marc Lefèvre', role: 'Steering Member', workstream: 'All', handle: 'm.lefevre', status: 'Active', lastActive: '2026-10-15' },
  { id: 'us-011', name: 'Hannah Weber', role: 'Steering Member', workstream: 'All', handle: 'h.weber', status: 'Invited', lastActive: '' },
  { id: 'us-012', name: 'Thomas Moreau', role: 'Steering Member', workstream: 'All', handle: 't.moreau', status: 'Active', lastActive: '2026-10-16' },
  { id: 'us-013', name: 'Neha Kulkarni', role: 'Steering Member', workstream: 'All', handle: 'n.kulkarni', status: 'Active', lastActive: '2026-10-18' },
  { id: 'us-014', name: 'Arjun Desai', role: 'Viewer', workstream: 'Finance & Procurement', handle: 'a.desai', status: 'Active', lastActive: '2026-10-14' },
  { id: 'us-015', name: 'Priya Menon', role: 'Viewer', workstream: 'Talent & Hiring', handle: 'p.menon', status: 'Invited', lastActive: '' },
]

/** Modules in the left navigation (mirrors src/components/layout/AppShell.tsx). */
export const MODULES = ['Dashboard', 'Target Footprint', 'Program Planning', 'Workstreams', 'Resource Management', 'Financial Management', 'Transition Management', 'Risks & Issues', 'Governance', 'Value Realization', 'Reports', 'Documents', 'Settings'] as const
export type Permission = 'View' | 'Edit' | 'Approve' | '—'
/** module → role → permission */
export const PERMISSION_MATRIX: Record<(typeof MODULES)[number], Record<UserRole, Permission>> = {
  Dashboard: { 'Program Manager': 'Edit', 'Workstream Lead': 'View', 'Steering Member': 'View', Viewer: 'View' },
  'Target Footprint': { 'Program Manager': 'Approve', 'Workstream Lead': 'View', 'Steering Member': 'Approve', Viewer: 'View' },
  'Program Planning': { 'Program Manager': 'Approve', 'Workstream Lead': 'Edit', 'Steering Member': 'View', Viewer: 'View' },
  Workstreams: { 'Program Manager': 'Approve', 'Workstream Lead': 'Edit', 'Steering Member': 'View', Viewer: 'View' },
  'Resource Management': { 'Program Manager': 'Approve', 'Workstream Lead': 'Edit', 'Steering Member': 'View', Viewer: 'View' },
  'Financial Management': { 'Program Manager': 'Approve', 'Workstream Lead': 'Edit', 'Steering Member': 'View', Viewer: '—' },
  'Transition Management': { 'Program Manager': 'Approve', 'Workstream Lead': 'Edit', 'Steering Member': 'View', Viewer: 'View' },
  'Risks & Issues': { 'Program Manager': 'Approve', 'Workstream Lead': 'Edit', 'Steering Member': 'Approve', Viewer: 'View' },
  Governance: { 'Program Manager': 'Edit', 'Workstream Lead': 'View', 'Steering Member': 'Approve', Viewer: '—' },
  'Value Realization': { 'Program Manager': 'Approve', 'Workstream Lead': 'Edit', 'Steering Member': 'View', Viewer: 'View' },
  Reports: { 'Program Manager': 'Approve', 'Workstream Lead': 'Edit', 'Steering Member': 'View', Viewer: 'View' },
  Documents: { 'Program Manager': 'Approve', 'Workstream Lead': 'Edit', 'Steering Member': 'Approve', Viewer: 'View' },
  Settings: { 'Program Manager': 'Edit', 'Workstream Lead': 'View', 'Steering Member': '—', Viewer: '—' },
}

export interface LookupList {
  id: string
  name: string
  description: string
  values: string[]
}
export const seedLookups: LookupList[] = [
  { id: 'lk-status', name: 'Statuses', description: 'Milestone, activity and workstream status values', values: ['On Track', 'At Risk', 'Delayed', 'Pending', 'Not Started', 'Completed', 'In Progress'] },
  { id: 'lk-rag', name: 'RAG criteria', description: 'Thresholds used to derive the RAG indicator (WBS 1.3.8)', values: ['Green: ≤ 0 days delayed and ≤ 5% budget variance', 'Amber: 1–10 days delayed or 5–10% budget variance', 'Red: > 10 days delayed or > 10% budget variance', 'Red: critical-path activity with any delay'] },
  { id: 'lk-risk-cat', name: 'Risk categories', description: 'Categories used in the RAID register', values: ['People & Talent', 'Technology & Data', 'Facilities & Infra', 'Process & Operations', 'Legal & Compliance', 'Vendor & Third Party'] },
  { id: 'lk-priority', name: 'Priority levels', description: 'Impact / priority levels for risks, issues and decisions', values: ['Critical', 'High', 'Medium', 'Low'] },
  { id: 'lk-location', name: 'Locations', description: 'GCC sites and candidate cities', values: ['Pune', 'Bengaluru', 'Hyderabad', 'Chennai'] },
  { id: 'lk-cost', name: 'Cost categories', description: 'Budget and spend classification', values: ['People', 'Real Estate & Fit-out', 'IT Infrastructure', 'Software & Licences', 'Professional Services', 'Travel', 'Recruitment', 'Contingency'] },
  { id: 'lk-doctype', name: 'Document types', description: 'Types in the document repository', values: ['Charter', 'Plan', 'Register', 'Contract', 'Policy', 'Report', 'Template', 'Minutes', 'Deliverable'] },
]

export interface NotificationSettings {
  id: 'notifications'
  milestoneReminders: boolean
  milestoneReminderDays: number
  riskEscalationAlerts: boolean
  riskEscalationLevel: 'Critical' | 'High' | 'Medium'
  budgetVarianceAlerts: boolean
  budgetVarianceThresholdPct: number
  hiringGapAlerts: boolean
  hiringGapThresholdPct: number
  weeklyDigest: boolean
  weeklyDigestDay: string
  weeklyDigestTime: string
  signOffRequests: boolean
  channel: 'Email' | 'Teams' | 'Both'
}
export const seedNotificationSettings: NotificationSettings[] = [{
  id: 'notifications', milestoneReminders: true, milestoneReminderDays: 7, riskEscalationAlerts: true, riskEscalationLevel: 'High',
  budgetVarianceAlerts: true, budgetVarianceThresholdPct: 10, hiringGapAlerts: true, hiringGapThresholdPct: 15,
  weeklyDigest: true, weeklyDigestDay: 'Monday', weeklyDigestTime: '08:00', signOffRequests: true, channel: 'Both',
}]
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
