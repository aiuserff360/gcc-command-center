# ENGIE IT GCC realignment – brief for module builders (22 Oct 2026)

The demo is now the **ENGIE IT GCC, Pune** (ENGIE: Euro/French-headquartered energy company setting up an IT GCC).
Read `../ENGIE IT GCC - Organisation Structure.md` and look at `../mockups/09-engie-it-gcc-target-footprint.png`
(the client's footprint slide – wording and layout to align with). Programs are now "ENGIE IT GCC - Pune" (default),
"ENGIE IT GCC - Kraków", "ENGIE IT GCC - Manila".

## The new organisation model – `src/data/businessUnits.ts` (already rewritten, do not edit)
- `'businessUnits'`: the **7 IT domains** (Infrastructure & Cloud, Digital Workplace, Cybersecurity & IAM, Enterprise
  Applications, Data, Analytics & AI, Integration & Engineering, IT Service Management) – `BusinessUnit { id, name,
  kind:'IT Domain', wave, owner, status, description, y1..y5 (derived from sub-units), icon }`.
- `'subUnits'`: the **capabilities / services** under each domain (4 each, 28 total) – `SubUnit { id, businessUnitId,
  name, gbuServed, geography, countryEntity, deliveryLocation, currentHc, targetHc, roleSkill, transitionType, wave,
  ramp[12] (cumulative Pune HC per month of year 1 from RAMP_START = Nov 2026; RAMP_MONTHS labels), y2..y5, status }`.
- Helpers: `rollUpUnits(units, subs)`, `subUnitsOf(subs, buId)`, `subY1`, `programRamp(subs)`, `unitRamp(subs, buId)`,
  `buShortName`, constants `GEOGRAPHIES`, `GBUS`, `TRANSITION_TYPES`, `DELIVERY_LOCATIONS`, `BU_WAVES` (1–5).
- Seed: 400 Pune HC by Apr 2027 (month 6 of the ramp), ramp 20/83/183/285/366/400 then flat; Y2..Y5 425/454/477/494;
  current (source) HC 213; domains Y1: Infra 107 · Workplace 40 · Cyber 36 · Apps 107 · Data 53 · Integration 26 · ITSM 31.
- **Headcount rule**: month-wise only for year 1 (the 12 `ramp` months); years 2+ are annual targets. Domain y1..y5 are
  always derived from sub-units – read units through `useBusinessUnits()` which must return rolled-up values
  (`src/components/footprint/BusinessUnits.tsx` – builder A updates it; others should call
  `rollUpUnits(units.items, subs.items)` themselves if they read `'subUnits'`).
- **Reporting date**: `TODAY` in `src/data/common.ts` is now **2027-02-22** (4 months into the ramp); every seeded
  date in `src/data/*` was shifted +4 months. Plan to date = ramp month 4 (Feb 27) = 285; seed actual onboarded ≈ 268.
  Waves: W1 Nov–Dec 2026 (done/stabilising), W2 Jan–Feb 2027 (in progress), W3 Mar 2027 (starting), W4 Apr 2027 (not started).

## General rules (unchanged)
- Input view | Output view toggle (`INPUT-BRIEF.md`), business-unit cards + dropdown → deep dive pattern, money via
  `useMoney()` (`CURRENCY-BRIEF.md`), inline grids (`src/components/ui/InlineGrid.tsx`), wording "business unit" for the
  domains and "capability" (or "sub-unit") for the services under them; "GBU served", "geography", "country / entity",
  "current delivery location", "role / skill", "transition type", "wave" exactly as on the slide.
- Replace every reference to the old units (SAP Practice, Microsoft Practice, Data & AI Practice, R&D – Product
  Engineering, R&D – Platform & Cloud, Finance Shared Services, HR Shared Services) in the files you own; re-seed with
  ENGIE-realistic content (roles from the slide: Cloud Engineers, Network Engineers, IAM Specialists, SAP Functional /
  Technical, App Support Engineers, Data Engineers, Workplace Engineers, Service Managers, Integration Engineers,
  DevOps Engineers; GBUs: Group / GBS / Shared IT, Networks, Renewables & Flexible Power, Local Energy Infrastructure,
  Supply & Energy Management; geographies Global / Multi-region, Europe, Americas, AMEA / APAC; source locations
  Europe, France, USA, Belgium, Netherlands).
- Type-check with `npx tsc --noEmit -p tsconfig.app.json`; verify with puppeteer-core (Chrome at
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', dev server http://localhost:5180, sign in: clear
  localStorage → `#/login` → `input[placeholder="Your name"]` → `button[type=submit]`; toggle views with the header
  buttons "Input view" / "Output view"); zero console errors, no overflow at 1536px. Report what you built.
