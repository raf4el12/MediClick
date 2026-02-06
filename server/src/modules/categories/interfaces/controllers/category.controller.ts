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
import { CreateCategoryDto } from '../../application/dto/create-category.dto.js';
import { UpdateCategoryDto } from '../../application/dto/update-category.dto.js';
import { CategoryResponseDto } from '../../application/dto/category-response.dto.js';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case.js';
import { FindAllCategoriesUseCase } from '../../application/use-cases/find-all-categories.use-case.js';
import { UpdateCategoryUseCase } from '../../application/use-cases/update-category.use-case.js';
import { DeleteCategoryUseCase } from '../../application/use-cases/delete-category.use-case.js';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly findAllCategoriesUseCase: FindAllCategoriesUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
  ) {}

  @Post()
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear categoría' })
  @ApiResponse({
    status: 201,
    description: 'Categoría creada',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Nombre duplicado' })
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.createCategoryUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las categorías activas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorías',
    type: [CategoryResponseDto],
  })
  async findAll(): Promise<CategoryResponseDto[]> {
    return this.findAllCategoriesUseCase.execute();
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar categoría' })
  @ApiResponse({
    status: 200,
    description: 'Categoría actualizada',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  @ApiResponse({ status: 409, description: 'Nombre duplicado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.updateCategoryUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar categoría (soft delete)' })
  @ApiResponse({ status: 204, description: 'Categoría eliminada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.deleteCategoryUseCase.execute(id);
  }
}
