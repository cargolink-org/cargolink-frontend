# CargoLink Frontend — Task G.1 Delivery Manifest

**Task:** G.1 — Post-Trip Rating UI
**Cluster:** G (Ratings & Admin Dashboard)
**Baseline verified against:** fresh clone of `cargolink-org/cargolink-frontend`, Cluster F (F.1 + F.2) confirmed applied — 322/322 tests passing, 44 suites, `tsc --noEmit` clean, no stale files found this session.
**Final state after this task:** 343/343 tests passing, 47 suites, `tsc --noEmit` clean, zero new ESLint violation categories.

## Application instructions

Established pattern: delete → copy → `npm install` → `expo prebuild` → verify.

1. Copy every file below into the matching path under `frontend/` in the real repo, overwriting the 9 modified files and adding the 9 new files.
2. `npm install` (no new dependencies were added — this is a precaution, not a requirement).
3. `npx tsc --noEmit` — should be clean.
4. `npx jest` — should show 47 suites / 343 tests passing.
5. `npx eslint . --ext .ts,.tsx` — should show only the pre-existing `react-native/no-color-literals` and `@typescript-eslint/no-explicit-any` categories (counts will rise slightly from this task's new styled components and `as any` test mocks — no new categories).

## New files (9)

| File | Purpose |
|---|---|
| `src/validation/ratingSchema.ts` | Zod schema: score 1–5 required, comment ≤500 chars optional. Defense-in-depth (UI already constrains both). |
| `src/api/ratings.ts` | `submitRating()` — `POST /ratings`. Mirrors `api/checkpoints.ts`'s single-function/inline-`MOCK_MODE`-branch shape. Exports `MOCK_DUPLICATE_RATING_LOAD_ID` sentinel for exercising the duplicate-rejection path in mock mode/tests. |
| `src/components/StarInput.tsx` | Reusable 1–5 star control, prop-driven (`value`, `onChange`, `readOnly`). Screen-reader announces "`N` out of 5 stars, selected". |
| `src/components/RatingForm.tsx` | **Not in the task spec's own file list** — added anyway, mirroring the `ProfileForm.tsx` (Task C.1) precedent: the shared star/comment/submit/read-only logic used by both role screens, so it isn't duplicated across them. See its top-of-file comment. |
| `src/screens/shipper/RatingScreen.tsx` | Thin wrapper: route params, `loadStore`, the `submitRating` call. Shipper rates the transporter. |
| `src/screens/transporter/RatingScreen.tsx` | Same shape, transporter rates the shipper. |
| `src/components/StarInput.test.tsx` | 6 tests: tap-sets-value, correct-value-per-star, accessibility announcements (selected/unselected), read-only non-interactivity, `accessibilityState.selected` per star. |
| `src/screens/shipper/RatingScreen.test.tsx` | 7 tests: submittable-mode render, 1–5 validation block, duplicate-guard read-only render, successful submit (payload/store/navigation), submit-failure data preservation, server-side duplicate-rejection message, Skip. |
| `src/screens/transporter/RatingScreen.test.tsx` | Same 7 cases, transporter variant. |

## Modified files (9)

| File | Change |
|---|---|
| `src/state/loadStore.ts` | Added `ratingSubmitted: Record<loadId, {score, comment?}>` map, `setRatingSubmitted` action, `useRatingSubmitted(loadId)` selector hook. No loading/error sibling maps (unlike the F.1 document/checkpoint/container maps) — there's no GET to fetch a rating back in this task's scope, only a POST whose in-flight/error state is screen-local. |
| `src/utils/errorMessages.ts` | Added `RATING_DUPLICATE: 'You have already rated this trip.'` to the `ERROR_MESSAGES` dictionary. |
| `src/navigation/types.ts` | Added `Rating: { loadId: string; rateeId: string }` to both `ShipperStackParamList` and `TransporterStackParamList`. |
| `src/navigation/ShipperStack.tsx` | Registered `RatingScreen` (shipper) as the `Rating` route. |
| `src/navigation/TransporterStack.tsx` | Registered `RatingScreen` (transporter) as the `Rating` route. |
| `src/screens/shipper/TrackingScreen.tsx` | **Not in the task spec's own "Files to Modify" list** — added a "Rate" quick-access button to the existing shipment-details row, navigating to `Rating` with `rateeId: vehicleId`. See rationale below. |
| `src/screens/transporter/TrackingScreen.tsx` | Same addition, `rateeId: loadId` (placeholder — see below). |
| `src/screens/shipper/TrackingScreen.test.tsx` | Extended the existing quick-access test with the new button. |
| `src/screens/transporter/TrackingScreen.test.tsx` | New test for the Rate button's navigation call. |

## Deliberate scope additions beyond the task spec's literal file list

Two files weren't in G.1's own "Files to Create"/"Files to Modify" lists but were added anyway, each documented inline at the point of the decision:

1. **`src/components/RatingForm.tsx`** — the task's own architecture requirements ask for materially the same logic (read-only-vs-submittable render, validation, star input, comment field) in two separate screen files. Duplicating it across both would contradict the project's standing "shared logic over duplicated" principle and the `ProfileForm.tsx` precedent it's modeled on. The two `RatingScreen.tsx` files are thin wrappers around it.
2. **"Rate" quick-access buttons on both `TrackingScreen.tsx` files** — G.1's own "Navigation dependencies" section names TrackingScreen as the typical entry point, and every other Cluster F/G screen so far has been reachable from a real button rather than left registered-but-orphaned (same reasoning F.1 used for its Documents/Checkpoints/Container buttons). Without this, `RatingScreen` would be registered in both stacks but unreachable from anywhere in the running app.

## Open contract items flagged for Dinesh (same category as F.1/F.2's flagged gaps)

This is the most significant open item from this task, larger than F.1/F.2's individually:

**Neither `MatchResult` nor `AcceptedMatch` (`state/types.ts`) — nor anything else in frontend state, on either role's side — carries an actual counterparty `users.id`.** The `ratings` table's `ratee_id` (technical spec §4) is a `users.id` FK, but:

- **Shipper side:** the only counterparty-scoped identifier available anywhere is `vehicle_id` (from the accepted match). This task's own Dependencies section frames this as intentional ("vehicle_id/transporter identity for the shipper's rating flow"), so `vehicleId` is used as `rateeId` — structurally correct as "the identifier this screen forwards," but not verified to be the real `users.id` the backend expects.
- **Transporter side:** there is no shipper-identifying value at all in transporter-side frontend state — not even an imperfect one like `vehicle_id`. This is the same pre-existing gap Task E.1 already flagged for route-line/pickup-destination data ("no data source yet exists on the transporter's session… flagged as a forward-looking integration gap"), now surfacing here too. `loadId` is used as a placeholder `rateeId`; both `RatingScreen.tsx` (transporter) and `api/ratings.ts` treat `rateeId` as an opaque string, so nothing is structurally broken by the placeholder — it simply isn't a real user id yet.

**Suggested resolution to raise with Dinesh:** add an explicit `transporter_id` (and, symmetrically, a `shipper_id` reachable from the transporter's accepted-load state) to the `GET /loads/{id}/matches` and/or `POST /loads/{id}/accept` response shapes, the same way F.1 flagged a schema/endpoint gap and F.2 flagged the missing notifications contract entirely.

Two smaller, already-resolved-by-design items, noted for completeness:
- The task spec's own "Folder Structure" section shows a top-level `tests/` directory mirroring `src/`; the real repo's established convention is co-located `*.test.tsx` files (confirmed via fresh clone — e.g. `components/EtaBadge.test.tsx`, `screens/shared/CheckpointTimelineScreen.test.tsx`). This delivery follows the real repo's convention, not the spec template's.
- The task spec names `errorMessages.ts` for the duplicate-rating message; `api/ratings.ts` follows `api/checkpoints.ts`'s exact established pattern for this (`toApiError(code, status)` thrown, `getErrorMessage(err)` read by the screen) rather than the separate `kind`/`message`-object pattern used by `api/loads.ts`/`api/pricing.ts`, since checkpoints.ts is the closer precedent (single low-surface-area POST action) and the task spec's own wording pointed at `errorMessages.ts` specifically.

## Verification run (this session)

- `tsc --noEmit`: clean
- `jest`: 47 suites / 343 tests passing (up from the Cluster F baseline of 44/322)
- `eslint . --ext .ts,.tsx`: 0 new violation categories. Increases confined to `react-native/no-color-literals` (+13, this task's new inline-hex styles, matching the codebase-wide convention) and `@typescript-eslint/no-explicit-any` (+4, one `as any` navigation/route mock per new/modified test file, matching existing test conventions). `react-native/sort-styles`, `@typescript-eslint/no-unused-vars`, `react/no-unescaped-entities`, `@typescript-eslint/no-var-requires` counts unchanged.
