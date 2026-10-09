import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { IWaitlistEntryRepository } from '../../domain/repositories/waitlist-entry.repository.js';
import type { IPatientRepository } from '../../../patients/domain/repositories/patient.repository.js';
import type { ISpecialtyRepository } from '../../../specialties/domain/repositories/specialty.repository.js';
import type { IDoctorRepository } from '../../../doctors/domain/repositories/doctor.repository.js';
import type { IClinicRepository } from '../../../clinics/domain/repositories/clinic.repository.js';
import { JoinWaitlistDto } from '../dto/join-waitlist.dto.js';
import { WaitlistEntryResponseDto } from '../dto/waitlist-response.dto.js';
import { toEntryDto } from '../dto/waitlist-dto.mapper.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class JoinWaitlistUseCase {
  constructor(
    @Inject('IWaitlistEntryRepository')
    private readonly entryRepository: IWaitlistEntryRepository,
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepository: ISpecialtyRepository,
    @Inject('IDoctorRepository')
    private readonly doctorRepository: IDoctorRepository,
    @Inject('IClinicRepository')
    private readonly clinicRepository: IClinicRepository,
  ) {}

  async execute(
    userId: number,
    dto: JoinWaitlistDto,
  ): Promise<WaitlistEntryResponseDto> {
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient) {
      throw new NotFoundException(
        'No se encontró un perfil de paciente asociado a tu cuenta',
      );
    }

    const specialty = await this.specialtyRepository.findById(dto.specialtyId);
    if (!specialty || !specialty.isActive || specialty.deleted) {
      throw new BadRequestException(
        'La especialidad no existe o no está disponible',
      );
    }

    const clinicId = await this.resolveClinicId(
      dto,
      specialty.clinicId ?? null,
    );

    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);
    if (dateFrom.getTime() > dateTo.getTime()) {
      throw new BadRequestException(
        'dateFrom debe ser anterior o igual a dateTo',
      );
    }
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    if (dateTo.getTime() < todayStart.getTime()) {
      throw new BadRequestException('La ventana de búsqueda ya pasó');
    }

    const duplicate = await this.entryRepository.existsActiveDuplicate(
      patient.id,
      dto.specialtyId,
      dto.doctorId ?? null,
    );
    if (duplicate) {
      throw new ConflictException(
        'Ya estás en la lista de espera para esta especialidad/doctor',
      );
    }

    const entry = await this.entryRepository.create({
      patientId: patient.id,
      specialtyId: dto.specialtyId,
      doctorId: dto.doctorId ?? null,
      clinicId,
      dateFrom,
      dateTo,
      timePreference: dto.timePreference,
      // La entrada caduca al terminar el último día de la ventana.
      waitUntil: new Date(dateTo.getTime() + ONE_DAY_MS),
      notes: dto.notes ?? null,
    });

    return toEntryDto(entry);
  }

  /**
   * Sede de la entrada (decisión 2026-10-06): la del médico si el paciente eligió
   * uno; si no, la que indique al anotarse, que es obligatoria. El matcher solo
   * ofrece cupos de la sede de la entrada.
   */
  private async resolveClinicId(
    dto: JoinWaitlistDto,
    specialtyClinicId: number | null,
  ): Promise<number> {
    if (dto.doctorId) {
      const doctor = await this.doctorRepository.findById(dto.doctorId);
      if (!doctor) {
        throw new BadRequestException('El doctor especificado no existe');
      }
      if (doctor.clinicId === null) {
        throw new BadRequestException('El médico no tiene una sede asignada');
      }
      if (dto.clinicId !== undefined && dto.clinicId !== doctor.clinicId) {
        throw new BadRequestException(
          'La sede elegida no es la del médico elegido',
        );
      }
      return doctor.clinicId;
    }

    if (dto.clinicId === undefined) {
      throw new BadRequestException(
        'Elige la sede donde quieres atenderte o un médico',
      );
    }
    const clinic = await this.clinicRepository.findById(dto.clinicId);
    if (!clinic || !clinic.isActive || clinic.deleted) {
      throw new BadRequestException('La sede no existe o no está disponible');
    }
    if (specialtyClinicId !== null && specialtyClinicId !== dto.clinicId) {
      throw new BadRequestException(
        'La especialidad no se atiende en la sede elegida',
      );
    }
    return dto.clinicId;
  }
}
