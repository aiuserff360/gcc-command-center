import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend as RLegend } from 'recharts'
import { CheckCircle2, BarChart3, Users, Database, AlertTriangle, AlertCircle, Info, TrendingUp, Pencil, Cpu, Scale, Building2, ArrowLeftRight, Settings2, Wallet } from 'lucide-react'
import { Card, KpiTile, Badge, Progress, Table, ViewAll, Chevron, Legend } from '../components/ui'
import { ProgramKpiEditor } from '../components/ProgramKpiEditor'
import { Donut, tooltipStyle } from '../components/charts'
import { useCollection, useStore } from '../store/useStore'
import { useMoney } from '../data/money'
import { seedMilestones, seedRaid, seedProgramKpis, seedWorkstreamSummaries, isOpen, type Milestone, type RaidItem, type ProgramKpis, type WorkstreamSummary } from '../data/shared'
import { fmtDate, CHART_COLORS, MONTHS, programDef } from '../data/common'

const WS_ICON: Record<string, React.ReactNode> = {
  'Talent & Hiring': <Users size={15} />, 'Technology & Infrastructure': <Cpu size={15} />, 'Legal & Compliance': <Scale size={15} />,
  'Facilities & Workplace': <Building2 size={15} />, 'Transition Readiness': <ArrowLeftRight size={15} />, 'Operations Setup': <Settings2 size={15} />, 'Finance & Procurement': <Wallet size={15} />,
}
const WS_SHORT: Record<string, string> = {
  'Talent & Hiring': 'Talent', 'Technology & Infrastructure': 'Technology', 'Legal & Compliance': 'Compliance', 'Facilities & Workplace': 'Facilities',
  'Transition Readiness': 'Transition', 'Operations Setup': 'Operations', 'Finance & Procurement': 'Finance',
}
const OWNER_ROLE: Record<string, string> = { 'R. Mehta': 'IT Lead', 'S. Iyer': 'Talent Lead', 'A. Sharma': 'Transition Lead', 'V. Reddy': 'Procurement', 'P. Rao': 'Legal Lead', 'K. Nair': 'Facilities Lead', 'M. Khan': 'Operations Lead', 'D. Singh': 'Operations' }

const rampFor = (scale: number) => MONTHS.map((m, i) => ({ month: m, Plan: Math.round([80, 110, 150, 180, 210, 250, 290, 320, 350, 390, 420, 450][i] * scale), Actual: Math.round([60, 95, 135, 170, 200, 240, 280, 330, 370, 400, 430, 450][i] * scale) }))

export default function Dashboard() {
  const nav = useNavigate()
  const program = useStore((s) => s.program)
  const m = useMoney()
  const kpisC = useCollection<ProgramKpis>('programKpis', seedProgramKpis)
  const k = kpisC.items[0] ?? seedProgramKpis[0]
  const { items: milestones } = useCollection<Milestone>('milestones', seedMilestones)
  const { items: raid } = useCollection<RaidItem>('raid', seedRaid)
  const { items: wss } = useCollection<WorkstreamSummary>('workstreamSummaries', seedWorkstreamSummaries)
  const [edit, setEdit] = useState(false)

  const msCounts = useMemo(() => {
    const c = (s: string[]) => milestones.filter((m) => s.includes(m.status)).length
    return { onTrack: c(['On Track', 'Completed']), atRisk: c(['At Risk']), delayed: c(['Delayed']), notStarted: c(['Not Started', 'Pending']), total: milestones.length }
  }, [milestones])
  const upcoming = useMemo(() => {
    const open = milestones.filter((m) => m.status !== 'Completed' && m.dueDate >= '2026-10-20').sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return [...open.filter((m) => m.critical), ...open.filter((m) => !m.critical)].slice(0, 5)
  }, [milestones])
  // Pinned (keyRisk) items get a ranking boost so the curated list shows by default,
  // but a newly logged high-impact item still surfaces on the Dashboard.
  const keyRisks = useMemo(() => raid.filter(isOpen).map((r) => ({ r, s: r.impactScore + (r.keyRisk ? 1.5 : 0) })).sort((a, b) => b.s - a.s).slice(0, 5).map((x) => x.r), [raid])
  const openCritical = useMemo(() => raid.filter((r) => isOpen(r) && r.level === 'Critical').length, [raid])
  const headroom = +(k.approvedBudgetCr - k.forecastAtCompletionCr).toFixed(1)
  const budgetData = [
    { name: 'Approved Budget', value: +m.num(k.approvedBudgetCr), fill: CHART_COLORS.blue },
    { name: 'Actual Spend', value: +m.num(k.actualSpendCr), fill: CHART_COLORS.blueLight },
    { name: 'Forecast at Completion', value: +m.num(k.forecastAtCompletionCr), fill: CHART_COLORS.teal },
    { name: 'Forecast Headroom', value: +m.num(headroom), fill: CHART_COLORS.blueFaint },
  ]
  const benefitPct = Math.round((k.projectedBenefitsCr / k.targetBenefitsCr) * 100)
  const timelinePct = k.programCompletion

  return (
    <div className="space-y-4">
      {/* Program timeline */}
      <Card>
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-[220px]">
            <h3 className="card-title">Program Timeline</h3>
            <p className="text-[12.5px] text-ink-500 mt-0.5">{programDef(program).city}, {programDef(program).country} · {fmtDate(k.timelineStart).slice(3)} – {fmtDate(k.timelineEnd).slice(3)}</p>
          </div>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-teal-500" style={{ width: `${timelinePct}%` }} /></div>
            <span className="text-[13px] font-semibold text-ink-900 whitespace-nowrap">{timelinePct}% complete</span>
          </div>
          <button className="btn-primary shrink-0" onClick={() => setEdit(true)}><Pencil size={13} /> Edit</button>
        </div>
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-5 gap-4">
        <KpiTile tone="green" icon={<CheckCircle2 size={22} />} value={`${k.programCompletion}%`} label="Program Completion" trend="up" sub={<span className="text-green-600">+{k.programCompletionDelta}% vs last month</span>} />
        <KpiTile tone="blue" icon={<BarChart3 size={22} />} value={`${k.milestoneAdherence}%`} label="Milestone Adherence" trend="up" sub={<span className="text-green-600">+{k.milestoneAdherenceDelta}% vs last month</span>} />
        <KpiTile tone="navy" icon={<Users size={22} />} value={<>{k.talentOnboarded} <span className="text-[16px] text-ink-500 font-semibold">/ {k.talentTarget}</span></>} label="Talent Onboarded" trend="up" sub={<span className="text-green-600">+{k.talentDeltaVsPlan}% vs plan</span>} />
        <KpiTile tone="navy" icon={<Database size={22} className="text-red-500" />} value={m.fmt(k.actualSpendCr)} label="Actual Spend" sub={<>of <b>{m.fmt(k.approvedBudgetCr)}</b> budget</>} />
        <KpiTile tone="red" icon={<AlertTriangle size={22} />} value={openCritical} label="Open Critical Issues" trend="down" sub={<span className="text-red-600">{k.openCriticalIssuesDelta} vs last month</span>} />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-[1.15fr_1fr_1.1fr] gap-4">
        <Card title="Workstream Health">
          <div className="space-y-3">
            {wss.map((w) => (
              <div key={w.id} className="flex items-center gap-3 text-[12.5px] cursor-pointer" onClick={() => nav('/workstreams')}>
                <span className="w-7 h-7 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{WS_ICON[w.name]}</span>
                <span className="w-[150px] text-ink-700 truncate">{w.name}</span>
                <Progress value={w.progress} className="flex-1" color={w.progress >= 80 ? '#16A34A' : w.progress >= 65 ? '#5B9BF0' : '#F59E0B'} />
                <span className="w-10 text-right font-medium">{w.progress}%</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Milestones Progress">
          <div className="flex items-center gap-4">
            <Donut size={150} inner={0.72} data={[{ name: 'Complete', value: k.programCompletion, color: CHART_COLORS.green }, { name: 'Remaining', value: 100 - k.programCompletion, color: '#E5E7EB' }]}
              center={<><div className="text-[24px] font-bold text-ink-900 leading-none">{k.programCompletion}%</div><div className="text-[11px] text-ink-500 mt-1">Overall Progress</div></>} />
            <div className="flex-1 space-y-2">
              {[['On Track', msCounts.onTrack, 'bg-green-50 text-green-700'], ['At Risk', msCounts.atRisk, 'bg-blue-50 text-brand-600'], ['Delayed', msCounts.delayed, 'bg-red-50 text-red-600'], ['Not Started', msCounts.notStarted, 'bg-slate-100 text-slate-600']].map(([l, n, cls]) => (
                <button key={l as string} onClick={() => nav('/planning')} className="w-full flex items-center justify-between text-[13px] py-1 cursor-pointer hover:bg-surface rounded-md px-1">
                  <span className="flex items-center gap-2"><span className={`w-8 h-8 rounded-full flex items-center justify-center text-[12.5px] font-semibold ${cls}`}>{n as number}</span>{l as string}</span><Chevron />
                </button>
              ))}
            </div>
          </div>
        </Card>
        <Card title={`Budget Overview (${m.unitLabel})`}>
          <div className="h-[200px]">
            <ResponsiveContainer>
              <BarChart data={budgetData} margin={{ top: 18, right: 8, left: -24, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={<WrapTick />} height={34} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`${m.symbol} ${v} ${m.unit}`]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}><LabelList dataKey="value" position="top" style={{ fontSize: 11.5, fill: '#111827', fontWeight: 600 }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-[1.25fr_1.15fr_0.8fr] gap-4">
        <Card title="Upcoming Milestones" action={<ViewAll onClick={() => nav('/planning')} />}>
          <Table<Milestone> compact rows={upcoming} onRowClick={() => nav('/planning')} columns={[
            { key: 'name', header: 'Milestone' },
            { key: 'workstream', header: 'Workstream', render: (r) => WS_SHORT[r.workstream] ?? r.workstream },
            { key: 'dueDate', header: 'Due Date', className: 'whitespace-nowrap', render: (r) => fmtDate(r.dueDate) },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
          ]} />
        </Card>
        <Card title="Key Risks and Issues" action={<ViewAll onClick={() => nav('/risks')} />}>
          <Table<RaidItem> compact rows={keyRisks} onRowClick={() => nav('/risks')} columns={[
            { key: 'title', header: 'Issue / Risk', render: (r) => r.shortTitle ?? r.title },
            { key: 'level', header: 'Impact', render: (r) => <Badge value={r.level} /> },
            { key: 'owner', header: 'Owner', className: 'whitespace-nowrap', render: (r) => OWNER_ROLE[r.owner] ?? r.owner },
            { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
          ]} />
        </Card>
        <Card title={<span className="inline-flex items-center gap-1.5"><span className="text-violet-500">✦</span> AI Insights</span>} action={<ViewAll onClick={() => nav('/risks')} />}>
          <div className="space-y-3">
            {[
              { icon: <AlertCircle size={18} className="text-amber-500" />, text: 'Delay in IT provisioning may impact transition go-live by 3 weeks.', link: 'View impact analysis', to: '/risks' },
              { icon: <Info size={18} className="text-brand-500" />, text: 'Hiring in Wave 2 is 20% behind plan. Consider accelerating lateral hiring.', link: 'View recommendation', to: '/resources' },
              { icon: <TrendingUp size={18} className="text-green-600" />, text: 'Program remains on track to achieve 15% cost savings as per business case.', link: 'View value forecast', to: '/value' },
            ].map((i) => (
              <div key={i.text} className="flex gap-2.5">
                <span className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0">{i.icon}</span>
                <div className="text-[12.5px] text-ink-900 leading-snug">{i.text}<br /><button className="link" onClick={() => nav(i.to)}>{i.link} →</button></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-[1.3fr_1fr] gap-4">
        <Card title="Resource Ramp-up" action={<ViewAll label="View Details" onClick={() => nav('/resources')} />} headerRight={<Legend items={[{ label: 'Plan', color: CHART_COLORS.blueFaint }, { label: 'Actual', color: CHART_COLORS.blue }]} />}>
          <div className="h-[150px]">
            <ResponsiveContainer>
              <BarChart data={rampFor(programDef(program).scale)} margin={{ top: 4, right: 4, left: -22, bottom: 0 }} barGap={1} barCategoryGap="30%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                <Bar dataKey="Plan" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Actual" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Value Realization" action={<ViewAll label="View Details" onClick={() => nav('/value')} />}>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-[12.5px] text-ink-500">Target Benefits (Annual)</div><div className="text-[24px] font-bold text-ink-900 mt-1">{m.fmt(k.targetBenefitsCr)}</div></div>
            <div><div className="text-[12.5px] text-ink-500">Projected Benefits</div><div className="text-[24px] font-bold text-green-600 mt-1">{m.fmt(k.projectedBenefitsCr)}</div><div className="text-[12px] text-ink-500">{benefitPct}% of target</div></div>
          </div>
          <Progress value={benefitPct} className="mt-4" color="#16A34A" height="h-3" />
        </Card>
      </div>

      <ProgramKpiEditor open={edit} onClose={() => setEdit(false)} value={k} onSave={(v) => { kpisC.update(v); setEdit(false) }} />
      {/* keep RLegend import referenced for tree-shaking parity */}
      <span className="hidden"><RLegend /></span>
    </div>
  )
}

function WrapTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const words = String(payload?.value ?? '').split(' ')
  const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [words.join(' ')]
  return (
    <text x={x} y={y} textAnchor="middle" fill="#6B7280" fontSize={11}>
      {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 12 : 13}>{l}</tspan>)}
    </text>
  )
}
