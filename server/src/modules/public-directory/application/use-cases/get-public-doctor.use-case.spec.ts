import { NotFoundException } from '@nestjs/common';
import { GetPublicDoctorUseCase } from './get-public-doctor.use-case.js';
import type {
  IPublicDirectoryRepository,
  PublicDoctorRecord,
} from '../../domain/repositories/public-directory.repository.js';

// Un registro con campos de más simula una consulta que trae datos personales:
// el contrato público no debe copiarlos.
const doctorRecord = {
  id: 3,
  name: 'Gregorio',
  lastName: 'Médico',
  photo: 'https://cdn.test/g.png',
  resume: 'Cardiólogo con 10 años de experiencia',
  licenseNumber: 'CMP-12345',
  ratingAvg: 4.5,
  ratingCount: 8,
  specialties: [{ id: 1, name: 'Cardiología' }],
  clinic: { id: 7, name: 'Sede Central', address: 'Av. Siempre Viva 742' },
  email: 'gregorio@privado.test',
  phone: '+51 999 888 777',
} as PublicDoctorRecord;

describe('GetPublicDoctorUseCase', () => {
  let repository: jest.Mocked<Pick<IPublicDirectoryRepository, 'findDoctor'>>;
  let useCase: GetPublicDoctorUseCase;

  beforeEach(() => {
    repository = {
      findDoctor: jest.fn().mockResolvedValue(doctorRecord),
    } as unknown as jest.Mocked<Pick<IPublicDirectoryRepository, 'findDoctor'>>;
    useCase = new GetPublicDoctorUseCase(
      repository as unknown as IPublicDirectoryRepository,
    );
  });

  it('expone exactamente los campos del perfil público, sin datos personales', async () => {
    const result = await useCase.execute(3);

    expect(Object.keys(result).sort()).toEqual(
      [
        'clinic',
        'id',
        'lastName',
        'licenseNumber',
        'name',
        'photo',
        'ratingAvg',
        'ratingCount',
        'resume',
        'specialties',
      ].sort(),
    );
    expect(result.clinic).toEqual({
      id: 7,
      name: 'Sede Central',
      address: 'Av. Siempre Viva 742',
    });
  });

  it('un médico que no es público (inactivo, borrado o sin sede activa) responde 404', async () => {
    repository.findDoctor.mockResolvedValue(null);

    await expect(useCase.execute(3)).rejects.toThrow(NotFoundException);
  });
});
