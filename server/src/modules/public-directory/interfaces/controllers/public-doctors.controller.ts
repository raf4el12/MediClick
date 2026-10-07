import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  PaginatedPublicDoctorsDto,
  PublicDoctorDto,
  PublicDoctorReviewsDto,
} from '../../application/dto/public-doctor.dto.js';
import { ListPublicDoctorsQueryDto } from '../../application/dto/list-public-doctors-query.dto.js';
import { PublicPageQueryDto } from '../../application/dto/public-page-query.dto.js';
import { ListPublicDoctorsUseCase } from '../../application/use-cases/list-public-doctors.use-case.js';
import { GetPublicDoctorUseCase } from '../../application/use-cases/get-public-doctor.use-case.js';
import { ListPublicDoctorReviewsUseCase } from '../../application/use-cases/list-public-doctor-reviews.use-case.js';

const PUBLIC_CACHE = 'public, max-age=300';

/**
 * Perfil público del médico (sin usuario). Sin @Auth(): el throttler lo
 * cuenta por IP, con un límite propio para anónimos.
 */
@ApiTags('Público')
@Controller('public/doctors')
@Throttle({ long: { ttl: 60000, limit: 60 } })
export class PublicDoctorsController {
  constructor(
    private readonly listPublicDoctorsUseCase: ListPublicDoctorsUseCase,
    private readonly getPublicDoctorUseCase: GetPublicDoctorUseCase,
    private readonly listPublicDoctorReviewsUseCase: ListPublicDoctorReviewsUseCase,
  ) {}

  @Get()
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary:
      'Médicos públicos, filtrables por sede, especialidad y nombre (público)',
  })
  @ApiResponse({ status: 200, type: PaginatedPublicDoctorsDto })
  list(
    @Query() query: ListPublicDoctorsQueryDto,
  ): Promise<PaginatedPublicDoctorsDto> {
    return this.listPublicDoctorsUseCase.execute(query);
  }

  @Get(':id')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Perfil público de un médico (público)' })
  @ApiResponse({ status: 200, type: PublicDoctorDto })
  @ApiResponse({ status: 404, description: 'Médico inexistente o no público' })
  detail(@Param('id', ParseIntPipe) id: number): Promise<PublicDoctorDto> {
    return this.getPublicDoctorUseCase.execute(id);
  }

  @Get(':id/reviews')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Reseñas visibles de un médico, sin datos del paciente (público)',
  })
  @ApiResponse({ status: 200, type: PublicDoctorReviewsDto })
  @ApiResponse({ status: 404, description: 'Médico inexistente o no público' })
  reviews(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PublicPageQueryDto,
  ): Promise<PublicDoctorReviewsDto> {
    return this.listPublicDoctorReviewsUseCase.execute(id, query);
  }
}
