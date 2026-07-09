import { ValidationPipe, BadRequestException } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { SECURITY_VALIDATION_PIPE_OPTIONS } from './security-validation-pipe.config.js';

// ─── OWASP A03: Injection ─────────────────────────────────────────────────
// El ValidationPipe global (server/src/main.ts) usa estas mismas opciones.
// forbidNonWhitelisted cierra la puerta a payloads con campos no declarados
// en el DTO — un vector comun de mass-assignment/inyeccion de datos.

class SampleDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

describe('SECURITY_VALIDATION_PIPE_OPTIONS — OWASP A03', () => {
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: SampleDto,
    data: '',
  };

  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe(SECURITY_VALIDATION_PIPE_OPTIONS);
  });

  it('acepta un payload que solo tiene los campos declarados en el DTO', async () => {
    const result = (await pipe.transform(
      { name: 'Ana' },
      metadata,
    )) as SampleDto;
    expect(result).toBeInstanceOf(SampleDto);
    expect(result.name).toBe('Ana');
  });

  it('rechaza un payload con un campo no declarado en el DTO (mass-assignment)', async () => {
    await expect(
      pipe.transform({ name: 'Ana', roleId: 1 }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un payload que no cumple las validaciones del DTO', async () => {
    await expect(pipe.transform({}, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
