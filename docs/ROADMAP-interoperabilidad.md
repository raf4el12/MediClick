# Roadmap — Interoperabilidad e Historia Clínica Electrónica (EHR)

> Programa para evolucionar MediClick de un sistema clínico en silo a un **Point-of-Service
> interoperable** capaz de unificar historiales (EHR), dar trazabilidad completa del paciente
> y dar salida a lo que el Estado peruano intentó con **RENHICE**.
>
> Marco de referencia: **OpenHIE** (Open Health Information Exchange). MediClick actúa como
> nodo PoS que se conecta a un HIE a través de una capa de interoperabilidad.
>
> Stack base ya existente: NestJS · GraphQL (Apollo) · Prisma · PostgreSQL · Redis ·
> `@nestjs/event-emitter` · RBAC multi-tenant · pagos MercadoPago.

---

## Principios rectores (no negociables)

1. **Separación de modelos.** El modelo transaccional (Prisma, rígido, optimizado para la app)
   se mantiene. El modelo canónico de intercambio es **FHIR R4**. Nunca se expone Prisma como FHIR.
2. **GraphQL es interno; FHIR es externo.** GraphQL sigue sirviendo a los front-ends. La
   interoperabilidad se expone como **API REST FHIR aparte** (`/fhir/R4/...`), conforme al estándar.
3. **Append-only para lo clínico.** Versionado e historial inmutable: trazabilidad y defensa legal.
4. **Nunca bloquear la atención por un sistema externo.** Todo lo externo es asíncrono, idempotente
   y resiliente. Si RENIEC/RENHICE/legacy cae, MediClick sigue operando.
5. **No reinventar.** Apoyarse en piezas OpenHIE (SanteMPI/OpenCR como Client Registry, OpenHIM
   como capa de interop, Mirth/NextGen Connect como puente HL7v2, Medplum como referencia FHIR).

---

## Tablero de fases (este programa)

| Fase | Entregable | Desbloquea | Esfuerzo | Estado |
|------|------------|-----------|----------|--------|
| 0 | Bounded context `interoperability` + **FHIR Resource Store** (jsonb) + historial | Todo lo demás | Medio | 🔲 |
| 1 | **Proyección por eventos** → recursos FHIR + `Provenance`/`AuditEvent` | Trazabilidad | Medio | 🔲 |
| 2 | **API FHIR REST de lectura** (`Patient`, `Encounter`, `CapabilityStatement`) | Consumo externo | Medio | 🔲 |
| 3 | **MPI / Client Registry** + gateway RENIEC + stewardship | Identidad unificada | Alto | 🔲 |
| 4 | **Terminology Service** (CIE-10 ↔ SNOMED ↔ LOINC, `ConceptMap`) | Semántica | Medio | 🔲 |
| 5 | **Outbox transaccional + cola durable (BullMQ)** + resiliencia | Escritura externa segura | Medio | 🔲 |
| 6 | **ACL / Adapters externos** + API FHIR de escritura (`Bundle` transaction) | Ingesta legacy | Alto | 🔲 |
| 7 | **Consentimiento + seguridad legal** (Ley N° 29733, ABAC, mTLS, audit firmado) | *Gate* para ir a producción | Alto | 🔲 |
| 8 | **Offline-first / store-and-forward** + gateway RENHICE | Zonas rurales + registro nacional | Alto | 🔲 |

**Tesis del orden:** primero la **columna vertebral interna** (0–2): un store FHIR y la
proyección desde tus eventos, sin exponer nada externo todavía (riesgo bajo, valor inmediato en
trazabilidad). Luego **identidad y semántica** (3–4), que son prerequisito para que cualquier dato
externo signifique algo. Después la **infraestructura de resiliencia** (5) antes de cualquier
escritura externa. Recién entonces **integración externa** (6). La **seguridad/consentimiento** (7)
es un *gate*: se construye en paralelo pero **nada sale al exterior sin que esté cerrada**.
Finalmente lo más difícil: **offline rural + RENHICE** (8).

---

## Fase 0 — Fundaciones: bounded context + FHIR Resource Store ⭐ (próximo)

> 📄 Decisiones cerradas en [ADR-0001](adr/0001-fhir-resource-store.md).

**Objetivo:** crear el esqueleto sobre el que todo se enchufa. Persistencia **híbrida**: tablas
normalizadas (lo actual) para operar; store `jsonb` para FHIR (extensible, versionado, sin migraciones constantes).

### Entregables
- Módulo `server/src/modules/interoperability/` (ver estructura abajo).
- Modelos Prisma `FhirResource` (jsonb) + `FhirResourceHistory` (append-only).
- Índices **GIN** sobre `content` vía migración SQL cruda (Prisma no los gestiona).
- Tipos FHIR con `@medplum/fhirtypes`.
- Mappers explícitos `PatientFhirMapper.toFhir(domain): Patient`.

```
server/src/modules/interoperability/
  fhir/
    controllers/   ← FhirController (REST puro)        [Fase 2]
    mappers/       ← domain ↔ FHIR
    serializers/   ← CapabilityStatement, Bundle
    store/         ← FhirResourceRepository (jsonb + historial)
  acl/             ← adapters por fuente               [Fase 6]
  terminology/     ← ConceptMap/ValueSet               [Fase 4]
  outbox/          ← Transactional Outbox              [Fase 5]
```

### Decisiones a cerrar
- [ ] ¿Una tabla `FhirResource` genérica vs. tabla por `resourceType`? (genérica + GIN recomendado).
- [ ] Versión FHIR objetivo: **R4** (línea base) vs. R4B/R5.
- [ ] Perfil base: **IPS (International Patient Summary)** + perfiles HL7 LAC como punto de partida.

### Riesgos
- Performance de búsquedas en jsonb sin índices → GIN obligatorio antes de exponer Fase 2.
- Acoplar el store al dominio → mappers explícitos, nunca exponer Prisma directo.

---

## Fase 1 — Proyección por eventos + trazabilidad

**Objetivo:** convertir tu arquitectura orientada a eventos en la fuente de la HCE y la trazabilidad.

### Lógica
- *Listeners* sobre `@nestjs/event-emitter` proyectan eventos de dominio
  (`appointment.completed`, `diagnosis.created`…) a recursos FHIR en el store.
- Cada proyección emite además `Provenance` (quién/cuándo/de qué) y `AuditEvent`.
- Patrón **Event-Carried State Transfer**: el evento lleva el estado suficiente para proyectar.

### Encaje técnico
- Reusa el patrón de listeners ya usado en `waitlist`/`scheduler`.
- El historial append-only (Fase 0) soporta `vread` / `_history` de Fase 2.

### Riesgos
- `event-emitter` es **in-process y no durable** → para proyecciones internas es aceptable;
  para externas se exige Outbox (Fase 5). No mezclar ambos caminos.

---

## Fase 2 — API FHIR REST de lectura

**Objetivo:** primer punto de consumo externo, **solo lectura** (más seguro para empezar).

### Entregables
- `FhirController`: `GET /fhir/Patient/:id`, `GET /fhir/Patient?identifier=urn:oid:...|46871234`,
  `GET /fhir/Encounter?patient=...`, `GET /fhir/{type}/{id}/_history`.
- `GET /fhir/metadata` → `CapabilityStatement` declarando lo soportado.
- Soporte de *search params* FHIR mínimos + paginación por `Bundle`.

### Decisiones a cerrar
- [ ] AuthN/Z del API FHIR: **SMART on FHIR** (OAuth2) vs. extender JWT/RBAC actual.
- [ ] Qué recursos entran al MVP (mínimo viable: `Patient`, `Encounter`, `Observation`).

### Riesgos
- No doblar GraphQL a FHIR: los clientes esperan REST conforme. Mantener APIs separadas.
- **Tenant scoping (heredado de Fase 0):** `FhirResource` tiene `clinicId` pero NO está en
  el tenant-filtering de `PrismaService`, y el repo lee con `this.prisma` (sin auto-filtro).
  Antes de exponer cualquier lectura FHIR aquí, scopear por clínica (registrar el modelo en
  el filtro o usar `this.prisma.tenant` / filtro explícito) o se filtran recursos entre tenants.

---

## Fase 3 — MPI / Client Registry (identidad + RENIEC)

**Objetivo:** resolver identidades duplicadas/cruzadas. Un registro dorado (EMPI) por humano,
con N identidades por fuente.

### Lógica
- `PatientMaster` (golden record) ↔ `PatientIdentifier` (namespaced: `system` + `value`,
  único por par) ↔ `PatientLink` (FHIR `Patient.link`, con `matchScore` y `status`).
- **Matching determinístico:** DNI validado contra RENIEC = enlace autoritativo.
- **Matching probabilístico (Fellegi-Sunter):** `pg_trgm` (trigramas, robusto a tipeos) +
  `fuzzystrmatch`. Umbrales → auto-link / **cola de revisión humana** / no-match.
- **Gateway RENIEC:** fuente autoritativa de identidad, cacheada en Redis, con circuit breaker.

### Reglas de seguridad clínica
- **No auto-merge con score débil** (cruzar historiales es riesgo de seguridad del paciente).
- **Merges reversibles:** modelar enlaces, nunca borrar/sobrescribir registros fuente.
- Emitir `patient.identity.linked` / `.merged` → actualizar `Patient.link` + `AuditEvent`.

### Decisiones a cerrar
- [ ] ¿Construir matching propio vs. integrar **SanteMPI/OpenCR**?
- [ ] Umbrales de score (auto-link / revisión / descarte).
- [ ] Contrato y costos del servicio RENIEC (validación DNI/biométrica).

---

## Fase 4 — Terminology Service

**Objetivo:** interoperabilidad **semántica**, no solo sintáctica.

### Lógica
- `ConceptMap` / `ValueSet` / `CodeSystem` para CIE-10 ↔ SNOMED CT ↔ LOINC.
- El ACL mapea en la ingesta pero **guarda siempre el código original** (provenance).
- Cola de revisión para códigos sin mapeo.

### Decisiones a cerrar
- [ ] Tablas de mapeo propias vs. servidor real (**Snowstorm** para SNOMED, **Ontoserver**).
- [ ] Licenciamiento SNOMED CT en Perú.

---

## Fase 5 — Outbox transaccional + cola durable + resiliencia

**Objetivo:** prerequisito de cualquier escritura externa. Cero mensajes perdidos aunque el
sistema externo esté caído.

### Lógica
- **Transactional Outbox:** cambio de dominio + fila `outbox` en la **misma transacción** Postgres;
  un relay publica a la cola.
- **BullMQ sobre Redis** (ya existente) con reintentos + backoff exponencial con *jitter*.
- **Circuit breaker** (`cockatiel`/`opossum`) y **bulkheads** para aislar legacy lentos.
- Submisiones **idempotentes** (idempotency key, conditional create/update FHIR).

### Decisiones a cerrar
- [ ] BullMQ vs. RabbitMQ/Kafka (según garantías de entrega requeridas).

---

## Fase 6 — ACL / Adapters externos (Strangler Fig)

**Objetivo:** ingerir/intercambiar con sistemas externos sin contaminar el dominio.

### Lógica
- Un **Adapter** por fuente: `galen-plus.adapter`, `e-qhali.adapter`.
- API FHIR de **escritura**: `POST /fhir` (transaction `Bundle`), conditional update.
- **No parsear HL7 v2 en NestJS:** poner **Mirth/NextGen Connect** como puente HL7v2↔FHIR delante.
- Patrón **Strangler Fig**: habla FHIR hoy, degrada a lo que el Estado exponga mañana.

### Dependencias
- Requiere Fases 3 (identidad), 4 (semántica) y 5 (resiliencia). **No empezar antes.**

---

## Fase 7 — Consentimiento + seguridad legal (GATE de producción)

**Objetivo:** cumplir la **Ley N° 29733 (Protección de Datos Personales)** y blindar datos sensibles.
Se construye en paralelo, pero **nada sale al exterior sin esto cerrado**.

### Lógica
- **Consentimiento:** recurso FHIR `Consent`, **forzado en el gateway** (no se comparte sin consentimiento activo).
- **ABAC + purpose-of-use:** extender el RBAC actual (CASL) con propósito de uso.
- **Auditoría firmada:** `AuditEvent` append-only encadenado por hash (tamper-evident).
- **Cifrado:** en reposo (pgcrypto / campo sensible), en tránsito **mTLS** contra gateways estatales.

---

## Fase 8 — Offline-first / store-and-forward + RENHICE

**Objetivo:** operar en zonas rurales con conectividad intermitente y conectar al registro nacional.

### Lógica
- **Store-and-forward:** encolar `Bundle` FHIR localmente y sincronizar al recuperar conexión.
- **Gateway RENHICE:** MediClick como repositorio afiliado (modelo IHE XDS: Document Source/Consumer).
- Sincronización idempotente y reconciliación de conflictos.

---

# Roadmaps posteriores (mapa del programa completo)

Una vez asentada la interoperabilidad, estos programas se construyen **encima** de la columna
vertebral FHIR. Orden sugerido y dependencias:

| Programa | Qué resuelve | Depende de |
|----------|--------------|-----------|
| **R-A · Documento clínico portable (IPS)** | Generar/leer el International Patient Summary del paciente | Fases 0–4 |
| **R-B · Reportería clínica y de salud pública** | Tableros epidemiológicos, indicadores MINSA, notificación obligatoria | Fase 1 (eventos) + 4 (terminología) |
| **R-C · De-identificación y analítica** | Datasets anonimizados para investigación/IA sin exponer PII | Fase 7 (seguridad) |
| **R-D · IA clínica sobre datos estructurados** | Apoyo a decisión, alertas, predicción de no-show clínica | R-A + R-C |
| **R-E · Receta y orden electrónica** | Prescripción interoperable (FHIR `MedicationRequest`, `ServiceRequest`) | Fases 4 + 6 |
| **R-F · Registros nacionales (RNIPRESS, CMP, RENIEC ampliado)** | Facility/Practitioner Registry del HIE | Fase 3 |
| **R-G · Intercambio transfronterizo / aseguradoras (IAFAS)** | Facturación e intercambio con EsSalud/EPS | Fases 6 + 7 |

**Secuencia macro:** *este roadmap (interoperabilidad)* → **R-A/R-B** (valor clínico visible sobre
el store FHIR) → **R-E/R-F** (ecosistema de órdenes y registros) → **R-C/R-D** (analítica e IA, que
exigen seguridad madura) → **R-G** (intercambio externo de alto riesgo legal/financiero).

---

## Cómo evitar huecos (checklist transversal de cada fase)

- [ ] ¿El recurso FHIR generado valida contra su perfil (IPS/LAC)?
- [ ] ¿Se preserva el dato/código **original** (provenance) además del canónico?
- [ ] ¿Hay `AuditEvent` para cada operación con dato clínico?
- [ ] ¿La operación externa es **idempotente** y pasa por Outbox?
- [ ] ¿Existe camino degradado si el sistema externo no responde?
- [ ] ¿El consentimiento (Fase 7) gobierna cualquier salida de datos?
- [ ] ¿Los merges de identidad son reversibles?

---

> **Primer incremento concreto recomendado:** Fase 0 + el listener de proyección de un solo recurso
> (`Patient`) en Fase 1. Es el mínimo que valida la columna vertebral end-to-end sin riesgo externo.
