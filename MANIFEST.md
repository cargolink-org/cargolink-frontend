# CargoLink Frontend — Cluster F Delivery Manifest (Tasks F.1 + F.2)

**Cluster F (Import-Export UI & Notifications) — Task F.1: Document
Checklist UI, Checkpoint Timeline UI, Container Screen. Task F.2:
Notification Inbox / Preferences Screen.**

This delivery was built and verified directly against a fresh clone of
`https://github.com/cargolink-org/cargolink-frontend` (branch: `main`).
**On cloning, the real repo only had Task E.2 applied — F.1 had not been
applied yet**, despite having been fully built and delivered as its own
zip in a prior session. Rather than build F.2 on a stale baseline that
would conflict with F.1's own eventual application on several shared
files (`navigation/types.ts`, both `*Stack.tsx` files,
`utils/errorMessages.ts`, `utils/formatters.ts`), F.1 was reconstructed
in full in this session, verified against the same 303/38 passing state
it originally reported, and F.2 was then built on top. **This zip
supersedes any standalone F.1-only zip — apply this one instead, not
both.**

No push credentials were available for this repo in this session, so
integration is via this zip — the same delivery mechanism used for every
task so far.

**Baseline before this session**: after deleting 3 stale leftover test
files (same housekeeping gap noted, but not yet applied, in E.1's and
E.2's own manifests), 269/269 tests passing across 32 suites, `tsc
--noEmit` clean.

**After this delivery (F.1 + F.2 combined)**: **322/322 tests passing
across 44 suites**, `tsc --noEmit` clean. See `README.md` (included in
this zip, replaces the current one) for full delivery notes per task,
including F.2's notification-endpoint contract gap — the single largest
open item flagged across Cluster F so far.

---

## Step 1 — Delete these files first

```
rm src/screens/shipper/ProfileForm.test.tsx
rm src/screens/transporter/ProfileForm.test.tsx
rm src/validation/ProfileScreen.test.tsx
```

(If already deleted, this step is a no-op.)

## Step 2 — Copy these files in (overwrite existing)

All paths are relative to `frontend/`.

**New files:**
```
src/api/checkpoints.ts
src/api/notifications.ts
src/components/NotificationBadge.tsx
src/components/NotificationBadge.test.tsx
src/components/Timeline.tsx
src/components/Timeline.test.tsx
src/screens/shared/CheckpointTimelineScreen.tsx
src/screens/shared/CheckpointTimelineScreen.test.tsx
src/screens/shared/ContainerDetailsScreen.tsx
src/screens/shared/ContainerDetailsScreen.test.tsx
src/screens/shared/DocumentChecklistScreen.tsx
src/screens/shared/DocumentChecklistScreen.test.tsx
src/screens/shared/NotificationInboxScreen.tsx
src/screens/shared/NotificationInboxScreen.test.tsx
src/screens/shared/NotificationPreferencesScreen.tsx
src/screens/shared/NotificationPreferencesScreen.test.tsx
src/screens/shipper/ShipperHomeScreen.test.tsx
src/screens/transporter/TransporterHomeScreen.test.tsx
src/services/notifications.ts
src/services/notifications.test.ts
src/utils/checkpointTimeline.ts
src/utils/checkpointTimeline.test.ts
src/utils/shipmentDocuments.ts
src/utils/shipmentDocuments.test.ts
src/validation/checkpointUpdateSchema.ts
```

**Modified files (overwrite in place):**
```
README.md
src/api/documents.ts
src/components/DocumentStatusBadge.tsx
src/navigation/ShipperStack.tsx
src/navigation/TransporterStack.tsx
src/navigation/types.ts
src/screens/shipper/ShipperHomeScreen.tsx
src/screens/shipper/TrackingScreen.tsx
src/screens/shipper/TrackingScreen.test.tsx
src/screens/transporter/TrackingScreen.tsx
src/screens/transporter/TrackingScreen.test.tsx
src/screens/transporter/TransporterHomeScreen.tsx
src/state/loadStore.ts
src/state/notificationStore.ts
src/state/types.ts
src/state/vehicleStore.ts
src/utils/errorMessages.ts
src/utils/formatters.ts
```

## Step 3 — Install / rebuild

No new dependencies were added in either task and no native modules were
touched. **No `expo prebuild` / native rebuild is needed.**

```
cd frontend
npm install   # optional — no new deps, but harmless to run
```

## Step 4 — Verify

```
npm test              # expect: 44 suites, 322 tests, all passing
npx tsc --noEmit       # expect: no output (clean)
npx eslint . --ext .ts,.tsx   # expect: only the pre-existing no-color-literals/
                               # sort-styles pattern on files this delivery
                               # touches — verified by filtering lint output
                               # to just this delivery's file list; see
                               # README.md
```

## What this delivery does NOT include (see README.md for full detail)

- **F.2's notification-endpoint/schema gap, unresolved**: zero REST
  endpoints for notifications exist anywhere in the technical spec, and
  no `read`/`read_at` column is defined on the `notifications` table
  despite this task requiring both. Every route in `api/notifications.ts`
  is inferred and flagged. This is the single largest open contract item
  across all of Cluster F so far — surface it to Dinesh first.
- **F.1's three previously-flagged items, still unresolved**: the
  checkpoint `status` value set, the missing containers endpoint, and the
  shipment-document/vehicle-document route path collision.
- **F.2 does not implement push/local notification handling** —
  `services/notifications.ts` is deliberately scoped to a list-refresh
  helper only; see its top-of-file note for why no `expo-notifications`
  (or similar) dependency was added.
- **`DocumentChecklistScreen` still has no client-side source for the
  accepted load's `cargoType`** (F.1, carried over unchanged) —
  architecturally fine as-is; see README.md.
- Cluster E's still-outstanding items are unchanged: E.1's performance
  spike and E.2's manual device-test matrix both still require physical
  hardware unavailable in any implementation session so far.
