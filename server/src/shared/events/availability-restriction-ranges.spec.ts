import { liftedDayRanges } from './availability-restriction-ranges.js';

describe('liftedDayRanges', () => {
  const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  const range = (from: string, to: string) => ({
    startDate: day(from),
    endDate: day(to),
  });

  it('sin rango actual (borrado o desactivado) libera todo el anterior', () => {
    expect(liftedDayRanges(range('2030-06-01', '2030-06-05'), null)).toEqual([
      range('2030-06-01', '2030-06-05'),
    ]);
  });

  it('normaliza fechas con hora (feriados a mediodía) a días de agenda', () => {
    expect(
      liftedDayRanges(
        {
          startDate: new Date('2030-06-01T12:00:00.000Z'),
          endDate: new Date('2030-06-01T12:00:00.000Z'),
        },
        null,
      ),
    ).toEqual([range('2030-06-01', '2030-06-01')]);
  });

  it('achicar por delante libera los primeros días', () => {
    expect(
      liftedDayRanges(
        range('2030-06-01', '2030-06-05'),
        range('2030-06-03', '2030-06-05'),
      ),
    ).toEqual([range('2030-06-01', '2030-06-02')]);
  });

  it('achicar por detrás libera los últimos días', () => {
    expect(
      liftedDayRanges(
        range('2030-06-01', '2030-06-05'),
        range('2030-06-01', '2030-06-03'),
      ),
    ).toEqual([range('2030-06-04', '2030-06-05')]);
  });

  it('achicar por ambos lados libera las dos puntas', () => {
    expect(
      liftedDayRanges(
        range('2030-06-01', '2030-06-05'),
        range('2030-06-03', '2030-06-03'),
      ),
    ).toEqual([
      range('2030-06-01', '2030-06-02'),
      range('2030-06-04', '2030-06-05'),
    ]);
  });

  it('mover sin solaparse libera todo el rango anterior', () => {
    expect(
      liftedDayRanges(
        range('2030-06-01', '2030-06-02'),
        range('2030-06-10', '2030-06-11'),
      ),
    ).toEqual([range('2030-06-01', '2030-06-02')]);
  });

  it('agrandar o dejar igual no libera nada', () => {
    expect(
      liftedDayRanges(
        range('2030-06-02', '2030-06-03'),
        range('2030-06-01', '2030-06-05'),
      ),
    ).toEqual([]);
    expect(
      liftedDayRanges(
        range('2030-06-02', '2030-06-03'),
        range('2030-06-02', '2030-06-03'),
      ),
    ).toEqual([]);
  });
});
