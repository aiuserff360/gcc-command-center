# GCC Control Tower – GCC Command Center demo

FutureFactor360 demo of a program-management control tower for a Global Capability Centre (GCC) setup.

- `app/` – the web application (React + Vite + TypeScript). See `app/README.md` for how to run and build.
- `mockups/` – the eight reference screen designs.
- The master activity library (16 workstreams, 449 activities) that the demo is built from lives in `app/src/data/wbs.ts`.
- `.github/workflows/deploy.yml` – publishes the app to GitHub Pages on every push to `main`.

Open the app, sign in with any name, pick a GCC program (India, Poland or Philippines) and explore. Demo data is stored in the browser; use **Reset demo data** in the footer to restore the baseline.
