import { useMemo, useState, useEffect } from 'react'
import { Plus, Download } from 'lucide-react'
import { Card, Table, Badge, Modal, Field, Input, TextArea, Select, FormGrid, ConfirmDelete, Progress } from '../ui'
import { fmtDate, OWNERS, TODAY } from '../../data/common'
import { isOpen, type RaidItem } from '../../data/shared'
import { MITIGATION_STATUSES, EFFECTIVENESS, downloadCsv, type MitigationAction } from '../../data/risks'
import { uid } from '../../store/useStore'

const EFF_COLOR: Record<string, string> = { High: 'bg-green-50 text-green-700', Medium: 'bg-amber-50 text-amber-700', Low: 'bg-red-50 text-red-700', 'Not Assessed': 'bg-slate-100 text-slate-600' }

type Row = MitigationAction & { risk?: RaidItem }

export function MitigationTab({ raid, actions, onSave, onDelete, onOpenRaid }: {
  raid: RaidItem[]; actions: MitigationAction[]; onSave: (a: MitigationAction) => void; onDelete: (id: string) => void; onOpenRaid: (r: RaidItem) => void
}) {
  const [edit, setEdit] = useState<MitigationAction | null | 'new'>(null)
  const [fStatus, setFStatus] = useState('All')
  const [q, setQ] = useState('')
  const byCode = useMemo(() => Object.fromEntries(raid.map((r) => [r.code, r])), [raid])
  const rows: Row[] = useMemo(() => {
    const ql = q.toLowerCase()
    return actions
      .map((a) => ({ ...a, risk: byCode[a.riskCode] }))
      .filter((a) => (fStatus === 'All' || a.status === fStatus) && (!ql || [a.riskCode, a.action, a.owner, a.risk?.title ?? ''].join(' ').toLowerCase().includes(ql)))
      .sort((a, b) => (b.risk?.impactScore ?? 0) - (a.risk?.impactScore ?? 0) || a.due.localeCompare(b.due))
  }, [actions, byCode, fStatus, q])
  const openRisksList = raid.filter((r) => isOpen(r) && r.type === 'Risk')
  const withoutPlan = openRisksList.filter((r) => !actions.some((a) => a.riskCode === r.code))
  const counts = {
    total: actions.length,
    inProg: actions.filter((a) => a.status === 'In Progress').length,
    done: actions.filter((a) => a.status === 'Completed').length,
    overdue: actions.filter((a) => a.status === 'Overdue' || (a.status !== 'Completed' && a.due < TODAY)).length,
  }
  const coverage = openRisksList.length ? Math.round(((openRisksList.length - withoutPlan.length) / openRisksList.length) * 100) : 0
  const effDist = EFFECTIVENESS.map((e) => ({ name: e, value: actions.filter((a) => a.effectiveness === e).length }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        {[['Mitigation actions', counts.total, 'text-ink-900'], ['In Progress', counts.inProg, 'text-brand-600'], ['Completed', counts.done, 'text-green-600'], ['Overdue', counts.overdue, 'text-red-600']].map(([l, v, c]) => (
          <div key={l as string} className="card px-4 py-3"><div className="text-[12px] text-ink-500">{l as string}</div><div className={`text-[22px] font-bold ${c}`}>{v as number}</div></div>
        ))}
        <div className="card px-4 py-3"><div className="text-[12px] text-ink-500">Open risks with a plan</div><div className="text-[22px] font-bold text-ink-900">{coverage}%</div><Progress value={coverage} height="h-1.5" className="mt-1" color="#16A34A" /></div>
      </div>
      <div className="space-y-4">
        <Card title="Mitigation Plans" subtitle="Mitigation actions per open risk – owner, due date, status and assessed effectiveness (WBS 14.1.3 / 14.1.5)"
          headerRight={<div className="flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions..." className="input py-1.5 w-[180px]" />
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="input py-1.5 w-auto">{['All', ...MITIGATION_STATUSES].map((s) => <option key={s}>{s}</option>)}</select>
            <button className="btn-secondary" onClick={() => downloadCsv('mitigation-plans.csv', ['Risk', 'Risk title', 'Mitigation summary', 'Action', 'Owner', 'Due', 'Status', 'Effectiveness'], rows.map((r) => [r.riskCode, r.risk?.title, r.risk?.mitigation, r.action, r.owner, r.due, r.status, r.effectiveness]))}><Download size={14} /> Export</button>
            <button className="btn-primary whitespace-nowrap" onClick={() => setEdit('new')}><Plus size={14} /> Add Action</button>
          </div>}>
          <Table<Row> compact rows={rows} onRowClick={(r) => setEdit(r)} columns={[
            { key: 'riskCode', header: 'Risk', className: 'whitespace-nowrap', render: (r) => <button className="link" onClick={(e) => { e.stopPropagation(); if (r.risk) onOpenRaid(r.risk) }}>{r.riskCode}</button> },
            { key: 'title', header: 'Risk / Mitigation', render: (r) => <div className="max-w-[300px]"><div className="truncate font-medium" title={r.risk?.title}>{r.risk?.title ?? <span className="text-ink-400 italic">Unlinked</span>}</div><div className="text-[11.5px] text-ink-500 truncate" title={r.risk?.mitigation}>{r.risk?.mitigation ?? '–'}</div></div> },
            { key: 'level', header: 'Level', render: (r) => r.risk ? <Badge value={r.risk.level} /> : null },
            { key: 'action', header: 'Mitigation Action', render: (r) => <span className="block min-w-[210px] max-w-[260px] whitespace-normal leading-snug text-[12.5px]">{r.action}</span> },
            { key: 'owner', header: 'Mitigation Owner', className: 'whitespace-nowrap' },
            { key: 'due', header: 'Due Date', className: 'whitespace-nowrap', render: (r) => <span className={r.status !== 'Completed' && r.due < TODAY ? 'text-red-600 font-medium' : ''}>{fmtDate(r.due)}</span> },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
            { key: 'effectiveness', header: 'Effectiveness', render: (r) => <span className={`inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-medium ${EFF_COLOR[r.effectiveness]}`}>{r.effectiveness}</span> },
          ]} empty="No mitigation actions yet. Use Add Action to create one." />
        </Card>
        <div className="grid grid-cols-[1fr_1.6fr] gap-4">
          <Card title="Effectiveness Assessment" subtitle="Assessed effectiveness of recorded actions">
            <div className="space-y-2.5">
              {effDist.map((e) => (
                <div key={e.name} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-24 text-ink-700">{e.name}</span>
                  <Progress value={counts.total ? (e.value / counts.total) * 100 : 0} className="flex-1" color={{ High: '#16A34A', Medium: '#F59E0B', Low: '#DC2626', 'Not Assessed': '#CBD5E1' }[e.name]} />
                  <span className="w-6 text-right font-medium">{e.value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Open Risks Without a Mitigation Action" subtitle={`${withoutPlan.length} of ${openRisksList.length} open risks`}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {withoutPlan.length === 0 && <p className="text-[12.5px] text-ink-500 italic">All open risks have at least one action.</p>}
              {withoutPlan.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-[12.5px]">
                  <span className="font-medium w-12">{r.code}</span>
                  <span className="truncate flex-1" title={r.title}>{r.title}</span>
                  <Badge value={r.level} />
                  <button className="link whitespace-nowrap" onClick={() => setEdit({ id: '', riskCode: r.code, action: r.mitigation ?? '', owner: r.owner, due: r.dueDate, status: 'Not Started', effectiveness: 'Not Assessed' })}>+ Plan</button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <MitigationModal open={edit !== null} value={edit === 'new' ? null : edit} risks={raid.filter((r) => r.type === 'Risk')} onClose={() => setEdit(null)}
        onSave={(a) => { onSave(a); setEdit(null) }} onDelete={(id) => { onDelete(id); setEdit(null) }} />
    </div>
  )
}

function MitigationModal({ open, value, risks, onClose, onSave, onDelete }: { open: boolean; value: MitigationAction | null; risks: RaidItem[]; onClose: () => void; onSave: (a: MitigationAction) => void; onDelete: (id: string) => void }) {
  const blank = (): MitigationAction => ({ id: '', riskCode: risks.find(isOpen)?.code ?? '', action: '', owner: OWNERS[0], due: '2026-11-15', status: 'Not Started', effectiveness: 'Not Assessed' })
  const [f, setF] = useState<MitigationAction>(value ?? blank())
  useEffect(() => { if (open) setF(value ?? blank()) }, [open, value]) // eslint-disable-line react-hooks/exhaustive-deps
  const codes = risks.map((r) => `${r.code} – ${r.title}`)
  const sel = codes.find((c) => c.startsWith(f.riskCode + ' ')) ?? codes[0] ?? ''
  const risk = risks.find((r) => r.code === f.riskCode)
  return (
    <Modal open={open} onClose={onClose} title={f.id ? `Edit mitigation action – ${f.riskCode}` : 'Add mitigation action'} width="max-w-2xl"
      footer={<>{f.id && <ConfirmDelete onConfirm={() => onDelete(f.id)} />}<span className="flex-1" /><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { if (!f.action.trim()) return; onSave({ ...f, id: f.id || uid('ma') }) }}>Save</button></>}>
      <FormGrid cols={2}>
        <Field label="Risk" className="col-span-2"><Select options={codes} value={sel} onChange={(e) => setF({ ...f, riskCode: e.target.value.split(' – ')[0] })} /></Field>
        {risk?.mitigation && <p className="col-span-2 text-[12px] text-ink-500 -mt-1">Mitigation summary on the risk: <span className="text-ink-700">{risk.mitigation}</span></p>}
        <Field label="Mitigation action" className="col-span-2"><TextArea value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} /></Field>
        <Field label="Mitigation owner"><Select options={OWNERS.includes(f.owner as (typeof OWNERS)[number]) ? OWNERS : [f.owner, ...OWNERS]} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></Field>
        <Field label="Due date"><Input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
        <Field label="Status"><Select options={MITIGATION_STATUSES} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as MitigationAction['status'] })} /></Field>
        <Field label="Effectiveness"><Select options={EFFECTIVENESS} value={f.effectiveness} onChange={(e) => setF({ ...f, effectiveness: e.target.value as MitigationAction['effectiveness'] })} /></Field>
      </FormGrid>
    </Modal>
  )
}
