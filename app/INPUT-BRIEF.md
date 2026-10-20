# Input / Output views – brief for module builders

The top bar now has an **Input view | Output view** toggle (`useStore((s) => s.mode)` → `'input' | 'output'`,
`setMode`). Output view = the dashboards that exist today. Input view = the data-entry side of the same module:
every record that drives the dashboards must be enterable here (add / edit / remove, inline grids or tables with
forms). After sign-in the app starts in Input view on the Dashboard ("GCC Setup").

## Contract for a page
```tsx
import { useStore } from '../store/useStore'
import { InputLayout } from '../components/layout/InputLayout'   // header + tab strip + "See the Output view" button
...
const mode = useStore((s) => s.mode)
if (mode === 'input') return <InputLayout title="<Module>" subtitle="…" tabs={[{ name: 'Tab', content: <…/>, hint?: '…' }, …]} />
// else: existing output page unchanged
```
- Tabs in Input view should be the module's registers/forms WITHOUT the KPI tiles and charts. Reuse the existing
  register components where they already support add/edit (most "View"/"Tab" components do); otherwise build
  inline-editable grids (pattern: `src/components/footprint/BusinessUnits.tsx` → `BusinessUnitGrid`, and
  `src/components/setup/GccSetup.tsx`). Inline edits write straight to the collection via `update`.
- Keep wording consistent: **business unit** (not function / service line / workstream) for SAP Practice,
  Microsoft Practice, Data & AI Practice, R&D – Product Engineering, R&D – Platform & Cloud, Finance Shared
  Services, HR Shared Services. The list lives in `src/data/businessUnits.ts` (`'businessUnits'` collection,
  `useBusinessUnits()` in `src/components/footprint/BusinessUnits.tsx`). Workstreams (Talent & Hiring, Technology
  & Infrastructure, …) stay "workstreams".
- Location: the India program is now Pune-based (`programDef('GCC Program - India').city === 'Pune'`,
  `LOCATIONS[0]`-style defaults should be Pune). Keep other cities only where a second location is meaningful.
- Money: use `useMoney()` from `src/data/money.ts` (see CURRENCY-BRIEF.md). Dates: ISO strings, `fmtDate`.
- Type-check with `npx tsc --noEmit -p tsconfig.app.json`. Only edit the files assigned to you.
- Verify with puppeteer-core (see `/private/tmp/claude-501/-Users-tejussankar-Development-Work-GCC-Control-Tower/952e3c3f-de9d-4f22-8a9b-72d5963e695e/scratchpad/flow.cjs` for the pattern; Chrome at
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; dev server http://localhost:5180, hash routes).
  Sign in first: clear localStorage, go to `#/login`, type into `input[placeholder="Your name"]`, click
  `button[type=submit]`. Toggle views with
  `[...document.querySelectorAll('header button')].find(b => b.textContent.includes('Input view')).click()`
  (or 'Output view'). Screenshot both views of your page(s) into that scratchpad directory, read them, fix
  layout problems, and make sure there are zero console errors.
