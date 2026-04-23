import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePreferenceDto {
  @ApiProperty({ example: 123, description: 'ID de la cita a pagar' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'El appointmentId es obligatorio' })
  appointmentId: number;
}
