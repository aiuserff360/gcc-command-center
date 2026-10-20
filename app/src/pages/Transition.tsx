import { useMemo, useState } from 'react'
import { Users, ClipboardList, ShieldCheck, CalendarCheck } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { KpiTile, Tabs } from '../components/ui'
import { useCollection } from '../store/useStore'
import { seedMilestones, seedRaid, seedDependencies, type Milestone, type RaidItem, type Dependency } from '../data/shared'
import { seedActivities, type Activity } from '../data/wbs'
import {
  TRANSITION_VIEWS, TRANSITION_TABS, TRANSITION_DATE_RANGE, seedWaves, seedKtItems, seedReadinessAssessments, seedReadinessGaps, seedChecklist, seedTransitionSettings, seedMilestoneWaves,
  ktStats, waveIsActive, waveHasStarted, fmtLong,
  type Wave, type KtItem, type ReadinessAssessment, type ReadinessGap, type ChecklistItem, type TransitionSettings, type MilestoneWave,
} from '../data/transition'
import type { Tx, ModalSpec } from '../components/transition/types'
import Overview from '../components/transition/Overview'
import { WavePlan, KnowledgeTransfer, Readiness, RisksIssues, Dependencies, Reports } from '../components/transition/tabs'
import { WaveForm, MilestoneForm, RaidForm, KtForm, AssessmentForm, GapForm, ChecklistForm, DependencyForm, ActivityForm, SettingsForm } from '../components/transition/forms'

export default function Transition() {
  const waves = useCollection<Wave>('waves', seedWaves)
  const kt = useCollection<KtItem>('ktItems', seedKtItems)
  const assessments = useCollection<ReadinessAssessment>('readinessAssessments', seedReadinessAssessments)
  const gaps = useCollection<ReadinessGap>('readinessGaps', seedReadinessGaps)
  const checklist = useCollection<ChecklistItem>('stabilizationChecklist', seedChecklist)
  const settingsC = useCollection<TransitionSettings>('transitionSettings', seedTransitionSettings)
  const msWaves = useCollection<MilestoneWave>('milestoneWaves', seedMilestoneWaves)
  const milestones = useCollection<Milestone>('milestones', seedMilestones)
  const raid = useCollection<RaidItem>('raid', seedRaid)
  const deps = useCollection<Dependency>('dependencies', seedDependencies)
  const activities = useCollection<Activity>('activities', seedActivities)
  const settings = settingsC.items[0] ?? seedTransitionSettings[0]

  const [view, setView] = useState<string>(TRANSITION_VIEWS[0])
  const [tab, setTab] = useState<string>(TRANSITION_TABS[0])
  const [modal, setModal] = useState<ModalSpec | null>(null)

  const sortedWaves = useMemo(() => [...waves.items].sort((a, b) => a.number - b.number), [waves.items])
  const currentWave = useMemo(() => sortedWaves.find((w) => waveHasStarted(w) && w.status !== 'Completed') ?? sortedWaves[0] ?? seedWaves[0], [sortedWaves])

  /* ---- KPIs derived from the collections ---- */
  const activeWaves = sortedWaves.filter(waveIsActive).length
  const startedWaveNos = sortedWaves.filter((w) => waveHasStarted(w)).map((w) => w.number)
  const ktPct = ktStats(kt.items.filter((k) => startedWaveNos.includes(k.wave))).pct
  const gapNew = gaps.items.filter((g) => g.status === 'New').length
  const gapResolved = gaps.items.filter((g) => g.status === 'Resolved').length
  const stabDone = checklist.items.filter((c) => c.done).length
  const stabPct = checklist.items.length ? Math.round((stabDone / checklist.items.length) * 100) : 0
  const goLiveWave = sortedWaves.find((w) => w.number === settings.goLiveWave)

  const tx: Tx = { waves, kt, assessments, gaps, checklist, milestones, msWaves, raid, deps, activities, settings, view, currentWave, open: setModal, setTab }
  const close = () => setModal(null)

  return (
    <div>
      <PageHeader title="Transition Management" subtitle="Track and manage knowledge transfer, wave readiness and stabilization across the GCC."
        viewValue={view} viewOptions={TRANSITION_VIEWS} onView={setView} dateRange={TRANSITION_DATE_RANGE} onEdit={() => setModal({ kind: 'settings' })} editLabel="Edit KPIs" />

      <div className="grid grid-cols-5 gap-4 mb-4">
        <KpiTile tone="blue" icon={<Users size={22} />} value={<>{activeWaves} <span className="text-ink-500">/ {sortedWaves.length}</span></>} label="Transition Waves" sub={<span className="text-brand-600">In progress</span>} />
        <KpiTile tone="green" ring={ktPct} value={`${ktPct}%`} label="Knowledge Transfer" trend={settings.ktDeltaPct >= 0 ? 'up' : 'down'} sub={<span className={settings.ktDeltaPct >= 0 ? 'text-green-600' : 'text-red-600'}>{settings.ktDeltaPct >= 0 ? '+' : ''}{settings.ktDeltaPct}% vs last month</span>} />
        <KpiTile tone="navy" icon={<ClipboardList size={22} className="text-orange-500" />} value={gaps.items.length} label="Readiness Gaps" sub={<><span className="text-red-600">▲ {gapNew} new</span><span className="text-ink-400 mx-1">|</span><span className="text-red-600">{gapResolved} resolved</span></>} />
        <KpiTile tone="violet" icon={<ShieldCheck size={22} />} value={`${stabPct}%`} label="Stabilization Readiness" trend={settings.stabilizationDeltaPct >= 0 ? 'up' : 'down'} sub={<span className={settings.stabilizationDeltaPct >= 0 ? 'text-green-600' : 'text-red-600'}>{settings.stabilizationDeltaPct >= 0 ? '+' : ''}{settings.stabilizationDeltaPct}% vs last month</span>} />
        <KpiTile tone="green" icon={<CalendarCheck size={22} />} value={fmtLong(settings.goLiveDate)} label={`Target Go-Live (Wave ${goLiveWave?.number ?? settings.goLiveWave})`} sub={<span className={settings.goLiveStatus === 'On track' ? 'text-green-600' : settings.goLiveStatus === 'At risk' ? 'text-amber-600' : 'text-red-600'}>{settings.goLiveStatus}</span>} />
      </div>

      <Tabs className="mb-4" tabs={[...TRANSITION_TABS]} active={tab} onChange={setTab} />

      {tab === 'Transition Overview' && <Overview tx={tx} />}
      {tab === 'Wave Plan' && <WavePlan tx={tx} />}
      {tab === 'Knowledge Transfer' && <KnowledgeTransfer tx={tx} />}
      {tab === 'Readiness & Stabilization' && <Readiness tx={tx} />}
      {tab === 'Risks & Issues' && <RisksIssues tx={tx} />}
      {tab === 'Dependencies' && <Dependencies tx={tx} />}
      {tab === 'Reports' && <Reports tx={tx} />}

      {/* ---- Modals ---- */}
      {modal?.kind === 'wave' && <WaveForm initial={modal.item} waves={sortedWaves} onClose={close} onSave={(w) => { waves.update(w); close() }} onDelete={modal.item ? () => { waves.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'milestone' && <MilestoneForm initial={modal.item} initialWave={modal.wave} waves={sortedWaves} onClose={close}
        onSave={(m, wave) => { milestones.update(m); msWaves.update({ id: m.id, wave }); close() }}
        onDelete={modal.item ? () => { milestones.remove(modal.item!.id); msWaves.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'raid' && <RaidForm initial={modal.item} existing={raid.items} onClose={close} onSave={(r) => { raid.update(r); close() }} onDelete={modal.item ? () => { raid.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'kt' && <KtForm initial={modal.item} waves={sortedWaves} onClose={close} onSave={(k) => { kt.update(k); close() }} onDelete={modal.item ? () => { kt.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'assessment' && <AssessmentForm initial={modal.item} waves={sortedWaves} onClose={close}
        onSave={(a) => { const dup = assessments.items.find((x) => x.id !== a.id && x.wave === a.wave && x.workstream === a.workstream); assessments.update(dup ? { ...a, id: dup.id } : a); close() }}
        onDelete={modal.item ? () => { assessments.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'gap' && <GapForm initial={modal.item} waves={sortedWaves} existing={gaps.items} onClose={close} onSave={(g) => { gaps.update(g); close() }} onDelete={modal.item ? () => { gaps.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'checklist' && <ChecklistForm initial={modal.item} onClose={close} onSave={(c) => { checklist.update(c); close() }} onDelete={modal.item ? () => { checklist.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'dependency' && <DependencyForm initial={modal.item} onClose={close} onSave={(d) => { deps.update(d); close() }} onDelete={modal.item ? () => { deps.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'activity' && <ActivityForm initial={modal.item} onClose={close} onSave={(a) => { activities.update(a); close() }} />}
      {modal?.kind === 'settings' && <SettingsForm initial={settings} waves={sortedWaves} onClose={close} onSave={(s) => { settingsC.update(s); close() }} />}
    </div>
  )
}
