import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Auth } from '../../../../shared/decorators/auth.decorator.js';
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator.js';
import { CurrentClinic } from '../../../../shared/decorators/current-clinic.decorator.js';
import { FindAllRolesUseCase } from '../../application/use-cases/find-all-roles.use-case.js';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case.js';
import { UpdateRoleUseCase } from '../../application/use-cases/update-role.use-case.js';
import { DeleteRoleUseCase } from '../../application/use-cases/delete-role.use-case.js';
import { RoleResponseDto } from '../../application/dto/role-response.dto.js';
import { CreateRoleDto } from '../../application/dto/create-role.dto.js';
import { UpdateRoleDto } from '../../application/dto/update-role.dto.js';

@ApiTags('Roles')
@Controller('roles')
export class RoleController {
  constructor(
    private readonly findAllRolesUseCase: FindAllRolesUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
  ) {}

  @Get()
  @Auth()
  @RequirePermissions('MANAGE', 'ROLES')
  @ApiOperation({ summary: 'Listar roles (sistema + personalizados de la clínica)' })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  async findAll(
    @CurrentClinic() clinicId: number | null,
  ): Promise<RoleResponseDto[]> {
    return this.findAllRolesUseCase.execute(clinicId);
  }

  @Post()
  @Auth()
  @RequirePermissions('CREATE', 'ROLES')
  @ApiOperation({ summary: 'Crear rol personalizado para la clínica' })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<RoleResponseDto> {
    return this.createRoleUseCase.execute(dto, clinicId);
  }

  @Patch(':id')
  @Auth()
  @RequirePermissions('UPDATE', 'ROLES')
  @ApiOperation({ summary: 'Actualizar rol (permisos, nombre, descripción)' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<RoleResponseDto> {
    return this.updateRoleUseCase.execute(id, dto, clinicId);
  }

  @Delete(':id')
  @Auth()
  @RequirePermissions('DELETE', 'ROLES')
  @ApiOperation({ summary: 'Eliminar rol personalizado' })
  @ApiResponse({ status: 200 })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentClinic() clinicId: number | null,
  ): Promise<void> {
    return this.deleteRoleUseCase.execute(id, clinicId);
  }
}
