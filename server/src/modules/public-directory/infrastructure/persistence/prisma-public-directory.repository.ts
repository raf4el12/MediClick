import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type {
  IPublicDirectoryRepository,
  PageRequest,
  PublicDoctorFilters,
  PublicDoctorRecord,
  PublicReviewRecord,
} from '../../domain/repositories/public-directory.repository.js';

const activeSpecialty = { isActive: true, deleted: false } as const;

// `select` explícito: ningún campo personal del perfil (email, teléfono,
// documento) sale de la base para una lectura pública.
const doctorSelect = {
  id: true,
  licenseNumber: true,
  resume: true,
  ratingAvg: true,
  ratingCount: true,
  profile: { select: { name: true, lastName: true, photo: true } },
  clinic: { select: { id: true, name: true, address: true } },
  specialties: {
    where: { deleted: false, specialty: activeSpecialty },
    select: { specialty: { select: { id: true, name: true } } },
  },
} satisfies Prisma.DoctorsSelect;

type DoctorRow = Prisma.DoctorsGetPayload<{ select: typeof doctorSelect }>;

function publicDoctorWhere(
  filters: PublicDoctorFilters = {},
): Prisma.DoctorsWhereInput {
  return {
    isActive: true,
    deleted: false,
    clinic: { is: { isActive: true, deleted: false } },
    ...(filters.clinicId !== undefined && { clinicId: filters.clinicId }),
    ...(filters.specialtyId !== undefined && {
      specialties: {
        some: {
          specialtyId: filters.specialtyId,
          deleted: false,
          specialty: activeSpecialty,
        },
      },
    }),
    ...(filters.searchValue && {
      profile: {
        OR: [
          { name: { contains: filters.searchValue, mode: 'insensitive' } },
          { lastName: { contains: filters.searchValue, mode: 'insensitive' } },
        ],
      },
    }),
  };
}

function toRecord(row: DoctorRow): PublicDoctorRecord {
  return {
    id: row.id,
    name: row.profile.name,
    lastName: row.profile.lastName,
    photo: row.profile.photo,
    resume: row.resume,
    licenseNumber: row.licenseNumber,
    ratingAvg: row.ratingAvg === null ? null : Number(row.ratingAvg),
    ratingCount: row.ratingCount,
    specialties: row.specialties.map(({ specialty }) => specialty),
    // publicDoctorWhere exige sede, así que nunca es null aquí.
    clinic: row.clinic!,
  };
}

/**
 * Usa el cliente Prisma sin tenant a propósito: la lectura es anónima y
 * global, y los predicados de visibilidad van explícitos en cada consulta.
 */
@Injectable()
export class PrismaPublicDirectoryRepository implements IPublicDirectoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listDoctors(
    filters: PublicDoctorFilters,
    page: PageRequest,
  ): Promise<{ rows: PublicDoctorRecord[]; totalRows: number }> {
    const where = publicDoctorWhere(filters);
    const [rows, totalRows] = await Promise.all([
      this.prisma.doctors.findMany({
        where,
        select: doctorSelect,
        orderBy: [{ profile: { lastName: 'asc' } }, { id: 'asc' }],
        skip: page.offset,
        take: page.limit,
      }),
      this.prisma.doctors.count({ where }),
    ]);
    return { rows: rows.map(toRecord), totalRows };
  }

  async findDoctor(id: number): Promise<PublicDoctorRecord | null> {
    const row = await this.prisma.doctors.findFirst({
      where: { id, ...publicDoctorWhere() },
      select: doctorSelect,
    });
    return row ? toRecord(row) : null;
  }

  async listVisibleReviews(
    doctorId: number,
    page: PageRequest,
  ): Promise<{ rows: PublicReviewRecord[]; totalRows: number }> {
    const where: Prisma.ReviewsWhereInput = { doctorId, isVisible: true };
    const [rows, totalRows] = await Promise.all([
      this.prisma.reviews.findMany({
        where,
        select: { id: true, rating: true, comment: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: page.offset,
        take: page.limit,
      }),
      this.prisma.reviews.count({ where }),
    ]);
    return { rows, totalRows };
  }
}
