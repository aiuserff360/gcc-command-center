/**
 * Cost-model state: the single 'costModel' record (inputs), saved scenarios in 'costModelScenarios',
 * the business units and the computed result. Every input grid writes through `patch`.
 */
import { useMemo } from 'react'
import { useCollection } from '../../../store/useStore'
import { useMoney } from '../../../data/money'
import { seedBusinessUnits, type BusinessUnit } from '../../../data/businessUnits'
import { useBusinessUnits } from '../../footprint/BusinessUnits'
import { computeModel, seedCostModel, seedCostScenarios, type CostModelInputs, type CostScenario, type ModelResult } from '../../../data/costModel'

const SEED_MODEL: CostModelInputs[] = [seedCostModel(seedBusinessUnits)]
const SEED_SCENARIOS: CostScenario[] = seedCostScenarios(seedBusinessUnits)

export function useCostModel() {
  const m = useMoney()
  const bus = useBusinessUnits()
  const modelC = useCollection<CostModelInputs>('costModel', SEED_MODEL)
  const scenariosC = useCollection<CostScenario>('costModelScenarios', SEED_SCENARIOS)
  const inputs = modelC.items[0] ?? SEED_MODEL[0]
  const units = useMemo(() => bus.items.filter((u) => u.status !== 'Out of Scope'), [bus.items])
  const result: ModelResult = useMemo(() => computeModel(inputs, bus.items), [inputs, bus.items])
  const save = (next: CostModelInputs) => modelC.update({ ...next, id: 'model' })
  /** Mutate a deep copy of the inputs and save it. */
  const patch = (fn: (draft: CostModelInputs) => void) => { const d = JSON.parse(JSON.stringify(inputs)) as CostModelInputs; fn(d); save(d) }
  return { m, inputs, result, units, allUnits: bus.items as BusinessUnit[], save, patch, scenariosC, modelC }
}
export type CostModel = ReturnType<typeof useCostModel>
