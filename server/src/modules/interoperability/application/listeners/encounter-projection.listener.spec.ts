import { EncounterProjectionListener } from './encounter-projection.listener.js';
import {
  fhirIdFor,
  provenanceIdFor,
} from '../../domain/fhir-id.logic.js';

const dbAppointment = {
  id: 55,
  status: 'CONFIRMED',
  startTime: new Date('2026-07-10T14:00:00Z'),
  endTime: new Date('2026-07-10T14:30:00Z'),
  patientId: 42,
  clinicId: 3,
};

describe('EncounterProjectionListener', () => {
  const prisma = { appointments: { findUnique: jest.fn() } };
  const fhirResourceService = { save: jest.fn() };
  let listener: EncounterProjectionListener;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = new EncounterProjectionListener(
      prisma as any,
      fhirResourceService as any,
    );
  });

  it('proyecta Encounter + Provenance con el clinicId de la cita', async () => {
    prisma.appointments.findUnique.mockResolvedValue(dbAppointment);
    fhirResourceService.save.mockResolvedValue({});

    await listener.handleConfirmed({ appointmentId: 55 });

    expect(fhirResourceService.save).toHaveBeenCalledTimes(2);
    expect(fhirResourceService.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: fhirIdFor('Encounter', 55),
        resourceType: 'Encounter',
        clinicId: 3,
      }),
    );
    expect(fhirResourceService.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: provenanceIdFor('Encounter', 55),
        resourceType: 'Provenance',
        clinicId: 3,
      }),
    );
  });

  it('cita sin clínica proyecta con clinicId null', async () => {
    prisma.appointments.findUnique.mockResolvedValue({
      ...dbAppointment,
      clinicId: null,
    });
    fhirResourceService.save.mockResolvedValue({});

    await listener.handleCancelled({ appointmentId: 55 });

    expect(fhirResourceService.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ resourceType: 'Encounter', clinicId: null }),
    );
  });

  it('si la cita no existe, no guarda y no lanza', async () => {
    prisma.appointments.findUnique.mockResolvedValue(null);

    await expect(
      listener.handleConfirmed({ appointmentId: 99 }),
    ).resolves.toBeUndefined();
    expect(fhirResourceService.save).not.toHaveBeenCalled();
  });

  it('si el store falla, no propaga', async () => {
    prisma.appointments.findUnique.mockResolvedValue(dbAppointment);
    fhirResourceService.save.mockRejectedValue(new Error('boom'));

    await expect(
      listener.handleConfirmed({ appointmentId: 55 }),
    ).resolves.toBeUndefined();
  });
});
