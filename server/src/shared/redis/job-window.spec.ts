import { logicalWindowId } from './job-window.js';

describe('logicalWindowId', () => {
  it('RED->GREEN: calcula el identificador determinista de la ventana lógica UTC', () => {
    expect(logicalWindowId(new Date('2026-09-02T10:15:29.999Z'), 30_000)).toBe(
      '1788344100000',
    );
    expect(logicalWindowId(new Date('2026-09-02T10:15:59.999Z'), 60_000)).toBe(
      '1788344100000',
    );
  });
});
