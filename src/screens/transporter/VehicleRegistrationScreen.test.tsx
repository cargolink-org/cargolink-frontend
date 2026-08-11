import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import VehicleRegistrationScreen from '../../../src/screens/transporter/VehicleRegistrationScreen';
import { createVehicle } from '../../../src/api/vehicles';
import { useVehicleStore } from '../../../src/state/vehicleStore';

/**
 * These tests assume this file has been merged into the real repo, where
 * `src/state/profileStore.ts`, `src/api/client.ts`, and
 * `src/navigation/types.ts` already exist (see README-INTEGRATION.md).
 * The profileStore mock below matches the shape assumed by the screen:
 * `useProfileStore(selector) -> selector({ profile: { id } })`. Update
 * this mock if the real store's shape differs.
 */
jest.mock('../../../src/api/vehicles');
jest.mock('../../../src/state/profileStore', () => ({
  useProfileStore: (selector: (state: { profile: { id: string } | null }) => unknown) =>
    selector({ profile: { id: 'owner-1' } }),
}));

const mockNavigate = jest.fn();
const navigation = { navigate: mockNavigate } as any;
const route = { params: undefined, key: 'VehicleRegistration', name: 'VehicleRegistration' } as any;

describe('VehicleRegistrationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useVehicleStore.getState().reset();
  });

  it('shows validation errors and does not submit when the form is empty', async () => {
    render(<VehicleRegistrationScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByTestId('vehicle-submit-button'));

    await waitFor(() => {
      expect(screen.getByText(/enter a valid registration number/i)).toBeTruthy();
    });
    expect(createVehicle).not.toHaveBeenCalled();
  });

  it('submits valid data, stores the vehicle, and navigates to DocumentUpload', async () => {
    (createVehicle as jest.Mock).mockResolvedValue({
      id: 'vehicle-1',
      ownerId: 'owner-1',
      vehicleType: 'truck',
      registrationNumber: 'MH12AB1234',
      capacityWeightKg: 3500,
      capacityVolumeCbm: 12,
      operatingCorridor: 'Pune–Mumbai',
    });

    render(<VehicleRegistrationScreen navigation={navigation} route={route} />);

    fireEvent(screen.getByTestId('vehicle-type-picker'), 'valueChange', 'truck');
    fireEvent.changeText(screen.getByTestId('registration-number-input'), 'MH12AB1234');
    fireEvent.changeText(screen.getByTestId('capacity-weight-input'), '3500');
    fireEvent.changeText(screen.getByTestId('capacity-volume-input'), '12');
    fireEvent.changeText(screen.getByTestId('operating-corridor-input'), 'Pune–Mumbai');

    fireEvent.press(screen.getByTestId('vehicle-submit-button'));

    await waitFor(() => {
      expect(createVehicle).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: 'owner-1', vehicleType: 'truck' })
      );
      expect(mockNavigate).toHaveBeenCalledWith('DocumentUpload');
    });

    expect(useVehicleStore.getState().vehicle?.id).toBe('vehicle-1');
  });

  it('shows a submit error when the vehicle API call fails', async () => {
    (createVehicle as jest.Mock).mockRejectedValue(new Error('network error'));

    render(<VehicleRegistrationScreen navigation={navigation} route={route} />);

    fireEvent(screen.getByTestId('vehicle-type-picker'), 'valueChange', 'truck');
    fireEvent.changeText(screen.getByTestId('registration-number-input'), 'MH12AB1234');
    fireEvent.changeText(screen.getByTestId('capacity-weight-input'), '3500');
    fireEvent.changeText(screen.getByTestId('capacity-volume-input'), '12');
    fireEvent.changeText(screen.getByTestId('operating-corridor-input'), 'Pune–Mumbai');

    fireEvent.press(screen.getByTestId('vehicle-submit-button'));

    await waitFor(() => {
      expect(screen.getByText(/could not save your vehicle/i)).toBeTruthy();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
