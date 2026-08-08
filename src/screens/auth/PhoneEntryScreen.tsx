import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PhoneEntryScreen from '../../../src/screens/auth/PhoneEntryScreen';
import * as authApi from '../../../src/api/auth';

jest.mock('../../../src/api/auth', () => ({
  requestOtp: jest.fn(),
}));

function renderScreen() {
  const navigation = { navigate: jest.fn() } as any;
  const route = { params: undefined } as any;
  const utils = render(<PhoneEntryScreen navigation={navigation} route={route} />);
  return { ...utils, navigation };
}

describe('PhoneEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the phone input and submit button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('phone-input')).toBeTruthy();
    expect(getByTestId('send-otp-button')).toBeTruthy();
  });

  it('shows a validation error and does not call the API for an incomplete phone number', async () => {
    const { getByTestId, findByTestId } = renderScreen();

    fireEvent.changeText(getByTestId('phone-input'), '98765');
    fireEvent.press(getByTestId('send-otp-button'));

    await findByTestId('phone-field-error');
    expect(authApi.requestOtp).not.toHaveBeenCalled();
  });

  it('calls requestOtp and navigates to OtpEntry with the normalized phone on success', async () => {
    (authApi.requestOtp as jest.Mock).mockResolvedValueOnce({ otp_sent: true });
    const { getByTestId, navigation } = renderScreen();

    fireEvent.changeText(getByTestId('phone-input'), '9876543210');
    fireEvent.press(getByTestId('send-otp-button'));

    await waitFor(() => {
      expect(authApi.requestOtp).toHaveBeenCalledWith({ phone: '9876543210' });
    });
    expect(navigation.navigate).toHaveBeenCalledWith('OtpEntry', { phone: '9876543210' });
  });

  it('surfaces a friendly error message when the API call fails, without navigating', async () => {
    (authApi.requestOtp as jest.Mock).mockRejectedValueOnce({ code: 'RATE_LIMITED' });
    const { getByTestId, findByTestId, navigation } = renderScreen();

    fireEvent.changeText(getByTestId('phone-input'), '9999999999');
    fireEvent.press(getByTestId('send-otp-button'));

    const error = await findByTestId('phone-submit-error');
    expect(error.props.children).toMatch(/too often|wait a moment/i);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('disables the submit button while a request is in flight', async () => {
    let resolveRequest: (v: { otp_sent: true }) => void = () => {};
    (authApi.requestOtp as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => { resolveRequest = resolve; }),
    );
    const { getByTestId } = renderScreen();

    fireEvent.changeText(getByTestId('phone-input'), '9876543210');
    fireEvent.press(getByTestId('send-otp-button'));

    await waitFor(() => {
      expect(getByTestId('send-otp-button').props.accessibilityState?.disabled).toBe(true);
    });

    resolveRequest({ otp_sent: true });
  });
});
