import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

export interface ITokenService {
  generateAccessToken(payload: JwtPayload): Promise<string>;
  generateOpaqueRefreshToken(): string;
  hashToken(token: string): string;
  verifyAccessToken(token: string): Promise<JwtPayload>;
  getRefreshTokenTtlSeconds(): number;
}
