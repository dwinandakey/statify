import type { CrosstabsAnalysisParams, CrosstabsWorkerResult } from '../types';
import type { ColumnHeader, FormattedTable, TableRowData } from './helpers';

const formatNumber = (value: number, decimals = 3): string => {
  if (!Number.isFinite(value)) return '';
  return value.toFixed(decimals);
};

const formatPValue = (value: number | null): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  if (value < 0.001) return '<.001';
  return value.toFixed(3);
};

export const formatChiSquareTestsTable = (
  result: CrosstabsWorkerResult,
  params: CrosstabsAnalysisParams,
): FormattedTable | null => {
  if (!params.options.statistics?.chiSquare) return null;

  const pearson = result?.chiSquare?.pearson;
  if (!pearson) return null;

  const columnHeaders: ColumnHeader[] = [
    { header: '', key: 'rh1' },
    { header: 'Value', key: 'value' },
    { header: 'df', key: 'df' },
    { header: 'Asymp. Sig. (2-sided)', key: 'sig' },
  ];

  const rows: TableRowData[] = [
    // Baris 1: Pearson Chi-Square
    {
      rowHeader: ['Pearson Chi-Square'],
      value: formatNumber(pearson.value, 3),
      df: String(pearson.df),
      sig: formatPValue(pearson.pValue),
    },
    // Baris 2: N of Valid Cases — selalu ditampilkan seperti output SPSS,
    // kolom df dan Sig. dibiarkan kosong (tidak relevan untuk baris ini)
    {
      rowHeader: ['N of Valid Cases'],
      value: String(result.summary?.valid ?? ''),
      df: '',
      sig: '',
    },
  ];

  const diagnostics = pearson.expectedDiagnostics;
  const footnotes: string[] = [];
  if (diagnostics) {
    footnotes.push(
      `${diagnostics.cellsUnder5} cells (${formatNumber(diagnostics.percentCellsUnder5, 1)}%) have expected count less than 5.`
    );

    if (diagnostics.minExpectedCount !== null) {
      footnotes.push(`The minimum expected count is ${formatNumber(diagnostics.minExpectedCount, 2)}.`);
    }
  }

  return {
    title: 'Chi-Square Tests',
    columnHeaders,
    rows,
    footnotes: footnotes.length > 0 ? footnotes : undefined,
  };
};
