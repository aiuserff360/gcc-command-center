import type { useCollection } from '../../store/useStore'
import type { Milestone, RaidItem, Dependency } from '../../data/shared'
import type { BusinessUnit } from '../../data/businessUnits'
import type { Wave, KtItem, ReadinessAssessment, ReadinessGap, ChecklistItem, TransitionSettings, MilestoneWave, MilestoneProject, RaidLink, TransitionProject } from '../../data/transition'

export type Coll<T extends { id: string }> = ReturnType<typeof useCollection<T>>

export type ModalSpec =
  | { kind: 'project'; item: TransitionProject | null; businessUnit?: string; wave?: number }
  | { kind: 'wave'; item: Wave | null }
  | { kind: 'milestone'; item: Milestone | null; wave?: number; projectId?: string }
  | { kind: 'raid'; item: RaidItem | null; businessUnit?: string; projectId?: string }
  | { kind: 'kt'; item: KtItem | null; projectId?: string }
  | { kind: 'assessment'; item: ReadinessAssessment | null; projectId?: string }
  | { kind: 'gap'; item: ReadinessGap | null; projectId?: string }
  | { kind: 'checklist'; item: ChecklistItem | null }
  | { kind: 'dependency'; item: Dependency | null }
  | { kind: 'settings' }

/** Everything the tab components need: collections + page-level actions. */
export interface Tx {
  units: BusinessUnit[]
  unitNames: string[]
  projects: Coll<TransitionProject>
  waves: Coll<Wave>
  kt: Coll<KtItem>
  assessments: Coll<ReadinessAssessment>
  gaps: Coll<ReadinessGap>
  checklist: Coll<ChecklistItem>
  milestones: Coll<Milestone>
  msWaves: Coll<MilestoneWave>
  msProjects: Coll<MilestoneProject>
  raid: Coll<RaidItem>
  raidLinks: Coll<RaidLink>
  deps: Coll<Dependency>
  settings: TransitionSettings
  currentWave: Wave
  /** selected business unit (shared between the overview and the tabs) */
  unit: string
  setUnit: (u: string) => void
  open: (m: ModalSpec) => void
  openProject: (id: string) => void
  setTab: (t: string) => void
}
