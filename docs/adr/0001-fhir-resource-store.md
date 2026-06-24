# ADR-0001 — Fundación de persistencia para interoperabilidad (FHIR Resource Store)

- **Estado:** Aceptado
- **Fecha:** 2026-06-22
- **Fase:** 0 del [Roadmap de Interoperabilidad](../ROADMAP-interoperabilidad.md)
- **Decisores:** Equipo MediClick

---

## Contexto

MediClick evoluciona de un sistema clínico en silo a un **Point-of-Service interoperable**
(marco de referencia OpenHIE) capaz de unificar historiales (EHR), dar trazabilidad completa
del paciente y, eventualmente, dar salida a lo que el Estado peruano intentó con RENHICE.

El backend actual usa NestJS + Prisma + PostgreSQL con modelos relacionales rígidos optimizados
para la operación diaria (`Users → Profiles → Patients`, `Appointments`, `ClinicalNotes`,
`Prescriptions`, `MedicalHistory`). Estos modelos son excelentes para operar la aplicación pero
**no encajan** con la naturaleza anidada, polimórfica y extensible de los recursos FHIR.

Esta es la **Fase 0**: la fundación de persistencia sobre la que se enchufan todas las fases
posteriores (proyección por eventos, API FHIR, MPI, terminología, integración externa). Las
decisiones de persistencia son **caras de revertir** una vez que existan datos clínicos en el
store, por lo que se fijan por escrito antes de implementar.

## Decisión

### 1. FHIR R4 como modelo canónico de intercambio
Se adopta **FHIR R4** (no R5/R4B) por ser el estándar de facto soportado por las piezas OpenHIE
(SanteMPI/OpenCR, Medplum) y por cualquier integración estatal previsible. Perfil base:
**IPS (International Patient Summary)** + perfiles **HL7 LAC** como punto de partida, dado que
Perú no tiene aún un Implementation Guide nacional maduro.

### 2. Persistencia híbrida — el FHIR Resource Store es una proyección
Las tablas Prisma normalizadas **siguen siendo la fuente de la verdad** de todo lo que MediClick
opera. El FHIR Resource Store es un **read-model / proyección derivada** (poblada por eventos en
Fase 1) para intercambio y trazabilidad. Si el store se corrompe o cambia de forma, se
**re-proyecta** desde Prisma. Consecuencia: la app actual no se toca y el riesgo es bajo.

Se descarta el modelo inverso (FHIR como fuente de la verdad) porque obligaría a reescribir cómo
lee toda la app hoy y acoplaría la operación diaria a la disponibilidad del store.

### 3. Tabla genérica con `jsonb`, no tabla por tipo de recurso
Un único modelo `FhirResource` con el recurso FHIR completo en una columna `jsonb`, más índices
**GIN** para los search params. Esto absorbe la extensibilidad/polimorfismo de FHIR sin churn de
esquema cada vez que se sume un tipo de recurso.

### 4. Id lógico FHIR = UUID propio
Los IDs internos de MediClick son `Int @default(autoincrement())`. El recurso FHIR usa su **propio
UUID** como id lógico; el id interno se guarda como un **`identifier` FHIR** con `system` propio
(p. ej. `urn:mediclick:patient-id`). Esto desacopla la identidad externa de las secuencias
internas, no filtra volúmenes de negocio, y evita que el MPI (Fase 3) tenga que unificar
identidades sobre enteros correlativos.

### 5. Historial append-only en tabla separada
Todo cambio escribe una fila en `FhirResourceHistory` **dentro de la misma transacción** que la
escritura del recurso. Soporta `vread` / `_history` de FHIR y constituye la base de la trazabilidad
clínica y la defensa legal desde el día 1.

## Modelo de datos

```prisma
model FhirResource {
  id           String   @id @default(uuid())   // id lógico FHIR (UUID propio)
  resourceType String                           // "Patient", "Encounter"...
  versionId    Int      @default(1)
  content      Json                             // recurso FHIR completo (jsonb)
  clinicId     Int                              // multi-tenant (consistente con el resto)
  deleted      Boolean  @default(false)         // soft-delete FHIR
  lastUpdated  DateTime @updatedAt
  createdAt    DateTime @default(now())

  @@unique([resourceType, id])
  @@index([resourceType, clinicId])
}

model FhirResourceHistory {                      // append-only
  id           String   @id @default(uuid())
  resourceType String
  resourceId   String                            // FK lógica al FhirResource
  versionId    Int
  content      Json
  recordedAt   DateTime @default(now())

  @@index([resourceType, resourceId, versionId])
}
```

Prisma no gestiona índices GIN, por lo que se añade en una **migración SQL cruda**:

```sql
CREATE INDEX idx_fhir_resource_content_gin
  ON "FhirResource" USING GIN (content jsonb_path_ops);
```

## Estructura del módulo

Sigue la arquitectura hexagonal del resto del backend (`domain` / `application` /
`infrastructure` / `interfaces`):

```
server/src/modules/interoperability/
  domain/
    entities/        ← FhirResource (entidad de dominio)
    repositories/    ← fhir-resource.repository.ts (interfaz)
  infrastructure/
    persistence/     ← prisma-fhir-resource.repository.ts + mappers
  application/
    services/        ← FhirResourceService (save / get / version)
  # interfaces/, acl/, terminology/, outbox/ → fases posteriores (vacíos por ahora)
```

## Alcance

**Dentro de Fase 0 (este ADR):**
- Módulo `interoperability` (esqueleto hexagonal).
- Modelos `FhirResource` + `FhirResourceHistory` + migración con índice GIN.
- Tipos FHIR vía `@medplum/fhirtypes`.
- `FhirResourceRepository` + `FhirResourceService`: guardar / leer / versionar, con la escritura
  del historial en la misma transacción.

**Fuera de Fase 0 (cada uno con su propio ADR):**
- Mappers de dominio → FHIR y listeners de proyección por eventos → **Fase 1**.
- API REST FHIR (`/fhir/R4/...`, `CapabilityStatement`) → **Fase 2**.
- Autenticación SMART on FHIR → **Fase 2**.
- MPI, terminología, outbox, adapters externos → **Fases 3–8**.

## Consecuencias

**Positivas:**
- No toca ningún modelo Prisma existente ni la lógica de lectura de la app actual → riesgo bajo.
- Versionado e historial listos desde el día 1 para trazabilidad legal.
- Extensible a cualquier tipo de recurso FHIR sin migraciones de esquema.
- La identidad FHIR (UUID + identifier) queda preparada para el MPI sin deuda.

**Negativas / a vigilar:**
- El store arranca **vacío**; no aporta valor hasta la Fase 1 (proyección).
- Las búsquedas sobre `jsonb` dependen del índice GIN: **obligatorio** antes de exponer la Fase 2.
- Mantener consistencia proyección ↔ fuente requiere disciplina de eventos (se aborda en Fase 1).

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|-------------|---------------------|
| FHIR como fuente de la verdad | Obliga a reescribir la lectura de toda la app; acopla la operación a la disponibilidad del store. |
| Tabla relacional por tipo de recurso FHIR | Churn de esquema constante; pierde la extensibilidad de FHIR. |
| Reusar el id `Int` interno como id FHIR | Filtra volumen de negocio y genera deuda en el merge de identidades del MPI. |
| Historial embebido en el mismo registro (sin tabla aparte) | Complica `vread`/`_history` y mezcla el estado actual con el versionado. |
| Servidor FHIR externo (Medplum/HAPI) desde el día 1 | Sobredimensionado para la Fase 0; se reevalúa como Client Registry en Fase 3. |
