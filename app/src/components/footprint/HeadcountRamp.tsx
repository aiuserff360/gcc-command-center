/**
 * Headcount ramp-up editor – year 1 month by month (cumulative Pune HC per capability, Nov 2026 onwards),
 * years 2–5 as annual exit targets. Grouped by business unit with domain subtotals and program totals.
 * Shared by GCC Setup (tab 3) and the Input view of Target Footprint.
 */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { AlertTriangle, Wand2, CheckCircle2 } from 'lucide-react'
import { Card } from '../ui'
import { Grid, NumCell, tdCls } from '../ui/InlineGrid'
import { RAMP_MONTHS, YEARS, YEAR_KEYS, subUnitsOf, subY1, buShortName, type BusinessUnit, type SubUnit } from '../../data/businessUnits'
import { useBusinessUnits, DomainIcon, domainColor, monthLong, monthReached } from './BusinessUnits'

const Y25 = ['y2', 'y3', 'y4', 'y5'] as const
const linearTo = (target: number, endIdx: number) => RAMP_MONTHS.map((_, i) => (i >= endIdx ? target : Math.round((target * (i + 1)) / (endIdx + 1))))
const rampOf = (s: SubUnit) => RAMP_MONTHS.map((_, i) => s.ramp[i] ?? 0)

/** Consistency checks on one capability's ramp. */
export function rampIssues(s: SubUnit): string[] {
  const r = rampOf(s); const out: string[] = []
  const dip = r.findIndex((v, i) => i > 0 && v < r[i - 1])
  if (dip > 0) out.push(`ramp decreases in ${RAMP_MONTHS[dip]} (${r[dip - 1]} → ${r[dip]}) – cumulative headcount should not fall`)
  if (r[r.length - 1] !== s.targetHc) out.push(`ends year 1 at ${r[r.length - 1]} but target Pune HC is ${s.targetHc}`)
  return out
}

const num = 'text-right tabular-nums'
const sub = 'bg-surface/70 font-semibold text-[12px]'

function GroupRow({ u, i, span }: { u: BusinessUnit; i: number; span: number }) {
  return (
    <tr><td colSpan={span} className="pt-2.5 pb-1 px-1.5">
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-900"><span className="w-5 h-5 rounded flex items-center justify-center text-white" style={{ background: domainColor(i) }}><DomainIcon name={u.icon} size={12} /></span>{u.name}<span className="text-[11px] font-normal text-ink-500">· {u.wave} · {u.owner}</span></span>
    </td></tr>
  )
}

export function HeadcountRampEditor({ compact }: { compact?: boolean }) {
  const { items, subUnits } = useBusinessUnits()
  const [endIdx, setEndIdx] = useState(5)
  const units = items.filter((u) => u.status !== 'Out of Scope')
  const groups = useMemo(() => units.map((u) => ({ u, i: items.indexOf(u), subs: subUnitsOf(subUnits.items, u.id) })), [units, items, subUnits.items])
  const all = groups.flatMap((g) => g.subs)
  const programRamp = RAMP_MONTHS.map((_, i) => all.reduce((t, s) => t + (s.ramp[i] ?? 0), 0))
  const yearTotals = YEAR_KEYS.map((k) => units.reduce((t, u) => t + u[k], 0))
  const issues = useMemo(() => all.flatMap((s) => rampIssues(s).map((m) => ({ s, m }))), [all])
  const setRamp = (s: SubUnit, i: number, v: number) => { const r = rampOf(s); r[i] = v; subUnits.update({ ...s, ramp: r }) }
  const fill = (s: SubUnit) => subUnits.update({ ...s, ramp: linearTo(s.targetHc, endIdx) })
  const fillAll = () => { if (window.confirm(`Replace the month-wise ramp of all ${all.length} capabilities with a linear ramp reaching their target Pune HC by ${monthLong(RAMP_MONTHS[endIdx])}?`)) all.forEach(fill) }
  const reached = monthReached(programRamp)
  const span = RAMP_MONTHS.length + 3
  return (
    <div className="space-y-4">
      {!compact && (
        <div className="grid grid-cols-5 gap-3">
          {YEARS.map((y, i) => (
            <div key={y} className="card px-3.5 py-2.5">
              <div className="text-[11.5px] text-ink-500">{y}{i === 0 ? ' · month-wise' : ' · annual target'}</div>
              <div className="text-[22px] font-bold text-navy-900 leading-tight">{yearTotals[i]}</div>
              <div className="text-[11.5px] text-ink-500">{i === 0 ? `Pune HC reached by ${monthLong(RAMP_MONTHS[reached])}` : yearTotals[i - 1] ? `+${yearTotals[i] - yearTotals[i - 1]} · ${Math.round(((yearTotals[i] - yearTotals[i - 1]) / yearTotals[i - 1]) * 100)}% growth` : `+${yearTotals[i]}`}</div>
            </div>
          ))}
        </div>
      )}

      <Card title="Year 1 · month-wise headcount ramp-up" subtitle={`Cumulative Pune headcount per capability for each month from ${monthLong(RAMP_MONTHS[0])} to ${monthLong(RAMP_MONTHS[RAMP_MONTHS.length - 1])}. The last month is the capability's year-1 headcount; business units and the program roll up automatically.`}
        headerRight={issues.length ? <span className="inline-flex items-center gap-1 text-[12px] text-amber-700 bg-amber-50 rounded px-2 py-0.5 whitespace-nowrap"><AlertTriangle size={13} /> {issues.length} consistency warning{issues.length === 1 ? '' : 's'}</span> : <span className="inline-flex items-center gap-1 text-[12px] text-green-700 bg-green-50 rounded px-2 py-0.5 whitespace-nowrap"><CheckCircle2 size={13} /> Ramps consistent</span>}
        action={
          <div className="flex items-center gap-2 text-[12px] text-ink-700 whitespace-nowrap">
            <span>Fill linearly to target by</span>
            <select className="input py-1 w-auto text-[12px]" value={endIdx} onChange={(e) => setEndIdx(parseInt(e.target.value))}>{RAMP_MONTHS.map((m, i) => <option key={m} value={i}>{monthLong(m)}</option>)}</select>
            <button className="btn-secondary py-1 text-[12px]" onClick={fillAll}><Wand2 size={13} /> Apply to all</button>
          </div>
        }>
        <Grid headers={['Capability', { label: 'Target', right: true }, ...RAMP_MONTHS.map((m) => ({ label: m, right: true })), '']} count={all.length} minWidth={1120} stickyActions={false} empty="No capabilities yet – add them under Organisation structure first.">
          {groups.map((g) => (
            <GroupRows key={g.u.id} g={g} span={span} setRamp={setRamp} fill={fill} endIdx={endIdx} />
          ))}
          <tr>
            <td className={clsx(tdCls, 'px-2 py-1.5 font-semibold text-[12.5px] border-t-2 border-slate-300')}>Program total (cumulative Pune HC)</td>
            <td className={clsx(tdCls, num, 'px-2 font-semibold text-[12.5px] border-t-2 border-slate-300')}>{all.reduce((t, s) => t + s.targetHc, 0)}</td>
            {programRamp.map((v, i) => <td key={i} className={clsx(tdCls, num, 'px-2 font-semibold text-[12.5px] border-t-2 border-slate-300', i === reached && 'text-brand-600')}>{v}</td>)}
            <td className={clsx(tdCls, 'border-t-2 border-slate-300')} />
          </tr>
        </Grid>
        {issues.length > 0 && (
          <ul className="mt-3 space-y-1 text-[12px] text-amber-800">
            {issues.map((x, i) => <li key={i} className="flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><span><b>{x.s.name}</b>: {x.m}.</span></li>)}
          </ul>
        )}
      </Card>

      <Card title="Years 2–5 · annual headcount targets" subtitle="Exit headcount per capability at the end of each year. Year 1 is read from the last month of the ramp above.">
        <Grid headers={['Capability', { label: 'Year 1 (ramp)', right: true }, ...Y25.map((_, i) => ({ label: YEARS[i + 1], right: true })), { label: 'Y1 → Y5', right: true }]} count={all.length} minWidth={760} stickyActions={false} empty="No capabilities yet – add them under Organisation structure first.">
          {groups.map((g) => (
            <AnnualRows key={g.u.id} g={g} update={subUnits.update} />
          ))}
          <tr>
            <td className={clsx(tdCls, 'px-2 py-1.5 font-semibold text-[12.5px] border-t-2 border-slate-300')}>Program total</td>
            {yearTotals.map((v, i) => <td key={i} className={clsx(tdCls, num, 'px-2 font-semibold text-[12.5px] border-t-2 border-slate-300')}>{v}</td>)}
            <td className={clsx(tdCls, num, 'px-2 font-semibold text-[12.5px] border-t-2 border-slate-300 text-green-700')}>{yearTotals[0] ? `+${Math.round(((yearTotals[4] - yearTotals[0]) / yearTotals[0]) * 100)}%` : '—'}</td>
          </tr>
        </Grid>
      </Card>
    </div>
  )
}

type Group = { u: BusinessUnit; i: number; subs: SubUnit[] }

function GroupRows({ g, span, setRamp, fill, endIdx }: { g: Group; span: number; setRamp: (s: SubUnit, i: number, v: number) => void; fill: (s: SubUnit) => void; endIdx: number }) {
  const subtotal = RAMP_MONTHS.map((_, i) => g.subs.reduce((t, s) => t + (s.ramp[i] ?? 0), 0))
  return (
    <>
      <GroupRow u={g.u} i={g.i} span={span} />
      {g.subs.map((s) => {
        const iss = rampIssues(s)
        return (
          <tr key={s.id} className="group hover:bg-brand-50/40">
            <td className={clsx(tdCls, 'px-2 pl-8 text-[12px] whitespace-nowrap')}>{s.name}<span className="text-ink-400 ml-1.5 text-[11px]">{s.wave.replace('Wave ', 'W')}</span></td>
            <td className={clsx(tdCls, num, 'px-2 text-[12px] text-ink-500')}>{s.targetHc}</td>
            {RAMP_MONTHS.map((_, i) => <td key={i} className={clsx(tdCls, 'text-right')}><NumCell value={s.ramp[i] ?? 0} min={0} className={clsx('w-[52px]', i === RAMP_MONTHS.length - 1 && 'font-semibold')} onChange={(v) => setRamp(s, i, v)} /></td>)}
            <td className={clsx(tdCls, 'whitespace-nowrap')}>
              <span className="inline-flex items-center">
                <button title={`Fill linearly to ${s.targetHc} by ${monthLong(RAMP_MONTHS[endIdx])}`} className="text-slate-400 hover:text-brand-600 p-1 cursor-pointer" onClick={() => fill(s)}><Wand2 size={13} /></button>
                {iss.length > 0 && <span title={iss.join('\n')} className="text-amber-500 p-1"><AlertTriangle size={13} /></span>}
              </span>
            </td>
          </tr>
        )
      })}
      <tr>
        <td className={clsx(tdCls, sub, 'px-2 pl-8 text-ink-700')}>Subtotal · {buShortName(g.u.name)}</td>
        <td className={clsx(tdCls, sub, num, 'px-2')}>{g.subs.reduce((t, s) => t + s.targetHc, 0)}</td>
        {subtotal.map((v, i) => <td key={i} className={clsx(tdCls, sub, num, 'px-2')}>{v}</td>)}
        <td className={clsx(tdCls, sub)} />
      </tr>
    </>
  )
}

function AnnualRows({ g, update }: { g: Group; update: (s: SubUnit) => void }) {
  const y1 = g.subs.reduce((t, s) => t + subY1(s), 0)
  const tot = Y25.map((k) => g.subs.reduce((t, s) => t + s[k], 0))
  return (
    <>
      <GroupRow u={g.u} i={g.i} span={7} />
      {g.subs.map((s) => (
        <tr key={s.id} className="group hover:bg-brand-50/40">
          <td className={clsx(tdCls, 'px-2 pl-8 text-[12px] whitespace-nowrap')}>{s.name}</td>
          <td className={clsx(tdCls, num, 'px-2 text-[12px] text-ink-500')}>{subY1(s)}</td>
          {Y25.map((k) => <td key={k} className={clsx(tdCls, 'text-right')}><NumCell value={s[k]} min={0} className="w-[64px]" onChange={(v) => update({ ...s, [k]: v })} /></td>)}
          <td className={clsx(tdCls, num, 'px-2 text-[12px] text-ink-500')}>{subY1(s) ? `${s.y5 - subY1(s) >= 0 ? '+' : ''}${Math.round(((s.y5 - subY1(s)) / subY1(s)) * 100)}%` : s.y5 ? `+${s.y5}` : '—'}</td>
        </tr>
      ))}
      <tr>
        <td className={clsx(tdCls, sub, 'px-2 pl-8 text-ink-700')}>Subtotal · {buShortName(g.u.name)}</td>
        <td className={clsx(tdCls, sub, num, 'px-2')}>{y1}</td>
        {tot.map((v, i) => <td key={i} className={clsx(tdCls, sub, num, 'px-2')}>{v}</td>)}
        <td className={clsx(tdCls, sub, num, 'px-2')}>{y1 ? `+${Math.round(((tot[3] - y1) / y1) * 100)}%` : '—'}</td>
      </tr>
    </>
  )
}
