import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extrae el clinicId del usuario autenticado (desde el JWT).
 * Retorna number | null (null para pacientes que son cross-tenant).
 */
export const CurrentClinic = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as { clinicId?: number | null } | undefined;
    return user?.clinicId ?? null;
  },
);
