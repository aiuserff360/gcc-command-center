import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Plug, Workflow, RefreshCw, AlertTriangle, Database, Plus, Pause, Play, Power, Pencil, KeyRound, Copy, Webhook as WebhookIcon, ArrowRight, ArrowLeftRight, ArrowLeft, Save, Trash2, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Card, KpiTile, Table, Tabs, Modal, Field, Input, Select, TextArea, FormGrid, Legend, ConfirmDelete, Progress } from '../components/ui'
import { tooltipStyle } from '../components/charts'
import { useCollection, uid } from '../store/useStore'
import { fmtDate, OWNERS, CHART_COLORS } from '../data/common'
import {
  seedConnectors, seedSyncLog, seedDataFlows, seedFieldMappings, seedWebhooks, seedIntegrationSettings, SAMPLE_PAYLOADS, WEBHOOK_EVENTS, TARGET_MODULES,
  CONNECTOR_STATUSES, CONNECTOR_CATEGORIES, FREQUENCIES, fmtDateTime, relTime, randomKey,
  type Connector, type SyncLogEntry, type DataFlow, type FieldMapping, type Webhook, type IntegrationSettings,
} from '../data/integrations'

const TABS = ['Connectors', 'Data Flows', 'Sync Activity', 'Field Mapping', 'API & Webhooks', 'Settings']
const NOW = '2026-10-20T08:20:00'
const nowIso = () => { const d = new Date(); return isNaN(d.getTime()) ? NOW : `${NOW.slice(0, 10)}T${d.toTimeString().slice(0, 8)}` }
const PILL: Record<string, string> = {
  Connected: 'bg-green-50 text-green-700', Active: 'bg-green-50 text-green-700', Success: 'bg-green-50 text-green-700',
  'Not Connected': 'bg-slate-100 text-slate-600', Draft: 'bg-slate-100 text-slate-600', Paused: 'bg-amber-50 text-amber-700', Warning: 'bg-amber-50 text-amber-700',
  Error: 'bg-red-50 text-red-700', Failing: 'bg-red-50 text-red-700',
}
const Pill = ({ value }: { value: string }) => <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap ${PILL[value] ?? 'bg-slate-100 text-slate-700'}`}>{value}</span>
const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

type ConnC = ReturnType<typeof useCollection<Connector>>
type LogC = ReturnType<typeof useCollection<SyncLogEntry>>

export default function Integrations() {
  const [tab, setTab] = useState(TABS[0])
  const connC = useCollection<Connector>('connectors', seedConnectors)
  const logC = useCollection<SyncLogEntry>('syncLog', seedSyncLog)
  const flowsC = useCollection<DataFlow>('dataFlows', seedDataFlows)
  const mapC = useCollection<FieldMapping>('fieldMappings', seedFieldMappings)
  const hooksC = useCollection<Webhook>('webhooks', seedWebhooks)
  const settingsC = useCollection<IntegrationSettings>('integrationSettings', seedIntegrationSettings)
  const settings = settingsC.items[0] ?? seedIntegrationSettings[0]

  const connected = connC.items.filter((c) => c.status === 'Connected').length
  const activeFlows = flowsC.items.filter((f) => f.status === 'Active').length
  const lastSync = connC.items.filter((c) => c.lastSync).map((c) => c.lastSync).sort().pop() ?? ''
  const since24h = NOW.replace(/^(\d{4}-\d{2}-)(\d{2})/, (_m, a, d) => `${a}${String(+d - 1).padStart(2, '0')}`)
  const errors24 = logC.items.filter((l) => l.status === 'Error' && l.timestamp >= since24h).length
  const today = logC.items.filter((l) => l.timestamp.startsWith(NOW.slice(0, 10))).reduce((a, l) => a + l.records, 0)

  return (
    <div className="space-y-4">
      <PageHeader title="Integrations" subtitle="Connect the GCC Command Center to enterprise systems for automated data flows." />
      <div className="grid grid-cols-5 gap-4">
        <KpiTile tone="green" icon={<Plug size={22} />} value={<>{connected} <span className="text-[16px] text-ink-500 font-semibold">/ {connC.items.length}</span></>} label="Connected Systems" sub={`${connC.items.filter((c) => c.status === 'Error').length} in error · ${connC.items.filter((c) => c.status === 'Paused').length} paused`} />
        <KpiTile tone="blue" icon={<Workflow size={22} />} value={activeFlows} label="Active Data Flows" sub={`${flowsC.items.length} configured`} />
        <KpiTile tone="teal" icon={<RefreshCw size={22} />} value={relTime(lastSync)} label="Last Sync" sub={lastSync ? fmtDateTime(lastSync) : 'No sync yet'} />
        <KpiTile tone={errors24 ? 'red' : 'green'} icon={<AlertTriangle size={22} />} value={errors24} label="Sync Errors (24h)" sub={`threshold ${settings.errorThreshold} / day`} />
        <KpiTile tone="violet" icon={<Database size={22} />} value={today.toLocaleString('en-IN')} label="Records Synced Today" sub={fmtDate(NOW.slice(0, 10))} />
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'Connectors' && <Connectors connC={connC} logC={logC} />}
      {tab === 'Data Flows' && <DataFlows flowsC={flowsC} connectors={connC.items} />}
      {tab === 'Sync Activity' && <SyncActivity logC={logC} connectors={connC.items} />}
      {tab === 'Field Mapping' && <Mapping mapC={mapC} connectors={connC.items} />}
      {tab === 'API & Webhooks' && <ApiWebhooks hooksC={hooksC} settings={settings} settingsC={settingsC} />}
      {tab === 'Settings' && <SettingsTab settings={settings} settingsC={settingsC} />}
    </div>
  )
}

/* ====================================================================== */
function Connectors({ connC, logC }: { connC: ConnC; logC: LogC }) {
  const [edit, setEdit] = useState<Connector | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [filter, setFilter] = useState('All')
  const list = connC.items.filter((c) => filter === 'All' || c.status === filter)

  const log = (c: Connector, status: SyncLogEntry['status'], message: string, records = 0) =>
    logC.add({ id: uid('sl'), timestamp: nowIso(), connector: c.name, flow: c.flows.split(',')[0].trim(), records, status, message })
  const syncNow = (c: Connector) => {
    if (c.status === 'Error') { log(c, 'Error', 'Sync failed – connection in error state. Reconnect to retry.'); return }
    const records = 20 + Math.floor(Math.random() * 300)
    connC.update({ ...c, status: 'Connected', lastSync: nowIso(), recordsSynced: c.recordsSynced + records })
    log(c, 'Success', `Manual sync – ${records} records synced`, records)
  }
  const connect = (c: Connector) => { connC.update({ ...c, status: 'Connected', lastSync: nowIso() }); log(c, 'Success', 'Connection established – credentials validated', 0) }
  const disconnect = (c: Connector) => { if (window.confirm(`Disconnect ${c.name}? Data flows from this system will stop.`)) { connC.update({ ...c, status: 'Not Connected' }); log(c, 'Warning', 'Connector disconnected by user') } }
  const pause = (c: Connector) => { connC.update({ ...c, status: 'Paused' }); log(c, 'Warning', 'Connector paused by user') }
  const resume = (c: Connector) => { connC.update({ ...c, status: 'Connected' }); log(c, 'Success', 'Connector resumed') }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {['All', ...CONNECTOR_STATUSES].map((s) => <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-[12px] font-medium cursor-pointer ${filter === s ? 'bg-brand-600 text-white' : 'bg-white border border-line text-ink-700 hover:bg-surface'}`}>{s} {s !== 'All' && <span className="opacity-70">({connC.items.filter((c) => c.status === s).length})</span>}</button>)}
        </div>
        <button className="btn-primary" onClick={() => { setIsNew(true); setEdit({ id: '', name: '', category: 'ERP / Finance', status: 'Not Connected', lastSync: '', frequency: 'Daily 06:00', owner: 'D. Singh', recordsSynced: 0, description: '', flows: '', abbr: '', color: '#1E5BBE' }) }}><Plus size={14} /> Add connector</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {list.map((c) => (
          <div key={c.id} className="card p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-lg flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ background: c.color }}>{c.abbr || c.name.slice(0, 3).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="text-[14px] font-semibold text-ink-900 truncate">{c.name}</span><Pill value={c.status} /></div>
                <div className="text-[12px] text-ink-500">{c.category} · {c.flows}</div>
              </div>
              <button className="text-ink-400 hover:text-ink-900 cursor-pointer" onClick={() => { setIsNew(false); setEdit(c) }}><Pencil size={14} /></button>
            </div>
            <p className="text-[12.5px] text-ink-700 leading-snug min-h-[34px]">{c.description}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
              <div className="text-ink-500">Last sync</div><div className={`font-medium ${c.status === 'Error' ? 'text-red-600' : ''}`}>{c.lastSync ? `${relTime(c.lastSync)} · ${fmtDateTime(c.lastSync)}` : '—'}</div>
              <div className="text-ink-500">Frequency</div><div className="font-medium">{c.frequency}</div>
              <div className="text-ink-500">Owner</div><div className="font-medium">{c.owner}</div>
              <div className="text-ink-500">Records synced</div><div className="font-medium">{c.recordsSynced.toLocaleString('en-IN')}</div>
            </div>
            <div className="flex gap-2 mt-auto pt-1 border-t border-line/70">
              {c.status === 'Not Connected' && <button className="btn-primary flex-1 justify-center" onClick={() => connect(c)}><Plug size={13} /> Connect</button>}
              {c.status === 'Error' && <button className="btn-primary flex-1 justify-center" onClick={() => connect(c)}><RefreshCw size={13} /> Reconnect</button>}
              {c.status === 'Paused' && <button className="btn-primary flex-1 justify-center" onClick={() => resume(c)}><Play size={13} /> Resume</button>}
              {c.status === 'Connected' && <button className="btn-primary flex-1 justify-center" onClick={() => syncNow(c)}><RefreshCw size={13} /> Sync now</button>}
              {c.status === 'Connected' && <button className="btn-secondary" onClick={() => pause(c)} title="Pause"><Pause size={13} /></button>}
              {c.status !== 'Not Connected' && <button className="btn-secondary" onClick={() => disconnect(c)} title="Disconnect"><Power size={13} /></button>}
            </div>
          </div>
        ))}
      </div>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={isNew ? 'Add connector' : `Edit connector – ${edit.name}`} footer={<>
          {!isNew && <ConfirmDelete onConfirm={() => { connC.remove(edit.id); setEdit(null) }} />}<span className="flex-1" />
          <button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" disabled={!edit.name} onClick={() => { const abbr = edit.abbr || edit.name.replace(/[^A-Z0-9]/g, '').slice(0, 3) || edit.name.slice(0, 3).toUpperCase(); isNew ? connC.add({ ...edit, id: uid('cn'), abbr }) : connC.update({ ...edit, abbr }); setEdit(null) }}>Save</button></>}>
          <FormGrid cols={3}>
            <Field label="System name" className="col-span-2"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Oracle Fusion" /></Field>
            <Field label="Category"><Select options={CONNECTOR_CATEGORIES} value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as Connector['category'] })} /></Field>
            <Field label="Status"><Select options={CONNECTOR_STATUSES} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Connector['status'] })} /></Field>
            <Field label="Frequency"><Select options={FREQUENCIES} value={edit.frequency} onChange={(e) => setEdit({ ...edit, frequency: e.target.value })} /></Field>
            <Field label="Owner"><Select options={OWNERS} value={edit.owner} onChange={(e) => setEdit({ ...edit, owner: e.target.value })} /></Field>
            <Field label="Data flows (comma separated)" className="col-span-2"><Input value={edit.flows} onChange={(e) => setEdit({ ...edit, flows: e.target.value })} placeholder="e.g. Finance actuals, PO commitments" /></Field>
            <Field label="Tile colour"><Input type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} className="h-9 p-1" /></Field>
            <Field label="Description" className="col-span-3"><TextArea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

/* ====================================================================== */
function DataFlows({ flowsC, connectors }: { flowsC: ReturnType<typeof useCollection<DataFlow>>; connectors: Connector[] }) {
  const [edit, setEdit] = useState<DataFlow | null>(null)
  const systems = ['GCC Command Center', ...connectors.map((c) => c.name)]
  const targets = [...TARGET_MODULES, ...connectors.map((c) => c.name)]
  const dirIcon = (d: DataFlow['direction']) => d === 'Inbound' ? <ArrowRight size={13} className="text-green-600" /> : d === 'Outbound' ? <ArrowLeft size={13} className="text-brand-600" /> : <ArrowLeftRight size={13} className="text-violet-600" />
  const byTarget = TARGET_MODULES.map((t) => ({ t, n: flowsC.items.filter((f) => f.target === t).length })).filter((x) => x.n)
  return (
    <div className="grid grid-cols-[1fr_280px] gap-4">
      <Card title="Data Flows" subtitle="Source system → target module" action={<button className="btn-primary" onClick={() => setEdit({ id: '', source: connectors[0]?.name ?? '', target: 'Financial Management', entity: '', direction: 'Inbound', cadence: 'Daily 06:00', status: 'Draft', lastRun: '' })}><Plus size={14} /> Add data flow</button>}>
        <Table<DataFlow> rows={flowsC.items} onRowClick={setEdit} columns={[
          { key: 'source', header: 'Source system', render: (f) => <span className="font-medium">{f.source}</span> },
          { key: 'direction', header: '', render: (f) => dirIcon(f.direction) },
          { key: 'target', header: 'Target module', render: (f) => <span className="font-medium">{f.target}</span> },
          { key: 'entity', header: 'Entity' },
          { key: 'dir', header: 'Direction', render: (f) => f.direction },
          { key: 'cadence', header: 'Cadence' },
          { key: 'status', header: 'Status', render: (f) => <Pill value={f.status} /> },
          { key: 'lastRun', header: 'Last run', render: (f) => fmtDateTime(f.lastRun) },
        ]} />
      </Card>
      <div className="space-y-4">
        <Card title="Flows by target module">
          <div className="space-y-1.5">{byTarget.map(({ t, n }) => <div key={t} className="flex items-center gap-2 text-[12.5px]"><span className="w-[130px] truncate text-ink-700">{t}</span><Progress value={(n / Math.max(...byTarget.map((x) => x.n))) * 100} className="flex-1" color={CHART_COLORS.blueLight} /><span className="w-4 text-right font-medium">{n}</span></div>)}</div>
        </Card>
        <Card title="Direction">
          <Legend items={[{ label: 'Inbound → Command Center', color: CHART_COLORS.green }, { label: 'Outbound → external system', color: CHART_COLORS.blue }, { label: 'Bidirectional', color: CHART_COLORS.violet }]} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {(['Inbound', 'Outbound', 'Bidirectional'] as const).map((d) => <div key={d} className="rounded-lg bg-surface py-2"><div className="text-[18px] font-bold">{flowsC.items.filter((f) => f.direction === d).length}</div><div className="text-[11px] text-ink-500">{d}</div></div>)}
          </div>
        </Card>
      </div>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit data flow' : 'Add data flow'} footer={<>
          {edit.id && <ConfirmDelete onConfirm={() => { flowsC.remove(edit.id); setEdit(null) }} />}<span className="flex-1" />
          <button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" disabled={!edit.entity} onClick={() => { edit.id ? flowsC.update(edit) : flowsC.add({ ...edit, id: uid('df') }); setEdit(null) }}>Save</button></>}>
          <FormGrid cols={2}>
            <Field label="Source system"><Select options={systems} value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value })} /></Field>
            <Field label="Target module / system"><Select options={targets} value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value })} /></Field>
            <Field label="Entity" className="col-span-2"><Input value={edit.entity} onChange={(e) => setEdit({ ...edit, entity: e.target.value })} placeholder="e.g. Cost center actuals" /></Field>
            <Field label="Direction"><Select options={['Inbound', 'Outbound', 'Bidirectional']} value={edit.direction} onChange={(e) => setEdit({ ...edit, direction: e.target.value as DataFlow['direction'] })} /></Field>
            <Field label="Cadence"><Select options={FREQUENCIES} value={edit.cadence} onChange={(e) => setEdit({ ...edit, cadence: e.target.value })} /></Field>
            <Field label="Status"><Select options={['Active', 'Paused', 'Error', 'Draft']} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as DataFlow['status'] })} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

/* ====================================================================== */
function SyncActivity({ logC, connectors }: { logC: LogC; connectors: Connector[] }) {
  const [status, setStatus] = useState('All')
  const [conn, setConn] = useState('All')
  const rows = useMemo(() => logC.items.filter((l) => (status === 'All' || l.status === status) && (conn === 'All' || l.connector === conn)).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 60), [logC.items, status, conn])
  const perDay = useMemo(() => {
    const days: { day: string; iso: string; Success: number; Errors: number }[] = []
    for (let d = 13; d >= 0; d--) { const dt = new Date(NOW); dt.setDate(dt.getDate() - d); const iso = localIso(dt); days.push({ day: fmtDate(iso).slice(0, 6), iso, Success: 0, Errors: 0 }) }
    for (const l of logC.items) { const d = days.find((x) => x.iso === l.timestamp.slice(0, 10)); if (d) { d.Success += l.records; if (l.status === 'Error') d.Errors += 1 } }
    return days
  }, [logC.items])
  const counts = { Success: logC.items.filter((l) => l.status === 'Success').length, Warning: logC.items.filter((l) => l.status === 'Warning').length, Error: logC.items.filter((l) => l.status === 'Error').length }
  return (
    <div className="space-y-4">
      <Card title="Records synced per day" subtitle="Last 14 days" headerRight={<Legend items={[{ label: 'Records synced', color: CHART_COLORS.blue }]} />}>
        <div className="h-[200px]">
          <ResponsiveContainer>
            <BarChart data={perDay} margin={{ top: 16, right: 8, left: -14, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
              <Bar dataKey="Success" name="Records" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]}><LabelList dataKey="Success" position="top" style={{ fontSize: 10, fill: '#374151' }} /></Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Sync log" subtitle={`${logC.items.length} entries · ${counts.Success} success · ${counts.Warning} warnings · ${counts.Error} errors`}
        headerRight={<div className="flex gap-2">
          <select className="input py-1 w-auto" value={conn} onChange={(e) => setConn(e.target.value)}>{['All', ...connectors.map((c) => c.name)].map((o) => <option key={o}>{o}</option>)}</select>
          <select className="input py-1 w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>{['All', 'Success', 'Warning', 'Error'].map((o) => <option key={o}>{o}</option>)}</select>
          <button className="btn-secondary py-1" onClick={() => { if (window.confirm('Clear entries older than 7 days?')) { const dt = new Date(NOW); dt.setDate(dt.getDate() - 7); const cut = localIso(dt); logC.setAll(logC.items.filter((l) => l.timestamp >= cut)) } }}><Trash2 size={13} /> Purge</button>
        </div>}>
        <Table<SyncLogEntry> compact rows={rows} columns={[
          { key: 'timestamp', header: 'Timestamp', render: (l) => <span className="font-mono text-[12px]">{fmtDateTime(l.timestamp)}</span> },
          { key: 'connector', header: 'Connector', render: (l) => <span className="font-medium">{l.connector}</span> },
          { key: 'flow', header: 'Flow' },
          { key: 'records', header: 'Records', className: 'text-right', render: (l) => l.records.toLocaleString('en-IN') },
          { key: 'status', header: 'Status', render: (l) => <Pill value={l.status} /> },
          { key: 'message', header: 'Message', render: (l) => <span className={l.status === 'Error' ? 'text-red-600' : 'text-ink-700'}>{l.message}</span> },
        ]} />
      </Card>
    </div>
  )
}

/* ====================================================================== */
function Mapping({ mapC, connectors }: { mapC: ReturnType<typeof useCollection<FieldMapping>>; connectors: Connector[] }) {
  const [conn, setConn] = useState(connectors[0]?.name ?? '')
  const [edit, setEdit] = useState<FieldMapping | null>(null)
  const rows = mapC.items.filter((m) => m.connector === conn)
  const c = connectors.find((x) => x.name === conn)
  return (
    <div className="grid grid-cols-[260px_1fr] gap-4">
      <Card title="Connector">
        <div className="space-y-1 -mx-1">
          {connectors.map((x) => (
            <button key={x.id} onClick={() => setConn(x.name)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12.5px] cursor-pointer ${conn === x.name ? 'bg-brand-50 text-brand-600 font-medium' : 'hover:bg-surface text-ink-700'}`}>
              <span className="w-6 h-6 rounded text-white text-[9px] font-bold flex items-center justify-center" style={{ background: x.color }}>{x.abbr}</span><span className="flex-1 text-left truncate">{x.name}</span><span className="text-[11px] text-ink-400">{mapC.items.filter((m) => m.connector === x.name).length}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card title={`Field mapping – ${conn}`} subtitle={c ? `${c.category} · ${c.flows}` : undefined} action={<button className="btn-primary" onClick={() => setEdit({ id: '', connector: conn, sourceField: '', targetField: '', transformation: 'None' })}><Plus size={14} /> Add mapping</button>}>
        <Table<FieldMapping> rows={rows} onRowClick={setEdit} empty="No field mappings defined for this connector yet." columns={[
          { key: 'sourceField', header: 'Source field', render: (m) => <span className="font-mono text-[12px]">{m.sourceField}</span> },
          { key: 'arrow', header: '', width: '30px', render: () => <ArrowRight size={14} className="text-ink-400" /> },
          { key: 'targetField', header: 'Target field', render: (m) => <span className="font-mono text-[12px] text-brand-600">{m.targetField}</span> },
          { key: 'transformation', header: 'Transformation', render: (m) => m.transformation === 'None' ? <span className="text-ink-400">None</span> : m.transformation },
          { key: 'e', header: '', render: () => <Pencil size={13} className="text-ink-400" /> },
        ]} />
      </Card>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit field mapping' : 'Add field mapping'} width="max-w-lg" footer={<>
          {edit.id && <ConfirmDelete onConfirm={() => { mapC.remove(edit.id); setEdit(null) }} />}<span className="flex-1" />
          <button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" disabled={!edit.sourceField || !edit.targetField} onClick={() => { edit.id ? mapC.update(edit) : mapC.add({ ...edit, id: uid('fm') }); setEdit(null) }}>Save</button></>}>
          <FormGrid cols={1}>
            <Field label="Connector"><Select options={connectors.map((x) => x.name)} value={edit.connector} onChange={(e) => setEdit({ ...edit, connector: e.target.value })} /></Field>
            <Field label="Source field"><Input value={edit.sourceField} onChange={(e) => setEdit({ ...edit, sourceField: e.target.value })} placeholder="e.g. KOSTL (Cost Center)" /></Field>
            <Field label="Target field"><Input value={edit.targetField} onChange={(e) => setEdit({ ...edit, targetField: e.target.value })} placeholder="e.g. workstream" /></Field>
            <Field label="Transformation"><Input value={edit.transformation} onChange={(e) => setEdit({ ...edit, transformation: e.target.value })} placeholder="None / Lookup / Format" /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

/* ====================================================================== */
function ApiWebhooks({ hooksC, settings, settingsC }: { hooksC: ReturnType<typeof useCollection<Webhook>>; settings: IntegrationSettings; settingsC: ReturnType<typeof useCollection<IntegrationSettings>> }) {
  const [reveal, setReveal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [edit, setEdit] = useState<Webhook | null>(null)
  const [event, setEvent] = useState<string>(WEBHOOK_EVENTS[0])
  const masked = settings.apiKey.slice(0, 9) + '•'.repeat(18) + settings.apiKey.slice(-4)
  const regen = () => { if (window.confirm('Regenerate the API key? Existing clients using the old key will stop working.')) settingsC.update({ ...settings, apiKey: randomKey(), apiKeyCreated: NOW.slice(0, 10) }) }
  const copy = async () => { try { await navigator.clipboard.writeText(settings.apiKey); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ } }
  const test = (h: Webhook) => { hooksC.update({ ...h, lastDelivery: nowIso(), status: h.status === 'Failing' ? 'Active' : h.status }); window.alert(`Test event "${h.event}" delivered to ${h.url} (HTTP 200).`) }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_1fr] gap-4">
        <Card title={<span className="inline-flex items-center gap-2"><KeyRound size={16} className="text-brand-600" /> API access</span>} subtitle="REST API for reading program data and pushing records">
          <div className="text-[12px] text-ink-500 mb-1">Base URL</div>
          <div className="font-mono text-[12.5px] bg-surface rounded-lg px-3 py-2 mb-3">https://api.gcc-command-center.corp/v1</div>
          <div className="text-[12px] text-ink-500 mb-1">API key <span className="text-ink-400">· created {fmtDate(settings.apiKeyCreated)}</span></div>
          <div className="flex items-center gap-2">
            <div className="font-mono text-[12.5px] bg-surface rounded-lg px-3 py-2 flex-1 truncate">{reveal ? settings.apiKey : masked}</div>
            <button className="btn-secondary" onClick={() => setReveal(!reveal)}>{reveal ? 'Hide' : 'Reveal'}</button>
            <button className="btn-secondary" onClick={copy}><Copy size={13} /> {copied ? 'Copied' : 'Copy'}</button>
            <button className="btn-primary" onClick={regen}><RefreshCw size={13} /> Regenerate</button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-[12px]">
            {[['Rate limit', '1,000 req / min'], ['Auth', 'Bearer token'], ['Scopes', 'read:program, write:records']].map(([l, v]) => <div key={l} className="rounded-lg border border-line p-2"><div className="text-ink-500">{l}</div><div className="font-medium">{v}</div></div>)}
          </div>
          <div className="mt-4">
            <div className="text-[12px] text-ink-500 mb-1">Example</div>
            <pre className="font-mono text-[11.5px] bg-navy-900 text-slate-100 rounded-lg p-3 overflow-x-auto">{`curl https://api.gcc-command-center.corp/v1/milestones?status=At%20Risk \\
  -H "Authorization: Bearer ${reveal ? settings.apiKey : masked}"`}</pre>
          </div>
        </Card>
        <Card title="Sample payload" subtitle="Webhook event body" headerRight={<select className="input py-1 w-auto" value={event} onChange={(e) => setEvent(e.target.value)}>{WEBHOOK_EVENTS.map((e) => <option key={e}>{e}</option>)}</select>}>
          <pre className="font-mono text-[11.5px] bg-navy-900 text-slate-100 rounded-lg p-3 overflow-auto max-h-[330px]">{JSON.stringify(SAMPLE_PAYLOADS[event] ?? {}, null, 2)}</pre>
          <p className="text-[11.5px] text-ink-500 mt-2 inline-flex items-center gap-1"><ShieldCheck size={12} /> Each delivery is signed with the webhook secret (HMAC-SHA256) in the <code>X-GCC-Signature</code> header.</p>
        </Card>
      </div>
      <Card title={<span className="inline-flex items-center gap-2"><WebhookIcon size={16} className="text-brand-600" /> Webhooks register</span>} subtitle="Outbound event notifications to external systems" action={<button className="btn-primary" onClick={() => setEdit({ id: '', event: WEBHOOK_EVENTS[0], url: '', status: 'Active', lastDelivery: '', secret: 'whsec_' + Math.random().toString(36).slice(2, 6) })}><Plus size={14} /> Add webhook</button>}>
        <Table<Webhook> rows={hooksC.items} onRowClick={setEdit} columns={[
          { key: 'event', header: 'Event', render: (h) => <span className="font-mono text-[12px] font-medium">{h.event}</span> },
          { key: 'url', header: 'URL', render: (h) => <span className="font-mono text-[12px] text-ink-700">{h.url}</span> },
          { key: 'status', header: 'Status', render: (h) => <Pill value={h.status} /> },
          { key: 'lastDelivery', header: 'Last delivery', render: (h) => fmtDateTime(h.lastDelivery) },
          { key: 'secret', header: 'Secret', render: (h) => <span className="font-mono text-[11.5px] text-ink-400">{h.secret}••••</span> },
          { key: 'act', header: '', render: (h) => <button className="link" onClick={(e) => { e.stopPropagation(); test(h) }}>Send test</button> },
        ]} />
      </Card>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit webhook' : 'Add webhook'} width="max-w-lg" footer={<>
          {edit.id && <ConfirmDelete onConfirm={() => { hooksC.remove(edit.id); setEdit(null) }} />}<span className="flex-1" />
          <button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" disabled={!edit.url} onClick={() => { edit.id ? hooksC.update(edit) : hooksC.add({ ...edit, id: uid('wh') }); setEdit(null) }}>Save</button></>}>
          <FormGrid cols={1}>
            <Field label="Event"><Select options={WEBHOOK_EVENTS} value={edit.event} onChange={(e) => setEdit({ ...edit, event: e.target.value })} /></Field>
            <Field label="Endpoint URL"><Input value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Status"><Select options={['Active', 'Paused', 'Failing']} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Webhook['status'] })} /></Field>
            <Field label="Signing secret"><Input value={edit.secret} onChange={(e) => setEdit({ ...edit, secret: e.target.value })} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

/* ====================================================================== */
function SettingsTab({ settings, settingsC }: { settings: IntegrationSettings; settingsC: ReturnType<typeof useCollection<IntegrationSettings>> }) {
  const [f, setF] = useState<IntegrationSettings>(settings)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(settings)
  const save = () => { settingsC.update(f); setSaved(true); setTimeout(() => setSaved(false), 1500) }
  const Toggle = ({ label, k, hint }: { label: string; k: keyof IntegrationSettings; hint?: string }) => (
    <label className="flex items-center justify-between gap-3 py-2 border-b border-line/70 last:border-b-0 cursor-pointer">
      <span><span className="text-[13px] text-ink-900">{label}</span>{hint && <span className="block text-[11.5px] text-ink-500">{hint}</span>}</span>
      <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${f[k] ? 'bg-brand-600' : 'bg-slate-300'}`} onClick={() => setF({ ...f, [k]: !f[k] })}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${f[k] ? 'left-[18px]' : 'left-0.5'}`} /></span>
    </label>
  )
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card title="Sync window" subtitle="Scheduled syncs run only inside this window">
          <FormGrid cols={2}>
            <Field label="Window start"><Input type="time" value={f.syncWindowStart} onChange={(e) => setF({ ...f, syncWindowStart: e.target.value })} /></Field>
            <Field label="Window end"><Input type="time" value={f.syncWindowEnd} onChange={(e) => setF({ ...f, syncWindowEnd: e.target.value })} /></Field>
            <Field label="Timezone" className="col-span-2"><Select options={['Asia/Kolkata (IST)', 'Europe/Paris (CET)', 'UTC']} value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} /></Field>
          </FormGrid>
          <p className="text-[11.5px] text-ink-500 mt-3">Event-driven connectors (Teams, ServiceNow) are not restricted by the window. Manual “Sync now” always runs immediately.</p>
        </Card>
        <Card title="Retry policy" subtitle="Applied when a sync fails">
          <FormGrid cols={2}>
            <Field label="Retry attempts"><Input type="number" min={0} max={10} value={f.retryCount} onChange={(e) => setF({ ...f, retryCount: +e.target.value || 0 })} /></Field>
            <Field label="Back-off (minutes)"><Input type="number" min={1} value={f.retryBackoffMin} onChange={(e) => setF({ ...f, retryBackoffMin: +e.target.value || 1 })} /></Field>
            <Field label="Mark as failed after (minutes)"><Input type="number" min={1} value={f.failAfterMinutes} onChange={(e) => setF({ ...f, failAfterMinutes: +e.target.value || 1 })} /></Field>
            <Field label="Daily error threshold"><Input type="number" min={1} value={f.errorThreshold} onChange={(e) => setF({ ...f, errorThreshold: +e.target.value || 1 })} /></Field>
          </FormGrid>
          <p className="text-[11.5px] text-ink-500 mt-3">Retries use exponential back-off: {f.retryBackoffMin}, {f.retryBackoffMin * 2}, {f.retryBackoffMin * 4} min… up to {f.retryCount} attempts.</p>
        </Card>
        <Card title="Notification rules" subtitle="Who is told when a sync completes or fails">
          <Toggle label="Notify on error" k="notifyOnError" hint="Immediately after retries are exhausted" />
          <Toggle label="Notify on warning" k="notifyOnWarning" hint="Skipped or partially synced records" />
          <Toggle label="Notify on success" k="notifyOnSuccess" hint="Daily summary only" />
          <FormGrid cols={2}>
            <Field label="Channel" className="mt-3"><Select options={['Email', 'Teams', 'Both']} value={f.notifyChannel} onChange={(e) => setF({ ...f, notifyChannel: e.target.value as IntegrationSettings['notifyChannel'] })} /></Field>
            <Field label="Recipients (handles)" className="mt-3"><Input value={f.notifyRecipients} onChange={(e) => setF({ ...f, notifyRecipients: e.target.value })} /></Field>
          </FormGrid>
        </Card>
      </div>
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-[12.5px] text-green-600">Settings saved</span>}
        <button className="btn-secondary" disabled={!dirty} onClick={() => setF(settings)}>Discard</button>
        <button className="btn-primary" disabled={!dirty} onClick={save}><Save size={14} /> Save settings</button>
      </div>
    </div>
  )
}

