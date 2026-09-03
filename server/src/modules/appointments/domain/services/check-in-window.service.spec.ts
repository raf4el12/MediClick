import { CheckInWindowService } from './check-in-window.service.js';

describe('CheckInWindowService (Ventana Local de Check-In)', () => {
  const service = new CheckInWindowService();

  const limaInput = {
    scheduleDate: new Date('2026-10-10T00:00:00Z'),
    startTime: new Date('1970-01-01T09:00:00Z'),
    timezone: 'America/Lima',
  };

  it('calcula la ventana exacta [T-30min, T+15min] en America/Lima (UTC-5)', () => {
    const window = service.getWindow(limaInput);

    expect(window).toEqual({
      opensAt: new Date('2026-10-10T13:30:00Z'),
      startsAt: new Date('2026-10-10T14:00:00Z'),
      closesAt: new Date('2026-10-10T14:15:00Z'),
    });

    expect(service.isOpen(limaInput, window.opensAt)).toBe(true);
    expect(service.isOpen(limaInput, window.startsAt)).toBe(true);
    expect(service.isOpen(limaInput, window.closesAt)).toBe(true);
    expect(
      service.isOpen(limaInput, new Date(window.opensAt.getTime() - 1)),
    ).toBe(false);
    expect(
      service.isOpen(limaInput, new Date(window.closesAt.getTime() + 1)),
    ).toBe(false);
  });

  it('calcula la ventana exacta bajo horario de verano en Europe/Madrid (UTC+2)', () => {
    const madridInput = {
      scheduleDate: new Date('2026-07-15T00:00:00Z'),
      startTime: new Date('1970-01-01T09:00:00Z'),
      timezone: 'Europe/Madrid',
    };

    const window = service.getWindow(madridInput);

    expect(window).toEqual({
      opensAt: new Date('2026-07-15T06:30:00Z'),
      startsAt: new Date('2026-07-15T07:00:00Z'),
      closesAt: new Date('2026-07-15T07:15:00Z'),
    });

    expect(service.isOpen(madridInput, window.opensAt)).toBe(true);
    expect(service.isOpen(madridInput, window.closesAt)).toBe(true);
    expect(
      service.isOpen(madridInput, new Date(window.opensAt.getTime() - 1)),
    ).toBe(false);
    expect(
      service.isOpen(madridInput, new Date(window.closesAt.getTime() + 1)),
    ).toBe(false);
  });
});
