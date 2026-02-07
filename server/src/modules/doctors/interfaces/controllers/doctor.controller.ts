import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '../../../../shared/domain/enums/user-role.enum.js';
import { Auth } from '../../../../shared/decorators/index.js';
import { PaginationDto } from '../../../../shared/utils/dtos/pagination-dto.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { OnboardDoctorDto } from '../../application/dto/onboard-doctor.dto.js';
import { DoctorResponseDto } from '../../application/dto/doctor-response.dto.js';
import { PaginatedDoctorResponseDto } from '../../application/dto/paginated-doctor-response.dto.js';
import { OnboardDoctorUseCase } from '../../application/use-cases/onboard-doctor.use-case.js';
import { FindAllDoctorsUseCase } from '../../application/use-cases/find-all-doctors.use-case.js';
import { FindDoctorByIdUseCase } from '../../application/use-cases/find-doctor-by-id.use-case.js';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorController {
  constructor(
    private readonly onboardDoctorUseCase: OnboardDoctorUseCase,
    private readonly findAllDoctorsUseCase: FindAllDoctorsUseCase,
    private readonly findDoctorByIdUseCase: FindDoctorByIdUseCase,
  ) {}

  @Post('onboard')
  @Auth(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Onboarding de doctor (crear usuario + perfil + doctor + especialidades)',
  })
  @ApiResponse({
    status: 201,
    description: 'Doctor registrado exitosamente',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Especialidades inválidas' })
  @ApiResponse({ status: 409, description: 'Email o CMP duplicado' })
  async onboard(@Body() dto: OnboardDoctorDto): Promise<DoctorResponseDto> {
    return this.onboardDoctorUseCase.execute(dto);
  }

  @Get()
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar doctores con paginación' })
  @ApiQuery({
    name: 'specialtyId',
    required: false,
    type: Number,
    description: 'Filtrar por ID de especialidad',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de doctores',
    type: PaginatedDoctorResponseDto,
  })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('specialtyId') specialtyId?: string,
  ): Promise<PaginatedDoctorResponseDto> {
    const pagination = new PaginationImproved(
      paginationDto.searchValue,
      paginationDto.currentPage,
      paginationDto.pageSize,
      paginationDto.orderBy,
      paginationDto.orderByMode,
    );
    const specId = specialtyId ? parseInt(specialtyId, 10) : undefined;
    return this.findAllDoctorsUseCase.execute(pagination, specId);
  }

  @Get(':id')
  @Auth(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Obtener doctor por ID' })
  @ApiResponse({
    status: 200,
    description: 'Doctor encontrado',
    type: DoctorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Doctor no encontrado' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DoctorResponseDto> {
    return this.findDoctorByIdUseCase.execute(id);
  }
}
