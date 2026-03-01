import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMyProfileDto {
  @ApiPropertyOptional({ example: 'Juan' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  lastName?: string;

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

  @ApiPropertyOptional({ example: 'Av. Javier Prado 1234' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Lima' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: 'Perú' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  country?: string;
}
