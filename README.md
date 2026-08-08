# CargoLink — Frontend Module (Keval)

React Native (Expo, bare/dev-client) frontend for CargoLink. See
`Keval-Frontend-Implementation-Guide.md` in the project docs for the full
task breakdown, sprint plan, and Definition of Done.

## Setup

```
npm install
npm run start      # expo start --dev-client
npm test           # jest
```

## Architecture Decisions

### State Management — Zustand (Task A.2)

Zustand was chosen over Redux Toolkit for this 3-person team's velocity, per
the technical spec's recommendation ("Zustand is lighter if the team is
small"). Rules for every store in `src/state/`:

- One store per domain (`authStore`, `profileStore`, `loadStore`,
  `trackingStore`, `notificationStore`). No cross-store direct mutation.
- Server-derived data is kept separate from pure UI/form-draft state so the
  Sprint 6 mock-to-real API swap only ever touches `src/api/`, never
  `src/state/`.
- High-frequency stores (`trackingStore`) are always consumed via
  fine-grained selector hooks, never the whole store object, to avoid
  re-rendering unrelated screens on every location ping.
- **Auth tokens are held in memory only.** `authStore` is never wrapped in
  Zustand's `persist` middleware. This is a deliberate, non-negotiable
  security constraint — see Task B.2 for how tokens are actually persisted
  across app restarts (`expo-secure-store`, not this store).

### Auth Flow — OTP-first (Task B.1)

- `PhoneEntryScreen` → `POST /auth/otp/request` → `OtpEntryScreen` →
  `POST /auth/otp/verify` → `authStore.setSession(...)`.
- `RootSwitch` reacts to `authStore` state with no additional wiring: once
  `setSession` fires, `isAuthenticated`/`role`/`isNewUser` update in the same
  tick and RootSwitch re-renders into the correct destination.
- New users (per `verify`'s `is_new_user` flag) land on
  `ProfileCreationStub` — a placeholder for Cluster C's real profile
  screens, which don't exist yet. Swap it out in `RootSwitch.tsx` once
  Cluster C ships.
- `src/api/auth.ts` and `src/validation/authSchema.ts` are intentionally
  thin/isolated — these are the two files most likely to need small
  adjustments once `shared/openapi/openapi.yaml` freezes at Week 2. The
  `is_new_user` field on the verify response in particular is a best-guess
  and should be confirmed against the real contract.
- `MOCK_MODE` (in `src/api/auth.ts`, hardcoded `true` for now) gates mock vs.
  real API calls. It will move to an `app.config.ts`/env-driven flag once a
  build config exists; wire the real base URL swap there when Sprint 6
  starts.
- Never log `phone` or `otp` values anywhere in the client, including dev
  builds — this applies to every future auth-adjacent screen, not just
  these two.

## Dependencies Introduced

| Package | Introduced In | Why |
|---|---|---|
| `zustand` | A.2 | Global state management |
| `@react-navigation/native`, `@react-navigation/native-stack` | A.1 (assumed) / used directly in B.1's `AuthStack` | Two-stack role-based navigation |
| `react-hook-form` | B.1 | Form state for Phone/OTP entry (and every future form) |
| `zod` | B.1 | Schema validation (`authSchema.ts`), mirrors OpenAPI request shapes |
| `@testing-library/react-native`, `@testing-library/jest-native` | B.1 | Component/interaction tests for the new screens |

## Testing

`npm test` runs the full Jest suite. B.1 adds coverage for:
- `authSchema` (phone normalization, phone/OTP validation edge cases)
- `PhoneEntryScreen` (validation, submit, navigation, error surfacing)
- `OtpEntryScreen` (auto-submit, session commit, error paths, resend cooldown)
- `OtpInput` (auto-advance, auto-complete, backspace navigation)
- `RootSwitch` (new-user vs. returning-user routing, invalid-role fallback)
- `errorMessages` (known-code mapping, safe fallback, never echoing raw text)
