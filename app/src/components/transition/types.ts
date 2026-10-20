import type { useCollection } from '../../store/useStore'
import type { Milestone, RaidItem, Dependency } from '../../data/shared'
import type { Activity } from '../../data/wbs'
import type { Wave, KtItem, ReadinessAssessment, ReadinessGap, ChecklistItem, TransitionSettings, MilestoneWave } from '../../data/transition'

export type Coll<T extends { id: string }> = ReturnType<typeof useCollection<T>>

export type ModalSpec =
  | { kind: 'wave'; item: Wave | null }
  | { kind: 'milestone'; item: Milestone | null; wave?: number }
  | { kind: 'raid'; item: RaidItem | null }
  | { kind: 'kt'; item: KtItem | null }
  | { kind: 'assessment'; item: ReadinessAssessment | null }
  | { kind: 'gap'; item: ReadinessGap | null }
  | { kind: 'checklist'; item: ChecklistItem | null }
  | { kind: 'dependency'; item: Dependency | null }
  | { kind: 'activity'; item: Activity }
  | { kind: 'settings' }

/** Everything the tab components need: collections + page-level actions. */
export interface Tx {
  waves: Coll<Wave>
  kt: Coll<KtItem>
  assessments: Coll<ReadinessAssessment>
  gaps: Coll<ReadinessGap>
  checklist: Coll<ChecklistItem>
  milestones: Coll<Milestone>
  msWaves: Coll<MilestoneWave>
  raid: Coll<RaidItem>
  deps: Coll<Dependency>
  activities: Coll<Activity>
  settings: TransitionSettings
  view: string
  currentWave: Wave
  open: (m: ModalSpec) => void
  setTab: (t: string) => void
}
