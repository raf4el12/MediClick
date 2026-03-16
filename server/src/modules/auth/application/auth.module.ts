import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { JwtStrategy } from '../infrastructure/strategies/jwt.strategy.js';
import { PasswordService } from '../infrastructure/services/password.service.js';
import { TokenService } from '../infrastructure/services/token.service.js';
import { RedisRefreshTokenRepository } from '../infrastructure/repositories/redis-refresh-token.repository.js';
import { LoginUseCase } from './use-cases/login.use-case.js';
import { RegisterPatientUseCase } from './use-cases/register-patient.use-case.js';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case.js';
import { LogoutUseCase } from './use-cases/logout.use-case.js';
import { LogoutAllDevicesUseCase } from './use-cases/logout-all-devices.use-case.js';
import { GetProfileUseCase } from './use-cases/get-profile.use-case.js';
import { UpdateProfileUseCase } from './use-cases/update-profile.use-case.js';
import { CheckAvailabilityUseCase } from './use-cases/check-availability.use-case.js';
import { AuthController } from '../interfaces/controllers/auth.controller.js';
import { UsersModule } from '../../users/application/users.module.js';
import { PatientsModule } from '../../patients/application/patients.module.js';

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
    forwardRef(() => UsersModule),
    forwardRef(() => PatientsModule),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    {
      provide: 'IPasswordService',
      useClass: PasswordService,
    },
    {
      provide: 'ITokenService',
      useClass: TokenService,
    },
    {
      provide: 'IRefreshTokenRepository',
      useClass: RedisRefreshTokenRepository,
    },
    LoginUseCase,
    RegisterPatientUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    LogoutAllDevicesUseCase,
    GetProfileUseCase,
    UpdateProfileUseCase,
    CheckAvailabilityUseCase,
  ],
  exports: ['IPasswordService', 'ITokenService'],
})
export class AuthModule {}
