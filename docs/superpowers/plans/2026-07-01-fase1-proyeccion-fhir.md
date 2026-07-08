# Fase 1 — Proyección por eventos al FHIR Store: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proyectar `Patient` y `Encounter` (+ `Provenance`) al FHIR Resource Store cuando ocurren eventos de dominio, con ids FHIR determinísticos e idempotentes.

**Architecture:** Listeners `@OnEvent` en el módulo `interoperability` reciben eventos delgados (`{ patientId }` / `{ appointmentId }`), re-leen la entidad vía Prisma, la mapean a FHIR con funciones puras y la guardan vía `FhirResourceService.save()` (que ya versiona). Identidad estable por UUID v5 determinístico. Spec: `docs/superpowers/specs/2026-07-01-fase1-proyeccion-fhir-design.md`.

**Tech Stack:** NestJS 11 + `@nestjs/event-emitter` + Prisma 7 + `@medplum/fhirtypes` + Jest 30/ts-jest.

## Global Constraints

- ESM NodeNext: **todo import relativo termina en `.js`** (aunque el archivo sea `.ts`).
- Specs colocados junto al código (`*.spec.ts`), rootDir `src`, mocks = objetos planos pasados con `as any` (no `jest.Mocked` de clases).
- DI por tokens string (`@Inject('IFhirResourceRepository')`) para repos; servicios concretos por clase.
- Sin comentarios salvo WHY no obvio. Mensajes de log/errores en español.
- Commits: conventional commits en español + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Comandos se corren desde `server/`.
- No tocar el comportamiento observable de los flujos emisores existentes (solo agregar `emit`).

---

### Task 1: Migración — `FhirResource.clinicId` nullable

**Files:**
- Modify: `server/prisma/schema.prisma` (model `FhirResource`)
- Create: `server/prisma/migrations/<timestamp>_fhir_clinic_id_nullable/migration.sql` (la genera prisma)
- Modify: `server/src/modules/interoperability/domain/entities/fhir-resource.entity.ts`
- Modify: `server/src/modules/interoperability/domain/repositories/fhir-resource.repository.ts`

**Interfaces:**
- Produces: `SaveFhirResourceInput.clinicId: number | null`, `PersistFhirResourceInput.clinicId: number | null`, `FhirResourceEntity.clinicId: number | null`. Tasks 7–8 pasan `clinicId: null` para `Patient`/`Provenance`.

- [ ] **Step 1: Cambiar el schema**

En `server/prisma/schema.prisma`, model `FhirResource`, cambiar:

```prisma
  clinicId     Int
```

por:

```prisma
  clinicId     Int?
```

(Solo esa línea. El `@@index([resourceType, clinicId])` queda igual.)

- [ ] **Step 2: Generar y aplicar la migración**

Run: `npx prisma migrate dev --name fhir_clinic_id_nullable`
Expected: migración creada y aplicada; el SQL contiene `ALTER TABLE "FhirResource" ALTER COLUMN "clinicId" DROP NOT NULL;`. Si aparece timeout de advisory lock, reintentar una vez (gotcha conocido del entorno).

- [ ] **Step 3: Propagar el tipo a entidad e interfaces**

En `fhir-resource.entity.ts`: `clinicId: number;` → `clinicId: number | null;` (solo en `FhirResourceEntity`).

En `fhir-resource.repository.ts`: en `SaveFhirResourceInput` y `PersistFhirResourceInput`, `clinicId: number;` → `clinicId: number | null;`.

- [ ] **Step 4: Verificar que nada se rompe**

Run: `npx tsc --noEmit -p tsconfig.json && npx jest src/modules/interoperability --silent`
Expected: 0 errores de tipos; tests de interop en verde (los existentes pasan `clinicId` numérico, que sigue siendo asignable).

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/modules/interoperability
git commit -m "feat(interop): clinicId nullable en FhirResource (Patient es global, Encounter por clínica)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Identidad FHIR determinística (`fhir-id.logic.ts`) + systems

**Files:**
- Create: `server/src/modules/interoperability/domain/fhir-id.logic.ts`
- Create: `server/src/modules/interoperability/domain/fhir-id.logic.spec.ts`
- Create: `server/src/modules/interoperability/domain/fhir-systems.ts`

**Interfaces:**
- Produces:
  - `uuidV5(name: string, namespace: string): string`
  - `fhirIdFor(resourceType: string, internalId: number): string`
  - `provenanceIdFor(targetType: string, internalId: number): string`
  - `NAMESPACE_MEDICLICK: string`
  - Constantes: `IDENTIFIER_SYSTEM_DNI`, `IDENTIFIER_SYSTEM_PATIENT_ID`, `IDENTIFIER_SYSTEM_APPOINTMENT_ID` (en `fhir-systems.ts`)

- [ ] **Step 1: Escribir los tests que fallan**

`server/src/modules/interoperability/domain/fhir-id.logic.spec.ts`:

```ts
import {
  uuidV5,
  fhirIdFor,
  provenanceIdFor,
} from './fhir-id.logic.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidV5', () => {
  it('reproduce el vector conocido de RFC 4122 (namespace DNS, python.org)', () => {
    expect(uuidV5('python.org', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(
      '886313e1-3b8a-5372-9b90-0c9aee199e5d',
    );
  });
});

describe('fhirIdFor', () => {
  it('es determinístico: misma entidad, mismo id', () => {
    expect(fhirIdFor('Patient', 123)).toBe(fhirIdFor('Patient', 123));
  });

  it('distingue entidades y tipos', () => {
    expect(fhirIdFor('Patient', 1)).not.toBe(fhirIdFor('Patient', 2));
    expect(fhirIdFor('Patient', 1)).not.toBe(fhirIdFor('Encounter', 1));
  });

  it('produce UUID v5 con variante RFC válida', () => {
    expect(fhirIdFor('Patient', 123)).toMatch(UUID_RE);
  });
});

describe('provenanceIdFor', () => {
  it('difiere del id del recurso target', () => {
    expect(provenanceIdFor('Patient', 123)).not.toBe(fhirIdFor('Patient', 123));
  });

  it('es determinístico', () => {
    expect(provenanceIdFor('Encounter', 5)).toBe(provenanceIdFor('Encounter', 5));
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx jest src/modules/interoperability/domain/fhir-id.logic.spec.ts --silent`
Expected: FAIL — `Cannot find module './fhir-id.logic.js'`.

- [ ] **Step 3: Implementar**

`server/src/modules/interoperability/domain/fhir-id.logic.ts`:

```ts
import { createHash } from 'node:crypto';

/** Namespace UUID propio de MediClick para ids FHIR (fijo, no cambiar: cambiaría todos los ids). */
export const NAMESPACE_MEDICLICK = '7a5b6d3e-1c2f-4a8b-9d4e-0f1a2b3c4d5e';

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex');
}

/** UUID v5 (RFC 4122, SHA-1) sin dependencias externas. */
export function uuidV5(name: string, namespace: string): string {
  const hash = createHash('sha1')
    .update(uuidToBytes(namespace))
    .update(name, 'utf8')
    .digest();

  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Id FHIR estable para una entidad interna: proyectarla N veces versiona el mismo recurso. */
export function fhirIdFor(resourceType: string, internalId: number): string {
  return uuidV5(`${resourceType}:${internalId}`, NAMESPACE_MEDICLICK);
}

/** Id estable del Provenance asociado a la proyección de una entidad. */
export function provenanceIdFor(
  targetType: string,
  internalId: number,
): string {
  return uuidV5(`Provenance:${targetType}:${internalId}`, NAMESPACE_MEDICLICK);
}
```

`server/src/modules/interoperability/domain/fhir-systems.ts`:

```ts
/**
 * Systems de identifiers: URIs propias hasta validar los OIDs oficiales
 * (Fase 4/6). Cambiarlas después es una re-proyección, no una migración.
 */
export const IDENTIFIER_SYSTEM_DNI =
  'https://mediclick.app/fhir/identifiers/dni';
export const IDENTIFIER_SYSTEM_PATIENT_ID =
  'https://mediclick.app/fhir/identifiers/patient-id';
export const IDENTIFIER_SYSTEM_APPOINTMENT_ID =
  'https://mediclick.app/fhir/identifiers/appointment-id';
```

- [ ] **Step 4: Verificar que pasan**

Run: `npx jest src/modules/interoperability/domain/fhir-id.logic.spec.ts --silent`
Expected: PASS (6 tests). Si el vector RFC falla, el bug está en `uuidV5` (orden namespace→name, o bits de versión/variante) — NO cambiar el valor esperado del test.

- [ ] **Step 5: Commit**

```bash
git add src/modules/interoperability/domain
git commit -m "feat(interop): UUID v5 determinístico para ids FHIR + systems de identifiers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Mapper `Patient` (dominio → FHIR)

**Files:**
- Create: `server/src/modules/interoperability/domain/mappers/patient-fhir.mapper.ts`
- Create: `server/src/modules/interoperability/domain/mappers/patient-fhir.mapper.spec.ts`

**Interfaces:**
- Consumes: `IDENTIFIER_SYSTEM_DNI`, `IDENTIFIER_SYSTEM_PATIENT_ID` de `../fhir-systems.js` (Task 2).
- Produces:
  ```ts
  export interface PatientProjectionSource {
    id: number;
    isActive: boolean;
    deleted: boolean;
    profile: {
      name: string;
      lastName: string;
      birthday: Date | null;
      gender: string | null;
      phone: string | null;
      address: string | null;
      typeDocument: string | null;
      numberDocument: string | null;
    };
  }
  export function toFhirPatient(source: PatientProjectionSource): Patient;
  ```
  (El mapper NO setea `id` ni `meta`: los estampa `FhirResourceService.save()`.)

- [ ] **Step 1: Escribir los tests que fallan**

`patient-fhir.mapper.spec.ts`:

```ts
import { toFhirPatient } from './patient-fhir.mapper.js';
import type { PatientProjectionSource } from './patient-fhir.mapper.js';
import {
  IDENTIFIER_SYSTEM_DNI,
  IDENTIFIER_SYSTEM_PATIENT_ID,
} from '../fhir-systems.js';

const fullSource: PatientProjectionSource = {
  id: 42,
  isActive: true,
  deleted: false,
  profile: {
    name: 'Ana',
    lastName: 'Díaz',
    birthday: new Date('1990-05-15T00:00:00Z'),
    gender: 'F',
    phone: '+51999888777',
    address: 'Av. Lima 123',
    typeDocument: 'DNI',
    numberDocument: '46871234',
  },
};

describe('toFhirPatient', () => {
  it('mapea el paciente completo', () => {
    const fhir = toFhirPatient(fullSource);

    expect(fhir.resourceType).toBe('Patient');
    expect(fhir.identifier).toEqual([
      { system: IDENTIFIER_SYSTEM_DNI, value: '46871234' },
      { system: IDENTIFIER_SYSTEM_PATIENT_ID, value: '42' },
    ]);
    expect(fhir.name).toEqual([{ family: 'Díaz', given: ['Ana'] }]);
    expect(fhir.gender).toBe('female');
    expect(fhir.birthDate).toBe('1990-05-15');
    expect(fhir.telecom).toEqual([{ system: 'phone', value: '+51999888777' }]);
    expect(fhir.address).toEqual([{ text: 'Av. Lima 123' }]);
    expect(fhir.active).toBe(true);
  });

  it('omite campos opcionales nulos sin inventar defaults', () => {
    const fhir = toFhirPatient({
      id: 7,
      isActive: true,
      deleted: false,
      profile: {
        name: 'Luis',
        lastName: 'Paz',
        birthday: null,
        gender: null,
        phone: null,
        address: null,
        typeDocument: null,
        numberDocument: null,
      },
    });

    expect(fhir.identifier).toEqual([
      { system: IDENTIFIER_SYSTEM_PATIENT_ID, value: '7' },
    ]);
    expect(fhir.gender).toBeUndefined();
    expect(fhir.birthDate).toBeUndefined();
    expect(fhir.telecom).toBeUndefined();
    expect(fhir.address).toBeUndefined();
  });

  it.each([
    ['M', 'male'],
    ['MALE', 'male'],
    ['masculino', 'male'],
    ['F', 'female'],
    ['femenino', 'female'],
    ['no binario', undefined],
  ])('normaliza gender %s → %s', (raw, expected) => {
    const fhir = toFhirPatient({
      ...fullSource,
      profile: { ...fullSource.profile, gender: raw },
    });
    expect(fhir.gender).toBe(expected);
  });

  it('active=false si el paciente está borrado o inactivo', () => {
    expect(toFhirPatient({ ...fullSource, deleted: true }).active).toBe(false);
    expect(toFhirPatient({ ...fullSource, isActive: false }).active).toBe(false);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx jest src/modules/interoperability/domain/mappers/patient-fhir.mapper.spec.ts --silent`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar**

`patient-fhir.mapper.ts`:

```ts
import type { Patient } from '@medplum/fhirtypes';
import {
  IDENTIFIER_SYSTEM_DNI,
  IDENTIFIER_SYSTEM_PATIENT_ID,
} from '../fhir-systems.js';

export interface PatientProjectionSource {
  id: number;
  isActive: boolean;
  deleted: boolean;
  profile: {
    name: string;
    lastName: string;
    birthday: Date | null;
    gender: string | null;
    phone: string | null;
    address: string | null;
    typeDocument: string | null;
    numberDocument: string | null;
  };
}

const MALE_VALUES = new Set(['m', 'male', 'masculino']);
const FEMALE_VALUES = new Set(['f', 'female', 'femenino']);

function toFhirGender(raw: string | null): Patient['gender'] {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (MALE_VALUES.has(normalized)) return 'male';
  if (FEMALE_VALUES.has(normalized)) return 'female';
  return undefined;
}

export function toFhirPatient(source: PatientProjectionSource): Patient {
  const { profile } = source;

  const identifier: Patient['identifier'] = [];
  if (profile.numberDocument) {
    identifier.push({
      system: IDENTIFIER_SYSTEM_DNI,
      value: profile.numberDocument,
    });
  }
  identifier.push({
    system: IDENTIFIER_SYSTEM_PATIENT_ID,
    value: String(source.id),
  });

  return {
    resourceType: 'Patient',
    identifier,
    name: [{ family: profile.lastName, given: [profile.name] }],
    active: source.isActive && !source.deleted,
    ...(toFhirGender(profile.gender) && { gender: toFhirGender(profile.gender) }),
    ...(profile.birthday && {
      birthDate: profile.birthday.toISOString().slice(0, 10),
    }),
    ...(profile.phone && {
      telecom: [{ system: 'phone' as const, value: profile.phone }],
    }),
    ...(profile.address && { address: [{ text: profile.address }] }),
  };
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `npx jest src/modules/interoperability/domain/mappers/patient-fhir.mapper.spec.ts --silent`
Expected: PASS (9 tests con el `it.each` expandido).

- [ ] **Step 5: Commit**

```bash
git add src/modules/interoperability/domain/mappers
git commit -m "feat(interop): mapper dominio→FHIR Patient (DNI + id interno como identifiers)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Mapper `Encounter` (cita → FHIR)

**Files:**
- Create: `server/src/modules/interoperability/domain/mappers/encounter-fhir.mapper.ts`
- Create: `server/src/modules/interoperability/domain/mappers/encounter-fhir.mapper.spec.ts`

**Interfaces:**
- Consumes: `fhirIdFor` de `../fhir-id.logic.js`, `IDENTIFIER_SYSTEM_APPOINTMENT_ID` de `../fhir-systems.js`.
- Produces:
  ```ts
  export interface EncounterProjectionSource {
    id: number;
    status: string; // AppointmentStatus como string
    startTime: Date;
    endTime: Date;
    patientId: number;
  }
  export function toFhirEncounter(source: EncounterProjectionSource): Encounter;
  ```

- [ ] **Step 1: Escribir los tests que fallan**

`encounter-fhir.mapper.spec.ts`:

```ts
import { toFhirEncounter } from './encounter-fhir.mapper.js';
import { fhirIdFor } from '../fhir-id.logic.js';
import { IDENTIFIER_SYSTEM_APPOINTMENT_ID } from '../fhir-systems.js';

const source = {
  id: 55,
  status: 'CONFIRMED',
  startTime: new Date('2026-07-10T14:00:00Z'),
  endTime: new Date('2026-07-10T14:30:00Z'),
  patientId: 42,
};

describe('toFhirEncounter', () => {
  it('mapea la cita confirmada', () => {
    const fhir = toFhirEncounter(source);

    expect(fhir.resourceType).toBe('Encounter');
    expect(fhir.status).toBe('planned');
    expect(fhir.class).toEqual({
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
    });
    expect(fhir.identifier).toEqual([
      { system: IDENTIFIER_SYSTEM_APPOINTMENT_ID, value: '55' },
    ]);
    expect(fhir.subject).toEqual({
      reference: `Patient/${fhirIdFor('Patient', 42)}`,
    });
    expect(fhir.period).toEqual({
      start: '2026-07-10T14:00:00.000Z',
      end: '2026-07-10T14:30:00.000Z',
    });
  });

  it.each([
    ['PENDING', 'planned'],
    ['CONFIRMED', 'planned'],
    ['IN_PROGRESS', 'in-progress'],
    ['COMPLETED', 'finished'],
    ['CANCELLED', 'cancelled'],
    ['NO_SHOW', 'cancelled'],
    ['ALGO_NUEVO', 'unknown'],
  ])('mapea status %s → %s', (domain, fhir) => {
    expect(toFhirEncounter({ ...source, status: domain }).status).toBe(fhir);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx jest src/modules/interoperability/domain/mappers/encounter-fhir.mapper.spec.ts --silent`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar**

`encounter-fhir.mapper.ts`:

```ts
import type { Encounter } from '@medplum/fhirtypes';
import { fhirIdFor } from '../fhir-id.logic.js';
import { IDENTIFIER_SYSTEM_APPOINTMENT_ID } from '../fhir-systems.js';

export interface EncounterProjectionSource {
  id: number;
  status: string;
  startTime: Date;
  endTime: Date;
  patientId: number;
}

const STATUS_MAP: Record<string, Encounter['status']> = {
  PENDING: 'planned',
  CONFIRMED: 'planned',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'finished',
  CANCELLED: 'cancelled',
  NO_SHOW: 'cancelled',
};

export function toFhirEncounter(source: EncounterProjectionSource): Encounter {
  return {
    resourceType: 'Encounter',
    status: STATUS_MAP[source.status] ?? 'unknown',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
    },
    identifier: [
      { system: IDENTIFIER_SYSTEM_APPOINTMENT_ID, value: String(source.id) },
    ],
    subject: { reference: `Patient/${fhirIdFor('Patient', source.patientId)}` },
    period: {
      start: source.startTime.toISOString(),
      end: source.endTime.toISOString(),
    },
  };
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `npx jest src/modules/interoperability/domain/mappers/encounter-fhir.mapper.spec.ts --silent`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/interoperability/domain/mappers
git commit -m "feat(interop): mapper cita→FHIR Encounter con referencia estable al Patient

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Builder `Provenance`

**Files:**
- Create: `server/src/modules/interoperability/domain/mappers/provenance-fhir.mapper.ts`
- Create: `server/src/modules/interoperability/domain/mappers/provenance-fhir.mapper.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ProvenanceInput {
    targetType: string;   // 'Patient' | 'Encounter'
    targetFhirId: string; // UUID v5 del recurso proyectado
    eventName: string;    // evento de dominio que disparó la proyección
    internalId: number;   // id interno de la entidad origen
    recordedAt: Date;
  }
  export function buildProvenance(input: ProvenanceInput): Provenance;
  ```

- [ ] **Step 1: Escribir los tests que fallan**

`provenance-fhir.mapper.spec.ts`:

```ts
import { buildProvenance } from './provenance-fhir.mapper.js';

describe('buildProvenance', () => {
  it('referencia al recurso proyectado y registra el evento de origen', () => {
    const fhir = buildProvenance({
      targetType: 'Patient',
      targetFhirId: 'abc-123',
      eventName: 'patient.created',
      internalId: 42,
      recordedAt: new Date('2026-07-01T10:00:00Z'),
    });

    expect(fhir.resourceType).toBe('Provenance');
    expect(fhir.target).toEqual([{ reference: 'Patient/abc-123' }]);
    expect(fhir.recorded).toBe('2026-07-01T10:00:00.000Z');
    expect(fhir.activity).toEqual({ text: 'patient.created' });
    expect(fhir.agent).toEqual([
      { who: { display: 'MediClick' } },
    ]);
    expect(fhir.entity).toEqual([
      {
        role: 'source',
        what: { display: 'Patient interno id=42' },
      },
    ]);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx jest src/modules/interoperability/domain/mappers/provenance-fhir.mapper.spec.ts --silent`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar**

`provenance-fhir.mapper.ts`:

```ts
import type { Provenance } from '@medplum/fhirtypes';

export interface ProvenanceInput {
  targetType: string;
  targetFhirId: string;
  eventName: string;
  internalId: number;
  recordedAt: Date;
}

export function buildProvenance(input: ProvenanceInput): Provenance {
  return {
    resourceType: 'Provenance',
    target: [{ reference: `${input.targetType}/${input.targetFhirId}` }],
    recorded: input.recordedAt.toISOString(),
    activity: { text: input.eventName },
    agent: [{ who: { display: 'MediClick' } }],
    entity: [
      {
        role: 'source',
        what: { display: `${input.targetType} interno id=${input.internalId}` },
      },
    ],
  };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx jest src/modules/interoperability/domain/mappers/provenance-fhir.mapper.spec.ts --silent`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/modules/interoperability/domain/mappers
git commit -m "feat(interop): builder de Provenance para trazabilidad de proyecciones

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Eventos `patient.*` en los emisores

**Files:**
- Create: `server/src/shared/events/patient-events.interface.ts`
- Modify: `server/src/modules/patients/application/use-cases/create-patient.use-case.ts`
- Modify: `server/src/modules/patients/application/use-cases/update-patient.use-case.ts`
- Modify: `server/src/modules/patients/application/use-cases/delete-patient.use-case.ts`
- Modify: `server/src/modules/auth/application/use-cases/register-patient.use-case.ts`
- Modify: `server/src/modules/auth/application/use-cases/register-patient.use-case.spec.ts`
- Create: `server/src/modules/patients/application/use-cases/create-patient.use-case.spec.ts`
- Create: `server/src/modules/patients/application/use-cases/update-patient.use-case.spec.ts`
- Create: `server/src/modules/patients/application/use-cases/delete-patient.use-case.spec.ts`

**Interfaces:**
- Produces (consumido por Task 7):
  ```ts
  export const PATIENT_CREATED_EVENT = 'patient.created';
  export const PATIENT_UPDATED_EVENT = 'patient.updated';
  export const PATIENT_DELETED_EVENT = 'patient.deleted';
  export interface PatientChangedEvent { patientId: number; }
  ```
- `EventEmitter2` es inyectable en cualquier módulo (`EventEmitterModule.forRoot()` ya está en `app.module.ts`); se agrega como **último** parámetro del constructor en los 4 use-cases.

- [ ] **Step 1: Crear la interface de eventos**

`server/src/shared/events/patient-events.interface.ts`:

```ts
export const PATIENT_CREATED_EVENT = 'patient.created';
export const PATIENT_UPDATED_EVENT = 'patient.updated';
export const PATIENT_DELETED_EVENT = 'patient.deleted';

/** Evento delgado: los listeners de proyección re-leen la entidad por id. */
export interface PatientChangedEvent {
  patientId: number;
}
```

- [ ] **Step 2: Escribir los specs que fallan (emisión en patients)**

`create-patient.use-case.spec.ts`:

```ts
import { ConflictException } from '@nestjs/common';
import { CreatePatientUseCase } from './create-patient.use-case.js';
import { PATIENT_CREATED_EVENT } from '../../../../shared/events/patient-events.interface.js';

const createdPatient = {
  id: 7,
  emergencyContact: '+51988877766',
  bloodType: 'O+',
  allergies: null,
  chronicConditions: null,
  isActive: true,
  createdAt: new Date(),
  profile: {
    id: 1,
    name: 'Ana',
    lastName: 'Díaz',
    email: 'ana@x.com',
    phone: null,
    birthday: null,
    gender: null,
    typeDocument: null,
    numberDocument: null,
  },
};

describe('CreatePatientUseCase', () => {
  const repo = {
    existsByEmail: jest.fn(),
    existsByDni: jest.fn(),
    create: jest.fn(),
  };
  const passwordService = { hash: jest.fn() };
  const eventEmitter = { emit: jest.fn() };
  let useCase: CreatePatientUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreatePatientUseCase(
      repo as any,
      passwordService as any,
      eventEmitter as any,
    );
  });

  it('emite patient.created con el id del paciente', async () => {
    repo.existsByEmail.mockResolvedValue(false);
    passwordService.hash.mockResolvedValue('hashed');
    repo.create.mockResolvedValue(createdPatient);

    await useCase.execute({
      name: 'Ana',
      lastName: 'Díaz',
      email: 'ana@x.com',
      emergencyContact: '+51988877766',
      bloodType: 'O+',
    } as any);

    expect(eventEmitter.emit).toHaveBeenCalledWith(PATIENT_CREATED_EVENT, {
      patientId: 7,
    });
  });

  it('no emite si el email ya existe', async () => {
    repo.existsByEmail.mockResolvedValue(true);

    await expect(
      useCase.execute({ email: 'ana@x.com' } as any),
    ).rejects.toThrow(ConflictException);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
```

`update-patient.use-case.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { UpdatePatientUseCase } from './update-patient.use-case.js';
import { PATIENT_UPDATED_EVENT } from '../../../../shared/events/patient-events.interface.js';

const patient = {
  id: 7,
  emergencyContact: '+51988877766',
  bloodType: 'O+',
  allergies: null,
  chronicConditions: null,
  isActive: true,
  createdAt: new Date(),
  profile: {
    id: 1,
    name: 'Ana',
    lastName: 'Díaz',
    email: 'ana@x.com',
    phone: null,
    birthday: null,
    gender: null,
    typeDocument: null,
    numberDocument: null,
  },
};

describe('UpdatePatientUseCase', () => {
  const repo = { findById: jest.fn(), update: jest.fn() };
  const eventEmitter = { emit: jest.fn() };
  let useCase: UpdatePatientUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdatePatientUseCase(repo as any, eventEmitter as any);
  });

  it('emite patient.updated tras actualizar', async () => {
    repo.findById.mockResolvedValue(patient);
    repo.update.mockResolvedValue(patient);

    await useCase.execute(7, { name: 'Ana María' } as any);

    expect(eventEmitter.emit).toHaveBeenCalledWith(PATIENT_UPDATED_EVENT, {
      patientId: 7,
    });
  });

  it('no emite si el paciente no existe', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(useCase.execute(99, {} as any)).rejects.toThrow(
      NotFoundException,
    );
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
```

`delete-patient.use-case.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { DeletePatientUseCase } from './delete-patient.use-case.js';
import { PATIENT_DELETED_EVENT } from '../../../../shared/events/patient-events.interface.js';

describe('DeletePatientUseCase', () => {
  const repo = { findById: jest.fn(), softDelete: jest.fn() };
  const eventEmitter = { emit: jest.fn() };
  let useCase: DeletePatientUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeletePatientUseCase(repo as any, eventEmitter as any);
  });

  it('emite patient.deleted tras el soft delete', async () => {
    repo.findById.mockResolvedValue({ id: 7 });
    repo.softDelete.mockResolvedValue(undefined);

    await useCase.execute(7);

    expect(repo.softDelete).toHaveBeenCalledWith(7);
    expect(eventEmitter.emit).toHaveBeenCalledWith(PATIENT_DELETED_EVENT, {
      patientId: 7,
    });
  });

  it('no emite si el paciente no existe', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(useCase.execute(99)).rejects.toThrow(NotFoundException);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `npx jest src/modules/patients --silent`
Expected: FAIL — los constructores actuales no aceptan el emitter (TS) o `emit` nunca llamado.

- [ ] **Step 4: Agregar la emisión a los 4 use-cases**

En `create-patient.use-case.ts`:
- Agregar imports:
  ```ts
  import { EventEmitter2 } from '@nestjs/event-emitter';
  import {
    PATIENT_CREATED_EVENT,
    type PatientChangedEvent,
  } from '../../../../shared/events/patient-events.interface.js';
  ```
- Agregar al final del constructor: `private readonly eventEmitter: EventEmitter2,`
- Tras `const patient = await this.patientRepository.create({...});` agregar:
  ```ts
  const event: PatientChangedEvent = { patientId: patient.id };
  this.eventEmitter.emit(PATIENT_CREATED_EVENT, event);
  ```

En `update-patient.use-case.ts`: mismos imports (con `PATIENT_UPDATED_EVENT`), mismo parámetro de constructor, y tras `const updated = await this.patientRepository.update(id, updateData);`:
```ts
const event: PatientChangedEvent = { patientId: updated.id };
this.eventEmitter.emit(PATIENT_UPDATED_EVENT, event);
```

En `delete-patient.use-case.ts`: mismos imports (con `PATIENT_DELETED_EVENT`), mismo parámetro, y tras `await this.patientRepository.softDelete(id);`:
```ts
const event: PatientChangedEvent = { patientId: id };
this.eventEmitter.emit(PATIENT_DELETED_EVENT, event);
```

En `register-patient.use-case.ts` (auth): mismos imports (con `PATIENT_CREATED_EVENT`; ojo, la ruta relativa desde auth es la misma profundidad: `../../../../shared/events/patient-events.interface.js`), agregar `private readonly eventEmitter: EventEmitter2,` al final del constructor, y justo después de `const patient = await this.patientRepository.create({...});`:
```ts
const patientEvent: PatientChangedEvent = { patientId: patient.id };
this.eventEmitter.emit(PATIENT_CREATED_EVENT, patientEvent);
```

- [ ] **Step 5: Actualizar el spec de register-patient**

En `register-patient.use-case.spec.ts`: agregar `const eventEmitter = { emit: jest.fn() };` junto a los otros mocks, pasarlo como **último** argumento del `new RegisterPatientUseCase(...)` existente (con `as any`), y agregar al describe:

```ts
it('emite patient.created con el id del paciente registrado', async () => {
  // reusar el arrange del caso feliz existente
  await useCase.execute(validDto);

  expect(eventEmitter.emit).toHaveBeenCalledWith('patient.created', {
    patientId: expect.any(Number),
  });
});
```

(Adaptar `validDto` y el arrange al helper que el spec ya tenga para el caso feliz; si el mock de `create` devuelve `id` fijo, assert con ese valor exacto en vez de `expect.any(Number)`.)

- [ ] **Step 6: Auditar que no queden otros puntos de alta de pacientes sin evento**

Run: `grep -rn "patientRepository.create\|patients.create(" src --include="*.ts" | grep -v ".spec."`
Expected: solo los dos sitios ya modificados (`create-patient.use-case.ts` y `register-patient.use-case.ts`, más el repositorio que implementa `create`). Si aparece otro use-case que cree filas en `Patients`, agregarle el mismo emit + test siguiendo el patrón de este task y reportarlo en el summary.

- [ ] **Step 7: Verificar que todo pasa**

Run: `npx jest src/modules/patients src/modules/auth --silent && npx tsc --noEmit -p tsconfig.json`
Expected: PASS todo, 0 errores de tipos.

- [ ] **Step 8: Commit**

```bash
git add src/shared/events src/modules/patients src/modules/auth
git commit -m "feat(patients): emitir patient.created/updated/deleted para proyección FHIR

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: `softDelete` en el service + listener de proyección de `Patient`

**Files:**
- Modify: `server/src/modules/interoperability/application/services/fhir-resource.service.ts`
- Modify: `server/src/modules/interoperability/application/services/fhir-resource.service.spec.ts`
- Create: `server/src/modules/interoperability/application/listeners/patient-projection.listener.ts`
- Create: `server/src/modules/interoperability/application/listeners/patient-projection.listener.spec.ts`
- Modify: `server/src/modules/interoperability/application/interoperability.module.ts`

**Interfaces:**
- Consumes: `toFhirPatient`/`PatientProjectionSource` (Task 3), `buildProvenance` (Task 5), `fhirIdFor`/`provenanceIdFor` (Task 2), eventos `PATIENT_*` (Task 6), `PrismaService` (global), `FhirResourceService.save`.
- Produces: `FhirResourceService.softDelete(resourceType: string, id: string): Promise<void>` (delegación al repo; la usa este listener).

- [ ] **Step 1: Test del service.softDelete (falla)**

Agregar al `describe` existente en `fhir-resource.service.spec.ts` (usar el mock de repo que el spec ya define; si su objeto mock no incluye `softDelete`, agregarle `softDelete: jest.fn()`):

```ts
it('softDelete delega en el repositorio', async () => {
  await service.softDelete('Patient', 'abc-123');
  expect(repo.softDelete).toHaveBeenCalledWith('Patient', 'abc-123');
});
```

Run: `npx jest src/modules/interoperability/application --silent`
Expected: FAIL — `service.softDelete is not a function`.

- [ ] **Step 2: Implementar softDelete en el service**

Agregar al final de la clase `FhirResourceService`:

```ts
  softDelete(resourceType: string, id: string): Promise<void> {
    return this.repo.softDelete(resourceType, id);
  }
```

Run: `npx jest src/modules/interoperability/application --silent`
Expected: PASS.

- [ ] **Step 3: Spec del listener (falla)**

`patient-projection.listener.spec.ts`:

```ts
import { PatientProjectionListener } from './patient-projection.listener.js';
import {
  fhirIdFor,
  provenanceIdFor,
} from '../../domain/fhir-id.logic.js';

const dbPatient = {
  id: 42,
  isActive: true,
  deleted: false,
  profile: {
    name: 'Ana',
    lastName: 'Díaz',
    birthday: null,
    gender: null,
    phone: null,
    address: null,
    typeDocument: 'DNI',
    numberDocument: '46871234',
  },
};

describe('PatientProjectionListener', () => {
  const prisma = { patients: { findUnique: jest.fn() } };
  const fhirResourceService = { save: jest.fn(), softDelete: jest.fn() };
  let listener: PatientProjectionListener;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = new PatientProjectionListener(
      prisma as any,
      fhirResourceService as any,
    );
  });

  it('proyecta Patient + Provenance con clinicId null e id determinístico', async () => {
    prisma.patients.findUnique.mockResolvedValue(dbPatient);
    fhirResourceService.save.mockResolvedValue({});

    await listener.handleCreated({ patientId: 42 });

    expect(fhirResourceService.save).toHaveBeenCalledTimes(2);
    expect(fhirResourceService.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: fhirIdFor('Patient', 42),
        resourceType: 'Patient',
        clinicId: null,
      }),
    );
    expect(fhirResourceService.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: provenanceIdFor('Patient', 42),
        resourceType: 'Provenance',
        clinicId: null,
      }),
    );
  });

  it('si el paciente no existe, no guarda nada y no lanza', async () => {
    prisma.patients.findUnique.mockResolvedValue(null);

    await expect(
      listener.handleUpdated({ patientId: 99 }),
    ).resolves.toBeUndefined();
    expect(fhirResourceService.save).not.toHaveBeenCalled();
  });

  it('si el store falla, no propaga el error al emisor', async () => {
    prisma.patients.findUnique.mockResolvedValue(dbPatient);
    fhirResourceService.save.mockRejectedValue(new Error('db caída'));

    await expect(
      listener.handleCreated({ patientId: 42 }),
    ).resolves.toBeUndefined();
  });

  it('patient.deleted hace softDelete del recurso en el store', async () => {
    fhirResourceService.softDelete.mockResolvedValue(undefined);

    await listener.handleDeleted({ patientId: 42 });

    expect(fhirResourceService.softDelete).toHaveBeenCalledWith(
      'Patient',
      fhirIdFor('Patient', 42),
    );
    expect(fhirResourceService.save).not.toHaveBeenCalled();
  });
});
```

Run: `npx jest src/modules/interoperability/application/listeners --silent`
Expected: FAIL — módulo no existe.

- [ ] **Step 4: Implementar el listener**

`patient-projection.listener.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  PATIENT_CREATED_EVENT,
  PATIENT_UPDATED_EVENT,
  PATIENT_DELETED_EVENT,
  type PatientChangedEvent,
} from '../../../../shared/events/patient-events.interface.js';
import { FhirResourceService } from '../services/fhir-resource.service.js';
import { toFhirPatient } from '../../domain/mappers/patient-fhir.mapper.js';
import { buildProvenance } from '../../domain/mappers/provenance-fhir.mapper.js';
import {
  fhirIdFor,
  provenanceIdFor,
} from '../../domain/fhir-id.logic.js';

@Injectable()
export class PatientProjectionListener {
  private readonly logger = new Logger(PatientProjectionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fhirResourceService: FhirResourceService,
  ) {}

  @OnEvent(PATIENT_CREATED_EVENT, { async: true })
  handleCreated(event: PatientChangedEvent): Promise<void> {
    return this.project(event.patientId, PATIENT_CREATED_EVENT);
  }

  @OnEvent(PATIENT_UPDATED_EVENT, { async: true })
  handleUpdated(event: PatientChangedEvent): Promise<void> {
    return this.project(event.patientId, PATIENT_UPDATED_EVENT);
  }

  @OnEvent(PATIENT_DELETED_EVENT, { async: true })
  async handleDeleted(event: PatientChangedEvent): Promise<void> {
    try {
      await this.fhirResourceService.softDelete(
        'Patient',
        fhirIdFor('Patient', event.patientId),
      );
    } catch (err) {
      this.logger.error(
        `[PROJECTION] Error al soft-borrar Patient ${event.patientId}: ${(err as Error).message}`,
      );
    }
  }

  private async project(patientId: number, eventName: string): Promise<void> {
    try {
      const patient = await this.prisma.patients.findUnique({
        where: { id: patientId },
        include: { profile: true },
      });
      if (!patient) {
        this.logger.warn(
          `[PROJECTION] Patient ${patientId} no encontrado; se omite (${eventName})`,
        );
        return;
      }

      const fhirId = fhirIdFor('Patient', patientId);
      await this.fhirResourceService.save({
        id: fhirId,
        resourceType: 'Patient',
        content: toFhirPatient(patient),
        clinicId: null,
      });
      await this.fhirResourceService.save({
        id: provenanceIdFor('Patient', patientId),
        resourceType: 'Provenance',
        content: buildProvenance({
          targetType: 'Patient',
          targetFhirId: fhirId,
          eventName,
          internalId: patientId,
          recordedAt: new Date(),
        }),
        clinicId: null,
      });
    } catch (err) {
      this.logger.error(
        `[PROJECTION] Error proyectando Patient ${patientId} (${eventName}): ${(err as Error).message}`,
      );
    }
  }
}
```

- [ ] **Step 5: Registrar en el módulo**

En `interoperability.module.ts`, agregar el import y sumar `PatientProjectionListener` al array `providers` (no a `exports`):

```ts
import { PatientProjectionListener } from './listeners/patient-projection.listener.js';
```

- [ ] **Step 6: Verificar**

Run: `npx jest src/modules/interoperability --silent && npx tsc --noEmit -p tsconfig.json`
Expected: PASS todo, 0 errores.

- [ ] **Step 7: Commit**

```bash
git add src/modules/interoperability
git commit -m "feat(interop): listener de proyección Patient + softDelete en FhirResourceService

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Listener de proyección de `Encounter`

**Files:**
- Create: `server/src/modules/interoperability/application/listeners/encounter-projection.listener.ts`
- Create: `server/src/modules/interoperability/application/listeners/encounter-projection.listener.spec.ts`
- Modify: `server/src/modules/interoperability/application/interoperability.module.ts`

**Interfaces:**
- Consumes: `toFhirEncounter` (Task 4), `buildProvenance` (Task 5), `fhirIdFor`/`provenanceIdFor` (Task 2), `FhirResourceService.save`.
- Escucha los eventos **existentes** `'appointment.confirmed'` y `'appointment.cancelled'` (emitidos por appointments; solo se usa `appointmentId` del payload — tiparlo estructural, NO importar las interfaces de mail).

- [ ] **Step 1: Spec del listener (falla)**

`encounter-projection.listener.spec.ts`:

```ts
import { EncounterProjectionListener } from './encounter-projection.listener.js';
import {
  fhirIdFor,
  provenanceIdFor,
} from '../../domain/fhir-id.logic.js';

const dbAppointment = {
  id: 55,
  status: 'CONFIRMED',
  startTime: new Date('2026-07-10T14:00:00Z'),
  endTime: new Date('2026-07-10T14:30:00Z'),
  patientId: 42,
  clinicId: 3,
};

describe('EncounterProjectionListener', () => {
  const prisma = { appointments: { findUnique: jest.fn() } };
  const fhirResourceService = { save: jest.fn() };
  let listener: EncounterProjectionListener;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = new EncounterProjectionListener(
      prisma as any,
      fhirResourceService as any,
    );
  });

  it('proyecta Encounter + Provenance con el clinicId de la cita', async () => {
    prisma.appointments.findUnique.mockResolvedValue(dbAppointment);
    fhirResourceService.save.mockResolvedValue({});

    await listener.handleConfirmed({ appointmentId: 55 });

    expect(fhirResourceService.save).toHaveBeenCalledTimes(2);
    expect(fhirResourceService.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: fhirIdFor('Encounter', 55),
        resourceType: 'Encounter',
        clinicId: 3,
      }),
    );
    expect(fhirResourceService.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: provenanceIdFor('Encounter', 55),
        resourceType: 'Provenance',
        clinicId: 3,
      }),
    );
  });

  it('cita sin clínica proyecta con clinicId null', async () => {
    prisma.appointments.findUnique.mockResolvedValue({
      ...dbAppointment,
      clinicId: null,
    });
    fhirResourceService.save.mockResolvedValue({});

    await listener.handleCancelled({ appointmentId: 55 });

    expect(fhirResourceService.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ resourceType: 'Encounter', clinicId: null }),
    );
  });

  it('si la cita no existe, no guarda y no lanza', async () => {
    prisma.appointments.findUnique.mockResolvedValue(null);

    await expect(
      listener.handleConfirmed({ appointmentId: 99 }),
    ).resolves.toBeUndefined();
    expect(fhirResourceService.save).not.toHaveBeenCalled();
  });

  it('si el store falla, no propaga', async () => {
    prisma.appointments.findUnique.mockResolvedValue(dbAppointment);
    fhirResourceService.save.mockRejectedValue(new Error('boom'));

    await expect(
      listener.handleConfirmed({ appointmentId: 55 }),
    ).resolves.toBeUndefined();
  });
});
```

Run: `npx jest src/modules/interoperability/application/listeners/encounter-projection.listener.spec.ts --silent`
Expected: FAIL — módulo no existe.

- [ ] **Step 2: Implementar el listener**

`encounter-projection.listener.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { FhirResourceService } from '../services/fhir-resource.service.js';
import { toFhirEncounter } from '../../domain/mappers/encounter-fhir.mapper.js';
import { buildProvenance } from '../../domain/mappers/provenance-fhir.mapper.js';
import {
  fhirIdFor,
  provenanceIdFor,
} from '../../domain/fhir-id.logic.js';

/** Solo se usa appointmentId; el resto del payload es de notificaciones. */
interface AppointmentEventPayload {
  appointmentId: number;
}

@Injectable()
export class EncounterProjectionListener {
  private readonly logger = new Logger(EncounterProjectionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fhirResourceService: FhirResourceService,
  ) {}

  @OnEvent('appointment.confirmed', { async: true })
  handleConfirmed(event: AppointmentEventPayload): Promise<void> {
    return this.project(event.appointmentId, 'appointment.confirmed');
  }

  @OnEvent('appointment.cancelled', { async: true })
  handleCancelled(event: AppointmentEventPayload): Promise<void> {
    return this.project(event.appointmentId, 'appointment.cancelled');
  }

  private async project(
    appointmentId: number,
    eventName: string,
  ): Promise<void> {
    try {
      const appointment = await this.prisma.appointments.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          status: true,
          startTime: true,
          endTime: true,
          patientId: true,
          clinicId: true,
        },
      });
      if (!appointment) {
        this.logger.warn(
          `[PROJECTION] Cita ${appointmentId} no encontrada; se omite (${eventName})`,
        );
        return;
      }

      const fhirId = fhirIdFor('Encounter', appointmentId);
      const clinicId = appointment.clinicId ?? null;
      await this.fhirResourceService.save({
        id: fhirId,
        resourceType: 'Encounter',
        content: toFhirEncounter(appointment),
        clinicId,
      });
      await this.fhirResourceService.save({
        id: provenanceIdFor('Encounter', appointmentId),
        resourceType: 'Provenance',
        content: buildProvenance({
          targetType: 'Encounter',
          targetFhirId: fhirId,
          eventName,
          internalId: appointmentId,
          recordedAt: new Date(),
        }),
        clinicId,
      });
    } catch (err) {
      this.logger.error(
        `[PROJECTION] Error proyectando Encounter ${appointmentId} (${eventName}): ${(err as Error).message}`,
      );
    }
  }
}
```

- [ ] **Step 3: Registrar en el módulo**

En `interoperability.module.ts`, importar y agregar `EncounterProjectionListener` a `providers`. El módulo queda:

```ts
import { Module } from '@nestjs/common';
import { PrismaFhirResourceRepository } from '../infrastructure/persistence/prisma-fhir-resource.repository.js';
import { FhirResourceService } from './services/fhir-resource.service.js';
import { PatientProjectionListener } from './listeners/patient-projection.listener.js';
import { EncounterProjectionListener } from './listeners/encounter-projection.listener.js';

@Module({
  providers: [
    {
      provide: 'IFhirResourceRepository',
      useClass: PrismaFhirResourceRepository,
    },
    FhirResourceService,
    PatientProjectionListener,
    EncounterProjectionListener,
  ],
  exports: [FhirResourceService],
})
export class InteroperabilityModule {}
```

- [ ] **Step 4: Verificar**

Run: `npx jest src/modules/interoperability --silent && npx tsc --noEmit -p tsconfig.json`
Expected: PASS todo, 0 errores.

- [ ] **Step 5: Commit**

```bash
git add src/modules/interoperability
git commit -m "feat(interop): listener de proyección Encounter desde eventos de citas

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Verificación integral

**Files:** ninguno nuevo (solo verificación y push).

- [ ] **Step 1: Typecheck completo**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errores.

- [ ] **Step 2: Suite completa**

Run: `rtk proxy bash -c 'npx jest --silent 2>&1 | grep -E "^(Test Suites|Tests):"'`
Expected: 0 fallos; ~46+ suites (39 previas + 7 nuevas), todos los tests en verde.

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: build exitoso.

- [ ] **Step 4: Criterio de aceptación del spec (revisión manual rápida)**

Confirmar contra el spec que: (a) crear paciente emite evento y el listener guardaría `Patient` v1 + `Provenance` con `clinicId null`; (b) re-proyección versiona el mismo UUID; (c) `Encounter` lleva el `clinicId` de la cita y referencia `Patient/<uuid-v5>`. Todo esto ya está cubierto por los tests de las tasks 2–8; verificar que ningún checkbox del plan quedó sin marcar.

- [ ] **Step 5: Push**

```bash
git push
```
Expected: rama `feat/interop-fase1-proyeccion` actualizada en origin.
