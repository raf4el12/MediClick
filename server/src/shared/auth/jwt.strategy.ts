import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface JwtPayload {
  id: number;
  email: string;
  status: string;
  permissions?: string[];
  roles?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          if (request && request.cookies) {
            return (request.cookies['accessToken'] as string) ?? null;
          }
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'default-secret',
      passReqToCallback: false,
    });
  }

  validate(payload: JwtPayload) {
    return {
      userId: payload.id,
      email: payload.email,
      status: payload.status,
      permissions: payload.permissions ?? [],
      roles: payload.roles ?? [],
    };
  }
}
