# C.1 migration notes

I could not reach `cargolink-org/cargolink-frontend` (GitHub blocks
automated tree access to it, and it doesn't surface as a public repo in
search — it's likely private). Everything under `src/` and `__tests__/`
here is a complete, ready-to-drop-in implementation. The five files below
are listed in the task as "modify," and I don't have their real current
contents, so instead of guessing and overwriting, here's exactly what to
change in each, matching the conventions the task spec describes.

## 1. `src/navigation/types.ts`

Add a shared params type and reference it from both stacks:

```ts
export type ProfileScreenParams = { mode?: 'create' | 'edit' } | undefined;

export type ShipperStackParamList = {
  // ...your existing shipper routes...
  ProfileScreen: ProfileScreenParams;
};

export type TransporterStackParamList = {
  // ...your existing transporter routes...
  ProfileScreen: ProfileScreenParams;
};
```

`mode` is optional by design — screens fall back to `authStore.isNewUser`
when it's omitted (e.g. when B.1 navigates in without explicit params).

## 2. `src/navigation/ShipperStack.tsx`

```tsx
import { ShipperProfileScreen } from '../screens/shipper/ProfileScreen';
// ...
<Stack.Screen name="ProfileScreen" component={ShipperProfileScreen} />
```

Register it without a header back button when it's the mandatory
first-time gate, if your stack conditionally hides chrome based on
`authStore.isNewUser` elsewhere — this task doesn't assume a specific
pattern for that, so wire it however the rest of the stack already
handles "can't back out of onboarding."

## 3. `src/navigation/TransporterStack.tsx`

Same as above, importing `TransporterProfileScreen` from
`../screens/transporter/ProfileScreen`.

## 4. `src/screens/auth/OtpEntryScreen.tsx`

Replace the stubbed new-user destination from B.1 with a real
role-based navigation call, e.g.:

```ts
// Before (B.1 stub):
// TODO(C.1): route new users to profile creation once it exists
// navigation.replace('PlaceholderProfileStub');

// After:
const targetScreen = role === 'shipper' ? 'ShipperProfileScreen' : 'TransporterProfileScreen';
navigation.replace(targetScreen, { mode: 'create' });
```

The exact navigator/route names depend on how your root navigator nests
the shipper and transporter stacks — adjust `targetScreen` to match
whatever `RootSwitch` expects.

## 5. `src/state/profileStore.ts`

`src/state/profileStore.ts` in this delivery is a complete
implementation (not a patch) built from the shape A.2 committed to:
`setProfile()`, `profileError`, `isLoadingProfile`, plus
`isShipperProfile`/`isTransporterProfile` type guards the screens use to
narrow the profile union. If A.2's actual scaffold already has additional
fields or naming, merge rather than replace — the screens only depend on
the five properties/actions named above.

## Assumptions made throughout

- `src/api/client.ts` exports a configured `apiClient` (axios-style,
  `.patch<T>(url, body) => Promise<{ data: T }>`) that already attaches
  auth headers via B.2's interceptor and already know about `MOCK_MODE`.
  `api/profile.ts` doesn't duplicate that switching logic — it stays thin
  per the guide.
- `src/state/authStore.ts` exposes `role: 'shipper' | 'transporter'`,
  `isNewUser: boolean`, and a `setIsNewUser(value: boolean)` action,
  following the same `setX`/`xError`/`isLoadingX` convention as
  `profileStore`.
- State management is Zustand (`create<T>()`), matching the
  `setProfile()`/`profileError`/`isLoadingProfile` naming A.2 specifies.
- Forms use `react-hook-form` with `@hookform/resolvers/zod` — if that
  resolver package isn't already a dependency, add it alongside the
  existing `react-hook-form`/`zod` deps.

If any of these differ from the real files, the fix is localized: adjust
the imports/prop names at the top of `ProfileForm.tsx` and the two
`ProfileScreen.tsx` files — the validation, form UI, and test coverage
underneath don't need to change.
