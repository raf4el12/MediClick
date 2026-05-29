/** Debe coincidir con OFFER_TTL_MINUTES del backend (waitlist.constants.ts) */
export const OFFER_TTL_MINUTES = 15;

export const OFFER_TTL_SECONDS = OFFER_TTL_MINUTES * 60;

/** Intervalo de refresco de ofertas vigentes (ms) */
export const OFFERS_POLL_INTERVAL_MS = 20_000;
