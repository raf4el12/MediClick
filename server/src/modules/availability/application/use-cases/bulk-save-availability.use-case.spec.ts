import { BulkSaveAvailabilityUseCase } from './bulk-save-availability.use-case.js';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';

describe('BulkSaveAvailabilityUseCase', () => {
  let useCase: BulkSaveAvailabilityUseCase;
  let availabilityRepository: Record<string, jest.Mock>;
  let scheduleRegenerationService: { regenerateForDoctor: jest.Mock };

  const dto = {
    doctorId: 3,
    specialtyId: 2,
    entries: [
      {
        startDate: '2099-01-01',
        endDate: '2099-12-31',
        dayOfWeek: DayOfWeek.MONDAY,
        timeFrom: '08:00',
        timeTo: '12:00',
        type: AvailabilityType.REGULAR,
      },
    ],
  };

  const persistedAvailability = {
    id: 40,
    doctorId: 3,
    specialtyId: 2,
    clinicId: 7,
    startDate: new Date('2099-01-01T00:00:00.000Z'),
    endDate: new Date('2099-12-31T00:00:00.000Z'),
    dayOfWeek: DayOfWeek.MONDAY,
    timeFrom: new Date('1970-01-01T08:00:00.000Z'),
    timeTo: new Date('1970-01-01T12:00:00.000Z'),
    isAvailable: true,
    type: AvailabilityType.REGULAR,
    reason: null,
    createdAt: new Date(),
    updatedAt: null,
    doctor: { id: 3, profile: { name: 'Ana', lastName: 'Médica' } },
    specialty: { id: 2, name: 'Medicina' },
  };

  beforeEach(() => {
    availabilityRepository = {
      existsDoctorSpecialty: jest.fn().mockResolvedValue(true),
      replaceForDoctorSpecialty: jest
        .fn()
        .mockResolvedValue([persistedAvailability]),
      softDeleteByDoctor: jest.fn(),
      create: jest.fn().mockResolvedValue(persistedAvailability),
    };
    scheduleRegenerationService = { regenerateForDoctor: jest.fn() };
    useCase = new BulkSaveAvailabilityUseCase(
      availabilityRepository as any,
      { findById: jest.fn().mockResolvedValue({ id: 3, clinicId: 7 }) } as any,
      scheduleRegenerationService as any,
    );
  });

  it('reemplaza una especialidad con una sola operación atómica', async () => {
    await useCase.execute(dto);

    expect(
      availabilityRepository.replaceForDoctorSpecialty,
    ).toHaveBeenCalledWith(3, 2, [
      expect.objectContaining({
        doctorId: 3,
        specialtyId: 2,
        clinicId: 7,
      }),
    ]);
    expect(availabilityRepository.softDeleteByDoctor).not.toHaveBeenCalled();
    expect(availabilityRepository.create).not.toHaveBeenCalled();
    expect(scheduleRegenerationService.regenerateForDoctor).toHaveBeenCalled();
  });

  it('no regenera cupos si el reemplazo atómico falla', async () => {
    availabilityRepository.replaceForDoctorSpecialty.mockRejectedValue(
      new Error('constraint failure'),
    );

    await expect(useCase.execute(dto)).rejects.toThrow('constraint failure');

    expect(
      scheduleRegenerationService.regenerateForDoctor,
    ).not.toHaveBeenCalled();
  });
});
