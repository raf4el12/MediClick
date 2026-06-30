# Fase 0 — FHIR Resource Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la fundación de persistencia de interoperabilidad: un FHIR Resource Store genérico (jsonb) con versionado e historial append-only, como módulo NestJS hexagonal, sin tocar la app existente.

**Architecture:** Persistencia híbrida — las tablas Prisma normalizadas siguen siendo la fuente de la verdad; el store FHIR es un read-model derivado (se poblará por eventos en Fase 1). Tabla genérica `FhirResource` (jsonb) + `FhirResourceHistory` (append-only). La lógica de versionado/sellado vive en una capa de servicio testeable; el repositorio Prisma es una capa atómica delgada.

**Tech Stack:** NestJS · Prisma 7 (driver adapter pg) · PostgreSQL (jsonb + GIN) · `@medplum/fhirtypes` · `node:crypto` (randomUUID) · Jest 30 + ts-jest.

## Global Constraints

- **Módulo objetivo:** todo vive bajo `server/src/modules/interoperability/`, siguiendo la arquitectura hexagonal `domain` / `application` / `infrastructure` del resto del backend.
- **ESM:** todos los imports relativos llevan extensión `.js` (NodeNext). Ej: `import { x } from './y.js'`.
- **Patrón de repositorio:** interfaz en `domain/repositories`, implementación Prisma en `infrastructure/persistence`, inyección con token string (`'IFhirResourceRepository'`) + `useClass`.
- **PrismaService es `@Global`** (`src/prisma/prisma.service.ts`): se inyecta sin importar `PrismaModule`.
- **Decisiones fijadas por [ADR-0001](../../adr/0001-fhir-resource-store.md):** FHIR R4; id lógico = UUID propio; id interno como `identifier`; historial append-only en tabla separada; el store es proyección (no fuente de la verdad).
- **Alcance:** SOLO persistencia. NADA de mappers de dominio→FHIR, listeners de eventos, ni API REST (esos son Fase 1 y 2).
- **Tests:** unitarios con `*.spec.ts` colocados; mocks planos (sin DB real), igual que el resto del repo. Correr con `cd server && pnpm test -- <ruta>`.

---

## File Structure

```
server/
  prisma/schema.prisma                 (modify: +2 modelos)
  prisma/migrations/<ts>_add_fhir_resource_store/migration.sql  (create + GIN a mano)
  src/modules/interoperability/
    domain/
      entities/fhir-resource.entity.ts          (tipos de dominio)
      repositories/fhir-resource.repository.ts  (interfaz + tipos de I/O)
      fhir-resource.logic.ts                     (puro: nextVersionId, stampResource)
      fhir-resource.logic.spec.ts                (test)
    infrastructure/
      persistence/fhir-resource.mapper.ts        (row Prisma → entidad)
      persistence/fhir-resource.mapper.spec.ts   (test)
      persistence/prisma-fhir-resource.repository.ts (impl atómica delgada)
    application/
      services/fhir-resource.service.ts          (orquestación)
      services/fhir-resource.service.spec.ts     (test, repo mockeado)
      interoperability.module.ts                 (wiring)
  src/app.module.ts                    (modify: +import InteroperabilityModule)
```

---

## Task 1: Instalar dependencia de tipos FHIR

**Files:**
- Modify: `server/package.json` (vía gestor de paquetes)

**Interfaces:**
- Produces: el paquete `@medplum/fhirtypes` disponible para importar el tipo `Resource`.

- [ ] **Step 1: Instalar el paquete**

Run: `cd server && pnpm add @medplum/fhirtypes`

- [ ] **Step 2: Verificar que el tipo es importable**

Run: `cd server && node -e "require.resolve('@medplum/fhirtypes'); console.log('ok')"`
Expected: imprime `ok`

- [ ] **Step 3: Commit**

```bash
cd server && git add package.json pnpm-lock.yaml
git commit -m "chore(interop): add @medplum/fhirtypes for FHIR R4 types"
```

---

## Task 2: Modelos Prisma + migración con índice GIN

**Files:**
- Modify: `server/prisma/schema.prisma` (añadir al final, junto a los demás `model`)
- Create: `server/prisma/migrations/<ts>_add_fhir_resource_store/migration.sql`

**Interfaces:**
- Produces: tablas `FhirResource` y `FhirResourceHistory`; el cliente Prisma generado expone `prisma.fhirResource` y `prisma.fhirResourceHistory`.

- [ ] **Step 1: Añadir los modelos al schema**

Añadir al final de `server/prisma/schema.prisma`:

```prisma
model FhirResource {
  id           String   @id @default(uuid())
  resourceType String
  versionId    Int      @default(1)
  content      Json
  clinicId     Int
  deleted      Boolean  @default(false)
  lastUpdated  DateTime @updatedAt
  createdAt    DateTime @default(now())

  @@unique([resourceType, id])
  @@index([resourceType, clinicId])
}

model FhirResourceHistory {
  id           String   @id @default(uuid())
  resourceType String
  resourceId   String
  versionId    Int
  content      Json
  recordedAt   DateTime @default(now())

  @@index([resourceType, resourceId, versionId])
}
```

- [ ] **Step 2: Generar la migración SIN aplicarla**

Run: `cd server && pnpm prisma migrate dev --name add_fhir_resource_store --create-only`
Expected: crea `prisma/migrations/<timestamp>_add_fhir_resource_store/migration.sql` con los `CREATE TABLE`.

- [ ] **Step 3: Añadir el índice GIN a mano**

Editar el `migration.sql` recién creado y añadir al final (Prisma no gestiona índices GIN):

```sql
-- Índice GIN para search params FHIR sobre el documento jsonb
CREATE INDEX "idx_fhir_resource_content_gin"
  ON "FhirResource" USING GIN (content jsonb_path_ops);
```

- [ ] **Step 4: Aplicar la migración y regenerar el cliente**

Run: `cd server && pnpm prisma migrate dev`
Expected: aplica la migración (incluido el GIN) y regenera el cliente Prisma sin errores.

- [ ] **Step 5: Verificar que el índice existe**

Run: `cd server && pnpm prisma db execute --stdin <<< "SELECT indexname FROM pg_indexes WHERE indexname = 'idx_fhir_resource_content_gin';"`
Expected: devuelve la fila `idx_fhir_resource_content_gin`.

- [ ] **Step 6: Commit**

```bash
cd server && git add prisma/schema.prisma prisma/migrations
git commit -m "feat(interop): FhirResource + FhirResourceHistory tables with GIN index"
```

---

## Task 3: Capa de dominio — entidad, interfaz de repo y lógica pura

**Files:**
- Create: `server/src/modules/interoperability/domain/entities/fhir-resource.entity.ts`
- Create: `server/src/modules/interoperability/domain/repositories/fhir-resource.repository.ts`
- Create: `server/src/modules/interoperability/domain/fhir-resource.logic.ts`
- Test: `server/src/modules/interoperability/domain/fhir-resource.logic.spec.ts`

**Interfaces:**
- Consumes: tipo `Resource` de `@medplum/fhirtypes` (Task 1).
- Produces:
  - `interface FhirResourceEntity { id: string; resourceType: string; versionId: number; content: Resource; clinicId: number; deleted: boolean; lastUpdated: Date; createdAt: Date; }`
  - `interface FhirResourceVersion { resourceType: string; resourceId: string; versionId: number; content: Resource; recordedAt: Date; }`
  - `interface SaveFhirResourceInput { id?: string; resourceType: string; content: Resource; clinicId: number; }`
  - `interface PersistFhirResourceInput { id: string; resourceType: string; versionId: number; content: Resource; clinicId: number; lastUpdated: Date; }`
  - `interface IFhirResourceRepository { persist(input: PersistFhirResourceInput): Promise<FhirResourceEntity>; findByTypeAndId(resourceType: string, id: string): Promise<FhirResourceEntity | null>; findHistory(resourceType: string, id: string): Promise<FhirResourceVersion[]>; softDelete(resourceType: string, id: string): Promise<void>; }`
  - `function nextVersionId(existing: { versionId: number } | null): number`
  - `function stampResource(content: Resource, params: { id: string; versionId: number; lastUpdated: Date }): Resource`

- [ ] **Step 1: Escribir la entidad de dominio**

Create `server/src/modules/interoperability/domain/entities/fhir-resource.entity.ts`:

```ts
import type { Resource } from '@medplum/fhirtypes';

/** Estado actual de un recurso FHIR en el store (proyección). */
export interface FhirResourceEntity {
  id: string;
  resourceType: string;
  versionId: number;
  content: Resource;
  clinicId: number;
  deleted: boolean;
  lastUpdated: Date;
  createdAt: Date;
}

/** Una versión histórica (append-only) de un recurso. */
export interface FhirResourceVersion {
  resourceType: string;
  resourceId: string;
  versionId: number;
  content: Resource;
  recordedAt: Date;
}
```

- [ ] **Step 2: Escribir la interfaz del repositorio**

Create `server/src/modules/interoperability/domain/repositories/fhir-resource.repository.ts`:

```ts
import type { Resource } from '@medplum/fhirtypes';
import type {
  FhirResourceEntity,
  FhirResourceVersion,
} from '../entities/fhir-resource.entity.js';

/** Entrada del caso de uso "guardar": el servicio resuelve id/version/meta. */
export interface SaveFhirResourceInput {
  /** Omitir para crear (se genera UUID); proveer para actualizar. */
  id?: string;
  resourceType: string;
  content: Resource;
  clinicId: number;
}

/** Entrada ya resuelta que el repositorio persiste de forma atómica. */
export interface PersistFhirResourceInput {
  id: string;
  resourceType: string;
  versionId: number;
  content: Resource;
  clinicId: number;
  lastUpdated: Date;
}

export interface IFhirResourceRepository {
  /** Upsert del recurso + append de su versión al historial, en una transacción. */
  persist(input: PersistFhirResourceInput): Promise<FhirResourceEntity>;
  findByTypeAndId(
    resourceType: string,
    id: string,
  ): Promise<FhirResourceEntity | null>;
  /** Versiones del recurso, más nueva primero. */
  findHistory(
    resourceType: string,
    id: string,
  ): Promise<FhirResourceVersion[]>;
  softDelete(resourceType: string, id: string): Promise<void>;
}
```

- [ ] **Step 3: Escribir el test de la lógica pura (debe fallar)**

Create `server/src/modules/interoperability/domain/fhir-resource.logic.spec.ts`:

```ts
import type { Resource } from '@medplum/fhirtypes';
import { nextVersionId, stampResource } from './fhir-resource.logic.js';

describe('nextVersionId', () => {
  it('arranca en 1 cuando no existe versión previa', () => {
    expect(nextVersionId(null)).toBe(1);
  });

  it('incrementa la versión existente', () => {
    expect(nextVersionId({ versionId: 2 })).toBe(3);
  });
});

describe('stampResource', () => {
  const lastUpdated = new Date('2026-06-22T10:00:00.000Z');

  it('sella id y meta.versionId/lastUpdated en el recurso', () => {
    const content = { resourceType: 'Patient' } as Resource;
    const result = stampResource(content, {
      id: 'abc-123',
      versionId: 4,
      lastUpdated,
    });

    expect(result.id).toBe('abc-123');
    expect(result.meta?.versionId).toBe('4');
    expect(result.meta?.lastUpdated).toBe('2026-06-22T10:00:00.000Z');
    expect(result.resourceType).toBe('Patient');
  });

  it('preserva meta existente y no muta el original', () => {
    const content = {
      resourceType: 'Patient',
      meta: { source: 'mediclick' },
    } as Resource;
    const result = stampResource(content, {
      id: 'x',
      versionId: 1,
      lastUpdated,
    });

    expect(result.meta?.source).toBe('mediclick');
    expect((content as { id?: string }).id).toBeUndefined();
  });
});
```

- [ ] **Step 4: Correr el test para ver que falla**

Run: `cd server && pnpm test -- fhir-resource.logic.spec.ts`
Expected: FAIL — `Cannot find module './fhir-resource.logic.js'`

- [ ] **Step 5: Implementar la lógica pura**

Create `server/src/modules/interoperability/domain/fhir-resource.logic.ts`:

```ts
import type { Resource } from '@medplum/fhirtypes';

/** Siguiente número de versión: 1 si es nuevo, +1 sobre el existente. */
export function nextVersionId(existing: { versionId: number } | null): number {
  return existing ? existing.versionId + 1 : 1;
}

/**
 * Sella en el recurso los datos gestionados por el servidor: id lógico y
 * meta.versionId / meta.lastUpdated. No muta el recurso original.
 */
export function stampResource(
  content: Resource,
  params: { id: string; versionId: number; lastUpdated: Date },
): Resource {
  return {
    ...content,
    id: params.id,
    meta: {
      ...content.meta,
      versionId: String(params.versionId),
      lastUpdated: params.lastUpdated.toISOString(),
    },
  };
}
```

- [ ] **Step 6: Correr el test para ver que pasa**

Run: `cd server && pnpm test -- fhir-resource.logic.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
cd server && git add src/modules/interoperability/domain
git commit -m "feat(interop): FHIR resource domain types + versioning/stamping logic"
```

---

## Task 4: Capa de infraestructura — mapper y repositorio Prisma

**Files:**
- Create: `server/src/modules/interoperability/infrastructure/persistence/fhir-resource.mapper.ts`
- Test: `server/src/modules/interoperability/infrastructure/persistence/fhir-resource.mapper.spec.ts`
- Create: `server/src/modules/interoperability/infrastructure/persistence/prisma-fhir-resource.repository.ts`

**Interfaces:**
- Consumes: `FhirResourceEntity`, `FhirResourceVersion` (Task 3); `IFhirResourceRepository`, `PersistFhirResourceInput` (Task 3); `PrismaService` (`src/prisma/prisma.service.js`).
- Produces:
  - `function toEntity(row): FhirResourceEntity`
  - `function toVersion(row): FhirResourceVersion`
  - `class PrismaFhirResourceRepository implements IFhirResourceRepository`

- [ ] **Step 1: Escribir el test del mapper (debe fallar)**

Create `server/src/modules/interoperability/infrastructure/persistence/fhir-resource.mapper.spec.ts`:

```ts
import { toEntity, toVersion } from './fhir-resource.mapper.js';

describe('toEntity', () => {
  it('mapea una fila Prisma a la entidad de dominio', () => {
    const row = {
      id: 'uuid-1',
      resourceType: 'Patient',
      versionId: 2,
      content: { resourceType: 'Patient', id: 'uuid-1' },
      clinicId: 7,
      deleted: false,
      lastUpdated: new Date('2026-06-22T10:00:00.000Z'),
      createdAt: new Date('2026-06-20T08:00:00.000Z'),
    };

    expect(toEntity(row)).toEqual({
      id: 'uuid-1',
      resourceType: 'Patient',
      versionId: 2,
      content: { resourceType: 'Patient', id: 'uuid-1' },
      clinicId: 7,
      deleted: false,
      lastUpdated: new Date('2026-06-22T10:00:00.000Z'),
      createdAt: new Date('2026-06-20T08:00:00.000Z'),
    });
  });
});

describe('toVersion', () => {
  it('mapea una fila de historial a una versión de dominio', () => {
    const row = {
      resourceType: 'Patient',
      resourceId: 'uuid-1',
      versionId: 2,
      content: { resourceType: 'Patient', id: 'uuid-1' },
      recordedAt: new Date('2026-06-22T10:00:00.000Z'),
    };

    expect(toVersion(row)).toEqual({
      resourceType: 'Patient',
      resourceId: 'uuid-1',
      versionId: 2,
      content: { resourceType: 'Patient', id: 'uuid-1' },
      recordedAt: new Date('2026-06-22T10:00:00.000Z'),
    });
  });
});
```

- [ ] **Step 2: Correr el test para ver que falla**

Run: `cd server && pnpm test -- fhir-resource.mapper.spec.ts`
Expected: FAIL — `Cannot find module './fhir-resource.mapper.js'`

- [ ] **Step 3: Implementar el mapper**

Create `server/src/modules/interoperability/infrastructure/persistence/fhir-resource.mapper.ts`:

```ts
import type { Resource } from '@medplum/fhirtypes';
import type {
  FhirResourceEntity,
  FhirResourceVersion,
} from '../../domain/entities/fhir-resource.entity.js';

export function toEntity(raw: any): FhirResourceEntity {
  return {
    id: raw.id,
    resourceType: raw.resourceType,
    versionId: raw.versionId,
    content: raw.content as Resource,
    clinicId: raw.clinicId,
    deleted: raw.deleted,
    lastUpdated: raw.lastUpdated,
    createdAt: raw.createdAt,
  };
}

export function toVersion(raw: any): FhirResourceVersion {
  return {
    resourceType: raw.resourceType,
    resourceId: raw.resourceId,
    versionId: raw.versionId,
    content: raw.content as Resource,
    recordedAt: raw.recordedAt,
  };
}
```

- [ ] **Step 4: Correr el test para ver que pasa**

Run: `cd server && pnpm test -- fhir-resource.mapper.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Implementar el repositorio Prisma (capa atómica delgada)**

Create `server/src/modules/interoperability/infrastructure/persistence/prisma-fhir-resource.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type {
  FhirResourceEntity,
  FhirResourceVersion,
} from '../../domain/entities/fhir-resource.entity.js';
import type {
  IFhirResourceRepository,
  PersistFhirResourceInput,
} from '../../domain/repositories/fhir-resource.repository.js';
import { toEntity, toVersion } from './fhir-resource.mapper.js';

@Injectable()
export class PrismaFhirResourceRepository implements IFhirResourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async persist(input: PersistFhirResourceInput): Promise<FhirResourceEntity> {
    const content = input.content as unknown as Prisma.InputJsonValue;
    const saved = await this.prisma.$transaction(async (tx) => {
      const row = await tx.fhirResource.upsert({
        where: { id: input.id },
        create: {
          id: input.id,
          resourceType: input.resourceType,
          versionId: input.versionId,
          content,
          clinicId: input.clinicId,
          lastUpdated: input.lastUpdated,
        },
        update: {
          versionId: input.versionId,
          content,
          lastUpdated: input.lastUpdated,
          deleted: false,
        },
      });
      await tx.fhirResourceHistory.create({
        data: {
          resourceType: input.resourceType,
          resourceId: input.id,
          versionId: input.versionId,
          content,
        },
      });
      return row;
    });
    return toEntity(saved);
  }

  async findByTypeAndId(
    resourceType: string,
    id: string,
  ): Promise<FhirResourceEntity | null> {
    const row = await this.prisma.fhirResource.findFirst({
      where: { resourceType, id, deleted: false },
    });
    return row ? toEntity(row) : null;
  }

  async findHistory(
    resourceType: string,
    id: string,
  ): Promise<FhirResourceVersion[]> {
    const rows = await this.prisma.fhirResourceHistory.findMany({
      where: { resourceType, resourceId: id },
      orderBy: { versionId: 'desc' },
    });
    return rows.map(toVersion);
  }

  async softDelete(resourceType: string, id: string): Promise<void> {
    await this.prisma.fhirResource.updateMany({
      where: { resourceType, id },
      data: { deleted: true },
    });
  }
}
```

- [ ] **Step 6: Verificar que compila**

Run: `cd server && pnpm build`
Expected: build sin errores de tipos.

- [ ] **Step 7: Commit**

```bash
cd server && git add src/modules/interoperability/infrastructure
git commit -m "feat(interop): Prisma FHIR resource repository + row mapper"
```

---

## Task 5: Capa de aplicación — servicio y wiring del módulo

**Files:**
- Create: `server/src/modules/interoperability/application/services/fhir-resource.service.ts`
- Test: `server/src/modules/interoperability/application/services/fhir-resource.service.spec.ts`
- Create: `server/src/modules/interoperability/application/interoperability.module.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `IFhirResourceRepository`, `SaveFhirResourceInput` (Task 3); `nextVersionId`, `stampResource` (Task 3); `PrismaFhirResourceRepository` (Task 4); `randomUUID` de `node:crypto`.
- Produces:
  - `class FhirResourceService` con: `save(input: SaveFhirResourceInput): Promise<FhirResourceEntity>`; `getById(resourceType, id): Promise<FhirResourceEntity | null>`; `getHistory(resourceType, id): Promise<FhirResourceVersion[]>`
  - `class InteroperabilityModule` exportando `FhirResourceService`.

- [ ] **Step 1: Escribir el test del servicio (debe fallar)**

Create `server/src/modules/interoperability/application/services/fhir-resource.service.spec.ts`:

```ts
import type { Resource } from '@medplum/fhirtypes';
import { FhirResourceService } from './fhir-resource.service.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('FhirResourceService', () => {
  let repo: any;
  let service: FhirResourceService;

  beforeEach(() => {
    repo = {
      persist: jest.fn((input) => Promise.resolve({ ...input, deleted: false, createdAt: new Date() })),
      findByTypeAndId: jest.fn(() => Promise.resolve(null)),
      findHistory: jest.fn(() => Promise.resolve([])),
      softDelete: jest.fn(() => Promise.resolve()),
    };
    service = new FhirResourceService(repo);
  });

  it('crea: genera UUID, versión 1 y sella el contenido', async () => {
    const content = { resourceType: 'Patient' } as Resource;
    await service.save({ resourceType: 'Patient', content, clinicId: 3 });

    expect(repo.findByTypeAndId).toHaveBeenCalledWith('Patient', expect.stringMatching(UUID_RE));
    const arg = repo.persist.mock.calls[0][0];
    expect(arg.versionId).toBe(1);
    expect(arg.clinicId).toBe(3);
    expect(arg.id).toMatch(UUID_RE);
    expect(arg.content.id).toBe(arg.id);
    expect(arg.content.meta.versionId).toBe('1');
  });

  it('actualiza: respeta el id dado e incrementa la versión', async () => {
    repo.findByTypeAndId.mockResolvedValueOnce({ versionId: 2 });
    const content = { resourceType: 'Patient' } as Resource;

    await service.save({ id: 'fixed-id', resourceType: 'Patient', content, clinicId: 3 });

    expect(repo.findByTypeAndId).toHaveBeenCalledWith('Patient', 'fixed-id');
    const arg = repo.persist.mock.calls[0][0];
    expect(arg.id).toBe('fixed-id');
    expect(arg.versionId).toBe(3);
    expect(arg.content.meta.versionId).toBe('3');
  });

  it('getById delega en el repositorio', async () => {
    await service.getById('Patient', 'abc');
    expect(repo.findByTypeAndId).toHaveBeenCalledWith('Patient', 'abc');
  });

  it('getHistory delega en el repositorio', async () => {
    await service.getHistory('Patient', 'abc');
    expect(repo.findHistory).toHaveBeenCalledWith('Patient', 'abc');
  });
});
```

- [ ] **Step 2: Correr el test para ver que falla**

Run: `cd server && pnpm test -- fhir-resource.service.spec.ts`
Expected: FAIL — `Cannot find module './fhir-resource.service.js'`

- [ ] **Step 3: Implementar el servicio**

Create `server/src/modules/interoperability/application/services/fhir-resource.service.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  FhirResourceEntity,
  FhirResourceVersion,
} from '../../domain/entities/fhir-resource.entity.js';
import type {
  IFhirResourceRepository,
  SaveFhirResourceInput,
} from '../../domain/repositories/fhir-resource.repository.js';
import {
  nextVersionId,
  stampResource,
} from '../../domain/fhir-resource.logic.js';

@Injectable()
export class FhirResourceService {
  constructor(
    @Inject('IFhirResourceRepository')
    private readonly repo: IFhirResourceRepository,
  ) {}

  async save(input: SaveFhirResourceInput): Promise<FhirResourceEntity> {
    const id = input.id ?? randomUUID();
    const existing = await this.repo.findByTypeAndId(input.resourceType, id);
    const versionId = nextVersionId(existing);
    const lastUpdated = new Date();
    const content = stampResource(input.content, { id, versionId, lastUpdated });

    return this.repo.persist({
      id,
      resourceType: input.resourceType,
      versionId,
      content,
      clinicId: input.clinicId,
      lastUpdated,
    });
  }

  getById(
    resourceType: string,
    id: string,
  ): Promise<FhirResourceEntity | null> {
    return this.repo.findByTypeAndId(resourceType, id);
  }

  getHistory(
    resourceType: string,
    id: string,
  ): Promise<FhirResourceVersion[]> {
    return this.repo.findHistory(resourceType, id);
  }
}
```

- [ ] **Step 4: Correr el test para ver que pasa**

Run: `cd server && pnpm test -- fhir-resource.service.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Escribir el módulo**

Create `server/src/modules/interoperability/application/interoperability.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaFhirResourceRepository } from '../infrastructure/persistence/prisma-fhir-resource.repository.js';
import { FhirResourceService } from './services/fhir-resource.service.js';

@Module({
  providers: [
    {
      provide: 'IFhirResourceRepository',
      useClass: PrismaFhirResourceRepository,
    },
    FhirResourceService,
  ],
  exports: [FhirResourceService],
})
export class InteroperabilityModule {}
```

- [ ] **Step 6: Registrar el módulo en AppModule**

En `server/src/app.module.ts`, añadir el import junto a los demás módulos (tras la línea de `ReviewsModule`, línea 43):

```ts
import { InteroperabilityModule } from './modules/interoperability/application/interoperability.module.js';
```

Y añadir `InteroperabilityModule` al array `imports` del decorador `@Module`, junto a los demás módulos de dominio (p. ej. tras `ReviewsModule`).

- [ ] **Step 7: Verificar que la app arranca y compila**

Run: `cd server && pnpm build`
Expected: build sin errores.

- [ ] **Step 8: Correr toda la suite del módulo**

Run: `cd server && pnpm test -- interoperability`
Expected: PASS (todos los specs del módulo: logic 5, mapper 2, service 4).

- [ ] **Step 9: Commit**

```bash
cd server && git add src/modules/interoperability/application src/app.module.ts
git commit -m "feat(interop): FhirResourceService + InteroperabilityModule wiring"
```

---

## Self-Review

**Spec coverage (contra ADR-0001):**
- Decisión 1 (R4 + IPS): tipos R4 vía `@medplum/fhirtypes` (Task 1). IPS/perfiles → validación es Fase 1+, fuera de alcance. ✅
- Decisión 2 (store = proyección): no se toca ningún modelo existente; el store arranca vacío. ✅
- Decisión 3 (tabla genérica jsonb + GIN): Task 2. ✅
- Decisión 4 (UUID propio + id interno como identifier): UUID en Task 2/5; el id interno como `identifier` lo inyecta el mapper de dominio en **Fase 1** (el store solo persiste el `content` que reciba). ✅ (correctamente diferido)
- Decisión 5 (historial append-only en tabla separada): Task 2 (tabla) + Task 4 (append atómico en `persist`). ✅
- Estructura hexagonal del módulo: Tasks 3–5. ✅
- Fuera de alcance (mappers dominio→FHIR, listeners, API): no aparecen en ninguna task. ✅

**Placeholder scan:** sin TBD/TODO; todo paso con código muestra código completo. ✅

**Type consistency:** `IFhirResourceRepository` (persist/findByTypeAndId/findHistory/softDelete) idéntico entre Task 3 (interfaz), Task 4 (impl) y Task 5 (mock + servicio). `PersistFhirResourceInput`/`SaveFhirResourceInput`/`FhirResourceEntity`/`FhirResourceVersion` consistentes. `nextVersionId`/`stampResource` con la misma firma donde se usan. ✅

**Nota de alcance verificada:** el store es agnóstico al tipo de recurso; no genera ni valida FHIR, solo versiona y persiste lo que el servicio le entrega — coherente con "solo persistencia".
