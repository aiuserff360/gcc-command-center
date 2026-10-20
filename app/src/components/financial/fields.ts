import { FIN_WORKSTREAMS, type BudgetLine, type FinancialMilestone, type Benefit } from '../../data/financial'
import type { FieldSpec } from './RecordModal'

// Money fields (`money: true`) are stored in ₹ Cr; RecordModal shows/edits them in the selected currency and appends the unit to the label.
export const BUDGET_LINE_FIELDS: FieldSpec<BudgetLine>[] = [
  { key: 'workstream', label: 'Workstream', span: true },
  { key: 'approvedCr', label: 'Approved budget', type: 'number', money: true },
  { key: 'actualCr', label: 'Actual spend', type: 'number', money: true },
  { key: 'forecastCr', label: 'Forecast at completion', type: 'number', money: true },
  { key: 'setupShare', label: 'Setup (Capex) share (0–1)', type: 'number', step: 0.05 },
  { key: 'owner', label: 'Budget owner' },
]
export const MILESTONE_FIELDS: FieldSpec<FinancialMilestone>[] = [
  { key: 'name', label: 'Milestone', span: true },
  { key: 'amountCr', label: 'Amount', type: 'number', money: true },
  { key: 'dueDate', label: 'Due date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Completed', 'On Track', 'At Risk', 'Pending', 'Not Started', 'Delayed'] },
  { key: 'workstream', label: 'Workstream', type: 'select', options: FIN_WORKSTREAMS },
  { key: 'owner', label: 'Owner' },
]
export const BENEFIT_FIELDS: FieldSpec<Benefit>[] = [
  { key: 'area', label: 'Benefit area', span: true },
  { key: 'targetCr', label: 'Target', type: 'number', money: true },
  { key: 'forecastCr', label: 'Forecast', type: 'number', money: true },
  { key: 'status', label: 'Status', type: 'select', options: ['On Track', 'At Risk', 'Delayed', 'Completed'] },
  { key: 'owner', label: 'Owner' },
  { key: 'startQuarter', label: 'Realization starts', type: 'select', options: ['Q1 FY27', 'Q2 FY27', 'Q3 FY27', 'Q4 FY27', 'Q1 FY28', 'Q2 FY28', 'Q3 FY28', 'Q4 FY28'] },
  { key: 'description', label: 'Description', type: 'textarea' },
]
