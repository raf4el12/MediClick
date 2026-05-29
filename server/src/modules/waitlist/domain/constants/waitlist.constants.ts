/**
 * Constantes de la lista de espera con auto-fill.
 *
 * Cuando se libera un slot (cancelación o expiración de pago), el matcher
 * ofrece el slot al primer paciente en cola. La oferta vence tras OFFER_TTL_MINUTES.
 */

/** Minutos que una oferta permanece vigente antes de expirar */
export const OFFER_TTL_MINUTES = 15;

/**
 * TTL del lock Redis por slot (segundos). Debe cubrir la vida de una oferta
 * con margen, para que el slot no se reofrezca en paralelo mientras un paciente decide.
 */
export const LOCK_TTL_SECONDS = OFFER_TTL_MINUTES * 60 + 120;

/** Prefijo de la key de lock por slot en Redis */
export const WAITLIST_LOCK_PREFIX = 'waitlist:lock';
