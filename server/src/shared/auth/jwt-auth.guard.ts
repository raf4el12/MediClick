import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { Observable, firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly SHARED_API_TOKEN: string;

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {
    super();
    this.SHARED_API_TOKEN =
      this.configService.get<string>('SHARED_API_TOKEN') ?? '';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      IS_PUBLIC_KEY,
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (authHeader && authHeader === `Bearer ${this.SHARED_API_TOKEN}`) {
      return true;
    }

    const result = super.canActivate(context);
    if (result instanceof Observable) {
      return (await firstValueFrom(result)) ?? false;
    }

    return result;
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser,
    info: { name?: string } | undefined,
  ): TUser {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'El token ha expirado. Por favor, vuelve a iniciar sesión.',
        );
      } else if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(
          'El token proporcionado es inválido. Verifica e intenta de nuevo.',
        );
      } else {
        throw new UnauthorizedException('No se pudo autenticar al usuario.');
      }
    }
    return user;
  }
}
