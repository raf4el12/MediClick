import type { ValidationPipeOptions } from '@nestjs/common';

/**
 * Opciones del ValidationPipe global (server/src/main.ts). Extraidas a una
 * constante para que security-validation-pipe.config.spec.ts pueda probar el
 * comportamiento real (OWASP A03) sin duplicar los valores a mano.
 */
export const SECURITY_VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
};
