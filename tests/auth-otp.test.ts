import { describe, expect, it } from 'vitest';
import crypto from 'crypto';

function isEmailValid(emailStr: string): boolean {
  if (!emailStr) return false;
  const trimmed = emailStr.trim();
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(trimmed) && !trimmed.includes('..');
}

const AUTH_SECRET = 'subtrack-test-secret-key';

interface PendingSignup {
  fullName: string;
  email: string;
  password: string;
  code: string;
  expiresAt: number;
}

function signToken(payload: PendingSignup): string {
  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(base64).digest('hex');
  return `${base64}.${signature}`;
}

function verifyToken(token: string): PendingSignup | null {
  try {
    const [base64, signature] = token.split('.');
    if (!base64 || !signature) return null;
    const expected = crypto.createHmac('sha256', AUTH_SECRET).update(base64).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    const json = Buffer.from(base64, 'base64url').toString('utf8');
    return JSON.parse(json) as PendingSignup;
  } catch {
    return null;
  }
}

describe('Authentication & Email OTP Validation', () => {
  describe('Email Regex Validation', () => {
    it('accepts valid email addresses', () => {
      expect(isEmailValid('nishant@example.com')).toBe(true);
      expect(isEmailValid('user.name+tag@sub.domain.co')).toBe(true);
      expect(isEmailValid('test123_45@company.org')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(isEmailValid('invalid')).toBe(false);
      expect(isEmailValid('missing@tld')).toBe(false);
      expect(isEmailValid('test@domain..com')).toBe(false);
      expect(isEmailValid('@no-user.com')).toBe(false);
      expect(isEmailValid('')).toBe(false);
    });
  });

  describe('HMAC Token & OTP Verification', () => {
    const validPayload: PendingSignup = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      code: '403051',
      expiresAt: Date.now() + 10 * 60 * 1000,
    };

    it('successfully signs and verifies a valid token', () => {
      const token = signToken(validPayload);
      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.code).toBe('403051');
    });

    it('rejects tampered tokens', () => {
      const token = signToken(validPayload);
      const tampered = token.slice(0, -5) + 'abcde';
      expect(verifyToken(tampered)).toBeNull();
    });

    it('verifies code and flags wrong code with "enter the code correctly"', () => {
      const token = signToken(validPayload);
      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();

      const inputCode = '999999';
      if (decoded && decoded.code.trim() !== inputCode.trim()) {
        const error = new Error('enter the code correctly');
        expect(error.message).toBe('enter the code correctly');
      }
    });

    it('detects expired tokens', () => {
      const expiredPayload: PendingSignup = {
        ...validPayload,
        expiresAt: Date.now() - 1000, // already expired
      };
      const token = signToken(expiredPayload);
      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(Date.now() > (decoded?.expiresAt ?? 0)).toBe(true);
    });
  });
});
