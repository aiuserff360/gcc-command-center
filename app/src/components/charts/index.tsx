import type { ReactNode } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid #E3E8F0', fontSize: 12, boxShadow: '0 4px 12px rgba(16,24,40,.08)' },
  labelStyle: { color: '#111827', fontWeight: 600 },
  itemStyle: { color: '#374151' },
}

/** Multi-slice donut with a centered label. */
export function Donut({ data, size = 150, inner = 0.68, center, colors, height }: {
  data: { name: string; value: number; color?: string }[]; size?: number; inner?: number; center?: ReactNode; colors?: string[]; height?: number
}) {
  const h = height ?? size
  return (
    <div className="relative mx-auto" style={{ width: size, height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={`${inner * 100}%`} outerRadius="100%" paddingAngle={1.5} startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={d.name} fill={d.color ?? colors?.[i] ?? '#94A3B8'} />)}
          </Pie>
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">{center}</div>}
    </div>
  )
}

/** Simple horizontal bar list (label | bar | value). */
export function BarList({ rows, max, color = '#2B6FD6', valueFmt = (v: number) => String(v), labelWidth = 150 }: {
  rows: { label: string; value: number; color?: string; icon?: ReactNode; right?: ReactNode }[]; max?: number; color?: string; valueFmt?: (v: number) => string; labelWidth?: number
}) {
  const m = max ?? Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-[12.5px]">
          <span className="flex items-center gap-2 text-ink-700 truncate" style={{ width: labelWidth, minWidth: labelWidth }}>{r.icon}{r.label}</span>
          <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(r.value / m) * 100}%`, background: r.color ?? color }} /></div>
          <span className="w-14 text-right font-medium text-ink-900">{r.right ?? valueFmt(r.value)}</span>
        </div>
      ))}
    </div>
  )
}
