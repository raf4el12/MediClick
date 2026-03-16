import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterPatientDto {
  @ApiProperty({ example: 'DNI', description: 'Tipo de documento' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de documento es obligatorio' })
  typeDocument: string;

  @ApiProperty({ example: '12345678', description: 'Número de documento' })
  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  numberDocument: string;

  @ApiProperty({ example: 'Juan', description: 'Nombre' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'juan@email.com', description: 'Correo electrónico' })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({ example: '999888777', description: 'Teléfono celular' })
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @Matches(/^9\d{8}$/, { message: 'Debe ser un celular válido (9 dígitos, inicia con 9)' })
  phone: string;

  @ApiPropertyOptional({ example: '1990-05-15', description: 'Fecha de nacimiento' })
  @IsDateString({}, { message: 'Debe ser una fecha válida' })
  @IsOptional()
  birthday?: string;

  @ApiPropertyOptional({ example: 'M', description: 'Género (M/F)' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ example: 'MiPassword123', description: 'Contraseña' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}
