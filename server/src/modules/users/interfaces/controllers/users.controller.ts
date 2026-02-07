import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { CreateInternalUserDto } from '../../application/dto/create-internal-user.dto.js';
import { UserResponseDto } from '../../application/dto/user-response.dto.js';
import { CreateInternalUserUseCase } from '../../application/use-cases/create-internal-user.use-case.js';
import { Auth } from '../../../../shared/decorators/index.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly createInternalUserUseCase: CreateInternalUserUseCase,
  ) {}

  @Post('internal')
  @HttpCode(HttpStatus.CREATED)
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear usuario interno (solo ADMIN)' })
  @ApiResponse({
    status: 201,
    description: 'Usuario interno creado exitosamente',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o rol no permitido',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos' })
  @ApiResponse({ status: 409, description: 'Email o DNI duplicado' })
  async createInternalUser(
    @Body() dto: CreateInternalUserDto,
  ): Promise<UserResponseDto> {
    return this.createInternalUserUseCase.execute(dto);
  }
}
