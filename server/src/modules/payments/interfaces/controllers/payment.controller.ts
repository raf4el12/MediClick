import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../../../../shared/decorators/auth.decorator.js';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator.js';
import { CreatePreferenceDto } from '../../application/dto/create-preference.dto.js';
import { PreferenceResponseDto } from '../../application/dto/preference-response.dto.js';
import { PaymentResponseDto } from '../../application/dto/payment-response.dto.js';
import { CreatePaymentPreferenceUseCase } from '../../application/use-cases/create-payment-preference.use-case.js';
import { GetPaymentByAppointmentUseCase } from '../../application/use-cases/get-payment-by-appointment.use-case.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly createPaymentPreferenceUseCase: CreatePaymentPreferenceUseCase,
    private readonly getPaymentByAppointmentUseCase: GetPaymentByAppointmentUseCase,
  ) {}

  @Post('preferences')
  @Auth()
  @RequirePermissions('CREATE', 'APPOINTMENTS')
  @ApiOperation({
    summary: 'Crear preference de pago para una cita (Mercado Pago Checkout Pro)',
  })
  @ApiResponse({
    status: 201,
    description: 'Preference creada, devuelve URL de checkout',
    type: PreferenceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cita sin precio, ya pagada, o fuera del plazo',
  })
  @ApiResponse({ status: 403, description: 'La cita no te pertenece' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async createPreference(
    @CurrentUser('id') userId: number,
    @Body() dto: CreatePreferenceDto,
  ): Promise<PreferenceResponseDto> {
    return this.createPaymentPreferenceUseCase.execute(userId, dto);
  }

  @Get('appointment/:id')
  @Auth()
  @RequirePermissions('READ', 'APPOINTMENTS')
  @ApiOperation({ summary: 'Consultar estado del pago de una cita' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Sin pago registrado para la cita' })
  async getByAppointment(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
    @Param('id', ParseIntPipe) appointmentId: number,
  ): Promise<PaymentResponseDto> {
    return this.getPaymentByAppointmentUseCase.execute(
      userId,
      role,
      appointmentId,
    );
  }
}
