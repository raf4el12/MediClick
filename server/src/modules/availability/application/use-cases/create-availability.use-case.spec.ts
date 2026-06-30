import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateAvailabilityUseCase } from './create-availability.use-case.js';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';

describe('CreateAvailabilityUseCase', () => {
  let useCase: CreateAvailabilityUseCase;
  let availabilityRepository: {
    existsDoctorSpecialty: jest.Mock;
    findOverlapping: jest.Mock;
    create: jest.Mock;
  };
  let doctorRepository: { findById: jest.Mock };

  const buildCreated = () => ({
    id: 1,
    doctorId: 3,
    specialtyId: 2,
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    endDate: new Date('2026-07-01T00:00:00.000Z'),
    dayOfWeek: DayOfWeek.MONDAY,
    timeFrom: new Date('1970-01-01T08:00:00.000Z'),
    timeTo: new Date('1970-01-01T12:00:00.000Z'),
    isAvailable: true,
    type: AvailabilityType.REGULAR,
    reason: null,
    createdAt: new Date(),
    doctor: { id: 3, profile: { name: 'Dr', lastName: 'House' } },
    specialty: { id: 2, name: 'Medicina' },
  });

  const dto = {
    doctorId: 3,
    specialtyId: 2,
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    dayOfWeek: DayOfWeek.MONDAY,
    timeFrom: '08:00',
    timeTo: '12:00',
    type: AvailabilityType.REGULAR,
  };

  beforeEach(() => {
    availabilityRepository = {
      existsDoctorSpecialty: jest.fn().mockResolvedValue(true),
      findOverlapping: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(buildCreated()),
    };
    doctorRepository = {
      findById: jest.fn().mockResolvedValue({ id: 3, clinicId: 7 }),
    };

    useCase = new CreateAvailabilityUseCase(
      availabilityRepository as any,
      doctorRepository as any,
    );
  });

  it('permite una vigencia de un solo día (startDate === endDate)', async () => {
    await expect(
      useCase.execute({ ...dto, startDate: '2026-07-01', endDate: '2026-07-01' }),
    ).resolves.toBeDefined();
    expect(availabilityRepository.create).toHaveBeenCalled();
  });

  it('rechaza startDate posterior a endDate', async () => {
    await expect(
      useCase.execute({ ...dto, startDate: '2026-07-31', endDate: '2026-07-01' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('REGULAR que solapa otra regla: lanza Conflict', async () => {
    availabilityRepository.findOverlapping.mockResolvedValue([{ id: 99 }]);

    await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
    expect(availabilityRepository.create).not.toHaveBeenCalled();
  });

  it('EXCEPTION no pasa por la validación de solapamiento (pisa la regla por diseño)', async () => {
    availabilityRepository.findOverlapping.mockResolvedValue([{ id: 99 }]);

    await expect(
      useCase.execute({
        ...dto,
        type: AvailabilityType.EXCEPTION,
        startDate: '2026-07-06',
        endDate: '2026-07-06',
        reason: 'Congreso',
      }),
    ).resolves.toBeDefined();

    expect(availabilityRepository.findOverlapping).not.toHaveBeenCalled();
    expect(availabilityRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: AvailabilityType.EXCEPTION }),
    );
  });
});
