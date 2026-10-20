import { useMemo, useState } from 'react'
import { FileText, FolderOpen, Clock, LayoutTemplate, HardDrive, Plus, Search, Upload, CheckCircle2, XCircle, History, Download, ExternalLink, Folder, ChevronRight, Pencil } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Card, KpiTile, Badge, Table, Tabs, Modal, Field, Input, Select, TextArea, FormGrid, SectionTitle, ConfirmDelete, EmptyNote, Progress } from '../components/ui'
import { Donut } from '../components/charts'
import { useCollection, uid } from '../store/useStore'
import { fmtDate, TODAY, OWNERS, CHART_COLORS, SERIES, WORKSTREAM_META, type Workstream } from '../data/common'
import {
  seedDocuments, seedDocumentVersions, seedDocumentSignOffs, DOC_TYPES, DOC_STATUSES, DOC_WORKSTREAMS, fmtSize,
  type Doc, type DocVersion, type DocSignOff,
} from '../data/documents'

const TABS = ['All Documents', 'By Workstream', 'Templates', 'Approvals & Sign-off', 'Versions', 'Document Register']
const addDays = (iso: string, days: number) => { const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }
const bumpVersion = (v: string) => { const [a, b] = v.split('.').map(Number); return isNaN(a) ? v : `${a}.${(b ?? 0) + 1}` }
const WS_COLOR = (w: string) => WORKSTREAM_META[w as Workstream]?.color ?? CHART_COLORS.navy

type VersC = ReturnType<typeof useCollection<DocVersion>>
type SignC = ReturnType<typeof useCollection<DocSignOff>>

export default function Documents() {
  const [tab, setTab] = useState(TABS[0])
  const docsC = useCollection<Doc>('documents', seedDocuments)
  const versC = useCollection<DocVersion>('documentVersions', seedDocumentVersions)
  const signC = useCollection<DocSignOff>('documentSignOffs', seedDocumentSignOffs)
  const [edit, setEdit] = useState<Doc | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [signOff, setSignOff] = useState<{ doc: Doc; action: 'Approved' | 'Rejected' } | null>(null)
  const [versionsFor, setVersionsFor] = useState<string | null>(null)

  const docs = docsC.items
  const pending = docs.filter((d) => d.status === 'In Review').length
  const updatedWeek = docs.filter((d) => d.updatedOn >= addDays(TODAY, -7)).length
  const templates = docs.filter((d) => d.type === 'Template').length
  const storageKb = docs.reduce((a, d) => a + d.size, 0) + versC.items.reduce((a, v) => a + v.size, 0)

  const openNew = (preset?: Partial<Doc>) => {
    setIsNew(true)
    setEdit({ id: '', title: '', type: 'Plan', workstream: 'Program Office', owner: 'A. Sharma', version: '0.1', updatedOn: TODAY, status: 'Draft', signOffBy: 'A. Sharma', size: 0, tags: [], link: '', ...preset })
  }
  const openEdit = (d: Doc) => { setIsNew(false); setEdit(d) }
  const saveDoc = (d: Doc, note: string) => {
    if (isNew) {
      const id = uid('doc')
      docsC.add({ ...d, id, updatedOn: TODAY, link: d.link || `sharepoint://gcc-program/${d.workstream.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}/${id}` })
      versC.add({ id: uid('dv'), docId: id, version: d.version, date: TODAY, author: d.owner, note: note || 'Initial upload.', size: d.size })
    } else {
      const prev = docs.find((x) => x.id === d.id)
      const changedFile = prev && prev.size !== d.size
      const version = changedFile ? bumpVersion(d.version) : d.version
      docsC.update({ ...d, version, updatedOn: TODAY })
      if (changedFile || note) versC.add({ id: uid('dv'), docId: d.id, version, date: TODAY, author: d.owner, note: note || 'New file uploaded.', size: d.size })
    }
    setEdit(null)
  }
  const doSignOff = (doc: Doc, action: 'Approved' | 'Rejected', comment: string, by: string) => {
    docsC.update({ ...doc, status: action === 'Approved' ? 'Approved' : 'Draft', updatedOn: TODAY })
    signC.add({ id: uid('so'), docId: doc.id, docTitle: doc.title, action, by, comment, date: TODAY })
    versC.add({ id: uid('dv'), docId: doc.id, version: doc.version, date: TODAY, author: by, note: `${action}${comment ? ': ' + comment : ''}`, size: doc.size })
    setSignOff(null)
  }
  const showVersions = (id: string) => { setVersionsFor(id); setTab('Versions') }

  return (
    <div className="space-y-4">
      <PageHeader title="Documents" subtitle="Program document repository with version control and sign-off tracking." right={<button className="btn-primary" onClick={() => openNew()}><Upload size={14} /> Upload document</button>} />
      <div className="grid grid-cols-5 gap-4">
        <KpiTile tone="blue" icon={<FileText size={22} />} value={docs.length} label="Total Documents" sub={`${docs.filter((d) => d.status === 'Approved').length} approved`} />
        <KpiTile tone="amber" icon={<Clock size={22} />} value={pending} label="Pending Sign-off" sub="In Review" />
        <KpiTile tone="green" icon={<History size={22} />} value={updatedWeek} label="Updated This Week" sub={`since ${fmtDate(addDays(TODAY, -7))}`} />
        <KpiTile tone="violet" icon={<LayoutTemplate size={22} />} value={templates} label="Templates" />
        <KpiTile tone="navy" icon={<HardDrive size={22} />} value={fmtSize(storageKb)} label="Storage used" sub={`of 5.0 GB · ${Math.round((storageKb / 1024 / 5120) * 100)}%`} />
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'All Documents' && <AllDocuments docs={docs} onOpen={openEdit} onNew={() => openNew()} onSignOff={(doc, action) => setSignOff({ doc, action })} />}
      {tab === 'By Workstream' && <ByWorkstream docs={docs} onOpen={openEdit} onNew={(ws) => openNew({ workstream: ws })} />}
      {tab === 'Templates' && <Templates docs={docs} onOpen={openEdit} onUse={(t) => openNew({ title: t.title.replace(/ Template$/i, '') + ' – ' + fmtDate(TODAY), type: t.type === 'Template' ? inferType(t.title) : t.type, workstream: t.workstream, owner: t.owner, tags: [...t.tags.filter((x) => x !== 'template'), 'from-template'], size: t.size })} onNew={() => openNew({ type: 'Template', status: 'Approved', tags: ['template'] })} />}
      {tab === 'Approvals & Sign-off' && <Approvals docs={docs} signC={signC} onSignOff={(doc, action) => setSignOff({ doc, action })} onOpen={openEdit} />}
      {tab === 'Versions' && <Versions docs={docs} versC={versC} selected={versionsFor} onSelect={setVersionsFor} />}
      {tab === 'Document Register' && <Register docs={docs} onOpen={openEdit} />}

      {edit && <DocModal doc={edit} isNew={isNew} onClose={() => setEdit(null)} onSave={saveDoc} onDelete={(id) => { docsC.remove(id); setEdit(null) }} onVersions={showVersions} />}
      {signOff && <SignOffModal doc={signOff.doc} action={signOff.action} onClose={() => setSignOff(null)} onConfirm={(c, by) => doSignOff(signOff.doc, signOff.action, c, by)} />}
    </div>
  )
}

function inferType(title: string): Doc['type'] {
  const t = title.toLowerCase()
  if (t.includes('status') || t.includes('report')) return 'Report'
  if (t.includes('pack') || t.includes('minutes')) return 'Minutes'
  if (t.includes('register')) return 'Register'
  if (t.includes('agreement') || t.includes('statement of work') || t.includes('contract')) return 'Contract'
  if (t.includes('form')) return 'Deliverable'
  return 'Plan'
}

/* ====================================================================== */
function AllDocuments({ docs, onOpen, onNew, onSignOff }: { docs: Doc[]; onOpen: (d: Doc) => void; onNew: () => void; onSignOff: (d: Doc, a: 'Approved' | 'Rejected') => void }) {
  const [q, setQ] = useState('')
  const [type, setType] = useState('All')
  const [ws, setWs] = useState('All')
  const [status, setStatus] = useState('All')
  const rows = useMemo(() => docs.filter((d) =>
    (type === 'All' || d.type === type) && (ws === 'All' || d.workstream === ws) && (status === 'All' || d.status === status) &&
    (!q || [d.title, d.owner, d.tags.join(' '), d.type, d.workstream].join(' ').toLowerCase().includes(q.toLowerCase())),
  ).sort((a, b) => b.updatedOn.localeCompare(a.updatedOn)), [docs, q, type, ws, status])
  const byStatus = DOC_STATUSES.map((s, i) => ({ name: s, value: docs.filter((d) => d.status === s).length, color: [CHART_COLORS.gray, CHART_COLORS.amber, CHART_COLORS.green, CHART_COLORS.violet][i] }))
  const byType = DOC_TYPES.map((t) => ({ t, n: docs.filter((d) => d.type === t).length })).sort((a, b) => b.n - a.n)

  return (
    <div className="grid grid-cols-[1fr_290px] gap-4">
      <Card title="All Documents" subtitle={`${rows.length} of ${docs.length} documents`} action={<button className="btn-primary" onClick={onNew}><Plus size={14} /> Add document</button>}>
        <div className="flex items-center gap-2 mb-3">
          <label className="input flex items-center gap-2 py-1.5 w-[260px]"><Search size={14} className="text-ink-400" /><input className="outline-none flex-1 bg-transparent" placeholder="Search title, owner, tag…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <select className="input py-1.5 w-auto" value={type} onChange={(e) => setType(e.target.value)}>{['All', ...DOC_TYPES].map((o) => <option key={o} value={o}>{o === 'All' ? 'All types' : o}</option>)}</select>
          <select className="input py-1.5 w-auto" value={ws} onChange={(e) => setWs(e.target.value)}>{['All', ...DOC_WORKSTREAMS].map((o) => <option key={o} value={o}>{o === 'All' ? 'All workstreams' : o}</option>)}</select>
          <select className="input py-1.5 w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>{['All', ...DOC_STATUSES].map((o) => <option key={o} value={o}>{o === 'All' ? 'All statuses' : o}</option>)}</select>
        </div>
        <Table<Doc> rows={rows} onRowClick={onOpen} empty="No documents match the current filters." columns={[
          { key: 'title', header: 'Title', render: (d) => <span className="inline-flex items-center gap-2 font-medium"><FileText size={14} className="text-brand-600 shrink-0" />{d.title}</span> },
          { key: 'type', header: 'Type', render: (d) => <Badge value={d.type} /> },
          { key: 'workstream', header: 'Workstream', className: 'whitespace-nowrap', render: (d) => WORKSTREAM_META[d.workstream as Workstream]?.short ?? d.workstream },
          { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
          { key: 'version', header: 'Ver.', render: (d) => <span className="font-mono text-[12px]">v{d.version}</span> },
          { key: 'updatedOn', header: 'Updated', className: 'whitespace-nowrap', render: (d) => fmtDate(d.updatedOn) },
          { key: 'status', header: 'Status', render: (d) => <Badge value={d.status} /> },
          { key: 'size', header: 'Size', className: 'text-right whitespace-nowrap', render: (d) => fmtSize(d.size) },
          { key: 'actions', header: '', render: (d) => d.status === 'In Review' ? <span className="flex gap-1" onClick={(e) => e.stopPropagation()}><button className="text-green-600 hover:bg-green-50 rounded p-1 cursor-pointer" title="Approve" onClick={() => onSignOff(d, 'Approved')}><CheckCircle2 size={15} /></button><button className="text-red-600 hover:bg-red-50 rounded p-1 cursor-pointer" title="Reject" onClick={() => onSignOff(d, 'Rejected')}><XCircle size={15} /></button></span> : <Pencil size={13} className="text-ink-400" /> },
        ]} />
      </Card>
      <div className="space-y-4">
        <Card title="Status distribution">
          <div className="flex items-center gap-3">
            <Donut size={120} inner={0.7} data={byStatus} center={<><div className="text-[20px] font-bold leading-none">{docs.length}</div><div className="text-[10.5px] text-ink-500">docs</div></>} />
            <div className="flex-1 space-y-1.5 text-[12.5px]">{byStatus.map((s) => <div key={s.name} className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span><b>{s.value}</b></div>)}</div>
          </div>
        </Card>
        <Card title="Documents by type">
          <div className="space-y-1.5">
            {byType.map(({ t, n }, i) => <div key={t} className="flex items-center gap-2 text-[12.5px]"><span className="w-[80px] text-ink-700">{t}</span><Progress value={(n / Math.max(1, byType[0].n)) * 100} className="flex-1" color={SERIES[i % SERIES.length]} /><span className="w-5 text-right font-medium">{n}</span></div>)}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ====================================================================== */
function ByWorkstream({ docs, onOpen, onNew }: { docs: Doc[]; onOpen: (d: Doc) => void; onNew: (ws: Doc['workstream']) => void }) {
  const [open, setOpen] = useState<Doc['workstream']>('Program Office')
  const folders = DOC_WORKSTREAMS.map((w) => ({ w, items: docs.filter((d) => d.workstream === w) }))
  const current = folders.find((f) => f.w === open)!
  const subfolders = DOC_TYPES.map((t) => ({ t, items: current.items.filter((d) => d.type === t) })).filter((s) => s.items.length)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {folders.map(({ w, items }) => (
          <button key={w} onClick={() => setOpen(w)} className={`card p-4 text-left flex items-start gap-3 cursor-pointer transition-colors ${open === w ? 'ring-2 ring-brand-400' : 'hover:bg-surface'}`}>
            <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: WS_COLOR(w) + '1A', color: WS_COLOR(w) }}>{open === w ? <FolderOpen size={20} /> : <Folder size={20} />}</span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ink-900 truncate">{w}</span>
              <span className="block text-[12px] text-ink-500">{items.length} documents · {items.filter((d) => d.status === 'In Review').length} in review</span>
              <span className="block text-[11px] text-ink-400 mt-0.5">{fmtSize(items.reduce((a, d) => a + d.size, 0))}</span>
            </span>
          </button>
        ))}
      </div>
      <Card title={<span className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 font-normal"><Folder size={14} /> Documents <ChevronRight size={14} /> <span className="text-ink-900 font-semibold text-[15px]">{open}</span></span>} action={<button className="btn-primary" onClick={() => onNew(open)}><Plus size={14} /> Add to folder</button>}>
        {subfolders.length === 0 && <EmptyNote>This folder is empty.</EmptyNote>}
        <div className="space-y-4">
          {subfolders.map(({ t, items }) => (
            <div key={t}>
              <SectionTitle right={<span className="text-[11.5px] text-ink-500">{items.length} file{items.length > 1 ? 's' : ''}</span>}><span className="inline-flex items-center gap-1.5"><Folder size={13} className="text-amber-500" />{t}</span></SectionTitle>
              <Table<Doc> compact rows={items} onRowClick={onOpen} columns={[
                { key: 'title', header: 'Title', render: (d) => <span className="inline-flex items-center gap-2 font-medium"><FileText size={14} className="text-brand-600" />{d.title}</span> },
                { key: 'owner', header: 'Owner' },
                { key: 'version', header: 'Ver.', render: (d) => `v${d.version}` },
                { key: 'updatedOn', header: 'Updated', render: (d) => fmtDate(d.updatedOn) },
                { key: 'status', header: 'Status', render: (d) => <Badge value={d.status} /> },
                { key: 'signOffBy', header: 'Sign-off by' },
                { key: 'size', header: 'Size', className: 'text-right', render: (d) => fmtSize(d.size) },
              ]} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ====================================================================== */
function Templates({ docs, onOpen, onUse, onNew }: { docs: Doc[]; onOpen: (d: Doc) => void; onUse: (t: Doc) => void; onNew: () => void }) {
  const templates = docs.filter((d) => d.type === 'Template')
  const derived = docs.filter((d) => d.tags.includes('from-template'))
  return (
    <div className="space-y-4">
      <Card title="Templates" subtitle="Standard program templates (WBS 1.3.4 reporting templates, 1.3.7 sign-off forms)" action={<button className="btn-primary" onClick={onNew}><Plus size={14} /> Add template</button>}>
        <div className="grid grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-line p-4 flex flex-col gap-2 hover:shadow-sm">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><LayoutTemplate size={20} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-ink-900 leading-snug">{t.title}</div>
                  <div className="text-[12px] text-ink-500">{t.workstream} · v{t.version}</div>
                </div>
                <Badge value={t.status} />
              </div>
              <div className="text-[12px] text-ink-500">Owner {t.owner} · updated {fmtDate(t.updatedOn)} · {fmtSize(t.size)}</div>
              <div className="flex flex-wrap gap-1">{t.tags.map((g) => <span key={g} className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] text-ink-700">#{g}</span>)}</div>
              <div className="flex gap-2 mt-auto pt-1">
                <button className="btn-primary flex-1 justify-center" onClick={() => onUse(t)}><Plus size={14} /> Use template</button>
                <button className="btn-secondary" onClick={() => onOpen(t)}><Pencil size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Documents created from templates" subtitle={`${derived.length} documents`}>
        <Table<Doc> compact rows={derived} onRowClick={onOpen} empty="No documents created from templates yet. Click “Use template” above." columns={[
          { key: 'title', header: 'Title', render: (d) => <span className="font-medium">{d.title}</span> },
          { key: 'type', header: 'Type', render: (d) => <Badge value={d.type} /> },
          { key: 'workstream', header: 'Workstream' },
          { key: 'owner', header: 'Owner' },
          { key: 'updatedOn', header: 'Created', render: (d) => fmtDate(d.updatedOn) },
          { key: 'status', header: 'Status', render: (d) => <Badge value={d.status} /> },
        ]} />
      </Card>
    </div>
  )
}

/* ====================================================================== */
function Approvals({ docs, signC, onSignOff, onOpen }: { docs: Doc[]; signC: SignC; onSignOff: (d: Doc, a: 'Approved' | 'Rejected') => void; onOpen: (d: Doc) => void }) {
  const pending = docs.filter((d) => d.status === 'In Review').sort((a, b) => a.updatedOn.localeCompare(b.updatedOn))
  const history = [...signC.items].sort((a, b) => b.date.localeCompare(a.date))
  const byApprover = Object.entries(pending.reduce<Record<string, number>>((a, d) => ({ ...a, [d.signOffBy]: (a[d.signOffBy] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])
  return (
    <div className="grid grid-cols-[1fr_300px] gap-4">
      <div className="space-y-4">
        <Card title="Awaiting sign-off" subtitle={`${pending.length} documents in review · deliverable acceptance per WBS 1.3.7`}>
          <Table<Doc> rows={pending} onRowClick={onOpen} empty="Nothing awaiting sign-off." columns={[
            { key: 'title', header: 'Document', render: (d) => <span className="font-medium">{d.title}</span> },
            { key: 'type', header: 'Type', render: (d) => <Badge value={d.type} /> },
            { key: 'workstream', header: 'Workstream', render: (d) => WORKSTREAM_META[d.workstream as Workstream]?.short ?? d.workstream },
            { key: 'owner', header: 'Submitted by' },
            { key: 'version', header: 'Ver.', render: (d) => `v${d.version}` },
            { key: 'updatedOn', header: 'Submitted', render: (d) => <span className={addDays(d.updatedOn, 7) < TODAY ? 'text-red-600' : ''}>{fmtDate(d.updatedOn)}{addDays(d.updatedOn, 7) < TODAY && ' · overdue'}</span> },
            { key: 'signOffBy', header: 'Approver' },
            { key: 'act', header: 'Decision', render: (d) => <span className="flex gap-1.5" onClick={(e) => e.stopPropagation()}><button className="btn-primary py-1 px-2" onClick={() => onSignOff(d, 'Approved')}><CheckCircle2 size={13} /> Approve</button><button className="btn-danger py-1 px-2" onClick={() => onSignOff(d, 'Rejected')}><XCircle size={13} /> Reject</button></span> },
          ]} />
        </Card>
        <Card title="Sign-off history">
          <Table<DocSignOff> compact rows={history} columns={[
            { key: 'date', header: 'Date', render: (s) => fmtDate(s.date) },
            { key: 'docTitle', header: 'Document', render: (s) => <span className="font-medium">{s.docTitle}</span> },
            { key: 'action', header: 'Decision', render: (s) => <Badge value={s.action} /> },
            { key: 'by', header: 'By' },
            { key: 'comment', header: 'Comment', render: (s) => <span className="text-ink-700">{s.comment}</span> },
          ]} />
        </Card>
      </div>
      <div className="space-y-4">
        <Card title="Pending by approver">
          {byApprover.length === 0 ? <EmptyNote>No pending approvals.</EmptyNote> : (
            <div className="space-y-2">{byApprover.map(([a, n]) => <div key={a} className="flex items-center gap-2 text-[12.5px]"><span className="w-[130px] truncate text-ink-700">{a}</span><Progress value={(n / byApprover[0][1]) * 100} className="flex-1" color={CHART_COLORS.amber} /><span className="w-5 text-right font-medium">{n}</span></div>)}</div>
          )}
        </Card>
        <Card title="Sign-off procedure">
          <ol className="list-decimal pl-4 text-[12.5px] text-ink-700 space-y-1.5">
            <li>Owner uploads final version and sets status to <Badge value="In Review" />.</li>
            <li>Approver receives a notification (Email / Teams) with the document link.</li>
            <li>Approve: status becomes <Badge value="Approved" /> and the version is locked.</li>
            <li>Reject: status returns to <Badge value="Draft" /> with the reviewer's comment.</li>
            <li>Decisions are recorded in the version history and the Document Register.</li>
          </ol>
        </Card>
      </div>
    </div>
  )
}

/* ====================================================================== */
function Versions({ docs, versC, selected, onSelect }: { docs: Doc[]; versC: VersC; selected: string | null; onSelect: (id: string) => void }) {
  const sorted = [...docs].sort((a, b) => a.title.localeCompare(b.title))
  const docId = selected ?? docs.find((d) => d.id === 'doc-001')?.id ?? sorted[0]?.id ?? ''
  const doc = docs.find((d) => d.id === docId)
  const versions = versC.items.filter((v) => v.docId === docId).sort((a, b) => b.date.localeCompare(a.date) || b.version.localeCompare(a.version, undefined, { numeric: true }))
  const [add, setAdd] = useState<DocVersion | null>(null)
  const [q, setQ] = useState('')
  const list = sorted.filter((d) => !q || d.title.toLowerCase().includes(q.toLowerCase()))
  const counts = versC.items.reduce<Record<string, number>>((a, v) => ({ ...a, [v.docId]: (a[v.docId] ?? 0) + 1 }), {})

  return (
    <div className="grid grid-cols-[320px_1fr] gap-4">
      <Card title="Documents" subtitle="Select to view version history">
        <label className="input flex items-center gap-2 py-1.5 mb-2"><Search size={14} className="text-ink-400" /><input className="outline-none flex-1 bg-transparent" placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <div className="max-h-[560px] overflow-y-auto scroll-thin -mx-1">
          {list.map((d) => (
            <button key={d.id} onClick={() => onSelect(d.id)} className={`w-full text-left px-2 py-1.5 rounded-md text-[12.5px] flex items-center justify-between gap-2 cursor-pointer ${d.id === docId ? 'bg-brand-50 text-brand-600 font-medium' : 'hover:bg-surface text-ink-700'}`}>
              <span className="truncate">{d.title}</span><span className="text-[11px] text-ink-400 shrink-0">{counts[d.id] ?? 0} ver.</span>
            </button>
          ))}
        </div>
      </Card>
      <Card title={doc ? `Version history – ${doc.title}` : 'Version history'} subtitle={doc ? `Current v${doc.version} · ${doc.status} · owner ${doc.owner}` : undefined}
        action={doc && <button className="btn-primary" onClick={() => setAdd({ id: '', docId: doc.id, version: bumpVersion(doc.version), date: TODAY, author: doc.owner, note: '', size: doc.size })}><Plus size={14} /> Add version</button>}>
        {!doc ? <EmptyNote>Select a document.</EmptyNote> : versions.length === 0 ? <EmptyNote>No version history recorded for this document.</EmptyNote> : (
          <div className="relative pl-5">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-line" />
            {versions.map((v, i) => (
              <div key={v.id} className="relative pb-4">
                <span className={`absolute -left-5 top-1 w-[14px] h-[14px] rounded-full border-2 border-white ${i === 0 ? 'bg-brand-600' : 'bg-slate-300'}`} />
                <div className="flex items-center gap-2 text-[13px]"><span className="font-semibold font-mono">v{v.version}</span>{i === 0 && <Badge value="Current" />}<span className="text-ink-500 text-[12px]">{fmtDate(v.date)} · {v.author} · {fmtSize(v.size)}</span></div>
                <div className="text-[12.5px] text-ink-700 mt-0.5">{v.note}</div>
                <div className="flex gap-3 mt-1 text-[12px]"><button className="link inline-flex items-center gap-1"><Download size={12} /> Download</button>{i > 0 && <button className="link inline-flex items-center gap-1" onClick={() => { if (window.confirm(`Restore v${v.version} as the current version?`)) versC.add({ id: uid('dv'), docId: v.docId, version: bumpVersion(versions[0].version), date: TODAY, author: doc.owner, note: `Restored from v${v.version}`, size: v.size }) }}><History size={12} /> Restore</button>}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {add && (
        <Modal open onClose={() => setAdd(null)} title="Add version" width="max-w-lg" footer={<><button className="btn-secondary" onClick={() => setAdd(null)}>Cancel</button><button className="btn-primary" onClick={() => { versC.add({ ...add, id: uid('dv') }); setAdd(null) }}>Save version</button></>}>
          <FormGrid cols={2}>
            <Field label="Version"><Input value={add.version} onChange={(e) => setAdd({ ...add, version: e.target.value })} /></Field>
            <Field label="Author"><Select options={OWNERS} value={add.author} onChange={(e) => setAdd({ ...add, author: e.target.value })} /></Field>
            <Field label="File (simulated upload)" className="col-span-2"><input type="file" className="text-[12.5px]" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAdd({ ...add, size: Math.max(1, Math.round(f.size / 1024)), note: add.note || `Uploaded ${f.name}` }) }} /></Field>
            <Field label="Change note" className="col-span-2"><TextArea value={add.note} onChange={(e) => setAdd({ ...add, note: e.target.value })} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

/* ====================================================================== */
function Register({ docs, onOpen }: { docs: Doc[]; onOpen: (d: Doc) => void }) {
  const rows = [...docs].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  const exportCsv = () => {
    const head = ['ID', 'Title', 'Type', 'Workstream', 'Owner', 'Version', 'Status', 'Sign-off by', 'Updated', 'Size (KB)', 'Tags', 'Location']
    const lines = rows.map((d) => [d.id, d.title, d.type, d.workstream, d.owner, d.version, d.status, d.signOffBy, d.updatedOn, d.size, d.tags.join(';'), d.link].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `document-register-${TODAY}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }
  const stats = [
    ['Controlled documents', docs.length], ['Approved', docs.filter((d) => d.status === 'Approved').length], ['In Review', docs.filter((d) => d.status === 'In Review').length],
    ['Draft', docs.filter((d) => d.status === 'Draft').length], ['Superseded', docs.filter((d) => d.status === 'Superseded').length], ['Contracts', docs.filter((d) => d.type === 'Contract').length],
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-4">
        {stats.map(([l, v]) => <div key={l as string} className="card px-4 py-3"><div className="text-[20px] font-bold text-navy-900 leading-tight">{v as number}</div><div className="text-[12px] text-ink-500">{l as string}</div></div>)}
      </div>
      <Card title="Document Register" subtitle="WBS 1.3.9 – Establish document repository and version control · controlled list of all program documents" action={<button className="btn-secondary" onClick={exportCsv}><Download size={14} /> Export CSV</button>}>
        <Table<Doc> compact rows={rows} onRowClick={onOpen} columns={[
          { key: 'id', header: 'Doc ID', render: (d) => <span className="font-mono text-[12px] text-ink-500">{d.id.toUpperCase()}</span> },
          { key: 'title', header: 'Title', render: (d) => <span className="font-medium">{d.title}</span> },
          { key: 'type', header: 'Type' },
          { key: 'workstream', header: 'Workstream' },
          { key: 'owner', header: 'Owner' },
          { key: 'version', header: 'Ver.', render: (d) => `v${d.version}` },
          { key: 'status', header: 'Status', render: (d) => <Badge value={d.status} /> },
          { key: 'signOffBy', header: 'Sign-off authority' },
          { key: 'updatedOn', header: 'Last updated', render: (d) => fmtDate(d.updatedOn) },
          { key: 'link', header: 'Location', render: (d) => <span className="inline-flex items-center gap-1 font-mono text-[11px] text-brand-600 truncate max-w-[200px]"><ExternalLink size={11} />{d.link.replace('sharepoint://gcc-program/', '')}</span> },
        ]} />
      </Card>
    </div>
  )
}

/* ====================================================================== */
function DocModal({ doc, isNew, onClose, onSave, onDelete, onVersions }: { doc: Doc; isNew: boolean; onClose: () => void; onSave: (d: Doc, note: string) => void; onDelete: (id: string) => void; onVersions: (id: string) => void }) {
  const [f, setF] = useState<Doc>(doc)
  const [tags, setTags] = useState(doc.tags.join(', '))
  const [fileName, setFileName] = useState('')
  const [note, setNote] = useState('')
  const set = <K extends keyof Doc>(k: K, v: Doc[K]) => setF({ ...f, [k]: v })
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add document' : 'Edit document'} footer={<>
      {!isNew && <ConfirmDelete onConfirm={() => onDelete(doc.id)} />}
      {!isNew && <button className="btn-secondary" onClick={() => { onClose(); onVersions(doc.id) }}><History size={14} /> Version history</button>}
      <span className="flex-1" />
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn-primary" disabled={!f.title} onClick={() => onSave({ ...f, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }, note)}>{isNew ? 'Upload & save' : 'Save'}</button>
    </>}>
      <FormGrid cols={3}>
        <Field label="Title" className="col-span-3"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Transition Wave 2 Plan" /></Field>
        <Field label="Type"><Select options={DOC_TYPES} value={f.type} onChange={(e) => set('type', e.target.value as Doc['type'])} /></Field>
        <Field label="Workstream"><Select options={DOC_WORKSTREAMS} value={f.workstream} onChange={(e) => set('workstream', e.target.value as Doc['workstream'])} /></Field>
        <Field label="Owner"><Select options={OWNERS} value={f.owner} onChange={(e) => set('owner', e.target.value)} /></Field>
        <Field label="Version"><Input value={f.version} onChange={(e) => set('version', e.target.value)} /></Field>
        <Field label="Status"><Select options={DOC_STATUSES} value={f.status} onChange={(e) => set('status', e.target.value as Doc['status'])} /></Field>
        <Field label="Sign-off by"><Input value={f.signOffBy} onChange={(e) => set('signOffBy', e.target.value)} /></Field>
        <Field label="Tags (comma separated)" className="col-span-2"><Input value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
        <Field label="Link / location"><Input value={f.link} onChange={(e) => set('link', e.target.value)} placeholder="auto-generated" /></Field>
        <Field label={isNew ? 'File (simulated upload – name and size are recorded)' : 'Replace file (simulated – creates a new version)'} className="col-span-3">
          <label className="flex items-center gap-3 rounded-lg border border-dashed border-line px-3 py-3 cursor-pointer hover:bg-surface">
            <Upload size={16} className="text-brand-600" />
            <span className="text-[12.5px] text-ink-700">{fileName ? <>{fileName} · <b>{fmtSize(f.size)}</b></> : f.size ? `Current file ${fmtSize(f.size)} – click to choose a replacement` : 'Choose a file…'}</span>
            <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setFileName(file.name); set('size', Math.max(1, Math.round(file.size / 1024))) } }} />
          </label>
        </Field>
        {!isNew && <Field label="Change note (optional – recorded in version history)" className="col-span-3"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>}
      </FormGrid>
    </Modal>
  )
}

function SignOffModal({ doc, action, onClose, onConfirm }: { doc: Doc; action: 'Approved' | 'Rejected'; onClose: () => void; onConfirm: (comment: string, by: string) => void }) {
  const [comment, setComment] = useState('')
  const [by, setBy] = useState(doc.signOffBy)
  const approve = action === 'Approved'
  return (
    <Modal open onClose={onClose} title={`${approve ? 'Approve' : 'Reject'} – ${doc.title}`} width="max-w-lg" footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className={approve ? 'btn-primary' : 'btn-danger'} disabled={!approve && !comment} onClick={() => onConfirm(comment, by)}>{approve ? <><CheckCircle2 size={14} /> Approve v{doc.version}</> : <><XCircle size={14} /> Reject</>}</button></>}>
      <div className="text-[12.5px] text-ink-500 mb-3">{doc.type} · {doc.workstream} · submitted by {doc.owner} on {fmtDate(doc.updatedOn)}</div>
      <FormGrid cols={1}>
        <Field label="Signed off by"><Input value={by} onChange={(e) => setBy(e.target.value)} /></Field>
        <Field label={approve ? 'Comment (optional)' : 'Reason for rejection (required)'}><TextArea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={approve ? 'e.g. Approved with minor edits' : 'e.g. Section 3 acceptance criteria missing'} /></Field>
      </FormGrid>
      <p className="text-[12px] text-ink-500 mt-3">{approve ? 'The document status will change to Approved and the version will be locked.' : 'The document will return to Draft for the owner to revise.'}</p>
    </Modal>
  )
}
