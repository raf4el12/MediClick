import { describe, expect, it } from 'vitest';
import rolePermissions from '../../tests/fixtures/role-permissions.json';
import { actorFor, canFrom, navigationFor, pageTitle } from './navigation';

type Role = keyof typeof rolePermissions;

const menuFor = (role: Role) =>
  navigationFor(actorFor(role), canFrom(rolePermissions[role]));
const paths = (role: Role) => menuFor(role).sections.flatMap((s) => s.items.map((i) => i.path));

describe('navigationFor', () => {
  it('el paciente ve solo su portal y su barra inferior', () => {
    expect(paths('PATIENT')).toEqual([
      '/patient',
      '/patient/appointments',
      '/patient/book',
      '/patient/waitlist',
      '/patient/expediente',
      '/patient/profile',
      '/notifications',
    ]);
    expect(menuFor('PATIENT').bottomNav?.map((l) => l.path)).toEqual([
      '/patient',
      '/patient/book',
      '/patient/appointments',
      '/patient/profile',
    ]);
  });

  it('el médico ve su inicio y sus citas de hoy, y no el dashboard de la sede', () => {
    const doctor = paths('DOCTOR');
    expect(doctor).toEqual(expect.arrayContaining(['/doctor', '/doctor/appointments']));
    expect(doctor).not.toContain('/dashboard');
    expect(doctor).not.toContain('/patient');
    expect(menuFor('DOCTOR').bottomNav).toBeUndefined();
  });

  it('recepción no ve roles ni usuarios; administración ve toda la configuración', () => {
    expect(paths('RECEPTIONIST')).not.toContain('/roles');
    expect(paths('RECEPTIONIST')).not.toContain('/users');
    expect(paths('ADMIN')).toEqual(
      expect.arrayContaining([
        '/dashboard',
        '/clinics',
        '/specialties',
        '/categories',
        '/users',
        '/roles',
        '/payments',
        '/reports',
      ]),
    );
    expect(paths('ADMIN')).not.toContain('/doctor');
  });

  it('ningún rol recibe una sección vacía', () => {
    for (const role of Object.keys(rolePermissions) as Role[]) {
      for (const section of menuFor(role).sections) {
        expect(section.items.length, `${role} / ${section.title}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('pageTitle', () => {
  it('toma el título de la navegación y de las rutas fuera del menú', () => {
    expect(pageTitle('/patient/book')).toBe('Reservar Cita');
    expect(pageTitle('/settings/account')).toBe('Configuración');
    expect(pageTitle('/ruta-desconocida')).toBe('MediClick');
  });
});
