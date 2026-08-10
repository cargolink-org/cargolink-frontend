import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ShipperProfileScreen } from '../../../src/screens/shipper/ProfileScreen';
import { updateProfile } from '../../../src/api/profile';
import { useProfileStore } from '../../../src/state/profileStore';
import { useAuthStore } from '../../../src/state/authStore';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockRouteParams: { mode?: 'create' | 'edit' } | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../../src/api/profile', () => ({
  updateProfile: jest.fn(),
}));

// authStore isn't part of this task's deliverables (owned by B.1/A.2); it's
// mocked here with the shape this task's spec describes: role, isNewUser,
// setIsNewUser.
jest.mock('../../../src/state/authStore', () => ({
  useAuthStore: jest.fn(),
}));

const mockedUpdateProfile = updateProfile as jest.MockedFunction<typeof updateProfile>;
const mockedUseAuthStore = useAuthStore as unknown as jest.Mock;

function setAuthState(state: { isNewUser: boolean; setIsNewUser: jest.Mock }) {
  mockedUseAuthStore.mockImplementation((selector: (s: typeof state) => unknown) => selector(state));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = undefined;
  useProfileStore.setState({
    profile: null,
    isLoadingProfile: false,
    profileError: null,
  });
});

describe('ShipperProfileScreen - mandatory first-time flow', () => {
  it('clears isNewUser on successful save instead of navigating back', async () => {
    const setIsNewUser = jest.fn();
    setAuthState({ isNewUser: true, setIsNewUser });
    mockedUpdateProfile.mockResolvedValueOnce({
      id: 'p1',
      role: 'shipper',
      shipperType: 'individual',
      name: 'Asha Patel',
      updatedAt: '2026-08-09T00:00:00.000Z',
    });

    render(<ShipperProfileScreen />);

    expect(screen.getByText('Set up your shipper profile')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('shipper-name-input'), 'Asha Patel');
    fireEvent.press(screen.getByTestId('profile-submit-button'));

    await waitFor(() => expect(setIsNewUser).toHaveBeenCalledWith(false));
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('surfaces an error and does not clear isNewUser when the save fails', async () => {
    const setIsNewUser = jest.fn();
    setAuthState({ isNewUser: true, setIsNewUser });
    mockedUpdateProfile.mockRejectedValueOnce(new Error('Network error'));

    render(<ShipperProfileScreen />);

    fireEvent.changeText(screen.getByTestId('shipper-name-input'), 'Asha Patel');
    fireEvent.press(screen.getByTestId('profile-submit-button'));

    await waitFor(() => expect(screen.getByTestId('profile-submit-error')).toBeTruthy());
    expect(setIsNewUser).not.toHaveBeenCalled();
  });
});

describe('ShipperProfileScreen - edit flow', () => {
  it('navigates back on successful save when accessed as an edit', async () => {
    const setIsNewUser = jest.fn();
    setAuthState({ isNewUser: false, setIsNewUser });
    mockRouteParams = { mode: 'edit' };
    mockedUpdateProfile.mockResolvedValueOnce({
      id: 'p1',
      role: 'shipper',
      shipperType: 'business',
      name: 'Acme Logistics Pvt Ltd',
      gstin: '22AAAAA0000A1Z5',
      updatedAt: '2026-08-09T00:00:00.000Z',
    });

    render(<ShipperProfileScreen />);

    expect(screen.getByText('Edit shipper profile')).toBeTruthy();

    fireEvent.press(screen.getByTestId('shipper-type-business'));
    fireEvent.changeText(screen.getByTestId('shipper-name-input'), 'Acme Logistics Pvt Ltd');
    fireEvent.changeText(screen.getByTestId('shipper-gstin-input'), '22AAAAA0000A1Z5');
    fireEvent.press(screen.getByTestId('profile-submit-button'));

    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(setIsNewUser).not.toHaveBeenCalled();
  });
});
