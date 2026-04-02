import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: 'CREATE' })
  action: string;

  @ApiProperty({ example: 'APPOINTMENTS' })
  subject: string;

  @ApiPropertyOptional()
  description: string | null;
}
