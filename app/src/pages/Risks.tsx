import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { AlertTriangle, Info, CheckCircle2, Clock, Flag, TrendingDown, Plus } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Card, KpiTile, Badge, Tabs, Legend, ViewAll, Modal, Field, Input, FormGrid, Table } from '../components/ui'
import { Donut, tooltipStyle } from '../components/charts'
import { useCollection, useStore } from '../store/useStore'
import { seedRaid, seedDependencies, isOpen, daysOpen, LIKELIHOOD, IMPACT_SCALE, RISK_CATEGORIES, type RaidItem, type Dependency } from '../data/shared'
import { CHART_COLORS, fmtDate } from '../data/common'
import { useMoney } from '../data/money'
import {
  seedRiskSettings, seedRaidTrend, seedRiskInsights, seedMitigationActions, seedEscalationDecisions, supplementRaid,
  VIEW_OPTIONS, matchesView, statusBucket, STATUS_BUCKETS, CATEGORY_COLORS, openRisks, openIssues, cellSeverity, cellScore, SEVERITY_COLORS,
  type RiskSettings, type RaidTrendPoint, type RiskInsight, type MitigationAction, type EscalationDecision, type Severity,
} from '../data/risks'
import { HeatMap, SeverityLegend } from '../components/risks/HeatMap'
import { RaidModal, blankRaid, type RaidDraft } from '../components/risks/RaidModal'
import { RegisterTable, agingBucket } from '../components/risks/RegisterTable'
import { TrendChart, TREND_LEGEND, InsightList, InsightModal, TrendsTab } from '../components/risks/TrendsTab'
import { MitigationTab } from '../components/risks/MitigationTab'
import { EscalationsTab } from '../components/risks/EscalationsTab'
import { DependenciesTab } from '../components/risks/DependenciesTab'
import { RisksInput } from '../components/risks/InputView'

const TABS = ['Risk Overview', 'Risk Register', 'Issue Register', 'Risk Heat Map', 'Trends & Insights', 'Mitigation Plans', 'Escalations', 'Dependencies']
const RAID_SEED: RaidItem[] = [...seedRaid, ...supplementRaid]
const LEVEL_BAR: Record<string, string> = { Critical: CHART_COLORS.red, High: CHART_COLORS.amber, Medium: '#FBBF24', Low: CHART_COLORS.green }
const AGING = [{ key: '0–7 days', color: CHART_COLORS.green }, { key: '8–30 days', color: CHART_COLORS.amber }, { key: '> 30 days', color: CHART_COLORS.red }]

export default function Risks() {
  const m = useMoney()
  const d2 = m.digits + 1 // impact thresholds: 2 decimals in ₹ Cr, 3 in € M
  const raidC = useCollection<RaidItem>('raid', RAID_SEED)
  const settingsC = useCollection<RiskSettings>('riskSettings', seedRiskSettings)
  const trendC = useCollection<RaidTrendPoint>('raidTrend', seedRaidTrend)
  const insightsC = useCollection<RiskInsight>('riskInsights', seedRiskInsights)
  const mitC = useCollection<MitigationAction>('mitigationActions', seedMitigationActions)
  const escC = useCollection<EscalationDecision>('escalationDecisions', seedEscalationDecisions)
  const depC = useCollection<Dependency>('dependencies', seedDependencies)
  const settings = settingsC.items[0] ?? seedRiskSettings[0]

  // One-time supplement of the shared register so the page shows the mock-up's 24 risks / 12 issues even
  // when another page seeded 'raid' first (shared.ts holds 23 / 11).
  useEffect(() => {
    if (settings.supplementApplied) return
    supplementRaid.forEach((s) => { if (!raidC.items.some((r) => r.id === s.id || r.code === s.code)) raidC.add(s) })
    settingsC.update({ ...settings, supplementApplied: true })
  }, [settings.supplementApplied]) // eslint-disable-line react-hooks/exhaustive-deps

  const mode = useStore((s) => s.mode)
  const [tab, setTab] = useState(TABS[0])
  const [view, setView] = useState<string>(VIEW_OPTIONS[0])
  const [editRaid, setEditRaid] = useState<RaidDraft | null | 'closed'>('closed')
  const [editInsight, setEditInsight] = useState<RiskInsight | null | 'closed'>('closed')
  const [editKpi, setEditKpi] = useState(false)
  const [cell, setCell] = useState<{ li: number; ii: number } | null>(null)

  /* ---------- derived ---------- */
  const raid = useMemo(() => raidC.items.filter((r) => matchesView(r, view)), [raidC.items, view])
  const risks = useMemo(() => openRisks(raid), [raid])
  const issues = useMemo(() => openIssues(raid), [raid])
  const byLevel = (list: RaidItem[], l: string) => list.filter((r) => r.level === l).length
  const escalations = raid.filter((r) => r.escalated && isOpen(r) && r.escalationStatus !== 'Resolved')
  const escAwaiting = escalations.filter((r) => r.escalationStatus === 'Awaiting Decision').length
  const escInProgress = escalations.filter((r) => r.escalationStatus === 'In Progress').length

  const catData = RISK_CATEGORIES.map((c) => ({ name: c, value: risks.filter((r) => r.category === c).length, color: CATEGORY_COLORS[c] })).sort((a, b) => b.value - a.value)
  const statusData = STATUS_BUCKETS.map((b) => ({ name: b.name, value: risks.filter((r) => statusBucket(r) === b.name).length, color: b.color }))
  const top5 = [...risks].sort((a, b) => b.impactScore - a.impactScore).slice(0, 5)
  const aging = [
    { name: `Risks (${risks.length})`, ...Object.fromEntries(AGING.map((a) => [a.key, risks.filter((r) => agingBucket(daysOpen(r)) === a.key).length])) },
    { name: `Issues (${issues.length})`, ...Object.fromEntries(AGING.map((a) => [a.key, issues.filter((r) => agingBucket(daysOpen(r)) === a.key).length])) },
  ]
  const trend = useMemo(() => trendC.items.map((p, i) => (i === trendC.items.length - 1 ? { ...p, openRisks: risks.length, openIssues: issues.length } : p)), [trendC.items, risks.length, issues.length])
  const insights = insightsC.items.filter((i) => i.kind === 'Insight').sort((a, b) => a.order - b.order)
  const actions = insightsC.items.filter((i) => i.kind === 'Action').sort((a, b) => a.order - b.order)

  const openRaid = (r: RaidItem) => setEditRaid(r)
  const openByCode = (code: string) => { const r = raidC.items.find((x) => x.code === code); if (r) openRaid(r) }
  const addRaid = (type: 'Risk' | 'Issue') => setEditRaid(blankRaid(raidC.items, type))
  const saveRaid = (item: RaidItem) => { raidC.update(item); setEditRaid('closed') }

  const cellRisks = cell ? risks.filter((r) => LIKELIHOOD.indexOf(r.likelihood) === cell.li && IMPACT_SCALE.indexOf(r.impact) === cell.ii).sort((a, b) => b.impactScore - a.impactScore) : []
  const sevCounts = (['Critical', 'High', 'Medium', 'Low'] as Severity[]).map((s) => ({ s, n: risks.filter((r) => cellSeverity(LIKELIHOOD.indexOf(r.likelihood), IMPACT_SCALE.indexOf(r.impact)) === s).length }))

  return (
    <div className="space-y-4">
      {mode === 'input' ? <RisksInput raidC={raidC} settingsC={settingsC} trendC={trendC} insightsC={insightsC} mitC={mitC} escC={escC} settings={settings} openRaid={openRaid} /> : <>
      <PageHeader title="Risks and Issues" subtitle="Identify, track and resolve risks and issues across the GCC program." viewValue={view} viewOptions={VIEW_OPTIONS} onView={setView}
        onEdit={() => setEditKpi(true)} editLabel="Edit KPIs" />

      {/* KPI tiles */}
      <div className="grid grid-cols-[1.06fr_0.97fr_0.97fr_0.9fr_1.1fr] gap-4">
        <KpiTile tone="red" icon={<AlertTriangle size={22} />} value={risks.length} label="Open Risks" sub={<><span className="text-red-600 font-medium">{byLevel(risks, 'Critical')} Critical</span><Sep /><span className="text-orange-500 font-medium">{byLevel(risks, 'High')} High</span><Sep /><span className="text-amber-500 font-medium">{byLevel(risks, 'Medium')} Medium</span></>} />
        <KpiTile tone="blue" icon={<Info size={22} />} value={issues.length} label="Open Issues" sub={<><span className="text-red-600 font-medium">{byLevel(issues, 'High')} High</span><Sep /><span className="text-amber-500 font-medium">{byLevel(issues, 'Medium')} Medium</span><Sep /><span className="text-green-600 font-medium">{byLevel(issues, 'Low')} Low</span></>} />
        <KpiTile tone="green" icon={<CheckCircle2 size={22} />} value={`${settings.onTrackForClosurePct}%`} label="On Track for Closure" trend="up" sub={<span className="text-green-600">{settings.onTrackForClosureDelta >= 0 ? '+' : ''}{settings.onTrackForClosureDelta}% vs last month</span>} />
        <KpiTile tone="violet" icon={<Clock size={22} />} value={settings.avgDaysToResolve} label="Avg. Days to Resolve" sub={<span className="inline-flex items-center gap-1 text-green-600"><TrendingDown size={12} />{settings.avgDaysToResolveDelta}% vs last month</span>} />
        <KpiTile tone="red" icon={<Flag size={22} className="text-red-500" />} value={escalations.length} label="Escalations" sub={<><span className="text-red-600 font-medium">{escAwaiting} Awaiting Decision</span><Sep /><span className="text-brand-600 font-medium">{escInProgress} In Progress</span></>} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'Risk Overview' && (
        <>
          <div className="grid grid-cols-[1fr_1.05fr_0.95fr] gap-4">
            <Card title="Risk Heat Map" action={<button className="link" onClick={() => setTab('Risk Heat Map')}>Expand</button>}>
              <HeatMap items={risks} cellHeight={30} onCell={(li, ii) => { setCell({ li, ii }); setTab('Risk Heat Map') }} />
            </Card>
            <Card title="Risks by Category">
              <DonutWithLegend data={catData} total={risks.length} />
            </Card>
            <Card title="Risk Status" subtitle={undefined}>
              <DonutWithLegend data={statusData} total={risks.length} />
            </Card>
          </div>

          <div className="grid grid-cols-[1.3fr_1.1fr_0.85fr] gap-4">
            <Card title="Top 5 Risks by Potential Impact">
              <div className="grid grid-cols-[1fr_100px_36px_64px] items-center gap-x-2 text-[11.5px] text-ink-500 bg-surface/70 rounded-md px-2 py-1.5">
                <span>Risk / Issue</span><span className="text-right col-span-2">Impact Score</span><span>Risk Level</span>
              </div>
              <div className="divide-y divide-line/70">
                {top5.map((r) => (
                  <div key={r.id} className="grid grid-cols-[1fr_100px_36px_64px] items-center gap-x-2 px-2 py-[7px] text-[12px] cursor-pointer hover:bg-brand-50/60" onClick={() => openRaid(r)}>
                    <span className="truncate text-ink-900" title={r.title}>{r.title}</span>
                    <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.impactScore * 10}%`, background: LEVEL_BAR[r.level] }} /></div>
                    <span className="font-medium text-ink-900">{r.impactScore.toFixed(1)}</span>
                    <Badge value={r.level} />
                  </div>
                ))}
                {top5.length === 0 && <p className="text-[12.5px] text-ink-500 italic py-4 text-center">No open risks.</p>}
              </div>
            </Card>
            <Card title="Risk and Issue Trend" headerRight={<Legend items={TREND_LEGEND} />}>
              <TrendChart data={trend} height={176} />
            </Card>
            <Card title="Aging of Open Items">
              <div className="flex justify-end -mt-2 mb-1"><Legend items={AGING.map((a) => ({ label: a.key, color: a.color }))} /></div>
              <div className="h-[160px]">
                <ResponsiveContainer>
                  <BarChart data={aging} margin={{ top: 4, right: 4, left: -26, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                    {AGING.map((a, i) => (
                      <Bar key={a.key} dataKey={a.key} stackId="a" fill={a.color} isAnimationActive={false} radius={i === AGING.length - 1 ? [4, 4, 0, 0] : 0}>
                        <LabelList dataKey={a.key} position="center" style={{ fontSize: 11, fill: '#fff', fontWeight: 600 }} formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-[3.1fr_1fr] gap-4">
            <Card className="[&_table]:table-fixed [&_td]:px-2 [&_th]:px-2 [&_td]:text-[12.5px]">
              <RegisterTable items={raid} variant="overview" limit={8} onRow={openRaid} onAdd={addRaid} onViewAll={() => setTab('Risk Register')}
                headerTitle={<h3 className="card-title">Risk and Issue Register (Open)</h3>} />
            </Card>
            <div className="space-y-4">
              <Card title={<span className="inline-flex items-center gap-1.5"><span className="text-violet-500">✦</span> Key Insights</span>} action={<ViewAll onClick={() => setTab('Trends & Insights')} />}>
                <InsightList items={insights.slice(0, 3)} onEdit={(i) => setEditInsight(i)} onLink={openByCode} />
              </Card>
              <Card title={<span className="inline-flex items-center gap-1.5"><span className="text-violet-500">✦</span> Recommended Actions</span>} action={<ViewAll onClick={() => setTab('Trends & Insights')} />}>
                <InsightList items={actions.slice(0, 3)} onEdit={(i) => setEditInsight(i)} onLink={openByCode} />
              </Card>
            </div>
          </div>
        </>
      )}

      {tab === 'Risk Register' && (
        <Card className="[&_td]:px-2 [&_th]:px-2">
          <RegisterTable items={raid} variant="risk" onRow={openRaid} onAdd={addRaid}
            headerTitle={<><h3 className="card-title">Risk Register</h3><p className="text-[12px] text-ink-500">{risks.length} open risks · {raid.filter((r) => r.type === 'Risk' && !isOpen(r)).length} closed. Click a row to edit; sort by score, ID, due date or days open.</p></>} />
        </Card>
      )}

      {tab === 'Issue Register' && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[['Open Issues', issues.length, 'text-ink-900'], ['High severity', byLevel(issues, 'High'), 'text-red-600'], ['Open > 30 days', issues.filter((r) => daysOpen(r) > 30).length, 'text-red-600'], ['Past due date', issues.filter((r) => r.dueDate < '2027-02-22').length, 'text-amber-600']].map(([l, v, c]) => (
              <div key={l as string} className="card px-4 py-3"><div className="text-[12px] text-ink-500">{l as string}</div><div className={`text-[22px] font-bold ${c}`}>{v as number}</div></div>
            ))}
          </div>
          <Card className="[&_td]:px-2 [&_th]:px-2">
            <RegisterTable items={raid} variant="issue" onRow={openRaid} onAdd={addRaid}
              headerTitle={<><h3 className="card-title">Issue Register</h3><p className="text-[12px] text-ink-500">{issues.length} open issues · {raid.filter((r) => r.type === 'Issue' && !isOpen(r)).length} resolved. Severity and aging per issue.</p></>} />
          </Card>
        </>
      )}

      {tab === 'Risk Heat Map' && (
        <>
          <div className="grid grid-cols-[1.35fr_1fr] gap-4">
            <Card title="Risk Heat Map" subtitle={`Open risks by likelihood and impact · ${risks.length} risks · click a cell to list its risks`} headerRight={<SeverityLegend />}>
              <HeatMap items={risks} cellHeight={58} labelWidth={74} showScore onCell={(li, ii) => setCell((c) => (c && c.li === li && c.ii === ii ? null : { li, ii }))} selected={cell} />
              <div className="grid grid-cols-4 gap-2 mt-4">
                {sevCounts.map(({ s, n }) => (
                  <div key={s} className="rounded-lg border border-line px-3 py-2 flex items-center gap-2.5"><span className="w-3 h-3 rounded-sm" style={{ background: SEVERITY_COLORS[s] }} /><span className="text-[12px] text-ink-500">{s} exposure</span><span className="ml-auto text-[16px] font-bold text-ink-900">{n}</span></div>
                ))}
              </div>
            </Card>
            <Card title={cell ? `${LIKELIHOOD[cell.li]} likelihood × ${IMPACT_SCALE[cell.ii]} impact` : 'Risks in selected cell'}
              subtitle={cell ? <>Severity <Badge value={cellSeverity(cell.li, cell.ii)} /> · exposure score {cellScore(cell.li, cell.ii)} · {cellRisks.length} risk{cellRisks.length === 1 ? '' : 's'}</> : 'Click a cell in the heat map to see the risks positioned there.'}
              action={cell ? <button className="link" onClick={() => setCell(null)}>Clear</button> : undefined}>
              {cell ? (
                <Table<RaidItem> compact rows={cellRisks} onRowClick={openRaid} columns={[
                  { key: 'code', header: 'ID', className: 'font-medium' },
                  { key: 'title', header: 'Risk', render: (r) => <span className="block max-w-[220px] truncate" title={r.title}>{r.title}</span> },
                  { key: 'level', header: 'Level', render: (r) => <Badge value={r.level} /> },
                  { key: 'impactScore', header: 'Score', render: (r) => r.impactScore.toFixed(1) },
                  { key: 'owner', header: 'Owner' },
                  { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
                ]} empty="No open risks in this cell." />
              ) : (
                <div className="space-y-1.5 text-[12.5px]">
                  <p className="text-ink-700 font-medium mb-2">Highest-exposure risks</p>
                  {[...risks].sort((a, b) => cellScore(LIKELIHOOD.indexOf(b.likelihood), IMPACT_SCALE.indexOf(b.impact)) - cellScore(LIKELIHOOD.indexOf(a.likelihood), IMPACT_SCALE.indexOf(a.impact)) || b.impactScore - a.impactScore).slice(0, 8).map((r) => (
                    <div key={r.id} className="flex items-center gap-2 cursor-pointer hover:bg-brand-50/60 rounded-md px-1 py-0.5" onClick={() => openRaid(r)}>
                      <span className="w-12 font-medium">{r.code}</span><span className="flex-1 truncate" title={r.title}>{r.title}</span>
                      <span className="text-ink-500 text-[11.5px] whitespace-nowrap">{r.likelihood} × {r.impact}</span>
                      <span className="w-7 h-5 rounded text-[11px] font-semibold flex items-center justify-center" style={{ background: SEVERITY_COLORS[cellSeverity(LIKELIHOOD.indexOf(r.likelihood), IMPACT_SCALE.indexOf(r.impact))] }}>{cellScore(LIKELIHOOD.indexOf(r.likelihood), IMPACT_SCALE.indexOf(r.impact))}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
          <div className="grid grid-cols-[0.95fr_1.25fr_1.05fr] gap-4">
            <Card title="Likelihood Scale" subtitle="Probability the risk materialises during the program">
              <ScaleTable rows={[['Very High', '> 75%', 'Expected to occur; already showing early signs'], ['High', '50 – 75%', 'More likely than not'], ['Medium', '30 – 50%', 'Could occur in normal circumstances'], ['Low', '10 – 30%', 'Unlikely but possible'], ['Very Low', '< 10%', 'Rare; would require exceptional circumstances']]} />
            </Card>
            <Card title="Impact Scale" subtitle="Effect on schedule, cost and go-live if it occurs">
              <ScaleTable rows={[['Very High', `> 8 weeks / > ${m.fmt(0.5, d2)}`, 'Go-live slips; program objectives compromised'], ['High', `4 – 8 weeks / ${m.symbol} ${m.num(0.25, d2)} – ${m.num(0.5, d2)} ${m.unit}`, 'Go-live at risk; steering decision required'], ['Medium', `2 – 4 weeks / ${m.symbol} ${m.num(0.1, d2)} – ${m.num(0.25, d2)} ${m.unit}`, 'Milestone slips; recoverable within phase'], ['Low', `1 – 2 weeks / ${m.symbol} ${m.num(0.05, d2)} – ${m.num(0.1, d2)} ${m.unit}`, 'Absorbed within workstream float'], ['Very Low', `< 1 week / < ${m.fmt(0.05, d2)}`, 'Negligible; managed by the activity owner']]} />
            </Card>
            <Card title="Scoring Methodology" subtitle="WBS 14.1.1 – Establish risk categorization and scoring methodology">
              <div className="text-[12.5px] text-ink-700 space-y-2 leading-relaxed">
                <p><b>Exposure score</b> = Likelihood (1–5) × Impact (1–5), giving a 1–25 score shown in the top-left of each cell. Severity is read from the calibrated matrix so that high-likelihood items are rated conservatively.</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {([['Critical', '15 – 25', 'Escalate; steering oversight'], ['High', '9 – 14', 'Active mitigation; weekly review'], ['Medium', '5 – 8', 'Mitigation plan; fortnightly review'], ['Low', '1 – 4', 'Monitor; monthly review']] as [Severity, string, string][]).map(([s, range, act]) => (
                    <div key={s} className="rounded-md px-2 py-1.5" style={{ background: SEVERITY_COLORS[s] + '33', borderLeft: `3px solid ${SEVERITY_COLORS[s]}` }}><div className="font-semibold text-ink-900">{s} <span className="font-normal text-ink-500">{range}</span></div><div className="text-[11px] text-ink-500 leading-tight">{act}</div></div>
                  ))}
                </div>
                <p><b>Impact Score (0–10)</b> on each register row is the owner's weighted assessment (schedule 40%, cost 30%, quality/compliance 30%) and drives the "Top 5 Risks by Potential Impact" ranking. Risk Level (Critical / High / Medium / Low) is confirmed by the PMO at the weekly risk review and re-assessed when likelihood or impact changes.</p>
                <p className="text-ink-500">Categories: {RISK_CATEGORIES.join(' · ')}.</p>
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === 'Trends & Insights' && (
        <TrendsTab trend={trend} onSaveTrend={trendC.update} insights={insightsC.items} onEditInsight={(i) => setEditInsight(i)} onAddInsight={(kind) => setEditInsight({ id: '', kind, title: '', detail: '', icon: kind === 'Insight' ? 'alert' : 'escalate', order: (insightsC.items.filter((x) => x.kind === kind).length + 1) })}
          onLink={openByCode} liveRisks={risks.length} liveIssues={issues.length} />
      )}

      {tab === 'Mitigation Plans' && <MitigationTab raid={raid} actions={mitC.items} onSave={mitC.update} onDelete={mitC.remove} onOpenRaid={openRaid} />}

      {tab === 'Escalations' && <EscalationsTab raid={raid} decisions={escC.items} onSaveRaid={raidC.update} onSaveDecision={escC.update} onOpenRaid={openRaid} />}

      {tab === 'Dependencies' && <DependenciesTab deps={depC.items} raid={raidC.items} onSave={depC.update} onDelete={depC.remove} onOpenRaid={openRaid} view={view} />}
      </>}

      {/* Modals (both views) */}
      <RaidModal open={editRaid !== 'closed'} value={editRaid === 'closed' ? null : editRaid} raid={raidC.items} onClose={() => setEditRaid('closed')} onSave={saveRaid} onDelete={(id) => { raidC.remove(id); setEditRaid('closed') }} />
      <InsightModal open={editInsight !== 'closed'} value={editInsight === 'closed' || editInsight === null ? null : (editInsight.id ? editInsight : editInsight)} onClose={() => setEditInsight('closed')}
        onSave={(v) => { insightsC.update(v); setEditInsight('closed') }} onDelete={(id) => { insightsC.remove(id); setEditInsight('closed') }} />
      <KpiSettingsModal open={editKpi} value={settings} onClose={() => setEditKpi(false)} onSave={(v) => { settingsC.update(v); setEditKpi(false) }} />
      <span className="hidden"><Plus size={1} />{fmtDate('')}</span>
    </div>
  )
}

const Sep = () => <span className="text-ink-300 mx-[3px]">|</span>

function DonutWithLegend({ data, total }: { data: { name: string; value: number; color: string }[]; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <Donut size={158} inner={0.62} data={data.filter((d) => d.value > 0)} center={<><div className="text-[24px] font-bold text-ink-900 leading-none">{total}</div><div className="text-[11px] text-ink-500 mt-1">Open Risks</div></>} />
      <div className="flex-1 min-w-0 space-y-[7px]">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-[12.5px]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="flex-1 truncate text-ink-700">{d.name}</span>
            <span className="font-semibold text-ink-900 w-5 text-right">{d.value}</span>
            <span className="text-ink-500 w-10 text-right">({total ? Math.round((d.value / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScaleTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <table className="w-full text-[12px]">
      <thead><tr className="text-ink-500"><th className="th">Rating</th><th className="th">Threshold</th><th className="th">Definition</th></tr></thead>
      <tbody>{rows.map(([r, t, d]) => <tr key={r}><td className="td py-1.5 font-medium whitespace-nowrap">{r}</td><td className="td py-1.5 whitespace-nowrap">{t}</td><td className="td py-1.5 text-ink-700">{d}</td></tr>)}</tbody>
    </table>
  )
}

function KpiSettingsModal({ open, value, onClose, onSave }: { open: boolean; value: RiskSettings; onClose: () => void; onSave: (v: RiskSettings) => void }) {
  const [f, setF] = useState<RiskSettings>(value)
  useEffect(() => { if (open) setF(value) }, [open, value])
  const num = (k: keyof RiskSettings, label: string) => (
    <Field label={label}><Input type="number" step="any" value={f[k] as number} onChange={(e) => setF({ ...f, [k]: parseFloat(e.target.value) || 0 })} /></Field>
  )
  return (
    <Modal open={open} onClose={onClose} title="Edit risk KPIs" width="max-w-lg" footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave(f)}>Save</button></>}>
      <p className="text-[12.5px] text-ink-500 mb-3">Open risk / issue counts, escalations, heat map and charts are computed from the register. These headline measures are maintained by the PMO.</p>
      <FormGrid cols={2}>
        {num('onTrackForClosurePct', 'On Track for Closure (%)')}{num('onTrackForClosureDelta', 'Change vs last month (%)')}
        {num('avgDaysToResolve', 'Avg. days to resolve')}{num('avgDaysToResolveDelta', 'Change vs last month (%)')}
        {num('avgDaysToResolvePrev', 'Avg. days to resolve (previous month)')}{num('wave2DelayProbability', 'Wave 2 delay probability (%)')}
      </FormGrid>
    </Modal>
  )
}
