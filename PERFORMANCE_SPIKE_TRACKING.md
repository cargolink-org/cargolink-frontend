# Live-Tracking Screen — Low-End Android Performance Spike (Task E.1)

## Status: NOT YET EXECUTED — template only

**This is the one acceptance criterion of Task E.1 that could not be completed
in this session, and it should not be treated as done.** The task spec is
explicit that this spike requires a real, physical low-end Android device
and a running dev-client build — neither is available in the environment
this implementation session ran in (a sandboxed container with no Android
runtime, no emulator with GPU/sensor support, and no physical hardware).
Fabricating frame-rate or memory numbers here would be worse than leaving
this incomplete: it would give false confidence about the single
highest-risk screen in the frontend track. **Keval (or whoever picks this
up) needs to actually run the steps below on a real device before Task E.1
is considered fully done**, per its own acceptance criteria.

Everything else in Task E.1 — the screens, `sockets.ts`, the reconnect/
backoff state machine, the simulated-route mock emitter, and the full
automated test suite — is implemented, tested, and passing. This spike is
the one manual, hardware-dependent step layered on top.

---

## What to run

1. `expo prebuild` (if not already done) then `expo run:android` targeting
   a physical low-end Android device connected via USB, or a same-spec
   emulator profile if no physical device is available (note clearly in
   the results which one was used — an emulator is a second-choice
   substitute, not equivalent).
2. Sign in as a shipper (mock mode is fine — `MOCK_MODE` should default to
   `true` still at this point in the timeline) and get to
   `TrackingScreen` (shipper variant) via the normal
   Load → Match → Quote → Accept flow. Alternatively, sign in as a
   transporter and tap "Start trip (dev)" on the transporter home screen
   — a direct, no-setup-required entry point built for exactly this kind
   of manual testing (see `TransporterHomeScreen.tsx`).
3. Let the simulated route run for at least 5 real minutes continuously —
   long enough to observe more than the first handful of position ticks
   (the mock emitter cycles through ~8 points on a ~7s cadence and loops).
4. While it runs, use Android's on-device performance overlay (Settings →
   Developer options → "Profile GPU rendering" set to "On screen as bars",
   or `adb shell dumpsys gfxinfo <package> framestats` from a host
   machine) to observe frame timing, and Android Studio's Profiler (or
   `adb shell dumpsys meminfo <package>`) to observe memory over the
   session.
5. During the session, deliberately exercise the failure-path UI too, not
   just the happy path — there's no in-app button for this yet, so the
   easiest way is to temporarily background the app for ~30s (airplane
   mode toggle also works) and confirm the "Reconnecting…"/"Last seen"
   states render distinctly and the app recovers cleanly on resume, while
   watching the same frame/memory metrics through that transition.

## What to record

| Field | Value |
|---|---|
| Device model | *(fill in)* |
| Android OS version | *(fill in)* |
| Physical device or emulator? | *(fill in — flag emulator results as a lower-confidence substitute)* |
| Dev-client build date/commit | *(fill in)* |
| Session length observed | *(fill in, minutes)* |
| Dropped/janky frames during sustained position updates | *(fill in — e.g. "profile GPU rendering bars stayed under the 16ms line throughout" or note any spikes and when they occurred)* |
| Memory at start / after 5 min / trend | *(fill in — flat, slow climb, or a leak pattern)* |
| Behavior during a simulated disconnect (backgrounding the app) | *(fill in — did the reconnect/backoff UI render correctly, any visual corruption on resume)* |
| Any visible jank tied specifically to the native marker update (vs. general app jank) | *(fill in)* |
| Verdict | *(fill in — acceptable as-is / needs optimization, and if so where)* |

## Context for whoever runs this

- The screen deliberately uses `@rnmapbox/maps`' native `MarkerView` (not
  `PointAnnotation`, and not any WebView-based map) specifically to avoid
  the bridge-related jank named as a risk in the technical spec — see the
  top-of-file comment in `src/components/MapMarker.tsx` for the reasoning.
- The receiving side matches the confirmed 5-10s throttle exactly — no
  client-side animation/interpolation between ticks. If jank shows up
  anyway, it's more likely coming from something else on the screen (the
  status-strip re-render, the ETA badge, or React Navigation's own
  overhead) than from the marker update itself; the `trackingStore`
  selector hooks (`useTrackingPosition`, `useTrackingConnectionState`,
  `useTrackingLastUpdatedAt`) are already scoped narrowly so unrelated
  screen elements shouldn't re-render on every tick — worth confirming
  that's actually holding up on real hardware, not just in theory.
- If jank IS observed, the first things to check before writing new code:
  whether Hermes is enabled, whether this is a debug or release build
  (debug builds are meaningfully slower and not representative), and
  whether `MapMarker`'s `React.memo` comparator is actually preventing
  re-renders (a quick `console.log` inside `MapMarkerBase`, `__DEV__`-gated,
  would confirm render frequency without violating the no-position-logging
  convention).

## Once this is filled in

Move this file's findings into wherever Kishor's Sprint 4 documentation
set expects them (per the Modular Execution Plan, this is a joint
deliverable shared into the Database/Docs track's Sprint 4 output, not
something that stays solely in the frontend repo long-term).
