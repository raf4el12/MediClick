import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import express from 'express';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from '../../application/dto/login.dto.js';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto.js';
import { LogoutDto } from '../../application/dto/logout.dto.js';
import { AuthResponseDto } from '../../application/dto/auth-response.dto.js';
import { LoginUseCase } from '../../application/use-cases/login.use-case.js';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case.js';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case.js';
import { LogoutAllDevicesUseCase } from '../../application/use-cases/logout-all-devices.use-case.js';
import { Auth, CurrentUser } from '../../../../shared/decorators/index.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllDevicesUseCase: LogoutAllDevicesUseCase,
    private readonly configService: ConfigService,
  ) {}

  private get isProduction(): boolean {
    return this.configService.get('NODE_ENV') === 'production';
  }

  private setTokenCookies(
    res: express.Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 min
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth',
    });
  }

  private clearTokenCookies(res: express.Response): void {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/auth' });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Tokens enviados en cookies HttpOnly.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<Omit<AuthResponseDto, 'refreshToken'>> {
    const result = await this.loginUseCase.execute(dto, dto.deviceId);

    this.setTokenCookies(res, result.accessToken, result.refreshToken!);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refreshToken')
  @ApiOperation({ summary: 'Renovar tokens con refresh token (cookie)' })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  @ApiResponse({
    status: 503,
    description: 'Servicio de autenticación no disponible',
  })
  @Auth()
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @CurrentUser('id') userId: number,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<Omit<AuthResponseDto, 'refreshToken'>> {
    const cookies = req.cookies as Record<string, string> | undefined;
    const rawRefreshToken = cookies?.refreshToken;

    if (!rawRefreshToken) {
      // Limpiar cookies antes de lanzar para evitar redirect loop en el cliente
      this.clearTokenCookies(res);
      throw new UnauthorizedException('Refresh token no encontrado');
    }

    try {
      const result = await this.refreshTokenUseCase.execute(
        rawRefreshToken,
        userId,
        dto.deviceId,
      );

      this.setTokenCookies(res, result.accessToken, result.refreshToken!);

      return {
        accessToken: result.accessToken,
        user: result.user,
      };
    } catch (error) {
      // Garantizar que las cookies inválidas se eliminen antes del 401.
      // Sin esto, el browser mantiene la cookie y el middleware de Next.js
      // redirige indefinidamente a '/', produciendo pantalla blanca.
      this.clearTokenCookies(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Auth()
  @ApiOperation({ summary: 'Cerrar sesión en este dispositivo' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async logout(
    @CurrentUser('id') userId: number,
    @Body() dto: LogoutDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<{ message: string }> {
    await this.logoutUseCase.execute(userId, dto.deviceId);
    this.clearTokenCookies(res);
    return { message: 'Sesión cerrada exitosamente' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Auth()
  @ApiOperation({ summary: 'Cerrar sesión en todos los dispositivos' })
  @ApiResponse({ status: 200, description: 'Todas las sesiones cerradas' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async logoutAll(
    @CurrentUser('id') userId: number,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<{ message: string }> {
    await this.logoutAllDevicesUseCase.execute(userId);
    this.clearTokenCookies(res);
    return { message: 'Todas las sesiones han sido cerradas' };
  }
}
