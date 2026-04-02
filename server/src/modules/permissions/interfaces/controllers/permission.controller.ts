import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Auth } from '../../../../shared/decorators/auth.decorator.js';
import { FindAllPermissionsUseCase } from '../../application/use-cases/find-all-permissions.use-case.js';
import { PermissionResponseDto } from '../../application/dto/permission-response.dto.js';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionController {
  constructor(
    private readonly findAllPermissionsUseCase: FindAllPermissionsUseCase,
  ) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Listar todos los permisos disponibles' })
  @ApiResponse({ status: 200, type: [PermissionResponseDto] })
  async findAll(): Promise<PermissionResponseDto[]> {
    return this.findAllPermissionsUseCase.execute();
  }
}
