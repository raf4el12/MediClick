import { ApiProperty } from '@nestjs/swagger';

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
