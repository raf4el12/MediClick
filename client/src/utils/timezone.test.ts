import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTodayInTimezone, localToInstant } from './timezone';

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

describe('localToInstant', () => {
  it('convierte el día y la hora de la sede en el instante real', () => {
    expect(localToInstant('2026-10-20', '10:00', 'America/Lima').toISOString()).toBe('2026-10-20T15:00:00.000Z');
    expect(localToInstant('2026-10-20', '11:00', 'America/Argentina/Buenos_Aires').toISOString()).toBe(
      '2026-10-20T14:00:00.000Z',
    );
  });
});
