import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual' })
  @IsString({ message: 'La contraseña actual es obligatoria' })
  @MinLength(1, { message: 'La contraseña actual es obligatoria' })
  currentPassword: string;

  @ApiProperty({ description: 'Nueva contraseña', minLength: 8 })
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  newPassword: string;
}
