import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
} from '@nestjs/throttler';
import type {
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';
import { REQUIRES_AUTH_KEY } from '../decorators/auth.decorator.js';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  private readonly jwtService = new JwtService();

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

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
  // afecte a otro: varios usuarios comparten IP (NAT de una clínica) y sin
  // esto colisionan en el mismo bucket y reciben 429 en endpoints inocentes.
  //
  // El throttler corre antes que los guards de la ruta, así que el token
  // todavía no fue validado. Por eso:
  // - en rutas públicas (sin @Auth: login, registro) se cuenta siempre por IP;
  //   si no, un token por request (forjado o de otra cuenta) abriría un bucket
  //   nuevo cada vez y anularía el límite;
  // - en rutas con @Auth se cuenta por usuario solo si la firma del JWT es
  //   válida; un token inválido cae a la IP.
  protected getTracker(
    req: Record<string, any>,
    context?: ExecutionContext,
  ): Promise<string> {
    const ip = (req.ips as string[] | undefined)?.[0] ?? (req.ip as string);
    if (!context || !this.requiresAuth(context)) {
      return Promise.resolve(`ip:${ip}`);
    }

    const userId = this.verifiedUserId(req);
    return Promise.resolve(userId ? `user:${userId}` : `ip:${ip}`);
  }

  private requiresAuth(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(REQUIRES_AUTH_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private verifiedUserId(req: Record<string, any>): string | null {
    const cookies = req.cookies as Record<string, string> | undefined;
    const header = req.headers?.authorization as string | undefined;
    const token =
      cookies?.accessToken ??
      (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    if (!token) return null;

    try {
      const payload = this.jwtService.verify<{ sub?: string | number }>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return payload.sub != null ? String(payload.sub) : null;
    } catch {
      return null;
    }
  }
}
