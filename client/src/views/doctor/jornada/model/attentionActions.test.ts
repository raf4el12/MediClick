import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/views/appointments/types';
import { attentionActions } from './attentionActions';

const now = { date: '2026-10-10', time: '10:15' };
const at = (status: AppointmentStatus, date = '2026-10-10', startTime = '11:00') => ({ status, date, startTime });

describe('attentionActions', () => {
  it('una cita confirmada de hoy permite marcar la llegada', () => {
    expect(attentionActions(at(AppointmentStatus.CONFIRMED), now).checkIn).toBe(true);
    expect(attentionActions(at(AppointmentStatus.CONFIRMED, '2026-10-11'), now).checkIn).toBe(false);
    expect(attentionActions(at(AppointmentStatus.PENDING), now).checkIn).toBe(false);
  });

  it('la inasistencia solo se marca en una cita confirmada cuya hora de inicio ya pasó', () => {
    expect(attentionActions(at(AppointmentStatus.CONFIRMED, '2026-10-10', '10:15'), now).noShow).toBe(true);
    expect(attentionActions(at(AppointmentStatus.CONFIRMED, '2026-10-09', '18:00'), now).noShow).toBe(true);
    expect(attentionActions(at(AppointmentStatus.CONFIRMED, '2026-10-10', '10:30'), now).noShow).toBe(false);
    expect(attentionActions(at(AppointmentStatus.PENDING, '2026-10-10', '09:00'), now).noShow).toBe(false);
  });

  it('solo la cita en curso se completa; notas y receta se escriben en curso o completada', () => {
    const inProgress = attentionActions(at(AppointmentStatus.IN_PROGRESS), now);
    const completed = attentionActions(at(AppointmentStatus.COMPLETED), now);
    const confirmed = attentionActions(at(AppointmentStatus.CONFIRMED), now);

    expect([inProgress.complete, completed.complete, confirmed.complete]).toEqual([true, false, false]);
    expect([inProgress.write, completed.write, confirmed.write]).toEqual([true, true, false]);
  });
});
