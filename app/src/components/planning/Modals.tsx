import { useEffect, useState } from 'react'
import { Modal, Field, Input, TextArea, Select, FormGrid, ConfirmDelete } from '../ui'
import { WORKSTREAMS, OWNERS, type Workstream, type Impact, type Status } from '../../data/common'
import type { Milestone, Dependency } from '../../data/shared'
import { PLAN_GROUPS, PLAN_STATUSES, type PlanItem, type PlanStatus } from '../../data/planning'

export const MS_STATUSES: Status[] = ['On Track', 'At Risk', 'Delayed', 'Pending', 'Not Started', 'Completed']
export const MS_PHASES: Milestone['phase'][] = ['Design', 'Build', 'Transition', 'Operate']
export const DEP_STATUSES: Status[] = ['On Track', 'At Risk', 'Delayed', 'Completed']
export const IMPACTS: Impact[] = ['Critical', 'High', 'Medium', 'Low']
export const DEP_TYPES = ['Physical Infrastructure', 'Regulatory Approvals', 'Vendor Contracts', 'IT Support Staffing', 'Network Readiness', 'Device Provisioning', 'System Access', 'Entity Registration', 'Policy Sign-off', 'Seat Availability', 'Occupancy Clearance', 'Knowledge Transfer', 'Wave Go/No-Go', 'Process Documentation', 'Vendor Onboarding', 'Service Readiness', 'Support Model', 'Budget Release', 'Purchase Orders', 'Hiring Wave Joiners', 'Role Approvals']

const Footer = ({ onClose, onSave, onDelete }: { onClose: () => void; onSave: () => void; onDelete?: () => void }) => (
  <>
    {onDelete && <span className="mr-auto"><ConfirmDelete onConfirm={onDelete} /></span>}
    <button className="btn-secondary" onClick={onClose}>Cancel</button>
    <button className="btn-primary" onClick={onSave}>Save</button>
  </>
)

/* ---------- Plan item (Gantt row) ---------- */
export function PlanItemModal({ open, value, isNew, codes, onClose, onSave, onDelete }: {
  open: boolean; value: PlanItem; isNew: boolean; codes: string[]; onClose: () => void; onSave: (v: PlanItem) => void; onDelete?: (id: string) => void
}) {
  const [f, setF] = useState<PlanItem>(value)
  useEffect(() => { if (open) setF(value) }, [open, value])
  const set = <K extends keyof PlanItem>(k: K, v: PlanItem[K]) => setF((p) => ({ ...p, [k]: v }))
  const groupNames = PLAN_GROUPS.map((g) => `${g.n}. ${g.name}`)
  return (
    <Modal open={open} onClose={onClose} title={isNew ? 'Add plan item' : `Edit plan item ${f.code}`} footer={<Footer onClose={onClose} onSave={() => f.name.trim() && onSave(f)} onDelete={!isNew && onDelete ? () => { onDelete(f.id); onClose() } : undefined} />}>
      <FormGrid cols={3}>
        <Field label="Plan group" className="col-span-2"><Select options={groupNames} value={`${f.group}. ${PLAN_GROUPS.find((g) => g.n === f.group)?.name ?? ''}`} onChange={(e) => { const g = PLAN_GROUPS[groupNames.indexOf(e.target.value)]; if (g) { set('group', g.n); set('workstream', g.workstream) } }} /></Field>
        <Field label="ID"><Input value={f.code} onChange={(e) => set('code', e.target.value)} placeholder="e.g. 2.4" /></Field>
        <Field label="Milestone / activity" className="col-span-2"><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Name" /></Field>
        <Field label="Workstream"><Select options={WORKSTREAMS} value={f.workstream} onChange={(e) => set('workstream', e.target.value as Workstream)} /></Field>
        <Field label="Start"><Input type="date" value={f.start} onChange={(e) => set('start', e.target.value)} /></Field>
        <Field label="End"><Input type="date" value={f.end} onChange={(e) => set('end', e.target.value)} /></Field>
        <Field label="Status"><Select options={PLAN_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as PlanStatus)} /></Field>
        <Field label="Owner"><Select options={OWNERS} value={f.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
        <Field label="Predecessor"><Select options={['None', ...codes.filter((c) => c !== f.code)]} value={f.predecessor ?? 'None'} onChange={(e) => set('predecessor', e.target.value === 'None' ? undefined : e.target.value)} /></Field>
        <Field label="Progress %"><Input type="number" min={0} max={100} value={f.progress} onChange={(e) => set('progress', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))} /></Field>
        <label className="flex items-center gap-2 text-[13px] text-ink-700 col-span-3 mt-1 cursor-pointer"><input type="checkbox" checked={!!f.critical} onChange={(e) => set('critical', e.target.checked)} /> On the critical path</label>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Milestone ---------- */
export function MilestoneModal({ open, value, isNew, onClose, onSave, onDelete }: {
  open: boolean; value: Milestone; isNew: boolean; onClose: () => void; onSave: (v: Milestone) => void; onDelete?: (id: string) => void
}) {
  const [f, setF] = useState<Milestone>(value)
  useEffect(() => { if (open) setF(value) }, [open, value])
  const set = <K extends keyof Milestone>(k: K, v: Milestone[K]) => setF((p) => ({ ...p, [k]: v }))
  return (
    <Modal open={open} onClose={onClose} title={isNew ? 'Add Milestone' : 'Edit Milestone'} footer={<Footer onClose={onClose} onSave={() => f.name.trim() && onSave(f)} onDelete={!isNew && onDelete ? () => { onDelete(f.id); onClose() } : undefined} />}>
      <FormGrid cols={3}>
        <Field label="Milestone" className="col-span-2"><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Milestone name" /></Field>
        <Field label="Workstream"><Select options={WORKSTREAMS} value={f.workstream} onChange={(e) => set('workstream', e.target.value as Workstream)} /></Field>
        <Field label="Start date"><Input type="date" value={f.startDate ?? ''} onChange={(e) => set('startDate', e.target.value || undefined)} /></Field>
        <Field label="Due date"><Input type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label="Status"><Select options={MS_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as Status)} /></Field>
        <Field label="Owner"><Select options={OWNERS} value={f.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
        <Field label="Phase"><Select options={MS_PHASES} value={f.phase} onChange={(e) => set('phase', e.target.value as Milestone['phase'])} /></Field>
        <Field label="Progress %"><Input type="number" min={0} max={100} value={f.progress ?? 0} onChange={(e) => set('progress', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))} /></Field>
        <label className="flex items-center gap-2 text-[13px] text-ink-700 col-span-3 mt-1 cursor-pointer"><input type="checkbox" checked={!!f.critical} onChange={(e) => set('critical', e.target.checked)} /> Key milestone (shown on Dashboard and "Key Upcoming Milestones")</label>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Dependency ---------- */
export function DependencyForm({ f, setF }: { f: Dependency; setF: (d: Dependency) => void }) {
  const set = <K extends keyof Dependency>(k: K, v: Dependency[K]) => setF({ ...f, [k]: v })
  return (
    <FormGrid cols={3}>
      <Field label="Workstream (depends)"><Select options={WORKSTREAMS} value={f.from} onChange={(e) => set('from', e.target.value as Workstream)} /></Field>
      <Field label="Depends on"><Select options={WORKSTREAMS} value={f.on} onChange={(e) => set('on', e.target.value as Workstream)} /></Field>
      <Field label="Type"><Select options={DEP_TYPES} value={f.type} onChange={(e) => set('type', e.target.value)} /></Field>
      <Field label="Description" className="col-span-3"><TextArea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <Field label="Impact"><Select options={IMPACTS} value={f.impact} onChange={(e) => set('impact', e.target.value as Impact)} /></Field>
      <Field label="Status"><Select options={DEP_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as Status)} /></Field>
      <Field label="Due date"><Input type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
      <Field label="Owner"><Select options={OWNERS} value={f.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
    </FormGrid>
  )
}

export function DependencyModal({ open, value, isNew, onClose, onSave, onDelete }: {
  open: boolean; value: Dependency; isNew: boolean; onClose: () => void; onSave: (v: Dependency) => void; onDelete?: (id: string) => void
}) {
  const [f, setF] = useState<Dependency>(value)
  useEffect(() => { if (open) setF(value) }, [open, value])
  return (
    <Modal open={open} onClose={onClose} title={isNew ? 'Add Dependency' : `Edit Dependency ${f.id.toUpperCase()}`} footer={<Footer onClose={onClose} onSave={() => onSave(f)} onDelete={!isNew && onDelete ? () => { onDelete(f.id); onClose() } : undefined} />}>
      <DependencyForm f={f} setF={setF} />
    </Modal>
  )
}
