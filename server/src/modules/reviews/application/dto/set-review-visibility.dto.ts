import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetReviewVisibilityDto {
  @ApiProperty({
    example: false,
    description: 'true = visible, false = oculta (moderación)',
  })
  @IsBoolean()
  isVisible: boolean;
}
