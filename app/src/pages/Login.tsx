import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Layers, Wallet, Users, CalendarRange, ShieldAlert, FileBarChart2, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { PROGRAMS } from '../data/common'
import { Logo } from '../components/layout/AppShell'

const ROLES = ['Program Manager', 'GCC Program Director', 'Workstream Lead', 'Steering Committee Member', 'PMO Analyst', 'Viewer']

/** Capability areas – wording taken from the GCC Control Tower requirements document. */
const CAPABILITIES = [
  { icon: Layers, title: 'Workstream Management', text: 'Consolidated visibility into activities, milestones, deliverables, dependencies, ownership and progress across all GCC workstreams.' },
  { icon: Wallet, title: 'Financial Management', text: 'Budget versus actuals, expenditure tracking, cost forecasts, variances, commitments and financial performance.' },
  { icon: Users, title: 'Headcount & Hiring Management', text: 'Approved versus actual headcount, recruitment pipeline, hiring progress, workforce ramp-up and staffing gaps.' },
  { icon: CalendarRange, title: 'Program Planning', text: 'Integrated timelines, milestone tracking, cross-workstream dependencies and schedule deviations.' },
  { icon: ShieldAlert, title: 'Risks & Governance', text: 'Centralized management of risks, issues, escalations, decisions and corrective actions.' },
  { icon: FileBarChart2, title: 'Management Reporting', text: 'Automated weekly program updates, monthly steering committee dashboards, financial reports and hiring reports.' },
]

export default function Login() {
  const nav = useNavigate()
  const login = useStore((s) => s.login)
  const setProgram = useStore((s) => s.setProgram)
  const currentProgram = useStore((s) => s.program)
  const [name, setName] = useState('')
  const [role, setRole] = useState(ROLES[0])
  const [program, setProgramLocal] = useState(currentProgram)
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setErr('Please enter your name.'); return }
    login(name, role)
    setProgram(program)
    nav('/', { replace: true })
  }

  return (
    <div className="min-h-screen grid grid-cols-[1.15fr_1fr] bg-surface">
      {/* Left: platform story */}
      <div className="bg-navy-900 text-white px-14 py-12 flex flex-col">
        <div className="bg-white rounded-xl px-4 py-3 w-fit"><Logo size="lg" /></div>
        <div className="mt-12">
          <div className="text-[12px] tracking-[0.2em] uppercase text-brand-300 font-semibold">GCC Command Center</div>
          <h1 className="text-[34px] font-bold leading-tight mt-2 max-w-xl">A single source of truth for GCC program execution.</h1>
          <p className="text-slate-300 text-[14.5px] mt-4 max-w-xl leading-relaxed">
            A unified platform that enables the GCC Program Manager to monitor, coordinate, govern and report on all GCC workstreams across the overlapping Build and Operate phases.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 mt-10 max-w-2xl">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="flex gap-3">
              <span className="w-9 h-9 rounded-lg bg-navy-800 flex items-center justify-center shrink-0 text-brand-300"><c.icon size={18} /></span>
              <div>
                <div className="text-[13.5px] font-semibold">{c.title}</div>
                <div className="text-[12px] text-slate-400 leading-snug mt-0.5">{c.text}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-10 text-[12px] text-slate-400 flex items-start gap-2 max-w-2xl">
          <CheckCircle2 size={14} className="text-teal-500 mt-0.5 shrink-0" />
          <span>Business outcome: proactive intervention, financial and workforce control, reduced manual reporting effort, and consistent, data-driven visibility for leadership.</span>
        </div>
      </div>

      {/* Right: sign in */}
      <div className="flex items-center justify-center px-10">
        <form onSubmit={submit} className="card w-full max-w-md p-8">
          <h2 className="text-[22px] font-bold text-navy-900">Sign in</h2>
          <p className="text-[13px] text-ink-500 mt-1">Enter your name to open the Command Center. This is a demo – any name and password are accepted.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Your name</label>
              <input className="input" autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr('') }} placeholder="e.g. Anita Sharma" />
              {err && <div className="text-[12px] text-red-600 mt-1">{err}</div>}
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            </div>
            <div>
              <label className="label">GCC Program</label>
              <select className="input" value={program} onChange={(e) => setProgramLocal(e.target.value)}>
                {PROGRAMS.map((p) => <option key={p.name} value={p.name}>{p.name} · {p.city} · {p.phase} phase</option>)}
              </select>
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full justify-center mt-6 py-2.5 text-[14px]">Open Command Center <ArrowRight size={15} /></button>
          <div className="text-[11.5px] text-ink-400 mt-4 text-center">FutureFactor360 · Imagine. Enable.</div>
        </form>
      </div>
    </div>
  )
}
