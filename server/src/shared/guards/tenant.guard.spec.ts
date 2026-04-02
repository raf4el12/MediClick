import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { TenantGuard } from './tenant.guard.js';
import { UserRole } from '../domain/enums/user-role.enum.js';

function createMockContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  it('should allow PATIENT without clinicId (cross-tenant)', () => {
    const ctx = createMockContext({
      id: 1,
      roleName: UserRole.PATIENT,
      clinicId: null,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow super-admin (ADMIN without clinicId)', () => {
    const ctx = createMockContext({
      id: 1,
      roleName: UserRole.ADMIN,
      clinicId: null,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow clinic-admin (ADMIN with clinicId)', () => {
    const ctx = createMockContext({
      id: 1,
      roleName: UserRole.ADMIN,
      clinicId: 1,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow DOCTOR with clinicId', () => {
    const ctx = createMockContext({
      id: 1,
      roleName: UserRole.DOCTOR,
      clinicId: 1,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow RECEPTIONIST with clinicId', () => {
    const ctx = createMockContext({
      id: 1,
      roleName: UserRole.RECEPTIONIST,
      clinicId: 1,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException for DOCTOR without clinicId', () => {
    const ctx = createMockContext({
      id: 1,
      roleName: UserRole.DOCTOR,
      clinicId: null,
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException for RECEPTIONIST without clinicId', () => {
    const ctx = createMockContext({
      id: 1,
      roleName: UserRole.RECEPTIONIST,
      clinicId: null,
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if no user on request', () => {
    const ctx = createMockContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
