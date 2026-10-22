/**
 * Cost model: people costs – compensation by experience band (program default or per business unit),
 * statutory & benefit assumptions, the derived fully loaded cost per FTE, and other people costs
 * (per new hire, per average FTE, fixed per year). Every input sits next to its industry reference.
 */
import clsx from 'clsx'
import { Download } from 'lucide-react'
import { Card } from '../../ui'
import { BANDS, BAND_COLORS, REFERENCE, loadedCost, unitComp, unitHasOwnComp, unitBaseByYear, sumArr, type CompInputs, type EscalationMode, type NewHireCosts, type PerFteCosts, type FixedPeopleCosts } from '../../../data/costModel'
import type { CostModel } from './useCostModel'
import { UnitSelector, MoneyInput, PctInput, VsRef, RefCell, ModeToggle, MiniBtn, gth, gtd, lakhNum, lakhUnit, lakhFmt, type LakhScale } from './shared'

export const DEFAULT_SCOPE = 'default'

export function PeopleCostsInput({ cm, unit, onUnit }: { cm: CostModel; unit: string; onUnit: (id: string) => void }) {
  const { m, inputs, result, units, patch } = cm
  const scope = unit === DEFAULT_SCOPE || !units.some((u) => u.id === unit) ? DEFAULT_SCOPE : unit
  const bu = units.find((u) => u.id === scope)
  const own = bu ? unitHasOwnComp(inputs, bu) : true
  const comp: CompInputs = bu ? unitComp(inputs, bu) : inputs.defaults.comp
  const baseByYear = bu ? unitBaseByYear(inputs, bu) : inputs.defaults.baseByYear
  const loaded = loadedCost(inputs, comp, baseByYear, 0)
  const mode = inputs.settings.compMode
  const H = result.horizon
  const ref = REFERENCE.comp
  const editable = !bu || own

  /** Write to the program default or to the unit's own compensation. */
  const setComp = (fn: (c: CompInputs, bby: number[][]) => void) => patch((d) => {
    if (!bu) fn(d.defaults.comp, d.defaults.baseByYear)
    else { const o = d.units[bu.id] ?? {}; const c = o.comp ?? JSON.parse(JSON.stringify(d.defaults.comp)); const bby = o.baseByYear ?? d.defaults.baseByYear.map((r) => [...r]); fn(c, bby); d.units[bu.id] = { ...o, comp: c, baseByYear: bby } }
  })
  const toggleOwn = (v: boolean) => patch((d) => { if (!bu) return; const o = d.units[bu.id] ?? {}; if (v) d.units[bu.id] = { ...o, comp: JSON.parse(JSON.stringify(d.defaults.comp)), baseByYear: d.defaults.baseByYear.map((r) => [...r]) }; else { const { comp: _c, baseByYear: _b, ...rest } = o; void _c; void _b; d.units[bu.id] = rest } })
  const fillComp = () => setComp((c) => { c.base = c.base.map((v, i) => v || ref.base[i]); c.variableRate = c.variableRate.map((v, i) => v || ref.variableRate[i]); c.allowanceRate = c.allowanceRate.map((v, i) => v || ref.allowanceRate[i]) })
  const weighted = (id: string) => { const y = result.byUnit[id]?.years[0]; if (!y || !y.avg) return 0; return sumArr(y.loadedPerFte.map((l, i) => l * y.byBand[i])) / y.avg }
  const defaultWeighted = sumArr(loadedCost(inputs, inputs.defaults.comp, inputs.defaults.baseByYear, 0).map((l, i) => l.total * (inputs.defaults.mixShare[i] ?? 0))) / (sumArr(inputs.defaults.mixShare) || 100)

  const cards = [
    { id: DEFAULT_SCOPE, name: 'Program default', kind: 'Applies to every unit without its own compensation', big: lakhFmt(m, defaultWeighted), sub: 'fully loaded cost per FTE, Year 1 (default mix)', color: '#0B2240' },
    ...units.map((u) => ({ id: u.id, name: u.name, kind: u.kind, big: lakhFmt(m, weighted(u.id)), sub: 'fully loaded cost per FTE, Year 1', foot: unitHasOwnComp(inputs, u) ? <span className="text-brand-600 font-medium">own compensation</span> : <span className="text-ink-500">program default</span> })),
  ]

  return (
    <div className="space-y-4">
      <UnitSelector title="Compensation scope" subtitle="Edit the program default or give a business unit its own compensation (e.g. Enterprise Applications and Data, Analytics & AI +10 %, Digital Workplace and IT Service Management −5 %). Benefits and other people costs are program-level." cards={cards} selected={scope} onSelect={onUnit} />

      <Card title="Compensation mode" subtitle="How base salary moves across the horizon. Escalation applies to every salary component and the fixed benefits.">
        <div className="flex items-center gap-4 flex-wrap text-[12.5px]">
          <ModeToggle<EscalationMode> value={mode} options={[{ key: 'same', label: 'Same across all years' }, { key: 'escalate', label: 'Apply annual escalation' }, { key: 'byYear', label: 'Customise by year' }]} onChange={(v) => patch((d) => { d.settings.compMode = v })} />
          <span className="inline-flex items-center gap-2"><span className="text-ink-500">Annual escalation rate</span><PctInput value={inputs.settings.compEscalationRate} onChange={(v) => patch((d) => { d.settings.compEscalationRate = v })} disabled={mode !== 'escalate'} /><span className="text-ink-400">industry reference {REFERENCE.settings.compEscalationRate} %</span></span>
        </div>
      </Card>

      <Card title={`Compensation by experience band – ${bu ? bu.name : 'program default'}`} subtitle={`Annual figures per FTE (${lakhUnit(m)}). Variable pay and allowances are a percentage of base salary. The industry reference is an India GCC benchmark you can position against.`}
        action={<div className="flex items-center gap-2">{bu && <label className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" className="accent-brand-600" checked={own} onChange={(e) => toggleOwn(e.target.checked)} /> Own compensation for this unit</label>}<MiniBtn onClick={fillComp}><Download size={12} /> Fill empty inputs from industry reference</MiniBtn></div>}>
        <table className="w-full border-separate border-spacing-0">
          <thead><tr>
            <th className={gth}>Experience band</th><th className={clsx(gth, 'text-right')}>Base annual salary<span className="block text-[10px] font-normal text-ink-400">{lakhUnit(m)} per FTE · your input</span></th><th className={clsx(gth, 'text-right')}>Industry reference<span className="block text-[10px] font-normal text-ink-400">base salary</span></th><th className={gth}>vs ref</th>
            <th className={clsx(gth, 'text-right')}>Variable pay<span className="block text-[10px] font-normal text-ink-400">% of base</span></th><th className={clsx(gth, 'text-right')}>Reference</th><th className={clsx(gth, 'text-right')}>Allowances<span className="block text-[10px] font-normal text-ink-400">% of base</span></th><th className={clsx(gth, 'text-right')}>Reference</th>
            <th className={clsx(gth, 'text-right')}>Fully loaded cost / FTE<span className="block text-[10px] font-normal text-ink-400">Year 1, incl. benefits</span></th>
          </tr></thead>
          <tbody>
            {BANDS.map((b, i) => (
              <tr key={b.key} className="hover:bg-brand-50/40">
                <td className={clsx(gtd, 'py-1')}><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: BAND_COLORS[i] }} /><span><span className="font-medium">{b.label}</span><span className="block text-[10.5px] text-ink-500">{b.roles}</span></span></span></td>
                <td className={clsx(gtd, 'text-right')}><MoneyInput m={m} lakh={comp.base[i] ?? 0} onChange={(v) => setComp((c) => { c.base[i] = v })} disabled={!editable} /></td>
                <RefCell>{lakhNum(m, ref.base[i])}</RefCell><td className={gtd}><VsRef value={comp.base[i] ?? 0} ref={ref.base[i]} /></td>
                <td className={clsx(gtd, 'text-right')}><PctInput value={comp.variableRate[i] ?? 0} onChange={(v) => setComp((c) => { c.variableRate[i] = v })} disabled={!editable} /></td><RefCell>{ref.variableRate[i]} %</RefCell>
                <td className={clsx(gtd, 'text-right')}><PctInput value={comp.allowanceRate[i] ?? 0} onChange={(v) => setComp((c) => { c.allowanceRate[i] = v })} disabled={!editable} /></td><RefCell>{ref.allowanceRate[i]} %</RefCell>
                <td className={clsx(gtd, 'text-right px-2 font-semibold')}>{lakhFmt(m, loaded[i].total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bu && !own && <p className="text-[11.5px] text-ink-500 mt-2">{bu.name} uses the program default. Tick "Own compensation for this unit" to override it.</p>}
        {mode === 'byYear' && (
          <>
            <h4 className="text-[12.5px] font-semibold text-ink-900 mt-4 mb-1">Base salary by year ({lakhUnit(m)} per FTE)</h4>
            <table className="w-full border-separate border-spacing-0">
              <thead><tr><th className={gth}>Experience band</th>{Array.from({ length: H }, (_, y) => <th key={y} className={clsx(gth, 'text-right')}>Y{y + 1} · {inputs.settings.firstYear + y}</th>)}</tr></thead>
              <tbody>{BANDS.map((b, i) => <tr key={b.key}><td className={clsx(gtd, 'py-1 font-medium')}>{b.label}</td>{Array.from({ length: H }, (_, y) => <td key={y} className={clsx(gtd, 'text-right')}><MoneyInput m={m} lakh={baseByYear[y]?.[i] ?? comp.base[i]} onChange={(v) => setComp((_c, bby) => { bby[y][i] = v })} disabled={!editable} /></td>)}</tr>)}</tbody>
            </table>
          </>
        )}
      </Card>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <BenefitsGrid cm={cm} />
        <Card title="Fully loaded cost per FTE (Year 1)" subtitle={`How each band's annual cost builds up (${lakhUnit(m)}) – ${bu ? bu.name : 'program default'}.`}>
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={gth}>Component</th>{BANDS.map((b, i) => <th key={b.key} className={clsx(gth, 'text-right')}><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: BAND_COLORS[i] }} />{b.short}</span></th>)}</tr></thead>
            <tbody>
              {([['Base salary', 'base'], ['Variable pay', 'variable'], ['Other allowances', 'allowances'], ['Statutory (PF, gratuity)', 'statutory'], ['Benefits (medical, L&D, …)', 'benefits']] as const).map(([label, k]) => <tr key={k}><td className={clsx(gtd, 'py-1.5')}>{label}</td>{loaded.map((l, i) => <td key={i} className={clsx(gtd, 'text-right px-2')}>{lakhNum(m, l[k])}</td>)}</tr>)}
              <tr className="bg-brand-50/50 font-semibold"><td className={clsx(gtd, 'py-1.5')}>Cost per FTE</td>{loaded.map((l, i) => <td key={i} className={clsx(gtd, 'text-right px-2')}>{lakhNum(m, l.total)}</td>)}</tr>
            </tbody>
          </table>
        </Card>
      </div>

      <OtherPeopleGrids cm={cm} />
    </div>
  )
}

/* ================= Benefits ================= */
function BenefitsGrid({ cm }: { cm: CostModel }) {
  const { m, inputs, patch } = cm
  const b = inputs.benefits, ref = REFERENCE.benefits
  type PctKey = 'pfRate' | 'gratuityRate'; type AmtKey = 'medical' | 'life' | 'learning' | 'engagement' | 'other'
  const pctRows: { k: PctKey; label: string; note: string }[] = [{ k: 'pfRate', label: 'Employer provident fund contribution', note: 'Statutory' }, { k: 'gratuityRate', label: 'Gratuity / severance provision', note: 'Statutory' }]
  const amtRows: { k: AmtKey; label: string; note: string }[] = [{ k: 'medical', label: 'Medical insurance', note: 'Annual cost per employee' }, { k: 'life', label: 'Life & accident insurance', note: 'Annual cost per employee' }, { k: 'learning', label: 'Learning & development', note: 'Training and certifications' }, { k: 'engagement', label: 'Employee engagement', note: 'Wellness, engagement programmes' }, { k: 'other', label: 'Other employee benefits', note: 'Meals, wellness allowances, etc.' }]
  const fill = () => patch((d) => { for (const r of pctRows) if (!d.benefits[r.k]) d.benefits[r.k] = ref[r.k]; for (const r of amtRows) if (!d.benefits[r.k]) d.benefits[r.k] = ref[r.k]; if (!d.benefits.basicShare) d.benefits.basicShare = ref.basicShare })
  return (
    <Card title="Statutory and other benefit assumptions" subtitle="Percentage components apply to basic salary; per-employee components are annual amounts per FTE. Program-level – every business unit uses them." action={<MiniBtn onClick={fill}><Download size={12} /> Fill from industry reference</MiniBtn>}>
      <div className="flex items-center gap-2 text-[12.5px] mb-2"><span className="text-ink-700">Basic salary as % of base</span><PctInput value={b.basicShare} onChange={(v) => patch((d) => { d.benefits.basicShare = v })} /><span className="text-ink-400 text-[11.5px]">reference {ref.basicShare} %</span></div>
      <table className="w-full border-separate border-spacing-0">
        <thead><tr><th className={gth}>Component</th><th className={gth}>Type</th><th className={clsx(gth, 'text-right')}>Your input</th><th className={clsx(gth, 'text-right')}>Industry reference</th><th className={gth}>vs ref</th><th className={gth}>Notes</th></tr></thead>
        <tbody>
          {pctRows.map((r) => <tr key={r.k} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'py-1 font-medium')}>{r.label}</td><td className={clsx(gtd, 'text-ink-500')}>% of basic</td><td className={clsx(gtd, 'text-right')}><PctInput value={b[r.k]} onChange={(v) => patch((d) => { d.benefits[r.k] = v })} /></td><RefCell>{ref[r.k]} %</RefCell><td className={gtd}><VsRef value={b[r.k]} ref={ref[r.k]} /></td><td className={clsx(gtd, 'text-ink-500')}>{r.note}</td></tr>)}
          {amtRows.map((r) => <tr key={r.k} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'py-1 font-medium')}>{r.label}</td><td className={clsx(gtd, 'text-ink-500')}>Per employee / year ({lakhUnit(m, 'k')})</td><td className={clsx(gtd, 'text-right')}><MoneyInput m={m} lakh={b[r.k]} scale="k" onChange={(v) => patch((d) => { d.benefits[r.k] = v })} /></td><RefCell>{lakhNum(m, ref[r.k], 'k')}</RefCell><td className={gtd}><VsRef value={b[r.k]} ref={ref[r.k]} /></td><td className={clsx(gtd, 'text-ink-500')}>{r.note}</td></tr>)}
        </tbody>
      </table>
    </Card>
  )
}

/* ================= Other people costs ================= */
function OtherPeopleGrids({ cm }: { cm: CostModel }) {
  const { m, inputs, result, patch } = cm
  const op = inputs.otherPeople, ref = REFERENCE.otherPeople
  const p = result.program
  const H = result.horizon
  type Row<K extends string> = { k: K; label: string; scale: LakhScale; elig?: K; note: string }
  const nhRows: Row<keyof NewHireCosts>[] = [
    { k: 'recruitmentFee', label: 'Recruitment / search fee', scale: 'L', elig: 'recruitmentRate', note: 'Agency fee per hire; eligibility = share of hires through agencies' },
    { k: 'bgv', label: 'Background verification', scale: 'k', note: 'Per hire' }, { k: 'preMedical', label: 'Pre-employment medical', scale: 'k', note: 'Per hire' },
    { k: 'signOn', label: 'Sign-on bonus', scale: 'L', elig: 'signOnRate', note: 'Eligibility = share of hires receiving one' },
    { k: 'relocation', label: 'Relocation', scale: 'L', elig: 'relocationRate', note: 'Eligibility = share of hires relocating' },
    { k: 'training', label: 'Onboarding & training', scale: 'k', note: 'Induction, tooling and initial certification per hire' },
  ]
  const pfRows: Row<keyof PerFteCosts>[] = [
    { k: 'transport', label: 'Transport / commute', scale: 'k', elig: 'transportRate', note: 'Eligibility = share of employees using company transport' },
    { k: 'travel', label: 'Business travel', scale: 'k', note: 'Per average FTE per year' }, { k: 'events', label: 'Team events & offsites', scale: 'k', note: 'Per average FTE per year' },
    { k: 'rewards', label: 'Rewards & recognition', scale: 'k', elig: 'rewardsRate', note: 'Eligibility = share of employees in the R&R pool' },
  ]
  const fxRows: Row<keyof FixedPeopleCosts>[] = [{ k: 'branding', label: 'Employer branding', scale: 'L', note: 'Campus, social, events – fixed per year' }, { k: 'careerProgrammes', label: 'Career & leadership programmes', scale: 'L', note: 'Fixed per year' }, { k: 'other', label: 'Other people programmes', scale: 'L', note: 'Fixed per year' }]
  const fill = () => patch((d) => { const o = d.otherPeople; for (const r of nhRows) { if (!o.newHire[r.k]) o.newHire[r.k] = ref.newHire[r.k]; if (r.elig && !o.newHire[r.elig]) o.newHire[r.elig] = ref.newHire[r.elig] } for (const r of pfRows) { if (!o.perFte[r.k]) o.perFte[r.k] = ref.perFte[r.k]; if (r.elig && !o.perFte[r.elig]) o.perFte[r.elig] = ref.perFte[r.elig] } for (const r of fxRows) if (!o.fixed[r.k]) o.fixed[r.k] = ref.fixed[r.k] })
  const head = (first: string, withElig: boolean) => <thead><tr><th className={gth}>{first}</th><th className={clsx(gth, 'text-right')}>Your input</th><th className={clsx(gth, 'text-right')}>Industry reference</th><th className={gth}>vs ref</th>{withElig && <><th className={clsx(gth, 'text-right')}>Eligibility</th><th className={clsx(gth, 'text-right')}>Reference</th></>}<th className={gth}>Notes</th></tr></thead>
  function Rows<K extends string>({ rows, get, getRef, set }: { rows: Row<K>[]; get: (k: K) => number; getRef: (k: K) => number; set: (k: K, v: number) => void }) {
    return <tbody>{rows.map((r) => <tr key={r.k} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'py-1')}><span className="font-medium">{r.label}</span><span className="block text-[10.5px] text-ink-500">{lakhUnit(m, r.scale)}</span></td><td className={clsx(gtd, 'text-right')}><MoneyInput m={m} lakh={get(r.k)} scale={r.scale} onChange={(v) => set(r.k, v)} /></td><RefCell>{lakhNum(m, getRef(r.k), r.scale)}</RefCell><td className={gtd}><VsRef value={get(r.k)} ref={getRef(r.k)} /></td>{rows.some((x) => x.elig) && (r.elig ? <><td className={clsx(gtd, 'text-right')}><PctInput value={get(r.elig)} onChange={(v) => set(r.elig as K, v)} /></td><RefCell>{getRef(r.elig)} %</RefCell></> : <><td className={clsx(gtd, 'text-right text-ink-400 px-2')}>all</td><td className={gtd} /></>)}<td className={clsx(gtd, 'text-ink-500')}>{r.note}</td></tr>)}</tbody>
  }
  return (
    <Card title="Other people costs" subtitle="Costs that follow new hires, the average headcount, or are fixed per year. Program-level; the fixed programmes are allocated to business units by average-headcount share."
      action={<div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 text-[12px]"><ModeToggle value={op.mode} options={[{ key: 'same', label: 'Same across all years' }, { key: 'escalate', label: 'Apply annual escalation' }]} onChange={(v) => patch((d) => { d.otherPeople.mode = v })} /><PctInput value={op.escalationRate} onChange={(v) => patch((d) => { d.otherPeople.escalationRate = v })} disabled={op.mode !== 'escalate'} /><span className="text-ink-400 text-[11px]">ref {ref.escalationRate} %</span></span><MiniBtn onClick={fill}><Download size={12} /> Fill from industry reference</MiniBtn></div>}>
      <div className="grid grid-cols-[1.15fr_1fr] gap-4">
        <div>
          <h4 className="text-[12.5px] font-semibold text-ink-900 mb-1">Per new hire</h4>
          <table className="w-full border-separate border-spacing-0">{head('Cost item', true)}<Rows<keyof NewHireCosts> rows={nhRows} get={(k) => op.newHire[k]} getRef={(k) => ref.newHire[k]} set={(k, v) => patch((d) => { d.otherPeople.newHire[k] = v })} /></table>
          <h4 className="text-[12.5px] font-semibold text-ink-900 mt-4 mb-1">Per average FTE per year</h4>
          <table className="w-full border-separate border-spacing-0">{head('Cost item', true)}<Rows<keyof PerFteCosts> rows={pfRows} get={(k) => op.perFte[k]} getRef={(k) => ref.perFte[k]} set={(k, v) => patch((d) => { d.otherPeople.perFte[k] = v })} /></table>
        </div>
        <div>
          <h4 className="text-[12.5px] font-semibold text-ink-900 mb-1">Fixed per year (program-level)</h4>
          <table className="w-full border-separate border-spacing-0">{head('Programme', false)}<Rows<keyof FixedPeopleCosts> rows={fxRows} get={(k) => op.fixed[k]} getRef={(k) => ref.fixed[k]} set={(k, v) => patch((d) => { d.otherPeople.fixed[k] = v })} /></table>
          <h4 className="text-[12.5px] font-semibold text-ink-900 mt-4 mb-1">Derived other people costs ({m.unitLabel})</h4>
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={gth}>Driver</th>{Array.from({ length: H }, (_, y) => <th key={y} className={clsx(gth, 'text-right')}>Y{y + 1}</th>)}</tr></thead>
            <tbody>
              <tr><td className={clsx(gtd, 'py-1')}>New hires × per-hire cost</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{m.num(y.otherPeople.newHire, m.digits + 1)}</td>)}</tr>
              <tr><td className={clsx(gtd, 'py-1')}>Average FTE × per-FTE cost</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{m.num(y.otherPeople.perFte, m.digits + 1)}</td>)}</tr>
              <tr><td className={clsx(gtd, 'py-1')}>Fixed programmes</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{m.num(y.otherPeople.fixed, m.digits + 1)}</td>)}</tr>
              <tr className="bg-surface/70 font-semibold"><td className={clsx(gtd, 'py-1.5')}>Total other people costs</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{m.num(y.otherPeople.total, m.digits + 1)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}
