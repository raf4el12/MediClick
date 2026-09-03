export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AssessRiskInput {
  totalAppointments: number;
  noShowCount: number;
  lateCancellationCount: number;
}

export interface PatientRiskAssessment {
  riskScore: number;
  riskLevel: RiskLevel;
  isOverbookCandidate: boolean;
  recommendation: string;
}

export interface SlotYieldOverbookInput {
  patientRiskLevel: RiskLevel;
  appointmentIsAtRisk: boolean;
  doctorMaxOverbookPerDay: number;
  currentOverbookCountForDay: number;
}

export interface SlotYieldOverbookResult {
  eligible: boolean;
  reason: string;
}

/**
 * Servicio de dominio para evaluación de riesgo de inasistencia (No-Show)
 * y cálculo de sobre-reserva controlada (Yield Management).
 * Libre de dependencias de NestJS y Prisma.
 */
export class PatientRiskService {
  /**
   * Evalúa el riesgo de inasistencia de un paciente en base a su historial.
   * Considera faltas (peso 1.0) y cancelaciones tardías (peso 0.5).
   */
  assessRisk(input: AssessRiskInput): PatientRiskAssessment {
    if (input.totalAppointments <= 0) {
      return {
        riskScore: 0.1,
        riskLevel: 'LOW',
        isOverbookCandidate: false,
        recommendation: 'Paciente nuevo sin historial previo.',
      };
    }

    const weightedAbsences =
      input.noShowCount * 1.0 + input.lateCancellationCount * 0.5;
    const rawRate = weightedAbsences / input.totalAppointments;
    const riskScore = Math.min(1.0, Math.round(rawRate * 100) / 100);

    if (riskScore >= 0.3) {
      return {
        riskScore,
        riskLevel: 'HIGH',
        isOverbookCandidate: true,
        recommendation:
          'Alto riesgo de inasistencia (>30% faltas o cancelaciones tardías). Candidato para sobrecupo controlado.',
      };
    }

    if (riskScore >= 0.15) {
      return {
        riskScore,
        riskLevel: 'MEDIUM',
        isOverbookCandidate: false,
        recommendation:
          'Riesgo moderado de inasistencia. Se sugiere enviar recordatorio adicional.',
      };
    }

    return {
      riskScore,
      riskLevel: 'LOW',
      isOverbookCandidate: false,
      recommendation: 'Historial de asistencia confiable y puntual.',
    };
  }

  /**
   * Determina si un slot con una cita en riesgo es apto para sobrecupo inteligente
   * respetando los límites de cupo diario del doctor.
   */
  isSlotEligibleForYieldOverbook(
    input: SlotYieldOverbookInput,
  ): SlotYieldOverbookResult {
    if (input.currentOverbookCountForDay >= input.doctorMaxOverbookPerDay) {
      return {
        eligible: false,
        reason: `Límite de sobrecupos alcanzado (${input.currentOverbookCountForDay}/${input.doctorMaxOverbookPerDay}) para el doctor en esta fecha.`,
      };
    }

    const isHighRisk =
      input.patientRiskLevel === 'HIGH' || input.appointmentIsAtRisk;
    if (!isHighRisk) {
      return {
        eligible: false,
        reason:
          'La cita tiene bajo riesgo de inasistencia; no se recomienda sobrecupo preventivo.',
      };
    }

    return {
      eligible: true,
      reason: `Slot en riesgo identificado (${input.appointmentIsAtRisk ? 'sin confirmación T-2h' : 'paciente con alto riesgo histórico'}); sobrecupo permitido.`,
    };
  }
}
