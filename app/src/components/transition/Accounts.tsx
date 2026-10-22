/**
 * Accounts tab – register of the accounts (applications, services, business entities, platforms) onboarded to the GCC
 * through the transition projects, by business unit / project / status, with add / edit / remove and status changes.
 */
import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Plus, Pencil, Trash2, Check, Rocket, PauseCircle } from 'lucide-react'
import clsx from 'clsx'
import { Card, Table, Legend, FilterSelect, EmptyNote } from '../ui'
import { Donut, BarList, tooltipStyle } from '../charts'
import { CHART_COLORS, TODAY } from '../../data/common'
import { GBUS } from '../../data/businessUnits'
import { accountStats, isOnboarded, accountStatusColor, ACCOUNT_STATUSES, ACCOUNT_TYPES, shortBu, fmtD, type TransitionAccount, type AccountStatus } from '../../data/transition'
import { ProjectLink, WaveDot, sortWaves } from './Overview'
import type { Tx } from './types'

const Small = ({ children, onClick, tone = 'bg-brand-50 text-brand-600 hover:bg-brand-100', title }: { children: React.ReactNode; onClick: () => void; tone?: string; title?: string }) => (
  <button type="button" title={title} className={clsx('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium cursor-pointer whitespace-nowrap', tone)} onClick={(e) => { e.stopPropagation(); onClick() }}>{children}</button>
)

export function AccountsTab({ tx }: { tx: Tx }) {
  const { accounts, projects, waves, unitNames, open, openProject } = tx
  const sorted = sortWaves(waves.items)
  const [fUnit, setFUnit] = useState('All'); const [fProject, setFProject] = useState('All'); const [fStatus, setFStatus] = useState('All'); const [fType, setFType] = useState('All'); const [fGbu, setFGbu] = useState('All')
  const unitProjects = projects.items.filter((p) => fUnit === 'All' || p.businessUnit === fUnit)
  const projOptions = ['All', ...unitProjects.map((p) => p.name)]
  const projectOf = (a: TransitionAccount) => projects.items.find((p) => p.id === a.projectId)
  const rows = useMemo(() => accounts.items
    .filter((a) => (fUnit === 'All' || a.businessUnit === fUnit) && (fProject === 'All' || projectOf(a)?.name === fProject) && (fStatus === 'All' || a.status === fStatus) && (fType === 'All' || a.type === fType) && (fGbu === 'All' || a.gbu === fGbu))
    .sort((a, b) => unitNames.indexOf(a.businessUnit) - unitNames.indexOf(b.businessUnit) || (projectOf(a)?.wave ?? 9) - (projectOf(b)?.wave ?? 9) || ACCOUNT_STATUSES.indexOf(a.status) - ACCOUNT_STATUSES.indexOf(b.status) || a.plannedDate.localeCompare(b.plannedDate)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accounts.items, projects.items, unitNames, fUnit, fProject, fStatus, fType, fGbu])
  const s = accountStats(rows)
  const byUnit = unitNames.map((u) => { const list = rows.filter((a) => a.businessUnit === u); const row: Record<string, string | number> = { name: shortBu(u), unit: u, total: list.length, pct: accountStats(list).pct }; ACCOUNT_STATUSES.forEach((st) => { row[st] = list.filter((a) => a.status === st).length }); return row }).filter((r) => (r.total as number) > 0)
  const byGbu = GBUS.map((g) => ({ label: g, value: rows.filter((a) => a.gbu === g).length, onboarded: rows.filter((a) => a.gbu === g && isOnboarded(a)).length })).filter((x) => x.value > 0)
  const byType = ACCOUNT_TYPES.map((t) => ({ name: t, value: rows.filter((a) => a.type === t).length, color: [CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.violet, CHART_COLORS.amber][ACCOUNT_TYPES.indexOf(t)] }))
  const setStatus = (a: TransitionAccount, status: AccountStatus) => accounts.update({ ...a, status, onboardedDate: isOnboarded({ status } as TransitionAccount) ? a.onboardedDate || TODAY : a.onboardedDate })
  const tiles: [string, React.ReactNode, string][] = [
    ['Accounts', s.total, 'text-ink-900'], ['Onboarded', <>{s.onboarded} <span className="text-[13px] text-ink-500">({s.pct}%)</span></>, 'text-teal-700'], ['Live', s.live, 'text-green-700'], ['In KT', s.inKt, 'text-brand-600'], ['Planned', s.planned, 'text-ink-700'], ['On hold', s.onHold, 'text-amber-600'],
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <FilterSelect label="Business unit" value={fUnit} options={['All', ...unitNames]} onChange={(v) => { setFUnit(v); setFProject('All') }} />
        <FilterSelect label="Project" value={projOptions.includes(fProject) ? fProject : 'All'} options={projOptions} onChange={setFProject} />
        <FilterSelect label="Status" value={fStatus} options={['All', ...ACCOUNT_STATUSES]} onChange={setFStatus} />
        <FilterSelect label="Type" value={fType} options={['All', ...ACCOUNT_TYPES]} onChange={setFType} />
        <FilterSelect label="GBU served" value={fGbu} options={['All', ...GBUS]} onChange={setFGbu} />
        <span className="ml-auto"><button className="btn-primary" onClick={() => open({ kind: 'account', item: null, projectId: unitProjects.find((p) => p.name === fProject)?.id ?? unitProjects[0]?.id })}><Plus size={14} /> Add Account</button></span>
      </div>
      <div className="grid grid-cols-6 gap-4">
        {tiles.map(([l, v, c]) => <div key={l} className="card px-4 py-3"><div className="text-[12px] text-ink-500">{l}</div><div className={`text-[22px] font-bold ${c}`}>{v}</div></div>)}
      </div>
      <div className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-4">
        <Card title="Accounts by business unit" subtitle="Onboarding status of the accounts in each business unit">
          {byUnit.length ? (
            <>
              <Legend items={ACCOUNT_STATUSES.map((st) => ({ label: st, color: accountStatusColor[st] }))} />
              <div className="h-[220px] mt-2">
                <ResponsiveContainer>
                  <BarChart data={byUnit} margin={{ top: 18, right: 4, left: -16, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10.5 }} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10.5 }} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: '#F3F6FB' }} formatter={(v, n) => [`${v} account${v === 1 ? '' : 's'}`, String(n)]} labelFormatter={(l, p) => { const d = p?.[0]?.payload as (typeof byUnit)[number] | undefined; return d ? `${d.unit} – ${d.pct}% onboarded` : String(l) }} />
                    {ACCOUNT_STATUSES.map((st, i) => <Bar key={st} isAnimationActive={false} dataKey={st} stackId="a" fill={accountStatusColor[st]} radius={i === ACCOUNT_STATUSES.length - 1 ? [3, 3, 0, 0] : undefined}>{i === ACCOUNT_STATUSES.length - 1 && <LabelList dataKey="pct" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: '#111827', fontWeight: 600 }} />}</Bar>)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : <EmptyNote>No accounts match the filters.</EmptyNote>}
        </Card>
        <Card title="Accounts by GBU served" subtitle="Onboarded / total">
          {byGbu.length ? <BarList labelWidth={170} rows={byGbu.map((b) => ({ label: b.label, value: b.value, color: CHART_COLORS.teal, right: `${b.onboarded} / ${b.value}` }))} /> : <EmptyNote>No accounts match the filters.</EmptyNote>}
        </Card>
        <Card title="Accounts by type">
          <Donut size={140} data={byType.filter((d) => d.value > 0)} center={<><div className="text-[22px] font-bold">{s.total}</div><div className="text-[11px] text-ink-500">accounts</div></>} />
          <div className="mt-3"><Legend items={byType.map((d) => ({ label: `${d.name} (${d.value})`, color: d.color }))} /></div>
        </Card>
      </div>
      <Card title="Account register" subtitle={`${rows.length} accounts · click a row to edit · status changes write straight to the register`}>
        <Table<TransitionAccount> compact rows={rows} onRowClick={(a) => open({ kind: 'account', item: a })} empty="No accounts match the filters. Use “Add Account” to log one." columns={[
          { key: 'name', header: 'Account', render: (a) => <span className="block leading-snug min-w-[220px]"><span className="font-medium">{a.name}</span>{a.notes && <span className="block text-[10.5px] text-ink-500 truncate max-w-[300px]" title={a.notes}>{a.notes}</span>}</span> },
          { key: 'bu', header: 'Business unit', render: (a) => <span className="text-[12px] whitespace-nowrap" title={a.businessUnit}>{shortBu(a.businessUnit)}</span> },
          { key: 'project', header: 'Project', render: (a) => { const p = projectOf(a); return p ? <span className="block leading-snug min-w-[220px]"><ProjectLink project={p} onClick={() => openProject(p.id)} className="text-[12px]" /><span className="block text-[10.5px] text-ink-500 whitespace-nowrap">{p.capability} · from {p.deliveryLocation}</span></span> : <span className="text-ink-400">–</span> } },
          { key: 'wave', header: 'Wave', render: (a) => <WaveDot wave={sorted.find((w) => w.number === projectOf(a)?.wave)} size={20} /> },
          { key: 'type', header: 'Type', className: 'whitespace-nowrap', render: (a) => <span className="text-[12px]">{a.type}</span> },
          { key: 'gbu', header: 'GBU served', render: (a) => <span className="text-[12px] whitespace-nowrap">{a.gbu}</span> },
          { key: 'geo', header: 'Geography', render: (a) => <span className="text-[12px] whitespace-nowrap">{a.geography}</span> },
          { key: 'status', header: 'Status', render: (a) => (
            <select className="rounded-md border border-transparent hover:border-line bg-transparent text-[12px] font-medium px-1 py-0.5 cursor-pointer" style={{ color: a.status === 'Planned' ? '#1E5BBE' : accountStatusColor[a.status] }} value={a.status} onClick={(e) => e.stopPropagation()} onChange={(e) => setStatus(a, e.target.value as AccountStatus)}>
              {ACCOUNT_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>) },
          { key: 'planned', header: 'Planned', className: 'whitespace-nowrap', render: (a) => <span className={`text-[12px] ${a.plannedDate < TODAY && !isOnboarded(a) && a.status !== 'On hold' ? 'text-red-600 font-medium' : ''}`}>{fmtD(a.plannedDate)}</span> },
          { key: 'onboarded', header: 'Onboarded', className: 'whitespace-nowrap', render: (a) => <span className="text-[12px]">{a.onboardedDate ? fmtD(a.onboardedDate) : '—'}</span> },
          { key: 'owner', header: 'Owner', className: 'whitespace-nowrap', render: (a) => <span className="text-[12px]">{a.owner}</span> },
          { key: 'act', header: '', className: 'text-right whitespace-nowrap', render: (a) => (
            <span className="inline-flex items-center gap-1">
              {(a.status === 'Planned' || a.status === 'On hold') && <Small title="Start knowledge transfer" onClick={() => setStatus(a, 'In KT')}>Start KT</Small>}
              {a.status === 'In KT' && <Small title="Mark onboarded to the GCC" tone="bg-green-50 text-green-700 hover:bg-green-100" onClick={() => setStatus(a, 'Onboarded')}><Check size={11} /> Onboarded</Small>}
              {a.status === 'Onboarded' && <Small title="Account live from Pune" tone="bg-teal-50 text-teal-700 hover:bg-teal-100" onClick={() => setStatus(a, 'Live')}><Rocket size={11} /> Go live</Small>}
              {(a.status === 'Planned' || a.status === 'In KT') && <Small title="Put on hold" tone="bg-amber-50 text-amber-700 hover:bg-amber-100" onClick={() => setStatus(a, 'On hold')}><PauseCircle size={11} /></Small>}
              <button className="text-ink-400 hover:text-brand-600 cursor-pointer p-0.5" title="Edit" onClick={(e) => { e.stopPropagation(); open({ kind: 'account', item: a }) }}><Pencil size={12} /></button>
              <button className="text-ink-400 hover:text-red-600 cursor-pointer p-0.5" title="Remove" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Remove account “${a.name}”?`)) accounts.remove(a.id) }}><Trash2 size={12} /></button>
            </span>) },
        ]} />
      </Card>
    </div>
  )
}
