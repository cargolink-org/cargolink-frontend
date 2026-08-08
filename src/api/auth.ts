import { requestOtp, verifyOtp, toSessionTokens, MOCK_MODE } from '../../src/api/auth';

describe('api/auth (mock mode)', () => {
  it('is in mock mode by default (no real backend exists yet for this task)', () => {
    expect(MOCK_MODE).toBe(true);
  });

  describe('requestOtp', () => {
    it('resolves with otp_sent: true for a normal phone', async () => {
      const res = await requestOtp({ phone: '9876543210' });
      expect(res).toEqual({ otp_sent: true });
    });

    it('throws a RATE_LIMITED error for the reserved rate-limit test phone', async () => {
      await expect(requestOtp({ phone: '9999999999' })).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        status: 429,
      });
    });
  });

  describe('verifyOtp', () => {
    it('resolves with an existing user for a known mock phone', async () => {
      const res = await verifyOtp({ phone: '9876543210', otp: '654321' });
      expect(res.is_new_user).toBe(false);
      expect(res.user.role).toBe('shipper');
      expect(res.token).toBeTruthy();
      expect(res.refresh_token).toBeTruthy();
    });

    it('resolves with a new user for an unrecognized phone', async () => {
      const res = await verifyOtp({ phone: '9000000042', otp: '654321' });
      expect(res.is_new_user).toBe(true);
      expect(res.user.phone).toBe('9000000042');
    });

    it('throws OTP_INVALID for the reserved invalid-otp test code', async () => {
      await expect(verifyOtp({ phone: '9876543210', otp: '000000' })).rejects.toMatchObject({
        code: 'OTP_INVALID',
      });
    });

    it('throws OTP_EXPIRED for the reserved expired-otp test code', async () => {
      await expect(verifyOtp({ phone: '9876543210', otp: '111111' })).rejects.toMatchObject({
        code: 'OTP_EXPIRED',
      });
    });

    it('throws OTP_MAX_ATTEMPTS for the reserved lockout test code', async () => {
      await expect(verifyOtp({ phone: '9876543210', otp: '222222' })).rejects.toMatchObject({
        code: 'OTP_MAX_ATTEMPTS',
      });
    });
  });

  describe('toSessionTokens', () => {
    it('maps a verify response onto the SessionTokens shape', () => {
      const tokens = toSessionTokens({
        token: 'a',
        refresh_token: 'b',
        user: { id: '1', role: 'shipper', phone: '9876543210' },
        is_new_user: false,
      });
      expect(tokens).toEqual({ token: 'a', refreshToken: 'b' });
    });
  });
});
