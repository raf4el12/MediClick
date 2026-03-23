import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetCodeDto {
  @ApiProperty({ example: 'paciente@gmail.com' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos' })
  @IsString({ message: 'El código es obligatorio' })
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  code: string;
}
