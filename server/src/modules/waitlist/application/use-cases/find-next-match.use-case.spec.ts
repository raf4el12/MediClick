import { FindNextMatchUseCase } from './find-next-match.use-case.js';
import { WaitlistTimePreference } from '../../domain/enums/waitlist-time-preference.enum.js';

function buildSchedule(overrides: any = {}) {
  return {
    id: 100,
    doctorId: 7,
    specialtyId: 3,
    scheduleDate: new Date(Date.UTC(2030, 5, 1)),
    timeFrom: new Date(Date.UTC(2030, 0, 1, 8, 0)),
    timeTo: new Date(Date.UTC(2030, 0, 1, 18, 0)),
    createdAt: new Date(),
    updatedAt: null,
    doctor: {
      id: 7,
      profile: { name: 'Ana', lastName: 'García' },
      clinic: { timezone: 'America/Lima' },
    },
    specialty: { id: 3, name: 'Cardiología', price: 120 },
    ...overrides,
  };
}

function buildEntry(overrides: any = {}) {
  return {
    id: 55,
    patientId: 42,
    specialtyId: 3,
    doctorId: null,
    clinicId: 1,
    dateFrom: new Date(Date.UTC(2030, 5, 1)),
    dateTo: new Date(Date.UTC(2030, 5, 30)),
    timePreference: WaitlistTimePreference.ANY,
    priority: 0,
    status: 'ACTIVE',
    waitUntil: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: null,
    fulfilledAt: null,
    patient: {
      id: 42,
      profile: {
        name: 'Luis',
        lastName: 'Pérez',
        userId: 900,
        email: 'luis@test.com',
      },
    },
    specialty: { id: 3, name: 'Cardiología' },
    doctor: null,
    ...overrides,
  };
}

function buildOffer(entry: any, overrides: any = {}) {
  return {
    id: 777,
    waitlistEntryId: entry.id,
    scheduleId: 100,
    startTime: new Date(Date.UTC(2030, 0, 1, 9, 0)),
    endTime: new Date(Date.UTC(2030, 0, 1, 9, 30)),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    status: 'PENDING',
    acceptedAt: null,
    rejectedAt: null,
    createdAppointmentId: null,
    clinicId: 1,
    createdAt: new Date(),
    entry,
    ...overrides,
  };
}

const SLOT = {
  scheduleId: 100,
  startTime: new Date(Date.UTC(2030, 0, 1, 9, 0)), // 09:00 → MORNING
  endTime: new Date(Date.UTC(2030, 0, 1, 9, 30)),
  clinicId: 1,
};

describe('FindNextMatchUseCase', () => {
  let useCase: FindNextMatchUseCase;
  let entryRepo: any;
  let offerRepo: any;
  let scheduleRepo: any;
  let appointmentRepo: any;
  let lock: any;
  let eventEmitter: any;

  beforeEach(() => {
    entryRepo = { findNextMatch: jest.fn() };
    offerRepo = { create: jest.fn() };
    scheduleRepo = { findById: jest.fn() };
    appointmentRepo = { hasOverlappingAppointment: jest.fn() };
    lock = { acquire: jest.fn(), release: jest.fn() };
    eventEmitter = { emit: jest.fn() };
    useCase = new FindNextMatchUseCase(
      entryRepo,
      offerRepo,
      scheduleRepo,
      appointmentRepo,
      lock,
      eventEmitter,
    );
  });

  it('no hace nada si el lock del slot ya está tomado', async () => {
    lock.acquire.mockResolvedValue(false);

    const result = await useCase.execute(SLOT);

    expect(result).toBeNull();
    expect(scheduleRepo.findById).not.toHaveBeenCalled();
    expect(offerRepo.create).not.toHaveBeenCalled();
  });

  it('libera el lock y retorna null si el schedule no existe', async () => {
    lock.acquire.mockResolvedValue(true);
    scheduleRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute(SLOT);

    expect(result).toBeNull();
    expect(lock.release).toHaveBeenCalledWith(SLOT.scheduleId, SLOT.startTime);
  });

  it('libera el lock y no busca candidato si el slot ya está ocupado', async () => {
    lock.acquire.mockResolvedValue(true);
    scheduleRepo.findById.mockResolvedValue(buildSchedule());
    appointmentRepo.hasOverlappingAppointment.mockResolvedValue(true);

    const result = await useCase.execute(SLOT);

    expect(result).toBeNull();
    expect(entryRepo.findNextMatch).not.toHaveBeenCalled();
    expect(lock.release).toHaveBeenCalledWith(SLOT.scheduleId, SLOT.startTime);
  });

  it('libera el lock y retorna null si no hay candidato en cola', async () => {
    lock.acquire.mockResolvedValue(true);
    scheduleRepo.findById.mockResolvedValue(buildSchedule());
    appointmentRepo.hasOverlappingAppointment.mockResolvedValue(false);
    entryRepo.findNextMatch.mockResolvedValue(null);

    const result = await useCase.execute(SLOT);

    expect(result).toBeNull();
    expect(offerRepo.create).not.toHaveBeenCalled();
    expect(lock.release).toHaveBeenCalledWith(SLOT.scheduleId, SLOT.startTime);
  });

  it('crea la oferta y emite el evento cuando hay candidato, sin liberar el lock', async () => {
    const entry = buildEntry();
    lock.acquire.mockResolvedValue(true);
    scheduleRepo.findById.mockResolvedValue(buildSchedule());
    appointmentRepo.hasOverlappingAppointment.mockResolvedValue(false);
    entryRepo.findNextMatch.mockResolvedValue(entry);
    offerRepo.create.mockResolvedValue(buildOffer(entry));

    const result = await useCase.execute(SLOT);

    expect(result).not.toBeNull();
    expect(offerRepo.create).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'waitlist.offer.created',
      expect.objectContaining({ offerId: 777, patientUserId: 900 }),
    );
    // El lock se mantiene reservado para este paciente hasta que resuelva la oferta.
    expect(lock.release).not.toHaveBeenCalled();
  });

  it('consulta con las franjas correctas: ANY + franja del slot (MORNING para 09:00)', async () => {
    lock.acquire.mockResolvedValue(true);
    scheduleRepo.findById.mockResolvedValue(buildSchedule());
    appointmentRepo.hasOverlappingAppointment.mockResolvedValue(false);
    entryRepo.findNextMatch.mockResolvedValue(null);

    await useCase.execute(SLOT);

    const criteria = entryRepo.findNextMatch.mock.calls[0][0];
    expect(criteria.timeBuckets).toEqual([
      WaitlistTimePreference.ANY,
      WaitlistTimePreference.MORNING,
    ]);
    expect(criteria.specialtyId).toBe(3);
    expect(criteria.doctorId).toBe(7);
  });

  it('libera el lock si ocurre un error inesperado al crear la oferta', async () => {
    const entry = buildEntry();
    lock.acquire.mockResolvedValue(true);
    scheduleRepo.findById.mockResolvedValue(buildSchedule());
    appointmentRepo.hasOverlappingAppointment.mockResolvedValue(false);
    entryRepo.findNextMatch.mockResolvedValue(entry);
    offerRepo.create.mockRejectedValue(new Error('db down'));

    const result = await useCase.execute(SLOT);

    expect(result).toBeNull();
    expect(lock.release).toHaveBeenCalledWith(SLOT.scheduleId, SLOT.startTime);
  });
});
