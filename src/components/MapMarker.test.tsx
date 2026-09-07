import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { MapMarker } from './MapMarker';

describe('MapMarker', () => {
  it('renders a native MarkerView at the given position with an accessible label', () => {
    render(<MapMarker position={{ latitude: 18.52, longitude: 73.85 }} />);

    const marker = screen.getByTestId('map-marker');
    expect(marker).toBeTruthy();
    expect(screen.getByLabelText('Vehicle location')).toBeTruthy();
  });

  it('accepts a custom accessibilityLabel and testID', () => {
    render(
      <MapMarker
        position={{ latitude: 1, longitude: 2 }}
        testID="transporter-marker"
        accessibilityLabel="Your current location"
      />
    );

    expect(screen.getByTestId('transporter-marker')).toBeTruthy();
    expect(screen.getByLabelText('Your current location')).toBeTruthy();
  });
});
