/**
 * Integrations page – seed data and types.
 * Collections: 'connectors', 'syncLog', 'dataFlows', 'fieldMappings', 'webhooks', 'integrationSettings'
 */
export type ConnectorStatus = 'Connected' | 'Not Connected' | 'Error' | 'Paused'
export type ConnectorCategory = 'ERP / Finance' | 'HR / HCM' | 'Recruiting' | 'Scheduling' | 'Work Management' | 'ITSM' | 'Collaboration' | 'Content' | 'Analytics'
export const CONNECTOR_STATUSES: ConnectorStatus[] = ['Connected', 'Not Connected', 'Error', 'Paused']
export const CONNECTOR_CATEGORIES: ConnectorCategory[] = ['ERP / Finance', 'HR / HCM', 'Recruiting', 'Scheduling', 'Work Management', 'ITSM', 'Collaboration', 'Content', 'Analytics']
export const FREQUENCIES = ['Every 15 min', 'Hourly', 'Every 4 hours', 'Daily 02:00', 'Daily 06:00', 'Weekly', 'On event', 'Manual'] as const

export interface Connector {
  id: string
  name: string
  category: ConnectorCategory
  status: ConnectorStatus
  lastSync: string // ISO datetime
  frequency: string
  owner: string
  recordsSynced: number
  description: string
  flows: string
  abbr: string
  color: string
}

export const seedConnectors: Connector[] = [
  { id: 'cn-sap', name: 'SAP S/4HANA', category: 'ERP / Finance', status: 'Connected', lastSync: '2026-10-20T07:45:00', frequency: 'Every 4 hours', owner: 'V. Reddy', recordsSynced: 18420, description: 'Finance actuals, PO commitments and cost-center postings for budget vs actual tracking.', flows: 'Finance actuals, PO commitments', abbr: 'SAP', color: '#1E5BBE' },
  { id: 'cn-workday', name: 'Workday', category: 'HR / HCM', status: 'Connected', lastSync: '2026-10-20T06:00:00', frequency: 'Daily 06:00', owner: 'S. Iyer', recordsSynced: 2310, description: 'Headcount, positions and open requisitions for the workforce plan.', flows: 'Headcount, requisitions', abbr: 'WD', color: '#F59E0B' },
  { id: 'cn-darwinbox', name: 'Darwinbox', category: 'HR / HCM', status: 'Connected', lastSync: '2026-10-20T06:10:00', frequency: 'Daily 06:00', owner: 'S. Iyer', recordsSynced: 1865, description: 'India HRMS – employee master, joiners, payroll inputs and leave.', flows: 'HRMS employee master', abbr: 'DB', color: '#8B5CF6' },
  { id: 'cn-greenhouse', name: 'Greenhouse (ATS)', category: 'Recruiting', status: 'Connected', lastSync: '2026-10-20T08:00:00', frequency: 'Hourly', owner: 'S. Iyer', recordsSynced: 4120, description: 'Hiring pipeline – candidates, stages, offers and joining dates.', flows: 'Hiring pipeline', abbr: 'GH', color: '#16A34A' },
  { id: 'cn-msproject', name: 'Microsoft Project / Planner', category: 'Scheduling', status: 'Connected', lastSync: '2026-10-20T07:30:00', frequency: 'Every 4 hours', owner: 'D. Singh', recordsSynced: 1290, description: 'Integrated program schedule – tasks, baseline and forecast dates, milestones.', flows: 'Schedule', abbr: 'MSP', color: '#14B8A6' },
  { id: 'cn-jira', name: 'Jira', category: 'Work Management', status: 'Error', lastSync: '2026-10-19T22:00:00', frequency: 'Hourly', owner: 'R. Mehta', recordsSynced: 3860, description: 'Workstream initiatives, epics and story progress.', flows: 'Initiatives', abbr: 'JR', color: '#0EA5E9' },
  { id: 'cn-servicenow', name: 'ServiceNow', category: 'ITSM', status: 'Connected', lastSync: '2026-10-20T08:05:00', frequency: 'Every 15 min', owner: 'R. Mehta', recordsSynced: 2740, description: 'IT provisioning tickets – laptops, access, network requests for onboarding.', flows: 'IT provisioning tickets', abbr: 'SN', color: '#16A34A' },
  { id: 'cn-teams', name: 'Microsoft Teams', category: 'Collaboration', status: 'Connected', lastSync: '2026-10-20T08:12:00', frequency: 'On event', owner: 'D. Singh', recordsSynced: 612, description: 'Notifications – milestone reminders, escalations and report distribution to channels.', flows: 'Notifications', abbr: 'MT', color: '#5B59C2' },
  { id: 'cn-sharepoint', name: 'SharePoint', category: 'Content', status: 'Paused', lastSync: '2026-10-18T02:00:00', frequency: 'Daily 02:00', owner: 'D. Singh', recordsSynced: 1480, description: 'Document repository sync – metadata, versions and sign-off status.', flows: 'Documents', abbr: 'SP', color: '#0B2240' },
  { id: 'cn-powerbi', name: 'Power BI', category: 'Analytics', status: 'Not Connected', lastSync: '', frequency: 'Daily 06:00', owner: 'A. Sharma', recordsSynced: 0, description: 'Export of program datasets for enterprise reporting.', flows: 'Export', abbr: 'PBI', color: '#F97316' },
]

export type SyncStatus = 'Success' | 'Error' | 'Warning'
export interface SyncLogEntry {
  id: string
  timestamp: string // ISO datetime
  connector: string
  flow: string
  records: number
  status: SyncStatus
  message: string
}

/* 14 days of synthetic sync history ending today (2026-10-20) */
function buildSyncLog(): SyncLogEntry[] {
  const out: SyncLogEntry[] = []
  const base: [string, string, number, string][] = [
    ['SAP S/4HANA', 'Finance actuals', 420, '07:45'], ['SAP S/4HANA', 'PO commitments', 180, '03:45'],
    ['Workday', 'Headcount', 95, '06:00'], ['Workday', 'Requisitions', 40, '06:02'],
    ['Darwinbox', 'Employee master', 110, '06:10'], ['Greenhouse (ATS)', 'Hiring pipeline', 260, '08:00'],
    ['Microsoft Project / Planner', 'Schedule', 150, '07:30'], ['Jira', 'Initiatives', 310, '22:00'],
    ['ServiceNow', 'IT provisioning tickets', 230, '08:05'], ['Microsoft Teams', 'Notifications', 45, '08:12'], ['SharePoint', 'Documents', 120, '02:00'],
  ]
  let n = 1
  for (let d = 13; d >= 0; d--) {
    const date = new Date(2026, 9, 20 - d)
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    base.forEach(([connector, flow, rec, time], i) => {
      if (connector === 'SharePoint' && d < 2) return // paused
      if (d === 0 && time > '08:20') return // not yet run today
      const wobble = ((d * 7 + i * 13) % 11) - 5
      const records = Math.max(0, rec + wobble * Math.round(rec / 40))
      let status: SyncStatus = 'Success'
      let message = `${records} records synced`
      if (connector === 'Jira' && d === 1 && time === '22:00') { status = 'Error'; message = '401 Unauthorized – API token expired' }
      else if (connector === 'SAP S/4HANA' && d === 4 && flow === 'PO commitments') { status = 'Warning'; message = '12 records skipped – missing cost center' }
      else if (connector === 'Workday' && d === 9 && flow === 'Headcount') { status = 'Error'; message = 'Timeout after 120s – retried successfully' }
      else if (connector === 'Greenhouse (ATS)' && d === 0) { status = 'Warning'; message = '3 candidates without requisition mapping' }
      out.push({ id: `sl-${String(n++).padStart(3, '0')}`, timestamp: `${iso}T${time}:00`, connector, flow, records: status === 'Error' ? 0 : records, status, message })
    })
  }
  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
export const seedSyncLog: SyncLogEntry[] = buildSyncLog()

export type FlowDirection = 'Inbound' | 'Outbound' | 'Bidirectional'
export const TARGET_MODULES = ['Financial Management', 'Resource Management', 'Program Planning', 'Workstreams', 'Risks & Issues', 'Transition Management', 'Documents', 'Reports', 'Governance'] as const
export interface DataFlow {
  id: string
  source: string
  target: string
  entity: string
  direction: FlowDirection
  cadence: string
  status: 'Active' | 'Paused' | 'Error' | 'Draft'
  lastRun: string
}
export const seedDataFlows: DataFlow[] = [
  { id: 'df-001', source: 'SAP S/4HANA', target: 'Financial Management', entity: 'Cost center actuals', direction: 'Inbound', cadence: 'Every 4 hours', status: 'Active', lastRun: '2026-10-20T07:45:00' },
  { id: 'df-002', source: 'SAP S/4HANA', target: 'Financial Management', entity: 'PO commitments', direction: 'Inbound', cadence: 'Every 4 hours', status: 'Active', lastRun: '2026-10-20T03:45:00' },
  { id: 'df-003', source: 'Workday', target: 'Resource Management', entity: 'Headcount & positions', direction: 'Inbound', cadence: 'Daily 06:00', status: 'Active', lastRun: '2026-10-20T06:00:00' },
  { id: 'df-004', source: 'Workday', target: 'Resource Management', entity: 'Open requisitions', direction: 'Inbound', cadence: 'Daily 06:00', status: 'Active', lastRun: '2026-10-20T06:02:00' },
  { id: 'df-005', source: 'Darwinbox', target: 'Resource Management', entity: 'Joiners & employee master', direction: 'Inbound', cadence: 'Daily 06:00', status: 'Active', lastRun: '2026-10-20T06:10:00' },
  { id: 'df-006', source: 'Greenhouse (ATS)', target: 'Resource Management', entity: 'Hiring pipeline stages', direction: 'Inbound', cadence: 'Hourly', status: 'Active', lastRun: '2026-10-20T08:00:00' },
  { id: 'df-007', source: 'Microsoft Project / Planner', target: 'Program Planning', entity: 'Tasks & milestones', direction: 'Bidirectional', cadence: 'Every 4 hours', status: 'Active', lastRun: '2026-10-20T07:30:00' },
  { id: 'df-008', source: 'Jira', target: 'Workstreams', entity: 'Initiatives & epics', direction: 'Inbound', cadence: 'Hourly', status: 'Error', lastRun: '2026-10-19T22:00:00' },
  { id: 'df-009', source: 'ServiceNow', target: 'Transition Management', entity: 'IT provisioning tickets', direction: 'Inbound', cadence: 'Every 15 min', status: 'Active', lastRun: '2026-10-20T08:05:00' },
  { id: 'df-010', source: 'GCC Command Center', target: 'Microsoft Teams', entity: 'Milestone & escalation alerts', direction: 'Outbound', cadence: 'On event', status: 'Active', lastRun: '2026-10-20T08:12:00' },
  { id: 'df-011', source: 'SharePoint', target: 'Documents', entity: 'Document metadata & versions', direction: 'Bidirectional', cadence: 'Daily 02:00', status: 'Paused', lastRun: '2026-10-18T02:00:00' },
  { id: 'df-012', source: 'GCC Command Center', target: 'Power BI', entity: 'Program KPI dataset', direction: 'Outbound', cadence: 'Daily 06:00', status: 'Draft', lastRun: '' },
  { id: 'df-013', source: 'GCC Command Center', target: 'Reports', entity: 'Weekly update distribution', direction: 'Outbound', cadence: 'Weekly', status: 'Active', lastRun: '2026-10-19T08:00:00' },
]

export interface FieldMapping {
  id: string
  connector: string
  sourceField: string
  targetField: string
  transformation: string
}
export const seedFieldMappings: FieldMapping[] = [
  { id: 'fm-001', connector: 'SAP S/4HANA', sourceField: 'KOSTL (Cost Center)', targetField: 'workstream', transformation: 'Lookup: cost-center → workstream map' },
  { id: 'fm-002', connector: 'SAP S/4HANA', sourceField: 'WRBTR (Amount in doc. currency)', targetField: 'actualCr', transformation: 'INR ÷ 1,00,00,000; round 2' },
  { id: 'fm-003', connector: 'SAP S/4HANA', sourceField: 'BUDAT (Posting date)', targetField: 'postingDate', transformation: 'YYYYMMDD → ISO date' },
  { id: 'fm-004', connector: 'SAP S/4HANA', sourceField: 'EBELN (PO number)', targetField: 'commitmentRef', transformation: 'None' },
  { id: 'fm-005', connector: 'SAP S/4HANA', sourceField: 'SAKNR (GL account)', targetField: 'costCategory', transformation: 'Lookup: GL range → cost category' },
  { id: 'fm-006', connector: 'Workday', sourceField: 'Position_ID', targetField: 'positionId', transformation: 'None' },
  { id: 'fm-007', connector: 'Workday', sourceField: 'Job_Profile', targetField: 'role', transformation: 'Trim; title case' },
  { id: 'fm-008', connector: 'Workday', sourceField: 'Supervisory_Organization', targetField: 'workstream', transformation: 'Lookup: sup-org → workstream map' },
  { id: 'fm-009', connector: 'Workday', sourceField: 'Hire_Date', targetField: 'joiningDate', transformation: 'ISO date' },
  { id: 'fm-010', connector: 'Workday', sourceField: 'Worker_Status', targetField: 'status', transformation: 'Active→Onboarded, Pre-hire→Offer Accepted' },
  { id: 'fm-011', connector: 'Darwinbox', sourceField: 'employee_code', targetField: 'employeeId', transformation: 'None' },
  { id: 'fm-012', connector: 'Darwinbox', sourceField: 'date_of_joining', targetField: 'joiningDate', transformation: 'DD-MM-YYYY → ISO date' },
  { id: 'fm-013', connector: 'Darwinbox', sourceField: 'location_name', targetField: 'location', transformation: 'Lookup: Darwinbox location → GCC location' },
  { id: 'fm-014', connector: 'Greenhouse (ATS)', sourceField: 'application.current_stage.name', targetField: 'funnelStage', transformation: 'Map: Application Review→Screened, Onsite→Interviewed, Offer→Offered' },
  { id: 'fm-015', connector: 'Greenhouse (ATS)', sourceField: 'job.requisition_id', targetField: 'requisitionId', transformation: 'None' },
  { id: 'fm-016', connector: 'Greenhouse (ATS)', sourceField: 'offer.starts_at', targetField: 'expectedJoining', transformation: 'ISO date' },
  { id: 'fm-017', connector: 'Microsoft Project / Planner', sourceField: 'Task.Name', targetField: 'activity.name', transformation: 'None' },
  { id: 'fm-018', connector: 'Microsoft Project / Planner', sourceField: 'Task.BaselineFinish', targetField: 'activity.baselineEnd', transformation: 'ISO date' },
  { id: 'fm-019', connector: 'Microsoft Project / Planner', sourceField: 'Task.PercentComplete', targetField: 'activity.percentComplete', transformation: 'Integer 0–100' },
  { id: 'fm-020', connector: 'Microsoft Project / Planner', sourceField: 'Task.Milestone', targetField: 'milestone.flag', transformation: 'Boolean' },
  { id: 'fm-021', connector: 'Jira', sourceField: 'issue.fields.summary', targetField: 'initiative.name', transformation: 'None' },
  { id: 'fm-022', connector: 'Jira', sourceField: 'issue.fields.status.name', targetField: 'initiative.status', transformation: 'To Do→Not Started, In Progress→In Progress, Done→Completed' },
  { id: 'fm-023', connector: 'Jira', sourceField: 'issue.fields.customfield_10045 (Workstream)', targetField: 'workstream', transformation: 'Lookup: Jira component → workstream' },
  { id: 'fm-024', connector: 'ServiceNow', sourceField: 'sc_request.number', targetField: 'ticketRef', transformation: 'None' },
  { id: 'fm-025', connector: 'ServiceNow', sourceField: 'sc_request.state', targetField: 'provisioningStatus', transformation: 'Map state code → Pending/In Progress/Completed' },
  { id: 'fm-026', connector: 'ServiceNow', sourceField: 'sc_request.requested_for.employee_number', targetField: 'employeeId', transformation: 'None' },
  { id: 'fm-027', connector: 'SharePoint', sourceField: 'ListItem.Title', targetField: 'document.title', transformation: 'None' },
  { id: 'fm-028', connector: 'SharePoint', sourceField: 'ListItem.OData__UIVersionString', targetField: 'document.version', transformation: 'None' },
  { id: 'fm-029', connector: 'SharePoint', sourceField: 'ListItem.ApprovalStatus', targetField: 'document.status', transformation: '0→Approved, 1→Rejected, 2→In Review, 3→Draft' },
]

export interface Webhook {
  id: string
  event: string
  url: string
  status: 'Active' | 'Paused' | 'Failing'
  lastDelivery: string
  secret: string
}
export const WEBHOOK_EVENTS = ['milestone.status_changed', 'risk.escalated', 'issue.created', 'budget.variance_exceeded', 'report.published', 'document.approved', 'hiring.position_filled', 'connector.sync_failed'] as const
export const seedWebhooks: Webhook[] = [
  { id: 'wh-001', event: 'risk.escalated', url: 'https://hooks.teams.microsoft.com/gcc-program/escalations', status: 'Active', lastDelivery: '2026-10-19T16:04:00', secret: 'whsec_4f9a' },
  { id: 'wh-002', event: 'milestone.status_changed', url: 'https://hooks.teams.microsoft.com/gcc-program/milestones', status: 'Active', lastDelivery: '2026-10-20T07:31:00', secret: 'whsec_b21c' },
  { id: 'wh-003', event: 'report.published', url: 'https://sharepoint.corp/_api/gcc/reports/ingest', status: 'Active', lastDelivery: '2026-10-16T17:02:00', secret: 'whsec_e7d0' },
  { id: 'wh-004', event: 'budget.variance_exceeded', url: 'https://finance-alerts.corp/api/v1/gcc', status: 'Failing', lastDelivery: '2026-10-18T10:15:00', secret: 'whsec_9c3e' },
  { id: 'wh-005', event: 'document.approved', url: 'https://sharepoint.corp/_api/gcc/documents/signoff', status: 'Paused', lastDelivery: '2026-10-14T11:40:00', secret: 'whsec_1a8f' },
]

export interface IntegrationSettings {
  id: 'settings'
  syncWindowStart: string
  syncWindowEnd: string
  timezone: string
  retryCount: number
  retryBackoffMin: number
  failAfterMinutes: number
  notifyOnError: boolean
  notifyOnWarning: boolean
  notifyOnSuccess: boolean
  notifyChannel: 'Email' | 'Teams' | 'Both'
  notifyRecipients: string
  errorThreshold: number
  apiKey: string
  apiKeyCreated: string
}
export const seedIntegrationSettings: IntegrationSettings[] = [{
  id: 'settings', syncWindowStart: '01:00', syncWindowEnd: '06:00', timezone: 'Asia/Kolkata (IST)', retryCount: 3, retryBackoffMin: 15, failAfterMinutes: 120,
  notifyOnError: true, notifyOnWarning: true, notifyOnSuccess: false, notifyChannel: 'Teams', notifyRecipients: 'd.singh, r.mehta', errorThreshold: 3,
  apiKey: 'gcc_live_7Kp2mQ9vX4nR8sT1wB6yH3jL5aZ0cE', apiKeyCreated: '2026-09-02',
}]

export const SAMPLE_PAYLOADS: Record<string, object> = {
  'milestone.status_changed': { event: 'milestone.status_changed', timestamp: '2026-10-20T07:31:00+05:30', data: { id: 'ms-001', name: 'IT infrastructure readiness', workstream: 'Technology & Infrastructure', previousStatus: 'On Track', status: 'At Risk', dueDate: '2026-10-23', owner: 'R. Mehta' } },
  'risk.escalated': { event: 'risk.escalated', timestamp: '2026-10-19T16:04:00+05:30', data: { code: 'R-004', title: 'Network provisioning delay', level: 'High', impactScore: 8.5, escalatedTo: 'Steering Committee', owner: 'R. Mehta' } },
  'issue.created': { event: 'issue.created', timestamp: '2026-10-19T11:20:00+05:30', data: { code: 'I-014', title: 'Vendor contract approval pending', workstream: 'Finance & Procurement', level: 'Medium', owner: 'V. Reddy' } },
  'budget.variance_exceeded': { event: 'budget.variance_exceeded', timestamp: '2026-10-18T10:15:00+05:30', data: { workstream: 'Finance & Procurement', approvedCr: 0.1, forecastCr: 0.2, variancePct: 100, threshold: 10 } },
  'report.published': { event: 'report.published', timestamp: '2026-10-16T17:02:00+05:30', data: { id: 'rp-004', name: 'Steering Committee Dashboard – Oct 2026', type: 'Monthly', recipients: 9, url: 'https://gcc.corp/#/reports' } },
  'document.approved': { event: 'document.approved', timestamp: '2026-10-14T11:40:00+05:30', data: { id: 'doc-001', title: 'Program Charter v2.1', version: '2.1', approvedBy: 'Global COO' } },
  'hiring.position_filled': { event: 'hiring.position_filled', timestamp: '2026-10-20T08:00:00+05:30', data: { requisitionId: 'REQ-2041', role: 'Network Engineer', workstream: 'Technology & Infrastructure', joiningDate: '2026-11-02' } },
  'connector.sync_failed': { event: 'connector.sync_failed', timestamp: '2026-10-20T08:00:00+05:30', data: { connector: 'Jira', flow: 'Initiatives', error: '401 Unauthorized – API token expired', retries: 3 } },
}

export const fmtDateTime = (iso: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
export const relTime = (iso: string, now = '2026-10-20T08:20:00') => {
  if (!iso) return 'Never'
  const diff = Math.round((new Date(now).getTime() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${diff} min ago`
  if (diff < 1440) return `${Math.floor(diff / 60)} h ago`
  return `${Math.floor(diff / 1440)} d ago`
}
export const randomKey = () => 'gcc_live_' + Array.from({ length: 30 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 59)]).join('')
