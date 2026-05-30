import { ForgotPasswordUseCase } from './forgot-password.use-case.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.js';
import type { UserEntity } from '../../../users/domain/entities/user.entity.js';

// ─── OWASP A01 + A07: User Enumeration Prevention ────────────────────────────
// La respuesta debe ser idéntica ya sea que el email exista o no.
// Revelar diferencias permite a un atacante enumerar usuarios registrados.

describe('ForgotPasswordUseCase — OWASP A01/A07: User Enumeration Prevention', () => {
  let useCase: ForgotPasswordUseCase;
  let userRepository: jest.Mocked<Pick<IUserRepository, 'findByEmail'>>;
  let redisService: { get: jest.Mock; set: jest.Mock };
  let mailService: { send: jest.Mock };

  const mockUser: UserEntity = {
    id: 42,
    name: 'Ana',
    email: 'ana@mediclick.com',
    password: 'hashed_password',
    photo: null,
    roleId: 4,
    roleName: 'PATIENT',
    isActive: true,
    validateEmail: true,
    clinicId: null,
    clinicName: null,
    clinicTimezone: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: null,
  };

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn().mockResolvedValue(mockUser),
    };

    redisService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
    };

    mailService = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new ForgotPasswordUseCase(
      userRepository as any,
      redisService as any,
      mailService as any,
    );
  });

  // A01/A07.1 — Prevención de enumeración de usuarios ───────────────────────

  it('A01/A07.1: retorna void sin lanzar error para un email NO registrado', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'noexiste@example.com' }),
    ).resolves.toBeUndefined();
  });

  it('A01/A07.1: retorna void sin lanzar error para un usuario INACTIVO', async () => {
    userRepository.findByEmail.mockResolvedValue({ ...mockUser, isActive: false });

    await expect(
      useCase.execute({ email: 'ana@mediclick.com' }),
    ).resolves.toBeUndefined();
  });

  it('A01/A07.1: retorna void sin lanzar error para un usuario ELIMINADO', async () => {
    userRepository.findByEmail.mockResolvedValue({ ...mockUser, deleted: true });

    await expect(
      useCase.execute({ email: 'ana@mediclick.com' }),
    ).resolves.toBeUndefined();
  });

  it('A01/A07.1: no envía email cuando el usuario no existe (sin side effects observables)', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await useCase.execute({ email: 'noexiste@example.com' });

    expect(mailService.send).not.toHaveBeenCalled();
  });

  it('A01/A07.1: no guarda nada en Redis cuando el usuario no existe', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await useCase.execute({ email: 'noexiste@example.com' });

    expect(redisService.set).not.toHaveBeenCalled();
  });

  // A01/A07.2 — Flujo legítimo ───────────────────────────────────────────────

  it('A01/A07.2: para usuario válido, genera código y lo almacena en Redis', async () => {
    await useCase.execute({ email: 'ana@mediclick.com' });

    expect(redisService.set).toHaveBeenCalledWith(
      'password-reset-code:ana@mediclick.com',
      expect.stringContaining('"userId":42'),
      600,
    );
  });

  it('A01/A07.2: para usuario válido, envía el email con el código', async () => {
    await useCase.execute({ email: 'ana@mediclick.com' });

    expect(mailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@mediclick.com',
        template: 'password-reset',
        context: expect.objectContaining({ code: expect.any(String) }),
      }),
    );
  });

  it('A01/A07.2: el código generado tiene exactamente 6 dígitos', async () => {
    await useCase.execute({ email: 'ana@mediclick.com' });

    const setCall = redisService.set.mock.calls[0];
    const payload = JSON.parse(setCall[1]);
    expect(payload.code).toMatch(/^\d{6}$/);
  });

  it('A01/A07.2: el código en Redis se almacena con attempts en 0 (estado inicial)', async () => {
    await useCase.execute({ email: 'ana@mediclick.com' });

    const setCall = redisService.set.mock.calls[0];
    const payload = JSON.parse(setCall[1]);
    expect(payload.attempts).toBe(0);
  });

  it('A01/A07.2: el TTL del código en Redis es de 600 segundos (10 minutos)', async () => {
    await useCase.execute({ email: 'ana@mediclick.com' });

    expect(redisService.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      600,
    );
  });

  // A01/A07.3 — Aislamiento por email ───────────────────────────────────────

  it('A01/A07.3: la clave en Redis está aislada por email para evitar colisiones entre usuarios', async () => {
    await useCase.execute({ email: 'ana@mediclick.com' });

    expect(redisService.set).toHaveBeenCalledWith(
      'password-reset-code:ana@mediclick.com',
      expect.any(String),
      expect.any(Number),
    );
  });
});
