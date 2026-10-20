import { useEffect, useState } from 'react'
import { Modal, Field, Input, TextArea, Select, FormGrid, ConfirmDelete } from '../ui'
import { OWNERS, TODAY } from '../../data/common'
import { RISK_CATEGORIES, LIKELIHOOD, IMPACT_SCALE, type RaidItem, isOpen } from '../../data/shared'
import { RAID_STATUSES, RAID_LEVELS, RAID_WORKSTREAMS, ESCALATION_STATUSES, nextCode } from '../../data/risks'
import { uid } from '../../store/useStore'

export type RaidDraft = Omit<RaidItem, 'id'> & { id?: string }

export function blankRaid(raid: RaidItem[], type: 'Risk' | 'Issue' = 'Risk'): RaidDraft {
  return {
    code: nextCode(raid, type), type, title: '', shortTitle: '', workstream: RAID_WORKSTREAMS[0], category: 'Technology & Data', level: 'Medium', status: 'Open',
    owner: OWNERS[0], dueDate: '2026-11-15', openedOn: TODAY, likelihood: 'Medium', impact: 'Medium', impactScore: 5.0, description: '', mitigation: '', escalated: false, escalationStatus: undefined,
  }
}

/**
 * Add / edit form for a shared RaidItem (risk or issue). All fields editable.
 * `onSave` receives a complete RaidItem (new id assigned when missing).
 */
export function RaidModal({ open, onClose, value, raid, onSave, onDelete }: {
  open: boolean; onClose: () => void; value: RaidDraft | null; raid: RaidItem[]
  onSave: (item: RaidItem) => void; onDelete?: (id: string) => void
}) {
  const [f, setF] = useState<RaidDraft>(value ?? blankRaid(raid))
  useEffect(() => { if (open) setF(value ?? blankRaid(raid)) }, [open, value]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof RaidDraft>(k: K, v: RaidDraft[K]) => setF((p) => ({ ...p, [k]: v }))
  const isEdit = !!f.id
  const save = (overrides: Partial<RaidItem> = {}) => {
    if (!f.title.trim()) { window.alert('Please enter a title.'); return }
    onSave({ ...f, ...overrides, id: f.id ?? uid(f.type === 'Risk' ? 'r' : 'i'), shortTitle: f.shortTitle?.trim() || undefined, escalationStatus: f.escalated ? (f.escalationStatus ?? 'Awaiting Decision') : undefined } as RaidItem)
  }
  const wsOptions = RAID_WORKSTREAMS.includes(f.workstream) ? RAID_WORKSTREAMS : [f.workstream, ...RAID_WORKSTREAMS]
  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit ${f.type} ${f.code}` : `Add ${f.type}`} width="max-w-3xl"
      footer={<>
        {isEdit && onDelete && <ConfirmDelete onConfirm={() => onDelete(f.id!)} />}
        {isEdit && isOpen(f as RaidItem) && <button className="btn-secondary" onClick={() => save({ status: f.type === 'Risk' ? 'Closed' : 'Resolved' })}>Mark resolved</button>}
        <span className="flex-1" />
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => save()}>{isEdit ? 'Save changes' : `Add ${f.type}`}</button>
      </>}>
      <FormGrid cols={3}>
        <Field label="Type"><Select options={['Risk', 'Issue']} value={f.type} onChange={(e) => { const t = e.target.value as 'Risk' | 'Issue'; setF((p) => ({ ...p, type: t, code: p.id ? p.code : nextCode(raid, t) })) }} /></Field>
        <Field label="ID"><Input value={f.code} onChange={(e) => set('code', e.target.value)} /></Field>
        <Field label="Workstream"><Select options={wsOptions} value={f.workstream} onChange={(e) => set('workstream', e.target.value)} /></Field>
        <Field label="Title" className="col-span-2"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Describe the risk or issue" /></Field>
        <Field label="Short title (dashboard label)"><Input value={f.shortTitle ?? ''} onChange={(e) => set('shortTitle', e.target.value)} /></Field>
        <Field label="Category"><Select options={RISK_CATEGORIES} value={f.category} onChange={(e) => set('category', e.target.value as RaidItem['category'])} /></Field>
        <Field label="Risk level"><Select options={RAID_LEVELS} value={f.level} onChange={(e) => set('level', e.target.value as RaidItem['level'])} /></Field>
        <Field label="Status"><Select options={RAID_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as RaidItem['status'])} /></Field>
        <Field label="Likelihood"><Select options={LIKELIHOOD} value={f.likelihood} onChange={(e) => set('likelihood', e.target.value as RaidItem['likelihood'])} /></Field>
        <Field label="Impact"><Select options={IMPACT_SCALE} value={f.impact} onChange={(e) => set('impact', e.target.value as RaidItem['impact'])} /></Field>
        <Field label="Impact score (0–10)"><Input type="number" step="0.1" min={0} max={10} value={f.impactScore} onChange={(e) => set('impactScore', Math.max(0, Math.min(10, parseFloat(e.target.value) || 0)))} /></Field>
        <Field label="Owner"><Select options={OWNERS.includes(f.owner as (typeof OWNERS)[number]) ? OWNERS : [f.owner, ...OWNERS]} value={f.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
        <Field label="Opened on"><Input type="date" value={f.openedOn} onChange={(e) => set('openedOn', e.target.value)} /></Field>
        <Field label="Due date"><Input type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label="Description" className="col-span-3"><TextArea value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Mitigation / response plan" className="col-span-3"><TextArea value={f.mitigation ?? ''} onChange={(e) => set('mitigation', e.target.value)} /></Field>
        <div className="col-span-3 flex items-center gap-4 pt-1">
          <label className="inline-flex items-center gap-2 text-[13px] text-ink-900 cursor-pointer"><input type="checkbox" checked={!!f.escalated} onChange={(e) => set('escalated', e.target.checked)} /> Escalated to steering committee</label>
          {f.escalated && <Field label="Escalation status" className="w-56"><Select options={ESCALATION_STATUSES} value={f.escalationStatus ?? 'Awaiting Decision'} onChange={(e) => set('escalationStatus', e.target.value as RaidItem['escalationStatus'])} /></Field>}
          <label className="inline-flex items-center gap-2 text-[13px] text-ink-900 cursor-pointer ml-auto"><input type="checkbox" checked={!!f.keyRisk} onChange={(e) => set('keyRisk', e.target.checked)} /> Pin to Dashboard key risks</label>
        </div>
      </FormGrid>
    </Modal>
  )
}
