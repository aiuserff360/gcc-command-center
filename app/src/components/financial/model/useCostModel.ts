/**
 * Cost-model state: the single 'costModel' record (inputs), saved scenarios in 'costModelScenarios',
 * the business units and the computed result. Every input grid writes through `patch`.
 *
 * Business units are read from 'businessUnits' and rolled up from 'subUnits' (capabilities), so the
 * exit headcount of each IT domain is always the sum of its capabilities' year-1 ramp and y2..y5 targets.
 */
import { useMemo } from 'react'
import { useCollection } from '../../../store/useStore'
import { useMoney } from '../../../data/money'
import { seedBusinessUnits, seedSubUnits, rollUpUnits, type BusinessUnit, type SubUnit } from '../../../data/businessUnits'
import { computeModel, seedCostModel, seedCostScenarios, type CostModelInputs, type CostScenario, type ModelResult } from '../../../data/costModel'

const SEED_MODEL: CostModelInputs[] = [seedCostModel(seedBusinessUnits)]
const SEED_SCENARIOS: CostScenario[] = seedCostScenarios(seedBusinessUnits)

export function useCostModel() {
  const m = useMoney()
  const bus = useCollection<BusinessUnit>('businessUnits', seedBusinessUnits)
  const subs = useCollection<SubUnit>('subUnits', seedSubUnits)
  const modelC = useCollection<CostModelInputs>('costModel', SEED_MODEL)
  const scenariosC = useCollection<CostScenario>('costModelScenarios', SEED_SCENARIOS)
  const inputs: CostModelInputs = modelC.items[0] ?? SEED_MODEL[0]
  const allUnits = useMemo(() => rollUpUnits(bus.items, subs.items), [bus.items, subs.items])
  const units = useMemo(() => allUnits.filter((u) => u.status !== 'Out of Scope'), [allUnits])
  const result: ModelResult = useMemo(() => computeModel(inputs, allUnits), [inputs, allUnits])
  const save = (next: CostModelInputs) => modelC.update({ ...next, id: 'model' })
  /** Mutate a deep copy of the inputs and save it. */
  const patch = (fn: (draft: CostModelInputs) => void) => { const d = JSON.parse(JSON.stringify(inputs)) as CostModelInputs; fn(d); save(d) }
  return { m, inputs, result, units, allUnits, save, patch, scenariosC, modelC }
}
export type CostModel = ReturnType<typeof useCostModel>
