import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 'Juan', description: 'Nombre del paciente' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del paciente' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;

  @ApiProperty({ example: 'juan@email.com', description: 'Correo electrónico' })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiPropertyOptional({ example: '+51999888777', description: 'Teléfono' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '1990-05-15', description: 'Fecha de nacimiento' })
  @IsDateString({}, { message: 'Debe ser una fecha válida' })
  @IsOptional()
  birthday?: string;

  @ApiPropertyOptional({ example: 'M', description: 'Género' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: 'DNI', description: 'Tipo de documento' })
  @IsString()
  @IsOptional()
  typeDocument?: string;

  @ApiPropertyOptional({ example: '12345678', description: 'Número de documento' })
  @IsString()
  @IsOptional()
  numberDocument?: string;

  @ApiProperty({ example: '+51999111222', description: 'Contacto de emergencia' })
  @IsString()
  @IsNotEmpty({ message: 'El contacto de emergencia es obligatorio' })
  emergencyContact: string;

  @ApiProperty({ example: 'O+', description: 'Tipo de sangre' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de sangre es obligatorio' })
  bloodType: string;

  @ApiPropertyOptional({ example: 'Penicilina', description: 'Alergias conocidas' })
  @IsString()
  @IsOptional()
  allergies?: string;

  @ApiPropertyOptional({ example: 'Diabetes tipo 2', description: 'Condiciones crónicas' })
  @IsString()
  @IsOptional()
  chronicConditions?: string;
}
