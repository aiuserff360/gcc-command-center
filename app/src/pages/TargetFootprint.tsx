import { MoreVertical } from 'lucide-react'
import { Card } from '../components/ui'

/** Target Footprint – placeholder shell; content to be defined with the next round of feedback. */
export default function TargetFootprint() {
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-navy-900 leading-tight">Target Footprint</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">Target footprint of the GCC program.</p>
        </div>
        <button className="text-ink-500 hover:text-ink-900 cursor-pointer"><MoreVertical size={18} /></button>
      </div>
      <Card>
        <p className="text-[13px] text-ink-500 py-10 text-center">Content for this page will be defined next.</p>
      </Card>
    </div>
  )
}
