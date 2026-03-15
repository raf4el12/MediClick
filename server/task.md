 Excelente. Ahora tengo una visión completa de tu sistema actual. Aquí va el análisis completo.

  ---
  Análisis Conceptual: Sistema de Disponibilidad y Reservas Médicas

  1. EVALUACIÓN DEL SISTEMA ACTUAL

  Tu sistema ya tiene las tres capas fundamentales correctas:

  Disponibilidad (reglas semanales) → Horarios (bloques concretos) → Citas (reservas)

  Lo que funciona bien:
  - Separación entre reglas abstractas (Availability) y bloques concretos (Schedules)
  - Generación de slots basada en duración de especialidad
  - Detección de superposición de citas
  - Manejo de zona horaria Peru (UTC-5)
  - Soft-delete en citas
  - Buffer de 2 horas para citas del mismo día

  Brechas identificadas que necesitan resolución:

  ┌──────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────┐
  │                              Brecha                              │                               Impacto                               │
  ├──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ No existe concepto de bloqueo temporal (vacaciones, emergencias) │ Un doctor "disponible" podría tener un día libre no reflejado       │
  ├──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ No hay feriados nacionales                                       │ Se generan horarios en 28 de julio, Navidad, etc.                   │
  ├──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ No hay buffer entre citas                                        │ Las citas son consecutivas sin tiempo de transición                 │
  ├──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ No hay diferenciación presencial vs virtual                      │ No se puede filtrar por modalidad                                   │
  ├──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ No hay tipos de consulta con duración variable                   │ Primera consulta (30min) vs control (15min) usan la misma duración  │
  ├──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ La reprogramación no actualiza startTime/endTime                 │ La cita puede quedar con tiempos fuera del rango del nuevo schedule │
  ├──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ No existe transición PENDING → CONFIRMED                         │ El flujo de estados está incompleto                                 │
  ├──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ No hay concepto de sobrecupo                                     │ En clínicas reales se permite 1-2 pacientes extra                   │
  ├──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ No hay citas urgentes/prioritarias                               │ No se puede romper la regla de disponibilidad para emergencias      │
  ├──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Sin lista de espera                                              │ Si un slot se libera, nadie es notificado                           │
  └──────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────┘

  ---
  2. MODELO CONCEPTUAL PROPUESTO

  2.1 Capas del Sistema

  El sistema debe operar en 5 capas, de la más abstracta a la más concreta:

  ┌─────────────────────────────────────────────┐
  │  CAPA 1: PLANTILLA DE HORARIO BASE         │ ← "El doctor trabaja L-V de 8 a 14"
  │  (Availability — reglas recurrentes)         │
  ├─────────────────────────────────────────────┤
  │  CAPA 2: CALENDARIO DE FERIADOS/BLOQUEOS   │ ← "28 de julio no hay atención"
  │  (Excepciones al horario base)               │
  ├─────────────────────────────────────────────┤
  │  CAPA 3: HORARIOS MATERIALIZADOS           │ ← "Lunes 15 marzo: 08:00-08:20, 08:20-08:40..."
  │  (Schedules — bloques concretos por fecha)   │
  ├─────────────────────────────────────────────┤
  │  CAPA 4: SLOTS DISPONIBLES                 │ ← "08:00 ✓, 08:20 ✓, 08:40 ✗ (reservado)"
  │  (Cálculo en tiempo real)                    │
  ├─────────────────────────────────────────────┤
  │  CAPA 5: CITAS                             │ ← "Paciente X a las 08:20 con Dr. Y"
  │  (Appointments — reservas concretas)         │
  └─────────────────────────────────────────────┘

  2.2 Entidades Conceptuales Necesarias

  A. Disponibilidad Base (ya existe — necesita extensión)
  Representa las reglas recurrentes semanales del médico.

  Datos clave:
  - Doctor + Especialidad
  - Día de la semana
  - Rango horario (inicio-fin)
  - Vigencia (fecha desde-hasta)
  - Tipo: REGULAR, EXCEPCION, EXTRA
  - Nuevo: Modalidad — PRESENCIAL, VIRTUAL, AMBOS
  - Nuevo: Duración de consulta override — permite que un doctor tenga duración diferente a la de la especialidad para bloques específicos

  B. Bloqueo de Horario (NUEVO)
  Representa periodos donde el doctor NO está disponible, superponiéndose sobre la disponibilidad base.

  Datos clave:
  - Doctor
  - Fecha inicio + Fecha fin (rango de días)
  - Hora inicio + Hora fin (opcionales — si son nulos, bloquea el día completo)
  - Motivo: VACACIONES, EMERGENCIA, REUNION, CAPACITACION, PERSONAL, FERIADO, OTRO
  - Descripción opcional
  - Recurrente: sí/no (para bloqueos que se repiten, como reuniones semanales)
  - Creado por (admin, doctor, sistema)

  Ejemplos reales:
  - Vacaciones del 15 al 30 de diciembre (día completo)
  - Reunión de staff todos los miércoles de 12:00 a 13:00
  - Emergencia personal el martes 18, solo la tarde (14:00-18:00)

  C. Calendario de Feriados (NUEVO)
  Feriados nacionales peruanos que aplican a TODOS los doctores automáticamente.

  Datos clave:
  - Fecha
  - Nombre del feriado
  - Tipo: NACIONAL, REGIONAL, INSTITUCIONAL
  - Activo (permite que el admin desactive feriados si la clínica opera)
  - Año (para regeneración anual)

  Feriados de Perú a considerar:
  - 1 enero (Año Nuevo)
  - Jueves y Viernes Santo (variable)
  - 1 mayo (Día del Trabajo)
  - 7 junio (Batalla de Arica, no laborable sector público)
  - 28-29 julio (Fiestas Patrias)
  - 6 agosto (Batalla de Junín, en Junín)
  - 30 agosto (Santa Rosa de Lima)
  - 8 octubre (Combate de Angamos)
  - 1 noviembre (Todos los Santos)
  - 8 diciembre (Inmaculada Concepción)
  - 9 diciembre (Batalla de Ayacucho)
  - 25 diciembre (Navidad)

  D. Tipo de Consulta (NUEVO)
  Permite diferentes duraciones y configuraciones según el tipo de atención.

  Datos clave:
  - Nombre: Primera consulta, Control, Procedimiento, Teleconsulta, Urgencia
  - Duración en minutos
  - Modalidad: PRESENCIAL, VIRTUAL
  - Precio base (opcional)
  - Requiere preparación previa (indicaciones al paciente)
  - Especialidad (relación)

  E. Horarios Materializados (ya existe — funciona bien)
  Los bloques concretos generados a partir de la disponibilidad.

  Extensión necesaria:
  - Estado: ACTIVO, BLOQUEADO, CANCELADO — actualmente no tiene estado
  - Modalidad: heredada de la disponibilidad base

  F. Citas (ya existe — necesita extensión)
  La reserva concreta del paciente.

  Extensiones necesarias:
  - Tipo de consulta (referencia)
  - Modalidad: PRESENCIAL, VIRTUAL
  - Es sobrecupo: booleano (permite marcar citas fuera del horario normal)
  - Prioridad: NORMAL, URGENTE
  - Origen: WEB (paciente), RECEPCION, TELEFONO, APP
  - Recordatorio enviado: booleano + timestamp

  ---
  3. FLUJO LÓGICO DE DISPONIBILIDAD

  3.1 Generación de Horarios (proceso batch)

  PARA cada día del mes objetivo:
    1. ¿Es feriado activo?
       → SÍ: Saltar este día (no generar horarios)
       → NO: Continuar

    2. Obtener reglas de disponibilidad activas del doctor para este día de la semana
       → Filtrar por: dayOfWeek coincide, fecha dentro de vigencia, isAvailable=true

    3. ¿Existen bloqueos para este doctor en esta fecha?
       → SÍ: Recortar o eliminar los bloques afectados
          Ejemplo: Disponibilidad 08:00-14:00, bloqueo 10:00-12:00
          Resultado: Generar slots para 08:00-10:00 y 12:00-14:00

    4. Determinar duración del slot:
       Prioridad: Override del doctor > Duración del tipo de consulta > Duración de la especialidad

    5. Generar slots con buffer entre citas:
       Ejemplo: Duración 20min + buffer 5min = slot cada 25min
       08:00-08:20 (cita), 08:20-08:25 (buffer), 08:25-08:45 (cita)...

       Alternativa simplificada (más común en Perú):
       El buffer se absorbe en la duración. Si la consulta real dura 20min,
       el slot se configura de 25min. No se crea un "gap" visible.

    6. Deduplicar contra horarios existentes

    7. Insertar en lote

  3.2 Consulta de Disponibilidad en Tiempo Real

  Cuando un paciente (o recepcionista) busca cita:

  ENTRADA: doctorId, specialtyId, fecha, tipoConsulta (opcional)

    1. Obtener horarios materializados del doctor para esa fecha y especialidad
       → Si no hay horarios: retornar vacío (el mes no fue generado o el doctor no atiende)

    2. Filtrar horarios bloqueados
       → Verificar bloqueos activos del doctor que intersecten con la fecha/hora
       → Verificar feriados

    3. Para cada horario activo, obtener citas ya reservadas
       → Solo contar: PENDING, CONFIRMED, IN_PROGRESS (estados activos)
       → NO contar: CANCELLED, NO_SHOW (liberan el slot)

    4. Calcular slots teóricos vs ocupados
       → Slot teórico: generado por TimeSlotCalculator
       → Slot ocupado: tiene cita activa con startTime/endTime que se superpone

    5. Verificar reglas temporales:
       → No mostrar slots pasados (hora actual > startTime del slot)
       → No mostrar slots dentro del buffer mínimo (ej: 2 horas para hoy)

    6. Retornar: lista de slots con estado (disponible / ocupado / bloqueado)

  3.3 Proceso de Reserva

  ENTRADA: patientId, scheduleId, startTime, endTime, reason, tipoConsulta

    1. VALIDACIONES DE EXISTENCIA:
       → Paciente existe y está activo
       → Horario (schedule) existe
       → El slot (startTime-endTime) cae dentro del rango del schedule

    2. VALIDACIONES TEMPORALES:
       → La fecha no es pasada
       → Si es hoy: el slot está al menos a 2 horas de distancia
       → El horario no está bloqueado

    3. VALIDACIONES DE CONFLICTO:
       → No hay otra cita activa del MISMO PACIENTE en la misma fecha/hora
         (evitar que un paciente reserve 2 citas a la misma hora con distintos doctores)
       → No hay cita activa en el mismo slot del mismo schedule (doble reserva)

    4. VALIDACIONES DE NEGOCIO:
       → Si el tipo de consulta requiere duración diferente, verificar que el slot la soporte
       → Si es sobrecupo, verificar que no exceda el límite (ej: máx 2 sobrecupos por bloque)

    5. CREAR CITA:
       → Estado inicial: PENDING
       → Estado de pago: PENDING

    6. POST-CREACIÓN:
       → Enviar notificación/recordatorio al paciente (email, push)
       → Registrar en log de auditoría

  ---
  4. CICLO DE VIDA DE LA CITA

  4.1 Máquina de Estados Completa

                      ┌──────────────┐
                      │   PENDING    │ ← Estado inicial al reservar
                      └──────┬───────┘
                             │
                ┌────────────┼────────────┐
                ▼            │            ▼
        ┌──────────────┐    │    ┌──────────────┐
        │  CONFIRMED   │    │    │  CANCELLED   │ ← Paciente/Admin cancela
        └──────┬───────┘    │    └──────────────┘
                │            │
                ▼            ▼
        ┌──────────────────────────┐
        │      IN_PROGRESS         │ ← Check-in (paciente llegó)
        └──────────┬───────────────┘
                   │
          ┌────────┼────────┐
          ▼                 ▼
  ┌──────────────┐  ┌──────────────┐
  │  COMPLETED   │  │   NO_SHOW    │ ← Paciente no se presentó
  └──────────────┘  └──────────────┘

  Transiciones permitidas:

  ┌─────────────┬─────────────┬─────────────────┬───────────────────────────────────────────┐
  │    Desde    │    Hacia    │      Quién      │                  Cuándo                   │
  ├─────────────┼─────────────┼─────────────────┼───────────────────────────────────────────┤
  │ PENDING     │ CONFIRMED   │ Sistema/Admin   │ Confirmación del paciente (link, llamada) │
  ├─────────────┼─────────────┼─────────────────┼───────────────────────────────────────────┤
  │ PENDING     │ CANCELLED   │ Admin/Paciente  │ Antes de la cita                          │
  ├─────────────┼─────────────┼─────────────────┼───────────────────────────────────────────┤
  │ PENDING     │ IN_PROGRESS │ Admin/Recepción │ Check-in (saltar confirmación)            │
  ├─────────────┼─────────────┼─────────────────┼───────────────────────────────────────────┤
  │ CONFIRMED   │ IN_PROGRESS │ Admin/Recepción │ Paciente llega a la clínica               │
  ├─────────────┼─────────────┼─────────────────┼───────────────────────────────────────────┤
  │ CONFIRMED   │ CANCELLED   │ Admin/Paciente  │ Antes de la cita                          │
  ├─────────────┼─────────────┼─────────────────┼───────────────────────────────────────────┤
  │ IN_PROGRESS │ COMPLETED   │ Doctor/Admin    │ Al finalizar la consulta                  │
  ├─────────────┼─────────────┼─────────────────┼───────────────────────────────────────────┤
  │ IN_PROGRESS │ NO_SHOW     │ Sistema/Admin   │ Si pasó el tiempo y no se atendió         │
  └─────────────┴─────────────┴─────────────────┴───────────────────────────────────────────┘

  Transiciones NO permitidas:
  - COMPLETED → cualquier otro (es terminal)
  - CANCELLED → cualquier otro (es terminal)
  - NO_SHOW → cualquier otro (es terminal)
  - Cualquier estado → PENDING (no se puede "des-reservar")

  4.2 Liberación Automática de Slots

  Cuando una cita pasa a CANCELLED o NO_SHOW:
  - El slot queda inmediatamente disponible para nueva reserva
  - Esto ya funciona en tu sistema actual (el cálculo de disponibilidad excluye citas con esos estados)
  - Mejora propuesta: Notificar a pacientes en lista de espera cuando un slot popular se libera

  ---
  5. REGLAS MÉDICAS Y CASOS ESPECIALES

  5.1 Buffer entre Citas

  Enfoque recomendado para Perú (el que usa SANNA/Auna):

  No crear gaps visibles. En su lugar, la duración del slot INCLUYE el tiempo de transición. Si la consulta real dura 20 minutos, se configura el slot en 25 o 30 minutos. El tiempo "extra" es buffer implícito.

  Ventajas:
  - La UI es más limpia (no hay huecos de 5 min en la grilla)
  - El doctor decide cuánto buffer necesita ajustando la duración de su slot
  - Es como funcionan la mayoría de clínicas en la práctica

  5.2 Tipos de Consulta con Duración Variable

  La duración del slot debe poder variar según el tipo de consulta:

  ┌───────────────────────┬───────────────────┬─────────────────────────┐
  │         Tipo          │  Duración típica  │          Nota           │
  ├───────────────────────┼───────────────────┼─────────────────────────┤
  │ Primera consulta      │ 30-40 min         │ Anamnesis completa      │
  ├───────────────────────┼───────────────────┼─────────────────────────┤
  │ Control / Seguimiento │ 15-20 min         │ Revisión rápida         │
  ├───────────────────────┼───────────────────┼─────────────────────────┤
  │ Procedimiento         │ 45-60 min         │ Depende de especialidad │
  ├───────────────────────┼───────────────────┼─────────────────────────┤
  │ Teleconsulta          │ 15-20 min         │ Generalmente más corta  │
  ├───────────────────────┼───────────────────┼─────────────────────────┤
  │ Urgencia              │ Sin duración fija │ Slot prioritario        │
  └───────────────────────┴───────────────────┴─────────────────────────┘

  Enfoque de implementación:
  La duración se define a nivel de especialidad (como ya tienes), pero se puede sobrescribir por tipo de consulta. Al generar slots, se usa la duración base de la especialidad. Al reservar, si el tipo de consulta requiere más tiempo, se reservan slots contiguos.

  5.3 Sobrecupo

  En clínicas peruanas es MUY común. Un doctor con agenda llena puede aceptar 1-2 pacientes extra.

  Reglas propuestas:
  - Máximo de sobrecupos configurables por doctor/día (ej: 2)
  - Solo un ADMIN o el propio doctor puede crear sobrecupos
  - El sobrecupo se agenda al final del último slot del bloque
  - Se marca explícitamente como sobrecupo en la UI (para transparencia)
  - No afecta la disponibilidad visible al paciente (solo admin/doctor lo ven)

  5.4 Citas Urgentes

  Citas que rompen las reglas normales:
  - Pueden reservarse con menos de 2 horas de anticipación
  - Pueden ocupar slots bloqueados (si el doctor acepta)
  - Solo creadas por ADMIN o DOCTOR
  - Se marcan con prioridad URGENTE
  - Generan notificación inmediata al doctor

  5.5 Reprogramación

  Flujo correcto:

  1. Paciente/Admin solicita reprogramar
  2. Sistema muestra slots disponibles del mismo doctor (o de otro)
  3. Se selecciona nuevo slot
  4. Se cancela la cita original (estado CANCELLED, motivo: "Reprogramada")
  5. Se crea NUEVA cita en el nuevo slot (con referencia a la cita original)
  6. Se notifica al paciente

  Alternativa actual (tu sistema): Actualizar el scheduleId de la cita existente. Esto es más simple pero tiene el bug de no actualizar startTime/endTime. Si mantienes este enfoque, DEBES también actualizar los tiempos.

  5.6 Cancelación

  Políticas recomendadas (estándar en Perú):
  - Cancelación gratuita hasta 24 horas antes
  - Cancelación tardía (menos de 24h) puede tener penalidad
  - No-show: el paciente no se presentó → se marca automáticamente después de X minutos del horario
  - Motivo de cancelación obligatorio
  - Máximo de cancelaciones/no-shows por paciente (ej: 3 en un mes) → restricción temporal de reservas

  ---
  6. CÁLCULO DE DISPONIBILIDAD — ALGORITMO COMPLETO

  FUNCIÓN: obtenerDisponibilidad(doctorId, specialtyId, fecha)

    // PASO 1: Verificar precondiciones
    SI fecha < hoy → retornar vacío
    SI fecha es feriado activo → retornar vacío

    // PASO 2: Obtener horarios materializados
    schedules = buscar schedules del doctor para fecha y especialidad
    SI schedules vacío → retornar vacío

    // PASO 3: Aplicar bloqueos
    bloqueos = buscar bloqueos activos del doctor que intersecten con fecha
    PARA cada schedule:
      PARA cada bloqueo:
        SI bloqueo cubre completamente el schedule → marcar como BLOQUEADO
        SI bloqueo cubre parcialmente → recortar el rango disponible

    // PASO 4: Obtener citas activas
    citasActivas = buscar citas con estado IN (PENDING, CONFIRMED, IN_PROGRESS)
                   para los schedules de este doctor/fecha

    // PASO 5: Generar slots teóricos
    PARA cada schedule NO bloqueado:
      duracion = obtenerDuracion(specialty, tipoConsulta)
      slotsTeóricos = TimeSlotCalculator.generate(schedule.timeFrom, schedule.timeTo, duracion)

    // PASO 6: Marcar disponibilidad
    PARA cada slot teórico:
      SI hoy Y slot.startTime < horaActual + 2h → "no_disponible" (pasado/muy pronto)
      SI existe cita activa que se superpone → "ocupado"
      SI intersecta con bloqueo → "bloqueado"
      DE LO CONTRARIO → "disponible"

    // PASO 7: Retornar
    retornar slots con su estado

  ---
  7. ESCALABILIDAD

  7.1 Estrategias de Rendimiento

  Generación de horarios (batch):
  - Ya usas createMany con skipDuplicates — correcto
  - La generación es mensual por doctor, lo cual escala bien
  - Para miles de doctores: ejecutar en cola de trabajos (Bull/BullMQ), no en el request HTTP
  - Generar automáticamente al inicio de cada mes via cron job

  Consulta de disponibilidad (tiempo real):
  - Tu índice actual [doctorId, scheduleDate] es correcto para esta query
  - El cálculo de slots es puro (sin I/O), así que escala linealmente
  - Para alto volumen: cachear la disponibilidad calculada con TTL de 1-2 minutos (Redis)
  - Invalidar cache cuando se crea/cancela una cita

  Prevención de doble reserva (concurrencia):
  - Tu verificación actual con hasOverlappingAppointment es correcta pero vulnerable a race conditions
  - Solución: usar bloqueo optimista o transacción con nivel de aislamiento SERIALIZABLE para la operación de reserva
  - Alternativa pragmática: unique constraint en la BD sobre (scheduleId, startTime, endTime) con filtro de estado + manejar el error de duplicado

  7.2 Índices Recomendados

  Los que ya tienes cubren bien los queries principales:
  - Schedules [doctorId, scheduleDate] — consulta de disponibilidad
  - Appointments [scheduleId, startTime, endTime] — detección de superposición
  - Appointments [patientId, status] — historial del paciente

  Adicionales para el modelo extendido:
  - Bloqueos [doctorId, fechaInicio, fechaFin] — consulta de bloqueos por rango
  - Feriados [fecha] — lookup rápido de feriados

  ---
  8. RESUMEN DE MEJORES PRÁCTICAS

  ┌───────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────┐
  │                 Práctica                  │                                   Razón                                    │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Materializar slots, no calcular al vuelo  │ Tu enfoque actual es correcto — los schedules existen como registros en BD │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Separar reglas de instancias              │ Availability (regla) vs Schedule (instancia) — ya lo haces                 │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Feriados como entidad propia              │ Evita generar horarios en fechas no laborables                             │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Bloqueos independientes de disponibilidad │ Un bloqueo es una excepción temporal, no un cambio de regla                │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Buffer implícito en la duración           │ Más limpio que gaps explícitos, estándar en SANNA/Auna                     │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Sobrecupo controlado                      │ Necesario en la realidad peruana, pero limitado y auditable                │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Cancelación crea nuevo, no modifica       │ Para reprogramación, crear cita nueva y cancelar la anterior               │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Prevenir race conditions                  │ Transacciones o unique constraints para doble reserva                      │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Zona horaria hardcodeada                  │ Peru (UTC-5) sin daylight saving — tu enfoque actual es correcto           │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ Generación por cron                       │ No depender de acción manual del admin cada mes                            │
  └───────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────┘

  ---
  9. PRIORIDAD DE IMPLEMENTACIÓN SUGERIDA

  1. Bloqueos de horario — Mayor impacto inmediato, resuelve vacaciones/emergencias
  2. Feriados peruanos — Evita errores de generación, fácil de implementar
  3. Fix de reprogramación — Bug actual (startTime/endTime no se actualiza)
  4. Transición PENDING → CONFIRMED — Completar la máquina de estados
  5. Sobrecupo — Necesidad real de clínicas peruanas
  6. Tipos de consulta — Permite duraciones variables
  7. Modalidad presencial/virtual — Diferenciación post-pandemia
  8. Lista de espera — Nice-to-have para optimizar ocupación
  9. Citas urgentes — Caso de uso menos frecuente
