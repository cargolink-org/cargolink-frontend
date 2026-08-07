<!--
  Append this section to frontend/README.md (Task A.2 requirement:
  document the state-management library decision and its one-time nature).
-->

## State Management

CargoLink's frontend uses **Zustand** for global state management, chosen
in Sprint 1 (Task A.2) over Redux Toolkit for its lower boilerplate — a
better fit for a 3-person team's velocity. This is a **one-time decision**:
do not introduce Redux Toolkit or mix state libraries anywhere in this
codebase.

### Stores (`src/state/`)

| Store | Holds | Notes |
|---|---|---|
| `authStore` | `role`, `token`, `isHydrated`, `isNewUser` | `token` is in-memory only and is never persisted — see the security comment at the top of `authStore.ts`. Only `role`/`isNewUser` are persisted. Real token storage is `services/secureStorage.ts`'s job (Task B.2), not this store's. |
| `profileStore` | Current user's shipper/transporter profile | Populated by `api/profile.ts` (Cluster C). |
| `loadStore` | `draft` (UI state) + `matches`/`quote`/`acceptedMatch` (server-derived), plus `documents`/`checkpoints`/`container` placeholders for Cluster F | Accepting a match clears the draft/matches/quote working state. |
| `trackingStore` | `currentPosition`, `connectionState`, `lastUpdatedAt` | Exposes fine-grained selector hooks (`useTrackingPosition`, etc.) so 5–10s location pings (Cluster E) don't re-render unrelated screens. |
| `notificationStore` | `items`, `unreadCount` | `unreadCount` is always derived from `items`, never tracked separately. |

### Rules

- Stores are **only ever written to** by the `api/` layer or device
  services (`sockets.ts`, `location.ts`) — never call `fetch`/`axios`
  directly from inside a store file.
- Use each store's exported selector hooks (e.g. `useTrackingPosition()`)
  rather than subscribing to the whole store, especially for
  `trackingStore`.
- Never persist raw tokens through a store's own persistence layer.
