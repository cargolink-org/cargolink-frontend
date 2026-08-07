import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Mock the auth store so each test can drive a specific role/hydration
// state without touching real (stubbed) storage.
jest.mock('../../state/authStore', () => ({
  useAuthStore: jest.fn(),
}));

import { useAuthStore } from '../../state/authStore';
import { RootSwitch } from '../RootSwitch';

const mockedUseAuthStore = useAuthStore as jest.Mock;

describe('RootSwitch', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the splash/loading state while the session has not hydrated yet', () => {
    mockedUseAuthStore.mockReturnValue({ role: null, token: null, isHydrated: false });

    render(<RootSwitch />);

    expect(screen.getByLabelText('Loading CargoLink')).toBeTruthy();
  });

  it('routes to the Auth placeholder when there is no persisted session', async () => {
    mockedUseAuthStore.mockReturnValue({ role: null, token: null, isHydrated: true });

    render(<RootSwitch />);

    expect(await screen.findByText('Auth — Placeholder')).toBeTruthy();
  });

  it('routes to ShipperStack for a shipper session', async () => {
    mockedUseAuthStore.mockReturnValue({ role: 'shipper', token: 'mock-token', isHydrated: true });

    render(<RootSwitch />);

    expect(await screen.findByText('Shipper Home — Placeholder')).toBeTruthy();
  });

  it('routes to TransporterStack for a transporter session', async () => {
    mockedUseAuthStore.mockReturnValue({
      role: 'transporter',
      token: 'mock-token',
      isHydrated: true,
    });

    render(<RootSwitch />);

    expect(await screen.findByText('Transporter Home — Placeholder')).toBeTruthy();
  });

  it('routes to AdminStack for an admin session', async () => {
    mockedUseAuthStore.mockReturnValue({ role: 'admin', token: 'mock-token', isHydrated: true });

    render(<RootSwitch />);

    expect(await screen.findByText('Admin Home — Placeholder')).toBeTruthy();
  });

  it('treats a corrupted/invalid role as no session and routes to Auth without crashing', async () => {
    mockedUseAuthStore.mockReturnValue({
      role: 'not-a-real-role' as never,
      token: 'mock-token',
      isHydrated: true,
    });

    expect(() => render(<RootSwitch />)).not.toThrow();
    expect(await screen.findByText('Auth — Placeholder')).toBeTruthy();
  });
});
