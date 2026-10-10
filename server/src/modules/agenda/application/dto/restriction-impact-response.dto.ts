import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../../shared/domain/enums/appointment-status.enum.js';
import { AgendaPatientDto } from './agenda-response.dto.js';

export class RestrictionImpactAppointmentDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: 12 })
  doctorId: number;

  @ApiProperty({ example: 'Lucía Paredes' })
  doctorName: string;

  @ApiProperty({ example: 'Cardiología' })
  specialtyName: string;

  @ApiProperty({ example: '2026-10-21', description: 'Día local de la sede' })
  date: string;

  @ApiProperty({ example: '10:30', description: 'Hora local de la sede' })
  startTime: string;

  @ApiProperty({ example: '11:00' })
  endTime: string;

  @ApiProperty({
    enum: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
  })
  status: AppointmentStatus;

  @ApiProperty({ example: 'PAID' })
  paymentStatus: string;

  @ApiProperty({ type: AgendaPatientDto, description: 'Solo identificación' })
  patient: AgendaPatientDto;
}

export class RestrictionImpactResponseDto {
  @ApiProperty({ example: 2 })
  total: number;

  @ApiProperty({
    example: 1,
    description: 'Citas PAID o PARTIAL: quedarían con reembolso pendiente',
  })
  withPayment: number;

  @ApiProperty({
    type: [RestrictionImpactAppointmentDto],
    description: 'Ordenadas por fecha y hora',
  })
  appointments: RestrictionImpactAppointmentDto[];
}
