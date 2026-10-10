import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/interfaces/authenticated-user.interface.js';
import {
  resolveAgendaScope,
  type AgendaScope,
  type AgendaScopeLookups,
  type AgendaScopeQuery,
} from './agenda-scope.policy.js';

/** Sede 1: médico 10 (usuario 100). Sede 2: médico 20 (usuario 200). */
const lookups: AgendaScopeLookups = {
  findDoctor: (doctorId) =>
    Promise.resolve(
      { 10: { id: 10, clinicId: 1 }, 20: { id: 20, clinicId: 2 } }[doctorId] ??
        null,
    ),
  findDoctorByUserId: (userId) =>
    Promise.resolve(
      { 100: { id: 10, clinicId: 1 }, 200: { id: 20, clinicId: 2 } }[userId] ??
        null,
    ),
  clinicExists: (clinicId) => Promise.resolve([1, 2].includes(clinicId)),
};

const actor = (
  roleName: string,
  clinicId: number | null,
  id = 1,
): AuthenticatedUser => ({
  id,
  email: `${roleName.toLowerCase()}@test.local`,
  roleId: 1,
  roleName,
  clinicId,
});

const doctorA = actor('DOCTOR', 1, 100);
const receptionist = actor('RECEPTIONIST', 1);
const clinicAdmin = actor('ADMIN', 1);
const superAdmin = actor('SUPER_ADMIN', null);
const globalAdmin = actor('ADMIN', null);

describe('resolveAgendaScope', () => {
  const allowed: [string, AuthenticatedUser, AgendaScopeQuery, AgendaScope][] =
    [
      [
        'médico sin parámetros → su agenda',
        doctorA,
        {},
        { kind: 'doctor', doctorId: 10, clinicId: 1 },
      ],
      [
        'médico con su propio doctorId',
        doctorA,
        { doctorId: 10 },
        { kind: 'doctor', doctorId: 10, clinicId: 1 },
      ],
      [
        'recepción sin parámetros → su sede',
        receptionist,
        {},
        { kind: 'clinic', clinicId: 1 },
      ],
      [
        'recepción con su propia sede',
        receptionist,
        { clinicId: 1 },
        { kind: 'clinic', clinicId: 1 },
      ],
      [
        'recepción con un médico de su sede',
        receptionist,
        { doctorId: 10 },
        { kind: 'doctor', doctorId: 10, clinicId: 1 },
      ],
      [
        'admin de sede con un médico de su sede',
        clinicAdmin,
        { doctorId: 10 },
        { kind: 'doctor', doctorId: 10, clinicId: 1 },
      ],
      [
        'SUPER_ADMIN con un médico de la sede 2 → alcance de la sede del médico',
        superAdmin,
        { doctorId: 20 },
        { kind: 'doctor', doctorId: 20, clinicId: 2 },
      ],
      [
        'SUPER_ADMIN con cualquier sede',
        superAdmin,
        { clinicId: 2 },
        { kind: 'clinic', clinicId: 2 },
      ],
      [
        'ADMIN sin sede con cualquier médico',
        globalAdmin,
        { doctorId: 10 },
        { kind: 'doctor', doctorId: 10, clinicId: 1 },
      ],
    ];

  it.each(allowed)('permite: %s', async (_case, user, query, expected) => {
    await expect(resolveAgendaScope(user, query, lookups)).resolves.toEqual(
      expected,
    );
  });

  const rejected: [
    string,
    AuthenticatedUser,
    AgendaScopeQuery,
    new (...args: never[]) => Error,
  ][] = [
    [
      'doctorId y clinicId a la vez',
      receptionist,
      { doctorId: 10, clinicId: 1 },
      BadRequestException,
    ],
    [
      'médico pide la agenda de otro médico',
      doctorA,
      { doctorId: 20 },
      NotFoundException,
    ],
    ['médico pide una sede', doctorA, { clinicId: 1 }, ForbiddenException],
    [
      'usuario DOCTOR sin perfil de médico',
      actor('DOCTOR', 1, 999),
      {},
      ForbiddenException,
    ],
    [
      'recepción pide un médico de otra sede',
      receptionist,
      { doctorId: 20 },
      NotFoundException,
    ],
    [
      'recepción pide un médico inexistente',
      receptionist,
      { doctorId: 99 },
      NotFoundException,
    ],
    [
      'recepción pide otra sede',
      receptionist,
      { clinicId: 2 },
      NotFoundException,
    ],
    [
      'recepción sin sede asignada',
      actor('RECEPTIONIST', null),
      {},
      ForbiddenException,
    ],
    [
      'SUPER_ADMIN sin parámetro de alcance',
      superAdmin,
      {},
      BadRequestException,
    ],
    [
      'ADMIN sin sede sin parámetro de alcance',
      globalAdmin,
      {},
      BadRequestException,
    ],
    [
      'SUPER_ADMIN con un médico inexistente',
      superAdmin,
      { doctorId: 99 },
      NotFoundException,
    ],
    [
      'SUPER_ADMIN con una sede inexistente',
      superAdmin,
      { clinicId: 99 },
      NotFoundException,
    ],
    [
      'paciente, aunque pase el guard',
      actor('PATIENT', null),
      { doctorId: 10 },
      ForbiddenException,
    ],
  ];

  it.each(rejected)('rechaza: %s', async (_case, user, query, error) => {
    await expect(resolveAgendaScope(user, query, lookups)).rejects.toThrow(
      error,
    );
  });

  it('un médico ajeno responde "Médico no encontrado", sin revelar que existe', async () => {
    await expect(
      resolveAgendaScope(receptionist, { doctorId: 20 }, lookups),
    ).rejects.toThrow('Médico no encontrado');
  });
});
