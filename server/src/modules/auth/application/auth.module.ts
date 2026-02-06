import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { JwtStrategy } from '../infrastructure/strategies/jwt.strategy.js';
import { PasswordService } from '../domain/services/password.service.js';
import { TokenService } from '../domain/services/token.service.js';
import { LoginUseCase } from './use-cases/login.use-case.js';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case.js';
import { LogoutUseCase } from './use-cases/logout.use-case.js';
import { AuthController } from '../interfaces/controllers/auth.controller.js';
import { UsersModule } from '../../users/application/users.module.js';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    PasswordService,
    TokenService,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
  ],
  exports: [PasswordService, TokenService],
})
export class AuthModule {}
