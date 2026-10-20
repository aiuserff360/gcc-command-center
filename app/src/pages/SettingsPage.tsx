import { useMemo, useRef, useState } from 'react'
import { Save, Plus, Pencil, X, Download, Upload, RotateCcw, Users, Shield, Database, Bell, ListChecks, Building2, UserX, UserCheck } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Card, Badge, Table, Tabs, Modal, Field, Input, Select, TextArea, FormGrid, ConfirmDelete, SectionTitle, Progress } from '../components/ui'
import { useCollection, useStore, uid } from '../store/useStore'
import { seedProgramKpis, seedWorkstreamSummaries, type ProgramKpis, type WorkstreamSummary } from '../data/shared'
import { WORKSTREAMS, OWNERS, fmtDate, TODAY, CHART_COLORS, type Workstream, type Status } from '../data/common'
import { WBS, WBS_TO_DASHBOARD } from '../data/wbs'
import { seedUsers, seedLookups, seedNotificationSettings, USER_ROLES, MODULES, PERMISSION_MATRIX, WEEKDAYS, type User, type LookupList, type NotificationSettings } from '../data/settings'
import { useMoney } from '../data/money'

const TABS = ['Program', 'Workstreams & Owners', 'Users & Roles', 'Lookup Values', 'Notifications', 'Data & Reset']
const PROGRAMS = ['GCC Program - India', 'GCC Program - Poland', 'GCC Program - Philippines']

export default function SettingsPage() {
  const [tab, setTab] = useState(TABS[0])
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Configure program, workstreams, users, lookup values and preferences." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'Program' && <ProgramTab />}
      {tab === 'Workstreams & Owners' && <WorkstreamsTab />}
      {tab === 'Users & Roles' && <UsersTab />}
      {tab === 'Lookup Values' && <LookupsTab />}
      {tab === 'Notifications' && <NotificationsTab />}
      {tab === 'Data & Reset' && <DataTab />}
    </div>
  )
}

function SaveBar({ dirty, saved, onSave, onDiscard }: { dirty: boolean; saved: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div className="flex items-center justify-end gap-3">
      {saved && <span className="text-[12.5px] text-green-600">Saved</span>}
      <button className="btn-secondary" disabled={!dirty} onClick={onDiscard}>Discard</button>
      <button className="btn-primary" disabled={!dirty} onClick={onSave}><Save size={14} /> Save</button>
    </div>
  )
}
function useSaved() { const [saved, setSaved] = useState(false); return { saved, flash: () => { setSaved(true); setTimeout(() => setSaved(false), 1500) } } }

/* ====================================================================== */
function ProgramTab() {
  const kpisC = useCollection<ProgramKpis>('programKpis', seedProgramKpis)
  const k = kpisC.items[0] ?? seedProgramKpis[0]
  const program = useStore((s) => s.program)
  const setProgram = useStore((s) => s.setProgram)
  const setPhase = useStore((s) => s.setPhase)
  const [f, setF] = useState<ProgramKpis>(k)
  const { saved, flash } = useSaved()
  const dirty = JSON.stringify(f) !== JSON.stringify(k)
  const save = () => { kpisC.update(f); setPhase(f.lifecyclePhase); flash() }
  const num = (key: keyof ProgramKpis) => ({ type: 'number', step: 'any', value: f[key] as number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [key]: parseFloat(e.target.value) || 0 }) }) as const
  const m = useMoney()
  // money fields: shown in the selected currency, stored in ₹ Cr
  const money = (key: 'approvedBudgetCr' | 'targetBenefitsCr') => ({ type: 'number', step: 'any', value: m.inputValue(f[key]), onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [key]: m.toBase(parseFloat(e.target.value) || 0) }) }) as const
  const months = Math.round((new Date(f.timelineEnd).getTime() - new Date(f.timelineStart).getTime()) / (30.44 * 86400000))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_340px] gap-4">
        <Card title="Program configuration" subtitle="Core program record used by the Dashboard headline tiles and reports">
          <FormGrid cols={3}>
            <Field label="Program name" className="col-span-3"><Input value={f.programName} onChange={(e) => setF({ ...f, programName: e.target.value })} /></Field>
            <Field label="Timeline start"><Input type="date" value={f.timelineStart} onChange={(e) => setF({ ...f, timelineStart: e.target.value })} /></Field>
            <Field label="Timeline end"><Input type="date" value={f.timelineEnd} onChange={(e) => setF({ ...f, timelineEnd: e.target.value })} /></Field>
            <Field label="Go-live target"><Input type="date" value={f.goLiveTarget} onChange={(e) => setF({ ...f, goLiveTarget: e.target.value })} /></Field>
            <Field label="Talent target (headcount)"><Input {...num('talentTarget')} /></Field>
            <Field label={`Approved budget (${m.unitLabel})`}><Input {...money('approvedBudgetCr')} /></Field>
            <Field label={`Target benefits – annual (${m.unitLabel})`}><Input {...money('targetBenefitsCr')} /></Field>
          </FormGrid>
          <div className="mt-4 rounded-lg bg-surface p-3 text-[12.5px] text-ink-700">
            <b>Currency & units.</b> {m.currency === 'INR'
              ? 'Monetary values are stored and shown in Indian Rupees, Crore (₹ Cr; 1 Cr = 10 million). Activity-level budgets in the WBS register are in Lakh (₹ L; 100 L = 1 Cr). Switch the top bar to EUR to view every amount in Euro millions at the rate set under Currency.'
              : `Monetary values are shown in Euro, millions (€ M), converted at ${m.rate} INR per EUR from the stored Indian Rupee (crore) values. Activity-level budgets in the WBS register are shown in € K (thousands). Switch the top bar to INR to view the stored amounts.`} Headcount is in full-time equivalents (FTE). Dates follow DD Mon YYYY; the program calendar runs {months} months from {fmtDate(f.timelineStart)} to {fmtDate(f.timelineEnd)}.
          </div>
          <div className="mt-4"><SaveBar dirty={dirty} saved={saved} onSave={save} onDiscard={() => setF(k)} /></div>
        </Card>
        <div className="space-y-4">
          <CurrencyCard />
          <Card title="Selected program" subtitle="Shown in the top bar; switches the data context">
            <Select options={PROGRAMS} value={program} onChange={(e) => setProgram(e.target.value)} />
            <p className="text-[11.5px] text-ink-500 mt-2">Each program keeps its own data set; switching programs swaps every page to that program's data.</p>
          </Card>
          <Card title="Program snapshot">
            {[['Program completion', `${k.programCompletion}%`], ['Milestone adherence', `${k.milestoneAdherence}%`], ['Talent onboarded', `${k.talentOnboarded} / ${k.talentTarget}`], ['Actual spend', `${m.fmt(k.actualSpendCr)} of ${m.fmt(k.approvedBudgetCr)}`], ['Go-live target', fmtDate(k.goLiveTarget)]].map(([l, v]) => (
              <div key={l} className="flex justify-between text-[12.5px] py-1 border-b border-line/70 last:border-b-0"><span className="text-ink-500">{l}</span><span className="font-medium">{v}</span></div>
            ))}
            <p className="text-[11.5px] text-ink-500 mt-2">Performance KPIs are maintained from the Dashboard (“Update program KPIs”).</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ====================================================================== */
function WorkstreamsTab() {
  const wsC = useCollection<WorkstreamSummary>('workstreamSummaries', seedWorkstreamSummaries)
  const [edit, setEdit] = useState<WorkstreamSummary | null>(null)
  const [isNew, setIsNew] = useState(false)
  const blank = (): WorkstreamSummary => ({ id: '', name: 'Operations Setup', description: '', progress: 0, status: 'Not Started', owner: 'A. Sharma', lead: 'A. Sharma', executiveSponsor: '', teamSize: 0, activeInitiatives: 0, scheduleHealth: 'Not Started', budgetHealth: 'On Track', approvedBudgetCr: 0, actualSpendCr: 0, forecastAtCompletionCr: 0 })
  const wbsRows = WBS.map((w) => ({ id: w.code, code: w.code, name: w.name, subs: w.subs.length, activities: w.subs.reduce((a, s) => a + s.activities.length, 0), dashboard: WBS_TO_DASHBOARD[w.name] ?? WBS_TO_DASHBOARD[`${w.code}. ${w.name}`] ?? '—' }))
  const STATUSES: Status[] = ['On Track', 'At Risk', 'Delayed', 'Not Started', 'Completed']
  const m = useMoney()
  return (
    <div className="space-y-4">
      <Card title="Workstreams & Owners" subtitle="Dashboard workstreams with accountable owner, lead and executive sponsor" action={<button className="btn-primary" onClick={() => { setIsNew(true); setEdit(blank()) }}><Plus size={14} /> Add workstream</button>}>
        <Table<WorkstreamSummary> rows={wsC.items} onRowClick={(w) => { setIsNew(false); setEdit(w) }} columns={[
          { key: 'name', header: 'Workstream', render: (w) => <span className="font-medium">{w.name}</span> },
          { key: 'description', header: 'Description', render: (w) => <span className="text-ink-700 text-[12.5px]">{w.description}</span> },
          { key: 'owner', header: 'Owner' },
          { key: 'lead', header: 'Lead' },
          { key: 'executiveSponsor', header: 'Executive sponsor' },
          { key: 'teamSize', header: 'Team', className: 'text-right' },
          { key: 'status', header: 'Status', render: (w) => <Badge value={w.status} /> },
          { key: 'e', header: '', render: () => <Pencil size={13} className="text-ink-400" /> },
        ]} />
      </Card>
      <Card title="WBS → dashboard workstream mapping" subtitle="The 16 WBS workstreams from the GCC setup activity library roll up into the 7 dashboard workstreams">
        <div className="rounded-lg bg-brand-50 text-brand-600 text-[12px] px-3 py-2 mb-3">Read-only. The mapping is defined in the activity library (src/data/wbs.ts) so that WBS activities, budgets and RAG roll up consistently across Program Planning, Workstreams and Reports. Change it in the master library, not here.</div>
        <Table<{ id: string; code: string; name: string; subs: number; activities: number; dashboard: string }> compact rows={wbsRows} columns={[
          { key: 'code', header: '#', width: '40px', render: (r) => <span className="text-ink-500">{r.code}</span> },
          { key: 'name', header: 'WBS workstream', render: (r) => <span className="font-medium">{r.name.replace(/^\d+\.\s*/, '')}</span> },
          { key: 'subs', header: 'Sub-workstreams', className: 'text-right' },
          { key: 'activities', header: 'Activities', className: 'text-right' },
          { key: 'dashboard', header: 'Dashboard workstream', render: (r) => <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: WORKSTREAMS.includes(r.dashboard as Workstream) ? CHART_COLORS.blue : CHART_COLORS.gray }} />{r.dashboard}</span> },
          { key: 'ownerOf', header: 'Owner', render: (r) => wsC.items.find((w) => w.name === r.dashboard)?.owner ?? '—' },
        ]} />
      </Card>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={isNew ? 'Add workstream' : `Edit workstream – ${edit.name}`} footer={<>
          {!isNew && <ConfirmDelete onConfirm={() => { wsC.remove(edit.id); setEdit(null) }} />}<span className="flex-1" />
          <button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" onClick={() => { isNew ? wsC.add({ ...edit, id: uid('ws') }) : wsC.update(edit); setEdit(null) }}>Save</button></>}>
          <FormGrid cols={3}>
            <Field label="Workstream" className="col-span-2">{isNew ? <Select options={WORKSTREAMS} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value as Workstream })} /> : <Input value={edit.name} readOnly className="bg-surface" />}</Field>
            <Field label="Status"><Select options={STATUSES} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Status })} /></Field>
            <Field label="Description" className="col-span-3"><TextArea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label="Owner"><Select options={OWNERS} value={edit.owner} onChange={(e) => setEdit({ ...edit, owner: e.target.value })} /></Field>
            <Field label="Lead"><Select options={OWNERS} value={edit.lead} onChange={(e) => setEdit({ ...edit, lead: e.target.value })} /></Field>
            <Field label="Executive sponsor"><Input value={edit.executiveSponsor} onChange={(e) => setEdit({ ...edit, executiveSponsor: e.target.value })} /></Field>
            <Field label="Team size"><Input type="number" value={edit.teamSize} onChange={(e) => setEdit({ ...edit, teamSize: +e.target.value || 0 })} /></Field>
            <Field label={`Approved budget (${m.unitLabel})`}><Input type="number" step="any" value={m.inputValue(edit.approvedBudgetCr)} onChange={(e) => setEdit({ ...edit, approvedBudgetCr: m.toBase(parseFloat(e.target.value) || 0) })} /></Field>
            <Field label="Progress %"><Input type="number" value={edit.progress} onChange={(e) => setEdit({ ...edit, progress: Math.min(100, +e.target.value || 0) })} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

/* ====================================================================== */
function UsersTab() {
  const usersC = useCollection<User>('users', seedUsers)
  const [edit, setEdit] = useState<User | null>(null)
  const [roleF, setRoleF] = useState('All')
  const rows = usersC.items.filter((u) => roleF === 'All' || u.role === roleF)
  const byRole = USER_ROLES.map((r) => ({ r, n: usersC.items.filter((u) => u.role === r && u.status !== 'Deactivated').length }))
  const permCls: Record<string, string> = { Approve: 'bg-green-50 text-green-700', Edit: 'bg-blue-50 text-brand-600', View: 'bg-slate-100 text-slate-600', '—': 'text-ink-400' }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_280px] gap-4">
        <Card title="Users" subtitle={`${usersC.items.filter((u) => u.status === 'Active').length} active · ${usersC.items.filter((u) => u.status === 'Invited').length} invited · ${usersC.items.filter((u) => u.status === 'Deactivated').length} deactivated`}
          headerRight={<select className="input py-1 w-auto" value={roleF} onChange={(e) => setRoleF(e.target.value)}>{['All', ...USER_ROLES].map((o) => <option key={o}>{o}</option>)}</select>}
          action={<button className="btn-primary whitespace-nowrap" onClick={() => setEdit({ id: '', name: '', role: 'Viewer', workstream: 'All', handle: '', status: 'Invited', lastActive: '' })}><Plus size={14} /> Add user</button>}>
          <Table<User> rows={rows} onRowClick={setEdit} columns={[
            { key: 'name', header: 'Name', render: (u) => <span className="inline-flex items-center gap-2 font-medium"><span className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 text-[11px] font-semibold flex items-center justify-center">{u.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>{u.name}</span> },
            { key: 'role', header: 'Role' },
            { key: 'workstream', header: 'Workstream' },
            { key: 'handle', header: 'Email handle', render: (u) => <span className="font-mono text-[12px]">{u.handle}</span> },
            { key: 'status', header: 'Status', render: (u) => <Badge value={u.status === 'Invited' ? 'Pending' : u.status === 'Deactivated' ? 'Closed' : 'Active'} className="" /> },
            { key: 'lastActive', header: 'Last active', render: (u) => u.lastActive ? fmtDate(u.lastActive) : '—' },
            { key: 'act', header: '', render: (u) => <span onClick={(e) => e.stopPropagation()}>{u.status === 'Deactivated' ? <button className="link inline-flex items-center gap-1" onClick={() => usersC.update({ ...u, status: 'Active' })}><UserCheck size={12} /> Reactivate</button> : <button className="text-[12px] text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer" onClick={() => { if (window.confirm(`Deactivate ${u.name}?`)) usersC.update({ ...u, status: 'Deactivated' }) }}><UserX size={12} /> Deactivate</button>}</span> },
          ]} />
        </Card>
        <Card title="Users by role">
          <div className="space-y-2">{byRole.map(({ r, n }) => <div key={r} className="flex items-center gap-2 text-[12.5px]"><span className="w-[120px] text-ink-700">{r}</span><Progress value={(n / Math.max(1, ...byRole.map((x) => x.n))) * 100} className="flex-1" color={CHART_COLORS.blueLight} /><span className="w-5 text-right font-medium">{n}</span></div>)}</div>
          <div className="mt-4 text-[12px] text-ink-500 space-y-1">
            <p><b className="text-ink-700">Program Manager</b> – full edit and approval rights across modules.</p>
            <p><b className="text-ink-700">Workstream Lead</b> – edits records within own workstream.</p>
            <p><b className="text-ink-700">Steering Member</b> – read access plus approvals for decisions and documents.</p>
            <p><b className="text-ink-700">Viewer</b> – read-only.</p>
          </div>
        </Card>
      </div>
      <Card title={<span className="inline-flex items-center gap-2"><Shield size={16} className="text-brand-600" /> Roles & permissions matrix</span>} subtitle="Module × role → highest permission">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full border-separate border-spacing-0 tbl">
            <thead><tr><th className="th">Module</th>{USER_ROLES.map((r) => <th key={r} className="th text-center">{r}</th>)}</tr></thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m}><td className="td font-medium">{m}</td>{USER_ROLES.map((r) => { const p = PERMISSION_MATRIX[m][r]; return <td key={r} className="td text-center"><span className={`inline-block rounded-md px-2 py-0.5 text-[11.5px] font-medium ${permCls[p]}`}>{p}</span></td> })}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? `Edit user – ${edit.name}` : 'Add user'} width="max-w-lg" footer={<>
          {edit.id && <ConfirmDelete onConfirm={() => { usersC.remove(edit.id); setEdit(null) }} />}<span className="flex-1" />
          <button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" disabled={!edit.name || !edit.handle} onClick={() => { edit.id ? usersC.update(edit) : usersC.add({ ...edit, id: uid('us') }); setEdit(null) }}>{edit.id ? 'Save' : 'Send invite'}</button></>}>
          <FormGrid cols={2}>
            <Field label="Full name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value, handle: edit.id ? edit.handle : e.target.value.trim().toLowerCase().replace(/^(\w)\w*\s+/, '$1.').replace(/[^a-z.]/g, '') })} /></Field>
            <Field label="Email handle (without domain)"><Input value={edit.handle} onChange={(e) => setEdit({ ...edit, handle: e.target.value })} /></Field>
            <Field label="Role"><Select options={USER_ROLES} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as User['role'] })} /></Field>
            <Field label="Workstream"><Select options={['All', ...WORKSTREAMS]} value={edit.workstream} onChange={(e) => setEdit({ ...edit, workstream: e.target.value })} /></Field>
            <Field label="Status"><Select options={['Active', 'Invited', 'Deactivated']} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as User['status'] })} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

/* ====================================================================== */
function LookupsTab() {
  const lkC = useCollection<LookupList>('lookups', seedLookups)
  const [sel, setSel] = useState(seedLookups[0].id)
  const list = lkC.items.find((l) => l.id === sel) ?? lkC.items[0]
  const [val, setVal] = useState('')
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editVal, setEditVal] = useState('')
  const [addList, setAddList] = useState(false)
  const [newList, setNewList] = useState({ name: '', description: '' })
  if (!list) return null
  const add = () => { const v = val.trim(); if (!v || list.values.includes(v)) return; lkC.update({ ...list, values: [...list.values, v] }); setVal('') }
  const remove = (i: number) => lkC.update({ ...list, values: list.values.filter((_, j) => j !== i) })
  const move = (i: number, d: -1 | 1) => { const v = [...list.values]; const j = i + d; if (j < 0 || j >= v.length) return; [v[i], v[j]] = [v[j], v[i]]; lkC.update({ ...list, values: v }) }
  const commitEdit = () => { if (editIdx === null) return; const v = [...list.values]; v[editIdx] = editVal.trim() || v[editIdx]; lkC.update({ ...list, values: v }); setEditIdx(null) }
  return (
    <div className="grid grid-cols-[280px_1fr] gap-4">
      <Card title={<span className="inline-flex items-center gap-2"><ListChecks size={16} className="text-brand-600" /> Lookup lists</span>} action={<button className="link inline-flex items-center gap-1" onClick={() => setAddList(true)}><Plus size={12} /> New list</button>}>
        <div className="space-y-1 -mx-1">
          {lkC.items.map((l) => (
            <button key={l.id} onClick={() => { setSel(l.id); setEditIdx(null) }} className={`w-full text-left px-2 py-2 rounded-md cursor-pointer ${l.id === list.id ? 'bg-brand-50' : 'hover:bg-surface'}`}>
              <div className={`text-[13px] font-medium ${l.id === list.id ? 'text-brand-600' : 'text-ink-900'}`}>{l.name} <span className="text-[11px] text-ink-400 font-normal">({l.values.length})</span></div>
              <div className="text-[11.5px] text-ink-500 truncate">{l.description}</div>
            </button>
          ))}
        </div>
      </Card>
      <Card title={list.name} subtitle={list.description} action={lkC.items.length > 1 && !seedLookups.some((s) => s.id === list.id) ? <ConfirmDelete label="Delete list" onConfirm={() => { lkC.remove(list.id); setSel(lkC.items[0].id) }} /> : undefined}>
        <div className="flex gap-2 mb-3">
          <Input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={`Add a value to “${list.name}”…`} />
          <button className="btn-primary shrink-0" onClick={add} disabled={!val.trim()}><Plus size={14} /> Add value</button>
        </div>
        <div className="divide-y divide-line/70 rounded-lg border border-line">
          {list.values.map((v, i) => (
            <div key={`${v}-${i}`} className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-surface group">
              <span className="w-6 text-[11px] text-ink-400">{i + 1}</span>
              {editIdx === i ? <Input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditIdx(null) }} onBlur={commitEdit} className="py-1" /> : <span className="flex-1">{list.id === 'lk-status' || list.id === 'lk-priority' ? <Badge value={v} /> : v}</span>}
              <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button className="text-ink-400 hover:text-ink-900 cursor-pointer px-1" title="Move up" onClick={() => move(i, -1)}>↑</button>
                <button className="text-ink-400 hover:text-ink-900 cursor-pointer px-1" title="Move down" onClick={() => move(i, 1)}>↓</button>
                <button className="text-ink-400 hover:text-ink-900 cursor-pointer px-1" title="Edit" onClick={() => { setEditIdx(i); setEditVal(v) }}><Pencil size={13} /></button>
                <button className="text-ink-400 hover:text-red-600 cursor-pointer px-1" title="Remove" onClick={() => remove(i)}><X size={14} /></button>
              </span>
            </div>
          ))}
          {list.values.length === 0 && <div className="px-3 py-6 text-center text-[12.5px] text-ink-500">No values. Add one above.</div>}
        </div>
        <p className="text-[11.5px] text-ink-500 mt-3">Values are offered in forms across the application. Removing a value does not change records that already use it.</p>
      </Card>
      {addList && (
        <Modal open onClose={() => setAddList(false)} title="New lookup list" width="max-w-md" footer={<><button className="btn-secondary" onClick={() => setAddList(false)}>Cancel</button><button className="btn-primary" disabled={!newList.name} onClick={() => { const id = uid('lk'); lkC.add({ id, name: newList.name, description: newList.description, values: [] }); setSel(id); setAddList(false); setNewList({ name: '', description: '' }) }}>Create</button></>}>
          <FormGrid cols={1}>
            <Field label="Name"><Input value={newList.name} onChange={(e) => setNewList({ ...newList, name: e.target.value })} placeholder="e.g. Vendor categories" /></Field>
            <Field label="Description"><Input value={newList.description} onChange={(e) => setNewList({ ...newList, description: e.target.value })} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

/* ====================================================================== */
function NotificationsTab() {
  const nC = useCollection<NotificationSettings>('notificationSettings', seedNotificationSettings)
  const n = nC.items[0] ?? seedNotificationSettings[0]
  const [f, setF] = useState<NotificationSettings>(n)
  const { saved, flash } = useSaved()
  const dirty = JSON.stringify(f) !== JSON.stringify(n)
  const Toggle = ({ k, label, hint, children }: { k: keyof NotificationSettings; label: string; hint: string; children?: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-line/70 last:border-b-0">
      <div className="min-w-0"><div className="text-[13px] font-medium text-ink-900">{label}</div><div className="text-[12px] text-ink-500">{hint}</div>{f[k] && children && <div className="mt-2 flex items-center gap-2 text-[12.5px] whitespace-nowrap [&_input[type=number]]:!w-[80px]">{children}</div>}</div>
      <button className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer mt-0.5 ${f[k] ? 'bg-brand-600' : 'bg-slate-300'}`} onClick={() => setF({ ...f, [k]: !f[k] })}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${f[k] ? 'left-[18px]' : 'left-0.5'}`} /></button>
    </div>
  )
  const small = 'input py-1 text-center'
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card title={<span className="inline-flex items-center gap-2"><Bell size={16} className="text-brand-600" /> Alerts & thresholds</span>}>
          <Toggle k="milestoneReminders" label="Milestone due reminders" hint="Remind owners before a milestone is due"><span>Send</span><input className={small} type="number" min={1} value={f.milestoneReminderDays} onChange={(e) => setF({ ...f, milestoneReminderDays: +e.target.value || 1 })} /><span>days before due date</span></Toggle>
          <Toggle k="riskEscalationAlerts" label="Risk escalation alerts" hint="Alert the Steering Committee when a risk is escalated"><span>For risks rated</span><select className="input w-auto py-1" value={f.riskEscalationLevel} onChange={(e) => setF({ ...f, riskEscalationLevel: e.target.value as NotificationSettings['riskEscalationLevel'] })}>{['Critical', 'High', 'Medium'].map((o) => <option key={o}>{o}</option>)}</select><span>and above</span></Toggle>
          <Toggle k="budgetVarianceAlerts" label="Budget variance alerts" hint="Alert when forecast at completion exceeds the approved budget"><span>Threshold</span><input className={small} type="number" min={1} value={f.budgetVarianceThresholdPct} onChange={(e) => setF({ ...f, budgetVarianceThresholdPct: +e.target.value || 1 })} /><span>% variance</span></Toggle>
          <Toggle k="hiringGapAlerts" label="Hiring gap alerts" hint="Alert when onboarded headcount falls behind plan"><span>Threshold</span><input className={small} type="number" min={1} value={f.hiringGapThresholdPct} onChange={(e) => setF({ ...f, hiringGapThresholdPct: +e.target.value || 1 })} /><span>% behind plan</span></Toggle>
          <Toggle k="syncFailureAlerts" label="Integration sync failures" hint="Alert integration owners after retries are exhausted" />
        </Card>
        <div className="space-y-4">
          <Card title="Weekly digest">
            <Toggle k="weeklyDigest" label="Send weekly digest" hint="Summary of milestones, risks, decisions and reports for the week"><span>Every</span><select className="input w-auto py-1" value={f.weeklyDigestDay} onChange={(e) => setF({ ...f, weeklyDigestDay: e.target.value })}>{WEEKDAYS.map((d) => <option key={d}>{d}</option>)}</select><span>at</span><input className="input py-1 !w-[124px]" type="time" value={f.weeklyDigestTime} onChange={(e) => setF({ ...f, weeklyDigestTime: e.target.value })} /></Toggle>
          </Card>
          <Card title="Delivery channel">
            <div className="flex gap-2">{(['Email', 'Teams', 'Both'] as const).map((c) => <button key={c} onClick={() => setF({ ...f, channel: c })} className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium cursor-pointer ${f.channel === c ? 'border-brand-600 bg-brand-50 text-brand-600' : 'border-line text-ink-700 hover:bg-surface'}`}>{c}</button>)}</div>
            <p className="text-[11.5px] text-ink-500 mt-2">Teams notifications are posted via the Microsoft Teams connector (see Integrations).</p>
          </Card>
          <Card title="Preview">
            <div className="rounded-lg border border-line p-3 text-[12.5px] space-y-1">
              <div className="font-semibold text-ink-900">Active rules</div>
              <ul className="list-disc pl-4 text-ink-700 space-y-0.5">
                {f.milestoneReminders && <li>Milestone reminders {f.milestoneReminderDays} days before due</li>}
                {f.riskEscalationAlerts && <li>Escalation alerts for {f.riskEscalationLevel}+ risks</li>}
                {f.budgetVarianceAlerts && <li>Budget variance &gt; {f.budgetVarianceThresholdPct}%</li>}
                {f.hiringGapAlerts && <li>Hiring gap &gt; {f.hiringGapThresholdPct}% behind plan</li>}
                {f.syncFailureAlerts && <li>Integration sync failures</li>}
                {f.weeklyDigest && <li>Weekly digest every {f.weeklyDigestDay} at {f.weeklyDigestTime}</li>}
              </ul>
              <div className="text-ink-500 pt-1">Channel: {f.channel}</div>
            </div>
          </Card>
        </div>
      </div>
      <SaveBar dirty={dirty} saved={saved} onSave={() => { nC.update(f); flash() }} onDiscard={() => setF(n)} />
    </div>
  )
}

/* ====================================================================== */
function DataTab() {
  const collections = useStore((s) => s.collections)
  const setAll = useStore((s) => s.setAll)
  const resetAll = useStore((s) => s.resetAll)
  const phase = useStore((s) => s.phase)
  const program = useStore((s) => s.program)
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const rows = useMemo(() => Object.entries(collections).map(([name, items]) => ({ id: name, name, count: items.length, bytes: JSON.stringify(items).length })).sort((a, b) => a.name.localeCompare(b.name)), [collections])
  const totalBytes = rows.reduce((a, r) => a + r.bytes, 0)
  const totalRecords = rows.reduce((a, r) => a + r.count, 0)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exportedOn: new Date().toISOString(), program, phase, collections }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `gcc-command-center-${TODAY}.json`; a.click(); URL.revokeObjectURL(a.href)
  }
  const importJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const cols = (parsed && typeof parsed === 'object' && 'collections' in parsed ? parsed.collections : parsed) as Record<string, unknown>
        if (!cols || typeof cols !== 'object') throw new Error('No collections found')
        let n = 0
        for (const [name, items] of Object.entries(cols)) {
          if (Array.isArray(items) && items.every((x) => x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string')) { setAll(name, items as { id: string }[]); n++ }
        }
        setMsg(`Imported ${n} collections from ${file.name}.`)
      } catch (e) { setMsg(`Import failed: ${(e as Error).message}`) }
    }
    reader.readAsText(file)
  }
  const reset = () => { if (window.confirm('Reset all demo data? Every change made in this browser will be discarded and the seed data reloaded.')) { resetAll(); window.location.reload() } }
  const fmtBytes = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : b > 1024 ? `${(b / 1024).toFixed(0)} KB` : `${b} B`)

  return (
    <div className="grid grid-cols-[1fr_340px] gap-4">
      <Card title={<span className="inline-flex items-center gap-2"><Database size={16} className="text-brand-600" /> Collections in the local store</span>} subtitle={`${rows.length} collections · ${totalRecords.toLocaleString('en-IN')} records · ${fmtBytes(totalBytes)} in localStorage (gcc-command-center-v1)`}>
        <Table<{ id: string; name: string; count: number; bytes: number }> compact rows={rows} empty="No collections seeded yet – open a page to seed its data." columns={[
          { key: 'name', header: 'Collection', render: (r) => <span className="font-mono text-[12.5px] font-medium">{r.name}</span> },
          { key: 'count', header: 'Records', className: 'text-right', render: (r) => r.count.toLocaleString('en-IN') },
          { key: 'bytes', header: 'Size', className: 'text-right', render: (r) => fmtBytes(r.bytes) },
          { key: 'share', header: 'Share', width: '180px', render: (r) => <Progress value={(r.bytes / Math.max(1, totalBytes)) * 100} color={CHART_COLORS.blueLight} /> },
          { key: 'clear', header: '', render: (r) => <button className="text-[12px] text-red-600 hover:underline cursor-pointer" onClick={() => { if (window.confirm(`Clear '${r.name}'? The page that owns it will re-seed default data on next visit.`)) { const next = { ...collections }; delete next[r.name]; useStore.setState({ collections: next }) } }}>Clear</button> },
        ]} />
      </Card>
      <div className="space-y-4">
        <Card title="Export / Import">
          <p className="text-[12.5px] text-ink-700 mb-3">Download the complete data set as JSON to share a scenario, or import a previously exported file. Imported collections replace existing ones with the same name.</p>
          <div className="flex flex-col gap-2">
            <button className="btn-primary justify-center" onClick={exportJson}><Download size={14} /> Export all data (JSON)</button>
            <button className="btn-secondary justify-center" onClick={() => fileRef.current?.click()}><Upload size={14} /> Import JSON</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = '' }} />
          </div>
          {msg && <p className={`text-[12px] mt-2 ${msg.startsWith('Import failed') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}
        </Card>
        <Card title="Reset demo data">
          <p className="text-[12.5px] text-ink-700 mb-3">Clears every collection from this browser and reloads the application with the original seed data. Program <b>{program}</b>, phase <b>{phase}</b>.</p>
          <button className="btn-danger w-full justify-center" onClick={reset}><RotateCcw size={14} /> Reset demo data</button>
        </Card>
        <Card title="About">
          <SectionTitle>GCC Command Center – demo</SectionTitle>
          <div className="text-[12px] text-ink-500 space-y-1">
            <p className="inline-flex items-center gap-1.5"><Building2 size={12} /> FutureFactor360 · Build 2026.10</p>
            <p className="inline-flex items-center gap-1.5"><Users size={12} /> Data is stored locally in this browser only.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}


function CurrencyCard() {
  const currency = useStore((s) => s.currency)
  const setCurrency = useStore((s) => s.setCurrency)
  const rate = useStore((s) => s.eurRate)
  const setEurRate = useStore((s) => s.setEurRate)
  const [r, setR] = useState(String(rate))
  return (
    <Card title="Currency" subtitle="Display currency for every amount in the demo">
      <div className="flex items-center gap-2 mb-3">
        {(['INR', 'EUR'] as const).map((c) => (
          <button key={c} onClick={() => setCurrency(c)} className={currency === c ? 'btn-primary' : 'btn-secondary'}>{c === 'INR' ? '₹ INR (Crore)' : '€ EUR (Millions)'}</button>
        ))}
      </div>
      <Field label="Exchange rate (₹ per €)">
        <div className="flex gap-2">
          <Input type="number" step="0.1" min="1" value={r} onChange={(e) => setR(e.target.value)} />
          <button className="btn-secondary shrink-0" onClick={() => setEurRate(parseFloat(r) || rate)}>Apply</button>
        </div>
      </Field>
      <p className="text-[11.5px] text-ink-500 mt-2">₹ 1.0 Cr = € {((1e7 / rate) / 1e6).toFixed(3)} M at ₹ {rate} per €. The same toggle is in the top bar next to the date.</p>
    </Card>
  )
}
