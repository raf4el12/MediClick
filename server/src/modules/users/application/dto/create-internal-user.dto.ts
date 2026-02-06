import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProfileDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del perfil es obligatorio' })
  name: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;

  @ApiProperty({ example: 'juan.perez@mediclick.com' })
  @IsEmail({}, { message: 'El email del perfil debe ser válido' })
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '999888777' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'DNI' })
  @IsString()
  @IsOptional()
  typeDocument?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsString()
  @IsOptional()
  numberDocument?: string;
}

export class CreateInternalUserDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiProperty({ example: 'juan.perez@mediclick.com' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({
    enum: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST],
    example: UserRole.DOCTOR,
  })
  @IsEnum([UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST], {
    message: 'El rol debe ser ADMIN, DOCTOR o RECEPTIONIST',
  })
  @IsNotEmpty({ message: 'El rol es obligatorio' })
  role: UserRole;

  @ApiProperty({ type: ProfileDto })
  @ValidateNested()
  @Type(() => ProfileDto)
  @IsNotEmpty({ message: 'El perfil es obligatorio' })
  profile: ProfileDto;
}
