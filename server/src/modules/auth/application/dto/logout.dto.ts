import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ description: 'Identificador único del dispositivo' })
  @IsString()
  @IsNotEmpty({ message: 'El deviceId es obligatorio' })
  deviceId: string;
}
