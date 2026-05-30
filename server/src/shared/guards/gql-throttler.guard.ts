import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const contextType = context.getType<string>();

    if (contextType === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctx = gqlCtx.getContext();
      return { req: ctx.req, res: ctx.res };
    }

    const http = context.switchToHttp();
    return { req: http.getRequest(), res: http.getResponse() };
  }

  // Rate-limit por usuario autenticado para que el cupo de un cliente no
  // afecte a otro. GraphQL multiplexa toda la app por un único POST /graphql
  // y varios usuarios comparten IP (NAT de una clínica) — sin esto, todos
  // colisionan en el mismo bucket y reciben 429 en endpoints inocentes.
  //
  // El JWT se DECODIFICA, no se verifica: la validación real corre en el
  // JwtAuthGuard de cada ruta. En rutas protegidas un token forjado igual
  // termina en 401; en rutas públicas (login/registro) no hay token y se
  // cae a la IP real (trust proxy), manteniendo la protección por-IP.
  protected getTracker(req: Record<string, any>): Promise<string> {
    const userId = this.extractUserId(req);
    if (userId) return Promise.resolve(`user:${userId}`);

    const ip = (req.ips as string[] | undefined)?.[0] ?? (req.ip as string);
    return Promise.resolve(`ip:${ip}`);
  }

  private extractUserId(req: Record<string, any>): string | null {
    const cookies = req.cookies as Record<string, string> | undefined;
    const header = req.headers?.authorization as string | undefined;
    const token =
      cookies?.accessToken ??
      (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    if (!token) return null;

    const sub = decodeJwtSub(token);
    return sub != null ? String(sub) : null;
  }
}

function decodeJwtSub(token: string): string | number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(json) as { sub?: string | number };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
