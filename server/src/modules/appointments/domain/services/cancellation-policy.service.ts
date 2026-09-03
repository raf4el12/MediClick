import { CANCELLATION_FEE_PERCENTAGE } from '../constants/cancellation-policy.constants.js';

export interface CalculateCancellationFeeParams {
  hoursUntilAppointment: number;
  freeCancellationWindowHours: number;
  appointmentPrice: number;
  depositAmount?: number | null;
  isPaid: boolean;
  isPatient: boolean;
}

export interface CancellationFeeCalculationResult {
  fee: number;
  isLate: boolean;
  windowHours: number;
}

export interface ResolveWindowHoursParams {
  specialtyWindowHours?: number | null;
  clinicDefaultWindowHours?: number | null;
}

/**
 * Servicio de dominio puro para cálculo de penalizaciones por cancelación tardía.
 * Libre de dependencias de NestJS y Prisma.
 */
export class CancellationPolicyService {
  private static readonly DEFAULT_WINDOW_HOURS = 24;

  /**
   * Resuelve la ventana de horas previa a la cita en la que cancelar no incurre en penalización.
   * Prioridad: especialidad > sede > 24 horas por defecto.
   */
  resolveWindowHours(params: ResolveWindowHoursParams): number {
    if (
      params.specialtyWindowHours !== undefined &&
      params.specialtyWindowHours !== null &&
      params.specialtyWindowHours > 0
    ) {
      return params.specialtyWindowHours;
    }

    if (
      params.clinicDefaultWindowHours !== undefined &&
      params.clinicDefaultWindowHours !== null &&
      params.clinicDefaultWindowHours > 0
    ) {
      return params.clinicDefaultWindowHours;
    }

    return CancellationPolicyService.DEFAULT_WINDOW_HOURS;
  }

  /**
   * Calcula la tarifa o retención por cancelación según el rol, estado de pago y tiempo restante.
   */
  calculateFee(
    params: CalculateCancellationFeeParams,
  ): CancellationFeeCalculationResult {
    const isLate =
      params.isPatient &&
      params.hoursUntilAppointment < params.freeCancellationWindowHours;

    if (!isLate || !params.isPaid) {
      return {
        fee: 0,
        isLate,
        windowHours: params.freeCancellationWindowHours,
      };
    }

    // Si la cita tenía una seña (depósito previo), se retiene la seña completa como penalización
    if (
      params.depositAmount !== undefined &&
      params.depositAmount !== null &&
      params.depositAmount > 0
    ) {
      return {
        fee: Math.min(params.depositAmount, params.appointmentPrice),
        isLate: true,
        windowHours: params.freeCancellationWindowHours,
      };
    }

    // En caso de pago completo sin depósito separado, retiene el % estándar sobre el valor
    const calculatedFee = Math.round(
      (params.appointmentPrice * CANCELLATION_FEE_PERCENTAGE) / 100,
    );

    return {
      fee: calculatedFee,
      isLate: true,
      windowHours: params.freeCancellationWindowHours,
    };
  }
}
