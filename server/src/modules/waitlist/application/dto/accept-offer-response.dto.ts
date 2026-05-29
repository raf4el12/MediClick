import { ApiProperty } from '@nestjs/swagger';

/**
 * Resultado de aceptar una oferta: la cita queda creada en estado PENDING de pago.
 * El cliente usa `appointmentId` + `pendingUntil` para llevar al paciente al pago.
 */
export class AcceptOfferResponseDto {
  @ApiProperty()
  appointmentId: number;

  @ApiProperty()
  scheduleId: number;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  paymentStatus: string;

  @ApiProperty({ nullable: true })
  amount: number | null;

  @ApiProperty({ nullable: true })
  pendingUntil: Date | null;
}
