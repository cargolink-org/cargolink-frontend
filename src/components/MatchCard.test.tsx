import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { MatchCard } from './MatchCard';
import type { MatchResult } from '../state/types';

const baseMatch: MatchResult = {
  vehicle_id: 'vehicle-abc',
  distance_km: 12.4,
  capacity_fit: true,
  eta: '24 min',
  score: 0.87,
};

describe('MatchCard', () => {
  it('renders distance, ETA, capacity fit, and score with accessible labels', () => {
    render(<MatchCard match={baseMatch} onPress={jest.fn()} />);

    expect(screen.getByText('12.4 km away')).toBeTruthy();
    expect(screen.getByText('ETA 24 min')).toBeTruthy();
    expect(screen.getByText('Capacity fits')).toBeTruthy();
    expect(screen.getByText('87% match')).toBeTruthy();

    // Accessibility: values are never presented as bare numbers with no
    // unit context for screen readers.
    expect(screen.getByLabelText('Distance: 12.4 kilometers')).toBeTruthy();
    expect(screen.getByLabelText('Estimated time of arrival: 24 min')).toBeTruthy();
  });

  it("renders a distinct badge when the vehicle doesn't fit capacity", () => {
    render(<MatchCard match={{ ...baseMatch, capacity_fit: false }} onPress={jest.fn()} />);

    expect(screen.getByText("Doesn't fit")).toBeTruthy();
    expect(screen.queryByText('Capacity fits')).toBeNull();
  });

  it('calls onPress with the vehicle_id when tapped', () => {
    const onPress = jest.fn();
    render(<MatchCard match={baseMatch} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('match-card-vehicle-abc'));

    expect(onPress).toHaveBeenCalledWith('vehicle-abc');
  });

  it('rounds fractional scores to the nearest whole percent', () => {
    render(<MatchCard match={{ ...baseMatch, score: 0.666 }} onPress={jest.fn()} />);

    expect(screen.getByText('67% match')).toBeTruthy();
  });
});
