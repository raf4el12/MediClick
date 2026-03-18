import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClinicDto {
  @ApiProperty({ example: 'Sede Principal', description: 'Nombre de la sede' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la sede es obligatorio' })
  name: string;

  @ApiPropertyOptional({ example: 'Av. Javier Prado 123, Lima' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: '+51 1 234 5678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'sede.principal@mediclick.com' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'America/Lima',
    description: 'Zona horaria IANA de la sede',
  })
  @IsString()
  @IsNotEmpty({ message: 'La zona horaria es obligatoria' })
  timezone: string;

  @ApiProperty({
    example: 'PEN',
    description: 'Código de moneda ISO 4217',
    default: 'PEN',
  })
  @IsString()
  @IsNotEmpty({ message: 'La moneda es obligatoria' })
  currency: string;
}
