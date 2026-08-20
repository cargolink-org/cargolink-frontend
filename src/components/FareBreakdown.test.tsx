import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { FareBreakdown } from './FareBreakdown';
import type { FareQuote } from '../state/types';

const quote: FareQuote = {
  base_fare: 2500,
  distance_cost: 1400,
  surcharge: 300,
  total: 4200,
};

describe('FareBreakdown', () => {
  it('itemizes base fare, distance cost, surcharge, and total with correct currency formatting', () => {
    render(<FareBreakdown quote={quote} />);

    expect(screen.getByTestId('fare-breakdown-base-fare')).toHaveTextContent('₹2,500');
    expect(screen.getByTestId('fare-breakdown-distance-cost')).toHaveTextContent('₹1,400');
    expect(screen.getByTestId('fare-breakdown-surcharge')).toHaveTextContent('₹300');
    expect(screen.getByTestId('fare-breakdown-total')).toHaveTextContent('₹4,200');
  });

  it('rounds fractional rupee amounts to whole rupees for display', () => {
    render(
      <FareBreakdown
        quote={{ base_fare: 2500.75, distance_cost: 1399.2, surcharge: 300, total: 4199.95 }}
      />
    );

    expect(screen.getByTestId('fare-breakdown-base-fare')).toHaveTextContent('₹2,501');
    expect(screen.getByTestId('fare-breakdown-distance-cost')).toHaveTextContent('₹1,399');
    expect(screen.getByTestId('fare-breakdown-total')).toHaveTextContent('₹4,200');
  });

  it('exposes accessible labels for each line item, not bare numbers', () => {
    render(<FareBreakdown quote={quote} />);

    expect(screen.getByLabelText('Base fare: ₹2,500')).toBeTruthy();
    expect(screen.getByLabelText('Total fare: ₹4,200')).toBeTruthy();
  });
});
