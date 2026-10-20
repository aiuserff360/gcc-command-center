import { useMemo, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Search, Filter, Plus, Download, ArrowUpDown, Flag } from 'lucide-react'
import { Table, Badge, type Column } from '../ui'
import { fmtDate } from '../../data/common'
import { isOpen, daysOpen, type RaidItem } from '../../data/shared'
import { RAID_LEVELS, RAID_STATUSES, RAID_WORKSTREAMS, downloadCsv } from '../../data/risks'

export const agingBucket = (d: number) => (d <= 7 ? '0–7 days' : d <= 30 ? '8–30 days' : '> 30 days')

/**
 * Searchable / filterable RAID register table.
 * variant 'overview' = compact first-N open rows (mock-up card); 'risk' / 'issue' / 'all' = full registers.
 */
export function RegisterTable({ items, variant, onRow, onAdd, limit, onViewAll, headerTitle }: {
  items: RaidItem[]; variant: 'overview' | 'risk' | 'issue' | 'all'; onRow: (r: RaidItem) => void; onAdd: (type: 'Risk' | 'Issue') => void
  limit?: number; onViewAll?: () => void; headerTitle?: ReactNode
}) {
  const [q, setQ] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [fType, setFType] = useState('All')
  const [fLevel, setFLevel] = useState('All')
  const [fStatus, setFStatus] = useState('All')
  const [fWs, setFWs] = useState('All')
  const [includeClosed, setIncludeClosed] = useState(false)
  const [sort, setSort] = useState<'code' | 'score' | 'due' | 'days'>(variant === 'overview' ? 'code' : 'score')

  const typeFixed = variant === 'risk' ? 'Risk' : variant === 'issue' ? 'Issue' : null
  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase()
    let list = items.filter((r) => (typeFixed ? r.type === typeFixed : fType === 'All' || r.type === fType))
    if (!includeClosed || variant === 'overview') list = list.filter(isOpen)
    if (ql) list = list.filter((r) => [r.code, r.title, r.workstream, r.owner, r.category, r.status, r.level].join(' ').toLowerCase().includes(ql))
    if (fLevel !== 'All') list = list.filter((r) => r.level === fLevel)
    if (fStatus !== 'All') list = list.filter((r) => r.status === fStatus)
    if (fWs !== 'All') list = list.filter((r) => r.workstream === fWs)
    const num = (c: string) => parseInt(c.split('-')[1] ?? '0', 10) || 0
    list = [...list].sort((a, b) => sort === 'score' ? b.impactScore - a.impactScore || num(a.code) - num(b.code) : sort === 'due' ? a.dueDate.localeCompare(b.dueDate) : sort === 'days' ? daysOpen(b) - daysOpen(a) : num(a.code) - num(b.code))
    return limit ? list.slice(0, limit) : list
  }, [items, q, fType, fLevel, fStatus, fWs, includeClosed, sort, limit, typeFixed, variant])

  const cols: Column<RaidItem>[] = [
    { key: 'code', header: 'ID', className: 'font-medium whitespace-nowrap' },
    { key: 'type', header: 'Type', render: (r) => <Badge value={r.type} /> },
    { key: 'title', header: 'Title', render: (r) => <span className={clsx('block truncate', variant === 'overview' ? '' : variant === 'risk' ? 'max-w-[250px]' : 'max-w-[330px]')} title={r.title}>{r.title}</span> },
    { key: 'workstream', header: 'Workstream', className: 'whitespace-nowrap' },
    ...(variant === 'risk' ? [
      { key: 'likelihood', header: 'Likelihood', className: 'whitespace-nowrap' } as Column<RaidItem>,
      { key: 'impact', header: 'Impact', className: 'whitespace-nowrap' } as Column<RaidItem>,
      { key: 'impactScore', header: 'Score', render: (r: RaidItem) => <span className="font-semibold">{r.impactScore.toFixed(1)}</span> },
    ] : []),
    { key: 'level', header: variant === 'issue' ? 'Severity' : 'Risk Level', render: (r) => <Badge value={r.level} /> },
    { key: 'status', header: 'Status', render: (r) => <Badge value={r.status} /> },
    { key: 'owner', header: 'Owner', className: 'whitespace-nowrap' },
    { key: 'dueDate', header: 'Due Date', className: 'whitespace-nowrap', render: (r) => <span className={clsx(isOpen(r) && r.dueDate < '2026-10-20' && 'text-red-600 font-medium')}>{fmtDate(r.dueDate)}</span> },
    { key: 'daysOpen', header: 'Days Open', className: 'text-right', render: (r) => <span className="block text-right">{daysOpen(r)}</span> },
    ...(variant === 'issue' ? [{ key: 'aging', header: 'Aging', render: (r: RaidItem) => <span className={clsx('text-[12px] font-medium', daysOpen(r) > 30 ? 'text-red-600' : daysOpen(r) > 7 ? 'text-amber-600' : 'text-green-600')}>{agingBucket(daysOpen(r))}</span> }] : []),
    ...(variant !== 'overview' && variant !== 'issue' ? [{ key: 'escalated', header: 'Esc.', className: 'text-center', render: (r: RaidItem) => r.escalated ? <span title={`Escalated – ${r.escalationStatus ?? 'Awaiting Decision'}`} className="inline-flex"><Flag size={14} className={r.escalationStatus === 'Resolved' ? 'text-green-600' : r.escalationStatus === 'In Progress' ? 'text-brand-600' : 'text-red-500'} /></span> : <span className="text-ink-400">–</span> }] : []),
  ]
  if (variant === 'risk' || variant === 'issue') cols.splice(1, 1) // type column is implicit
  if (variant === 'overview') {
    const W: Record<string, string> = { code: '54px', type: '56px', workstream: '128px', level: '74px', status: '90px', owner: '74px', dueDate: '90px', daysOpen: '80px' }
    cols.forEach((c) => { c.width = W[c.key] })
  }

  const exportCsv = () => {
    downloadCsv(`${variant === 'issue' ? 'issue' : variant === 'risk' ? 'risk' : 'raid'}-register.csv`,
      ['ID', 'Type', 'Title', 'Workstream', 'Category', 'Risk Level', 'Status', 'Owner', 'Opened On', 'Due Date', 'Days Open', 'Likelihood', 'Impact', 'Impact Score', 'Escalated', 'Escalation Status', 'Description', 'Mitigation'],
      rows.map((r) => [r.code, r.type, r.title, r.workstream, r.category, r.level, r.status, r.owner, r.openedOn, r.dueDate, daysOpen(r), r.likelihood, r.impact, r.impactScore, r.escalated ? 'Yes' : 'No', r.escalationStatus ?? '', r.description ?? '', r.mitigation ?? '']))
  }
  const addLabel = variant === 'risk' ? 'Add Risk' : variant === 'issue' ? 'Add Issue' : 'Add Risk / Issue'

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0">{headerTitle}</div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search risks and issues..." className="input py-1.5 w-[220px] bg-surface/60" style={{ paddingLeft: 30 }} />
          </label>
          <button className={clsx('btn-secondary px-2.5', showFilters && 'bg-brand-50 border-brand-400 text-brand-600')} title="Filters" onClick={() => setShowFilters((v) => !v)}><Filter size={15} /></button>
          {variant !== 'overview' && (
            <>
              <button className="btn-secondary px-2.5" title="Sort by impact score / ID" onClick={() => setSort((s) => (s === 'score' ? 'code' : s === 'code' ? 'due' : s === 'due' ? 'days' : 'score'))}><ArrowUpDown size={15} /><span className="text-[12px]">{sort === 'score' ? 'Score' : sort === 'code' ? 'ID' : sort === 'due' ? 'Due' : 'Days open'}</span></button>
              <button className="btn-secondary" onClick={exportCsv}><Download size={14} /> Export CSV</button>
            </>
          )}
          <button className="btn-primary" onClick={() => onAdd(typeFixed ?? 'Risk')}><Plus size={14} /> {addLabel}</button>
        </div>
      </div>
      {showFilters && (
        <div className="flex items-center gap-2 mb-3 flex-wrap text-[12.5px]">
          {!typeFixed && <Sel label="Type" value={fType} options={['All', 'Risk', 'Issue']} onChange={setFType} />}
          <Sel label={variant === 'issue' ? 'Severity' : 'Level'} value={fLevel} options={['All', ...RAID_LEVELS]} onChange={setFLevel} />
          <Sel label="Status" value={fStatus} options={['All', ...RAID_STATUSES]} onChange={setFStatus} />
          <Sel label="Workstream" value={fWs} options={['All', ...RAID_WORKSTREAMS]} onChange={setFWs} />
          {variant !== 'overview' && <label className="inline-flex items-center gap-1.5 ml-1 cursor-pointer text-ink-700"><input type="checkbox" checked={includeClosed} onChange={(e) => setIncludeClosed(e.target.checked)} /> Include closed / resolved</label>}
          <button className="link ml-1" onClick={() => { setFType('All'); setFLevel('All'); setFStatus('All'); setFWs('All'); setQ('') }}>Clear</button>
          <span className="text-ink-500 ml-auto">{rows.length} record{rows.length === 1 ? '' : 's'}</span>
        </div>
      )}
      <Table<RaidItem> compact rows={rows} onRowClick={onRow} columns={cols} empty="No risks or issues match the current filters." />
      {onViewAll && <div className="pt-2 text-right"><button className="link" onClick={onViewAll}>View full register →</button></div>}
    </div>
  )
}

function Sel({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-ink-500">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input py-1 px-2 w-auto text-[12.5px]">{options.map((o) => <option key={o}>{o}</option>)}</select>
    </label>
  )
}
