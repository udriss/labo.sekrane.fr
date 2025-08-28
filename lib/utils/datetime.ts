// Centralized date/time helpers for consistent timezone handling.
// We treat incoming naive local datetimes (YYYY-MM-DDTHH:mm[:ss]) as local wall time
// and convert them to a UTC-equivalent Date so that MySQL DATETIME (no TZ) stores literal local time.
// This mirrors logic previously duplicated in timeslot API routes.

// Token expiration duration in minutes
export const TOKEN_EXPIRATION_MINUTES = 300; // 5 hours (300 minutes)

export function toUTCEquivalent(stamp: string): Date {
  // Accept either 'YYYY-MM-DDTHH:mm:ss' or 'YYYY-MM-DD HH:mm:ss'
  const normalized = stamp.includes('T') ? stamp : stamp.replace(' ', 'T');
  const [d, t = '00:00:00'] = normalized.split('T');
  const [Y, M, D] = d.split('-').map((n) => parseInt(n, 10));
  const [h, m, s = '0'] = t.split(':');
  return new Date(
    Date.UTC(
      Y,
      (M as any) - 1,
      D,
      parseInt(h || '0', 10),
      parseInt(m || '0', 10),
      parseInt(s || '0', 10),
    ),
  );
}

export function dateOnlyToUTC(dstr: string): Date {
  const [Y, M, D] = dstr.split('-').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(Y, (M as any) - 1, D, 0, 0, 0, 0));
}

// Helper to format a Date back to local-like ISO without timezone (for UI drafts)
export function formatLocalIsoNoZ(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

// Create expiration date for tokens (30 minutes from now) - no timezone shift
export function createTokenExpiration(): Date {
  const now = new Date();
  const localNow = formatLocalIsoNoZ(now);
  const [datePart, timePart] = localNow.split('T');
  const [hours, minutes] = timePart.split(':').map(n => parseInt(n, 10));
  
  // Add TOKEN_EXPIRATION_MINUTES minutes
  const totalMinutes = hours * 60 + minutes + TOKEN_EXPIRATION_MINUTES;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  
  const expirationString = `${datePart}T${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:00`;
  return toUTCEquivalent(expirationString);
}

// Check if a date is expired (for token validation) - no timezone shift
export function isExpired(expiresAt: Date): boolean {
  const now = new Date();
  const localNow = formatLocalIsoNoZ(now);
  const localExpires = formatLocalIsoNoZ(expiresAt);
  return localNow > localExpires;
}
