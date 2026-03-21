import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth, CurrentClinic } from '../../../../shared/decorators/index.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { CreateHolidayDto } from '../../application/dto/create-holiday.dto.js';
import { UpdateHolidayDto } from '../../application/dto/update-holiday.dto.js';
import { FindAllHolidaysQueryDto } from '../../application/dto/find-all-holidays-query.dto.js';
import { HolidayResponseDto } from '../../application/dto/holiday-response.dto.js';
import { PaginatedHolidayResponseDto } from '../../application/dto/paginated-holiday-response.dto.js';
import {
  SeedHolidaysDto,
  SeedHolidaysResponseDto,
} from '../../application/dto/seed-holidays.dto.js';
import { CreateHolidayUseCase } from '../../application/use-cases/create-holiday.use-case.js';
import { FindAllHolidaysUseCase } from '../../application/use-cases/find-all-holidays.use-case.js';
import { UpdateHolidayUseCase } from '../../application/use-cases/update-holiday.use-case.js';
import { DeleteHolidayUseCase } from '../../application/use-cases/delete-holiday.use-case.js';
import { SeedPeruHolidaysUseCase } from '../../application/use-cases/seed-peru-holidays.use-case.js';

@ApiTags('Holidays')
@Controller('holidays')
export class HolidayController {
  constructor(
    private readonly createHolidayUseCase: CreateHolidayUseCase,
    private readonly findAllHolidaysUseCase: FindAllHolidaysUseCase,
    private readonly updateHolidayUseCase: UpdateHolidayUseCase,
    private readonly deleteHolidayUseCase: DeleteHolidayUseCase,
    private readonly seedPeruHolidaysUseCase: SeedPeruHolidaysUseCase,
  ) {}

  @Post()
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear feriado' })
  @ApiResponse({
    status: 201,
    description: 'Feriado creado exitosamente',
    type: HolidayResponseDto,
  })
  async create(
    @Body() dto: CreateHolidayDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<HolidayResponseDto> {
    return this.createHolidayUseCase.execute(dto, clinicId);
  }

  @Post('seed')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Sembrar feriados del Perú para un año' })
  @ApiResponse({
    status: 201,
    description: 'Feriados sembrados exitosamente',
    type: SeedHolidaysResponseDto,
  })
  async seedPeruHolidays(
    @Body() dto: SeedHolidaysDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<SeedHolidaysResponseDto> {
    return this.seedPeruHolidaysUseCase.execute(dto, clinicId);
  }

  @Get()
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar feriados con paginación' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de feriados',
    type: PaginatedHolidayResponseDto,
  })
  async findAll(
    @Query() queryDto: FindAllHolidaysQueryDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<PaginatedHolidayResponseDto> {
    const pagination = new PaginationImproved(
      queryDto.searchValue,
      queryDto.currentPage,
      queryDto.pageSize,
      queryDto.orderBy,
      queryDto.orderByMode,
    );
    return this.findAllHolidaysUseCase.execute(
      pagination,
      queryDto.year,
      clinicId,
    );
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar feriado' })
  @ApiResponse({
    status: 200,
    description: 'Feriado actualizado',
    type: HolidayResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Feriado no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHolidayDto,
    @CurrentClinic() clinicId: number | null,
  ): Promise<HolidayResponseDto> {
    return this.updateHolidayUseCase.execute(id, dto, clinicId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar feriado' })
  @ApiResponse({ status: 204, description: 'Feriado eliminado' })
  @ApiResponse({ status: 404, description: 'Feriado no encontrado' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentClinic() clinicId: number | null,
  ): Promise<void> {
    return this.deleteHolidayUseCase.execute(id, clinicId);
  }
}
