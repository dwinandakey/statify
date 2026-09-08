import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TargetListConfig } from '../VariableListManager';
import VariableListManager from '../VariableListManager';
import type { Variable } from '@/types/Variable';

// Helper to create a mock variable
const createMockVariable = (id: number, name: string, label: string): Variable => ({
    name,
    label,
    type: 'NUMERIC',
    role: 'input',
    measure: 'scale',
    width: 8,
    decimals: 2,
    missing: {},
    values: [],
    columns: 1,
    align: 'left',
    tempId: `temp-${id}`,
    columnIndex: id,
});

// Mock data
const mockAvailableVariables: Variable[] = [
    createMockVariable(1, 'VAR001', 'Age'),
    createMockVariable(2, 'VAR002', 'Income'),
    createMockVariable(3, 'VAR003', 'Education'),
];

const mockTargetLists: TargetListConfig[] = [
    {
        id: 'factors',
        title: 'Factors',
        variables: [],
        height: '150px',
    },
    {
        id: 'covariates',
        title: 'Covariates',
        variables: [],
        height: '150px',
    },
];

// Mock props
const mockProps = {
    availableVariables: mockAvailableVariables,
    targetLists: mockTargetLists,
    variableIdKey: 'columnIndex' as keyof Variable,
    highlightedVariable: null,
    setHighlightedVariable: jest.fn(),
    onMoveVariable: jest.fn(),
    onReorderVariable: jest.fn(),
    onVariableDoubleClick: jest.fn(),
};

describe('VariableListManager', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    it('should render all lists and variables correctly', () => {
        render(<VariableListManager {...mockProps} />);

        // Check for the "Available Variables" list and its items
        expect(screen.getByText('Available Variables')).toBeInTheDocument();
        expect(screen.getByText('Age [VAR001]')).toBeInTheDocument();
        expect(screen.getByText('Income [VAR002]')).toBeInTheDocument();
        expect(screen.getByText('Education [VAR003]')).toBeInTheDocument();

        // Check for the target lists
        expect(screen.getByText('Factors')).toBeInTheDocument();
        expect(screen.getByText('Covariates')).toBeInTheDocument();

        // Ensure target lists are empty initially
        const factorsList = screen.getByText('Factors').closest('div');
        const covariatesList = screen.getByText('Covariates').closest('div');
        
        // This is a simple check; a more robust one might use data-testid
        expect(factorsList?.textContent).not.toContain('Age');
        expect(covariatesList?.textContent).not.toContain('Age');
    });

    it('should call setHighlightedVariable on variable click', async () => {
        const user = userEvent.setup();
        render(<VariableListManager {...mockProps} />);

        const ageVariable = screen.getByText('Age [VAR001]');
        await user.click(ageVariable);

        expect(mockProps.setHighlightedVariable).toHaveBeenCalledTimes(1);
        expect(mockProps.setHighlightedVariable).toHaveBeenCalledWith({
            id: String(mockAvailableVariables[0].columnIndex),
            source: 'available',
        });
    });

    it('should call onVariableDoubleClick on variable double click', async () => {
        const user = userEvent.setup();
        render(<VariableListManager {...mockProps} />);

        const incomeVariable = screen.getByText('Income [VAR002]');
        await user.dblClick(incomeVariable);

        expect(mockProps.onVariableDoubleClick).toHaveBeenCalledTimes(1);
        expect(mockProps.onVariableDoubleClick).toHaveBeenCalledWith(
            mockAvailableVariables[1],
            'available'
        );
    });

    it('should call onMoveVariable when arrow button is clicked', async () => {
        const user = userEvent.setup();
        // Start with a variable already highlighted
        const propsWithHighlight = {
            ...mockProps,
            // Convert number to string to match the prop type
            highlightedVariable: { id: String(mockAvailableVariables[0].columnIndex), source: 'available' },
        };
        
        render(<VariableListManager {...propsWithHighlight} />);

        // Desktop layout renders arrow buttons with testid "arrow-move-button-{listId}"
        const moveButton = await screen.findByTestId('arrow-move-button-factors');

        expect(moveButton).toBeInTheDocument();
        expect(moveButton).toHaveAttribute('aria-label', 'Move variable to Factors');

        await user.click(moveButton);

        expect(mockProps.onMoveVariable).toHaveBeenCalledTimes(1);
        expect(mockProps.onMoveVariable).toHaveBeenCalledWith(
            mockAvailableVariables[0], // The variable being moved
            'available',              // The source list ID
            'factors'                // The first target list ID
        );
    });

    /**
     * TC-VLM-04: Regression test for the first-variable (columnIndex=0) drag-and-drop bug.
     *
     * Root cause: handleDrop used `!variableId` which evaluates to `true` when
     * variableId === 0, incorrectly aborting the drop for the first variable.
     *
     * Fix: Changed to `variableId === undefined || variableId === null`.
     *
     * This test verifies that a variable with columnIndex=0 CAN be successfully
     * dragged and dropped into a target list.
     */
    it('TC-VLM-04: should allow drop for variable with columnIndex=0 (first variable)', async () => {
        // Create a variable at columnIndex 0 – this is the problematic case
        const firstVar = createMockVariable(0, 'VAR000', 'First Variable');
        const propsWithFirstVar = {
            ...mockProps,
            availableVariables: [firstVar, ...mockAvailableVariables],
        };

        render(<VariableListManager {...propsWithFirstVar} />);

        // Find the target list drop zone
        const factorsList = screen.getByTestId('factors-variable-list');

        // Simulate drop event with variableId = 0 (the critical edge case)
        const dropData = JSON.stringify({ variableId: 0, sourceListId: 'available' });
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        dropEvent.dataTransfer = {
            getData: jest.fn().mockReturnValue(dropData),
            dropEffect: '',
        };
        dropEvent.preventDefault = jest.fn();
        dropEvent.stopPropagation = jest.fn();

        // Fire the drop event on the factors list
        factorsList.dispatchEvent(dropEvent);

        // onMoveVariable should have been called with the first variable
        expect(mockProps.onMoveVariable).toHaveBeenCalledWith(
            firstVar,
            'available',
            'factors',
            undefined
        );
    });

    // More tests will be added here for drag-and-drop, etc.

});
 