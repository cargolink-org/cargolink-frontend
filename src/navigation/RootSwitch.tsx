import React from 'react';
import { render, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import RootSwitch from '../../src/navigation/RootSwitch';
import { useAuthStore } from '../../src/state/authStore';

// AuthStack (and, later, the role stacks) are real @react-navigation
// navigators, which require a NavigationContainer ancestor to supply
// navigation context — without it, useNavigationBuilder throws. Screens
// tested in isolation (PhoneEntryScreen.test.tsx, OtpEntryScreen.test.tsx)
// avoid this by receiving mock navigation/route props directly instead of
// rendering through an actual navigator.
function renderRootSwitch() {
  return render(
    <NavigationContainer>
      <RootSwitch />
    </NavigationContainer>,
  );
}

describe('RootSwitch', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().clearSession();
      useAuthStore.setState({ isHydrated: false });
    });
  });

  it('shows the Auth stack when there is no session', async () => {
    const { findByTestId } = renderRootSwitch();
    expect(await findByTestId('phone-entry-screen')).toBeTruthy();
  });

  it('routes a returning user directly into their role stack (no ProfileCreationStub)', async () => {
    act(() => {
      useAuthStore.getState().setSession({
        user: { id: 'u1', role: 'shipper', phone: '9876543210', name: 'Existing User' },
        tokens: { token: 't', refreshToken: 'r' },
        isNewUser: false,
      });
    });

    const { findByText } = renderRootSwitch();
    expect(await findByText(/Shipper stack placeholder/i)).toBeTruthy();
  });

  it('routes a new user to the ProfileCreationStub instead of the role stack', async () => {
    act(() => {
      useAuthStore.getState().setSession({
        user: { id: 'u2', role: 'shipper', phone: '9000000001', name: null },
        tokens: { token: 't', refreshToken: 'r' },
        isNewUser: true,
      });
    });

    const { findByTestId } = renderRootSwitch();
    expect(await findByTestId('profile-creation-stub')).toBeTruthy();
  });

  it('falls back to the Auth stack for an invalid/missing role rather than crashing', async () => {
    act(() => {
      // Simulate a corrupted session object slipping past setSession's type
      // guard (defensive edge case named in Task A.1's spec).
      useAuthStore.setState({
        isAuthenticated: true,
        role: undefined as any,
        isNewUser: false,
      });
    });

    const { findByTestId } = renderRootSwitch();
    expect(await findByTestId('phone-entry-screen')).toBeTruthy();
  });
});
