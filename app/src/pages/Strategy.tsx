import { useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { PageHeader } from '../components/layout/AppShell'
import { InputLayout } from '../components/layout/InputLayout'
import { TargetFootprintOutput } from '../components/footprint/FootprintOutput'
import { OrgStructureEditor } from '../components/footprint/OrgStructure'
import { HeadcountRampEditor } from '../components/footprint/HeadcountRamp'

export const RAMP_HINT = 'Year 1 is tracked month by month (cumulative Pune headcount from Nov 2026); from year 2 the plan carries annual exit targets. Business-unit and program totals are derived from the capabilities.'

/** Target Footprint – the IT domains and capabilities the GCC will host in Pune and their headcount ramp-up. */
export default function TargetFootprint() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const [params] = useSearchParams() // deep link: /strategy?bu=<business unit>
  if (mode === 'input') {
    return (
      <InputLayout title="Target Footprint" subtitle="Configure the organisation structure of the ENGIE IT GCC – business units (IT domains), their capabilities and the headcount ramp-up to Pune."
        tabs={[
          { name: 'Organisation structure', content: <OrgStructureEditor />, hint: 'Business units are the IT domains; each capability carries the GBU served, geography, country / entity, current delivery location, headcount, role / skill, transition type and wave from the footprint slide.' },
          { name: 'Headcount ramp-up', content: <HeadcountRampEditor />, hint: RAMP_HINT },
        ]} />
    )
  }
  return (
    <div>
      <PageHeader title="IT GCC Target Footprint & Headcount Ramp-Up" subtitle="Capability-led  |  Business-aligned  |  Global in Scope  |  Phased Transition to Pune" dateRange="01 Nov 2026 – 30 Apr 2027" onEdit={() => setMode('input')} editLabel="Edit in Input view" />
      <TargetFootprintOutput initialUnit={params.get('bu') ?? undefined} />
    </div>
  )
}
