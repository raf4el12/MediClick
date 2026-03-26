import {
  Controller,
  Post,
  Get,
  Patch,
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
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import express from 'express';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from '../../application/dto/login.dto.js';
import { RegisterPatientDto } from '../../application/dto/register-patient.dto.js';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto.js';
import { LogoutDto } from '../../application/dto/logout.dto.js';
import { ForgotPasswordDto } from '../../application/dto/forgot-password.dto.js';
import { VerifyResetCodeDto } from '../../application/dto/verify-reset-code.dto.js';
import { ResetPasswordDto } from '../../application/dto/reset-password.dto.js';
import { ChangePasswordDto } from '../../application/dto/change-password.dto.js';
import { AuthResponseDto } from '../../application/dto/auth-response.dto.js';
import { LoginUseCase } from '../../application/use-cases/login.use-case.js';
import { RegisterPatientUseCase } from '../../application/use-cases/register-patient.use-case.js';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case.js';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case.js';
import { LogoutAllDevicesUseCase } from '../../application/use-cases/logout-all-devices.use-case.js';
import { GetProfileUseCase } from '../../application/use-cases/get-profile.use-case.js';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case.js';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password.use-case.js';
import { VerifyResetCodeUseCase } from '../../application/use-cases/verify-reset-code.use-case.js';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case.js';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case.js';
import {
  GetSessionsUseCase,
  type SessionInfo,
} from '../../application/use-cases/get-sessions.use-case.js';
import { UpdateMyProfileDto } from '../../application/dto/update-profile.dto.js';
import { CheckEmailDto } from '../../application/dto/check-email.dto.js';
import { CheckDocumentDto } from '../../application/dto/check-document.dto.js';
import { CheckAvailabilityUseCase } from '../../application/use-cases/check-availability.use-case.js';
import {
  LookupDocumentDto,
  LookupDocumentResponseDto,
} from '../../application/dto/lookup-document.dto.js';
import { LookupDocumentUseCase } from '../../application/use-cases/lookup-document.use-case.js';
import { Auth, CurrentUser } from '../../../../shared/decorators/index.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerPatientUseCase: RegisterPatientUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllDevicesUseCase: LogoutAllDevicesUseCase,
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly checkAvailabilityUseCase: CheckAvailabilityUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly verifyResetCodeUseCase: VerifyResetCodeUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly getSessionsUseCase: GetSessionsUseCase,
    private readonly lookupDocumentUseCase: LookupDocumentUseCase,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  private readonly isProduction: boolean;

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
  @Throttle({ long: { ttl: 60000, limit: 5 } })
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

  @Post('check-email')
  @Throttle({ long: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar disponibilidad de email (público)' })
  @ApiResponse({ status: 200, description: '{ available: boolean }' })
  async checkEmail(
    @Body() dto: CheckEmailDto,
  ): Promise<{ available: boolean }> {
    return this.checkAvailabilityUseCase.checkEmail(dto.email);
  }

  @Post('check-document')
  @Throttle({ long: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar disponibilidad de documento (público)' })
  @ApiResponse({ status: 200, description: '{ available: boolean }' })
  async checkDocument(
    @Body() dto: CheckDocumentDto,
  ): Promise<{ available: boolean }> {
    return this.checkAvailabilityUseCase.checkDocument(
      dto.typeDocument,
      dto.numberDocument,
    );
  }

  @Post('lookup-document')
  @Throttle({ long: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consultar datos de un documento (DNI) en RENIEC',
    description:
      'Consulta la API de RENIEC para obtener nombre, apellidos y otros datos ' +
      'asociados a un DNI peruano. Solo funciona con tipo DNI.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la consulta',
    type: LookupDocumentResponseDto,
  })
  async lookupDocument(
    @Body() dto: LookupDocumentDto,
  ): Promise<LookupDocumentResponseDto> {
    return this.lookupDocumentUseCase.execute(dto);
  }

  @Post('forgot-password')
  @Throttle({ long: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar restablecimiento de contraseña (público)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Si el email existe, se enviará un código de verificación. Siempre retorna 200.',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.forgotPasswordUseCase.execute(dto);
    return {
      message:
        'Si el email está registrado, recibirás un código de verificación',
    };
  }

  @Post('verify-reset-code')
  @Throttle({ long: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar código de recuperación (público)',
  })
  @ApiResponse({
    status: 200,
    description: 'Código verificado, retorna resetToken',
  })
  @ApiResponse({ status: 400, description: 'Código inválido o expirado' })
  async verifyResetCode(
    @Body() dto: VerifyResetCodeDto,
  ): Promise<{ resetToken: string }> {
    return this.verifyResetCodeUseCase.execute(dto);
  }

  @Post('reset-password')
  @Throttle({ long: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña con token (público)' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.resetPasswordUseCase.execute(dto);
    return { message: 'Contraseña restablecida exitosamente' };
  }

  @Post('register')
  @Throttle({ long: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registro de paciente (público)' })
  @ApiResponse({
    status: 201,
    description: 'Paciente registrado y autenticado',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email o documento ya registrado' })
  async register(
    @Body() dto: RegisterPatientDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<Omit<AuthResponseDto, 'refreshToken'>> {
    const deviceId = 'web-register';
    const result = await this.registerPatientUseCase.execute(dto, deviceId);

    this.setTokenCookies(res, result.accessToken, result.refreshToken!);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh-token')
  @SkipThrottle()
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

  @Patch('change-password')
  @Auth()
  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Contraseña cambiada exitosamente' })
  @ApiResponse({ status: 400, description: 'Contraseña actual incorrecta' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
    @Body('deviceId') deviceId: string,
  ): Promise<{ message: string }> {
    await this.changePasswordUseCase.execute(userId, dto, deviceId ?? '');
    return { message: 'Contraseña cambiada exitosamente' };
  }

  @Get('sessions')
  @Auth()
  @ApiOperation({ summary: 'Obtener sesiones activas del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de sesiones activas' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getSessions(
    @CurrentUser('id') userId: number,
    @Req() req: express.Request,
  ): Promise<SessionInfo[]> {
    const deviceId = (req.headers['x-device-id'] as string) ?? '';
    return this.getSessionsUseCase.execute(userId, deviceId);
  }

  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getProfile(@CurrentUser('id') userId: number) {
    return this.getProfileUseCase.execute(userId);
  }

  @Patch('profile')
  @Auth()
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async updateProfile(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.updateProfileUseCase.execute(userId, dto);
  }
}
