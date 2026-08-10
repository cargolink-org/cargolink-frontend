import { shipperProfileSchema, transporterProfileSchema } from '../../src/validation/profileSchema';

describe('shipperProfileSchema', () => {
  it('accepts a valid individual shipper without a GSTIN', () => {
    const result = shipperProfileSchema.safeParse({
      shipperType: 'individual',
      name: 'Asha Patel',
      gstin: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a business shipper with a missing GSTIN', () => {
    const result = shipperProfileSchema.safeParse({
      shipperType: 'business',
      name: 'Acme Logistics Pvt Ltd',
      gstin: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.gstin).toBeTruthy();
    }
  });

  it('accepts a business shipper with a valid GSTIN', () => {
    const result = shipperProfileSchema.safeParse({
      shipperType: 'business',
      name: 'Acme Logistics Pvt Ltd',
      gstin: '22AAAAA0000A1Z5',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed GSTIN regardless of shipper type', () => {
    const result = shipperProfileSchema.safeParse({
      shipperType: 'business',
      name: 'Acme Logistics Pvt Ltd',
      gstin: 'NOT-A-GSTIN',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = shipperProfileSchema.safeParse({
      shipperType: 'individual',
      name: 'A',
      gstin: '',
    });
    expect(result.success).toBe(false);
  });

  it('validates an optional GSTIN for individual shippers if one is supplied', () => {
    const result = shipperProfileSchema.safeParse({
      shipperType: 'individual',
      name: 'Asha Patel',
      gstin: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});

describe('transporterProfileSchema', () => {
  it('accepts a well-formed license number', () => {
    const result = transporterProfileSchema.safeParse({ licenseNumber: 'MH-14-2024-00123' });
    expect(result.success).toBe(true);
  });

  it('rejects a license number that is too short', () => {
    const result = transporterProfileSchema.safeParse({ licenseNumber: 'AB1' });
    expect(result.success).toBe(false);
  });

  it('rejects a license number with invalid characters', () => {
    const result = transporterProfileSchema.safeParse({ licenseNumber: 'MH14 2024 00123!' });
    expect(result.success).toBe(false);
  });
});
