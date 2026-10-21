# Real-browser integration tests IT-01..IT-05

Playwright drives the real Statify app (Next.js, `npm run dev`) in Google Chrome (`channel: 'chrome'`).
Everything goes through the UI: File > Import Data > CSV Data, Transform > String to Word Vector,
Analyze > Classify > Naive Bayes / Apply Model, the Output Viewer "Export Model" button and File > Export > CSV Data.
No data is injected into IndexedDB or the stores. Configuration K1 = the default String to Word Vector / Naive Bayes
Text Preprocessing settings (raw counts, no IDF, no normalization, Words to Keep 1000) + Multinomial, alpha 1, seed 42.

## Run

```powershell
cd frontend
npm run dev                       # separate terminal; app on http://localhost:3000
npx playwright test --config components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/integration/browser/playwright.config.ts
```

Options: `$env:HEADED = "1"` to watch the browser, `$env:STATIFY_URL = "http://localhost:3001"` for another URL.
Runtime is about 3 to 5 minutes.

## Files

| Path | Content |
|---|---|
| `it_browser.spec.ts` | One test that runs IT-01..IT-05 in order; each scenario is wrapped so a UI error is recorded and the next scenario still runs. |
| `helpers.ts` | UI helpers (menus, CSV import/export, NB and Apply Model dialogs, Output Viewer readers). |
| `playwright.config.ts` | Chrome channel, 1 worker, tracing off. |
| `downloads/` | Files downloaded by the app: `F_K1.json` (raw-text model), `IT01_wordvector_model.json`, dataset CSV exports with the `NB_` columns. |
| `screenshots/` | One or more screenshots per scenario. |
| `logs/run_<time>.txt` | Log of each run; the latest run is also written to `../../logs/integration_browser_win.txt`. |

Reference values come from `integration/it_util.mjs` (headless wasm, used for the IT-03 full-precision scores and the
IT-02 model comparison), `accuracy/out/sklearn_results.json`, `pred_sklearn_K1.csv` and `pred_statify_K1.csv`.

## Notes on workarounds

- Tracing is off. With Playwright tracing on, the data page never rendered its grid and the menus did not respond.
- The data page sometimes loads without a data grid; the menus do not respond, and no console error or warning is
  logged. The test waits 45 s, takes a screenshot (`*_load_attemptN.png`) and reloads the page, up to 5 times. Each
  incident is logged on the line `page-load incidents`.
- In IT-04 the test returns to the data page by clicking the bottom "Data" button. In one run, a full `page.goto`
  from the Output Viewer left the page without a data grid.
