# CargoLink — Frontend (Task A.1)

App-shell scaffolding: role-based root navigation with two structurally
separate stacks (Shipper, Transporter) plus a gated Admin stack, per the
Frontend Implementation Guide.

## What's here

```
frontend/
├── src/
│   ├── navigation/
│   │   ├── RootSwitch.tsx        # role-based root router (no business logic)
│   │   ├── AuthStack.tsx
│   │   ├── ShipperStack.tsx      # own bottom-tab navigator
│   │   ├── TransporterStack.tsx  # own bottom-tab navigator
│   │   ├── AdminStack.tsx
│   │   ├── types.ts              # typed param lists for every stack
│   │   └── __tests__/RootSwitch.test.tsx
│   ├── screens/
│   │   ├── auth/ shipper/ transporter/ admin/   # placeholder screens
│   │   └── shared/                              # empty on purpose
│   ├── state/authStore.ts        # minimal typed stub — full store is Task A.2
│   ├── theme/                    # folder scaffold only
│   └── utils/                    # folder scaffold only
├── App.tsx
├── app.config.ts
├── babel.config.js
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
└── package.json
```

## Setting this up locally

This was generated in a sandboxed environment with no network access, so
none of the following could actually be run here — you'll need to do this
once on your machine:

```bash
cd frontend
npm install
# Recommended: let Expo pin RN-compatible dependency versions
npx expo install --check

# Generates the native ios/ and android/ folders (bare/dev-client workflow)
npx expo prebuild

npx expo run:ios      # or: npx expo run:android
npm run typecheck
npm run lint
npm test
```

The dependency versions in `package.json` are current-as-of-training
Expo SDK 51 / RN 0.74 pins — run `npx expo install --check` after
`npm install` to have Expo correct any that have drifted since.

## Trying each RootSwitch branch manually

Edit `MOCK_SESSION` near the top of `src/state/authStore.ts`:

```ts
const MOCK_SESSION = { role: 'shipper' as UserRole, token: 'mock-token' };
```

Set `role` to `'shipper'`, `'transporter'`, `'admin'`, or leave the whole
constant `null` for the logged-out case. `npm test` exercises all five
branches (including a corrupted/invalid role) without needing this.

## Notes / assumptions made beyond the literal file list

- `src/navigation/AuthStack.tsx` was added even though it wasn't in the
  task's explicit "Files to Create" list — `RootSwitch` needs an actual
  Auth *stack* (not just a bare screen) to mount, consistent with "mounts
  exactly one of: Auth stack, ShipperStack, TransporterStack, AdminStack."
- `jest.config.js` and `.eslintrc.js` / `.prettierrc` were added to satisfy
  the task's own testing and lint requirements, even though only
  `babel.config.js`/`tsconfig.json`/`package.json` were listed under
  "Files to Modify."
- `react-native-reanimated/plugin` was **left out** of `babel.config.js`:
  neither native-stack nor bottom-tabs need it, and adding the plugin
  without the package installed would break the build. Add it later only
  if a drawer navigator or custom transitions pull reanimated in.
