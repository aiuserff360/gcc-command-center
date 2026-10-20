/**
 * Input view shell used by every module: a header, an optional intro, and a tab strip of
 * input registers / forms. The Output view (dashboards) is reached with the toggle in the top bar.
 */
import { useState, type ReactNode } from 'react'
import { LayoutDashboard, PencilLine } from 'lucide-react'
import { Tabs } from '../ui'
import { useStore } from '../../store/useStore'

export interface InputTab { name: string; content: ReactNode; hint?: string }

export function InputLayout({ title, subtitle, tabs, initialTab, right }: { title: string; subtitle?: string; tabs: InputTab[]; initialTab?: string; right?: ReactNode }) {
  const setMode = useStore((s) => s.setMode)
  const [tab, setTab] = useState(initialTab && tabs.some((t) => t.name === initialTab) ? initialTab : tabs[0]?.name ?? '')
  const current = tabs.find((t) => t.name === tab) ?? tabs[0]
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 rounded px-2 py-0.5 mb-1.5"><PencilLine size={12} /> Input view</div>
          <h2 className="text-[24px] font-bold tracking-tight text-navy-900 leading-tight">{title}</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">{subtitle ?? 'Enter and maintain the data behind this module. Everything you save here drives the Output view.'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {right}
          <button className="btn-secondary" onClick={() => setMode('output')}><LayoutDashboard size={14} /> See the Output view</button>
        </div>
      </div>
      {tabs.length > 1 && <Tabs tabs={tabs.map((t) => t.name)} active={tab} onChange={setTab} />}
      {current?.hint && <p className="text-[12.5px] text-ink-500 -mt-2">{current.hint}</p>}
      {current?.content}
    </div>
  )
}
