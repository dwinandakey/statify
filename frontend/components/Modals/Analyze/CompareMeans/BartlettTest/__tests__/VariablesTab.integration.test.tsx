import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VariablesTab from '../components/VariablesTab';
import type { Variable } from '@/types/Variable';

test.each(['NUMERIC', 'STRING'] as const)('allows a nominal %s grouping variable in the actual list manager', (type) => {
    const group = { tempId: 'group', name: 'group', type, measure: 'nominal', columnIndex: 1 } as Variable;
    const moveToFactorVariable = jest.fn();
    const moveToTestVariables = jest.fn();
    render(<VariablesTab availableVariables={[group]} testVariables={[]} factorVariable={null}
        highlightedVariable={null} setHighlightedVariable={jest.fn()}
        moveToFactorVariable={moveToFactorVariable} moveToTestVariables={moveToTestVariables}
        moveToAvailableVariables={jest.fn()} reorderVariables={jest.fn()} />);
    fireEvent.doubleClick(screen.getByText('group'));
    expect(moveToFactorVariable).toHaveBeenCalledWith(group);
    expect(moveToTestVariables).not.toHaveBeenCalled();
});
