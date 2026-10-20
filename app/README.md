# GCC Command Center – FutureFactor360 demo

A program-management control tower for a Global Capability Centre (GCC) setup. Built as a static
single-page app (React 19, Vite, TypeScript, Tailwind v4, Recharts, Zustand). All demo data lives in the
browser (localStorage) so a program manager can add and edit records and see every dashboard update.

## Run locally

```bash
cd app
npm install
npm run dev        # http://localhost:5173 (or the port Vite prints)
```

## Build for hosting (GitHub Pages, Netlify, S3…)

```bash
npm run build      # outputs app/dist – a static folder, hash-routed, base './'
npm run preview    # serve the production build locally
```

## Where things are

| Path | What |
|---|---|
| `src/pages/*` | One file per sidebar module (Dashboard, Strategy, Planning, Workstreams, Resources, Financial, Transition, Risks, Governance, Value Realization, Portfolio, Reports, Documents, Integrations, Settings) |
| `src/data/common.ts` | Workstreams, owners, locations, phases, colours, formatters |
| `src/data/shared.ts` | Seed data shared across pages: milestones, RAID register, program KPIs, workstream summaries, dependencies |
| `src/data/wbs.ts` | Master GCC activity library (16 WBS workstreams → 52 sub-workstreams → 449 activities) with the full tracking-field schema |
| `src/data/<page>.ts` | Page-specific seed data and types |
| `src/store/useStore.ts` | Persisted collection store (`useCollection(name, seed)`) |
| `src/components/ui` | Cards, KPI tiles, tabs, badges, tables, modals, form fields |
| `src/components/charts` | Donut, bar list, tooltip style |
| `src/components/layout/AppShell.tsx` | Sidebar, top bar, page header, GCC assistant |
| `BRIEF.md` | Conventions used to build each page |

The reference mock-ups are in `../mockups`, and the requirements text is in
`../GCC Control Tower - Requirements Reference.docx`.

Use **Reset demo data** in the page footer (or Settings → Data & Reset) to return to the seeded baseline.
