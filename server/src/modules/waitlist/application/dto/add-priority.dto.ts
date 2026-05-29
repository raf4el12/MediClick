import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AddPriorityDto {
  @ApiProperty({
    example: 10,
    description: 'Cuánto sumar a la prioridad (1-100). Mayor = atendido antes.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  delta: number;
}
