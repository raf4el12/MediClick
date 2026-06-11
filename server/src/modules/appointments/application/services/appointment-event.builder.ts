import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import type { AppointmentCancelledEvent } from '../../../../shared/mail/events/mail-events.interface.js';
import type { SlotReleasedEvent } from '../../../../shared/events/availability-events.interface.js';
import {
  DEFAULT_TIMEZONE,
  DEFAULT_CLINIC_NAME,
} from '../../../../shared/constants/defaults.constant.js';

/**
 * Retorna null si el paciente no tiene usuario asociado: el mail y la
 * notificación in-app lo requieren. La reoferta del slot a la waitlist no
 * pasa por aquí — usa `buildSlotReleasedEvent`, que no tiene esa condición.
 */
export function buildAppointmentCancelledEvent(
  appointment: AppointmentWithRelations,
  cancelReason: string | null,
  clinicId: number | null,
): AppointmentCancelledEvent | null {
  if (!appointment.patient.profile.userId) return null;

  return {
    appointmentId: appointment.id,
    patientEmail: appointment.patient.profile.email,
    patientName: `${appointment.patient.profile.name} ${appointment.patient.profile.lastName}`,
    patientUserId: appointment.patient.profile.userId,
    doctorName: `${appointment.schedule.doctor.profile.name} ${appointment.schedule.doctor.profile.lastName}`,
    clinicName: appointment.schedule.doctor.clinic?.name ?? DEFAULT_CLINIC_NAME,
    clinicTimezone:
      appointment.schedule.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE,
    scheduleDate: appointment.schedule.scheduleDate,
    cancelReason,
    scheduleId: appointment.scheduleId,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    clinicId,
  };
}

export function buildSlotReleasedEvent(
  appointment: Pick<
    AppointmentWithRelations,
    'id' | 'scheduleId' | 'startTime' | 'endTime' | 'clinicId'
  >,
  clinicId?: number | null,
): SlotReleasedEvent {
  return {
    appointmentId: appointment.id,
    scheduleId: appointment.scheduleId,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    clinicId: clinicId ?? appointment.clinicId,
  };
}
