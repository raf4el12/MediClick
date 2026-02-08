import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelAppointmentDto {
  @ApiProperty({
    example: 'El paciente no puede asistir',
    description: 'Motivo de cancelación',
  })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de cancelación es obligatorio' })
  reason: string;
}
