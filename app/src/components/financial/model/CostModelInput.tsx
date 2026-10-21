/**
 * Input view → "GCC run-rate cost model": the six model tabs. The selected business unit is shared
 * between the headcount and people-costs tabs.
 */
import { useState } from 'react'
import { Tabs } from '../../ui'
import { useCostModel } from './useCostModel'
import { HeadcountInput } from './InputHeadcount'
import { PeopleCostsInput, DEFAULT_SCOPE } from './InputPeople'
import { RealEstateInput } from './InputRealEstate'
import { TechnologyInput, CentreOpsInput } from './InputTechOps'
import { ModelSettingsInput } from './InputSettings'

export const MODEL_INPUT_TABS = ['Cost model: headcount', 'Cost model: people costs', 'Cost model: real estate', 'Cost model: technology', 'Cost model: centre operations & one-time', 'Model settings'] as const
const HINTS: Record<(typeof MODEL_INPUT_TABS)[number], string> = {
  'Cost model: headcount': 'Exit headcount per business unit (from the FTE plan), experience mix and the derived average headcount that every cost is built on.',
  'Cost model: people costs': 'Compensation by experience band (program default or per business unit), statutory benefits, fully loaded cost per FTE and other people costs – each next to its industry reference.',
  'Cost model: real estate': 'Office model (managed office, coworking or conventional lease) and its unit-cost assumptions; seats follow exit headcount.',
  'Cost model: technology': 'Devices per new hire with a refresh cycle and per-user monthly rates for licences, cloud, security, support and network.',
  'Cost model: centre operations & one-time': 'Fixed corporate costs per year and the one-time establishment costs of Year 1.',
  'Model settings': 'Horizon, first year, opening headcount, attrition backfill, escalation modes and the industry-reference actions.',
}

export function CostModelInput() {
  const cm = useCostModel()
  const [tab, setTab] = useState<(typeof MODEL_INPUT_TABS)[number]>(MODEL_INPUT_TABS[0])
  const [unit, setUnit] = useState<string>(cm.units[0]?.id ?? '')
  const [scope, setScope] = useState<string>(DEFAULT_SCOPE)
  return (
    <div className="space-y-4">
      <Tabs size="sm" tabs={[...MODEL_INPUT_TABS]} active={tab} onChange={(t) => setTab(t as typeof tab)} />
      <p className="text-[12.5px] text-ink-500 -mt-2">{HINTS[tab]}</p>
      {tab === 'Cost model: headcount' && <HeadcountInput cm={cm} unit={unit} onUnit={setUnit} />}
      {tab === 'Cost model: people costs' && <PeopleCostsInput cm={cm} unit={scope} onUnit={setScope} />}
      {tab === 'Cost model: real estate' && <RealEstateInput cm={cm} />}
      {tab === 'Cost model: technology' && <TechnologyInput cm={cm} />}
      {tab === 'Cost model: centre operations & one-time' && <CentreOpsInput cm={cm} />}
      {tab === 'Model settings' && <ModelSettingsInput cm={cm} />}
    </div>
  )
}
