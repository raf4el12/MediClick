import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CheckEmailDto {
  @ApiProperty({ example: 'juan@email.com' })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty()
  email: string;
}
