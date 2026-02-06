import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token para renovar el access token' })
  @IsString()
  @IsNotEmpty({ message: 'El refresh token es obligatorio' })
  refreshToken: string;
}
