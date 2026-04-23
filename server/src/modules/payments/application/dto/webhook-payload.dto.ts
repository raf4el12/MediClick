import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WebhookData {
  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  id?: string;
}

/**
 * Payload que Mercado Pago envía al webhook. Solo usamos `data.id` —
 * NO confiamos en el resto del body; siempre re-consultamos al gateway.
 */
export class WebhookPayloadDto {
  @ApiPropertyOptional({ example: 'payment' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'payment.updated' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ type: WebhookData })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookData)
  data?: WebhookData;
}
