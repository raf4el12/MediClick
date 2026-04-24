import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({ example: 42 })
  id: number;

  @ApiProperty({ example: 123 })
  appointmentId: number;

  @ApiProperty({ example: 120.0 })
  amount: number;

  @ApiProperty({ example: 'PEN' })
  currency: string;

  @ApiProperty({
    example: 'PAID',
    enum: ['PENDING', 'PAID', 'PARTIAL', 'REFUNDED', 'FAILED', 'CANCELLED'],
  })
  status: string;

  @ApiPropertyOptional({
    example: 'CREDIT_CARD',
    enum: [
      'CASH',
      'CREDIT_CARD',
      'DEBIT_CARD',
      'TRANSFER',
      'INSURANCE',
      'OTHER',
    ],
  })
  paymentMethod: string | null;

  @ApiPropertyOptional({ example: '123456789' })
  gatewayId: string | null;

  @ApiPropertyOptional({ example: 'paciente@example.com' })
  payerEmail: string | null;

  @ApiPropertyOptional()
  failureReason: string | null;

  @ApiPropertyOptional({ example: '2026-04-23T10:15:00.000Z' })
  paidAt: Date | null;

  @ApiProperty({ example: '2026-04-23T10:10:00.000Z' })
  createdAt: Date;
}
