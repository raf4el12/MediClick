import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class NotificationQueryDto {
    @ApiPropertyOptional({ example: false, description: 'Filtrar por estado de lectura' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isRead?: boolean;

    @ApiPropertyOptional({
        example: 'APPOINTMENT_CONFIRMED',
        description: 'Filtrar por tipo de notificación',
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiPropertyOptional({ example: 1, description: 'Página', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ example: 20, description: 'Límite por página', default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}
