import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantInterceptor } from './tenant.interceptor.js';
import { tenantStorage } from '../../prisma/tenant-context.js';

/**
 * Contexto GraphQL fiel al que arma NestJS: args = [root, args, gqlCtx, info].
 * `switchToHttp().getRequest()` devuelve args[0] (el root del resolver, casi
 * siempre undefined), mientras que el req real vive en args[2].req. Esa es la
 * trampa que el interceptor debe evitar usando getRequestFromContext.
 */
function gqlContext(user: unknown): ExecutionContext {
  const req = { user };
  const args = [undefined, {}, { req }, { fieldName: 'q' }];
  return {
    getType: () => 'graphql',
    getArgs: () => args,
    getArgByIndex: (i: number) => args[i],
    getClass: () => ({}),
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => args[0] }),
  } as unknown as ExecutionContext;
}

function httpContext(user: unknown): ExecutionContext {
  const req = { user };
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

/**
 * CallHandler que captura el clinicId vigente en tenantStorage en el momento
 * en que el resolver se ejecuta — exactamente lo que verá PrismaService.tenant.
 */
function capturingHandler(sink: {
  clinicId: number | null | undefined;
}): CallHandler {
  return {
    handle: () =>
      new Observable((s) => {
        sink.clinicId = tenantStorage.getStore();
        s.next('ok');
        s.complete();
      }),
  };
}

describe('TenantInterceptor', () => {
  let interceptor: TenantInterceptor;

  beforeEach(() => {
    interceptor = new TenantInterceptor();
  });

  it('propaga el clinicId del staff al ejecutar un resolver GraphQL', () => {
    const ctx = gqlContext({ clinicId: 7, roleName: 'CLINIC_ADMIN' });
    const sink: { clinicId: number | null | undefined } = {
      clinicId: undefined,
    };

    interceptor.intercept(ctx, capturingHandler(sink)).subscribe();

    // Si se leyera vía switchToHttp() esto sería null y Prisma no filtraría por
    // clínica → fuga cross-tenant. Debe ser el clinicId real del usuario.
    expect(sink.clinicId).toBe(7);
  });

  it('regresión: switchToHttp() bajo GraphQL devuelve el root, no el req', () => {
    const ctx = gqlContext({ clinicId: 7 });
    // Documenta por qué NO se puede usar switchToHttp() en este interceptor.
    expect(ctx.switchToHttp().getRequest()).toBeUndefined();
  });

  it('propaga el clinicId en contexto HTTP (controladores REST)', () => {
    const ctx = httpContext({ clinicId: 1, roleName: 'DOCTOR' });
    const sink: { clinicId: number | null | undefined } = {
      clinicId: undefined,
    };

    interceptor.intercept(ctx, capturingHandler(sink)).subscribe();

    expect(sink.clinicId).toBe(1);
  });

  it('deja clinicId null para usuarios cross-tenant (paciente / super-admin)', () => {
    const ctx = gqlContext({ clinicId: null, roleName: 'PATIENT' });
    const sink: { clinicId: number | null | undefined } = {
      clinicId: undefined,
    };

    interceptor.intercept(ctx, capturingHandler(sink)).subscribe();

    // null => PrismaService.tenant no inyecta filtro (los guards aplican lo suyo).
    expect(sink.clinicId).toBeNull();
  });
});
