/**
 * People & Roles – who is involved in a workstream, top to bottom: sponsor and lead, then the
 * team grouped by function with each person's role, allocation and what they are doing.
 */
import { useMemo, useState } from 'react'
import { Plus, Crown, UserCircle2, Users, Briefcase, MapPin } from 'lucide-react'
import { Card, Badge, Table, Chevron } from '../ui'
import { useCollection, uid } from '../../store/useStore'
import { seedMilestones, seedWorkstreamSummaries, type Milestone, type WorkstreamSummary } from '../../data/shared'
import { seedInitiatives, seedTeamMembers, shortName, type Initiative, type TeamMember } from '../../data/workstreams'
import { seedActivities, type Activity } from '../../data/wbs'
import { TODAY, type Workstream } from '../../data/common'
import { Toolbar, MiniSelect, SearchBox, Strip, PctBar } from './common'
import { TeamMemberForm } from './forms'

const ALL = 'All'
const initials = (n: string) => n.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

export function PeopleView({ ws }: { ws: Workstream }) {
  const team = useCollection<TeamMember>('teamMembers', seedTeamMembers)
  const { items: wss } = useCollection<WorkstreamSummary>('workstreamSummaries', seedWorkstreamSummaries)
  const { items: inits } = useCollection<Initiative>('initiatives', seedInitiatives)
  const { items: ms } = useCollection<Milestone>('milestones', seedMilestones)
  const { items: acts } = useCollection<Activity>('activities', seedActivities)
  const [fFn, setFFn] = useState(ALL), [fType, setFType] = useState(ALL), [q, setQ] = useState('')
  const [edit, setEdit] = useState<{ item: TeamMember; isNew: boolean } | null>(null)

  const w = wss.find((x) => x.name === ws)
  const members = useMemo(() => team.items.filter((m) => m.workstream === ws), [team.items, ws])
  const lead = members.find((m) => m.isLead) ?? members.find((m) => /lead/i.test(m.role)) ?? members[0]
  const functions = useMemo(() => Array.from(new Set(members.map((m) => m.functionArea || 'General'))), [members])
  const filtered = members.filter((m) => (fFn === ALL || (m.functionArea || 'General') === fFn) && (fType === ALL || m.type === fType) && (!q || `${m.name} ${m.role} ${m.responsibilities}`.toLowerCase().includes(q.toLowerCase())))
  const fte = (members.reduce((s, m) => s + m.allocation, 0) / 100).toFixed(1)

  /** Work assigned to a person: initiatives owned, milestones owned, activities responsible. Matched on the short owner label. */
  const workOf = (m: TeamMember) => {
    const sn = shortName(m.name)
    return {
      inits: inits.filter((i) => i.workstream === ws && i.owner === sn),
      ms: ms.filter((x) => x.workstream === ws && x.owner === sn),
      acts: acts.filter((a) => a.workstream === ws && a.responsible === sn && a.status !== 'Completed'),
    }
  }
  const newItem = (): TeamMember => ({ id: uid('tm'), name: '', role: '', workstream: ws, location: 'Pune', allocation: 100, startDate: TODAY, type: 'Internal', functionArea: '', responsibilities: '', reportsTo: lead?.name })
  const people = members.map((m) => m.name)

  const Person = ({ title, name, role, note, icon, tone }: { title: string; name: string; role?: string; note?: string; icon: React.ReactNode; tone: string }) => (
    <div className={`rounded-lg border px-3 py-2.5 flex items-center gap-3 min-w-[230px] ${tone}`}>
      <span className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-[12px] font-bold text-navy-900 shrink-0">{name ? initials(name) : icon}</span>
      <div className="min-w-0">
        <div className="text-[10.5px] uppercase tracking-wide text-ink-500">{title}</div>
        <div className="text-[13px] font-semibold text-ink-900 truncate">{name || '—'}</div>
        {(role || note) && <div className="text-[11.5px] text-ink-700 truncate">{role}{role && note ? ' · ' : ''}{note}</div>}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* ---------- leadership: top to bottom ---------- */}
      <Card title="Who leads this workstream" subtitle="Accountability from sponsor to lead to the team">
        <div className="flex flex-col items-start gap-1">
          <Person title="Executive sponsor" name={w?.executiveSponsor ?? ''} note="Approves scope, budget and escalations" icon={<Crown size={16} />} tone="bg-violet-50 border-violet-200" />
          <span className="ml-5 h-4 border-l-2 border-line" />
          <div className="flex items-center gap-3 flex-wrap">
            <Person title="Workstream lead" name={lead?.name ?? w?.lead ?? ''} role={lead?.role} note={lead ? `${lead.allocation}% allocated · ${lead.location}` : undefined} icon={<UserCircle2 size={16} />} tone="bg-brand-50 border-brand-300" />
            <Person title="Accountable owner" name={w?.owner ?? ''} note="Steering committee reporting" icon={<Briefcase size={16} />} tone="bg-surface border-line" />
            <Person title="Program management (PMO)" name="Anita Sharma" role="Program Manager" note="Integrated plan, RAID and governance" icon={<Users size={16} />} tone="bg-surface border-line" />
          </div>
          <span className="ml-5 h-4 border-l-2 border-line" />
          <div className="ml-0 flex items-center gap-2 flex-wrap">
            {functions.map((fn) => {
              const n = members.filter((m) => (m.functionArea || 'General') === fn).length
              return <button key={fn} onClick={() => setFFn(fFn === fn ? ALL : fn)} className={`rounded-lg border px-3 py-1.5 text-[12px] cursor-pointer ${fFn === fn ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-line text-ink-700 hover:bg-brand-50'}`}><b>{fn}</b> · {n} {n === 1 ? 'person' : 'people'}</button>
            })}
          </div>
        </div>
        <Strip items={[
          { label: 'People involved', value: members.length },
          { label: 'Full-time equivalents', value: fte },
          { label: 'Functions', value: functions.length },
          { label: 'Internal', value: members.filter((m) => m.type === 'Internal').length },
          { label: 'Contractors / vendors', value: members.filter((m) => m.type !== 'Internal').length },
          { label: 'Locations', value: Array.from(new Set(members.map((m) => m.location))).join(', ') || '—' },
        ]} />
      </Card>

      {/* ---------- roster: roles, functions, what they are doing ---------- */}
      <Card title="People, roles and what they are doing" subtitle={`${filtered.length} of ${members.length} people${fFn !== ALL ? ` · ${fFn}` : ''}`} action={<button className="btn-primary" onClick={() => setEdit({ item: newItem(), isNew: true })}><Plus size={14} /> Add person</button>}>
        <Toolbar>
          <MiniSelect label="Function" value={fFn} options={[ALL, ...functions]} onChange={setFFn} />
          <MiniSelect label="Type" value={fType} options={[ALL, 'Internal', 'Contractor', 'Vendor']} onChange={setFType} />
          <SearchBox value={q} onChange={setQ} placeholder="Search name, role or responsibility…" />
        </Toolbar>
        {(fFn === ALL ? functions : [fFn]).map((fn) => {
          const rows = filtered.filter((m) => (m.functionArea || 'General') === fn).sort((a, b) => Number(!!b.isLead) - Number(!!a.isLead) || a.name.localeCompare(b.name))
          if (!rows.length) return null
          return (
            <div key={fn} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-900 bg-surface rounded-md px-3 py-1.5 mb-1"><Briefcase size={13} className="text-brand-600" /> {fn} <span className="text-ink-500 font-normal">· {rows.length}</span></div>
              <Table<TeamMember> compact rows={rows} onRowClick={(r) => setEdit({ item: r, isNew: false })} columns={[
                { key: 'name', header: 'Name', width: '190px', render: (r) => (
                  <span className="inline-flex items-center gap-2"><span className={`w-7 h-7 rounded-full text-[10.5px] font-semibold flex items-center justify-center ${r.isLead ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-600'}`}>{initials(r.name)}</span>
                    <span><span className="font-medium block leading-tight">{r.name}</span>{r.isLead && <span className="text-[10px] text-brand-600 font-semibold uppercase tracking-wide">Lead</span>}</span></span>) },
                { key: 'role', header: 'Role', width: '160px', render: (r) => <span className="font-medium">{r.role}</span> },
                { key: 'responsibilities', header: 'What they are doing', render: (r) => {
                  const wk = workOf(r); const chips = [...wk.inits.map((i) => `Initiative: ${i.name}`), ...wk.ms.map((x) => `Milestone: ${x.name}`)].slice(0, 4)
                  return (
                    <div className="max-w-[520px]">
                      <div className="text-ink-700 leading-snug">{r.responsibilities || <span className="text-ink-400 italic">Not captured yet</span>}</div>
                      {(chips.length > 0 || wk.acts.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {chips.map((c) => <span key={c} className="text-[10.5px] rounded bg-brand-50 text-brand-700 px-1.5 py-px">{c}</span>)}
                          {wk.acts.length > 0 && <span className="text-[10.5px] rounded bg-slate-100 text-slate-700 px-1.5 py-px">{wk.acts.length} open WBS activities</span>}
                        </div>
                      )}
                    </div>
                  ) } },
                { key: 'reportsTo', header: 'Reports to', width: '120px', render: (r) => r.reportsTo ?? (r.isLead ? w?.executiveSponsor ?? '—' : '—') },
                { key: 'type', header: 'Type', width: '84px', render: (r) => <Badge value={r.type} /> },
                { key: 'location', header: 'Location', width: '96px', render: (r) => <span className="inline-flex items-center gap-1 whitespace-nowrap"><MapPin size={11} className="text-ink-400" />{r.location}</span> },
                { key: 'allocation', header: 'Allocation', width: '120px', render: (r) => <PctBar value={r.allocation} width={64} color={r.allocation === 100 ? '#1E5BBE' : '#5B9BF0'} /> },
                { key: 'c', header: '', width: '28px', render: () => <Chevron /> },
              ]} />
            </div>
          )
        })}
        {filtered.length === 0 && <p className="text-[12.5px] text-ink-500 italic text-center py-6">No one matches these filters.</p>}
      </Card>
      {edit && <TeamMemberForm initial={edit.item} isNew={edit.isNew} wsOptions={wss.map((x) => x.name)} people={people} onClose={() => setEdit(null)}
        onSave={(v) => { team.update(v); setEdit(null) }} onDelete={edit.isNew ? undefined : () => { team.remove(edit.item.id); setEdit(null) }} />}
    </div>
  )
}
