import { useState } from 'react'
import { Modal, Field, Input, Select, FormGrid } from './ui'
import { PHASES } from '../data/common'
import type { ProgramKpis } from '../data/shared'

/** Shared editor for the program-level KPI record ('programKpis'). Used by Dashboard and Program Planning. */
export function ProgramKpiEditor({ open, onClose, value, onSave }: { open: boolean; onClose: () => void; value: ProgramKpis; onSave: (v: ProgramKpis) => void }) {
  const [f, setF] = useState<ProgramKpis>(value)
  const num = (key: keyof ProgramKpis) => ({ type: 'number', step: 'any', value: f[key] as number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [key]: parseFloat(e.target.value) || 0 }) }) as const
  return (
    <Modal open={open} onClose={onClose} title="Update program KPIs" footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave(f)}>Save</button></>}>
      <FormGrid cols={3}>
        <Field label="Lifecycle phase"><Select options={PHASES} value={f.lifecyclePhase} onChange={(e) => setF({ ...f, lifecyclePhase: e.target.value as ProgramKpis['lifecyclePhase'] })} /></Field>
        <Field label="Timeline start"><Input type="date" value={f.timelineStart} onChange={(e) => setF({ ...f, timelineStart: e.target.value })} /></Field>
        <Field label="Timeline end"><Input type="date" value={f.timelineEnd} onChange={(e) => setF({ ...f, timelineEnd: e.target.value })} /></Field>
        <Field label="Program completion %"><Input {...num('programCompletion')} /></Field>
        <Field label="Milestone adherence %"><Input {...num('milestoneAdherence')} /></Field>
        <Field label="Readiness for transition %"><Input {...num('transitionReadiness')} /></Field>
        <Field label="Talent onboarded"><Input {...num('talentOnboarded')} /></Field>
        <Field label="Talent target"><Input {...num('talentTarget')} /></Field>
        <Field label="Open critical issues"><Input {...num('openCriticalIssues')} /></Field>
        <Field label="Approved budget (₹ Cr)"><Input {...num('approvedBudgetCr')} /></Field>
        <Field label="Actual spend (₹ Cr)"><Input {...num('actualSpendCr')} /></Field>
        <Field label="Forecast at completion (₹ Cr)"><Input {...num('forecastAtCompletionCr')} /></Field>
        <Field label="Target benefits (₹ Cr)"><Input {...num('targetBenefitsCr')} /></Field>
        <Field label="Projected benefits (₹ Cr)"><Input {...num('projectedBenefitsCr')} /></Field>
        <Field label="Go-live target"><Input type="date" value={f.goLiveTarget} onChange={(e) => setF({ ...f, goLiveTarget: e.target.value })} /></Field>
        <Field label="Readiness – People %"><Input {...num('readinessPeople')} /></Field>
        <Field label="Readiness – Process %"><Input {...num('readinessProcess')} /></Field>
        <Field label="Readiness – Technology %"><Input {...num('readinessTechnology')} /></Field>
        <Field label="Readiness – Controls & Compliance %"><Input {...num('readinessControls')} /></Field>
      </FormGrid>
    </Modal>
  )
}
