/**
 * Cost model: technology (devices per new hire with a refresh cycle, per-user monthly rates) and
 * centre operations (fixed corporate costs per year, one-time establishment in Year 1).
 */
import clsx from 'clsx'
import { Download } from 'lucide-react'
import { Card } from '../../ui'
import { REFERENCE, type TechnologyInputs, type CorporateInputs, type OneTimeInputs } from '../../../data/costModel'
import type { CostModel } from './useCostModel'
import { MoneyInput, NumInput, PctInput, VsRef, RefCell, ModeToggle, MiniBtn, gth, gtd, lakhNum, lakhUnit, hc, type LakhScale } from './shared'

const yearHead = (H: number, extra?: string) => <thead><tr><th className={gth}>Line</th>{Array.from({ length: H }, (_, y) => <th key={y} className={clsx(gth, 'text-right')}>Y{y + 1}</th>)}{extra && <th className={clsx(gth, 'text-right')}>{extra}</th>}</tr></thead>

export function TechnologyInput({ cm }: { cm: CostModel }) {
  const { m, inputs, result, patch } = cm
  const t = inputs.technology, ref = REFERENCE.technology
  const p = result.program, H = result.horizon
  type K = Exclude<keyof TechnologyInputs, 'mode' | 'escalationRate' | 'refreshYears'>
  const rows: { k: K; label: string; scale: LakhScale; unit: string; means: string }[] = [
    { k: 'device', label: 'End-user device cost', scale: 'k', unit: 'per device (one-time)', means: 'Laptop or desktop per employee including accessories, OS and standard software. Bought for every new hire and again at refresh.' },
    { k: 'licences', label: 'Collaboration & productivity licences', scale: 'k', unit: 'per user / month', means: 'Microsoft 365 / Google Workspace, e-mail, Teams or Slack and collaboration suites.' },
    { k: 'apps', label: 'Business application licences', scale: 'k', unit: 'per user / month', means: 'Average enterprise application licences (ERP, PLM, CRM, engineering tools) per employee.' },
    { k: 'cloud', label: 'IT infrastructure & cloud services', scale: 'k', unit: 'per user / month', means: 'Cloud infrastructure, storage, compute, backup and core IT platforms per employee.' },
    { k: 'security', label: 'Cybersecurity tools', scale: 'k', unit: 'per user / month', means: 'Endpoint security, identity and access management, monitoring and related tooling.' },
    { k: 'support', label: 'IT support & service management', scale: 'k', unit: 'per user / month', means: 'Service desk, ITSM tooling, asset management and on-site support.' },
    { k: 'network', label: 'Network & connectivity', scale: 'k', unit: 'per user / month', means: 'Internet, SD-WAN, local telco, bandwidth and network hardware.' },
    { k: 'hosting', label: 'Data centre / hosting (if applicable)', scale: 'k', unit: 'per user / month', means: 'On-premise hosting, data-centre services or dedicated environments, if any.' },
  ]
  const fill = () => patch((d) => { for (const r of rows) if (!d.technology[r.k]) d.technology[r.k] = ref[r.k]; if (!d.technology.refreshYears) d.technology.refreshYears = ref.refreshYears; if (!d.technology.escalationRate) d.technology.escalationRate = ref.escalationRate })
  const perUser = (x: TechnologyInputs) => x.licences + x.apps + x.cloud + x.security + x.support + x.network + x.hosting
  return (
    <div className="space-y-4">
      <Card title="Technology cost assumptions" subtitle="Unit cost assumptions for devices, licences, infrastructure, security, support and connectivity. Recurring costs follow average headcount; devices follow new hires and the refresh cycle." action={<MiniBtn onClick={fill}><Download size={12} /> Fill empty inputs from industry reference</MiniBtn>}>
        <table className="w-full border-separate border-spacing-0">
          <thead><tr><th className={gth}>#</th><th className={gth}>Parameter</th><th className={clsx(gth, 'text-right')}>Your input</th><th className={clsx(gth, 'text-right')}>Industry reference</th><th className={gth}>vs ref</th><th className={gth}>Unit</th><th className={gth}>What this means</th></tr></thead>
          <tbody>
            {rows.map((r, i) => <tr key={r.k} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'text-ink-400 px-2')}>{i + 1}</td><td className={clsx(gtd, 'py-1.5 font-medium whitespace-nowrap')}>{r.label}</td><td className={clsx(gtd, 'text-right')}><MoneyInput m={m} lakh={t[r.k]} scale={r.scale} onChange={(v) => patch((d) => { d.technology[r.k] = v })} /></td><RefCell>{lakhNum(m, ref[r.k], r.scale)}</RefCell><td className={gtd}><VsRef value={t[r.k]} ref={ref[r.k]} /></td><td className={clsx(gtd, 'text-ink-500 whitespace-nowrap')}>{lakhUnit(m, r.scale)} {r.unit}</td><td className={clsx(gtd, 'text-ink-500 text-[11.5px] leading-snug py-1.5 min-w-[280px]')}>{r.means}</td></tr>)}
            <tr className="hover:bg-brand-50/40"><td className={clsx(gtd, 'text-ink-400 px-2')}>{rows.length + 1}</td><td className={clsx(gtd, 'py-1.5 font-medium')}>Hardware refresh cycle</td><td className={clsx(gtd, 'text-right')}><NumInput value={t.refreshYears} onChange={(v) => patch((d) => { d.technology.refreshYears = v })} min={0} step={1} width={60} /></td><RefCell>{ref.refreshYears}</RefCell><td className={gtd}><VsRef value={t.refreshYears} ref={ref.refreshYears} /></td><td className={clsx(gtd, 'text-ink-500')}>years</td><td className={clsx(gtd, 'text-ink-500 text-[11.5px] leading-snug py-1.5')}>Devices bought in a year are replaced this many years later, inside the horizon.</td></tr>
            <tr className="hover:bg-brand-50/40"><td className={clsx(gtd, 'text-ink-400 px-2')}>{rows.length + 2}</td><td className={clsx(gtd, 'py-1.5 font-medium')}>Annual escalation</td><td className={clsx(gtd, 'text-right whitespace-nowrap')}><span className="inline-flex items-center gap-2"><ModeToggle value={t.mode} options={[{ key: 'same', label: 'Same' }, { key: 'escalate', label: 'Escalate' }]} onChange={(v) => patch((d) => { d.technology.mode = v })} /><PctInput value={t.escalationRate} onChange={(v) => patch((d) => { d.technology.escalationRate = v })} disabled={t.mode !== 'escalate'} /></span></td><RefCell>{ref.escalationRate} %</RefCell><td className={gtd}><VsRef value={t.escalationRate} ref={ref.escalationRate} /></td><td className={clsx(gtd, 'text-ink-500')}>% per year</td><td className={clsx(gtd, 'text-ink-500 text-[11.5px] leading-snug py-1.5')}>Expected annual increase in licensing, cloud and support costs.</td></tr>
          </tbody>
        </table>
        <p className="text-[11.5px] text-ink-500 mt-2">Per-user total {lakhUnit(m, 'k')} {lakhNum(m, perUser(t), 'k')} per month (reference {lakhNum(m, perUser(ref), 'k')}).</p>
      </Card>
      <Card title={`Derived technology costs (${m.unitLabel})`} subtitle="Devices = new hires + refresh of earlier purchases (one-time cash inside the technology category); recurring = average headcount × per-user rates × 12. Each business unit carries the devices and licences of its own people.">
        <table className="w-full border-separate border-spacing-0 max-w-[760px]">
          {yearHead(H)}
          <tbody>
            <tr><td className={clsx(gtd, 'py-1')}>New hires (devices)</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{hc(y.newHires)}</td>)}</tr>
            <tr><td className={clsx(gtd, 'py-1')}>Refresh devices</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{hc(y.technology.refreshDevices)}</td>)}</tr>
            <tr><td className={clsx(gtd, 'py-1')}>Device purchases (one-time)</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{m.num(y.technology.devices, m.digits + 1)}</td>)}</tr>
            <tr><td className={clsx(gtd, 'py-1')}>Licences, cloud, security, support, network</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{m.num(y.technology.recurring, m.digits + 1)}</td>)}</tr>
            <tr className="bg-surface/70 font-semibold"><td className={clsx(gtd, 'py-1.5')}>Technology cost</td>{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{m.num(y.technology.total, m.digits + 1)}</td>)}</tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function CentreOpsInput({ cm }: { cm: CostModel }) {
  const { m, inputs, result, patch } = cm
  const c = inputs.corporate, refC = REFERENCE.corporate, o = inputs.oneTime, refO = REFERENCE.oneTime
  const p = result.program, H = result.horizon
  type CK = Exclude<keyof CorporateInputs, 'mode' | 'escalationRate'>
  const cRows: { k: CK; label: string; note: string }[] = [
    { k: 'compliance', label: 'Entity / statutory compliance', note: 'ROC filings, SEZ / STPI, labour-law compliance' }, { k: 'financeAdmin', label: 'Finance / payroll administration', note: 'Payroll provider, accounting, treasury support' },
    { k: 'legalTaxAudit', label: 'Legal / tax / audit', note: 'Statutory audit, transfer pricing, legal retainers' }, { k: 'insurance', label: 'Corporate / business insurance', note: 'D&O, liability, property and cyber cover' },
    { k: 'governance', label: 'GCC governance / administration', note: 'Centre leadership office, PMO, admin services' }, { k: 'other', label: 'Other corporate overhead', note: 'Memberships, CSR, miscellaneous' },
  ]
  const oRows: { k: keyof OneTimeInputs; label: string; note: string }[] = [
    { k: 'entityLegal', label: 'Entity set-up / legal', note: 'Incorporation, registrations, bank accounts' }, { k: 'policies', label: 'Policies, processes & playbooks', note: 'HR, finance, IT and security policy set' },
    { k: 'brandLaunch', label: 'Employer-brand launch', note: 'Launch campaign, careers site, campus tie-ups' }, { k: 'travelKt', label: 'Transition travel & knowledge transfer', note: 'Flights, stays and KT workshops for the waves' },
    { k: 'programme', label: 'Programme / transition management', note: 'Set-up PMO and transition partner fees' }, { k: 'contingency', label: 'Contingency', note: 'Establishment reserve' },
  ]
  const esc = (y: number) => (c.mode === 'escalate' ? Math.pow(1 + c.escalationRate / 100, y) : 1)
  const corpTotal = cRows.reduce((s, r) => s + c[r.k], 0), oneTotal = oRows.reduce((s, r) => s + o[r.k], 0)
  const fill = () => patch((d) => { for (const r of cRows) if (!d.corporate[r.k]) d.corporate[r.k] = refC[r.k]; for (const r of oRows) if (!d.oneTime[r.k]) d.oneTime[r.k] = refO[r.k] })
  return (
    <div className="space-y-4">
      <Card title={`Annual centre / corporate costs (${lakhUnit(m)} per year)`} subtitle="Recurring fixed costs to operate the GCC entity – not driven by headcount. Allocated to business units by average-headcount share on the Output view."
        action={<div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 text-[12px]"><ModeToggle value={c.mode} options={[{ key: 'same', label: 'Same across all years' }, { key: 'escalate', label: 'Apply annual escalation' }]} onChange={(v) => patch((d) => { d.corporate.mode = v })} /><PctInput value={c.escalationRate} onChange={(v) => patch((d) => { d.corporate.escalationRate = v })} disabled={c.mode !== 'escalate'} /><span className="text-ink-400 text-[11px]">ref {refC.escalationRate} %</span></span><MiniBtn onClick={fill}><Download size={12} /> Fill empty inputs from industry reference</MiniBtn></div>}>
        <table className="w-full border-separate border-spacing-0">
          <thead><tr><th className={gth}>#</th><th className={gth}>Cost component</th><th className={clsx(gth, 'text-right')}>Base annual cost<span className="block text-[10px] font-normal text-ink-400">{lakhUnit(m)} · your input</span></th><th className={clsx(gth, 'text-right')}>Industry reference</th><th className={gth}>vs ref</th>{Array.from({ length: H }, (_, y) => <th key={y} className={clsx(gth, 'text-right')}>Y{y + 1}</th>)}<th className={gth}>Notes</th></tr></thead>
          <tbody>
            {cRows.map((r, i) => <tr key={r.k} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'text-ink-400 px-2')}>{i + 1}</td><td className={clsx(gtd, 'py-1.5 font-medium whitespace-nowrap')}>{r.label}</td><td className={clsx(gtd, 'text-right')}><MoneyInput m={m} lakh={c[r.k]} onChange={(v) => patch((d) => { d.corporate[r.k] = v })} /></td><RefCell>{lakhNum(m, refC[r.k])}</RefCell><td className={gtd}><VsRef value={c[r.k]} ref={refC[r.k]} /></td>{Array.from({ length: H }, (_, y) => <td key={y} className={clsx(gtd, 'text-right px-2 text-ink-700')}>{lakhNum(m, c[r.k] * esc(y))}</td>)}<td className={clsx(gtd, 'text-ink-500 text-[11.5px]')}>{r.note}</td></tr>)}
            <tr className="bg-surface/70 font-semibold"><td className={gtd} /><td className={clsx(gtd, 'py-1.5')}>Total annual centre / corporate costs</td><td className={clsx(gtd, 'text-right px-2')}>{lakhNum(m, corpTotal)}</td><td className={clsx(gtd, 'text-right px-2 text-ink-500 font-normal')}>{lakhNum(m, cRows.reduce((s, r) => s + refC[r.k], 0))}</td><td className={gtd} />{p.years.map((y) => <td key={y.y} className={clsx(gtd, 'text-right px-2')}>{lakhNum(m, y.corporate * 100)}</td>)}<td className={gtd} /></tr>
          </tbody>
        </table>
      </Card>
      <Card title={`One-time establishment costs (${lakhUnit(m)}, Year 1)`} subtitle="Set-up costs incurred once in Year 1 to establish the centre. Shown as their own category and as one-time cash; allocated to business units by Year-1 average-headcount share.">
        <table className="w-full border-separate border-spacing-0">
          <thead><tr><th className={gth}>#</th><th className={gth}>Item</th><th className={clsx(gth, 'text-right')}>Your input</th><th className={clsx(gth, 'text-right')}>Industry reference</th><th className={gth}>vs ref</th><th className={gth}>Notes</th></tr></thead>
          <tbody>
            {oRows.map((r, i) => <tr key={r.k} className="hover:bg-brand-50/40"><td className={clsx(gtd, 'text-ink-400 px-2')}>{i + 1}</td><td className={clsx(gtd, 'py-1.5 font-medium whitespace-nowrap')}>{r.label}</td><td className={clsx(gtd, 'text-right')}><MoneyInput m={m} lakh={o[r.k]} onChange={(v) => patch((d) => { d.oneTime[r.k] = v })} /></td><RefCell>{lakhNum(m, refO[r.k])}</RefCell><td className={gtd}><VsRef value={o[r.k]} ref={refO[r.k]} /></td><td className={clsx(gtd, 'text-ink-500 text-[11.5px]')}>{r.note}</td></tr>)}
            <tr className="bg-surface/70 font-semibold"><td className={gtd} /><td className={clsx(gtd, 'py-1.5')}>Total one-time establishment</td><td className={clsx(gtd, 'text-right px-2')}>{lakhNum(m, oneTotal)} <span className="text-[10.5px] font-normal text-ink-500">= {m.fmt(oneTotal / 100, m.digits + 1)}</span></td><td className={clsx(gtd, 'text-right px-2 text-ink-500 font-normal')}>{lakhNum(m, oRows.reduce((s, r) => s + refO[r.k], 0))}</td><td className={gtd} colSpan={2} /></tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
