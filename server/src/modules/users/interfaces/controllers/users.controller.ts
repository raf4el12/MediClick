import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { CreateInternalUserDto } from '../../application/dto/create-internal-user.dto.js';
import { UpdateUserDto } from '../../application/dto/update-user.dto.js';
import { FindAllUsersDto } from '../../application/dto/find-all-users.dto.js';
import { UserResponseDto } from '../../application/dto/user-response.dto.js';
import {
  UserDetailResponseDto,
  PaginatedUserResponseDto,
} from '../../application/dto/user-detail-response.dto.js';
import { CreateInternalUserUseCase } from '../../application/use-cases/create-internal-user.use-case.js';
import { FindAllUsersUseCase } from '../../application/use-cases/find-all-users.use-case.js';
import { FindUserByIdUseCase } from '../../application/use-cases/find-user-by-id.use-case.js';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case.js';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case.js';
import { Auth } from '../../../../shared/decorators/index.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly createInternalUserUseCase: CreateInternalUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
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

  @Get()
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar usuarios con paginación' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de usuarios',
    type: PaginatedUserResponseDto,
  })
  async findAll(
    @Query() dto: FindAllUsersDto,
  ): Promise<PaginatedUserResponseDto> {
    const pagination = new PaginationImproved(
      dto.searchValue,
      dto.currentPage,
      dto.pageSize,
      dto.orderBy,
      dto.orderByMode,
    );
    return this.findAllUsersUseCase.execute(pagination, dto.role);
  }

  @Get(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado',
    type: UserDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserDetailResponseDto> {
    return this.findUserByIdUseCase.execute(id);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar usuario (rol, estado, perfil)' })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
    type: UserDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDetailResponseDto> {
    return this.updateUserUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar usuario (soft delete)' })
  @ApiResponse({ status: 204, description: 'Usuario eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.deleteUserUseCase.execute(id);
  }
}
