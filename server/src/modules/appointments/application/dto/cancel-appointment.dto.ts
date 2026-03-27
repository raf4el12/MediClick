import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelAppointmentDto {
  @ApiProperty({
    example: 'El paciente no puede asistir',
    description: 'Motivo de cancelación',
  })
  @IsString()
  @MaxLength(500, { message: 'El motivo no debe exceder 500 caracteres' })
  @IsNotEmpty({ message: 'El motivo de cancelación es obligatorio' })
  reason: string;
}
