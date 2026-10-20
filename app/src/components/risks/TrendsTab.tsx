import { useState, useEffect, type ReactNode } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { AlertTriangle, Link2, Clock, AlertOctagon, Users, FileText, TrendingUp, Plus, Pencil } from 'lucide-react'
import { Card, Legend, Modal, Field, Input, TextArea, Select, FormGrid, ConfirmDelete, Table, Chevron } from '../ui'
import { tooltipStyle } from '../charts'
import { CHART_COLORS } from '../../data/common'
import { uid } from '../../store/useStore'
import { INSIGHT_ICONS, type RaidTrendPoint, type RiskInsight, type InsightIcon } from '../../data/risks'

/* ---------- Trend line chart (shared by Overview + Trends tab) ---------- */
export function TrendChart({ data, height = 150 }: { data: RaidTrendPoint[]; height?: number }) {
  const last = data.length - 1
  const endLabel = (color: string) => (p: { x?: number | string; y?: number | string; value?: number | string; index?: number }) =>
    p.index === last ? <text x={Number(p.x) + 8} y={Number(p.y) - 4} fill={color} fontSize={12} fontWeight={700}>{p.value}</text> : null
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 28, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} domain={[0, (max: number) => Math.ceil((max + 5) / 10) * 10]} />
          <Tooltip {...tooltipStyle} />
          <Line type="monotone" dataKey="openRisks" name="Open Risks" stroke={CHART_COLORS.red} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.red, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false}>
            <LabelList dataKey="openRisks" content={endLabel(CHART_COLORS.red) as never} />
          </Line>
          <Line type="monotone" dataKey="openIssues" name="Open Issues" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.blue, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false}>
            <LabelList dataKey="openIssues" content={endLabel(CHART_COLORS.blue) as never} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
export const TREND_LEGEND = [{ label: 'Open Risks', color: CHART_COLORS.red }, { label: 'Open Issues', color: CHART_COLORS.blue }]

/* ---------- Insight list (Key Insights / Recommended Actions) ---------- */
const ICON: Record<InsightIcon, ReactNode> = {
  alert: <AlertTriangle size={17} className="text-red-500" />, link: <Link2 size={17} className="text-amber-500" />, clock: <Clock size={17} className="text-brand-600" />,
  escalate: <AlertOctagon size={17} className="text-red-500" />, users: <Users size={17} className="text-amber-500" />, file: <FileText size={17} className="text-brand-600" />, trend: <TrendingUp size={17} className="text-green-600" />,
}
const ICON_BG: Record<InsightIcon, string> = { alert: 'bg-red-50', link: 'bg-amber-50', clock: 'bg-blue-50', escalate: 'bg-red-50', users: 'bg-amber-50', file: 'bg-blue-50', trend: 'bg-green-50' }

export function InsightList({ items, onEdit, onLink }: { items: RiskInsight[]; onEdit: (i: RiskInsight) => void; onLink?: (code: string) => void }) {
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-[12.5px] text-ink-500 italic">Nothing recorded yet.</p>}
      {items.map((i) => (
        <div key={i.id} className="flex items-center gap-2.5 rounded-lg border border-line px-2.5 py-2 bg-white hover:bg-brand-50/40 cursor-pointer" onClick={() => onEdit(i)}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${ICON_BG[i.icon]}`}>{ICON[i.icon]}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold text-ink-900 leading-snug">{i.title}</div>
            <div className="text-[11.5px] text-ink-500 leading-snug">{i.detail}{i.linkedCode && onLink && <> · <button className="link text-[11px]" onClick={(e) => { e.stopPropagation(); onLink(i.linkedCode!) }}>{i.linkedCode}</button></>}</div>
          </div>
          <Chevron />
        </div>
      ))}
    </div>
  )
}

export function InsightModal({ open, onClose, value, onSave, onDelete }: { open: boolean; onClose: () => void; value: RiskInsight | null; onSave: (v: RiskInsight) => void; onDelete: (id: string) => void }) {
  const blank: RiskInsight = { id: '', kind: 'Insight', title: '', detail: '', icon: 'alert', order: 99 }
  const [f, setF] = useState<RiskInsight>(value ?? blank)
  useEffect(() => { if (open) setF(value ?? blank) }, [open, value]) // eslint-disable-line react-hooks/exhaustive-deps
  const isEdit = !!f.id
  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit ${f.kind === 'Insight' ? 'insight' : 'recommended action'}` : 'Add insight / recommended action'}
      footer={<>{isEdit && <ConfirmDelete onConfirm={() => onDelete(f.id)} />}<span className="flex-1" /><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { if (!f.title.trim()) return; onSave({ ...f, id: f.id || uid('ins') }) }}>Save</button></>}>
      <FormGrid cols={3}>
        <Field label="Type"><Select options={['Insight', 'Action']} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as RiskInsight['kind'] })} /></Field>
        <Field label="Icon"><Select options={INSIGHT_ICONS} value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value as InsightIcon })} /></Field>
        <Field label="Linked risk / issue ID"><Input value={f.linkedCode ?? ''} onChange={(e) => setF({ ...f, linkedCode: e.target.value || undefined })} placeholder="R-001" /></Field>
        <Field label="Headline" className="col-span-3"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Detail" className="col-span-3"><TextArea value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} /></Field>
        <Field label="Order"><Input type="number" value={f.order} onChange={(e) => setF({ ...f, order: parseInt(e.target.value) || 0 })} /></Field>
      </FormGrid>
    </Modal>
  )
}

/* ---------- Trends & Insights tab ---------- */
export function TrendsTab({ trend, onSaveTrend, insights, onEditInsight, onAddInsight, onLink, liveRisks, liveIssues }: {
  trend: RaidTrendPoint[]; onSaveTrend: (p: RaidTrendPoint) => void; insights: RiskInsight[]; onEditInsight: (i: RiskInsight) => void; onAddInsight: (kind: 'Insight' | 'Action') => void; onLink: (code: string) => void; liveRisks: number; liveIssues: number
}) {
  const [editPt, setEditPt] = useState<RaidTrendPoint | null>(null)
  const ins = insights.filter((i) => i.kind === 'Insight').sort((a, b) => a.order - b.order)
  const acts = insights.filter((i) => i.kind === 'Action').sort((a, b) => a.order - b.order)
  const first = trend[0], last = trend[trend.length - 1]
  const netRisk = first && last ? last.openRisks - first.openRisks : 0
  const netIssue = first && last ? last.openIssues - first.openIssues : 0
  const totals = trend.reduce((o, p) => ({ newR: o.newR + p.newRisks, clR: o.clR + p.closedRisks, newI: o.newI + p.newIssues, clI: o.clI + p.closedIssues }), { newR: 0, clR: 0, newI: 0, clI: 0 })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          ['Open Risks (YTD change)', `${netRisk > 0 ? '+' : ''}${netRisk}`, `${first?.openRisks ?? 0} → ${last?.openRisks ?? 0}`, netRisk <= 0 ? 'text-green-600' : 'text-red-600'],
          ['Open Issues (YTD change)', `${netIssue > 0 ? '+' : ''}${netIssue}`, `${first?.openIssues ?? 0} → ${last?.openIssues ?? 0}`, netIssue <= 0 ? 'text-green-600' : 'text-red-600'],
          ['Risks raised / closed (YTD)', `${totals.newR} / ${totals.clR}`, 'new vs closed', 'text-ink-900'],
          ['Issues raised / closed (YTD)', `${totals.newI} / ${totals.clI}`, 'new vs closed', 'text-ink-900'],
        ].map(([l, v, s, c]) => (
          <div key={l} className="card px-4 py-3"><div className="text-[12px] text-ink-500">{l}</div><div className={`text-[22px] font-bold ${c}`}>{v}</div><div className="text-[11.5px] text-ink-500">{s}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-[1.3fr_1fr] gap-4">
        <Card title="Risk and Issue Trend" subtitle={`Monthly open count · latest month reflects the live register (${liveRisks} risks, ${liveIssues} issues)`} headerRight={<Legend items={TREND_LEGEND} />}>
          <TrendChart data={trend} height={260} />
        </Card>
        <Card title="New vs Closed per Month" subtitle="Risks and issues raised and closed">
          <div className="flex justify-end -mt-1 mb-1"><Legend items={[{ label: 'New risks', color: CHART_COLORS.red }, { label: 'Closed risks', color: '#FCA5A5' }, { label: 'New issues', color: CHART_COLORS.blue }, { label: 'Closed issues', color: CHART_COLORS.blueFaint }]} /></div>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <BarChart data={trend} margin={{ top: 12, right: 4, left: -22, bottom: 0 }} barGap={1} barCategoryGap="22%">
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="newRisks" name="New risks" fill={CHART_COLORS.red} radius={[2, 2, 0, 0]} isAnimationActive={false}><LabelList dataKey="newRisks" position="top" style={{ fontSize: 9.5, fill: '#6B7280' }} /></Bar>
                <Bar dataKey="closedRisks" name="Closed risks" fill="#FCA5A5" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="newIssues" name="New issues" fill={CHART_COLORS.blue} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="closedIssues" name="Closed issues" fill={CHART_COLORS.blueFaint} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1.1fr] gap-4">
        <Card title={<span className="inline-flex items-center gap-1.5"><span className="text-violet-500">✦</span> Key Insights</span>} action={<button className="link inline-flex items-center gap-1" onClick={() => onAddInsight('Insight')}><Plus size={12} /> Add insight</button>}>
          <InsightList items={ins} onEdit={onEditInsight} onLink={onLink} />
        </Card>
        <Card title={<span className="inline-flex items-center gap-1.5"><span className="text-violet-500">✦</span> Recommended Actions</span>} action={<button className="link inline-flex items-center gap-1" onClick={() => onAddInsight('Action')}><Plus size={12} /> Add action</button>}>
          <InsightList items={acts} onEdit={onEditInsight} onLink={onLink} />
        </Card>
        <Card title="Monthly Trend Data" subtitle="Click a month to edit the recorded counts">
          <div className="max-h-[330px] overflow-y-auto scroll-thin">
            <Table<RaidTrendPoint> compact rows={trend} onRowClick={setEditPt} columns={[
              { key: 'month', header: 'Month', className: 'font-medium' },
              { key: 'openRisks', header: 'Open risks' }, { key: 'openIssues', header: 'Open issues' },
              { key: 'newRisks', header: 'New R' }, { key: 'closedRisks', header: 'Closed R' }, { key: 'newIssues', header: 'New I' }, { key: 'closedIssues', header: 'Closed I' },
              { key: 'e', header: '', render: () => <Pencil size={12} className="text-ink-400" /> },
            ]} />
          </div>
        </Card>
      </div>
      <TrendPointModal value={editPt} onClose={() => setEditPt(null)} onSave={(p) => { onSaveTrend(p); setEditPt(null) }} />
    </div>
  )
}

function TrendPointModal({ value, onClose, onSave }: { value: RaidTrendPoint | null; onClose: () => void; onSave: (p: RaidTrendPoint) => void }) {
  const [f, setF] = useState<RaidTrendPoint | null>(value)
  useEffect(() => setF(value), [value])
  if (!f) return null
  const num = (k: keyof RaidTrendPoint, label: string) => (
    <Field label={label}><Input type="number" min={0} value={f[k] as number} onChange={(e) => setF({ ...f, [k]: Math.max(0, parseInt(e.target.value) || 0) })} /></Field>
  )
  return (
    <Modal open={!!value} onClose={onClose} title={`Edit trend – ${f.month}`} width="max-w-lg" footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave(f)}>Save</button></>}>
      <FormGrid cols={2}>
        {num('openRisks', 'Open risks (month end)')}{num('openIssues', 'Open issues (month end)')}
        {num('newRisks', 'New risks raised')}{num('closedRisks', 'Risks closed')}
        {num('newIssues', 'New issues raised')}{num('closedIssues', 'Issues resolved')}
      </FormGrid>
    </Modal>
  )
}
