import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { AppointmentAccessPolicy } from '../../../../shared/access/appointment-access.policy.js';
import { CheckInWindowService } from '../../domain/services/check-in-window.service.js';
import { AppointmentQrService } from '../services/appointment-qr.service.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import { AppointmentQrResponseDto } from '../dto/appointment-qr-response.dto.js';

@Injectable()
export class IssueAppointmentQrUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AppointmentAccessPolicy,
    private readonly checkInWindowService: CheckInWindowService,
    private readonly qrService: AppointmentQrService,
  ) {}

  async execute(
    appointmentId: number,
    actor: AuthenticatedUser,
  ): Promise<AppointmentQrResponseDto> {
    const appointment = await this.prisma.appointments.findFirst({
      where: { id: appointmentId, deleted: false },
      include: {
        patient: {
          select: {
            id: true,
            profile: { select: { userId: true } },
          },
        },
        schedule: {
          select: {
            scheduleDate: true,
            doctor: {
              select: {
                profile: { select: { userId: true } },
                clinic: { select: { id: true, timezone: true } },
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    const clinicId =
      appointment.schedule.doctor.clinic?.id ?? appointment.clinicId;
    const doctorUserId = appointment.schedule.doctor.profile.userId;
    const patientUserId = appointment.patient.profile.userId;

    this.accessPolicy.authorize(actor, 'ISSUE_QR', {
      id: appointment.id,
      clinicId,
      patientUserId,
      doctorUserId,
    });

    const timezone =
      appointment.schedule.doctor.clinic?.timezone ?? 'America/Lima';

    const window = this.checkInWindowService.getWindow({
      scheduleDate: appointment.schedule.scheduleDate,
      startTime: appointment.startTime,
      timezone,
    });

    const qrToken = this.qrService.generateCheckInQrToken(
      {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        clinicId,
      },
      window.closesAt,
    );

    return {
      appointmentId: appointment.id,
      qrToken,
      opensAt: window.opensAt,
      expiresAt: window.closesAt,
    };
  }
}
