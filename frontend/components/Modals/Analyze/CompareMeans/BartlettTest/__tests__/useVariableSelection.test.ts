/**
 * Unit tests untuk useVariableSelection hook
 *
 * Hook ini mengelola:
 * - Pemilihan variabel test (dependent variables)
 * - Pemilihan variabel faktor (grouping variable)
 * - Status highlight variabel yang sedang dipilih
 * - Pergerakan variabel antar daftar
 */

import { renderHook, act } from '@testing-library/react';
import { useVariableSelection } from '../hooks/useVariableSelection';
import { Variable } from '@/types/Variable';

// Mock useVariableStore
jest.mock('@/stores/useVariableStore', () => ({
    useVariableStore: jest.fn(),
}));

import { useVariableStore } from '@/stores/useVariableStore';

const mockUseVariableStore = useVariableStore as jest.MockedFunction<typeof useVariableStore>;

describe('useVariableSelection', () => {
    // Data mock untuk testing
    const mockVariables: Variable[] = [
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
        {
            tempId: 'var2',
            columnIndex: 1,
            name: 'grade',
            type: 'NUMERIC',
            width: 8,
            decimals: 2,
            label: 'Grade',
            values: [],
            missing: null,
            columns: 64,
            align: 'right',
            measure: 'scale',
            role: 'input',
        },
        {
            tempId: 'var3',
            columnIndex: 2,
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
        },
        {
            tempId: 'var4',
            columnIndex: 3,
            name: 'category',
            type: 'STRING',
            width: 10,
            decimals: 0,
            label: 'Category',
            values: [],
            missing: null,
            columns: 64,
            align: 'left',
            measure: 'nominal',
            role: 'input',
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseVariableStore.mockImplementation((selector: any) => {
            const state = { variables: mockVariables };
            return selector(state);
        });
    });

    describe('State Awal', () => {
        it('harus menginisialisasi dengan state kosong', () => {
            const { result } = renderHook(() => useVariableSelection());

            expect(result.current.testVariables).toEqual([]);
            expect(result.current.factorVariable).toBeNull();
            expect(result.current.highlightedVariable).toBeNull();
        });

        it('harus mengembalikan semua variabel valid sebagai available', () => {
            const { result } = renderHook(() => useVariableSelection());

            // Harus mengembalikan variabel NUMERIC dan STRING
            expect(result.current.availableVariables).toHaveLength(4);
        });
    });

    describe('Pemilihan Test Variables', () => {
        it('harus memindahkan variabel ke test variables', () => {
            const { result } = renderHook(() => useVariableSelection());

            act(() => {
                result.current.moveToTestVariables(mockVariables[0]);
            });

            expect(result.current.testVariables).toHaveLength(1);
            expect(result.current.testVariables[0].name).toBe('score');
        });

        it('harus menghapus variabel dari available setelah dipilih', () => {
            const { result } = renderHook(() => useVariableSelection());
            const initialAvailableCount = result.current.availableVariables.length;

            act(() => {
                result.current.moveToTestVariables(mockVariables[0]);
            });

            expect(result.current.availableVariables.length).toBe(initialAvailableCount - 1);
        });

        it('harus memungkinkan multiple test variables', () => {
            const { result } = renderHook(() => useVariableSelection());

            act(() => {
                result.current.moveToTestVariables(mockVariables[0]);
                result.current.moveToTestVariables(mockVariables[1]);
            });

            expect(result.current.testVariables).toHaveLength(2);
        });

        it('harus menghapus highlight setelah move', () => {
            const { result } = renderHook(() => useVariableSelection());

            act(() => {
                result.current.setHighlightedVariable({ tempId: 'var1', source: 'available' });
            });

            expect(result.current.highlightedVariable).not.toBeNull();

            act(() => {
                result.current.moveToTestVariables(mockVariables[0]);
            });

            expect(result.current.highlightedVariable).toBeNull();
        });
    });

    describe('Pemilihan Factor Variable', () => {
        it('harus set factor variable', () => {
            const { result } = renderHook(() => useVariableSelection());

            act(() => {
                result.current.moveToFactorVariable(mockVariables[2]);
            });

            expect(result.current.factorVariable).not.toBeNull();
            expect(result.current.factorVariable?.name).toBe('group');
        });

        it('harus menghapus factor variable dari available', () => {
            const { result } = renderHook(() => useVariableSelection());
            const initialAvailableCount = result.current.availableVariables.length;

            act(() => {
                result.current.moveToFactorVariable(mockVariables[2]);
            });

            expect(result.current.availableVariables.length).toBe(initialAvailableCount - 1);
        });
    });

    describe('Penghapusan Variabel', () => {
        it('harus menghapus variabel dari test variables', () => {
            const { result } = renderHook(() => useVariableSelection());

            act(() => {
                result.current.moveToTestVariables(mockVariables[0]);
                result.current.moveToTestVariables(mockVariables[1]);
            });

            expect(result.current.testVariables).toHaveLength(2);

            act(() => {
                result.current.removeFromTestVariables(mockVariables[0]);
            });

            expect(result.current.testVariables).toHaveLength(1);
            expect(result.current.testVariables[0].name).toBe('grade');
        });

        it('harus menghapus factor variable', () => {
            const { result } = renderHook(() => useVariableSelection());

            act(() => {
                result.current.moveToFactorVariable(mockVariables[2]);
            });

            expect(result.current.factorVariable).not.toBeNull();

            act(() => {
                result.current.clearFactorVariable();
            });

            expect(result.current.factorVariable).toBeNull();
        });

        it('harus memindahkan variabel kembali ke available dari test', () => {
            const { result } = renderHook(() => useVariableSelection());

            act(() => {
                result.current.moveToTestVariables(mockVariables[0]);
            });

            const availableAfterMove = result.current.availableVariables.length;

            act(() => {
                result.current.moveToAvailableVariables(mockVariables[0], 'test');
            });

            expect(result.current.testVariables).toHaveLength(0);
            expect(result.current.availableVariables.length).toBe(availableAfterMove + 1);
        });

        it('harus memindahkan variabel kembali ke available dari factor', () => {
            const { result } = renderHook(() => useVariableSelection());

            act(() => {
                result.current.moveToFactorVariable(mockVariables[2]);
            });

            const availableAfterMove = result.current.availableVariables.length;

            act(() => {
                result.current.moveToAvailableVariables(mockVariables[2], 'factor');
            });

            expect(result.current.factorVariable).toBeNull();
            expect(result.current.availableVariables.length).toBe(availableAfterMove + 1);
        });
    });

    describe('Pengurutan Variabel', () => {
        it('harus mengubah urutan test variables', () => {
            const { result } = renderHook(() => useVariableSelection());

            act(() => {
                result.current.moveToTestVariables(mockVariables[0]);
                result.current.moveToTestVariables(mockVariables[1]);
            });

            expect(result.current.testVariables[0].name).toBe('score');
            expect(result.current.testVariables[1].name).toBe('grade');

            act(() => {
                result.current.reorderVariables(0, 1);
            });

            expect(result.current.testVariables[0].name).toBe('grade');
            expect(result.current.testVariables[1].name).toBe('score');
        });
    });

    describe('Reset Selection', () => {
        it('harus mereset semua pilihan', () => {
            const { result } = renderHook(() => useVariableSelection());

            act(() => {
                result.current.moveToTestVariables(mockVariables[0]);
                result.current.moveToTestVariables(mockVariables[1]);
                result.current.moveToFactorVariable(mockVariables[2]);
                result.current.setHighlightedVariable({ tempId: 'var1', source: 'test' });
            });

            expect(result.current.testVariables).toHaveLength(2);
            expect(result.current.factorVariable).not.toBeNull();
            expect(result.current.highlightedVariable).not.toBeNull();

            act(() => {
                result.current.resetVariableSelection();
            });

            expect(result.current.testVariables).toHaveLength(0);
            expect(result.current.factorVariable).toBeNull();
            expect(result.current.highlightedVariable).toBeNull();
        });
    });

    describe('Highlighted Variable', () => {
        it('harus set dan clear highlighted variable', () => {
            const { result } = renderHook(() => useVariableSelection());

            expect(result.current.highlightedVariable).toBeNull();

            act(() => {
                result.current.setHighlightedVariable({ tempId: 'var1', source: 'available' });
            });

            expect(result.current.highlightedVariable).toEqual({ tempId: 'var1', source: 'available' });

            act(() => {
                result.current.setHighlightedVariable(null);
            });

            expect(result.current.highlightedVariable).toBeNull();
        });
    });
});
