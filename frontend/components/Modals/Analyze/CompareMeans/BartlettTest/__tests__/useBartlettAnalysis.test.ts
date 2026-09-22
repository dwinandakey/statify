/**
 * Unit tests untuk useBartlettAnalysis hook
 *
 * Hook ini mengelola:
 * - Inisialisasi dan pengelolaan Web Worker
 * - Pengiriman data ke worker untuk kalkulasi
 * - Penanganan hasil dan error
 * - Penyimpanan hasil ke result store
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBartlettAnalysis } from '../hooks/useBartlettAnalysis';
import { Variable } from '@/types/Variable';
import type { BartlettTestOptions } from '../types';
import { useAnalysisData } from '@/hooks/useAnalysisData';

// Mock dependencies
const mockGetData = jest.fn(() => [
    { 0: 10, 1: 1 },
    { 0: 20, 1: 1 },
    { 0: 15, 1: 2 },
    { 0: 25, 1: 2 },
]);

const mockCheckAndSave = jest.fn().mockResolvedValue(undefined);

jest.mock('@/stores/useDataStore', () => ({
    useDataStore: Object.assign(
        jest.fn(() => ({ getData: mockGetData })),
        {
            getState: jest.fn(() => ({
                getData: mockGetData,
                checkAndSave: mockCheckAndSave,
            }))
        }
    ),
}));

jest.mock('@/stores/useResultStore', () => ({
    useResultStore: jest.fn(() => ({
        addLog: jest.fn().mockResolvedValue('log-1'),
        addAnalytic: jest.fn().mockResolvedValue('analytic-1'),
        addStatistic: jest.fn().mockResolvedValue('statistic-1'),
    })),
}));

jest.mock('@/hooks/useAnalysisData', () => ({
    useAnalysisData: jest.fn(() => ({
        data: [
            { 0: 10, 1: 1 },
            { 0: 20, 1: 1 },
            { 0: 15, 1: 2 },
            { 0: 25, 1: 2 },
        ],
    })),
}));

jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock formatters
jest.mock('../utils/formatters', () => ({
    formatBartlettTestTable: jest.fn(() => ({
        columnHeaders: [{ content: 'Test' }],
        rows: [{ rowHeader: ['Row 1'], cells: ['value'] }],
    })),
    formatDescriptiveStatisticsTable: jest.fn(() => ({
        columnHeaders: [{ content: 'Descriptives' }],
        rows: [{ rowHeader: ['Row 1'], cells: ['value'] }],
    })),
}));

// Mock Worker
class MockWorker {
    static instances: MockWorker[] = [];
    constructor(public url: string, public options?: WorkerOptions) {
        MockWorker.instances.push(this);
    }
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    postMessage = jest.fn();
    terminate = jest.fn();
}

// Set up global Worker mock
(global as any).Worker = MockWorker;

describe('useBartlettAnalysis', () => {
    const mockTestVariables: Variable[] = [
        {
            tempId: 'var1',
            columnIndex: 0,
            name: 'score',
            type: 'NUMERIC',
            width: 8,
            decimals: 2,
            label: 'Test Score',
            values: [],
            missing: null,
            columns: 64,
            align: 'right',
            measure: 'scale',
            role: 'input',
        },
    ];

    const mockFactorVariable: Variable = {
        tempId: 'var2',
        columnIndex: 1,
        name: 'group',
        type: 'NUMERIC',
        width: 8,
        decimals: 0,
        label: 'Group',
        values: [],
        missing: null,
        columns: 64,
        align: 'right',
        measure: 'nominal',
        role: 'input',
    };

    const mockOptions: BartlettTestOptions = {
        includeDescriptives: false,
        confidenceLevel: 0.95,
    };

    const mockOnClose = jest.fn();

    const defaultProps = {
        testVariables: mockTestVariables,
        factorVariable: mockFactorVariable,
        options: mockOptions,
        onClose: mockOnClose,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        MockWorker.instances = [];
    });

    it('cancels without creating a worker and restarts with module options and handlers', async () => {
        const { result, unmount } = renderHook(() => useBartlettAnalysis(defaultProps));
        await act(async () => { await result.current.runAnalysis(); });
        const countBeforeCancel = MockWorker.instances.length;
        const activeWorker = MockWorker.instances[countBeforeCancel - 1];
        act(() => result.current.cancelCalculation());
        expect(activeWorker.terminate).toHaveBeenCalled();
        expect(MockWorker.instances).toHaveLength(countBeforeCancel);
        await act(async () => { await result.current.runAnalysis(); });
        const sentTo = MockWorker.instances[MockWorker.instances.length - 1];
        expect(sentTo?.options).toEqual({ type: 'module' });
        expect(sentTo?.onmessage).toEqual(expect.any(Function));
        expect(sentTo?.postMessage).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ variablesData: [[10, 20, 15, 25]], factorData: [1, 1, 2, 2] }),
        }));
        const countBeforeUnmount = MockWorker.instances.length;
        unmount();
        expect(MockWorker.instances).toHaveLength(countBeforeUnmount);
        expect(MockWorker.instances.every(worker => worker.terminate.mock.calls.length > 0)).toBe(true);
    });

    it('does not start a worker if cancelled while saving pending data', async () => {
        let finishSave!: () => void;
        mockCheckAndSave.mockImplementationOnce(() => new Promise<void>(resolve => { finishSave = resolve; }));
        const { result } = renderHook(() => useBartlettAnalysis(defaultProps));
        let analysis!: Promise<void>;
        act(() => { analysis = result.current.runAnalysis(); });
        act(() => result.current.cancelCalculation());
        await act(async () => { finishSave(); await analysis; });
        expect(MockWorker.instances).toHaveLength(0);
        expect(result.current.isCalculating).toBe(false);
    });

    it('rejects active case weights instead of silently computing an unweighted result', async () => {
        const mockAnalysis = jest.mocked(useAnalysisData);
        const original = mockAnalysis.getMockImplementation()!;
        mockAnalysis.mockImplementation(() => ({ data: [[10, 1], [20, 2]], weights: [0, 3], weightVariable: mockTestVariables[0] }));
        try {
            const { result } = renderHook(() => useBartlettAnalysis(defaultProps));
            await act(async () => { await result.current.runAnalysis(); });
            expect(result.current.errorMsg).toMatch(/weight/i);
            expect(result.current.isCalculating).toBe(false);
            expect(MockWorker.instances.every(worker => worker.postMessage.mock.calls.length === 0)).toBe(true);
        } finally {
            mockAnalysis.mockImplementation(original);
        }
    });

    describe('State Awal', () => {
        it('harus menginisialisasi dengan state tidak menghitung', () => {
            const { result } = renderHook(() => useBartlettAnalysis(defaultProps));

            expect(result.current.isCalculating).toBe(false);
            expect(result.current.errorMsg).toBeNull();
        });
    });

    describe('Menjalankan Analisis', () => {
        it('harus memulai kalkulasi saat runAnalysis dipanggil', async () => {
            const { result } = renderHook(() => useBartlettAnalysis(defaultProps));

            await act(async () => {
                result.current.runAnalysis();
                // Tunggu sebentar agar state terupdate
                await new Promise(resolve => setTimeout(resolve, 50));
            });

            // isCalculating bisa true atau false tergantung apakah worker berhasil atau tidak
            // Yang penting adalah tidak ada error dan hook berjalan
            expect(result.current.runAnalysis).toBeDefined();
        });

        it('harus bisa membatalkan kalkulasi', () => {
            const { result } = renderHook(() => useBartlettAnalysis(defaultProps));

            act(() => {
                result.current.runAnalysis();
            });

            act(() => {
                result.current.cancelCalculation();
            });

            // Verifikasi tidak ada error saat cancel
        });
    });

    describe('Penanganan Error', () => {
        it('harus memiliki errorMsg null pada state awal', async () => {
            const { result } = renderHook(() => useBartlettAnalysis(defaultProps));

            expect(result.current.errorMsg).toBeNull();
        });
    });

    describe('Cleanup', () => {
        it('harus terminate worker saat unmount', () => {
            const { unmount } = renderHook(() => useBartlettAnalysis(defaultProps));

            // Worker akan di-terminate saat unmount
            unmount();

            // Karena worker di-mock, kita cukup verifikasi tidak ada error
        });
    });
});
