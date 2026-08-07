// -----------------------------------------------------------------------------
// STUB — Task A.1 (RootSwitch scaffolding) only.
//
// This exists purely so RootSwitch has a concrete, typed shape to read and
// can be built/tested before real auth exists. It reads NOTHING from real
// secure storage and makes NO network calls.
//
// TODO(A.2): Replace with the real store (Zustand/Redux Toolkit), wired to
// `secureStorage.ts` (Task B.2) and eventually `POST /auth/otp/verify` once
// the OpenAPI contract is frozen (Week 2). Do not build further app logic
// on top of this file expecting it to be the final shape.
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';

export type UserRole = 'shipper' | 'transporter' | 'admin';

export interface AuthState {
  role: UserRole | null;
  token: string | null;
  isHydrated: boolean;
}

const initialAuthState: AuthState = {
  role: null,
  token: null,
  isHydrated: false,
};

/**
 * Edit this constant during manual development to exercise each
 * RootSwitch branch (Auth / Shipper / Transporter / Admin). Leave it
 * `null` for the "logged out" case.
 *
 *   const MOCK_SESSION = { role: 'shipper' as UserRole, token: 'mock-token' };
 */
const MOCK_SESSION: { role: UserRole | null; token: string | null } | null = null;

function isValidRole(value: unknown): value is UserRole {
  return value === 'shipper' || value === 'transporter' || value === 'admin';
}

/**
 * Simulates an async storage read with no real I/O and no network calls,
 * so the splash → route decision still resolves asynchronously the way it
 * will once B.2's real secureStorage read lands.
 */
async function readStubbedSession(): Promise<{ role: UserRole | null; token: string | null }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_SESSION ?? { role: null, token: null }), 0);
  });
}

export function useAuthStore(): AuthState {
  const [state, setState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    let cancelled = false;

    readStubbedSession()
      .then((session) => {
        if (cancelled) return;

        // A corrupted/unreadable/invalid-role session is treated as no
        // session — never crash the app here.
        if (!session || !isValidRole(session.role) || !session.token) {
          setState({ role: null, token: null, isHydrated: true });
          return;
        }

        setState({ role: session.role, token: session.token, isHydrated: true });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ role: null, token: null, isHydrated: true });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
