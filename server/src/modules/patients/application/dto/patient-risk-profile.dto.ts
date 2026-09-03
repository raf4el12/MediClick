import { ApiProperty } from '@nestjs/swagger';

export class PatientRiskStatsDto {
  @ApiProperty({ example: 10, description: 'Total de citas históricas' })
  totalAppointments: number;

  @ApiProperty({ example: 3, description: 'Citas con inasistencia (NO_SHOW)' })
  noShowCount: number;

  @ApiProperty({
    example: 1,
    description: 'Cancelaciones con penalización por tardanza',
  })
  lateCancellationCount: number;
}

export class PatientRiskProfileDto {
  @ApiProperty({ example: 1 })
  patientId: number;

  @ApiProperty({
    example: 0.35,
    description: 'Score de riesgo ponderado entre 0.0 y 1.0',
  })
  riskScore: number;

  @ApiProperty({ example: 'HIGH', enum: ['LOW', 'MEDIUM', 'HIGH'] })
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty({
    example: true,
    description: 'Indica si califica para sobrecupo inteligente preventivo',
  })
  isOverbookCandidate: boolean;

  @ApiProperty({
    example:
      'Alto riesgo de inasistencia (>30% faltas o cancelaciones tardías). Candidato para sobrecupo controlado.',
  })
  recommendation: string;

  @ApiProperty({ type: PatientRiskStatsDto })
  stats: PatientRiskStatsDto;
}
