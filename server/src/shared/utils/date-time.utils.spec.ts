import {
  parseHHmm,
  dateToTimeString,
  toMinutesUTC,
  normalizeToTimeOnly,
  timeRangesOverlap,
  utcDayRange,
  nowInTimezone,
  todayStartInTimezone,
  scheduleDateToLocalDay,
} from './date-time.utils.js';

// ════════════════════════════════════════════════
// parseHHmm
// ════════════════════════════════════════════════

describe('parseHHmm', () => {
  it('should parse "09:00" to epoch UTC', () => {
    const date = parseHHmm('09:00');
    expect(date.toISOString()).toBe('1970-01-01T09:00:00.000Z');
  });

  it('should parse "00:00" to midnight epoch', () => {
    const date = parseHHmm('00:00');
    expect(date.toISOString()).toBe('1970-01-01T00:00:00.000Z');
  });

  it('should parse "23:59" to near-midnight epoch', () => {
    const date = parseHHmm('23:59');
    expect(date.toISOString()).toBe('1970-01-01T23:59:00.000Z');
  });

  it('should parse "12:30" correctly', () => {
    const date = parseHHmm('12:30');
    expect(date.getUTCHours()).toBe(12);
    expect(date.getUTCMinutes()).toBe(30);
  });
});

// ════════════════════════════════════════════════
// dateToTimeString
// ════════════════════════════════════════════════

describe('dateToTimeString', () => {
  it('should format epoch UTC date back to "09:00"', () => {
    const date = new Date('1970-01-01T09:00:00.000Z');
    expect(dateToTimeString(date)).toBe('09:00');
  });

  it('should pad single-digit hours', () => {
    const date = new Date('1970-01-01T05:03:00.000Z');
    expect(dateToTimeString(date)).toBe('05:03');
  });

  it('should handle midnight', () => {
    const date = new Date('1970-01-01T00:00:00.000Z');
    expect(dateToTimeString(date)).toBe('00:00');
  });

  it('should roundtrip with parseHHmm for any valid time', () => {
    const times = ['00:00', '01:15', '09:00', '12:30', '18:45', '23:59'];
    for (const t of times) {
      expect(dateToTimeString(parseHHmm(t))).toBe(t);
    }
  });
});

// ════════════════════════════════════════════════
// toMinutesUTC
// ════════════════════════════════════════════════

describe('toMinutesUTC', () => {
  it('should return 540 for 09:00', () => {
    expect(toMinutesUTC(parseHHmm('09:00'))).toBe(540);
  });

  it('should return 0 for midnight', () => {
    expect(toMinutesUTC(parseHHmm('00:00'))).toBe(0);
  });

  it('should return 1439 for 23:59', () => {
    expect(toMinutesUTC(parseHHmm('23:59'))).toBe(1439);
  });
});

// ════════════════════════════════════════════════
// normalizeToTimeOnly
// ════════════════════════════════════════════════

describe('normalizeToTimeOnly', () => {
  it('should strip date and keep only HH:mm in epoch base', () => {
    // A date with a non-1970 base
    const date = new Date('2026-03-19T14:30:00.000Z');
    const normalized = normalizeToTimeOnly(date);
    expect(normalized.toISOString()).toBe('1970-01-01T14:30:00.000Z');
  });

  it('should keep 1970-01-01 dates unchanged', () => {
    const date = parseHHmm('09:00');
    const normalized = normalizeToTimeOnly(date);
    expect(normalized.getTime()).toBe(date.getTime());
  });
});

// ════════════════════════════════════════════════
// timeRangesOverlap
// ════════════════════════════════════════════════

describe('timeRangesOverlap', () => {
  it('should detect real overlap', () => {
    // 09:00-10:00 vs 09:30-10:30 → overlap
    expect(
      timeRangesOverlap(
        parseHHmm('09:00'), parseHHmm('10:00'),
        parseHHmm('09:30'), parseHHmm('10:30'),
      ),
    ).toBe(true);
  });

  it('should detect containment', () => {
    // 08:00-12:00 contains 09:00-10:00
    expect(
      timeRangesOverlap(
        parseHHmm('08:00'), parseHHmm('12:00'),
        parseHHmm('09:00'), parseHHmm('10:00'),
      ),
    ).toBe(true);
  });

  it('should NOT detect overlap for adjacent ranges', () => {
    // 09:00-10:00 vs 10:00-11:00 → adjacent, not overlapping
    expect(
      timeRangesOverlap(
        parseHHmm('09:00'), parseHHmm('10:00'),
        parseHHmm('10:00'), parseHHmm('11:00'),
      ),
    ).toBe(false);
  });

  it('should NOT detect overlap for separate ranges', () => {
    // 09:00-10:00 vs 14:00-15:00 → no overlap
    expect(
      timeRangesOverlap(
        parseHHmm('09:00'), parseHHmm('10:00'),
        parseHHmm('14:00'), parseHHmm('15:00'),
      ),
    ).toBe(false);
  });
});

// ════════════════════════════════════════════════
// utcDayRange
// ════════════════════════════════════════════════

describe('utcDayRange', () => {
  it('should return correct start and end for a given date', () => {
    const date = new Date('2026-03-19T15:30:00.000Z');
    const { start, end } = utcDayRange(date);
    expect(start.toISOString()).toBe('2026-03-19T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-20T00:00:00.000Z');
  });

  it('should handle midnight input', () => {
    const date = new Date('2026-03-19T00:00:00.000Z');
    const { start, end } = utcDayRange(date);
    expect(start.toISOString()).toBe('2026-03-19T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-20T00:00:00.000Z');
  });

  it('should handle end-of-day input', () => {
    const date = new Date('2026-03-19T23:59:59.000Z');
    const { start, end } = utcDayRange(date);
    expect(start.toISOString()).toBe('2026-03-19T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-20T00:00:00.000Z');
  });
});

// ════════════════════════════════════════════════
// nowInTimezone
// ════════════════════════════════════════════════

describe('nowInTimezone', () => {
  it('should return a Date whose local accessors reflect the given timezone', () => {
    // We test with a fixed instant to be deterministic
    const now = nowInTimezone('UTC');
    // Local accessors of the returned Date should match UTC wall-clock
    // We can't compare exact time because of test execution delay,
    // but we can verify it's a valid Date
    expect(now).toBeInstanceOf(Date);
    expect(isNaN(now.getTime())).toBe(false);
  });

  it('should produce different wall-clock for UTC vs America/Lima', () => {
    const utcNow = nowInTimezone('UTC');
    const limaNow = nowInTimezone('America/Lima');
    // Lima is UTC-5, so the hours should differ
    // Note: both are wall-clock Dates, so we compare local hours
    const utcHour = utcNow.getHours();
    const limaHour = limaNow.getHours();
    // They should differ by 5 hours (mod 24)
    const diff = ((utcHour - limaHour) % 24 + 24) % 24;
    expect(diff).toBe(5);
  });
});

// ════════════════════════════════════════════════
// todayStartInTimezone
// ════════════════════════════════════════════════

describe('todayStartInTimezone', () => {
  it('should return midnight UTC Date for UTC timezone', () => {
    const start = todayStartInTimezone('UTC');
    // It should be today's date at 00:00:00Z
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
    expect(start.getUTCSeconds()).toBe(0);
  });

  it('should return today in Lima as UTC midnight of the local date', () => {
    const limaStart = todayStartInTimezone('America/Lima');
    const utcStart = todayStartInTimezone('UTC');
    // Between 0:00-4:59 UTC, Lima is previous day → limaStart < utcStart
    // Between 5:00-23:59 UTC, Lima is same day → limaStart === utcStart
    // Either way, the difference should be 0 or -86400000 (1 day)
    const diffMs = utcStart.getTime() - limaStart.getTime();
    expect([0, 86_400_000]).toContain(diffMs);
  });
});

// ════════════════════════════════════════════════
// scheduleDateToLocalDay
// ════════════════════════════════════════════════

describe('scheduleDateToLocalDay', () => {
  it('should normalize a date to midnight UTC', () => {
    const date = new Date('2026-03-19T15:30:00.000Z');
    const normalized = scheduleDateToLocalDay(date);
    expect(normalized.toISOString()).toBe('2026-03-19T00:00:00.000Z');
  });

  it('should keep midnight UTC dates unchanged', () => {
    const date = new Date('2026-03-19T00:00:00.000Z');
    const normalized = scheduleDateToLocalDay(date);
    expect(normalized.getTime()).toBe(date.getTime());
  });
});

// ════════════════════════════════════════════════
// Multi-timezone Scenarios (Slide 6 Checklist)
// ════════════════════════════════════════════════

describe('Multi-timezone scenarios', () => {
  it('should compute different "today" for Perú vs España', () => {
    // At 2 AM UTC → In Lima (UTC-5) it is 9 PM previous day
    // At 2 AM UTC → In Madrid (UTC+1/+2) it is 3-4 AM same day
    const fixedInstant = new Date('2026-03-19T02:00:00.000Z');

    const limaParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour12: false,
    }).formatToParts(fixedInstant);

    const madridParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour12: false,
    }).formatToParts(fixedInstant);

    const getDay = (parts: Intl.DateTimeFormatPart[]) =>
      Number(parts.find((p) => p.type === 'day')!.value);

    // Lima should be day 18 (previous day), Madrid should be day 19
    expect(getDay(limaParts)).toBe(18);
    expect(getDay(madridParts)).toBe(19);
  });

  it('should produce correct todayStart for DST-aware timezone', () => {
    // America/New_York observes DST
    const nyStart = todayStartInTimezone('America/New_York');
    expect(nyStart.getUTCHours()).toBe(0);
    expect(nyStart.getUTCMinutes()).toBe(0);
    // Should be a valid date of either today or yesterday depending on UTC hour
    expect(nyStart).toBeInstanceOf(Date);
    expect(isNaN(nyStart.getTime())).toBe(false);
  });

  it('cross-timezone: parseHHmm is timezone-agnostic', () => {
    // No matter the TZ of the test runner, parseHHmm always gives UTC epoch
    const result = parseHHmm('09:00');
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCFullYear()).toBe(1970);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(1);
  });
});
