import { useEffect, useMemo, useState, useCallback } from 'react'
import { Users, ClipboardList, ShieldCheck, CalendarCheck } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { KpiTile, Tabs } from '../components/ui'
import { useCollection, useStore } from '../store/useStore'
import { variantSeed } from '../data/variants'
import { seedMilestones, seedRaid, seedDependencies, type Milestone, type RaidItem, type Dependency } from '../data/shared'
import { useBusinessUnits } from '../components/footprint/BusinessUnits'
import {
  TRANSITION_TABS, TRANSITION_DATE_RANGE, seedProjects, seedWaves, seedKtItems, seedReadinessAssessments, seedReadinessGaps, seedChecklist, seedTransitionSettings, seedMilestoneWaves, seedMilestoneProjects, seedRaidLinks,
  ktStats, waveIsActive, waveHasStarted, waveGoLive, fmtLong,
  type Wave, type KtItem, type ReadinessAssessment, type ReadinessGap, type ChecklistItem, type TransitionSettings, type MilestoneWave, type MilestoneProject, type RaidLink, type TransitionProject,
} from '../data/transition'
import type { Tx, ModalSpec } from '../components/transition/types'
import Overview from '../components/transition/Overview'
import { TransitionInput } from '../components/transition/InputView'
import { ProjectDrillDown } from '../components/transition/ProjectDrillDown'
import { WavePlan, KnowledgeTransfer, Readiness, RisksIssues, Dependencies, Reports } from '../components/transition/tabs'
import { ProjectForm, WaveForm, MilestoneForm, RaidForm, KtForm, AssessmentForm, GapForm, ChecklistForm, DependencyForm, SettingsForm } from '../components/transition/forms'

export default function Transition() {
  const { items: units } = useBusinessUnits()
  const projects = useCollection<TransitionProject>('transitionProjects', seedProjects)
  const waves = useCollection<Wave>('waves', seedWaves)
  const kt = useCollection<KtItem>('ktItems', seedKtItems)
  const assessments = useCollection<ReadinessAssessment>('readinessAssessments', seedReadinessAssessments)
  const gaps = useCollection<ReadinessGap>('readinessGaps', seedReadinessGaps)
  const checklist = useCollection<ChecklistItem>('stabilizationChecklist', seedChecklist)
  const settingsC = useCollection<TransitionSettings>('transitionSettings', seedTransitionSettings)
  const msWaves = useCollection<MilestoneWave>('milestoneWaves', seedMilestoneWaves)
  const msProjects = useCollection<MilestoneProject>('milestoneProjects', seedMilestoneProjects)
  const raidLinks = useCollection<RaidLink>('transitionRaidLinks', seedRaidLinks)
  const milestones = useCollection<Milestone>('milestones', seedMilestones)
  const raid = useCollection<RaidItem>('raid', seedRaid)
  const deps = useCollection<Dependency>('dependencies', seedDependencies)
  const settings = settingsC.items[0] ?? seedTransitionSettings[0]
  const program = useStore((s) => s.program)

  /* ---- one-time migration: rows persisted in the old function/workstream shape (no projectId) are dropped and the
     business-unit / project seed is loaded instead ---- */
  const legacy = kt.items.some((k) => !('projectId' in k)) || assessments.items.some((a) => !('projectId' in a)) || gaps.items.some((g) => !('projectId' in g)) || waves.items.some((w) => !('name' in w))
  useEffect(() => {
    if (!legacy) return
    const v = <T extends { id: string }>(name: string, seed: T[]) => variantSeed(name, seed, program)
    projects.setAll(v('transitionProjects', seedProjects))
    waves.setAll(v('waves', seedWaves))
    kt.setAll(v('ktItems', seedKtItems))
    assessments.setAll(v('readinessAssessments', seedReadinessAssessments))
    gaps.setAll(v('readinessGaps', seedReadinessGaps))
    msWaves.setAll(v('milestoneWaves', seedMilestoneWaves))
    settingsC.setAll(v('transitionSettings', seedTransitionSettings))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacy, program])

  const mode = useStore((s) => s.mode)
  const [tab, setTab] = useState<string>(TRANSITION_TABS[0])
  const [modal, setModal] = useState<ModalSpec | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const unitNames = useMemo(() => units.filter((u) => u.status !== 'Out of Scope').map((u) => u.name), [units])
  const [selUnit, setSelUnit] = useState<string>('')
  const unit = unitNames.includes(selUnit) ? selUnit : unitNames[0] ?? ''

  const sortedWaves = useMemo(() => [...waves.items].sort((a, b) => a.number - b.number), [waves.items])
  const currentWave = useMemo(() => sortedWaves.find((w) => waveHasStarted(w) && w.status !== 'Completed') ?? sortedWaves[0] ?? seedWaves[0], [sortedWaves])

  /* ---- KPIs derived from the collections ---- */
  const activeWaves = sortedWaves.filter((w) => waveIsActive(w, projects.items)).length
  const startedWaveNos = sortedWaves.filter((w) => waveHasStarted(w)).map((w) => w.number)
  const ktPct = ktStats(kt.items.filter((k) => startedWaveNos.includes(k.wave))).pct
  const gapNew = gaps.items.filter((g) => g.status === 'New').length
  const gapResolved = gaps.items.filter((g) => g.status === 'Resolved').length
  const stabDone = checklist.items.filter((c) => c.done).length
  const stabPct = checklist.items.length ? Math.round((stabDone / checklist.items.length) * 100) : 0
  const goLive = waveGoLive(settings.goLiveWave, projects.items)

  const openProject = useCallback((id: string) => setProjectId(id), [])
  const closeProject = useCallback(() => setProjectId(null), [])
  const tx: Tx = { units, unitNames, projects, waves, kt, assessments, gaps, checklist, milestones, msWaves, msProjects, raid, raidLinks, deps, settings, currentWave, unit, setUnit: setSelUnit, open: setModal, openProject, setTab }
  const close = () => setModal(null)
  const goToUnitOf = (p: TransitionProject) => { if (unitNames.includes(p.businessUnit)) setSelUnit(p.businessUnit) }

  return (
    <div>
      {mode === 'input' ? <TransitionInput tx={tx} onSaveSettings={(s) => settingsC.update(s)} /> : <>
      <PageHeader title="Transition Management" subtitle="Track knowledge transfer, readiness and stabilization of the transition projects of every business unit."
        dateRange={TRANSITION_DATE_RANGE} onEdit={() => setModal({ kind: 'settings' })} editLabel="Edit KPIs" />

      <div className="grid grid-cols-5 gap-4 mb-4">
        <KpiTile tone="blue" icon={<Users size={22} />} value={<>{activeWaves} <span className="text-ink-500">/ {sortedWaves.length}</span></>} label="Transition Waves" sub={<span className="text-brand-600">In progress</span>} />
        <KpiTile tone="green" ring={ktPct} value={`${ktPct}%`} label="Knowledge Transfer" trend={settings.ktDeltaPct >= 0 ? 'up' : 'down'} sub={<span className={settings.ktDeltaPct >= 0 ? 'text-green-600' : 'text-red-600'}>{settings.ktDeltaPct >= 0 ? '+' : ''}{settings.ktDeltaPct}% vs last month</span>} />
        <KpiTile tone="navy" icon={<ClipboardList size={22} className="text-orange-500" />} value={gaps.items.length} label="Readiness Gaps" sub={<><span className="text-red-600">▲ {gapNew} new</span><span className="text-ink-400 mx-1">|</span><span className="text-red-600">{gapResolved} resolved</span></>} />
        <KpiTile tone="violet" icon={<ShieldCheck size={22} />} value={`${stabPct}%`} label="Stabilization Readiness" trend={settings.stabilizationDeltaPct >= 0 ? 'up' : 'down'} sub={<span className={settings.stabilizationDeltaPct >= 0 ? 'text-green-600' : 'text-red-600'}>{settings.stabilizationDeltaPct >= 0 ? '+' : ''}{settings.stabilizationDeltaPct}% vs last month</span>} />
        <KpiTile tone="green" icon={<CalendarCheck size={22} />} value={goLive ? fmtLong(goLive) : '—'} label={`Target Go-Live (Wave ${settings.goLiveWave})`} sub={<span className={settings.goLiveStatus === 'On track' ? 'text-green-600' : settings.goLiveStatus === 'At risk' ? 'text-amber-600' : 'text-red-600'}>{settings.goLiveStatus}</span>} />
      </div>

      <Tabs className="mb-4" tabs={[...TRANSITION_TABS]} active={tab} onChange={setTab} />

      {tab === 'Transition Overview' && <Overview tx={tx} />}
      {tab === 'Wave Plan' && <WavePlan tx={tx} />}
      {tab === 'Knowledge Transfer' && <KnowledgeTransfer tx={tx} />}
      {tab === 'Readiness & Stabilization' && <Readiness tx={tx} />}
      {tab === 'Risks & Issues' && <RisksIssues tx={tx} />}
      {tab === 'Dependencies' && <Dependencies tx={tx} />}
      {tab === 'Reports' && <Reports tx={tx} />}
      </>}

      {/* ---- Project drill-down (both views) ---- */}
      <ProjectDrillDown tx={tx} projectId={projectId} blocked={!!modal} onClose={closeProject} />

      {/* ---- Modals (both views) ---- */}
      {modal?.kind === 'project' && <ProjectForm initial={modal.item} units={unitNames} waves={sortedWaves} businessUnit={modal.businessUnit ?? unit} wave={modal.wave} onClose={close}
        onSave={(p) => {
          const prev = modal.item
          projects.update(p); goToUnitOf(p)
          if (prev && (prev.wave !== p.wave || prev.businessUnit !== p.businessUnit)) {
            kt.items.filter((k) => k.projectId === p.id).forEach((k) => kt.update({ ...k, wave: p.wave, businessUnit: p.businessUnit }))
            assessments.items.filter((a) => a.projectId === p.id).forEach((a) => assessments.update({ ...a, wave: p.wave, businessUnit: p.businessUnit }))
            gaps.items.filter((g) => g.projectId === p.id).forEach((g) => gaps.update({ ...g, wave: p.wave, businessUnit: p.businessUnit }))
          }
          close()
        }}
        onDelete={modal.item ? () => { const id = modal.item!.id; kt.items.filter((k) => k.projectId === id).forEach((k) => kt.remove(k.id)); assessments.items.filter((a) => a.projectId === id).forEach((a) => assessments.remove(a.id)); gaps.items.filter((g) => g.projectId === id).forEach((g) => gaps.remove(g.id)); projects.remove(id); if (projectId === id) setProjectId(null); close() } : undefined} />}
      {modal?.kind === 'wave' && <WaveForm initial={modal.item} waves={sortedWaves} onClose={close} onSave={(w) => { waves.update(w); close() }} onDelete={modal.item ? () => { waves.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'milestone' && <MilestoneForm initial={modal.item} initialWave={modal.wave} initialProject={modal.projectId} waves={sortedWaves} projects={projects.items} onClose={close}
        onSave={(m, wave, pid) => { milestones.update(m); msWaves.update({ id: m.id, wave }); if (pid) msProjects.update({ id: m.id, projectId: pid }); else msProjects.remove(m.id); close() }}
        onDelete={modal.item ? () => { milestones.remove(modal.item!.id); msWaves.remove(modal.item!.id); msProjects.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'raid' && <RaidForm initial={modal.item} existing={raid.items} link={modal.item ? raidLinks.items.find((l) => l.id === modal.item!.id) : undefined} units={unitNames} projects={projects.items} businessUnit={modal.businessUnit} projectId={modal.projectId} onClose={close}
        onSave={(r, link) => { raid.update(r); if (link) raidLinks.update(link); else raidLinks.remove(r.id); close() }} onDelete={modal.item ? () => { raid.remove(modal.item!.id); raidLinks.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'kt' && <KtForm initial={modal.item} projects={projects.items} projectId={modal.projectId} onClose={close} onSave={(k) => { kt.update(k); close() }} onDelete={modal.item ? () => { kt.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'assessment' && <AssessmentForm initial={modal.item} projects={projects.items} projectId={modal.projectId} onClose={close}
        onSave={(a) => { const dup = assessments.items.find((x) => x.id !== a.id && x.projectId === a.projectId); assessments.update(dup ? { ...a, id: dup.id } : a); close() }}
        onDelete={modal.item ? () => { assessments.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'gap' && <GapForm initial={modal.item} projects={projects.items} projectId={modal.projectId} existing={gaps.items} onClose={close} onSave={(g) => { gaps.update(g); close() }} onDelete={modal.item ? () => { gaps.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'checklist' && <ChecklistForm initial={modal.item} onClose={close} onSave={(c) => { checklist.update(c); close() }} onDelete={modal.item ? () => { checklist.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'dependency' && <DependencyForm initial={modal.item} onClose={close} onSave={(d) => { deps.update(d); close() }} onDelete={modal.item ? () => { deps.remove(modal.item!.id); close() } : undefined} />}
      {modal?.kind === 'settings' && <SettingsForm initial={settings} waves={sortedWaves} onClose={close} onSave={(s) => { settingsC.update(s); close() }} />}
    </div>
  )
}
