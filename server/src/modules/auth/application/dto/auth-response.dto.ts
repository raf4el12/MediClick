import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ description: 'Nombre del rol del usuario' })
  role: string;

  @ApiProperty({
    description: 'Permisos aplanados del usuario',
    example: ['READ:APPOINTMENTS', 'CREATE:PATIENTS'],
    type: [String],
  })
  permissions: string[];

  @ApiPropertyOptional({
    example: 'Sede Principal',
    description: 'Nombre de la clínica asignada',
  })
  clinicName?: string | null;

  @ApiPropertyOptional({
    example: 'America/Lima',
    description: 'Timezone IANA de la clínica asignada',
  })
  clinicTimezone?: string | null;
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
