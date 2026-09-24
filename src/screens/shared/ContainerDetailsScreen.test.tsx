import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ContainerDetailsScreen from '../../../src/screens/shared/ContainerDetailsScreen';
import { getContainerDetails } from '../../../src/api/documents';
import { useLoadStore } from '../../../src/state/loadStore';

jest.mock('../../../src/api/documents');

function routeFor(loadId: string) {
  return { params: { loadId }, key: 'ContainerDetails', name: 'ContainerDetails' } as any;
}

describe('ContainerDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLoadStore.setState({ container: {}, containerLoading: {}, containerError: {} });
  });

  it('renders container fields when a record exists', async () => {
    (getContainerDetails as jest.Mock).mockResolvedValue({
      containerNumber: 'MSCU1234567',
      vesselOrFlight: 'MV Pacific Voyager',
      portOfLoading: 'Nhava Sheva (INNSA)',
      portOfDischarge: 'Jebel Ali (AEJEA)',
    });

    render(<ContainerDetailsScreen route={routeFor('load-container')} />);

    await waitFor(() => {
      expect(screen.getByText('MSCU1234567')).toBeTruthy();
    });
    expect(screen.getByText('MV Pacific Voyager')).toBeTruthy();
    expect(screen.getByText('Nhava Sheva (INNSA)')).toBeTruthy();
    expect(screen.getByText('Jebel Ali (AEJEA)')).toBeTruthy();
    // Distinguished from the live-GPS tracking screen, per the explicit requirement.
    expect(screen.getByText(/separate from this shipment.s live road-vehicle location/i)).toBeTruthy();
  });

  it('shows the "not applicable" empty state, not an error, when no container record exists', async () => {
    (getContainerDetails as jest.Mock).mockResolvedValue(null);

    render(<ContainerDetailsScreen route={routeFor('load-no-container')} />);

    await waitFor(() => {
      expect(screen.getByTestId('container-details-not-applicable')).toBeTruthy();
    });
    expect(screen.queryByTestId('container-details-error')).toBeNull();
    expect(screen.getByText(/not applicable for this shipment/i)).toBeTruthy();
  });

  it('shows a retry-capable error state on a genuine fetch failure', async () => {
    (getContainerDetails as jest.Mock).mockRejectedValue(new Error('network error'));

    render(<ContainerDetailsScreen route={routeFor('load-error')} />);

    await waitFor(() => {
      expect(screen.getByTestId('container-details-error')).toBeTruthy();
    });
    expect(screen.getByTestId('container-details-retry-button')).toBeTruthy();
    expect(screen.queryByTestId('container-details-not-applicable')).toBeNull();
  });
});
