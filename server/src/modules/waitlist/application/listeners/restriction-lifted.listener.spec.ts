import { RestrictionLiftedListener } from './restriction-lifted.listener.js';
import type { AvailabilityRestrictionLiftedEvent } from '../../../../shared/events/availability-events.interface.js';
import type { FreeSlotsService } from '../../../schedules/domain/services/free-slots.service.js';
import type { GenerateSchedulesUseCase } from '../../../schedules/application/use-cases/generate-schedules.use-case.js';
import type { FindNextMatchUseCase } from '../use-cases/find-next-match.use-case.js';

describe('RestrictionLiftedListener', () => {
  const hour = (h: number) => new Date(Date.UTC(1970, 0, 1, h));
  const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

  let freeSlots: jest.Mocked<Pick<FreeSlotsService, 'find'>>;
  let generateSchedules: jest.Mocked<Pick<GenerateSchedulesUseCase, 'execute'>>;
  let findNextMatch: jest.Mocked<Pick<FindNextMatchUseCase, 'execute'>>;
  let listener: RestrictionLiftedListener;

  const slot = (
    scheduleId: number,
    h: number,
    clinicId: number | null = 7,
  ) => ({
    scheduleId,
    clinicId,
    startTime: hour(h),
    endTime: hour(h + 1),
  });

  const blockEvent = (
    overrides: Partial<AvailabilityRestrictionLiftedEvent> = {},
  ): AvailabilityRestrictionLiftedEvent => ({
    restrictionType: 'SCHEDULE_BLOCK',
    restrictionId: 1,
    clinicId: 7,
    doctorId: 3,
    liftedRanges: [
      { startDate: day('2099-01-15'), endDate: day('2099-01-16') },
    ],
    occurredAt: new Date(),
    actorId: 42,
    ...overrides,
  });

  beforeEach(() => {
    freeSlots = {
      find: jest.fn().mockResolvedValue([slot(10, 8), slot(10, 9)]),
    };
    generateSchedules = {
      execute: jest.fn().mockResolvedValue({
        generated: 0,
        skipped: 0,
        deleted: 0,
        message: '',
      }),
    };
    findNextMatch = { execute: jest.fn().mockResolvedValue(null) };
    listener = new RestrictionLiftedListener(
      freeSlots as unknown as FreeSlotsService,
      generateSchedules as unknown as GenerateSchedulesUseCase,
      findNextMatch as unknown as FindNextMatchUseCase,
    );
  });

  it('un bloqueo levantado reofrece cada cupo libre del médico en el rango', async () => {
    await listener.handle(blockEvent());

    expect(freeSlots.find).toHaveBeenCalledWith({
      doctorId: 3,
      from: day('2099-01-15'),
      to: day('2099-01-16'),
    });
    expect(generateSchedules.execute).not.toHaveBeenCalled();
    expect(findNextMatch.execute).toHaveBeenCalledTimes(2);
    expect(findNextMatch.execute).toHaveBeenCalledWith({
      scheduleId: 10,
      clinicId: 7,
      startTime: hour(8),
      endTime: hour(9),
    });
  });

  it('un feriado de sede completa la agenda del día y evalúa a todos los médicos de la sede', async () => {
    await listener.handle(
      blockEvent({
        restrictionType: 'HOLIDAY',
        doctorId: null,
        liftedRanges: [
          { startDate: day('2099-01-15'), endDate: day('2099-01-15') },
        ],
      }),
    );

    expect(generateSchedules.execute).toHaveBeenCalledWith(
      { dateFrom: '2099-01-15', dateTo: '2099-01-15' },
      7,
    );
    expect(freeSlots.find).toHaveBeenCalledWith({
      clinicId: 7,
      from: day('2099-01-15'),
      to: day('2099-01-15'),
    });
    const generateOrder = generateSchedules.execute.mock.invocationCallOrder[0];
    const findOrder = freeSlots.find.mock.invocationCallOrder[0];
    expect(generateOrder).toBeLessThan(findOrder);
  });

  it('un feriado global evalúa todas las sedes', async () => {
    await listener.handle(
      blockEvent({
        restrictionType: 'HOLIDAY',
        doctorId: null,
        clinicId: null,
      }),
    );

    expect(generateSchedules.execute).toHaveBeenCalledWith(
      expect.anything(),
      null,
    );
    expect(freeSlots.find).toHaveBeenCalledWith({
      from: day('2099-01-15'),
      to: day('2099-01-16'),
    });
  });

  it('un cupo que falla no frena el resto y los repetidos entre rangos se evalúan una vez', async () => {
    freeSlots.find
      .mockResolvedValueOnce([slot(10, 8), slot(10, 9)])
      .mockResolvedValueOnce([slot(10, 9), slot(11, 8)]);
    findNextMatch.execute
      .mockRejectedValueOnce(new Error('lock caído'))
      .mockResolvedValue(null);

    await listener.handle(
      blockEvent({
        liftedRanges: [
          { startDate: day('2099-01-15'), endDate: day('2099-01-15') },
          { startDate: day('2099-01-17'), endDate: day('2099-01-17') },
        ],
      }),
    );

    expect(findNextMatch.execute).toHaveBeenCalledTimes(3);
  });

  it('si generar la agenda tras un feriado falla, igual evalúa lo que exista', async () => {
    generateSchedules.execute.mockRejectedValue(
      new Error('sin disponibilidad'),
    );

    await listener.handle(
      blockEvent({ restrictionType: 'HOLIDAY', doctorId: null }),
    );

    expect(freeSlots.find).toHaveBeenCalled();
    expect(findNextMatch.execute).toHaveBeenCalledTimes(2);
  });

  it('un bloqueo sin médico no evalúa nada', async () => {
    await listener.handle(blockEvent({ doctorId: null }));

    expect(freeSlots.find).not.toHaveBeenCalled();
    expect(findNextMatch.execute).not.toHaveBeenCalled();
  });
});
