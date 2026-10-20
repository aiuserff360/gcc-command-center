import { useMemo } from 'react'
import clsx from 'clsx'
import { LIKELIHOOD, IMPACT_SCALE, type RaidItem } from '../../data/shared'
import { cellSeverity, SEVERITY_COLORS, likelihoodIndex, impactIndex } from '../../data/risks'

/**
 * 5×5 Likelihood × Impact heat map. Rows run Very High → Very Low (top → bottom), columns Very Low → Very High.
 * Counts are the number of `items` falling into each cell.
 */
export function HeatMap({ items, cellHeight = 30, labelWidth = 66, onCell, selected, showCounts = true, showScore = false, className }: {
  items: RaidItem[]
  cellHeight?: number
  labelWidth?: number
  onCell?: (li: number, ii: number) => void
  selected?: { li: number; ii: number } | null
  showCounts?: boolean
  showScore?: boolean
  className?: string
}) {
  const counts = useMemo(() => {
    const c = Array.from({ length: 5 }, () => Array(5).fill(0) as number[])
    items.forEach((r) => { c[likelihoodIndex(r.likelihood)][impactIndex(r.impact)]++ })
    return c
  }, [items])

  return (
    <div className={clsx('flex', className)}>
      <div className="flex items-center justify-center shrink-0" style={{ width: 18 }}>
        <span className="text-[11.5px] font-semibold text-ink-700 -rotate-90 whitespace-nowrap" style={{ marginBottom: 32 }}>Likelihood</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `${labelWidth}px repeat(5, minmax(0, 1fr))` }}>
          {[4, 3, 2, 1, 0].map((li) => (
            <RowFrag key={li} li={li} counts={counts[li]} cellHeight={cellHeight} onCell={onCell} selected={selected} showCounts={showCounts} showScore={showScore} />
          ))}
          <div />
          {IMPACT_SCALE.map((l) => <div key={l} className="text-[11px] text-ink-700 text-center pt-1 whitespace-nowrap">{l}</div>)}
        </div>
        <div className="text-center text-[11.5px] font-semibold text-ink-700 mt-1" style={{ paddingLeft: labelWidth }}>Impact</div>
      </div>
    </div>
  )
}

function RowFrag({ li, counts, cellHeight, onCell, selected, showCounts, showScore }: {
  li: number; counts: number[]; cellHeight: number; onCell?: (li: number, ii: number) => void; selected?: { li: number; ii: number } | null; showCounts: boolean; showScore: boolean
}) {
  return (
    <>
      <div className="text-[11px] text-ink-700 text-right pr-2 flex items-center justify-end whitespace-nowrap" style={{ height: cellHeight }}>{LIKELIHOOD[li]}</div>
      {counts.map((n, ii) => {
        const sev = cellSeverity(li, ii)
        const isSel = selected && selected.li === li && selected.ii === ii
        return (
          <button
            key={ii}
            type="button"
            onClick={() => onCell?.(li, ii)}
            title={`${LIKELIHOOD[li]} likelihood × ${IMPACT_SCALE[ii]} impact – ${sev} (${n})`}
            className={clsx('relative flex items-center justify-center rounded-[3px] transition-transform', onCell && 'cursor-pointer hover:scale-[1.04] hover:z-10', isSel && 'ring-2 ring-navy-900 ring-offset-1 z-10')}
            style={{ height: cellHeight, background: SEVERITY_COLORS[sev] }}
          >
            {showScore && <span className="absolute top-0.5 left-1.5 text-[10px] font-medium text-black/50">{(li + 1) * (ii + 1)}</span>}
            {showCounts && n > 0 && (
              <span className="rounded-full bg-white text-ink-900 font-semibold flex items-center justify-center shadow-sm" style={{ width: cellHeight >= 44 ? 28 : 22, height: cellHeight >= 44 ? 28 : 22, fontSize: cellHeight >= 44 ? 13 : 11.5 }}>{n}</span>
            )}
          </button>
        )
      })}
    </>
  )
}

export function SeverityLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-700">
      {(['Low', 'Medium', 'High', 'Critical'] as const).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: SEVERITY_COLORS[s] }} />{s}</span>
      ))}
    </div>
  )
}
