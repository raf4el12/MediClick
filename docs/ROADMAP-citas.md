# Roadmap — Core de Citas Médicas

> Planning de lógica de negocio para extender el core de citas más allá del CRUD.
> Base ya implementada: agendamiento, disponibilidad, bloqueos, feriados, pagos
> (MercadoPago), overbooking y **recuperación de cupos** (módulo `waitlist` con
> auto-fill por evento `appointment.cancelled`).

> Cargado el 2025-07-14 — contexto completo del feature planning.

## Tablero de prioridades

| # | Feature | Dolor de negocio | Esfuerzo | Estado |
|---|---------|------------------|----------|--------|
| 1 | Recordatorios + confirmación | No-show (prevención) | Bajo | ⏳ Próximo |
| 2 | Política de no-show + seña | No-show (consecuencia económica) | Medio | 🔲 Backlog |
| 3 | Citas recurrentes / series | Tratamientos multi-sesión | Medio | 🔲 Backlog |
| 4 | Recursos múltiples (salas/equipos) | Conflictos de recursos compartidos | Alto | 🔲 Backlog |
| 5 | Telemedicina (cita virtual) | Demanda de atención remota | Medio | 🔲 Backlog |
| 6 | Check-in / sala de espera virtual | Aglomeración y gestión de turnos | Medio | 🔲 Backlog |
| 7 | Derivaciones (referrals) | Continuidad entre especialidades | Medio | 🔲 Backlog |

**Tesis del orden:** el `waitlist` ataca el no-show *después* de que ocurre
(recupera el hueco). La #1 lo ataca *antes* (evita que ocurra). La #2 cierra el
**ciclo económico** del no-show con MercadoPago. Las tres forman el combo
anti-no-show. El resto se prioriza según demanda del negocio.

---

## #1 — Recordatorios + confirmación ⭐ (próximo)

**Objetivo:** reducir no-shows recordando la cita y permitiendo confirmar/cancelar
con un click. La cancelación temprana reinyecta el cupo al `waitlist`.

### Lógica de negocio
- Recordatorios escalonados: **T-24h** y **T-2h** antes de `startTime`.
- Cada recordatorio incluye link **Confirmar** / **Cancelar** (token firmado).
- Si confirma → `confirmedAt` y se omiten recordatorios siguientes.
- Si cancela → reutiliza el flujo de cancelación existente → emite
  `appointment.cancelled` → el matcher de `waitlist` reofrece el cupo (sin cambios).
- Si **no confirma** dentro de la ventana → marca la cita como "en riesgo"
  (visible para staff, futura entrada a la política #2).

### Encaje técnico
- **Jobs:** `scheduler` (`@nestjs/schedule`, `@Cron`) barre citas próximas y encola
  recordatorios pendientes.
- **Envío:** módulo `mail` existente + `notifications` (in-app).
- **Confirmación:** endpoint REST público con token firmado (sin login, igual que
  los webhooks). Patrón de `Auth()` no aplica acá → ruta firmada con expiración.
- **Idempotencia:** tabla `AppointmentReminders` (o campo de control) para no
  re-enviar el mismo recordatorio; clave por `(appointmentId, kind)`.

### Modelo (borrador)
- `Appointment.confirmedAt: DateTime?`
- `Appointment.reminderRiskFlag` (derivable o persistido).
- `AppointmentReminders { id, appointmentId, kind (T24|T2), sentAt, channel }`.

### Eventos
- Reutiliza `appointment.cancelled` (ya dispara waitlist).
- Nuevo (opcional): `appointment.confirmed`, `appointment.at_risk`.

### Decisiones a cerrar antes de implementar
- [ ] Canales del MVP: ¿solo email, o también in-app? (SMS/WhatsApp = fase 2).
- [ ] Cadencia configurable por clínica vs. fija (T-24h / T-2h).
- [ ] TTL y firma del token de confirmación (JWT corto vs. token en DB).
- [ ] Zona horaria: los cron corren en UTC; resolver hora local por clínica
      (ya existe `timezoneResolver`).

### Riesgos
- Doble envío si el cron se solapa → lock idempotente (patrón Redis NX ya usado
  en waitlist) o constraint único en `AppointmentReminders`.
- Email no entregado ≠ paciente no avisado → registrar `channel`/estado de envío.

---

## #2 — Política de no-show + seña

**Objetivo:** dar consecuencia económica al no-show y exigir compromiso a pacientes
de riesgo.

### Lógica de negocio
- Tasa de no-show por paciente (histórico sobre `AppointmentStatus.NO_SHOW`).
- Umbral de "riesgo" → al reservar se exige **seña/depósito** (no el total) vía
  MercadoPago.
- Asiste → reembolso automático o se acredita al total. No se presenta → se retiene.

### Encaje técnico
- `appointments` (cálculo de riesgo) + `payments` (**refunds** de MercadoPago) +
  `reports` (tasa de no-show).
- Depende de #1 para la señal `at_risk`.

### Decisiones a cerrar
- [ ] Umbral de riesgo (% y/o N citas).
- [ ] Monto de seña (fijo, % del precio, por especialidad).
- [ ] Ventana de cancelación con reembolso completo.

---

## #3 — Citas recurrentes / series de tratamiento

**Objetivo:** agendar tratamientos multi-sesión (fisio, diálisis, quimio, psicología)
como una serie, no cita por cita.

### Lógica de negocio
- Regla de recurrencia tipo RRULE (ej. "Lun y Jue por 6 semanas").
- Genera N citas validando disponibilidad de cada slot (respeta bloqueos/feriados).
- Cancelación granular: "esta sesión" / "esta y futuras" / "toda la serie".

### Encaje técnico
- `appointments` + `schedules`. Modelo `AppointmentSeries` con las citas hijas.
- Cuidado con conflictos parciales: política para slots no disponibles dentro de la
  serie (saltar / sugerir alternativo / abortar).

---

## #4 — Recursos múltiples (salas + equipamiento)

**Objetivo:** evitar conflictos de recursos compartidos. Un procedimiento requiere
*doctor + sala + equipo* en simultáneo; hoy solo se valida contra el doctor.

### Lógica de negocio
- Catálogo de `Resource` (sala, ecógrafo, sillón…).
- La especialidad/procedimiento declara qué recursos requiere.
- La validación de overlap bloquea **todos** los recursos requeridos, no solo el doctor.

### Encaje técnico
- Nuevo módulo `resources` + extensión de la validación de solapamiento en
  `appointments` (la transacción serializable de creación ya existe).
- **Esfuerzo alto** pero alto diferenciador para clínicas medianas.

---

## #5 — Telemedicina (cita virtual)

**Objetivo:** soportar atención remota.

### Lógica de negocio
- Tipo de cita `IN_PERSON | VIRTUAL`.
- Genera sala de video (link Jitsi/Daily/Meet) habilitada **tras el pago** y cerca
  de la hora de inicio.

### Encaje técnico
- `appointments` (`type`, `meetingUrl`) + `notifications` (envío del link).
- Posible job en `scheduler` para habilitar el link en ventana T-X.

---

## #6 — Check-in / sala de espera virtual

**Objetivo:** gestionar el turno físico sin aglomeración.

### Lógica de negocio
- Ya existe `checkIn`, pero sin turno. El paciente hace check-in (QR) al llegar,
  ve su **posición en vivo** y recibe aviso "es tu turno".

### Encaje técnico
- `appointments` + Redis (cola de turnos en vivo — mismo stack que `waitlist`) +
  canal realtime (WebSocket/SSE) para la posición.

---

## #7 — Derivaciones (referrals)

**Objetivo:** continuidad entre especialidades dentro de la red de clínicas.

### Lógica de negocio
- Un doctor deriva al paciente a otra especialidad con pre-autorización.
- El paciente reserva directo dentro de esa derivación (slot pre-habilitado).

### Encaje técnico
- `appointments` + `clinical-notes` + `specialties`.

---

## Convenciones del proyecto (recordatorio para cualquier feature)

- **Backend:** NestJS DDD por dominio → `domain / application / infrastructure /
  interfaces`. Repository pattern con tokens de inyección. Use-cases con `execute()`.
- **GraphQL** es la API pública; **REST solo para webhooks** y endpoints firmados
  (recordatorios #1 entra acá).
- **Guards:** `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@RequirePermissions`.
  Multi-tenant por `clinicId` en cada request.
- **Mutations** retornan el objeto completo actualizado.
- **Validación:** `class-validator` (server) / Zod (client).
- **Frontend:** vistas de paciente con React Query; iconos Remix `ri-*`; `api` de
  `@/libs/axios`; `PageHeader` + `SuccessSnackbar`.
- **Jobs:** `@nestjs/schedule` con locks Redis NX para idempotencia (patrón ya
  usado en `waitlist`).
- **Tests:** unit por use-case (Jest). Correr `jest <módulo>` + `tsc --noEmit` del
  cliente antes de cerrar.

## Definición de "listo" por feature

1. Diseño técnico aprobado (modelo + eventos + decisiones cerradas).
2. Migración Prisma aplicada.
3. Use-cases con tests unitarios en verde.
4. API (GraphQL o REST firmado) + permisos.
5. UI conectada (paciente y/o staff).
6. `tsc --noEmit` cliente limpio + suite del módulo en verde.
7. Memoria guardada (decisión no obvia) + commits por feature.
