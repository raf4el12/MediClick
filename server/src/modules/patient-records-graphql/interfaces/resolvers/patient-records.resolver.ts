import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { PatientRecordGql } from '../types/patient-record.type.js';
import { GetPatientRecordUseCase } from '../../application/use-cases/get-patient-record.use-case.js';
import { Auth } from '../../../../shared/decorators/auth.decorator.js';
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';

@Resolver(() => PatientRecordGql)
export class PatientRecordsResolver {
  constructor(
    private readonly getPatientRecordUseCase: GetPatientRecordUseCase,
  ) {}

  @Auth()
  @RequirePermissions('READ', 'PATIENTS')
  @Query(() => PatientRecordGql, { name: 'patientRecord' })
  async getPatientRecord(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PatientRecordGql> {
    return this.getPatientRecordUseCase.execute(id, user);
  }

  @Auth()
  @RequirePermissions('READ', 'PATIENTS')
  @Query(() => PatientRecordGql, { name: 'myPatientRecord' })
  async getMyPatientRecord(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PatientRecordGql> {
    return this.getPatientRecordUseCase.executeForCurrentUser(user);
  }
}
