import { EncounterProjectionListener } from './encounter-projection.listener.js';
import { fhirIdFor, provenanceIdFor } from '../../domain/fhir-id.logic.js';
import {
  APPOINTMENT_CANCELLED,
  APPOINTMENT_CONFIRMED,
} from '../../../../shared/events/appointment-durable-events.js';
import { buildDurableEvent } from '../../../../shared/outbox/domain/durable-domain-event.js';

const dbAppointment = {
  id: 55,
  status: 'CONFIRMED',
  startTime: new Date('2026-07-10T14:00:00Z'),
  endTime: new Date('2026-07-10T14:30:00Z'),
  patientId: 42,
  clinicId: 3,
  deleted: false,
  schedule: { clinicId: 3, doctor: { clinicId: 3 } },
};

function appointmentEvent(
  type = APPOINTMENT_CONFIRMED,
  clinicId: number | null = 3,
) {
  return buildDurableEvent({
    eventId: 'evt-1',
    type,
    schemaVersion: 1,
    aggregateType: 'appointment',
    aggregateId: '55',
    operationId: 'op-1',
    clinicId,
    occurredAt: '2026-07-10T14:00:00.000Z',
    payload: { appointmentId: 55 },
  });
}

describe('EncounterProjectionListener', () => {
  const prisma = {
    appointments: { findFirst: jest.fn(), findUnique: jest.fn() },
  };
  const fhirResourceService = { applyProjection: jest.fn() };
  let listener: EncounterProjectionListener;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = new EncounterProjectionListener(
      prisma as never,
      fhirResourceService as never,
    );
  });

  it('rehidrata con scope explícito y aplica Encounter + Provenance atómicamente', async () => {
    prisma.appointments.findFirst.mockResolvedValue(dbAppointment);
    fhirResourceService.applyProjection.mockResolvedValue('applied');

    await listener.handleConfirmed(appointmentEvent());

    expect(prisma.appointments.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 55, deleted: false }),
      }),
    );
    expect(fhirResourceService.applyProjection).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerName: 'fhir-encounter-projection',
        eventId: 'evt-1',
        upserts: [
          expect.objectContaining({
            id: fhirIdFor('Encounter', 55),
            resourceType: 'Encounter',
            clinicId: 3,
          }),
          expect.objectContaining({
            id: provenanceIdFor('Encounter', 55),
            resourceType: 'Provenance',
            clinicId: 3,
          }),
        ],
      }),
    );
  });

  it('clinicId null solo se acepta si las relaciones persistidas también son null', async () => {
    prisma.appointments.findUnique.mockResolvedValue({
      ...dbAppointment,
      clinicId: null,
      schedule: { clinicId: null, doctor: { clinicId: null } },
    });
    fhirResourceService.applyProjection.mockResolvedValue('applied');

    await listener.handleCancelled(
      appointmentEvent(APPOINTMENT_CANCELLED, null),
    );

    expect(fhirResourceService.applyProjection).toHaveBeenCalledWith(
      expect.objectContaining({
        upserts: [
          expect.objectContaining({
            resourceType: 'Encounter',
            clinicId: null,
          }),
          expect.any(Object),
        ],
      }),
    );
  });

  it('rechaza clinicId null cuando la cita pertenece a una sede persistida', async () => {
    prisma.appointments.findUnique.mockResolvedValue(dbAppointment);

    await expect(
      listener.handleConfirmed(appointmentEvent(APPOINTMENT_CONFIRMED, null)),
    ).rejects.toThrow('clinicId inconsistente');
    expect(fhirResourceService.applyProjection).not.toHaveBeenCalled();
  });

  it('propaga cita fuera de scope y fallos del store', async () => {
    prisma.appointments.findFirst.mockResolvedValueOnce(null);
    await expect(listener.handleConfirmed(appointmentEvent())).rejects.toThrow(
      'no encontrada en el alcance',
    );

    prisma.appointments.findFirst.mockResolvedValueOnce(dbAppointment);
    fhirResourceService.applyProjection.mockRejectedValueOnce(
      new Error('db caída'),
    );
    await expect(listener.handleConfirmed(appointmentEvent())).rejects.toThrow(
      'db caída',
    );
  });
});
