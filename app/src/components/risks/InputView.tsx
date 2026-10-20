/**
 * Risks and Issues – Input view: the registers, mitigation actions, escalations, insights and KPI settings
 * behind the risk dashboards. Inline edits write straight to the collections; the pencil opens RaidModal.
 */
import { useMemo, useState } from 'react'
import { CheckCircle2, RotateCcw, Save, Check } from 'lucide-react'
import { Card, Field, Input, FormGrid, Badge } from '../ui'
import { Grid, Row, Td, TextCell, NumCell, DateCell, SelectCell, CheckCell, RemoveBtn, EditBtn, AddBtn, GridToolbar } from '../ui/InlineGrid'
import { InputLayout } from '../layout/InputLayout'
import { uid, type useCollection } from '../../store/useStore'
import { OWNERS, TODAY } from '../../data/common'
import { RISK_CATEGORIES, LIKELIHOOD, IMPACT_SCALE, isOpen, daysOpen, type RaidItem } from '../../data/shared'
import { RAID_STATUSES, RAID_LEVELS, RAID_WORKSTREAMS, MITIGATION_STATUSES, EFFECTIVENESS, INSIGHT_ICONS, nextCode, type RiskSettings, type RaidTrendPoint, type RiskInsight, type MitigationAction, type EscalationDecision } from '../../data/risks'
import { EscalationsTab } from './EscalationsTab'

type Coll<T extends { id: string }> = ReturnType<typeof useCollection<T>>

export interface RisksInputProps {
  raidC: Coll<RaidItem>
  settingsC: Coll<RiskSettings>
  trendC: Coll<RaidTrendPoint>
  insightsC: Coll<RiskInsight>
  mitC: Coll<MitigationAction>
  escC: Coll<EscalationDecision>
  settings: RiskSettings
  openRaid: (r: RaidItem) => void
}

/* ================================================================== */
/* Risk / issue register grid                                          */
/* ================================================================== */
function RaidGrid({ type, raidC, openRaid }: { type: 'Risk' | 'Issue'; raidC: Coll<RaidItem>; openRaid: (r: RaidItem) => void }) {
  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('All')
  const [showClosed, setShowClosed] = useState(true)
  const all = raidC.items.filter((r) => r.type === type)
  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const num = (c: string) => parseInt(c.split('-')[1] ?? '0', 10) || 0
    return all.filter((r) => (showClosed || isOpen(r)) && (fStatus === 'All' || r.status === fStatus) && (!ql || [r.code, r.title, r.workstream, r.owner, r.category].join(' ').toLowerCase().includes(ql)))
      .sort((a, b) => (isOpen(a) ? 0 : 1) - (isOpen(b) ? 0 : 1) || b.impactScore - a.impactScore || num(a.code) - num(b.code))
  }, [all, q, fStatus, showClosed])
  const set = <K extends keyof RaidItem>(r: RaidItem, k: K, v: RaidItem[K]) => raidC.update({ ...r, [k]: v })
  const add = () => raidC.add({ id: uid(type === 'Risk' ? 'r' : 'i'), code: nextCode(raidC.items, type), type, title: '', workstream: RAID_WORKSTREAMS[0], category: 'Technology & Data', level: 'Medium', status: 'Open', owner: OWNERS[0], dueDate: TODAY, openedOn: TODAY, likelihood: 'Medium', impact: 'Medium', impactScore: 5, description: '', mitigation: '' })
  const resolve = (r: RaidItem) => raidC.update({ ...r, status: type === 'Risk' ? 'Closed' : 'Resolved' })
  const reopen = (r: RaidItem) => raidC.update({ ...r, status: 'Open' })
  const openN = all.filter(isOpen).length
  const label = type === 'Risk' ? 'risk' : 'issue'
  return (
    <Card title={type === 'Risk' ? 'Risk register' : 'Issue register'} subtitle={`${openN} open · ${all.length - openN} ${type === 'Risk' ? 'closed' : 'resolved'}. Edit inline, or open the full form for description, mitigation plan, escalation and the dashboard pin.`} action={<AddBtn label={`Add ${label}`} onClick={add} />}>
      <GridToolbar q={q} onQ={setQ} placeholder={`Search ${label}s…`} count={rows.length}>
        <select className="input py-1.5 w-auto text-[12.5px]" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>{['All', ...RAID_STATUSES].map((s) => <option key={s}>{s}</option>)}</select>
        <label className="inline-flex items-center gap-1.5 cursor-pointer text-ink-700"><input type="checkbox" className="accent-brand-600" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Include {type === 'Risk' ? 'closed' : 'resolved'}</label>
      </GridToolbar>
      <Grid count={rows.length} minWidth={type === 'Risk' ? 1500 : 1300} headers={['ID', 'Title', 'Workstream', 'Category', type === 'Risk' ? 'Risk level' : 'Severity', 'Status', ...(type === 'Risk' ? ['Likelihood', 'Impact'] : []), { label: 'Score', right: true }, 'Owner', 'Opened', 'Due', { label: 'Days', right: true }, { label: 'Esc.', width: '44px' }, '']}>
        {rows.map((r) => (
          <Row key={r.id} muted={!isOpen(r)}>
            <Td><TextCell value={r.code} className="w-[64px] font-medium" onChange={(v) => set(r, 'code', v)} /></Td>
            <Td min={260}><TextCell value={r.title} placeholder={`Describe the ${label}`} className="font-medium" onChange={(v) => set(r, 'title', v)} /></Td>
            <Td><SelectCell value={r.workstream} options={RAID_WORKSTREAMS} onChange={(v) => set(r, 'workstream', v)} /></Td>
            <Td><SelectCell value={r.category} options={RISK_CATEGORIES} onChange={(v) => set(r, 'category', v as RaidItem['category'])} /></Td>
            <Td><SelectCell value={r.level} options={RAID_LEVELS} onChange={(v) => set(r, 'level', v as RaidItem['level'])} /></Td>
            <Td><SelectCell value={r.status} options={RAID_STATUSES} onChange={(v) => set(r, 'status', v as RaidItem['status'])} /></Td>
            {type === 'Risk' && <Td><SelectCell value={r.likelihood} options={LIKELIHOOD} onChange={(v) => set(r, 'likelihood', v as RaidItem['likelihood'])} /></Td>}
            {type === 'Risk' && <Td><SelectCell value={r.impact} options={IMPACT_SCALE} onChange={(v) => set(r, 'impact', v as RaidItem['impact'])} /></Td>}
            <Td><NumCell value={r.impactScore} min={0} max={10} step={0.1} decimals className="w-[60px]" onChange={(v) => set(r, 'impactScore', v)} /></Td>
            <Td><SelectCell value={r.owner} options={OWNERS} onChange={(v) => set(r, 'owner', v)} /></Td>
            <Td><DateCell value={r.openedOn} onChange={(v) => set(r, 'openedOn', v)} /></Td>
            <Td><DateCell value={r.dueDate} onChange={(v) => set(r, 'dueDate', v)} /></Td>
            <Td className="text-right text-[12px] pr-2">{daysOpen(r)}</Td>
            <Td><CheckCell value={!!r.escalated} title="Escalated to steering" onChange={(v) => raidC.update({ ...r, escalated: v, escalationStatus: v ? (r.escalationStatus ?? 'Awaiting Decision') : undefined })} /></Td>
            <Td sticky>
              {isOpen(r) ? <button title="Mark resolved" className="text-slate-400 hover:text-green-600 p-1 cursor-pointer" onClick={() => resolve(r)}><CheckCircle2 size={14} /></button> : <button title="Reopen" className="text-slate-400 hover:text-brand-600 p-1 cursor-pointer" onClick={() => reopen(r)}><RotateCcw size={14} /></button>}
              <EditBtn onClick={() => openRaid(r)} />
              <RemoveBtn name={`${r.code} ${r.title}`} onClick={() => raidC.remove(r.id)} />
            </Td>
          </Row>
        ))}
      </Grid>
    </Card>
  )
}

/* ================================================================== */
/* Mitigation actions                                                  */
/* ================================================================== */
function MitigationGrid({ raid, mitC, openRaid }: { raid: RaidItem[]; mitC: Coll<MitigationAction>; openRaid: (r: RaidItem) => void }) {
  const [q, setQ] = useState('')
  const byCode = useMemo(() => Object.fromEntries(raid.map((r) => [r.code, r])), [raid])
  const codes = raid.filter((r) => r.type === 'Risk').map((r) => r.code)
  const rows = useMemo(() => mitC.items.filter((a) => !q || `${a.riskCode} ${a.action} ${a.owner} ${byCode[a.riskCode]?.title ?? ''}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (byCode[b.riskCode]?.impactScore ?? 0) - (byCode[a.riskCode]?.impactScore ?? 0) || a.due.localeCompare(b.due)), [mitC.items, q, byCode])
  const set = <K extends keyof MitigationAction>(a: MitigationAction, k: K, v: MitigationAction[K]) => mitC.update({ ...a, [k]: v })
  const add = () => mitC.add({ id: uid('ma'), riskCode: raid.find((r) => r.type === 'Risk' && isOpen(r))?.code ?? codes[0] ?? '', action: '', owner: OWNERS[0], due: TODAY, status: 'Not Started', effectiveness: 'Not Assessed' })
  const withoutPlan = raid.filter((r) => r.type === 'Risk' && isOpen(r) && !mitC.items.some((a) => a.riskCode === r.code))
  return (
    <div className="space-y-4">
      <Card title="Mitigation actions" subtitle={`${mitC.items.length} actions · ${mitC.items.filter((a) => a.status === 'Completed').length} completed · ${withoutPlan.length} open risks without an action. Each row links to a risk by its ID.`} action={<AddBtn label="Add action" onClick={add} />}>
        <GridToolbar q={q} onQ={setQ} placeholder="Search actions…" count={rows.length} />
        <Grid count={rows.length} minWidth={1100} headers={['Risk', 'Risk title', 'Mitigation action', 'Owner', 'Due', 'Status', 'Effectiveness', '']}>
          {rows.map((a) => { const r = byCode[a.riskCode]; return (
            <Row key={a.id}>
              <Td><SelectCell value={a.riskCode} options={codes} className="w-[78px]" onChange={(v) => set(a, 'riskCode', v)} /></Td>
              <Td min={200}>{r ? <button className="link block max-w-[240px] truncate text-left" title={r.title} onClick={() => openRaid(r)}>{r.title}</button> : <span className="text-ink-400 italic text-[12px] px-1.5">Unlinked</span>}</Td>
              <Td min={320}><TextCell value={a.action} placeholder="What will be done" className="font-medium" onChange={(v) => set(a, 'action', v)} /></Td>
              <Td><SelectCell value={a.owner} options={OWNERS} onChange={(v) => set(a, 'owner', v)} /></Td>
              <Td><DateCell value={a.due} onChange={(v) => set(a, 'due', v)} /></Td>
              <Td><SelectCell value={a.status} options={MITIGATION_STATUSES} onChange={(v) => set(a, 'status', v)} /></Td>
              <Td><SelectCell value={a.effectiveness} options={EFFECTIVENESS} onChange={(v) => set(a, 'effectiveness', v)} /></Td>
              <Td sticky><RemoveBtn name="this mitigation action" onClick={() => mitC.remove(a.id)} /></Td>
            </Row>
          ) })}
        </Grid>
      </Card>
      {withoutPlan.length > 0 && (
        <Card title="Open risks without a mitigation action" subtitle="Click + Plan to start an action pre-filled from the risk's mitigation summary.">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {withoutPlan.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-[12.5px]">
                <span className="font-medium w-12">{r.code}</span><span className="truncate flex-1" title={r.title}>{r.title}</span><Badge value={r.level} />
                <button className="link whitespace-nowrap" onClick={() => mitC.add({ id: uid('ma'), riskCode: r.code, action: r.mitigation ?? '', owner: r.owner, due: r.dueDate, status: 'Not Started', effectiveness: 'Not Assessed' })}>+ Plan</button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

/* ================================================================== */
/* Insights & recommended actions                                      */
/* ================================================================== */
function InsightsGrid({ insightsC, raid, openRaid }: { insightsC: Coll<RiskInsight>; raid: RaidItem[]; openRaid: (r: RaidItem) => void }) {
  const set = <K extends keyof RiskInsight>(i: RiskInsight, k: K, v: RiskInsight[K]) => insightsC.update({ ...i, [k]: v })
  const add = (kind: RiskInsight['kind']) => insightsC.add({ id: uid('ins'), kind, title: '', detail: '', icon: kind === 'Insight' ? 'alert' : 'escalate', order: insightsC.items.filter((x) => x.kind === kind).length + 1 })
  const codes = raid.map((r) => r.code)
  const section = (kind: RiskInsight['kind']) => {
    const rows = insightsC.items.filter((i) => i.kind === kind).sort((a, b) => a.order - b.order)
    return (
      <Card title={kind === 'Insight' ? 'Key insights' : 'Recommended actions'} subtitle={kind === 'Insight' ? 'Shown on the Risk Overview and Trends & Insights tabs (first three on the overview).' : 'Actions the PMO recommends to the steering committee; linked to a risk or issue where relevant.'} action={<AddBtn label={kind === 'Insight' ? 'Add insight' : 'Add action'} onClick={() => add(kind)} />}>
        <Grid count={rows.length} minWidth={900} headers={[{ label: '#', width: '56px' }, 'Icon', 'Headline', 'Detail', 'Linked ID', '']}>
          {rows.map((i) => (
            <Row key={i.id}>
              <Td><NumCell value={i.order} min={1} className="w-[48px]" onChange={(v) => set(i, 'order', v)} /></Td>
              <Td><SelectCell value={i.icon} options={INSIGHT_ICONS} className="w-[90px]" onChange={(v) => set(i, 'icon', v)} /></Td>
              <Td min={260}><TextCell value={i.title} placeholder="Headline" className="font-medium" onChange={(v) => set(i, 'title', v)} /></Td>
              <Td min={300}><TextCell value={i.detail} placeholder="Supporting detail" onChange={(v) => set(i, 'detail', v)} /></Td>
              <Td><span className="flex items-center gap-1"><SelectCell value={i.linkedCode ?? '–'} options={['–', ...codes]} className="w-[80px]" onChange={(v) => set(i, 'linkedCode', v === '–' ? undefined : v)} />{i.linkedCode && raid.find((r) => r.code === i.linkedCode) && <EditBtn title="Open linked risk / issue" onClick={() => openRaid(raid.find((r) => r.code === i.linkedCode)!)} />}</span></Td>
              <Td sticky><RemoveBtn name={i.title || 'this entry'} onClick={() => insightsC.remove(i.id)} /></Td>
            </Row>
          ))}
        </Grid>
      </Card>
    )
  }
  return <div className="space-y-4">{section('Insight')}{section('Action')}</div>
}

/* ================================================================== */
/* KPI settings + monthly trend                                        */
/* ================================================================== */
function KpiSettings({ settings, onSave, trendC }: { settings: RiskSettings; onSave: (s: RiskSettings) => void; trendC: Coll<RaidTrendPoint> }) {
  const [f, setF] = useState<RiskSettings>(settings)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(settings)
  const save = () => { onSave(f); setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const num = (k: keyof RiskSettings, label: string) => <Field label={label}><Input type="number" step="any" value={f[k] as number} onChange={(e) => setF({ ...f, [k]: parseFloat(e.target.value) || 0 })} /></Field>
  const setT = (p: RaidTrendPoint, k: keyof RaidTrendPoint, v: number) => trendC.update({ ...p, [k]: v })
  return (
    <div className="grid grid-cols-[1fr_1.4fr] gap-4">
      <Card title="Headline KPIs" subtitle="Open counts, escalations, the heat map and charts are computed from the register. These measures are maintained by the PMO.">
        <FormGrid cols={2}>
          {num('onTrackForClosurePct', 'On track for closure (%)')}{num('onTrackForClosureDelta', 'Change vs last month (%)')}
          {num('avgDaysToResolve', 'Avg. days to resolve')}{num('avgDaysToResolveDelta', 'Change vs last month (%)')}
          {num('avgDaysToResolvePrev', 'Avg. days to resolve (previous month)')}{num('wave2DelayProbability', 'Wave 2 delay probability (%)')}
        </FormGrid>
        <div className="flex items-center justify-end gap-2 mt-4">
          {saved && !dirty && <span className="text-[12px] text-green-600 inline-flex items-center gap-1"><Check size={13} /> Saved</span>}
          <button className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed" disabled={!dirty} onClick={() => setF(settings)}>Discard</button>
          <button className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={!dirty} onClick={save}><Save size={14} /> Save</button>
        </div>
      </Card>
      <Card title="Monthly trend data" subtitle="Open risks / issues at month end and the number raised and closed. The latest month is replaced by the live register on the charts.">
        <Grid count={trendC.items.length} minWidth={560} headers={['Month', { label: 'Open risks', right: true }, { label: 'Open issues', right: true }, { label: 'New risks', right: true }, { label: 'Closed risks', right: true }, { label: 'New issues', right: true }, { label: 'Closed issues', right: true }]}>
          {trendC.items.map((p) => (
            <Row key={p.id}>
              <Td><span className="px-1.5 text-[12.5px] font-medium">{p.month}</span></Td>
              {(['openRisks', 'openIssues', 'newRisks', 'closedRisks', 'newIssues', 'closedIssues'] as const).map((k) => <Td key={k}><NumCell value={p[k]} min={0} className="w-[64px]" onChange={(v) => setT(p, k, v)} /></Td>)}
            </Row>
          ))}
        </Grid>
      </Card>
    </div>
  )
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */
export function RisksInput(p: RisksInputProps) {
  const { raidC, settingsC, trendC, insightsC, mitC, escC, settings, openRaid } = p
  return (
    <InputLayout title="Risks and Issues" subtitle="Maintain the risk and issue registers, mitigation actions, escalations and PMO insights that drive the risk dashboards."
      tabs={[
        { name: 'Risk register', content: <RaidGrid type="Risk" raidC={raidC} openRaid={openRaid} /> },
        { name: 'Issue register', content: <RaidGrid type="Issue" raidC={raidC} openRaid={openRaid} /> },
        { name: 'Mitigation actions', content: <MitigationGrid raid={raidC.items} mitC={mitC} openRaid={openRaid} /> },
        { name: 'Escalations & decisions', content: <EscalationsTab hideStats raid={raidC.items} decisions={escC.items} onSaveRaid={raidC.update} onSaveDecision={escC.update} onOpenRaid={openRaid} />, hint: 'Escalate an open risk or issue to a forum, then record the decision taken. Click a row to record or change the decision; de-escalate from the same form.' },
        { name: 'Insights & recommended actions', content: <InsightsGrid insightsC={insightsC} raid={raidC.items} openRaid={openRaid} /> },
        { name: 'KPI settings', content: <KpiSettings settings={settings} onSave={(s) => settingsC.update(s)} trendC={trendC} /> },
      ]} />
  )
}
