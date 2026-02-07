import { AuthTokens } from '../entities/auth-tokens.entity.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

export interface ITokenService {
  generateTokens(payload: JwtPayload): Promise<AuthTokens>;
  verifyRefreshToken(token: string): Promise<JwtPayload>;
}
