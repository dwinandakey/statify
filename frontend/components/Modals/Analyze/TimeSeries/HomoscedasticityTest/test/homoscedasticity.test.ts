/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import { useAnalyzeHook } from '@/components/Modals/Analyze/TimeSeries/HomoscedasticityTest/hooks/analyzeHook';
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

/** n rows, satu kolom residual */
const makeData = (n: number): DataRow[] =>
    Array.from({ length: n }, (): DataRow => [0.012]);

const residVar = createVar('Residuals', 0);

const runAndAnalyze = async (vars: Variable[], data: DataRow[], lags = 5) => {
    const { result } = renderHook(() =>
        useAnalyzeHook(vars, data, lags, jest.fn()),
    );
    await act(async () => { await result.current.handleAnalyze(); });
    return result;
};

const triggerSuccess = async (mockResult: any) => {
    await act(async () => {
        if (capturedMessageHandler)
            await (capturedMessageHandler as any)({ data: { status: 'success', result: mockResult } });
    });
};

const triggerWorkerError = async (msg = 'ARCH-LM test failed') => {
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

// ─── Mock ARCH-LM results ──────────────────────────────────────────────────────
/** isHomoscedastic = true → gagal tolak H0, residual homoskedastis */
const mockARCHLMHomo = {
    isHomoscedastic: true,
    statistic: '1.5',
    pValue: '0.22',
};

/** isHomoscedastic = false → tolak H0, efek ARCH terdeteksi */
const mockARCHLMHetero = {
    isHomoscedastic: false,
    statistic: '8.5',
    pValue: '0.004',
};

// ─── Analisis Basis Path ───────────────────────────────────────────────────────
//
//  Node / Keputusan di handleAnalyze:
//   D1: selectedVariables.length === 0
//   D2: filter baris valid residual (loop + if)
//   D3: residuals.length < 10
//   D4: status === "success"  (worker response)
//   D5: isHomo = result.isHomoscedastic   (menentukan label "Homoscedastic" / "Heteroscedastic")
//   D6: client.onError dipanggil
//
//  Jalur Independen:
//   P1 (TC-ARCHLM-01): D1=true             → return early, errorMsg diset
//   P2 (TC-ARCHLM-02): D1=false, D3=true   → throw "Insufficient data"
//   P3 (TC-ARCHLM-03): D4=true, D5=true    → label "Homoscedastic", H0 gagal ditolak
//   P4 (TC-ARCHLM-04): D4=true, D5=false   → label "Heteroscedastic", H0 ditolak
//   P5 (TC-ARCHLM-05): D4=false            → errorMsg dari worker
//   P6 (TC-ARCHLM-06): D6=true             → errorMsg "Failed to connect"
//
//  Cyclomatic Complexity V(G) = 6

beforeEach(() => {
    capturedMessageHandler = null;
    capturedErrorHandler   = null;
    jest.clearAllMocks();
    mockClient.onMessage.mockImplementation((h: any) => { capturedMessageHandler = h; });
    mockClient.onError.mockImplementation((h: any)   => { capturedErrorHandler = h; });
});

// ─── Jalur Validasi ────────────────────────────────────────────────────────────
describe('useAnalyzeHook HomoscedasticityTest – Validasi (P1–P2)', () => {
    it('TC-ARCHLM-01 [P1]: Tidak ada variabel dipilih → setErrorMsg, tidak panggil worker', async () => {
        const result = await runAndAnalyze([], makeData(15));

        expect(result.current.errorMsg).toBe('Please select a residual variable');
        expect(mockClient.post).not.toHaveBeenCalled();
        expect(result.current.isCalculating).toBe(false);
    });

    it('TC-ARCHLM-02 [P2]: Data < 10 observasi → errorMsg "Insufficient data points"', async () => {
        const result = await runAndAnalyze([residVar], makeData(8));

        expect(result.current.errorMsg).toBe('Insufficient data points (minimum 10 required)');
        expect(mockClient.post).not.toHaveBeenCalled();
    });
});

// ─── Jalur Interpretasi isHomo ────────────────────────────────────────────────
describe('useAnalyzeHook HomoscedasticityTest – Interpretasi Hasil (P3–P4)', () => {
    it('TC-ARCHLM-03 [P3]: isHomoscedastic=true → label "Homoscedastic", "Fail to reject H0"', async () => {
        const result = await runAndAnalyze([residVar], makeData(15));
        await triggerSuccess(mockARCHLMHomo);

        expect(result.current.errorMsg).toBeNull();
        expect(result.current.isCalculating).toBe(false);
        expect(mockAddStatistic).toHaveBeenCalled();

        const call = mockAddStatistic.mock.calls[0];
        const parsed = JSON.parse(call[1].output_data);

        // Tabel ARCH-LM harus ada dengan result "Homoscedastic"
        const archTable = parsed.tables.find((t: any) =>
            (t.title as string).startsWith('ARCH-LM Test'));
        expect(archTable).toBeDefined();
        expect(archTable.rows[0].result).toBe('Homoscedastic');

        // Tabel interpretasi harus menyebut "Fail to reject H0"
        const interpTable = parsed.tables.find((t: any) => t.title === 'Interpretation');
        const decisionRow = interpTable?.rows?.find((r: any) => r.comp === 'Decision');
        expect(decisionRow?.desc).toContain('Fail to reject H0');
    });

    it('TC-ARCHLM-04 [P4]: isHomoscedastic=false → label "Heteroscedastic (ARCH effects present)", "Reject H0"', async () => {
        const result = await runAndAnalyze([residVar], makeData(15));
        await triggerSuccess(mockARCHLMHetero);

        expect(result.current.errorMsg).toBeNull();
        expect(mockAddStatistic).toHaveBeenCalled();

        const call = mockAddStatistic.mock.calls[0];
        const parsed = JSON.parse(call[1].output_data);

        const archTable = parsed.tables.find((t: any) =>
            (t.title as string).startsWith('ARCH-LM Test'));
        expect(archTable.rows[0].result).toBe('Heteroscedastic (ARCH effects present)');

        const interpTable = parsed.tables.find((t: any) => t.title === 'Interpretation');
        const decisionRow = interpTable?.rows?.find((r: any) => r.comp === 'Decision');
        expect(decisionRow?.desc).toContain('Reject H0');
    });
});

// ─── Jalur Worker Error ────────────────────────────────────────────────────────
describe('useAnalyzeHook HomoscedasticityTest – Error Worker (P5–P6)', () => {
    it('TC-ARCHLM-05 [P5]: Worker kembalikan error → errorMsg dari worker diset', async () => {
        const result = await runAndAnalyze([residVar], makeData(15));
        await triggerWorkerError('ARCH-LM test failed');

        expect(result.current.errorMsg).toBe('ARCH-LM test failed');
        expect(result.current.isCalculating).toBe(false);
    });

    it('TC-ARCHLM-06 [P6]: Koneksi worker error → errorMsg "Failed to connect to worker"', async () => {
        const result = await runAndAnalyze([residVar], makeData(15));
        await triggerConnectionError();

        expect(result.current.errorMsg).toBe('Failed to connect to worker');
        expect(result.current.isCalculating).toBe(false);
    });
});
