import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListPublicDoctorsUseCase } from './list-public-doctors.use-case.js';
import { ListPublicDoctorsQueryDto } from '../dto/list-public-doctors-query.dto.js';
import type {
  IPublicDirectoryRepository,
  PublicDoctorRecord,
} from '../../domain/repositories/public-directory.repository.js';

const doctorRecord: PublicDoctorRecord = {
  id: 3,
  name: 'Gregorio',
  lastName: 'Médico',
  photo: null,
  resume: 'Cardiólogo',
  licenseNumber: 'CMP-12345',
  ratingAvg: 4.5,
  ratingCount: 8,
  specialties: [{ id: 1, name: 'Cardiología' }],
  clinic: { id: 7, name: 'Sede Central', address: null },
};

describe('ListPublicDoctorsUseCase', () => {
  let repository: jest.Mocked<Pick<IPublicDirectoryRepository, 'listDoctors'>>;
  let useCase: ListPublicDoctorsUseCase;

  beforeEach(() => {
    repository = {
      listDoctors: jest
        .fn()
        .mockResolvedValue({ rows: [doctorRecord], totalRows: 21 }),
    } as unknown as jest.Mocked<
      Pick<IPublicDirectoryRepository, 'listDoctors'>
    >;
    useCase = new ListPublicDoctorsUseCase(
      repository as unknown as IPublicDirectoryRepository,
    );
  });

  it('lista un resumen sin matrícula ni reseña profesional, con los filtros y la página pedidos', async () => {
    const result = await useCase.execute({
      clinicId: 7,
      specialtyId: 1,
      searchValue: 'greg',
      currentPage: 3,
      pageSize: 10,
    });

    expect(repository.listDoctors).toHaveBeenCalledWith(
      { clinicId: 7, specialtyId: 1, searchValue: 'greg' },
      { offset: 20, limit: 10 },
    );
    expect(Object.keys(result.rows[0]).sort()).toEqual(
      [
        'clinic',
        'id',
        'lastName',
        'name',
        'photo',
        'ratingAvg',
        'ratingCount',
        'specialties',
      ].sort(),
    );
    expect([result.totalRows, result.currentPage, result.totalPages]).toEqual([
      21, 3, 3,
    ]);
  });

  it('sin sede lista médicos de todas las sedes (el paciente es multi-sede)', async () => {
    await useCase.execute({});

    expect(repository.listDoctors).toHaveBeenCalledWith(
      {},
      { offset: 0, limit: 10 },
    );
  });
});

describe('ListPublicDoctorsQueryDto', () => {
  it('rechaza páginas de más de 50 resultados', async () => {
    const errors = await validate(
      plainToInstance(ListPublicDoctorsQueryDto, { pageSize: '51' }),
    );

    expect(errors.map((e) => e.property)).toEqual(['pageSize']);
  });
});
