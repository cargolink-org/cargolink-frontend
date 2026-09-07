import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import { RootSwitch } from '../RootSwitch';
import { useAuthStore } from '../../state/authStore';

/**
 * Rewritten as part of Task E.1.
 *
 * PREVIOUSLY: this test fully `jest.mock()`'d the `authStore` module as a
 * bare `jest.fn()` hook, and asserted against placeholder text
 * ("Auth — Placeholder", "Admin Home — Placeholder") that no longer
 * exists now that RootSwitch renders the real AuthStack/ShipperStack/
 * TransporterStack/AdminStack. The bare-jest.fn() mock also broke as soon
 * as any transitively-rendered screen needed `useAuthStore.subscribe()`
 * directly (as `services/sockets.ts` does, imported by the tracking
 * screens rendered inside ShipperStack/TransporterStack) — a plain mock
 * function has no `.subscribe` static method the way a real Zustand store
 * does.
 *
 * FIXED: uses the real `authStore` with `setState()` resets between
 * tests, matching this repo's established convention elsewhere
 * (loadStore/vehicleStore tests reset via `setState`, not full-module
 * mocks) — and asserts against what each stack's current initial route
 * actually renders today, rather than guessed placeholder copy. Also
 * drops the old "not hydrated -> loading" case: that check no longer
 * lives in RootSwitch (see RootSwitch.tsx's top comment) — App.tsx awaits
 * `isHydrated` before RootSwitch is ever mounted at all, so RootSwitch
 * itself has nothing to test for that state.
 */

function resetAuthStore() {
  useAuthStore.setState({
    token: null,
    refreshToken: null,
    user: null,
    role: null,
    isNewUser: false,
    isAuthenticated: false,
    isHydrated: true,
    logoutReason: null,
  });
}

function renderRootSwitch() {
  return render(
    <NavigationContainer>
      <RootSwitch />
    </NavigationContainer>
  );
}

describe('RootSwitch', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('routes to AuthStack when there is no authenticated session', async () => {
    renderRootSwitch();

    expect(await screen.findByTestId('phone-input')).toBeTruthy();
  });

  it('routes to ShipperStack for an authenticated shipper session', async () => {
    useAuthStore.setState({ isAuthenticated: true, role: 'shipper' });

    renderRootSwitch();

    expect(await screen.findByText('Shipper Home — Placeholder')).toBeTruthy();
  });

  it('routes to TransporterStack for an authenticated transporter session', async () => {
    useAuthStore.setState({ isAuthenticated: true, role: 'transporter' });

    renderRootSwitch();

    expect(await screen.findByText('Transporter Home — Placeholder')).toBeTruthy();
    // Task E.1's dev-only "Start trip" entry point, proving TransporterStack
    // is a real navigator now and not the old unregistered placeholder.
    expect(screen.getByTestId('start-trip-button')).toBeTruthy();
  });

  it('routes to AdminStack for an authenticated admin session', async () => {
    useAuthStore.setState({ isAuthenticated: true, role: 'admin' });

    renderRootSwitch();

    expect(await screen.findByText('Admin stack placeholder (A.1)')).toBeTruthy();
  });

  it('treats an authenticated session with a missing/invalid role as logged out, without crashing', async () => {
    useAuthStore.setState({ isAuthenticated: true, role: null });

    expect(() => renderRootSwitch()).not.toThrow();
    expect(await screen.findByTestId('phone-input')).toBeTruthy();
  });
});
