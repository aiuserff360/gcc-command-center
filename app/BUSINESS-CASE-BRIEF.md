# Financial Management – make it a driver-based GCC cost model, by business unit

**Framing (important, from the client):** this is NOT a copy of another product. It is the Command Center's own
Financial Management module, deepened. Keep its identity: the page is still "Financial Management", it keeps the
existing budget / actuals / commitments / approvals / benefits tracking, it uses the Command Center's wording,
components (`Card`, `KpiTile`, `Tabs`, `InputLayout`, inline grids), the Input/Output toggle, the business-unit base
(cards + dropdown → deep dive, as in Resource Allocation / Transition / Governance) and the INR/EUR money hook.
What we take from the reference business-case builder is the **modelling discipline and depth**: every rupee is derived
from drivers × unit costs, assumptions sit next to an industry reference, outputs reconcile, and scenarios/sensitivity
exist. Do not reproduce its step-wizard look, its sidebar, its copy or its "Base case / Save / Compare / Export" header.

Reference for mechanics only (do not imitate the UI): Future Factor 360 "GCC Business Case Builder"
(https://aiuserff360.github.io/ff360-gcc-business-case/ – sign in with any @futurefactor360.com e-mail and any password;
"Reload: India GCC · USD" loads the industry set; use the headcount ramp helper to see outputs). Mechanics to replicate:
- Headcount per year (exit headcount; opening; new hires = growth + attrition backfill; **average headcount for costing**),
  experience mix by band (0–3 / 3–6 / 6–10 / 10–15 / 15+).
- Compensation per band: base, variable % of base, allowances % of base; statutory & benefits (PF % of basic, basic as %
  of base, gratuity, medical, life, L&D, engagement, other per employee/year) → fully loaded cost per FTE per band;
  escalation (same / annual % / by year).
- Other people costs: per new hire (recruitment fee, BGV, medical, sign-on, relocation, training, each with eligibility %),
  per average FTE/year (transport, travel, events, R&R with eligibility), fixed per year (employer branding, career
  programmes, other).
- Real estate: office model (managed office / coworking / conventional lease) with its own assumptions (per seat/month,
  seats % of headcount, one-time setup per new seat, refundable deposit months, parking ratio & cost, escalation; lease:
  rent/sq ft, sq ft/seat, fit-out/sq ft, CAM, lock-in).
- Technology: device per new hire (refresh cycle), per user/month licences, apps, cloud, security, support, network,
  hosting, escalation.
- Centre operations: fixed corporate per year (compliance, finance/payroll admin, legal/tax/audit, insurance,
  governance/admin, other) + one-time establishment in Y1 (entity/legal, policies, employer-brand launch, travel & KT,
  programme/transition management, contingency).
- Outputs: total/average/run-rate/cost-per-FTE, cost by category and year, composition, per-FTE trend, cash flow (operating
  + one-time + refundable deposits, cumulative), integrity checks (categories reconcile, operating+one-time=total,
  cash reconciles, cost/FTE×avg headcount=total, plausibility vs India ranges), scenarios (save, compare ≤4 vs reference),
  sensitivity (flex drivers ±%, tornado, impact table).

## Files you own
`src/pages/Financial.tsx`, `src/components/financial/*`, `src/data/financial.ts`; add `src/data/costModel.ts` (engine)
and `src/components/financial/model/*` (UI). Shared collections via `useCollection` only; do not edit shared files.
Read `INPUT-BRIEF.md`, `CURRENCY-BRIEF.md`, `src/data/businessUnits.ts`, `src/components/footprint/BusinessUnits.tsx`
(`useBusinessUnits`), `src/components/setup/GccSetup.tsx` (`'gccProfile'`, `'programKpis'`),
`src/components/resources/AllocationTab.tsx` (unit selector pattern), `src/components/ui/InlineGrid.tsx`, and the
existing Financial files (their Input view already has grids for the tracking data – keep them).

## Engine – `src/data/costModel.ts` (pure, testable)
Input types per the mechanics above, **per business unit with a program default** (`'default'` + overrides per unit for
headcount, experience mix, compensation; other modules program-level). Industry reference set for an India GCC in rupees
(convert the reference's USD figures at ₹96/USD; e.g. base by band ₹9.6L/16L/28L/48L/80L, variable 10/10/12/15/20 %,
allowances 5 %, basic 50 % of base, PF 12 % of basic, gratuity 4.81 %, medical ₹15k, life ₹3.5k, L&D ₹38k, engagement
₹12k, other ₹24k; recruitment fee ₹2.4L @50 %, BGV ₹2.5k, medical ₹1.5k, sign-on ₹1.9L @20 %, relocation ₹1L @15 %,
training ₹29k; transport ₹72k @40 %, travel ₹58k, events ₹14k, R&R ₹14k; branding ₹24L, career ₹14L, other ₹9.6L;
managed office ₹14k/seat/month, 80 % seats, setup ₹19k/seat, deposit 3 months, parking 1:5 @ ₹3k/bay/month; device ₹90k,
refresh 3 yrs, licences ₹3.5k, apps ₹3.8k, cloud ₹3.4k, security ₹1.4k, support ₹1.9k, network ₹1k, hosting ₹0.5k per
user/month; corporate ₹3.5L/29L/11.5L/14.4L/24L/9.6L; one-time ₹14.4L/19L/24L/58L/72L/19L; escalation 9.9 % comp, 6 %
other people, 5 % tech/RE/corporate). Store per-FTE and unit inputs in ₹ Lakh, totals in ₹ Cr.
`computeModel(inputs, units) → { byUnit[unit]: yearly {opening, exit, avg, newHires, byBand, compensation by component,
otherPeople, realEstate, technology, corporate (allocated by avg-headcount share), oneTime (allocated), total,
costPerFte}, program: rolled up + unallocated view, cashFlow, checks[] }`, plus `flexDriver()` for sensitivity.
Sanity-check with a node script before UI: print 5-year total, Y5 run-rate, Y5 cost/FTE; expect people cost ≈ ₹ 60–75 Cr
at Y5 for 450 FTE and all checks passing.

## Input view (`mode === 'input'`) – `InputLayout` tabs, in the Command Center's style (no wizard chrome)
"Cost model: headcount" (business-unit cards + dropdown; exit headcount Y1..Y5 pre-filled from the unit's FTE plan,
ramp helper, experience mix, derived opening/new hires/average, Y5 pyramid) · "Cost model: people costs" (per unit or
program default: compensation grid by band with Your input / Industry reference / vs ref, benefits grid, derived fully
loaded cost per FTE; other people costs grids) · "Cost model: real estate" (office model choice + assumptions grid) ·
"Cost model: technology" · "Cost model: centre operations & one-time" · "Model settings" (horizon, first year, attrition
backfill %, escalation modes, "Fill empty inputs from industry reference", "Reset model to reference") · then the
existing tracking tabs (budget by workstream, monthly actuals & forecast, commitments & POs, approvals, milestones,
benefits, scenarios, settings) unchanged. Every grid: inline-editable, writes straight to collections (`'costModel'`
single record or a few small collections – your choice, document it).

## Output view (`mode === 'output'`) – keep the page header, KPI tiles and tab strip; tabs become:
**Financial Overview** (existing, unchanged) · **Cost Model** (new; sub-tabs: Summary · By business unit · Cost
breakdown · Annual view · Per-FTE view · Cash flow · Scenarios · Sensitivity · Model checks) · then the existing tabs
(Budget Breakdown, Actuals & Forecast, Cost by Workstream, Cost by Category, Benefits Tracking, Scenario Analysis,
Approvals & Commitments). On Financial Overview add one card "Modelled run-rate vs tracked budget" linking to Cost Model.
"By business unit" = unit cards (Y5 headcount, Y5 run-rate, cost/FTE, share of program) + dropdown → deep dive (headcount
ramp & pyramid, fully loaded cost per FTE by band, cost by category × year, composition, per-FTE trend, its sensitivity,
link to Resource Management allocation for that unit). All other sub-tabs carry a business-unit filter (All / unit).
Wording: "business unit", "cost model", "run-rate", "fully loaded cost per FTE", "industry reference" (not "industry
average"), "model checks". Money through `useMoney()` (₹ Cr / € M; per-FTE in ₹ L / € K). Charts with
`isAnimationActive={false}`.

## Seed
Fully filled model so the demo is rich: headcount from the business-unit FTE plan (320 → 450), mix 20/35/25/15/5,
compensation at reference with SAP & Microsoft practices +10 % and shared services −10 %, managed office in Pune,
technology/centre ops at reference, one-time filled. Keep the existing tracking seeds (₹ 4.0 Cr setup budget etc.) –
label the two clearly: "Setup program budget (tracking)" vs "GCC run-rate cost model".

Type-check (`npx tsc --noEmit -p tsconfig.app.json`); verify with puppeteer (sign in: clear localStorage, `#/login`,
`input[placeholder="Your name"]`, `button[type=submit]`; toggle views via the header buttons "Input view"/"Output view")
in both views, every model tab/sub-tab, By business unit with a unit selected, scenarios compare, sensitivity, INR and
EUR; zero console errors; no overflow at 1536px. Report what you built, the engine formulas, seed totals (5-year total,
Y5 run-rate, Y5 cost/FTE, people-cost share), and deviations.
