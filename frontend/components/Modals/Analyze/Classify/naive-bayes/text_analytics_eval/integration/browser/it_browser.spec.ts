/**
 * it_browser.spec.ts - IT-01..IT-05 through the REAL Statify UI (Next.js app) in Google Chrome (channel 'chrome').
 *
 * Every step uses the UI as a user would: File > Import Data > CSV Data, Transform > String to Word Vector,
 * Analyze > Classify > Naive Bayes / Apply Model, Output Viewer "Export Model", File > Export > CSV Data.
 * Values are read back from the Output Viewer (tables) and from files downloaded by the app; nothing is injected.
 * Expected values: logs/integration_it0N_win.txt (headless wasm), accuracy/out/sklearn_results.json and
 * pred_sklearn_K1.csv (scikit-learn K1). Configuration K1 = String to Word Vector / NB Text Preprocessing defaults
 * (lowercase, word tokenizer, raw counts, no IDF, no normalization, Words to Keep 1000) + Multinomial, alpha 1, seed 42.
 */
import { test, expect, chromium, Page, Browser } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  HERE, EVAL_DIR, DATA, DIRS, log, logLines, check, CHECKS, shot, panel, menu, importCsv, exportDatasetCsv, openNaiveBayes, nbMove,
  nbZoneCount, nbSetSeed, nbAssertK1, stwvOptionState, isK1, exportModel, viewerCell, openApplyModel, amUploadModel, amModelSummary,
  amRun, amReadMetrics, readCsvFile, col,
} from './helpers';

const LEAK = 'The vocabulary and IDF of these vector columns were computed outside Naive Bayes on all rows, so evaluation results may be slightly optimistic.';
const ENV: Record<string, string> = {};
const SHARED: { modelFile?: string; model?: any; summaryIT02?: Record<string, string>; it04Csv?: string; it04Metrics?: any } = {};
let U: any; // integration/it_util.mjs (headless wasm reference helpers)

test.beforeAll(async ({ browser, baseURL }) => {
  U = await import(pathToFileURL(path.join(EVAL_DIR, 'integration', 'it_util.mjs')).href);
  ENV.chrome = `${browser.browserType().name()} channel=chrome version=${browser.version()}`;
  ENV.url = String(baseURL);
  ENV.os = `${os.type()} ${os.release()} ${os.arch()}; ${os.cpus()[0]?.model?.trim()} x${os.cpus().length}`;
  ENV.node = process.version;
  ENV.headless = process.env.HEADED === '1' ? 'headed' : 'headless';
  log(`Chrome: ${ENV.chrome}; app URL: ${ENV.url}; ${ENV.headless}; OS: ${ENV.os}; Node ${ENV.node}`);
});

test.afterAll(async () => {
  const scen = ['IT-01', 'IT-02', 'IT-03', 'IT-04', 'IT-05'];
  const lines: string[] = [];
  lines.push('# Statify real-browser integration tests IT-01..IT-05 (Playwright + Google Chrome)');
  lines.push(`date=${new Date().toISOString()}`);
  lines.push(`chrome=${ENV.chrome}`);
  lines.push(`app_url=${ENV.url} (npm run dev, Next.js dev server)`);
  lines.push(`mode=${ENV.headless}; os=${ENV.os}; node=${ENV.node}; playwright=@playwright/test ${require('@playwright/test/package.json').version}`);
  lines.push('config=K1 (STWV/NB Text Preprocessing defaults: lowercase, word tokenizer, raw count TF, IDF none, normalization none, Words to Keep 1000, min TF 1; Multinomial, text alpha 1; holdout 70/30 seed 42)');
  lines.push('spec=frontend/components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/integration/browser/it_browser.spec.ts');
  lines.push('');
  for (const s of scen) {
    const cs = CHECKS.filter((c) => c.scenario === s);
    const st = cs.length === 0 ? 'NOT RUN' : cs.every((c) => c.pass) ? 'PASS' : 'FAIL';
    lines.push(`${s}: ${st} (${cs.filter((c) => c.pass).length}/${cs.length} checks)`);
  }
  lines.push(`page-load incidents (data grid not rendered, page reloaded): ${LOAD_INCIDENTS.length ? LOAD_INCIDENTS.join('; ') : 'none'}`);
  lines.push('');
  lines.push('## Checks');
  for (const c of CHECKS) lines.push(`${c.pass ? 'PASS' : 'FAIL'}  ${c.scenario}  ${c.name}${c.detail ? '  :: ' + c.detail : ''}`);
  lines.push('');
  lines.push('## Full log');
  lines.push(...logLines());
  const txt = lines.join('\n') + '\n';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  fs.writeFileSync(path.join(DIRS.logs, `run_${stamp}.txt`), txt, 'utf8');
  fs.writeFileSync(path.join(EVAL_DIR, 'logs', 'integration_browser_win.txt'), txt, 'utf8');
});

/** Opens /dashboard/data and waits until the Data Editor grid is rendered. Observed in this environment: the page
 * sometimes stays without a data grid (menus inert) after a full load; in that case the page is reloaded (max 4x)
 * and the incident is logged (UI workaround, see README). */
const LOAD_INCIDENTS: string[] = [];
async function newDataPage(page: Page, label = '') {
  const msgs: string[] = [];
  const onMsg = (m: any) => { if (['error', 'warning'].includes(m.type())) msgs.push(`${m.type()}: ${m.text().slice(0, 160)}`); };
  page.on('console', onMsg);
  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const t0 = Date.now();
      if (attempt === 1) await page.goto('/dashboard/data'); else await page.reload();
      await expect(page.getByRole('menuitem', { name: 'File', exact: true })).toBeVisible();
      try {
        await page.getByRole('treegrid').first().waitFor({ state: 'visible', timeout: 45_000 });
        log(`${label} /dashboard/data ready (data grid rendered) after ${((Date.now() - t0) / 1000).toFixed(1)} s, attempt ${attempt}`);
        if (attempt > 1) LOAD_INCIDENTS.push(`${label}: data grid appeared only after reload #${attempt - 1}`);
        return;
      } catch {
        const m = `${label} attempt ${attempt}: no data grid 45 s after load (menus inert); console: ${msgs.slice(-4).join(' || ') || '(no errors/warnings)'}`;
        log(`LOAD-ISSUE ${m}`);
        await shot(page, `${label.replace('-', '')}_load_attempt${attempt}`).catch(() => {});
        msgs.length = 0;
      }
    }
    throw new Error(`${label}: Statify data page never rendered its data grid after 5 loads`);
  } finally {
    page.off('console', onMsg);
  }
}

// =====================================================================================================
async function it01(page: Page) {
  const S = 'IT-01';
  await newDataPage(page, 'IT-01');
  await importCsv(page, DATA.train);

  await menu(page, 'Transform', 'String to Word Vector');
  const P = panel(page);
  await expect(P.getByRole('heading', { name: 'String To Word Vector' })).toBeVisible();
  await P.getByText('Text Tweet', { exact: true }).click();
  await P.getByRole('tabpanel').getByRole('button').first().click(); // arrow: move to Target Variable
  await P.getByRole('tab', { name: 'Options' }).click();
  const st = await stwvOptionState(P);
  const prefix = await P.getByRole('textbox').first().inputValue().catch(() => '');
  check(S, 'STWV Options = K1 defaults (prefix VEC_)', isK1(st), JSON.stringify({ ...st, prefix: prefix || '(placeholder VEC_)' }));
  await shot(page, 'IT01_1_stwv_options');
  await P.getByRole('button', { name: 'OK' }).click();
  const toast = page.getByText(/vector columns? (was|were) added to the dataset/i).first();
  await toast.waitFor({ timeout: 600_000 });
  const toastText = (await toast.textContent()) ?? '';
  const nVec = Number((toastText.match(/(\d+) vector columns/) ?? [])[1] ?? 0);
  check(S, 'STWV adds 1000 vector columns (toast)', nVec === 1000, toastText.trim());
  await shot(page, 'IT01_2_stwv_done');

  await openNaiveBayes(page);
  await page.getByTestId('nb-variable-filter').fill('VEC_');
  await expect(page.getByTestId('nb-available-count')).toContainText('shown');
  const shownTxt = (await page.getByTestId('nb-available-count').innerText()).trim();
  const shown = Number((shownTxt.match(/(\d+) shown/) ?? [])[1]);
  check(S, 'NB filter "VEC_" lists 999 of the 1000 STWV columns (known F-01: column "VEC" from token "&")', shown === 999, shownTxt);
  await page.getByTestId('nb-select-all-filtered').click();
  await page.getByTestId('nb-move-to-wordVector').click();
  const warn = (await page.getByTestId('nb-text-warnings').innerText()).replace(/\s+/g, ' ');
  check(S, 'Leakage warning (W-LEAK) shown under Text Features after moving VEC_ columns', warn.includes(LEAK), warn.slice(0, 220));
  await shot(page, 'IT01_3_nb_wordvector_warning');
  await page.getByTestId('nb-variable-filter').fill('');
  await nbMove(page, ['VEC'], 'wordVector');
  const nWv = await nbZoneCount(page, 'wordVector');
  check(S, 'Word-Vector Variables zone holds all 1000 vector columns (999 filtered + VEC)', nWv === 1000, `zone items=${nWv}`);
  const zoneNames = (await page.getByTestId('nb-zone-list-wordVector').locator('[data-testid^="nb-zone-item-wordVector-"]').evaluateAll(
    (els) => els.map((e) => (e.getAttribute('data-testid') ?? '').replace('nb-zone-item-wordVector-', '')))).sort();
  await nbMove(page, ['Sentiment'], 'target');
  await nbMove(page, ['Id', 'Pasangan Calon', 'Text Tweet'], 'excluded');
  await nbAssertK1(page, S, false);
  await nbSetSeed(page, 42);
  await panel(page).getByRole('button', { name: 'OK' }).click();
  await page.waitForURL(/\/dashboard\/result/, { timeout: 300_000 });
  await expect(page.getByRole('button', { name: 'Export Model', exact: true })).toBeVisible({ timeout: 300_000 });

  const tf = await viewerCell(page, 'Text features');
  check(S, 'Case Processing Summary "Text features" = "Word vectors: 1000 columns"', tf === 'Word vectors: 1000 columns', tf);
  const note = await viewerCell(page, 'Note');
  check(S, 'Case Processing Summary "Note" row = leakage note', note === LEAK, note);
  const acc = await viewerCell(page, 'Overall Accuracy');
  check(S, 'NB holdout accuracy (Word-Vector) = 0.670 (headless log: 0.6702127659574468)', Number(acc).toFixed(3) === '0.670', acc);
  await page.getByRole('rowheader', { name: 'Note', exact: true }).last().scrollIntoViewIfNeeded();
  await shot(page, 'IT01_4_output_note');

  const f = await exportModel(page, 'IT01_wordvector_model.json');
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  const terms = m.text?.terms?.length, cols = m.text?.columns?.length;
  const lw = Object.fromEntries(Object.entries(m.text?.log_weights ?? {}).map(([k, v]: any) => [k, v.length]));
  check(S, 'Exported model: text.source="vector", term count = 1000 = number of VEC_ columns used', m.text?.source === 'vector' && terms === 1000 && cols === 1000,
    `source=${m.text?.source}, terms=${terms}, columns=${cols}, log_weights=${JSON.stringify(lw)}, recipe=${m.text?.recipe ? 'present' : 'absent'}`);
  // For the Word-Vector path the model terms are the dataset column names: they must be exactly the columns moved in the UI.
  const mc = [...m.text.columns].sort();
  check(S, 'Model text.columns/terms == the 1000 columns placed in Word-Vector Variables (same names)', JSON.stringify(mc) === JSON.stringify(zoneNames) && JSON.stringify(m.text.terms) === JSON.stringify(m.text.columns),
    `zone=${zoneNames.length}, model columns=${mc.length}, unique=${new Set(mc).size}`);
  const train = U.readCsv(U.PIL.train);
  const docs = train.rows.map((r: string[]) => r[train.header.indexOf('Text Tweet')] ?? '');
  const ref = await U.stwvTransform(docs, U.toRustConfig(U.KONFIGURASI.K1.stwv));
  check(S, 'Number of model terms == headless STWV vocabulary size (K1)', m.text.terms.length === ref.vocabulary.length, `${m.text.terms.length} vs ${ref.vocabulary.length}`);
}

// =====================================================================================================
  async function it02(page: Page) {
    const S = 'IT-02';
    await newDataPage(page, 'IT-02');
    await importCsv(page, DATA.train);
    await openNaiveBayes(page);
    await nbMove(page, ['Sentiment'], 'target');
    await nbMove(page, ['Id', 'Pasangan Calon'], 'excluded');
    await nbMove(page, ['Text Tweet'], 'rawText');
    await nbAssertK1(page, S, true);
    await nbSetSeed(page, 42);
    await shot(page, 'IT02_1_nb_validation');
    await panel(page).getByRole('button', { name: 'OK' }).click();
    await page.waitForURL(/\/dashboard\/result/, { timeout: 300_000 });
    await expect(page.getByRole('button', { name: 'Export Model', exact: true })).toBeVisible({ timeout: 300_000 });
    const tf = await viewerCell(page, 'Text features');
    const acc = await viewerCell(page, 'Overall Accuracy');
    log(`NB (raw text) Output Viewer: Text features="${tf}", holdout Overall Accuracy=${acc}`);
    check(S, 'NB raw-text holdout accuracy = 0.697 (headless log: 0.6968085106382979)', Number(acc).toFixed(3) === '0.697', acc);
    const file = await exportModel(page, 'F_K1.json');
    await shot(page, 'IT02_2_export_model');
    const model = JSON.parse(fs.readFileSync(file, 'utf8'));
    SHARED.modelFile = file; SHARED.model = model;
    check(S, 'Downloaded file = JSON.stringify(model, null, 2) (stable round-trip)', fs.readFileSync(file, 'utf8') === JSON.stringify(model, null, 2), `${fs.statSync(file).size} B`);

    // Browser-trained model vs headless wasm K1 model (same data/config) - bit-for-bit except trained_at.
    const train = U.readCsv(U.PIL.train);
    const { model: hm } = await U.trainRaw({ train, kconfig: U.KONFIGURASI.K1 });
    const cmp = U.deepBitCompare(hm, model);
    const diffs = cmp.diffs.filter((d: string) => !d.startsWith('$.trained_at'));
    check(S, 'Browser-exported model == headless wasm K1 model (bit-for-bit, ignoring trained_at)', diffs.length === 0, `${cmp.numbers} numbers compared, diffs=${diffs.length}${diffs.length ? ' e.g. ' + diffs.slice(0, 3).join(' | ') : ''}`);

    await openApplyModel(page);
    await amUploadModel(page, file);
    const sum = await amModelSummary(page);
    SHARED.summaryIT02 = sum;
    log(`Model Summary (file): ${JSON.stringify(sum)}`);
    const exp: Record<string, string> = {
      Source: 'File: F_K1.json', Algorithm: 'Naive Bayes', 'Schema version': '2.0', 'Trained at': model.trained_at, Target: 'Sentiment',
      Classes: 'negative, positive', 'Smoothing alpha': '1', 'Validation (training)': 'Holdout 70% / 30%, seed 42',
      'Text source': "Raw text: 'Text Tweet'", 'Text likelihood': 'Multinomial', 'Text terms': '1000', 'Text alpha': '1',
    };
    const bad = Object.entries(exp).filter(([k, v]) => sum[k] !== v).map(([k, v]) => `${k}: got "${sum[k]}" want "${v}"`);
    check(S, 'Model Summary card (Upload file) matches the trained model (target, classes, text source, terms, alpha, validation, trained_at)', bad.length === 0, bad.join('; ') || 'all 12 fields match');
    check(S, 'Model Summary text info: "Raw text variable: Text Tweet"', sum.__textInfo.includes('Raw text variable: Text Tweet'), sum.__textInfo);
    await shot(page, 'IT02_3_model_summary_file');

    // Same model via "From Output Viewer" (MF-02.3)
    const P = panel(page);
    await P.getByRole('radio', { name: 'From Output Viewer' }).check();
    const trig = P.getByRole('combobox', { name: 'Output Viewer model' });
    await trig.click();
    const opts = page.getByRole('option');
    log(`Output Viewer model options: ${JSON.stringify(await opts.allInnerTexts())}`);
    await opts.first().click();
    await expect(page.getByTestId('model-summary-card')).toBeVisible();
    const sum2 = await amModelSummary(page);
    log(`Model Summary (Output Viewer): ${JSON.stringify(sum2)}`);
    const bad2 = Object.keys(exp).filter((k) => k !== 'Source' && sum2[k] !== sum[k]).map((k) => `${k}: "${sum2[k]}" vs "${sum[k]}"`);
    check(S, 'Model Summary via "From Output Viewer" == via uploaded file (all fields except Source)', bad2.length === 0, bad2.join('; ') || `Source="${sum2.Source}"`);
    await shot(page, 'IT02_4_model_summary_viewer');
    // back to the uploaded file for IT-03
    await amUploadModel(page, file);
  }

  async function it03(page: Page) {
    const S = 'IT-03';
    if (!SHARED.model) throw new Error('not run: IT-02 did not produce a model');
    await amRun(page, S);
    const m = await amReadMetrics(page);
    log(`Apply Model Output Viewer (train): ${JSON.stringify(m)}`);
    check(S, 'Case Processing: Total Rows = Scored = Evaluated = 630', m.totalRows === '630' && m.scored === '630' && m.evaluated === '630', `${m.totalRows}/${m.scored}/${m.evaluated}`);
    check(S, 'Resubstitution metrics shown = accuracy 0.908, kappa 0.816 (headless 0.907937 / 0.815873)', m.accuracy === '0.908' && m.kappa === '0.816', `acc=${m.accuracy}, kappa=${m.kappa}, macroF1=${m.macroF1}`);
    await shot(page, 'IT03_1_apply_train_metrics');

    const csv = await exportDatasetCsv(page, 'IT03_train_with_NB');
    const t = readCsvFile(csv);
    const nbCols = t.header.filter((h) => h.startsWith('NB_'));
    check(S, 'Dataset has NB_PredictedValue, NB_PredictedProbability, NB_Probability_negative, NB_Probability_positive', JSON.stringify(nbCols) === JSON.stringify(['NB_PredictedValue', 'NB_PredictedProbability', 'NB_Probability_negative', 'NB_Probability_positive']), JSON.stringify(nbCols));
    const pred = col(t, 'NB_PredictedValue'), pmax = col(t, 'NB_PredictedProbability').map(Number);
    const pn = col(t, 'NB_Probability_negative').map(Number), pp = col(t, 'NB_Probability_positive').map(Number);
    const train = U.readCsv(U.PIL.train);
    check(S, 'Exported rows = 630 in original Id order', t.rows.length === 630 && JSON.stringify(col(t, 'Id').map(Number)) === JSON.stringify(train.rows.map((r: string[]) => Number(r[0]))), `rows=${t.rows.length}`);

    // "NB's own prediction": full-precision posterior from the trained model parameters (as in it03_same_data.mjs)
    const docs = train.rows.map((r: string[]) => r[train.header.indexOf('Text Tweet')] ?? '');
    const stwv = await U.stwvTransform(docs, U.toRustConfig(U.KONFIGURASI.K1.stwv));
    const ref = U.referenceScores(SHARED.model, stwv.matrix);
    const classes = SHARED.model.target.classes as string[];
    let same = 0, maxDiff = 0, sameR4 = 0, nP = 0, filled = 0;
    for (let i = 0; i < ref.length; i++) {
      if (pred[i] !== '' && pred[i] !== undefined) filled++;
      if (classes[ref[i].predictedIndex] === pred[i]) same++;
      const outs = [pn[i], pp[i]];
      classes.forEach((c, ci) => { nP++; const d = Math.abs(ref[i].probs[ci] - outs[ci]); maxDiff = Math.max(maxDiff, d); if (U.round4(ref[i].probs[ci]) === outs[ci]) sameR4++; });
      maxDiff = Math.max(maxDiff, Math.abs(Math.max(...ref[i].probs) - pmax[i]));
    }
    check(S, 'NB_ columns filled on 630/630 rows', filled === 630, `${filled}/630`);
    check(S, 'Predicted class == NB model prediction (full-precision reference) on 630/630 rows', same === 630, `${same}/630`);
    check(S, 'max |reference probability - Apply Model probability| <= 5e-5 (round4)', maxDiff <= 5e-5, `max=${maxDiff.toExponential(3)}; round4(ref)==output on ${sameR4}/${nP}`);
    const met = U.classificationMetrics(col(t, 'Sentiment'), pred);
    log(`IT-03 metrics recomputed from exported CSV: acc=${met.accuracy}, kappa=${met.kappa}, macroF1=${met.macroF1}`);
    check(S, 'Recomputed resubstitution accuracy/kappa = 0.907937/0.815873 (headless)', Math.abs(met.accuracy - 0.907937) < 1e-6 && Math.abs(met.kappa - 0.815873) < 1e-6, `acc=${met.accuracy.toFixed(6)}, kappa=${met.kappa.toFixed(6)}`);
  }

  async function it04(page: Page) {
    const S = 'IT-04';
    if (!SHARED.modelFile) throw new Error('not run: IT-02 did not produce a model');
    // Client-side navigation via the bottom "Data" button (a full page.goto/reload here left the app without a data grid; see README).
    await page.getByRole('button', { name: 'Data', exact: true }).click();
    await page.waitForURL(/\/dashboard\/data/);
    await importCsv(page, DATA.test);
    await openApplyModel(page);
    await amUploadModel(page, SHARED.modelFile!);
    await amRun(page, S);
    const m = await amReadMetrics(page);
    SHARED.it04Metrics = m;
    log(`Apply Model Output Viewer (test): ${JSON.stringify(m)}`);
    await shot(page, 'IT04_1_apply_test_metrics');
    const sk = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, 'accuracy', 'out', 'sklearn_results.json'), 'utf8')).configs.K1;
    check(S, 'Case Processing: Total Rows = Scored = Evaluated = 270', m.totalRows === '270' && m.scored === '270' && m.evaluated === '270', `${m.totalRows}/${m.scored}/${m.evaluated}`);
    check(S, `Output Viewer metrics (3 dp) = scikit-learn K1 (acc ${sk.accuracy.toFixed(3)}, kappa ${sk.kappa.toFixed(3)}, macro-F1 ${sk.macro_f1.toFixed(3)})`,
      m.accuracy === sk.accuracy.toFixed(3) && m.kappa === sk.kappa.toFixed(3) && m.macroF1.trim() === sk.macro_f1.toFixed(3), `acc=${m.accuracy}, kappa=${m.kappa}, macroF1=${m.macroF1}`);

    const csv = await exportDatasetCsv(page, 'IT04_test_with_NB');
    SHARED.it04Csv = csv;
    const t = readCsvFile(csv);
    const pred = col(t, 'NB_PredictedValue'), pn = col(t, 'NB_Probability_negative').map(Number), pp = col(t, 'NB_Probability_positive').map(Number);
    const filled = pred.filter((p) => p !== '').length;
    check(S, 'NB_ columns filled on 270/270 rows', t.rows.length === 270 && filled === 270 && pn.every((x) => !Number.isNaN(x)) && pp.every((x) => !Number.isNaN(x)), `rows=${t.rows.length}, filled=${filled}`);
    const skp = U.readPredCsv(path.join(EVAL_DIR, 'accuracy', 'out', 'pred_sklearn_K1.csv'));
    const ids = col(t, 'Id');
    check(S, 'Row order (Id) == scikit-learn prediction file', JSON.stringify(ids.map(Number)) === JSON.stringify(skp.ids.map(Number)));
    let same = 0, maxDiff = 0;
    for (let i = 0; i < pred.length; i++) {
      if (pred[i] === skp.pred[i]) same++;
      const ci = (c: string) => skp.classes.indexOf(c);
      maxDiff = Math.max(maxDiff, Math.abs(pn[i] - skp.prob[ci('negative')][i]), Math.abs(pp[i] - skp.prob[ci('positive')][i]));
    }
    check(S, 'Predicted class == scikit-learn K1 on 270/270 rows', same === 270, `${same}/270`);
    check(S, 'max |probability - scikit-learn| <= 5e-5 (round4)', maxDiff <= 5e-5, `max=${maxDiff.toExponential(3)}`);
    const met = U.classificationMetrics(col(t, 'Sentiment'), pred);
    const dA = Math.abs(met.accuracy - sk.accuracy), dK = Math.abs(met.kappa - sk.kappa), dF = Math.abs(met.macroF1 - sk.macro_f1);
    check(S, 'Metrics from exported predictions == scikit-learn K1 (|diff| < 1e-9)', Math.max(dA, dK, dF) < 1e-9,
      `acc ${met.accuracy.toFixed(6)} vs ${sk.accuracy.toFixed(6)}, kappa ${met.kappa.toFixed(6)} vs ${sk.kappa.toFixed(6)}, macroF1 ${met.macroF1.toFixed(6)} vs ${sk.macro_f1.toFixed(6)}; cm=${JSON.stringify(met.cm)} vs ${JSON.stringify(sk.confusion_actual_x_pred)}`);
    const st = U.readPredCsv(path.join(EVAL_DIR, 'accuracy', 'out', 'pred_statify_K1.csv'));
    let sameSt = 0;
    for (let i = 0; i < pred.length; i++) if (pred[i] === st.pred[i] && pn[i] === st.prob[st.classes.indexOf('negative')][i] && pp[i] === st.prob[st.classes.indexOf('positive')][i]) sameSt++;
    check(S, 'Class + both probabilities identical to headless Track D file pred_statify_K1.csv', sameSt === 270, `${sameSt}/270 rows identical`);
  }

// =====================================================================================================
async function it05(baseURL: string) {
  const S = 'IT-05';
  if (!SHARED.modelFile || !SHARED.it04Csv) throw new Error('not run: IT-02/IT-04 did not produce a model / predictions');
  const b2: Browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
  try {
    const ctx = await b2.newContext({ baseURL, viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
    const page = await ctx.newPage();
    log(`IT-05: new Chrome process (version ${b2.version()}), fresh context (empty IndexedDB); only carrier = ${SHARED.modelFile}`);
    await newDataPage(page, 'IT-05');
    // Fresh session: Output Viewer has no model (the only carrier is the file).
    await importCsv(page, DATA.test);
    await openApplyModel(page);
    await panel(page).getByRole('radio', { name: 'From Output Viewer' }).check();
    const viewerTxt = (await panel(page).innerText()).replace(/\s+/g, ' ');
    const noViewerModel = !(await page.getByTestId('model-summary-card').isVisible());
    log(`IT-05 "From Output Viewer" in new session: ${viewerTxt.slice(viewerTxt.indexOf('Model Source'), viewerTxt.indexOf('Model Source') + 200)}`);
    check(S, 'New session has no trained model in the Output Viewer (no Model Summary from viewer)', noViewerModel);
    await amUploadModel(page, SHARED.modelFile!);
    const sum = await amModelSummary(page);
    const diff = Object.keys(SHARED.summaryIT02!).filter((k) => sum[k] !== SHARED.summaryIT02![k]).map((k) => `${k}: "${sum[k]}" vs "${SHARED.summaryIT02![k]}"`);
    check(S, 'Model Summary after reload == IT-02 Model Summary', diff.length === 0, diff.join('; ') || 'identical');
    await amRun(page, S);
    const m = await amReadMetrics(page);
    await shot(page, 'IT05_1_new_session_metrics');
    check(S, 'Output Viewer metrics identical to IT-04', JSON.stringify(m) === JSON.stringify(SHARED.it04Metrics), `${JSON.stringify(m)}`);
    const csv = await exportDatasetCsv(page, 'IT05_test_new_session');
    const a = readCsvFile(SHARED.it04Csv!), b = readCsvFile(csv);
    const cols = ['Id', 'NB_PredictedValue', 'NB_PredictedProbability', 'NB_Probability_negative', 'NB_Probability_positive'];
    let identical = 0;
    for (let i = 0; i < Math.max(a.rows.length, b.rows.length); i++) if (cols.every((c) => col(a, c)[i] === col(b, c)[i])) identical++;
    check(S, 'NB_ columns (class + 3 probabilities) identical to IT-04 on 270/270 rows', identical === 270 && b.rows.length === 270, `${identical}/270 identical`);
    log(`IT-05 first 5 rows (Id, pred, P(positive)): ${b.rows.slice(0, 5).map((r, i) => `${col(b, 'Id')[i]}:${col(b, 'NB_PredictedValue')[i]}:${col(b, 'NB_Probability_positive')[i]}`).join(' ')}`);
    await ctx.close();
  } finally {
    await b2.close();
  }
}

// =====================================================================================================
test('IT-01..IT-05 through the real Statify UI (Chrome)', async ({ page, browser, baseURL }) => {
  const run = async (id: string, pg: Page | null, fn: () => Promise<void>) => {
    const t0 = Date.now();
    log(`===== ${id} start`);
    try {
      await test.step(id, fn);
      check(id, 'scenario ran to completion (no UI error)', true, `${((Date.now() - t0) / 1000).toFixed(1)} s`);
    } catch (e: any) {
      const msg = String(e?.message ?? e).split(/\r?\n/).slice(0, 6).join(' | ');
      check(id, 'scenario ran to completion (no UI error)', false, msg);
      if (pg) await shot(pg, `${id.replace('-', '')}_ERROR`).catch(() => {});
    }
  };
  await run('IT-01', page, () => it01(page));
  const ctx2 = await browser.newContext({ baseURL, viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  const p2 = await ctx2.newPage();
  await run('IT-02', p2, () => it02(p2));
  await run('IT-03', p2, () => it03(p2));
  await run('IT-04', p2, () => it04(p2));
  await ctx2.close();
  await run('IT-05', null, () => it05(String(baseURL)));
  const failed = CHECKS.filter((c) => !c.pass);
  expect(failed.map((c) => `${c.scenario} ${c.name}: ${c.detail}`)).toEqual([]);
});
