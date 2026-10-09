import { ApiProperty } from '@nestjs/swagger';

export class CancellationPreviewResponseDto {
  @ApiProperty({
    example: 45,
    description:
      'Penalización que se cobraría al cancelar ahora; 0 si no corresponde',
  })
  fee: number;

  @ApiProperty({ example: 'PEN', description: 'Moneda de la sede de la cita' })
  currency: string;

  @ApiProperty({
    example: 24,
    description: 'Horas antes de la cita en que cancelar no tiene costo',
  })
  freeCancellationWindowHours: number;

  @ApiProperty({
    example: 3.5,
    description: 'Horas que faltan para la cita, en la zona de su sede',
  })
  hoursUntilAppointment: number;

  @ApiProperty({
    example: true,
    description: 'Si la cita todavía puede cancelarse',
  })
  cancellable: boolean;
}
