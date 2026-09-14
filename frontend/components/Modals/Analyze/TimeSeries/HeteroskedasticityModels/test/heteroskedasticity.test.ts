/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import { useAnalyzeHook } from '@/components/Modals/Analyze/TimeSeries/HeteroskedasticityModels/hooks/analyzeHook';
import type { Variable } from '@/types/Variable';
import type { DataRow } from '@/types/Data';

// ─── Worker Mock ───────────────────────────────────────────────────────────────
let capturedMessageHandler: ((e: any) => void) | null = null;
let capturedErrorHandler: ((e: any) => void) | null = null;

const mockClient = {
    post: jest.fn(),
    onMessage: jest.fn((h: any) => { capturedMessageHandler = h; }),
    onError: jest.fn((h: any) => { capturedErrorHandler = h; }),
    release: jest.fn(),
};

jest.mock('@/utils/timeseriesWorkerPool', () => ({
    getTimeSeriesWorker: () => mockClient,
}));

// ─── Store Mock ────────────────────────────────────────────────────────────────
const mockAddStatistic = jest.fn();

jest.mock('@/stores/useResultStore', () => ({
    useResultStore: () => ({
        addLog: jest.fn(() => Promise.resolve(1)),
        addAnalytic: jest.fn(() => Promise.resolve(1)),
        addStatistic: mockAddStatistic,
    }),
}));

jest.mock('sonner', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/services/chart/ChartService', () => ({
    ChartService: { createChartJSON: jest.fn(() => ({ type: 'line', data: [] })) },
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────
const createVar = (name: string, columnIndex = 0): Variable => ({
    columnIndex,
    name,
    type: 'NUMERIC',
    width: 8,
    decimals: 2,
    label: '',
    values: [],
    missing: null,
    columns: 10,
    align: 'right',
    measure: 'scale',
    role: 'input',
});

/** n rows, satu kolom nilai return */
const makeData = (n: number): DataRow[] =>
    Array.from({ length: n }, (): DataRow => [0.015]);

const retVar = createVar('Returns', 0);

const runAndAnalyze = async (
    vars: Variable[],
    data: DataRow[],
    pOrder = 1,
    qOrder = 1,
    modelType = 'GARCH',
) => {
    const { result } = renderHook(() =>
        useAnalyzeHook(vars, data, null, pOrder, qOrder, modelType, jest.fn()),
    );
    await act(async () => { await result.current.handleAnalyzes(); });
    return result;
};

const triggerSuccess = async (mockResult: any) => {
    await act(async () => {
        if (capturedMessageHandler)
            await (capturedMessageHandler as any)({ data: { status: 'success', result: mockResult } });
    });
};

const triggerWorkerError = async (msg = 'GARCH estimation failed') => {
    await act(async () => {
        if (capturedMessageHandler)
            await (capturedMessageHandler as any)({ data: { status: 'error', error: msg } });
    });
};

const triggerConnectionError = async () => {
    await act(async () => {
        if (capturedErrorHandler)
            (capturedErrorHandler as any)(new ErrorEvent('error'));
    });
};

// ─── Mock results ──────────────────────────────────────────────────────────────
/** Hasil lengkap: omega + alpha + beta + diagnostics + variance + residuals */
const mockGARCHFull = {
    coefficients: {
        omega: 0.001,
        alpha: [0.15, 0.10],
        gamma: [0.05],
        beta:  [0.75],
    },
    diagnostics: {
        rSquared: '0.85',
        adjRSquared: '0.84',
        seRegression: '0.012',
        sumSquaredResid: '0.004',
        logLikelihood: '620.25',
        durbinWatson: '1.95',
        meanDependentVar: '0.015',
        sdDependentVar: '0.035',
        aic: '-1234.5',
        bic: '-1220.0',
        hq: '-1228.0'
    },
    variance:  [0.001, 0.002, 0.0015],
    residuals: [0.01, -0.02, 0.015],
};

/** Hasil minimal: tidak ada coefficients, diagnostics, variance, atau residuals */
const mockGARCHMinimal = {
    coefficients: null,
    diagnostics:  null,
    variance:     [],
    residuals:    [],
};

// ─── Analisis Basis Path ───────────────────────────────────────────────────────
//
//  Node / Keputusan di handleAnalyzes:
//   D1: selectedVariables.length === 0
//   D2: filter baris valid (loop + if)
//   D3: returns.length < 10
//   D4: status === "success"  (worker response)
//   D5: result.coefficients truthy
//   D6: result.coefficients.omega !== undefined
//   D7: Array.isArray(result.coefficients.alpha)
//   D8: Array.isArray(result.coefficients.beta)
//   D9: result.diagnostics truthy
//   D10: varianceData.length > 0
//   D11: residualsData.length > 0
//   D12: client.onError dipanggil
//
//  Jalur Independen:
//   P1 (TC-GARCH-01): D1=true                → return early, errorMsg diset
//   P2 (TC-GARCH-02): D1=false, D3=true      → throw "Insufficient data"
//   P3 (TC-GARCH-03): D4=true, semua D5–D11=true  → sukses penuh
//   P4 (TC-GARCH-04): D4=true, D5=false (dan seterusnya false) → sukses minimal
//   P5 (TC-GARCH-05): D4=false               → errorMsg dari worker
//   P6 (TC-GARCH-06): D12=true               → errorMsg "Failed to connect"
//
//  Cyclomatic Complexity V(G) = 6 (jalur dominan, inner-branch adalah sub-path)

beforeEach(() => {
    capturedMessageHandler = null;
    capturedErrorHandler   = null;
    jest.clearAllMocks();
    mockClient.onMessage.mockImplementation((h: any) => { capturedMessageHandler = h; });
    mockClient.onError.mockImplementation((h: any)   => { capturedErrorHandler = h; });
});

// ─── Jalur Validasi ────────────────────────────────────────────────────────────
describe('useAnalyzeHook GARCH/ARCH – Validasi (P1–P2)', () => {
    it('TC-GARCH-01 [P1]: Tidak ada variabel dipilih → setErrorMsg, tidak panggil worker', async () => {
        const result = await runAndAnalyze([], makeData(15));

        expect(result.current.errorMsg).toBe('Please select at least one variable');
        expect(mockClient.post).not.toHaveBeenCalled();
        expect(result.current.isCalculating).toBe(false);
    });

    it('TC-GARCH-02 [P2]: Data < 10 observasi → errorMsg "Insufficient data points"', async () => {
        const result = await runAndAnalyze([retVar], makeData(6));

        expect(result.current.errorMsg).toBe('Insufficient data points (minimum 10 required)');
        expect(mockClient.post).not.toHaveBeenCalled();
    });
});

// ─── Jalur Sukses Worker ───────────────────────────────────────────────────────
describe('useAnalyzeHook GARCH/ARCH – Sukses Worker (P3–P4)', () => {
    it('TC-GARCH-03 [P3]: Hasil penuh (omega+alpha+beta+diag+variance+residuals) → tabel & chart dibuat', async () => {
        const result = await runAndAnalyze([retVar], makeData(15));
        await triggerSuccess(mockGARCHFull);

        expect(result.current.errorMsg).toBeNull();
        expect(result.current.isCalculating).toBe(false);
        expect(mockAddStatistic).toHaveBeenCalled();

        const call = mockAddStatistic.mock.calls[0];
        const parsed = JSON.parse(call[1].output_data);

        // Tabel "Mean Equation" harus ada
        const meanTable = parsed.tables.find((t: any) => t.title === 'Mean Equation');
        expect(meanTable).toBeDefined();
        expect(meanTable.rows.map((r: any) => r.rowHeader[0])).toContain('C');

        // Tabel "Variance Equation" harus ada dengan baris C, RESID(-1)^2, Gamma (1), GARCH(-1)
        const varTable = parsed.tables.find((t: any) => t.title === 'Variance Equation');
        expect(varTable).toBeDefined();
        const rowHeaders = varTable.rows.map((r: any) => r.rowHeader[0]);
        expect(rowHeaders).toContain('C');
        expect(rowHeaders).toContain('RESID(-1)^2');
        expect(rowHeaders).toContain('Gamma (1)');
        expect(rowHeaders).toContain('GARCH(-1)');

        // Tabel "Diagnostics" harus ada
        const diagTable = parsed.tables.find((t: any) => t.title === 'Diagnostics');
        expect(diagTable).toBeDefined();

        // Chart harus ada (variance + residuals)
        expect(parsed.charts.length).toBe(2);
    });

    it('TC-GARCH-04 [P4]: Hasil minimal (tidak ada coefficients/diagnostics/data chart) → tetap sukses tanpa tabel/chart', async () => {
        const result = await runAndAnalyze([retVar], makeData(15));
        await triggerSuccess(mockGARCHMinimal);

        expect(result.current.errorMsg).toBeNull();
        expect(mockAddStatistic).toHaveBeenCalled();

        const call = mockAddStatistic.mock.calls[0];
        const parsed = JSON.parse(call[1].output_data);

        // Tidak ada tabel Mean/Variance Equation atau Diagnostics
        expect(parsed.tables.find((t: any) => t.title === 'Mean Equation')).toBeUndefined();
        expect(parsed.tables.find((t: any) => t.title === 'Variance Equation')).toBeUndefined();
        expect(parsed.tables.find((t: any) => t.title === 'Diagnostics')).toBeUndefined();

        // Tidak ada chart
        expect(parsed.charts.length).toBe(0);
    });

    it('TC-GARCH-04-IGARCH [P4-IGARCH]: Estimasi IGARCH → data dikirim dengan type IGARCH', async () => {
        const result = await runAndAnalyze([retVar], makeData(15), 1, 1, 'IGARCH');
        expect(mockClient.post).toHaveBeenCalledWith({
            type: 'IGARCH',
            payload: {
                data: expect.any(Array),
                p: 1,
                q: 1,
            }
        });

        const mockIGARCH = {
            ...mockGARCHFull,
            coefficients: {
                omega: 0.001,
                alpha: [0.15],
                beta: [0.85],
            }
        };
        await triggerSuccess(mockIGARCH);
        expect(result.current.errorMsg).toBeNull();
        expect(mockAddStatistic).toHaveBeenCalled();

        const call = mockAddStatistic.mock.calls[0];
        const parsed = JSON.parse(call[1].output_data);

        // Variance Equation table untuk IGARCH tidak boleh ada Gamma
        const varTable = parsed.tables.find((t: any) => t.title === 'Variance Equation');
        expect(varTable).toBeDefined();
        const rowHeaders = varTable.rows.map((r: any) => r.rowHeader[0]);
        expect(rowHeaders).toContain('C');
        expect(rowHeaders).toContain('RESID(-1)^2');
        expect(rowHeaders).not.toContain('Gamma (1)');
        expect(rowHeaders).toContain('GARCH(-1)');
    });
});

// ─── Jalur Worker Error ────────────────────────────────────────────────────────
describe('useAnalyzeHook GARCH/ARCH – Error Worker (P5–P6)', () => {
    it('TC-GARCH-05 [P5]: Worker kembalikan status error → errorMsg dari worker diset', async () => {
        const result = await runAndAnalyze([retVar], makeData(15));
        await triggerWorkerError('GARCH estimation failed');

        expect(result.current.errorMsg).toBe('GARCH estimation failed');
        expect(result.current.isCalculating).toBe(false);
    });

    it('TC-GARCH-06 [P6]: Koneksi worker error → errorMsg "Failed to connect to worker"', async () => {
        const result = await runAndAnalyze([retVar], makeData(15));
        await triggerConnectionError();

        expect(result.current.errorMsg).toBe('Failed to connect to worker');
        expect(result.current.isCalculating).toBe(false);
    });
});
