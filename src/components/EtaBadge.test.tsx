import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { EtaBadge } from './EtaBadge';

describe('EtaBadge', () => {
  it('renders the provided ETA label prefixed with "ETA"', () => {
    render(<EtaBadge etaLabel="12 min" />);
    expect(screen.getByText('ETA 12 min')).toBeTruthy();
  });

  it('renders a neutral calculating state instead of a blank badge when etaLabel is null', () => {
    render(<EtaBadge etaLabel={null} />);
    expect(screen.getByText('ETA: Calculating…')).toBeTruthy();
  });

  it('exposes the label via accessibilityLabel for screen readers', () => {
    render(<EtaBadge etaLabel="8 min" />);
    expect(screen.getByLabelText('ETA 8 min')).toBeTruthy();
  });
});
