import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, UserRound, Clock3, Coins, Plus } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { KpiTile, Tabs } from '../components/ui'
import { useStore } from '../store/useStore'
import { type Position } from '../data/resources'
import { useResourceData } from '../components/resources/useResourceData'
import OverviewTab from '../components/resources/OverviewTab'
import HiringTab from '../components/resources/HiringTab'
import AllocationTab from '../components/resources/AllocationTab'
import SkillsTab from '../components/resources/SkillsTab'
import CostTab from '../components/resources/CostTab'
import LocationTab from '../components/resources/LocationTab'
import AttritionTab from '../components/resources/AttritionTab'
import { PositionForm, SettingsForm } from '../components/resources/forms'
import { RequisitionDrillDown } from '../components/resources/RequisitionDrillDown'
import { ResourcesInputView } from '../components/resources/InputView'
import { useMoney } from '../data/money'

const TABS = ['Workforce Overview', 'Hiring Plan & Pipeline', 'Resource Allocation', 'Skills & Capability', 'Cost Analysis', 'Location Mix', 'Attrition & Retention']

export default function Resources() {
  const mode = useStore((s) => s.mode)
  const d = useResourceData()
  const m = useMoney()
  const { kpi, settings, settingsC, positions, buNames, capNames, locations, reportingMonth } = d
  const [params] = useSearchParams() // deep link: /resources?tab=<tab>&bu=<business unit>
  const [tab, setTab] = useState(TABS.includes(params.get('tab') ?? '') ? (params.get('tab') as string) : TABS[0])
  const [editSettings, setEditSettings] = useState(false)
  const [addPos, setAddPos] = useState(false)
  const [openReq, setOpenReq] = useState<string | null>(null)

  if (mode === 'input') return <ResourcesInputView d={d} />

  return (
    <div className="space-y-4">
      <PageHeader title="Resource Management" subtitle={`Plan, track and optimise talent, roles, capacity and costs across the ENGIE IT GCC, Pune – by business unit (IT domain) and capability. FTE headcount · reporting month ${reportingMonth}.`}
        right={<button className="btn-secondary" onClick={() => setAddPos(true)}><Plus size={14} /> Add Requisition</button>} onEdit={() => setEditSettings(true)} editLabel="Edit KPIs" />

      {/* KPI tiles */}
      <div className="grid grid-cols-5 gap-4">
        <KpiTile tone="blue" icon={<Users size={22} />} value={<>{kpi.onboarded} <span className="text-[16px] text-ink-500 font-semibold">/ {settings.fteTarget}</span></>} label="FTEs Onboarded" trend={kpi.vsPlanPct >= 0 ? 'up' : 'down'}
          sub={<span className={kpi.vsPlanPct >= 0 ? 'text-green-600' : 'text-red-600'}>{kpi.vsPlanPct >= 0 ? '+' : ''}{kpi.vsPlanPct}% vs plan ({kpi.planned}) at {reportingMonth}</span>} />
        <KpiTile tone="green" ring={kpi.hiringProgress} value={`${kpi.hiringProgress}%`} label="Hiring Progress" sub={`${kpi.onboarded} of ${settings.fteTarget} Pune FTEs`} />
        <KpiTile tone="red" icon={<UserRound size={22} />} value={<span className="text-navy-900">{kpi.openCount}</span>} label="Open Positions" sub={<><span className="text-red-600 font-medium">{kpi.critical} Critical</span><span className="text-ink-400 mx-1">|</span><span className="text-ink-700">{kpi.others} Others</span><span className="text-ink-400 mx-1">|</span><span className="text-brand-600">{kpi.inHiring} in hiring</span></>} />
        <KpiTile tone="violet" icon={<Clock3 size={22} />} value={<span className="text-brand-600">{settings.avgTimeToHireMonths} months</span>} label="Avg. Time to Hire" trend={kpi.tthDelta > 0 ? 'down' : 'up'}
          sub={<span className={kpi.tthDelta > 0 ? 'text-red-600' : 'text-green-600'}>{kpi.tthDelta > 0 ? '+' : ''}{kpi.tthDelta} vs target</span>} />
        <KpiTile tone="orange" icon={<Coins size={22} />} value={<span className="text-navy-900">{m.fmt(kpi.costActual)}</span>} label="Annual People Cost" sub={<>of <b>{m.fmt(kpi.costBudget)}</b> budget</>} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'Workforce Overview' && <OverviewTab d={d} goTab={setTab} onOpen={setOpenReq} />}
      {tab === 'Hiring Plan & Pipeline' && <HiringTab d={d} onOpen={setOpenReq} />}
      {tab === 'Resource Allocation' && <AllocationTab d={d} onOpen={setOpenReq} initialUnit={params.get('bu') ?? undefined} />}
      {tab === 'Skills & Capability' && <SkillsTab d={d} />}
      {tab === 'Cost Analysis' && <CostTab d={d} />}
      {tab === 'Location Mix' && <LocationTab d={d} />}
      {tab === 'Attrition & Retention' && <AttritionTab d={d} />}

      <SettingsForm open={editSettings} onClose={() => setEditSettings(false)} value={settings} onSave={(s) => settingsC.update(s)} />
      <PositionForm open={addPos} onClose={() => setAddPos(false)} value={null} businessUnits={buNames} capNames={capNames} locations={locations} onSave={(p: Position) => { positions.add(p); setAddPos(false) }} />
      <RequisitionDrillDown d={d} positionId={openReq} onClose={() => setOpenReq(null)} />
    </div>
  )
}
