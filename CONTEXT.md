# Gestión de citas médicas

MediClick coordina la demanda de atención de pacientes con la capacidad asistencial de médicos en sedes clínicas. Este glosario fija el lenguaje del núcleo de reservas y de los contextos que participan en ese flujo.

## Organización y actores

**Sede clínica**:
Lugar de atención que posee agenda, zona horaria y moneda propias. El personal opera dentro de una sede; un paciente puede atenderse en distintas sedes.
_Evitar_: Tenant, clínica cuando se quiera decir la organización completa

**Usuario**:
Identidad autenticada que recibe permisos para usar MediClick. Un usuario puede estar asociado a un paciente o a un médico, pero no es sinónimo de ninguno de ellos.
_Evitar_: Cuenta, paciente, médico

**Paciente**:
Persona que solicita o recibe atención médica. Puede existir como paciente aunque todavía no tenga un usuario para acceder al portal.
_Evitar_: Usuario, cliente

**Médico**:
Profesional que ofrece atención en una sede y para una o más especialidades.
_Evitar_: Usuario, proveedor

**Personal de sede**:
Usuario que administra la operación de una sede, como un administrador, médico o recepcionista con permisos asignados.
_Evitar_: Admin como término genérico

**Portal del paciente**:
Acceso a MediClick de un paciente con usuario, desde el que reserva y gestiona sus propias citas, pagos y reseñas.
_Evitar_: App del paciente, panel del paciente

**Perfil público del médico**:
Presentación de un médico consultable sin usuario, limitada a su información profesional y a sus reseñas visibles.
_Evitar_: Ficha del médico, perfil del médico cuando se habla de sus datos internos

## Oferta asistencial

**Especialidad**:
Tipo de atención que determina la duración, el descanso entre citas y el precio de referencia de una consulta.
_Evitar_: Servicio, categoría

**Categoría**:
Agrupación navegable de especialidades usada para que el paciente encuentre el tipo de atención que necesita.
_Evitar_: Especialidad

**Regla de disponibilidad**:
Declaración de cuándo un médico puede o no atender una especialidad, ya sea de forma regular, excepcional o adicional.
_Evitar_: Horario, cita

**Cupo**:
Intervalo concreto de una fecha en el que un médico puede recibir una cita de una especialidad.
_Evitar_: Horario, disponibilidad, cita, slot

**Descanso entre citas**:
Tiempo no reservable que separa el final de un cupo del inicio del siguiente.
_Evitar_: Duración de la cita, buffer

**Bloqueo de agenda**:
Indisponibilidad explícita de un médico durante un día completo o un intervalo determinado.
_Evitar_: Cancelación, feriado

**Feriado**:
Día no laborable que afecta a una sede o a todas las sedes y en el que no se ofrecen cupos.
_Evitar_: Bloqueo de agenda

**Agenda**:
Organización en el tiempo de la capacidad asistencial de un médico en una sede: sus cupos, sus citas, sus bloqueos de agenda y los feriados que la afectan.
_Evitar_: Calendario, horario

**Jornada**:
Agenda de un médico para una fecha concreta en una sede.
_Evitar_: Turno, día laboral

## Citas y atención

**Cita**:
Compromiso entre un paciente y un médico para una especialidad, fecha e intervalo de atención determinados.
_Evitar_: Reserva como sustantivo, cupo, consulta

**Reserva en línea**:
Cita solicitada por el paciente y retenida temporalmente mientras completa el pago requerido.
_Evitar_: Cita confirmada

**Cita pendiente**:
Cita creada que aún no ha sido confirmada; puede corresponder a una retención por pago o a una creación administrativa pendiente de confirmación.
_Evitar_: Cita confirmada, pago pendiente

**Cita confirmada**:
Cita cuyo cupo quedó comprometido para la atención del paciente.
_Evitar_: Cita pagada

**Atención en curso**:
Etapa que comienza cuando el paciente hace check-in y la atención clínica se inicia.
_Evitar_: Cita confirmada, consulta completada

**Cita completada**:
Cita cuya atención clínica finalizó.
_Evitar_: Cita cerrada, cita pagada

**Cancelación**:
Finalización anticipada de una cita por decisión del paciente, del personal o por pérdida de las condiciones de atención.
_Evitar_: Expiración, inasistencia, eliminación

**Expiración de reserva**:
Cancelación automática de una reserva en línea cuyo pago no se completó dentro del plazo concedido.
_Evitar_: Cancelación voluntaria, pago fallido

**Inasistencia**:
Resultado de una cita confirmada cuando el paciente no se presenta después de su hora de inicio.
_Evitar_: Cancelación, cita completada

**Reagendamiento**:
Cambio de una cita a otro cupo, conservando la identidad de la cita.
_Evitar_: Cancelar y crear otra cita

**Sobrecupo**:
Cita excepcional añadida después de la capacidad regular de un médico para un día, sujeta a un límite diario.
_Evitar_: Cupo libre, doble reserva

## Lista de espera

**Entrada en lista de espera**:
Solicitud de un paciente para recibir un cupo liberado que coincida con una sede, especialidad, médico opcional, rango de fechas y preferencia horaria.
_Evitar_: Cita pendiente, oferta

**Prioridad de espera**:
Preferencia operativa que adelanta una entrada frente a otras; a igual prioridad, conserva el orden de llegada.
_Evitar_: Posición fija

**Oferta de cupo**:
Invitación temporal y exclusiva para que un paciente en lista de espera acepte un cupo liberado.
_Evitar_: Cita confirmada, entrada en lista de espera

## Pagos

**Precio de consulta**:
Importe de referencia asociado a una especialidad y usado al reservar en línea.
_Evitar_: Pago, transacción

**Plazo de pago**:
Instante límite hasta el que una reserva en línea retiene el cupo mientras espera el pago.
_Evitar_: Vencimiento de la cita

**Transacción de pago**:
Registro de un intento o resultado financiero asociado a una cita.
_Evitar_: Cita, preferencia de checkout

**Comprobante de pago**:
Constancia imprimible de una transacción de pago aprobada de una cita; no es un documento fiscal.
_Evitar_: Factura, recibo fiscal

**Estado de pago**:
Situación financiera de una cita, independiente de su estado asistencial.
_Evitar_: Estado de la cita

**Penalización por cancelación**:
Importe retenible cuando un paciente cancela tarde una cita ya pagada.
_Evitar_: Reembolso, precio de consulta

**Revisión financiera**:
Trabajo manual requerido cuando el estado de una cita y el resultado del pago no pueden reconciliarse automáticamente.
_Evitar_: Reembolso completado

## Reseñas

**Reseña**:
Valoración de uno a cinco que un paciente deja sobre el médico de una cita propia completada; existe a lo sumo una por cita.
_Evitar_: Calificación, comentario

**Reseña oculta**:
Reseña retirada de la vista pública por moderación del personal autorizado; no cuenta en la valoración del médico.
_Evitar_: Reseña eliminada, reseña rechazada
