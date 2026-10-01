# Task G.2 — Admin Dashboard (Web) UI — delivery manifest

Baseline verified on a fresh clone before starting: G.1 applied, 343/343 tests, tsc clean.
Final: 387/387 tests (54 suites), tsc --noEmit clean, `expo export --platform web` bundles.

## Apply
1. Delete: `src/screens/admin/AdminHomeScreen.tsx`
2. Copy the files in this zip over the repo (paths are repo-relative)
3. `npm install` (no new dependencies) then verify: `npx tsc --noEmit && npx jest`

## New
src/api/admin.ts · src/utils/numberFormatting(.test).ts · src/validation/dateRange(.test).ts · src/theme/colors.ts
src/components/AdminWidget.tsx · src/components/IntensityBarList.tsx
src/screens/admin/{DashboardOverview,RoutesHeatmap,RevenueView,TransporterLeaderboard,AdminScreenShell}.tsx (+ tests for the four screens)
src/screens/admin/useAdminQuery.ts · src/navigation/AdminStack.test.tsx

## Modified
src/navigation/AdminStack.tsx · src/navigation/types.ts (appended AdminStackParamList)
src/navigation/__tests__/RootSwitch.test.tsx · README.md (G.2 section)

## Deviations / notes
- Co-located tests, not the spec's top-level tests/ tree (repo convention).
- No charting library (Recharts is DOM-only); RN View bars. Documented in README.
- Lint: no new categories; +8 no-explicit-any in the four screen tests (existing category).
- Open contract items for Dinesh: see README "Assumptions flagged (G.2)".
