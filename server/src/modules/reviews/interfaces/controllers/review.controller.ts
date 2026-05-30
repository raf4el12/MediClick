import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Auth } from '../../../../shared/decorators/index.js';
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import { CurrentClinic } from '../../../../shared/decorators/current-clinic.decorator.js';
import { CreateReviewDto } from '../../application/dto/create-review.dto.js';
import { SetReviewVisibilityDto } from '../../application/dto/set-review-visibility.dto.js';
import {
  ReviewResponseDto,
  DoctorReviewsResponseDto,
} from '../../application/dto/review-response.dto.js';
import { CreateReviewUseCase } from '../../application/use-cases/create-review.use-case.js';
import { GetDoctorReviewsUseCase } from '../../application/use-cases/get-doctor-reviews.use-case.js';
import { GetMyReviewsUseCase } from '../../application/use-cases/get-my-reviews.use-case.js';
import { SetReviewVisibilityUseCase } from '../../application/use-cases/set-review-visibility.use-case.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(
    private readonly createReviewUseCase: CreateReviewUseCase,
    private readonly getDoctorReviewsUseCase: GetDoctorReviewsUseCase,
    private readonly getMyReviewsUseCase: GetMyReviewsUseCase,
    private readonly setReviewVisibilityUseCase: SetReviewVisibilityUseCase,
  ) {}

  @Post()
  @Auth()
  @RequirePermissions('CREATE', 'REVIEWS')
  @Throttle({ long: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Reseñar una cita completada (paciente)' })
  @ApiResponse({ status: 201, type: ReviewResponseDto })
  @ApiResponse({ status: 400, description: 'La cita no está completada' })
  @ApiResponse({ status: 403, description: 'La cita no te pertenece' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  @ApiResponse({ status: 409, description: 'La cita ya tiene una reseña' })
  async create(
    @CurrentUser('id') userId: number,
    @CurrentClinic() clinicId: number | null,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.createReviewUseCase.execute(userId, dto, clinicId);
  }

  @Get('my')
  @Auth()
  @RequirePermissions('READ', 'REVIEWS')
  @ApiOperation({ summary: 'Mis reseñas (paciente autenticado)' })
  @ApiResponse({ status: 200, type: [ReviewResponseDto] })
  async myReviews(
    @CurrentUser('id') userId: number,
  ): Promise<ReviewResponseDto[]> {
    return this.getMyReviewsUseCase.execute(userId);
  }

  @Get('doctor/:doctorId')
  @Auth()
  @RequirePermissions('READ', 'REVIEWS')
  @ApiOperation({ summary: 'Reseñas visibles de un doctor + rating agregado' })
  @ApiResponse({ status: 200, type: DoctorReviewsResponseDto })
  async doctorReviews(
    @Param('doctorId', ParseIntPipe) doctorId: number,
  ): Promise<DoctorReviewsResponseDto> {
    return this.getDoctorReviewsUseCase.execute(doctorId);
  }

  @Patch(':id/visibility')
  @Auth()
  @RequirePermissions('UPDATE', 'REVIEWS')
  @ApiOperation({ summary: 'Mostrar/ocultar una reseña (moderación)' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  @ApiResponse({ status: 404, description: 'Reseña no encontrada' })
  async setVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetReviewVisibilityDto,
  ): Promise<ReviewResponseDto> {
    return this.setReviewVisibilityUseCase.execute(id, dto.isVisible);
  }
}
