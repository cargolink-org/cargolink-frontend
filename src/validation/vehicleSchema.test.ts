import { vehicleSchema } from '../../src/validation/vehicleSchema';

const validPayload = {
  vehicleType: 'truck' as const,
  registrationNumber: 'MH12AB1234',
  capacityWeightKg: 3500,
  capacityVolumeCbm: 12,
  operatingCorridor: 'Pune–Mumbai, Maharashtra',
};

describe('vehicleSchema', () => {
  it('accepts a fully valid vehicle', () => {
    expect(vehicleSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects an invalid vehicle type', () => {
    const result = vehicleSchema.safeParse({ ...validPayload, vehicleType: 'spaceship' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive weight capacity', () => {
    const result = vehicleSchema.safeParse({ ...validPayload, capacityWeightKg: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects an unrealistically large weight capacity', () => {
    const result = vehicleSchema.safeParse({ ...validPayload, capacityWeightKg: 999999 });
    expect(result.success).toBe(false);
  });

  it('rejects a too-short registration number', () => {
    const result = vehicleSchema.safeParse({ ...validPayload, registrationNumber: 'AB' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty operating corridor', () => {
    const result = vehicleSchema.safeParse({ ...validPayload, operatingCorridor: '' });
    expect(result.success).toBe(false);
  });

  it('coerces numeric strings from text inputs', () => {
    const result = vehicleSchema.safeParse({
      ...validPayload,
      capacityWeightKg: '3500' as unknown as number,
      capacityVolumeCbm: '12' as unknown as number,
    });
    expect(result.success).toBe(true);
  });
});
