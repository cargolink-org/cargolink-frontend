// src/api/admin.ts
//
// Task G.2 — the ONLY module allowed to call `/admin/stats/*`.
//
// CONTRACT STATUS (flag for Dinesh): only `GET /admin/stats/overview` is
// specified in the technical spec. `/routes`, `/revenue` and
// `/transporters/leaderboard` are BEST-GUESS shapes derived from Module
// 4.6's metric list; `cancelled` on the overview is also a guess (the spec
// lists active/completed/delayed only, but the task's UI requires a
// cancelled tile). All are isolated here so a contract change is one diff.
//
// Follows api/ratings.ts's convention: inline MOCK_MODE branch per function.

import { apiClient } from './client';

const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

export interface RouteStat {
  route: string;
  shipment_count: number;
}

export interface AdminOverview {
  active: number;
  completed: number;
  delayed: number;
  /** ASSUMPTION: not in the spec's overview shape; optional until confirmed. */
  cancelled?: number;
  /** Gross revenue, whole rupees. */
  revenue: number;
  top_routes: RouteStat[];
}

export interface RevenueByRoute {
  route: string;
  revenue: number;
}

export interface RevenueByPeriod {
  /** Backend-defined period label (e.g. "2026-09-14" or "2026-W37"). */
  period: string;
  revenue: number;
}

export interface AdminRevenue {
  by_route: RevenueByRoute[];
  by_period: RevenueByPeriod[];
}

export interface LeaderboardEntry {
  transporter_id: string;
  name: string;
  rating_avg: number;
  completed_trips: number;
}

/** Mock/test sentinel: a revenue range starting on this date yields the empty variant. */
export const MOCK_EMPTY_RANGE_FROM = '2000-01-01';

const MOCK_DELAY_MS = 300;

function mockResolve<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));
}

const MOCK_ROUTES: RouteStat[] = [
  { route: 'Nagpur → Mumbai', shipment_count: 412 },
  { route: 'Delhi → Jaipur', shipment_count: 288 },
  { route: 'Chennai → Bengaluru', shipment_count: 251 },
  { route: 'Kolkata → Patna', shipment_count: 97 },
  { route: 'Pune → Hyderabad', shipment_count: 64 },
];

const MOCK_OVERVIEW: AdminOverview = {
  active: 134,
  completed: 1820,
  delayed: 17,
  cancelled: 42,
  revenue: 12_450_000,
  top_routes: MOCK_ROUTES,
};

const MOCK_REVENUE: AdminRevenue = {
  by_route: [
    { route: 'Nagpur → Mumbai', revenue: 4_800_000 },
    { route: 'Delhi → Jaipur', revenue: 3_100_000 },
    { route: 'Chennai → Bengaluru', revenue: 2_650_000 },
    { route: 'Kolkata → Patna', revenue: 1_250_000 },
    { route: 'Pune → Hyderabad', revenue: 650_000 },
  ],
  by_period: [
    { period: '2026-W36', revenue: 2_900_000 },
    { period: '2026-W37', revenue: 3_350_000 },
    { period: '2026-W38', revenue: 3_100_000 },
    { period: '2026-W39', revenue: 3_100_000 },
  ],
};

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { transporter_id: 't-1', name: 'Sharma Logistics', rating_avg: 4.9, completed_trips: 312 },
  { transporter_id: 't-2', name: 'Patil Transport Co.', rating_avg: 4.7, completed_trips: 268 },
  { transporter_id: 't-3', name: 'Rajdhani Carriers', rating_avg: 4.6, completed_trips: 190 },
  { transporter_id: 't-4', name: 'Kaveri Freight', rating_avg: 4.4, completed_trips: 121 },
];

export async function getAdminOverview(): Promise<AdminOverview> {
  if (MOCK_MODE) return mockResolve(MOCK_OVERVIEW);
  const { data } = await apiClient.get<AdminOverview>('/admin/stats/overview');
  return data;
}

export async function getAdminRoutes(): Promise<RouteStat[]> {
  if (MOCK_MODE) return mockResolve(MOCK_ROUTES);
  const { data } = await apiClient.get<RouteStat[]>('/admin/stats/routes');
  return data;
}

export async function getAdminRevenue(from: string, to: string): Promise<AdminRevenue> {
  if (MOCK_MODE) {
    return mockResolve(from === MOCK_EMPTY_RANGE_FROM ? { by_route: [], by_period: [] } : MOCK_REVENUE);
  }
  const { data } = await apiClient.get<AdminRevenue>('/admin/stats/revenue', { params: { from, to } });
  return data;
}

export async function getTransporterLeaderboard(): Promise<LeaderboardEntry[]> {
  if (MOCK_MODE) return mockResolve(MOCK_LEADERBOARD);
  const { data } = await apiClient.get<LeaderboardEntry[]>('/admin/stats/transporters/leaderboard');
  return data;
}
