import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTodayInTimezone } from './timezone';

describe('getTodayInTimezone', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve la fecha de la zona de la sede, no la del navegador', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T03:30:00.000Z'));

    expect(getTodayInTimezone('America/Lima')).toBe('2026-09-30');
    expect(getTodayInTimezone('Asia/Tokyo')).toBe('2026-10-01');
  });
});
