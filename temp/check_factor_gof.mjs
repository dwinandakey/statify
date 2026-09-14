import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
const { SavBufferReader } = require('sav-reader');

const workspaceRoot = path.resolve('d:/ModulAnalisisFaktor3Feb2026/ModulAnalisisFaktor10jan2026');
const savPath = path.join(workspaceRoot, 'frontend/public/exampleData/Employee data.sav');
const wasmJsPath = path.join(workspaceRoot, 'frontend/components/Modals/Analyze/dimension-reduction/factor/rust/pkg/wasm.js');
const wasmBgPath = path.join(workspaceRoot, 'frontend/components/Modals/Analyze/dimension-reduction/factor/rust/pkg/wasm_bg.wasm');

const sav = new SavBufferReader(fs.readFileSync(savPath));
await sav.open();
const rows = await sav.readAllRows();
const numericVars = sav.meta.sysvars
  .filter((variable) => variable.type === 0 && variable.name !== 'gender')
  .map((variable) => variable.name);

console.log('Selected variables:', numericVars.join(', '));
console.log('Cases:', rows.length);

const targetData = numericVars.map((variableName) =>
  rows.map((row) => ({
    [variableName]: typeof row[variableName] === 'number' ? row[variableName] : null,
  }))
);

const targetDataDefs = numericVars.map((variableName, index) => {
  const meta = sav.meta.sysvars.find((variable) => variable.name === variableName);
  return [{
    id: index + 1,
    columnIndex: index,
    name: variableName,
    type: 'NUMERIC',
    width: meta?.printFormat?.width ?? 8,
    decimals: meta?.printFormat?.nbdec ?? 2,
    label: meta?.label ?? '',
    values: [],
    missing: [],
    columns: 64,
    align: 'right',
    measure: 'scale',
    role: 'input',
  }];
});

const config = {
  main: {
    TargetVar: numericVars,
    ValueTarget: null,
  },
  value: {
    Selection: null,
  },
  descriptives: {
    UnivarDesc: false,
    InitialSol: true,
    Coefficient: false,
    Inverse: false,
    SignificanceLvl: false,
    Reproduced: false,
    Determinant: false,
    AntiImage: false,
    KMO: false,
  },
  extraction: {
    Method: 'MaxLikelihood',
    Correlation: true,
    Covariance: false,
    Unrotated: true,
    Scree: false,
    Eigen: true,
    Factor: true,
    EigenVal: 1,
    MaxFactors: 3,
    MaxIter: 25,
  },
  rotation: {
    None: true,
    Varimax: false,
    Oblimin: false,
    Delta: 0,
    Quartimax: false,
    Equimax: false,
    Promax: false,
    Kappa: 4,
    RotatedSol: true,
    LoadingPlot: false,
    MaxIter: 25,
  },
  scores: {
    SaveVar: false,
    Regression: true,
    Bartlett: false,
    Anderson: false,
    DisplayFactor: false,
  },
  options: {
    ExcludeListWise: true,
    ExcludePairWise: false,
    ReplaceMean: false,
    SortSize: false,
    SuppressValues: false,
    SuppressValuesNum: 0.1,
  },
};

const wasmModule = await import(pathToFileURL(wasmJsPath).href);
wasmModule.initSync(fs.readFileSync(wasmBgPath));

const analysis = new wasmModule.FactorAnalysis(targetData, [], targetDataDefs, [], config);
const rawResults = analysis.get_results();
const formatted = analysis.get_formatted_results();

console.log('Raw result type:', typeof rawResults);
console.log('Raw result keys:', rawResults && typeof rawResults === 'object' ? Object.keys(rawResults) : []);
console.log('Formatted result type:', typeof formatted);
console.log('Formatted result keys:', formatted && typeof formatted === 'object' ? Object.keys(formatted) : []);
console.log('Formatted result value:', JSON.stringify(formatted, null, 2));

const gof = formatted && formatted.tables ? formatted.tables.find((table) => table.key === 'goodness_of_fit_test') : undefined;
if (formatted && formatted.tables) {
  console.log('Table keys:', formatted.tables.map((table) => table.key).join(', '));
}
console.log('Analysis status:', JSON.stringify(formatted?.analysisStatus, null, 2));
console.log('Goodness-of-fit table:', JSON.stringify(gof, null, 2));
console.log('Errors:', JSON.stringify(analysis.get_all_errors(), null, 2));
