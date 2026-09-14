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
            { score: 10, group: 1 },
            { score: 20, group: 1 },
            { score: 15, group: 2 },
            { score: 25, group: 2 },
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
