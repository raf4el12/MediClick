import { ApiProperty } from '@nestjs/swagger';

export class PreferenceResponseDto {
  @ApiProperty({ example: '1234567890-abcd-efgh-ijkl-1234567890ab' })
  preferenceId: string;

  @ApiProperty({
    example: 'https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=...',
    description: 'URL para redirigir al paciente (producción).',
  })
  initPoint: string;

  @ApiProperty({
    example: 'https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=...',
    description: 'URL sandbox (para desarrollo/testing).',
  })
  sandboxInitPoint: string;
}
