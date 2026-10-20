# Currency conversion brief (INR ⇄ EUR)

The top bar now has a currency toggle (₹ INR | € EUR). Every monetary value in the app must honour it.
Data stays STORED in ₹ Cr (and ₹ Lakh for a few payroll/activity fields). Only rendering converts.

## API – `import { useMoney } from '../data/money'` (adjust the relative path)
```ts
const m = useMoney()
m.fmt(4.0)        // "₹ 4.0 Cr"  | "€ 0.43 M"      – KPI tiles, stat values, tooltips, text
m.num(4.0)        // "4.0"       | "0.43"          – table cells, bar/point labels, axis-ready numbers (+m.num(x) for numbers)
m.signed(-0.2)    // "-0.2"      | "-0.02"         – variances
m.unitLabel       // "₹ Cr"      | "€ M"           – card titles: title={`Budget vs Actual (${m.unitLabel})`}
m.unit            // "Cr"        | "M"
m.symbol          // "₹"         | "€"
m.toDisplay(cr)   // number in display units (for chart data: map every Cr field through this)
m.toBase(x)       // display number -> ₹ Cr (for form inputs on save)
m.inputValue(cr)  // rounded display number for <Input value=...>
m.fmtLakh(12)     // "₹ 12.0 L"  | "€ 13.0 K"      – Lakh fields; m.lakhUnitLabel = "₹ L" | "€ K"
m.digits          // 1 | 2
```
Pure (non-hook) helpers also exist in `src/data/money.ts`: `formatMoney(cr, currency, rate)`, `numMoney`, `toDisplay`, `toBase`, `formatLakh`. Use them inside helper functions by passing `m.currency, m.rate`.

## Rules
1. Grep your files for `₹`, `Cr`, `fmtCr`, `Lakh`, ` L` and fix EVERY occurrence: card titles, axis labels, tooltips, table headers/cells, KPI tiles, legends, stat lines, badges, text sentences, select options, CSV export headers, printed reports, modal labels.
2. Chart data: convert the numeric series with `m.toDisplay()` (memoised with `m.currency`/`m.rate` in deps) so axes and labels are in the display unit; tooltips/labels then use `m.num` or `m.fmt`.
3. Forms: inputs show `m.inputValue(cr)` and save `m.toBase(parsed)`; label `(${m.unitLabel})` / `(${m.lakhUnitLabel})`.
4. Numbers passed through `fmtCr` from `data/common.ts` must be replaced (it is INR-only).
5. Seed/data files: do not convert stored values; only change hard-coded display strings there (e.g. descriptions like "₹ 0.08 Cr impact" should be generated at render time instead, or left as plain text if purely narrative).
6. When the toggle is on EUR the strings "₹" and "Cr" must not appear anywhere on your pages (except narrative seed text you could not reasonably move). Verify by screenshotting your page in EUR: switch with `await page.evaluate(() => [...document.querySelectorAll('header button')].find(b => b.textContent.includes('EUR')).click())` after signing in, then search `document.body.innerText` for "₹" and "Cr".
7. Type-check with `npx tsc --noEmit -p tsconfig.app.json`. Only edit the files assigned to you. Do not touch `src/data/money.ts`, the store, AppShell, Dashboard, ProgramKpiEditor or `src/data/common.ts`.

## Screenshot helper
Dev server: http://localhost:5180 (hash routes). You must sign in first (localStorage cleared → `#/login`): type a name into `input[placeholder="Your name"]`, click `button[type=submit]`. See `/private/tmp/claude-501/-Users-tejussankar-Development-Work-GCC-Control-Tower/952e3c3f-de9d-4f22-8a9b-72d5963e695e/scratchpad/flow.cjs` for a puppeteer-core example (executablePath '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'). Keep screenshots in that scratchpad directory.
