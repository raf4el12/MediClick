import { ApiProperty } from '@nestjs/swagger';
import { AppointmentResponseDto } from './appointment-response.dto.js';

export class MyAppointmentsSummaryResponseDto {
  @ApiProperty({
    type: AppointmentResponseDto,
    nullable: true,
    description: 'Próxima cita pendiente o confirmada, entre todas las sedes',
  })
  nextAppointment: AppointmentResponseDto | null;

  @ApiProperty({ example: 2 })
  upcomingCount: number;

  @ApiProperty({
    example: 1,
    description: 'Citas cuyo pago aceptaría ahora Mercado Pago',
  })
  awaitingPaymentCount: number;

  @ApiProperty({
    example: '2026-10-02T15:30:00.000Z',
    nullable: true,
    description: 'Plazo de pago más cercano',
  })
  earliestPaymentDeadline: Date | null;

  @ApiProperty({ example: 8 })
  completedCount: number;

  @ApiProperty({ example: 1, description: 'Citas completadas sin reseña' })
  pendingReviewCount: number;
}
