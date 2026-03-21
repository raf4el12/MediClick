import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({
    example: 'RESOLVED',
    enum: ['ACTIVE', 'RESOLVED', 'CHRONIC'],
    description: 'Nuevo estado',
  })
  @IsString()
  @IsNotEmpty({ message: 'El status es obligatorio' })
  status: string;
}
