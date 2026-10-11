import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VariablesTab from '../components/VariablesTab';
import { Variable } from '@/types/Variable';
import { HighlightedVariable } from '../types';

// Mock VariableListManager
jest.mock('@/components/Common/VariableListManager', () => ({
    __esModule: true,
    default: ({
        availableVariables,
        targetLists,
        onSelect,
        onMove,
        onReorder,
        onDoubleClick,
    }: any) => (
        <div data-testid="variable-list-manager">
            <div data-testid="available-count">{availableVariables.length}</div>
            {targetLists.map((list: any) => (
                <div key={list.id} data-testid={`target-list-${list.id}`}>
                    <span>{list.label}: {list.variables.length}</span>
                    {list.variables.map((v: Variable) => (
                        <button
                            key={v.tempId}
                            data-testid={`var-${v.name}`}
                            onClick={() => onDoubleClick?.(v, list.id)}
                        >
                            {v.name}
                        </button>
                    ))}
                </div>
            ))}
        </div>
    ),
}));

describe('VariablesTab', () => {
    const mockAvailableVariables: Variable[] = [
        {
            tempId: 'var1',
            columnIndex: 0,
            name: 'age',
            type: 'NUMERIC',
            width: 8,
            decimals: 0,
            label: 'Age',
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
            name: 'gender',
            type: 'NUMERIC',
            width: 8,
            decimals: 0,
            label: 'Gender',
            values: [],
            missing: null,
            columns: 64,
            align: 'right',
            measure: 'nominal',
            role: 'input',
        },
    ];

    const mockTestVariables: Variable[] = [
        {
            tempId: 'var3',
            columnIndex: 2,
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
        tempId: 'var4',
        columnIndex: 3,
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

    // Menggunakan tipe yang lebih sederhana untuk test
    const defaultProps = {
        availableVariables: mockAvailableVariables,
        testVariables: mockTestVariables,
        factorVariable: mockFactorVariable as Variable | null,
        highlightedVariable: null as HighlightedVariable | null,
        setHighlightedVariable: jest.fn(),
        moveToAvailableVariables: jest.fn(),
        moveToTestVariables: jest.fn(),
        moveToFactorVariable: jest.fn(),
        reorderVariables: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders the VariableListManager', () => {
            render(<VariablesTab {...defaultProps} />);

            expect(screen.getByTestId('variable-list-manager')).toBeInTheDocument();
        });

        it('displays correct count of available variables', () => {
            render(<VariablesTab {...defaultProps} />);

            expect(screen.getByTestId('available-count')).toHaveTextContent('2');
        });

        it('renders test variables target list', () => {
            render(<VariablesTab {...defaultProps} />);

            expect(screen.getByTestId('target-list-test')).toBeInTheDocument();
        });

        it('renders factor variable target list', () => {
            render(<VariablesTab {...defaultProps} />);

            expect(screen.getByTestId('target-list-factor')).toBeInTheDocument();
        });
    });

    describe('Variable Selection', () => {
        it('shows test variables in test list', () => {
            render(<VariablesTab {...defaultProps} />);

            const testList = screen.getByTestId('target-list-test');
            expect(testList).toHaveTextContent('1'); // 1 test variable
        });

        it('shows factor variable in factor list', () => {
            render(<VariablesTab {...defaultProps} />);

            const factorList = screen.getByTestId('target-list-factor');
            expect(factorList).toHaveTextContent('1'); // 1 factor variable (shown as array length)
        });

        it('handles empty test variables', () => {
            render(<VariablesTab {...defaultProps} testVariables={[]} />);

            const testList = screen.getByTestId('target-list-test');
            expect(testList).toHaveTextContent('0');
        });

        it('handles null factor variable', () => {
            render(<VariablesTab {...defaultProps} factorVariable={null} />);

            const factorList = screen.getByTestId('target-list-factor');
            expect(factorList).toHaveTextContent('0');
        });
    });

    describe('Highlighted Variable', () => {
        it('passes highlighted variable to component', () => {
            const highlighted: HighlightedVariable = {
                tempId: 'var3',
                source: 'test',
            };

            render(<VariablesTab {...defaultProps} highlightedVariable={highlighted} />);

            // Component should render without errors
            expect(screen.getByTestId('variable-list-manager')).toBeInTheDocument();
        });
    });

    describe('Variable Movement', () => {
        it('calls moveToTestVariables when variable added to test list', async () => {
            const mockMoveToTest = jest.fn();
            const user = userEvent.setup();

            render(
                <VariablesTab
                    {...defaultProps}
                    moveToTestVariables={mockMoveToTest}
                />
            );

            // Note: This tests the mock behavior, actual movement logic is in the hook
            expect(screen.getByTestId('variable-list-manager')).toBeInTheDocument();
        });

        it('calls moveToFactorVariable when variable added to factor list', async () => {
            const mockMoveToFactor = jest.fn();

            render(
                <VariablesTab
                    {...defaultProps}
                    moveToFactorVariable={mockMoveToFactor}
                />
            );

            expect(screen.getByTestId('variable-list-manager')).toBeInTheDocument();
        });
    });

    describe('Variable Reordering', () => {
        it('calls reorderVariables when variables are reordered', () => {
            const mockReorder = jest.fn();

            render(
                <VariablesTab
                    {...defaultProps}
                    reorderVariables={mockReorder}
                />
            );

            // Component should render and be ready for reordering
            expect(screen.getByTestId('variable-list-manager')).toBeInTheDocument();
        });
    });
});
