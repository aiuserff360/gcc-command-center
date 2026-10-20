import { useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'
import { Layers, Wallet, Receipt, Rocket, HeartPulse, Plus, MapPin, CalendarDays } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Card, KpiTile, Badge, Tabs, Table, Modal, Field, Input, TextArea, Select, FormGrid, Legend, ConfirmDelete, ViewAll, Stat, Progress } from '../components/ui'
import { Donut, tooltipStyle } from '../components/charts'
import { useCollection, useStore, uid } from '../store/useStore'
import { WORKSTREAMS, WORKSTREAM_META, CHART_COLORS, fmtDate, fmtDateShort, type Workstream } from '../data/common'
import { useMoney, type Money } from '../data/money'
import { seedPrograms, seedPortfolioInitiatives, seedProgramBenefits, seedInvestmentYears, PROGRAM_PHASES, PROGRAM_COLORS, PHASE_COLORS, RAG_COLORS, type Program, type PortfolioInitiative, type ProgramBenefit, type InvestmentYear, type ProgramPhase, type Rag } from '../data/portfolio'

const TABS = ['Portfolio Overview', 'Programs', 'Initiatives', 'Roadmap', 'Benefits by Program', 'Capacity & Investment']
const REGIONS = ['All Regions', 'India', 'Europe', 'APAC', 'Global'] as const
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)
const T0 = new Date('2026-01-01').getTime(), T1 = new Date('2029-01-01').getTime()
const xPct = (iso: string) => Math.max(0, Math.min(100, ((new Date(iso).getTime() - T0) / (T1 - T0)) * 100))
const WS_OPTIONS = [...WORKSTREAMS, 'Program Management'] as const

type Setter<T> = <K extends keyof T>(k: K) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
function useForm<T>(initial: T, money?: Money) {
  const [f, setF] = useState<T>(initial)
  const s: Setter<T> = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const n: Setter<T> = (k) => (e) => setF({ ...f, [k]: parseFloat(e.target.value) || 0 })
  /** Props for a money input: shows the display currency, stores ₹ Cr. */
  const c = (k: keyof T) => ({ type: 'number' as const, step: 'any', value: money!.inputValue(f[k] as number), onChange: (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: money!.toBase(parseFloat(e.target.value) || 0) }) })
  return { f, setF, s, n, c }
}
function Footer({ onClose, onSave, onDelete, isNew }: { onClose: () => void; onSave: () => void; onDelete?: () => void; isNew: boolean }) {
  return (<>{!isNew && onDelete && <ConfirmDelete onConfirm={onDelete} />}<span className="flex-1" /><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={onSave}>Save</button></>)
}
const colorOf = (name: string) => PROGRAM_COLORS[name] ?? CHART_COLORS.orange

export default function Portfolio() {
  const nav = useNavigate()
  const selected = useStore((s) => s.program)
  const setProgram = useStore((s) => s.setProgram)
  const [tab, setTab] = useState(TABS[0])
  const [region, setRegion] = useState<string>('All Regions')
  const money = useMoney()
  const fmt = money.fmt
  /** ₹ Cr -> rounded number in the display unit (chart series). */
  const disp = (cr: number) => +money.toDisplay(cr).toFixed(money.digits)
  const programsC = useCollection<Program>('programs', seedPrograms)
  const initC = useCollection<PortfolioInitiative>('portfolioInitiatives', seedPortfolioInitiatives)
  const benefitsC = useCollection<ProgramBenefit>('programBenefits', seedProgramBenefits)
  const investC = useCollection<InvestmentYear>('investmentYears', seedInvestmentYears)

  const programs = useMemo(() => programsC.items.filter((p) => region === 'All Regions' || p.region === region), [programsC.items, region])
  const names = programs.map((p) => p.name)
  const initiatives = useMemo(() => initC.items.filter((i) => names.includes(i.program)), [initC.items, names]) // eslint-disable-line react-hooks/exhaustive-deps
  const totalBudget = +programs.reduce((s, p) => s + p.budgetCr, 0).toFixed(1)
  const totalSpend = +programs.reduce((s, p) => s + p.spendCr, 0).toFixed(1)
  const health = { Green: programs.filter((p) => p.status === 'Green').length, Amber: programs.filter((p) => p.status === 'Amber').length, Red: programs.filter((p) => p.status === 'Red').length }
  const healthTone = health.Red > 0 ? 'red' : health.Amber > 0 ? 'amber' : 'green'
  const benefitOf = (name: string) => benefitsC.items.find((b) => b.program === name)
  const benefitTotal = (b?: ProgramBenefit) => (b ? +(b.costSavingsCr + b.productivityCr + b.qualityCr + b.timeToMarketCr).toFixed(1) : 0)

  const [progEdit, setProgEdit] = useState<Program | null>(null)
  const [initEdit, setInitEdit] = useState<PortfolioInitiative | null>(null)
  const [benEdit, setBenEdit] = useState<ProgramBenefit | null>(null)
  const [invEdit, setInvEdit] = useState<InvestmentYear | null>(null)
  const newProgram = (): Program => ({ id: uid('pg'), name: '', location: '', region: 'India', type: 'GCC Build', owner: '', sponsor: '', phase: 'Design', progress: 0, budgetCr: 0, spendCr: 0, headcountTarget: 0, headcountCurrent: 0, status: 'Green', start: '2027-01-01', end: '2028-12-31', description: '', phasePlan: { Design: ['2027-01-01', '2027-06-30'] } })
  const newInitiative = (): PortfolioInitiative => ({ id: uid('pi'), code: `IN-${String(initC.items.length + 1).padStart(3, '0')}`, name: '', program: selected, type: 'Transformation', workstream: 'Program Management', owner: '', status: 'Not Started', progress: 0, benefitCr: 0, due: '2027-03-31' })

  return (
    <div>
      <PageHeader title="Transformation Portfolio" subtitle="Portfolio view of GCC programs, initiatives and transformation outcomes across geographies." viewLabel="Region" viewValue={region} viewOptions={REGIONS} onView={setRegion} />

      <div className="grid grid-cols-5 gap-4 mb-4">
        <KpiTile tone="blue" icon={<Layers size={22} />} value={programs.length} label="Programs in Portfolio" sub={<>{programs.filter((p) => p.type === 'GCC Build').length} GCC builds · {programs.filter((p) => p.type !== 'GCC Build').length} transformation</>} />
        <KpiTile tone="navy" icon={<Wallet size={22} className="text-brand-600" />} value={fmt(totalBudget)} label="Total Portfolio Budget" sub={<>across {programs.length} programs</>} />
        <KpiTile tone="navy" icon={<Receipt size={22} className="text-red-500" />} value={fmt(totalSpend)} label="Portfolio Spend" sub={<><b>{pct(totalSpend, totalBudget)}%</b> of budget consumed</>} />
        <KpiTile tone="violet" icon={<Rocket size={22} />} value={initiatives.length} label="Initiatives" sub={<><span className="text-amber-600">{initiatives.filter((i) => i.status === 'At Risk').length} At Risk</span> | <span className="text-red-600">{initiatives.filter((i) => i.status === 'Delayed').length} Delayed</span></>} />
        <KpiTile tone={healthTone} icon={<HeartPulse size={22} />} value={<>{health.Green}<span className="text-[13px] text-ink-500 font-semibold mx-1">G</span>{health.Amber}<span className="text-[13px] text-ink-500 font-semibold mx-1">A</span>{health.Red}<span className="text-[13px] text-ink-500 font-semibold ml-1">R</span></>} label="Portfolio Health" sub={<><span className="text-green-600">{health.Green} Green</span> | <span className="text-amber-600">{health.Amber} Amber</span> | <span className="text-red-600">{health.Red} Red</span></>} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-4" />

      {/* ============================ OVERVIEW ============================ */}
      {tab === 'Portfolio Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-4">
            {programs.map((p) => {
              const sel = p.name === selected
              return (
                <div key={p.id} className={`card p-4 cursor-pointer transition-shadow hover:shadow-md ${sel ? 'ring-2 ring-brand-600 border-brand-600' : ''}`} onClick={() => setProgram(p.name)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0"><div className="text-[13.5px] font-semibold text-ink-900 truncate">{p.name}</div><div className="text-[11.5px] text-ink-500 inline-flex items-center gap-1"><MapPin size={11} />{p.location}</div></div>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: RAG_COLORS[p.status] }} title={p.status} />
                  </div>
                  <div className="flex items-center gap-1.5 mb-2.5"><span className="px-2 py-0.5 rounded-md text-[11px] font-medium text-white" style={{ background: PHASE_COLORS[p.phase], color: p.phase === 'Design' ? '#1E5BBE' : '#fff' }}>{p.phase}</span><span className="text-[11px] text-ink-500">{p.type}</span></div>
                  <div className="flex items-center gap-2"><Progress value={p.progress} className="flex-1" color={colorOf(p.name)} /><span className="text-[12px] font-semibold w-9 text-right">{p.progress}%</span></div>
                  <div className="grid grid-cols-2 gap-1 mt-2.5 text-[11.5px]"><span className="text-ink-500">Budget</span><span className="text-right font-medium">{fmt(p.budgetCr)}</span><span className="text-ink-500">Spend</span><span className="text-right font-medium">{fmt(p.spendCr)}</span>{p.headcountTarget > 0 && <><span className="text-ink-500">FTE</span><span className="text-right font-medium">{p.headcountCurrent} / {p.headcountTarget}</span></>}{p.goLive && <><span className="text-ink-500">Go-live</span><span className="text-right font-medium">{fmtDateShort(p.goLive)}</span></>}</div>
                  {sel && <div className="mt-2 text-[10.5px] text-brand-600 font-medium">Selected program</div>}
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-[1.5fr_1fr] gap-4">
            <Card title="Portfolio Timeline" subtitle="Phase bars by program, 2026 – 2028" headerRight={<Legend items={PROGRAM_PHASES.map((ph) => ({ label: ph, color: PHASE_COLORS[ph] }))} />} action={<ViewAll label="Roadmap" onClick={() => setTab('Roadmap')} />}>
              <Timeline programs={programs} selected={selected} onSelect={(p) => setProgram(p.name)} />
            </Card>
            <Card title={`Budget vs Spend by Program (${money.unitLabel})`} headerRight={<Legend items={[{ label: 'Budget', color: CHART_COLORS.blueFaint }, { label: 'Spend', color: CHART_COLORS.blue }]} />}>
              <div className="h-[230px]">
                <ResponsiveContainer>
                  <BarChart data={programs.map((p) => ({ name: shortName(p.name), Budget: disp(p.budgetCr), Spend: disp(p.spendCr) }))} margin={{ top: 14, right: 4, left: -24, bottom: 0 }} barGap={2} barCategoryGap="25%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={<WrapTick />} height={32} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`${money.symbol} ${v} ${money.unit}`]} />
                    <Bar isAnimationActive={false} dataKey="Budget" fill={CHART_COLORS.blueFaint} radius={[3, 3, 0, 0]}><LabelList dataKey="Budget" position="top" style={{ fontSize: 10.5, fill: '#374151' }} /></Bar>
                    <Bar isAnimationActive={false} dataKey="Spend" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]}><LabelList dataKey="Spend" position="top" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-[0.85fr_2fr] gap-4">
            <Card title="Portfolio Health">
              <div className="flex items-center gap-4">
                <Donut size={150} inner={0.7} data={[{ name: 'Green', value: health.Green, color: RAG_COLORS.Green }, { name: 'Amber', value: health.Amber, color: RAG_COLORS.Amber }, { name: 'Red', value: health.Red, color: RAG_COLORS.Red }]}
                  center={<><div className="text-[24px] font-bold text-ink-900 leading-none">{programs.length}</div><div className="text-[11px] text-ink-500 mt-1">Programs</div></>} />
                <div className="flex-1 space-y-2">
                  {(['Green', 'Amber', 'Red'] as Rag[]).map((r) => (
                    <div key={r}>
                      <div className="flex items-center justify-between text-[12.5px]"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: RAG_COLORS[r] }} />{r}</span><b>{health[r]}</b></div>
                      <div className="text-[11px] text-ink-500 pl-4 truncate">{programs.filter((p) => p.status === r).map((p) => shortName(p.name)).join(', ') || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-line">
                <Stat label="Average progress" value={`${Math.round(programs.reduce((s, p) => s + p.progress, 0) / Math.max(1, programs.length))}%`} />
                <Stat label="Headcount (current / target)" value={`${programs.reduce((s, p) => s + p.headcountCurrent, 0)} / ${programs.reduce((s, p) => s + p.headcountTarget, 0)}`} />
                <Stat label="Initiatives on track" value={`${initiatives.filter((i) => i.status === 'On Track' || i.status === 'Completed').length} of ${initiatives.length}`} />
              </div>
            </Card>
            <Card title="Top Initiatives" subtitle="Highest benefit initiatives across the portfolio" action={<ViewAll onClick={() => setTab('Initiatives')} />}>
              <Table<PortfolioInitiative> compact rows={[...initiatives].sort((a, b) => b.benefitCr - a.benefitCr).slice(0, 7)} onRowClick={setInitEdit} columns={[
                { key: 'name', header: 'Initiative', render: (i) => <span className="font-medium block max-w-[230px] truncate" title={i.name}>{i.name}</span> },
                { key: 'program', header: 'Program', render: (i) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="w-2 h-2 rounded-full" style={{ background: colorOf(i.program) }} />{shortName(i.program)}</span> },
                { key: 'type', header: 'Type' },
                { key: 'progress', header: 'Progress', render: (i) => <div className="flex items-center gap-2 w-[96px]"><Progress value={i.progress} className="flex-1" /><span className="text-[11.5px] w-8 text-right">{i.progress}%</span></div> },
                { key: 'benefitCr', header: 'Benefit', render: (i) => i.benefitCr ? fmt(i.benefitCr) : '—', className: 'text-right whitespace-nowrap' },
                { key: 'status', header: 'Status', render: (i) => <Badge value={i.status} /> },
              ]} />
            </Card>
          </div>
        </div>
      )}

      {/* ============================ PROGRAMS ============================ */}
      {tab === 'Programs' && (
        <Card title="Programs" subtitle={`${programs.length} programs · ${fmt(totalBudget)} budget · ${fmt(totalSpend)} spend · click a row to edit`} action={<button className="btn-primary" onClick={() => setProgEdit(newProgram())}><Plus size={14} /> Add Program</button>}>
          <Table<Program> rows={programs} onRowClick={setProgEdit} columns={[
            { key: 'name', header: 'Program', render: (p) => <div className="flex items-center gap-2"><span className="w-2 h-7 rounded-full shrink-0" style={{ background: colorOf(p.name) }} /><div><div className={`font-medium ${p.name === selected ? 'text-brand-600' : ''}`}>{p.name}</div><div className="text-[11.5px] text-ink-500">{p.type} · {p.location}</div></div></div> },
            { key: 'owner', header: 'Owner' },
            { key: 'sponsor', header: 'Sponsor' },
            { key: 'phase', header: 'Phase', render: (p) => <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: PHASE_COLORS[p.phase], color: p.phase === 'Design' ? '#1E5BBE' : '#fff' }}>{p.phase}</span> },
            { key: 'progress', header: 'Progress', render: (p) => <div className="flex items-center gap-2 w-[120px]"><Progress value={p.progress} className="flex-1" color={colorOf(p.name)} /><span className="text-[11.5px] w-8 text-right">{p.progress}%</span></div> },
            { key: 'budgetCr', header: 'Budget', render: (p) => fmt(p.budgetCr), className: 'text-right' },
            { key: 'spendCr', header: 'Spend', render: (p) => <span>{fmt(p.spendCr)} <span className="text-ink-500 text-[11px]">({pct(p.spendCr, p.budgetCr)}%)</span></span>, className: 'text-right' },
            { key: 'headcount', header: 'Headcount', render: (p) => p.headcountTarget ? `${p.headcountCurrent} / ${p.headcountTarget}` : '—', className: 'text-right' },
            { key: 'start', header: 'Start', render: (p) => fmtDateShort(p.start) },
            { key: 'end', header: 'End', render: (p) => fmtDateShort(p.end) },
            { key: 'goLive', header: 'Go-live', render: (p) => p.goLive ? fmtDate(p.goLive) : '—' },
            { key: 'status', header: 'Status', render: (p) => <Badge value={p.status} /> },
            { key: 'x', header: '', render: (p) => p.name !== selected ? <button className="link" onClick={(e) => { e.stopPropagation(); setProgram(p.name) }}>Select</button> : <span className="text-[11.5px] text-ink-500">Selected</span> },
          ]} />
        </Card>
      )}

      {/* ============================ INITIATIVES ============================ */}
      {tab === 'Initiatives' && <Initiatives initiatives={initiatives} programs={programs} selected={selected} onEdit={setInitEdit} onAdd={() => setInitEdit(newInitiative())} />}

      {/* ============================ ROADMAP ============================ */}
      {tab === 'Roadmap' && (
        <div className="space-y-4">
          <Card title="Portfolio Roadmap 2026 – 2028" subtitle="Program phases by quarter · click a program to edit its phase plan" headerRight={<Legend items={PROGRAM_PHASES.map((ph) => ({ label: ph, color: PHASE_COLORS[ph] }))} />}>
            <Roadmap programs={programs} selected={selected} onSelect={setProgEdit} />
          </Card>
          <div className="grid grid-cols-3 gap-4">
            {[2026, 2027, 2028].map((y) => (
              <Card key={y} title={`${y} Key Milestones`}>
                <div className="space-y-2">
                  {yearMilestones(programs, y).map((m, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-[12.5px]">
                      <span className="w-[62px] text-ink-500 text-[11.5px] shrink-0">{fmtDateShort(m.date)}</span>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.ph === 'Go-live' ? CHART_COLORS.red : PHASE_COLORS[m.ph] }} />
                      <span className="truncate"><b>{shortName(m.p.name)}</b> · {m.ph === 'Go-live' ? 'Go-live' : `${m.ph} complete`}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ============================ BENEFITS BY PROGRAM ============================ */}
      {tab === 'Benefits by Program' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1.4fr_1fr] gap-4">
            <Card title={`Target Benefits by Program (${money.unitLabel})`} subtitle="Annual target by benefit area" headerRight={<Legend items={[{ label: 'Cost Savings', color: CHART_COLORS.blue }, { label: 'Productivity', color: CHART_COLORS.teal }, { label: 'Quality & Efficiency', color: CHART_COLORS.violet }, { label: 'Time to Market', color: CHART_COLORS.amber }]} />}>
              <div className="h-[260px]">
                <ResponsiveContainer>
                  <BarChart data={programs.map((p) => { const b = benefitOf(p.name); return { name: shortName(p.name), 'Cost Savings': disp(b?.costSavingsCr ?? 0), Productivity: disp(b?.productivityCr ?? 0), 'Quality & Efficiency': disp(b?.qualityCr ?? 0), 'Time to Market': disp(b?.timeToMarketCr ?? 0), total: disp(benefitTotal(b)) } })} margin={{ top: 16, right: 4, left: -24, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={<WrapTick />} height={32} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`${money.symbol} ${v} ${money.unit}`]} />
                    <Bar isAnimationActive={false} dataKey="Cost Savings" stackId="b" fill={CHART_COLORS.blue} />
                    <Bar isAnimationActive={false} dataKey="Productivity" stackId="b" fill={CHART_COLORS.teal} />
                    <Bar isAnimationActive={false} dataKey="Quality & Efficiency" stackId="b" fill={CHART_COLORS.violet} />
                    <Bar isAnimationActive={false} dataKey="Time to Market" stackId="b" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]}><LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Portfolio Benefits Summary">
              {(() => {
                const list = programs.map((p) => benefitOf(p.name)).filter(Boolean) as ProgramBenefit[]
                const tot = +list.reduce((s, b) => s + benefitTotal(b), 0).toFixed(1), real = +list.reduce((s, b) => s + b.realizedCr, 0).toFixed(1)
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 rounded-lg bg-surface"><div className="text-[11.5px] text-ink-500">Target benefits (annual)</div><div className="text-[22px] font-bold text-ink-900">{fmt(tot)}</div></div>
                      <div className="p-3 rounded-lg bg-green-50"><div className="text-[11.5px] text-ink-500">Realized to date</div><div className="text-[22px] font-bold text-green-700">{fmt(real)}</div><div className="text-[11px] text-ink-500">{pct(real, tot)}% of target</div></div>
                    </div>
                    <Stat label="Cost Savings" value={fmt(+list.reduce((s, b) => s + b.costSavingsCr, 0).toFixed(1))} />
                    <Stat label="Productivity Gains" value={fmt(+list.reduce((s, b) => s + b.productivityCr, 0).toFixed(1))} />
                    <Stat label="Quality & Efficiency" value={fmt(+list.reduce((s, b) => s + b.qualityCr, 0).toFixed(1))} />
                    <Stat label="Time to Market" value={fmt(+list.reduce((s, b) => s + b.timeToMarketCr, 0).toFixed(1))} />
                    <Stat label={`Benefit per ${money.symbol} invested`} value={`${(tot / Math.max(0.1, totalBudget)).toFixed(1)}x`} />
                    <button className="link mt-2 inline-flex items-center gap-1" onClick={() => nav('/value')}>Open Value Realization →</button>
                  </>
                )
              })()}
            </Card>
          </div>
          <Card title="Benefits by Program" subtitle="Annual target benefits by area and realized to date · click a row to edit">
            <Table<ProgramBenefit> rows={programs.map((p) => benefitOf(p.name) ?? { id: `pb-${p.id}`, program: p.name, costSavingsCr: 0, productivityCr: 0, qualityCr: 0, timeToMarketCr: 0, realizedCr: 0 })} onRowClick={setBenEdit} columns={[
              { key: 'program', header: 'Program', render: (b) => <span className={`font-medium inline-flex items-center gap-2 ${b.program === selected ? 'text-brand-600' : ''}`}><span className="w-2 h-2 rounded-full" style={{ background: colorOf(b.program) }} />{b.program}</span> },
              { key: 'costSavingsCr', header: 'Cost Savings', render: (b) => fmt(b.costSavingsCr), className: 'text-right' },
              { key: 'productivityCr', header: 'Productivity', render: (b) => fmt(b.productivityCr), className: 'text-right' },
              { key: 'qualityCr', header: 'Quality & Efficiency', render: (b) => fmt(b.qualityCr), className: 'text-right' },
              { key: 'timeToMarketCr', header: 'Time to Market', render: (b) => fmt(b.timeToMarketCr), className: 'text-right' },
              { key: 'total', header: 'Total Target', render: (b) => <b>{fmt(benefitTotal(b))}</b>, className: 'text-right' },
              { key: 'realizedCr', header: 'Realized', render: (b) => <span className="text-green-700 font-medium">{fmt(b.realizedCr)}</span>, className: 'text-right' },
              { key: 'att', header: 'Attainment', render: (b) => <div className="flex items-center gap-2 w-[140px]"><Progress value={pct(b.realizedCr, benefitTotal(b))} className="flex-1" color={CHART_COLORS.green} /><span className="text-[11.5px] w-8 text-right">{pct(b.realizedCr, benefitTotal(b))}%</span></div> },
            ]} />
          </Card>
        </div>
      )}

      {/* ============================ CAPACITY & INVESTMENT ============================ */}
      {tab === 'Capacity & Investment' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1.3fr_1fr] gap-4">
            <Card title={`Investment by Year (${money.unitLabel})`} subtitle="Planned spend per program · click a bar segment's program in the table to edit" headerRight={<Legend items={programs.map((p) => ({ label: shortName(p.name), color: colorOf(p.name) }))} />}>
              <div className="h-[250px]">
                <ResponsiveContainer>
                  <BarChart data={(['y2026', 'y2027', 'y2028'] as const).map((y) => { const row: Record<string, number | string> = { year: y.slice(1) }; let t = 0; programs.forEach((p) => { const v = disp(investC.items.find((i) => i.program === p.name)?.[y] ?? 0); row[p.name] = v; t += v }); row.total = +t.toFixed(money.digits); return row })} margin={{ top: 16, right: 4, left: -24, bottom: 0 }} barCategoryGap="35%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v) => [`${money.symbol} ${v} ${money.unit}`]} />
                    {programs.map((p, i) => <Bar isAnimationActive={false} key={p.id} dataKey={p.name} stackId="inv" fill={colorOf(p.name)} radius={i === programs.length - 1 ? [4, 4, 0, 0] : undefined}>{i === programs.length - 1 && <LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} />}</Bar>)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Headcount by Program" subtitle="Current vs target FTE" headerRight={<Legend items={[{ label: 'Current', color: CHART_COLORS.blue }, { label: 'Target', color: CHART_COLORS.blueFaint }]} />}>
              <div className="h-[250px]">
                <ResponsiveContainer>
                  <BarChart layout="vertical" data={programs.filter((p) => p.headcountTarget > 0).map((p) => ({ name: shortName(p.name), Current: p.headcountCurrent, Target: p.headcountTarget }))} margin={{ top: 4, right: 36, left: 10, bottom: 0 }} barGap={2} barCategoryGap="28%">
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={80} tick={{ fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                    <Bar isAnimationActive={false} dataKey="Target" fill={CHART_COLORS.blueFaint} radius={[0, 3, 3, 0]}><LabelList dataKey="Target" position="right" style={{ fontSize: 10.5, fill: '#6B7280' }} /></Bar>
                    <Bar isAnimationActive={false} dataKey="Current" fill={CHART_COLORS.blue} radius={[0, 3, 3, 0]}><LabelList dataKey="Current" position="right" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <div className="grid grid-cols-[1.3fr_1fr] gap-4">
            <Card title={`Investment Plan by Program (${money.unitLabel})`} subtitle="Click a row to edit yearly investment">
              <Table<InvestmentYear> rows={programs.map((p) => investC.items.find((i) => i.program === p.name) ?? { id: `iv-${p.id}`, program: p.name, y2026: 0, y2027: 0, y2028: 0 })} onRowClick={setInvEdit} columns={[
                { key: 'program', header: 'Program', render: (r) => <span className="font-medium inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: colorOf(r.program) }} />{r.program}</span> },
                { key: 'y2026', header: '2026', render: (r) => money.num(r.y2026), className: 'text-right' },
                { key: 'y2027', header: '2027', render: (r) => money.num(r.y2027), className: 'text-right' },
                { key: 'y2028', header: '2028', render: (r) => money.num(r.y2028), className: 'text-right' },
                { key: 'total', header: 'Total', render: (r) => <b>{money.num(r.y2026 + r.y2027 + r.y2028)}</b>, className: 'text-right' },
                { key: 'budget', header: 'Approved Budget', render: (r) => fmt(programs.find((p) => p.name === r.program)?.budgetCr ?? 0), className: 'text-right' },
                { key: 'var', header: 'Plan vs Budget', render: (r) => { const b = programs.find((p) => p.name === r.program)?.budgetCr ?? 0; const diff = +(r.y2026 + r.y2027 + r.y2028 - b).toFixed(2); return <span className={diff > 0 ? 'text-red-600' : 'text-green-700'}>{money.signed(diff)}</span> }, className: 'text-right' },
              ]} />
            </Card>
            <Card title="Capacity Summary">
              <div className="h-[150px] mb-2">
                <ResponsiveContainer>
                  <BarChart data={programs.map((p) => ({ name: shortName(p.name), Initiatives: initiatives.filter((i) => i.program === p.name).length, fill: colorOf(p.name) }))} margin={{ top: 14, right: 4, left: -28, bottom: 0 }} barCategoryGap="35%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={<WrapTick />} height={32} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} />
                    <Bar isAnimationActive={false} dataKey="Initiatives" radius={[3, 3, 0, 0]}>{programs.map((p) => <Cell key={p.id} fill={colorOf(p.name)} />)}<LabelList dataKey="Initiatives" position="top" style={{ fontSize: 10.5, fill: '#111827', fontWeight: 600 }} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Stat label="Total headcount target" value={programs.reduce((s, p) => s + p.headcountTarget, 0)} />
              <Stat label="Onboarded to date" value={`${programs.reduce((s, p) => s + p.headcountCurrent, 0)} (${pct(programs.reduce((s, p) => s + p.headcountCurrent, 0), programs.reduce((s, p) => s + p.headcountTarget, 0))}%)`} />
              <Stat label="3-year investment plan" value={fmt(+investC.items.filter((i) => names.includes(i.program)).reduce((s, i) => s + i.y2026 + i.y2027 + i.y2028, 0).toFixed(1))} />
              <Stat label="Active initiatives" value={initiatives.filter((i) => i.status !== 'Completed').length} />
            </Card>
          </div>
        </div>
      )}

      {/* ============================ MODALS ============================ */}
      {progEdit && <ProgramModal key={progEdit.id} value={progEdit} isNew={!programsC.items.some((p) => p.id === progEdit.id)} onClose={() => setProgEdit(null)} onSave={(v) => { programsC.update(v); setProgEdit(null) }} onDelete={() => { programsC.remove(progEdit.id); setProgEdit(null) }} />}
      {initEdit && <InitiativeModal key={initEdit.id} value={initEdit} programs={programsC.items.map((p) => p.name)} isNew={!initC.items.some((i) => i.id === initEdit.id)} onClose={() => setInitEdit(null)} onSave={(v) => { initC.update(v); setInitEdit(null) }} onDelete={() => { initC.remove(initEdit.id); setInitEdit(null) }} />}
      {benEdit && <BenefitModal key={benEdit.id} value={benEdit} onClose={() => setBenEdit(null)} onSave={(v) => { benefitsC.update(v); setBenEdit(null) }} />}
      {invEdit && <InvestmentModal key={invEdit.id} value={invEdit} onClose={() => setInvEdit(null)} onSave={(v) => { investC.update(v); setInvEdit(null) }} />}
    </div>
  )
}

type YearMilestone = { p: Program; ph: ProgramPhase | 'Go-live'; date: string }
function yearMilestones(programs: Program[], y: number): YearMilestone[] {
  const out: YearMilestone[] = []
  for (const p of programs) {
    for (const [ph, r] of Object.entries(p.phasePlan) as [ProgramPhase, [string, string] | undefined][]) if (r && r[1].startsWith(String(y))) out.push({ p, ph, date: r[1] })
    if (p.goLive && p.goLive.startsWith(String(y))) out.push({ p, ph: 'Go-live', date: p.goLive })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

function WrapTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const words = String(payload?.value ?? '').split(' ')
  const lines = words.length > 1 ? [words[0], words.slice(1).join(' ')] : [words[0]]
  return (
    <text x={x} y={y} textAnchor="middle" fill="#6B7280" fontSize={10.5}>
      {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 12 : 12}>{l}</tspan>)}
    </text>
  )
}

function shortName(n: string) { return n.replace('GCC Program - ', '').replace('Shared Services Consolidation', 'Shared Services').replace('Digital Workplace Rollout', 'Digital Workplace') }

/* ---------------- Timeline (overview) ---------------- */
function Timeline({ programs, selected, onSelect }: { programs: Program[]; selected: string; onSelect: (p: Program) => void }) {
  const years = [2026, 2027, 2028]
  const today = xPct('2026-10-20')
  return (
    <div>
      <div className="grid text-[11px] text-ink-500 mb-1" style={{ gridTemplateColumns: '150px 1fr' }}><span /><div className="grid grid-cols-3">{years.map((y) => <span key={y} className="text-center border-l border-line">{y}</span>)}</div></div>
      <div className="space-y-2 relative">
        {programs.map((p) => (
          <div key={p.id} className="grid items-center" style={{ gridTemplateColumns: '150px 1fr' }}>
            <button className={`text-left text-[12.5px] truncate pr-2 cursor-pointer ${p.name === selected ? 'text-brand-600 font-semibold' : 'text-ink-700'}`} onClick={() => onSelect(p)}>{shortName(p.name)}</button>
            <div className="relative h-6 bg-surface rounded-md overflow-hidden">
              {years.map((y) => <span key={y} className="absolute top-0 bottom-0 border-l border-line" style={{ left: `${xPct(`${y}-01-01`)}%` }} />)}
              {Object.entries(p.phasePlan).map(([ph, r]) => r && (
                <div key={ph} className="absolute top-1 h-4 rounded-sm flex items-center justify-center text-[10px] font-medium overflow-hidden" title={`${ph}: ${fmtDateShort(r[0])} – ${fmtDateShort(r[1])}`}
                  style={{ left: `${xPct(r[0])}%`, width: `${Math.max(1, xPct(r[1]) - xPct(r[0]))}%`, background: PHASE_COLORS[ph as ProgramPhase], color: ph === 'Design' ? '#1E5BBE' : '#fff' }}>
                  {xPct(r[1]) - xPct(r[0]) > 7 ? ph : ''}
                </div>
              ))}
              {p.goLive && <span className="absolute top-0 bottom-0 w-0.5 bg-red-600" style={{ left: `${xPct(p.goLive)}%` }} title={`Go-live ${fmtDate(p.goLive)}`} />}
            </div>
          </div>
        ))}
        <span className="absolute top-0 bottom-0 border-l-2 border-dashed border-ink-400 pointer-events-none" style={{ left: `calc(150px + (100% - 150px) * ${today / 100})` }} />
      </div>
      <div className="flex items-center gap-4 mt-2 text-[11px] text-ink-500"><span className="inline-flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-ink-400" />Today</span><span className="inline-flex items-center gap-1.5"><span className="w-0.5 h-3 bg-red-600" />Go-live</span></div>
    </div>
  )
}

/* ---------------- Roadmap (quarters grid) ---------------- */
function Roadmap({ programs, selected, onSelect }: { programs: Program[]; selected: string; onSelect: (p: Program) => void }) {
  const quarters = [2026, 2027, 2028].flatMap((y) => [1, 2, 3, 4].map((q) => ({ y, q, start: `${y}-${String((q - 1) * 3 + 1).padStart(2, '0')}-01`, end: `${y}-${String(q * 3).padStart(2, '0')}-${q === 1 || q === 4 ? '31' : '30'}` })))
  const phaseAt = (p: Program, qs: string, qe: string) => (Object.entries(p.phasePlan) as [ProgramPhase, [string, string]][]).filter(([, r]) => r && r[0] <= qe && r[1] >= qs).map(([ph]) => ph)
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full border-separate border-spacing-0 tbl">
        <thead>
          <tr><th className="th" rowSpan={2}>Program</th>{[2026, 2027, 2028].map((y) => <th key={y} className="th text-center border-l border-line" colSpan={4}>{y}</th>)}</tr>
          <tr>{quarters.map((q) => <th key={`${q.y}${q.q}`} className={`th text-center text-[11px] ${q.q === 1 ? 'border-l border-line' : ''} ${q.y === 2026 && q.q === 4 ? 'bg-brand-50' : ''}`}>Q{q.q}</th>)}</tr>
        </thead>
        <tbody>
          {programs.map((p) => (
            <tr key={p.id} className="cursor-pointer hover:bg-brand-50/40" onClick={() => onSelect(p)}>
              <td className="td"><div className={`font-medium whitespace-nowrap ${p.name === selected ? 'text-brand-600' : ''}`}>{shortName(p.name)}</div><div className="text-[11px] text-ink-500">{p.owner}</div></td>
              {quarters.map((q) => {
                const phs = phaseAt(p, q.start, q.end)
                const isGoLive = p.goLive && p.goLive >= q.start && p.goLive <= q.end
                return (
                  <td key={`${q.y}${q.q}`} className={`td !px-1 ${q.q === 1 ? 'border-l border-line' : ''} ${q.y === 2026 && q.q === 4 ? 'bg-brand-50/40' : ''}`}>
                    <div className="flex flex-col gap-0.5 min-h-[28px] justify-center">
                      {phs.map((ph) => <span key={ph} className="h-[14px] rounded-sm text-[9.5px] font-medium flex items-center justify-center px-0.5 truncate" style={{ background: PHASE_COLORS[ph], color: ph === 'Design' ? '#1E5BBE' : '#fff' }}>{ph}</span>)}
                      {isGoLive && <span className="text-[9.5px] font-semibold text-red-600 text-center leading-none">▲ Go-live</span>}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------------- Initiatives tab ---------------- */
function Initiatives({ initiatives, programs, selected, onEdit, onAdd }: { initiatives: PortfolioInitiative[]; programs: Program[]; selected: string; onEdit: (i: PortfolioInitiative) => void; onAdd: () => void }) {
  const money = useMoney()
  const fmt = money.fmt
  const [program, setProgram] = useState('All Programs')
  const [status, setStatus] = useState('All')
  const [type, setType] = useState('All types')
  const [q, setQ] = useState('')
  const rows = initiatives.filter((i) => (program === 'All Programs' || i.program === program) && (status === 'All' || i.status === status) && (type === 'All types' || i.type === type) && (q === '' || `${i.code} ${i.name} ${i.owner}`.toLowerCase().includes(q.toLowerCase())))
  const byStatus = (['On Track', 'At Risk', 'Delayed', 'Completed', 'Not Started'] as const).map((s) => ({ name: s, value: initiatives.filter((i) => i.status === s).length, color: s === 'On Track' ? CHART_COLORS.green : s === 'At Risk' ? CHART_COLORS.amber : s === 'Delayed' ? CHART_COLORS.red : s === 'Completed' ? CHART_COLORS.teal : CHART_COLORS.gray }))
  return (
    <div className="space-y-4">
      <Card title="Initiative Register" subtitle={`${rows.length} of ${initiatives.length} initiatives · total benefit ${fmt(+rows.reduce((s, i) => s + i.benefitCr, 0).toFixed(1))}`} action={
        <div className="flex items-center gap-2">
          <input className="input !w-[170px] !py-1.5" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input !w-auto !py-1.5" value={program} onChange={(e) => setProgram(e.target.value)}>{['All Programs', ...programs.map((p) => p.name)].map((s) => <option key={s}>{s}</option>)}</select>
          <select className="input !w-auto !py-1.5" value={type} onChange={(e) => setType(e.target.value)}>{['All types', 'Transformation', 'Transition', 'Enablement', 'Optimization', 'Compliance'].map((s) => <option key={s}>{s}</option>)}</select>
          <select className="input !w-auto !py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>{['All', 'On Track', 'At Risk', 'Delayed', 'Completed', 'Not Started'].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn-primary" onClick={onAdd}><Plus size={14} /> Add Initiative</button>
        </div>}>
        <Table<PortfolioInitiative> rows={rows} onRowClick={onEdit} columns={[
          { key: 'code', header: 'ID', className: 'text-ink-500 whitespace-nowrap' },
          { key: 'name', header: 'Initiative', render: (i) => <span className="font-medium block min-w-[200px] max-w-[260px] truncate" title={i.name}>{i.name}</span> },
          { key: 'program', header: 'Program', render: (i) => <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${i.program === selected ? 'text-brand-600 font-medium' : ''}`}><span className="w-2 h-2 rounded-full" style={{ background: colorOf(i.program) }} />{shortName(i.program)}</span> },
          { key: 'type', header: 'Type' },
          { key: 'workstream', header: 'Workstream', render: (i) => i.workstream === 'Program Management' ? 'PMO' : WORKSTREAM_META[i.workstream as Workstream]?.short ?? i.workstream },
          { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
          { key: 'progress', header: 'Progress', render: (i) => <div className="flex items-center gap-2 w-[96px]"><Progress value={i.progress} className="flex-1" /><span className="text-[11.5px] w-8 text-right">{i.progress}%</span></div> },
          { key: 'benefitCr', header: 'Benefit', render: (i) => i.benefitCr ? fmt(i.benefitCr) : '—', className: 'text-right whitespace-nowrap' },
          { key: 'due', header: 'Due', className: 'whitespace-nowrap', render: (i) => fmtDate(i.due) },
          { key: 'status', header: 'Status', render: (i) => <Badge value={i.status} /> },
        ]} />
      </Card>
      <div className="grid grid-cols-3 gap-4">
        <Card title="Initiatives by Status">
          <div className="flex items-center gap-4">
            <Donut size={130} data={byStatus.filter((s) => s.value > 0)} center={<><div className="text-[22px] font-bold text-ink-900 leading-none">{initiatives.length}</div><div className="text-[11px] text-ink-500 mt-1">Initiatives</div></>} />
            <div className="flex-1 space-y-1">{byStatus.map((s) => <div key={s.name} className="flex items-center justify-between text-[12.5px]"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span><b>{s.value}</b></div>)}</div>
          </div>
        </Card>
        <Card title="By Type">
          {(['Transformation', 'Transition', 'Enablement', 'Optimization', 'Compliance'] as const).map((t) => <Stat key={t} label={t} value={<>{initiatives.filter((i) => i.type === t).length} · {fmt(+initiatives.filter((i) => i.type === t).reduce((s, i) => s + i.benefitCr, 0).toFixed(1))}</>} />)}
        </Card>
        <Card title="By Program">
          {programs.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[12.5px] py-1">
              <span className={`inline-flex items-center gap-2 ${p.name === selected ? 'text-brand-600 font-medium' : 'text-ink-500'}`}><span className="w-2 h-2 rounded-full" style={{ background: colorOf(p.name) }} />{shortName(p.name)}</span>
              <span className="font-medium text-ink-900">{initiatives.filter((i) => i.program === p.name).length} · <span className="text-amber-600">{initiatives.filter((i) => i.program === p.name && (i.status === 'At Risk' || i.status === 'Delayed')).length} at risk</span></span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

/* ---------------- Modals ---------------- */
function ProgramModal({ value, isNew, onClose, onSave, onDelete }: { value: Program; isNew: boolean; onClose: () => void; onSave: (v: Program) => void; onDelete: () => void }) {
  const money = useMoney()
  const { f, setF, s, n, c } = useForm(value, money)
  const setPhaseRange = (ph: ProgramPhase, idx: 0 | 1, v: string) => {
    const cur = f.phasePlan[ph] ?? ['', '']
    const next: [string, string] = idx === 0 ? [v, cur[1]] : [cur[0], v]
    const plan = { ...f.phasePlan }
    if (!next[0] && !next[1]) delete plan[ph]; else plan[ph] = next
    setF({ ...f, phasePlan: plan })
  }
  return (
    <Modal open width="max-w-3xl" title={isNew ? 'Add program' : `Edit ${f.name}`} onClose={onClose} footer={<Footer isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="Program name" className="col-span-2"><Input value={f.name} onChange={s('name')} /></Field>
        <Field label="Type"><Select options={['GCC Build', 'Consolidation', 'Digital']} value={f.type} onChange={s('type')} /></Field>
        <Field label="Location"><Input value={f.location} onChange={s('location')} /></Field>
        <Field label="Region"><Select options={['India', 'Europe', 'APAC', 'Global']} value={f.region} onChange={s('region')} /></Field>
        <Field label="Status (RAG)"><Select options={['Green', 'Amber', 'Red']} value={f.status} onChange={s('status')} /></Field>
        <Field label="Owner"><Input value={f.owner} onChange={s('owner')} /></Field>
        <Field label="Sponsor"><Input value={f.sponsor} onChange={s('sponsor')} /></Field>
        <Field label="Current phase"><Select options={PROGRAM_PHASES} value={f.phase} onChange={s('phase')} /></Field>
        <Field label="Progress %"><Input type="number" value={f.progress} onChange={n('progress')} /></Field>
        <Field label={`Budget (${money.unitLabel})`}><Input {...c('budgetCr')} /></Field>
        <Field label={`Spend (${money.unitLabel})`}><Input {...c('spendCr')} /></Field>
        <Field label="Headcount target"><Input type="number" value={f.headcountTarget} onChange={n('headcountTarget')} /></Field>
        <Field label="Headcount current"><Input type="number" value={f.headcountCurrent} onChange={n('headcountCurrent')} /></Field>
        <Field label="Go-live"><Input type="date" value={f.goLive ?? ''} onChange={(e) => setF({ ...f, goLive: e.target.value || undefined })} /></Field>
        <Field label="Start"><Input type="date" value={f.start} onChange={s('start')} /></Field>
        <Field label="End"><Input type="date" value={f.end} onChange={s('end')} /></Field>
        <Field label="Description" className="col-span-3"><TextArea value={f.description} onChange={s('description')} /></Field>
      </FormGrid>
      <div className="flex items-center justify-between mt-4 mb-2"><h4 className="text-[13px] font-semibold text-ink-900 inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-brand-600" /> Phase plan (roadmap)</h4><span className="text-[11.5px] text-ink-500">Leave both dates empty to exclude a phase</span></div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-2">
        {PROGRAM_PHASES.map((ph) => (
          <div key={ph} className="flex items-center gap-2 text-[12px]">
            <span className="w-[72px] inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: PHASE_COLORS[ph] }} />{ph}</span>
            <input type="date" className="input !py-1 !px-2 text-[11.5px]" value={f.phasePlan[ph]?.[0] ?? ''} onChange={(e) => setPhaseRange(ph, 0, e.target.value)} />
            <input type="date" className="input !py-1 !px-2 text-[11.5px]" value={f.phasePlan[ph]?.[1] ?? ''} onChange={(e) => setPhaseRange(ph, 1, e.target.value)} />
          </div>
        ))}
      </div>
    </Modal>
  )
}

function InitiativeModal({ value, programs, isNew, onClose, onSave, onDelete }: { value: PortfolioInitiative; programs: string[]; isNew: boolean; onClose: () => void; onSave: (v: PortfolioInitiative) => void; onDelete: () => void }) {
  const money = useMoney()
  const { f, s, n, c } = useForm(value, money)
  return (
    <Modal open title={isNew ? 'Add initiative' : `Edit ${f.code}`} onClose={onClose} footer={<Footer isNew={isNew} onClose={onClose} onSave={() => onSave(f)} onDelete={onDelete} />}>
      <FormGrid cols={3}>
        <Field label="ID"><Input value={f.code} onChange={s('code')} /></Field>
        <Field label="Initiative" className="col-span-2"><Input value={f.name} onChange={s('name')} /></Field>
        <Field label="Program"><Select options={programs} value={f.program} onChange={s('program')} /></Field>
        <Field label="Type"><Select options={['Transformation', 'Transition', 'Enablement', 'Optimization', 'Compliance']} value={f.type} onChange={s('type')} /></Field>
        <Field label="Workstream"><Select options={WS_OPTIONS} value={f.workstream} onChange={s('workstream')} /></Field>
        <Field label="Owner"><Input value={f.owner} onChange={s('owner')} /></Field>
        <Field label="Status"><Select options={['On Track', 'At Risk', 'Delayed', 'Completed', 'Not Started']} value={f.status} onChange={s('status')} /></Field>
        <Field label="Progress %"><Input type="number" value={f.progress} onChange={n('progress')} /></Field>
        <Field label={`Benefit (${money.unitLabel}, annual)`}><Input {...c('benefitCr')} /></Field>
        <Field label="Due"><Input type="date" value={f.due} onChange={s('due')} /></Field>
      </FormGrid>
    </Modal>
  )
}

function BenefitModal({ value, onClose, onSave }: { value: ProgramBenefit; onClose: () => void; onSave: (v: ProgramBenefit) => void }) {
  const money = useMoney()
  const { f, c } = useForm(value, money)
  return (
    <Modal open title={`Benefits – ${f.program}`} onClose={onClose} footer={<Footer isNew onClose={onClose} onSave={() => onSave(f)} />}>
      <FormGrid cols={2}>
        <Field label={`Cost Savings (${money.unitLabel})`}><Input {...c('costSavingsCr')} /></Field>
        <Field label={`Productivity Gains (${money.unitLabel})`}><Input {...c('productivityCr')} /></Field>
        <Field label={`Quality & Efficiency (${money.unitLabel})`}><Input {...c('qualityCr')} /></Field>
        <Field label={`Time to Market (${money.unitLabel})`}><Input {...c('timeToMarketCr')} /></Field>
        <Field label={`Realized to date (${money.unitLabel})`}><Input {...c('realizedCr')} /></Field>
      </FormGrid>
    </Modal>
  )
}

function InvestmentModal({ value, onClose, onSave }: { value: InvestmentYear; onClose: () => void; onSave: (v: InvestmentYear) => void }) {
  const money = useMoney()
  const { f, c } = useForm(value, money)
  return (
    <Modal open title={`Investment plan – ${f.program}`} onClose={onClose} footer={<Footer isNew onClose={onClose} onSave={() => onSave(f)} />}>
      <FormGrid cols={3}>
        <Field label={`2026 (${money.unitLabel})`}><Input {...c('y2026')} /></Field>
        <Field label={`2027 (${money.unitLabel})`}><Input {...c('y2027')} /></Field>
        <Field label={`2028 (${money.unitLabel})`}><Input {...c('y2028')} /></Field>
      </FormGrid>
    </Modal>
  )
}

