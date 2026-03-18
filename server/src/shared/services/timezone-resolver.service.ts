import { Injectable, Inject } from '@nestjs/common';
import type { IClinicRepository } from '../../modules/clinics/domain/repositories/clinic.repository.js';

@Injectable()
export class TimezoneResolverService {
  private static readonly DEFAULT_TZ = 'America/Lima';

  constructor(
    @Inject('IClinicRepository')
    private readonly clinicRepo: IClinicRepository,
  ) {}

  async resolveByDoctorId(doctorId: number): Promise<string> {
    const tz = await this.clinicRepo.findTimezoneByDoctorId(doctorId);
    return tz ?? TimezoneResolverService.DEFAULT_TZ;
  }

  async resolveClinicIdByDoctorId(doctorId: number): Promise<number | null> {
    return this.clinicRepo.findClinicIdByDoctorId(doctorId);
  }
}
