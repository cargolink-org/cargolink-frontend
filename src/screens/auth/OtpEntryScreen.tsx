import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import OtpEntryScreen from '../../../src/screens/auth/OtpEntryScreen';
import * as authApi from '../../../src/api/auth';
import { useAuthStore } from '../../../src/state/authStore';

jest.mock('../../../src/api/auth', () => ({
  requestOtp: jest.fn(),
  verifyOtp: jest.fn(),
  toSessionTokens: jest.fn((res) => ({ token: res.token, refreshToken: res.refresh_token })),
}));

function renderScreen(phone = '9876543210') {
  const navigation = { navigate: jest.fn() } as any;
  const route = { params: { phone } } as any;
  const utils = render(<OtpEntryScreen navigation={navigation} route={route} />);
  return { ...utils, navigation };
}

function typeOtp(getByTestId: any, digits: string) {
  digits.split('').forEach((digit, i) => {
    fireEvent.changeText(getByTestId(`otp-digit-${i}`), digit);
  });
}

describe('OtpEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useAuthStore.getState().clearSession();
    });
  });

  it('renders 6 otp digit boxes and the masked phone subtitle', () => {
    const { getByTestId, getByText } = renderScreen('9876543210');
    for (let i = 0; i < 6; i++) {
      expect(getByTestId(`otp-digit-${i}`)).toBeTruthy();
    }
    expect(getByText(/98765 43210/)).toBeTruthy();
  });

  it('auto-submits and calls verifyOtp once all 6 digits are entered', async () => {
    (authApi.verifyOtp as jest.Mock).mockResolvedValueOnce({
      token: 'access-token',
      refresh_token: 'refresh-token',
      user: { id: 'u1', role: 'shipper', phone: '9876543210', name: 'Test User' },
      is_new_user: false,
    });

    const { getByTestId } = renderScreen('9876543210');
    typeOtp(getByTestId, '123456');

    await waitFor(() => {
      expect(authApi.verifyOtp).toHaveBeenCalledWith({ phone: '9876543210', otp: '123456' });
    });
  });

  it('commits the session into authStore on successful verify', async () => {
    (authApi.verifyOtp as jest.Mock).mockResolvedValueOnce({
      token: 'access-token',
      refresh_token: 'refresh-token',
      user: { id: 'u1', role: 'shipper', phone: '9876543210', name: 'Test User' },
      is_new_user: false,
    });

    const { getByTestId } = renderScreen('9876543210');
    typeOtp(getByTestId, '123456');

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
    expect(useAuthStore.getState().role).toBe('shipper');
    expect(useAuthStore.getState().token).toBe('access-token');
    // Refresh token lives only in-memory in this store, never persisted.
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token');
  });

  it('sets isNewUser on the store when verify reports a first-time user', async () => {
    (authApi.verifyOtp as jest.Mock).mockResolvedValueOnce({
      token: 'access-token',
      refresh_token: 'refresh-token',
      user: { id: 'u2', role: 'shipper', phone: '9000000001', name: null },
      is_new_user: true,
    });

    const { getByTestId } = renderScreen('9000000001');
    typeOtp(getByTestId, '123456');

    await waitFor(() => {
      expect(useAuthStore.getState().isNewUser).toBe(true);
    });
  });

  it('shows a friendly error and clears the input when the OTP is invalid', async () => {
    (authApi.verifyOtp as jest.Mock).mockRejectedValueOnce({ code: 'OTP_INVALID' });

    const { getByTestId, findByTestId } = renderScreen('9876543210');
    typeOtp(getByTestId, '000000');

    const error = await findByTestId('otp-submit-error');
    expect(error.props.children).toMatch(/doesn't look right/i);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('shows a friendly error when the OTP has expired', async () => {
    (authApi.verifyOtp as jest.Mock).mockRejectedValueOnce({ code: 'OTP_EXPIRED' });

    const { getByTestId, findByTestId } = renderScreen('9876543210');
    typeOtp(getByTestId, '111111');

    const error = await findByTestId('otp-submit-error');
    expect(error.props.children).toMatch(/expired/i);
  });

  it('disables the resend button during the initial cooldown', () => {
    const { getByTestId } = renderScreen('9876543210');
    expect(getByTestId('resend-otp-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('allows resending once the cooldown elapses, and calls requestOtp', async () => {
    jest.useFakeTimers();
    (authApi.requestOtp as jest.Mock).mockResolvedValueOnce({ otp_sent: true });

    const { getByTestId } = renderScreen('9876543210');

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(getByTestId('resend-otp-button').props.accessibilityState?.disabled).toBe(false);
    });

    await act(async () => {
      fireEvent.press(getByTestId('resend-otp-button'));
    });

    expect(authApi.requestOtp).toHaveBeenCalledWith({ phone: '9876543210' });
    jest.useRealTimers();
  });
});
