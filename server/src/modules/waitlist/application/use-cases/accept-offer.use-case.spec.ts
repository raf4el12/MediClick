import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { AcceptOfferUseCase } from './accept-offer.use-case.js';
import { AcceptOfferAtomicallyError } from '../../domain/repositories/waitlist-offer.repository.js';

/**
 * SDD-013: el use-case ya no orquesta claim → create appointment → update
 * amount/pendingUntil → update entry → link offer como pasos separados. Todo
 * eso vive en `acceptOfferAtomically` (repositorio, dentro de una única
 * transacción serializable). Estos tests verifican que el use-case: resuelve
 * ownership, delega la operación atómica con los parámetros correctos, y
 * traduce cada motivo de fallo (`OFFER_NOT_CLAIMABLE` / `SLOT_OVERLAP`) a la
 * excepción HTTP correspondiente — incluyendo la liberación del lock solo en
 * el caso de overlap (la entrada nunca llegó a cerrarse porque la transacción
 * completa hizo rollback).
 */

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

function buildAcceptedOffer(overrides: any = {}) {
  return {
    offer: buildOffer(),
    appointment: {
      id: 5000,
      scheduleId: 100,
      startTime: new Date(Date.UTC(2030, 0, 1, 9, 0)),
      endTime: new Date(Date.UTC(2030, 0, 1, 9, 30)),
      status: 'PENDING',
      paymentStatus: 'PENDING',
      amount: 120,
      pendingUntil: new Date(Date.now() + 15 * 60 * 1000),
      schedule: { doctor: { profile: { name: 'Ana', lastName: 'García' } } },
    },
    ...overrides,
  };
}

describe('AcceptOfferUseCase', () => {
  let useCase: AcceptOfferUseCase;
  let offerRepo: any;
  let patientRepo: any;
  let scheduleRepo: any;
  let lock: any;
  let eventEmitter: any;

  beforeEach(() => {
    offerRepo = {
      findById: jest.fn(),
      acceptOfferAtomically: jest.fn(),
    };
    patientRepo = { findByUserId: jest.fn() };
    scheduleRepo = {
      findById: jest.fn().mockResolvedValue({ specialty: { price: 120 } }),
    };
    lock = { release: jest.fn() };
    eventEmitter = { emit: jest.fn() };
    useCase = new AcceptOfferUseCase(
      offerRepo,
      patientRepo,
      scheduleRepo,
      lock,
      eventEmitter,
    );
  });

  it('lanza NotFound si la oferta no existe', async () => {
    offerRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute(900, 777)).rejects.toThrow(NotFoundException);
    expect(offerRepo.acceptOfferAtomically).not.toHaveBeenCalled();
  });

  it('lanza Forbidden si la oferta no pertenece al paciente', async () => {
    offerRepo.findById.mockResolvedValue(buildOffer());
    patientRepo.findByUserId.mockResolvedValue({ id: 99 }); // dueño es 42

    await expect(useCase.execute(900, 777)).rejects.toThrow(ForbiddenException);
    expect(offerRepo.acceptOfferAtomically).not.toHaveBeenCalled();
  });

  it('lanza Conflict si la operación atómica falla por OFFER_NOT_CLAIMABLE (ya tomada/expirada)', async () => {
    offerRepo.findById.mockResolvedValue(buildOffer());
    patientRepo.findByUserId.mockResolvedValue({ id: 42 });
    offerRepo.acceptOfferAtomically.mockRejectedValue(
      new AcceptOfferAtomicallyError('OFFER_NOT_CLAIMABLE'),
    );

    await expect(useCase.execute(900, 777)).rejects.toThrow(ConflictException);
    // No hay lock que liberar: la oferta nunca fue reclamada por esta llamada.
    expect(lock.release).not.toHaveBeenCalled();
  });

  it('happy path: delega la operación atómica con offerId/patientId/amount/pendingUntil y libera el lock', async () => {
    const offer = buildOffer();
    offerRepo.findById.mockResolvedValue(offer);
    patientRepo.findByUserId.mockResolvedValue({ id: 42 });
    offerRepo.acceptOfferAtomically.mockResolvedValue(buildAcceptedOffer());

    const result = await useCase.execute(900, 777);

    expect(offerRepo.acceptOfferAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        offerId: 777,
        patientId: 42,
        amount: 120,
        now: expect.any(Date),
        pendingUntil: expect.any(Date),
      }),
    );
    expect(result.appointmentId).toBe(5000);
    expect(result.amount).toBe(120);
    expect(result.pendingUntil).toBeInstanceOf(Date);
    expect(lock.release).toHaveBeenCalledWith(
      offer.scheduleId,
      offer.startTime,
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'waitlist.offer.accepted',
      expect.objectContaining({ appointmentId: 5000 }),
    );
  });

  it('si el slot fue tomado entre oferta y aceptación (SLOT_OVERLAP), libera el lock y devuelve Conflict', async () => {
    const offer = buildOffer();
    offerRepo.findById.mockResolvedValue(offer);
    patientRepo.findByUserId.mockResolvedValue({ id: 42 });
    offerRepo.acceptOfferAtomically.mockRejectedValue(
      new AcceptOfferAtomicallyError('SLOT_OVERLAP'),
    );

    await expect(useCase.execute(900, 777)).rejects.toThrow(ConflictException);
    expect(lock.release).toHaveBeenCalledWith(
      offer.scheduleId,
      offer.startTime,
    );
  });

  it('propaga errores inesperados sin traducirlos a Conflict', async () => {
    const offer = buildOffer();
    offerRepo.findById.mockResolvedValue(offer);
    patientRepo.findByUserId.mockResolvedValue({ id: 42 });
    const unexpected = new Error('db down');
    offerRepo.acceptOfferAtomically.mockRejectedValue(unexpected);

    await expect(useCase.execute(900, 777)).rejects.toThrow('db down');
    expect(lock.release).not.toHaveBeenCalled();
  });
});
