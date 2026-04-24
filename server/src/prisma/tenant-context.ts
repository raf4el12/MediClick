import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Stores the current request's clinicId.
 * - number  → staff/doctor: queries are automatically scoped to that clinic
 * - null    → super-admin or patient: no automatic tenant filter (callers apply their own guards)
 * - undefined (no store) → outside an HTTP request (cron jobs, startup): no filter
 *
 * Populated by TenantInterceptor for every inbound HTTP request.
 */
export const tenantStorage = new AsyncLocalStorage<number | null>();
