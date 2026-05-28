import { BadRequestException } from '@nestjs/common';
import { VerifyResetCodeUseCase } from './verify-reset-code.use-case.js';

// ─── OWASP A07: Identification and Authentication Failures ────────────────────
// Específicamente: Brute Force Protection en código de recuperación de contraseña

describe('VerifyResetCodeUseCase — OWASP A07: Brute Force Protection', () => {
  let useCase: VerifyResetCodeUseCase;
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    ttl: jest.Mock;
  };

  const dto = { email: 'ana@mediclick.com', code: '123456' };

  const buildPayload = (overrides: Partial<any> = {}) =>
    JSON.stringify({
      code: '123456',
      userId: 42,
      attempts: 0,
      ...overrides,
    });

  beforeEach(() => {
    redisService = {
      get: jest.fn().mockResolvedValue(buildPayload()),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      ttl: jest.fn().mockResolvedValue(300),
    };

    useCase = new VerifyResetCodeUseCase(redisService as any);
  });

  // A07.1 — Código válido: genera reset token ────────────────────────────────

  it('A07.1: retorna un resetToken cuando el código es correcto', async () => {
    const result = await useCase.execute(dto);

    expect(result.resetToken).toBeDefined();
    expect(typeof result.resetToken).toBe('string');
    expect(result.resetToken.length).toBeGreaterThan(20);
  });

  it('A07.1: elimina el código de Redis tras verificación exitosa (uso único)', async () => {
    await useCase.execute(dto);

    expect(redisService.del).toHaveBeenCalledWith(
      `password-reset-code:${dto.email}`,
    );
  });

  it('A07.1: almacena el reset token hasheado en Redis para el paso de reseteo', async () => {
    await useCase.execute(dto);

    expect(redisService.set).toHaveBeenCalledWith(
      expect.stringMatching(/^password-reset:/),
      expect.stringContaining('"userId":42'),
      expect.any(Number),
    );
  });

  // A07.2 — Código expirado o inexistente ───────────────────────────────────

  it('A07.2: lanza BadRequestException si no existe código en Redis (expirado)', async () => {
    redisService.get.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
  });

  // A07.3 — Protección anti-fuerza bruta ────────────────────────────────────

  it('A07.3: lanza BadRequestException si el código es incorrecto', async () => {
    await expect(
      useCase.execute({ ...dto, code: '000000' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('A07.3: incrementa el contador de intentos tras código incorrecto', async () => {
    redisService.get.mockResolvedValue(buildPayload({ attempts: 2 }));

    await expect(
      useCase.execute({ ...dto, code: '000000' }),
    ).rejects.toThrow(BadRequestException);

    expect(redisService.set).toHaveBeenCalledWith(
      `password-reset-code:${dto.email}`,
      expect.stringContaining('"attempts":3'),
      expect.any(Number),
    );
  });

  it('A07.3: bloquea el código cuando se alcanzan los 5 intentos fallidos', async () => {
    redisService.get.mockResolvedValue(buildPayload({ attempts: 5 }));

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);

    // Debe eliminar la clave para forzar una nueva solicitud de código
    expect(redisService.del).toHaveBeenCalledWith(
      `password-reset-code:${dto.email}`,
    );
  });

  it('A07.3: el código bloqueado por intentos no puede ser verificado aunque sea correcto', async () => {
    // El código ES correcto pero los intentos ya superaron el límite
    redisService.get.mockResolvedValue(buildPayload({ code: '123456', attempts: 5 }));

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
  });

  it('A07.3: preserva el TTL restante al incrementar intentos (no resetea el tiempo)', async () => {
    redisService.get.mockResolvedValue(buildPayload({ attempts: 1 }));
    redisService.ttl.mockResolvedValue(450);

    await expect(
      useCase.execute({ ...dto, code: '000000' }),
    ).rejects.toThrow(BadRequestException);

    expect(redisService.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      450,
    );
  });
});
