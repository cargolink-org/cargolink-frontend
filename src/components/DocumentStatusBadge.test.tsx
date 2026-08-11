import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { DocumentStatusBadge } from '../../src/components/DocumentStatusBadge';

describe('DocumentStatusBadge', () => {
  it.each([
    ['not_uploaded', 'Not uploaded'],
    ['pending', 'Pending'],
    ['uploaded', 'Uploaded'],
    ['verified', 'Verified'],
    ['rejected', 'Rejected'],
  ] as const)('renders the %s status with label "%s"', (status, label) => {
    render(<DocumentStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByTestId(`document-status-badge-${status}`)).toBeTruthy();
  });
});
