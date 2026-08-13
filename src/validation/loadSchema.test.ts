import {
  loadSchema,
  requiresHighWeightConfirmation,
  HIGH_WEIGHT_CONFIRMATION_THRESHOLD_KG,
} from './loadSchema';

const futureDeadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString();
const pastDeadline = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();

const pune = { lat: 18.5204, lng: 73.8567, label: 'Pune, Maharashtra, India' };
const mumbai = { lat: 19.076, lng: 72.8777, label: 'Mumbai, Maharashtra, India' };

const validPayload = {
  weightKg: 1200,
  cargoType: 'general' as const,
  source: pune,
  destination: mumbai,
  deadline: futureDeadline,
  preferredVehicleType: 'truck' as const,
};

describe('loadSchema', () => {
  it('accepts a fully valid load', () => {
    const result = loadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects a non-numeric weight', () => {
    const result = loadSchema.safeParse({ ...validPayload, weightKg: 'heavy' });
    expect(result.success).toBe(false);
  });

  it('rejects a zero weight', () => {
    const result = loadSchema.safeParse({ ...validPayload, weightKg: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects a negative weight', () => {
    const result = loadSchema.safeParse({ ...validPayload, weightKg: -50 });
    expect(result.success).toBe(false);
  });

  it('accepts a weight above the high-weight confirmation threshold (not a hard block)', () => {
    const result = loadSchema.safeParse({ ...validPayload, weightKg: 60000 });
    expect(result.success).toBe(true);
  });

  it('rejects a missing cargo type', () => {
    const { cargoType, ...rest } = validPayload;
    const result = loadSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid cargo type', () => {
    const result = loadSchema.safeParse({ ...validPayload, cargoType: 'explosive' });
    expect(result.success).toBe(false);
  });

  it('rejects when source and destination are the same location', () => {
    const result = loadSchema.safeParse({ ...validPayload, destination: pune });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('destination'))).toBe(true);
    }
  });

  it('rejects a missing source', () => {
    const { source, ...rest } = validPayload;
    const result = loadSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects a missing destination', () => {
    const { destination, ...rest } = validPayload;
    const result = loadSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects an out-of-range latitude', () => {
    const result = loadSchema.safeParse({
      ...validPayload,
      source: { ...pune, lat: 999 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a deadline in the past', () => {
    const result = loadSchema.safeParse({ ...validPayload, deadline: pastDeadline });
    expect(result.success).toBe(false);
  });

  it('rejects an empty deadline', () => {
    const result = loadSchema.safeParse({ ...validPayload, deadline: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an unparseable deadline string', () => {
    const result = loadSchema.safeParse({ ...validPayload, deadline: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing preferred vehicle type', () => {
    const { preferredVehicleType, ...rest } = validPayload;
    const result = loadSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid preferred vehicle type', () => {
    const result = loadSchema.safeParse({ ...validPayload, preferredVehicleType: 'spaceship' });
    expect(result.success).toBe(false);
  });
});

describe('requiresHighWeightConfirmation', () => {
  it('is false at and below the threshold', () => {
    expect(requiresHighWeightConfirmation(HIGH_WEIGHT_CONFIRMATION_THRESHOLD_KG)).toBe(false);
    expect(requiresHighWeightConfirmation(1000)).toBe(false);
  });

  it('is true above the threshold', () => {
    expect(requiresHighWeightConfirmation(HIGH_WEIGHT_CONFIRMATION_THRESHOLD_KG + 1)).toBe(true);
  });

  it('is false for undefined', () => {
    expect(requiresHighWeightConfirmation(undefined)).toBe(false);
  });
});
