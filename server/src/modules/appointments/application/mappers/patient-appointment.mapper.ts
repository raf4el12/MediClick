import type { AppointmentWithRelations } from '../../domain/interfaces/appointment-data.interface.js';
import type { AppointmentResponseDto } from '../dto/appointment-response.dto.js';
import { dateToTimeString } from '../../../../shared/utils/date-time.utils.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';

/** Cita vista por su paciente: incluye la sede, porque el paciente es multi-sede. */
export function toPatientAppointmentResponse(
  a: AppointmentWithRelations,
): AppointmentResponseDto {
  const clinic = a.schedule.doctor.clinic;
  return {
    id: a.id,
    patientId: a.patientId,
    scheduleId: a.scheduleId,
    startTime: dateToTimeString(a.startTime),
    endTime: dateToTimeString(a.endTime),
    reason: a.reason,
    notes: a.notes,
    status: a.status,
    paymentStatus: a.paymentStatus,
    amount: a.amount,
    cancelReason: a.cancelReason,
    cancellationFee: a.cancellationFee,
    isOverbook: a.isOverbook,
    pendingUntil: a.pendingUntil ?? null,
    confirmedAt: a.confirmedAt ?? null,
    isAtRisk: a.isAtRisk ?? false,
    patient: {
      id: a.patient.id,
      name: a.patient.profile.name,
      lastName: a.patient.profile.lastName,
      email: a.patient.profile.email,
    },
    schedule: {
      id: a.schedule.id,
      scheduleDate: a.schedule.scheduleDate,
      timeFrom: dateToTimeString(a.schedule.timeFrom),
      timeTo: dateToTimeString(a.schedule.timeTo),
      doctor: {
        id: a.schedule.doctor.id,
        name: a.schedule.doctor.profile.name,
        lastName: a.schedule.doctor.profile.lastName,
      },
      specialty: a.schedule.specialty,
    },
    timezone: clinic?.timezone ?? DEFAULT_TIMEZONE,
    hasPrescription: a.hasPrescription,
    notesCount: a.notesCount,
    createdAt: a.createdAt,
    clinic:
      clinic && clinic.id !== undefined
        ? {
            id: clinic.id,
            name: clinic.name,
            address: clinic.address ?? null,
            currency: clinic.currency ?? '',
          }
        : null,
  };
}
