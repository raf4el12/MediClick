import { PatientRiskService } from './patient-risk.service.js';

describe('PatientRiskService (Yield/Overbooking Controlado)', () => {
  let service: PatientRiskService;

  beforeEach(() => {
    service = new PatientRiskService();
  });

  it('RED->GREEN: nuevo paciente sin historial se clasifica como LOW riesgo', () => {
    const assessment = service.assessRisk({
      totalAppointments: 0,
      noShowCount: 0,
      lateCancellationCount: 0,
    });

    expect(assessment.riskLevel).toBe('LOW');
    expect(assessment.isOverbookCandidate).toBe(false);
    expect(assessment.riskScore).toBeLessThan(0.2);
  });

  it('RED->GREEN: paciente con baja tasa de faltas (<15%) se clasifica como LOW riesgo', () => {
    const assessment = service.assessRisk({
      totalAppointments: 10,
      noShowCount: 1,
      lateCancellationCount: 0,
    });

    expect(assessment.riskLevel).toBe('LOW');
    expect(assessment.isOverbookCandidate).toBe(false);
  });

  it('RED->GREEN: paciente con 15%-29% de faltas o cancelaciones tardías se clasifica como MEDIUM riesgo', () => {
    const assessment = service.assessRisk({
      totalAppointments: 10,
      noShowCount: 2,
      lateCancellationCount: 0,
    });

    expect(assessment.riskLevel).toBe('MEDIUM');
    expect(assessment.isOverbookCandidate).toBe(false);
  });

  it('RED->GREEN: paciente con >=30% de faltas o cancelaciones tardías se clasifica como HIGH riesgo y candidato para sobrecupo', () => {
    const assessment = service.assessRisk({
      totalAppointments: 10,
      noShowCount: 3,
      lateCancellationCount: 1,
    });

    expect(assessment.riskLevel).toBe('HIGH');
    expect(assessment.isOverbookCandidate).toBe(true);
    expect(assessment.recommendation).toContain('sobrecupo');
  });

  it('RED->GREEN: evalúa slot candidato a sobrecupo si la cita actual está marcada isAtRisk', () => {
    const result = service.isSlotEligibleForYieldOverbook({
      patientRiskLevel: 'HIGH',
      appointmentIsAtRisk: true,
      doctorMaxOverbookPerDay: 3,
      currentOverbookCountForDay: 1,
    });

    expect(result.eligible).toBe(true);
    expect(result.reason).toContain('sobrecupo permitido');
  });

  it('RED->GREEN: rechaza sobrecupo si se alcanzó el límite diario del doctor', () => {
    const result = service.isSlotEligibleForYieldOverbook({
      patientRiskLevel: 'HIGH',
      appointmentIsAtRisk: true,
      doctorMaxOverbookPerDay: 2,
      currentOverbookCountForDay: 2,
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Límite de sobrecupos alcanzado');
  });
});
