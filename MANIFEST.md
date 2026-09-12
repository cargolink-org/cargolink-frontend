# CargoLink Frontend — Task E.2 Delivery Manifest

**Cluster E (Live Tracking & Background Location) — Task E.2: Background
Location Task (Throttled, Transporter Side)**

This delivery was built and verified directly against a fresh clone of
`https://github.com/cargolink-org/cargolink-frontend` (branch: `main`),
starting from Task E.1's already-merged state. No push credentials were
available for this repo in this session, so integration is via this
zip — the same delivery mechanism used for E.1.

**Baseline before this task**: 211/211 tests passing, `tsc --noEmit`
clean — confirmed by actually cloning and running the suite, not assumed.
One housekeeping note: E.1's own `MANIFEST.md` step 1 (delete 3 stale
files) had not actually been applied in the real repo yet. Applied it as
part of establishing a clean baseline (see Step 1 below) — this is
finishing E.1's already-approved cleanup, not new scope creep from E.2.

**After this task**: 269/269 tests passing across 32 suites, `tsc
--noEmit` clean. See `README.md` (included in this zip, replaces the
current one) for full delivery notes, known platform limitations, and
what's still genuinely not done (manual on-device testing — see there).

---

## Step 1 — Delete these files first

These three files are leftover, broken duplicates from an earlier
no-repo-access session, already documented as a known issue in E.1's own
manifest, but never actually removed from the real repo:

```
rm src/screens/shipper/ProfileForm.test.tsx
rm src/screens/transporter/ProfileForm.test.tsx
rm src/validation/ProfileScreen.test.tsx
```

(If you've already deleted these — some earlier attempt at applying E.1's
manifest may have partially landed — this step is a no-op; `git status`
will simply show nothing to remove.)

## Step 2 — Copy these files in (overwrite existing)

All paths are relative to `frontend/`. Every file below is either brand
new or a modification of an existing E.1 file — copy-and-overwrite is
safe for all of them.

```
README.md                                              (replaces E.1's — now covers E.1 + E.2)
app.config.ts                                           (modified — adds expo-location plugin)
package.json                                             (modified — adds expo-location, expo-task-manager)
package-lock.json                                         (modified — lockfile for the above)
__mocks__/expo-location.ts                                 (new)
__mocks__/expo-task-manager.ts                               (new)
src/api/tracking.ts                                          (modified — adds postTrackingPingBatch)
src/api/tracking.test.ts                                      (modified)
src/components/LocationPermissionPrompt.tsx                    (new)
src/components/LocationPermissionPrompt.test.tsx                 (new)
src/services/location.ts                                          (new — the core deliverable)
src/services/location.test.ts                                       (new)
src/services/sockets.ts                                              (modified — adds emitLocationUpdate)
src/services/sockets.test.ts                                          (modified)
src/screens/transporter/TrackingScreen.tsx                             (modified — Start/End Trip UI)
src/screens/transporter/TrackingScreen.test.tsx                          (modified)
src/state/types.ts                                                       (modified — adds LocationEmitPayload)
```

## Step 3 — Install

```
cd frontend
npm install
```

This pulls in the two new runtime dependencies declared in
`package.json`/`package-lock.json`: `expo-location@~17.0.1` and
`expo-task-manager@~11.8.2` (both confirmed Expo SDK 51-compatible via
their published peer dependencies).

## Step 4 — Native rebuild required

Same category of step as E.1's `@rnmapbox/maps` config-plugin entry:
`app.config.ts` gained a new `expo-location` config-plugin entry (adds
the iOS `NSLocationAlwaysAndWhenInUseUsageDescription` +
`UIBackgroundModes: ['location']`, and Android's
`ACCESS_BACKGROUND_LOCATION` + `FOREGROUND_SERVICE`/
`FOREGROUND_SERVICE_LOCATION` permissions). **A plain Metro/JS reload is
NOT sufficient** — this links new native modules and changes native
manifest/plist entries:

```
npx expo prebuild --clean
npx expo run:ios      # or: npx expo run:android
```

## Step 5 — Verify

```
npm test              # expect: 32 suites, 269 tests, all passing
npx tsc --noEmit       # expect: no output (clean)
npx eslint . --ext .ts,.tsx   # expect: only the pre-existing no-color-literals/
                               # sort-styles pattern + a handful of pre-existing
                               # no-explicit-any/no-unused-vars in files this
                               # task never touched (see README.md's "What this
                               # delivers" section in both the E.1 and E.2 parts
                               # for exactly which pattern is expected and why)
```

## What this task does NOT include (see README.md for the full list)

- **Manual on-device testing has not been run** — no physical iOS/Android
  device was available in this implementation session. This is a hard
  requirement per the task's own acceptance criteria, same category as
  E.1's still-unrun performance spike. Run both together on the same
  physical devices before considering Cluster E fully complete — see
  README.md's "Known platform limitations" and "Next steps" sections.
- No backend `location_update` Socket.io handler exists yet to receive
  real transmissions — `sockets.ts`'s `emitLocationUpdate` treats
  MOCK_MODE as always-accepted, per Sprint 4's scope (GPS acquisition is
  real; the transmission target is mocked). This is expected, not a gap —
  see `sockets.ts`'s and `location.ts`'s doc comments.
- The `POST /tracking/ping` REST-fallback endpoint's exact route/shape is
  a best-guess pending Dinesh's OpenAPI contract confirmation (documented
  as such directly in `api/tracking.ts`).
