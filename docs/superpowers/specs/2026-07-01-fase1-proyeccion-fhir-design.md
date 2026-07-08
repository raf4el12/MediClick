# Fase 1 — Proyección por eventos al FHIR Resource Store (diseño)

> Segundo incremento del programa de interoperabilidad
> ([roadmap](../../ROADMAP-interoperabilidad.md), [ADR-0001](../../adr/0001-fhir-resource-store.md)).
> Convierte la arquitectura orientada a eventos en la fuente de la HCE: los cambios de dominio
> se proyectan como recursos FHIR versionados, con trazabilidad de origen (`Provenance`).

## Alcance (decisiones cerradas con el usuario)

| Decisión | Elección |
|----------|----------|
| Recursos a proyectar | **`Patient` + `Encounter`** (MVP de Fase 2 los necesita) |
| Patrón de proyección | **Evento delgado + re-lectura**: el listener recibe el id, re-lee la entidad vía Prisma y mapea. No se enriquecen los eventos existentes |
| Trazabilidad | **Solo `Provenance`** por proyección. `AuditEvent` se difiere a Fase 2 (su valor es auditar accesos; nadie lee el store aún) |

**Fuera de alcance:** `MedicationRequest` (exige terminología, Fase 4), retry/replay de proyecciones
(Fase 5 Outbox), API de lectura (Fase 2), `AuditEvent`.

## Arquitectura

```
[use-cases existentes] --emit--> @nestjs/event-emitter --@OnEvent--> [listeners de proyección]
                                                                          │ re-lee entidad (Prisma)
                                                                          │ mapea a FHIR (funciones puras)
                                                                          ▼
                                                              FhirResourceService.save()
                                                                (Patient/Encounter + Provenance)
```

Todo vive en el módulo `interoperability` (Fase 0). Los módulos emisores no saben que la
proyección existe. Un fallo del listener **nunca** rompe el flujo emisor (patrón
`@OnEvent(..., { async: true })` + try/catch, como `availability-change.listener`).

## Eventos

### Nuevos — módulo `patients`

`patient.created`, `patient.updated`, `patient.deleted` — payload delgado:

```ts
export interface PatientChangedEvent {
  patientId: number;
}
```

Se emiten en `create-patient`, `update-patient` y `delete-patient` use-cases. **Al implementar,
auditar otros puntos de alta de pacientes** (register-patient de auth, alta inline en citas) y
emitir ahí también si crean filas en `Patients`.

### Existentes — se consumen tal cual

- `appointment.confirmed` → proyecta `Encounter` (status `planned`)
- `appointment.cancelled` → proyecta `Encounter` (status `cancelled`)

Ambos cargan `appointmentId`; el listener no usa nada más del payload.

> ⚠️ **Gap conocido (documentado, NO se arregla en este incremento):** `appointment.confirmed`
> solo se emite si el paciente tiene cuenta de usuario (`if (updated.patient.profile.userId)`).
> Citas de pacientes sin cuenta no se proyectan. Arreglarlo toca emisores que funcionan en
> producción; se difiere a un incremento posterior.

## Componentes

### Mappers — funciones puras en `domain/mappers/`

| Archivo | Firma | Notas |
|---------|-------|-------|
| `patient-fhir.mapper.ts` | `toFhirPatient(patient, profile): Patient` | `name` (name+lastName), `identifier[0]` = DNI (`typeDocument`/`numberDocument`), `identifier[1]` = **id interno** (cierra el pendiente del ADR), `birthDate`, `gender`, `telecom` (phone), `address`, `active` (isActive && !deleted) |
| `encounter-fhir.mapper.ts` | `toFhirEncounter(appointment): Encounter` | `status`: CONFIRMED→`planned`, CANCELLED→`cancelled`; `subject` = referencia al Patient proyectado (UUID v5); `period` desde scheduleDate/startTime/endTime |
| `provenance-fhir.mapper.ts` | `buildProvenance(targetRef, eventName, recordedAt): Provenance` | `target` al recurso proyectado, `recorded`, `activity` = evento de dominio origen, `agent` = sistema MediClick |

Campos de perfil nullables (`birthday`, `gender`, `phone`…) se omiten del recurso, no se
inventan defaults.

**Systems de los identifiers (URIs propias, no OIDs inventados):** hasta validar los OIDs
oficiales (Fase 4/6), se usan URIs del proyecto como constantes en `domain/fhir-systems.ts`:
`https://mediclick.app/fhir/identifiers/dni` (documento) y
`https://mediclick.app/fhir/identifiers/patient-id` (id interno). Cambiarlas después es una
re-proyección, no una migración.

**Referencias colgantes (aceptadas):** un `Encounter` referencia a su `Patient` por UUID v5
aunque ese `Patient` no exista aún en el store (pacientes creados antes de Fase 1, que nunca
emitieron `patient.created`). Es coherente con "el store es una proyección re-derivable": el
backfill batch de pacientes históricos queda fuera de alcance y resuelve las referencias al
correr.

### Identidad FHIR estable — UUID v5 determinístico

Proyectar la misma entidad dos veces debe **versionar** el mismo recurso, no crear otro.

- `fhirIdFor('Patient', 123)` = `uuidv5('Patient:123', NAMESPACE_MEDICLICK)` — siempre el mismo
  UUID para la misma entidad. Sin tabla de mapeo ni queries de búsqueda.
- `NAMESPACE_MEDICLICK`: UUID constante propio del proyecto (generado una vez, hardcodeado).
- Cumple ADR-0001 (id lógico FHIR = UUID propio). `FhirResourceService.save()` ya resuelve el
  versionado al recibir un id existente.
- Dependencia: paquete `uuid` (v5). Función en `domain/fhir-id.logic.ts`.

### Multi-tenant — migración: `FhirResource.clinicId` pasa a nullable

`Patients` no tiene clínica (el paciente es global, coherente con el hito M1 del roadmap), pero
`FhirResource.clinicId` es `Int` requerido.

- **Migración Prisma:** `clinicId Int` → `Int?` en `FhirResource`.
- **Regla:** `Patient` y su `Provenance` → `clinicId = null` (recurso demográfico compartido);
  `Encounter` y su `Provenance` → `clinicId` de la cita.
- **Semántica futura (Fase 2):** `null` = visible según reglas de consentimiento (Fase 7);
  con valor = solo ese tenant. Refuerza el gotcha ya anotado: scopear antes de exponer lecturas.

### Listeners — `application/listeners/`

| Archivo | Escucha | Hace |
|---------|---------|------|
| `patient-projection.listener.ts` | `patient.created`, `patient.updated` | re-lee `Patients`+`Profiles` → `toFhirPatient` → `save(Patient)` + `save(Provenance)` |
| | `patient.deleted` | `softDelete('Patient', fhirId)` en el store |
| `encounter-projection.listener.ts` | `appointment.confirmed`, `appointment.cancelled` | re-lee cita (con schedule) → `toFhirEncounter` → `save(Encounter)` + `save(Provenance)` |

Inyectan `PrismaService` + `FhirResourceService`. El módulo `interoperability` ya exporta el
servicio; los listeners se registran como providers del mismo módulo.

## Manejo de errores

- Entidad no encontrada al re-leer (race con delete): log `[PROJECTION]` + return, no lanza.
- Cualquier error de mapeo/persistencia: try/catch en el listener, log con contexto
  (`evento`, `id interno`), **jamás se propaga al emisor**.
- `event-emitter` es in-process y no durable (aceptado por el roadmap para proyección interna):
  si el proceso muere entre el commit del emisor y la proyección, ese evento se pierde. El store
  es una **proyección re-derivable**: las tablas Prisma siguen siendo la fuente de la verdad, y
  una re-proyección batch es trivial de agregar cuando se necesite. Durabilidad real = Outbox
  (Fase 5).
- Sin retries en este incremento.

## Testing (TDD)

| Qué | Cómo |
|-----|------|
| Mappers | Puros, sin mocks: entidad de dominio armada a mano → assert del recurso FHIR (los tests más valiosos) |
| `fhirIdFor` | Determinismo (misma entrada → mismo UUID), distintas entidades → distintos UUID, formato UUID válido |
| Listeners | Mocks planos de Prisma y `FhirResourceService` (convención del repo): proyecta y guarda ambos recursos; entidad inexistente → no guarda, no lanza; error del service → no propaga |
| Emisión en use-cases `patients` | Mock del `EventEmitter2`: assert `emit('patient.created', { patientId })` tras crear/actualizar/borrar |

Comandos: `npx jest src/modules/interoperability src/modules/patients` + `npx tsc --noEmit` +
`pnpm build`. Suite completa antes del commit final.

## Criterio de aceptación del incremento

1. Crear un paciente por API → existe `FhirResource` tipo `Patient` (versionId 1) + `Provenance`,
   con DNI e id interno como identifiers y `clinicId = null`.
2. Actualizar el mismo paciente → **mismo** recurso con `versionId 2` e historial con ambas versiones.
3. Confirmar una cita → `Encounter` (`planned`) referenciando al `Patient` por UUID v5, con el
   `clinicId` de la cita, + `Provenance`.
4. Cancelar la cita → mismo `Encounter` versionado a `cancelled`.
5. Suite completa en verde; los flujos emisores no cambian su comportamiento observable
   (salvo los nuevos `emit` en patients).
