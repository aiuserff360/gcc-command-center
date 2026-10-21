/**
 * Cost model: real estate – office model choice (managed office / coworking / conventional lease) with
 * the assumptions of the chosen model next to the industry reference, and the derived seats and costs.
 */
import clsx from 'clsx'
import { Check, Download } from 'lucide-react'
import { Card, Field, Input, TextArea, FormGrid } from '../../ui'
import { OFFICE_MODELS, OFFICE_MODEL_INFO, REFERENCE, type OfficeModel } from '../../../data/costModel'
import type { CostModel } from './useCostModel'
import { MoneyInput, NumInput, PctInput, RupeeInput, VsRef, RefCell, ModeToggle, MiniBtn, gth, gtd, lakhNum, lakhUnit, rupeeNum, rupeeUnit, hc } from './shared'

export function RealEstateInput({ cm }: { cm: CostModel }) {
  const { m, inputs, result, patch } = cm
  const re = inputs.realEstate, ref = REFERENCE.realEstate
  const p = result.program
  const H = result.horizon
  const fill = () => patch((d) => {
    const r = d.realEstate
    for (const k of ['seatCost', 'seatShare', 'setupPerSeat', 'depositMonths'] as const) if (!r.managed[k]) r.managed[k] = ref.managed[k]
    for (const k of ['deskCost', 'deskShare', 'depositMonths'] as const) if (!r.coworking[k]) r.coworking[k] = ref.coworking[k]
    for (const k of ['rentPerSqft', 'sqftPerSeat', 'fitoutPerSqft', 'camPerSqft', 'seatShare', 'depositMonths', 'lockInYears'] as const) if (!r.lease[k]) r.lease[k] = ref.lease[k]
    if (!r.parkingRatio) r.parkingRatio = ref.parkingRatio; if (!r.parkingCost) r.parkingCost = ref.parkingCost; if (!r.escalationRate) r.escalationRate = ref.escalationRate
  })
  type Row = { n: number; label: string; input: React.ReactNode; refText: string; vs: [number, number]; unit: string; means: string }
  const rows: Row[] = []
  let n = 1
  if (re.model === 'Managed office') {
    const mg = re.managed, rf = ref.managed
    rows.push({ n: n++, label: 'Cost per seat per month', input: <MoneyInput m={m} lakh={mg.seatCost} scale="k" onChange={(v) => patch((d) => { d.realEstate.managed.seatCost = v })} />, refText: lakhNum(m, rf.seatCost, 'k'), vs: [mg.seatCost, rf.seatCost], unit: `${lakhUnit(m, 'k')} per seat / month`, means: 'All-inclusive monthly fee per seat: rent, fit-out, furniture, utilities, CAM, internet, housekeeping and facility management.' })
    rows.push({ n: n++, label: 'Seats as % of headcount', input: <PctInput value={mg.seatShare} onChange={(v) => patch((d) => { d.realEstate.managed.seatShare = v })} />, refText: `${rf.seatShare} %`, vs: [mg.seatShare, rf.seatShare], unit: '% of exit headcount', means: 'Seats required as a share of exit headcount. 80 % reflects hybrid working; 100 % gives everyone a dedicated seat.' })
    rows.push({ n: n++, label: 'One-time setup per new seat', input: <MoneyInput m={m} lakh={mg.setupPerSeat} scale="k" onChange={(v) => patch((d) => { d.realEstate.managed.setupPerSeat = v })} />, refText: lakhNum(m, rf.setupPerSeat, 'k'), vs: [mg.setupPerSeat, rf.setupPerSeat], unit: `${lakhUnit(m, 'k')} per seat (one-time)`, means: 'Branding, customisation, access cards and IT cabling for each newly added seat.' })
    rows.push({ n: n++, label: 'Security deposit', input: <NumInput value={mg.depositMonths} onChange={(v) => patch((d) => { d.realEstate.managed.depositMonths = v })} min={0} step={1} width={60} />, refText: `${rf.depositMonths}`, vs: [mg.depositMonths, rf.depositMonths], unit: 'months of seat fees', means: 'Refundable deposit to the provider, typically 2–6 months. Treated as a cash outlay, not an operating cost.' })
  } else if (re.model === 'Coworking / flexible space') {
    const cw = re.coworking, rf = ref.coworking
    rows.push({ n: n++, label: 'Membership per desk per month', input: <MoneyInput m={m} lakh={cw.deskCost} scale="k" onChange={(v) => patch((d) => { d.realEstate.coworking.deskCost = v })} />, refText: lakhNum(m, rf.deskCost, 'k'), vs: [cw.deskCost, rf.deskCost], unit: `${lakhUnit(m, 'k')} per desk / month`, means: 'Dedicated-desk membership including meeting-room credits, reception and amenities.' })
    rows.push({ n: n++, label: 'Desks as % of headcount', input: <PctInput value={cw.deskShare} onChange={(v) => patch((d) => { d.realEstate.coworking.deskShare = v })} />, refText: `${rf.deskShare} %`, vs: [cw.deskShare, rf.deskShare], unit: '% of exit headcount', means: 'Hot-desking lets the ratio drop below the managed-office 80 %.' })
    rows.push({ n: n++, label: 'Security deposit', input: <NumInput value={cw.depositMonths} onChange={(v) => patch((d) => { d.realEstate.coworking.depositMonths = v })} min={0} step={1} width={60} />, refText: `${rf.depositMonths}`, vs: [cw.depositMonths, rf.depositMonths], unit: 'months of membership', means: 'Refundable; cash outlay only.' })
  } else {
    const ls = re.lease, rf = ref.lease
    rows.push({ n: n++, label: 'Rent per sq ft per month', input: <RupeeInput m={m} value={ls.rentPerSqft} onChange={(v) => patch((d) => { d.realEstate.lease.rentPerSqft = v })} />, refText: rupeeNum(m, rf.rentPerSqft), vs: [ls.rentPerSqft, rf.rentPerSqft], unit: `${rupeeUnit(m)} per sq ft / month`, means: 'Warm-shell rent for Grade-A space in the chosen micro-market.' })
    rows.push({ n: n++, label: 'Area per seat', input: <NumInput value={ls.sqftPerSeat} onChange={(v) => patch((d) => { d.realEstate.lease.sqftPerSeat = v })} min={0} step={5} width={64} />, refText: `${rf.sqftPerSeat}`, vs: [ls.sqftPerSeat, rf.sqftPerSeat], unit: 'sq ft per seat', means: 'Carpet area per seat including meeting rooms, cafeteria and circulation.' })
    rows.push({ n: n++, label: 'Fit-out per sq ft', input: <RupeeInput m={m} value={ls.fitoutPerSqft} onChange={(v) => patch((d) => { d.realEstate.lease.fitoutPerSqft = v })} />, refText: rupeeNum(m, rf.fitoutPerSqft), vs: [ls.fitoutPerSqft, rf.fitoutPerSqft], unit: `${rupeeUnit(m)} per sq ft (one-time)`, means: 'Interiors, furniture, HVAC, electrical and IT cabling for every newly leased sq ft.' })
    rows.push({ n: n++, label: 'CAM / maintenance per sq ft per month', input: <RupeeInput m={m} value={ls.camPerSqft} onChange={(v) => patch((d) => { d.realEstate.lease.camPerSqft = v })} />, refText: rupeeNum(m, rf.camPerSqft), vs: [ls.camPerSqft, rf.camPerSqft], unit: `${rupeeUnit(m)} per sq ft / month`, means: 'Common-area maintenance, utilities, security and housekeeping.' })
    rows.push({ n: n++, label: 'Seats as % of headcount', input: <PctInput value={ls.seatShare} onChange={(v) => patch((d) => { d.realEstate.lease.seatShare = v })} />, refText: `${rf.seatShare} %`, vs: [ls.seatShare, rf.seatShare], unit: '% of exit headcount', means: 'Seats leased as a share of exit headcount.' })
    rows.push({ n: n++, label: 'Security deposit', input: <NumInput value={ls.depositMonths} onChange={(v) => patch((d) => { d.realEstate.lease.depositMonths = v })} min={0} step={1} width={60} />, refText: `${rf.depositMonths}`, vs: [ls.depositMonths, rf.depositMonths], unit: 'months of rent', means: 'Refundable; cash outlay only.' })
    rows.push({ n: n++, label: 'Lock-in period', input: <NumInput value={ls.lockInYears} onChange={(v) => patch((d) => { d.realEstate.lease.lockInYears = v })} min={0} step={1} width={60} />, refText: `${rf.lockInYears}`, vs: [ls.lockInYears, rf.lockInYears], unit: 'years', means: 'Commitment period of the lease – informational, shown on the Cost Model summary.' })
  }
  rows.push({ n: n++, label: 'Parking ratio (1 bay per N employees)', input: <span className="inline-flex items-center gap-1 text-[12px]"><span className="text-ink-400">1 :</span><NumInput value={re.parkingRatio} onChange={(v) => patch((d) => { d.realEstate.parkingRatio = v })} min={0} step={1} width={56} /></span>, refText: `1 : ${ref.parkingRatio}`, vs: [re.parkingRatio, ref.parkingRatio], unit: 'employees per bay', means: 'One parking bay for every N employees (exit headcount).' })
  rows.push({ n: n++, label: 'Parking cost per bay per month', input: <MoneyInput m={m} lakh={re.parkingCost} scale="k" onChange={(v) => patch((d) => { d.realEstate.parkingCost = v })} />, refText: lakhNum(m, ref.parkingCost, 'k'), vs: [re.parkingCost, ref.parkingCost], unit: `${lakhUnit(m, 'k')} per bay / month`, means: 'Monthly charge per parking bay at the location.' })
  rows.push({ n: n++, label: 'Annual escalation', input: <span className="inline-flex items-center gap-2"><ModeToggle value={re.mode} options={[{ key: 'same', label: 'Same' }, { key: 'escalate', label: 'Escalate' }]} onChange={(v) => patch((d) => { d.realEstate.mode = v })} /><PctInput value={re.escalationRate} onChange={(v) => patch((d) => { d.realEstate.escalationRate = v })} disabled={re.mode !== 'escalate'} /></span>, refText: `${ref.escalationRate} %`, vs: [re.escalationRate, ref.escalationRate], unit: '% per year', means: 'Expected annual increase in seat fees / rent and parking. "Same" keeps a constant-cost model.' })

  return (
    <div className="space-y-4">
      <Card title="Office model" subtitle="Choose the type of space the centre will occupy. Each option has its own cost structure, commitment profile and assumptions below.">
        <div className="grid grid-cols-3 gap-3">
          {OFFICE_MODELS.map((om) => { const info = OFFICE_MODEL_INFO[om]; const on = re.model === om; return (
            <button key={om} onClick={() => patch((d) => { d.realEstate.model = om as OfficeModel })} className={clsx('text-left rounded-lg border px-4 py-3 cursor-pointer transition-colors', on ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line bg-white hover:bg-surface')}>
              <div className="flex items-center justify-between"><span className="text-[13.5px] font-semibold text-ink-900">{om}</span>{on && <span className="inline-flex items-center gap-1 text-[11px] text-brand-600 font-semibold"><Check size={12} /> selected</span>}</div>
              <div className="text-[11.5px] text-brand-600 font-medium">{info.tagline}</div>
              <p className="text-[11.5px] text-ink-700 mt-1.5 leading-snug">{info.description}</p>
              <p className="text-[11px] text-ink-500 mt-1.5"><b className="text-ink-700">Best for:</b> {info.bestFor}</p>
            </button>) })}
        </div>
        <FormGrid cols={3}>
          <Field label="City / micro-market" className="mt-3"><Input value={re.city} onChange={(e) => patch((d) => { d.realEstate.city = e.target.value })} /></Field>
          <Field label="Real estate plan (location shortlist, phasing, requirements)" className="mt-3 col-span-2"><TextArea value={re.notes} onChange={(e) => patch((d) => { d.realEstate.notes = e.target.value })} className="min-h-[44px]" placeholder="e.g. coworking for the pilot, then a managed office" /></Field>
        </FormGrid>
      </Card>

      <Card title={`${re.model} – assumptions`} subtitle={`Unit cost assumptions for the chosen office model. Seats are derived from the headcount plan (${re.city || 'location not set'}).`} action={<MiniBtn onClick={fill}><Download size={12} /> Fill empty inputs from industry reference</MiniBtn>}>
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={gth}>#</th><th className={gth}>Parameter</th><th className={clsx(gth, 'text-right')}>Your input</th><th className={clsx(gth, 'text-right')}>Industry reference</th><th className={gth}>vs ref</th><th className={gth}>Unit</th><th className={gth}>What this means</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.n} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'text-ink-400 px-2')}>{r.n}</td><td className={clsx(gtd, 'py-1.5 font-medium whitespace-nowrap')}>{r.label}</td><td className={clsx(gtd, 'text-right whitespace-nowrap')}>{r.input}</td><RefCell>{r.refText}</RefCell><td className={gtd}><VsRef value={r.vs[0]} ref={r.vs[1]} /></td><td className={clsx(gtd, 'text-ink-500 whitespace-nowrap')}>{r.unit}</td><td className={clsx(gtd, 'text-ink-500 text-[11.5px] leading-snug py-1.5 min-w-[280px]')}>{r.means}</td></tr>)}</tbody>
          </table>
        </Card>
      <div className="grid grid-cols-[1fr_1fr] gap-4">
        <Card title={`Derived real estate costs (${m.unitLabel})`} subtitle="Seats follow exit headcount; one-time setup / fit-out and the refundable deposit apply to newly added seats.">
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={gth}>Line</th>{Array.from({ length: H }, (_, y) => <th key={y} className={clsx(gth, 'text-right')}>Y{y + 1}</th>)}</tr></thead>
            <tbody>
              <tr><td className={clsx(gtd, 'py-1')}>Seats (exit headcount × ratio)</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{hc(y.realEstate.seats)}</td>)}</tr>
              <tr><td className={clsx(gtd, 'py-1')}>{re.model === 'Conventional lease' ? 'Rent + CAM' : 'Seat / desk fees'}</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{m.num(y.realEstate.recurring, m.digits + 1)}</td>)}</tr>
              <tr><td className={clsx(gtd, 'py-1')}>Parking</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{m.num(y.realEstate.parking, m.digits + 1)}</td>)}</tr>
              <tr><td className={clsx(gtd, 'py-1')}>{re.model === 'Conventional lease' ? 'Fit-out (one-time)' : 'Seat setup (one-time)'}</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{m.num(y.realEstate.setup, m.digits + 1)}</td>)}</tr>
              <tr className="bg-surface/70 font-semibold"><td className={clsx(gtd, 'py-1.5')}>Real estate cost</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{m.num(y.realEstate.total, m.digits + 1)}</td>)}</tr>
              <tr><td className={clsx(gtd, 'py-1 text-ink-500')}>Refundable deposit (cash only)</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2 text-ink-500')}>{m.num(y.realEstate.deposit, m.digits + 1)}</td>)}</tr>
            </tbody>
          </table>
        </Card>
        <Card title="How real estate is modelled" subtitle="Driver logic behind the numbers on the left.">
          <ul className="text-[12px] text-ink-700 space-y-1.5 list-disc pl-4">
            <li>Seats = exit headcount × seat ratio; recurring fees = seats × monthly rate × 12, escalated per year when enabled.</li>
            <li>Parking bays = exit headcount ÷ parking ratio; cost = bays × monthly rate × 12.</li>
            <li>One-time setup (managed office) or fit-out (lease) applies to seats / sq ft added in the year – it is a one-time cash item inside the real estate category.</li>
            <li>Refundable deposits are cash out, not cost: they appear in the cash flow and the model checks but not in the run-rate.</li>
            <li>Every business unit carries the real estate of its own seats, so the program total is the sum of the units.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
