import React from 'react';
import { render, screen } from '@testing-library/react';
import DataTableRenderer from '../DataTableRenderer';

describe('table rendering after integrating statistics modules', () => {
  it('keeps explicit column spans and placeholder data columns', () => {
    const { container } = render(<DataTableRenderer data={JSON.stringify({ tables: [{
      title: 'Normality results',
      columnHeaders: [
        { header: 'Shapiro-Wilk', key: 'statistic', colSpan: 2 },
        { header: 'Placeholder', key: 'pValue', isPlaceholder: true },
      ],
      rows: [{ statistic: 0.98, pValue: 0.42 }],
    }] })} />);

    expect(screen.getByRole('columnheader', { name: 'Shapiro-Wilk' })).toHaveAttribute('colspan', '2');
    expect(screen.queryByText('Placeholder')).not.toBeInTheDocument();
    expect(container.querySelectorAll('tbody td')).toHaveLength(2);
    expect(screen.getByText('0.42')).toBeInTheDocument();
  });

  it('renders usable rows when headers or rows are incomplete', () => {
    render(<DataTableRenderer data={JSON.stringify({ tables: [{
      title: 'Partial results',
      columnHeaders: [{ header: 'Statistic', key: 'statistic' }],
      rows: [null, { rowHeader: 'invalid', statistic: 1.25 }, { statistic: 2.5 }],
    }] })} />);

    expect(screen.getByText('1.25')).toBeInTheDocument();
    expect(screen.getByText('2.5')).toBeInTheDocument();
  });

  it('skips tables without a valid rows array', () => {
    const { container } = render(<DataTableRenderer data={JSON.stringify({ tables: [{
      title: 'Empty results',
      columnHeaders: [{ header: 'Statistic', key: 'statistic' }],
      rows: null,
    }] })} />);

    expect(container.querySelector('table')).toBeNull();
  });
});
