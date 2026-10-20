/**
 * Business-unit RACI matrix (units × key roles). The workstream RACI stays in Governance.tsx.
 */
import clsx from 'clsx'
import { Card, Legend } from '../ui'
import { SelectCell, RemoveBtn, AddBtn } from '../ui/InlineGrid'
import { CHART_COLORS } from '../../data/common'
import { BU_RACI_ROLES, type BuRaciRow, type RaciValue } from '../../data/governance'
import type { useCollection } from '../../store/useStore'
import { uid } from '../../store/useStore'

export const nextRaci = (v: RaciValue): RaciValue => (v === 'R' ? 'A' : v === 'A' ? 'C' : v === 'C' ? 'I' : v === 'I' ? '' : 'R')
export const RACI_LEGEND = [{ label: 'R Responsible', color: CHART_COLORS.blue }, { label: 'A Accountable', color: CHART_COLORS.red }, { label: 'C Consulted', color: CHART_COLORS.amber }, { label: 'I Informed', color: CHART_COLORS.gray }]
export const raciCellCls = (v: RaciValue) => v === 'R' ? 'bg-blue-50 text-brand-600' : v === 'A' ? 'bg-red-50 text-red-600' : v === 'C' ? 'bg-amber-50 text-amber-700' : v === 'I' ? 'bg-slate-100 text-slate-600' : 'bg-white text-ink-400 border border-dashed border-line'

export function BuRaciMatrix({ raciC, units, editable, highlight, title = 'RACI Matrix – Business Units × Key Roles', onSelectUnit }: {
  raciC: ReturnType<typeof useCollection<BuRaciRow>>; units: string[]; editable?: boolean; highlight?: string; title?: string; onSelectUnit?: (u: string) => void
}) {
  const add = () => { const used = raciC.items.map((r) => r.businessUnit); const bu = units.find((u) => !used.includes(u)) ?? units[0] ?? 'New business unit'; raciC.add({ id: uid('buraci'), businessUnit: bu, cells: Object.fromEntries(BU_RACI_ROLES.map((r) => [r, ''])) }) }
  const rows = highlight ? raciC.items.filter((r) => r.businessUnit === highlight) : raciC.items
  return (
    <Card title={title} subtitle={highlight ? `Roles for ${highlight} · click a cell to cycle R → A → C → I → blank` : 'Who is responsible and accountable for each business unit · click a cell to cycle R → A → C → I → blank'} headerRight={<Legend items={RACI_LEGEND} />} action={editable ? <AddBtn label="Add row" onClick={add} /> : undefined}>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full border-separate border-spacing-0 tbl">
          <thead><tr><th className="th">Business unit</th>{BU_RACI_ROLES.map((r) => <th key={r} className="th text-center">{r}</th>)}{editable && <th className="th" />}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="td text-ink-500 text-center py-5" colSpan={BU_RACI_ROLES.length + 2}>No RACI row for this business unit yet{editable ? ' – use "Add row".' : '.'}</td></tr>}
            {rows.map((row) => (
              <tr key={row.id} className={clsx(highlight && row.businessUnit === highlight && 'bg-brand-50/40')}>
                <td className="td font-medium whitespace-nowrap">
                  {editable ? <SelectCell value={row.businessUnit} options={units} className="font-medium min-w-[200px]" onChange={(v) => raciC.update({ ...row, businessUnit: v })} />
                    : onSelectUnit ? <button className="text-brand-600 hover:underline cursor-pointer" onClick={() => onSelectUnit(row.businessUnit)}>{row.businessUnit}</button> : row.businessUnit}
                </td>
                {BU_RACI_ROLES.map((r) => {
                  const v = row.cells[r] ?? ''
                  return <td key={r} className="td text-center"><button className={`w-8 h-8 rounded-md text-[12.5px] font-bold cursor-pointer ${raciCellCls(v)}`} onClick={() => raciC.update({ ...row, cells: { ...row.cells, [r]: nextRaci(v) } })}>{v || '–'}</button></td>
                })}
                {editable && <td className="td"><RemoveBtn name={`the ${row.businessUnit} RACI row`} onClick={() => raciC.remove(row.id)} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
