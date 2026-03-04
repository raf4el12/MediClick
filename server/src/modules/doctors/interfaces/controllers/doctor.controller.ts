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
import { Auth } from '../../../../shared/decorators/index.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { OnboardDoctorDto } from '../../application/dto/onboard-doctor.dto.js';
import { UpdateDoctorDto } from '../../application/dto/update-doctor.dto.js';
import { FindAllDoctorsQueryDto } from '../../application/dto/find-all-doctors-query.dto.js';
import { DoctorResponseDto } from '../../application/dto/doctor-response.dto.js';
import { PaginatedDoctorResponseDto } from '../../application/dto/paginated-doctor-response.dto.js';
import { OnboardDoctorUseCase } from '../../application/use-cases/onboard-doctor.use-case.js';
import { FindAllDoctorsUseCase } from '../../application/use-cases/find-all-doctors.use-case.js';
import { FindDoctorByIdUseCase } from '../../application/use-cases/find-doctor-by-id.use-case.js';
import { UpdateDoctorUseCase } from '../../application/use-cases/update-doctor.use-case.js';
import { DeleteDoctorUseCase } from '../../application/use-cases/delete-doctor.use-case.js';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorController {
  constructor(
    private readonly onboardDoctorUseCase: OnboardDoctorUseCase,
    private readonly findAllDoctorsUseCase: FindAllDoctorsUseCase,
    private readonly findDoctorByIdUseCase: FindDoctorByIdUseCase,
    private readonly updateDoctorUseCase: UpdateDoctorUseCase,
    private readonly deleteDoctorUseCase: DeleteDoctorUseCase,
  ) { }

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
  @Auth(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Listar doctores con paginación' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de doctores',
    type: PaginatedDoctorResponseDto,
  })
  async findAll(
    @Query() queryDto: FindAllDoctorsQueryDto,
  ): Promise<PaginatedDoctorResponseDto> {
    const pagination = new PaginationImproved(
      queryDto.searchValue,
      queryDto.currentPage,
      queryDto.pageSize,
      queryDto.orderBy,
      queryDto.orderByMode,
    );
    return this.findAllDoctorsUseCase.execute(pagination, queryDto.specialtyId);
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

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar datos del doctor' })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  @ApiResponse({ status: 404, description: 'Doctor no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorDto,
  ): Promise<DoctorResponseDto> {
    return this.updateDoctorUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar doctor (soft delete)' })
  @ApiResponse({ status: 204, description: 'Doctor eliminado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.deleteDoctorUseCase.execute(id);
  }
}
