import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import {
  LayoutDashboard, Target, CalendarRange, Layers, Users, Wallet, ArrowLeftRight, AlertTriangle, Landmark, CheckCircle2,
  FileBarChart2, FileText, Settings, Lightbulb, Bell, ChevronDown, Calendar, MoreVertical, Sparkles, RotateCcw, Pencil, LogOut, UserCircle2, PencilLine,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { PROGRAM_NAMES, programDef } from '../../data/common'
import { formatMoney } from '../../data/money'
import { FilterSelect } from '../ui'

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/strategy', label: 'Target Footprint', icon: Target },
  { to: '/planning', label: 'Program Planning', icon: CalendarRange },
  { to: '/workstreams', label: 'Workstreams', icon: Layers },
  { to: '/resources', label: 'Resource Management', icon: Users },
  { to: '/financial', label: 'Financial Management', icon: Wallet },
  { to: '/transition', label: 'Transition Management', icon: ArrowLeftRight },
  { to: '/risks', label: 'Risks & Issues', icon: AlertTriangle },
  { to: '/governance', label: 'Governance', icon: Landmark },
  { to: '/value', label: 'Value Realization', icon: CheckCircle2 },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Logo({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <img src="./futurefactor-logo.png" alt="FutureFactor 360 – Imagine. Enable." className={size === 'lg' ? 'h-14 w-auto' : 'h-9 w-auto'} draggable={false} />
  )
}

function SidebarLogo() {
  return (
    <div className="px-4 pt-4 pb-3">
      <div className="bg-white rounded-xl px-3 py-2.5 flex items-center justify-center">
        <Logo />
      </div>
    </div>
  )
}

export function Sidebar({ onAssistant }: { onAssistant: () => void }) {
  return (
    <aside className="w-[224px] shrink-0 bg-navy-900 text-white flex flex-col h-screen sticky top-0">
      <SidebarLogo />
      <nav className="px-3 mt-1 flex-1 overflow-y-auto scroll-thin space-y-0.5">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              clsx('flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13px] transition-colors', isActive ? 'bg-brand-600 text-white font-medium' : 'text-slate-300 hover:bg-navy-800 hover:text-white')
            }
          >
            <n.icon size={17} />
            <span className="truncate">{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <button onClick={onAssistant} className="m-3 mt-2 rounded-xl bg-navy-800 hover:bg-navy-700 px-3.5 py-3 flex items-center gap-3 text-left cursor-pointer">
        <Lightbulb size={20} className="text-slate-200" />
        <span>
          <span className="block text-[13px] font-semibold">Need help?</span>
          <span className="block text-[11.5px] text-slate-300">Ask the GCC assistant ›</span>
        </span>
      </button>
    </aside>
  )
}

export function Topbar({ variant: _variant }: { variant: 'dashboard' | 'page' }) {
  const program = useStore((s) => s.program)
  const setProgram = useStore((s) => s.setProgram)
  const [notif, setNotif] = useState(false)
  const [menu, setMenu] = useState(false)
  const user = useStore((s) => s.user)
  const logout = useStore((s) => s.logout)
  const nav = useNavigate()
  const notifications = [
    { t: 'IT infrastructure readiness milestone moved to At Risk', when: '2h ago' },
    { t: 'Wave 2 hiring forecast updated by S. Iyer', when: '5h ago' },
    { t: 'Steering committee pack due Friday', when: 'Yesterday' },
  ]
  const programSelect = (
    <label className="card px-3 py-1.5 flex items-center gap-1.5 text-[13px] font-medium text-navy-900 shrink-0 cursor-pointer">
      <select value={program} onChange={(e) => setProgram(e.target.value)} className="bg-transparent outline-none cursor-pointer">
        {PROGRAM_NAMES.map((p) => <option key={p}>{p}</option>)}
      </select>
    </label>
  )
  return (
    <header className="h-16 bg-white border-b border-line flex items-center px-5 gap-4 sticky top-0 z-30 min-w-0">
      {/* Left: brand + program */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <h1 className="text-[19px] font-bold tracking-tight text-navy-900 whitespace-nowrap">GCC Command Center</h1>
        {programSelect}
      </div>

      {/* Middle: Input / Output view toggle */}
      <ModeToggle />

      {/* Right: date, notifications, user */}
      <div className="flex items-center gap-4 shrink-0 ml-auto">
        <span className="text-[12.5px] text-ink-700 whitespace-nowrap hidden xl:inline">Mon, 22 Feb 2027</span>
        <CurrencyToggle />
        <div className="relative">
          <button onClick={() => setNotif((v) => !v)} className="relative text-ink-700 hover:text-ink-900 cursor-pointer flex">
            <Bell size={19} />
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">3</span>
          </button>
          {notif && (
            <div className="absolute right-0 mt-2 w-80 card p-2 z-40" onMouseLeave={() => setNotif(false)}>
              {notifications.map((n) => (
                <div key={n.t} className="px-3 py-2 rounded-lg hover:bg-surface text-[12.5px]"><div className="text-ink-900">{n.t}</div><div className="text-ink-500 text-[11px]">{n.when}</div></div>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 font-semibold flex items-center justify-center text-[13px] shrink-0">{user?.initials ?? 'AS'}</div>
            <div className="leading-tight text-left hidden lg:block">
              <div className="text-[13px] font-medium text-ink-900 max-w-[150px] truncate">{user?.name ?? 'Anita Sharma'}</div>
              <div className="text-[11.5px] text-ink-500 max-w-[150px] truncate">{user?.role ?? 'Program Manager'}</div>
            </div>
            <ChevronDown size={16} className="text-ink-500" />
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-56 card p-1.5 z-40 text-[12.5px]" onMouseLeave={() => setMenu(false)}>
              <div className="px-3 py-2 text-ink-500">Signed in as <b className="text-ink-900">{user?.name ?? 'Anita Sharma'}</b><br />{programDef(program).city}, {programDef(program).country}</div>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface flex items-center gap-2 cursor-pointer" onClick={() => { setMenu(false); nav('/settings') }}><UserCircle2 size={14} /> Profile & settings</button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface flex items-center gap-2 cursor-pointer text-red-600" onClick={() => { setMenu(false); logout(); nav('/login') }}><LogOut size={14} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export function ModeToggle() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  return (
    <div className="mx-auto flex items-center bg-surface rounded-lg p-0.5 shrink-0" title="Input view: enter and maintain the program data. Output view: the dashboards built from it.">
      {([['input', 'Input view', PencilLine], ['output', 'Output view', LayoutDashboard]] as const).map(([m, label, Icon]) => (
        <button key={m} onClick={() => setMode(m)} className={clsx('px-3.5 py-1.5 rounded-md text-[12.5px] font-semibold cursor-pointer inline-flex items-center gap-1.5', mode === m ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-white')}>
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  )
}

export function CurrencyToggle() {
  const currency = useStore((s) => s.currency)
  const setCurrency = useStore((s) => s.setCurrency)
  const rate = useStore((s) => s.eurRate)
  return (
    <div className="flex items-center bg-surface rounded-lg p-0.5 shrink-0" title={`Amounts shown in ${currency === 'INR' ? 'Indian Rupees (crore)' : `Euros (millions) at ₹ ${rate} per €`}`}>
      {(['INR', 'EUR'] as const).map((c) => (
        <button key={c} onClick={() => setCurrency(c)} className={clsx('px-2.5 py-1 rounded-md text-[12px] font-semibold cursor-pointer', currency === c ? 'bg-white text-navy-900 shadow-sm' : 'text-ink-500 hover:text-ink-900')}>
          {c === 'INR' ? '₹ INR' : '€ EUR'}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, subtitle, viewLabel = 'View by', viewValue, viewOptions, onView, dateRange = '01 May 2026 – 30 Apr 2028', right, onEdit, editLabel = 'Edit' }: {
  title: string; subtitle: string; viewLabel?: string; viewValue?: string; viewOptions?: readonly string[]; onView?: (v: string) => void; dateRange?: string; right?: ReactNode
  /** Opens this page's editor (KPIs / settings). Rendered as the standard top-right "Edit" button. */
  onEdit?: () => void; editLabel?: string
}) {
  const [range, setRange] = useState(dateRange)
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-[24px] font-bold tracking-tight text-navy-900 leading-tight">{title}</h2>
        <p className="text-[13px] text-ink-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {right}
        {viewOptions && viewValue !== undefined && onView && <FilterSelect label={viewLabel} value={viewValue} options={viewOptions} onChange={onView} />}
        <label className="card px-3 py-2 flex items-center gap-2 text-[13px] font-medium text-ink-900">
          <Calendar size={16} className="text-brand-600" />
          <select value={range} onChange={(e) => setRange(e.target.value)} className="bg-transparent outline-none cursor-pointer">
            {[dateRange, '01 Nov 2026 – 30 Apr 2027', '01 Jan 2027 – 31 Dec 2027', '01 May 2026 – 30 Apr 2027', '01 May 2027 – 30 Apr 2028'].filter((v, i, a) => a.indexOf(v) === i).map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        {onEdit && <button className="btn-primary" onClick={onEdit}><Pencil size={13} /> {editLabel}</button>}
        <button className="text-ink-500 hover:text-ink-900 cursor-pointer"><MoreVertical size={18} /></button>
      </div>
    </div>
  )
}

const DESIGN_WIDTH = 1536
function useFitToWidth(enabled: boolean) {
  useEffect(() => {
    if (!enabled) { document.documentElement.style.zoom = ''; return }
    const apply = () => {
      const z = Math.min(1, Math.max(0.78, window.innerWidth / DESIGN_WIDTH))
      document.documentElement.style.zoom = z === 1 ? '' : z.toFixed(3)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => { window.removeEventListener('resize', apply); document.documentElement.style.zoom = '' }
  }, [enabled])
}

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation()
  const nav = useNavigate()
  const [assistant, setAssistant] = useState(false)
  useFitToWidth(loc.pathname !== '/login')
  const resetAll = useStore((s) => s.resetAll)
  const user = useStore((s) => s.user)
  useEffect(() => { if (!user && loc.pathname !== '/login') nav('/login', { replace: true }) }, [user, loc.pathname, nav])
  if (loc.pathname === '/login') return <>{children}</>
  if (!user) return null
  return (
    <div className="flex min-h-screen">
      <Sidebar onAssistant={() => setAssistant(true)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar variant={loc.pathname === '/' ? 'dashboard' : 'page'} />
        <main className="p-5 flex-1 min-w-0">{children}</main>
        <footer className="px-5 pb-4 text-[11px] text-ink-400 flex items-center gap-3">
          <span>Demo data is stored in this browser.</span>
          <button className="inline-flex items-center gap-1 hover:text-ink-700 cursor-pointer" onClick={() => { if (window.confirm('Reset all demo data to the seeded baseline?')) { resetAll(); window.location.reload() } }}><RotateCcw size={11} /> Reset demo data</button>
        </footer>
      </div>
      {assistant && <Assistant onClose={() => setAssistant(false)} />}
    </div>
  )
}

function Assistant({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [log, setLog] = useState<{ who: 'you' | 'ai'; text: string }[]>([
    { who: 'ai', text: `Hi ${useStore.getState().user?.name.split(' ')[0] ?? 'there'}. I can summarise program status, explain a variance, or draft a steering committee note. What do you need?` },
  ])
  const canned: Record<string, string> = {
    status: 'ENGIE IT GCC Pune is 64% complete with 84% milestone adherence. Six critical issues are open. The IT infrastructure readiness milestone (23 Feb 2027) is At Risk and is the main threat to the 04 Mar Wave 3 go/no-go and the 30 Apr 2027 full-footprint target.',
    hiring: 'Pune headcount onboarded is 268 of 400 (plan to date 285 at ramp month 4, −6% vs plan). Wave 1 (Infrastructure & Cloud, Cybersecurity & IAM) is complete; the Wave 2 gap sits in Enterprise Applications (SAP Functional / Technical from France) and Data Engineers. Consider accelerating lateral hiring through the two specialist agencies.',
    budget: (() => { const { currency, eurRate } = useStore.getState(); const f = (cr: number) => formatMoney(cr, currency, eurRate); return `Approved budget ${f(4.0)}, actual spend ${f(2.6)} (65%), forecast at completion ${f(3.8)} leaving ${f(0.2)} headroom. Other (Travel, Misc) is the only workstream over budget (+${f(0.1)}).` })(),
    risk: 'Top risk is the delay in IT infrastructure provisioning for the Pune site (impact score 9.0, Critical, owner R. Mehta). It is linked to 4 downstream deliverables including the Network cut-over from France. Recommended action: escalate the network provisioning issue to the steering committee (SC-10, 28 Feb).',
  }
  const ask = () => {
    if (!q.trim()) return
    const key = Object.keys(canned).find((k) => q.toLowerCase().includes(k)) ?? 'status'
    setLog((l) => [...l, { who: 'you', text: q }, { who: 'ai', text: canned[key] }])
    setQ('')
  }
  return (
    <div className="fixed bottom-4 left-[244px] w-[380px] card shadow-2xl z-50 flex flex-col overflow-hidden">
      <div className="px-4 py-3 bg-navy-900 text-white flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13.5px] font-semibold"><Sparkles size={15} /> GCC assistant</span>
        <button onClick={onClose} className="text-slate-300 hover:text-white cursor-pointer text-sm">Close</button>
      </div>
      <div className="p-3 space-y-2 max-h-72 overflow-y-auto scroll-thin">
        {log.map((m, i) => (
          <div key={i} className={clsx('text-[12.5px] rounded-lg px-3 py-2 max-w-[90%]', m.who === 'ai' ? 'bg-surface text-ink-900' : 'bg-brand-600 text-white ml-auto')}>{m.text}</div>
        ))}
      </div>
      <div className="p-3 border-t border-line flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="Ask about status, hiring, budget or risk…" className="input" />
        <button className="btn-primary" onClick={ask}>Ask</button>
      </div>
    </div>
  )
}
