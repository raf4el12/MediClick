import { AvailabilityEntity } from '../../../availability/domain/entities/availability.entity.js';
import { HolidayEntity } from '../../../holidays/domain/entities/holiday.entity.js';
import { AvailabilityType } from '../../../../shared/domain/enums/availability-type.enum.js';
import { DayOfWeek } from '../../../../shared/domain/enums/day-of-week.enum.js';
import {
  ScheduleGenerationPlanner,
  type GenerationInput,
} from './schedule-generation-planner.service.js';

describe('ScheduleGenerationPlanner', () => {
  const planner = new ScheduleGenerationPlanner();
  const date = new Date('2099-01-05T00:00:00.000Z');

  const rule = (specialtyId: number): AvailabilityEntity => ({
    id: specialtyId,
    doctorId: 3,
    specialtyId,
    startDate: null,
    endDate: null,
    dayOfWeek: DayOfWeek.MONDAY,
    timeFrom: new Date('1970-01-01T08:00:00.000Z'),
    timeTo: new Date('1970-01-01T09:00:00.000Z'),
    isAvailable: true,
    type: AvailabilityType.REGULAR,
    reason: null,
    clinicId: 7,
    createdAt: new Date(),
    updatedAt: null,
  });

  const holidayForClinic = (clinicId: number | null): HolidayEntity => ({
    id: clinicId ?? 99,
    name: 'Feriado de prueba',
    date,
    year: 2099,
    isRecurring: false,
    isActive: true,
    clinicId,
    createdAt: new Date(),
    updatedAt: null,
  });

  const input = (
    specialties: number[],
    holidays: HolidayEntity[] = [],
  ): GenerationInput => ({
    doctorId: 3,
    clinicId: 7,
    dates: [date],
    availabilities: specialties.map(rule),
    holidays,
    scheduleBlocks: [],
    specialties: new Map(
      specialties.map((specialtyId) => [
        specialtyId,
        { duration: 30, bufferMinutes: 0 },
      ]),
    ),
    existingSchedules: [],
  });

  it('genera el mismo intervalo para dos especialidades distintas', () => {
    const result = planner.plan(input([2, 9]));

    expect(result.desired).toHaveLength(4);
    expect(result.desired.map((slot) => slot.specialtyId)).toEqual([
      2, 2, 9, 9,
    ]);
  });

  it('no descarta cupos por un feriado de otra sede', () => {
    const result = planner.plan(input([2], [holidayForClinic(99)]));

    expect(result.desired).toHaveLength(2);
    expect(result.skipped).toEqual([]);
  });

  it('solo omite la especialidad y sede cuya identidad ya existe', () => {
    const result = planner.plan({
      ...input([2, 9]),
      existingSchedules: [
        {
          specialtyId: 2,
          clinicId: 7,
          scheduleDate: date,
          timeFrom: new Date('1970-01-01T08:00:00.000Z'),
          timeTo: new Date('1970-01-01T08:30:00.000Z'),
        },
      ],
    });

    expect(result.desired).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ specialtyId: 2 }),
        expect.objectContaining({ specialtyId: 9 }),
      ]),
    );
    expect(
      result.desired.filter((slot) => slot.specialtyId === 9),
    ).toHaveLength(2);
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'EXISTING_SLOT' }),
      ]),
    );
  });

  it('descarta cupos por un feriado global o de la sede del médico', () => {
    const globalResult = planner.plan(input([2], [holidayForClinic(null)]));
    const clinicResult = planner.plan(input([2], [holidayForClinic(7)]));

    expect(globalResult.desired).toEqual([]);
    expect(clinicResult.desired).toEqual([]);
    expect(globalResult.skipped[0]).toMatchObject({ reason: 'HOLIDAY' });
    expect(clinicResult.skipped[0]).toMatchObject({ reason: 'HOLIDAY' });
  });
});
