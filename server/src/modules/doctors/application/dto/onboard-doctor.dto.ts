import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OnboardDoctorUserDto {
  @ApiProperty({ example: 'Dr. Juan Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiProperty({ example: 'dr.juan@mediclick.com' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({ example: 'Doctor123!' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}

export class OnboardDoctorProfileDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del perfil es obligatorio' })
  name: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;

  @ApiPropertyOptional({ example: '999888777' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'M' })
  @IsString()
  @IsOptional()
  gender?: string;
}

export class OnboardDoctorDto {
  @ApiProperty({ type: OnboardDoctorUserDto })
  @ValidateNested()
  @Type(() => OnboardDoctorUserDto)
  @IsNotEmpty()
  user: OnboardDoctorUserDto;

  @ApiProperty({ type: OnboardDoctorProfileDto })
  @ValidateNested()
  @Type(() => OnboardDoctorProfileDto)
  @IsNotEmpty()
  profile: OnboardDoctorProfileDto;

  @ApiProperty({
    example: 'CMP-12345',
    description: 'Número de colegiatura (CMP)',
  })
  @IsString()
  @IsNotEmpty({ message: 'El CMP es obligatorio' })
  cmp: string;

  @ApiPropertyOptional({ example: 'Especialista con 10 años de experiencia' })
  @IsString()
  @IsOptional()
  resume?: string;

  @ApiProperty({ example: [1, 2], description: 'IDs de especialidades' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos una especialidad' })
  @IsInt({ each: true, message: 'Cada ID de especialidad debe ser un entero' })
  specialtyIds: number[];
}
