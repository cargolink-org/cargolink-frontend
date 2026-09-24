import type { VehicleType } from '../validation/vehicleSchema';
import type { DocumentStatus } from './vehicleStore';

export type UserRole = 'shipper' | 'transporter' | 'admin';

export interface AuthUser {
  id: string;
  role: UserRole;
  phone: string;
  name?: string | null;
}

export interface SessionTokens {
  token: string;
  refreshToken: string;
}

export type UserProfile = AuthUser | null;

/**
 * Cargo type options captured on the load-posting form (source doc, Module
 * 4.1) — kept as the single source of truth here rather than duplicated as
 * string literals in the form/validation layer.
 */
export const CARGO_TYPES = ['general', 'fragile', 'hazardous', 'refrigerated'] as const;
export type CargoType = (typeof CARGO_TYPES)[number];

/**
 * A structured, geocoded point — what `LocationPicker` returns and what the
 * backend's `GEOGRAPHY(Point, 4326)` columns expect (task D.1). `label` is
 * the human-readable address/place name shown in the UI; it is never sent
 * on its own in place of `lat`/`lng`.
 */
export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

/**
 * LoadDraft — Task D.1 shape.
 *
 * PREVIOUSLY (A.2 scaffold): `{ pickupLocation?: string; dropoffLocation?:
 * string; cargoType?: string; weightKg?: number; notes?: string }`. Replaced
 * here with the structured shape D.1's `POST /loads` contract needs
 * (`source`/`destination` as coordinates, not free text; `deadline` as an
 * ISO8601 timestamp; an explicit `preferredVehicleType`). No other file in
 * the repo referenced the old shape at the time of this change (verified),
 * so this is a clean replacement rather than a migration.
 */
export interface LoadDraft {
  weightKg?: number;
  cargoType?: CargoType;
  source?: GeoPoint;
  destination?: GeoPoint;
  /** ISO8601 timestamp for the pickup deadline. */
  deadline?: string;
  preferredVehicleType?: VehicleType;
}

/**
 * MatchResult — Task D.2 shape.
 *
 * PREVIOUSLY (A.2 scaffold): `{ vehicleId, transporterId, estimatedFare? }`.
 * Replaced here with the actual `GET /loads/{id}/matches` response shape
 * from the technical spec (draft, pending Week 2 freeze). Field names are
 * kept snake_case, matching the wire contract exactly — same convention as
 * `PostLoadPayload`/`PostLoadResponse` in `api/loads.ts` — since
 * `MatchCard`/`FareBreakdown` render these fields directly and a 1:1 match
 * to the contract minimizes mapping-bug risk. No other file in the repo
 * referenced the old shape at the time of this change (verified).
 */
export interface MatchResult {
  vehicle_id: string;
  distance_km: number;
  capacity_fit: boolean;
  /** Human-readable ETA text as returned by the routing/matching engine
   * (e.g. "24 min") — displayed as-is, no client-side date math. */
  eta: string;
  score: number;
}

/** `GET /pricing/quote` response shape (technical spec, draft). */
export interface FareQuote {
  base_fare: number;
  distance_cost: number;
  surcharge: number;
  total: number;
}

/** `POST /loads/{id}/accept` response shape (technical spec, draft). */
export interface AcceptedMatch {
  match_id: string;
  status: string;
}

/**
 * Per-shipment document types — Task F.1 (source doc Module 4.5a).
 *
 * PREVIOUSLY (A.2 scaffold): a generic `ShipmentDocumentsState` placeholder
 * (`{ invoiceUrl?, ewayBillUrl?, podUrl? }`) that didn't match either the
 * source doc's named checklist or the `shipment_documents` table's
 * `doc_type TEXT` column. Replaced here with the actual checklist from
 * Module 4.5a. Deliberately DISTINCT from `DOCUMENT_TYPES` in
 * `validation/documentUploadSchema.ts` (task C.2's vehicle/compliance
 * documents, `documents` table, keyed by `owner_id`) — this set is
 * per-shipment (`shipment_documents` table, keyed by `load_id`); do not
 * merge the two concerns. No other file referenced the old shape at the
 * time of this change (verified), so this is a clean replacement.
 */
export const SHIPMENT_DOCUMENT_TYPES = [
  'commercial_invoice',
  'packing_list',
  'bill_of_lading',
  'customs_clearance_certificate',
  'certificate_of_origin',
] as const;
export type ShipmentDocumentType = (typeof SHIPMENT_DOCUMENT_TYPES)[number];

export const SHIPMENT_DOCUMENT_TYPE_LABELS: Record<ShipmentDocumentType, string> = {
  commercial_invoice: 'Commercial Invoice',
  packing_list: 'Packing List',
  bill_of_lading: 'Bill of Lading / Airway Bill',
  customs_clearance_certificate: 'Customs Clearance Certificate',
  certificate_of_origin: 'Certificate of Origin',
};

/**
 * A single per-shipment document's state, as rendered on
 * `DocumentChecklistScreen`. `status` reuses `vehicleStore`'s
 * `DocumentStatus` (task C.2) rather than a forked shipment-only status
 * type — `DocumentStatusBadge` is required to be reused unmodified, and a
 * second status enum would fork the badge's rendering logic by the back
 * door. `DocumentStatus` was extended (not forked) in task F.1 to add
 * `'cleared'`, since the source doc's shipment-document progression
 * (Pending -> Uploaded -> Verified -> Cleared) has one more terminal state
 * than C.2's vehicle-document progression ever needed. See
 * `state/vehicleStore.ts` for the extended union and
 * `components/DocumentStatusBadge.tsx` for the added visual treatment.
 */
export interface ShipmentDocument {
  docType: ShipmentDocumentType;
  status: DocumentStatus;
  fileUrl?: string | null;
  rejectionReason?: string | null;
}

/**
 * Checkpoint sequence — Task F.1 (source doc Module 4.5b). Month 1 MVP
 * scope: manual updates only at these five defined stages, no live
 * port/customs API integration (Future Enhancements section).
 *
 * PREVIOUSLY (A.2 scaffold): a generic `CheckpointsState` placeholder
 * (`{ pickupReached?, loaded?, delivered? }`) that didn't match the source
 * doc's named sequence. No other file referenced the old shape at the time
 * of this change (verified).
 */
export const CHECKPOINT_NAMES = [
  'origin_warehouse',
  'port_border',
  'customs_hold',
  'cleared',
  'destination',
] as const;
export type CheckpointName = (typeof CHECKPOINT_NAMES)[number];

export const CHECKPOINT_NAME_LABELS: Record<CheckpointName, string> = {
  origin_warehouse: 'Origin warehouse',
  port_border: 'Port / border',
  customs_hold: 'Customs hold',
  cleared: 'Cleared',
  destination: 'Destination',
};

/**
 * ASSUMPTION (flag for review at contract freeze, same category as the
 * `checkpoint_updates` route/shape items already flagged pending Dinesh in
 * this task): the technical spec's `POST /checkpoints/{loadId} {
 * checkpoint_name, status }` shows `status` as a field distinct from
 * `checkpoint_name`, but never defines its own value set — only that it is
 * "similarly constrained" (task spec, API Requirements) to an enum, not
 * free text. Modeled here as the minimal two-value enum a Month-1-MVP
 * manual-update flow actually needs: a checkpoint stage is either not yet
 * reached ('pending', the implicit default when no update exists for it)
 * or has been reached ('completed'). The "Update Status" action always
 * posts `'completed'` for the stage the transporter selects — there is no
 * UI for posting `'pending'` explicitly, since reaching a checkpoint is a
 * one-way transition in this MVP. Revisit if Dinesh's frozen contract
 * defines a richer status set (e.g. a `'delayed'` state).
 */
export const CHECKPOINT_STATUSES = ['pending', 'completed'] as const;
export type CheckpointStatus = (typeof CHECKPOINT_STATUSES)[number];

/**
 * Wire shape of one checkpoint update — both the `POST
 * /checkpoints/{loadId}` request body and one item of the (spec-implied,
 * not explicitly listed — see `api/checkpoints.ts`'s top-of-file
 * assumption note) `GET` response. `checkpoint_id`/`timestamp` are
 * server-assigned and absent on an outbound post.
 */
export interface CheckpointUpdate {
  checkpoint_id?: string;
  checkpoint_name: CheckpointName;
  status: CheckpointStatus;
  /** ISO8601 timestamp string, server-assigned. */
  timestamp?: string;
}

/**
 * `containers` table shape (technical spec §4) — sea/air cargo only,
 * explicitly distinguished from the road-vehicle GPS tracking in Cluster E
 * (source doc Module 4.5c). `null` (not an empty object) represents "no
 * container record exists for this load" — a normal, non-error outcome
 * for a domestic-only road shipment, rendered as `ContainerDetailsScreen`'s
 * "not applicable" empty state rather than a broken/blank render.
 *
 * PREVIOUSLY (A.2 scaffold): a generic `ContainerState` placeholder
 * (`{ containerNumber?, sealNumber? }`) — `sealNumber` isn't part of the
 * `containers` table in either source doc; replaced with the table's
 * actual fields. No other file referenced the old shape at the time of
 * this change (verified).
 */
export interface ContainerDetails {
  containerNumber: string;
  vesselOrFlight: string;
  portOfLoading: string;
  portOfDischarge: string;
}

/**
 * Notification types — Task F.2 (source doc Module 4.7). The four
 * notification categories the platform triggers server-side via
 * SMS/email (MSG91/Gupshup, SendGrid); this in-app inbox is explicitly a
 * complement to those channels, not a replacement ("SMS/email can be
 * missed or filtered" — Frontend Implementation Guide, F.2).
 */
export const NOTIFICATION_TYPES = [
  'booking_confirmation',
  'pickup_confirmation',
  'delay_alert',
  'delivery_confirmation',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  booking_confirmation: 'Booking confirmation',
  pickup_confirmation: 'Pickup confirmation',
  delay_alert: 'Delay alert',
  delivery_confirmation: 'Delivery confirmation',
};

/**
 * PREVIOUSLY (A.2 scaffold): `{ id, title, body?, read, createdAt? }` — a
 * reasonable generic shape, but not aligned to the `notifications` table
 * (`id, user_id, type, message, sent_at`) named in both the source doc and
 * technical spec. Replaced here field-for-field with the table's actual
 * columns (`type`/`message`/`sent_at` in place of `title`/`body`/
 * `createdAt`). No other file referenced the old field names at the time
 * of this change (verified) — `notificationStore.ts`'s logic only ever
 * touched `id`/`read`, both unchanged, so the store itself needed no
 * changes for this replacement.
 *
 * ASSUMPTION (flag for review at contract freeze — the most significant
 * open item in task F.2, more so than any single item flagged in F.1):
 * NEITHER source document defines a `read`/`read_at` column on the
 * `notifications` table, nor lists ANY REST endpoint for notifications at
 * all in the technical spec's §5 endpoint list — despite the table
 * existing in the schema (§4) and F.2's own task description explicitly
 * requiring read/unread tracking ("booking/pickup/delay/delivery
 * notifications... badge count") AND cross-device read-state consistency
 * ("marking-as-read race conditions if two devices are logged in" only
 * makes sense if `read` is server-persisted, not purely local). `read` is
 * modeled here as present on the wire response despite the schema gap —
 * flag with Dinesh that the `notifications` table likely needs a `read`
 * or `read_at` column added, and that `GET /notifications` /
 * `POST /notifications/{id}/read` (see `api/notifications.ts`) are wholly
 * inferred, unconfirmed routes.
 */
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  /** ISO8601 timestamp string. */
  sent_at: string;
  read: boolean;
}

/**
 * Notification channel preferences — Task F.2. "toggle channels (in-app/
 * SMS/email) per notification category" (Frontend Implementation Guide,
 * F.2's own phrasing already hedges this with "where the contract
 * supports it" — no source document defines a preferences endpoint or
 * storage shape at all; see `api/notifications.ts`'s ASSUMPTION note).
 */
export const NOTIFICATION_CHANNELS = ['in_app', 'sms', 'email'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: 'In-app',
  sms: 'SMS',
  email: 'Email',
};

export type NotificationPreferences = Record<NotificationType, Record<NotificationChannel, boolean>>;

/**
 * Live-tracking connection state machine (Task E.1). Explicit transitions
 * only — no ad hoc booleans, per the task's architecture requirement:
 * 'connecting' (initial / re-establishing after a room join) -> 'live'
 * (receiving updates normally) -> 'reconnecting' (a disconnect happened,
 * backoff in progress) -> 'lost' (reconnect attempts exhausted).
 *
 * PREVIOUSLY (A.2 scaffold): `'connecting' | 'live' | 'offline' | 'error'`.
 * Replaced with the 4-state machine `sockets.ts`/the task spec actually
 * requires — no other file referenced 'offline'/'error' at the time of
 * this change (verified), so this is a clean replacement, not a migration.
 */
export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'lost';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Wire shape of the `location:update` Socket.io event payload (Task E.1,
 * technical spec §2.4) — `lat`/`lng` deliberately NOT `LatLng`'s
 * `latitude`/`longitude` naming, since this mirrors the socket wire
 * contract exactly (same convention as `MatchResult`/`PostLoadPayload`
 * elsewhere: wire shapes keep the backend's field names; `LatLng` is the
 * UI/map-facing shape, converted at the boundary in `TrackingScreen`).
 */
export interface LocationUpdatePayload {
  lat: number;
  lng: number;
  /** ISO8601 timestamp string. */
  ts: string;
}

/**
 * Wire shape of the OUTGOING `location_update` Socket.io event (Task E.2,
 * technical spec §2.4's `python-socketio` `@sio.event async def
 * location_update(sid, data)` handler) — the transporter-emitted
 * counterpart to `LocationUpdatePayload` above.
 *
 * Deliberately a separate type rather than reusing `LocationUpdatePayload`:
 * the backend's incoming handler needs `load_id` to know which room to
 * broadcast into (`room=f"load:{data['load_id']}"`) and `vehicle_id` to
 * identify the source vehicle — neither is present on the room-scoped
 * RECEIVE side, where room membership already implies the load. The
 * underscore-vs-colon event name difference (`location_update` in,
 * `location:update` out) is the backend's own naming, not a typo here.
 */
export interface LocationEmitPayload {
  load_id: string;
  vehicle_id: string;
  lat: number;
  lng: number;
  /** ISO8601 timestamp string. */
  ts: string;
}
