import { Injectable } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { AuthTokens } from '../entities/auth-tokens.entity.js';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessOpts: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    };

    const refreshOpts: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload }, accessOpts),
      this.jwtService.signAsync({ ...payload }, refreshOpts),
    ]);

    return new AuthTokens(accessToken, refreshToken);
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }
}
