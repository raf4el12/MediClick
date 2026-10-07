import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { PublicDoctorsController } from './public-doctors.controller.js';
import { ListPublicDoctorsUseCase } from '../../application/use-cases/list-public-doctors.use-case.js';
import { GetPublicDoctorUseCase } from '../../application/use-cases/get-public-doctor.use-case.js';
import { ListPublicDoctorReviewsUseCase } from '../../application/use-cases/list-public-doctor-reviews.use-case.js';
import { SECURITY_VALIDATION_PIPE_OPTIONS } from '../../../../shared/config/security-validation-pipe.config.js';
import type { IPublicDirectoryRepository } from '../../domain/repositories/public-directory.repository.js';

const repository: IPublicDirectoryRepository = {
  listDoctors: () => Promise.resolve({ rows: [], totalRows: 0 }),
  findDoctor: () =>
    Promise.resolve({
      id: 3,
      name: 'Gregorio',
      lastName: 'Médico',
      photo: null,
      resume: null,
      licenseNumber: 'CMP-12345',
      ratingAvg: null,
      ratingCount: 0,
      specialties: [],
      clinic: { id: 7, name: 'Sede Central', address: null },
    }),
  listVisibleReviews: () => Promise.resolve({ rows: [], totalRows: 0 }),
};

describe('PublicDoctorsController (HTTP)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ name: 'long', ttl: 60000, limit: 300 }]),
      ],
      controllers: [PublicDoctorsController],
      providers: [
        { provide: 'IPublicDirectoryRepository', useValue: repository },
        ListPublicDoctorsUseCase,
        GetPublicDoctorUseCase,
        ListPublicDoctorReviewsUseCase,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(SECURITY_VALIDATION_PIPE_OPTIONS));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde sin sesión y permite cachear la respuesta', async () => {
    const res = await request(app.getHttpServer()).get('/public/doctors/3');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=300');
    expect(res.body).toMatchObject({ id: 3, name: 'Gregorio' });
  });

  it('rechaza páginas de más de 50 resultados', async () => {
    const res = await request(app.getHttpServer()).get(
      '/public/doctors?pageSize=51',
    );

    expect(res.status).toBe(400);
  });
});
