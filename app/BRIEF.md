# GCC Command Center demo – page builder brief

You are building ONE page of a React + Vite + TypeScript + Tailwind v4 + Recharts demo of the
"GCC Command Center" program-management tool for FutureFactor360. The app shell, routing, store, shared
components and Dashboard already exist. Your job is to make your page match its mock-up image as closely
as possible AND make it a working tool (every tab functional, add/edit/delete forms for its records).

## Golden rules
1. **Wording fidelity.** Use the exact card titles, tab names, column headers, KPI labels, legend labels,
   row values and numbers that appear in the mock-up image. Do not paraphrase. Read the mock-up image
   with the Read tool first and transcribe it carefully (zoom mentally; it is 1536×1024).
2. **Every tab must do something real.** The mock-up only shows the first tab. For the other tabs design a
   sensible, in-depth view consistent with the page (tables, charts, forms). Each tab should have at least
   one table or chart and, where records are involved, an "Add …" button opening a Modal form.
3. **Input side + output side.** Records live in the persisted store via `useCollection(name, seed)`.
   Edits must immediately update the KPIs/charts/tables that derive from them. Provide Add / Edit (click a row)
   / Delete for your page's main entities. KPIs should be computed from the data where natural; when a
   mock-up number cannot be derived, store it in a single settings record and make it editable.
4. **Only touch your own files**: `src/pages/<YourPage>.tsx` (replace the placeholder), optionally
   `src/data/<yourpage>.ts` for seed data/types and `src/components/<yourpage>/*.tsx` for sub-components.
   Do NOT edit `src/components/ui`, `src/components/charts`, `src/components/layout`, `src/data/common.ts`,
   `src/data/shared.ts`, `src/data/wbs.ts`, `src/index.css`, `src/App.tsx` or the store. If you need a helper
   that doesn't exist, write it inside your own files.
5. Type-check with `npx tsc --noEmit -p tsconfig.app.json` (NOT `tsc -b`) and fix all errors. Lint is not required.
6. Dev server is already running at http://localhost:5180 (hash router: `http://localhost:5180/#/<route>`).
   Screenshot with: `node /private/tmp/claude-501/-Users-tejussankar-Development-Work-GCC-Control-Tower/952e3c3f-de9d-4f22-8a9b-72d5963e695e/scratchpad/shot.cjs "<url>" <out.png> 1 "Tab name|Other tab"` (the 4th arg clicks
   buttons by exact text before capturing; 3rd arg 1 = full page). Then Read the PNG and compare with the mock-up.
   Fix layout problems (overflow, overlapping labels, wrapped KPI text, empty charts) before finishing.
   Put screenshots in the scratchpad directory above, not in the repo.
7. Light theme only, desktop layout (≈1300px content width). Keep the mock-up's 5-6 KPI tiles in one row.

## Shared building blocks (import from '../components/ui', '../components/charts', '../components/layout/AppShell')
- `PageHeader({ title, subtitle, viewLabel?, viewValue?, viewOptions?, onView?, dateRange?, right? })` – page title row with
  "View by" select, Phase select and date-range picker (already styled like the mock-ups).
- `Card({ title, subtitle, action, headerRight, className })`, `ViewAll({ onClick, label })`
- `KpiTile({ icon, value, label, sub, tone, trend, ring })` – tone: green|blue|violet|red|amber|teal|orange|navy; `ring` renders a % ring instead of an icon.
- `Tabs({ tabs, active, onChange, size })`, `Badge({ value })` (knows On Track / At Risk / Delayed / Pending / Not Started / Completed / In Progress / Open / Critical / High / Medium / Low / Resolved / Closed / Overdue …),
  `Progress({ value, color, height })`, `Ring({ value, size, stroke, color, label })`,
  `Table<T>({ columns, rows, onRowClick, compact })` with `Column<T> = { key, header, render?, className?, width? }`,
  `Modal({ open, onClose, title, children, footer, width })`, `Field`, `Input`, `TextArea`, `Select({ options })`, `FormGrid({ cols })`,
  `Legend({ items: [{label,color,dashed?}] })`, `FilterSelect`, `Stat`, `SectionTitle`, `ConfirmDelete({ onConfirm })`, `Chevron`, `EmptyNote`.
- Charts: `Donut({ data:[{name,value,color}], size, inner, center })`, `BarList({ rows:[{label,value,color,right}], max, labelWidth })`, `tooltipStyle` (spread into Recharts `<Tooltip {...tooltipStyle} />`).
  Use Recharts directly for bar/line/area/composed charts. Colors in `CHART_COLORS` / `SERIES` from '../data/common'.
  Always wrap Recharts in a fixed-height div + `<ResponsiveContainer>`. Add `LabelList` value labels where the mock-up shows numbers on bars/points.
- CSS classes: `card`, `card-title`, `link`, `btn-primary`, `btn-secondary`, `btn-danger`, `input`, `label`, `th`, `td`.
- Icons: lucide-react.

## Store
```ts
import { useCollection, uid } from '../store/useStore'
const { items, add, update, remove, setAll } = useCollection<MyType>('myCollection', seedMyType) // persisted in localStorage
```
Records need a string `id` (use `uid('prefix')`). `useStore((s) => s.phase)` gives the selected lifecycle phase.

## Shared collections already seeded (src/data/shared.ts) – reuse these, do not duplicate their data
- `'milestones'` → `Milestone { id, name, workstream, dueDate, status, owner, phase, startDate?, progress?, critical? }` (42 rows; the mock-up rows are included).
- `'raid'` → `RaidItem { id, code, type:'Risk'|'Issue', title, shortTitle?, workstream, category, level, status, owner, dueDate, openedOn, likelihood, impact, impactScore, description?, mitigation?, escalated?, escalationStatus?, keyRisk? }` + helpers `isOpen(r)`, `daysOpen(r)`, `RISK_CATEGORIES`, `LIKELIHOOD`, `IMPACT_SCALE`.
- `'programKpis'` → single `ProgramKpis` record (program completion, budget, go-live target, readiness scores…).
- `'workstreamSummaries'` → 7 `WorkstreamSummary` rows (name, description, progress, status, owner, lead, executiveSponsor, teamSize, activeInitiatives, scheduleHealth, budgetHealth, approvedBudgetCr, actualSpendCr, forecastAtCompletionCr).
- `'dependencies'` → 58 `Dependency { id, from, on, type, description, impact, status, dueDate, owner }`.
- `src/data/wbs.ts` → `WBS` (16 WBS workstreams → sub-workstreams → activities) and `seedActivities` (449 `Activity` rows with the full tracking-field schema: baseline/forecast/actual dates, status, percentComplete, rag, predecessor/successor, criticalPath, budget/commitment/actual/forecast, deliverable, acceptanceCriteria, evidence, signOff). Collection name: `'activities'`.
- `src/data/common.ts` → `WORKSTREAMS` (the 7 dashboard workstreams), `WORKSTREAM_META`, `OWNERS`, `LOCATIONS`, `PHASES`, `MONTHS`, `fmtCr`, `fmtDate` ("23 Oct 2026"), `fmtDateShort` ("23 Oct 26"), `CHART_COLORS`, `SERIES`, `TODAY`.

## Visual language (from the mock-ups)
Sidebar navy #0B2240, primary blue #1E5BBE, light blue #5B9BF0, teal #14B8A6, green #16A34A, amber #F59E0B, red #DC2626, violet #8B5CF6.
Cards white with 1px #E3E8F0 border, 12px radius, 16px padding, title 15px semibold. Body text 13px, muted 12px #6B7280.
Status pills: green/amber/red/blue/grey as in `Badge`. Page background #F3F6FB.
Look at `src/pages/Dashboard.tsx` for a complete worked example of layout, KPI tiles, tables, charts and an edit Modal.
