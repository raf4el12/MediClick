import { SlotReleasedListener } from './slot-released.listener.js';
import { buildAppointmentSlotReleasedDurableEvent } from '../../../../shared/events/appointment-durable-events.js';

describe('SlotReleasedListener', () => {
  const findNextMatch = { execute: jest.fn() };
  const listener = new SlotReleasedListener(findNextMatch as never);

  beforeEach(() => jest.clearAllMocks());

  it('convierte el payload durable y conserva la sede del envelope', async () => {
    findNextMatch.execute.mockResolvedValue(null);
    const event = buildAppointmentSlotReleasedDurableEvent({
      eventId: 'evt-1',
      operationId: 'op-1',
      occurredAt: '2026-07-10T13:00:00.000Z',
      appointmentId: 55,
      scheduleId: 8,
      clinicId: 3,
      startTime: new Date('2026-07-10T14:00:00.000Z'),
      endTime: new Date('2026-07-10T14:30:00.000Z'),
    });

    await listener.handle(event);

    expect(findNextMatch.execute).toHaveBeenCalledWith({
      scheduleId: 8,
      clinicId: 3,
      startTime: new Date('2026-07-10T14:00:00.000Z'),
      endTime: new Date('2026-07-10T14:30:00.000Z'),
    });
  });

  it('propaga fallos y rechaza fechas inválidas para habilitar reintentos', async () => {
    const event = buildAppointmentSlotReleasedDurableEvent({
      eventId: 'evt-1',
      operationId: 'op-1',
      occurredAt: '2026-07-10T13:00:00.000Z',
      appointmentId: 55,
      scheduleId: 8,
      clinicId: 3,
      startTime: new Date('2026-07-10T14:00:00.000Z'),
      endTime: new Date('2026-07-10T14:30:00.000Z'),
    });
    findNextMatch.execute.mockRejectedValueOnce(new Error('lock caído'));
    await expect(listener.handle(event)).rejects.toThrow('lock caído');

    await expect(
      listener.handle({
        ...event,
        payload: { ...event.payload, startTime: 'no-es-fecha' },
      }),
    ).rejects.toThrow('Fechas inválidas');
  });
});
