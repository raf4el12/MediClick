import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { AcceptOfferUseCase } from './accept-offer.use-case.js';

function buildOffer(overrides: any = {}) {
  return {
    id: 777,
    waitlistEntryId: 55,
    scheduleId: 100,
    startTime: new Date(Date.UTC(2030, 0, 1, 9, 0)),
    endTime: new Date(Date.UTC(2030, 0, 1, 9, 30)),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    status: 'PENDING',
    clinicId: 1,
    entry: {
      patientId: 42,
      patient: {
        profile: { name: 'Luis', lastName: 'Pérez', userId: 900 },
      },
      specialty: { name: 'Cardiología' },
    },
    ...overrides,
  };
}

function buildAppointment(overrides: any = {}) {
  return {
    id: 5000,
    patientId: 42,
    scheduleId: 100,
    startTime: new Date(Date.UTC(2030, 0, 1, 9, 0)),
    endTime: new Date(Date.UTC(2030, 0, 1, 9, 30)),
    status: 'PENDING',
    paymentStatus: 'PENDING',
    schedule: { doctor: { profile: { name: 'Ana', lastName: 'García' } } },
    ...overrides,
  };
}

describe('AcceptOfferUseCase', () => {
  let useCase: AcceptOfferUseCase;
  let offerRepo: any;
  let entryRepo: any;
  let patientRepo: any;
  let appointmentRepo: any;
  let scheduleRepo: any;
  let lock: any;
  let prisma: any;
  let eventEmitter: any;

  beforeEach(() => {
    offerRepo = {
      findById: jest.fn(),
      claimPending: jest.fn(),
      setCreatedAppointment: jest.fn(),
    };
    entryRepo = { update: jest.fn() };
    patientRepo = { findByUserId: jest.fn() };
    appointmentRepo = { createWithOverlapCheck: jest.fn() };
    scheduleRepo = {
      findById: jest.fn().mockResolvedValue({ specialty: { price: 120 } }),
    };
    lock = { release: jest.fn() };
    prisma = { appointments: { update: jest.fn() } };
    eventEmitter = { emit: jest.fn() };
    useCase = new AcceptOfferUseCase(
      offerRepo,
      entryRepo,
      patientRepo,
      appointmentRepo,
      scheduleRepo,
      lock,
      prisma,
      eventEmitter,
    );
  });

  it('lanza NotFound si la oferta no existe', async () => {
    offerRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute(900, 777)).rejects.toThrow(NotFoundException);
  });

  it('lanza Forbidden si la oferta no pertenece al paciente', async () => {
    offerRepo.findById.mockResolvedValue(buildOffer());
    patientRepo.findByUserId.mockResolvedValue({ id: 99 }); // dueño es 42

    await expect(useCase.execute(900, 777)).rejects.toThrow(ForbiddenException);
    expect(offerRepo.claimPending).not.toHaveBeenCalled();
  });

  it('lanza Conflict si el claim atómico falla (oferta ya tomada/expirada)', async () => {
    offerRepo.findById.mockResolvedValue(buildOffer());
    patientRepo.findByUserId.mockResolvedValue({ id: 42 });
    offerRepo.claimPending.mockResolvedValue(null);

    await expect(useCase.execute(900, 777)).rejects.toThrow(ConflictException);
    expect(appointmentRepo.createWithOverlapCheck).not.toHaveBeenCalled();
  });

  it('happy path: crea la cita, cierra la entrada, enlaza la cita y libera el lock', async () => {
    const offer = buildOffer();
    offerRepo.findById.mockResolvedValue(offer);
    patientRepo.findByUserId.mockResolvedValue({ id: 42 });
    offerRepo.claimPending.mockResolvedValue(offer);
    appointmentRepo.createWithOverlapCheck.mockResolvedValue(buildAppointment());

    const result = await useCase.execute(900, 777);

    expect(result.appointmentId).toBe(5000);
    expect(result.amount).toBe(120);
    expect(result.pendingUntil).toBeInstanceOf(Date);
    expect(entryRepo.update).toHaveBeenCalledWith(
      55,
      expect.objectContaining({ status: 'FULFILLED' }),
    );
    expect(offerRepo.setCreatedAppointment).toHaveBeenCalledWith(777, 5000);
    expect(lock.release).toHaveBeenCalledWith(offer.scheduleId, offer.startTime);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'waitlist.offer.accepted',
      expect.objectContaining({ appointmentId: 5000 }),
    );
  });

  it('si el slot fue tomado entre oferta y aceptación, libera el lock y NO cierra la entrada', async () => {
    const offer = buildOffer();
    offerRepo.findById.mockResolvedValue(offer);
    patientRepo.findByUserId.mockResolvedValue({ id: 42 });
    offerRepo.claimPending.mockResolvedValue(offer);
    appointmentRepo.createWithOverlapCheck.mockRejectedValue(
      new ConflictException('overlap'),
    );

    await expect(useCase.execute(900, 777)).rejects.toThrow(ConflictException);
    expect(lock.release).toHaveBeenCalledWith(offer.scheduleId, offer.startTime);
    expect(entryRepo.update).not.toHaveBeenCalled(); // el paciente sigue en cola
  });
});
