/**
 * UI helpers for the real-browser integration tests. All actions go through the Statify UI
 * (menus, dialogs, file pickers, Export buttons); nothing is injected into IndexedDB or the stores.
 * Selectors were verified against the running app (Next.js dev server) on 22 Oct 2026.
 */
import { expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const HERE = path.resolve(__dirname);
export const EVAL_DIR = path.resolve(HERE, '..', '..');
export const DATA = {
  train: path.join(EVAL_DIR, 'accuracy', 'datasets', 'pilkada_train.csv'),
  test: path.join(EVAL_DIR, 'accuracy', 'datasets', 'pilkada_test.csv'),
};
export const DIRS = {
  downloads: path.join(HERE, 'downloads'),
  shots: path.join(HERE, 'screenshots'),
  logs: path.join(HERE, 'logs'),
};
for (const d of Object.values(DIRS)) fs.mkdirSync(d, { recursive: true });

// ------------------------------------------------------------------ logging
const LOG_LINES: string[] = [];
export function log(line: string) {
  const s = `[${new Date().toISOString()}] ${line}`;
  LOG_LINES.push(s);
  console.log(s);
}
export function logLines() { return LOG_LINES.slice(); }
export type Check = { scenario: string; name: string; pass: boolean; detail: string };
export const CHECKS: Check[] = [];
export function check(scenario: string, name: string, pass: boolean, detail = '') {
  CHECKS.push({ scenario, name, pass, detail });
  log(`${pass ? 'PASS' : 'FAIL'}  ${scenario}  ${name}${detail ? '  :: ' + detail : ''}`);
  return pass;
}

export async function shot(page: Page, name: string) {
  const p = path.join(DIRS.shots, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  return p;
}

// ------------------------------------------------------------------ menus
export const panel = (page: Page) => page.getByTestId('sidebar-panel');

export async function menu(page: Page, top: string, ...items: string[]) {
  // The Radix menubar may ignore clicks until React has hydrated: retry until the first item is visible.
  const first = page.getByRole('menuitem', { name: items[0], exact: true });
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.getByRole('menuitem', { name: top, exact: true }).click();
    try { await first.waitFor({ state: 'visible', timeout: 3000 }); break; } catch {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
  for (let i = 0; i < items.length; i++) {
    const it = page.getByRole('menuitem', { name: items[i], exact: true });
    if (i < items.length - 1) await it.hover();
    else await it.click();
  }
}

/** File > Import Data > CSV Data, choose file, Continue, Import; waits for the success toast naming the file. */
export async function importCsv(page: Page, csvPath: string) {
  const name = path.basename(csvPath);
  await menu(page, 'File', 'Import Data', 'CSV Data');
  await page.getByTestId('dropzone-input').setInputFiles(csvPath);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: `Configure Import: ${name}` })).toBeVisible();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  // A confirmation may appear when a dataset is already loaded.
  const toast = page.getByText(new RegExp(`File ${name.replace('.', '\\.')} berhasil diimpor`));
  const confirm = page.getByRole('alertdialog');
  await Promise.race([
    toast.first().waitFor({ timeout: 120_000 }),
    confirm.waitFor({ timeout: 120_000 }).then(async () => {
      log(`import ${name}: confirmation dialog shown -> ${(await confirm.innerText()).replace(/\s+/g, ' ').slice(0, 200)}`);
      await confirm.getByRole('button').filter({ hasText: /continue|replace|yes|ok|import/i }).first().click();
      await toast.first().waitFor({ timeout: 120_000 });
    }),
  ]);
  log(`imported ${name}`);
}

/** File > Export > CSV Data with a given file name; returns the saved path (downloads folder). */
export async function exportDatasetCsv(page: Page, fileBase: string) {
  await menu(page, 'File', 'Export', 'CSV Data');
  const p = panel(page);
  await p.getByRole('textbox', { name: 'File Name' }).fill(fileBase);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 300_000 }), p.getByRole('button', { name: 'Export', exact: true }).click()]);
  const out = path.join(DIRS.downloads, dl.suggestedFilename());
  await dl.saveAs(out);
  log(`dataset exported via File > Export > CSV Data -> ${out} (${fs.statSync(out).size} B)`);
  return out;
}

// ------------------------------------------------------------------ Naive Bayes dialog
export async function openNaiveBayes(page: Page) {
  await menu(page, 'Analyze', 'Classify', 'Naive Bayes');
  await expect(page.getByTestId('nb-variables-tab')).toBeVisible();
}
export async function nbMove(page: Page, names: string[], zone: string) {
  for (const [i, n] of names.entries()) await page.getByTestId(`nb-available-item-${n}`).click({ modifiers: i ? ['Control'] : [] });
  await page.getByTestId(`nb-move-to-${zone}`).click();
}
export const nbZoneCount = (page: Page, zone: string) =>
  page.getByTestId(`nb-zone-list-${zone}`).locator(`[data-testid^="nb-zone-item-${zone}-"]`).count();

export async function nbSetSeed(page: Page, seed = 42) {
  await panel(page).getByRole('tab', { name: 'Validation' }).click();
  await page.getByRole('checkbox', { name: 'Use random seed' }).check();
  await page.getByRole('spinbutton', { name: 'Seed:' }).fill(String(seed));
}
/** Verifies the K1 defaults on Options (Multinomial, text alpha 1) and Text Preprocessing (if enabled). */
export async function nbAssertK1(page: Page, scenario: string, rawText: boolean) {
  const p = panel(page);
  await p.getByRole('tab', { name: 'Options' }).click();
  const multi = await p.getByRole('radio', { name: 'Multinomial' }).isChecked();
  const alpha = await p.getByRole('spinbutton', { name: 'Text Alpha (smoothing)' }).inputValue();
  check(scenario, 'NB Options: text likelihood Multinomial, Text Alpha 1 (K1)', multi && Number(alpha) === 1, `multinomial=${multi}, alpha=${alpha}`);
  if (rawText) {
    await p.getByRole('tab', { name: 'Text Preprocessing' }).click();
    const s = await stwvOptionState(p);
    check(scenario, 'NB Text Preprocessing = K1 (lowercase, no stopwords/stemming, word tokenizer, raw count, no IDF, no norm, W=1000, minTF 1)', isK1(s), JSON.stringify(s));
  }
}

// ------------------------------------------------------------------ STWV-style option panel (shared by STWV and NB)
export async function stwvOptionState(scope: Locator) {
  // radiogroups in order: stopwords, stemming, tokenizer, TF, IDF, normalization
  return {
    lowercase: await scope.getByRole('checkbox', { name: 'Lowercase' }).isChecked(),
    stopNone: await scope.getByRole('radiogroup').nth(0).getByRole('radio', { name: 'None' }).isChecked(),
    stemNone: await scope.getByRole('radiogroup').nth(1).getByRole('radio', { name: 'None' }).isChecked(),
    tokWord: await scope.getByRole('radio', { name: 'Word', exact: true }).isChecked(),
    delimiters: await scope.getByRole('textbox', { name: 'Delimiters' }).inputValue(),
    tfRaw: await scope.getByRole('radio', { name: /^Raw count/ }).isChecked(),
    idfNone: await scope.getByRole('radiogroup').nth(4).getByRole('radio', { name: 'None' }).isChecked(),
    normNone: await scope.getByRole('radiogroup').nth(5).getByRole('radio', { name: 'None' }).isChecked(),
    wordsToKeep: await scope.getByRole('spinbutton', { name: 'Words to Keep' }).inputValue(),
    minTf: await scope.getByRole('spinbutton', { name: 'Min term frequency' }).inputValue(),
  };
}
export function isK1(s: Awaited<ReturnType<typeof stwvOptionState>>) {
  return s.lowercase && s.stopNone && s.stemNone && s.tokWord && s.tfRaw && s.idfNone && s.normNone &&
    Number(s.wordsToKeep) === 1000 && Number(s.minTf) === 1 && s.delimiters === `[\\s.,;:'"()?!]+`;
}

// ------------------------------------------------------------------ Output Viewer
/** Click Export Model (Output Viewer) with a file name; returns saved path. */
export async function exportModel(page: Page, fileName: string, nth: 'first' | 'last' = 'last') {
  const btns = page.getByRole('button', { name: 'Export Model', exact: true });
  const boxes = page.getByRole('textbox', { name: 'File name' });
  const btn = nth === 'last' ? btns.last() : btns.first();
  const box = nth === 'last' ? boxes.last() : boxes.first();
  await btn.scrollIntoViewIfNeeded();
  await box.fill(fileName);
  const [dl] = await Promise.all([page.waitForEvent('download'), btn.click()]);
  const out = path.join(DIRS.downloads, dl.suggestedFilename());
  await dl.saveAs(out);
  log(`model exported via Output Viewer "Export Model" -> ${out} (${fs.statSync(out).size} B)`);
  return out;
}

/** Reads a 2-column (rowheader -> cell) table from the Output Viewer by a row header text, last occurrence. */
export async function viewerCell(page: Page, rowHeader: string | RegExp) {
  const row = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: rowHeader, exact: typeof rowHeader === 'string' }) }).last();
  return (await row.getByRole('cell').first().innerText()).trim();
}

// ------------------------------------------------------------------ Apply Model dialog
export async function openApplyModel(page: Page) {
  await menu(page, 'Analyze', 'Classify', 'Apply Model');
  await expect(panel(page).getByRole('radiogroup', { name: 'Model Source' })).toBeVisible();
}
export async function amUploadModel(page: Page, file: string) {
  await panel(page).getByRole('radio', { name: 'Upload file (.json)' }).check();
  await page.getByTestId('model-file-input').setInputFiles(file);
  await expect(page.getByTestId('model-summary-card')).toBeVisible();
}
/** Model Summary card -> {term: definition}. */
export async function amModelSummary(page: Page) {
  const card = page.getByTestId('model-summary-card');
  const terms = await card.locator('dt').allInnerTexts();
  const defs = await card.locator('dd').allInnerTexts();
  const o: Record<string, string> = {};
  terms.forEach((t, i) => (o[t.trim()] = (defs[i] ?? '').trim()));
  const text = await page.getByTestId('model-text-info').innerText().catch(() => '');
  o['__textInfo'] = text.replace(/\s+/g, ' ').trim();
  return o;
}
/** Variables (auto-mapped) + Save (all probability columns) + OK; waits for the Output Viewer. */
export async function amRun(page: Page, scenario: string) {
  const p = panel(page);
  await p.getByRole('tab', { name: 'Variables' }).click();
  const raw = await p.getByRole('combobox', { name: 'Raw text variable' }).innerText();
  const act = await p.getByRole('combobox', { name: 'Actual target variable' }).innerText();
  check(scenario, 'Apply Model Variables: Raw text = Text Tweet, Actual target = Sentiment (auto-map)', raw.trim() === 'Text Tweet' && act.trim() === 'Sentiment', `raw="${raw.trim()}", actual="${act.trim()}"`);
  await p.getByRole('tab', { name: 'Save' }).click();
  await p.getByRole('checkbox', { name: 'Predicted probability for each class' }).check();
  await p.getByRole('tab', { name: 'Output' }).click();
  await p.getByRole('button', { name: 'OK' }).click();
  await page.waitForURL(/\/dashboard\/result/, { timeout: 300_000 });
  await expect(page.getByRole('rowheader', { name: 'Cohen\'s Kappa (overall)' }).last()).toBeVisible({ timeout: 300_000 });
}
export async function amReadMetrics(page: Page) {
  return {
    totalRows: await viewerCell(page, 'Total Rows'),
    scored: await viewerCell(page, 'Scored'),
    evaluated: await viewerCell(page, 'Evaluated'),
    accuracy: await viewerCell(page, 'Overall Accuracy'),
    kappa: await viewerCell(page, "Cohen's Kappa (overall)"),
    macroF1: await page.getByRole('row').filter({ has: page.getByRole('columnheader', { name: 'Macro Average', exact: true }) }).last().getByRole('cell').last().innerText(),
  };
}

// ------------------------------------------------------------------ CSV
export function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let cur: string[] = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { cur.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; cur.push(f); rows.push(cur); cur = []; f = ''; }
    else f += c;
  }
  if (f !== '' || cur.length) { cur.push(f); rows.push(cur); }
  const clean = rows.filter((r) => !(r.length === 1 && r[0] === ''));
  const header = clean.shift()!.map((h) => h.replace(/^﻿/, ''));
  return { header, rows: clean };
}
export function readCsvFile(p: string) { return parseCsv(fs.readFileSync(p, 'utf8')); }
export function col(t: { header: string[]; rows: string[][] }, name: string) {
  const i = t.header.indexOf(name);
  if (i < 0) throw new Error(`column ${name} not found in [${t.header.slice(0, 12).join(', ')}${t.header.length > 12 ? ', ...' : ''}]`);
  return t.rows.map((r) => r[i]);
}
