# Task E.1 — Drop-in Delivery Manifest

Extract this zip's contents into your `frontend/` directory, overwriting
matching paths. All paths below are relative to `frontend/`.

See `README.md` (root of this zip) for the full explanation of what
changed and why — this manifest is just the mechanical apply-instructions.

---

## 1. DELETE these files first

A zip can't represent a file deletion, so do this step manually before
copying anything in. These three files were consolidated/relocated (see
README's "Pre-existing gaps fixed" section for why):

```
rm src/screens/shipper/ProfileForm.test.tsx
rm src/screens/transporter/ProfileForm.test.tsx
rm src/validation/ProfileScreen.test.tsx
```

(`src/validation/` will end up empty after this — that's fine, it only
ever contained this one misplaced file.)

## 2. Copy in every file from this zip

Overwrite-copy everything else in this zip into `frontend/`, preserving
directory structure. That's:

**Modified (16 existing files):**
```
README.md
app.config.ts
package.json
package-lock.json
src/navigation/RootSwitch.tsx
src/navigation/TransporterStack.tsx
src/navigation/__tests__/RootSwitch.test.tsx
src/navigation/types.ts
src/screens/shipper/FareQuoteScreen.test.tsx
src/screens/shipper/FareQuoteScreen.tsx
src/screens/shipper/MatchResultsScreen.test.tsx
src/screens/shipper/MatchResultsScreen.tsx
src/screens/shipper/TrackingScreen.tsx
src/screens/transporter/TransporterHomeScreen.tsx
src/state/authStore.ts
src/state/types.ts
src/utils/formatters.ts
```

**New (18 files):**
```
PERFORMANCE_SPIKE_TRACKING.md
__mocks__/@rnmapbox/maps.tsx
src/api/tracking.test.ts
src/api/tracking.ts
src/components/EtaBadge.test.tsx
src/components/EtaBadge.tsx
src/components/MapMarker.test.tsx
src/components/MapMarker.tsx
src/components/ProfileForm.test.tsx
src/mocks/simulatedRoute.ts
src/screens/shipper/ProfileScreen.test.tsx
src/screens/shipper/TrackingScreen.test.tsx
src/screens/transporter/TrackingScreen.test.tsx
src/screens/transporter/TrackingScreen.tsx
src/services/sockets.test.ts
src/services/sockets.ts
src/state/trackingStore.test.ts
src/utils/formatters.test.ts
```

## 3. Install and rebuild natively

```
npm install
npx expo prebuild
npx expo run:android   # or run:ios
```

The `npm install` step is required — `package.json`/`package-lock.json`
in this zip add `@rnmapbox/maps`, `socket.io-client`,
`expo-document-picker`, `expo-image-picker` as runtime deps, and
`eslint`/`@typescript-eslint/*`/`eslint-plugin-react*`/`prettier` as dev
deps (the lint toolchain `.eslintrc.js` already referenced but was never
actually installed).

The `expo prebuild` + native run step is required specifically because
this is the first task to exercise `@rnmapbox/maps`' native binding (D.1
only used its REST geocoding API) — a plain Metro/JS reload is not
enough.

## 4. Verify

```
npx jest            # expect 211/211 passing, 30/30 suites
npx tsc --noEmit     # expect clean
npx eslint . --ext .ts,.tsx   # expect only the pre-existing, documented
                               # no-color-literals/sort-styles pattern and
                               # the pre-existing no-explicit-any-in-tests
                               # pattern — see README for detail
```

## 5. Outstanding — not covered by this package

Run the low-end Android performance spike per
`PERFORMANCE_SPIKE_TRACKING.md` — it's a filled-out template, not yet
executed (requires physical/emulator hardware this build session didn't
have access to).
