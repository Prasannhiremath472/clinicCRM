import crypto from 'crypto';

/**
 * Generates a cryptographically secure, high-entropy opaque token
 * suitable for refresh tokens / password reset tokens.
 * The raw value is sent to the client; only its SHA-256 hash is persisted.
 */
export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a high-entropy opaque token using SHA-256.
 * NOT for passwords (use bcrypt for those) — this is for tokens that
 * already have enough entropy that a fast hash is safe and appropriate.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Parses simple duration strings like "15m", "7d", "12h", "30s" into milliseconds.
 * Supports suffixes: s (seconds), m (minutes), h (hours), d (days).
 * Falls back to treating a plain number string as milliseconds.
 */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(duration.trim());

  if (!match) {
    throw new Error(`Invalid duration string: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = (match[2] ?? 'ms').toLowerCase();

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}
