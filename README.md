# Task D.2 — Match-Results & Fare-Quote Screen

Drop the `src/` folder in this zip into the root of `cargolink-frontend/`,
overwriting the paths below. Directory structure matches the repo exactly.

## New files
- `src/api/pricing.ts` + `src/api/pricing.test.ts`
- `src/components/MatchCard.tsx` + `.test.tsx`
- `src/components/FareBreakdown.tsx` + `.test.tsx`
- `src/screens/shipper/FareQuoteScreen.tsx` + `.test.tsx`
- `src/screens/shipper/MatchResultsScreen.test.tsx`
- `src/screens/shipper/TrackingScreen.tsx` (Cluster E placeholder stub —
  registered now only so FareQuoteScreen's post-accept navigate() call has
  a real destination; Cluster E replaces the body entirely)
- `src/utils/formatters.ts` (currency/distance formatting helpers)
- `src/types/jest-native.d.ts` (fixes a pre-existing gap: jest-native's
  custom matchers, e.g. `toHaveTextContent`, were never wired into `tsc`'s
  type-check scope — no test in the repo used them before this task)

## Modified files
- `src/api/loads.ts` — added `getMatches()` / `acceptMatch()`
- `src/api/loads.test.ts` — extended with tests for the above
- `src/state/types.ts` — replaced the A.2 placeholder `MatchResult` /
  `FareQuote` / `AcceptedMatch` shapes with the real D.2 contract shapes
- `src/state/loadStore.ts` — extended with the full matches/quote/accept
  lifecycle state (`matchesLoadId` cache pointer, `isLoadingQuote`,
  `quoteError`, `isAccepting`, `acceptError`, `invalidateMatches()`, etc.)
- `src/navigation/types.ts` — added `FareQuoteScreen` and `Tracking` routes
  to `ShipperStackParamList`
- `src/navigation/ShipperStack.tsx` — registered `FareQuoteScreen` and the
  `Tracking` stub; also registers `Home`/`ProfileScreen` (real components
  from earlier clusters that the stack was never updated to reference —
  fixed here since D.2 needed a working stack to navigate within)

## Verified before packaging
- `npx tsc --noEmit` — clean on every file above
- `npx eslint` (using the repo's existing `.eslintrc.js`) — clean, aside
  from the repo-wide `no-color-literals` / `sort-styles` convention gap
  that's already present throughout D.1/C.2's existing files (systemic,
  not introduced here — see chat for details)
- `npx jest` — full repo suite: 133/139 passing, same 5 pre-existing
  failures as before this task (Cluster C integration debt, unrelated to
  D.2), zero regressions
