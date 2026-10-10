import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { ScheduleBlockType } from '../../../../shared/domain/enums/schedule-block-type.enum.js';

export class AgendaRangeDto {
  @ApiProperty({ example: '2026-10-05' })
  from: string;

  @ApiProperty({ example: '2026-10-11' })
  to: string;
}

export class AgendaSpecialtyDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Cardiología' })
  name: string;
}

export class AgendaDoctorDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'Lucía Paredes' })
  fullName: string;

  @ApiProperty({ type: [AgendaSpecialtyDto] })
  specialties: AgendaSpecialtyDto[];
}

export class AgendaCupoDto {
  @ApiProperty({ example: 40 })
  scheduleId: number;

  @ApiProperty({ example: 12 })
  doctorId: number;

  @ApiProperty({ example: 2 })
  specialtyId: number;

  @ApiProperty({ example: '2026-10-05', description: 'Día local de la sede' })
  date: string;

  @ApiProperty({ example: '08:00', description: 'Hora local de la sede' })
  startTime: string;

  @ApiProperty({ example: '08:30' })
  endTime: string;

  @ApiProperty({
    description:
      'Libre para reservar: sin cita activa del médico solapada (de cualquier especialidad), sin bloqueo ni feriado, no pasado y con 2 h de anticipación si es hoy',
  })
  available: boolean;
}

export class AgendaPatientDto {
  @ApiProperty({ example: 100 })
  id: number;

  @ApiProperty({ example: 'Ana Paciente' })
  fullName: string;
}

export class AgendaAppointmentDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: 40 })
  scheduleId: number;

  @ApiProperty({ example: 12 })
  doctorId: number;

  @ApiProperty({ example: 2 })
  specialtyId: number;

  @ApiProperty({ example: '2026-10-05' })
  date: string;

  @ApiProperty({ example: '08:00' })
  startTime: string;

  @ApiProperty({ example: '08:30' })
  endTime: string;

  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiProperty({ example: 'PAID' })
  paymentStatus: string;

  @ApiProperty()
  isOverbook: boolean;

  @ApiProperty()
  isAtRisk: boolean;

  @ApiProperty({
    type: AgendaPatientDto,
    description: 'Solo identificación; sin email ni teléfono',
  })
  patient: AgendaPatientDto;
}

export class AgendaBlockDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 12 })
  doctorId: number;

  @ApiProperty({ enum: ScheduleBlockType })
  type: ScheduleBlockType;

  @ApiProperty({ example: '2026-10-06' })
  startDate: string;

  @ApiProperty({ example: '2026-10-08' })
  endDate: string;

  @ApiProperty({ example: '14:00', nullable: true, type: String })
  timeFrom: string | null;

  @ApiProperty({ example: '16:00', nullable: true, type: String })
  timeTo: string | null;

  @ApiProperty({ example: 'Congreso' })
  reason: string;
}

export class AgendaHolidayDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: '2026-10-08' })
  date: string;

  @ApiProperty({ example: 'Combate de Angamos' })
  name: string;

  @ApiProperty({ enum: ['GLOBAL', 'CLINIC'] })
  scope: 'GLOBAL' | 'CLINIC';
}

export class AgendaIndicatorsDto {
  @ApiProperty({
    description: 'Cupos ofrecidos: sin los anulados por feriado o bloqueo',
  })
  totalCupos: number;

  @ApiProperty({ description: 'Cupos ofrecidos con una cita activa solapada' })
  bookedCupos: number;

  @ApiProperty({
    example: 0.5,
    description: 'bookedCupos / totalCupos (0 sin cupos)',
  })
  occupancyRate: number;

  @ApiProperty({
    example: {
      PENDING: 1,
      CONFIRMED: 3,
      IN_PROGRESS: 0,
      COMPLETED: 2,
      CANCELLED: 1,
      NO_SHOW: 0,
    },
  })
  byStatus: Record<AppointmentStatus, number>;

  @ApiProperty({ description: 'Citas por atender marcadas en riesgo' })
  atRisk: number;

  @ApiProperty({ description: 'Citas pendientes con plazo de pago vigente' })
  pendingPayment: number;
}

export class AgendaResponseDto {
  @ApiProperty({
    example: 'America/Lima',
    description: 'Zona horaria de la sede',
  })
  timezone: string;

  @ApiProperty({ type: AgendaRangeDto })
  range: AgendaRangeDto;

  @ApiProperty({ type: [AgendaDoctorDto] })
  doctors: AgendaDoctorDto[];

  @ApiProperty({ type: [AgendaCupoDto] })
  cupos: AgendaCupoDto[];

  @ApiProperty({
    type: [AgendaAppointmentDto],
    description: 'Todas las no borradas del rango, con cualquier estado',
  })
  appointments: AgendaAppointmentDto[];

  @ApiProperty({ type: [AgendaBlockDto] })
  blocks: AgendaBlockDto[];

  @ApiProperty({
    type: [AgendaHolidayDto],
    description: 'Globales y de la sede del alcance',
  })
  holidays: AgendaHolidayDto[];

  @ApiProperty({ type: AgendaIndicatorsDto })
  indicators: AgendaIndicatorsDto;
}
