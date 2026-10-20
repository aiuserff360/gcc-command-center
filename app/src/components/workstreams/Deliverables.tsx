import { useMemo, useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Flag } from 'lucide-react'
import { Card, Badge, Modal, Field, Input, TextArea, Select, FormGrid } from '../ui'
import { useCollection, uid } from '../../store/useStore'
import { WBS, WBS_TO_DASHBOARD, seedActivities, type Activity } from '../../data/wbs'
import { fmtDateShort, OWNERS, TODAY, type Workstream, type Status } from '../../data/common'
import { Toolbar, MiniSelect, SearchBox, Strip, useFields, FormFooter, Checkbox, SelectKV, PctBar, shortWs } from './common'

const ALL = 'All'
const ACT_STATUSES = ['Not Started', 'In Progress', 'Completed', 'At Risk', 'Delayed'] as const
const wbsLabel = (w: (typeof WBS)[number]) => `${w.code}. ${w.name}`
const subLabel = (s: (typeof WBS)[number]['subs'][number]) => `${s.code} ${s.name}`
const RAG_DOT: Record<string, string> = { Green: '#16A34A', Amber: '#F59E0B', Red: '#DC2626' }
const uniq = (a: string[]) => a.filter((v, i) => v && a.indexOf(v) === i)

/** WBS activity register – grouped tree (WBS workstream → sub-workstream → activity) with filters and full tracking-field editing. */
export function DeliverablesView({ ws }: { ws?: Workstream }) {
  const acts = useCollection<Activity>('activities', seedActivities)
  const [fWbs, setFWbs] = useState(ALL), [fSub, setFSub] = useState(ALL), [fStatus, setFStatus] = useState(ALL), [fRag, setFRag] = useState(ALL), [fCp, setFCp] = useState(ALL), [q, setQ] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [edit, setEdit] = useState<{ item: Activity; isNew: boolean } | null>(null)

  const scope = useMemo(() => acts.items.filter((a) => (ws ? a.workstream === ws : true)), [acts.items, ws])
  const wbsOptions = useMemo(() => [ALL, ...uniq(scope.map((a) => a.wbsWorkstream))], [scope])
  const subOptions = useMemo(() => [ALL, ...uniq(scope.filter((a) => fWbs === ALL || a.wbsWorkstream === fWbs).map((a) => a.subWorkstream))], [scope, fWbs])
  const filtered = scope.filter((a) =>
    (fWbs === ALL || a.wbsWorkstream === fWbs) && (fSub === ALL || a.subWorkstream === fSub) && (fStatus === ALL || a.status === fStatus) && (fRag === ALL || a.rag === fRag) &&
    (fCp === ALL || (fCp === 'Critical path' ? a.criticalPath : !a.criticalPath)) &&
    (!q || `${a.code} ${a.name} ${a.responsible} ${a.deliverable}`.toLowerCase().includes(q.toLowerCase())))
  const filtering = fWbs !== ALL || fSub !== ALL || fStatus !== ALL || fRag !== ALL || fCp !== ALL || q !== ''

  // tree
  const groups = useMemo(() => {
    const map = new Map<string, Map<string, Activity[]>>()
    filtered.forEach((a) => {
      if (!map.has(a.wbsWorkstream)) map.set(a.wbsWorkstream, new Map())
      const subs = map.get(a.wbsWorkstream)!
      if (!subs.has(a.subWorkstream)) subs.set(a.subWorkstream, [])
      subs.get(a.subWorkstream)!.push(a)
    })
    const order = (s: string) => s.split(/[.\s]/).map((x) => parseInt(x) || 0)
    const cmp = (a: string, b: string) => { const x = order(a), y = order(b); for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0); return 0 }
    return [...map.entries()].sort((a, b) => cmp(a[0], b[0])).map(([w, subs]) => ({ name: w, subs: [...subs.entries()].sort((a, b) => cmp(a[0], b[0])).map(([s, list]) => ({ name: s, list: list.sort((a, b) => cmp(a.code, b.code)) })) }))
  }, [filtered])
  const isOpen = (g: string) => open[g] ?? (filtering || !!ws)
  const cnt = (f: (a: Activity) => boolean) => scope.filter(f).length
  const avg = (list: Activity[]) => (list.length ? Math.round(list.reduce((a, x) => a + x.percentComplete, 0) / list.length) : 0)
  const newItem = (): Activity => {
    const w = fWbs !== ALL ? WBS.find((x) => wbsLabel(x) === fWbs) : ws ? WBS.find((x) => WBS_TO_DASHBOARD[wbsLabel(x)] === ws) : WBS[0]
    const wl = wbsLabel(w ?? WBS[0]), s = (w ?? WBS[0]).subs[0]
    return { id: uid('act'), code: '', name: '', wbsWorkstream: wl, subWorkstream: subLabel(s), workstream: WBS_TO_DASHBOARD[wl], responsible: 'A. Sharma', accountable: 'A. Sharma', vendor: '', baselineStart: TODAY, baselineEnd: TODAY, forecastStart: TODAY, forecastEnd: TODAY, actualStart: '', actualEnd: '', status: 'Not Started', percentComplete: 0, rag: 'Green', daysDelayed: 0, predecessor: '', successor: '', criticalPath: false, budgetLakh: 0, commitmentLakh: 0, actualLakh: 0, forecastLakh: 0, deliverable: '', acceptanceCriteria: '', evidence: '', signOff: 'Pending', lastUpdated: TODAY }
  }
  const cols = 10
  return (
    <Card title={ws ? 'Deliverables (WBS Activities)' : 'Deliverables – Master Activity Register'} subtitle={`${scope.length} activities across ${uniq(scope.map((a) => a.wbsWorkstream)).length} WBS workstreams · ${filtered.length} shown`}
      action={<button className="btn-primary" onClick={() => setEdit({ item: newItem(), isNew: true })}><Plus size={14} /> Add activity</button>}>
      <Strip items={[
        { label: 'Activities', value: scope.length }, { label: 'Completed', value: cnt((a) => a.status === 'Completed'), color: '#16A34A' }, { label: 'In Progress', value: cnt((a) => a.status === 'In Progress'), color: '#1E5BBE' },
        { label: 'Not Started', value: cnt((a) => a.status === 'Not Started'), color: '#6B7280' }, { label: 'At Risk / Delayed', value: cnt((a) => a.status === 'At Risk' || a.status === 'Delayed'), color: '#F59E0B' },
        { label: 'Red / Amber RAG', value: `${cnt((a) => a.rag === 'Red')} / ${cnt((a) => a.rag === 'Amber')}`, color: '#DC2626' }, { label: 'Critical path', value: cnt((a) => a.criticalPath), color: '#8B5CF6' },
        { label: 'Sign-off pending (done)', value: cnt((a) => a.status === 'Completed' && a.signOff === 'Pending'), color: '#F97316' }, { label: 'Overall % complete', value: `${avg(scope)}%`, color: '#111827' },
      ]} />
      <Toolbar right={<span className="text-[12px] text-ink-500"><button className="link" onClick={() => setOpen(Object.fromEntries(groups.map((g) => [g.name, true])))}>Expand all</button> · <button className="link" onClick={() => setOpen(Object.fromEntries(groups.map((g) => [g.name, false])))}>Collapse all</button></span>}>
        {!ws && <MiniSelect label="WBS workstream" value={fWbs} options={wbsOptions} onChange={(v) => { setFWbs(v); setFSub(ALL) }} width={220} />}
        {ws && <MiniSelect label="WBS workstream" value={fWbs} options={wbsOptions} onChange={(v) => { setFWbs(v); setFSub(ALL) }} width={220} />}
        <MiniSelect label="Sub-workstream" value={fSub} options={subOptions} onChange={setFSub} width={200} />
        <MiniSelect label="Status" value={fStatus} options={[ALL, ...ACT_STATUSES]} onChange={setFStatus} />
        <MiniSelect label="RAG" value={fRag} options={[ALL, 'Green', 'Amber', 'Red']} onChange={setFRag} />
        <MiniSelect label="Path" value={fCp} options={[ALL, 'Critical path', 'Non-critical']} onChange={setFCp} />
        <SearchBox value={q} onChange={setQ} placeholder="Search code, activity, owner…" />
      </Toolbar>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full border-separate border-spacing-0 tbl">
          <thead><tr>
            <th className="th w-[70px]">Code</th><th className="th">Activity</th><th className="th">Responsible</th><th className="th">Baseline End</th><th className="th">Forecast End</th>
            <th className="th">Status</th><th className="th w-[130px]">% Complete</th><th className="th">RAG</th><th className="th">Critical</th><th className="th">Sign-off</th>
          </tr></thead>
          <tbody>
            {groups.length === 0 && <tr><td className="td text-ink-500 text-center py-6" colSpan={cols}>No activities match the current filters.</td></tr>}
            {groups.map((g) => {
              const all = g.subs.flatMap((s) => s.list)
              const o = isOpen(g.name)
              return [
                <tr key={g.name} className="cursor-pointer hover:bg-brand-50/60" onClick={() => setOpen({ ...open, [g.name]: !o })}>
                  <td className="td bg-surface/80 py-2" colSpan={2}><span className="inline-flex items-center gap-1.5 font-semibold text-ink-900">{o ? <ChevronDown size={14} className="text-ink-400" /> : <ChevronRight size={14} className="text-ink-400" />}{g.name}</span></td>
                  <td className="td bg-surface/80 text-[12px] text-ink-500" colSpan={3}>{g.subs.length} sub-workstreams · {all.length} activities · {shortWs(WBS_TO_DASHBOARD[g.name] ?? all[0]?.workstream ?? '')}</td>
                  <td className="td bg-surface/80 text-[12px] text-ink-500"><span className="text-green-700">{all.filter((a) => a.status === 'Completed').length} done</span> · <span className="text-brand-600">{all.filter((a) => a.status === 'In Progress').length} active</span></td>
                  <td className="td bg-surface/80"><PctBar value={avg(all)} width={70} /></td>
                  <td className="td bg-surface/80 text-[12px]"><span className="inline-flex items-center gap-1">{['Red', 'Amber'].map((r) => { const n = all.filter((a) => a.rag === r).length; return n ? <span key={r} className="inline-flex items-center gap-0.5"><span className="w-2 h-2 rounded-full" style={{ background: RAG_DOT[r] }} />{n}</span> : null })}</span></td>
                  <td className="td bg-surface/80 text-[12px] text-ink-500">{all.filter((a) => a.criticalPath).length ? <span className="inline-flex items-center gap-1 text-violet-600"><Flag size={11} />{all.filter((a) => a.criticalPath).length}</span> : ''}</td>
                  <td className="td bg-surface/80 text-[12px] text-ink-500">{all.filter((a) => a.signOff === 'Signed').length}/{all.length}</td>
                </tr>,
                ...(o ? g.subs.flatMap((s) => [
                  <tr key={s.name}><td className="td py-1.5 text-[12px] font-medium text-brand-700 bg-brand-50/40" colSpan={cols}><span className="pl-5">{s.name}</span> <span className="text-ink-500 font-normal">· {s.list.length} activities · {avg(s.list)}% complete</span></td></tr>,
                  ...s.list.map((a) => (
                    <tr key={a.id} className="cursor-pointer hover:bg-brand-50/60" onClick={() => setEdit({ item: a, isNew: false })}>
                      <td className="td py-1.5 text-[12px] text-ink-500 font-mono">{a.code}</td>
                      <td className="td py-1.5"><span className="pl-5 block max-w-[460px] truncate" title={a.name}>{a.name}</span></td>
                      <td className="td py-1.5 text-[12.5px]">{a.responsible}</td>
                      <td className="td py-1.5 text-[12.5px] whitespace-nowrap">{fmtDateShort(a.baselineEnd)}</td>
                      <td className="td py-1.5 text-[12.5px] whitespace-nowrap"><span className={a.daysDelayed > 0 ? 'text-red-600 font-medium' : ''}>{fmtDateShort(a.forecastEnd)}{a.daysDelayed > 0 && <span className="text-[11px]"> (+{a.daysDelayed}d)</span>}</span></td>
                      <td className="td py-1.5"><Badge value={a.status} /></td>
                      <td className="td py-1.5"><PctBar value={a.percentComplete} width={70} /></td>
                      <td className="td py-1.5"><span className="inline-flex items-center gap-1.5 text-[12px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: RAG_DOT[a.rag] }} />{a.rag}</span></td>
                      <td className="td py-1.5 text-[12px]">{a.criticalPath ? <span className="inline-flex items-center gap-1 text-violet-600 font-medium"><Flag size={11} /> Yes</span> : <span className="text-ink-400">No</span>}</td>
                      <td className="td py-1.5"><Badge value={a.signOff === 'Signed' ? 'Approved' : 'Pending'} className="!px-1.5" /></td>
                    </tr>
                  )),
                ]) : []),
              ]
            })}
          </tbody>
        </table>
      </div>
      {edit && <ActivityForm initial={edit.item} isNew={edit.isNew} onClose={() => setEdit(null)} onSave={(v) => { acts.update({ ...v, lastUpdated: TODAY }); setEdit(null) }} onDelete={edit.isNew ? undefined : () => { acts.remove(edit.item.id); setEdit(null) }} />}
    </Card>
  )
}

/* ---------- Activity detail / edit modal: every tracking field, grouped ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-4"><div className="text-[12px] font-semibold text-brand-600 uppercase tracking-wide border-b border-line pb-1 mb-2">{title}</div>{children}</div>
}
export function ActivityForm({ initial, isNew, onSave, onDelete, onClose }: { initial: Activity; isNew: boolean; onSave: (v: Activity) => void; onDelete?: () => void; onClose: () => void }) {
  const { f, set, txt, num, chk } = useFields(initial)
  const wbs = WBS.find((w) => wbsLabel(w) === f.wbsWorkstream)
  const subs = wbs?.subs ?? []
  const onWbs = (label: string) => { const w = WBS.find((x) => wbsLabel(x) === label); if (!w) return; set('wbsWorkstream', label); set('subWorkstream', subLabel(w.subs[0])); set('workstream', WBS_TO_DASHBOARD[label] ?? f.workstream) }
  const variance = f.budgetLakh - f.forecastLakh
  return (
    <Modal open onClose={onClose} width="max-w-4xl" title={isNew ? 'Add activity' : <span>{f.code} · {f.name}</span>}
      footer={<FormFooter onClose={onClose} onDelete={onDelete} onSave={() => onSave(f)} />}>
      <Section title="Classification">
        <FormGrid cols={3}>
          <Field label="WBS workstream"><SelectKV options={WBS.map((w) => ({ value: wbsLabel(w), label: wbsLabel(w) }))} value={f.wbsWorkstream} onChange={(e) => onWbs(e.target.value)} /></Field>
          <Field label="Sub-workstream"><SelectKV options={subs.map((s) => ({ value: subLabel(s), label: subLabel(s) }))} value={f.subWorkstream} onChange={(e) => set('subWorkstream', e.target.value)} /></Field>
          <Field label="Dashboard workstream"><Input value={f.workstream} readOnly className="bg-surface" /></Field>
          <Field label="Activity code"><Input {...txt('code')} placeholder="e.g. 7.2.4" /></Field>
          <Field label="Activity name" className="col-span-2"><Input {...txt('name')} /></Field>
        </FormGrid>
      </Section>
      <Section title="Accountability">
        <FormGrid cols={3}>
          <Field label="Responsible"><Select options={uniq([f.responsible, ...OWNERS])} {...txt('responsible')} /></Field>
          <Field label="Accountable"><Select options={uniq([f.accountable, ...OWNERS])} {...txt('accountable')} /></Field>
          <Field label="Vendor / partner"><Input {...txt('vendor')} placeholder="—" /></Field>
        </FormGrid>
      </Section>
      <Section title="Schedule">
        <FormGrid cols={3}>
          <Field label="Baseline start"><Input type="date" {...txt('baselineStart')} /></Field>
          <Field label="Baseline end"><Input type="date" {...txt('baselineEnd')} /></Field>
          <Field label="Days delayed"><Input {...num('daysDelayed')} /></Field>
          <Field label="Forecast start"><Input type="date" {...txt('forecastStart')} /></Field>
          <Field label="Forecast end"><Input type="date" {...txt('forecastEnd')} /></Field>
          <Field label="Last updated"><Input type="date" value={f.lastUpdated} readOnly className="bg-surface" /></Field>
          <Field label="Actual start"><Input type="date" {...txt('actualStart')} /></Field>
          <Field label="Actual end"><Input type="date" {...txt('actualEnd')} /></Field>
        </FormGrid>
      </Section>
      <Section title="Progress">
        <FormGrid cols={3}>
          <Field label="Status"><Select options={ACT_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as Status)} /></Field>
          <Field label="% complete"><Input {...num('percentComplete')} min={0} max={100} /></Field>
          <Field label="RAG"><Select options={['Green', 'Amber', 'Red']} value={f.rag} onChange={(e) => set('rag', e.target.value as Activity['rag'])} /></Field>
        </FormGrid>
      </Section>
      <Section title="Dependencies">
        <FormGrid cols={3}>
          <Field label="Predecessor (code)"><Input {...txt('predecessor')} /></Field>
          <Field label="Successor (code)"><Input {...txt('successor')} /></Field>
          <Checkbox label="On critical path" {...chk('criticalPath')} />
        </FormGrid>
      </Section>
      <Section title="Financial (₹ Lakh)">
        <FormGrid cols={3}>
          <Field label="Budget"><Input {...num('budgetLakh')} /></Field>
          <Field label="Commitment"><Input {...num('commitmentLakh')} /></Field>
          <Field label="Actual"><Input {...num('actualLakh')} /></Field>
          <Field label="Forecast"><Input {...num('forecastLakh')} /></Field>
          <Field label="Variance (budget − forecast)"><Input value={variance.toFixed(1)} readOnly className={variance < 0 ? 'bg-red-50 text-red-700' : 'bg-surface'} /></Field>
        </FormGrid>
      </Section>
      <Section title="Governance & completion">
        <FormGrid cols={2}>
          <Field label="Deliverable" className="col-span-2"><Input {...txt('deliverable')} /></Field>
          <Field label="Acceptance criteria" className="col-span-2"><TextArea {...txt('acceptanceCriteria')} /></Field>
          <Field label="Evidence (link / document)"><Input {...txt('evidence')} placeholder="Document reference or URL" /></Field>
          <Field label="Sign-off"><Select options={['Pending', 'Signed']} value={f.signOff} onChange={(e) => set('signOff', e.target.value as Activity['signOff'])} /></Field>
        </FormGrid>
      </Section>
    </Modal>
  )
}
