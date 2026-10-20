import { MoreVertical } from 'lucide-react'
import { useStore } from '../store/useStore'
import { InputLayout } from '../components/layout/InputLayout'
import { BusinessUnitsOutput, BusinessUnitGrid } from '../components/footprint/BusinessUnits'

/** Target Footprint – the business units the GCC will host and their FTE ramp-up. */
export default function TargetFootprint() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  if (mode === 'input') {
    return <InputLayout title="Target Footprint" subtitle="Define the business units of the GCC and the planned headcount per year." tabs={[{ name: 'Business units & FTE plan', content: <BusinessUnitGrid /> }]} />
  }
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-navy-900 leading-tight">Target Footprint</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">Business units, transition waves and FTE ramp-up the GCC will deliver.</p>
        </div>
        <button className="text-ink-500 hover:text-ink-900 cursor-pointer"><MoreVertical size={18} /></button>
      </div>
      <BusinessUnitsOutput onEdit={() => setMode('input')} />
    </div>
  )
}
