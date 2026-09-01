-- SDD-015 (G-06): constraints de gateway, agenda y ofertas.
--
-- Contexto y fuentes de verdad: docs/SDD-hardening-integridad-seguridad-operacion.md
-- §6.6 y docs/domain/APPOINTMENT-CORE.md ("Invariantes que un cambio debe
-- preservar" — capacidad/tiempo, pago/cancelación).
--
-- Cada bloque reconcilia duplicados existentes ANTES de crear su índice
-- único, tal como exige el SDD ("Detectar y reconciliar duplicados antes de
-- crear índice parcial/compuesto"). La auditoría local (2026-08-31) no
-- encontró duplicados en ninguna de las cuatro dimensiones, pero producción
-- puede tener datos distintos, así que la reconciliación es incondicional y
-- segura de re-ejecutar (usa DELETE FROM ... USING con criterio determinista
-- de "conservar la fila más antigua por id").

-- =============================================================================
-- 1. Transactions.gatewayId — idempotencia financiera (F-02/F-03/F-04 depend
--    on esto siendo la última barrera; la app ya reclama con findFirst antes
--    de escribir, pero eso es check-then-act sin garantía bajo concurrencia).
-- =============================================================================

-- Reconciliación: si dos filas comparten el mismo gatewayId no-null, conserva
-- la más antigua (menor id). Un gatewayId duplicado real solo puede
-- significar que una carrera ya escribió dos veces el mismo pago del
-- proveedor; la fila más reciente es la redundante.
DELETE FROM "Transactions" t1
USING "Transactions" t2
WHERE t1."gatewayId" IS NOT NULL
  AND t1."gatewayId" = t2."gatewayId"
  AND t1.id > t2.id;

-- Índice único parcial: Prisma no expresa `WHERE ... IS NOT NULL` en el
-- schema, así que este índice vive únicamente en SQL crudo (documentado en
-- schema.prisma junto al modelo Transactions).
CREATE UNIQUE INDEX "Transactions_gatewayId_key"
  ON "Transactions" ("gatewayId")
  WHERE "gatewayId" IS NOT NULL;

-- =============================================================================
-- 2. Schedules — identidad de agenda (F-06/F-07/G-06). La identidad ya existe
--    en ScheduleGenerationPlanner (SDD-008, puro, sin Prisma); este índice es
--    su reflejo en base de datos, y hace que
--    `createMany({ skipDuplicates: true })` sea real en vez de un no-op.
-- =============================================================================

-- Reconciliación: si dos filas comparten
-- doctorId+specialtyId+clinicId+scheduleDate+timeFrom+timeTo, conserva la más
-- antigua. Antes de borrar, reasigna cualquier cita o oferta de lista de
-- espera que apunte a la fila duplicada más reciente hacia la fila que se
-- conserva, para no perder citas reales por una limpieza de esquema.
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT
      s2.id AS duplicate_id,
      s1.id AS canonical_id
    FROM "Schedules" s1
    JOIN "Schedules" s2
      ON s1."doctorId" = s2."doctorId"
      AND s1."specialtyId" = s2."specialtyId"
      AND COALESCE(s1."clinicId", -1) = COALESCE(s2."clinicId", -1)
      AND s1."scheduleDate" = s2."scheduleDate"
      AND s1."timeFrom" = s2."timeFrom"
      AND s1."timeTo" = s2."timeTo"
      AND s1.id < s2.id
  LOOP
    UPDATE "Appointments" SET "scheduleId" = dup.canonical_id WHERE "scheduleId" = dup.duplicate_id;
    UPDATE "WaitlistOffers" SET "scheduleId" = dup.canonical_id WHERE "scheduleId" = dup.duplicate_id;
    DELETE FROM "Schedules" WHERE id = dup.duplicate_id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX "Schedules_doctorId_specialtyId_clinicId_scheduleDate_timeFr_key"
  ON "Schedules"("doctorId", "specialtyId", "clinicId", "scheduleDate", "timeFrom", "timeTo");

-- =============================================================================
-- 3. WaitlistOffers.createdAppointmentId — una cita no puede completar varias
--    ofertas (G-01/G-06). acceptOfferAtomically (SDD-013) ya vincula esto
--    dentro de una transacción serializable; este índice es la última
--    barrera de base de datos.
-- =============================================================================

-- Reconciliación: si dos ofertas apuntan a la misma cita creada, conserva la
-- más antigua y desvincula (createdAppointmentId = NULL) las demás. No se
-- borran ofertas: son historial de lista de espera, y desvincular preserva
-- auditoría sin dejar el índice roto.
UPDATE "WaitlistOffers" o1
SET "createdAppointmentId" = NULL
WHERE o1."createdAppointmentId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "WaitlistOffers" o2
    WHERE o2."createdAppointmentId" = o1."createdAppointmentId"
      AND o2.id < o1.id
  );

CREATE UNIQUE INDEX "WaitlistOffers_createdAppointmentId_key"
  ON "WaitlistOffers" ("createdAppointmentId")
  WHERE "createdAppointmentId" IS NOT NULL;

-- =============================================================================
-- 4. WaitlistOffers — una oferta PENDING exclusiva por scheduleId (G-06). El
--    matcher (find-next-match.use-case.ts) y el lock Redis (SDD-014) ya
--    garantizan esto a nivel de aplicación; este índice es la última barrera.
-- =============================================================================

-- Reconciliación: si dos ofertas PENDING comparten scheduleId, expira todas
-- menos la más antigua. No se borran: EXPIRED es un estado terminal válido
-- del enum WaitlistOfferStatus y deja rastro de que hubo una oferta
-- duplicada detectada en la migración.
UPDATE "WaitlistOffers" o1
SET status = 'EXPIRED'
WHERE o1.status = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM "WaitlistOffers" o2
    WHERE o2."scheduleId" = o1."scheduleId"
      AND o2.status = 'PENDING'
      AND o2.id < o1.id
  );

CREATE UNIQUE INDEX "WaitlistOffers_scheduleId_pending_key"
  ON "WaitlistOffers" ("scheduleId")
  WHERE status = 'PENDING';
