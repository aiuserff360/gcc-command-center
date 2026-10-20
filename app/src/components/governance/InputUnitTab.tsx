/**
 * Input view › "Business unit governance": per-unit sponsor / owner, review cadence and next review, the
 * governance-health thresholds, the editable business-unit RACI and the RAID → business unit tags.
 */
import { useMemo, useState } from 'react'
import { Card, Badge, Field, Input, FormGrid } from '../ui'
import { Grid, Row, Td, TextCell, DateCell, SelectCell, RemoveBtn, AddBtn, GridToolbar, selectCls } from '../ui/InlineGrid'
import { useCollection, uid } from '../../store/useStore'
import { isOpen, type RaidItem } from '../../data/shared'
import { fmtDate } from '../../data/common'
import { PROGRAM_WIDE, type BuGovernance, type BuRaciRow, type GovernanceSettings, type GovRaidLink } from '../../data/governance'
import { unitSlice, raidUnit, HEALTH_WEIGHTS, type UnitData } from './units'
import { BuRaciMatrix } from './RaciTables'

type Coll<T extends { id: string }> = ReturnType<typeof useCollection<T>>
const CADENCES = ['Weekly', 'Fortnightly', 'Monthly', 'Quarterly'] as const

export default function InputUnitTab({ d, profilesC, settingsC, buRaciC, linksC }: { d: UnitData; profilesC: Coll<BuGovernance>; settingsC: Coll<GovernanceSettings>; buRaciC: Coll<BuRaciRow>; linksC: Coll<GovRaidLink> }) {
  const gs = d.gs
  const set = <K extends keyof BuGovernance>(p: BuGovernance, k: K, v: BuGovernance[K]) => profilesC.update({ ...p, [k]: v })
  const setGs = (patch: Partial<GovernanceSettings>) => settingsC.update({ ...gs, ...patch })
  const slices = useMemo(() => d.unitNames.map((n) => unitSlice(d, n)), [d])
  const rows = [...profilesC.items].sort((a, b) => d.unitNames.indexOf(a.businessUnit) - d.unitNames.indexOf(b.businessUnit))
  const missing = d.unitNames.filter((n) => !profilesC.items.some((p) => p.businessUnit === n))
  const addProfile = () => { const bu = missing[0] ?? d.unitNames[0] ?? ''; profilesC.add({ id: uid('bug'), businessUnit: bu, sponsor: '', cadence: 'Monthly', reviewForum: `${bu} monthly review`, nextReview: '', notes: '' }) }

  /* RAID tags */
  const [q, setQ] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(true)
  const raidRows = d.raid.filter((r) => (!onlyOpen || isOpen(r)) && (!q || `${r.code} ${r.title} ${r.owner}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => Number(!!b.escalated) - Number(!!a.escalated) || a.code.localeCompare(b.code))
  const tagRaid = (r: RaidItem, unit: string, projectId?: string) => {
    const existing = linksC.items.find((l) => l.id === r.id)
    if (unit === PROGRAM_WIDE) { if (existing) linksC.remove(r.id); return }
    linksC.update({ id: r.id, businessUnit: unit, projectId: projectId ?? (existing?.businessUnit === unit ? existing.projectId : undefined) })
  }
  const w = HEALTH_WEIGHTS

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_330px] gap-4">
        <Card title="Business unit governance" subtitle="Sponsor, review cadence and next review per business unit. The accountable owner comes from the business unit list (GCC Setup); health is derived from the unit's open governance items." action={<AddBtn label="Add business unit profile" onClick={addProfile} />}>
          <Grid count={rows.length} minWidth={1360} headers={['Business unit', 'Owner (from setup)', 'Sponsor', 'Cadence', 'Review forum', 'Next review', 'Health', 'Notes', '']}>
            {rows.map((p) => {
              const s = slices.find((x) => x.unit === p.businessUnit)
              return (
                <Row key={p.id}>
                  <Td><SelectCell value={p.businessUnit} options={d.unitNames} className="font-medium min-w-[190px]" onChange={(v) => set(p, 'businessUnit', v)} /></Td>
                  <Td><span className="px-1.5 text-[12px] text-ink-700 whitespace-nowrap">{s?.bu?.owner ?? '—'}</span></Td>
                  <Td min={200}><TextCell value={p.sponsor} placeholder="Sponsor (role)" onChange={(v) => set(p, 'sponsor', v)} /></Td>
                  <Td><SelectCell value={p.cadence} options={CADENCES} onChange={(v) => set(p, 'cadence', v)} /></Td>
                  <Td min={200}><TextCell value={p.reviewForum} placeholder="Review forum" onChange={(v) => set(p, 'reviewForum', v)} /></Td>
                  <Td min={150}><DateCell value={p.nextReview} onChange={(v) => set(p, 'nextReview', v)} /></Td>
                  <Td min={130}><span className="inline-flex items-center gap-1.5 px-1 whitespace-nowrap">{s ? <><Badge value={s.health.rag} /><span className="text-[11px] text-ink-500">score {s.health.score}</span></> : <span className="text-[11px] text-ink-500">—</span>}</span></Td>
                  <Td min={240}><TextCell value={p.notes} placeholder="Notes" onChange={(v) => set(p, 'notes', v)} /></Td>
                  <Td sticky><RemoveBtn name={`the ${p.businessUnit} governance profile`} onClick={() => profilesC.remove(p.id)} /></Td>
                </Row>
              )
            })}
          </Grid>
          {missing.length > 0 && <p className="text-[11.5px] text-amber-700 mt-2">No governance profile yet for: {missing.join(', ')}.</p>}
        </Card>
        <Card title="Governance health thresholds" subtitle="A unit's score adds up its open items; the thresholds turn it into a RAG.">
          <FormGrid cols={2}>
            <Field label="Amber from score"><Input type="number" min={0} value={gs.unitHealthAmberFrom ?? 5} onChange={(e) => setGs({ unitHealthAmberFrom: Math.max(0, parseFloat(e.target.value) || 0) })} /></Field>
            <Field label="Red from score"><Input type="number" min={0} value={gs.unitHealthRedFrom ?? 12} onChange={(e) => setGs({ unitHealthRedFrom: Math.max(0, parseFloat(e.target.value) || 0) })} /></Field>
          </FormGrid>
          <div className="mt-3 text-[11.5px] text-ink-700 space-y-0.5">
            <div className="font-semibold text-ink-900 mb-1">Score weights</div>
            {[
              ['Overdue decision', w.overdueDecision], ['Open decision – Critical / High', w.openDecisionHigh], ['Open decision – Medium / Low', w.openDecision],
              ['Pending change request', w.pendingCr], ['… material (≥ ₹ 0.05 Cr or > 10 days)', `+${w.materialCr}`],
              ['Overdue action', w.overdueAction], ['Open action', w.openAction],
              ['Open escalation (RAID, escalated)', w.openEscalation], ['Other open Critical / High risk or issue', w.criticalHighRaid],
            ].map(([l, v]) => <div key={String(l)} className="flex justify-between gap-2"><span className="text-ink-500">{l}</span><b>{v}</b></div>)}
          </div>
          <div className="mt-3 pt-2 border-t border-line space-y-1">
            {slices.map((s) => <div key={s.unit} className="flex items-center justify-between text-[12px]"><span className="truncate text-ink-700">{s.unit}</span><span className="inline-flex items-center gap-1.5 shrink-0"><span className="text-ink-500">{s.health.score}</span><Badge value={s.health.rag} /></span></div>)}
          </div>
        </Card>
      </div>

      <BuRaciMatrix raciC={buRaciC} units={d.unitNames} editable />

      <Card title="Risks & issues by business unit" subtitle="Tag shared RAID items to a business unit (and optionally a transition project) so escalations count towards that unit's governance health. The RAID register itself is maintained in Risks & Issues.">
        <GridToolbar q={q} onQ={setQ} placeholder="Search risks and issues…" count={raidRows.length}>
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-ink-700"><input type="checkbox" className="accent-brand-600" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Open items only</label>
        </GridToolbar>
        <Grid count={raidRows.length} minWidth={1000} headers={['ID', 'Risk / issue', 'Level', 'Status', 'Escalation', 'Owner', 'Due', 'Business unit', 'Transition project']}>
          {raidRows.map((r) => {
            const link = raidUnit(r, linksC.items, d.txLinks)
            const unit = link?.businessUnit ?? PROGRAM_WIDE
            const projects = d.projects.filter((p) => p.businessUnit === unit)
            return (
              <Row key={r.id} muted={!isOpen(r)}>
                <Td><span className="px-1.5 text-[12px] text-ink-500 whitespace-nowrap">{r.code}</span></Td>
                <Td min={280}><span className="px-1.5 text-[12px] font-medium block max-w-[360px] truncate" title={r.title}>{r.title}</span></Td>
                <Td><Badge value={r.level} /></Td>
                <Td><Badge value={r.status} /></Td>
                <Td>{r.escalated ? <Badge value={r.escalationStatus ?? 'In Progress'} /> : <span className="px-1.5 text-[11.5px] text-ink-400">—</span>}</Td>
                <Td><span className="px-1.5 text-[12px] whitespace-nowrap">{r.owner}</span></Td>
                <Td><span className="px-1.5 text-[12px] whitespace-nowrap">{fmtDate(r.dueDate)}</span></Td>
                <Td><SelectCell value={unit} options={[PROGRAM_WIDE, ...d.unitNames]} onChange={(v) => tagRaid(r, v)} /></Td>
                <Td>{unit === PROGRAM_WIDE ? <span className="px-1.5 text-[11.5px] text-ink-400">—</span> : (
                  <select className={`${selectCls} cursor-pointer min-w-[160px]`} value={link?.projectId ?? ''} onChange={(e) => tagRaid(r, unit, e.target.value || undefined)}>
                    <option value="">— none —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>)}</Td>
              </Row>
            )
          })}
        </Grid>
      </Card>
    </div>
  )
}
