import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsNumber, IsInt, Min } from 'class-validator';

export class UpdateDoctorDto {
    @ApiPropertyOptional({ example: 'Juan' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: 'Pérez' })
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional({ example: '+51999888777' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ example: 'M' })
    @IsString()
    @IsOptional()
    gender?: string;

    @ApiPropertyOptional({ example: 'CMP-12345' })
    @IsString()
    @IsOptional()
    licenseNumber?: string;

    @ApiPropertyOptional({ example: 'Cardiólogo con 10 años de experiencia' })
    @IsString()
    @IsOptional()
    resume?: string;

    @ApiPropertyOptional({
      example: 2,
      description: 'Máximo de sobrecupos permitidos por día',
    })
    @IsInt()
    @Min(0, { message: 'El máximo de sobrecupos no puede ser negativo' })
    @IsOptional()
    maxOverbookPerDay?: number;

    @ApiPropertyOptional({ example: [1, 2], type: [Number] })
    @IsArray()
    @IsNumber({}, { each: true })
    @IsOptional()
    specialtyIds?: number[];
}
