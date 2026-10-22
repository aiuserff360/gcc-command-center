import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, LineChart, Line, AreaChart, Area } from 'recharts'
import { FileBarChart2, CalendarClock, Users, Send, Clock, Printer, Copy, CheckCircle2, Plus, Pencil, Power, FileText, AlertTriangle, Gavel, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { InputLayout } from '../components/layout/InputLayout'
import { Card, KpiTile, Badge, Progress, Table, Tabs, Modal, Field, Input, Select, TextArea, FormGrid, Legend, SectionTitle, ConfirmDelete, EmptyNote } from '../components/ui'
import { tooltipStyle } from '../components/charts'
import { seedBusinessUnits, seedSubUnits, rollUpUnits, subUnitsOf, subY1, programRamp, unitRamp, RAMP_MONTHS, buShortName, type BusinessUnit, type SubUnit } from '../data/businessUnits'
import { useCollection, useStore, uid } from '../store/useStore'
import { seedMilestones, seedRaid, seedProgramKpis, seedWorkstreamSummaries, isOpen, type Milestone, type RaidItem, type ProgramKpis, type WorkstreamSummary } from '../data/shared'
import { fmtDate, CHART_COLORS, MONTHS, TODAY, WORKSTREAM_META, OWNERS, type Workstream } from '../data/common'
import { useMoney } from '../data/money'
import {
  seedReports, seedReportCommentary, seedReportSchedules, seedRecipients, seedHeadcountActuals, REPORT_TYPES, REPORT_STATUSES, CADENCES, CHANNELS, RECIPIENT_GROUPS, COMMENTARY_META,
  type Report, type ReportCommentary, type ReportSchedule, type Recipient, type CommentaryId, type HeadcountActual,
} from '../data/reports'

const TABS = ['Report Library', 'Weekly Program Update', 'Monthly Steering Committee Dashboard', 'Financial Report', 'Hiring & Workforce Report', 'Schedules & Distribution']
const SHORT = (w: string) => WORKSTREAM_META[w as Workstream]?.short ?? w

/* ---------- loose readers for collections owned by other pages ---------- */
type AnyRec = Record<string, unknown> & { id: string }
const numOf = (r: AnyRec, keys: string[]) => { for (const k of keys) { const v = r[k]; if (typeof v === 'number') return v; if (typeof v === 'string' && v !== '' && !isNaN(+v)) return +v } return undefined }
const strOf = (r: AnyRec, keys: string[]) => { for (const k of keys) { const v = r[k]; if (typeof v === 'string' && v) return v } return undefined }

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #print-area, #print-area * { visibility: visible !important; }
  #print-area { position: absolute !important; left: 0; top: 0; width: 100% !important; padding: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
  .no-print { display: none !important; }
  @page { margin: 14mm; }
}`

const addDays = (iso: string, days: number) => { const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }
const monthKey = (iso: string) => iso.slice(0, 7)
const weekLabel = (iso: string) => { const d = new Date(iso); const start = new Date(d.getFullYear(), 0, 1); const wk = Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7); return `W${wk}` }

export default function Reports() {
  const mode = useStore((s) => s.mode)
  const [tab, setTab] = useState(TABS[0])
  const reportsC = useCollection<Report>('reports', seedReports)
  const commentaryC = useCollection<ReportCommentary>('reportCommentary', seedReportCommentary)
  const schedulesC = useCollection<ReportSchedule>('reportSchedules', seedReportSchedules)
  const recipientsC = useCollection<Recipient>('recipients', seedRecipients)
  const k = useCollection<ProgramKpis>('programKpis', seedProgramKpis).items[0] ?? seedProgramKpis[0]
  const { items: milestones } = useCollection<Milestone>('milestones', seedMilestones)
  const { items: raid } = useCollection<RaidItem>('raid', seedRaid)
  const { items: wss } = useCollection<WorkstreamSummary>('workstreamSummaries', seedWorkstreamSummaries)

  const weekly = commentaryC.items.find((c) => c.id === 'weekly') ?? seedReportCommentary[0]
  const thisMonth = reportsC.items.filter((r) => monthKey(r.generatedOn) === monthKey(TODAY)).length
  const activeSchedules = schedulesC.items.filter((s) => s.active).length
  const steerco = schedulesC.items.find((s) => /steering/i.test(s.report))
  const weekStart = addDays(TODAY, -((new Date(TODAY).getDay() + 6) % 7))
  const weeklySent = !!weekly.sentOn && weekly.sentOn >= weekStart

  if (mode === 'input') {
    return (
      <InputLayout title="Reports" subtitle="Maintain the commentary, schedules, distribution lists and report library that feed the rendered reports in the Output view." tabs={[
        { name: 'Commentary', content: <CommentaryInput commentaryC={commentaryC} />, hint: 'Narrative blocks written by the PMO. Each one is printed in the matching report; figures and tables are pulled live from the other modules.' },
        { name: 'Schedules & distribution', content: <Schedules schedulesC={schedulesC} recipientsC={recipientsC} />, hint: 'Automated generation schedules and the people in each distribution group. Click a row to edit.' },
        { name: 'Report library', content: <Library reportsC={reportsC} input />, hint: 'Generated report instances. Generate a new one, open a row to publish, send or delete it.' },
      ]} />
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Automated weekly program updates, steering committee dashboards, financial and hiring reports." />
      <div className="grid grid-cols-5 gap-4">
        <KpiTile tone="blue" icon={<FileBarChart2 size={22} />} value={thisMonth} label="Reports Generated This Month" sub={`${reportsC.items.length} in library`} />
        <KpiTile tone="violet" icon={<CalendarClock size={22} />} value={activeSchedules} label="Scheduled Reports" sub={`${schedulesC.items.length - activeSchedules} paused`} />
        <KpiTile tone="teal" icon={<Clock size={22} />} value={steerco ? fmtDate(steerco.nextRun.slice(0, 10)) : '—'} label="Next Steering Committee Pack" sub={steerco ? `${steerco.cadence} · ${steerco.channel}` : 'Not scheduled'} />
        <KpiTile tone={weeklySent ? 'green' : 'amber'} icon={weeklySent ? <CheckCircle2 size={22} /> : <Send size={22} />} value={weeklySent ? 'Sent' : 'Due'} label="Weekly Update Status" sub={weeklySent ? `Sent ${fmtDate(weekly.sentOn!)}` : `Due ${fmtDate(addDays(weekStart, 7))}`} />
        <KpiTile tone="navy" icon={<Users size={22} />} value={recipientsC.items.length} label="Report Recipients" sub={`${RECIPIENT_GROUPS.length} distribution groups`} />
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'Report Library' && <Library reportsC={reportsC} />}
      {tab === 'Weekly Program Update' && <WeeklyUpdate k={k} milestones={milestones} raid={raid} wss={wss} commentary={weekly} commentaryC={commentaryC} reportsC={reportsC} recipients={recipientsC.items.length} />}
      {tab === 'Monthly Steering Committee Dashboard' && <SteerCo k={k} milestones={milestones} raid={raid} wss={wss} commentary={commentaryC.items.find((c) => c.id === 'monthly')} />}
      {tab === 'Financial Report' && <FinancialReport k={k} wss={wss} commentaryC={commentaryC} />}
      {tab === 'Hiring & Workforce Report' && <HiringReport k={k} commentaryC={commentaryC} />}
      {tab === 'Schedules & Distribution' && <Schedules schedulesC={schedulesC} recipientsC={recipientsC} />}
    </div>
  )
}

/* ====================================================================== */
/* Commentary (Input view)                                                 */
/* ====================================================================== */
type CommentaryC = ReturnType<typeof useCollection<ReportCommentary>>
function CommentaryInput({ commentaryC }: { commentaryC: CommentaryC }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {COMMENTARY_META.map((meta) => <CommentaryCard key={meta.id} id={meta.id} commentaryC={commentaryC} />)}
    </div>
  )
}

function CommentaryCard({ id, commentaryC }: { id: CommentaryId; commentaryC: CommentaryC }) {
  const meta = COMMENTARY_META.find((m) => m.id === id)!
  const rec: ReportCommentary = commentaryC.items.find((c) => c.id === id) ?? seedReportCommentary.find((c) => c.id === id) ?? { id, text: '', updatedOn: TODAY }
  const [text, setText] = useState(rec.text)
  const dirty = text !== rec.text
  const save = () => commentaryC.update({ ...rec, text, updatedOn: TODAY })
  return (
    <Card title={meta.title} subtitle={meta.report} headerRight={<span className="text-[11.5px] text-ink-500 whitespace-nowrap">Updated {fmtDate(rec.updatedOn)}{rec.sentOn ? ` · sent ${fmtDate(rec.sentOn)}` : ''}</span>}>
      <TextArea className="min-h-[150px]" value={text} onChange={(e) => setText(e.target.value)} placeholder={meta.hint} />
      <p className="text-[12px] text-ink-500 mt-2">{meta.hint}</p>
      <div className="flex items-center justify-end gap-2 mt-3">
        {dirty && <span className="text-[11.5px] text-amber-600 mr-auto">Unsaved changes</span>}
        <button className="btn-secondary" disabled={!dirty} onClick={() => setText(rec.text)}>Discard</button>
        <button className="btn-primary" disabled={!dirty} onClick={save}>Save</button>
      </div>
    </Card>
  )
}

/* ====================================================================== */
/* Report Library                                                          */
/* ====================================================================== */
function Library({ reportsC, input }: { reportsC: ReturnType<typeof useCollection<Report>>; input?: boolean }) {
  const [typeF, setTypeF] = useState('All')
  const [statusF, setStatusF] = useState('All')
  const [gen, setGen] = useState(false)
  const [preview, setPreview] = useState<Report | null>(null)
  const rows = useMemo(() => reportsC.items.filter((r) => (typeF === 'All' || r.type === typeF) && (statusF === 'All' || r.status === statusF)).sort((a, b) => b.generatedOn.localeCompare(a.generatedOn)), [reportsC.items, typeF, statusF])
  const byType = REPORT_TYPES.map((t) => ({ type: t, n: reportsC.items.filter((r) => r.type === t).length }))

  return (
    <div className={input ? 'space-y-4' : 'grid grid-cols-[1fr_300px] gap-4'}>
      <Card title="Report Library" subtitle={input ? `${reportsC.items.length} generated reports · click a row to publish, send or delete` : 'Templates and generated instances'} action={<button className="btn-primary" onClick={() => setGen(true)}><Plus size={14} /> Generate report</button>}
        headerRight={<div className="flex gap-2">
          <select className="input py-1 w-auto" value={typeF} onChange={(e) => setTypeF(e.target.value)}>{['All', ...REPORT_TYPES].map((o) => <option key={o}>{o}</option>)}</select>
          <select className="input py-1 w-auto" value={statusF} onChange={(e) => setStatusF(e.target.value)}>{['All', ...REPORT_STATUSES].map((o) => <option key={o}>{o}</option>)}</select>
        </div>}>
        <Table<Report> rows={rows} onRowClick={setPreview} columns={[
          { key: 'name', header: 'Report', render: (r) => <span className="font-medium inline-flex items-center gap-2"><FileText size={14} className="text-brand-600" />{r.name}</span> },
          { key: 'type', header: 'Type', render: (r) => <Badge value={r.type} /> },
          { key: 'period', header: 'Period', className: 'whitespace-nowrap' },
          { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
          { key: 'generatedOn', header: 'Generated on', className: 'whitespace-nowrap', render: (r) => fmtDate(r.generatedOn) },
          { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
          { key: 'recipients', header: 'Recipients', className: 'text-right' },
          ...(input ? [{ key: 'del', header: '', render: (r: Report) => <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}><button className="text-ink-400 hover:text-ink-900 rounded p-1 cursor-pointer" title="Open" onClick={() => setPreview(r)}><Pencil size={13} /></button><button className="text-ink-400 hover:text-red-600 rounded p-1 cursor-pointer" title="Delete" onClick={() => { if (window.confirm(`Delete "${r.name}" from the library?`)) reportsC.remove(r.id) }}><Trash2 size={13} /></button></span> }] : []),
        ]} />
      </Card>
      {!input && <div className="space-y-4">
        <Card title="Reports by type">
          <div className="h-[170px]">
            <ResponsiveContainer>
              <BarChart data={byType} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barCategoryGap="25%">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="type" width={64} tickLine={false} axisLine={false} tick={{ fontSize: 11.5 }} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="n" fill={CHART_COLORS.blue} radius={[0, 4, 4, 0]}><LabelList dataKey="n" position="right" style={{ fontSize: 11, fill: '#111827' }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Reporting templates (WBS 1.3.4)">
          <ul className="text-[12.5px] text-ink-700 space-y-1.5">
            {[['Weekly Program Update', 'Status, milestones, RAID, decisions'], ['Steering Committee Dashboard', 'One-page exec view, monthly'], ['Financial Report', 'Budget vs actual vs forecast'], ['Hiring & Workforce Report', 'Headcount plan vs actual, funnel']].map(([n, d]) => (
              <li key={n} className="flex justify-between gap-2"><span className="font-medium text-ink-900">{n}</span><span className="text-ink-500 text-right">{d}</span></li>
            ))}
          </ul>
        </Card>
      </div>}
      <GenerateModal open={gen} onClose={() => setGen(false)} onSave={(r) => { reportsC.add(r); setGen(false); setPreview(r) }} />
      <PreviewModal report={preview} onClose={() => setPreview(null)} onChange={(r) => { reportsC.update(r); setPreview(r) }} onDelete={(id) => { reportsC.remove(id); setPreview(null) }} />
    </div>
  )
}

function GenerateModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (r: Report) => void }) {
  const [f, setF] = useState<Report>({ id: '', name: `Weekly Program Update – ${weekLabel(TODAY)}`, type: 'Weekly', period: `${fmtDate(addDays(TODAY, -6)).slice(0, 6).trim()} – ${fmtDate(TODAY)}`, owner: 'A. Sharma', generatedOn: TODAY, status: 'Draft', recipients: 14 })
  const setType = (type: Report['type']) => {
    const names: Record<Report['type'], string> = { Weekly: `Weekly Program Update – ${weekLabel(TODAY)}`, Monthly: 'Steering Committee Dashboard – Feb 2027', Financial: 'Financial Report – Feb 2027', Hiring: 'Hiring & Workforce Report – Feb 2027', 'Ad hoc': 'Ad hoc report' }
    const periods: Record<Report['type'], string> = { Weekly: `${fmtDate(addDays(TODAY, -6)).slice(0, 6).trim()} – ${fmtDate(TODAY)}`, Monthly: 'Feb 2027', Financial: 'Feb 2027 (MTD)', Hiring: 'Feb 2027 (MTD)', 'Ad hoc': `As of ${fmtDate(TODAY)}` }
    const rec: Record<Report['type'], number> = { Weekly: 14, Monthly: 9, Financial: 7, Hiring: 11, 'Ad hoc': 6 }
    setF({ ...f, type, name: names[type], period: periods[type], recipients: rec[type] })
  }
  return (
    <Modal open={open} onClose={onClose} title="Generate report" footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave({ ...f, id: uid('rp'), generatedOn: TODAY })}>Generate</button></>}>
      <FormGrid cols={2}>
        <Field label="Report type"><Select options={REPORT_TYPES} value={f.type} onChange={(e) => setType(e.target.value as Report['type'])} /></Field>
        <Field label="Owner"><Select options={OWNERS} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></Field>
        <Field label="Report name" className="col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Period"><Input value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} /></Field>
        <Field label="Recipients"><Input type="number" value={f.recipients} onChange={(e) => setF({ ...f, recipients: +e.target.value || 0 })} /></Field>
      </FormGrid>
      <p className="text-[12px] text-ink-500 mt-3">The report is generated from live program data as of {fmtDate(TODAY)} and saved as a Draft in the library.</p>
    </Modal>
  )
}

function PreviewModal({ report, onClose, onChange, onDelete }: { report: Report | null; onClose: () => void; onChange: (r: Report) => void; onDelete: (id: string) => void }) {
  if (!report) return null
  const sections: Record<Report['type'], string[]> = {
    Weekly: ['Program KPIs', 'Workstream RAG summary', 'Milestones due in next 2 weeks', 'Top open risks & issues', 'Decisions needed', 'Program Manager commentary'],
    Monthly: ['Executive KPIs', 'Workstream health', 'Budget vs actual', 'Headcount plan vs actual', 'Top 5 risks', 'Key decisions required', 'Next month milestones'],
    Financial: ['Budget vs actual vs forecast by workstream', 'Variance commentary', 'Cash forecast', 'Commitments & accruals'],
    Hiring: ['Headcount plan vs actual', 'Open positions', 'Hiring funnel', 'Attrition & offer declines', 'Commentary'],
    'Ad hoc': ['Context', 'Analysis', 'Impact', 'Recommendation'],
  }
  return (
    <Modal open onClose={onClose} title={report.name} width="max-w-xl" footer={<>
      <ConfirmDelete onConfirm={() => onDelete(report.id)} />
      <span className="flex-1" />
      {report.status === 'Draft' && <button className="btn-secondary" onClick={() => onChange({ ...report, status: 'Published' })}>Publish</button>}
      {report.status !== 'Sent' && <button className="btn-primary" onClick={() => onChange({ ...report, status: 'Sent' })}><Send size={14} /> Send to {report.recipients} recipients</button>}
      {report.status === 'Sent' && <button className="btn-secondary" onClick={onClose}>Close</button>}
    </>}>
      <div className="grid grid-cols-3 gap-3 text-[12.5px] mb-4">
        <div><div className="text-ink-500">Type</div><Badge value={report.type} /></div>
        <div><div className="text-ink-500">Period</div><div className="font-medium">{report.period}</div></div>
        <div><div className="text-ink-500">Status</div><Badge value={report.status} /></div>
        <div><div className="text-ink-500">Owner</div><div className="font-medium">{report.owner}</div></div>
        <div><div className="text-ink-500">Generated on</div><div className="font-medium">{fmtDate(report.generatedOn)}</div></div>
        <div><div className="text-ink-500">Recipients</div><div className="font-medium">{report.recipients}</div></div>
      </div>
      <SectionTitle>Contents</SectionTitle>
      <ol className="list-decimal pl-5 text-[13px] text-ink-700 space-y-1">{sections[report.type].map((s) => <li key={s}>{s}</li>)}</ol>
      <p className="text-[12px] text-ink-500 mt-4">Open the matching tab to view the rendered report built from live program data.</p>
    </Modal>
  )
}

/* ====================================================================== */
/* Weekly Program Update                                                   */
/* ====================================================================== */
function WeeklyUpdate({ k, milestones, raid, wss, commentary, commentaryC, reportsC, recipients }: {
  k: ProgramKpis; milestones: Milestone[]; raid: RaidItem[]; wss: WorkstreamSummary[]; commentary: ReportCommentary
  commentaryC: ReturnType<typeof useCollection<ReportCommentary>>; reportsC: ReturnType<typeof useCollection<Report>>; recipients: number
}) {
  const m = useMoney()
  const [text, setText] = useState(commentary.text)
  const [copied, setCopied] = useState(false)
  const due = useMemo(() => milestones.filter((m) => m.status !== 'Completed' && m.dueDate >= TODAY && m.dueDate <= addDays(TODAY, 14)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [milestones])
  const topRaid = useMemo(() => raid.filter(isOpen).sort((a, b) => b.impactScore - a.impactScore).slice(0, 6), [raid])
  const decisions = useMemo(() => raid.filter((r) => isOpen(r) && (r.escalationStatus === 'Awaiting Decision' || r.escalated)).slice(0, 5), [raid])
  const period = `${fmtDate(addDays(TODAY, -6))} – ${fmtDate(TODAY)}`
  const saveCommentary = () => commentaryC.update({ ...commentary, text, updatedOn: TODAY })

  const asText = () => [
    `WEEKLY PROGRAM UPDATE – ${k.programName} – ${weekLabel(TODAY)} (${period})`, '',
    'PROGRAM KPIs',
    `Program completion ${k.programCompletion}% | Milestone adherence ${k.milestoneAdherence}% | Talent onboarded ${k.talentOnboarded}/${k.talentTarget} | Actual spend ${m.fmt(k.actualSpendCr)} of ${m.fmt(k.approvedBudgetCr)} | Open critical issues ${k.openCriticalIssues} | Readiness ${k.transitionReadiness}%`, '',
    'WORKSTREAM STATUS', ...wss.map((w) => `- ${w.name}: ${w.status} (${w.progress}%) – schedule ${w.scheduleHealth}, budget ${w.budgetHealth}, owner ${w.owner}`), '',
    'MILESTONES DUE IN NEXT 2 WEEKS', ...due.map((m) => `- ${fmtDate(m.dueDate)} ${m.name} (${SHORT(m.workstream)}) – ${m.status}, ${m.owner}`), '',
    'TOP OPEN RISKS & ISSUES', ...topRaid.map((r) => `- ${r.code} ${r.title} – ${r.level}, ${r.status}, ${r.owner}`), '',
    'DECISIONS NEEDED', ...(decisions.length ? decisions.map((r) => `- ${r.code} ${r.title} – ${r.owner}`) : ['- None']), '',
    'PROGRAM MANAGER COMMENTARY', text,
  ].join('\n')

  const copy = async () => { try { await navigator.clipboard.writeText(asText()); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ } }
  const markSent = () => {
    saveCommentary()
    commentaryC.update({ ...commentary, text, updatedOn: TODAY, sentOn: TODAY })
    reportsC.add({ id: uid('rp'), name: `Weekly Program Update – ${weekLabel(TODAY)}`, type: 'Weekly', period, owner: 'A. Sharma', generatedOn: TODAY, status: 'Sent', recipients })
  }

  return (
    <div className="space-y-4">
      <style>{PRINT_CSS}</style>
      <div className="flex items-center justify-between no-print">
        <p className="text-[12.5px] text-ink-500">Built live from program KPIs, workstream summaries, milestones and the RAID register as of {fmtDate(TODAY)}.</p>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => window.print()}><Printer size={14} /> Print / Save as PDF</button>
          <button className="btn-secondary" onClick={copy}><Copy size={14} /> {copied ? 'Copied!' : 'Copy as text'}</button>
          <button className="btn-primary" onClick={markSent}><Send size={14} /> Mark as sent</button>
        </div>
      </div>
      <div id="print-area" className="card p-6 space-y-5">
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-brand-600 font-semibold">Weekly Program Update · {weekLabel(TODAY)}</div>
            <h2 className="text-[20px] font-bold text-navy-900">{k.programName}</h2>
            <p className="text-[12.5px] text-ink-500">Reporting period {period} · Phase: {k.lifecyclePhase} · Prepared by Program Management Office</p>
          </div>
          <div className="text-right text-[12px] text-ink-500">
            <div>Status {commentary.sentOn && commentary.sentOn >= addDays(TODAY, -6) ? <Badge value="Sent" /> : <Badge value="Draft" />}</div>
            <div className="mt-1">{commentary.sentOn ? `Last sent ${fmtDate(commentary.sentOn)}` : 'Not yet sent'}</div>
          </div>
        </div>

        <section>
          <h3 className="text-[14px] font-semibold text-ink-900 mb-2">1. Program KPIs</h3>
          <div className="grid grid-cols-6 gap-3">
            {[
              ['Program Completion', `${k.programCompletion}%`, `+${k.programCompletionDelta}% vs last month`, 'text-green-600'],
              ['Milestone Adherence', `${k.milestoneAdherence}%`, `+${k.milestoneAdherenceDelta}% vs last month`, 'text-brand-600'],
              ['Talent Onboarded', `${k.talentOnboarded} / ${k.talentTarget}`, `+${k.talentDeltaVsPlan}% vs plan`, 'text-navy-900'],
              ['Actual Spend', m.fmt(k.actualSpendCr), `of ${m.fmt(k.approvedBudgetCr)} budget`, 'text-navy-900'],
              ['Open Critical Issues', String(k.openCriticalIssues), `${k.openCriticalIssuesDelta} vs last month`, 'text-red-600'],
              ['Readiness for Transition', `${k.transitionReadiness}%`, `+${k.transitionReadinessDelta}% vs last month`, 'text-green-600'],
            ].map(([l, v, s, c]) => (
              <div key={l} className="rounded-lg border border-line p-3">
                <div className={`text-[20px] font-bold leading-tight ${c}`}>{v}</div>
                <div className="text-[12px] font-medium text-ink-700 mt-0.5">{l}</div>
                <div className="text-[11px] text-ink-500">{s}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[14px] font-semibold text-ink-900 mb-2">2. Workstream Status (RAG)</h3>
          <Table<WorkstreamSummary> compact rows={wss} columns={[
            { key: 'name', header: 'Workstream', render: (w) => <span className="font-medium">{w.name}</span> },
            { key: 'progress', header: 'Progress', width: '220px', render: (w) => <div className="flex items-center gap-2"><Progress value={w.progress} className="flex-1" /><span className="w-9 text-right text-[12px]">{w.progress}%</span></div> },
            { key: 'status', header: 'Overall', render: (w) => <Badge value={w.status} /> },
            { key: 'scheduleHealth', header: 'Schedule', render: (w) => <Badge value={w.scheduleHealth} /> },
            { key: 'budgetHealth', header: 'Budget', render: (w) => <Badge value={w.budgetHealth} /> },
            { key: 'activeInitiatives', header: 'Active initiatives', className: 'text-right' },
            { key: 'owner', header: 'Owner' },
          ]} />
        </section>

        <div className="grid grid-cols-2 gap-5">
          <section>
            <h3 className="text-[14px] font-semibold text-ink-900 mb-2">3. Milestones due in next 2 weeks ({due.length})</h3>
            <Table<Milestone> compact rows={due} empty="No milestones due in the next 14 days." columns={[
              { key: 'dueDate', header: 'Due', className: 'whitespace-nowrap', render: (m) => fmtDate(m.dueDate) },
              { key: 'name', header: 'Milestone', render: (m) => <span className="font-medium">{m.name}</span> },
              { key: 'workstream', header: 'Workstream', render: (m) => SHORT(m.workstream) },
              { key: 'status', header: 'Status', render: (m) => <Badge value={m.status} /> },
            ]} />
          </section>
          <section>
            <h3 className="text-[14px] font-semibold text-ink-900 mb-2">4. Top open risks & issues</h3>
            <Table<RaidItem> compact rows={topRaid} columns={[
              { key: 'code', header: 'ID', className: 'whitespace-nowrap', render: (r) => <span className="text-ink-500">{r.code}</span> },
              { key: 'title', header: 'Risk / Issue', render: (r) => <span className="font-medium">{r.shortTitle ?? r.title}</span> },
              { key: 'level', header: 'Impact', render: (r) => <Badge value={r.level} /> },
              { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
              { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
            ]} />
          </section>
        </div>

        <section>
          <h3 className="text-[14px] font-semibold text-ink-900 mb-2">5. Decisions needed from Steering Committee</h3>
          {decisions.length === 0 ? <EmptyNote>No escalated items awaiting a decision this week.</EmptyNote> : (
            <ul className="space-y-1.5">
              {decisions.map((r) => (
                <li key={r.id} className="flex items-start gap-2 text-[13px]"><Gavel size={14} className="text-violet-600 mt-0.5 shrink-0" /><span><span className="text-ink-500 mr-1">{r.code}</span><span className="font-medium">{r.title}</span> — {r.mitigation ?? r.description ?? 'Decision required on mitigation and funding.'} <span className="text-ink-500">({r.owner}, due {fmtDate(r.dueDate)})</span></span></li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[14px] font-semibold text-ink-900">6. Program Manager commentary</h3>
            <span className="text-[11.5px] text-ink-500 no-print">Last updated {fmtDate(commentary.updatedOn)}{text !== commentary.text && ' · unsaved changes'}</span>
          </div>
          <TextArea className="no-print min-h-[110px]" value={text} onChange={(e) => setText(e.target.value)} onBlur={saveCommentary} />
          <p className="hidden print:block text-[13px] text-ink-900 whitespace-pre-wrap">{text}</p>
          <div className="flex justify-end mt-2 no-print"><button className="btn-secondary" onClick={saveCommentary} disabled={text === commentary.text}>Save commentary</button></div>
        </section>
        <div className="text-[11px] text-ink-500 border-t border-line pt-3">Generated by GCC Command Center on {fmtDate(TODAY)} · Distribution: Steering Committee, Workstream Leads, PMO ({recipients} recipients)</div>
      </div>
    </div>
  )
}

/* ====================================================================== */
/* Monthly Steering Committee Dashboard                                    */
/* ====================================================================== */
/** Months with a steering pack: the first four ramp months (Nov 2026 – Feb 2027). */
const STEERCO_MONTHS = ['2026-11', '2026-12', '2027-01', '2027-02']
const monthName = (ym: string) => `${MONTHS[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`
/** '2027-01' → 'Jan 27' (the RAMP_MONTHS label). */
const rampLabel = (ym: string) => `${MONTHS[+ym.slice(5, 7) - 1]} ${ym.slice(2, 4)}`
const nextMonth = (ym: string) => { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}` }

function SteerCo({ k, milestones, raid, wss, commentary }: { k: ProgramKpis; milestones: Milestone[]; raid: RaidItem[]; wss: WorkstreamSummary[]; commentary?: ReportCommentary }) {
  const m = useMoney()
  const [month, setMonth] = useState('2027-01')
  const nm = nextMonth(month)
  const { items: subUnits } = useCollection<SubUnit>('subUnits', seedSubUnits)
  const { items: actuals } = useCollection<HeadcountActual>('headcountActuals', seedHeadcountActuals)
  const nextMs = useMemo(() => milestones.filter((m) => monthKey(m.dueDate) === nm).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [milestones, nm])
  const top5 = useMemo(() => raid.filter(isOpen).filter((r) => r.type === 'Risk').sort((a, b) => b.impactScore - a.impactScore).slice(0, 5), [raid])
  const decisions = useMemo(() => raid.filter((r) => isOpen(r) && (r.escalationStatus === 'Awaiting Decision' || r.escalated)).slice(0, 4), [raid])
  const budget = useMemo(() => wss.map((w) => ({ name: SHORT(w.name), Budget: m.toDisplay(w.approvedBudgetCr), Actual: m.toDisplay(w.actualSpendCr) })), [wss, m.currency, m.rate]) // eslint-disable-line react-hooks/exhaustive-deps
  const fmtDisp = (v: number) => `${m.symbol} ${v.toFixed(m.digits)} ${m.unit}`
  // Year-1 month-wise ramp (plan = sum of capability ramps from the organisation structure) up to the pack month.
  const headcount = useMemo(() => {
    const idx = Math.max(0, RAMP_MONTHS.indexOf(rampLabel(month) as (typeof RAMP_MONTHS)[number]))
    const plan = programRamp(subUnits)
    return RAMP_MONTHS.slice(0, idx + 1).map((m, i) => ({ month: m, Plan: plan[i], Actual: actuals.find((a) => a.month === m)?.actual }))
  }, [subUnits, actuals, month])
  const onboardedAtMonth = headcount[headcount.length - 1]?.Actual ?? k.talentOnboarded
  // month offset for "as of" KPIs (earlier months shown slightly lower)
  const off = (STEERCO_MONTHS.indexOf(month) - 2)
  const adj = (v: number, step: number) => Math.max(0, Math.round(v + off * step))

  return (
    <div className="space-y-4">
      <style>{PRINT_CSS}</style>
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <label className="text-[12.5px] text-ink-500">Month</label>
          <select className="input w-auto py-1.5" value={month} onChange={(e) => setMonth(e.target.value)}>{STEERCO_MONTHS.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}</select>
          <span className="text-[12.5px] text-ink-500">One-page executive view · all figures from live program data</span>
        </div>
        <button className="btn-secondary" onClick={() => window.print()}><Printer size={14} /> Print / Save as PDF</button>
      </div>
      <div id="print-area" className="card p-6 space-y-4">
        <div className="flex items-start justify-between border-b border-line pb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-brand-600 font-semibold">Steering Committee Dashboard · {monthName(month)}</div>
            <h2 className="text-[20px] font-bold text-navy-900">{k.programName}</h2>
            <p className="text-[12.5px] text-ink-500">Lifecycle phase: {k.lifecyclePhase} · Go-live target {fmtDate(k.goLiveTarget)} · Program timeline {fmtDate(k.timelineStart)} – {fmtDate(k.timelineEnd)}</p>
          </div>
          <div className="text-right"><div className="text-[26px] font-bold text-green-600 leading-none">{adj(k.programCompletion, 6)}%</div><div className="text-[11.5px] text-ink-500">overall completion</div></div>
        </div>

        <div className="grid grid-cols-6 gap-3">
          {[
            ['Program Completion', `${adj(k.programCompletion, 6)}%`, 'text-green-600'], ['Milestone Adherence', `${adj(k.milestoneAdherence, 4)}%`, 'text-brand-600'],
            ['Talent Onboarded', `${onboardedAtMonth} / ${k.talentTarget}`, 'text-navy-900'], ['Budget Consumed', `${Math.round(((k.actualSpendCr + off * 0.3) / k.approvedBudgetCr) * 100)}%`, 'text-navy-900'],
            ['Open Critical Issues', String(adj(k.openCriticalIssues, -2)), 'text-red-600'], ['Transition Readiness', `${adj(k.transitionReadiness, 10)}%`, 'text-green-600'],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-lg bg-surface p-3"><div className={`text-[21px] font-bold leading-tight ${c}`}>{v}</div><div className="text-[12px] text-ink-700 mt-0.5">{l}</div></div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-line p-3">
            <div className="text-[13px] font-semibold mb-2">Workstream health</div>
            <div className="space-y-2">
              {wss.map((w) => (
                <div key={w.id} className="flex items-center gap-2 text-[12px]">
                  <span className="w-[92px] truncate text-ink-700">{SHORT(w.name)}</span>
                  <Progress value={w.progress} className="flex-1" color={w.status === 'On Track' ? '#16A34A' : w.status === 'At Risk' ? '#F59E0B' : '#DC2626'} />
                  <span className="w-8 text-right font-medium">{w.progress}%</span>
                  <Badge value={w.status} />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-line p-3">
            <div className="flex items-center justify-between mb-1"><div className="text-[13px] font-semibold">Budget vs actual ({m.unitLabel})</div><Legend items={[{ label: 'Budget', color: CHART_COLORS.blueFaint }, { label: 'Actual', color: CHART_COLORS.blue }]} /></div>
            <div className="h-[190px]">
              <ResponsiveContainer>
                <BarChart data={budget} margin={{ top: 6, right: 4, left: -26, bottom: 0 }} barGap={2} barCategoryGap="28%">
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={0} angle={-28} textAnchor="end" height={38} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10.5 }} tickFormatter={(v) => String(+Number(v).toFixed(m.digits))} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => fmtDisp(Number(v))} />
                  <Bar dataKey="Budget" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-lg border border-line p-3">
            <div className="flex items-center justify-between mb-1"><div className="text-[13px] font-semibold">Headcount plan vs actual</div><Legend items={[{ label: 'Plan', color: CHART_COLORS.gray, dashed: true }, { label: 'Actual', color: CHART_COLORS.teal }]} /></div>
            <div className="h-[190px]">
              <ResponsiveContainer>
                <LineChart data={headcount} margin={{ top: 14, right: 18, left: -22, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10.5 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10.5 }} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="Plan" stroke="#9CA3AF" strokeDasharray="4 3" dot={{ r: 3 }} strokeWidth={2} />
                  <Line type="monotone" dataKey="Actual" stroke={CHART_COLORS.teal} dot={{ r: 3 }} strokeWidth={2.5}><LabelList dataKey="Actual" position="top" style={{ fontSize: 10, fill: '#111827' }} /></Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-line p-3">
            <div className="text-[13px] font-semibold mb-2">Top 5 risks</div>
            <Table<RaidItem> compact rows={top5} columns={[
              { key: 'title', header: 'Risk', render: (r) => <span className="font-medium">{r.shortTitle ?? r.title}</span> },
              { key: 'level', header: 'Impact', render: (r) => <Badge value={r.level} /> },
              { key: 'impactScore', header: 'Score', className: 'text-right' },
            ]} />
          </div>
          <div className="rounded-lg border border-line p-3">
            <div className="text-[13px] font-semibold mb-2">Key decisions required</div>
            {decisions.length === 0 ? <EmptyNote>No decisions pending.</EmptyNote> : (
              <ul className="space-y-2">
                {decisions.map((r) => (
                  <li key={r.id} className="text-[12.5px] flex gap-2"><span className="w-5 h-5 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><Gavel size={11} /></span><span><span className="font-medium">{r.title}</span><br /><span className="text-ink-500">{r.workstream} · {r.owner} · due {fmtDate(r.dueDate)}</span></span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-line p-3">
            <div className="text-[13px] font-semibold mb-2">Milestones – {monthName(nm)} ({nextMs.length})</div>
            <Table<Milestone> compact rows={nextMs.slice(0, 6)} empty="No milestones due next month." columns={[
              { key: 'dueDate', header: 'Due', className: 'whitespace-nowrap', render: (m) => fmtDate(m.dueDate).slice(0, 6) },
              { key: 'name', header: 'Milestone', render: (m) => <span className="font-medium">{m.name}</span> },
              { key: 'status', header: 'Status', render: (m) => <Badge value={m.status} /> },
            ]} />
          </div>
        </div>
        {commentary?.text && (
          <div className="rounded-lg border border-line p-3">
            <div className="flex items-center justify-between mb-1"><div className="text-[13px] font-semibold">PMO commentary</div><span className="text-[11px] text-ink-500">Updated {fmtDate(commentary.updatedOn)} · maintained in the Input view</span></div>
            <p className="text-[12.5px] text-ink-700 whitespace-pre-wrap">{commentary.text}</p>
          </div>
        )}
        <div className="text-[11px] text-ink-500 border-t border-line pt-3">Prepared by PMO for the {monthName(month)} Steering Committee · Generated {fmtDate(TODAY)} · Confidential</div>
      </div>
    </div>
  )
}

/* ====================================================================== */
/* Financial Report                                                        */
/* ====================================================================== */
interface FinRow { id: string; workstream: string; budget: number; actual: number; forecast: number }

function FinancialReport({ k, wss, commentaryC }: { k: ProgramKpis; wss: WorkstreamSummary[]; commentaryC: ReturnType<typeof useCollection<ReportCommentary>> }) {
  const budgetLines = useStore((s) => s.collections['budgetLines']) as AnyRec[] | undefined
  const monthly = useStore((s) => s.collections['monthlyFinancials']) as AnyRec[] | undefined
  const commentary = commentaryC.items.find((c) => c.id === 'financial') ?? seedReportCommentary.find((c) => c.id === 'financial')!
  const [text, setText] = useState(commentary.text)
  const m = useMoney()
  const d2 = m.digits + 1 // 2 decimals in ₹ Cr, 3 in € M
  const cell = (cr: number) => m.num(cr, d2)
  const fmtDisp = (v: number) => `${m.symbol} ${v.toFixed(d2)} ${m.unit}`

  const { rows, source } = useMemo(() => {
    if (budgetLines && budgetLines.length) {
      const map = new Map<string, FinRow>()
      for (const r of budgetLines) {
        const ws = strOf(r, ['workstream', 'category', 'name']) ?? 'Unallocated'
        const cur = map.get(ws) ?? { id: ws, workstream: ws, budget: 0, actual: 0, forecast: 0 }
        cur.budget += numOf(r, ['approvedBudgetCr', 'budgetCr', 'approvedCr', 'budget', 'approved', 'planned', 'plannedCr']) ?? 0
        cur.actual += numOf(r, ['actualSpendCr', 'actualCr', 'actual', 'spentCr', 'spent', 'ytdActual']) ?? 0
        cur.forecast += numOf(r, ['forecastAtCompletionCr', 'forecastCr', 'forecast', 'eac', 'eacCr']) ?? 0
        map.set(ws, cur)
      }
      const list = [...map.values()]
      if (list.some((r) => r.budget > 0)) return { rows: list, source: 'Financial Management budget lines' }
    }
    return { rows: wss.map((w) => ({ id: w.id, workstream: w.name, budget: w.approvedBudgetCr, actual: w.actualSpendCr, forecast: w.forecastAtCompletionCr })), source: 'workstream summaries' }
  }, [budgetLines, wss])
  const tot = rows.reduce((a, r) => ({ budget: a.budget + r.budget, actual: a.actual + r.actual, forecast: a.forecast + r.forecast }), { budget: 0, actual: 0, forecast: 0 })
  const r1 = (v: number) => +v.toFixed(2)

  const cash = useMemo(() => {
    if (monthly && monthly.length) {
      const list = monthly.map((r, i) => ({ month: strOf(r, ['month', 'period', 'name', 'label']) ?? `M${i + 1}`, Plan: numOf(r, ['planCr', 'plan', 'budgetCr', 'budget', 'planned']), Actual: numOf(r, ['actualCr', 'actual', 'spend', 'spent']), Forecast: numOf(r, ['forecastCr', 'forecast']) }))
      if (list.some((r) => r.Plan !== undefined || r.Actual !== undefined)) return { data: list, placeholder: false }
    }
    // synthesized cumulative cash curve: 12 months of 2026
    const data = MONTHS.map((m, i) => {
      const share = [0.03, 0.07, 0.12, 0.18, 0.25, 0.33, 0.41, 0.49, 0.57, 0.65, 0.74, 0.84][i]
      const plan = r1(k.approvedBudgetCr * share)
      const actual = i <= 9 ? r1(k.actualSpendCr * (share / 0.65)) : undefined
      const forecast = i >= 9 ? r1(k.forecastAtCompletionCr * share) : undefined
      return { month: m, Plan: plan, Actual: actual, Forecast: forecast }
    })
    return { data, placeholder: true }
  }, [monthly, k])
  // chart series in display units so axis/tooltips follow the selected currency
  const cashData = useMemo(() => cash.data.map((r) => ({ ...r, Plan: r.Plan === undefined ? undefined : m.toDisplay(r.Plan), Actual: r.Actual === undefined ? undefined : m.toDisplay(r.Actual), Forecast: r.Forecast === undefined ? undefined : m.toDisplay(r.Forecast) })), [cash, m.currency, m.rate]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => commentaryC.update({ ...commentary, text, updatedOn: TODAY })
  const varianceCls = (v: number) => (v > 0.05 ? 'text-red-600' : v < -0.05 ? 'text-green-600' : 'text-ink-900')

  return (
    <div className="space-y-4">
      <style>{PRINT_CSS}</style>
      <div className="flex items-center justify-between no-print">
        <p className="text-[12.5px] text-ink-500">Source: {source}. Figures in {m.unitLabel}. {cash.placeholder && 'Cash forecast is a placeholder curve derived from program KPIs until monthly financials are captured on the Financial Management page.'}</p>
        <button className="btn-secondary" onClick={() => window.print()}><Printer size={14} /> Print / Save as PDF</button>
      </div>
      <div id="print-area" className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <KpiTile tone="blue" icon={<Users size={20} />} value={m.fmt(tot.budget)} label="Approved Budget" />
          <KpiTile tone="navy" icon={<Users size={20} />} value={m.fmt(tot.actual)} label="Actual Spend" sub={`${tot.budget ? Math.round((tot.actual / tot.budget) * 100) : 0}% consumed`} />
          <KpiTile tone="teal" icon={<Users size={20} />} value={m.fmt(tot.forecast)} label="Forecast at Completion" />
          <KpiTile tone={tot.forecast > tot.budget ? 'red' : 'green'} icon={<AlertTriangle size={20} />} value={m.fmt(tot.budget - tot.forecast)} label="Forecast Headroom" sub={`${tot.budget ? Math.round(((tot.forecast - tot.budget) / tot.budget) * 100) : 0}% variance`} />
        </div>
        <Card title={`Budget vs Actual vs Forecast by Workstream (${m.unitLabel})`}>
          <Table<FinRow> rows={rows} columns={[
            { key: 'workstream', header: 'Workstream', render: (r) => <span className="font-medium">{r.workstream}</span> },
            { key: 'budget', header: 'Approved Budget', className: 'text-right', render: (r) => cell(r.budget) },
            { key: 'actual', header: 'Actual Spend', className: 'text-right', render: (r) => cell(r.actual) },
            { key: 'consumed', header: '% Consumed', className: 'text-right', render: (r) => `${r.budget ? Math.round((r.actual / r.budget) * 100) : 0}%` },
            { key: 'forecast', header: 'Forecast at Completion', className: 'text-right', render: (r) => cell(r.forecast) },
            { key: 'variance', header: 'Variance (FAC − Budget)', className: 'text-right', render: (r) => <span className={varianceCls(r.budget ? (r.forecast - r.budget) / r.budget : 0)}>{m.signed(r.forecast - r.budget, d2)} ({r.budget ? Math.round(((r.forecast - r.budget) / r.budget) * 100) : 0}%)</span> },
            { key: 'health', header: 'Budget Health', render: (r) => <Badge value={!r.budget ? 'Pending' : r.forecast > r.budget * 1.1 ? 'Delayed' : r.forecast > r.budget ? 'At Risk' : 'On Track'} /> },
          ]} />
          <div className="grid grid-cols-[1fr_120px_120px_100px_160px_180px_120px] text-[13px] font-semibold px-3 py-2 border-t border-line mt-1">
            <span>Total</span><span className="text-right">{cell(tot.budget)}</span><span className="text-right">{cell(tot.actual)}</span><span className="text-right">{tot.budget ? Math.round((tot.actual / tot.budget) * 100) : 0}%</span><span className="text-right">{cell(tot.forecast)}</span><span className={`text-right ${varianceCls(tot.budget ? (tot.forecast - tot.budget) / tot.budget : 0)}`}>{m.signed(tot.forecast - tot.budget, d2)}</span><span />
          </div>
        </Card>
        <div className="grid grid-cols-[1.2fr_1fr] gap-4">
          <Card title={`Cash Forecast (cumulative, ${m.unitLabel})`} subtitle={cash.placeholder ? 'Placeholder – derived from program KPIs' : 'From monthly financials'} headerRight={<Legend items={[{ label: 'Plan', color: CHART_COLORS.blueFaint }, { label: 'Actual', color: CHART_COLORS.blue }, { label: 'Forecast', color: CHART_COLORS.teal, dashed: true }]} />}>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <AreaChart data={cashData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} formatter={(v) => fmtDisp(Number(v))} />
                  <Area type="monotone" dataKey="Plan" stroke={CHART_COLORS.blueFaint} fill={CHART_COLORS.blueFaint} fillOpacity={0.35} strokeWidth={2} />
                  <Area type="monotone" dataKey="Actual" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.15} strokeWidth={2.5} connectNulls={false} />
                  <Area type="monotone" dataKey="Forecast" stroke={CHART_COLORS.teal} fill="none" strokeDasharray="5 4" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Variance commentary" headerRight={<span className="text-[11.5px] text-ink-500">Updated {fmtDate(commentary.updatedOn)}</span>}>
            <TextArea className="no-print min-h-[160px]" value={text} onChange={(e) => setText(e.target.value)} onBlur={save} />
            <p className="hidden print:block text-[13px] whitespace-pre-wrap">{text}</p>
            <div className="flex justify-end mt-2 no-print"><button className="btn-secondary" onClick={save} disabled={text === commentary.text}>Save commentary</button></div>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ====================================================================== */
/* Hiring & Workforce Report                                               */
/* ====================================================================== */
interface FunnelStage { id: string; stage: string; candidates: number }
const seedFunnel: FunnelStage[] = [
  { id: 'fs-1', stage: 'Sourced', candidates: 1240 }, { id: 'fs-2', stage: 'Screened', candidates: 680 }, { id: 'fs-3', stage: 'Technical Interview', candidates: 320 },
  { id: 'fs-4', stage: 'HR Interview', candidates: 150 }, { id: 'fs-5', stage: 'Offer Extended', candidates: 90 }, { id: 'fs-6', stage: 'Joined', candidates: 68 },
]

/** Business unit of a record from the Resource Management page – tolerant of the field being renamed. */
const BU_KEYS = ['businessUnit', 'unit', 'practice', 'workstream', 'function']
const buOf = (r: AnyRec) => strOf(r, BU_KEYS) ?? 'Unassigned'
const OPEN_STATUSES = ['Open', 'In Interview', 'Offer', 'Offered', 'In Progress', 'Sourcing']
const isOpenPos = (r: AnyRec) => { const s = strOf(r, ['status']); return !s || OPEN_STATUSES.includes(s) }
const daysSince = (iso?: string) => (iso ? Math.max(0, Math.round((new Date(TODAY).getTime() - new Date(iso).getTime()) / 86400000)) : undefined)

function HiringReport({ k, commentaryC }: { k: ProgramKpis; commentaryC: ReturnType<typeof useCollection<ReportCommentary>> }) {
  const headcountPlan = useStore((s) => s.collections['headcountPlan']) as AnyRec[] | undefined
  const positionsAll = useStore((s) => s.collections['positions']) as AnyRec[] | undefined
  const busC = useCollection<BusinessUnit>('businessUnits', seedBusinessUnits)
  const { items: subUnits } = useCollection<SubUnit>('subUnits', seedSubUnits)
  const { items: actuals } = useCollection<HeadcountActual>('headcountActuals', seedHeadcountActuals)
  const businessUnits = useMemo(() => rollUpUnits(busC.items, subUnits).filter((b) => b.status !== 'Out of Scope'), [busC.items, subUnits])
  const funnelC = useCollection<FunnelStage>('hiringFunnel', seedFunnel)
  const commentary = commentaryC.items.find((c) => c.id === 'hiring') ?? seedReportCommentary.find((c) => c.id === 'hiring')!
  const [text, setText] = useState(commentary.text)
  const [editStage, setEditStage] = useState<FunnelStage | null>(null)

  const hc = useMemo(() => {
    if (headcountPlan && headcountPlan.length) {
      const list = headcountPlan.map((r, i) => ({ label: strOf(r, ['month', 'period', 'wave', 'name', ...BU_KEYS, 'label']) ?? `#${i + 1}`, Plan: numOf(r, ['plan', 'planned', 'planHeadcount', 'approved', 'target']) ?? 0, Actual: numOf(r, ['actual', 'onboarded', 'actualHeadcount', 'filled', 'hired']) as number | undefined }))
      if (list.some((r) => r.Plan || r.Actual)) return { data: list.slice(0, 12), synthetic: false }
    }
    const plan = programRamp(subUnits)
    return { data: RAMP_MONTHS.map((m, i) => ({ label: m, Plan: plan[i], Actual: actuals.find((a) => a.month === m)?.actual })), synthetic: true }
  }, [headcountPlan, subUnits, actuals])
  // Ramp month of the reporting date = the last month with an actual; plan "to date" reads that month of every capability ramp.
  const toDateIdx = useMemo(() => Math.max(0, ...actuals.map((a) => RAMP_MONTHS.indexOf(a.month as (typeof RAMP_MONTHS)[number]))), [actuals])
  type PlanRow = { id: string; label: string; kind: 'unit' | 'sub'; gbu: string; loc: string; role: string; wave: string; current: number; toDate: number; target: number; y5: number }
  const planRows = useMemo<PlanRow[]>(() => businessUnits.flatMap((b) => {
    const mine = subUnitsOf(subUnits, b.id)
    const gbus = Array.from(new Set(mine.map((s) => s.gbuServed)))
    const unit: PlanRow = { id: b.id, label: b.name, kind: 'unit', gbu: gbus.length === 1 ? gbus[0] : 'Multiple GBUs', loc: Array.from(new Set(mine.map((s) => s.deliveryLocation))).join(', '), role: '', wave: b.wave, current: mine.reduce((t, s) => t + s.currentHc, 0), toDate: unitRamp(subUnits, b.id)[toDateIdx] ?? 0, target: b.y1, y5: b.y5 }
    return [unit, ...mine.map((s): PlanRow => ({ id: s.id, label: s.name, kind: 'sub', gbu: s.gbuServed, loc: s.deliveryLocation, role: s.roleSkill, wave: s.wave, current: s.currentHc, toDate: s.ramp[toDateIdx] ?? 0, target: subY1(s), y5: s.y5 }))]
  }), [businessUnits, subUnits, toDateIdx])
  const planTotals = useMemo(() => planRows.filter((r) => r.kind === 'unit').reduce((t, r) => ({ current: t.current + r.current, toDate: t.toDate + r.toDate, target: t.target + r.target, y5: t.y5 + r.y5 }), { current: 0, toDate: 0, target: 0, y5: 0 }), [planRows])
  const byUnitChart = useMemo(() => planRows.filter((r) => r.kind === 'unit').map((r) => ({ name: buShortName(r.label), 'Plan to date': r.toDate, 'Target (Year 1)': r.target })), [planRows])

  // open positions from Resource Management, grouped by business unit (field may be 'businessUnit' or the older 'workstream')
  const positions = useMemo(() => (positionsAll ?? []).filter(isOpenPos), [positionsAll])
  const posByBu = useMemo(() => {
    const map = new Map<string, { id: string; bu: string; open: number; critical: number; oldest: number }>()
    for (const p of positions) {
      const bu = buOf(p)
      const cur = map.get(bu) ?? { id: bu, bu, open: 0, critical: 0, oldest: 0 }
      cur.open += numOf(p, ['openings', 'count', 'headcount']) ?? 1
      if (['Critical', 'High'].includes(strOf(p, ['priority']) ?? '')) cur.critical += 1
      cur.oldest = Math.max(cur.oldest, daysSince(strOf(p, ['openedOn', 'openedDate', 'createdOn'])) ?? 0)
      map.set(bu, cur)
    }
    return [...map.values()].sort((a, b) => b.open - a.open)
  }, [positions])
  const posCols = useMemo(() => {
    if (!positions.length) return []
    const sample = positions[0]
    const hasRole = typeof sample.role === 'string' || typeof sample.title === 'string'
    if (hasRole) {
      const cols = [
        { key: 'role', header: 'Role', render: (r: AnyRec) => <span className="font-medium">{strOf(r, ['role', 'title', 'name']) ?? '—'}</span> },
        { key: 'bu', header: 'Business unit', render: (r: AnyRec) => buOf(r) },
        { key: 'location', header: 'Location', render: (r: AnyRec) => strOf(r, ['location', 'city']) ?? '—' },
        { key: 'priority', header: 'Priority', render: (r: AnyRec) => { const v = strOf(r, ['priority']); return v ? <Badge value={v} /> : '—' } },
        { key: 'status', header: 'Status', render: (r: AnyRec) => { const v = strOf(r, ['status']); return v ? <Badge value={v} /> : '—' } },
        { key: 'days', header: 'Days open', className: 'text-right', render: (r: AnyRec) => { const d = daysSince(strOf(r, ['openedOn', 'openedDate', 'createdOn'])); return d === undefined ? '—' : String(d) } },
      ]
      return cols
    }
    const keys = Object.keys(sample).filter((key) => key !== 'id' && ['string', 'number'].includes(typeof sample[key])).slice(0, 7)
    return keys.map((key) => ({ key, header: BU_KEYS.includes(key) ? 'Business unit' : key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), className: undefined as string | undefined, render: (r: AnyRec) => { const v = r[key]; return typeof v === 'string' && ['Open', 'In Progress', 'Closed', 'On Track', 'At Risk', 'Delayed', 'Filled', 'Offered', 'Offer', 'In Interview', 'Critical', 'High', 'Medium', 'Low'].includes(v) ? <Badge value={v} /> : String(v ?? '') } }))
  }, [positions])
  // placeholder rows when the Resource Management page has not captured positions yet – named by business unit
  const placeholderPositions = useMemo(() => {
    const bu = (id: string, fallback: string) => businessUnits.find((b) => b.id === id)?.name ?? fallback
    return [
      { id: 'op-1', stage: `SAP Functional / Technical (${bu('bu-apps', 'Enterprise Applications')}) – 11 open, 52 days`, candidates: 11 }, { id: 'op-2', stage: `Data Engineers (${bu('bu-data', 'Data, Analytics & AI')}) – 6 open, 47 days`, candidates: 6 },
      { id: 'op-3', stage: `IAM Specialists (${bu('bu-cyber', 'Cybersecurity & IAM')}) – 2 open, 21 days`, candidates: 2 }, { id: 'op-4', stage: `Cloud Engineers (${bu('bu-infra', 'Infrastructure & Cloud')}) – 4 open, 14 days`, candidates: 4 },
      { id: 'op-5', stage: `Service Desk Analysts (${bu('bu-dwp', 'Digital Workplace')}) – 7 open, 9 days`, candidates: 7 }, { id: 'op-6', stage: `Service Managers (${bu('bu-itsm', 'IT Service Management')}) – 5 open, 12 days`, candidates: 5 },
    ]
  }, [businessUnits])

  const gap = k.talentTarget - k.talentOnboarded
  const funnel = funnelC.items
  const max = Math.max(...funnel.map((f) => f.candidates), 1)
  const save = () => commentaryC.update({ ...commentary, text, updatedOn: TODAY })

  return (
    <div className="space-y-4">
      <style>{PRINT_CSS}</style>
      <div className="flex items-center justify-between no-print">
        <p className="text-[12.5px] text-ink-500">{hc.synthetic ? `Year-1 month-wise plan (${RAMP_MONTHS[0]} – ${RAMP_MONTHS[RAMP_MONTHS.length - 1]}) from the organisation structure in GCC Setup vs actual Pune headcount; the Resource Management headcount plan takes over once captured.` : 'Headcount plan from Resource Management.'}</p>
        <button className="btn-secondary" onClick={() => window.print()}><Printer size={14} /> Print / Save as PDF</button>
      </div>
      <div id="print-area" className="space-y-4">
        <div className="grid grid-cols-5 gap-4">
          <KpiTile tone="navy" icon={<Users size={20} />} value={k.talentTarget} label="Approved Headcount" />
          <KpiTile tone="green" icon={<CheckCircle2 size={20} />} value={k.talentOnboarded} label="Onboarded" sub={`${Math.round((k.talentOnboarded / k.talentTarget) * 100)}% of target`} />
          <KpiTile tone="amber" icon={<AlertTriangle size={20} />} value={gap} label="Hiring Gap" sub={`${k.talentDeltaVsPlan >= 0 ? '+' : ''}${k.talentDeltaVsPlan}% vs plan to date`} />
          <KpiTile tone="blue" icon={<FileText size={20} />} value={positions.length || (funnel.find((f) => f.stage === 'Offer Extended')?.candidates ?? 0)} label={positions.length ? 'Open Positions' : 'Offers Extended'} sub={positions.length ? `across ${posByBu.length} business unit${posByBu.length === 1 ? '' : 's'}` : undefined} />
          <KpiTile tone="teal" icon={<Send size={20} />} value={`${Math.round(((funnel.find((f) => f.stage === 'Joined')?.candidates ?? 0) / Math.max(1, funnel.find((f) => f.stage === 'Offer Extended')?.candidates ?? 1)) * 100)}%`} label="Offer Acceptance Rate" />
        </div>
        <div className="grid grid-cols-[1.3fr_1fr] gap-4">
          <Card title="Headcount plan vs actual" headerRight={<Legend items={[{ label: 'Plan', color: CHART_COLORS.blueFaint }, { label: 'Actual', color: CHART_COLORS.blue }]} />}>
            <div className="h-[230px]">
              <ResponsiveContainer>
                <BarChart data={hc.data} margin={{ top: 14, right: 4, left: -22, bottom: 0 }} barGap={1} barCategoryGap="28%">
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                  <Bar dataKey="Plan" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} isAnimationActive={false}><LabelList dataKey="Actual" position="top" style={{ fontSize: 9.5, fill: '#374151' }} /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Hiring funnel (current wave)" subtitle="Click a stage to edit">
            <div className="space-y-2">
              {funnel.map((f, i) => (
                <button key={f.id} className="w-full flex items-center gap-2 text-[12.5px] cursor-pointer hover:bg-surface rounded-md px-1 py-0.5" onClick={() => setEditStage(f)}>
                  <span className="w-[82px] text-left text-ink-700">{f.stage}</span>
                  <div className="flex-1 h-5 rounded bg-slate-100 overflow-hidden"><div className="h-full rounded" style={{ width: `${(f.candidates / max) * 100}%`, background: [CHART_COLORS.blueFaint, CHART_COLORS.blueLight, CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.green, CHART_COLORS.navy][i % 6] }} /></div>
                  <span className="w-12 text-right font-semibold">{f.candidates}</span>
                  <span className="w-11 text-right text-[11px] text-ink-500">{i === 0 ? '' : `${Math.round((f.candidates / funnel[i - 1].candidates) * 100)}%`}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
        <Card title="Headcount plan by business unit and capability" subtitle={`Current HC at source, plan to date (${RAMP_MONTHS[toDateIdx]}), target Pune HC at the end of year 1 and the Year 5 exit – from the organisation structure in GCC Setup`}>
            <Table<PlanRow> compact rows={planRows} columns={[
              { key: 'label', header: 'Business unit / capability', render: (r) => r.kind === 'unit' ? <span className="font-semibold text-ink-900">{r.label}</span> : <span className="pl-4 text-ink-700">{r.label}</span> },
              { key: 'gbu', header: 'GBU served', className: 'whitespace-nowrap', render: (r) => <span className={r.kind === 'unit' ? 'text-ink-500' : ''}>{r.gbu}</span> },
              { key: 'loc', header: 'Current delivery location', className: 'whitespace-nowrap', render: (r) => <span className={r.kind === 'unit' ? 'text-ink-500' : ''}>{r.loc}</span> },
              { key: 'role', header: 'Role / skill', render: (r) => r.role || <span className="text-ink-400">—</span> },
              { key: 'wave', header: 'Wave', className: 'whitespace-nowrap' },
              { key: 'current', header: 'Current HC', className: 'text-right', render: (r) => <span className={r.kind === 'unit' ? 'font-semibold' : ''}>{r.current}</span> },
              { key: 'toDate', header: 'Plan to date', className: 'text-right', render: (r) => <span className={r.kind === 'unit' ? 'font-semibold' : ''}>{r.toDate}</span> },
              { key: 'target', header: 'Target Pune HC', className: 'text-right', render: (r) => <span className={r.kind === 'unit' ? 'font-semibold text-brand-600' : ''}>{r.target}</span> },
              { key: 'y5', header: 'Year 5', className: 'text-right', render: (r) => <span className={r.kind === 'unit' ? 'font-semibold' : 'text-ink-500'}>{r.y5}</span> },
            ]} />
            <div className="mt-2 pt-2 border-t border-line text-[12px] text-ink-700 flex flex-wrap gap-x-4 gap-y-1"><span className="font-semibold text-ink-900">Total ({businessUnits.length} business units, {subUnits.length} capabilities)</span><span>Current HC <b>{planTotals.current}</b></span><span>Plan to date <b>{planTotals.toDate}</b> · actual <b>{k.talentOnboarded}</b></span><span>Target Pune HC <b className="text-brand-600">{planTotals.target}</b></span><span>Year 5 <b>{planTotals.y5}</b></span></div>
        </Card>
        <div className="grid grid-cols-[1fr_1.3fr] gap-4">
          <Card title="Plan to date vs target by business unit" subtitle="Cumulative Pune headcount at the reporting month against the end-of-year-1 target" headerRight={<Legend items={[{ label: 'Plan to date', color: CHART_COLORS.blueFaint }, { label: 'Target (Year 1)', color: CHART_COLORS.blue }]} />}>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <BarChart data={byUnitChart} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }} barCategoryGap="22%" barGap={2}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={84} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                  <Bar dataKey="Plan to date" fill={CHART_COLORS.blueFaint} radius={[0, 3, 3, 0]} isAnimationActive={false} />
                  <Bar dataKey="Target (Year 1)" fill={CHART_COLORS.blue} radius={[0, 3, 3, 0]} isAnimationActive={false}><LabelList dataKey="Target (Year 1)" position="right" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Open positions by business unit" subtitle={positions.length ? `${positions.length} open positions from Resource Management` : 'Illustrative – no open positions captured yet on the Resource Management page'}>
            {positions.length ? (
              <div className="space-y-3">
                <Table<{ id: string; bu: string; open: number; critical: number; oldest: number }> compact rows={posByBu} columns={[
                  { key: 'bu', header: 'Business unit', render: (r) => <span className="font-medium">{r.bu}</span> },
                  { key: 'open', header: 'Open', className: 'text-right' },
                  { key: 'critical', header: 'Critical / High', className: 'text-right' },
                  { key: 'oldest', header: 'Longest open (days)', className: 'text-right', render: (r) => (r.oldest ? String(r.oldest) : '—') },
                ]} />
                <SectionTitle>Open positions ({Math.min(10, positions.length)} of {positions.length})</SectionTitle>
                <Table<AnyRec> compact rows={positions.slice(0, 10)} columns={posCols} />
              </div>
            ) : (
              <Table<FunnelStage> compact rows={placeholderPositions} columns={[{ key: 'stage', header: 'Role (business unit) – open, days open' }, { key: 'candidates', header: 'Open', className: 'text-right' }]} />
            )}
          </Card>
        </div>
        <Card title="Commentary" headerRight={<span className="text-[11.5px] text-ink-500">Updated {fmtDate(commentary.updatedOn)}</span>}>
          <TextArea className="no-print min-h-[110px]" value={text} onChange={(e) => setText(e.target.value)} onBlur={save} />
          <p className="hidden print:block text-[13px] whitespace-pre-wrap">{text}</p>
          <div className="flex justify-end mt-2 no-print"><button className="btn-secondary" onClick={save} disabled={text === commentary.text}>Save commentary</button></div>
        </Card>
      </div>
      {editStage && (
        <Modal open onClose={() => setEditStage(null)} title={`Edit funnel stage – ${editStage.stage}`} width="max-w-md" footer={<><button className="btn-secondary" onClick={() => setEditStage(null)}>Cancel</button><button className="btn-primary" onClick={() => { funnelC.update(editStage); setEditStage(null) }}>Save</button></>}>
          <FormGrid cols={2}>
            <Field label="Stage"><Input value={editStage.stage} onChange={(e) => setEditStage({ ...editStage, stage: e.target.value })} /></Field>
            <Field label="Candidates"><Input type="number" value={editStage.candidates} onChange={(e) => setEditStage({ ...editStage, candidates: +e.target.value || 0 })} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

/* ====================================================================== */
/* Schedules & Distribution                                                */
/* ====================================================================== */
function Schedules({ schedulesC, recipientsC }: { schedulesC: ReturnType<typeof useCollection<ReportSchedule>>; recipientsC: ReturnType<typeof useCollection<Recipient>> }) {
  const [edit, setEdit] = useState<ReportSchedule | null>(null)
  const [addRec, setAddRec] = useState<Recipient | null>(null)
  const blank = (): ReportSchedule => ({ id: '', report: 'Weekly Program Update', cadence: 'Weekly', dayTime: 'Monday 08:00', recipients: ['PMO'], channel: 'Email', active: true, lastRun: '—', nextRun: '2026-10-26 08:00' })
  const groupCounts = RECIPIENT_GROUPS.map((g) => ({ g, n: recipientsC.items.filter((r) => r.groups.includes(g)).length }))

  return (
    <div className="space-y-4">
      <Card title="Report Schedules" subtitle="Automated generation and distribution" action={<button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={14} /> Add schedule</button>}>
        <Table<ReportSchedule> rows={schedulesC.items} onRowClick={setEdit} columns={[
          { key: 'report', header: 'Report', render: (r) => <span className="font-medium">{r.report}</span> },
          { key: 'cadence', header: 'Cadence' },
          { key: 'dayTime', header: 'Day / time' },
          { key: 'recipients', header: 'Recipients', render: (r) => <span className="flex flex-wrap gap-1">{r.recipients.map((g) => <span key={g} className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] text-ink-700">{g}</span>)}</span> },
          { key: 'channel', header: 'Channel' },
          { key: 'lastRun', header: 'Last run' },
          { key: 'nextRun', header: 'Next run' },
          { key: 'active', header: 'Active', render: (r) => <button className={`inline-flex items-center gap-1 text-[12px] font-medium cursor-pointer ${r.active ? 'text-green-600' : 'text-ink-400'}`} onClick={(e) => { e.stopPropagation(); schedulesC.update({ ...r, active: !r.active }) }}><Power size={13} />{r.active ? 'On' : 'Off'}</button> },
          { key: 'edit', header: '', render: () => <Pencil size={13} className="text-ink-400" /> },
        ]} />
      </Card>
      <div className="grid grid-cols-[1fr_320px] gap-4">
        <Card title="Distribution List" subtitle="Recipients and their distribution groups" action={<button className="btn-primary" onClick={() => setAddRec({ id: '', name: '', role: '', handle: '', groups: [] })}><Plus size={14} /> Add recipient</button>}>
          <Table<Recipient> compact rows={recipientsC.items} onRowClick={setAddRec} columns={[
            { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'role', header: 'Role' },
            { key: 'handle', header: 'Email handle', render: (r) => <span className="font-mono text-[12px] text-ink-700">{r.handle}</span> },
            { key: 'groups', header: 'Groups', render: (r) => <span className="flex flex-wrap gap-1">{r.groups.map((g) => <span key={g} className="rounded-md bg-brand-50 text-brand-600 px-1.5 py-0.5 text-[11px]">{g}</span>)}</span> },
          ]} />
        </Card>
        <Card title="Distribution groups">
          <div className="space-y-2">
            {groupCounts.map(({ g, n }) => (
              <div key={g} className="flex items-center gap-2 text-[12.5px]"><span className="w-[150px] truncate text-ink-700">{g}</span><Progress value={(n / Math.max(1, recipientsC.items.length)) * 100} className="flex-1" color={CHART_COLORS.blueLight} /><span className="w-6 text-right font-medium">{n}</span></div>
            ))}
          </div>
        </Card>
      </div>

      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Edit schedule' : 'Add schedule'} footer={<>
          {edit.id && <ConfirmDelete onConfirm={() => { schedulesC.remove(edit.id); setEdit(null) }} />}<span className="flex-1" />
          <button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn-primary" onClick={() => { edit.id ? schedulesC.update(edit) : schedulesC.add({ ...edit, id: uid('rs') }); setEdit(null) }}>Save</button></>}>
          <FormGrid cols={2}>
            <Field label="Report" className="col-span-2"><Input value={edit.report} onChange={(e) => setEdit({ ...edit, report: e.target.value })} /></Field>
            <Field label="Cadence"><Select options={CADENCES} value={edit.cadence} onChange={(e) => setEdit({ ...edit, cadence: e.target.value as ReportSchedule['cadence'] })} /></Field>
            <Field label="Day / time"><Input value={edit.dayTime} onChange={(e) => setEdit({ ...edit, dayTime: e.target.value })} /></Field>
            <Field label="Channel"><Select options={CHANNELS} value={edit.channel} onChange={(e) => setEdit({ ...edit, channel: e.target.value as ReportSchedule['channel'] })} /></Field>
            <Field label="Next run"><Input value={edit.nextRun} onChange={(e) => setEdit({ ...edit, nextRun: e.target.value })} /></Field>
            <Field label="Recipient groups" className="col-span-2">
              <div className="grid grid-cols-2 gap-1.5">
                {RECIPIENT_GROUPS.map((g) => (
                  <label key={g} className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={edit.recipients.includes(g)} onChange={(e) => setEdit({ ...edit, recipients: e.target.checked ? [...edit.recipients, g] : edit.recipients.filter((x) => x !== g) })} />{g}</label>
                ))}
              </div>
            </Field>
            <Field label="Active"><label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Schedule is active</label></Field>
          </FormGrid>
        </Modal>
      )}
      {addRec && (
        <Modal open onClose={() => setAddRec(null)} title={addRec.id ? 'Edit recipient' : 'Add recipient'} footer={<>
          {addRec.id && <ConfirmDelete onConfirm={() => { recipientsC.remove(addRec.id); setAddRec(null) }} />}<span className="flex-1" />
          <button className="btn-secondary" onClick={() => setAddRec(null)}>Cancel</button>
          <button className="btn-primary" disabled={!addRec.name || !addRec.handle} onClick={() => { addRec.id ? recipientsC.update(addRec) : recipientsC.add({ ...addRec, id: uid('rc') }); setAddRec(null) }}>Save</button></>}>
          <FormGrid cols={2}>
            <Field label="Name"><Input value={addRec.name} onChange={(e) => setAddRec({ ...addRec, name: e.target.value, handle: addRec.id ? addRec.handle : e.target.value.trim().toLowerCase().replace(/^(\w)\w*\s+/, '$1.').replace(/[^a-z.]/g, '') })} /></Field>
            <Field label="Role"><Input value={addRec.role} onChange={(e) => setAddRec({ ...addRec, role: e.target.value })} /></Field>
            <Field label="Email handle (without domain)"><Input value={addRec.handle} onChange={(e) => setAddRec({ ...addRec, handle: e.target.value })} /></Field>
            <Field label="Groups" className="col-span-2">
              <div className="grid grid-cols-2 gap-1.5">
                {RECIPIENT_GROUPS.map((g) => (
                  <label key={g} className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={addRec.groups.includes(g)} onChange={(e) => setAddRec({ ...addRec, groups: e.target.checked ? [...addRec.groups, g] : addRec.groups.filter((x) => x !== g) })} />{g}</label>
                ))}
              </div>
            </Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}
