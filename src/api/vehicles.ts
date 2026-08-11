import { apiClient } from './client';
import type { VehicleFormValues } from '../validation/vehicleSchema';
import type { RegisteredVehicle } from '../state/vehicleStore';

/**
 * ASSUMPTIONS (flag for review before merging):
 *  - `./client` exports a configured, authenticated `apiClient`
 *    (per task C.2's dependency note: "uploads are authenticated via
 *    api/client.ts's interceptor"). Adjust the import if the real export
 *    name differs.
 *  - `MOCK_MODE` is re-derived from `process.env.EXPO_PUBLIC_MOCK_MODE`
 *    here only until it's confirmed how Cluster B already exposes it
 *    (e.g. a shared `src/config/env.ts`). Swap this line for that import
 *    once confirmed, so there's a single source of truth for the flag.
 */
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_MODE === 'true';

export interface CreateVehiclePayload extends VehicleFormValues {
  ownerId: string;
}

function mockCreateVehicle(payload: CreateVehiclePayload): Promise<RegisteredVehicle> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `mock-vehicle-${Date.now()}`,
        ownerId: payload.ownerId,
        vehicleType: payload.vehicleType,
        registrationNumber: payload.registrationNumber,
        capacityWeightKg: payload.capacityWeightKg,
        capacityVolumeCbm: payload.capacityVolumeCbm,
        operatingCorridor: payload.operatingCorridor,
      });
    }, 600);
  });
}

/**
 * Creates (or, per the backend, may upsert) the transporter's vehicle
 * record. Endpoint path/shape is still a draft — this is the single place
 * to update once the contract is frozen.
 */
export async function createVehicle(payload: CreateVehiclePayload): Promise<RegisteredVehicle> {
  if (MOCK_MODE) {
    return mockCreateVehicle(payload);
  }

  const { data } = await apiClient.post<RegisteredVehicle>(
    `/owners/${payload.ownerId}/vehicles`,
    payload
  );
  return data;
}

export async function getVehicle(ownerId: string): Promise<RegisteredVehicle | null> {
  if (MOCK_MODE) {
    return null;
  }

  const { data } = await apiClient.get<RegisteredVehicle | null>(`/owners/${ownerId}/vehicle`);
  return data;
}
