/**
 * GCC run-rate cost model – the pure engine behind Financial Management → Cost Model.
 *
 * Every rupee is derived from drivers × unit costs:
 *   headcount (exit → opening → new hires → average) × experience mix → FTE by band
 *   × fully loaded cost per FTE by band → compensation; new hires / average FTE / fixed → other people
 *   costs; seats → real estate; new hires + average FTE → technology; fixed corporate + one-time
 *   establishment are program-level and allocated to business units by average-headcount share.
 *
 * Units: per-FTE and unit-cost inputs are stored in ₹ Lakh (a few "per sq ft" lease inputs in ₹),
 * percentages in %, results in ₹ Cr (per-FTE results in ₹ Lakh). Field names that are percentages or
 * unit ratios contain Rate / Share / Ratio / Years / Months so the program-variant scaler leaves them alone.
 *
 * Storage: one record (id 'model') in the 'costModel' collection; saved scenarios (snapshots of the
 * inputs) in 'costModelScenarios'. See `seedCostModel()` / `seedCostScenarios()`.
 */
import type { BusinessUnit } from './businessUnits'

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
export const MAX_YEARS = 5
export const BANDS = [
  { key: 'b1', label: '0–3 years', roles: 'Junior / Analyst / Associate', short: '0–3' },
  { key: 'b2', label: '3–6 years', roles: 'Engineer / Consultant', short: '3–6' },
  { key: 'b3', label: '6–10 years', roles: 'Senior / Lead', short: '6–10' },
  { key: 'b4', label: '10–15 years', roles: 'Manager / Architect', short: '10–15' },
  { key: 'b5', label: '15+ years', roles: 'Director / Principal / Leadership', short: '15+' },
] as const
export const BAND_COLORS = ['#BFD7F7', '#5B9BF0', '#2B6FD6', '#1E4FA8', '#0B2240']

export const OFFICE_MODELS = ['Managed office', 'Coworking / flexible space', 'Conventional lease'] as const
export type OfficeModel = (typeof OFFICE_MODELS)[number]
export const OFFICE_MODEL_INFO: Record<OfficeModel, { tagline: string; description: string; bestFor: string }> = {
  'Managed office': { tagline: 'Fully serviced, per-seat pricing', description: 'A private, branded office run by a provider. One all-inclusive monthly fee per seat covers rent, fit-out, furniture, utilities, maintenance, internet and housekeeping. Fast to occupy (4–8 weeks), 1–3 year terms, provider carries the capital cost.', bestFor: 'Speed to market · low upfront capital · flexible growth' },
  'Coworking / flexible space': { tagline: 'Shared space, per-desk membership', description: 'Dedicated or hot desks inside a shared centre on a monthly membership. Lowest commitment and fastest to start, shared meeting rooms and amenities billed as extras. Less control over security, branding and expansion.', bestFor: 'Pilot teams · satellite cities · month-to-month flexibility' },
  'Conventional lease': { tagline: 'Leased floor plate, own fit-out', description: 'Direct lease of a warm-shell floor plate with the company funding fit-out, furniture and operations. Lowest cost per seat at scale (300+ seats) and full control, but higher upfront capital, 5–9 year lock-ins and 6–9 months to occupy.', bestFor: 'Scale (300+ seats) · full control · lowest long-run cost' },
}

export type EscalationMode = 'same' | 'escalate' | 'byYear'
export type SimpleMode = 'same' | 'escalate'

export const CATEGORIES = ['Compensation', 'Other people costs', 'Real estate', 'Technology', 'Centre / corporate', 'One-time establishment'] as const
export type Category = (typeof CATEGORIES)[number]
export const CATEGORY_COLORS: Record<Category, string> = {
  Compensation: '#1E5BBE', 'Other people costs': '#F97316', 'Real estate': '#EC4899', Technology: '#F59E0B', 'Centre / corporate': '#14B8A6', 'One-time establishment': '#16A34A',
}

/* ------------------------------------------------------------------ */
/* Input types                                                         */
/* ------------------------------------------------------------------ */
/** Per band: base salary (₹ L per FTE per year), variable pay and allowances (% of base). */
export interface CompInputs { base: number[]; variableRate: number[]; allowanceRate: number[] }
export interface BenefitInputs {
  basicShare: number // basic salary as % of base
  pfRate: number // employer PF % of basic
  gratuityRate: number // % of basic
  medical: number; life: number; learning: number; engagement: number; other: number // ₹ L per employee per year
}
export interface NewHireCosts { recruitmentFee: number; recruitmentRate: number; bgv: number; preMedical: number; signOn: number; signOnRate: number; relocation: number; relocationRate: number; training: number }
export interface PerFteCosts { transport: number; transportRate: number; travel: number; events: number; rewards: number; rewardsRate: number }
export interface FixedPeopleCosts { branding: number; careerProgrammes: number; other: number }
export interface OtherPeopleInputs { newHire: NewHireCosts; perFte: PerFteCosts; fixed: FixedPeopleCosts; mode: SimpleMode; escalationRate: number }
export interface ManagedOfficeInputs { seatCost: number; seatShare: number; setupPerSeat: number; depositMonths: number }
export interface CoworkingInputs { deskCost: number; deskShare: number; depositMonths: number }
export interface LeaseInputs { rentPerSqft: number; sqftPerSeat: number; fitoutPerSqft: number; camPerSqft: number; seatShare: number; depositMonths: number; lockInYears: number }
export interface RealEstateInputs { model: OfficeModel; city: string; notes: string; managed: ManagedOfficeInputs; coworking: CoworkingInputs; lease: LeaseInputs; parkingRatio: number; parkingCost: number; mode: SimpleMode; escalationRate: number }
export interface TechnologyInputs { device: number; refreshYears: number; licences: number; apps: number; cloud: number; security: number; support: number; network: number; hosting: number; mode: SimpleMode; escalationRate: number }
export interface CorporateInputs { compliance: number; financeAdmin: number; legalTaxAudit: number; insurance: number; governance: number; other: number; mode: SimpleMode; escalationRate: number }
export interface OneTimeInputs { entityLegal: number; policies: number; brandLaunch: number; travelKt: number; programme: number; contingency: number }
export interface ModelSettings { horizonYears: number; firstYear: number; openingHeadcount: number; attritionRate: number; compMode: EscalationMode; compEscalationRate: number }
/** Business-unit overrides; anything missing falls back to the program default / the unit's FTE plan. */
export interface UnitOverride { exit?: number[]; mixMode?: 'same' | 'byYear'; mixShare?: number[]; mixByYear?: number[][]; comp?: CompInputs; baseByYear?: number[][] }
export interface ModelDefaults { mixMode: 'same' | 'byYear'; mixShare: number[]; mixByYear: number[][]; comp: CompInputs; baseByYear: number[][] }
export interface CostModelInputs {
  id: 'model'
  settings: ModelSettings
  defaults: ModelDefaults
  benefits: BenefitInputs
  otherPeople: OtherPeopleInputs
  realEstate: RealEstateInputs
  technology: TechnologyInputs
  corporate: CorporateInputs
  oneTime: OneTimeInputs
  units: Record<string, UnitOverride>
}
export interface CostScenario { id: string; name: string; note: string; savedAt: string; inputs: CostModelInputs }

/* ------------------------------------------------------------------ */
/* Industry reference (India GCC, ₹ at 96/USD)                          */
/* ------------------------------------------------------------------ */
export const REFERENCE = {
  comp: { base: [9.6, 16, 28, 48, 80], variableRate: [10, 10, 12, 15, 20], allowanceRate: [5, 5, 5, 5, 5] } as CompInputs,
  mixShare: [20, 35, 25, 15, 5],
  benefits: { basicShare: 50, pfRate: 12, gratuityRate: 4.81, medical: 0.15, life: 0.035, learning: 0.38, engagement: 0.12, other: 0.24 } as BenefitInputs,
  otherPeople: {
    newHire: { recruitmentFee: 2.4, recruitmentRate: 50, bgv: 0.025, preMedical: 0.015, signOn: 1.9, signOnRate: 20, relocation: 1.0, relocationRate: 15, training: 0.29 },
    perFte: { transport: 0.72, transportRate: 40, travel: 0.58, events: 0.14, rewards: 0.14, rewardsRate: 100 },
    fixed: { branding: 24, careerProgrammes: 14, other: 9.6 },
    mode: 'escalate' as SimpleMode, escalationRate: 6,
  } as OtherPeopleInputs,
  realEstate: {
    model: 'Managed office' as OfficeModel, city: 'Pune', notes: '',
    managed: { seatCost: 0.14, seatShare: 80, setupPerSeat: 0.19, depositMonths: 3 },
    coworking: { deskCost: 0.18, deskShare: 70, depositMonths: 2 },
    lease: { rentPerSqft: 95, sqftPerSeat: 80, fitoutPerSqft: 3500, camPerSqft: 18, seatShare: 80, depositMonths: 6, lockInYears: 5 },
    parkingRatio: 5, parkingCost: 0.03, mode: 'escalate' as SimpleMode, escalationRate: 5,
  } as RealEstateInputs,
  technology: { device: 0.9, refreshYears: 3, licences: 0.035, apps: 0.038, cloud: 0.034, security: 0.014, support: 0.019, network: 0.01, hosting: 0.005, mode: 'escalate' as SimpleMode, escalationRate: 5 } as TechnologyInputs,
  corporate: { compliance: 3.5, financeAdmin: 29, legalTaxAudit: 11.5, insurance: 14.4, governance: 24, other: 9.6, mode: 'same' as SimpleMode, escalationRate: 5 } as CorporateInputs,
  oneTime: { entityLegal: 14.4, policies: 19, brandLaunch: 24, travelKt: 58, programme: 72, contingency: 19 } as OneTimeInputs,
  settings: { horizonYears: 5, firstYear: 2027, openingHeadcount: 0, attritionRate: 12, compMode: 'same' as EscalationMode, compEscalationRate: 9.9 } as ModelSettings,
}
/** India GCC plausibility ranges used by the model checks. */
export const INDIA_RANGES = {
  costPerFteL: [18, 60], // fully loaded, all-in ₹ L per FTE per year
  compensationShare: [55, 88], // % of total modelled cost
  seatCostL: [0.08, 0.25], // managed seat ₹ L per month
  otherPeoplePerFteL: [0.5, 4],
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const scaleArr = (a: number[], f: number) => a.map((v) => +(v * f).toFixed(2))
export const sumArr = (a: number[]) => a.reduce((s, v) => s + v, 0)
export const r1 = (v: number) => Math.round(v * 10) / 10

/* ------------------------------------------------------------------ */
/* Seeds                                                               */
/* ------------------------------------------------------------------ */
const exitPlan = (bu: BusinessUnit) => [bu.y1, bu.y2, bu.y3, bu.y4, bu.y5]
export const byYear = (base: number[], rate: number, years = MAX_YEARS) => Array.from({ length: years }, (_, y) => scaleArr(base, Math.pow(1 + rate / 100, y)))

/** The reference model with the given business units' FTE plans and no unit-level compensation overrides. */
export function referenceInputs(units: BusinessUnit[]): CostModelInputs {
  const r = clone(REFERENCE)
  const u: Record<string, UnitOverride> = {}
  units.forEach((bu) => { u[bu.id] = { exit: exitPlan(bu) } })
  return {
    id: 'model', settings: r.settings,
    defaults: { mixMode: 'same', mixShare: r.mixShare, mixByYear: Array(MAX_YEARS).fill(null).map(() => [...r.mixShare]), comp: r.comp, baseByYear: byYear(r.comp.base, r.settings.compEscalationRate) },
    benefits: r.benefits, otherPeople: r.otherPeople, realEstate: r.realEstate, technology: r.technology, corporate: r.corporate, oneTime: r.oneTime, units: u,
  }
}

/** Demo seed: reference set, headcount from the business-unit FTE plan, SAP & Microsoft practices +10 % and shared services −10 % on compensation. */
export function seedCostModel(units: BusinessUnit[]): CostModelInputs {
  const m = referenceInputs(units)
  const premium: Record<string, number> = { 'bu-sap': 1.1, 'bu-ms': 1.1, 'bu-fin': 0.9, 'bu-hr': 0.9 }
  for (const bu of units) {
    const f = premium[bu.id] ?? (bu.kind === 'Shared Services' ? 0.9 : bu.name.startsWith('SAP') || bu.name.startsWith('Microsoft') ? 1.1 : 1)
    if (f !== 1) m.units[bu.id] = { ...m.units[bu.id], comp: { ...clone(REFERENCE.comp), base: scaleArr(REFERENCE.comp.base, f) }, baseByYear: byYear(scaleArr(REFERENCE.comp.base, f), m.settings.compEscalationRate) }
  }
  m.realEstate.notes = 'Managed office in Pune (Kharadi / Hinjewadi shortlist) for the first three years, option to move to a conventional lease once the centre passes 400 seats.'
  return m
}

export function seedCostScenarios(units: BusinessUnit[]): CostScenario[] {
  const base = seedCostModel(units)
  const accel = flexDriver(base, 'headcount', 15)
  accel.settings = { ...accel.settings, compMode: 'escalate' }
  const lean = flexDriver(flexDriver(base, 'baseSalary', -5), 'realEstate', -10)
  lean.realEstate.managed.seatShare = 65
  return [
    { id: 'cs-base', name: 'Base plan', note: 'Business-unit FTE plan 320 → 450, managed office in Pune, compensation at reference with practice premiums.', savedAt: '2026-10-20', inputs: base },
    { id: 'cs-accel', name: 'Accelerated ramp', note: 'Headcount +15 % across the horizon with 9.9 % annual compensation escalation.', savedAt: '2026-10-20', inputs: accel },
    { id: 'cs-lean', name: 'Lean footprint', note: 'Base salaries −5 %, real-estate unit costs −10 % and 65 % seat ratio (hybrid working).', savedAt: '2026-10-20', inputs: lean },
  ]
}

/** Exit headcount ramp from a Year 1 and a final-year size (linear / front-loaded / back-loaded). */
export function rampHeadcount(y1: number, yN: number, profile: 'linear' | 'front' | 'back', years = MAX_YEARS): number[] {
  const out: number[] = []
  for (let i = 0; i < years; i++) {
    const t = years === 1 ? 1 : i / (years - 1)
    const s = profile === 'linear' ? t : profile === 'front' ? 1 - Math.pow(1 - t, 2) : Math.pow(t, 2)
    out.push(Math.round(y1 + (yN - y1) * s))
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Result types                                                        */
/* ------------------------------------------------------------------ */
export interface CompBreakdown { base: number; variable: number; allowances: number; statutory: number; benefits: number; total: number }
export interface YearResult {
  y: number; label: string; calendar: number
  opening: number; exit: number; avg: number; netAddition: number; backfill: number; newHires: number
  mixShare: number[]; byBand: number[]; exitByBand: number[]; loadedPerFte: number[]; loadedBreakdown: CompBreakdown[]
  comp: CompBreakdown
  otherPeople: { newHire: number; perFte: number; fixed: number; total: number }
  realEstate: { seats: number; recurring: number; parking: number; setup: number; deposit: number; total: number }
  technology: { recurring: number; devices: number; refreshDevices: number; total: number }
  corporate: number
  oneTime: number
  total: number
  operating: number; oneTimeCash: number; deposits: number; cashOut: number
  costPerFte: number // ₹ L
}
export interface EntityResult {
  id: string; name: string; years: YearResult[]
  total: number; avgAnnual: number; runRate: number; runRateCostPerFte: number; avgCostPerFte: number
  byCategory: Record<Category, number[]>; categoryTotals: Record<Category, number>; peopleShare: number; share: number
  cashTotal: number; depositsTotal: number
}
export interface Check { id: string; status: 'pass' | 'warn' | 'fail' | 'info'; name: string; detail: string }
export interface CashRow { y: number; label: string; operating: number; establishment: number; fitout: number; devices: number; oneTime: number; deposits: number; cashOut: number; cumulative: number }
export interface ModelResult {
  horizon: number; labels: string[]; byUnit: Record<string, EntityResult>; unitOrder: string[]; program: EntityResult
  cashFlow: CashRow[]; checks: Check[]; empty: boolean
}

/* ------------------------------------------------------------------ */
/* Resolution of unit inputs                                           */
/* ------------------------------------------------------------------ */
export function unitExit(inp: CostModelInputs, bu: BusinessUnit): number[] {
  const o = inp.units[bu.id]
  return (o?.exit && o.exit.length ? o.exit : exitPlan(bu)).slice(0, MAX_YEARS)
}
export function unitMixMode(inp: CostModelInputs, bu: BusinessUnit) { return inp.units[bu.id]?.mixMode ?? inp.defaults.mixMode }
export function unitMix(inp: CostModelInputs, bu: BusinessUnit, y: number): number[] {
  const o = inp.units[bu.id]
  const mode = unitMixMode(inp, bu)
  if (mode === 'byYear') return (o?.mixByYear ?? inp.defaults.mixByYear)[y] ?? o?.mixShare ?? inp.defaults.mixShare
  return o?.mixShare ?? inp.defaults.mixShare
}
export function unitComp(inp: CostModelInputs, bu: BusinessUnit): CompInputs { return inp.units[bu.id]?.comp ?? inp.defaults.comp }
export function unitHasOwnComp(inp: CostModelInputs, bu: BusinessUnit) { return !!inp.units[bu.id]?.comp }
export function unitBaseByYear(inp: CostModelInputs, bu: BusinessUnit): number[][] { return inp.units[bu.id]?.baseByYear ?? inp.defaults.baseByYear }

/** Base salary per band in year y under the compensation mode. */
export function baseForYear(inp: CostModelInputs, comp: CompInputs, baseByYear: number[][], y: number): number[] {
  const { compMode, compEscalationRate } = inp.settings
  if (compMode === 'byYear') return baseByYear[y] ?? comp.base
  if (compMode === 'escalate') return comp.base.map((b) => b * Math.pow(1 + compEscalationRate / 100, y))
  return comp.base
}
/** Fully loaded cost per FTE (₹ L) for each band in year y, with its build-up. */
export function loadedCost(inp: CostModelInputs, comp: CompInputs, baseByYear: number[][], y: number): CompBreakdown[] {
  const b = inp.benefits
  const f = inp.settings.compMode === 'escalate' ? Math.pow(1 + inp.settings.compEscalationRate / 100, y) : 1
  const base = baseForYear(inp, comp, baseByYear, y)
  return base.map((bs, i) => {
    const variable = bs * (comp.variableRate[i] ?? 0) / 100
    const allowances = bs * (comp.allowanceRate[i] ?? 0) / 100
    const basic = bs * b.basicShare / 100
    const statutory = basic * (b.pfRate + b.gratuityRate) / 100
    const benefits = (b.medical + b.life + b.learning + b.engagement + b.other) * f
    return { base: bs, variable, allowances, statutory, benefits, total: bs + variable + allowances + statutory + benefits }
  })
}

const esc = (mode: SimpleMode, rate: number, y: number) => (mode === 'escalate' ? Math.pow(1 + rate / 100, y) : 1)
const L = 100 // ₹ L per ₹ Cr

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */
export function computeModel(inp: CostModelInputs, units: BusinessUnit[]): ModelResult {
  const H = Math.max(1, Math.min(MAX_YEARS, inp.settings.horizonYears || MAX_YEARS))
  const labels = Array.from({ length: H }, (_, y) => `Y${y + 1}`)
  const active = units.filter((u) => u.status !== 'Out of Scope')

  /* ---- pass 1: headcount per unit ---- */
  type HC = { opening: number; exit: number; avg: number; netAddition: number; backfill: number; newHires: number; mix: number[]; byBand: number[]; exitByBand: number[] }
  const hc: Record<string, HC[]> = {}
  const openingShare = sumArr(active.map((u) => unitExit(inp, u)[0] ?? 0))
  for (const u of active) {
    const exit = unitExit(inp, u)
    const rows: HC[] = []
    let opening = openingShare > 0 ? inp.settings.openingHeadcount * ((exit[0] ?? 0) / openingShare) : 0
    for (let y = 0; y < H; y++) {
      const ex = exit[y] ?? exit[exit.length - 1] ?? 0
      const avg = (opening + ex) / 2
      const netAddition = Math.max(0, ex - opening)
      const backfill = avg * inp.settings.attritionRate / 100
      const mix = unitMix(inp, u, y)
      const mixSum = sumArr(mix) || 100
      const norm = mix.map((s) => s / mixSum)
      rows.push({ opening, exit: ex, avg, netAddition, backfill, newHires: netAddition + backfill, mix, byBand: norm.map((s) => avg * s), exitByBand: norm.map((s) => ex * s) })
      opening = ex
    }
    hc[u.id] = rows
  }
  const avgTotal = Array.from({ length: H }, (_, y) => sumArr(active.map((u) => hc[u.id][y].avg)))

  /* ---- program-level fixed lines (allocated by average-headcount share) ---- */
  const op = inp.otherPeople, re = inp.realEstate, te = inp.technology, co = inp.corporate, ot = inp.oneTime
  const fixedPeople = (y: number) => (op.fixed.branding + op.fixed.careerProgrammes + op.fixed.other) / L * esc(op.mode, op.escalationRate, y)
  const corporate = (y: number) => (co.compliance + co.financeAdmin + co.legalTaxAudit + co.insurance + co.governance + co.other) / L * esc(co.mode, co.escalationRate, y)
  const oneTimeY1 = (ot.entityLegal + ot.policies + ot.brandLaunch + ot.travelKt + ot.programme + ot.contingency) / L

  /* ---- pass 2: costs per unit ---- */
  const byUnit: Record<string, EntityResult> = {}
  for (const u of active) {
    const comp = unitComp(inp, u), bby = unitBaseByYear(inp, u)
    const years: YearResult[] = []
    let prevSeats = 0, prevSqft = 0
    const hiresHist: number[] = []
    for (let y = 0; y < H; y++) {
      const h = hc[u.id][y]
      const share = avgTotal[y] > 0 ? h.avg / avgTotal[y] : 1 / active.length
      /* compensation */
      const loaded = loadedCost(inp, comp, bby, y)
      const cb: CompBreakdown = { base: 0, variable: 0, allowances: 0, statutory: 0, benefits: 0, total: 0 }
      loaded.forEach((l, i) => { const fte = h.byBand[i]; cb.base += l.base * fte / L; cb.variable += l.variable * fte / L; cb.allowances += l.allowances * fte / L; cb.statutory += l.statutory * fte / L; cb.benefits += l.benefits * fte / L })
      cb.total = cb.base + cb.variable + cb.allowances + cb.statutory + cb.benefits
      /* other people */
      const ef = esc(op.mode, op.escalationRate, y)
      const nh = op.newHire, pf = op.perFte
      const perHire = nh.recruitmentFee * nh.recruitmentRate / 100 + nh.bgv + nh.preMedical + nh.signOn * nh.signOnRate / 100 + nh.relocation * nh.relocationRate / 100 + nh.training
      const perFte = pf.transport * pf.transportRate / 100 + pf.travel + pf.events + pf.rewards * pf.rewardsRate / 100
      const opNewHire = h.newHires * perHire / L * ef, opPerFte = h.avg * perFte / L * ef, opFixed = fixedPeople(y) * share
      /* real estate */
      const rf = esc(re.mode, re.escalationRate, y)
      let seats = 0, recurring = 0, setup = 0, deposit = 0
      if (re.model === 'Managed office') {
        seats = h.exit * re.managed.seatShare / 100
        const newSeats = Math.max(0, seats - prevSeats)
        recurring = seats * re.managed.seatCost * 12 / L * rf
        setup = newSeats * re.managed.setupPerSeat / L * rf
        deposit = newSeats * re.managed.seatCost * re.managed.depositMonths / L * rf
      } else if (re.model === 'Coworking / flexible space') {
        seats = h.exit * re.coworking.deskShare / 100
        const newSeats = Math.max(0, seats - prevSeats)
        recurring = seats * re.coworking.deskCost * 12 / L * rf
        deposit = newSeats * re.coworking.deskCost * re.coworking.depositMonths / L * rf
      } else {
        seats = h.exit * re.lease.seatShare / 100
        const sqft = seats * re.lease.sqftPerSeat
        const newSqft = Math.max(0, sqft - prevSqft)
        recurring = sqft * (re.lease.rentPerSqft + re.lease.camPerSqft) * 12 / 1e7 * rf
        setup = newSqft * re.lease.fitoutPerSqft / 1e7 * rf
        deposit = newSqft * re.lease.rentPerSqft * re.lease.depositMonths / 1e7 * rf
        prevSqft = Math.max(prevSqft, sqft)
      }
      prevSeats = Math.max(prevSeats, seats)
      const parking = re.parkingRatio > 0 ? (h.exit / re.parkingRatio) * re.parkingCost * 12 / L * rf : 0
      /* technology */
      const tf = esc(te.mode, te.escalationRate, y)
      hiresHist.push(h.newHires)
      const refreshDevices = te.refreshYears > 0 && y - te.refreshYears >= 0 ? hiresHist[y - te.refreshYears] : 0
      const devices = (h.newHires + refreshDevices) * te.device / L * tf
      const techRecurring = h.avg * (te.licences + te.apps + te.cloud + te.security + te.support + te.network + te.hosting) * 12 / L * tf
      /* program-level allocations */
      const corp = corporate(y) * share
      const oneTime = y === 0 ? oneTimeY1 * share : 0
      const comp$ = cb.total, other$ = opNewHire + opPerFte + opFixed, re$ = recurring + parking + setup, te$ = techRecurring + devices
      const total = comp$ + other$ + re$ + te$ + corp + oneTime
      const oneTimeCash = oneTime + setup + devices
      years.push({
        y, label: labels[y], calendar: inp.settings.firstYear + y,
        opening: h.opening, exit: h.exit, avg: h.avg, netAddition: h.netAddition, backfill: h.backfill, newHires: h.newHires,
        mixShare: h.mix, byBand: h.byBand, exitByBand: h.exitByBand, loadedPerFte: loaded.map((l) => l.total), loadedBreakdown: loaded,
        comp: cb, otherPeople: { newHire: opNewHire, perFte: opPerFte, fixed: opFixed, total: other$ },
        realEstate: { seats, recurring, parking, setup, deposit, total: re$ }, technology: { recurring: techRecurring, devices, refreshDevices, total: te$ },
        corporate: corp, oneTime, total, operating: total - oneTimeCash, oneTimeCash, deposits: deposit, cashOut: total + deposit,
        costPerFte: h.avg > 0 ? total * L / h.avg : 0,
      })
    }
    byUnit[u.id] = summarise(u.id, u.name, years)
  }
  const unitOrder = active.map((u) => u.id)
  const program = summarise('program', 'All business units', rollUp(unitOrder.map((id) => byUnit[id].years), labels, inp.settings.firstYear))
  for (const id of unitOrder) byUnit[id].share = program.total > 0 ? byUnit[id].total / program.total : 0
  program.share = 1

  /* ---- cash flow ---- */
  let cum = 0
  const cashFlow: CashRow[] = program.years.map((yr) => {
    const fitout = unitOrder.reduce((s, id) => s + byUnit[id].years[yr.y].realEstate.setup, 0)
    const devices = unitOrder.reduce((s, id) => s + byUnit[id].years[yr.y].technology.devices, 0)
    cum += yr.cashOut
    return { y: yr.y, label: yr.label, operating: yr.operating, establishment: yr.oneTime, fitout, devices, oneTime: yr.oneTimeCash, deposits: yr.deposits, cashOut: yr.cashOut, cumulative: cum }
  })

  const empty = program.years.every((yr) => yr.exit === 0)
  return { horizon: H, labels, byUnit, unitOrder, program, cashFlow, checks: runChecks(inp, active, byUnit, program, cashFlow, empty), empty }
}

function rollUp(unitYears: YearResult[][], labels: string[], firstYear: number): YearResult[] {
  return labels.map((label, y) => {
    const rows = unitYears.map((u) => u[y])
    const s = (f: (r: YearResult) => number) => rows.reduce((a, r) => a + f(r), 0)
    const avg = s((r) => r.avg)
    const byBand = BANDS.map((_, i) => s((r) => r.byBand[i]))
    const exitByBand = BANDS.map((_, i) => s((r) => r.exitByBand[i]))
    const exit = s((r) => r.exit)
    const total = s((r) => r.total)
    const cb = (k: keyof CompBreakdown) => s((r) => r.comp[k])
    const comp: CompBreakdown = { base: cb('base'), variable: cb('variable'), allowances: cb('allowances'), statutory: cb('statutory'), benefits: cb('benefits'), total: cb('total') }
    // program-level fully loaded cost per FTE by band = FTE-weighted average of the units
    const loadedPerFte = BANDS.map((_, i) => { const fte = byBand[i]; return fte > 0 ? s((r) => r.loadedPerFte[i] * r.byBand[i]) / fte : rows[0]?.loadedPerFte[i] ?? 0 })
    const loadedBreakdown = BANDS.map((_, i) => { const fte = byBand[i]; const w = (k: keyof CompBreakdown) => (fte > 0 ? s((r) => r.loadedBreakdown[i][k] * r.byBand[i]) / fte : rows[0]?.loadedBreakdown[i][k] ?? 0); return { base: w('base'), variable: w('variable'), allowances: w('allowances'), statutory: w('statutory'), benefits: w('benefits'), total: w('total') } })
    return {
      y, label, calendar: firstYear + y,
      opening: s((r) => r.opening), exit, avg, netAddition: s((r) => r.netAddition), backfill: s((r) => r.backfill), newHires: s((r) => r.newHires),
      mixShare: exit > 0 ? exitByBand.map((v) => (v / exit) * 100) : rows[0]?.mixShare ?? [], byBand, exitByBand, loadedPerFte, loadedBreakdown,
      comp,
      otherPeople: { newHire: s((r) => r.otherPeople.newHire), perFte: s((r) => r.otherPeople.perFte), fixed: s((r) => r.otherPeople.fixed), total: s((r) => r.otherPeople.total) },
      realEstate: { seats: s((r) => r.realEstate.seats), recurring: s((r) => r.realEstate.recurring), parking: s((r) => r.realEstate.parking), setup: s((r) => r.realEstate.setup), deposit: s((r) => r.realEstate.deposit), total: s((r) => r.realEstate.total) },
      technology: { recurring: s((r) => r.technology.recurring), devices: s((r) => r.technology.devices), refreshDevices: s((r) => r.technology.refreshDevices), total: s((r) => r.technology.total) },
      corporate: s((r) => r.corporate), oneTime: s((r) => r.oneTime), total,
      operating: s((r) => r.operating), oneTimeCash: s((r) => r.oneTimeCash), deposits: s((r) => r.deposits), cashOut: s((r) => r.cashOut),
      costPerFte: avg > 0 ? total * L / avg : 0,
    }
  })
}

function summarise(id: string, name: string, years: YearResult[]): EntityResult {
  const H = years.length
  const cat = (f: (r: YearResult) => number) => years.map(f)
  const byCategory: Record<Category, number[]> = {
    Compensation: cat((r) => r.comp.total), 'Other people costs': cat((r) => r.otherPeople.total), 'Real estate': cat((r) => r.realEstate.total),
    Technology: cat((r) => r.technology.total), 'Centre / corporate': cat((r) => r.corporate), 'One-time establishment': cat((r) => r.oneTime),
  }
  const categoryTotals = Object.fromEntries(CATEGORIES.map((c) => [c, sumArr(byCategory[c])])) as Record<Category, number>
  const total = sumArr(years.map((r) => r.total))
  const last = years[H - 1]
  const avgFte = sumArr(years.map((r) => r.avg))
  return {
    id, name, years, total, avgAnnual: H ? total / H : 0, runRate: last?.total ?? 0, runRateCostPerFte: last?.costPerFte ?? 0, avgCostPerFte: avgFte > 0 ? total * L / avgFte : 0,
    byCategory, categoryTotals, peopleShare: total > 0 ? (categoryTotals.Compensation + categoryTotals['Other people costs']) / total * 100 : 0, share: 0,
    cashTotal: sumArr(years.map((r) => r.cashOut)), depositsTotal: sumArr(years.map((r) => r.deposits)),
  }
}

/* ------------------------------------------------------------------ */
/* Model checks                                                        */
/* ------------------------------------------------------------------ */
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b))
/** Amount tokens – the UI formats them in the selected currency (see model/shared.tsx → fmtDetail). */
const cr = (v: number) => `{cr:${v.toFixed(3)}}`
const lk = (v: number) => `{l:${v.toFixed(2)}}`
function runChecks(inp: CostModelInputs, units: BusinessUnit[], byUnit: Record<string, EntityResult>, p: EntityResult, cash: CashRow[], empty: boolean): Check[] {
  const checks: Check[] = []
  const H = p.years.length
  if (empty) { checks.push({ id: 'inputs', status: 'info', name: 'Inputs', detail: 'Enter the headcount plan and cost inputs to run the model checks.' }); return checks }
  // 1 categories reconcile
  const catOk = p.years.every((yr) => near(CATEGORIES.reduce((s, c) => s + p.byCategory[c][yr.y], 0), yr.total))
  checks.push({ id: 'cat', status: catOk ? 'pass' : 'fail', name: 'Category totals reconcile to the annual total', detail: `${CATEGORIES.length} categories sum to ${cr(p.total)} across ${H} years.` })
  // 2 operating + one-time
  const opOk = p.years.every((yr) => near(yr.operating + yr.oneTimeCash, yr.total))
  const oneTime = sumArr(p.years.map((yr) => yr.oneTimeCash))
  checks.push({ id: 'op', status: opOk ? 'pass' : 'fail', name: 'Operating + one-time = total', detail: `One-time items (establishment, seat setup / fit-out, devices): ${cr(oneTime)} of ${cr(p.total)}.` })
  // 3 cash reconciles
  const cashOk = near(cash[cash.length - 1]?.cumulative ?? 0, p.total + p.depositsTotal) && cash.every((c) => near(c.operating + c.oneTime + c.deposits, c.cashOut))
  checks.push({ id: 'cash', status: cashOk ? 'pass' : 'fail', name: 'Cumulative cash out reconciles', detail: `${cr(p.cashTotal)} including ${cr(p.depositsTotal)} refundable deposits.` })
  // 4 cost per FTE × avg headcount
  const pfOk = p.years.every((yr) => yr.avg === 0 || near(yr.costPerFte * yr.avg / L, yr.total, 1e-6))
  checks.push({ id: 'pf', status: pfOk ? 'pass' : 'fail', name: 'Cost per FTE × average headcount = annual total', detail: 'Per-FTE figures are consistent with the totals in every year.' })
  // 5 business units reconcile to program
  const unitsOk = p.years.every((yr) => near(units.reduce((s, u) => s + byUnit[u.id].years[yr.y].total, 0), yr.total))
  checks.push({ id: 'units', status: unitsOk ? 'pass' : 'fail', name: 'Business units reconcile to the program', detail: `${units.length} business units sum to the program total; centre / corporate and one-time establishment are allocated by average-headcount share.` })
  // 6 experience mix sums to 100 %
  const badMix = units.filter((u) => Array.from({ length: H }, (_, y) => sumArr(unitMix(inp, u, y))).some((s) => Math.abs(s - 100) > 0.5))
  checks.push({ id: 'mix', status: badMix.length ? 'warn' : 'pass', name: 'Experience mix totals 100 % in every year', detail: badMix.length ? `${badMix.map((u) => u.name).join(', ')}: mix does not total 100 % (normalised for costing).` : 'All business units have a complete experience mix.' })
  // 7 headcount matches the business-unit FTE plan
  const off = units.filter((u) => { const e = unitExit(inp, u); return [u.y1, u.y2, u.y3, u.y4, u.y5].slice(0, H).some((v, i) => v !== (e[i] ?? 0)) })
  checks.push({ id: 'plan', status: off.length ? 'warn' : 'pass', name: 'Modelled headcount matches the business-unit FTE plan', detail: off.length ? `${off.map((u) => u.name).join(', ')} differ from the FTE plan in GCC Setup / Target Footprint.` : 'Exit headcount equals the FTE plan for every business unit.' })
  // plausibility
  const last = p.years[H - 1]
  const [lo, hi] = INDIA_RANGES.costPerFteL
  checks.push({ id: 'pl-pf', status: last.costPerFte >= lo && last.costPerFte <= hi ? 'pass' : 'warn', name: `Final-year cost per FTE within India GCC range (${lk(lo)}–${lk(hi)})`, detail: `Modelled ${lk(last.costPerFte)} per FTE in ${last.label}.` })
  const [slo, shi] = INDIA_RANGES.compensationShare
  const compShare = last.total > 0 ? last.comp.total / last.total * 100 : 0
  checks.push({ id: 'pl-share', status: compShare >= slo && compShare <= shi ? 'pass' : 'warn', name: `Compensation share of run-rate within ${slo}–${shi} %`, detail: `Compensation is ${compShare.toFixed(1)} % of the ${last.label} run-rate.` })
  const [olo, ohi] = INDIA_RANGES.otherPeoplePerFteL
  const opPerFte = last.avg > 0 ? last.otherPeople.total * L / last.avg : 0
  checks.push({ id: 'pl-op', status: opPerFte >= olo && opPerFte <= ohi ? 'pass' : 'warn', name: `Other people costs per FTE within ${lk(olo)}–${lk(ohi)}`, detail: `${lk(opPerFte)} per average FTE in ${last.label}.` })
  if (inp.realEstate.model === 'Managed office') {
    const [rlo, rhi] = INDIA_RANGES.seatCostL
    const c = inp.realEstate.managed.seatCost
    checks.push({ id: 'pl-seat', status: c >= rlo && c <= rhi ? 'pass' : 'warn', name: `Managed-office seat cost within {k:${rlo}}–{k:${rhi}} per seat per month`, detail: `Input {k:${c}} per seat per month in ${inp.realEstate.city || 'the chosen city'}.` })
  }
  const shrink = p.years.some((yr, i) => i > 0 && yr.exit < p.years[i - 1].exit)
  if (shrink) checks.push({ id: 'shrink', status: 'info', name: 'Headcount declines in at least one year', detail: 'New hires are floored at attrition backfill; seats and deposits are not released.' })
  return checks
}

/* ------------------------------------------------------------------ */
/* Sensitivity                                                         */
/* ------------------------------------------------------------------ */
export const FLEX_DRIVERS = [
  { key: 'headcount', label: 'Headcount ramp', defaultFlex: 20, hint: 'Exit headcount of every business unit' },
  { key: 'baseSalary', label: 'Base salary', defaultFlex: 10, hint: 'Base salary per band (variable, allowances and statutory follow)' },
  { key: 'realEstate', label: 'Real estate unit costs', defaultFlex: 20, hint: 'Seat / desk / rent, fit-out, setup and parking rates' },
  { key: 'technology', label: 'Technology unit costs', defaultFlex: 20, hint: 'Device and per-user monthly rates' },
  { key: 'otherPeople', label: 'Other people costs', defaultFlex: 20, hint: 'Per new hire, per FTE and fixed programmes' },
  { key: 'corporate', label: 'Corporate and one-time costs', defaultFlex: 20, hint: 'Centre / corporate lines and one-time establishment' },
] as const
export type FlexDriver = (typeof FLEX_DRIVERS)[number]['key']

/** Returns a copy of the inputs with one driver flexed by ±pct (everything else constant). */
export function flexDriver(inp: CostModelInputs, driver: FlexDriver, pct: number): CostModelInputs {
  const out = clone(inp)
  const f = 1 + pct / 100
  const sc = (v: number) => +(v * f).toFixed(4)
  switch (driver) {
    case 'headcount':
      for (const id of Object.keys(out.units)) { const o = out.units[id]; if (o.exit) o.exit = o.exit.map((v) => Math.round(v * f)) }
      out.settings.openingHeadcount = Math.round(out.settings.openingHeadcount * f)
      // units without an explicit exit array keep the FTE plan; callers that need all units flexed should materialise exits first
      break
    case 'baseSalary':
      out.defaults.comp.base = out.defaults.comp.base.map(sc)
      out.defaults.baseByYear = out.defaults.baseByYear.map((r) => r.map(sc))
      for (const id of Object.keys(out.units)) { const o = out.units[id]; if (o.comp) o.comp.base = o.comp.base.map(sc); if (o.baseByYear) o.baseByYear = o.baseByYear.map((r) => r.map(sc)) }
      break
    case 'realEstate': {
      const re = out.realEstate
      re.managed.seatCost = sc(re.managed.seatCost); re.managed.setupPerSeat = sc(re.managed.setupPerSeat)
      re.coworking.deskCost = sc(re.coworking.deskCost)
      re.lease.rentPerSqft = sc(re.lease.rentPerSqft); re.lease.camPerSqft = sc(re.lease.camPerSqft); re.lease.fitoutPerSqft = sc(re.lease.fitoutPerSqft)
      re.parkingCost = sc(re.parkingCost)
      break
    }
    case 'technology': {
      const t = out.technology
      for (const k of ['device', 'licences', 'apps', 'cloud', 'security', 'support', 'network', 'hosting'] as const) t[k] = sc(t[k])
      break
    }
    case 'otherPeople': {
      const o = out.otherPeople
      for (const k of ['recruitmentFee', 'bgv', 'preMedical', 'signOn', 'relocation', 'training'] as const) o.newHire[k] = sc(o.newHire[k])
      for (const k of ['transport', 'travel', 'events', 'rewards'] as const) o.perFte[k] = sc(o.perFte[k])
      for (const k of ['branding', 'careerProgrammes', 'other'] as const) o.fixed[k] = sc(o.fixed[k])
      break
    }
    case 'corporate': {
      const c = out.corporate, o = out.oneTime
      for (const k of ['compliance', 'financeAdmin', 'legalTaxAudit', 'insurance', 'governance', 'other'] as const) c[k] = sc(c[k])
      for (const k of ['entityLegal', 'policies', 'brandLaunch', 'travelKt', 'programme', 'contingency'] as const) o[k] = sc(o[k])
      break
    }
  }
  return out
}

/** Make sure every unit carries an explicit exit array (so headcount flexes apply to all of them). */
export function materialiseExits(inp: CostModelInputs, units: BusinessUnit[]): CostModelInputs {
  const out = clone(inp)
  for (const u of units) out.units[u.id] = { ...out.units[u.id], exit: unitExit(inp, u) }
  return out
}

export interface SensitivityRow { driver: FlexDriver; label: string; flex: number; totalMinus: number; totalPlus: number; deltaPlus: number; deltaMinus: number; runRatePlus: number; runRateMinus: number; impactPct: number; elasticity: number }
/** Sensitivity of the 5-year total (program or one unit) to each driver flexed ± its percentage. */
export function sensitivity(inp: CostModelInputs, units: BusinessUnit[], flex: Partial<Record<FlexDriver, number>> = {}, unitId?: string): { base: EntityResult; rows: SensitivityRow[] } {
  const mat = materialiseExits(inp, units)
  const pick = (r: ModelResult) => (unitId ? r.byUnit[unitId] : r.program)
  const base = pick(computeModel(mat, units))
  const rows = FLEX_DRIVERS.map((d) => {
    const pct = flex[d.key] ?? d.defaultFlex
    const plus = pick(computeModel(flexDriver(mat, d.key, pct), units))
    const minus = pick(computeModel(flexDriver(mat, d.key, -pct), units))
    const deltaPlus = plus.total - base.total
    const impactPct = base.total > 0 ? deltaPlus / base.total * 100 : 0
    return { driver: d.key, label: d.label, flex: pct, totalMinus: minus.total, totalPlus: plus.total, deltaPlus, deltaMinus: minus.total - base.total, runRatePlus: plus.runRate - base.runRate, runRateMinus: minus.runRate - base.runRate, impactPct, elasticity: pct ? impactPct / pct : 0 }
  }).sort((a, b) => Math.abs(b.deltaPlus) - Math.abs(a.deltaPlus))
  return { base, rows }
}

/* ------------------------------------------------------------------ */
/* Reference helpers                                                   */
/* ------------------------------------------------------------------ */
/** Fill every input that is empty (0 / missing) from the industry reference; headcount is left alone. */
export function fillFromReference(inp: CostModelInputs): CostModelInputs {
  const out = clone(inp)
  const ref = clone(REFERENCE)
  const fill = (target: Record<string, unknown>, source: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(source)) {
      const cur = target[k]
      if (typeof v === 'number') { if (typeof cur !== 'number' || !cur) target[k] = v }
      else if (Array.isArray(v)) { if (!Array.isArray(cur) || cur.length !== v.length) target[k] = v; else target[k] = (cur as unknown[]).map((c, i) => (typeof c === 'number' && c ? c : (v as unknown[])[i])) }
      else if (v && typeof v === 'object') { if (!cur || typeof cur !== 'object') target[k] = v; else fill(cur as Record<string, unknown>, v as Record<string, unknown>) }
      else if (cur == null || cur === '') target[k] = v
    }
  }
  fill(out.defaults.comp as unknown as Record<string, unknown>, ref.comp as unknown as Record<string, unknown>)
  if (!sumArr(out.defaults.mixShare)) out.defaults.mixShare = ref.mixShare
  fill(out.benefits as unknown as Record<string, unknown>, ref.benefits as unknown as Record<string, unknown>)
  fill(out.otherPeople as unknown as Record<string, unknown>, ref.otherPeople as unknown as Record<string, unknown>)
  fill(out.realEstate as unknown as Record<string, unknown>, ref.realEstate as unknown as Record<string, unknown>)
  fill(out.technology as unknown as Record<string, unknown>, ref.technology as unknown as Record<string, unknown>)
  fill(out.corporate as unknown as Record<string, unknown>, ref.corporate as unknown as Record<string, unknown>)
  fill(out.oneTime as unknown as Record<string, unknown>, ref.oneTime as unknown as Record<string, unknown>)
  for (const id of Object.keys(out.units)) { const o = out.units[id]; if (o.comp) fill(o.comp as unknown as Record<string, unknown>, ref.comp as unknown as Record<string, unknown>) }
  return out
}

/** "vs reference" in % (positive = above reference). */
export const vsRef = (v: number, ref: number) => (ref ? ((v - ref) / ref) * 100 : 0)
