import { bucketOfStartTime, matchingBuckets } from './waitlist-time.util.js';
import { WaitlistTimePreference } from '../enums/waitlist-time-preference.enum.js';

/** Construye un Date con hora UTC fija (los slots se guardan en UTC). */
function atUtcHour(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2030, 0, 1, hour, minute));
}

describe('waitlist-time.util', () => {
  describe('bucketOfStartTime (valores límite)', () => {
    it('06:00 es el límite inferior de MORNING', () => {
      expect(bucketOfStartTime(atUtcHour(6))).toBe(
        WaitlistTimePreference.MORNING,
      );
    });

    it('11:59 sigue siendo MORNING', () => {
      expect(bucketOfStartTime(atUtcHour(11, 59))).toBe(
        WaitlistTimePreference.MORNING,
      );
    });

    it('12:00 es el límite inferior de AFTERNOON', () => {
      expect(bucketOfStartTime(atUtcHour(12))).toBe(
        WaitlistTimePreference.AFTERNOON,
      );
    });

    it('17:59 sigue siendo AFTERNOON', () => {
      expect(bucketOfStartTime(atUtcHour(17, 59))).toBe(
        WaitlistTimePreference.AFTERNOON,
      );
    });

    it('18:00 es el límite inferior de EVENING', () => {
      expect(bucketOfStartTime(atUtcHour(18))).toBe(
        WaitlistTimePreference.EVENING,
      );
    });

    it('05:00 (antes de la mañana) cae en EVENING como franja de borde', () => {
      expect(bucketOfStartTime(atUtcHour(5))).toBe(
        WaitlistTimePreference.EVENING,
      );
    });

    it('23:00 (noche tardía) es EVENING', () => {
      expect(bucketOfStartTime(atUtcHour(23))).toBe(
        WaitlistTimePreference.EVENING,
      );
    });
  });

  describe('matchingBuckets', () => {
    it('siempre incluye ANY más la franja concreta del slot', () => {
      expect(matchingBuckets(atUtcHour(9))).toEqual([
        WaitlistTimePreference.ANY,
        WaitlistTimePreference.MORNING,
      ]);
    });

    it('una preferencia ANY de la entrada también matchea (ANY ∈ resultado)', () => {
      const buckets = matchingBuckets(atUtcHour(15));
      expect(buckets).toContain(WaitlistTimePreference.ANY);
      expect(buckets).toContain(WaitlistTimePreference.AFTERNOON);
    });
  });
});
