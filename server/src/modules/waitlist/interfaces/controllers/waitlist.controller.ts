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
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Auth } from '../../../../shared/decorators/index.js';
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import { CurrentClinic } from '../../../../shared/decorators/current-clinic.decorator.js';
import { JoinWaitlistDto } from '../../application/dto/join-waitlist.dto.js';
import { AddPriorityDto } from '../../application/dto/add-priority.dto.js';
import {
  WaitlistEntryResponseDto,
  WaitlistOfferResponseDto,
} from '../../application/dto/waitlist-response.dto.js';
import { AcceptOfferResponseDto } from '../../application/dto/accept-offer-response.dto.js';
import { JoinWaitlistUseCase } from '../../application/use-cases/join-waitlist.use-case.js';
import { LeaveWaitlistUseCase } from '../../application/use-cases/leave-waitlist.use-case.js';
import { GetMyWaitlistUseCase } from '../../application/use-cases/get-my-waitlist.use-case.js';
import { GetClinicWaitlistUseCase } from '../../application/use-cases/get-clinic-waitlist.use-case.js';
import { AcceptOfferUseCase } from '../../application/use-cases/accept-offer.use-case.js';
import { RejectOfferUseCase } from '../../application/use-cases/reject-offer.use-case.js';
import { AddWaitlistPriorityUseCase } from '../../application/use-cases/add-waitlist-priority.use-case.js';

@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(
    private readonly joinWaitlistUseCase: JoinWaitlistUseCase,
    private readonly leaveWaitlistUseCase: LeaveWaitlistUseCase,
    private readonly getMyWaitlistUseCase: GetMyWaitlistUseCase,
    private readonly getClinicWaitlistUseCase: GetClinicWaitlistUseCase,
    private readonly acceptOfferUseCase: AcceptOfferUseCase,
    private readonly rejectOfferUseCase: RejectOfferUseCase,
    private readonly addWaitlistPriorityUseCase: AddWaitlistPriorityUseCase,
  ) {}

  @Get('my')
  @Auth()
  @RequirePermissions('READ', 'APPOINTMENTS')
  @ApiOperation({ summary: 'Mis entradas en lista de espera' })
  @ApiResponse({ status: 200, type: [WaitlistEntryResponseDto] })
  async myEntries(
    @CurrentUser('id') userId: number,
  ): Promise<WaitlistEntryResponseDto[]> {
    return this.getMyWaitlistUseCase.getMyEntries(userId);
  }

  @Get('my/offers')
  @Auth()
  @RequirePermissions('READ', 'APPOINTMENTS')
  @ApiOperation({ summary: 'Mis ofertas de cupo vigentes (con countdown)' })
  @ApiResponse({ status: 200, type: [WaitlistOfferResponseDto] })
  async myOffers(
    @CurrentUser('id') userId: number,
  ): Promise<WaitlistOfferResponseDto[]> {
    return this.getMyWaitlistUseCase.getMyPendingOffers(userId);
  }

  @Post('offers/:id/accept')
  @Auth()
  @RequirePermissions('CREATE', 'APPOINTMENTS')
  @Throttle({ long: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary: 'Aceptar una oferta de cupo (crea la cita PENDING de pago)',
  })
  @ApiResponse({ status: 201, type: AcceptOfferResponseDto })
  @ApiResponse({ status: 403, description: 'La oferta no te pertenece' })
  @ApiResponse({ status: 409, description: 'La oferta ya no está disponible' })
  async acceptOffer(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) offerId: number,
  ): Promise<AcceptOfferResponseDto> {
    return this.acceptOfferUseCase.execute(userId, offerId);
  }

  @Post('offers/:id/reject')
  @Auth()
  @RequirePermissions('UPDATE', 'APPOINTMENTS')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Rechazar una oferta (se reofrece al siguiente en cola)',
  })
  @ApiResponse({ status: 200, description: 'Oferta rechazada' })
  async rejectOffer(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) offerId: number,
  ): Promise<void> {
    return this.rejectOfferUseCase.execute(userId, offerId);
  }

  @Post()
  @Auth()
  @RequirePermissions('CREATE', 'APPOINTMENTS')
  @Throttle({ long: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Unirse a la lista de espera de una especialidad' })
  @ApiResponse({ status: 201, type: WaitlistEntryResponseDto })
  @ApiResponse({ status: 400, description: 'Especialidad/fecha inválida' })
  @ApiResponse({ status: 409, description: 'Ya estás en la cola' })
  async join(
    @CurrentUser('id') userId: number,
    @Body() dto: JoinWaitlistDto,
  ): Promise<WaitlistEntryResponseDto> {
    return this.joinWaitlistUseCase.execute(userId, dto);
  }

  @Get()
  @Auth()
  @RequirePermissions('READ', 'APPOINTMENTS')
  @ApiOperation({ summary: 'Cola activa de la clínica (dashboard de staff)' })
  @ApiResponse({ status: 200, type: [WaitlistEntryResponseDto] })
  async clinicWaitlist(
    @CurrentClinic() clinicId: number | null,
    @Query('specialtyId', new ParseIntPipe({ optional: true }))
    specialtyId?: number,
    @Query('doctorId', new ParseIntPipe({ optional: true }))
    doctorId?: number,
  ): Promise<WaitlistEntryResponseDto[]> {
    return this.getClinicWaitlistUseCase.execute(clinicId, {
      specialtyId,
      doctorId,
    });
  }

  @Delete(':id')
  @Auth()
  @RequirePermissions('UPDATE', 'APPOINTMENTS')
  @HttpCode(200)
  @ApiOperation({ summary: 'Salir de la lista de espera' })
  @ApiResponse({ status: 200, description: 'Entrada cancelada' })
  @ApiResponse({ status: 403, description: 'La entrada no te pertenece' })
  async leave(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) entryId: number,
  ): Promise<void> {
    return this.leaveWaitlistUseCase.execute(userId, entryId);
  }

  @Patch(':id/priority')
  @Auth()
  @RequirePermissions('UPDATE', 'APPOINTMENTS')
  @ApiOperation({ summary: 'Subir prioridad de una entrada (CLINIC_ADMIN)' })
  @ApiResponse({ status: 200, type: WaitlistEntryResponseDto })
  async addPriority(
    @Param('id', ParseIntPipe) entryId: number,
    @Body() dto: AddPriorityDto,
  ): Promise<WaitlistEntryResponseDto> {
    return this.addWaitlistPriorityUseCase.execute(entryId, dto.delta);
  }
}
