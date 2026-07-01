import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantStorage } from '../../prisma/tenant-context.js';
import { getRequestFromContext } from '../utils/get-request-from-context.js';

/**
 * Sets the tenant clinicId in AsyncLocalStorage so PrismaService.tenant
 * automatically injects the correct WHERE filter on every query.
 *
 * Must run after authentication guards (which populate req.user).
 * Registered as APP_INTERCEPTOR so it wraps every controller.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // No usar switchToHttp(): en GraphQL devuelve el root del resolver, no el
    // req — clinicId quedaría null y Prisma no aplicaría el filtro de tenant.
    const req = getRequestFromContext(context) as {
      user?: { clinicId?: number | null };
    };

    const clinicId: number | null = req?.user?.clinicId ?? null;

    return new Observable((observer) => {
      tenantStorage.run(clinicId, () => {
        next.handle().subscribe({
          next: (v) => observer.next(v),
          error: (e) => observer.error(e),
          complete: () => observer.complete(),
        });
      });
    });
  }
}
