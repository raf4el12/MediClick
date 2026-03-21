import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';

export class AuthUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiPropertyOptional({
    example: 'Sede Principal',
    description: 'Nombre de la clínica asignada',
  })
  clinicName?: string | null;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiPropertyOptional({
    description:
      'Solo presente en respuestas internas. El refresh token se envía via cookie HttpOnly.',
  })
  refreshToken?: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
