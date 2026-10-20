import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
const Strategy = lazy(() => import('./pages/Strategy'))
const Planning = lazy(() => import('./pages/Planning'))
const Workstreams = lazy(() => import('./pages/Workstreams'))
const Resources = lazy(() => import('./pages/Resources'))
const Financial = lazy(() => import('./pages/Financial'))
const Transition = lazy(() => import('./pages/Transition'))
const Risks = lazy(() => import('./pages/Risks'))
const Governance = lazy(() => import('./pages/Governance'))
const ValueRealization = lazy(() => import('./pages/ValueRealization'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const Reports = lazy(() => import('./pages/Reports'))
const Documents = lazy(() => import('./pages/Documents'))
const Integrations = lazy(() => import('./pages/Integrations'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<div className="card p-6 text-ink-500 text-sm">Loading…</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/strategy" element={<Strategy />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/workstreams" element={<Workstreams />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/financial" element={<Financial />} />
        <Route path="/transition" element={<Transition />} />
        <Route path="/risks" element={<Risks />} />
        <Route path="/governance" element={<Governance />} />
        <Route path="/value" element={<ValueRealization />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      </Suspense>
    </AppShell>
  )
}
