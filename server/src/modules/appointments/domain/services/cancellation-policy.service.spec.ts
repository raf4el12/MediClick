import { CancellationPolicyService } from './cancellation-policy.service.js';

describe('CancellationPolicyService', () => {
  let service: CancellationPolicyService;

  beforeEach(() => {
    service = new CancellationPolicyService();
  });

  it('no cobra penalización si cancela un miembro del personal o doctor', () => {
    const result = service.calculateFee({
      hoursUntilAppointment: 2,
      freeCancellationWindowHours: 24,
      appointmentPrice: 150,
      isPaid: true,
      isPatient: false,
    });

    expect(result.fee).toBe(0);
    expect(result.isLate).toBe(false);
  });

  it('no cobra penalización si el paciente cancela con anticipación superior a la ventana', () => {
    const result = service.calculateFee({
      hoursUntilAppointment: 25,
      freeCancellationWindowHours: 24,
      appointmentPrice: 150,
      isPaid: true,
      isPatient: true,
    });

    expect(result.fee).toBe(0);
    expect(result.isLate).toBe(false);
    expect(result.windowHours).toBe(24);
  });

  it('no cobra penalización si la cita no estaba pagada (aún si cancela tarde)', () => {
    const result = service.calculateFee({
      hoursUntilAppointment: 5,
      freeCancellationWindowHours: 24,
      appointmentPrice: 150,
      isPaid: false,
      isPatient: true,
    });

    expect(result.fee).toBe(0);
    expect(result.isLate).toBe(true);
  });

  it('retiene la seña si el paciente cancela tarde y la cita tenía un depósito registrado', () => {
    const result = service.calculateFee({
      hoursUntilAppointment: 6,
      freeCancellationWindowHours: 12,
      appointmentPrice: 200,
      depositAmount: 50,
      isPaid: true,
      isPatient: true,
    });

    expect(result.fee).toBe(50);
    expect(result.isLate).toBe(true);
    expect(result.windowHours).toBe(12);
  });

  it('calcula porcentaje estándar si no hay seña pero cancela tarde cita pagada', () => {
    const result = service.calculateFee({
      hoursUntilAppointment: 3,
      freeCancellationWindowHours: 24,
      appointmentPrice: 100,
      isPaid: true,
      isPatient: true,
    });

    // 50% de penalización estándar sobre 100
    expect(result.fee).toBe(50);
    expect(result.isLate).toBe(true);
  });

  it('respeta la ventana dinámica configurada para la especialidad o sede', () => {
    const result = service.resolveWindowHours({
      specialtyWindowHours: 48,
      clinicDefaultWindowHours: 24,
    });

    expect(result).toBe(48);

    const fallbackClinicResult = service.resolveWindowHours({
      specialtyWindowHours: null,
      clinicDefaultWindowHours: 36,
    });

    expect(fallbackClinicResult).toBe(36);

    const defaultFallback = service.resolveWindowHours({});
    expect(defaultFallback).toBe(24);
  });
});
