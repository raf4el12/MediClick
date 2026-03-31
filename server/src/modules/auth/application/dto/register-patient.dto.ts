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

  @ApiProperty({ example: '+51999888777', description: 'Teléfono celular (formato E.164)' })
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Debe ser un número válido en formato internacional (ej: +51999888777)',
  })
  phone: string;

  @ApiPropertyOptional({
    example: '1990-05-15',
    description: 'Fecha de nacimiento',
  })
  @IsDateString({}, { message: 'Debe ser una fecha válida' })
  @IsOptional()
  birthday?: string;

  @ApiPropertyOptional({ example: 'M', description: 'Género (M/F)' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ example: '+51999888777', description: 'Contacto de emergencia (formato E.164)' })
  @IsString()
  @IsNotEmpty({ message: 'El contacto de emergencia es obligatorio' })
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Debe ser un número válido en formato internacional (ej: +51999888777)',
  })
  emergencyContact: string;

  @ApiProperty({ example: 'O+', description: 'Tipo de sangre' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de sangre es obligatorio' })
  bloodType: string;

  @ApiPropertyOptional({ example: 'Penicilina, Sulfas', description: 'Alergias' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  allergies?: string;

  @ApiPropertyOptional({ example: 'Diabetes, Hipertensión', description: 'Condiciones crónicas' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  chronicConditions?: string;

  @ApiProperty({ example: 'MiPassword123!', description: 'Contraseña' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/(?=.*[a-z])/, { message: 'La contraseña debe incluir al menos una letra minúscula' })
  @Matches(/(?=.*[A-Z])/, { message: 'La contraseña debe incluir al menos una letra mayúscula' })
  @Matches(/(?=.*\d)/, { message: 'La contraseña debe incluir al menos un número' })
  password: string;
}
