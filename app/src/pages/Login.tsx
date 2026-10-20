import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { PROGRAMS } from '../data/common'
import { Logo } from '../components/layout/AppShell'

const ROLES = ['Program Manager', 'GCC Program Director', 'Workstream Lead', 'Steering Committee Member', 'PMO Analyst', 'Viewer']

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
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <form onSubmit={submit} className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="text-[22px] font-bold text-navy-900 mt-5">GCC Command Center</h1>
        </div>
        <div className="mt-7 space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr('') }} placeholder="Your name" />
            {err && <div className="text-[12px] text-red-600 mt-1">{err}</div>}
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
          <div>
            <label className="label">GCC Program</label>
            <select className="input" value={program} onChange={(e) => setProgramLocal(e.target.value)}>
              {PROGRAMS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full justify-center mt-6 py-2.5 text-[14px]">Sign in <ArrowRight size={15} /></button>
      </form>
    </div>
  )
}
