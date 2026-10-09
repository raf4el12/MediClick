import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JoinWaitlistUseCase } from './join-waitlist.use-case.js';
import { WaitlistTimePreference } from '../../domain/enums/waitlist-time-preference.enum.js';

function buildCreatedEntry(overrides: any = {}) {
  return {
    id: 55,
    patientId: 42,
    specialtyId: 3,
    doctorId: null,
    clinicId: 1,
    dateFrom: new Date('2030-06-01'),
    dateTo: new Date('2030-06-15'),
    timePreference: WaitlistTimePreference.ANY,
    priority: 0,
    status: 'ACTIVE',
    waitUntil: new Date('2030-06-16'),
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
        email: 'l@t.com',
      },
    },
    specialty: { id: 3, name: 'Cardiología' },
    doctor: null,
    ...overrides,
  };
}

const VALID_DTO = {
  specialtyId: 3,
  clinicId: 1,
  dateFrom: '2030-06-01',
  dateTo: '2030-06-15',
};

describe('JoinWaitlistUseCase', () => {
  let useCase: JoinWaitlistUseCase;
  let entryRepo: any;
  let patientRepo: any;
  let specialtyRepo: any;
  let doctorRepo: any;
  let clinicRepo: any;

  beforeEach(() => {
    entryRepo = {
      existsActiveDuplicate: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(buildCreatedEntry()),
    };
    patientRepo = { findByUserId: jest.fn().mockResolvedValue({ id: 42 }) };
    specialtyRepo = {
      findById: jest.fn().mockResolvedValue({
        id: 3,
        name: 'Cardiología',
        clinicId: 1,
        isActive: true,
        deleted: false,
        price: 120,
      }),
    };
    doctorRepo = { findById: jest.fn() };
    clinicRepo = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 1, isActive: true, deleted: false }),
    };
    useCase = new JoinWaitlistUseCase(
      entryRepo,
      patientRepo,
      specialtyRepo,
      doctorRepo,
      clinicRepo,
    );
  });

  it('lanza NotFound si el usuario no tiene perfil de paciente', async () => {
    patientRepo.findByUserId.mockResolvedValue(null);
    await expect(useCase.execute(900, VALID_DTO as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza BadRequest si la especialidad no existe o está inactiva', async () => {
    specialtyRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute(900, VALID_DTO as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza BadRequest si dateFrom es posterior a dateTo', async () => {
    await expect(
      useCase.execute(900, {
        specialtyId: 3,
        dateFrom: '2030-06-20',
        dateTo: '2030-06-01',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza Conflict si el paciente ya está en cola para misma especialidad/doctor', async () => {
    entryRepo.existsActiveDuplicate.mockResolvedValue(true);
    await expect(useCase.execute(900, VALID_DTO as any)).rejects.toThrow(
      ConflictException,
    );
    expect(entryRepo.create).not.toHaveBeenCalled();
  });

  it('happy path: sin médico, crea la entrada en la sede indicada y con waitUntil', async () => {
    const result = await useCase.execute(900, VALID_DTO as any);

    expect(result.id).toBe(55);
    const createArg = entryRepo.create.mock.calls[0][0];
    expect(createArg.patientId).toBe(42);
    expect(createArg.clinicId).toBe(1); // la sede elegida al anotarse
    expect(createArg.waitUntil).toBeInstanceOf(Date);
    // waitUntil = fin del último día de la ventana (dateTo + 1 día)
    expect(createArg.waitUntil.getTime()).toBeGreaterThan(
      createArg.dateTo.getTime(),
    );
  });

  it('valida la existencia del doctor cuando se especifica doctorId', async () => {
    doctorRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute(900, { ...VALID_DTO, doctorId: 7 } as any),
    ).rejects.toThrow(BadRequestException);
  });

  describe('sede de la entrada (decisión 2026-10-06)', () => {
    const doctor = (clinicId: number | null) => ({
      id: 7,
      clinicId,
      isActive: true,
      deleted: false,
    });

    it('sin médico la sede es obligatoria', async () => {
      const { clinicId: _omit, ...withoutClinic } = VALID_DTO;
      await expect(useCase.execute(900, withoutClinic as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(entryRepo.create).not.toHaveBeenCalled();
    });

    it('con médico toma la sede del médico, aunque la especialidad sea global', async () => {
      specialtyRepo.findById.mockResolvedValue({
        id: 3,
        clinicId: null,
        isActive: true,
        deleted: false,
      });
      doctorRepo.findById.mockResolvedValue(doctor(2));

      await useCase.execute(900, {
        specialtyId: 3,
        doctorId: 7,
        dateFrom: '2030-06-01',
        dateTo: '2030-06-15',
      } as any);

      expect(entryRepo.create.mock.calls[0][0].clinicId).toBe(2);
    });

    it('con médico y una sede distinta a la suya rechaza la entrada', async () => {
      doctorRepo.findById.mockResolvedValue(doctor(2));

      await expect(
        useCase.execute(900, { ...VALID_DTO, doctorId: 7, clinicId: 1 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('una especialidad propia de otra sede rechaza la entrada', async () => {
      clinicRepo.findById.mockResolvedValue({
        id: 2,
        isActive: true,
        deleted: false,
      });

      await expect(
        useCase.execute(900, { ...VALID_DTO, clinicId: 2 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('una sede inexistente o inactiva rechaza la entrada', async () => {
      clinicRepo.findById.mockResolvedValue(null);
      await expect(useCase.execute(900, VALID_DTO as any)).rejects.toThrow(
        BadRequestException,
      );

      clinicRepo.findById.mockResolvedValue({
        id: 1,
        isActive: false,
        deleted: false,
      });
      await expect(useCase.execute(900, VALID_DTO as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
