import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpecialtyResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  duration: number | null;

  @ApiProperty()
  price: number | null;

  @ApiPropertyOptional()
  requirements: string | null;

  @ApiPropertyOptional()
  icon: string | null;

  @ApiPropertyOptional({ description: 'ID de la sede (null = global)' })
  clinicId: number | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  category: { id: number; name: string };
}
