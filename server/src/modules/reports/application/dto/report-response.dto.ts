import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';

export class WeeklyAppointmentReportDto {
  @ApiProperty({ example: 'Monday', description: 'Día de la semana' })
  dayOfWeek: string;

  @ApiProperty({ example: '2026-02-09', description: 'Fecha' })
  date: string;

  @ApiProperty({ example: 12, description: 'Cantidad de citas' })
  count: number;
}

export class RevenueReportDto {
  @ApiProperty({
    example: 5000.0,
    description: 'Ingresos proyectados (sum de appointment.amount)',
  })
  projectedRevenue: number;

  @ApiProperty({
    example: 3500.0,
    description: 'Ingresos reales (transactions PAID)',
  })
  actualRevenue: number;

  @ApiProperty({ example: 'PEN', description: 'Moneda' })
  currency: string;
}

export class TopDoctorReportDto {
  @ApiProperty()
  doctorId: number;

  @ApiProperty({ example: 'Dr. Juan Pérez' })
  doctorName: string;

  @ApiProperty({ type: [String], example: ['Cardiología', 'Medicina General'] })
  specialties: string[];

  @ApiProperty({
    example: 45,
    description: 'Total de citas completadas en el mes',
  })
  completedAppointments: number;
}

export class DailyCountDto {
  @ApiProperty({ example: '2026-02-01', description: 'Fecha (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ example: 5, description: 'Cantidad de citas' })
  count: number;
}

export class AppointmentsSummaryReportDto {
  @ApiProperty({ example: 120, description: 'Total de citas en el período' })
  total: number;

  @ApiProperty({
    example: { COMPLETED: 80, CANCELLED: 20, PENDING: 15, NO_SHOW: 5 },
    description: 'Citas agrupadas por status',
  })
  byStatus: Record<AppointmentStatus, number>;

  @ApiProperty({
    type: [DailyCountDto],
    description: 'Citas por día del mes',
  })
  daily: DailyCountDto[];
}

export class ScheduleOccupancyReportDto {
  @ApiProperty({ example: 200, description: 'Total de horarios en el período' })
  totalSlots: number;

  @ApiProperty({ example: 150, description: 'Horarios con cita activa' })
  bookedSlots: number;

  @ApiProperty({ example: 50, description: 'Horarios disponibles' })
  availableSlots: number;

  @ApiProperty({ example: 75.0, description: 'Tasa de ocupación (%)' })
  occupancyRate: number;
}
