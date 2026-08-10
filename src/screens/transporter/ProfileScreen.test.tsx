import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TransporterProfileScreen } from '../../../src/screens/transporter/ProfileScreen';
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

describe('TransporterProfileScreen - mandatory first-time flow', () => {
  it('clears isNewUser on successful save instead of navigating back', async () => {
    const setIsNewUser = jest.fn();
    setAuthState({ isNewUser: true, setIsNewUser });
    mockedUpdateProfile.mockResolvedValueOnce({
      id: 't1',
      role: 'transporter',
      licenseNumber: 'MH-14-2024-00123',
      ratingAvg: null,
      updatedAt: '2026-08-09T00:00:00.000Z',
    });

    render(<TransporterProfileScreen />);

    expect(screen.getByText('Set up your transporter profile')).toBeTruthy();
    expect(screen.getByText('Not yet available')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('transporter-license-input'), 'MH-14-2024-00123');
    fireEvent.press(screen.getByTestId('profile-submit-button'));

    await waitFor(() => expect(setIsNewUser).toHaveBeenCalledWith(false));
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

describe('TransporterProfileScreen - edit flow', () => {
  it('shows the existing rating_avg and navigates back after a successful edit', async () => {
    const setIsNewUser = jest.fn();
    setAuthState({ isNewUser: false, setIsNewUser });
    mockRouteParams = { mode: 'edit' };
    useProfileStore.setState({
      profile: {
        id: 't1',
        role: 'transporter',
        licenseNumber: 'MH-14-2024-00123',
        ratingAvg: 4.6,
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      isLoadingProfile: false,
      profileError: null,
    });
    mockedUpdateProfile.mockResolvedValueOnce({
      id: 't1',
      role: 'transporter',
      licenseNumber: 'MH-14-2024-99999',
      ratingAvg: 4.6,
      updatedAt: '2026-08-09T00:00:00.000Z',
    });

    render(<TransporterProfileScreen />);

    expect(screen.getByText('4.6 / 5.0')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('transporter-license-input'), 'MH-14-2024-99999');
    fireEvent.press(screen.getByTestId('profile-submit-button'));

    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(setIsNewUser).not.toHaveBeenCalled();
  });

  it('surfaces an error on save failure', async () => {
    setAuthState({ isNewUser: false, setIsNewUser: jest.fn() });
    mockedUpdateProfile.mockRejectedValueOnce(new Error('Server unavailable'));

    render(<TransporterProfileScreen />);

    fireEvent.changeText(screen.getByTestId('transporter-license-input'), 'MH-14-2024-00123');
    fireEvent.press(screen.getByTestId('profile-submit-button'));

    await waitFor(() => expect(screen.getByTestId('profile-submit-error')).toBeTruthy());
  });
});
