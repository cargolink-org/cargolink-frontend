import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ProfileForm } from '../../src/components/ProfileForm';

describe('ProfileForm - shipper role', () => {
  it('defaults to the individual segment and updates the label when switching to business', () => {
    render(<ProfileForm role="shipper" onSubmit={jest.fn()} />);

    expect(screen.getByText('Full name')).toBeTruthy();

    fireEvent.press(screen.getByTestId('shipper-type-business'));

    expect(screen.getByText('Company name')).toBeTruthy();
    expect(screen.getByText('GSTIN')).toBeTruthy();
  });

  it('blocks submission and shows an error when a business shipper omits the GSTIN', async () => {
    const onSubmit = jest.fn();
    render(<ProfileForm role="shipper" onSubmit={onSubmit} />);

    fireEvent.press(screen.getByTestId('shipper-type-business'));
    fireEvent.changeText(screen.getByTestId('shipper-name-input'), 'Acme Logistics Pvt Ltd');
    fireEvent.press(screen.getByTestId('profile-submit-button'));

    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });

  it('submits valid shipper values', async () => {
    const onSubmit = jest.fn();
    render(<ProfileForm role="shipper" onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('shipper-name-input'), 'Asha Patel');
    fireEvent.press(screen.getByTestId('profile-submit-button'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ shipperType: 'individual', name: 'Asha Patel' })
      )
    );
  });

  it('renders a passed-in submit error', () => {
    render(<ProfileForm role="shipper" onSubmit={jest.fn()} submitError="Network error, try again" />);
    expect(screen.getByTestId('profile-submit-error')).toBeTruthy();
  });
});

describe('ProfileForm - transporter role', () => {
  it('shows the license input and a read-only rating placeholder when no rating exists yet', () => {
    render(<ProfileForm role="transporter" onSubmit={jest.fn()} ratingAvg={null} />);

    expect(screen.getByTestId('transporter-license-input')).toBeTruthy();
    expect(screen.getByText('Not yet available')).toBeTruthy();
  });

  it('displays a populated rating_avg read-only', () => {
    render(<ProfileForm role="transporter" onSubmit={jest.fn()} ratingAvg={4.6} />);
    expect(screen.getByText('4.6 / 5.0')).toBeTruthy();
  });

  it('submits a valid license number', async () => {
    const onSubmit = jest.fn();
    render(<ProfileForm role="transporter" onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('transporter-license-input'), 'MH-14-2024-00123');
    fireEvent.press(screen.getByTestId('profile-submit-button'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ licenseNumber: 'MH-14-2024-00123' }))
    );
  });

  it('blocks submission for a too-short license number', async () => {
    const onSubmit = jest.fn();
    render(<ProfileForm role="transporter" onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('transporter-license-input'), 'AB1');
    fireEvent.press(screen.getByTestId('profile-submit-button'));

    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });
});
