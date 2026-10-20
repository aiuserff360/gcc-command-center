import { MoreVertical } from 'lucide-react'
import ScopeTab from '../components/strategy/ScopeTab'

/** Target Footprint – the scope of services the GCC will deliver (formerly the Scope & Services tab of Strategy & Business Case). */
export default function TargetFootprint() {
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-navy-900 leading-tight">Target Footprint</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">Scope of services, service lines and FTE ramp-up the GCC will deliver.</p>
        </div>
        <button className="text-ink-500 hover:text-ink-900 cursor-pointer"><MoreVertical size={18} /></button>
      </div>
      <ScopeTab />
    </div>
  )
}
