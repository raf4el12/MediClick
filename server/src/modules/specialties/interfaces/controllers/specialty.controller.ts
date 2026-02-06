import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Auth } from '../../../../shared/decorators/index.js';
import { CreateSpecialtyDto } from '../../application/dto/create-specialty.dto.js';
import { UpdateSpecialtyDto } from '../../application/dto/update-specialty.dto.js';
import { SpecialtyResponseDto } from '../../application/dto/specialty-response.dto.js';
import { CreateSpecialtyUseCase } from '../../application/use-cases/create-specialty.use-case.js';
import { FindAllSpecialtiesUseCase } from '../../application/use-cases/find-all-specialties.use-case.js';
import { UpdateSpecialtyUseCase } from '../../application/use-cases/update-specialty.use-case.js';
import { DeleteSpecialtyUseCase } from '../../application/use-cases/delete-specialty.use-case.js';

@ApiTags('Specialties')
@Controller('specialties')
export class SpecialtyController {
  constructor(
    private readonly createSpecialtyUseCase: CreateSpecialtyUseCase,
    private readonly findAllSpecialtiesUseCase: FindAllSpecialtiesUseCase,
    private readonly updateSpecialtyUseCase: UpdateSpecialtyUseCase,
    private readonly deleteSpecialtyUseCase: DeleteSpecialtyUseCase,
  ) {}

  @Post()
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear especialidad' })
  @ApiResponse({
    status: 201,
    description: 'Especialidad creada',
    type: SpecialtyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Categoría no existe' })
  async create(@Body() dto: CreateSpecialtyDto): Promise<SpecialtyResponseDto> {
    return this.createSpecialtyUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las especialidades activas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de especialidades',
    type: [SpecialtyResponseDto],
  })
  async findAll(): Promise<SpecialtyResponseDto[]> {
    return this.findAllSpecialtiesUseCase.execute();
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar especialidad' })
  @ApiResponse({
    status: 200,
    description: 'Especialidad actualizada',
    type: SpecialtyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecialtyDto,
  ): Promise<SpecialtyResponseDto> {
    return this.updateSpecialtyUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar especialidad (soft delete)' })
  @ApiResponse({ status: 204, description: 'Especialidad eliminada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.deleteSpecialtyUseCase.execute(id);
  }
}
