import { Injectable, Inject } from '@nestjs/common';
import { ScheduleResponseDto } from '../dto/schedule-response.dto.js';
import { PaginatedScheduleResponseDto } from '../dto/paginated-schedule-response.dto.js';
import type { IScheduleRepository } from '../../domain/repositories/schedule.repository.js';
import { PaginationImproved } from '../../../../shared/utils/value-objects/pagination-improved.value-object.js';
import { dateToTimeString } from '../../../../shared/utils/date-time.utils.js';
import { TimezoneResolverService } from '../../../../shared/services/timezone-resolver.service.js';
import { DEFAULT_TIMEZONE } from '../../../../shared/constants/defaults.constant.js';

@Injectable()
export class FindAllSchedulesUseCase {
  constructor(
    @Inject('IScheduleRepository')
    private readonly scheduleRepository: IScheduleRepository,
    private readonly timezoneResolver: TimezoneResolverService,
  ) {}

  async execute(
    pagination: PaginationImproved,
    filters: {
      doctorId?: number;
      specialtyId?: number;
      dateFrom?: string;
      dateTo?: string;
      onlyAvailable?: boolean;
      clinicId?: number;
    },
    jwtClinicId?: number | null,
  ): Promise<PaginatedScheduleResponseDto> {
    const { limit, offset } = pagination.getOffsetLimit();

    // Resolver timezone si hay doctorId
    let timezone: string | undefined;
    if (filters.doctorId) {
      timezone = await this.timezoneResolver.resolveByDoctorId(
        filters.doctorId,
      );
    }

    // JWT clinicId prevails over client-supplied for staff
    const effectiveClinicId = jwtClinicId ?? filters.clinicId;

    const result = await this.scheduleRepository.findAllPaginated(
      {
        offset,
        limit,
        searchValue: pagination.searchValue,
        orderBy: pagination.orderBy,
        orderByMode: pagination.orderByMode,
      },
      {
        doctorId: filters.doctorId,
        specialtyId: filters.specialtyId,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        onlyAvailable: filters.onlyAvailable,
        timezone,
        clinicId: effectiveClinicId,
      },
    );

    const rows: ScheduleResponseDto[] = result.rows.map((s) => ({
      id: s.id,
      doctorId: s.doctorId,
      specialtyId: s.specialtyId,
      scheduleDate: s.scheduleDate,
      timeFrom: dateToTimeString(s.timeFrom),
      timeTo: dateToTimeString(s.timeTo),
      doctor: {
        id: s.doctor.id,
        name: s.doctor.profile.name,
        lastName: s.doctor.profile.lastName,
      },
      specialty: s.specialty,
      timezone: s.doctor.clinic?.timezone ?? DEFAULT_TIMEZONE,
      createdAt: s.createdAt,
    }));

    return {
      totalRows: result.totalRows,
      rows,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}
