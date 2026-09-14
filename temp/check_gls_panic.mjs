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
const numericVars = sav.meta.sysvars.filter((variable) => variable.type === 0).map((variable) => variable.name);

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
  main: { TargetVar: numericVars, ValueTarget: null },
  value: { Selection: null },
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
    Method: 'GeneralizedLeastSqr',
    Correlation: true,
    Covariance: false,
    Unrotated: true,
    Scree: true,
    Eigen: true,
    Factor: true,
    EigenVal: 1,
    MaxFactors: 3,
    MaxIter: 25,
  },
  rotation: {
    None: false,
    Varimax: true,
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
    DisplayFactor: true,
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

try {
  const analysis = new wasmModule.FactorAnalysis(targetData, [], targetDataDefs, [], config);
  const raw = analysis.get_results();
  console.log('SUCCESS');
  console.log(JSON.stringify(raw.analysis_status, null, 2));
  console.log(JSON.stringify(raw.goodness_of_fit_test, null, 2));
  console.log(JSON.stringify(raw.component_matrix, null, 2).slice(0, 1500));
} catch (error) {
  console.error('ERROR', error);
  console.error('STACK', error?.stack);
  process.exitCode = 1;
}
