import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationDto } from './pagination-dto.js';
import {
  AppointmentDashboardFilterDto,
  APPOINTMENT_SORT_FIELDS,
} from '../../../modules/appointments/application/dto/appointment-dashboard-filter.dto.js';
import { MyAppointmentsFilterDto } from '../../../modules/appointments/application/dto/my-appointments-filter.dto.js';
import {
  FindAllAvailabilityQueryDto,
  AVAILABILITY_SORT_FIELDS,
} from '../../../modules/availability/application/dto/find-all-availability-query.dto.js';
import {
  FindAllCategoriesQueryDto,
  CATEGORY_SORT_FIELDS,
} from '../../../modules/categories/application/dto/find-all-categories-query.dto.js';
import {
  FindAllClinicsQueryDto,
  CLINIC_SORT_FIELDS,
} from '../../../modules/clinics/application/dto/find-all-clinics-query.dto.js';
import {
  FindAllDoctorsQueryDto,
  DOCTOR_SORT_FIELDS,
} from '../../../modules/doctors/application/dto/find-all-doctors-query.dto.js';
import {
  FindAllHolidaysQueryDto,
  HOLIDAY_SORT_FIELDS,
} from '../../../modules/holidays/application/dto/find-all-holidays-query.dto.js';
import {
  FindAllPatientsQueryDto,
  PATIENT_SORT_FIELDS,
} from '../../../modules/patients/application/dto/find-all-patients-query.dto.js';
import {
  FindAllScheduleBlocksQueryDto,
  SCHEDULE_BLOCK_SORT_FIELDS,
} from '../../../modules/schedule-blocks/application/dto/find-all-schedule-blocks-query.dto.js';
import {
  FindAllSchedulesQueryDto,
  SCHEDULE_SORT_FIELDS,
} from '../../../modules/schedules/application/dto/find-all-schedules-query.dto.js';
import {
  FindAllSpecialtiesQueryDto,
  SPECIALTY_SORT_FIELDS,
} from '../../../modules/specialties/application/dto/find-all-specialties-query.dto.js';
import {
  FindAllUsersDto,
  USER_SORT_FIELDS,
} from '../../../modules/users/application/dto/find-all-users.dto.js';
import {
  FindAuditLogsDto,
  AUDIT_LOG_SORT_FIELDS,
} from '../../security-audit/dto/find-audit-logs.dto.js';

type DtoClass = new () => PaginationDto;

const listings: [string, DtoClass, readonly string[]][] = [
  ['citas (dashboard)', AppointmentDashboardFilterDto, APPOINTMENT_SORT_FIELDS],
  ['citas (mis citas)', MyAppointmentsFilterDto, APPOINTMENT_SORT_FIELDS],
  ['disponibilidad', FindAllAvailabilityQueryDto, AVAILABILITY_SORT_FIELDS],
  ['categorías', FindAllCategoriesQueryDto, CATEGORY_SORT_FIELDS],
  ['sedes', FindAllClinicsQueryDto, CLINIC_SORT_FIELDS],
  ['médicos', FindAllDoctorsQueryDto, DOCTOR_SORT_FIELDS],
  ['feriados', FindAllHolidaysQueryDto, HOLIDAY_SORT_FIELDS],
  ['pacientes', FindAllPatientsQueryDto, PATIENT_SORT_FIELDS],
  ['bloqueos', FindAllScheduleBlocksQueryDto, SCHEDULE_BLOCK_SORT_FIELDS],
  ['horarios', FindAllSchedulesQueryDto, SCHEDULE_SORT_FIELDS],
  ['especialidades', FindAllSpecialtiesQueryDto, SPECIALTY_SORT_FIELDS],
  ['usuarios', FindAllUsersDto, USER_SORT_FIELDS],
  ['bitácora de seguridad', FindAuditLogsDto, AUDIT_LOG_SORT_FIELDS],
];

const validateQuery = (cls: DtoClass, query: Record<string, unknown>) =>
  validate(plainToInstance(cls, query));

describe('orderBy con lista blanca en los listados', () => {
  describe.each(listings)('%s', (_name, cls, fields) => {
    it.each(fields)('acepta orderBy=%s', async (field) => {
      await expect(validateQuery(cls, { orderBy: field })).resolves.toEqual([]);
    });

    it('rechaza una columna fuera de la lista (relación o inexistente)', async () => {
      for (const orderBy of ['profile', 'fullName', 'role', 'clinic']) {
        const errors = await validateQuery(cls, { orderBy });
        expect(errors.map((e) => e.property)).toEqual(['orderBy']);
        expect(errors[0].constraints?.isIn).toContain('orderBy debe ser');
      }
    });

    it('acepta la consulta sin orderBy (orden por defecto del repositorio)', async () => {
      await expect(validateQuery(cls, {})).resolves.toEqual([]);
    });
  });

  it('cada lista blanca incluye id y createdAt para el orden por defecto del cliente', () => {
    for (const [, , fields] of listings) {
      expect(fields).toEqual(expect.arrayContaining(['id', 'createdAt']));
    }
  });
});

describe('orderByMode', () => {
  it('acepta asc y desc y normaliza mayúsculas', async () => {
    for (const mode of ['asc', 'desc', 'ASC', 'Desc']) {
      const dto = plainToInstance(PaginationDto, { orderByMode: mode });
      await expect(validate(dto)).resolves.toEqual([]);
      expect(dto.orderByMode).toBe(mode.toLowerCase());
    }
  });

  it('rechaza un modo que no sea asc ni desc', async () => {
    const errors = await validate(
      plainToInstance(PaginationDto, { orderByMode: 'sideways' }),
    );
    expect(errors.map((e) => e.property)).toEqual(['orderByMode']);
  });
});
